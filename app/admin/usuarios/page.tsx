// app/admin/usuarios/page.tsx — Panel de usuarios Kinetic Lab (HU-03)
import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import * as usuarioRepository from "@/lib/repositories/usuario.repository";
import UserManagementClient from "@/app/admin/usuarios/UserManagementClient";
import Sidebar from "@/app/components/Sidebar";

interface PageProps {
  searchParams: Promise<{ cursor?: string }>;
}

export default async function AdminUsuariosPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.rol !== "admin") redirect("/login");

  const resolvedParams = await searchParams;
  const { items: usuarios, nextCursor } = await usuarioRepository.listarPaginado({
    cursor: resolvedParams.cursor,
    take: 10,
  });

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--background)" }}>
      <Sidebar userNombre={session.user.name ?? "Admin"} userRol={session.user.rol} />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="px-8 pt-10 pb-6">
          <h1 className="font-outfit text-4xl font-semibold" style={{ color: "var(--foreground)" }}>
            System Admin
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
            Gestiona el acceso del personal y los ciclos de vida del inventario.
          </p>
        </div>

        {/* Content */}
        <div className="px-8 pb-10">
          <UserManagementClient
            usuariosIniciales={usuarios}
            nextCursor={nextCursor}
            currentUserId={session.user.id}
          />
        </div>
      </main>
    </div>
  );
}
