// Services/SoftwareService.cs
// Equivalente a: lib/services/software.service.ts
using SistemaGestionLaboratorios.Errors;
using SistemaGestionLaboratorios.Models;

namespace SistemaGestionLaboratorios.Services
{
    public interface ISoftwareRepository
    {
        Task<Software?> BuscarPorNombre(string nombre);
        Task<Software> Crear(Software software);
        Task<Software> Editar(string id, Software datos);
        Task<Software> Eliminar(string id);
        Task<int> ContarRelaciones(string softwareId);
    }

    public class SoftwareService
    {
        private readonly ISoftwareRepository _softwareRepo;

        public SoftwareService(ISoftwareRepository softwareRepo)
        {
            _softwareRepo = softwareRepo;
        }

        // T302–T303
        public async Task<Software> Crear(string nombre, TipoSoftware tipo, string? version = null)
        {
            var existente = await _softwareRepo.BuscarPorNombre(nombre);
            if (existente != null)
                throw new DomainError("Este software ya está en el catálogo.");

            return await _softwareRepo.Crear(new Software
            {
                Nombre = nombre,
                Tipo = tipo,
                Version = version
            });
        }

        // T306–T308
        public async Task<Software> Eliminar(string softwareId)
        {
            var relaciones = await _softwareRepo.ContarRelaciones(softwareId);
            if (relaciones > 0)
                throw new DomainError(
                    "Este software está en uso y no se puede eliminar.");

            return await _softwareRepo.Eliminar(softwareId);
        }
    }
}
