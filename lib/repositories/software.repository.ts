// lib/repositories/software.repository.ts — Acceso a datos de Software
import { prisma } from "@/lib/prisma";

export async function crear(data: { nombre: string; tipo: "licenciado" | "gratuito"; version?: string }) {
  return prisma.software.create({ data });
}

export async function buscarPorId(id: string) {
  return prisma.software.findUnique({ where: { id } });
}

export async function buscarPorNombre(nombre: string) {
  return prisma.software.findUnique({ where: { nombre } });
}

export async function listar() {
  return prisma.software.findMany({
    select: { id: true, nombre: true, tipo: true, version: true },
    orderBy: { nombre: "asc" },
  });
}

export async function actualizar(id: string, data: { nombre?: string; tipo?: "licenciado" | "gratuito"; version?: string }) {
  return prisma.software.update({ where: { id }, data });
}

export async function eliminar(id: string) {
  return prisma.software.delete({ where: { id } });
}

export async function contarRelaciones(softwareId: string): Promise<number> {
  const [enEquipos, enTickets] = await Promise.all([
    prisma.equipoSoftware.count({ where: { softwareId } }),
    prisma.ticket.count({ where: { softwareId } }),
  ]);
  return enEquipos + enTickets;
}
