// app/tickets/page.tsx — Panel de gestión de tickets (HU-03, HU-04) — Kinetic Lab Design
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import * as ticketRepository from "@/lib/repositories/ticket.repository";
import * as ticketService from "@/lib/services/ticket.service";
import TicketsPanelClient from "@/app/tickets/TicketsPanelClient";
import Sidebar from "@/app/components/Sidebar";

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
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--background)" }}>
      {/* Sidebar */}
      <Sidebar userNombre={session.user.name ?? "Usuario"} userRol={session.user.rol} />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Page header */}
        <div className="px-8 pt-10 pb-6">
          <h1 className="font-outfit text-4xl font-semibold" style={{ color: "var(--foreground)" }}>
            Tickets
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
            Gestiona y resuelve alertas activas del sistema.
          </p>
        </div>

        {/* Content */}
        <div className="px-8 pb-10">
          <TicketsPanelClient
            tickets={enriched}
            nextCursor={nextCursor}
            rol={session.user.rol}
            currentUserId={session.user.id}
          />
        </div>
      </main>
    </div>
  );
}
