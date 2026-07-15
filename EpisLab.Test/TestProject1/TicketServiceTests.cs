// TicketServiceTests.cs
// Equivalente a: tests/unit/ticket.service.test.ts
using Moq;
using SistemaGestionLaboratorios.Errors;
using SistemaGestionLaboratorios.Models;
using SistemaGestionLaboratorios.Services;
using Xunit;

namespace SistemaGestionLaboratorios.Tests
{
    public class TicketServiceTests
    {
        // -----------------------------------------------------------------------
        // Setup: mocks de repositorios (equivalente a vi.mock() en Vitest)
        // -----------------------------------------------------------------------
        private readonly Mock<ITicketRepository> _ticketRepoMock = new();
        private readonly Mock<IEquipoRepositoryForTickets> _equipoRepoMock = new();
        private TicketService _service;

        private readonly Equipo _equipoOperativo = new()
        {
            Id = "eq-1",
            CodigoInventario = "LAB01-PC01",
            LaboratorioId = "lab-1",
            Estado = EstadoEquipo.Operativo
        };

        private readonly Ticket _ticketPendiente;
        private readonly Ticket _ticketResuelto;

        public TicketServiceTests()
        {
            _service = new TicketService(_ticketRepoMock.Object, _equipoRepoMock.Object);

            _ticketPendiente = new Ticket
            {
                Id = "tkt-pendiente",
                EquipoId = "eq-1",
                Tipo = TipoTicket.Incidencia,
                Categoria = CategoriaTicket.Hardware,
                Estado = EstadoTicket.Pendiente,
                FechaCreacion = DateTime.UtcNow,
                TecnicoAsignadoId = null,
                Equipo = _equipoOperativo
            };

            _ticketResuelto = new Ticket
            {
                Id = "tkt-resuelto",
                EquipoId = "eq-1",
                Tipo = TipoTicket.Incidencia,
                Categoria = CategoriaTicket.Hardware,
                Estado = EstadoTicket.Resuelto,
                FechaCreacion = new DateTime(2026, 1, 1),
                FechaCierre = new DateTime(2026, 1, 2),
                TecnicoAsignadoId = "tec-1",
                Equipo = _equipoOperativo
            };
        }

        // ===================================================================
        // CalcularPrioridad (T029)
        // ===================================================================

        [Fact]
        public void T029_IncidenciaHardware_RetornaAlta()
        {
            var t = new Ticket { Tipo = TipoTicket.Incidencia, Categoria = CategoriaTicket.Hardware };
            Assert.Equal("alta", _service.CalcularPrioridad(t));
        }

        [Fact]
        public void T029_IncidenciaSoftwareGeneral_RetornaMedia()
        {
            var t = new Ticket { Tipo = TipoTicket.Incidencia, Categoria = CategoriaTicket.SoftwareGeneral };
            Assert.Equal("media", _service.CalcularPrioridad(t));
        }

        [Fact]
        public void T029_IncidenciaRed_RetornaMedia()
        {
            var t = new Ticket { Tipo = TipoTicket.Incidencia, Categoria = CategoriaTicket.Red };
            Assert.Equal("media", _service.CalcularPrioridad(t));
        }

        [Fact]
        public void T029_SolicitudSinFechaLimite_RetornaBaja()
        {
            var t = new Ticket { Tipo = TipoTicket.Solicitud, Categoria = CategoriaTicket.SoftwareLicencia, FechaLimite = null };
            Assert.Equal("baja", _service.CalcularPrioridad(t));
        }

        [Fact]
        public void T029_SolicitudFechaLimite24h_RetornaAlta()
        {
            var ahora = DateTime.UtcNow;
            var t = new Ticket
            {
                Tipo = TipoTicket.Solicitud,
                Categoria = CategoriaTicket.SoftwareLicencia,
                FechaLimite = ahora.AddHours(24)
            };
            Assert.Equal("alta", _service.CalcularPrioridad(t, ahora));
        }

