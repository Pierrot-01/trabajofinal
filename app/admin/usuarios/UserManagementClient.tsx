// app/admin/usuarios/UserManagementClient.tsx — Gestión de usuarios interactiva (Client Component)
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { crearUsuario, cambiarRolUsuario, desactivarUsuario } from "./actions";

type Rol = "admin" | "tecnico" | "docente" | "estudiante";


interface UsuarioItem {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  activo: boolean;
  createdAt: Date;
}

interface UserManagementClientProps {
  usuariosIniciales: UsuarioItem[];
  nextCursor: string | null;
  currentUserId: string;
}

export default function UserManagementClient({
  usuariosIniciales,
  nextCursor,
  currentUserId,
}: UserManagementClientProps) {
  const usuarios = usuariosIniciales;
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [rol, setRol] = useState<Rol>("docente");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    setIsLoading(true);

    try {
      const res = await crearUsuario({ nombre, correo, rol, password });
      if (res.success) {
        setMensaje(`Usuario "${nombre}" registrado exitosamente.`);
        setNombre("");
        setCorreo("");
        setPassword("");
        setRol("docente");
        router.refresh();
      } else {
        setError(res.error);
      }
    } catch {
      setError("Ocurrió un error. Intente nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCambiarRol = async (id: string, nuevoRol: Rol) => {
    setError(null);
    setMensaje(null);
    try {
      const res = await cambiarRolUsuario(id, nuevoRol);
      if (res.success) {
        setMensaje("Rol de usuario actualizado.");
        router.refresh();
      } else {
        setError(res.error);
      }
    } catch {
      setError("Error al cambiar el rol.");
    }
  };

  const handleDesactivar = async (id: string) => {
    if (!confirm("¿Está seguro de que desea desactivar esta cuenta de usuario? Esta acción es reversible pero bloqueará su acceso inmediato.")) {
      return;
    }
    setError(null);
    setMensaje(null);
    try {
      const res = await desactivarUsuario(id);
      if (res.success) {
        setMensaje("Usuario desactivado.");
        router.refresh();
      } else {
        setError(res.error);
      }
    } catch {
      setError("Error al desactivar el usuario.");
    }
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Columna Izquierda: Formulario de Creación */}
      <div className="lg:col-span-1">
        <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6 shadow-xl backdrop-blur-md sticky top-6">
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
            Crear Nueva Cuenta
          </h2>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Registra docentes, estudiantes o técnicos en el sistema.
          </p>

          <form onSubmit={handleCrearUsuario} className="mt-6 space-y-4">
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                {error}
              </div>
            )}

            {mensaje && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400 font-medium">
                {mensaje}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Nombre Completo</label>
              <input
                type="text"
                required
                placeholder="Nombre del usuario"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                disabled={isLoading}
                className="mt-1 block w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-200 shadow-inner outline-none focus:border-blue-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Correo Institucional</label>
              <input
                type="email"
                required
                placeholder="ejemplo@unsch.edu.pe"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                disabled={isLoading}
                className="mt-1 block w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-200 shadow-inner outline-none focus:border-blue-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Rol</label>
              <select
                value={rol}
                onChange={(e) => setRol(e.target.value as Rol)}
                disabled={isLoading}
                className="mt-1 block w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-200 shadow-inner outline-none focus:border-blue-500/50"
              >
                <option value="docente">Docente</option>
                <option value="estudiante">Estudiante</option>
                <option value="tecnico">Técnico</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Contraseña Temporal</label>
              <input
                type="password"
                required
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="mt-1 block w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-200 shadow-inner outline-none focus:border-blue-500/50"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-xs font-semibold text-white shadow-md hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50"
            >
              {isLoading ? "Creando..." : "Registrar Cuenta"}
            </button>
          </form>
        </div>
      </div>

      {/* Columna Derecha: Listado de Usuarios */}
      <div className="lg:col-span-2">
        <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6 shadow-xl backdrop-blur-md">
          <h2 className="text-xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            Cuentas Registradas
          </h2>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Visualiza y administra los roles y accesos al sistema.
          </p>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4">Rol</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 text-xs">
                {usuarios.map((usr) => (
                  <tr key={usr.id} className="hover:bg-slate-900/10 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-semibold text-slate-200">{usr.nombre}</div>
                      <div className="text-slate-500 text-xxs mt-0.5">{usr.correo}</div>
                    </td>
                    <td className="py-4 px-4">
                      {usr.id === currentUserId ? (
                        <span className="inline-flex rounded bg-blue-500/10 px-2.5 py-0.5 font-semibold text-blue-400">
                          {usr.rol} (Tú)
                        </span>
                      ) : (
                        <select
                          value={usr.rol}
                          onChange={(e) => handleCambiarRol(usr.id, e.target.value as Rol)}
                          className="rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-300 outline-none"
                        >
                          <option value="docente">Docente</option>
                          <option value="estudiante">Estudiante</option>
                          <option value="tecnico">Técnico</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xxs font-semibold ${
                          usr.activo
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {usr.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      {usr.id !== currentUserId && usr.activo && (
                        <button
                          onClick={() => handleDesactivar(usr.id)}
                          className="rounded border border-red-500/30 px-2.5 py-1 font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          Desactivar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {nextCursor && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set("cursor", nextCursor);
                  window.location.href = url.toString();
                }}
                className="rounded-lg border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cargar más usuarios
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
