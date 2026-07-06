// lib/services/usuario.service.ts — Lógica de negocio de Usuarios y Autenticación
// Art. III: Lógica de negocio aislada.
// Art. IV: Defensa contra rate limiting, hasheo y validaciones.

import { IUsuarioRepository, Rol } from "../ports/IUsuarioRepository";
import * as defaultRepo from "../repositories/usuario.repository";
import { DomainError } from "@/lib/errors/domain-error";
import { logger } from "@/lib/logger";
import { crearUsuarioSchema } from "@/lib/validators/usuario.validators";


import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * Valida las credenciales de inicio de sesión de un usuario.
 * Aplica rate limiting (bloqueo de 15 minutos tras 5 intentos fallidos consecutivos).
 */
export async function validarLogin(
  correo: string,
  passwordPlain: string,
  repo: IUsuarioRepository = defaultRepo
) {
  const usuario = await repo.buscarPorCorreo(correo);
  if (!usuario) {
    logger.warn("validarLogin", "Intento de inicio de sesión con correo inexistente", { correo });
    return null; // Evita enumeración de usuarios (Art. IV)
  }

  const ahora = new Date();

  // 1. Verificar si la cuenta está bloqueada temporalmente
  if (usuario.bloqueadoHasta && usuario.bloqueadoHasta > ahora) {
    const minutosRestantes = Math.ceil(
      (usuario.bloqueadoHasta.getTime() - ahora.getTime()) / 60000
    );
    logger.warn("validarLogin", "Intento de login en cuenta bloqueada temporalmente", {
      correo,
      minutosRestantes,
    });
    throw new DomainError(
      `La cuenta está bloqueada temporalmente por intentos fallidos. Intenta nuevamente en ${minutosRestantes} minutos.`
    );
  }

  // 2. Verificar si la cuenta está activa (HU-01 Criterio 2)
  if (!usuario.activo) {
    logger.warn("validarLogin", "Intento de login en cuenta desactivada", { correo });
    throw new DomainError("Esta cuenta está desactivada, contacta al administrador.");
  }

  // 3. Validar contraseña
  const esValida = await bcrypt.compare(passwordPlain, usuario.passwordHash);

  if (!esValida) {
    // Incrementar intentos fallidos
    const nuevosIntentos = (usuario.intentosFallidos ?? 0) + 1;
    logger.warn("validarLogin", "Contraseña incorrecta", {
      correo,
      intento: nuevosIntentos,
    });

    if (nuevosIntentos >= 5) {
      // Bloquear cuenta por 15 minutos
      const bloqueadoHasta = new Date(ahora.getTime() + 15 * 60000);
      await repo.bloquearUsuario(usuario.id, bloqueadoHasta);
      await repo.registrarIntentoFallido(usuario.id, nuevosIntentos);
      logger.error("validarLogin", "Cuenta bloqueada por exceso de intentos fallidos", {
        correo,
        bloqueadoHasta,
      });
    } else {
      await repo.registrarIntentoFallido(usuario.id, nuevosIntentos);
    }

    return null; // Mensaje genérico para el cliente
  }

  // 4. Login exitoso — resetear intentos fallidos
  await repo.resetearIntentos(usuario.id);
  logger.info("validarLogin", "Inicio de sesión exitoso", { correo, rol: usuario.rol });

  return {
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol,
  };
}

/**
 * Crea un nuevo usuario en el sistema.
 */