        [Fact]
        public void T029_SolicitudFechaLimite5Dias_RetornaMedia()
        {
            var ahora = DateTime.UtcNow;
            var t = new Ticket
            {
                Tipo = TipoTicket.Solicitud,
                Categoria = CategoriaTicket.SoftwareLicencia,
                FechaLimite = ahora.AddDays(5)
            };
            Assert.Equal("media", _service.CalcularPrioridad(t, ahora));
        }

        [Fact]
        public void T029_SolicitudFechaLimite10Dias_RetornaBaja()
        {
            var ahora = DateTime.UtcNow;
            var t = new Ticket
            {
                Tipo = TipoTicket.Solicitud,
                Categoria = CategoriaTicket.SoftwareLicencia,
                FechaLimite = ahora.AddDays(10)
            };
            Assert.Equal("baja", _service.CalcularPrioridad(t, ahora));
        }

        // ===================================================================
        // EstaAtrasado (T030)
        // ===================================================================

        [Fact]
        public void T030_PendienteSinAsignarMas48h_EsAtrasado()
        {
            var ahora = DateTime.UtcNow;
            var t = new Ticket
            {
                Estado = EstadoTicket.Pendiente,
                TecnicoAsignadoId = null,
                FechaCreacion = ahora.AddHours(-49)
            };
            Assert.True(_service.EstaAtrasado(t, ahora));
        }

        [Fact]
        public void T030_PendienteSinAsignar47h_NoEsAtrasado()
        {
            var ahora = DateTime.UtcNow;
            var t = new Ticket
            {
                Estado = EstadoTicket.Pendiente,
                TecnicoAsignadoId = null,
                FechaCreacion = ahora.AddHours(-47)
            };
            Assert.False(_service.EstaAtrasado(t, ahora));
        }

        [Fact]
        public void T030_ConTecnicoAsignado_NuncaAtrasado()
        {
            var ahora = DateTime.UtcNow;
            var t = new Ticket
            {
                Estado = EstadoTicket.Pendiente,
                TecnicoAsignadoId = "tec-1",
                FechaCreacion = ahora.AddHours(-100)
            };
            Assert.False(_service.EstaAtrasado(t, ahora));
        }

        [Fact]
        public void T030_EnProceso_NuncaAtrasado()
        {
            var ahora = DateTime.UtcNow;
            var t = new Ticket
            {
                Estado = EstadoTicket.EnProceso,
                TecnicoAsignadoId = null,
                FechaCreacion = ahora.AddHours(-100)
            };
            Assert.False(_service.EstaAtrasado(t, ahora));
        }

        // ===================================================================
        // Crear (T016–T018)
        // ===================================================================

        [Fact]
        public async Task T016_CrearTicketConEquipoExistente_Exito()
        {
            _equipoRepoMock.Setup(r => r.BuscarPorId("eq-1")).ReturnsAsync(_equipoOperativo);
            _ticketRepoMock.Setup(r => r.Crear(It.IsAny<Ticket>()))
                .ReturnsAsync(new Ticket { Id = "tkt-new" });
            _ticketRepoMock.Setup(r => r.BuscarPorEquipoYEstado(It.IsAny<string>(), It.IsAny<List<EstadoTicket>>()))
                .ReturnsAsync(new List<Ticket>());
            _ticketRepoMock.Setup(r => r.BuscarPorId(It.IsAny<string>())).ReturnsAsync((Ticket?)null);

            var input = new Ticket
            {
                Tipo = TipoTicket.Incidencia,
                Categoria = CategoriaTicket.Hardware,
                Descripcion = "PC no enciende correctamente",
                EquipoId = "eq-1"
            };

            var res = await _service.Crear(input, "usr-1", Rol.Docente);
            Assert.True(res.Success);
            Assert.Equal("tkt-new", res.Data?.Id);
            Assert.Null(res.Warning);
        }

        [Fact]
        public async Task T017_EquipoInexistente_LanzaDomainError()
        {
            _equipoRepoMock.Setup(r => r.BuscarPorId("eq-x")).ReturnsAsync((Equipo?)null);

            var input = new Ticket { EquipoId = "eq-x", Tipo = TipoTicket.Incidencia, Categoria = CategoriaTicket.Hardware };
            var ex = await Assert.ThrowsAsync<DomainError>(() => _service.Crear(input, "usr-1", Rol.Docente));
            Assert.Contains("no existe", ex.Message);
        }

