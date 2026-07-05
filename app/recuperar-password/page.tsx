// app/recuperar-password/page.tsx — Solicitar enlace de recuperación (HU-05) - Kinetic Lab Style
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { solicitarEnlaceRecuperacion } from "./actions";

export default function RecuperarPasswordPage() {
  const [correo, setCorreo] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    setIsLoading(true);

    try {
      const res = await solicitarEnlaceRecuperacion({ correo });
      if (res.success) {
        setMensaje("Si el correo existe en nuestro sistema, se ha enviado un enlace de recuperación válido por 1 hora.");
        setCorreo("");
      } else {
        setError(res.error);
      }
    } catch {
      setError("Ocurrió un error. Intente nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12 relative" style={{ background: "var(--background)" }}>
      {/* Grid background effect */}
      <div className="pointer-events-none fixed inset-0" style={{
        backgroundImage: "linear-gradient(rgba(103,80,164,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(103,80,164,0.03) 1px,transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="kl-card p-8 bg-[rgba(9,9,11,0.7)] backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="font-outfit text-2xl font-bold text-slate-100 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[#cfbcff] text-2xl">lock_reset</span>
              Recuperar Contraseña
            </h1>
            <p className="mt-2 text-xs text-slate-400">
              Ingresa tu dirección de correo electrónico institucional para recibir un token seguro.
            </p>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                ⚠️ {error}
              </div>
            )}

            {mensaje && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400">
                ✓ {mensaje}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="correo" className="kl-label">
                Correo Institucional
              </label>
              <input
                id="correo"
                name="correo"
                type="email"
                required
                placeholder="e.g. usuario@unsch.edu.pe"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                disabled={isLoading}
                className="kl-input"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="kl-btn-primary w-full justify-center py-2.5 mt-2"
            >
              {isLoading ? "Procesando..." : "Enviar Enlace de Recuperación"}
            </button>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>arrow_back</span>
                Volver al inicio de sesión
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
