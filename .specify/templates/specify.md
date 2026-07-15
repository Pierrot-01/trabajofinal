# /speckit.specify — Template de Especificación de Feature
> Fuente: estructura de `spec_tickets1.md`, `Speck_LaboratoriosE.md`, `Speck_Usuarios1 copy.md`, `spec_Software.md`

---

## Instrucciones para el Agente

Al ejecutar `/speckit.specify [descripción]`:

1. Lee `.specify/constitution.md` — especialmente el Artículo VII (entidades reales) y los módulos existentes.
2. Genera un `spec.md` para el nuevo módulo o feature usando la estructura siguiente.
3. Respeta siempre los nombres exactos del dominio: `Ticket`, `Equipo`, `Laboratorio`, `Usuario`, `Software`, `EquipoSoftware`, `Comentario`.
4. Los actores son solo: `admin | tecnico | docente | estudiante`.
5. El ciclo de vida de tickets es SIEMPRE: `pendiente → en_proceso → resuelto` (sin retroceso).
6. La prioridad **nunca** es campo de BD — se calcula al vuelo.
7. **No mencionar tecnología todavía.** El "cómo" viene en `/speckit.plan`.
8. Si hay ambigüedad detectable, NO la inventes — escríbela en la sección "Clarifications pendientes".

---

## Reglas de negocio que siempre aplican (copiar en el spec según contexto)

| ID | Regla | Respuesta |
|---|---|---|
| BR-01 | Equipo con ticket abierto al crear uno nuevo: advierte, no bloquea | `warning` (no `success: false`) |
| BR-02 | Incidencia hardware resuelta: `Equipo.estado = operativo` (automático, misma transacción) | Efecto auto |
| BR-03 | Solicitud software resuelta: crea/actualiza `EquipoSoftware` (automático) | Efecto auto |
| BR-04 | Ticket resuelto no puede volver a pendiente | DomainError |
| BR-05 | Solo admin reasigna ticket ya tomado por técnico | Control rol |
| BR-06 | Último admin activo no puede desactivarse ni degradarse | DomainError |
| BR-07 | Contraseña temporal debe cambiarse en el primer login | Flujo forzado |
| BR-08 | Equipo `dado_de_baja` no aparece en selector de nuevos tickets | Filtro datos |
| BR-09 | No se puede dar de baja equipo con tickets `pendiente`/`en_proceso` | DomainError |
| BR-10 | No se puede eliminar software en uso (`EquipoSoftware` o ticket) | DomainError |
| BR-11 | Texto libre en ticket no agrega al catálogo automáticamente | Control rol |

---

## Estructura del spec.md a generar

```markdown
# Spec: [Nombre del Módulo]
**Feature:** [NNN-nombre]
**Estado:** Draft → Aclarado → Listo para Plan
**Constitution de referencia:** v1.8
**Fecha:** [fecha]

## 0. Clarifications (llenar en /speckit.clarify)
| # | Pregunta | Decisión | Criterio aplicado |
|---|---|---|---|
| 1 | [pregunta detectada] | Pendiente | — |

## 1. Resumen (qué y por qué)
[Problema que resuelve dentro del sistema EpisLab. Conectar con los objetivos del Artículo I.]

## 2. Actores
| Actor | Rol en este módulo |
|---|---|
| admin | [qué puede hacer] |
| tecnico | [qué puede hacer o N/A] |
| docente | [qué puede hacer o N/A] |
| estudiante | [qué puede hacer o N/A] |

> Solo el admin crea cuentas. Solo correos @unsch.edu.pe. Sin auto-registro público.

## 3. Historias de Usuario

### HU-01 — [Título]
**Como** [actor],
**quiero** [acción concreta],
**para** [beneficio real en el contexto EPIS-UNSCH].

**Criterios de aceptación:**
1. [CA verificable — concreto, medible]
2. [Si genera advertencia no bloqueante → respuesta `{ success: true, data: {...}, warning: "..." }`]
3. [Si es DomainError → `{ success: false, error: "mensaje seguro" }`]

### HU-02 — ...

## 4. Reglas de Negocio aplicables
[Copiar las BR-XX que aplican de la tabla de arriba + reglas nuevas específicas de este módulo]

## 5. Casos Borde / Edge Cases
| # | Caso | Comportamiento esperado |
|---|---|---|
| EC-01 | [situación límite] | [DomainError / warning / comportamiento específico] |

## 6. Entidades afectadas
[Listar entidades del Artículo VII que se leen/escriben en este módulo]
- `Xxx` → lee/escribe (referencia a `lib/ports/IXxxRepository.ts`)

## 7. Fuera de alcance
- [qué NO forma parte de este módulo — explícito para que el agente no lo implemente]

## 8. Criterios de aceptación del sistema (del analisis.md)
[Copiar los criterios globales que este módulo debe cumplir]
1. Ningún usuario accede a funciones fuera de su rol, ni manipulando la URL.
5. Ningún error interno de Prisma/PostgreSQL se expone al cliente.
```

---

## Referencia de módulos existentes (ya implementados)

| Módulo | Spec en `.agents/` | Estado |
|---|---|---|
| 001 Tickets | `spec_tickets1.md` + `spec_tickets2.md` | ✅ Implementado |
| 002 Usuarios | `Speck_Usuarios1 copy.md` | ✅ Implementado |
| 003 Laboratorios y Equipos | `Speck_LaboratoriosE.md` | ✅ Implementado |
| 004 Software | `spec_Software.md` | ✅ Implementado |

> Para un **nuevo módulo** (005+), seguir la estructura de arriba desde cero.
> Para **extender uno existente**, leer el spec original en `.agents/rules/programacion/` antes de agregar HUs.
