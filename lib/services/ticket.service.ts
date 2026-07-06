// lib/services/ticket.service.ts — Lógica de negocio completa de Tickets
import { ITicketRepository, EstadoTicket, CrearTicketData, TicketBase, TipoTicket, CategoriaTicket } from "../ports/ITicketRepository";
import { IEquipoRepository } from "../ports/IEquipoRepository";
import * as defaultTicketRepo from "../repositories/ticket.repository";
import * as defaultEquipoRepo from "../repositories/equipo.repository";
import { DomainError } from "@/lib/errors/domain-error";

import { ok } from "@/lib/api-response";

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
  _rol: string,
  ticketRepo: ITicketRepository = defaultTicketRepo,
  equipoRepo: IEquipoRepository = defaultEquipoRepo
) {
  // Edge case 2: el equipo debe existir
  const equipo = await equipoRepo.buscarPorId(input.equipoId);
  if (!equipo) {
    throw new DomainError("El equipo seleccionado no existe.");
  }
  // Edge case: equipo dado de baja no puede recibir tickets
  if (equipo.estado === "dado_de_baja") {
    throw new DomainError("Este equipo ha sido dado de baja y no puede recibir nuevos tickets.");
  }

  // Validar ticket relacionado (Edge case 3, T057b–T057c)
  if (input.ticketRelacionadoId) {
    const ticketPrevio = await ticketRepo.buscarPorId(input.ticketRelacionadoId);
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

  const ticket = await ticketRepo.crear({
    ...input,
    usuarioReportaId: usuarioId,
  });

  // HU-01 Criterio 7: advertir si ya hay un ticket abierto de Incidencia en el mismo equipo
  let warning: string | undefined;
  if (input.tipo === "incidencia") {
    const abiertos = await ticketRepo.buscarPorEquipoYEstado(input.equipoId, [
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
  rolEjecutor: string,
  ticketRepo: ITicketRepository = defaultTicketRepo
) {
  if (rolEjecutor !== "tecnico" && rolEjecutor !== "admin") {
    throw new DomainError("No tienes permisos para asignar tickets.");
  }
  const ticket = await ticketRepo.buscarPorId(ticketId);
  if (!ticket) throw new DomainError("El ticket no existe.");
  if (ticket.tecnicoAsignadoId) {
    throw new DomainError("Este ticket ya fue asignado a un técnico.");
  }
  return ticketRepo.asignarTecnico(ticketId, tecnicoId);
}

// ---------------------------------------------------------------------------
// HU-03: Reasignar ticket (solo admin — Clarify #5, T034)
// ---------------------------------------------------------------------------
export async function reasignar(
  ticketId: string,
  tecnicoId: string,
  rolEjecutor: string,
  ticketRepo: ITicketRepository = defaultTicketRepo
) {
  if (rolEjecutor !== "admin") {
    throw new DomainError("Solo un administrador puede reasignar un ticket ya asignado.");
  }
  const ticket = await ticketRepo.buscarPorId(ticketId);
  if (!ticket) throw new DomainError("El ticket no existe.");
  return ticketRepo.asignarTecnico(ticketId, tecnicoId);
}

// ---------------------------------------------------------------------------
// HU-03: Cambiar estado (T036–T039)
// ---------------------------------------------------------------------------
export async function cambiarEstado(
  ticketId: string,
  nuevoEstado: EstadoTicket,
  comentarioCierre: string | undefined,
  usuarioId: string,
  rol: string,
  ticketRepo: ITicketRepository = defaultTicketRepo,
  equipoRepo: IEquipoRepository = defaultEquipoRepo
) {
  // Edge case 5: solo técnico o admin
  if (rol !== "tecnico" && rol !== "admin") {
    throw new DomainError("No tienes permisos para cambiar el estado de este ticket.");
  }

  const ticket = await ticketRepo.buscarPorId(ticketId);
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
    const resultado = await ticketRepo.actualizarEstado(ticketId, nuevoEstado, {
      fechaCierre: new Date(),
      comentarioCierre: comentarioCierre.trim(),
    });
    // Efectos automáticos al resolver (Clarify #1 y #7)
    await resolverEfectos(ticket, ticketRepo, equipoRepo);
    return resultado;
  }

  return ticketRepo.actualizarEstado(ticketId, nuevoEstado);
}

// ---------------------------------------------------------------------------
// Efectos automáticos al resolver (T042–T046)
// ---------------------------------------------------------------------------
async function resolverEfectos(
  ticket: TicketBase,
  ticketRepo: ITicketRepository,
  equipoRepo: IEquipoRepository
) {
  const equipoId = ticket.equipo.id;
  const tipo = ticket.tipo;
  const categoria = ticket.categoria;
  const softwareId = ticket.softwareId;

  if (tipo === "incidencia" && categoria === "hardware") {
    // Clarify #1: actualizar estado del equipo
    const ticketsAbiertos = await ticketRepo.contarPorEquipoYEstados(equipoId, [
      "pendiente",
      "en_proceso",
    ]);
    const nuevoEstado = ticketsAbiertos > 0 ? "mantenimiento" : "operativo";
    await equipoRepo.actualizarEstado(equipoId, nuevoEstado);
  }

  if (
    tipo === "solicitud" &&
    (categoria === "software_licencia" || categoria === "software_general") &&
    softwareId
  ) {
    // Clarify #7: upsert en EquipoSoftware
    await equipoRepo.upsertEquipoSoftware(equipoId, softwareId);
  }
}

// ---------------------------------------------------------------------------
// HU-07: Agregar comentario (T055–T057)
// ---------------------------------------------------------------------------
export async function agregarComentario(
  input: { ticketId: string; contenido: string },
  usuarioId: string,
  ticketRepo: ITicketRepository = defaultTicketRepo
) {
  const ticket = await ticketRepo.buscarPorId(input.ticketId);
  if (!ticket) throw new DomainError("El ticket no existe.");
  if (ticket.estado === "resuelto") {
    throw new DomainError("No se pueden agregar comentarios a un ticket ya resuelto.");
  }
  return ticketRepo.crearComentario({
    ticketId: input.ticketId,
    usuarioId,
    contenido: input.contenido,
  });
}

// ---------------------------------------------------------------------------
// HU-06: Reportes (T051–T052)
// ---------------------------------------------------------------------------
export async function tiempoPromedioResolucion(ticketRepo: ITicketRepository = defaultTicketRepo) {
  return ticketRepo.tiempoPromedioResolucion();
}

export async function equiposConMasTickets(
  n: number,
  meses: number,
  ticketRepo: ITicketRepository = defaultTicketRepo
) {
  return ticketRepo.equiposConMasTickets(n, meses);
}
