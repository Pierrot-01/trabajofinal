// lib/ports/IUsuarioRepository.ts — Puerto (interfaz) del repositorio de Usuarios

export type Rol = "admin" | "tecnico" | "docente" | "estudiante";

export interface UsuarioBase {
  id: string;
  nombre: string;
  correo: string;
  passwordHash: string;
  rol: Rol;
  activo: boolean;
  intentosFallidos?: number | null;
  bloqueadoHasta?: Date | null;
}

export interface UsuarioSinHash {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  activo: boolean;
}

export interface UsuarioPaginado {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  activo: boolean;
  createdAt: Date;
}

export interface ResetTokenBase {
  id: string;
  usuarioId: string;
  tokenHash: string;
}

export interface TokenActivoInfo {
  id: string;
  usuarioId: string;
  expiraEn: Date;
  usado: boolean;
}

export interface IUsuarioRepository {
  buscarPorCorreo(correo: string): Promise<UsuarioBase | null>;
  buscarPorId(id: string): Promise<UsuarioSinHash | null>;
  buscarPasswordHashPorId(id: string): Promise<{ id: string; passwordHash: string } | null>;
  listarTokensActivos(): Promise<ResetTokenBase[]>;
  crear(data: {
    nombre: string;
    correo: string;
    passwordHash: string;
    rol: Rol;
  }): Promise<UsuarioSinHash>;
  actualizar(
    id: string,
    data: {
      nombre?: string;
      correo?: string;
      passwordHash?: string;
      rol?: Rol;
      activo?: boolean;
    }
  ): Promise<UsuarioSinHash>;
  listarPaginado(params: {
    cursor?: string;
    take: number;
  }): Promise<{ items: UsuarioPaginado[]; nextCursor: string | null }>;
  contarAdminsActivos(): Promise<number>;
  crearResetToken(usuarioId: string, tokenHash: string, expiraEn: Date): Promise<unknown>;
  buscarTokenActivo(tokenHash: string): Promise<TokenActivoInfo | null>;
  marcarTokenUsado(tokenId: string): Promise<unknown>;
  registrarIntentoFallido(usuarioId: string, intentos: number): Promise<unknown>;
  resetearIntentos(usuarioId: string): Promise<unknown>;
  bloquearUsuario(usuarioId: string, bloqueadoHasta: Date): Promise<unknown>;
}
