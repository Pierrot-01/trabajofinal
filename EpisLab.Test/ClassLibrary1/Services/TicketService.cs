// Services/TicketService.cs
// Equivalente a: lib/services/ticket.service.ts
// Lógica de negocio del módulo de Tickets (Incidencias y Solicitudes)
using SistemaGestionLaboratorios.Errors;
using SistemaGestionLaboratorios.Models;

namespace SistemaGestionLaboratorios.Services
{
    // =========================================================================
    // Interfaces de repositorios (para poder inyectar mocks en las pruebas)
    // Equivalente a los vi.mock() de Vitest
    // =========================================================================
    public interface ITicketRepository
    {
        Task<Ticket?> BuscarPorId(string id);
        Task<Ticket> Crear(Ticket ticket);
        Task<List<Ticket>> BuscarPorEquipoYEstado(string equipoId, List<EstadoTicket> estados);
        Task<Ticket> AsignarTecnico(string ticketId, string tecnicoId);
        Task<Ticket> ActualizarEstado(string ticketId, EstadoTicket nuevoEstado, string? comentarioCierre);
        Task<int> ContarPorEquipoYEstados(string equipoId, List<EstadoTicket> estados);
        Task<Comentario> CrearComentario(string ticketId, string usuarioId, string contenido);
    }

    public interface IEquipoRepositoryForTickets
    {
        Task<Equipo?> BuscarPorId(string id);
        Task<Equipo> ActualizarEstado(string equipoId, EstadoEquipo nuevoEstado);
    }

    public class Comentario
    {
        public string Id { get; set; } = string.Empty;
        public string TicketId { get; set; } = string.Empty;
        public string UsuarioId { get; set; } = string.Empty;
        public string Contenido { get; set; } = string.Empty;
        public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
    }

    // =========================================================================
    // TicketService — lógica de negocio
    // =========================================================================
    public class TicketService
    {
        private readonly ITicketRepository _ticketRepo;
        private readonly IEquipoRepositoryForTickets _equipoRepo;

        public TicketService(ITicketRepository ticketRepo, IEquipoRepositoryForTickets equipoRepo)
        {
            _ticketRepo = ticketRepo;
            _equipoRepo = equipoRepo;
        }

        // -----------------------------------------------------------------------
        // calcularPrioridad (T029) — Al vuelo, no se guarda en BD (Clarify #2)
        // -----------------------------------------------------------------------
        public string CalcularPrioridad(Ticket ticket, DateTime? ahora = null)
        {
            var now = ahora ?? DateTime.UtcNow;

            if (ticket.Tipo == TipoTicket.Incidencia)
            {
                if (ticket.Categoria == CategoriaTicket.Hardware) return "alta";
                return "media"; // software_general, red
            }

            // Solicitud
            if (ticket.FechaLimite == null) return "baja";
            var horasRestantes = (ticket.FechaLimite.Value - now).TotalHours;
            if (horasRestantes <= 48) return "alta";
            if (horasRestantes <= 168) return "media"; // 7 días
            return "baja";
        }

        // -----------------------------------------------------------------------
        // estaAtrasado (T030) — pendiente sin asignar >48h
        // -----------------------------------------------------------------------
        public bool EstaAtrasado(Ticket ticket, DateTime? ahora = null)
        {
            var now = ahora ?? DateTime.UtcNow;
            if (ticket.TecnicoAsignadoId != null) return false;
            if (ticket.Estado != EstadoTicket.Pendiente) return false;
            var horasDesdeCreacion = (now - ticket.FechaCreacion).TotalHours;
            return horasDesdeCreacion > 48;
        }

        // -----------------------------------------------------------------------
        // crear (T016–T018, T025–T026, T057b–T057c)
        // -----------------------------------------------------------------------
        public async Task<ApiResponse<Ticket>> Crear(Ticket input, string usuarioId, Rol rol)
        {
            // Edge case 2: el equipo debe existir
            var equipo = await _equipoRepo.BuscarPorId(input.EquipoId);
            if (equipo == null)
                throw new DomainError($"El equipo '{input.EquipoId}' no existe.");

            // T057b/T057c: validar ticket relacionado
            if (input.TicketRelacionadoId != null)
            {
                var relacionado = await _ticketRepo.BuscarPorId(input.TicketRelacionadoId);
                if (relacionado == null || relacionado.Estado != EstadoTicket.Resuelto)
                    throw new DomainError("El ticket relacionado debe ser uno de los resueltos del mismo equipo.");
            }

            // T018: advertir si ya hay incidencia abierta en el mismo equipo
            string? warning = null;
            if (input.Tipo == TipoTicket.Incidencia)
            {
                var abiertos = await _ticketRepo.BuscarPorEquipoYEstado(
                    input.EquipoId,
                    new List<EstadoTicket> { EstadoTicket.Pendiente, EstadoTicket.EnProceso }
                );
                if (abiertos.Any(t => t.Tipo == TipoTicket.Incidencia))
                    warning = "Ya existe un ticket abierto para este equipo";
            }

            input.UsuarioReportaId = usuarioId;
            input.Estado = EstadoTicket.Pendiente;
            input.FechaCreacion = DateTime.UtcNow;

            var ticket = await _ticketRepo.Crear(input);
            return ApiResponseHelper.Ok(ticket, warning);
        }

