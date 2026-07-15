// Models/PasswordResetToken.cs
namespace SistemaGestionLaboratorios.Models
{
    public class PasswordResetToken
    {
        public string Id { get; set; } = string.Empty;
        public string UsuarioId { get; set; } = string.Empty;
        public string TokenHash { get; set; } = string.Empty;
        public DateTime ExpiraEn { get; set; }
        public bool Usado { get; set; } = false;
    }
}