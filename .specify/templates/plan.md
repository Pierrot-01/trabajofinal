# /speckit.plan — Template de Plan Técnico
> Fuente: `planticket1.md`, `Plan_LaboratorioE.md`, `Plan_Usuarios1.md`, `Plan_Software.md`, `diseño.md`

---

## Instrucciones para el Agente

Al ejecutar `/speckit.plan`:

1. Lee `.specify/constitution.md` y el `spec.md` aclarado del módulo.
2. Genera `plan.md` respetando SIEMPRE la arquitectura hexagonal de `diseño.md`.
3. **Orden obligatorio de capas en el plan** (nunca invertir):
   ```
   Fase 0: prisma/schema.prisma
   Fase 1: lib/ports/IXxxRepository.ts       ← el contrato PRIMERO
   Fase 2: lib/validators/xxx.validators.ts
   Fase 3: lib/errors/ (si hay nuevos DomainErrors)
   Fase 4: lib/repositories/xxx.repository.ts
   Fase 5: lib/services/xxx.service.ts
   Fase 6: tests/unit/
   Fase 7: app/
   ```
4. Valida el plan contra la Constitution antes de entregarlo (tabla de validación obligatoria).

---

## Stack aplicado (no modificar sin decisión explícita)

| Capa | Tecnología | Notas |
|---|---|---|
| Presentación | Next.js App Router + TypeScript | Server Components para lectura, Server Actions para mutaciones |
| Estilos | Tailwind CSS + shadcn/ui | Mobile-first real |
| BD | PostgreSQL (Supabase) | Singleton en `lib/prisma.ts` |
| ORM | Prisma | `select` explícito siempre, nunca modelo completo |
| Auth | Auth.js v5 — `auth()` en el servidor | `usuarioId` y `rol` nunca vienen del cliente |
| Validación | Zod | `schema.safeParse()` antes de cualquier operación |
| Testing | Vitest + Testing Library | Mocks de `IXxxRepository`, no de Prisma |
| Paquetes | pnpm | `ignore-scripts=true` en `.npmrc` |

---

## Estructura del plan.md a generar

```markdown
# Plan Técnico: [Nombre del Módulo]
**Feature:** [NNN-nombre]
**Basado en:** spec.md (Aclarado)
**Constitution de referencia:** v1.8
**Estado:** Borrador

## 1. Validación contra la Constitution
| Decisión de este plan | Artículo que la rige |
|---|---|
| [decisión de arquitectura] | Art. III |
| Respuestas `{ success, data?, error?, warning? }` | Art. IX |
| Errores de dominio como DomainError, nunca crudo de Prisma | Art. X |
| Lectura vía Server Components, mutación vía Server Actions + revalidatePath | Art. XI |
| Sin estado global nuevo sin justificación | Art. XI |

Si algo contradice la Constitution → el plan se corrige, no la Constitution.

## 2. Modelo de datos (Prisma Schema)

[Solo si hay cambios al schema. Usar los tipos exactos de diseño.md Sección 4:]
- Enums: `Rol`, `EstadoEquipo`, `TipoTicket`, `CategoriaTicket`, `EstadoTicket`, `TipoSoftware`
- Si hay nuevos campos → justificar con qué HU los requiere

```prisma
// Fragmento del schema relevante para este módulo
```

> Si no hay cambios al schema → indicar explícitamente: "No se modifican modelos existentes."

## 3. Arquitectura Hexagonal — Mapa de Capas

### Fase 1 — Puerto: `lib/ports/IXxxRepository.ts`

```typescript
export interface IXxxRepository {
  // Métodos que requieren las HUs del spec
  // Nombres en español siguiendo la convención existente:
  // buscarPorId, listarPaginado, crear, actualizar, eliminar, etc.
}
```

> Este es el CONTRATO. El servicio depende de esta interfaz, no de la implementación.

### Fase 2 — Validadores: `lib/validators/xxx.validators.ts`

```typescript
// Schema Zod para cada operación
// safeParse() — nunca parse() directo en producción
export const CreateXxxSchema = z.object({
  // campos exactos del modelo, con mensajes en español
});
export type CreateXxxInput = z.infer<typeof CreateXxxSchema>;
```

### Fase 3 — Errores: `lib/errors/` (si aplica)

```typescript
// Solo si hay nuevos DomainErrors específicos de este módulo
// Extender la clase DomainError existente
export class XxxNoEncontradoError extends DomainError {
  constructor(id: string) {
    super(`[Mensaje en español claro para el usuario]`);
  }
}
```

### Fase 4 — Repositorio: `lib/repositories/xxx.repository.ts`

```typescript
// Implementa IXxxRepository
// ÚNICO lugar donde se importa @prisma/client o lib/prisma
// Queries con select EXPLÍCITO — nunca findMany() sin select
// Paginación en todo listado que pueda crecer sin límite natural
```

### Fase 5 — Servicio: `lib/services/xxx.service.ts`

```typescript
// Recibe IXxxRepository por inyección de dependencias
// NO importa repositories/ ni @prisma/client
// Aplica las reglas de negocio del spec.md
// Lanza DomainError para errores de dominio
// Devuelve datos simples (no JSX, no Response de Next.js)
```

**Lógica por HU:**
| HU | Método del servicio | Reglas aplicadas |
|---|---|---|
| HU-01 | `xxx.crear()` | BR-XX, EC-XX |
| HU-02 | `xxx.actualizar()` | BR-XX |

### Fase 6 — Tests: `tests/unit/`

| Archivo | Qué prueba | CAs cubiertos |
|---|---|---|
| `xxx.service.test.ts` | Lógica del servicio con mock de IXxxRepository | CA-01, CA-02, EC-01 |
| `xxx.repository.test.ts` | Métodos del repositorio | — |

### Fase 7 — Presentación: `app/`

**Server Actions (`app/.../actions.ts`):**
```typescript
'use server';
export async function crearXxx(rawData: unknown) {
  // 1. Obtener sesión del servidor (auth()) — nunca del cliente
  const session = await auth();
  if (!session) return fail('No autorizado');

  // 2. Validar con Zod
  const result = CreateXxxSchema.safeParse(rawData);
  if (!result.success) return fail(result.error.issues[0].message);

  // 3. Llamar al servicio (nunca al repositorio directamente)
  const repo = new XxxRepository();
  const service = new XxxService(repo);
  try {
    const data = await service.crear(result.data);
    return ok(data);
  } catch (error) {
    if (error instanceof DomainError) return fail(error.message);
    logger.error('Error inesperado en crearXxx', error);
    return fail('Ocurrió un error, intenta nuevamente');
  }
}
```

**Páginas (`app/.../page.tsx`):**
- Server Component para lectura de datos (sin useEffect+fetch)
- Client Component solo para interactividad local (modales, formularios)
- Después de mutación: `revalidatePath('/ruta')`

## 4. Decisiones técnicas
| Decisión | Justificación | Alternativa descartada |
|---|---|---|
| [decisión específica] | [por qué] | [qué se descartó y por qué] |

## 5. Riesgos identificados
| Riesgo | Mitigación |
|---|---|
| [riesgo] | [cómo se mitiga] |
```

---

## Referencia — Planes existentes en `.agents/`

| Módulo | Archivo |
|---|---|
| 001 Tickets | `planticket1.md` + `planticket2.md` |
| 002 Usuarios | `Plan_Usuarios1.md` |
| 003 Laboratorios y Equipos | `Plan_LaboratorioE.md` |
| 004 Software | `Plan_Software.md` |

> Para extender un módulo existente, leer primero el plan original antes de agregar al `plan.md`.
