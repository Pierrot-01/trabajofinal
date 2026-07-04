// app/tickets/page.tsx — Panel de gestión de tickets (HU-03, HU-04)
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import * as ticketRepository from "@/lib/repositories/ticket.repository";
import * as ticketService from "@/lib/services/ticket.service";
import TicketsPanelClient from "@/app/tickets/TicketsPanelClient";
import Link from "next/link";
import SignOutButton from "@/app/components/SignOutButton";

interface PageProps {
  searchParams: Promise<{ cursor?: string; laboratorioId?: string; estado?: string }>;
}

export default async function TicketsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const { items: tickets, nextCursor } = await ticketRepository.listar({
    cursor: params.cursor,
    take: 20,
    laboratorioId: params.laboratorioId,
    estado: params.estado as any,
  });

  // Enriquecer con prioridad y atraso (al vuelo, Clarify #2)
  const ahora = new Date();
  const enriched = tickets.map((t: any) => ({
    ...t,
    prioridad: ticketService.calcularPrioridad(t, ahora),
    atrasado: ticketService.estaAtrasado(t, ahora),
  }));

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="border-b border-slate-900 bg-slate-950/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/tickets" className="shrink-0 text-lg font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            EPIS UNSCH
          </Link>
          <div className="hidden sm:flex gap-3 text-xs text-slate-400">
            <Link href="/laboratorios" className="hover:text-slate-200 transition-colors">Laboratorios</Link>
            {session.user.rol === "admin" && (
              <>
                <Link href="/admin/equipos" className="hover:text-slate-200 transition-colors">Equipos</Link>
                <Link href="/admin/usuarios" className="hover:text-slate-200 transition-colors">Usuarios</Link>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden md:inline text-xs text-slate-500 font-semibold bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
              {session.user.name} ({session.user.rol})
            </span>
            <SignOutButton />
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <TicketsPanelClient
          tickets={enriched}
          nextCursor={nextCursor}
          rol={session.user.rol}
          currentUserId={session.user.id}
        />
      </div>
    </main>
  );
}
