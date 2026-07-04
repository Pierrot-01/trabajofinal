// app/tickets/actions.ts — Server Actions del módulo Tickets
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import * as ticketService from "@/lib/services/ticket.service";
import { crearTicketSchema, cambiarEstadoSchema, comentarioSchema } from "@/lib/validators/ticket.validators";
import { ok, fail } from "@/lib/api-response";
import { DomainError } from "@/lib/errors/domain-error";
import { logger } from "@/lib/logger";

type EstadoTicket = "pendiente" | "en_proceso" | "resuelto";


// ---------------------------------------------------------------------------
// crearTicket (T021) — HU-01 / HU-02
// ---------------------------------------------------------------------------
export async function crearTicket(rawInput: unknown) {
  const session = await auth();
  if (!session?.user) return fail("No autenticado.");

  const parsed = crearTicketSchema.safeParse(rawInput);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  try {
    const result = await ticketService.crear(parsed.data as any, session.user.id, session.user.rol);
    revalidatePath("/tickets");
    revalidatePath("/laboratorios");
    return result; // ya viene en formato ApiResponse (ok / ok+warning)
  } catch (err) {
    if (err instanceof DomainError) return fail(err.message);
    logger.error("crearTicket", "Error no controlado", { err });
    return fail("Ocurrió un error. Intenta nuevamente.");
  }
}

// ---------------------------------------------------------------------------
// asignarTicket (T040) — HU-03
// ---------------------------------------------------------------------------
export async function asignarTicket(ticketId: string) {
  const session = await auth();
  if (!session?.user) return fail("No autenticado.");

  try {
    const result = await ticketService.asignar(ticketId, session.user.id, session.user.rol);
    revalidatePath("/tickets");
    revalidatePath(`/tickets/${ticketId}`);
    return ok(result);
  } catch (err) {
    if (err instanceof DomainError) return fail(err.message);
    logger.error("asignarTicket", "Error no controlado", { err });
    return fail("Ocurrió un error. Intenta nuevamente.");
  }
}

// ---------------------------------------------------------------------------
// reasignarTicket (T040) — HU-03 Clarify #5 (solo admin)
// ---------------------------------------------------------------------------
export async function reasignarTicket(ticketId: string, tecnicoId: string) {
  const session = await auth();
  if (!session?.user) return fail("No autenticado.");

  try {
    const result = await ticketService.reasignar(ticketId, tecnicoId, session.user.rol);
    revalidatePath("/tickets");
    revalidatePath(`/tickets/${ticketId}`);
    return ok(result);
  } catch (err) {
    if (err instanceof DomainError) return fail(err.message);
    logger.error("reasignarTicket", "Error no controlado", { err });
    return fail("Ocurrió un error. Intenta nuevamente.");
  }
}

// ---------------------------------------------------------------------------
// cambiarEstadoTicket (T040) — HU-03
// ---------------------------------------------------------------------------
export async function cambiarEstadoTicket(rawInput: unknown) {
  const session = await auth();
  if (!session?.user) return fail("No autenticado.");

  const parsed = cambiarEstadoSchema.safeParse(rawInput);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  try {
    const result = await ticketService.cambiarEstado(
      parsed.data.ticketId,
      parsed.data.nuevoEstado as EstadoTicket,
      parsed.data.comentarioCierre,
      session.user.id,
      session.user.rol
    );
    revalidatePath("/tickets");
    revalidatePath(`/tickets/${parsed.data.ticketId}`);
    revalidatePath("/laboratorios");
    return ok(result);
  } catch (err) {
    if (err instanceof DomainError) return fail(err.message);
    logger.error("cambiarEstadoTicket", "Error no controlado", { err });
    return fail("Ocurrió un error. Intenta nuevamente.");
  }
}

// ---------------------------------------------------------------------------
// agregarComentario (T058) — HU-07
// ---------------------------------------------------------------------------
export async function agregarComentario(rawInput: unknown) {
  const session = await auth();
  if (!session?.user) return fail("No autenticado.");

  const parsed = comentarioSchema.safeParse(rawInput);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  try {
    const result = await ticketService.agregarComentario(parsed.data, session.user.id);
    revalidatePath(`/tickets/${parsed.data.ticketId}`);
    return ok(result);
  } catch (err) {
    if (err instanceof DomainError) return fail(err.message);
    logger.error("agregarComentario", "Error no controlado", { err });
    return fail("Ocurrió un error. Intenta nuevamente.");
  }
}