        // -----------------------------------------------------------------------
        // asignar (T032–T033)
        // -----------------------------------------------------------------------
        public async Task<Ticket> Asignar(string ticketId, string tecnicoId, Rol rol)
        {
            var ticket = await _ticketRepo.BuscarPorId(ticketId)
                ?? throw new DomainError("Ticket no encontrado.");

            if (ticket.TecnicoAsignadoId != null)
                throw new DomainError("Este ticket ya fue asignado a otro técnico.");

            return await _ticketRepo.AsignarTecnico(ticketId, tecnicoId);
        }

        // -----------------------------------------------------------------------
        // reasignar (T034) — solo admin
        // -----------------------------------------------------------------------
        public async Task<Ticket> Reasignar(string ticketId, string nuevoTecnicoId, Rol rol)
        {
            if (rol != Rol.Admin)
                throw new DomainError("Solo un administrador puede reasignar tickets ya asignados.");

            var ticket = await _ticketRepo.BuscarPorId(ticketId)
                ?? throw new DomainError("Ticket no encontrado.");

            return await _ticketRepo.AsignarTecnico(ticketId, nuevoTecnicoId);
        }

        // -----------------------------------------------------------------------
        // cambiarEstado (T036–T039) + efectos automáticos (T042–T044)
        // -----------------------------------------------------------------------
        public async Task<Ticket> CambiarEstado(
            string ticketId, EstadoTicket nuevoEstado,
            string? comentarioCierre, string usuarioId, Rol rol)
        {
            // Edge case 5: solo técnico/admin
            if (rol != Rol.Tecnico && rol != Rol.Admin)
                throw new DomainError("No tienes permisos para cambiar el estado de un ticket.");

            var ticket = await _ticketRepo.BuscarPorId(ticketId)
                ?? throw new DomainError("Ticket no encontrado.");

            // T037: transiciones válidas
            var transicionesValidas = new Dictionary<EstadoTicket, EstadoTicket>
            {
                { EstadoTicket.Pendiente, EstadoTicket.EnProceso },
                { EstadoTicket.EnProceso, EstadoTicket.Resuelto }
            };

            if (!transicionesValidas.TryGetValue(ticket.Estado, out var estadoPermitido)
                || estadoPermitido != nuevoEstado)
                throw new DomainError($"Transición inválida: {ticket.Estado} → {nuevoEstado}.");

            // T038: comentario obligatorio al resolver
            if (nuevoEstado == EstadoTicket.Resuelto)
            {
                if (string.IsNullOrEmpty(comentarioCierre) || comentarioCierre.Length < 5)
                    throw new DomainError("El comentario de cierre debe tener mínimo 5 caracteres.");
            }

            var ticketActualizado = await _ticketRepo.ActualizarEstado(ticketId, nuevoEstado, comentarioCierre);

            // T042–T043: efectos automáticos en hardware
            if (nuevoEstado == EstadoTicket.Resuelto && ticket.Tipo == TipoTicket.Incidencia
                && ticket.Categoria == CategoriaTicket.Hardware)
            {
                var otrosAbiertos = await _ticketRepo.ContarPorEquipoYEstados(
                    ticket.EquipoId,
                    new List<EstadoTicket> { EstadoTicket.Pendiente, EstadoTicket.EnProceso }
                );
                var nuevoEstadoEquipo = otrosAbiertos > 0
                    ? EstadoEquipo.Mantenimiento
                    : EstadoEquipo.Operativo;
                await _equipoRepo.ActualizarEstado(ticket.EquipoId, nuevoEstadoEquipo);
            }
            // T044: solicitud de software resuelta (no actualiza equipo, solo registra)

            return ticketActualizado;
        }

        // -----------------------------------------------------------------------
        // agregarComentario (T055–T056)
        // -----------------------------------------------------------------------
        public async Task<Comentario> AgregarComentario(string ticketId, string usuarioId, string contenido)
        {
            var ticket = await _ticketRepo.BuscarPorId(ticketId)
                ?? throw new DomainError("Ticket no encontrado.");

            if (ticket.Estado == EstadoTicket.Resuelto)
                throw new DomainError("No se pueden agregar comentarios a un ticket resuelto.");

            return await _ticketRepo.CrearComentario(ticketId, usuarioId, contenido);
        }
    }
}
