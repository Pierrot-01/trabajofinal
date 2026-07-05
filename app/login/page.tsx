// app/login/page.tsx — Vista Kinetic Lab de inicio de sesión (HU-01)
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginAction } from "./actions";

export default function LoginPage() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await loginAction(correo, password);
      if (res.success) {
        router.push("/tickets");
        router.refresh();
      } else {
        setError(res.error || "Ocurrió un error inesperado.");
      }
    } catch {
      setError("Error de conexión. Intente nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12"
      style={{ background: "var(--background)" }}
    >
      {/* Grid background pattern */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(103,80,164,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(103,80,164,0.06) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Glow accent */}
      <div
        className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #6750a4 0%, transparent 70%)" }}
      />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-md rounded-lg border p-8 shadow-2xl"
        style={{
          background: "rgba(16, 32, 52, 0.80)",
          backdropFilter: "blur(16px)",
          borderColor: "rgba(255,255,255,0.10)",
        }}
      >
        {/* Header */}
        <div className="mb-8 text-center">
          {/* Logo mark */}
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl"
               style={{ background: "var(--primary)" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-7 h-7">
              <path d="M9 3v11.5a3.5 3.5 0 007 0V3" />
              <path d="M6.5 3h11" />
              <path d="M6 20h12" />
            </svg>
          </div>

          <h1 className="font-outfit text-2xl font-700 leading-tight" style={{ color: "var(--foreground)", fontWeight: 700 }}>
            EPIS — UNSCH
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
            Sistema de Gestión de Laboratorios
          </p>
        </div>

        {/* Form */}
        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div
              className="rounded-md border p-3 text-sm"
              style={{
                background: "rgba(255,112,112,0.08)",
                borderColor: "rgba(255,112,112,0.25)",
                color: "#ff7070",
              }}
            >
              {error}
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
              placeholder="nombre.apellido@unsch.edu.pe"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="kl-input"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="kl-label">
                Contraseña
              </label>
              <Link
                href="/recuperar-password"
                className="text-xs font-semibold transition-colors"
                style={{ color: "var(--primary-light)" }}
              >
                ¿La olvidaste?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="kl-input"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="kl-btn-primary w-full justify-center py-2.5"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Verificando credenciales...
              </span>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                Ingresar al Sistema
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p
          className="mt-6 text-center font-geist text-[10px] tracking-wide"
          style={{ color: "var(--muted-foreground)", opacity: 0.6 }}
        >
          EPIS · UNSCH · IS-489 — Calidad de Software
        </p>
      </div>
    </main>
  );
}
