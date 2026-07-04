// lib/errors/domain-error.ts — Error de dominio (Art. X)
// Se usa para errores de lógica de negocio explícitos (ej. equipo no existe,
// ticket ya asignado, transición de estado inválida).
// Se distingue de errores no controlados (Prisma, red, MySQL) que se capturan
// por separado y se devuelven al cliente como mensaje genérico.

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}
