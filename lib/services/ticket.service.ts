// lib/services/ticket.service.ts — Lógica de negocio completa de Tickets
import * as ticketRepository from "@/lib/repositories/ticket.repository";
import * as equipoRepository from "@/lib/repositories/equipo.repository";
import { prisma } from "@/lib/prisma";
import { DomainError } from "@/lib/errors/domain-error";
import { ok } from "@/lib/api-response";

type EstadoTicket = "pendiente" | "en_proceso" | "resuelto";
type TipoTicket = "incidencia" | "solicitud";
type CategoriaTicket = "hardware" | "software_licencia" | "software_general" | "red";




// ---------------------------------------------------------------------------
// Tipos locales
// ---------------------------------------------------------------------------
export interface TicketConCampos {
  id: string;
  tipo: TipoTicket;
  categoria: CategoriaTicket;
  estado: EstadoTicket;
  fechaCreacion: Date;
  fechaLimite?: Date | null;
  tecnicoAsignadoId?: string | null;
}

export interface CrearTicketInput {
  tipo: TipoTicket;
  categoria: CategoriaTicket;
  descripcion: string;
  fotoUrl?: string;
  softwareId?: string;
  softwareTexto?: string;
  fechaLimite?: Date;
  equipoId: string;
  ticketRelacionadoId?: string;
}

// ---------------------------------------------------------------------------
// Funciones puras de cálculo (al vuelo — Clarify #2)
// ---------------------------------------------------------------------------
export function calcularPrioridad(
  ticket: TicketConCampos,
  ahora: Date = new Date()
): "alta" | "media" | "baja" {
  if (ticket.tipo === "incidencia") {
    if (ticket.categoria === "hardware") return "alta";
    return "media"; // software_general | red
  }
  // Solicitud
  if (!ticket.fechaLimite) return "baja";
  const horasRestantes =
    (ticket.fechaLimite.getTime() - ahora.getTime()) / 3_600_000;
  if (horasRestantes <= 48) return "alta";
  if (horasRestantes <= 168) return "media"; // 7 días
  return "baja";
}

export function estaAtrasado(
  ticket: TicketConCampos,
  ahora: Date = new Date()
): boolean {
  if (ticket.tecnicoAsignadoId) return false;
  if (ticket.estado !== "pendiente") return false;
  const horasDesdeCreacion =
    (ahora.getTime() - ticket.fechaCreacion.getTime()) / 3_600_000;
  return horasDesdeCreacion > 48;
}

// ---------------------------------------------------------------------------
// HU-01 / HU-02: Crear ticket (Incidencia o Solicitud)
// ---------------------------------------------------------------------------
export async function crear(
  input: CrearTicketInput,
  usuarioId: string,
  _rol: string
) {
  // Edge case 2: el equipo debe existir
  const equipo = await equipoRepository.buscarPorId(input.equipoId);
  if (!equipo) {
    throw new DomainError("El equipo seleccionado no existe.");
  }

  // Edge case: equipo dado de baja no puede recibir tickets
  if (equipo.estado === "dado_de_baja") {
    throw new DomainError("Este equipo ha sido dado de baja y no puede recibir nuevos tickets.");
  }

  // Validar ticket relacionado (Edge case 3, T057b–T057c)
  if (input.ticketRelacionadoId) {
    const ticketPrevio = await ticketRepository.buscarPorId(input.ticketRelacionadoId);
    if (!ticketPrevio) {
      throw new DomainError("El ticket relacionado no existe.");
    }
    if (ticketPrevio.estado !== "resuelto") {
      throw new DomainError("Solo puedes vincular a tickets que ya estén resueltos.");
    }
    if (ticketPrevio.equipo.id !== input.equipoId) {
      throw new DomainError("El ticket relacionado debe pertenecer al mismo equipo.");
    }
  }

  const ticket = await ticketRepository.crear({
    ...input,
    usuarioReportaId: usuarioId,
  });

  // HU-01 Criterio 7: advertir si ya hay un ticket abierto de Incidencia en el mismo equipo
  let warning: string | undefined;
  if (input.tipo === "incidencia") {
    const abiertos = await ticketRepository.buscarPorEquipoYEstado(input.equipoId, [
      "pendiente",
      "en_proceso",
    ]);
    if (abiertos.length > 0) {
      warning = "Ya existe un ticket de incidencia abierto para este equipo.";
    }
  }

  return ok(ticket, warning);
}

// ---------------------------------------------------------------------------
// HU-03: Asignar ticket (T032–T034)
// ---------------------------------------------------------------------------
export async function asignar(
  ticketId: string,
  tecnicoId: string,
  rolEjecutor: string
) {
  if (rolEjecutor !== "tecnico" && rolEjecutor !== "admin") {
    throw new DomainError("No tienes permisos para asignar tickets.");
  }
  const ticket = await ticketRepository.buscarPorId(ticketId);
  if (!ticket) throw new DomainError("El ticket no existe.");
  if (ticket.tecnicoAsignadoId) {
    throw new DomainError("Este ticket ya fue asignado a un técnico.");
  }
  return ticketRepository.asignarTecnico(ticketId, tecnicoId);
}

