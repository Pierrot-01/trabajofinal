// app/tickets/[id]/page.tsx — Detalle de ticket + comentarios (HU-06, HU-07)
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import * as ticketRepository from "@/lib/repositories/ticket.repository";
import * as ticketService from "@/lib/services/ticket.service";
import TicketDetailClient from "./TicketDetailClient";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TicketDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const ticket = await ticketRepository.buscarPorId(id);
  if (!ticket) notFound();

  const ahora = new Date();
  const prioridad = ticketService.calcularPrioridad(ticket, ahora);
  const atrasado = ticketService.estaAtrasado(ticket, ahora);

  // Historial de tickets resueltos del mismo equipo (para vincular — Edge case 3)
  const ticketsResueltos = await ticketRepository.listarResueltosPorEquipo(ticket.equipo.id);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="border-b border-slate-900 bg-slate-950/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/tickets" className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
            ← Volver al panel
          </Link>
          <span className="text-xs text-slate-500 font-mono">#{id.slice(-8)}</span>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <TicketDetailClient
          ticket={ticket as any}
          prioridad={prioridad}
          atrasado={atrasado}
          ticketsResueltos={ticketsResueltos as any}
          rol={session.user.rol}
          currentUserId={session.user.id}
        />
      </div>
    </main>
  );
}
