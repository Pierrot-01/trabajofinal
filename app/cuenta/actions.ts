// app/cuenta/actions.ts — Server Action para la cuenta de usuario
"use server";

import { auth } from "@/lib/auth";
import * as usuarioService from "@/lib/services/usuario.service";
import { DomainError } from "@/lib/errors/domain-error";
import { logger } from "@/lib/logger";
import { ok, fail, type ApiResponse } from "@/lib/api-response";
import { cambiarPasswordSchema } from "@/lib/validators/usuario.validators";

/**
 * Permite a cualquier usuario logueado cambiar su contraseña (HU-04).
 */
export async function cambiarPasswordPropia(formData: {
  passwordActual: string;
  passwordNueva: string;
}): Promise<ApiResponse<any>> {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("No autorizado. Inicie sesión para realizar esta acción.");
  }

  // Validar Zod
  const result = cambiarPasswordSchema.safeParse(formData);
  if (!result.success) {
    return fail(result.error.issues[0].message);
  }

  try {
    const res = await usuarioService.cambiarPassword(
      session.user.id,
      formData.passwordActual,
      formData.passwordNueva
    );
    return ok(res);
  } catch (err) {
    if (err instanceof DomainError) {
      return fail(err.message);
    }
    logger.error("cambiarPasswordPropiaAction", "Error no controlado", { err });
    return fail("Ocurrió un error inesperado, intenta nuevamente.");
  }
}