export async function crear(
  data: {
    nombre: string;
    correo: string;
    rol: Rol;
    password: string;
  },
  repo: IUsuarioRepository = defaultRepo
) {
  // Validar con Zod (defensa en profundidad)
  const validacion = crearUsuarioSchema.safeParse(data);
  if (!validacion.success) {
    throw new DomainError(validacion.error.issues[0].message);
  }

  const existente = await repo.buscarPorCorreo(data.correo);
  if (existente) {
    throw new DomainError("Este correo ya está registrado.");
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const usuario = await repo.crear({
    nombre: data.nombre,
    correo: data.correo,
    passwordHash,
    rol: data.rol,
  });

  logger.info("crearUsuario", "Usuario creado exitosamente", {
    id: usuario.id,
    correo: usuario.correo,
    rol: usuario.rol,
  });

  return usuario;
}

/**
 * Cambia el rol de un usuario existente.
 * Valida la regla de que no se puede dejar el sistema sin administradores activos.
 */
export async function cambiarRol(usuarioId: string, nuevoRol: Rol, repo: IUsuarioRepository = defaultRepo) {
  const usuario = await repo.buscarPorId(usuarioId);
  if (!usuario) {
    throw new DomainError("El usuario no existe.");
  }

  if (usuario.rol === "admin" && nuevoRol !== "admin") {
    const adminsActivos = await repo.contarAdminsActivos();
    if (adminsActivos <= 1) {
      throw new DomainError("Debe existir al menos un administrador activo.");
    }
  }

  const actualizado = await repo.actualizar(usuarioId, { rol: nuevoRol });
  logger.info("cambiarRol", "Rol de usuario actualizado", {
    usuarioId,
    anteriorRol: usuario.rol,
    nuevoRol,
  });

  return actualizado;
}

/**
 * Desactiva la cuenta de un usuario (activo: false).
 * Valida la regla de que no se puede desactivar al único administrador activo.
 */
export async function desactivar(usuarioId: string, repo: IUsuarioRepository = defaultRepo) {
  const usuario = await repo.buscarPorId(usuarioId);
  if (!usuario) {
    throw new DomainError("El usuario no existe.");
  }

  if (usuario.rol === "admin") {
    const adminsActivos = await repo.contarAdminsActivos();
    if (adminsActivos <= 1) {
      throw new DomainError("Debe existir al menos un administrador activo.");
    }
  }

  const desactivado = await repo.actualizar(usuarioId, { activo: false });
  logger.info("desactivarUsuario", "Usuario desactivado", { usuarioId });

  return desactivado;
}

/**
 * Cambia la contraseña de la propia cuenta del usuario.
 */
export async function cambiarPassword(
  usuarioId: string,
  passwordActual: string,
  passwordNueva: string,
  repo: IUsuarioRepository = defaultRepo
) {
  // Buscar usuario para obtener su hash actual
  const usuario = await repo.buscarPasswordHashPorId(usuarioId);

  if (!usuario) {
    throw new DomainError("El usuario no existe.");
  }

  // Verificar contraseña actual
  const esValida = await bcrypt.compare(passwordActual, usuario.passwordHash);
  if (!esValida) {
    throw new DomainError("La contraseña actual es incorrecta.");
  }

  // Hashear nueva contraseña
  const nuevoHash = await bcrypt.hash(passwordNueva, 10);

  // Actualizar
  await repo.actualizar(usuarioId, { passwordHash: nuevoHash });
  logger.info("cambiarPassword", "Contraseña cambiada exitosamente", { usuarioId });

  return { success: true };
}

/**
 * Solicita la recuperación de contraseña enviando un enlace simulado por consola.
 * Retorna siempre éxito genérico por seguridad (evitar enumeración, HU-05 Criterio 1).
 */
export async function solicitarRecuperacion(correo: string, repo: IUsuarioRepository = defaultRepo) {
  try {
    const usuario = await repo.buscarPorCorreo(correo);
    if (!usuario) {
      // Retornar éxito ficticio para seguridad contra enumeración
      logger.info("solicitarRecuperacion", "Intento de recuperación para correo inexistente", { correo });
      return { success: true };
    }

    // Generar un token en texto plano de un solo uso
    const tokenPlano = crypto.randomBytes(32).toString("hex");

    // Hashear el token para guardarlo en BD (HU-05 Criterio 2)
    const tokenHash = await bcrypt.hash(tokenPlano, 10);
    const expiraEn = new Date(Date.now() + 60 * 60000); // 1 hora de vigencia

    await repo.crearResetToken(usuario.id, tokenHash, expiraEn);

    // Simulación de envío por correo (Mock Service)
    const urlRecuperacion = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/recuperar-password/${tokenPlano}`;
    
    // Imprimir en consola de desarrollo (Art. X / T128)
    console.log(`
┌────────────────────────────────────────────────────────┐
│ 📧 [SIMULADOR DE CORREO UNSCH]                         │
│ Para: ${correo}                                         │
│ Asunto: Restablecer contraseña — EPIS UNSCH             │
│                                                        │
│ Enlace de recuperación (válido por 1 hora):             │
│ ${urlRecuperacion}                                      │
└────────────────────────────────────────────────────────┘
    `);

    logger.info("solicitarRecuperacion", "Enlace de recuperación generado", { correo });
    return { success: true };
  } catch (err) {
    logger.error("solicitarRecuperacion", "Error en el flujo", { err });
    // Retornar éxito ficticio para que el cliente no sepa que falló por problemas de red/servidor
    return { success: true };
  }
}

/**
 * Restablece la contraseña de un usuario mediante su token de recuperación.
 */
export async function resetearPassword(tokenPlano: string, passwordNueva: string, repo: IUsuarioRepository = defaultRepo) {
  // Dado que el tokenHash está en bcrypt en la BD, no podemos indexarlo.
  // Por tanto, listamos los tokens activos generales (no usados y no expirados),
  // que en la base de datos de desarrollo/producción en la última hora serán muy pocos (usualmente < 10).
  const tokensActivos = await repo.listarTokensActivos();

  let tokenEncontrado = null;

  for (const t of tokensActivos) {
    const coincide = await bcrypt.compare(tokenPlano, t.tokenHash);
    if (coincide) {
      tokenEncontrado = t;
      break;
    }
  }

  if (!tokenEncontrado) {
    logger.warn("resetearPassword", "Intento de recuperación con token inválido/expirado");
    throw new DomainError("Este enlace ya no es válido, solicita uno nuevo.");
  }

  // Hashear nueva contraseña
  const nuevoHash = await bcrypt.hash(passwordNueva, 10);

  // Ejecutar cambios
  await repo.actualizar(tokenEncontrado.usuarioId, { passwordHash: nuevoHash });
  await repo.marcarTokenUsado(tokenEncontrado.id);

  logger.info("resetearPassword", "Contraseña restablecida exitosamente", {
    usuarioId: tokenEncontrado.usuarioId,
  });

  return { success: true };
}
