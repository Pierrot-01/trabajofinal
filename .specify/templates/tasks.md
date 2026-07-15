# /speckit.tasks — Template de Lista de Tareas
> Fuente: `task_tickets1.md`, `task_tickets2.md`, `Task_LaboratoriosE.md`, `Task_Usuario.md`, `Task_Software.md`

---

## Instrucciones para el Agente

Al ejecutar `/speckit.tasks`:

1. Lee `.specify/constitution.md` y el `plan.md` del módulo.
2. Genera `tasks.md` con tareas en el orden estricto de capas (nunca invertir).
3. Cada tarea es atómica — un solo archivo o cambio cohesivo.
4. Usa el patrón de nomenclatura real del proyecto: `T001`, `T002`, etc. con checkpoints por fase.
5. Marca `[P]` en tareas que pueden ejecutarse en paralelo con la anterior.
6. **Artículo XIII:** ninguna tarea puede inventar campos o flujos no cubiertos en el spec/plan.

---

## Patrón de tareas por fase (basado en task_tickets1.md)

```markdown
# Tasks: [Nombre del Módulo]
**Feature:** [NNN-nombre]
**Basado en:** plan.md
**Constitution de referencia:** v1.8
**Regla de ejecución:** cada tarea se implementa y valida antes de pasar a la siguiente (Art. VIII punto 3).
[P] = puede hacerse en paralelo con la tarea anterior si no comparte archivo.

---

## Fase 0 — Modelo de Datos (Prisma)
[Solo si hay cambios al schema]

- [ ] **T001** — [Agregar/modificar] modelo `[Entidad]` en `prisma/schema.prisma`
  - Criterio: `pnpm prisma generate` sin errores; migración aplicada
  - Índices: agregar `@@index` en campos usados como filtros frecuentes (Art. XIV)
  - ⚠️ Si no hay cambios al schema → esta fase se omite

**Checkpoint 0:** BD migrada. `pnpm prisma studio` muestra los modelos correctos.

---

## Fase 1 — Puerto / Contrato
- [ ] **T002** — Crear `lib/ports/IXxxRepository.ts`
  - Criterio: TypeScript compila sin errores; todos los métodos del plan declarados
  - Convención de nombres: español (`buscarPorId`, `listarPaginado`, `crear`, `actualizar`)
  - ⚠️ El servicio depende de ESTA interfaz, no del repositorio concreto

**Checkpoint 1:** el contrato existe. Ahora services/ puede programarse contra él.

---

## Fase 2 — Validadores
- [ ] **T003 [P]** — Crear `lib/validators/xxx.validators.ts`
  - Schema: [listar campos con sus restricciones Zod según spec]
  - Criterio: schema rechaza inputs inválidos; acepta el caso feliz del spec
  - Usar `safeParse()` — nunca `parse()` directo en producción

---

## Fase 3 — Errores de Dominio (si aplica)
- [ ] **T004 [P]** — Agregar `XxxError extends DomainError` en `lib/errors/`
  - Solo si el plan define nuevos DomainErrors específicos de este módulo
  - Mensajes en español, claros para el usuario final
  - ⚠️ Si no hay nuevos DomainErrors → esta fase se omite

---

## Fase 4 — Repositorio (Adaptador de Salida)
- [ ] **T005** — Crear `lib/repositories/xxx.repository.ts`
  - Implementa `IXxxRepository` (`implements IXxxRepository` obligatorio en la clase)
  - Importa de `lib/prisma` (singleton), nunca `new PrismaClient()`
  - Queries con `select` explícito — nunca modelo completo (Art. XIV)
  - Paginación en todo listado potencialmente grande (cursor-based como el patrón existente)
  - ⚠️ ÚNICO lugar donde se importa `@prisma/client`

---

## Fase 5 — Servicio (Núcleo de Dominio)
[Una tarea por HU del spec, siguiendo el patrón de ticket.service.ts / usuario.service.ts]

- [ ] **T006** — Implementar `[funcion]()` en `lib/services/xxx.service.ts` (HU-01)
  - Recibe `IXxxRepository` por constructor (inyección de dependencias)
  - NO importa `repositories/` ni `@prisma/client`
  - Aplica: [listar BR y EC del spec que esta función implementa]
  - Criterio: pruebas de Fase 6 pasan en verde

- [ ] **T007** — Implementar `[funcion]()` en `lib/services/xxx.service.ts` (HU-02)
  - [misma estructura]

---

## Fase 6 — Tests Unitarios
[Patrón: prueba → implementación → verde. Como en task_tickets1.md Fase C]

- [ ] **T008** — Prueba unitaria de `xxx.service.[funcion]()` — caso de éxito
  - Mock: `const mockRepo: IXxxRepository = { [metodo]: vi.fn().mockResolvedValue([...]) }`
  - Criterio: `pnpm test:run` verde; mock del puerto, nunca de Prisma

- [ ] **T009** — Prueba unitaria de `xxx.service.[funcion]()` — DomainError (EC-01)
  - Criterio: el error correcto se lanza con el mensaje esperado

- [ ] **T010** — Prueba unitaria de `xxx.service.[funcion]()` — warning (BR-01 si aplica)
  - Criterio: retorna `{ success: true, warning: "..." }`, nunca `success: false`

- [ ] **T011 [P]** — Prueba del repositorio `xxx.repository.ts`
  - Archivo: `tests/unit/xxx.repository.test.ts`

**Checkpoint 6:** `pnpm test:run` pasa todo el módulo. Cobertura ≥90% en el service.

---

## Fase 7 — Presentación
[Patrón de app/ del proyecto: Server Components + Server Actions]

- [ ] **T012** — Crear Server Action `[accion]` en `app/[ruta]/actions.ts`
  - Flujo obligatorio: `auth()` → `safeParse()` → `service` → `ok()/fail()`
  - ⚠️ Nunca recibir `usuarioId`/`rol` del cliente
  - ⚠️ Nunca llamar al repositorio directamente desde la action

- [ ] **T013** — Crear `app/[ruta]/page.tsx` (Server Component)
  - Lectura de datos: async Server Component, llama al service directamente
  - Después de mutación: `revalidatePath('/ruta')`
  - Feedback inmediato al usuario (número de ticket, estado, etc. — Art. VI)

- [ ] **T014 [P]** — Crear Client Component `app/components/[Nombre].tsx` (si se necesita interactividad local)
  - Solo para UI local (modales, formularios con estado de carga)
  - Sin lógica de negocio — delega todo a Server Actions

**Checkpoint Final:** feature completa de UI a base de datos, con pruebas en verde.

---

## Checklist de Coherencia (antes de marcar fase como completa)

- [ ] Ninguna tarea de `services/` importa `repositories/` o `@prisma/client`
- [ ] Ninguna tarea de `app/` llama a repositorios o usa `prisma` directamente
- [ ] Cada tarea nueva en `repositories/` tiene su contrato previo en `ports/`
- [ ] Los tests cubren: caso exitoso + DomainErrors + warnings (si BR-01 aplica)
- [ ] Toda Server Action devuelve `{ success, data?, error?, warning? }` (Art. IX)
- [ ] `pnpm tsc --noEmit` → 0 errores
- [ ] `pnpm test:run` → verde
- [ ] `pnpm lint` → 0 errores
```

---

## Referencia — Tasks existentes en `.agents/`

| Módulo | Archivo |
|---|---|
| 001 Tickets | `task_tickets1.md` + `task_tickets2.md` |
| 002 Usuarios | `Task_Usuario.md` |
| 003 Laboratorios y Equipos | `Task_LaboratoriosE.md` |
| 004 Software | `Task_Software.md` |
