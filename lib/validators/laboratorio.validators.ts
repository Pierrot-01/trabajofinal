// lib/validators/laboratorio.validators.ts — Zod schemas para Laboratorios
import { z } from "zod";

export const crearLaboratorioSchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio.").max(100),
  ubicacion: z.string().min(2, "La ubicación es obligatoria.").max(200),
  capacidad: z
    .number()
    .int()
    .positive("La capacidad debe ser un entero positivo."),
});

export type CrearLaboratorioInput = z.infer<typeof crearLaboratorioSchema>;