        [Fact]
        public async Task T018_IncidenciaDuplicadaMismoEquipo_SuccessConWarning()
        {
            _equipoRepoMock.Setup(r => r.BuscarPorId("eq-1")).ReturnsAsync(_equipoOperativo);
            _ticketRepoMock.Setup(r => r.Crear(It.IsAny<Ticket>()))
                .ReturnsAsync(new Ticket { Id = "tkt-dup" });
            _ticketRepoMock.Setup(r => r.BuscarPorEquipoYEstado(It.IsAny<string>(), It.IsAny<List<EstadoTicket>>()))
                .ReturnsAsync(new List<Ticket> { new() { Tipo = TipoTicket.Incidencia, Estado = EstadoTicket.Pendiente } });

            var input = new Ticket { EquipoId = "eq-1", Tipo = TipoTicket.Incidencia, Categoria = CategoriaTicket.Hardware };
            var res = await _service.Crear(input, "usr-1", Rol.Docente);

            Assert.True(res.Success);
            Assert.NotNull(res.Warning);
        }

        // ===================================================================
        // Asignar (T032–T033)
        // ===================================================================

        [Fact]
        public async Task T032_TecnicoAsignaTicketSinDueno_Exito()
        {
            _ticketRepoMock.Setup(r => r.BuscarPorId("tkt-pendiente"))
                .ReturnsAsync(new Ticket { Id = "tkt-pendiente", TecnicoAsignadoId = null, Estado = EstadoTicket.Pendiente });
            _ticketRepoMock.Setup(r => r.AsignarTecnico("tkt-pendiente", "tec-1"))
                .ReturnsAsync(new Ticket { Id = "tkt-pendiente", TecnicoAsignadoId = "tec-1" });

            await _service.Asignar("tkt-pendiente", "tec-1", Rol.Tecnico);
            _ticketRepoMock.Verify(r => r.AsignarTecnico("tkt-pendiente", "tec-1"), Times.Once);
        }

        [Fact]
        public async Task T033_TicketYaAsignado_LanzaDomainError()
        {
            _ticketRepoMock.Setup(r => r.BuscarPorId("tkt-pendiente"))
                .ReturnsAsync(new Ticket { Id = "tkt-pendiente", TecnicoAsignadoId = "tec-2" });

            var ex = await Assert.ThrowsAsync<DomainError>(() =>
                _service.Asignar("tkt-pendiente", "tec-1", Rol.Tecnico));
            Assert.Contains("ya fue asignado", ex.Message);
        }

        // ===================================================================
        // Reasignar (T034)
        // ===================================================================

        [Fact]
        public async Task T034a_AdminReasigna_Exito()
        {
            _ticketRepoMock.Setup(r => r.BuscarPorId("tkt-pendiente"))
                .ReturnsAsync(new Ticket { Id = "tkt-pendiente", TecnicoAsignadoId = "tec-2" });
            _ticketRepoMock.Setup(r => r.AsignarTecnico(It.IsAny<string>(), It.IsAny<string>()))
                .ReturnsAsync(new Ticket());

            await _service.Reasignar("tkt-pendiente", "tec-1", Rol.Admin);
            _ticketRepoMock.Verify(r => r.AsignarTecnico(It.IsAny<string>(), It.IsAny<string>()), Times.Once);
        }

        [Fact]
        public async Task T034b_TecnicoNoAdminReasigna_LanzaDomainError()
        {
            var ex = await Assert.ThrowsAsync<DomainError>(() =>
                _service.Reasignar("tkt-pendiente", "tec-1", Rol.Tecnico));
            Assert.Contains("Solo un administrador", ex.Message);
        }

        // ===================================================================
        // CambiarEstado (T036–T039)
        // ===================================================================

        [Fact]
        public async Task T036_DocenteCambiaEstado_LanzaDomainError()
        {
            var ex = await Assert.ThrowsAsync<DomainError>(() =>
                _service.CambiarEstado("tkt-1", EstadoTicket.EnProceso, null, "usr-1", Rol.Docente));
            Assert.Contains("permisos", ex.Message);
        }

