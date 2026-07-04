// lib/validators/usuario.validators.ts — Esquemas de validación de Usuarios
import { z } from "zod/v4";

/**
 * Validador para asegurar que un correo electrónico sea institucional de la UNSCH
 */
export const correoInstitucionalSchema = z
  .string()
  .email("Formato de correo inválido")
  .refine((correo) => correo.endsWith("@unsch.edu.pe"), {
    message: "Debe usar un correo institucional (@unsch.edu.pe)",
  });

/**
 * Esquema para la creación de un usuario (HU-02)
 */
export const crearUsuarioSchema = z.object({
  nombre: z
    .string()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(100, "El nombre es demasiado largo"),
  correo: correoInstitucionalSchema,
  rol: z.enum(["admin", "tecnico", "docente", "estudiante"]),
  password: z
    .string()
    .min(8, "La contraseña temporal debe tener al menos 8 caracteres")
    .max(100, "La contraseña es demasiado larga"),
});

/**
 * Esquema para cambiar contraseña propia (HU-04)
 */
export const cambiarPasswordSchema = z.object({
  passwordActual: z.string().min(1, "La contraseña actual es obligatoria"),
  passwordNueva: z
    .string()
    .min(8, "La nueva contraseña debe tener al menos 8 caracteres")
    .max(100, "La nueva contraseña es demasiado larga"),
});

/**
 * Esquema para solicitar recuperación (HU-05)
 */
export const solicitarRecuperacionSchema = z.object({
  correo: correoInstitucionalSchema,
});

/**
 * Esquema para restablecer contraseña con token (HU-05)
 */
export const resetearPasswordSchema = z.object({
  token: z.string().min(1, "El token es obligatorio"),
  passwordNueva: z
    .string()
    .min(8, "La nueva contraseña debe tener al menos 8 caracteres")
    .max(100, "La nueva contraseña es demasiado larga"),
});

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;
export type CambiarPasswordInput = z.infer<typeof cambiarPasswordSchema>;
export type SolicitarRecuperacionInput = z.infer<typeof solicitarRecuperacionSchema>;
export type ResetearPasswordInput = z.infer<typeof resetearPasswordSchema>;
