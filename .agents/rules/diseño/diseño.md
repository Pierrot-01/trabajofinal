# Fase de Diseño — Sistema Web de Gestión de Informes Técnicos y Mantenimiento de Equipos de Cómputo
## Laboratorios EPIS, UNSCH

**Versión del documento:** 1.0  
**Fecha:** Julio 2026  
**Curso:** IS-489 — Pruebas y Aseguramiento de la Calidad de Software  
**Metodología:** Spec-Driven Development (SDD)  
**Constitution de referencia:** v1.8

---

## 1. Stack Tecnológico (cerrado — no modificable sin justificación explícita)

| Capa | Tecnología | Justificación |
|---|---|---|
| **Frontend & API** | Next.js 15 (App Router) + TypeScript | SSR nativo, Server Components, Server Actions. Un solo repo frontend/backend. |
| **Estilos** | Tailwind CSS + shadcn/ui | Diseño mobile-first con sistema de componentes accesibles y consistentes. |
| **Base de Datos** | PostgreSQL en Supabase | BD relacional robusta, cloud managed, adecuada para el historial de tickets. |
| **ORM** | Prisma | Tipado seguro, migraciones versionadas, generador automático de clientes TS. |
| **Gestor de paquetes** | pnpm | Estructura estricta de `node_modules`; mitiga phantom dependencies. |
| **Autenticación** | Auth.js v5 (NextAuth) | Credentials provider con sesión del lado del servidor. |
| **Validación** | Zod | Esquemas de validación en frontera (input del cliente → servicio). |
| **Testing** | Vitest + Testing Library (TS) + xUnit/Moq (C#) | Pruebas unitarias e integración nativas con TypeScript. |
| **Despliegue** | Vercel | HTTPS por defecto, compatibilidad nativa con Next.js, ISR. |

---

## 2. Arquitectura en Capas (Hexagonal / Ports & Adapters)

El sistema aplica una separación estricta de responsabilidades en tres capas. Ninguna capa puede saltarse a la siguiente:

```
┌─────────────────────────────────────────────────────────────┐
│  CAPA DE PRESENTACIÓN  (app/)                               │
│  Server Components (lectura) + Client Components (UI local) │
│  Server Actions (mutaciones) → revalidatePath               │
└───────────────────────┬─────────────────────────────────────┘
                        │ (solo llama a services, nunca a Prisma directo)
┌───────────────────────▼─────────────────────────────────────┐
│  CAPA DE NEGOCIO  (lib/services/)                           │
│  Reglas de dominio, validaciones de negocio, DomainErrors   │
│  Recibe userId/rol validados por el servidor (auth)         │
└───────────────────────┬─────────────────────────────────────┘
                        │ (solo llama a repositories, nunca construye HTML)
┌───────────────────────▼─────────────────────────────────────┐
│  CAPA DE INFRAESTRUCTURA  (lib/repositories/ + prisma/)     │
│  Queries Prisma aisladas con select explícito               │
│  Singleton PrismaClient — nunca instancias directas         │
└─────────────────────────────────────────────────────────────┘
```

### Reglas de capa no negociables:
- Un Server Component **nunca** llama a Prisma directamente — pasa por un `service`.
- Un `service` **nunca** construye JSX/HTML ni maneja `request`/`response` de Next.js.
- Ninguna Server Action recibe `usuarioId` ni `rol` como parámetro del cliente — siempre se obtiene de la sesión del servidor (`auth()`).

---

## 3. Estructura de Carpetas del Proyecto

```
e:/foto/Trabajofinal_CalidadSoftware/
│
├── app/                                  ← Rutas Next.js App Router
│   ├── login/
│   │   └── page.tsx                      ← Formulario de login (Client Component)
│   ├── tickets/
│   │   ├── page.tsx                      ← Lista de tickets (Server Component)
│   │   ├── nuevo/page.tsx                ← Formulario de creación
│   │   ├── [id]/page.tsx                 ← Detalle de ticket + comentarios
│   │   └── actions.ts                    ← crearTicket, asignarTicket, cambiarEstado, agregarComentario
│   ├── laboratorios/
│   │   └── page.tsx                      ← Vista pública: estado y software de equipos (HU-05)
│   ├── admin/
│   │   ├── usuarios/
│   │   │   ├── page.tsx                  ← Lista paginada de usuarios
│   │   │   └── actions.ts                ← crearUsuario, cambiarRol, desactivarUsuario
│   │   ├── laboratorios/
│   │   │   ├── page.tsx                  ← Gestión de laboratorios
│   │   │   └── actions.ts                ← crearLaboratorio
│   │   ├── equipos/
│   │   │   ├── page.tsx                  ← Gestión de equipos (incluye dado_de_baja)
│   │   │   └── actions.ts                ← crearEquipo, editarEquipo, darDeBajaEquipo
│   │   └── software/
│   │       ├── page.tsx                  ← CRUD del catálogo de software
│   │       └── actions.ts                ← crearSoftware, editarSoftware, eliminarSoftware
│   ├── cuenta/
│   │   ├── page.tsx                      ← Cambiar contraseña propia
│   │   └── actions.ts                    ← cambiarPassword
│   └── recuperar-password/
│       ├── page.tsx                      ← Solicitar enlace
│       ├── [token]/page.tsx              ← Formulario nueva contraseña
│       └── actions.ts                    ← solicitarRecuperacion, resetearPassword
│
├── lib/                                  ← Lógica de negocio e infraestructura
│   ├── services/
│   │   ├── ticket.service.ts             ← Reglas de dominio de tickets + cálculo de prioridad
│   │   ├── equipo.service.ts             ← Efectos automáticos + CRUD administrativo
│   │   ├── laboratorio.service.ts        ← Crear, listar laboratorios
│   │   ├── usuario.service.ts            ← Autenticación, roles, hashing, reglas de admin
│   │   └── software.service.ts           ← CRUD catálogo de software
│   ├── repositories/
│   │   ├── ticket.repository.ts          ← Queries Prisma: Ticket
│   │   ├── equipo.repository.ts          ← Queries Prisma: Equipo + EquipoSoftware
│   │   ├── laboratorio.repository.ts     ← Queries Prisma: Laboratorio
│   │   ├── usuario.repository.ts         ← Queries Prisma: Usuario + PasswordResetToken
│   │   └── software.repository.ts        ← Queries Prisma: Software
│   ├── validators/
│   │   ├── ticket.validators.ts          ← crearTicketSchema, cambiarEstadoSchema
│   │   ├── usuario.validators.ts         ← crearUsuarioSchema, correoInstitucionalSchema
│   │   ├── equipo.validators.ts          ← crearEquipoSchema, editarEquipoSchema
│   │   ├── laboratorio.validators.ts     ← crearLaboratorioSchema
│   │   └── software.validators.ts        ← crearSoftwareSchema
│   ├── errors/
│   │   └── domain-error.ts              ← class DomainError extends Error
│   ├── api-response.ts                  ← helpers ok() / fail() / warn()
│   ├── logger.ts                        ← Logger estructurado (JSON a stdout)
│   ├── auth.ts                          ← Configuración Auth.js (credentials provider)
│   └── prisma.ts                        ← Singleton de PrismaClient
│
├── prisma/
│   ├── schema.prisma                    ← Modelo de datos completo
│   ├── seed.ts                          ← Datos de prueba: 6 meses histórico
│   └── migrations/                      ← Migraciones versionadas
│
├── components/                          ← Componentes UI reutilizables
├── tests/                               ← Suite de pruebas Vitest
└── types/                               ← Tipos TypeScript compartidos
```

---

## 4. Modelo de Datos Relacional (Prisma Schema)

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
  dado_de_baja   // retiro administrativo permanente — Constitution v1.7
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
  correo            String   @unique         // validado: @unsch.edu.pe
  passwordHash      String                   // bcrypt, nunca texto plano
  rol               Rol
  activo            Boolean  @default(true)  // nunca DELETE — Constitution v1.6
  createdAt         DateTime @default(now())

  ticketsReportados Ticket[]             @relation("TicketsReportados")
  ticketsAsignados  Ticket[]             @relation("TicketsAsignados")
  comentarios       Comentario[]
  resetTokens       PasswordResetToken[]
}

