# EpisLab — Sistema Web de Gestión de Mantenimiento y Control de Laboratorios

> **EPIS — Escuela Profesional de Ingeniería de Sistemas**  
> Universidad Nacional de San Cristóbal de Huamanga (UNSCH)  
> Curso: IS-489 — Pruebas y Aseguramiento de la Calidad de Software

Sistema web para la gestión integral de incidencias técnicas, solicitudes de software, control de equipos y catalogación de activos en los laboratorios de cómputo de la EPIS-UNSCH.

---

## Tabla de Contenidos

- [El Problema](#-el-problema)
- [Módulos del Sistema](#-módulos-del-sistema)
- [Arquitectura Hexagonal](#-arquitectura-hexagonal)
- [Stack Tecnológico](#-stack-tecnológico)
- [Metodología SDD + Spec-Kit](#️-metodología-sdd--spec-kit)
- [Modelo de Datos](#-modelo-de-datos)
- [Reglas de Negocio Clave](#-reglas-de-negocio-clave)
- [Plan de QA y Pruebas](#-plan-de-qa-y-pruebas)
- [Instalación y Ejecución](#-instalación-y-ejecución)
- [Comandos del Proyecto](#-comandos-del-proyecto)
- [Estructura de Carpetas](#-estructura-de-carpetas)

---

## 🔴 El Problema

Los laboratorios EPIS-UNSCH no tienen mecanismo formal para:
- Reportar fallas en equipos (con trazabilidad auditada)
- Solicitar instalación o licenciamiento de software antes de clases
- Mantener un historial completo por equipo para analizar fallas recurrentes
- Justificar con datos objetivos la renovación de equipos

**EpisLab** formaliza y automatiza este ciclo de vida con trazabilidad completa, diferenciando siempre entre dos tipos de flujo:

| Tipo | Descripción | Ejemplo |
|---|---|---|
| **Incidencia** | Falla física o de software que impide el uso del equipo | PC no enciende, mouse dañado, sin red |
| **Solicitud** | Recurso faltante necesario para clases | Licencia SPSS/MATLAB, instalación de programa |

Ciclo de vida compartido: `pendiente → en_proceso → resuelto` *(sin retroceso — reaparición = nuevo ticket referenciado)*

---

## 📦 Módulos del Sistema

| # | Módulo | Prioridad | Descripción |
|---|---|---|---|
| 001 | **Tickets** | P0 — núcleo | Incidencias y solicitudes de software sobre equipos |
| 002 | **Usuarios y Autenticación** | P0 — bloquea todo | Login institucional, roles, recuperación de contraseña |
| 003 | **Laboratorios y Equipos** | P1 | CRUD de labs y equipos, gestión de baja administrativa |
| 004 | **Catálogo de Software** | P1 | Catálogo de software instalable en equipos |

### Actores del sistema

| Actor | Permisos |
|---|---|
| **admin** | Gestión completa: usuarios, labs, equipos, software, reportes |
| **tecnico** | Gestiona tickets: toma, cambia estado, cierra con comentario |
| **docente** | Reporta incidencias y solicita software |
| **estudiante** | Reporta incidencias en equipos de prácticas |

> Solo el `admin` crea cuentas. Solo con correo `@unsch.edu.pe`. Sin auto-registro público.

---

## 🏛️ Arquitectura Hexagonal

El sistema aplica **Ports & Adapters** con separación estricta de responsabilidades. Ninguna capa puede saltar a la siguiente.

```
┌──────────────────────────────────────────────────────────────┐
│  PRESENTACIÓN  ·  app/                                       │
│  Server Components (lectura) + Server Actions (mutaciones)   │
│  → Solo llama a lib/services/. NUNCA a Prisma directamente.  │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│  DOMINIO  ·  lib/services/ + lib/validators/ + lib/errors/   │
│  Reglas de negocio, DomainErrors, schemas Zod                │
│  → Sin dependencias de HTTP, Next.js ni Prisma               │
└────────────────────────────┬─────────────────────────────────┘
                             │  (depende de interfaces, no de implementaciones)
┌────────────────────────────▼─────────────────────────────────┐
│  PUERTOS  ·  lib/ports/I*Repository.ts                       │
│  Interfaces TypeScript puras — contratos del dominio         │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│  INFRAESTRUCTURA  ·  lib/repositories/                       │
│  Implementan los puertos. ÚNICO lugar donde vive Prisma.     │
└──────────────────────────────────────────────────────────────┘
```

### Reglas no negociables

- ❌ `import { prisma }` en `lib/services/` o `app/` — **PROHIBIDO**
- ❌ `import { XxxRepository }` desde `lib/services/` — **PROHIBIDO**
- ❌ Crear un repositorio sin su `IXxxRepository.ts` previo en `lib/ports/` — **PROHIBIDO**
- ❌ Server Action que reciba `usuarioId` o `rol` del cliente — siempre de `auth()` del servidor
- ❌ Exponer mensajes de Prisma/PostgreSQL al cliente

### Contrato de API (uniforme en todo el sistema)

Toda Server Action y API Route devuelve exactamente:

```ts
{ success: boolean; data?: unknown; error?: string; warning?: string }
```

- `success: true` + `warning` → operación exitosa con advertencia no bloqueante *(ej. ticket duplicado)*
- `success: false` + `error` → mensaje seguro para el cliente. Nunca stack traces ni errores de Prisma.

---

## 🚀 Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend & API | Next.js 16 (App Router) + TypeScript |
| Estilos | Tailwind CSS + shadcn/ui *(mobile-first)* |
| Base de datos | PostgreSQL — Supabase + PgBouncer (serverless pooling) |
| ORM | Prisma — singleton en `lib/prisma.ts` |
| Autenticación | Auth.js v5 (NextAuth) — credenciales institucionales + bcrypt |
| Validación | Zod — toda entrada pasa por schema antes de tocar datos |
| Gestor de paquetes | **pnpm** *(nunca npm ni yarn)* |
| Testing | Vitest + Testing Library (TypeScript) · xUnit + Moq (C#) |
| Despliegue | Vercel — CI/CD automático desde GitHub |

---

## 🛠️ Metodología SDD + Spec-Kit

El desarrollo sigue **Spec-Driven Development (SDD)** con [Spec-Kit](https://github.com/github/spec-kit). Ninguna fase puede saltarse.

```
Constitution → Specify → Clarify → Plan → Tasks → Analyze → Implement
```

### Flujo por módulo

| Fase | Comando | Qué genera |
|---|---|---|
| Principios | `/speckit.constitution` | Lee `.specify/constitution.md` — reglas no negociables del proyecto |
| Especificación | `/speckit.specify` | `spec.md` — qué construir: HUs, CAs, reglas de negocio, casos borde |
| Clarificación | `/speckit.clarify` | Resuelve ambigüedades antes de planear (Artículo XIII) |
| Plan técnico | `/speckit.plan` | `plan.md` — cómo construirlo, capa por capa hexagonal |
| Tareas | `/speckit.tasks` | `tasks.md` — tareas numeradas por capa (T001→Tnn con checkpoints) |
| Análisis | `/speckit.analyze` | `analyze.md` — coherencia cruzada entre spec/plan/tasks |
| Implementación | `/speckit.implement` | Ejecución incremental capa por capa con patrones reales del proyecto |
| Auditoría | `/speckit.converge` | Evalúa el codebase real contra los artefactos SDD |

### Orden de implementación por capa (nunca invertir)

```
Fase 0 · prisma/schema.prisma
Fase 1 · lib/ports/IXxxRepository.ts      ← el contrato PRIMERO
Fase 2 · lib/validators/xxx.validators.ts
Fase 3 · lib/errors/                       (si hay nuevos DomainErrors)
Fase 4 · lib/repositories/xxx.repository.ts
Fase 5 · lib/services/xxx.service.ts
Fase 6 · tests/unit/xxx.*.test.ts
Fase 7 · app/...
```

### Artefactos Spec-Kit del proyecto

| Artefacto | Archivo |
|---|---|
| Constitution | [`.specify/constitution.md`](.specify/constitution.md) |
| Specify | [`.specify/templates/specify.md`](.specify/templates/specify.md) |
| Clarify | [`.specify/templates/clarify.md`](.specify/templates/clarify.md) |
| Plan | [`.specify/templates/plan.md`](.specify/templates/plan.md) |
| Tasks | [`.specify/templates/tasks.md`](.specify/templates/tasks.md) |
| Analyze | [`.specify/templates/analyze.md`](.specify/templates/analyze.md) |
| Implement | [`.specify/templates/implement.md`](.specify/templates/implement.md) |
| Converge | [`.specify/templates/converge.md`](.specify/templates/converge.md) |

### Artefactos SDD por módulo (en `.agents/rules/`)

| Módulo | Spec | Plan | Tasks |
|---|---|---|---|
| 001 Tickets | `spec_tickets1.md` + `spec_tickets2.md` | `planticket1.md` + `planticket2.md` | `task_tickets1.md` + `task_tickets2.md` |
| 002 Usuarios | `Speck_Usuarios1 copy.md` | `Plan_Usuarios1.md` | `Task_Usuario.md` |
| 003 Labs y Equipos | `Speck_LaboratoriosE.md` | `Plan_LaboratorioE.md` | `Task_LaboratoriosE.md` |
| 004 Software | `spec_Software.md` | `Plan_Software.md` | `Task_Software.md` |

> Las reglas del agente de IA están en [`.agents/AGENTS.md`](.agents/AGENTS.md).

---

## 🗄️ Modelo de Datos

```
Usuario            id · nombre · correo(@unsch.edu.pe) · passwordHash · rol · activo
PasswordResetToken id · usuarioId · tokenHash(único) · expiraEn · usado
Laboratorio        id · nombre · ubicacion · capacidad
Equipo             id · codigoInventario(único) · laboratorioId · estado
                   estado: operativo | mantenimiento | inoperativo | dado_de_baja
Software           id · nombre(único) · tipo(licenciado|gratuito) · version?
EquipoSoftware     equipoId + softwareId · instaladoEn  (tabla intermedia)
Ticket             id · tipo(incidencia|solicitud) · categoria · descripcion(10-500)
                   fotoUrl? · estado(pendiente|en_proceso|resuelto)
                   fechaCreacion · fechaCierre? · fechaLimite?(solo Solicitudes)
                   comentarioCierre? · softwareId? · softwareTexto?
                   equipoId · usuarioReportaId · tecnicoAsignadoId? · ticketRelacionadoId?
Comentario         id · ticketId · usuarioId · contenido · createdAt
```

> **`prioridad` NO es campo de BD** — se calcula al vuelo en `ticket.service.ts` comparando `categoria` y `fechaLimite` con el momento actual. Siempre refleja urgencia real sin cron jobs.

**Cálculo de prioridad:**

| Condición | Prioridad |
|---|---|
| Categoría `hardware` | Alta |
| Solicitud con `fechaLimite` < 48h | Alta |
| Categoría `software_general` o `red`, o `fechaLimite` entre 3 y 7 días | Media |
| Sin fecha límite o `fechaLimite` > 7 días | Baja |

---

## ⚖️ Reglas de Negocio Clave

| ID | Regla | Comportamiento |
|---|---|---|
| BR-01 | Equipo con ticket abierto al crear uno nuevo | `warning` — advierte, no bloquea |
| BR-02 | Incidencia `hardware` resuelta | `Equipo.estado = operativo` automático (misma transacción) |
| BR-03 | Solicitud de software resuelta | Crea/actualiza `EquipoSoftware` automático |
| BR-04 | Ticket `resuelto` no puede volver a `pendiente` | `DomainError` |
| BR-05 | Solo `admin` reasigna ticket ya tomado por técnico | Control de rol |
| BR-06 | Último `admin` activo no puede desactivarse ni degradarse | `DomainError` |
| BR-07 | Contraseña temporal debe cambiarse en el primer login | Flujo forzado |
| BR-08 | Equipo `dado_de_baja` no aparece en selector de nuevos tickets | Filtro de datos |
| BR-09 | No se puede dar de baja equipo con tickets `pendiente`/`en_proceso` | `DomainError` |
| BR-10 | No se puede eliminar software en uso en `EquipoSoftware` o tickets | `DomainError` |
| BR-11 | Software en texto libre en ticket no se agrega al catálogo automáticamente | Solo el `admin` gestiona el catálogo |

---

## 🧪 Plan de QA y Pruebas

### Suite TypeScript — Vitest

**11 archivos · 141 casos de prueba · 93.23% de cobertura**

| Archivo de prueba | Capa | Qué valida |
|---|---|---|
| `ticket.service.test.ts` | Dominio | Ciclo completo de tickets, prioridad al vuelo, efectos automáticos |
| `usuario.service.test.ts` | Dominio | Auth, roles, regla del último admin, recuperación de contraseña |
| `equipo.service.test.ts` + `additional` | Dominio | CRUD equipos, validación `dado_de_baja` con tickets abiertos |
| `software.service.test.ts` + `additional` | Dominio | CRUD software, restricción de eliminación en uso |
| `ticket.repository.test.ts` | Infraestructura | Queries Prisma del módulo de tickets |
| `equipo.repository.test.ts` | Infraestructura | Queries Prisma del módulo de equipos |
| `laboratorio.repository.test.ts` | Infraestructura | Queries Prisma de laboratorios |
| `software.repository.test.ts` | Infraestructura | Queries Prisma del catálogo de software |
| `api-response.test.ts` | Utilidad | helpers `ok()` / `fail()` |

**Patrón de tests:** mock de `IXxxRepository` (interfaz), nunca del repositorio concreto ni de Prisma.

```bash
pnpm test:run       # Corre todos los tests una vez
pnpm test:coverage  # Genera reporte de cobertura
```

### Suite C# — xUnit + Moq

**141 pruebas homólogas** en Visual Studio 2022. Valida la lógica de negocio pura mediante Mocks de las interfaces de la arquitectura. Equivalencia 100% con los casos de TypeScript.  
Proyecto: [`EpisLab.Test/`](./EpisLab.Test/)

### Estrategia de datos de prueba

- `prisma/seed.ts` genera: laboratorios, equipos, un usuario por rol, catálogo de software y **6 meses de historial simulado de tickets**.
- Las pruebas de integración ejecutan `prisma migrate reset --force` + seed antes de cada corrida (aislamiento garantizado).

---

## 💻 Instalación y Ejecución

### Requisitos previos

- Node.js v20+
- pnpm instalado globalmente (`npm install -g pnpm`)

### Paso 1 — Clonar e instalar

```bash
git clone https://github.com/Pierrot-01/EpisLab.git
cd EpisLab
pnpm install
```

### Paso 2 — Variables de entorno

Crea `.env` en la raíz (guíate de [`.env.example`](.env.example)):

```env
# Supabase PostgreSQL — Pooler para serverless (PgBouncer)
DATABASE_URL="postgresql://postgres.xxxx:contraseña@aws-1-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
# Conexión directa para migraciones
DIRECT_URL="postgresql://postgres.xxxx:contraseña@aws-1-us-west-2.pooler.supabase.com:5432/postgres"

AUTH_SECRET="secreto_minimo_32_caracteres"
NEXTAUTH_URL="http://localhost:3000"
```

### Paso 3 — Base de datos y seed

```bash
pnpm prisma db push    # Sincroniza el schema
pnpm prisma db seed    # Puebla con datos de prueba (6 meses de historial)
```

### Paso 4 — Servidor de desarrollo

```bash
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000)

### Paso 5 — Suite de pruebas

```bash
pnpm test:run
```

---

## 🛠️ Comandos del Proyecto

```bash
pnpm dev              # Servidor de desarrollo
pnpm build            # Build de producción (incluye prisma generate)
pnpm start            # Servidor de producción

pnpm test             # Tests en watch mode
pnpm test:run         # Tests una vez
pnpm test:coverage    # Cobertura de código
pnpm lint             # Linter ESLint

pnpm prisma generate  # Regenerar cliente Prisma
pnpm prisma studio    # Explorar la base de datos visualmente
pnpm prisma db push   # Sincronizar schema sin migración
pnpm prisma db seed   # Ejecutar seed de datos
```

---

## 📁 Estructura de Carpetas

```
EpisLab/
│
├── app/                         ← Presentación (Puerto de Entrada)
│   ├── tickets/                 ← Lista, nuevo, detalle de tickets
│   ├── admin/
│   │   ├── usuarios/            ← Gestión de usuarios (solo admin)
│   │   ├── laboratorios/        ← Gestión de laboratorios
│   │   ├── equipos/             ← Gestión de equipos
│   │   └── software/            ← Catálogo de software
│   ├── laboratorios/            ← Vista pública: estado de equipos
│   ├── cuenta/                  ← Cambiar contraseña propia
│   └── recuperar-password/      ← Flujo de recuperación por token
│
├── lib/                         ← Lógica de negocio e infraestructura
│   ├── ports/                   ← Interfaces (contratos del dominio)
│   │   ├── ITicketRepository.ts
│   │   ├── IUsuarioRepository.ts
│   │   ├── IEquipoRepository.ts
│   │   ├── ILaboratorioRepository.ts
│   │   └── ISoftwareRepository.ts
│   ├── services/                ← Dominio (reglas de negocio)
│   │   ├── ticket.service.ts
│   │   ├── usuario.service.ts
│   │   ├── equipo.service.ts
│   │   ├── laboratorio.service.ts
│   │   └── software.service.ts
│   ├── repositories/            ← Adaptadores de salida (Prisma)
│   │   ├── ticket.repository.ts
│   │   ├── usuario.repository.ts
│   │   ├── equipo.repository.ts
│   │   ├── laboratorio.repository.ts
│   │   └── software.repository.ts
│   ├── validators/              ← Schemas Zod por módulo
│   ├── errors/                  ← DomainError y subclases
│   ├── api-response.ts          ← helpers ok() / fail()
│   ├── logger.ts                ← Logger estructurado (JSON)
│   ├── auth.ts                  ← Configuración Auth.js
│   └── prisma.ts                ← Singleton PrismaClient
│
├── prisma/
│   ├── schema.prisma            ← Modelo de datos completo
│   ├── seed.ts                  ← Datos de prueba (6 meses historial)
│   └── migrations/              ← Migraciones versionadas
│
├── tests/unit/                  ← Suite Vitest (141 casos, 93.23%)
├── EpisLab.Test/                ← Suite C# xUnit/Moq (141 casos)
│
├── .specify/                    ← Spec-Kit: templates SDD del proyecto
│   ├── constitution.md          ← Principios no negociables (v1.8)
│   └── templates/               ← Templates de comandos /speckit.*
│
└── .agents/                     ← Reglas e historia del agente de IA
    ├── AGENTS.md                ← Instrucciones del agente
    └── rules/
        ├── analisis/            ← Fase de análisis del sistema
        ├── diseño/              ← Diseño de arquitectura y BD
        └── programacion/        ← Specs, plans y tasks por módulo
```
