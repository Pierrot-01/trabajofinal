# AGENTS.md — Reglas del Agente de IA para EpisLab

> Este archivo es leído automáticamente por el agente al iniciar en este workspace.
> Define el comportamiento esperado en todo momento.

---

## 🏛️ Arquitectura Hexagonal — Regla Absoluta

**Esta es la regla más importante del proyecto.** El agente DEBE respetar en todo momento la arquitectura hexagonal (Ports & Adapters):

```
app/               → Presentación (Puerto de Entrada)
  └── Solo llama a lib/services/. NUNCA a repositories/ ni a prisma

lib/
  ├── ports/       → Contratos (Interfaces TypeScript puras)
  │   └── Todo repositorio nuevo NECESITA su IXxxRepository.ts PRIMERO
  ├── validators/  → Schemas Zod (validación de entrada)
  ├── errors/      → DomainError y subclases
  ├── services/    → Dominio (lógica de negocio)
  │   └── Depende de ports/, NUNCA de repositories/ ni de @prisma/client
  └── repositories/ → Adaptadores de salida (implementan ports/)
      └── ÚNICO lugar donde se usa Prisma

prisma/            → Schema de base de datos
tests/unit/        → Tests con mocks de IXxxRepository
```

### Prohibiciones absolutas

- ❌ `import { prisma }` en `lib/services/` o en `app/`
- ❌ `import { XxxRepository }` desde `lib/services/`
- ❌ Crear un repositorio sin su puerto en `lib/ports/` primero
- ❌ Server Actions que llamen directamente a repositorios o Prisma
- ❌ Exponer mensajes de Prisma/PostgreSQL al cliente

---

## 🌱 Metodología SDD — Comandos Spec-Kit

Este proyecto usa **Spec-Driven Development** con los siguientes comandos. El agente debe
conocer estos comandos y ejecutarlos cuando el usuario los invoque:

| Comando | Template | Propósito |
|---|---|---|
| `/speckit.constitution` | `.specify/constitution.md` | Leer los principios del proyecto |
| `/speckit.specify` | `.specify/templates/specify.md` | Definir qué construir |
| `/speckit.clarify` | `.specify/templates/clarify.md` | Resolver ambigüedades |
| `/speckit.plan` | `.specify/templates/plan.md` | Plan técnico por capas hexagonales |
| `/speckit.tasks` | `.specify/templates/tasks.md` | Tareas por capa (Fase 0→7) |
| `/speckit.analyze` | `.specify/templates/analyze.md` | Verificar coherencia entre artefactos |
| `/speckit.implement` | `.specify/templates/implement.md` | Implementar en orden de capas |
| `/speckit.converge` | `.specify/templates/converge.md` | Auditar codebase vs spec |

### Flujo SDD obligatorio
```
Constitution → Specify → Clarify → Plan → Tasks → Analyze → Implement
```
Ninguna fase se puede saltar. Si el usuario pide implementar sin spec/plan, el agente debe
advertirlo y solicitar completar las fases previas.

### Orden de implementación obligatorio (por capa)
```
Fase 0: prisma/schema.prisma
Fase 1: lib/ports/IXxxRepository.ts
Fase 2: lib/validators/xxx.validators.ts
Fase 3: lib/errors/ (si aplica)
Fase 4: lib/repositories/xxx.repository.ts
Fase 5: lib/services/xxx.service.ts
Fase 6: tests/unit/xxx.*.test.ts
Fase 7: app/...
```

---

## 📋 Contrato de API

Toda Server Action y API Route devuelve **exactamente**:
```ts
{ success: boolean; data?: unknown; error?: string; warning?: string }
```

- `success: false` → `error` con mensaje seguro para el cliente. NUNCA stack traces.
- `warning` coexiste con `success: true` — no es un error.

---

## 🧪 Testing

- Los tests usan mocks de la **interfaz** `IXxxRepository`, nunca del repositorio concreto.
- Framework: **Vitest** + **Testing Library**.
- Comando: `pnpm test:run` o `pnpm test` (watch mode).
- Cada función del servicio tiene mínimo: caso exitoso + 1 caso borde.

---

## 🛠️ Comandos Frecuentes

```bash
pnpm dev              # Servidor de desarrollo
pnpm test             # Tests en watch mode
pnpm test:run         # Tests una vez (para CI)
pnpm test:coverage    # Cobertura
pnpm lint             # Linter
pnpm build            # Build de producción (incluye prisma generate)
pnpm prisma generate  # Regenerar cliente Prisma
pnpm prisma studio    # Explorar la base de datos
```

---

## 🚫 Stack — No Introducir Nada Nuevo Sin Decisión Explícita

| ✅ Permitido | ❌ Prohibido |
|---|---|
| TypeScript | JavaScript puro |
| pnpm | npm, yarn |
| Prisma | Otra ORM |
| Zod | Yup, Joi, validación manual |
| Vitest | Jest, Mocha |
| Auth.js v5 | Otra librería de auth |
| shadcn/ui + Tailwind | Otro sistema de diseño |
