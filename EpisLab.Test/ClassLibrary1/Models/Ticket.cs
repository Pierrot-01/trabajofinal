// Models/Ticket.cs
namespace SistemaGestionLaboratorios.Models
{
    public class Ticket
    {
        public string Id { get; set; } = string.Empty;
        public TipoTicket Tipo { get; set; }
        public CategoriaTicket Categoria { get; set; }
        public string Descripcion { get; set; } = string.Empty;
        public EstadoTicket Estado { get; set; }
        public string EquipoId { get; set; } = string.Empty;
        public string UsuarioReportaId { get; set; } = string.Empty;
        public string? TecnicoAsignadoId { get; set; }
        public string? ComentarioCierre { get; set; }
        public string? SoftwareTexto { get; set; }
        public string? SoftwareId { get; set; }
        public string? TicketRelacionadoId { get; set; }
        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
        public DateTime? FechaCierre { get; set; }
        public DateTime? FechaLimite { get; set; }
        public Equipo? Equipo { get; set; }
    }
}
