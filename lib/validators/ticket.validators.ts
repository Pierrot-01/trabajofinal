// lib/validators/ticket.validators.ts — Esquemas Zod para el módulo de Tickets
import { z } from "zod";

export const crearTicketSchema = z
  .object({
    tipo: z.enum(["incidencia", "solicitud"]),
    categoria: z.enum(["hardware", "software_licencia", "software_general", "red"]),
    descripcion: z
      .string()
      .min(10, "La descripción debe tener al menos 10 caracteres.")
      .max(500, "La descripción no puede superar los 500 caracteres."),
    fotoUrl: z.string().url().optional(),
    equipoId: z.string().min(1, "Debes seleccionar un equipo."),
    softwareId: z.string().optional(),
    softwareTexto: z.string().max(100).optional(),
    fechaLimite: z.coerce.date().optional(),
    ticketRelacionadoId: z.string().optional(),
  })
  .refine(
    (data) => {
      // softwareId y softwareTexto no pueden coexistir
      if (data.softwareId && data.softwareTexto) return false;
      return true;
    },
    { message: "Debes indicar el software del catálogo O en texto libre, no ambos." }
  );

export const cambiarEstadoSchema = z.object({
  ticketId: z.string().min(1),
  nuevoEstado: z.enum(["pendiente", "en_proceso", "resuelto"]),
  comentarioCierre: z.string().optional(),
});

export const comentarioSchema = z.object({
  ticketId: z.string().min(1),
  contenido: z.string().min(1, "El comentario no puede estar vacío.").max(1000),
});
