// Models/Enums.cs
namespace SistemaGestionLaboratorios.Models
{
    public enum Rol { Admin, Tecnico, Docente, Estudiante }
    public enum EstadoEquipo { Operativo, Mantenimiento, Inoperativo, DadoDeBaja }
    public enum TipoTicket { Incidencia, Solicitud }
    public enum CategoriaTicket { Hardware, SoftwareLicencia, SoftwareGeneral, Red }
    public enum EstadoTicket { Pendiente, EnProceso, Resuelto }
    public enum TipoSoftware { Licenciado, Gratuito }
}
