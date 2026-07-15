// Models/Equipo.cs
namespace SistemaGestionLaboratorios.Models
{
    public class Equipo
    {
        public string Id { get; set; } = string.Empty;
        public string CodigoInventario { get; set; } = string.Empty;
        public string LaboratorioId { get; set; } = string.Empty;
        public EstadoEquipo Estado { get; set; } = EstadoEquipo.Operativo;
    }

    public class Laboratorio
    {
        public string Id { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;
        public string Ubicacion { get; set; } = string.Empty;
        public int Capacidad { get; set; }
    }
}
