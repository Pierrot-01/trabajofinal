// app/cuenta/page.tsx — Perfil de usuario para cambiar contraseña propia (HU-04) - Kinetic Lab Style
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Sidebar from "@/app/components/Sidebar";
import CuentaClient from "./CuentaClient";

export default async function CuentaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden bg-background text-on-surface">
      <Sidebar userNombre={session.user.name ?? "Usuario"} userRol={session.user.rol} />
      
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="px-8 pt-10 pb-6 border-b border-white/5 bg-slate-950/10">
          <h1 className="font-outfit text-4xl font-semibold text-slate-100">
            Mi Cuenta
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Administra tus credenciales y configuración de seguridad personal.
          </p>
        </div>

        {/* Content */}
        <div className="px-8 py-12">
          <CuentaClient userNombre={session.user.name ?? ""} userRol={session.user.rol} />
        </div>
      </main>
    </div>
  );
}
