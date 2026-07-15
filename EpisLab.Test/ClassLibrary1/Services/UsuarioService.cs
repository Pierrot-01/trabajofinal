// Services/UsuarioService.cs
// Equivalente a: lib/services/usuario.service.ts
using SistemaGestionLaboratorios.Errors;
using SistemaGestionLaboratorios.Models;

namespace SistemaGestionLaboratorios.Services
{
    public interface IUsuarioRepository
    {
        Task<Usuario?> BuscarPorCorreo(string correo);
        Task<Usuario?> BuscarPorId(string id);
        Task<Usuario?> BuscarPasswordHashPorId(string id);
        Task<List<PasswordResetToken>> ListarTokensActivos(string usuarioId);
        Task<Usuario> Crear(Usuario usuario);
        Task<Usuario> Actualizar(string id, Dictionary<string, object> cambios);
        Task<int> ContarAdminsActivos();
        Task RegistrarIntentoFallido(string usuarioId, int nuevoConteo);
        Task ResetearIntentos(string usuarioId);
        Task BloquearUsuario(string usuarioId, DateTime bloqueadoHasta);
        Task CrearResetToken(string usuarioId, string tokenHash, DateTime expiraEn);
        Task MarcarTokenUsado(string tokenId);
    }

    public class UsuarioService
    {
        private readonly IUsuarioRepository _usuarioRepo;
        private readonly IPasswordHasher _hasher;
        private const int MaxIntentosFallidos = 5;
        private const int MinutosBloqueo = 15;

        public UsuarioService(IUsuarioRepository usuarioRepo, IPasswordHasher hasher)
        {
            _usuarioRepo = usuarioRepo;
            _hasher = hasher;
        }

        // HU-01: validarLogin
        public async Task<object?> ValidarLogin(string correo, string password)
        {
            var usuario = await _usuarioRepo.BuscarPorCorreo(correo);
            if (usuario == null) return null; // Mensaje genérico — no revela si existe

            // Edge case 5: bloqueado temporalmente
            if (usuario.BloqueadoHasta.HasValue && usuario.BloqueadoHasta > DateTime.UtcNow)
                throw new DomainError(
                    $"La cuenta está bloqueada temporalmente por intentos fallidos. " +
                    $"Intenta nuevamente después de {usuario.BloqueadoHasta:HH:mm}.");

            // Edge case 4: cuenta inactiva
            if (!usuario.Activo)
                throw new DomainError("Esta cuenta está desactivada, contacta al administrador.");

            var passwordCorrecta = _hasher.Verify(password, usuario.PasswordHash);
            if (!passwordCorrecta)
            {
                var nuevoConteo = (usuario.IntentosFallidos ?? 0) + 1;
                await _usuarioRepo.RegistrarIntentoFallido(usuario.Id, nuevoConteo);

                if (nuevoConteo >= MaxIntentosFallidos)
                    await _usuarioRepo.BloquearUsuario(
                        usuario.Id, DateTime.UtcNow.AddMinutes(MinutosBloqueo));

                return null;
            }

            await _usuarioRepo.ResetearIntentos(usuario.Id);
            return new { id = usuario.Id, rol = usuario.Rol, nombre = usuario.Nombre };
        }

        // HU-02: crear usuario
        public async Task<Usuario> Crear(string nombre, string correo, Rol rol, string password)
        {
            var existente = await _usuarioRepo.BuscarPorCorreo(correo);
            if (existente != null)
                throw new DomainError("Este correo ya está registrado.");

            var passwordHash = _hasher.Hash(password);
            return await _usuarioRepo.Crear(new Usuario
            {
                Nombre = nombre,
                Correo = correo,
                PasswordHash = passwordHash,
                Rol = rol,
                Activo = true
            });
        }

        // HU-03: validar que no sea el último admin (Clarify #4)
        private async Task ValidarNoUltimoAdmin(string usuarioId)
        {
            var usuario = await _usuarioRepo.BuscarPorId(usuarioId);
            if (usuario?.Rol != Rol.Admin) return;

            var adminsActivos = await _usuarioRepo.ContarAdminsActivos();
            if (adminsActivos <= 1)
                throw new DomainError("Debe existir al menos un administrador activo.");
        }

        public async Task<Usuario> Desactivar(string usuarioId)
        {
            await ValidarNoUltimoAdmin(usuarioId);
            var cambios = new Dictionary<string, object> { { "activo", false } };
            return await _usuarioRepo.Actualizar(usuarioId, cambios);
        }

        public async Task<Usuario> CambiarRol(string usuarioId, Rol nuevoRol)
        {
            await ValidarNoUltimoAdmin(usuarioId);
            var cambios = new Dictionary<string, object> { { "rol", nuevoRol } };
            return await _usuarioRepo.Actualizar(usuarioId, cambios);
        }

        // HU-04: cambiar contraseña propia
        public async Task<Usuario> CambiarPassword(string usuarioId, string passwordActual, string passwordNueva)
        {
            var usuario = await _usuarioRepo.BuscarPasswordHashPorId(usuarioId)
                ?? throw new DomainError("Usuario no encontrado.");

            if (!_hasher.Verify(passwordActual, usuario.PasswordHash))
                throw new DomainError("La contraseña actual es incorrecta.");

            var nuevoHash = _hasher.Hash(passwordNueva);
            var cambios = new Dictionary<string, object> { { "passwordHash", nuevoHash } };
            return await _usuarioRepo.Actualizar(usuarioId, cambios);
        }

        // HU-05: recuperación — respuesta genérica siempre
        public async Task<object> SolicitarRecuperacion(string correo)
        {
            var usuario = await _usuarioRepo.BuscarPorCorreo(correo);
            if (usuario == null) return new { success = true }; // Mismo mensaje sin importar

            var token = Guid.NewGuid().ToString("N");
            var tokenHash = _hasher.Hash(token);
            await _usuarioRepo.CrearResetToken(usuario.Id, tokenHash, DateTime.UtcNow.AddHours(1));
            // En producción: enviar correo con enlace que contiene 'token' en texto plano

            return new { success = true };
        }

        public async Task<object> ResetearPassword(string token, string passwordNueva)
        {
            // Obtener tokens activos y comparar con bcrypt
            // (no se puede indexar hash, se compara por lista — Art. Plan Sección 5)
            var tokens = await _usuarioRepo.ListarTokensActivos(""); // busca sin filtro de usuario
            PasswordResetToken? tokenValido = null;

            foreach (var t in tokens)
            {
                if (_hasher.Verify(token, t.TokenHash))
                {
                    tokenValido = t;
                    break;
                }
            }

            if (tokenValido == null)
                throw new DomainError("Este enlace ya no es válido, solicita uno nuevo.");

            var nuevoHash = _hasher.Hash(passwordNueva);
            var cambios = new Dictionary<string, object> { { "passwordHash", nuevoHash } };
            await _usuarioRepo.Actualizar(tokenValido.UsuarioId, cambios);
            await _usuarioRepo.MarcarTokenUsado(tokenValido.Id);

            return new { success = true };
        }
    }

    // Interfaz para hashing (inyectable en tests con mock simple)
    public interface IPasswordHasher
    {
        string Hash(string password);
        bool Verify(string password, string hash);
    }

    // Implementación real con BCrypt (instalar NuGet: BCrypt.Net-Next)
    public class BcryptHasher : IPasswordHasher
    {
        public string Hash(string password) => BCrypt.Net.BCrypt.HashPassword(password);
        public bool Verify(string password, string hash) => BCrypt.Net.BCrypt.Verify(password, hash);
    }
}