        [Fact]
        public async Task T037_TransicionResueltoPendiente_LanzaDomainError()
        {
            _ticketRepoMock.Setup(r => r.BuscarPorId("tkt-resuelto"))
                .ReturnsAsync(new Ticket { Estado = EstadoTicket.Resuelto });

            var ex = await Assert.ThrowsAsync<DomainError>(() =>
                _service.CambiarEstado("tkt-resuelto", EstadoTicket.Pendiente, null, "tec-1", Rol.Tecnico));
            Assert.Contains("Transición inválida", ex.Message);
        }

        [Fact]
        public async Task T038_ResolverSinComentarioCierre_LanzaDomainError()
        {
            _ticketRepoMock.Setup(r => r.BuscarPorId("tkt-pendiente"))
                .ReturnsAsync(new Ticket { Estado = EstadoTicket.EnProceso });

            var ex = await Assert.ThrowsAsync<DomainError>(() =>
                _service.CambiarEstado("tkt-pendiente", EstadoTicket.Resuelto, "ok", "tec-1", Rol.Tecnico));
            Assert.Contains("mínimo 5", ex.Message);
        }

        [Fact]
        public async Task T039_ResolverConComentarioValido_Exito()
        {
            _ticketRepoMock.Setup(r => r.BuscarPorId("tkt-pendiente"))
                .ReturnsAsync(new Ticket
                {
                    Id = "tkt-pendiente",
                    Estado = EstadoTicket.EnProceso,
                    Tipo = TipoTicket.Incidencia,
                    Categoria = CategoriaTicket.Hardware,
                    EquipoId = "eq-1"
                });
            _ticketRepoMock.Setup(r => r.ActualizarEstado(It.IsAny<string>(), It.IsAny<EstadoTicket>(), It.IsAny<string?>()))
                .ReturnsAsync(new Ticket { Id = "tkt-pendiente", Estado = EstadoTicket.Resuelto });
            _ticketRepoMock.Setup(r => r.ContarPorEquipoYEstados(It.IsAny<string>(), It.IsAny<List<EstadoTicket>>()))
                .ReturnsAsync(0);
            _equipoRepoMock.Setup(r => r.ActualizarEstado(It.IsAny<string>(), It.IsAny<EstadoEquipo>()))
                .ReturnsAsync(new Equipo());

            var res = await _service.CambiarEstado("tkt-pendiente", EstadoTicket.Resuelto, "Se reemplazó el disco duro", "tec-1", Rol.Tecnico);
            Assert.Equal(EstadoTicket.Resuelto, res.Estado);
        }

        // ===================================================================
        // Efectos automáticos al resolver (T042–T044)
        // ===================================================================

        [Fact]
        public async Task T042_HardwareResueltoSinOtrosTickets_EquipoOperativo()
        {
            _ticketRepoMock.Setup(r => r.BuscarPorId("tkt-pendiente"))
                .ReturnsAsync(new Ticket
                {
                    Id = "tkt-pendiente",
                    Estado = EstadoTicket.EnProceso,
                    Tipo = TipoTicket.Incidencia,
                    Categoria = CategoriaTicket.Hardware,
                    EquipoId = "eq-1"
                });
            _ticketRepoMock.Setup(r => r.ActualizarEstado(It.IsAny<string>(), It.IsAny<EstadoTicket>(), It.IsAny<string?>()))
                .ReturnsAsync(new Ticket { Estado = EstadoTicket.Resuelto });
            _ticketRepoMock.Setup(r => r.ContarPorEquipoYEstados(It.IsAny<string>(), It.IsAny<List<EstadoTicket>>()))
                .ReturnsAsync(0);
            _equipoRepoMock.Setup(r => r.ActualizarEstado(It.IsAny<string>(), It.IsAny<EstadoEquipo>()))
                .ReturnsAsync(new Equipo());

            await _service.CambiarEstado("tkt-pendiente", EstadoTicket.Resuelto, "Reparado exitosamente", "tec-1", Rol.Tecnico);
            _equipoRepoMock.Verify(r => r.ActualizarEstado("eq-1", EstadoEquipo.Operativo), Times.Once);
        }

