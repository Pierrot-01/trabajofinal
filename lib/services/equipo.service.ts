// lib/services/equipo.service.ts — Lógica de negocio de Equipos (extendido de 001-tickets)
import { IEquipoRepository } from "../ports/IEquipoRepository";
import { ILaboratorioRepository } from "../ports/ILaboratorioRepository";
import * as defaultEquipoRepo from "../repositories/equipo.repository";
import * as defaultLabRepo from "../repositories/laboratorio.repository";
import { DomainError } from "@/lib/errors/domain-error";

import { ok } from "@/lib/api-response";
import type { EstadoEquipo } from "@/lib/prisma-client";

// ---------------------------------------------------------------------------
// HU-02: Crear equipo dentro de un laboratorio
// ---------------------------------------------------------------------------
export async function crear(
  data: { codigoInventario: string; laboratorioId: string },
  equipoRepo: IEquipoRepository = defaultEquipoRepo,
  labRepo: ILaboratorioRepository = defaultLabRepo
) {
  // Edge case 3: laboratorio debe existir
  const lab = await labRepo.buscarPorId(data.laboratorioId);
  if (!lab) throw new DomainError("El laboratorio no existe.");

  // Edge case 1: código de inventario único
  const existente = await equipoRepo.buscarPorCodigo(data.codigoInventario);
  if (existente) throw new DomainError("Este código de inventario ya está registrado.");

  return equipoRepo.crear(data);
}

// ---------------------------------------------------------------------------
// HU-03: Editar estado (con advertencia si tiene tickets abiertos)
// ---------------------------------------------------------------------------
export async function editarEstado(
  equipoId: string,
  nuevoEstado: EstadoEquipo,
  equipoRepo: IEquipoRepository = defaultEquipoRepo
) {
  const ticketsAbiertos = await equipoRepo.contarTicketsAbiertos(equipoId);
  const equipo = await equipoRepo.editar(equipoId, { estado: nuevoEstado });

  if (ticketsAbiertos > 0) {
    return ok(equipo, "Este equipo tiene tickets abiertos que podrían quedar inconsistentes con el nuevo estado.");
  }
  return ok(equipo);
}

// ---------------------------------------------------------------------------
// HU-03: Editar datos completos
// ---------------------------------------------------------------------------
export async function editar(
  equipoId: string,
  data: { codigoInventario?: string; laboratorioId?: string; estado?: EstadoEquipo },
  equipoRepo: IEquipoRepository = defaultEquipoRepo,
  labRepo: ILaboratorioRepository = defaultLabRepo
) {
  if (data.laboratorioId) {
    const lab = await labRepo.buscarPorId(data.laboratorioId);
    if (!lab) throw new DomainError("El laboratorio no existe.");
  }
  if (data.codigoInventario) {
    const existente = await equipoRepo.buscarPorCodigo(data.codigoInventario);
    if (existente && existente.id !== equipoId) {
      throw new DomainError("Este código de inventario ya está registrado.");
    }
  }
  return equipoRepo.editar(equipoId, data);
}

// ---------------------------------------------------------------------------
// HU-04: Dar de baja (bloquea si hay tickets abiertos — diferencia clave con editarEstado)
// ---------------------------------------------------------------------------
export async function darDeBaja(
  equipoId: string,
  equipoRepo: IEquipoRepository = defaultEquipoRepo
) {
  const ticketsAbiertos = await equipoRepo.contarTicketsAbiertos(equipoId);
  if (ticketsAbiertos > 0) {
    throw new DomainError(
      "No se puede dar de baja un equipo con tickets abiertos. Resuélvelos primero."
    );
  }
  return equipoRepo.actualizarEstado(equipoId, "dado_de_baja");
}

// ---------------------------------------------------------------------------
// Efecto automático desde ticket.service (Clarify #1 de 001-tickets)
// ---------------------------------------------------------------------------
export async function actualizarEstadoPorResolucion(
  equipoId: string,
  equipoRepo: IEquipoRepository = defaultEquipoRepo
) {
  const ticketsAbiertos = await equipoRepo.contarTicketsAbiertos(equipoId);
  const nuevoEstado: EstadoEquipo = ticketsAbiertos > 0 ? "mantenimiento" : "operativo";
  return equipoRepo.actualizarEstado(equipoId, nuevoEstado);
}
