// app/tickets/[id]/TicketDetailClient.tsx — Vista completa de detalle + comentarios
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { agregarComentario } from "../actions";
import Image from "next/image";

type Prioridad = "alta" | "media" | "baja";

const prioridadColor: Record<Prioridad, string> = {
  alta: "bg-red-500/10 text-red-400 border-red-500/30",
  media: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  baja: "bg-slate-500/10 text-slate-400 border-slate-500/30",
};

interface Comentario {
  id: string;
  contenido: string;
  createdAt: Date;
  usuario: { nombre: string; rol: string };
}

interface TicketResuelto {
  id: string;
  tipo: string;
  categoria: string;
  fechaCreacion: Date;
}

interface TicketFull {
  id: string;
  tipo: string;
  categoria: string;
  estado: string;
  descripcion: string;
  fotoUrl?: string | null;
  fechaCreacion: Date;
  fechaCierre?: Date | null;
  fechaLimite?: Date | null;
  comentarioCierre?: string | null;
  softwareTexto?: string | null;
  tecnicoAsignadoId?: string | null;
  equipo: { codigoInventario: string };
  usuarioReporta: { nombre: string };
  tecnicoAsignado?: { nombre: string } | null;
  comentarios: Comentario[];
}

interface Props {
  ticket: TicketFull;
  prioridad: Prioridad;
  atrasado: boolean;
  ticketsResueltos: TicketResuelto[];
  rol: string;
  currentUserId: string;
}

export default function TicketDetailClient({ ticket, prioridad, atrasado, ticketsResueltos: _ticketsResueltos, rol: _rol, currentUserId: _currentUserId }: Props) {
  const router = useRouter();
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingComentario, setLoadingComentario] = useState(false);

  const puedeComentrar = ticket.estado !== "resuelto";

  const handleComentario = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoadingComentario(true);
    try {
      const res = await agregarComentario({ ticketId: ticket.id, contenido: comentario });
      if (res.success) {
        setComentario("");
        router.refresh();
      } else {
        setError(res.error);
      }
    } catch {
      setError("Error al enviar el comentario.");
    } finally {
      setLoadingComentario(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera del ticket */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap gap-3 items-center mb-4">
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${prioridadColor[prioridad]}`}>
            Prioridad: {prioridad.toUpperCase()}
          </span>
          <span className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300 capitalize">
            {ticket.estado.replace("_", " ")}
          </span>
          {atrasado && (
            <span className="inline-flex rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 px-3 py-1 text-xs font-semibold">
              ⏰ ATRASADO
            </span>
          )}
        </div>

        <h1 className="text-2xl font-bold text-slate-100 capitalize">
          {ticket.tipo} de {ticket.categoria.replace(/_/g, " ")}
        </h1>
        <p className="mt-3 text-sm text-slate-300 leading-relaxed">{ticket.descripcion}</p>

        {ticket.softwareTexto && (
          <p className="mt-2 text-sm text-slate-400">
            Software solicitado: <span className="text-slate-200 font-medium">{ticket.softwareTexto}</span>
          </p>
        )}

        {/* Foto adjunta */}
        {ticket.fotoUrl && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Foto adjunta</p>
            <div className="relative h-48 w-full overflow-hidden rounded-xl border border-slate-800">
              <Image
                src={ticket.fotoUrl}
                alt="Foto del problema"
                fill
                className="object-cover"
                loading="lazy"
              />
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-slate-500">
          <div>
            <span className="block font-semibold text-slate-400 mb-1">Equipo</span>
            <span>{ticket.equipo.codigoInventario}</span>
          </div>
          <div>
            <span className="block font-semibold text-slate-400 mb-1">Reportado por</span>
            <span>{ticket.usuarioReporta.nombre}</span>
          </div>
          <div>
            <span className="block font-semibold text-slate-400 mb-1">Creado el</span>
            <span>{new Date(ticket.fechaCreacion).toLocaleString("es-PE")}</span>
          </div>
          {ticket.fechaCierre && (
            <div>
              <span className="block font-semibold text-slate-400 mb-1">Cerrado el</span>
              <span>{new Date(ticket.fechaCierre).toLocaleString("es-PE")}</span>
            </div>
          )}
          {ticket.tecnicoAsignado && (
            <div>
              <span className="block font-semibold text-slate-400 mb-1">Técnico asignado</span>
              <span>{ticket.tecnicoAsignado.nombre}</span>
            </div>
          )}
          {ticket.fechaLimite && (
            <div>
              <span className="block font-semibold text-slate-400 mb-1">Fecha límite</span>
              <span>{new Date(ticket.fechaLimite).toLocaleDateString("es-PE")}</span>
            </div>
          )}
        </div>

        {ticket.comentarioCierre && (
          <div className="mt-5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4">
            <p className="text-xs font-semibold text-emerald-400 mb-1">Comentario de cierre:</p>
            <p className="text-sm text-slate-300">{ticket.comentarioCierre}</p>
          </div>
        )}
      </div>

      {/* Historial de comentarios */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl backdrop-blur-md">
        <h2 className="text-lg font-bold text-slate-200 mb-4">Seguimiento del caso</h2>

        {ticket.comentarios.length === 0 ? (
          <p className="text-sm text-slate-600 py-4 text-center">Sin comentarios aún.</p>
        ) : (
          <div className="space-y-4">
            {ticket.comentarios.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                  {c.usuario.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 rounded-xl bg-slate-800/50 px-4 py-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-slate-300">{c.usuario.nombre}</span>
                    <span className="text-xs text-slate-600">{new Date(c.createdAt).toLocaleString("es-PE")}</span>
                  </div>
                  <p className="text-sm text-slate-400">{c.contenido}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Formulario de comentario */}
        {puedeComentrar && (
          <form onSubmit={handleComentario} className="mt-5 space-y-3">
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
                {error}
              </div>
            )}
            <textarea
              rows={3}
              placeholder="Agrega un comentario o actualización…"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              required
              className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-200 outline-none focus:border-blue-500/50"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loadingComentario || !comentario.trim()}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {loadingComentario ? "Enviando…" : "Agregar comentario"}
              </button>
            </div>
          </form>
        )}

        {!puedeComentrar && (
          <p className="mt-4 text-xs text-slate-600 text-center">
            Los comentarios están cerrados porque el ticket está resuelto.
          </p>
        )}
      </div>
    </div>
  );
}
