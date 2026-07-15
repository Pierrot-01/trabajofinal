// Errors/DomainError.cs
// Equivalente a: lib/errors/domain-error.ts
// Se usa para errores de lógica de negocio (equipo inexistente, ticket ya asignado, etc.)
namespace SistemaGestionLaboratorios.Errors
{
    public class DomainError : Exception
    {
        public DomainError(string mensaje) : base(mensaje) { }
    }
}
