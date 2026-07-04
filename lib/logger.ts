// lib/logger.ts — Logger estructurado (Art. X, plan.md Sección 5.4)
// Salida JSON a stdout — suficiente para logs de Vercel.
// Nunca usar console.log/console.error plano en Server Actions.

type LogLevel = "info" | "warn" | "error";

function log(
  level: LogLevel,
  context: string,
  message: string,
  meta?: Record<string, unknown>
) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    context,
    message,
    ...meta,
  };
  // En producción, Vercel captura stdout/stderr como logs estructurados.
  // El nivel determina el método de consola para que Vercel los clasifique.
  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else if (level === "warn") {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  info: (context: string, message: string, meta?: Record<string, unknown>) =>
    log("info", context, message, meta),
  warn: (context: string, message: string, meta?: Record<string, unknown>) =>
    log("warn", context, message, meta),
  error: (context: string, message: string, meta?: Record<string, unknown>) =>
    log("error", context, message, meta),
};
