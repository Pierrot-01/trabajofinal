// lib/repositories/equipo.repository.ts — Repositorio de Equipos (extendido desde 001-tickets)
import { prisma } from "@/lib/prisma";
import type { EstadoEquipo } from "@prisma/client";

export async function buscarPorId(id: string) {
  return prisma.equipo.findUnique({
    where: { id },
    select: { id: true, codigoInventario: true, laboratorioId: true, estado: true },
  });
}

export async function buscarPorCodigo(codigo: string) {
  return prisma.equipo.findUnique({ where: { codigoInventario: codigo } });
}

export async function actualizarEstado(id: string, estado: EstadoEquipo) {
  return prisma.equipo.update({ where: { id }, data: { estado } });
}

export async function crear(data: { codigoInventario: string; laboratorioId: string }) {
  return prisma.equipo.create({
    data: { ...data, estado: "operativo" },
  });
}

export async function editar(id: string, data: { codigoInventario?: string; laboratorioId?: string; estado?: EstadoEquipo }) {
  return prisma.equipo.update({ where: { id }, data });
}

export async function contarTicketsAbiertos(id: string): Promise<number> {
  return prisma.ticket.count({
    where: { equipoId: id, estado: { in: ["pendiente", "en_proceso"] } },
  });
}

export async function listarPaginado(params: { laboratorioId?: string; cursor?: string; take?: number; incluirDadosDeBaja?: boolean }) {
  const take = params.take ?? 20;
  const results = await prisma.equipo.findMany({
    take: take + 1,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    where: {
      ...(params.laboratorioId ? { laboratorioId: params.laboratorioId } : {}),
      ...(!params.incluirDadosDeBaja ? { estado: { not: "dado_de_baja" } } : {}),
    },
    select: {
      id: true,
      codigoInventario: true,
      estado: true,
      laboratorio: { select: { nombre: true } },
    },
    orderBy: { codigoInventario: "asc" },
  });

  let nextCursor: string | null = null;
  if (results.length > take) {
    const next = results.pop();
    nextCursor = next!.id;
  }
  return { items: results, nextCursor };
}

export async function buscarEquiposPorLaboratorio(laboratorioId: string) {
  return prisma.equipo.findMany({
    where: { laboratorioId },
    select: { id: true, codigoInventario: true, estado: true },
  });
}
