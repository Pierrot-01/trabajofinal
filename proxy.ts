// proxy.ts — Protección de rutas basada en roles (T060, Art. IV)
// Next.js 16: el proxy SOLO lee el JWT de la cookie — nunca consulta la DB.
// La sesión completa (con la DB) se verifica en los services/server components.
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Rutas que no requieren sesión
const publicPaths = ["/login", "/recuperar-password"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rutas públicas — siempre permitidas
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Leer JWT de la cookie (solo lectura — sin consultar la DB)
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });

  // Sin sesión → redirigir a login
  if (!token) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Solo admins pueden acceder a /admin/*
  if (pathname.startsWith("/admin") && token.rol !== "admin") {
    return NextResponse.redirect(new URL("/tickets", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  // Excluir API routes, favicon, archivos con extensión y todo lo de _next (incluye webpack-hmr, static, chunks, etc.)
  // Esto evita bucles infinitos de reconexión HMR en desarrollo.
  matcher: ["/((?!api|_next|favicon.ico|.*\\..*).*)"],
};