        [Fact]
        public async Task T043_HardwareResueltoConOtrosTicketsAbiertos_EquipoMantenimiento()
        {
            _ticketRepoMock.Setup(r => r.BuscarPorId("tkt-pendiente"))
                .ReturnsAsync(new Ticket
                {
                    Id = "tkt-pendiente",
                    Estado = EstadoTicket.EnProceso,
                    Tipo = TipoTicket.Incidencia,
                    Categoria = CategoriaTicket.Hardware,
                    EquipoId = "eq-1"
                });
            _ticketRepoMock.Setup(r => r.ActualizarEstado(It.IsAny<string>(), It.IsAny<EstadoTicket>(), It.IsAny<string?>()))
                .ReturnsAsync(new Ticket { Estado = EstadoTicket.Resuelto });
            _ticketRepoMock.Setup(r => r.ContarPorEquipoYEstados(It.IsAny<string>(), It.IsAny<List<EstadoTicket>>()))
                .ReturnsAsync(2);
            _equipoRepoMock.Setup(r => r.ActualizarEstado(It.IsAny<string>(), It.IsAny<EstadoEquipo>()))
                .ReturnsAsync(new Equipo());

            await _service.CambiarEstado("tkt-pendiente", EstadoTicket.Resuelto, "Reparado pero hay más fallas", "tec-1", Rol.Tecnico);
            _equipoRepoMock.Verify(r => r.ActualizarEstado("eq-1", EstadoEquipo.Mantenimiento), Times.Once);
        }

        [Fact]
        public async Task T044_SolicitudSoftwareResuelta_NoActualizaEquipo()
        {
            _ticketRepoMock.Setup(r => r.BuscarPorId("tkt-pendiente"))
                .ReturnsAsync(new Ticket
                {
                    Id = "tkt-pendiente",
                    Estado = EstadoTicket.EnProceso,
                    Tipo = TipoTicket.Solicitud,
                    Categoria = CategoriaTicket.SoftwareLicencia,
                    SoftwareId = "sw-1",
                    EquipoId = "eq-1"
                });
            _ticketRepoMock.Setup(r => r.ActualizarEstado(It.IsAny<string>(), It.IsAny<EstadoTicket>(), It.IsAny<string?>()))
                .ReturnsAsync(new Ticket { Estado = EstadoTicket.Resuelto });

            await _service.CambiarEstado("tkt-pendiente", EstadoTicket.Resuelto, "Software instalado correctamente", "tec-1", Rol.Tecnico);
            _equipoRepoMock.Verify(r => r.ActualizarEstado(It.IsAny<string>(), It.IsAny<EstadoEquipo>()), Times.Never);
        }

        // ===================================================================
        // AgregarComentario (T055–T056)
        // ===================================================================

