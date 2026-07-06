// lib/repositories/laboratorio.repository.ts — Acceso a datos de Laboratorio
import { prisma } from "@/lib/prisma";

export async function crear(data: { nombre: string; ubicacion: string; capacidad: number }) {
  return prisma.laboratorio.create({ data });
}

export async function buscarPorId(id: string) {
  return prisma.laboratorio.findUnique({ where: { id } });
}

export async function listar() {
  return prisma.laboratorio.findMany({
    select: { id: true, nombre: true, ubicacion: true, capacidad: true },
    orderBy: { nombre: "asc" },
  });
}

export async function listarConEquipos() {
  return prisma.laboratorio.findMany({
    include: {
      equipos: {
        select: { id: true, codigoInventario: true, estado: true },
        orderBy: { codigoInventario: "asc" },
      },
    },
    orderBy: { nombre: "asc" },
  });
}

export async function contarEquipos(laboratorioId: string): Promise<number> {
  return prisma.equipo.count({ where: { laboratorioId } });
}

import { ILaboratorioRepository } from "../ports/ILaboratorioRepository";
export const laboratorioRepository: ILaboratorioRepository = {
  crear,
  buscarPorId,
  listar,
  listarConEquipos,
  contarEquipos,
};

