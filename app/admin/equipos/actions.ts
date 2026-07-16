// app/admin/equipos/actions.ts — Server Actions de Equipos (HU-02, HU-03, HU-04)
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import * as equipoService from "@/lib/services/equipo.service";
import { crearEquipoSchema, editarEquipoSchema } from "@/lib/validators/equipo.validators";
import { ok, fail } from "@/lib/api-response";
import { DomainError } from "@/lib/errors/domain-error";
import { logger } from "@/lib/logger";
import type { EstadoEquipo } from "@/lib/prisma-client";

export async function crearEquipo(rawInput: unknown) {
  const session = await auth();
  if (!session?.user || session.user.rol !== "admin") return fail("No autorizado.");

  const parsed = crearEquipoSchema.safeParse(rawInput);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  try {
    const equipo = await equipoService.crear(parsed.data);
    revalidatePath("/admin/equipos");
    revalidatePath("/laboratorios");
    return ok(equipo);
  } catch (err) {
    if (err instanceof DomainError) return fail(err.message);
    logger.error("crearEquipo", "Error no controlado", { err });
    return fail("Ocurrió un error. Intenta nuevamente.");
  }
}

export async function editarEquipo(equipoId: string, rawInput: unknown) {
  const session = await auth();
  if (!session?.user || (session.user.rol !== "admin" && session.user.rol !== "tecnico")) {
    return fail("No autorizado.");
  }

  const parsed = editarEquipoSchema.safeParse(rawInput);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  // Un técnico solo puede modificar el estado del equipo
  if (session.user.rol === "tecnico") {
    const keys = Object.keys(parsed.data) as Array<keyof typeof parsed.data>;
    const modifiedKeys = keys.filter(k => parsed.data[k] !== undefined);
    const hasOnlyEstado = modifiedKeys.length === 1 && modifiedKeys[0] === "estado";
    if (!hasOnlyEstado) {
      return fail("No autorizado a modificar otros campos de equipos.");
    }
  }

  try {
    // Si se está cambiando solo el estado, usar editarEstado que devuelve warning
    if (parsed.data.estado && Object.keys(parsed.data).length === 1) {
      const res = await equipoService.editarEstado(equipoId, parsed.data.estado as EstadoEquipo);
      revalidatePath("/admin/equipos");
      revalidatePath("/laboratorios");
      return res;
    }
    const equipo = await equipoService.editar(equipoId, parsed.data as any);
    revalidatePath("/admin/equipos");
    return ok(equipo);
  } catch (err) {
    if (err instanceof DomainError) return fail(err.message);
    logger.error("editarEquipo", "Error no controlado", { err });
    return fail("Ocurrió un error. Intenta nuevamente.");
  }
}

export async function darDeBajaEquipo(equipoId: string) {
  const session = await auth();
  if (!session?.user || session.user.rol !== "admin") return fail("No autorizado.");

  try {
    const equipo = await equipoService.darDeBaja(equipoId);
    revalidatePath("/admin/equipos");
    revalidatePath("/laboratorios");
    return ok(equipo);
  } catch (err) {
    if (err instanceof DomainError) return fail(err.message);
    logger.error("darDeBajaEquipo", "Error no controlado", { err });
    return fail("Ocurrió un error. Intenta nuevamente.");
  }
}
