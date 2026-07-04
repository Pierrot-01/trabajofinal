// lib/prisma.ts — Singleton de PrismaClient (Art. XIV, punto 6)
// Evita agotar el pool de conexiones en entorno serverless (Vercel)
// y durante hot-reload en desarrollo.
// Todo repository importa de aquí; ninguno instancia new PrismaClient() por su cuenta.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
