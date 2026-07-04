// lib/auth.ts — Configuración de Auth.js (Art. IV, plan.md Sección 6)
// Proveedor de credenciales con bcrypt para hash de contraseñas.
// Estrategia JWT — no se usa adaptador de base de datos para sesiones.

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        correo: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.correo || !credentials?.password) return null;

        const correo = credentials.correo as string;
        const password = credentials.password as string;

        const usuario = await prisma.usuario.findUnique({
          where: { correo },
          select: {
            id: true,
            nombre: true,
            correo: true,
            passwordHash: true,
            rol: true,
          },
        });

        if (!usuario) return null;

        const passwordValida = await bcrypt.compare(
          password,
          usuario.passwordHash
        );
        if (!passwordValida) return null;

        // Auth.js espera un objeto con id, name, email como mínimo.
        // Agregamos rol para que esté disponible en la sesión JWT.
        return {
          id: usuario.id,
          name: usuario.nombre,
          email: usuario.correo,
          rol: usuario.rol,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      // Al hacer login, user existe; se copia rol al token JWT.
      if (user) {
        token.id = user.id;
        token.rol = (user as { rol: string }).rol;
      }
      return token;
    },
    async session({ session, token }) {
      // Se expone id y rol en la sesión del lado servidor.
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { rol: string }).rol = token.rol as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
