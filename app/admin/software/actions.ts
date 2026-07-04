// app/admin/software/actions.ts — Server Actions del Catálogo de Software
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import * as softwareService from "@/lib/services/software.service";
import { crearSoftwareSchema, editarSoftwareSchema } from "@/lib/validators/software.validators";
import { ok, fail } from "@/lib/api-response";
import { DomainError } from "@/lib/errors/domain-error";
import { logger } from "@/lib/logger";

export async function crearSoftware(rawInput: unknown) {
  const session = await auth();
  if (!session?.user || session.user.rol !== "admin") return fail("No autorizado.");

  const parsed = crearSoftwareSchema.safeParse(rawInput);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  try {
    const sw = await softwareService.crear(parsed.data);
    revalidatePath("/admin/software");
    return ok(sw);
  } catch (err) {
    if (err instanceof DomainError) return fail(err.message);
    logger.error("crearSoftware", "Error no controlado", { err });
    return fail("Ocurrió un error. Intenta nuevamente.");
  }
}

export async function editarSoftware(id: string, rawInput: unknown) {
  const session = await auth();
  if (!session?.user || session.user.rol !== "admin") return fail("No autorizado.");

  const parsed = editarSoftwareSchema.safeParse(rawInput);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  try {
    const sw = await softwareService.editar(id, parsed.data as any);
    revalidatePath("/admin/software");
    return ok(sw);
  } catch (err) {
    if (err instanceof DomainError) return fail(err.message);
    logger.error("editarSoftware", "Error no controlado", { err });
    return fail("Ocurrió un error. Intenta nuevamente.");
  }
}

export async function eliminarSoftware(id: string) {
  const session = await auth();
  if (!session?.user || session.user.rol !== "admin") return fail("No autorizado.");

  try {
    await softwareService.eliminar(id);
    revalidatePath("/admin/software");
    return ok({ eliminado: true });
  } catch (err) {
    if (err instanceof DomainError) return fail(err.message);
    logger.error("eliminarSoftware", "Error no controlado", { err });
    return fail("Ocurrió un error. Intenta nuevamente.");
  }
}
