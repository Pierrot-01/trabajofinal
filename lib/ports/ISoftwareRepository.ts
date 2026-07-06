// lib/ports/ISoftwareRepository.ts — Puerto (interfaz) del repositorio de Software

export interface SoftwareBase {
  id: string;
  nombre: string;
  tipo: "licenciado" | "gratuito";
  version: string | null;
}

export interface ISoftwareRepository {
  crear(data: { nombre: string; tipo: "licenciado" | "gratuito"; version?: string }): Promise<SoftwareBase>;
  buscarPorId(id: string): Promise<SoftwareBase | null>;
  buscarPorNombre(nombre: string): Promise<SoftwareBase | null>;
  listar(): Promise<SoftwareBase[]>;
  actualizar(
    id: string,
    data: { nombre?: string; tipo?: "licenciado" | "gratuito"; version?: string }
  ): Promise<SoftwareBase>;
  eliminar(id: string): Promise<SoftwareBase>;
  contarRelaciones(softwareId: string): Promise<number>;
}
