// lib/services/equipo.service.ts — Lógica de negocio de Equipos (extendido de 001-tickets)
import * as equipoRepository from "@/lib/repositories/equipo.repository";
import * as laboratorioRepository from "@/lib/repositories/laboratorio.repository";
import { DomainError } from "@/lib/errors/domain-error";
import { ok } from "@/lib/api-response";
import type { EstadoEquipo } from "@prisma/client";

// ---------------------------------------------------------------------------
// HU-02: Crear equipo dentro de un laboratorio
// ---------------------------------------------------------------------------
export async function crear(data: { codigoInventario: string; laboratorioId: string }) {
  // Edge case 3: laboratorio debe existir
  const lab = await laboratorioRepository.buscarPorId(data.laboratorioId);
  if (!lab) throw new DomainError("El laboratorio no existe.");

  // Edge case 1: código de inventario único
  const existente = await equipoRepository.buscarPorCodigo(data.codigoInventario);
  if (existente) throw new DomainError("Este código de inventario ya está registrado.");

  return equipoRepository.crear(data);
}

// ---------------------------------------------------------------------------
// HU-03: Editar estado (con advertencia si tiene tickets abiertos)
// ---------------------------------------------------------------------------
export async function editarEstado(equipoId: string, nuevoEstado: EstadoEquipo) {
  const ticketsAbiertos = await equipoRepository.contarTicketsAbiertos(equipoId);
  const equipo = await equipoRepository.editar(equipoId, { estado: nuevoEstado });

  if (ticketsAbiertos > 0) {
    return ok(equipo, "Este equipo tiene tickets abiertos que podrían quedar inconsistentes con el nuevo estado.");
  }
  return ok(equipo);
}

// ---------------------------------------------------------------------------
// HU-03: Editar datos completos
// ---------------------------------------------------------------------------
export async function editar(equipoId: string, data: { codigoInventario?: string; laboratorioId?: string; estado?: EstadoEquipo }) {
  if (data.laboratorioId) {
    const lab = await laboratorioRepository.buscarPorId(data.laboratorioId);
    if (!lab) throw new DomainError("El laboratorio no existe.");
  }
  if (data.codigoInventario) {
    const existente = await equipoRepository.buscarPorCodigo(data.codigoInventario);
    if (existente && existente.id !== equipoId) {
      throw new DomainError("Este código de inventario ya está registrado.");
    }
  }
  return equipoRepository.editar(equipoId, data);
}

// ---------------------------------------------------------------------------
// HU-04: Dar de baja (bloquea si hay tickets abiertos — diferencia clave con editarEstado)
// ---------------------------------------------------------------------------
export async function darDeBaja(equipoId: string) {
  const ticketsAbiertos = await equipoRepository.contarTicketsAbiertos(equipoId);
  if (ticketsAbiertos > 0) {
    throw new DomainError(
      "No se puede dar de baja un equipo con tickets abiertos. Resuélvelos primero."
    );
  }
  return equipoRepository.actualizarEstado(equipoId, "dado_de_baja");
}

// ---------------------------------------------------------------------------
// Efecto automático desde ticket.service (Clarify #1 de 001-tickets)
// ---------------------------------------------------------------------------
export async function actualizarEstadoPorResolucion(equipoId: string) {
  const ticketsAbiertos = await equipoRepository.contarTicketsAbiertos(equipoId);
  const nuevoEstado: EstadoEquipo = ticketsAbiertos > 0 ? "mantenimiento" : "operativo";
  return equipoRepository.actualizarEstado(equipoId, nuevoEstado);
}
