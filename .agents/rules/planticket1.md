---
trigger: always_on
---

# Plan Técnico: Módulo de Tickets (Incidencias y Solicitudes)

**Feature:** 001-tickets
**Basado en:** `specs/001-tickets/spec.md` (Aclarado)
**Constitution de referencia:** v1.3
**Estado:** Borrador

---

## 1. Validación contra la Constitution (antes de diseñar)

| Decisión de este plan | Artículo que la rige |
|---|---|
| Stack: Next.js App Router + TypeScript + Prisma + MySQL + pnpm | Art. II |
| Capas: `app/ → lib/services/ → lib/repositories/` | Art. III |
| Respuestas `{ success, data?, error?, warning? }` | Art. IX |
| Errores de dominio como `DomainError`, nunca error crudo de Prisma | Art. X |
| Lectura vía Server Components, mutación vía Server Actions + `revalidatePath` | Art. XI |
| `prisma/seed.ts` con datos históricos de 6 meses | Art. XII |
| Ninguna ambigüedad se resuelve inventando — todo lo no cubierto aquí regresa a Clarify | Art. XIII |

Si algo en este plan contradice la Constitution, el plan se corrige, no la Constitution.

---

## 2. Modelo de datos (Prisma Schema)

```prisma
// prisma/schema.prisma

enum Rol {
  admin
  tecnico
  docente
  estudiante
}

enum EstadoEquipo {
  operativo
  mantenimiento
  inoperativo
}

enum TipoTicket {
  incidencia
  solicitud
}

enum CategoriaTicket {
  hardware
  software_licencia
  software_general
  red
}

enum EstadoTicket {
  pendiente
  en_proceso
  resuelto
}

enum TipoSoftware {
  licenciado
  gratuito
}

model Usuario {
  id                String   @id @default(cuid())
  nombre            String
  correo            String   @unique
  passwordHash      String
  rol               Rol
  createdAt         DateTime @default(now())

  ticketsReportados Ticket[] @relation("TicketsReportados")
  ticketsAsignados  Ticket[] @relation("TicketsAsignados")
  comentarios       Comentario[]
}

model Laboratorio {
  id         String   @id @default(cuid())
  nombre     String
  ubicacion  String
  capacidad  Int
  equipos    Equipo[]
}

model Equipo {
  id                String        @id @default(cuid())
  codigoInventario  String        @unique
  laboratorioId     String
  laboratorio       Laboratorio   @relation(fields: [laboratorioId], references: [id])
  estado            EstadoEquipo  @default(operativo)

  tickets           Ticket[]
  softwareInstalado EquipoSoftware[]
}

model Software {
  id       String        @id @default(cuid())
  nombre   String        @unique
  tipo     TipoSoftware
  version  String?

  equipos  EquipoSoftware[]
  tickets  Ticket[]
}

model EquipoSoftware {
  equipoId    String
  softwareId  String
  instaladoEn DateTime @default(now())

  equipo      Equipo   @relation(fields: [equipoId], references: [id])
  software    Software @relation(fields: [softwareId], references: [id])

  @@id([equipoId, softwareId])
}

model Ticket {
  id                  String            @id @default(cuid())
  tipo                TipoTicket
  categoria           CategoriaTicket
  descripcion         String
  fotoUrl             String?
  estado              EstadoTicket      @default(pendiente)
  fechaCreacion       DateTime          @default(now())
  fechaCierre         DateTime?
  fechaLimite         DateTime?         // solo Solicitudes
  comentarioCierre    String?
  softwareTexto       String?           // texto libre si no está en catálogo (Clarify #4)
  softwareId          String?           // si viene del catálogo
  software            Software?         @relation(fields: [softwareId], references: [id])

  equipoId            String
  equipo              Equipo            @relation(fields: [equipoId], references: [id])

  usuarioReportaId    String
  usuarioReporta      Usuario           @relation("TicketsReportados", fields: [usuarioReportaId], references: [id])

  tecnicoAsignadoId   String?
  tecnicoAsignado     Usuario?          @relation("TicketsAsignados", fields: [tecnicoAsignadoId], references: [id])

  ticketRelacionadoId String?           // Clarify #8: elegido manualmente por el usuario
  ticketRelacionado   Ticket?           @relation("TicketsRelacionados", fields: [ticketRelacionadoId], references: [id])
  ticketsHijos        Ticket[]          @relation("TicketsRelacionados")

  comentarios         Comentario[]

  @@index([equipoId, estado])
  @@index([tecnicoAsignadoId, estado])
}

model Comentario {
  id        String   @id @default(cuid())
  ticketId  String
  ticket    Ticket   @relation(fields: [ticketId], references: [id])
  usuarioId String
  usuario   Usuario  @relation(fields: [usuarioId], references: [id])
  contenido String
  createdAt DateTime @default(now())
}
```

**Nota:** `prioridad` **no** es un campo de la base de datos — por Clarify #2, se calcula al vuelo en `lib/services/ticket.service.ts` a partir de `categoria`, `fechaLimite` y `fechaCreacion`. Esto respeta el Artículo XII (testeable con fechas simuladas, sin depender de un job).

---

## 3. Estructura de carpetas (Artículo III aplicado)

