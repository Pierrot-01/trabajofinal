// app/admin/usuarios/actions.ts — Server Actions para gestión de usuarios
"use server";

import { auth } from "@/lib/auth";
import * as usuarioService from "@/lib/services/usuario.service";
import { DomainError } from "@/lib/errors/domain-error";
import { logger } from "@/lib/logger";
import { ok, fail, type ApiResponse } from "@/lib/api-response";
import { revalidatePath } from "next/cache";

type Rol = "admin" | "tecnico" | "docente" | "estudiante";

/**
 * Server Action para que el Administrador cree un usuario nuevo (HU-02).
 */
export async function crearUsuario(formData: {
  nombre: string;
  correo: string;
  rol: Rol;
  password: string;
}): Promise<ApiResponse<any>> {
  const session = await auth();
  if (!session?.user || session.user.rol !== "admin") {
    logger.warn("crearUsuarioAction", "Intento de acceso no autorizado", {
      usuarioId: session?.user?.id,
      rol: session?.user?.rol,
    });
    return fail("No autorizado. Se requieren privilegios de administrador.");
  }

  try {
    const usuario = await usuarioService.crear(formData);
    revalidatePath("/admin/usuarios");
    return ok(usuario);
  } catch (err) {
    if (err instanceof DomainError) {
      return fail(err.message);
    }
    logger.error("crearUsuarioAction", "Error no controlado", { err });
    return fail("Ocurrió un error inesperado, intenta nuevamente.");
  }
}

/**
 * Server Action para cambiar el rol de un usuario (HU-03).
 */
export async function cambiarRolUsuario(
  targetUsuarioId: string,
  nuevoRol: Rol
): Promise<ApiResponse<any>> {
  const session = await auth();
  if (!session?.user || session.user.rol !== "admin") {
    return fail("No autorizado. Se requieren privilegios de administrador.");
  }

  if (session.user.id === targetUsuarioId) {
    return fail("No puedes cambiar tu propio rol.");
  }

  try {
    const usuario = await usuarioService.cambiarRol(targetUsuarioId, nuevoRol);
    revalidatePath("/admin/usuarios");
    return ok(usuario);
  } catch (err) {
    if (err instanceof DomainError) {
      return fail(err.message);
    }
    logger.error("cambiarRolUsuarioAction", "Error no controlado", { err });
    return fail("Ocurrió un error inesperado, intenta nuevamente.");
  }
}

/**
 * Server Action para desactivar un usuario (HU-03).
 */
export async function desactivarUsuario(
  targetUsuarioId: string
): Promise<ApiResponse<any>> {
  const session = await auth();
  if (!session?.user || session.user.rol !== "admin") {
    return fail("No autorizado. Se requieren privilegios de administrador.");
  }

  if (session.user.id === targetUsuarioId) {
    return fail("No puedes desactivar tu propia cuenta.");
  }

  try {
    const usuario = await usuarioService.desactivar(targetUsuarioId);
    revalidatePath("/admin/usuarios");
    return ok(usuario);
  } catch (err) {
    if (err instanceof DomainError) {
      return fail(err.message);
    }
    logger.error("desactivarUsuarioAction", "Error no controlado", { err });
    return fail("Ocurrió un error inesperado, intenta nuevamente.");
  }
}