model PasswordResetToken {
  id        String   @id @default(cuid())
  usuarioId String
  usuario   Usuario  @relation(fields: [usuarioId], references: [id])
  tokenHash String   @unique   // hasheado, nunca texto plano
  expiraEn  DateTime
  usado     Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([usuarioId])
}

model Laboratorio {
  id        String   @id @default(cuid())
  nombre    String
  ubicacion String
  capacidad Int
  equipos   Equipo[]
}

model Equipo {
  id               String         @id @default(cuid())
  codigoInventario String         @unique
  laboratorioId    String
  laboratorio      Laboratorio    @relation(fields: [laboratorioId], references: [id])
  estado           EstadoEquipo   @default(operativo)

  tickets          Ticket[]
  softwareInstalado EquipoSoftware[]
}

model Software {
  id      String       @id @default(cuid())
  nombre  String       @unique
  tipo    TipoSoftware
  version String?

  equipos EquipoSoftware[]
  tickets Ticket[]
}

model EquipoSoftware {
  equipoId    String
  softwareId  String
  instaladoEn DateTime @default(now())

  equipo   Equipo   @relation(fields: [equipoId], references: [id])
  software Software @relation(fields: [softwareId], references: [id])

  @@id([equipoId, softwareId])
}

model Ticket {
  id                  String          @id @default(cuid())
  tipo                TipoTicket
  categoria           CategoriaTicket
  descripcion         String          // 10–500 caracteres (validado en Zod)
  fotoUrl             String?
  estado              EstadoTicket    @default(pendiente)
  fechaCreacion       DateTime        @default(now())
  fechaCierre         DateTime?
  fechaLimite         DateTime?       // solo Solicitudes; afecta cálculo de prioridad
  comentarioCierre    String?         // obligatorio al pasar a resuelto
  softwareTexto       String?         // texto libre si no está en catálogo
  softwareId          String?         // referencia al catálogo si aplica
  software            Software?       @relation(fields: [softwareId], references: [id])

  equipoId            String
  equipo              Equipo          @relation(fields: [equipoId], references: [id])

  usuarioReportaId    String
  usuarioReporta      Usuario         @relation("TicketsReportados", fields: [usuarioReportaId], references: [id])

  tecnicoAsignadoId   String?
  tecnicoAsignado     Usuario?        @relation("TicketsAsignados", fields: [tecnicoAsignadoId], references: [id])

  ticketRelacionadoId String?         // falla recurrente — elegido manualmente por el usuario
  ticketRelacionado   Ticket?         @relation("TicketsRelacionados", fields: [ticketRelacionadoId], references: [id])
  ticketsHijos        Ticket[]        @relation("TicketsRelacionados")

  comentarios         Comentario[]

  @@index([equipoId, estado])           // filtros frecuentes del panel técnico
  @@index([tecnicoAsignadoId, estado])  // tickets del técnico asignado
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

> **Nota crítica:** `prioridad` **no** es un campo de la base de datos. Se calcula al vuelo en `ticket.service.ts` comparando `categoria`, `fechaLimite` y `fechaCreacion` con el momento actual. Esto garantiza que siempre refleje la urgencia real sin depender de un cron job.

---

## 5. Diseño de la API y Contrato de Respuesta

### 5.1 Contrato Estándar (Artículo IX de la Constitution)

Toda Server Action o API Route del sistema responde con el mismo contrato sin excepción:

```ts
// lib/api-response.ts
type ApiResponse<T> =
  | { success: true;  data: T;      warning?: string }
  | { success: false; error: string };

export function ok<T>(data: T, warning?: string): ApiResponse<T> {
  return warning ? { success: true, data, warning } : { success: true, data };
}

export function fail(error: string): ApiResponse<never> {
  return { success: false, error };
}
```

- `success: true` + `warning`: operación exitosa con advertencia no bloqueante (ej. ticket duplicado).
- `success: false` + `error`: mensaje seguro para el cliente, **nunca** detalle de Prisma/PostgreSQL.

### 5.2 Manejo de Errores por Capas

```ts
// lib/errors/domain-error.ts
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}
```

**Patrón obligatorio en todas las Server Actions:**
```ts
export async function cambiarEstadoTicket(ticketId: string, nuevoEstado: EstadoTicket, comentario?: string) {
  const session = await auth();                    // ← usuario validado en servidor, nunca del cliente
  if (!session?.user) return fail("No autenticado.");

  try {
    const ticket = await ticketService.cambiarEstado(ticketId, nuevoEstado, comentario, session.user);
    revalidatePath(`/tickets/${ticketId}`);
    revalidatePath("/laboratorios");               // ← actualiza vista pública de equipos
    return ok(ticket);
  } catch (err) {
    if (err instanceof DomainError) return fail(err.message);
    logger.error("cambiarEstadoTicket", "Error no controlado", { err });
    return fail("Ocurrió un error, intenta nuevamente."); // ← nunca detalle interno
  }
}
```

### 5.3 Logger Estructurado

```ts
// lib/logger.ts  — salida JSON a stdout de Vercel (nunca console.log/error plano)
export const logger = {
  info:  (ctx: string, msg: string, meta?: Record<string, unknown>) => log("info",  ctx, msg, meta),
  warn:  (ctx: string, msg: string, meta?: Record<string, unknown>) => log("warn",  ctx, msg, meta),
  error: (ctx: string, msg: string, meta?: Record<string, unknown>) => log("error", ctx, msg, meta),
};
```

---

## 6. Flujo de Datos por Caso de Uso Principal

### 6.1 Crear un Ticket (HU-01 / HU-02)

```
[Cliente: formulario nuevo ticket]
         │
         ▼
[Server Action: crearTicket(input)]
         │── auth() → valida sesión servidor
         │── crearTicketSchema.parse(input) → Zod rechaza datos inválidos
         ▼
[ticket.service.ts: crear(input, userId, rol)]
         │── verifica equipo existe y no está dado_de_baja
         │── verifica ticket abierto previo → si hay: ok() con warning
         │── crea Ticket con estado pendiente
         ▼
[ticket.repository.ts: prisma.ticket.create({...})]
         │
         ▼
[revalidatePath("/tickets")] → UI actualizada
[return ok({ numeroTicket, estado })]
```

### 6.2 Resolver un Ticket de Hardware (HU-03 — efecto automático)

```
[Server Action: cambiarEstado(ticketId, "resuelto", comentarioCierre)]
         │
         ▼
[ticket.service.ts: cambiarEstado]
         │── verifica que comentarioCierre tiene ≥ 5 caracteres (DomainError si no)
         │── verifica transición válida pendiente/en_proceso → resuelto (DomainError si resuelto→pendiente)
         │
         ├── [si categoria = "hardware"]
         │       └── equipo.service.ts: actualizarEstadoEquipo(equipoId)
         │                │── cuenta tickets abiertos restantes del equipo
         │                └── si 0 tickets abiertos: equipo.estado = "operativo"
         │                    si aún hay tickets: equipo.estado permanece "mantenimiento"
         │
         ├── [si categoria = "software_licencia" o "software_general"]
         │       └── equipo.service.ts: registrarSoftwareInstalado(equipoId, softwareId)
         │                └── upsert en EquipoSoftware
         │
         └── actualiza Ticket: estado="resuelto", fechaCierre=now(), comentarioCierre
         ▼
[revalidatePath("/tickets/[id]")]
[revalidatePath("/laboratorios")]   ← vista de docentes actualizada
[return ok(ticket)]
```

### 6.3 Cálculo de Prioridad al Vuelo (HU-04)

```ts
// lib/services/ticket.service.ts
function calcularPrioridad(ticket: Ticket, ahora: Date): "alta" | "media" | "baja" {
  if (ticket.tipo === "incidencia" && ticket.categoria === "hardware") return "alta";

  if (ticket.tipo === "solicitud" && ticket.fechaLimite) {
    const horasRestantes = differenceInHours(ticket.fechaLimite, ahora);
    if (horasRestantes <= 48) return "alta";
    if (horasRestantes <= 168) return "media";  // 7 días
  }

  if (ticket.tipo === "incidencia" && (ticket.categoria === "software_general" || ticket.categoria === "red"))
    return "media";

  return "baja";
}
```

---

## 7. Estrategia de Datos en el Frontend (Artículo XI)

| Tipo de operación | Patrón | Prohibido |
|---|---|---|
| **Lectura de datos** | Server Components nativos (`async` components) + service + repository | `useEffect` + `fetch` para datos iniciales |
| **Mutaciones** | Server Actions → `revalidatePath` o `revalidateTag` | Librerías de estado global sin justificación |
| **Estado UI local** | `useState` (ej. abrir/cerrar modal) | Estado global para UI local |
| **Imágenes** | `next/image` (lazy loading, compresión) | `<img>` plano |

---

## 8. Estrategia de Caché y Rendimiento (Artículo XIV)

| Patrón | Aplicación |
|---|---|
| **Select explícito en Prisma** | Toda query usa `select: { campo1, campo2 }` — prohibido `findMany()` sin select. |
| **Paginación obligatoria** | Tickets, usuarios, equipos: siempre `take` + `skip` desde el primer service. |
| **ISR con tiempo fijo** | Catálogo de laboratorios (pública, baja volatilidad): `revalidate: 60`. |
| **revalidatePath bajo demanda** | Después de cada Server Action que muta datos: `revalidatePath` inmediato. |
| **Índices en BD** | `@@index([equipoId, estado])` y `@@index([tecnicoAsignadoId, estado])` en Ticket; `@@index([usuarioId])` en PasswordResetToken. |
| **Singleton PrismaClient** | `lib/prisma.ts` exporta una instancia única — evita agotar el pool de conexiones en Vercel serverless. |

---

## 9. Diseño de Interfaz por Módulo

### 9.1 Paleta de Estados Visuales (Artículo VI)

| Estado | Color | Uso |
|---|---|---|
| **Operativo** | Verde `#22C55E` | Equipo funcionando correctamente. |
| **Mantenimiento / En proceso** | Amarillo `#EAB308` | Equipo con ticket activo. |
| **Inoperativo** | Rojo `#EF4444` | Equipo sin funcionar. |
| **Dado de baja** | Gris `#6B7280` | Equipo retirado permanentemente. |

### 9.2 Flujo de Usuario del Reporte (HU-01)

```
Paso 1: Seleccionar laboratorio y equipo (por código de inventario)
        → Validación: equipo no debe estar "dado_de_baja"
        → Alerta: si tiene tickets abiertos (warning, no bloqueo)

Paso 2: Elegir tipo (Incidencia/Solicitud) y categoría con íconos
        → Incidencia: 🖥️ Hardware | 💾 Software | 🌐 Red
        → Solicitud:  📦 Software Licenciado | 💿 Software General

Paso 3: Descripción + foto opcional + fecha límite (si Solicitud)
        → Validación Zod en frontera
        → Envío → ticket generado → número de ticket visible
```

### 9.3 Panel del Técnico (HU-03)

- Tabla paginada de tickets con columnas: Nro, Equipo, Lab., Tipo, Categoría, Prioridad (calculada), Estado, Asignado a, Fecha.
- Filtros rápidos: Laboratorio | Tipo | Prioridad | Estado.
- Botón de acción contextual: "Tomar ticket" (si libre), "Cambiar estado", "Agregar comentario".
- Badge visual de prioridad: 🔴 Alta | 🟡 Media | 🟢 Baja.

---

## 10. Estrategia de Pruebas (Artículo V — conexión diseño ↔ QA)

### 10.1 Pruebas Unitarias (Vitest)

Cada `service` es testeable en aislamiento porque no tiene dependencias de HTTP:

```ts
// tests/ticket.service.test.ts — ejemplo
describe("calcularPrioridad", () => {
  it("devuelve 'alta' para incidencia de hardware", () => { ... });
  it("devuelve 'alta' para solicitud con fecha límite < 48h", () => { ... });
  it("devuelve 'baja' para solicitud sin fecha límite", () => { ... });
});
```

### 10.2 Pruebas de Integración (Vitest + Prisma)

Usan un schema aislado (`test`) de PostgreSQL:
- `beforeEach`: `prisma.$executeRaw` + seed de prueba.
- `afterAll`: limpieza del schema de prueba.
- Cubren: flujo completo de creación y resolución de ticket (incluyendo efectos automáticos sobre `Equipo` y `EquipoSoftware`).

### 10.3 Seed de Pruebas (prisma/seed.ts — Artículo XII)

El seed garantiza:
- 1 usuario por cada rol (admin, técnico, docente, estudiante).
- 3 laboratorios con 10 equipos cada uno.
- Catálogo de software con 8 entradas.
- Historial de 6 meses de tickets distribuidos (con `fechaCreacion` y `fechaCierre` simuladas).
- Al menos 1 equipo con ≥ 5 tickets (para testear el reporte de recurrencia de HU-06).
- Al menos 1 equipo con 0 tickets (para testear el caso negativo).

---

## 11. Trazabilidad del Diseño con la Constitution

| Decisión de diseño | Artículo de la Constitution |
|---|---|
| Capas: `app/ → services → repositories` | Art. III |
| Stack cerrado: Next.js + TS + Prisma + Supabase | Art. II |
| Contrato `{ success, data?, error?, warning? }` | Art. IX (v1.3) |
| `DomainError` vs. errores Prisma no controlados | Art. X |
| Lectura Server Components / mutación Server Actions | Art. XI |
| Seed con historial de 6 meses como prerrequisito de tests | Art. XII |
| No inventar campos por ambigüedad — parar y preguntar | Art. XIII |
| Select explícito, paginación, `next/image`, ISR, índices, PrismaClient singleton | Art. XIV |
| Rol validado en servidor, nunca parámetro del cliente | Art. IV |
| `dado_de_baja` como cuarto estado del equipo | Art. VII (v1.7) |
