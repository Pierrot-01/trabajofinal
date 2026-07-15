# 🌱 Spec-Kit — Constitution de EpisLab
> Fuente: `.agents/rules/programacion/constitucion1.md` + `constitucion2.md`  
> Este archivo es leído por el agente al ejecutar `/speckit.constitution`.

---

## Identidad del Proyecto

**Nombre:** EpisLab — Sistema Web de Gestión de Informes Técnicos y Mantenimiento de Equipos de Cómputo  
**Institución:** EPIS — Universidad Nacional de San Cristóbal de Huamanga (UNSCH)  
**Curso:** IS-489 — Pruebas y Aseguramiento de la Calidad de Software  
**Metodología:** Spec-Driven Development (SDD)  
**Constitution Version:** v1.8

---

## Artículo I — Alcance y propósito

El sistema resuelve la falta de trazabilidad en la gestión de fallas e insumos de los laboratorios de cómputo de la EPIS-UNSCH. Formaliza dos tipos de flujo que deben mantenerse **siempre diferenciados**:

1. **Incidencia** — equipo con falla física o de software que impide su uso (PC no enciende, mouse dañado, sin red).
2. **Solicitud** — equipo carece de recurso para clases (licencia SPSS/MATLAB, instalación, actualización).

Ciclo de vida compartido: `pendiente → en_proceso → resuelto` (sin retroceso).

**No negociable:** ningún artefacto puede fusionar Incidencia y Solicitud en una sola entidad sin distinción de tipo.

---

## Artículo II — Stack tecnológico (CERRADO)

| Capa | Tecnología |
|---|---|
| Frontend & API | Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Server Actions + API Routes (monorepo) |
| Base de datos | PostgreSQL (Supabase) |
| ORM | Prisma (singleton en `lib/prisma.ts`) |
| Autenticación | Auth.js v5 (NextAuth) — credenciales institucionales |
| Gestor de paquetes | **pnpm** (nunca npm/yarn) |
| Validación | **Zod** (toda entrada pasa por schema antes de tocar datos) |
| Testing | Vitest + Testing Library |
| Despliegue | Vercel |

---

## Artículo III — Arquitectura Hexagonal (MANDATORIA)

```
┌──────────────────────────────────────────────────────────┐
│  PRESENTACIÓN  app/                                      │
│  Server Components (lectura) + Server Actions (mutación) │
│  → Solo llama a lib/services/. NUNCA a Prisma directo.   │
├──────────────────────────────────────────────────────────┤
│  DOMINIO  lib/services/  lib/validators/  lib/errors/    │
│  Reglas de negocio, DomainErrors, schemas Zod            │
│  → Sin dependencias de HTTP, Next.js ni Prisma           │
├──────────────────────────────────────────────────────────┤
│  PUERTOS  lib/ports/I*Repository.ts                      │
│  Interfaces TypeScript puras — el dominio depende de     │
│  estas, NO de la implementación concreta                 │
├──────────────────────────────────────────────────────────┤
│  INFRAESTRUCTURA  lib/repositories/                      │
│  Implementan los puertos. ÚNICO lugar donde vive Prisma. │
└──────────────────────────────────────────────────────────┘
```

**Prohibiciones absolutas:**
- ❌ `import { prisma }` en `lib/services/` o `app/`
- ❌ `import { XxxRepository }` desde `lib/services/`
- ❌ Crear un repositorio sin su `IXxxRepository.ts` previo en `lib/ports/`
- ❌ Server Action que llame directamente a repositorios o Prisma
- ❌ Exponer mensajes de Prisma/PostgreSQL al cliente

**Regla adicional:** Ninguna Server Action recibe `usuarioId` ni `rol` como parámetro del cliente — siempre se obtiene de la sesión del servidor (`auth()`).

---

## Artículo IV — Seguridad (OWASP Top 10:2025)

1. Control de acceso en `services/` y middleware — nunca solo en el frontend.
2. Contraseñas hasheadas con **bcrypt**. JWT firmado con secreto en `.env`.
3. Zod valida **toda** entrada antes de tocar la base de datos.
4. Variables sensibles solo en `.env`, nunca en el repositorio.
5. Rate limiting en login/registro; bloqueo 15 min tras 5 intentos fallidos.
6. `pnpm audit` obligatorio antes de cada entrega.
7. HTTPS obligatorio en todo entorno desplegado (Vercel lo da por defecto).

