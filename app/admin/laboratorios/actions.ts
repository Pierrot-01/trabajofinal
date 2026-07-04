// app/admin/laboratorios/actions.ts — Server Actions de Laboratorios
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import * as laboratorioService from "@/lib/services/laboratorio.service";
import { crearLaboratorioSchema } from "@/lib/validators/laboratorio.validators";
import { ok, fail } from "@/lib/api-response";
import { DomainError } from "@/lib/errors/domain-error";
import { logger } from "@/lib/logger";

export async function crearLaboratorio(rawInput: unknown) {
  const session = await auth();
  if (!session?.user || session.user.rol !== "admin") return fail("No autorizado.");

  const parsed = crearLaboratorioSchema.safeParse(rawInput);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  try {
    const lab = await laboratorioService.crear(parsed.data);
    revalidatePath("/admin/laboratorios");
    revalidatePath("/laboratorios");
    return ok(lab);
  } catch (err) {
    if (err instanceof DomainError) return fail(err.message);
    logger.error("crearLaboratorio", "Error no controlado", { err });
    return fail("Ocurrió un error. Intenta nuevamente.");
  }
}
