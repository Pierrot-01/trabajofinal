// UsuarioServiceTests.cs — VERSIÓN CORREGIDA para net10.0
// Pega esto reemplazando completamente el archivo anterior.
using Moq;
using SistemaGestionLaboratorios.Errors;
using SistemaGestionLaboratorios.Models;
using SistemaGestionLaboratorios.Services;
using Xunit;

namespace SistemaGestionLaboratorios.Tests
{

    // ─── Interfaces ───────────────────────────────────────────────────────────

    public interface IUsuarioRepository
    {
        Task<Usuario?> BuscarPorId(string id);
        Task<Usuario?> BuscarPorCorreo(string correo);
        Task<Usuario> Crear(Usuario usuario);
        Task<Usuario> ActualizarRol(string usuarioId, Rol nuevoRol);
        Task<Usuario> Desactivar(string usuarioId);
        Task<int> ContarAdminsActivos();
        Task RegistrarIntentoFallido(string usuarioId, int totalActual);
        Task ResetearIntentos(string usuarioId);
        Task BloquearUsuario(string usuarioId, DateTime hasta);
        Task CrearResetToken(string usuarioId, string tokenHash, DateTime expiraEn);
        Task<PasswordResetToken?> BuscarTokenValido(string tokenHash);
        Task MarcarTokenUsado(string tokenId);
        Task<Usuario> ActualizarPassword(string usuarioId, string nuevoHash);
    }

    public interface IHasher
    {
        string Hash(string texto);
        bool Verify(string texto, string hash);
    }

    // ─── Servicio de usuario (lógica de negocio) ──────────────────────────────

    public class UsuarioService
    {
        private readonly IUsuarioRepository _repo;
        private readonly IHasher _hasher;
        private const int MAX_INTENTOS = 5;
        private const int MINUTOS_BLOQUEO = 15;

        public UsuarioService(IUsuarioRepository repo, IHasher hasher)
        {
            _repo = repo;
            _hasher = hasher;
        }

        // HU-01: Login
        public async Task<Usuario?> ValidarLogin(string correo, string password)
        {
            var usuario = await _repo.BuscarPorCorreo(correo);
            if (usuario == null) return null;

            // Edge case 4: cuenta desactivada
            if (!usuario.Activo)
                throw new DomainError("Esta cuenta está desactivada, contacta al administrador.");

            // Edge case 5: cuenta bloqueada temporalmente
            if (usuario.BloqueadoHasta.HasValue && usuario.BloqueadoHasta.Value > DateTime.UtcNow)
                throw new DomainError("Cuenta bloqueada temporalmente. Intenta en 15 minutos.");

            var passwordCorrecta = _hasher.Verify(password, usuario.PasswordHash);
            if (!passwordCorrecta)
            {
                var intentos = (usuario.IntentosFallidos ?? 0) + 1;
                await _repo.RegistrarIntentoFallido(usuario.Id, intentos);

                if (intentos >= MAX_INTENTOS)
                    await _repo.BloquearUsuario(usuario.Id, DateTime.UtcNow.AddMinutes(MINUTOS_BLOQUEO));

                return null;
            }

            await _repo.ResetearIntentos(usuario.Id);
            return usuario;
        }

        // HU-02: Crear usuario
        public async Task<Usuario> Crear(string nombre, string correo, Rol rol, string passwordTemporal)
        {
            if (!correo.EndsWith("@unsch.edu.pe"))
                throw new DomainError("Debe usar un correo institucional (@unsch.edu.pe)");

            var existente = await _repo.BuscarPorCorreo(correo);
            if (existente != null)
                throw new DomainError("Ya existe un usuario con este correo.");

            var hash = _hasher.Hash(passwordTemporal);
            return await _repo.Crear(new Usuario
            {
                Nombre = nombre,
                Correo = correo,
                Rol = rol,
                PasswordHash = hash,
                Activo = true
            });
        }

