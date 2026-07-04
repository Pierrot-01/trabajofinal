// lib/validators/equipo.validators.ts — Zod schemas para Equipos
import { z } from "zod";

export const crearEquipoSchema = z.object({
  codigoInventario: z.string().min(1, "El código de inventario es obligatorio.").max(50),
  laboratorioId: z.string().min(1, "Debes seleccionar un laboratorio."),
});

export const editarEquipoSchema = z.object({
  codigoInventario: z.string().min(1).max(50).optional(),
  laboratorioId: z.string().min(1).optional(),
  estado: z.enum(["operativo", "mantenimiento", "inoperativo"]).optional(),
});

export type CrearEquipoInput = z.infer<typeof crearEquipoSchema>;
export type EditarEquipoInput = z.infer<typeof editarEquipoSchema>;
