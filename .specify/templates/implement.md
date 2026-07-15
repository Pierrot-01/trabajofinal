# /speckit.implement — Template de Implementación
> Fuente: patrones reales de `lib/services/`, `lib/repositories/`, `lib/ports/`, `app/` de EpisLab

---

## Instrucciones para el Agente

Al ejecutar `/speckit.implement`:

1. Lee `.specify/constitution.md`, el `spec.md`, `plan.md`, `tasks.md` del módulo.
2. Verifica que `analyze.md` no tiene hallazgos ALTA pendientes.
3. Ejecuta tareas en orden estricto de capas (Fase 0 → 7). Nunca al revés.
4. Marca `[x]` en `tasks.md` por cada tarea completada.
5. Verifica `pnpm tsc --noEmit` sin errores antes de pasar a la siguiente tarea.
6. **Artículo XIII:** si encuentras ambigüedad no cubierta en el spec/plan → detente y pide clarificación.

---

## Patrones reales del proyecto (copiar, no reinventar)

### Puerto — `lib/ports/IXxxRepository.ts`

```typescript
// ✅ Patrón real de IUsuarioRepository.ts / ITicketRepository.ts
// Solo interfaz TypeScript pura — sin implementación

export interface IXxxRepository {
  buscarPorId(id: string): Promise<XxxBase | null>;
  listarPaginado(params: { cursor?: string; take: number }): Promise<{
    items: XxxPaginado[];
    nextCursor: string | null;
  }>;
  crear(data: CreateXxxData): Promise<XxxBase>;
  actualizar(id: string, data: Partial<UpdateXxxData>): Promise<XxxBase>;
}

// ❌ INCORRECTO — nunca importar Prisma en ports/
import { PrismaClient } from '@prisma/client'; // PROHIBIDO
```

### Validadores — `lib/validators/xxx.validators.ts`

```typescript
// ✅ Patrón real de usuario.validators.ts / ticket.validators.ts
import { z } from 'zod';

export const CreateXxxSchema = z.object({
  campo: z.string().min(1, 'Campo requerido'),
  // Mensajes de error en español, claros para el usuario
});
export type CreateXxxInput = z.infer<typeof CreateXxxSchema>;

// ❌ INCORRECTO — validar manualmente sin Zod
if (!data.campo) throw new Error('...'); // Incumple Art. IV
```

### Errores — `lib/errors/`

```typescript
// ✅ Patrón real de domain-error.ts
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

// Subclases específicas si el módulo las necesita:
export class XxxNoEncontradoError extends DomainError {
  constructor(id: string) {
    super(`No se encontró el recurso con id: ${id}`);
  }
}

// ❌ INCORRECTO — lanzar error de Prisma al cliente
throw new Error(prismaError.message); // Expone detalle interno
```

### Repositorio — `lib/repositories/xxx.repository.ts`

```typescript
// ✅ Patrón real de usuario.repository.ts / ticket.repository.ts
import { prisma } from '@/lib/prisma'; // Singleton — nunca new PrismaClient()
import type { IXxxRepository } from '@/lib/ports/IXxxRepository';

export class XxxRepository implements IXxxRepository {
  async buscarPorId(id: string): Promise<XxxBase | null> {
    return await prisma.xxx.findUnique({
      where: { id },
      select: { id: true, nombre: true, /* solo campos necesarios */ }, // Art. XIV
    });
  }

  async listarPaginado({ cursor, take }: { cursor?: string; take: number }) {
    const items = await prisma.xxx.findMany({
      take: take + 1, // cursor-based pagination (patrón del proyecto)
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, /* campos */ },
      orderBy: { createdAt: 'desc' },
    });
    const hasMore = items.length > take;
    return {
      items: hasMore ? items.slice(0, -1) : items,
      nextCursor: hasMore ? items[items.length - 2].id : null,
    };
  }
}

// ❌ INCORRECTO — no implementar la interfaz del puerto
export class XxxRepository { /* Sin 'implements IXxxRepository' */ }

// ❌ INCORRECTO — traer modelo completo
await prisma.xxx.findMany(); // Sin select = viola Art. XIV
```

### Servicio — `lib/services/xxx.service.ts`

```typescript
// ✅ Patrón real de usuario.service.ts / ticket.service.ts
import type { IXxxRepository } from '@/lib/ports/IXxxRepository';
import { DomainError } from '@/lib/errors';
import { CreateXxxSchema, type CreateXxxInput } from '@/lib/validators/xxx.validators';

export class XxxService {
  constructor(private readonly repo: IXxxRepository) {}

  async crear(input: CreateXxxInput): Promise<XxxBase> {
    // Validaciones de dominio (reglas de negocio del spec)
    const existente = await this.repo.buscarPorCampoUnico(input.campo);
    if (existente) throw new DomainError('Este [campo] ya existe.');

    return await this.repo.crear(input);
  }

  // Para casos con warning (BR-01 style):
  async crearConWarning(input: CreateXxxInput): Promise<{ data: XxxBase; warning?: string }> {
    const abiertos = await this.repo.buscarAbiertos(input.relacionId);
    const warning = abiertos.length > 0
      ? 'Ya existe un registro abierto para este elemento'
      : undefined;
    const data = await this.repo.crear(input);
    return { data, warning };
  }
}

// ❌ INCORRECTO — importar el repositorio concreto
import { XxxRepository } from '@/lib/repositories/xxx.repository'; // PROHIBIDO en services/

// ❌ INCORRECTO — importar Prisma
import { prisma } from '@/lib/prisma'; // PROHIBIDO en services/
```

