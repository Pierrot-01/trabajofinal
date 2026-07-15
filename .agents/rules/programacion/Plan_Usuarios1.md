---
trigger: always_on
---

# Plan Técnico: Módulo de Usuarios y Autenticación
 
**Feature:** 002-usuarios
**Basado en:** `specs/002-usuarios/spec.md`
**Constitution de referencia:** v1.6
**Estado:** Borrador
 
---
 
## 1. Modelo de datos (extiende el schema de `001-tickets`)
 
```prisma
model Usuario {
  id                String   @id @default(cuid())
  nombre            String
  correo            String   @unique
  passwordHash      String
  rol               Rol
  activo            Boolean  @default(true)
  createdAt         DateTime @default(now())
 
  ticketsReportados Ticket[]        @relation("TicketsReportados")
  ticketsAsignados  Ticket[]        @relation("TicketsAsignados")
  comentarios       Comentario[]
  resetTokens       PasswordResetToken[]
}
 
model PasswordResetToken {
  id         String   @id @default(cuid())
  usuarioId  String
  usuario    Usuario  @relation(fields: [usuarioId], references: [id])
  tokenHash  String   @unique
  expiraEn   DateTime
  usado      Boolean  @default(false)
  createdAt  DateTime @default(now())
 
  @@index([usuarioId])
}
```
 
---
 
## 2. Estructura de carpetas
 
```
app/
  login/page.tsx                    → formulario de login (Client Component)
  admin/usuarios/
    page.tsx                          → lista paginada + crear/editar/desactivar (solo admin)
    actions.ts                          → Server Actions: crearUsuario, cambiarRol, desactivarUsuario
  cuenta/
    page.tsx                          → cambiar contraseña propia
    actions.ts                          → cambiarPassword
  recuperar-password/
    page.tsx                          → solicitar enlace
    [token]/page.tsx                    → formulario de nueva contraseña
    actions.ts                          → solicitarRecuperacion, resetearPassword
 
lib/
  services/
    usuario.service.ts                  → reglas de dominio (Clarify #4, hashing, validación institucional)
  repositories/
    usuario.repository.ts                 → queries Prisma
  validators/
    usuario.validators.ts                   → crearUsuarioSchema, cambiarPasswordSchema, correoInstitucionalSchema
  auth.ts                                    → configuración de Auth.js (credentials provider)
```
 
---
 
## 3. Validación de correo institucional (Zod)
 
```ts
// lib/validators/usuario.validators.ts
export const correoInstitucionalSchema = z
  .string()
  .email()
  .refine((c) => c.endsWith("@unsch.edu.pe"), {
    message: "Debe usar un correo institucional (@unsch.edu.pe)",
  });
```
 
---
 
## 4. Regla de "al menos un admin activo" (Clarify #4)
 
```ts
// lib/services/usuario.service.ts
async function validarNoUltimoAdmin(usuarioId: string) {
  const usuario = await usuarioRepository.buscarPorId(usuarioId);
  if (usuario.rol !== "admin") return; // no aplica
 
  const adminsActivos = await usuarioRepository.contarAdminsActivos();
  if (adminsActivos <= 1) {
    throw new DomainError("Debe existir al menos un administrador activo.");
  }
}
```
Se invoca antes de desactivar o cambiar el rol de cualquier usuario cuyo rol actual sea `admin`.
 
---
 
## 5. Recuperación de contraseña — manejo seguro del token
 
1. Se genera un token aleatorio (`crypto.randomBytes(32).toString("hex")`).
2. Se guarda en `PasswordResetToken.tokenHash` **hasheado con bcrypt**, igual que una contraseña — nunca el token en texto plano en la base de datos.
3. El enlace enviado por correo contiene el token en texto plano (es la única vez que existe así, y solo en el correo del usuario, nunca en logs del servidor — Art. X).
4. Al usarlo, se compara con `bcrypt.compare()` contra todos los tokens no usados y no expirados del usuario (no se puede indexar un hash bcrypt para búsqueda directa, así que se filtra primero por `usuarioId` si el flujo lo permite, o se usa un token no-hasheado pero de un solo uso y vida corta si el volumen de comparación es un problema — decisión técnica menor a resolver en Tasks si hace falta optimizar).
---
 
## 6. Contexto de autenticación (Auth.js)
 
```ts
// lib/auth.ts
export const { auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      async authorize(credentials) {
        const usuario = await usuarioService.validarLogin(credentials.correo, credentials.password);
        if (!usuario) return null; // Auth.js traduce esto a "credenciales inválidas" genérico (HU-01, Criterio 1)
        return { id: usuario.id, rol: usuario.rol, nombre: usuario.nombre };
      },
    }),
  ],
  session: { strategy: "jwt" },
});
```
 
`usuarioService.validarLogin` internamente verifica `activo: true` (Edge case 4) y el conteo de intentos fallidos (Edge case 5) antes de aceptar la contraseña.
 
---
 
## 7. Trazabilidad Plan ↔ Spec
 
| Elemento del plan | Origen |
|---|---|
| `Usuario.activo` y `PasswordResetToken` en schema | Constitution v1.6 (propagado desde spec) |
| Validación institucional con Zod `.refine()` | HU-02 Criterio 2 |
| `validarNoUltimoAdmin()` | Clarify #4 / Edge case 3 |
| Token de recuperación hasheado | HU-05 Criterio 2 |
| Mensaje genérico en `authorize()` | HU-01 Criterio 1 (no enumeración) |