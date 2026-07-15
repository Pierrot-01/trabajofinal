# /speckit.analyze — Template de Análisis de Coherencia
> Fuente: metodología de las fases "Analyze" de EpisLab (v1.4 a v1.8 de la Constitution)

---

## Instrucciones para el Agente

Al ejecutar `/speckit.analyze`:

1. Lee `.specify/constitution.md`, `spec.md`, `plan.md` y `tasks.md` del módulo.
2. Cruza todos los artefactos con la matriz de verificación de abajo.
3. Los hallazgos ALTA bloquean el avance a `/speckit.implement`.
4. Registra el resultado en `analyze.md` del módulo.

---

## Errores detectados en Analyze de EpisLab (historial real — usar como referencia)

Estos fueron los hallazgos reales en los Analyze anteriores. Al analizar un módulo nuevo, verificar si el mismo tipo de error se repite:

| Hallazgo histórico | Módulo donde se detectó | Corrección aplicada |
|---|---|---|
| `software_id`/`software_texto` usados en spec/plan pero no propagados a la Constitution | 001 Tickets — Analyze v1.4 | Se agregaron al Artículo VII de la Constitution |
| Ambigüedad "JWT o Auth.js" en Art. II no resuelta | 001 Tickets — Analyze v1.4 | Se cerró a favor de Auth.js en Constitution v1.4 |
| `lib/logger.ts` exigido por Art. X pero no incluido en tareas | 001 Tickets — Analyze (brecha) | Se agregó T009b al tasks.md |
| Pruebas de integración sin reset+seed previo (Art. XII) | 001 Tickets — Analyze (brecha) | Se agregó T014b: `prisma migrate reset` antes de correr integración |
| Manejo de errores Zod en Server Actions indefinido | 001 Tickets — Analyze (brecha) | Se documentó patrón: `safeParse()` + `fail(issues[0].message)` |
| `prioridad` como campo de BD en vez de cálculo al vuelo | 001 Tickets — Plan original | Corregido: campo eliminado, cálculo en service |
| Usuario.activo no contemplado en Constitution | 002 Usuarios — Analyze v1.6 | Se agregó al Art. VII |
| PasswordResetToken sin entidad en Constitution | 002 Usuarios — Analyze v1.6 | Se agregó al Art. VII |
| `dado_de_baja` como valor del enum no contemplado | 003 Laboratorios — Analyze v1.7 | Se agregó al Art. VII |

---

## Matriz de Verificación

### 1. Cobertura de Historias de Usuario
| Pregunta | Estado |
|---|---|
| ¿Cada HU del spec tiene al menos una tarea en tasks.md? | ✅/❌ |
| ¿Cada CA tiene un caso de prueba en Fase 6? | ✅/❌ |
| ¿Hay tareas sin HU correspondiente en el spec? | ✅/❌ |
| ¿Los casos de warning (BR-01 style) tienen su caso de prueba? | ✅/❌ |

### 2. Coherencia de Arquitectura Hexagonal
| Regla | Estado | Hallazgo |
|---|---|---|
| ¿El plan crea `IXxxRepository.ts` antes del repositorio? | ✅/❌ | |
| ¿El servicio depende del puerto, no del repositorio concreto? | ✅/❌ | |
| ¿Ninguna tarea de `app/` llama a `repositories/` o Prisma? | ✅/❌ | |
| ¿Las Server Actions obtienen `usuarioId`/`rol` de `auth()`, no del cliente? | ✅/❌ | |
| ¿Los tests usan mocks de `IXxxRepository`, no de Prisma? | ✅/❌ | |

### 3. Coherencia con el Modelo de Datos (Art. VII)
| Pregunta | Estado |
|---|---|
| ¿Los nombres de entidades coinciden exactamente con los del Art. VII? | ✅/❌ |
| ¿Hay campos nuevos en el plan no presentes en la Constitution? Si sí, ¿se actualizó la Constitution? | ✅/❌ |
| ¿Se mantiene la distinción `incidencia`/`solicitud` sin fusionar? | ✅/❌ |
| ¿`prioridad` NO aparece como campo de BD? | ✅/❌ |
| ¿Los enums usados existen: `Rol`, `EstadoEquipo`, `TipoTicket`, `CategoriaTicket`, `EstadoTicket`, `TipoSoftware`? | ✅/❌ |

### 4. Contrato de API (Art. IX)
| Pregunta | Estado |
|---|---|
| ¿Toda Server Action devuelve `{ success, data?, error?, warning? }`? | ✅/❌ |
| ¿Los warnings están como `{ success: true, warning }`, no como `success: false`? | ✅/❌ |
| ¿Errores de Prisma nunca llegan al cliente? | ✅/❌ |
| ¿`lib/logger.ts` se usa para errores no controlados (no `console.error`)? | ✅/❌ |

### 5. Testing (Art. V)
| Pregunta | Estado |
|---|---|
| ¿Existe tarea de prueba unitaria por cada función del service? | ✅/❌ |
| ¿Los mocks usan `IXxxRepository`, no `XxxRepository` concreto? | ✅/❌ |
| ¿Las pruebas de integración incluyen `prisma migrate reset` + seed previo (Art. XII)? | ✅/❌ |

### 6. Stack y Seguridad (Art. II + IV)
| Pregunta | Estado |
|---|---|
| ¿El plan introduce tecnología fuera del stack cerrado? | ✅/❌ |
| ¿Queries Prisma con `select` explícito (Art. XIV)? | ✅/❌ |
| ¿Paginación en listados que pueden crecer sin límite? | ✅/❌ |
| ¿Validación de rol en `services/`, no solo en `app/`? | ✅/❌ |

---

## Estructura del analyze.md a generar

```markdown
# Analyze: [Nombre del Módulo]
**Artefactos:** spec v[X] + plan v[X] + tasks v[X]
**Constitution de referencia:** v1.8
**Fecha:** [fecha]
**Estado general:** ✅ Coherente / ⚠️ Con observaciones / ❌ Bloqueante

## Hallazgos

### [HAL-01] [Título]
- **Severidad:** ALTA (bloquea implement) / MEDIA / BAJA
- **Categoría:** Arquitectura / Cobertura / Modelo de Datos / API / Testing / Stack
- **Descripción:** [detalle]
- **Artefacto afectado:** [spec/plan/tasks].md — sección [X]
- **Corrección:** [qué cambiar y dónde]

## Resumen
| Total | ALTA | MEDIA | BAJA |
|---|---|---|---|
| [N] | [N] | [N] | [N] |

## Decisión
- ✅ **Continuar a /speckit.implement** (0 hallazgos ALTA)
- ❌ **Resolver antes de implementar** ([N] hallazgos ALTA pendientes)
```
