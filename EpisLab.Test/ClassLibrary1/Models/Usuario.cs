// Models/Usuario.cs — REEMPLAZA el contenido completo
namespace SistemaGestionLaboratorios.Models
{
    public class Usuario
    {
        public string Id { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;
        public string Correo { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public Rol Rol { get; set; }
        public bool Activo { get; set; } = true;
        // Para bloqueo temporal (Edge case 5 — HU-01)
        public int? IntentosFallidos { get; set; } = 0;
        public DateTime? BloqueadoHasta { get; set; } = null;
    }
}