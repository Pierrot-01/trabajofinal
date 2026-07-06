// lib/services/software.service.ts — Lógica de negocio del Catálogo de Software (004-software)
import { ISoftwareRepository } from "../ports/ISoftwareRepository";
import * as defaultRepo from "../repositories/software.repository";
import { DomainError } from "@/lib/errors/domain-error";

// ---------------------------------------------------------------------------
// HU-01: Crear software en catálogo
// ---------------------------------------------------------------------------
export async function crear(
  data: { nombre: string; tipo: "licenciado" | "gratuito"; version?: string },
  repo: ISoftwareRepository = defaultRepo
) {
  const existente = await repo.buscarPorNombre(data.nombre);
  if (existente) throw new DomainError("Este software ya está en el catálogo.");
  return repo.crear(data);
}

// ---------------------------------------------------------------------------
// HU-02: Editar software
// ---------------------------------------------------------------------------
export async function editar(
  id: string,
  data: { nombre?: string; tipo?: "licenciado" | "gratuito"; version?: string },
  repo: ISoftwareRepository = defaultRepo
) {
  if (data.nombre) {
    const existente = await repo.buscarPorNombre(data.nombre);
    if (existente && existente.id !== id) {
      throw new DomainError("Este nombre de software ya está en el catálogo.");
    }
  }
  return repo.actualizar(id, data);
}

// ---------------------------------------------------------------------------
// HU-03: Eliminar — bloquea si tiene relaciones (Plan_Software.md)
// ---------------------------------------------------------------------------
export async function eliminar(softwareId: string, repo: ISoftwareRepository = defaultRepo) {
  const relaciones = await repo.contarRelaciones(softwareId);
  if (relaciones > 0) {
    throw new DomainError(
      "Este software está en uso (instalado en algún equipo o referenciado por un ticket) y no se puede eliminar."
    );
  }
  return repo.eliminar(softwareId);
}

export async function listar(repo: ISoftwareRepository = defaultRepo) {
  return repo.listar();
}
