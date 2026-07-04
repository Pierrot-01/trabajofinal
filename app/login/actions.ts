// app/login/actions.ts — Server Action para inicio de sesión
"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { logger } from "@/lib/logger";

/**
 * Server Action para procesar el inicio de sesión.
 */
export async function loginAction(correo: string, passwordPlain: string) {
  try {
    const res = await signIn("credentials", {
      correo,
      password: passwordPlain,
      redirect: false,
    });

    if (res?.error) {
      return { success: false, error: "Correo o contraseña incorrectos." };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      const causeMessage = error.cause?.err?.message;
      if (causeMessage) {
        return { success: false, error: causeMessage };
      }
      return { success: false, error: "Correo o contraseña incorrectos." };
    }

    // Next.js redirige internamente arrojando un error especial,
    // debemos dejarlo pasar si ocurre.
    if ((error as any).message === "NEXT_REDIRECT" || (error as any).digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }

    logger.error("loginAction", "Error al iniciar sesión", { error });
    return { success: false, error: "Ocurrió un error al iniciar sesión. Intenta nuevamente." };
  }
}