        // HU-03: Cambiar rol
        public async Task<Usuario> CambiarRol(string adminId, string usuarioId, Rol nuevoRol)
        {
            if (adminId == usuarioId)
                throw new DomainError("No puedes cambiar tu propio rol.");

            var usuario = await _repo.BuscarPorId(usuarioId);
            if (usuario?.Rol == Rol.Admin)
                await ValidarNoUltimoAdmin(usuarioId);

            return await _repo.ActualizarRol(usuarioId, nuevoRol);
        }

        // HU-03: Desactivar
        public async Task<Usuario> Desactivar(string adminId, string usuarioId)
        {
            await ValidarNoUltimoAdmin(usuarioId);
            return await _repo.Desactivar(usuarioId);
        }

        private async Task ValidarNoUltimoAdmin(string usuarioId)
        {
            var usuario = await _repo.BuscarPorId(usuarioId);
            if (usuario?.Rol != Rol.Admin) return;
            var adminsActivos = await _repo.ContarAdminsActivos();
            if (adminsActivos <= 1)
                throw new DomainError("Debe existir al menos un administrador activo.");
        }

        // HU-04: Cambiar password
        public async Task<Usuario> CambiarPassword(string usuarioId, string passwordActual, string nuevaPassword)
        {
            var usuario = await _repo.BuscarPorId(usuarioId);
            if (usuario == null) throw new DomainError("Usuario no encontrado.");

            if (!_hasher.Verify(passwordActual, usuario.PasswordHash))
                throw new DomainError("La contraseña actual es incorrecta.");

            if (nuevaPassword.Length < 8)
                throw new DomainError("La contraseña debe tener al menos 8 caracteres.");

            var nuevoHash = _hasher.Hash(nuevaPassword);
            return await _repo.ActualizarPassword(usuarioId, nuevoHash);
        }

        // HU-05: Solicitar recuperación
        public async Task SolicitarRecuperacion(string correo)
        {
            var usuario = await _repo.BuscarPorCorreo(correo);
            // Siempre responde igual aunque el correo no exista (Art. IV — no enumeración)
            if (usuario == null) return;

            var token = Guid.NewGuid().ToString("N");
            var tokenHash = _hasher.Hash(token);
            await _repo.CrearResetToken(usuario.Id, tokenHash, DateTime.UtcNow.AddHours(1));
        }

        // HU-05: Resetear password con token
        public async Task<Usuario> ResetearPassword(string tokenPlano, string nuevaPassword)
        {
            var tokenHash = _hasher.Hash(tokenPlano);
            var resetToken = await _repo.BuscarTokenValido(tokenHash);
            if (resetToken == null || resetToken.Usado || resetToken.ExpiraEn < DateTime.UtcNow)
                throw new DomainError("Este enlace ya no es válido, solicita uno nuevo.");

            await _repo.MarcarTokenUsado(resetToken.Id);
            var nuevoHash = _hasher.Hash(nuevaPassword);
            return await _repo.ActualizarPassword(resetToken.UsuarioId, nuevoHash);
        }
    }

    // ─── TESTS ────────────────────────────────────────────────────────────────

    public class UsuarioServiceTests
    {
        private readonly Mock<IUsuarioRepository> _usuarioRepoMock = new();
        private readonly Mock<IHasher> _hasherMock = new();
        private readonly UsuarioService _service;

        public UsuarioServiceTests()
        {
            _service = new UsuarioService(_usuarioRepoMock.Object, _hasherMock.Object);
        }

        // ===================================================================
        // HU-01 — ValidarLogin
        // ===================================================================

        [Fact]
        public async Task HU01_LoginCorrecto_RetornaUsuario()
        {
            var usuarioMock = new Usuario
            {
                Id = "usr_001",
                PasswordHash = "hash_correcto",
                Activo = true,
                IntentosFallidos = 2,
                BloqueadoHasta = null
            };

            _usuarioRepoMock.Setup(r => r.BuscarPorCorreo("juan.perez@unsch.edu.pe"))
                .ReturnsAsync(usuarioMock);
            _hasherMock.Setup(h => h.Verify("Password123", "hash_correcto")).Returns(true);
            _usuarioRepoMock.Setup(r => r.ResetearIntentos("usr_001"))
                .Returns(Task.CompletedTask);

            var resultado = await _service.ValidarLogin("juan.perez@unsch.edu.pe", "Password123");

            Assert.NotNull(resultado);
        }

