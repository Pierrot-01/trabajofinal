// tests/unit/usuario.service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as usuarioService from "@/lib/services/usuario.service";
import * as usuarioRepository from "@/lib/repositories/usuario.repository";
import bcrypt from "bcryptjs";
import { crearUsuarioSchema } from "@/lib/validators/usuario.validators";

// Mockear el repositorio de usuarios
vi.mock("@/lib/repositories/usuario.repository", () => ({
  buscarPorCorreo: vi.fn(),
  buscarPorId: vi.fn(),
  buscarPasswordHashPorId: vi.fn(),
  listarTokensActivos: vi.fn(),
  crear: vi.fn(),
  actualizar: vi.fn(),
  contarAdminsActivos: vi.fn(),
  registrarIntentoFallido: vi.fn(),
  resetearIntentos: vi.fn(),
  bloquearUsuario: vi.fn(),
  crearResetToken: vi.fn(),
  buscarTokenActivo: vi.fn(),
  marcarTokenUsado: vi.fn(),
}));



describe("Módulo de Usuarios y Autenticación — Pruebas Unitarias", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("HU-01 — Iniciar sesión (validarLogin)", () => {
    it("debe iniciar sesión con credenciales correctas y cuenta activa", async () => {
      const passwordPlain = "Password123";
      const passwordHash = await bcrypt.hash(passwordPlain, 1);
      
      const usuarioMock = {
        id: "usr_001",
        nombre: "Juan Perez",
        correo: "juan.perez@unsch.edu.pe",
        passwordHash,
        rol: "tecnico",
        activo: true,
        intentosFallidos: 0,
        bloqueadoHasta: null,
      };

      vi.mocked(usuarioRepository.buscarPorCorreo).mockResolvedValue(usuarioMock as any);
      vi.mocked(usuarioRepository.resetearIntentos).mockResolvedValue({} as any);

      const resultado = await usuarioService.validarLogin("juan.perez@unsch.edu.pe", passwordPlain);

      expect(resultado).not.toBeNull();
      expect(resultado!.id).toBe(usuarioMock.id);
      expect(resultado!.rol).toBe(usuarioMock.rol);
      expect(usuarioRepository.resetearIntentos).toHaveBeenCalledWith("usr_001");
    });

    it("debe retornar null para contraseña incorrecta (mensaje genérico)", async () => {
      const passwordPlain = "PasswordCorrecto";
      const passwordHash = await bcrypt.hash(passwordPlain, 1);

      const usuarioMock = {
        id: "usr_001",
        nombre: "Juan Perez",
        correo: "juan.perez@unsch.edu.pe",
        passwordHash,
        rol: "tecnico",
        activo: true,
        intentosFallidos: 2,
        bloqueadoHasta: null,
      };

      vi.mocked(usuarioRepository.buscarPorCorreo).mockResolvedValue(usuarioMock as any);
      vi.mocked(usuarioRepository.registrarIntentoFallido).mockResolvedValue({} as any);

      const resultado = await usuarioService.validarLogin("juan.perez@unsch.edu.pe", "IncorrectPassword");

      expect(resultado).toBeNull();
      expect(usuarioRepository.registrarIntentoFallido).toHaveBeenCalledWith("usr_001", 3);
    });

    it("debe rechazar si la cuenta está inactiva (activo: false)", async () => {
      const passwordPlain = "Password123";
      const passwordHash = await bcrypt.hash(passwordPlain, 1);

      const usuarioMock = {
        id: "usr_001",
        nombre: "Juan Perez",
        correo: "juan.perez@unsch.edu.pe",
        passwordHash,
        rol: "tecnico",
        activo: false,
        intentosFallidos: 0,
        bloqueadoHasta: null,
      };

      vi.mocked(usuarioRepository.buscarPorCorreo).mockResolvedValue(usuarioMock as any);

      await expect(
        usuarioService.validarLogin("juan.perez@unsch.edu.pe", passwordPlain)
      ).rejects.toThrowError("Esta cuenta está desactivada, contacta al administrador.");
    });

    it("debe rechazar y bloquear cuenta tras 5 intentos fallidos consecutivos", async () => {
      const passwordPlain = "PasswordCorrecto";
      const passwordHash = await bcrypt.hash(passwordPlain, 1);

      const usuarioMock = {
        id: "usr_001",
        nombre: "Juan Perez",
        correo: "juan.perez@unsch.edu.pe",
        passwordHash,
        rol: "tecnico",
        activo: true,
        intentosFallidos: 4, // Ya falló 4 veces
        bloqueadoHasta: null,
      };

      vi.mocked(usuarioRepository.buscarPorCorreo).mockResolvedValue(usuarioMock as any);
      vi.mocked(usuarioRepository.registrarIntentoFallido).mockResolvedValue({} as any);
      vi.mocked(usuarioRepository.bloquearUsuario).mockResolvedValue({} as any);

      const resultado = await usuarioService.validarLogin("juan.perez@unsch.edu.pe", "IncorrectPassword");

      expect(resultado).toBeNull();
      expect(usuarioRepository.registrarIntentoFallido).toHaveBeenCalledWith("usr_001", 5);
      expect(usuarioRepository.bloquearUsuario).toHaveBeenCalled();
    });

    it("debe rechazar el inicio de sesión si la cuenta está bloqueada temporalmente", async () => {
      const futuro = new Date(Date.now() + 10 * 60 * 1000); // bloqueado por 10 minutos más
      const usuarioMock = {
        id: "usr_001",
        nombre: "Juan Perez",
        correo: "juan.perez@unsch.edu.pe",
        passwordHash: "any_hash",
        rol: "tecnico",
        activo: true,
        intentosFallidos: 5,
        bloqueadoHasta: futuro,
      };

      vi.mocked(usuarioRepository.buscarPorCorreo).mockResolvedValue(usuarioMock as any);

      await expect(
        usuarioService.validarLogin("juan.perez@unsch.edu.pe", "any_password")
      ).rejects.toThrowError(/La cuenta está bloqueada temporalmente por intentos fallidos/);
    });
  });

  describe("HU-02 — Crear cuenta de usuario (Zod validator + crear)", () => {
    it("debe validar que el correo termine en @unsch.edu.pe", () => {
      const datosInvalidos = {
        nombre: "Pedro Docente",
        correo: "pedro.docente@gmail.com",
        rol: "docente",
      };

      const result = crearUsuarioSchema.safeParse(datosInvalidos);
      expect(result.success).toBe(false);
    });

    it("debe aceptar un correo institucional válido", () => {
      const datosValidos = {
        nombre: "Pedro Docente",
        correo: "pedro.docente@unsch.edu.pe",
        rol: "docente",
        password: "TempPassword123",
      };

      const result = crearUsuarioSchema.safeParse(datosValidos);
      expect(result.success).toBe(true);
    });

    it("debe crear el usuario y hashear su contraseña si el correo es único", async () => {
      vi.mocked(usuarioRepository.buscarPorCorreo).mockResolvedValue(null); // Correo libre
      vi.mocked(usuarioRepository.crear).mockResolvedValue({ id: "usr_new" } as any);

      const input = {
        nombre: "Pedro Docente",
        correo: "pedro.docente@unsch.edu.pe",
        rol: "docente" as const,
        password: "TempPassword123",
      };

      const resultado = await usuarioService.crear(input);

      expect(resultado).not.toBeNull();
      expect(usuarioRepository.crear).toHaveBeenCalled();
      
      const args = vi.mocked(usuarioRepository.crear).mock.calls[0][0];
      expect(args.correo).toBe(input.correo);
      expect(args.passwordHash).not.toBe(input.password); // Hasheada!
    });

    it("debe lanzar DomainError si el correo de usuario ya existe", async () => {
      vi.mocked(usuarioRepository.buscarPorCorreo).mockResolvedValue({ id: "usr_existing" } as any);

      const input = {
        nombre: "Pedro Docente",
        correo: "pedro.docente@unsch.edu.pe",
        rol: "docente" as const,
        password: "TempPassword123",
      };

      await expect(usuarioService.crear(input)).rejects.toThrowError(
        "Este correo ya está registrado."
      );
    });
  });

  describe("HU-03 — Gestión de cuentas: Regla de 'al menos un admin activo'", () => {
    it("debe impedir desactivar al único admin activo del sistema", async () => {
      const adminMock = {
        id: "admin_001",
        rol: "admin",
        activo: true,
      };

      vi.mocked(usuarioRepository.buscarPorId).mockResolvedValue(adminMock as any);
      vi.mocked(usuarioRepository.contarAdminsActivos).mockResolvedValue(1); // Solo 1 admin activo

      await expect(
        usuarioService.desactivar("admin_001")
      ).rejects.toThrowError("Debe existir al menos un administrador activo.");
    });

    it("debe desactivar exitosamente al admin si hay otros admins activos", async () => {
      const adminMock = {
        id: "admin_001",
        rol: "admin",
        activo: true,
      };

      vi.mocked(usuarioRepository.buscarPorId).mockResolvedValue(adminMock as any);
      vi.mocked(usuarioRepository.contarAdminsActivos).mockResolvedValue(2); // Hay 2 admins activos
      vi.mocked(usuarioRepository.actualizar).mockResolvedValue({ id: "admin_001", activo: false } as any);

      const result = await usuarioService.desactivar("admin_001");
      expect(result).not.toBeNull();
      expect(usuarioRepository.actualizar).toHaveBeenCalledWith("admin_001", { activo: false });
    });

    it("debe impedir degradar el rol del único admin activo", async () => {
      const adminMock = {
        id: "admin_001",
        rol: "admin",
        activo: true,
      };

      vi.mocked(usuarioRepository.buscarPorId).mockResolvedValue(adminMock as any);
      vi.mocked(usuarioRepository.contarAdminsActivos).mockResolvedValue(1); // Solo 1 admin activo

      await expect(
        usuarioService.cambiarRol("admin_001", "tecnico")
      ).rejects.toThrowError("Debe existir al menos un administrador activo.");
    });
  });

  describe("HU-04 — Cambiar la propia contraseña (cambiarPassword)", () => {
    it("debe cambiar la contraseña si la contraseña actual provista es correcta", async () => {
      const passwordPlain = "OldPassword123";
      const passwordHash = await bcrypt.hash(passwordPlain, 1);

      const usuarioMock = {
        id: "usr_001",
        passwordHash,
      };

      vi.mocked(usuarioRepository.buscarPasswordHashPorId).mockResolvedValue(usuarioMock as any);
      vi.mocked(usuarioRepository.actualizar).mockResolvedValue({ id: "usr_001" } as any);

      const result = await usuarioService.cambiarPassword(
        "usr_001",
        passwordPlain,
        "NewPassword123"
      );

      expect(result).not.toBeNull();
      expect(usuarioRepository.actualizar).toHaveBeenCalled();
      
      const newHash = vi.mocked(usuarioRepository.actualizar).mock.calls[0][1].passwordHash;
      expect(newHash).not.toBe(passwordPlain);
      expect(newHash).not.toBe("NewPassword123");
    });

    it("debe fallar si la contraseña actual provista es incorrecta", async () => {
      const passwordPlain = "OldPassword123";
      const passwordHash = await bcrypt.hash(passwordPlain, 1);

      const usuarioMock = {
        id: "usr_001",
        passwordHash,
      };

      vi.mocked(usuarioRepository.buscarPasswordHashPorId).mockResolvedValue(usuarioMock as any);

      await expect(
        usuarioService.cambiarPassword("usr_001", "WrongCurrentPassword", "NewPassword123")
      ).rejects.toThrowError("La contraseña actual es incorrecta.");
    });
  });

  describe("HU-05 — Recuperar contraseña", () => {
    it("debe retornar el mismo mensaje genérico si el correo existe o no", async () => {
      // Caso 1: correo existe
      vi.mocked(usuarioRepository.buscarPorCorreo).mockResolvedValue({ id: "usr_001" } as any);
      vi.mocked(usuarioRepository.crearResetToken).mockResolvedValue({} as any);

      const resExiste = await usuarioService.solicitarRecuperacion("existe@unsch.edu.pe");
      expect(resExiste).toEqual({ success: true });

      // Caso 2: correo NO existe
      vi.mocked(usuarioRepository.buscarPorCorreo).mockResolvedValue(null);

      const resNoExiste = await usuarioService.solicitarRecuperacion("no.existe@unsch.edu.pe");
      expect(resNoExiste).toEqual({ success: true });
    });

    it("debe fallar al resetear contraseña si el token de recuperación fue usado o expiró", async () => {
      // Caso 1: Token no existe o ya usado
      vi.mocked(usuarioRepository.listarTokensActivos).mockResolvedValue([] as any);

      await expect(
        usuarioService.resetearPassword("invalid_token", "NewPassword123")
      ).rejects.toThrowError("Este enlace ya no es válido, solicita uno nuevo.");

      // Caso 2: Token expirado (el repositorio no lo devuelve por estar fuera de fecha)
      vi.mocked(usuarioRepository.listarTokensActivos).mockResolvedValue([] as any);

      await expect(
        usuarioService.resetearPassword("expired_token", "NewPassword123")
      ).rejects.toThrowError("Este enlace ya no es válido, solicita uno nuevo.");
    });

    it("debe cambiar la contraseña e invalidar el token si el token es válido", async () => {
      const tokenHash = await bcrypt.hash("valid_token", 1);
      const tokenValido = {
        id: "token_001",
        usuarioId: "usr_001",
        tokenHash,
      };

      vi.mocked(usuarioRepository.listarTokensActivos).mockResolvedValue([tokenValido] as any);
      vi.mocked(usuarioRepository.actualizar).mockResolvedValue({ id: "usr_001" } as any);
      vi.mocked(usuarioRepository.marcarTokenUsado).mockResolvedValue({} as any);

      const result = await usuarioService.resetearPassword("valid_token", "NewPassword123");

      expect(result).not.toBeNull();
      expect(usuarioRepository.actualizar).toHaveBeenCalled();
      expect(usuarioRepository.marcarTokenUsado).toHaveBeenCalledWith("token_001");
    });
  });
});
