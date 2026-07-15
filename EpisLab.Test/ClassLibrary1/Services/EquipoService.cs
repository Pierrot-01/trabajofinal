// Services/EquipoService.cs
// Equivalente a: lib/services/equipo.service.ts
using SistemaGestionLaboratorios.Errors;
using SistemaGestionLaboratorios.Models;

namespace SistemaGestionLaboratorios.Services
{
    public interface IEquipoRepository
    {
        Task<Equipo?> BuscarPorCodigo(string codigo);
        Task<Equipo> Crear(Equipo equipo);
        Task<Equipo> Editar(string equipoId, EstadoEquipo nuevoEstado);
        Task<Equipo> ActualizarEstado(string equipoId, EstadoEquipo nuevoEstado);
        Task<int> ContarTicketsAbiertos(string equipoId);
    }

    public interface ILaboratorioRepository
    {
        Task<Laboratorio?> BuscarPorId(string id);
    }

    public class EquipoService
    {
        private readonly IEquipoRepository _equipoRepo;
        private readonly ILaboratorioRepository _labRepo;

        public EquipoService(IEquipoRepository equipoRepo, ILaboratorioRepository labRepo)
        {
            _equipoRepo = equipoRepo;
            _labRepo = labRepo;
        }

        // T208–T210: crear equipo
        public async Task<Equipo> Crear(string codigoInventario, string laboratorioId)
        {
            var lab = await _labRepo.BuscarPorId(laboratorioId);
            if (lab == null)
                throw new DomainError("El laboratorio no existe.");

            var existente = await _equipoRepo.BuscarPorCodigo(codigoInventario);
            if (existente != null)
                throw new DomainError($"Este código de inventario ya está registrado.");

            return await _equipoRepo.Crear(new Equipo
            {
                CodigoInventario = codigoInventario,
                LaboratorioId = laboratorioId,
                Estado = EstadoEquipo.Operativo
            });
        }

        // T212–T213: editar estado (advertencia, NO bloqueo)
        public async Task<ApiResponse<Equipo>> EditarEstado(string equipoId, EstadoEquipo nuevoEstado)
        {
            var equipoActualizado = await _equipoRepo.Editar(equipoId, nuevoEstado);
            var ticketsAbiertos = await _equipoRepo.ContarTicketsAbiertos(equipoId);

            if (ticketsAbiertos > 0)
                return ApiResponseHelper.Ok(equipoActualizado,
                    "Este equipo tiene tickets abiertos que podrían quedar inconsistentes con el nuevo estado.");

            return ApiResponseHelper.Ok(equipoActualizado);
        }

        // T216–T217: dar de baja (BLOQUEO real, distinto de editarEstado)
        public async Task<Equipo> DarDeBaja(string equipoId)
        {
            var ticketsAbiertos = await _equipoRepo.ContarTicketsAbiertos(equipoId);
            if (ticketsAbiertos > 0)
                throw new DomainError(
                    "No se puede dar de baja un equipo con tickets abiertos. Resuélvelos primero.");

            return await _equipoRepo.ActualizarEstado(equipoId, EstadoEquipo.DadoDeBaja);
        }
    }
}