// ---------------------------------------------------------------------------
// HU-03: Reasignar ticket (solo admin — Clarify #5, T034)
// ---------------------------------------------------------------------------
export async function reasignar(
  ticketId: string,
  tecnicoId: string,
  rolEjecutor: string
) {
  if (rolEjecutor !== "admin") {
    throw new DomainError("Solo un administrador puede reasignar un ticket ya asignado.");
  }
  const ticket = await ticketRepository.buscarPorId(ticketId);
  if (!ticket) throw new DomainError("El ticket no existe.");
  return ticketRepository.asignarTecnico(ticketId, tecnicoId);
}

// ---------------------------------------------------------------------------
// HU-03: Cambiar estado (T036–T039)
// ---------------------------------------------------------------------------
export async function cambiarEstado(
  ticketId: string,
  nuevoEstado: EstadoTicket,
  comentarioCierre: string | undefined,
  usuarioId: string,
  rol: string
) {
  // Edge case 5: solo técnico o admin
  if (rol !== "tecnico" && rol !== "admin") {
    throw new DomainError("No tienes permisos para cambiar el estado de este ticket.");
  }

  const ticket = await ticketRepository.buscarPorId(ticketId);
  if (!ticket) throw new DomainError("El ticket no existe.");

  const estado = ticket.estado;

  // Edge case 3: transición inválida (resuelto → pendiente directo no permitido)
  const transicionesValidas: Record<string, string[]> = {
    pendiente: ["en_proceso"],
    en_proceso: ["resuelto"],
  };
  if (!transicionesValidas[estado]?.includes(nuevoEstado)) {
    throw new DomainError(
      `Transición inválida: no se puede pasar de '${estado}' a '${nuevoEstado}'.`
    );
  }

  // Al resolver: requiere comentarioCierre (mínimo 5 caracteres)
  if (nuevoEstado === "resuelto") {
    if (!comentarioCierre || comentarioCierre.trim().length < 5) {
      throw new DomainError(
        "Debes ingresar un comentario de cierre (mínimo 5 caracteres) al resolver el ticket."
      );
    }
    const resultado = await ticketRepository.actualizarEstado(ticketId, nuevoEstado, {
      fechaCierre: new Date(),
      comentarioCierre: comentarioCierre.trim(),
    });
    // Efectos automáticos al resolver (Clarify #1 y #7)
    await resolverEfectos(ticket);
    return resultado;
  }

  return ticketRepository.actualizarEstado(ticketId, nuevoEstado);
}

// ---------------------------------------------------------------------------
// Efectos automáticos al resolver (T042–T046)
// ---------------------------------------------------------------------------
type TicketResuelto = NonNullable<Awaited<ReturnType<typeof ticketRepository.buscarPorId>>>;

async function resolverEfectos(ticket: TicketResuelto) {
  const equipoId = ticket.equipo.id;
  const tipo = ticket.tipo;
  const categoria = ticket.categoria;
  const softwareId = (ticket as { softwareId?: string | null }).softwareId;

  if (tipo === "incidencia" && categoria === "hardware") {
    // Clarify #1: actualizar estado del equipo
    const ticketsAbiertos = await ticketRepository.contarPorEquipoYEstados(equipoId, [
      "pendiente",
      "en_proceso",
    ]);
    const nuevoEstado: "mantenimiento" | "operativo" =
      ticketsAbiertos > 0 ? "mantenimiento" : "operativo";
    await equipoRepository.actualizarEstado(equipoId, nuevoEstado);
  }

  if (
    tipo === "solicitud" &&
    (categoria === "software_licencia" || categoria === "software_general") &&
    softwareId
  ) {
    // Clarify #7: upsert en EquipoSoftware
    await upsertEquipoSoftware(equipoId, softwareId);
  }
}

async function upsertEquipoSoftware(equipoId: string, softwareId: string) {
  await prisma.equipoSoftware.upsert({
    where: { equipoId_softwareId: { equipoId, softwareId } },
    create: { equipoId, softwareId },
    update: { instaladoEn: new Date() },
  });
}

// ---------------------------------------------------------------------------
// HU-07: Agregar comentario (T055–T057)
// ---------------------------------------------------------------------------
export async function agregarComentario(
  input: { ticketId: string; contenido: string },
  usuarioId: string
) {
  const ticket = await ticketRepository.buscarPorId(input.ticketId);
  if (!ticket) throw new DomainError("El ticket no existe.");
  if (ticket.estado === "resuelto") {
    throw new DomainError("No se pueden agregar comentarios a un ticket ya resuelto.");
  }
  return ticketRepository.crearComentario({
    ticketId: input.ticketId,
    usuarioId,
    contenido: input.contenido,
  });
}

// ---------------------------------------------------------------------------
// HU-06: Reportes (T051–T052)
// ---------------------------------------------------------------------------
export async function tiempoPromedioResolucion() {
  return ticketRepository.tiempoPromedioResolucion();
}

export async function equiposConMasTickets(n: number, meses: number) {
  return ticketRepository.equiposConMasTickets(n, meses);
}