```
app/
  tickets/
    page.tsx                → Server Component: lista de tickets (docente/estudiante ve los suyos, técnico/admin ve todos)
    [id]/page.tsx            → Server Component: detalle de ticket + comentarios
    nuevo/page.tsx            → formulario de creación (Client Component solo en el form)
    actions.ts                 → Server Actions: crearTicket, asignarTicket, cambiarEstado, reasignarTicket, agregarComentario

lib/
  services/
    ticket.service.ts          → lógica de negocio: validaciones de dominio, cálculo de prioridad, reglas de transición de estado
    equipo.service.ts           → actualización de Equipo.estado y EquipoSoftware al resolver tickets
  repositories/
    ticket.repository.ts         → queries Prisma aisladas para Ticket
    equipo.repository.ts          → queries Prisma aisladas para Equipo/EquipoSoftware
  validators/
    ticket.validators.ts           → esquemas Zod: crearTicketSchema, cambiarEstadoSchema, comentarioSchema
  errors/
    domain-error.ts                 → clase DomainError (Art. X)
  api-response.ts                    → helper ok()/fail()/warn() que arma el contrato del Art. IX
  logger.ts                            → logger estructurado (Art. X — Analyze v1.4)
  prisma.ts                              → singleton de PrismaClient (Art. XIV — Analyze v1.5)

prisma/
  schema.prisma
  seed.ts                              → Art. XII: laboratorios, equipos, usuarios de prueba (uno por rol), catálogo de software, histórico de 6 meses de tickets
```

---

## 4. Contrato de respuesta (helper reutilizable — Artículo IX + IX v1.3)

```ts
// lib/api-response.ts
type ApiResponse<T> =
  | { success: true; data: T; warning?: string }
  | { success: false; error: string };

export function ok<T>(data: T, warning?: string): ApiResponse<T> {
  return warning ? { success: true, data, warning } : { success: true, data };
}

export function fail(error: string): ApiResponse<never> {
  return { success: false, error };
}
```

Toda Server Action en `app/tickets/actions.ts` retorna `Promise<ApiResponse<T>>` usando estos helpers — nunca un objeto armado a mano.

---

## 5. Manejo de errores (Artículo X aplicado)

```ts
// lib/errors/domain-error.ts
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}
```

Patrón obligatorio en cada Server Action:

```ts
// app/tickets/actions.ts (ejemplo: cambiarEstado)
"use server";

export async function cambiarEstadoTicket(ticketId: string, nuevoEstado: EstadoTicket, comentarioCierre?: string) {
  try {
    const ticket = await ticketService.cambiarEstado(ticketId, nuevoEstado, comentarioCierre);
    revalidatePath(`/tickets/${ticketId}`);
    revalidatePath("/laboratorios"); // Art. XI — refresca la vista de HU-05
    return ok(ticket);
  } catch (err) {
    if (err instanceof DomainError) return fail(err.message);
    logger.error("cambiarEstadoTicket", "Error no controlado", { err }); // Art. X — logger estructurado, no console.log/error plano
    return fail("Ocurrió un error, intenta nuevamente."); // Art. X — nunca detalle de Prisma/MySQL
  }
}
```

---

## 5.4. Logger estructurado *(añadido en Analyze — violación detectada)*

> **Violación detectada:** el Artículo X exige "un logger mínimo estructurado", no `console.log`/`console.error` a secas — pero el ejemplo de código de la Sección 5 usaba `console.error` directo, que es justo lo que la Constitution prohíbe. Se corrige con un logger mínimo.

```ts
// lib/logger.ts
type LogLevel = "info" | "warn" | "error";

function log(level: LogLevel, context: string, message: string, meta?: Record<string, unknown>) {
  const entry = { timestamp: new Date().toISOString(), level, context, message, ...meta };
  // En este MVP, salida a stdout en formato estructurado (JSON) — suficiente para logs de Vercel.
  console[level === "info" ? "log" : level](JSON.stringify(entry));
}

export const logger = {
  info: (context: string, message: string, meta?: Record<string, unknown>) => log("info", context, message, meta),
  warn: (context: string, message: string, meta?: Record<string, unknown>) => log("warn", context, message, meta),
  error: (context: string, message: string, meta?: Record<string, unknown>) => log("error", context, message, meta),
};
```

El patrón de la Sección 5 se corrige: donde decía `console.error("[cambiarEstadoTicket] error no controlado:", err)`, ahora es `logger.error("cambiarEstadoTicket", "Error no controlado", { err })`. Esto aplica a **todas** las Server Actions del módulo, no solo al ejemplo mostrado.

---

## 5.5. Contexto de usuario autenticado *(añadido en feedback — brecha detectada)*

> **Brecha detectada:** el plan definía reglas como "solo técnico/admin puede cambiar estado" o "el usuario que reporta" sin especificar de dónde sale ese usuario. Si una Server Action recibe `usuarioId` o `rol` como parámetro enviado desde el cliente, cualquiera podría falsificarlo — esto violaría directamente el Artículo IV, punto 1 (Broken Access Control).

**Regla obligatoria:** ninguna Server Action de este módulo recibe `usuarioId` ni `rol` como argumento del cliente. Todas obtienen la sesión del lado del servidor:

```ts
// app/tickets/actions.ts
"use server";
import { auth } from "@/lib/auth"; // Auth.js

export async function crearTicket(input: CrearTicketInput) {
  const session = await auth();
  if (!session?.user) return fail("No autenticado.");

  try {
    const ticket = await ticketService.crear(input, session.user.id, session.user.rol);
    revalidatePath("/tickets");
    return ok(ticket);
  } catch (err) {
    if (err instanceof DomainError) return fail(err.message);
    logger.error("crearTicket", "Error no controlado", { err });
    return fail("Ocurrió un error, intenta nuevamente.");
  }
}
```

El `service` recibe `usuarioId`/`rol` ya validados por el servidor, y es responsable de lanzar `DomainError("No tienes permisos para esta acción")` si el rol no alcanza para la operación (Edge case 5).
