// Models/Software.cs
namespace SistemaGestionLaboratorios.Models
{
    public class Software
    {
        public string Id { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;
        public TipoSoftware Tipo { get; set; }
        public string? Version { get; set; }
    }
}
