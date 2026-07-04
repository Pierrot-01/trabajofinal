// app/page.tsx — Página principal del sistema (dashboard de bienvenida)
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();

  // Redirigir según estado de sesión y rol
  if (!session?.user) redirect("/login");
  if (session.user.rol === "admin") redirect("/admin/laboratorios");
  if (session.user.rol === "tecnico") redirect("/tickets");
  redirect("/laboratorios");
}
