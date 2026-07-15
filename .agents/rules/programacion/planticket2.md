---
trigger: always_on
---

## 5.6. Optimización y rendimiento *(añadido — brecha detectada, Art. XIV)*

**Singleton de Prisma (evita agotar conexiones en serverless):**
```ts
// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```
Todo `repository` importa de aquí, nunca instancia `new PrismaClient()` directamente.

**Paginación en listados (Art. XIV, punto 2):**
- `ticket.repository.listar()` recibe `{ cursor?: string, take: number }` (paginación por cursor, no `offset` — más eficiente en MySQL con muchos registros).
- Aplica a: panel de tickets (T041), comentarios de un ticket (T058), historial de un equipo (T054).

**Consultas explícitas (Art. XIV, punto 1):** ejemplo para el panel del técnico — nunca `findMany()` sin `select`:
```ts
prisma.ticket.findMany({
  select: { id: true, tipo: true, categoria: true, estado: true, fechaCreacion: true, fechaLimite: true, equipo: { select: { codigoInventario: true } } },
  where: { /* filtros */ },
  take: 20,
});
```

**ISR vs revalidatePath (Art. XIV, punto 4):**
- `/laboratorios` (HU-05): ya usa `revalidatePath` bajo demanda (Art. XI) porque depende de una mutación concreta (resolución de ticket) — **no** se le agrega ISR por tiempo, se quedaría desactualizada entre revalidaciones automáticas.
- Vistas de solo catálogo sin mutación directa (ej. lista pública de laboratorios sin su estado de equipos, si existiera como ruta separada) sí podrían usar `export const revalidate = 60`, pero **no aplica a ninguna ruta de este módulo de Tickets** — se deja documentado para módulos futuros (Laboratorios, Software) que si la usen.

**Índice adicional para reportes (Art. XIV, punto 5):** el schema de la Sección 2 ya tenía `@@index([equipoId, estado])` y `@@index([tecnicoAsignadoId, estado])`, pero HU-06 (reportes por rango de fechas) no tenía índice de soporte — se agrega:
```prisma
model Ticket {
  // ...campos existentes...
  @@index([equipoId, estado])
  @@index([tecnicoAsignadoId, estado])
  @@index([fechaCreacion])   // nuevo — soporta el filtro de HU-06 "últimos M meses"
}
```

**Imágenes (Art. XIV, punto 3):** el detalle de ticket (`app/tickets/[id]/page.tsx`) muestra `fotoUrl` con `next/image`, con `width`/`height` fijos y `loading="lazy"` (comportamiento por defecto de `next/image`), nunca `<img src=...>` plano.

---

## 6. Lógica de negocio clave (`ticket.service.ts`)

