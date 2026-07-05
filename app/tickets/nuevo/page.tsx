// app/tickets/nuevo/page.tsx — Página de creación de tickets (Server Component)
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NuevoTicketClient from "./NuevoTicketClient";

export default async function NuevoTicketPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Obtener equipos activos del sistema, excluyendo dados de baja (Clarify #4 de la Spec)
  const equipos = await prisma.equipo.findMany({
    where: {
      estado: {
        not: "dado_de_baja",
      },
    },
    select: {
      id: true,
      codigoInventario: true,
      laboratorio: {
        select: {
          nombre: true,
        },
      },
    },
    orderBy: {
      codigoInventario: "asc",
    },
  });

  return (
    <NuevoTicketClient equipos={equipos as any} />
  );
}
