// lib/ports/ITicketRepository.ts — Puerto (interfaz) del repositorio de Tickets
// Arquitectura Hexagonal: el dominio define el contrato, la infraestructura lo implementa.

export type EstadoTicket = "pendiente" | "en_proceso" | "resuelto";
export type TipoTicket = "incidencia" | "solicitud";
export type CategoriaTicket = "hardware" | "software_licencia" | "software_general" | "red";

export interface CrearTicketData {
  tipo: TipoTicket;
  categoria: CategoriaTicket;
  descripcion: string;
  fotoUrl?: string;
  softwareId?: string;
  softwareTexto?: string;
  fechaLimite?: Date;
  equipoId: string;
  usuarioReportaId: string;
  ticketRelacionadoId?: string;
}

export interface TicketBase {
  id: string;
  tipo: TipoTicket;
  categoria: CategoriaTicket;
  estado: EstadoTicket;
  fechaCreacion: Date;
  fechaLimite?: Date | null;
  fechaCierre?: Date | null;
  tecnicoAsignadoId?: string | null;
  softwareId?: string | null;
  equipo: { id: string; codigoInventario: string; estado: string; laboratorioId: string };
}

export interface ITicketRepository {
  crear(data: CrearTicketData): Promise<{ id: string }>;
  buscarPorId(id: string): Promise<TicketBase | null>;
  buscarPorEquipoYEstado(
    equipoId: string,
    estados: EstadoTicket[]
  ): Promise<{ id: string; tipo: string; estado: string }[]>;
  actualizarEstado(
    id: string,
    estado: EstadoTicket,
    extras?: { fechaCierre?: Date; comentarioCierre?: string }
  ): Promise<unknown>;
  asignarTecnico(id: string, tecnicoId: string): Promise<unknown>;
  contarPorEquipoYEstados(equipoId: string, estados: EstadoTicket[]): Promise<number>;
  crearComentario(data: {
    ticketId: string;
    usuarioId: string;
    contenido: string;
  }): Promise<unknown>;
  tiempoPromedioResolucion(): Promise<Record<string, number>>;
  equiposConMasTickets(n: number, meses: number): Promise<unknown[]>;
}