        [Fact]
        public async Task HU01_ContrasenaIncorrecta_RetornaNullYRegistraIntento()
        {
            var usuarioMock = new Usuario
            {
                Id = "usr_001",
                PasswordHash = "hash_correcto",
                Activo = true,
                IntentosFallidos = 2,
                BloqueadoHasta = null
            };

            _usuarioRepoMock.Setup(r => r.BuscarPorCorreo(It.IsAny<string>())).ReturnsAsync(usuarioMock);
            _hasherMock.Setup(h => h.Verify(It.IsAny<string>(), It.IsAny<string>())).Returns(false);
            _usuarioRepoMock.Setup(r => r.RegistrarIntentoFallido(It.IsAny<string>(), It.IsAny<int>()))
                .Returns(Task.CompletedTask);

            var resultado = await _service.ValidarLogin("juan@unsch.edu.pe", "PasswordMalo");

            Assert.Null(resultado);
            _usuarioRepoMock.Verify(r => r.RegistrarIntentoFallido("usr_001", 3), Times.Once);
        }

        [Fact]
        public async Task HU01_CorreoNoExiste_RetornaNullSinDarPistas()
        {
            _usuarioRepoMock.Setup(r => r.BuscarPorCorreo(It.IsAny<string>()))
                .ReturnsAsync((Usuario?)null);

            var resultado = await _service.ValidarLogin("noexiste@unsch.edu.pe", "cualquier");

            Assert.Null(resultado);
            _hasherMock.Verify(h => h.Verify(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task HU01_CuentaDesactivada_LanzaDomainError_EdgeCase4()
        {
            _usuarioRepoMock.Setup(r => r.BuscarPorCorreo(It.IsAny<string>()))
                .ReturnsAsync(new Usuario { Id = "usr_1", Activo = false, PasswordHash = "h" });

            var ex = await Assert.ThrowsAsync<DomainError>(() =>
                _service.ValidarLogin("inactivo@unsch.edu.pe", "pass"));
            Assert.Contains("desactivada", ex.Message);
        }

        [Fact]
        public async Task HU01_CuentaBloqueada_LanzaDomainError_EdgeCase5()
        {
            _usuarioRepoMock.Setup(r => r.BuscarPorCorreo(It.IsAny<string>()))
                .ReturnsAsync(new Usuario
                {
                    Id = "usr_1",
                    Activo = true,
                    PasswordHash = "h",
                    BloqueadoHasta = DateTime.UtcNow.AddMinutes(10) // aún bloqueada
                });

            var ex = await Assert.ThrowsAsync<DomainError>(() =>
                _service.ValidarLogin("bloqueado@unsch.edu.pe", "pass"));
            Assert.Contains("bloqueada", ex.Message);
        }

        [Fact]
        public async Task HU01_QuintoIntentoFallido_BloquearUsuario_EdgeCase5()
        {
            var usuarioMock = new Usuario
            {
                Id = "usr_001",
                PasswordHash = "hash_correcto",
                Activo = true,
                IntentosFallidos = 4, // 4 previos → el 5to dispara bloqueo
                BloqueadoHasta = null
            };

            _usuarioRepoMock.Setup(r => r.BuscarPorCorreo(It.IsAny<string>())).ReturnsAsync(usuarioMock);
            _hasherMock.Setup(h => h.Verify(It.IsAny<string>(), It.IsAny<string>())).Returns(false);
            _usuarioRepoMock.Setup(r => r.RegistrarIntentoFallido(It.IsAny<string>(), It.IsAny<int>()))
                .Returns(Task.CompletedTask);
            _usuarioRepoMock.Setup(r => r.BloquearUsuario(It.IsAny<string>(), It.IsAny<DateTime>()))
                .Returns(Task.CompletedTask);

            await _service.ValidarLogin("juan@unsch.edu.pe", "PasswordMalo");

            _usuarioRepoMock.Verify(r =>
                r.BloquearUsuario(It.IsAny<string>(), It.IsAny<DateTime>()), Times.Once);
        }

        // ===================================================================
        // HU-02 — Crear usuario
        // ===================================================================

        [Fact]
        public async Task HU02_CorreoNoInstitucional_LanzaDomainError_EdgeCase1()
        {
            var ex = await Assert.ThrowsAsync<DomainError>(() =>
                _service.Crear("Juan", "juan@gmail.com", Rol.Estudiante, "pass123"));
            Assert.Contains("correo institucional", ex.Message);
        }

        [Fact]
        public async Task HU02_CorreoYaExiste_LanzaDomainError()
        {
            _usuarioRepoMock.Setup(r => r.BuscarPorCorreo("juan@unsch.edu.pe"))
                .ReturnsAsync(new Usuario { Id = "usr_existente" });

            var ex = await Assert.ThrowsAsync<DomainError>(() =>
                _service.Crear("Juan", "juan@unsch.edu.pe", Rol.Estudiante, "pass123"));
            Assert.Contains("Ya existe", ex.Message);
        }

        [Fact]
        public async Task HU02_DatosValidos_CreaConPasswordHasheada()
        {
            _usuarioRepoMock.Setup(r => r.BuscarPorCorreo("nuevo@unsch.edu.pe"))
                .ReturnsAsync((Usuario?)null);
            _hasherMock.Setup(h => h.Hash("pass123")).Returns("hash_generado");
            _usuarioRepoMock.Setup(r => r.Crear(It.IsAny<Usuario>()))
                .ReturnsAsync(new Usuario { Id = "usr_new", Correo = "nuevo@unsch.edu.pe" });

            var resultado = await _service.Crear("Juan", "nuevo@unsch.edu.pe", Rol.Estudiante, "pass123");

            _hasherMock.Verify(h => h.Hash("pass123"), Times.Once);
            Assert.Equal("usr_new", resultado.Id);
        }

        // ===================================================================
        // HU-03 — Cambiar rol / Desactivar
        // ===================================================================

        [Fact]
        public async Task HU03_AdminIntentaCambiarSuPropioRol_LanzaDomainError()
        {
            var ex = await Assert.ThrowsAsync<DomainError>(() =>
                _service.CambiarRol("admin_1", "admin_1", Rol.Tecnico));
            Assert.Contains("propio rol", ex.Message);
        }

        [Fact]
        public async Task HU03_DesactivarUnicoAdmin_LanzaDomainError_EdgeCase3()
        {
            _usuarioRepoMock.Setup(r => r.BuscarPorId("admin_1"))
                .ReturnsAsync(new Usuario { Id = "admin_1", Rol = Rol.Admin, Activo = true });
            _usuarioRepoMock.Setup(r => r.ContarAdminsActivos()).ReturnsAsync(1);

            var ex = await Assert.ThrowsAsync<DomainError>(() =>
                _service.Desactivar("otro_admin", "admin_1"));
            Assert.Contains("al menos un administrador", ex.Message);
        }

        [Fact]
        public async Task HU03_DesactivarCuandoHayMasAdmins_ExitoSinError()
        {
            _usuarioRepoMock.Setup(r => r.BuscarPorId("admin_1"))
                .ReturnsAsync(new Usuario { Id = "admin_1", Rol = Rol.Admin, Activo = true });
            _usuarioRepoMock.Setup(r => r.ContarAdminsActivos()).ReturnsAsync(2);
            _usuarioRepoMock.Setup(r => r.Desactivar("admin_1"))
                .ReturnsAsync(new Usuario { Id = "admin_1", Activo = false });

            var resultado = await _service.Desactivar("superadmin", "admin_1");

            Assert.False(resultado.Activo);
        }

        // ===================================================================
        // HU-04 — Cambiar contraseña propia
        // ===================================================================

        [Fact]
        public async Task HU04_PasswordActualCorrecta_ActualizaPassword()
        {
            _usuarioRepoMock.Setup(r => r.BuscarPorId("usr_1"))
                .ReturnsAsync(new Usuario { Id = "usr_1", PasswordHash = "hash_viejo" });
            _hasherMock.Setup(h => h.Verify("OldPass123", "hash_viejo")).Returns(true);
            _hasherMock.Setup(h => h.Hash("NewPass456")).Returns("hash_nuevo");
            _usuarioRepoMock.Setup(r => r.ActualizarPassword("usr_1", "hash_nuevo"))
                .ReturnsAsync(new Usuario { Id = "usr_1" });

            var resultado = await _service.CambiarPassword("usr_1", "OldPass123", "NewPass456");

            Assert.NotNull(resultado);
        }

        [Fact]
        public async Task HU04_PasswordActualIncorrecta_LanzaDomainError()
        {
            _usuarioRepoMock.Setup(r => r.BuscarPorId("usr_1"))
                .ReturnsAsync(new Usuario { Id = "usr_1", PasswordHash = "hash_viejo" });
            _hasherMock.Setup(h => h.Verify(It.IsAny<string>(), It.IsAny<string>())).Returns(false);

            var ex = await Assert.ThrowsAsync<DomainError>(() =>
                _service.CambiarPassword("usr_1", "Incorrecta", "NuevaPass123"));
            Assert.Contains("incorrecta", ex.Message);
        }

        // ===================================================================
        // HU-05 — Recuperar contraseña
        // ===================================================================

        [Fact]
        public async Task HU05_SolicitarRecuperacion_MismaRespuestaSiCorreoExisteONo()
        {
            // Caso 1: correo existe
            _usuarioRepoMock.Setup(r => r.BuscarPorCorreo("existe@unsch.edu.pe"))
                .ReturnsAsync(new Usuario { Id = "usr_001" });
            _hasherMock.Setup(h => h.Hash(It.IsAny<string>())).Returns("token_hash");
            _usuarioRepoMock.Setup(r => r.CrearResetToken(
                    It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTime>()))
                .Returns(Task.CompletedTask);

            // No debe lanzar excepción en ninguno de los dos casos
            await _service.SolicitarRecuperacion("existe@unsch.edu.pe");

            // Caso 2: correo NO existe → misma respuesta silenciosa (Art. IV, no enumeración)
            _usuarioRepoMock.Setup(r => r.BuscarPorCorreo("noexiste@unsch.edu.pe"))
                .ReturnsAsync((Usuario?)null);

            await _service.SolicitarRecuperacion("noexiste@unsch.edu.pe");
            // Si llegó aquí sin excepción, ambos casos responden igual ✅
        }

        [Fact]
        public async Task HU05_TokenExpiradoOUsado_LanzaDomainError_EdgeCase2()
        {
            _hasherMock.Setup(h => h.Hash(It.IsAny<string>())).Returns("token_hash");
            _usuarioRepoMock.Setup(r => r.BuscarTokenValido("token_hash"))
                .ReturnsAsync((PasswordResetToken?)null); // token no encontrado

            var ex = await Assert.ThrowsAsync<DomainError>(() =>
                _service.ResetearPassword("token_plano", "NuevaPass123"));
            Assert.Contains("ya no es válido", ex.Message);
        }

        [Fact]
        public async Task HU05_TokenValido_ResetearPasswordConExito()
        {
            var resetToken = new PasswordResetToken
            {
                Id = "rt_1",
                UsuarioId = "usr_1",
                Usado = false,
                ExpiraEn = DateTime.UtcNow.AddMinutes(30)
            };

            _hasherMock.Setup(h => h.Hash(It.IsAny<string>())).Returns("token_hash");
            _usuarioRepoMock.Setup(r => r.BuscarTokenValido("token_hash")).ReturnsAsync(resetToken);
            _usuarioRepoMock.Setup(r => r.MarcarTokenUsado("rt_1")).Returns(Task.CompletedTask);
            _usuarioRepoMock.Setup(r => r.ActualizarPassword("usr_1", It.IsAny<string>()))
                .ReturnsAsync(new Usuario { Id = "usr_1" });

            var resultado = await _service.ResetearPassword("token_plano", "NuevaPass789");

            _usuarioRepoMock.Verify(r => r.MarcarTokenUsado("rt_1"), Times.Once);
            Assert.NotNull(resultado);
        }
    }
}
