---
trigger: always_on
---

## Fase H — Historia de Usuario 6: Historial y trazabilidad (HU-06) — Prioridad P3

- [ ] **T051** — Prueba unitaria: cálculo de tiempo promedio de resolución por categoría, usando el histórico del seed (T013).
- [ ] **T052** — Prueba unitaria: reporte "equipos con más de N tickets en últimos M meses" con N/M como parámetros (Clarify #9) — casos positivo y negativo.
- [ ] **T053** — Implementar ambas funciones en `ticket.service.ts` (o un `reporte.service.ts` separado si crece demasiado) hasta que T051–T052 pasen.
- [ ] **T054** — Implementar `app/laboratorios/[id]/historial/page.tsx` (o ruta equivalente), solo accesible a `admin`. *(Aplica paginación por cursor si el historial supera un umbral razonable de tickets — Art. XIV, punto 2.)*

**Checkpoint H:** el admin tiene evidencia cuantitativa para justificar renovación de equipos — este es el insumo directo para el Capítulo IV del documento.

---

## Fase I — Historia de Usuario 7: Comentarios (HU-07) y recurrencia (Edge case 3) — Prioridad P2

- [ ] **T055 [P]** — Prueba unitaria: agregar comentario en ticket `pendiente`/`en_proceso` → éxito.
- [ ] **T056 [P]** — Prueba unitaria: intentar comentar un ticket `resuelto` → `DomainError`.
- [ ] **T057** — Implementar `ticket.service.agregarComentario()` hasta que T055–T056 pasen.
- [ ] **T057b [P]** — *(brecha detectada: HU-07/Edge case 3 nunca tuvo prueba a nivel de service, solo se planeó la UI)* Prueba unitaria: crear ticket con `ticketRelacionadoId` apuntando a un ticket `resuelto` del mismo equipo → se guarda correctamente.
- [ ] **T057c [P]** — Prueba unitaria: crear ticket con `ticketRelacionadoId` apuntando a un ticket que **no** está `resuelto`, o que pertenece a otro equipo, o que no existe → `DomainError` (evita vínculos inconsistentes que la UI no debería permitir pero el `service` igual debe blindar).
- [ ] **T057d** — Extender `ticket.service.crear()` para validar T057b–T057c antes de guardar `ticketRelacionadoId`.
- [ ] **T058** — Server Action `agregarComentario` + UI de comentarios en `app/tickets/[id]/page.tsx`.
- [ ] **T059** — Implementar selector de "ticket relacionado" en `nuevo/page.tsx`: al elegir un equipo con tickets `resuelto` previos, mostrar la lista para vínculo manual opcional (Clarify #8; consume la validación de T057d).

**Checkpoint I:** trazabilidad conversacional y de recurrencia completas.

---

## Fase J — Seguridad transversal (aplica sobre todo lo anterior, no es una historia nueva)

- [ ] **T060** — Middleware de Next.js: bloquear rutas `/tickets` (gestión) y `/laboratorios/*/historial` a roles no autorizados a nivel de ruta, además de la validación ya existente en `service` (defensa en profundidad, Art. IV).
- [ ] **T061** — Rate limiting básico en login (Art. IV, punto 6).
- [ ] **T062** — `pnpm audit` y revisión de `package-lock.json` antes de cierre de sprint (Art. IV, punto 5).
- [ ] **T063** — Revisar que ningún `logger.error` de los `catch` (T020, T035, T039, etc.) llegó a exponerse en una respuesta `fail()` con detalle de Prisma/MySQL, y que ninguna Server Action quedó usando `console.error` plano en vez del logger de T009b — auditoría manual cruzando código contra Art. X.
- [ ] **T064** — *(brecha detectada: faltaba un cierre formal antes de Analyze)* Correr `pnpm test` (suite completa de Vitest) y confirmar que **todas** las tareas de prueba (T016–T018, T025–T026, T029–T030, T032–T034, T036–T038, T042–T044, T051–T052, T055–T056, T057b–T057c) están en verde antes de dar por cerrada la Fase 5 y avanzar a Analyze.

---

## Resumen de dependencias (orden real de ejecución)

```
Fase A (Setup)
   ↓
Fase B (Fundacional — bloquea todo)
   ↓
Fase C (HU-01: crear incidencia) ──┬── Fase D (HU-02: crear solicitud, reusa formulario de C)
   ↓                               │
Fase E (HU-03/04: gestión) ←───────┘
   ↓
Fase F (efectos automáticos al resolver — depende de E)
   ↓
Fase G (HU-05: vista docente — depende de F)
   ↓
Fase H (HU-06: historial — depende del seed de B y de datos reales de C-G)
   ↓
Fase I (HU-07: comentarios y recurrencia — puede ir en paralelo con G/H, depende solo de C)
   ↓
Fase J (seguridad transversal — se revisa al final, pero T060 puede iniciarse desde que existe Fase C)
```

**Regla de parada (Art. XIII, aplicada a esta fase):** si al ejecutar cualquier tarea el agente de IA encuentra un caso no cubierto por `spec.md` o `plan.md`, se detiene y reporta la ambigüedad — no continúa generando código sobre una suposición.
