// lib/api-response.ts — Contrato de respuesta (Art. IX + IX v1.3)
// Toda Server Action y API Route retorna este tipo, sin excepción.

export type ApiResponse<T> =
  | { success: true; data: T; warning?: string }
  | { success: false; error: string };

/**
 * Respuesta exitosa. Opcionalmente incluye un warning que NO bloquea la operación.
 * Ejemplo de warning: "Ya existe un ticket abierto para este equipo"
 */
export function ok<T>(data: T, warning?: string): ApiResponse<T> {
  return warning
    ? { success: true, data, warning }
    : { success: true, data };
}

/**
 * Respuesta de error. Mensaje seguro para el cliente (Art. X).
 * Nunca incluye stack traces, códigos de Prisma/MySQL, ni rutas del servidor.
 */
export function fail(error: string): ApiResponse<never> {
  return { success: false, error };
}
