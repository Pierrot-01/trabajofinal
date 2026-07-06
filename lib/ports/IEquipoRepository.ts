// lib/ports/IEquipoRepository.ts — Puerto (interfaz) del repositorio de Equipos
import type { EstadoEquipo } from "@prisma/client";

export interface EquipoBase {
  id: string;
  codigoInventario: string;
  laboratorioId: string;
  estado: EstadoEquipo;
}

export interface EquipoConLaboratorio {
  id: string;
  codigoInventario: string;
  estado: EstadoEquipo;
  laboratorio: { nombre: string };
}

export interface IEquipoRepository {
  buscarPorId(id: string): Promise<EquipoBase | null>;
  buscarPorCodigo(codigo: string): Promise<EquipoBase | null>;
  actualizarEstado(id: string, estado: EstadoEquipo): Promise<EquipoBase>;
  crear(data: { codigoInventario: string; laboratorioId: string }): Promise<EquipoBase>;
  editar(
    id: string,
    data: { codigoInventario?: string; laboratorioId?: string; estado?: EstadoEquipo }
  ): Promise<EquipoBase>;
  contarTicketsAbiertos(id: string): Promise<number>;
  listarPaginado(params: {
    laboratorioId?: string;
    cursor?: string;
    take?: number;
    incluirDadosDeBaja?: boolean;
  }): Promise<{ items: EquipoConLaboratorio[]; nextCursor: string | null }>;
  buscarEquiposPorLaboratorio(laboratorioId: string): Promise<{ id: string; codigoInventario: string; estado: EstadoEquipo }[]>;
  upsertEquipoSoftware(equipoId: string, softwareId: string): Promise<unknown>;
}

