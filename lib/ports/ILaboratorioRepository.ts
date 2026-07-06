// lib/ports/ILaboratorioRepository.ts — Puerto (interfaz) del repositorio de Laboratorios

export interface LaboratorioBase {
  id: string;
  nombre: string;
  ubicacion: string;
  capacidad: number;
}

export interface LaboratorioConEquipos {
  id: string;
  nombre: string;
  ubicacion: string;
  capacidad: number;
  equipos: { id: string; codigoInventario: string; estado: string }[];
}

export interface ILaboratorioRepository {
  crear(data: { nombre: string; ubicacion: string; capacidad: number }): Promise<LaboratorioBase>;
  buscarPorId(id: string): Promise<LaboratorioBase | null>;
  listar(): Promise<LaboratorioBase[]>;
  listarConEquipos(): Promise<LaboratorioConEquipos[]>;
  contarEquipos(laboratorioId: string): Promise<number>;
}
