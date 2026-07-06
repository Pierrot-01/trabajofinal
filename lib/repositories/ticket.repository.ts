// lib/repositories/ticket.repository.ts — Acceso a datos de Ticket
import { prisma } from "@/lib/prisma";

type EstadoTicket = "pendiente" | "en_proceso" | "resuelto";
type TipoTicket = "incidencia" | "solicitud";
type CategoriaTicket = "hardware" | "software_licencia" | "software_general" | "red";


export async function crear(data: {
  tipo: TipoTicket;
  categoria: CategoriaTicket;
  descripcion: string;
  fotoUrl?: string;
  softwareId?: string;
  softwareTexto?: string;
  fechaLimite?: Date;
  equipoId: string;
  usuarioReportaId: string;
  ticketRelacionadoId?: string;
}) {
  return prisma.ticket.create({ data });
}

export async function buscarPorId(id: string) {
  return prisma.ticket.findUnique({
    where: { id },
    include: {
      equipo: {
        select: {
          id: true,
          codigoInventario: true,
          estado: true,
          laboratorioId: true,
          laboratorio: {
            select: {
              nombre: true,
              ubicacion: true,
            },
          },
        },
      },
      usuarioReporta: { select: { id: true, nombre: true, rol: true } },
      tecnicoAsignado: { select: { id: true, nombre: true, rol: true } },
      comentarios: { include: { usuario: { select: { id: true, nombre: true, rol: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
}

export async function buscarPorEquipoYEstado(equipoId: string, estados: EstadoTicket[]) {
  return prisma.ticket.findMany({
    where: { equipoId, estado: { in: estados } },
    select: { id: true, tipo: true, estado: true },
  });
}

export async function listar(params: {
  cursor?: string;
  take?: number;
  equipoId?: string;
  estado?: EstadoTicket;
  laboratorioId?: string;
}) {
  const take = params.take ?? 20;
  const results = await prisma.ticket.findMany({
    take: take + 1,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    where: {
      ...(params.equipoId ? { equipoId: params.equipoId } : {}),
      ...(params.estado ? { estado: params.estado } : {}),
      ...(params.laboratorioId
        ? { equipo: { laboratorioId: params.laboratorioId } }
        : {}),
    },
    select: {
      id: true,
      tipo: true,
      categoria: true,
      estado: true,
      descripcion: true,
      fechaCreacion: true,
      fechaLimite: true,
      fechaCierre: true,
      tecnicoAsignadoId: true,
      equipo: { select: { codigoInventario: true, laboratorioId: true } },
      usuarioReporta: { select: { nombre: true } },
    },
    orderBy: { fechaCreacion: "desc" },
  });

  let nextCursor: string | null = null;
  if (results.length > take) {
    const next = results.pop();
    nextCursor = next!.id;
  }
  return { items: results, nextCursor };
}

export async function actualizarEstado(
  id: string,
  estado: EstadoTicket,
  extras: { tecnicoAsignadoId?: string; fechaCierre?: Date; comentarioCierre?: string } = {}
) {
  return prisma.ticket.update({ where: { id }, data: { estado, ...extras } });
}

export async function asignarTecnico(id: string, tecnicoId: string) {
  return prisma.ticket.update({ where: { id }, data: { tecnicoAsignadoId: tecnicoId } });
}

export async function contarPorEquipoYEstados(equipoId: string, estados: EstadoTicket[]) {
  return prisma.ticket.count({ where: { equipoId, estado: { in: estados } } });
}

export async function crearComentario(data: {
  ticketId: string;
  usuarioId: string;
  contenido: string;
}) {
  return prisma.comentario.create({ data });
}

export async function listarResueltosPorEquipo(equipoId: string) {
  return prisma.ticket.findMany({
    where: { equipoId, estado: "resuelto" },
    select: { id: true, tipo: true, categoria: true, fechaCreacion: true, fechaCierre: true },
    orderBy: { fechaCreacion: "desc" },
  });
}

export async function tiempoPromedioResolucion() {
  const resueltos = await prisma.ticket.findMany({
    where: { estado: "resuelto", fechaCierre: { not: null } },
    select: { categoria: true, fechaCreacion: true, fechaCierre: true },
  });
  const porCategoria: Record<string, number[]> = {};
  for (const t of resueltos) {
    if (!t.fechaCierre) continue;
    const horas = (t.fechaCierre.getTime() - t.fechaCreacion.getTime()) / 3_600_000;
    if (!porCategoria[t.categoria]) porCategoria[t.categoria] = [];
    porCategoria[t.categoria].push(horas);
  }
  const resultado: Record<string, number> = {};
  for (const [cat, horas] of Object.entries(porCategoria)) {
    resultado[cat] = horas.reduce((a, b) => a + b, 0) / horas.length;
  }
  return resultado;
}

export async function equiposConMasTickets(n: number, meses: number) {
  const desde = new Date();
  desde.setMonth(desde.getMonth() - meses);
  const agrupados = await prisma.ticket.groupBy({
    by: ["equipoId"],
    where: { fechaCreacion: { gte: desde } },
    _count: { id: true },
    having: { id: { _count: { gt: n } } },
  });
  return agrupados;
}

import { ITicketRepository } from "../ports/ITicketRepository";
export const ticketRepository: ITicketRepository = {
  crear,
  buscarPorId,
  buscarPorEquipoYEstado,
  actualizarEstado,
  asignarTecnico,
  contarPorEquipoYEstados,
  crearComentario,
  tiempoPromedioResolucion,
  equiposConMasTickets,
};

