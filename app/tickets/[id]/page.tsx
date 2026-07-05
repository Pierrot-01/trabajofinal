// app/tickets/[id]/page.tsx — Detalle de ticket + comentarios (HU-06, HU-07) - Kinetic Lab Style
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import * as ticketRepository from "@/lib/repositories/ticket.repository";
import * as ticketService from "@/lib/services/ticket.service";
import TicketDetailClient from "./TicketDetailClient";
import Sidebar from "@/app/components/Sidebar";

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
    <div className="flex h-screen overflow-hidden bg-background text-on-surface">
      {/* Sidebar global */}
      <Sidebar userNombre={session.user.name ?? "Usuario"} userRol={session.user.rol} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="px-8 py-6">
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
    </div>
  );
}
