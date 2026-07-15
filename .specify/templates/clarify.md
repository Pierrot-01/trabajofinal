# /speckit.clarify — Template de Clarificación
> Fuente: secciones "Clarifications" de `spec_tickets1.md`, `Speck_LaboratoriosE.md`, `Speck_Usuarios1 copy.md`

---

## Instrucciones para el Agente

Al ejecutar `/speckit.clarify`:

1. Lee el `spec.md` del módulo en contexto y `.specify/constitution.md`.
2. Detecta ambigüedades usando las categorías de abajo.
3. **Regla del Artículo XIII:** Si hay ambigüedad en el modelo de datos, en una dependencia o en un requerimiento no cubierto por la Constitution → **detente y pregunta**. Nunca inventes campos, entidades o flujos nuevos.
4. Usa las decisiones ya tomadas en módulos existentes como referencia de criterio.

---

## Decisiones ya tomadas en EpisLab (precedentes a respetar)

Estas son las clarificaciones que ya se resolvieron en módulos anteriores. Al analizar un spec nuevo, verificar que no contradigan estas:

| Módulo | Decisión | Criterio |
|---|---|---|
| Tickets | Estado equipo cambia **automáticamente** al resolver incidencia hardware (misma transacción) | Menor carga para el técnico, consistencia garantizada |
| Tickets | Prioridad calculada **al vuelo** en el service, nunca guardada en BD | Cero infraestructura adicional, siempre exacta |
| Tickets | Técnicos ven tickets de **cualquier** laboratorio (sin restricción por lab) | Evita capa de permisos innecesaria |
| Tickets | Software en texto libre **no** se agrega al catálogo automáticamente | Evita duplicados sin revisión admin |
| Tickets | Solo el **admin** reasigna ticket ya tomado por técnico | Trazabilidad del cambio de responsable |
| Tickets | Tanto el técnico/admin como el **usuario que reportó** pueden comentar | Trazabilidad real del caso |
| Tickets | Resolver Solicitud de software → crea/actualiza `EquipoSoftware` automáticamente | Simetría con la automatización de hardware |
| Tickets | `ticketRelacionadoId` lo elige el **usuario manualmente** al crear | Evita falsos positivos de matching automático |
| Usuarios | No se puede **eliminar** usuarios — solo `activo: false` | Historial de tickets nunca se rompe |
| Usuarios | Bloqueo **15 min** tras 5 intentos fallidos | Seguridad OWASP |
| Laboratorios | No se puede **eliminar** equipo — solo `dado_de_baja` | Historial de tickets se conserva |
| Laboratorios | `dado_de_baja` ≠ `inoperativo` — es retiro administrativo permanente | Evita confusión en panel del técnico |
| Laboratorios | `codigoInventario` es texto libre único (sin formato regex) | La UNSCH ya tiene su codificación propia |
| Laboratorios | Dar de baja equipo con tickets abiertos → **DomainError** (bloquea) | Integridad del historial |
| Laboratorios | Editar equipo con tickets abiertos → **warning** (no bloquea) | Diferencia de impacto real |
| Software | Solo admin puede eliminar software, y solo si no tiene relaciones en `EquipoSoftware` ni tickets | BR-10 |

---

## Categorías de ambigüedad a detectar

### 1. Reglas de negocio
- ❓ ¿La acción bloquea (DomainError) o solo advierte (warning)?
- ❓ ¿El efecto es automático (misma transacción) o requiere paso manual?
- ❓ ¿Hay casos donde la regla no aplica?

### 2. Actores y permisos
- ❓ ¿Qué rol puede hacer exactamente qué? ¿Solo admin, o también técnico?
- ❓ ¿El usuario puede ver datos de otros usuarios/tickets?

### 3. Estados y transiciones
- ❓ ¿Todos los estados posibles están cubiertos en el spec?
- ❓ ¿El ciclo `pendiente → en_proceso → resuelto` aplica aquí? ¿Sin retroceso?

### 4. Entidades y campos
- ❓ ¿Coinciden los nombres de entidades con el Artículo VII de la Constitution?
- ❓ ¿Hay campos que faltan o que contradicen el modelo de datos?

### 5. Coherencia con módulos existentes
- ❓ ¿Esta nueva HU afecta a Tickets, Equipos, Software? ¿Cómo?
- ❓ ¿La automatización propuesta choca con alguna decisión de la tabla de arriba?

---

## Estructura del reporte de clarificación

```markdown
# Clarify: [Nombre del Módulo]
**Fecha:** [fecha]
**Spec base:** spec.md — Draft
**Constitution de referencia:** v1.8

## Preguntas de clarificación

| # | Pregunta | Opciones | Impacto |
|---|---|---|---|
| 1 | [pregunta concreta] | A) ... B) ... | [qué cambia en el spec/plan según la respuesta] |

## Regla general
[Describir el principio de decisión usado — igual que en los módulos anteriores]

## Actualizaciones al spec.md resultado de este Clarify
- Sección X modificada: [cambio]
- Nueva regla BR-XX agregada: [regla]
- Edge Case EC-XX agregado: [caso]

## Estado post-clarify
**Spec:** Aclarado — Listo para /speckit.plan
```
