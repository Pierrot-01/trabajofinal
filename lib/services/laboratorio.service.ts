// lib/services/laboratorio.service.ts — Lógica de negocio de Laboratorios (HU-01)
import { ILaboratorioRepository } from "../ports/ILaboratorioRepository";
import * as defaultRepo from "../repositories/laboratorio.repository";


export async function crear(
  data: { nombre: string; ubicacion: string; capacidad: number },
  repo: ILaboratorioRepository = defaultRepo
) {
  return repo.crear(data);
}

export async function listar(repo: ILaboratorioRepository = defaultRepo) {
  return repo.listar();
}

export async function listarConEquipos(repo: ILaboratorioRepository = defaultRepo) {
  return repo.listarConEquipos();
}