        [Fact]
        public async Task T055_ComentarioEnTicketPendiente_Exito()
        {
            _ticketRepoMock.Setup(r => r.BuscarPorId("tkt-pendiente"))
                .ReturnsAsync(new Ticket { Estado = EstadoTicket.Pendiente });
            _ticketRepoMock.Setup(r => r.CrearComentario(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .ReturnsAsync(new Comentario { Id = "com-1" });

            await _service.AgregarComentario("tkt-pendiente", "usr-1", "El problema persiste");
            _ticketRepoMock.Verify(r => r.CrearComentario(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Once);
        }

        [Fact]
        public async Task T056_ComentarioEnTicketResuelto_LanzaDomainError()
        {
            _ticketRepoMock.Setup(r => r.BuscarPorId("tkt-resuelto"))
                .ReturnsAsync(new Ticket { Estado = EstadoTicket.Resuelto });

            var ex = await Assert.ThrowsAsync<DomainError>(() =>
                _service.AgregarComentario("tkt-resuelto", "usr-1", "Hola"));
            Assert.Contains("resuelto", ex.Message);
        }

        [Fact]
        public async Task T025_SolicitudConSoftwareDelCatalogo_Exito()
        {
            var input = new Ticket
            {
                Tipo = TipoTicket.Solicitud,
                Categoria = CategoriaTicket.SoftwareLicencia,
                Descripcion = "Necesito SPSS para clase de estadística",
                EquipoId = "eq-1",
                SoftwareId = "sw-1"
            };
            _equipoRepoMock.Setup(r => r.BuscarPorId("eq-1")).ReturnsAsync(_equipoOperativo);
            _ticketRepoMock.Setup(r => r.Crear(It.IsAny<Ticket>())).ReturnsAsync(new Ticket { Id = "tkt-sol", SoftwareId = "sw-1" });

            var res = await _service.Crear(input, "usr-docente", Rol.Docente);
            Assert.True(res.Success);
            _ticketRepoMock.Verify(r => r.Crear(It.Is<Ticket>(t => t.SoftwareId == "sw-1")), Times.Once);
        }

        [Fact]
        public async Task T026_SolicitudTextoLibreNoCreaEntradaEnSoftware()
        {
            var input = new Ticket
            {
                Tipo = TipoTicket.Solicitud,
                Categoria = CategoriaTicket.SoftwareGeneral,
                Descripcion = "Instalar Notepad++ en este equipo",
                EquipoId = "eq-1",
                SoftwareTexto = "Notepad++"
            };
            _equipoRepoMock.Setup(r => r.BuscarPorId("eq-1")).ReturnsAsync(_equipoOperativo);
            _ticketRepoMock.Setup(r => r.Crear(It.IsAny<Ticket>())).ReturnsAsync(new Ticket { Id = "tkt-libre", SoftwareTexto = "Notepad++" });

            var res = await _service.Crear(input, "usr-docente", Rol.Docente);
            Assert.True(res.Success);
            _ticketRepoMock.Verify(r => r.Crear(It.Is<Ticket>(t => t.SoftwareTexto == "Notepad++")), Times.Once);
        }

        [Fact]
        public async Task T057b_TicketRelacionadoAResueltoDelMismoEquipo_Exito()
        {
            var input = new Ticket
            {
                Tipo = TipoTicket.Incidencia,
                Categoria = CategoriaTicket.Hardware,
                Descripcion = "PC no enciende",
                EquipoId = "eq-1",
                TicketRelacionadoId = "tkt-resuelto"
            };
            _equipoRepoMock.Setup(r => r.BuscarPorId("eq-1")).ReturnsAsync(_equipoOperativo);
            _ticketRepoMock.Setup(r => r.BuscarPorId("tkt-resuelto")).ReturnsAsync(_ticketResuelto);
            _ticketRepoMock.Setup(r => r.BuscarPorEquipoYEstado(It.IsAny<string>(), It.IsAny<List<EstadoTicket>>()))
                .ReturnsAsync(new List<Ticket>());
            _ticketRepoMock.Setup(r => r.Crear(It.IsAny<Ticket>())).ReturnsAsync(new Ticket { Id = "tkt-hijo", TicketRelacionadoId = "tkt-resuelto" });

            var res = await _service.Crear(input, "usr-1", Rol.Docente);
            Assert.True(res.Success);
        }

        [Fact]
        public async Task T057c_TicketRelacionadoNoResuelto_LanzaDomainError()
        {
            var input = new Ticket
            {
                Tipo = TipoTicket.Incidencia,
                Categoria = CategoriaTicket.Hardware,
                Descripcion = "PC no enciende",
                EquipoId = "eq-1",
                TicketRelacionadoId = "tkt-pendiente"
            };
            _equipoRepoMock.Setup(r => r.BuscarPorId("eq-1")).ReturnsAsync(_equipoOperativo);
            _ticketRepoMock.Setup(r => r.BuscarPorId("tkt-pendiente")).ReturnsAsync(_ticketPendiente);

            var ex = await Assert.ThrowsAsync<DomainError>(() => _service.Crear(input, "usr-1", Rol.Docente));
            Assert.Contains("resueltos", ex.Message);
        }
    }
}
