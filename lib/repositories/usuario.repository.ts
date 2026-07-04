// lib/repositories/usuario.repository.ts — Repository for Usuario and Tokens
// Art. III: queries Prisma aisladas.
// Art. XIV: selects explícitos y paginación por cursor.

import { prisma } from "@/lib/prisma";

type Rol = "admin" | "tecnico" | "docente" | "estudiante";


/**
 * Busca un usuario por su correo.
 */
export async function buscarPorCorreo(correo: string) {
  return prisma.usuario.findUnique({
    where: { correo },
    select: {
      id: true,
      nombre: true,
      correo: true,
      passwordHash: true,
      rol: true,
      activo: true,
      intentosFallidos: true,
      bloqueadoHasta: true,
    },
  });
}

/**
 * Busca un usuario por su ID.
 */
export async function buscarPorId(id: string) {
  return prisma.usuario.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      correo: true,
      rol: true,
      activo: true,
    },
  });
}

/**
 * Busca específicamente el hash de contraseña de un usuario por su ID.
 * Usado para cambio de contraseña en service.
 */
export async function buscarPasswordHashPorId(id: string) {
  return prisma.usuario.findUnique({
    where: { id },
    select: {
      id: true,
      passwordHash: true,
    },
  });
}

/**
 * Busca todos los tokens de restablecimiento activos generales (no usados y no expirados).
 */
export async function listarTokensActivos() {
  return prisma.passwordResetToken.findMany({
    where: {
      usado: false,
      expiraEn: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      usuarioId: true,
      tokenHash: true,
    },
  });
}

/**
 * Crea un usuario nuevo.
 */
export async function crear(data: {
  nombre: string;
  correo: string;
  passwordHash: string;
  rol: Rol;
}) {
  return prisma.usuario.create({
    data: {
      nombre: data.nombre,
      correo: data.correo,
      passwordHash: data.passwordHash,
      rol: data.rol,
      activo: true,
      intentosFallidos: 0,
    },
    select: {
      id: true,
      nombre: true,
      correo: true,
      rol: true,
      activo: true,
    },
  });
}

/**
 * Actualiza los datos de un usuario.
 */
export async function actualizar(id: string, data: {
  nombre?: string;
  correo?: string;
  passwordHash?: string;
  rol?: Rol;
  activo?: boolean;
}) {
  return prisma.usuario.update({
    where: { id },
    data,
    select: {
      id: true,
      nombre: true,
      correo: true,
      rol: true,
      activo: true,
    },
  });
}

/**
 * Lista usuarios con paginación por cursor.
 */
export async function listarPaginado(params: {
  cursor?: string;
  take: number;
}) {
  const { cursor, take } = params;

  const usuarios = await prisma.usuario.findMany({
    select: {
      id: true,
      nombre: true,
      correo: true,
      rol: true,
      activo: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  const hasMore = usuarios.length > take;
  const items = hasMore ? usuarios.slice(0, take) : usuarios;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return { items, nextCursor };
}

/**
 * Cuenta administradores activos.
 */
export async function contarAdminsActivos(): Promise<number> {
  return prisma.usuario.count({
    where: {
      rol: "admin",
      activo: true,
    },
  });
}

/**
 * Crea un token de restablecimiento de contraseña.
 */
export async function crearResetToken(
  usuarioId: string,
  tokenHash: string,
  expiraEn: Date
) {
  return prisma.passwordResetToken.create({
    data: {
      usuarioId,
      tokenHash,
      expiraEn,
    },
  });
}

/**
 * Busca un token activo (no usado y no expirado).
 */
export async function buscarTokenActivo(tokenHash: string) {
  return prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usado: false,
      expiraEn: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      usuarioId: true,
      expiraEn: true,
      usado: true,
    },
  });
}

/**
 * Marca un token de recuperación como usado.
 */
export async function marcarTokenUsado(tokenId: string) {
  return prisma.passwordResetToken.update({
    where: { id: tokenId },
    data: { usado: true },
  });
}

/**
 * Incrementa el número de intentos fallidos.
 */
export async function registrarIntentoFallido(usuarioId: string, intentos: number) {
  return prisma.usuario.update({
    where: { id: usuarioId },
    data: { intentosFallidos: intentos },
  });
}

/**
 * Resetea los intentos fallidos y desbloquea al usuario.
 */
export async function resetearIntentos(usuarioId: string) {
  return prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      intentosFallidos: 0,
      bloqueadoHasta: null,
    },
  });
}

/**
 * Bloquea temporalmente al usuario hasta una fecha/hora dada.
 */
export async function bloquearUsuario(usuarioId: string, bloqueadoHasta: Date) {
  return prisma.usuario.update({
    where: { id: usuarioId },
    data: { bloqueadoHasta },
  });
}