**Cálculo de prioridad (al vuelo, Clarify #2):**
```ts
function calcularPrioridad(ticket: Ticket, ahora: Date = new Date()): "alta" | "media" | "baja" {
  if (ticket.tipo === "incidencia" && ticket.categoria === "hardware") return "alta";
  if (ticket.tipo === "incidencia") return "media"; // software_general | red

  // Solicitud
  if (!ticket.fechaLimite) return "baja";
  const horasRestantes = (ticket.fechaLimite.getTime() - ahora.getTime()) / 3_600_000;
  if (horasRestantes <= 48) return "alta";
  if (horasRestantes <= 168) return "media"; // 7 días
  return "baja";
}
```

**Cálculo de "atrasado" (al vuelo, Clarify #2 — faltaba en el borrador, Edge case 1):**
```ts
function estaAtrasado(ticket: Ticket, ahora: Date = new Date()): boolean {
  if (ticket.tecnicoAsignadoId) return false; // ya tiene dueño, no aplica
  if (ticket.estado !== "pendiente") return false;
  const horasDesdeCreacion = (ahora.getTime() - ticket.fechaCreacion.getTime()) / 3_600_000;
  return horasDesdeCreacion > 48;
}
```

**Reglas de dominio a validar antes de cualquier mutación** (todas lanzan `DomainError`, nunca un `throw` genérico):
1. Crear ticket → el `equipoId` debe existir (Edge case 2).
2. Cambiar estado → solo `tecnico`/`admin`, y solo transiciones `pendiente→en_proceso`, `en_proceso→resuelto` (nunca `resuelto→pendiente` directo — Edge case 3 maneja la recurrencia con un ticket nuevo).
3. Asignarse un ticket → si ya tiene `tecnicoAsignadoId`, falla con "Este ticket ya fue asignado" (Edge case 4), salvo que quien ejecuta la acción sea `admin` reasignando (Clarify #5).
4. Resolver → exige `comentarioCierre` (mínimo 5 caracteres); si es Incidencia `hardware`, delega a `equipo.service.ts` para actualizar `Equipo.estado` (Clarify #1); si es Solicitud de software, delega para upsert en `EquipoSoftware` (Clarify #7).
5. Comentar → solo si `estado !== "resuelto"` (HU-07, criterio 2).

**Almacenamiento de `fotoUrl` *(añadido en feedback — brecha detectada)*:** el schema define el campo pero el plan original no decía dónde vive el archivo. Decisión: **Vercel Blob** (coherente con el despliegue ya definido en Art. II, sin infraestructura extra que administrar). El flujo es: el Client Component del formulario sube el archivo directo a Vercel Blob vía un endpoint firmado, y solo la URL resultante llega a la Server Action `crearTicket` — el archivo binario nunca pasa por la Server Action ni por Prisma.

---

## 7. Trazabilidad Plan ↔ Spec (equivalente manual a /speckit.analyze, parte 1)

| Elemento del plan | Historia/Clarify que lo origina |
|---|---|
| Campo `prioridad` ausente del schema, calculado en service | Clarify #2 |
| `Equipo.estado` actualizado desde `ticket.service` → `equipo.service` | Clarify #1 |
| `EquipoSoftware` upsert al resolver Solicitud | Clarify #7 |
| `ticketRelacionadoId` como relación opcional autoreferenciada, set manual (no automático) | Clarify #8 |
| `softwareTexto` vs `softwareId` como campos separados en `Ticket` | Clarify #4 |
| Índice `[equipoId, estado]` | HU-05 (consulta frecuente de estado por equipo) |
| Índice `[tecnicoAsignadoId, estado]` | HU-03 (panel del técnico filtra por estos dos campos junto) |
| `revalidatePath("/laboratorios")` en cada cambio de estado | HU-05 Criterio 2 + Art. XI |
| Sesión obtenida vía `auth()` en cada Server Action, nunca `usuarioId`/`rol` del cliente | Art. IV (feedback post-Plan) |
| Función `estaAtrasado()` en el service | Edge case 1 (faltaba en el primer borrador del plan) |
| `fotoUrl` como URL de Vercel Blob, subida directo desde el cliente | HU-01 Criterio 5 (faltaba definición de almacenamiento) |
| Relación explícita `Ticket.software` hacia `Software` | HU-02 Criterio 2 (la relación estaba implícita, sin declarar en Prisma) |
| Singleton de `PrismaClient`, paginación por cursor, `select` explícito, índice `[fechaCreacion]` | Art. XIV (Analyze v1.5 — optimización nunca formalizada hasta esta revisión) |

---
## 8. Pendiente para la Fase 5 (Tasks)

Con el feedback aplicado, el plan ya cubre: modelo de datos completo (con relaciones explícitas), contrato de API, manejo de errores, contexto de autenticación, cálculo de prioridad y de atraso, y almacenamiento de fotos. Lo que sigue pendiente, intencionalmente, para Tasks:
- Contratos exactos (inputs Zod completos) de cada Server Action: `crearTicket`, `asignarTicket`, `cambiarEstadoTicket`, `reasignarTicket`, `agregarComentario`.
- Diseño del componente de UI para seleccionar "ticket relacionado" (Clarify #8).
- Contenido exacto de `prisma/seed.ts` (qué laboratorios, cuántos equipos, qué usuarios de prueba concretos).
- Casos de prueba unitarios por función de `ticket.service.ts` (uno por regla de dominio de la Sección 6).
