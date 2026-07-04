// lib/validators/software.validators.ts — Zod schemas para Software
import { z } from "zod";

export const crearSoftwareSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio.").max(100),
  tipo: z.enum(["licenciado", "gratuito"]),
  version: z.string().max(50).optional(),
});

export const editarSoftwareSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  tipo: z.enum(["licenciado", "gratuito"]).optional(),
  version: z.string().max(50).optional(),
});

export type CrearSoftwareInput = z.infer<typeof crearSoftwareSchema>;
export type EditarSoftwareInput = z.infer<typeof editarSoftwareSchema>;
