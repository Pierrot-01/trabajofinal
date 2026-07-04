// lib/services/laboratorio.service.ts — Lógica de negocio de Laboratorios (HU-01)
import * as laboratorioRepository from "@/lib/repositories/laboratorio.repository";
export async function crear(data: { nombre: string; ubicacion: string; capacidad: number }) {
  return laboratorioRepository.crear(data);
}

export async function listar() {
  return laboratorioRepository.listar();
}

export async function listarConEquipos() {
  return laboratorioRepository.listarConEquipos();
}