### Tests — `tests/unit/xxx.service.test.ts`

```typescript
// ✅ Patrón real de ticket.service.test.ts / usuario.service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { XxxService } from '@/lib/services/xxx.service';
import type { IXxxRepository } from '@/lib/ports/IXxxRepository';
import { DomainError } from '@/lib/errors';

// Mock de la INTERFAZ, no del repositorio concreto
const makeMockRepo = (overrides = {}): IXxxRepository => ({
  buscarPorId: vi.fn().mockResolvedValue(null),
  crear: vi.fn().mockResolvedValue({ id: 'test-id', /* campos base */ }),
  listarPaginado: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
  actualizar: vi.fn(),
  ...overrides,
});

describe('XxxService', () => {
  describe('crear', () => {
    it('crea exitosamente cuando los datos son válidos', async () => {
      const repo = makeMockRepo();
      const service = new XxxService(repo);
      const result = await service.crear({ /* input válido del spec */ });
      expect(result).toBeDefined();
      expect(repo.crear).toHaveBeenCalledOnce();
    });

    it('lanza DomainError cuando [condición del spec EC-XX]', async () => {
      const repo = makeMockRepo({
        buscarPorCampoUnico: vi.fn().mockResolvedValue({ id: 'existente' }),
      });
      const service = new XxxService(repo);
      await expect(service.crear({ /* input */ })).rejects.toThrow(DomainError);
    });

    // Para casos de warning (BR-01 style):
    it('retorna warning cuando ya existe un registro abierto (BR-01)', async () => {
      const repo = makeMockRepo({
        buscarAbiertos: vi.fn().mockResolvedValue([{ id: 'abierto' }]),
      });
      const service = new XxxService(repo);
      const result = await service.crearConWarning({ /* input */ });
      expect(result.warning).toBeDefined();
      expect(result.data).toBeDefined(); // La operación SÍ se completa
    });
  });
});

// ❌ INCORRECTO — mockear Prisma directamente
vi.mock('@prisma/client'); // Acopla el test a la implementación
```

### Server Action — `app/[ruta]/actions.ts`

```typescript
// ✅ Patrón real de app/tickets/actions.ts / app/admin/usuarios/actions.ts
'use server';

import { auth } from '@/lib/auth';
import { ok, fail } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { DomainError } from '@/lib/errors';
import { CreateXxxSchema } from '@/lib/validators/xxx.validators';
import { XxxRepository } from '@/lib/repositories/xxx.repository';
import { XxxService } from '@/lib/services/xxx.service';
import { revalidatePath } from 'next/cache';

export async function crearXxx(rawData: unknown) {
  // 1. Sesión del servidor — NUNCA del cliente
  const session = await auth();
  if (!session?.user?.id) return fail('No autorizado');

  // 2. Control de rol (si aplica)
  if (session.user.rol !== 'admin') return fail('Sin permisos');

  // 3. Validar con Zod
  const result = CreateXxxSchema.safeParse(rawData);
  if (!result.success) return fail(result.error.issues[0].message);

  // 4. Llamar al servicio — NUNCA al repositorio directamente
  try {
    const repo = new XxxRepository();
    const service = new XxxService(repo);
    const data = await service.crear(result.data);
    revalidatePath('/ruta-de-la-pagina');
    return ok(data);
  } catch (error) {
    if (error instanceof DomainError) return fail(error.message);
    logger.error('Error inesperado en crearXxx', { error });
    return fail('Ocurrió un error, intenta nuevamente');
  }
}

// Para casos con warning:
export async function crearXxxConWarning(rawData: unknown) {
  // ... misma estructura ...
  const { data, warning } = await service.crearConWarning(result.data);
  revalidatePath('/ruta');
  return ok(data, warning); // warning puede ser undefined — está bien
}

// ❌ INCORRECTO — recibir userId del cliente
export async function crearXxx(rawData: unknown, userId: string) // PROHIBIDO

// ❌ INCORRECTO — llamar al repositorio directamente
const repo = new XxxRepository();
await repo.crear(data); // Saltea el servicio = sin reglas de negocio
```

---

## Checklist Final de Implementación

- [ ] `pnpm tsc --noEmit` → 0 errores
- [ ] `pnpm test:run` → verde, cobertura ≥90% en el service
- [ ] `pnpm lint` → 0 errores
- [ ] Ningún `service` importa `repositories/` o `@prisma/client`
- [ ] Ningún componente de `app/` usa `prisma` directamente ni importa `repositories/`
- [ ] Toda Server Action devuelve `{ success, data?, error?, warning? }`
- [ ] Errores de Prisma nunca llegan al cliente como mensaje
- [ ] Todos los CAs del spec tienen su test en Fase 6
- [ ] `tasks.md` — todas las tareas en `[x]`
- [ ] `revalidatePath()` llamado después de cada mutación
