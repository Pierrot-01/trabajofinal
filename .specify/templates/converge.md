# /speckit.converge — Template de Convergencia / Auditoría
> Fuente: estructura de `.agents/` + módulos implementados de EpisLab

---

## Instrucciones para el Agente

Al ejecutar `/speckit.converge`:

1. Lee `.specify/constitution.md` y los artefactos SDD del módulo (spec/plan/tasks).
2. Inspecciona el código real en las rutas del proyecto.
3. Compara lo implementado contra lo que spec y plan definen.
4. Genera un reporte `converge.md` y agrega tareas de corrección al `tasks.md` si hay deuda.

---

## Mapa de archivos del proyecto (referencia para la inspección)

```
lib/ports/
  ITicketRepository.ts        ← 001 Tickets
  IUsuarioRepository.ts       ← 002 Usuarios
  IEquipoRepository.ts        ← 003 Laboratorios/Equipos
  ILaboratorioRepository.ts   ← 003 Laboratorios
  ISoftwareRepository.ts      ← 004 Software

lib/validators/
  ticket.validators.ts
  usuario.validators.ts
  equipo.validators.ts
  laboratorio.validators.ts
  software.validators.ts

lib/repositories/
  ticket.repository.ts
  usuario.repository.ts
  equipo.repository.ts
  laboratorio.repository.ts
  software.repository.ts

lib/services/
  ticket.service.ts
  usuario.service.ts
  equipo.service.ts
  laboratorio.service.ts
  software.service.ts

lib/errors/          ← DomainError base
lib/api-response.ts  ← ok() / fail()
lib/logger.ts        ← logger estructurado
lib/auth.ts          ← Auth.js config
lib/prisma.ts        ← singleton PrismaClient

tests/unit/
  ticket.service.test.ts
  ticket.repository.test.ts
  usuario.service.test.ts
  equipo.service.test.ts
  equipo.service.additional.test.ts
  equipo.repository.test.ts
  laboratorio.repository.test.ts
  software.service.test.ts
  software.service.additional.test.ts
  software.repository.test.ts
  api-response.test.ts

app/
  tickets/             → page.tsx, nuevo/page.tsx, [id]/page.tsx, actions.ts
  admin/usuarios/      → page.tsx, actions.ts
  admin/laboratorios/  → page.tsx, actions.ts
  admin/equipos/       → page.tsx, actions.ts
  admin/software/      → page.tsx, actions.ts
  laboratorios/        → page.tsx (pública HU-05)
  cuenta/              → page.tsx, actions.ts
  recuperar-password/  → page.tsx, [token]/page.tsx, actions.ts
  login/               → page.tsx
```

---

## Estructura del converge.md a generar

```markdown
# Converge: [Nombre del Módulo o "Sistema Completo"]
**Fecha:** [fecha]
**Artefactos SDD:** spec v[X], plan v[X], tasks v[X]
**Constitution de referencia:** v1.8
**Archivos inspeccionados:** [lista]

## Estado por capa

### `lib/ports/` — Puertos
| Archivo | Estado | Observación |
|---|---|---|
| `IXxxRepository.ts` | ✅ Presente / ❌ Falta / ⚠️ Difiere del plan | [detalle] |
| ¿Todos los métodos del plan están declarados? | ✅ / ❌ | |

### `lib/validators/` — Validadores
| Archivo | Estado | Observación |
|---|---|---|
| `xxx.validators.ts` | ✅ / ❌ / ⚠️ | |
| ¿`safeParse()` en lugar de `parse()`? | ✅ / ❌ | |

### `lib/repositories/` — Repositorios
| Archivo | Estado | Observación |
|---|---|---|
| `xxx.repository.ts` | ✅ / ❌ / ⚠️ | |
| ¿Implementa `IXxxRepository`? | ✅ / ❌ | |
| ¿Queries con `select` explícito? (Art. XIV) | ✅ / ❌ | |
| ¿Paginación en listados? | ✅ / ❌ | |

### `lib/services/` — Servicios
| Archivo | Estado | Observación |
|---|---|---|
| `xxx.service.ts` | ✅ / ❌ / ⚠️ | |
| ¿Inyecta repositorio por constructor? | ✅ / ❌ | |
| ¿Importa `@prisma/client`? (NO debe) | ✅ Limpio / ❌ Viola | |
| ¿Importa `repositories/`? (NO debe) | ✅ Limpio / ❌ Viola | |
| ¿Lanza `DomainError` (no strings)? | ✅ / ❌ | |

### `tests/unit/` — Tests
| CA del spec | Caso de prueba | Estado |
|---|---|---|
| CA-01 | `xxx.service.test.ts` — describe('[HU-01]') | ✅ / ❌ Falta |
| CA-XX (warning) | mock devuelve registro abierto → warning | ✅ / ❌ |
| EC-01 | DomainError lanzado correctamente | ✅ / ❌ |

### `app/` — Presentación
| Archivo | Estado | Observación |
|---|---|---|
| `actions.ts` | ✅ / ❌ / ⚠️ | |
| ¿`auth()` para obtener sesión (no del cliente)? | ✅ / ❌ | |
| ¿Devuelve `{ success, data?, error?, warning? }`? | ✅ / ❌ | |
| ¿Llama al servicio (no al repositorio directamente)? | ✅ / ❌ | |
| ¿`revalidatePath()` después de mutaciones? | ✅ / ❌ | |
| ¿`next/image` para imágenes? (Art. XIV) | ✅ / N/A / ❌ | |

## Violaciones de Arquitectura

### [VIO-01] [Descripción]
- **Severidad:** CRÍTICA / ALTA / MEDIA
- **Archivo:** `[ruta]` — línea [N]
- **Violación:** [qué artículo de la Constitution incumple]
- **Corrección:** [qué cambiar]

## Deuda Técnica — Tareas agregadas a tasks.md

- [ ] **CONV-01:** [corrección]
  - **Prioridad:** CRÍTICA / ALTA / MEDIA
  - **Archivo:** `[ruta]`

## Métricas de Cobertura SDD
| Criterio | Total en spec | Implementados | Pendientes |
|---|---|---|---|
| Historias de Usuario | [N] | [N] | [N] |
| Criterios de Aceptación | [N] | [N] con test | [N] sin test |
| Reglas de Negocio (BR) | [N] | [N] | [N] |
| Tareas completadas en tasks.md | [N] | [N] | [N] |

## Resumen Ejecutivo
**Estado del módulo:** Completo / Parcial / Con violaciones críticas  
**Cobertura de tests (service):** [X]% (mínimo requerido: 90%)  
**Recomendación:** [continuar / corregir violaciones / agregar tests faltantes]
```

---

## Comandos de verificación a ejecutar

```bash
# Verificar TypeScript
pnpm tsc --noEmit

# Correr todos los tests
pnpm test:run

# Ver cobertura
pnpm test:coverage

# Linter
pnpm lint

# Explorar BD para verificar datos
pnpm prisma studio
```
