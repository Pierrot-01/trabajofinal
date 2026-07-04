// app/recuperar-password/actions.ts — Server Actions públicas para restablecimiento
"use server";

import * as usuarioService from "@/lib/services/usuario.service";
import { DomainError } from "@/lib/errors/domain-error";
import { logger } from "@/lib/logger";
import { ok, fail, type ApiResponse } from "@/lib/api-response";
import {
  solicitarRecuperacionSchema,
  resetearPasswordSchema,
} from "@/lib/validators/usuario.validators";

/**
 * Solicita el enlace de recuperación de contraseña (HU-05).
 * Devuelve siempre success: true por seguridad.
 */
export async function solicitarEnlaceRecuperacion(formData: {
  correo: string;
}): Promise<ApiResponse<any>> {
  const result = solicitarRecuperacionSchema.safeParse(formData);
  if (!result.success) {
    return fail(result.error.issues[0].message);
  }

  try {
    const res = await usuarioService.solicitarRecuperacion(formData.correo);
    return ok(res);
  } catch (err) {
    logger.error("solicitarEnlaceRecuperacionAction", "Error no controlado", { err });
    // Failsafe de seguridad (retornar siempre ok para evitar enumeración)
    return ok({ success: true });
  }
}

/**
 * Restablece la contraseña usando el token plano recibido del enlace (HU-05).
 */
export async function resetearPasswordConToken(formData: {
  token: string;
  passwordNueva: string;
}): Promise<ApiResponse<any>> {
  const result = resetearPasswordSchema.safeParse(formData);
  if (!result.success) {
    return fail(result.error.issues[0].message);
  }

  try {
    const res = await usuarioService.resetearPassword(
      formData.token,
      formData.passwordNueva
    );
    return ok(res);
  } catch (err) {
    if (err instanceof DomainError) {
      return fail(err.message);
    }
    logger.error("resetearPasswordConTokenAction", "Error no controlado", { err });
    return fail("Ocurrió un error inesperado, intenta nuevamente.");
  }
}