---

## Artículo V — Testing (IS-489)

1. Cada `service` tiene tests unitarios antes de considerarse completo (mínimo: éxito + 1 caso borde por función).
2. Los tests usan mocks de la **interfaz** `IXxxRepository`, nunca del repositorio concreto.
3. Endpoints críticos (auth, creación/cambio de estado de tickets) requieren prueba de integración.
4. Cobertura mínima: **90% en capa de servicios**.
5. Framework: **Vitest** + Testing Library.
6. Comando: `pnpm test:run`.

---

## Artículo VII — Modelo de datos (entidades reales del proyecto)

```
Usuario            id, nombre, correo(@unsch.edu.pe), passwordHash, rol, activo, intentosFallidos, bloqueadoHasta
PasswordResetToken id, usuarioId, tokenHash(único), expiraEn, usado, createdAt
Laboratorio        id, nombre, ubicacion, capacidad
Equipo             id, codigoInventario(único), laboratorioId, estado(operativo|mantenimiento|inoperativo|dado_de_baja)
Software           id, nombre(único), tipo(licenciado|gratuito), version?
EquipoSoftware     equipoId + softwareId (tabla intermedia, instaladoEn)
Ticket             id, tipo(incidencia|solicitud), categoria(hardware|software_licencia|software_general|red),
                   descripcion(10-500chars), fotoUrl?, estado(pendiente|en_proceso|resuelto),
                   fechaCreacion, fechaCierre?, fechaLimite?(solo Solicitudes),
                   comentarioCierre?(obligatorio al resolver), softwareId?, softwareTexto?,
                   equipoId, usuarioReportaId, tecnicoAsignadoId?,
                   ticketRelacionadoId?
Comentario         id, ticketId, usuarioId, contenido, createdAt

NOTA: prioridad NO es campo de BD — se calcula al vuelo en ticket.service.ts
```

**Roles:** `admin | tecnico | docente | estudiante`

---

## Artículo VIII — Proceso SDD (flujo obligatorio)

```
Constitution → Specify → Clarify → Plan → Tasks → Analyze → Implement
```

**Orden de implementación por capa (nunca invertir):**
```
Fase 0: prisma/schema.prisma
Fase 1: lib/ports/IXxxRepository.ts        ← PRIMERO el contrato
Fase 2: lib/validators/xxx.validators.ts
Fase 3: lib/errors/ (si aplica)
Fase 4: lib/repositories/xxx.repository.ts
Fase 5: lib/services/xxx.service.ts
Fase 6: tests/unit/xxx.*.test.ts
Fase 7: app/...
```

---

## Artículo IX — Contrato de API

```ts
{ success: boolean; data?: unknown; error?: string; warning?: string }
```

- `success: true` + `warning` → operación exitosa con advertencia no bloqueante (ej. ticket duplicado). **No es un error.**
- `success: false` + `error` → mensaje seguro para el cliente. **Nunca** stack traces ni mensajes de Prisma.

---

## Artículo X — Manejo de errores

- **DomainError** → error de negocio, se captura y traduce a mensaje claro en `error`.
- **Error no controlado** → se registra en `logger.ts` (JSON a stdout), hacia el cliente solo: `"Ocurrió un error, intenta nuevamente"`.

---

## Artículos XI–XIV (resumen)

- **XI:** Lectura vía Server Components async; mutaciones vía Server Actions + `revalidatePath`. Prohibido `useEffect`+`fetch` para datos iniciales. Sin librerías de estado global sin justificación.
- **XII:** `prisma/seed.ts` con 6 meses de histórico simulado. `prisma migrate reset` + seed antes de cada suite de integración.
- **XIII:** El agente **no inventa** campos, entidades ni flujos ante ambigüedad. Se detiene y pide clarificación.
- **XIV:** Queries Prisma con `select` explícito. Paginación obligatoria en listados. `next/image`. Índices en filtros frecuentes.

---

## Módulos del sistema

| Módulo | Prioridad | Estado |
|---|---|---|
| [001] Tickets (Incidencias y Solicitudes) | P0 — módulo central | Implementado |
| [002] Usuarios y Autenticación | P0 — bloquea todos | Implementado |
| [003] Laboratorios y Equipos | P1 | Implementado |
| [004] Catálogo de Software | P1 | Implementado |
