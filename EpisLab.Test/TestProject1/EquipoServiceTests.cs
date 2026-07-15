// EquipoServiceTests.cs
// Equivalente a: tests/unit/equipo.service.test.ts
using Moq;
using SistemaGestionLaboratorios.Errors;
using SistemaGestionLaboratorios.Models;
using SistemaGestionLaboratorios.Services;
using Xunit;

namespace SistemaGestionLaboratorios.Tests
{
    public class EquipoServiceTests
    {
        private readonly Mock<IEquipoRepository> _equipoRepoMock = new();
        private readonly Mock<ILaboratorioRepository> _labRepoMock = new();
        private readonly EquipoService _service;

        private readonly Laboratorio _labExistente = new()
        {
            Id = "lab-1",
            Nombre = "Lab Informática I",
            Ubicacion = "Pabellón A",
            Capacidad = 30
        };

        private readonly Equipo _equipoBase = new()
        {
            Id = "eq-1",
            CodigoInventario = "LAB01-PC01",
            LaboratorioId = "lab-1",
            Estado = EstadoEquipo.Operativo
        };

        public EquipoServiceTests()
        {
            _service = new EquipoService(_equipoRepoMock.Object, _labRepoMock.Object);
        }

        // ===================================================================
        // Crear (T208–T210)
        // ===================================================================

        [Fact]
        public async Task T208_CodigoUnicoYLaboratorioExistente_Exito()
        {
            _labRepoMock.Setup(r => r.BuscarPorId("lab-1")).ReturnsAsync(_labExistente);
            _equipoRepoMock.Setup(r => r.BuscarPorCodigo("LAB01-PC01")).ReturnsAsync((Equipo?)null);
            _equipoRepoMock.Setup(r => r.Crear(It.IsAny<Equipo>())).ReturnsAsync(_equipoBase);

            var result = await _service.Crear("LAB01-PC01", "lab-1");
            Assert.Equal("eq-1", result.Id);
        }

        [Fact]
        public async Task T209_CodigoDuplicado_LanzaDomainError()
        {
            _labRepoMock.Setup(r => r.BuscarPorId("lab-1")).ReturnsAsync(_labExistente);
            _equipoRepoMock.Setup(r => r.BuscarPorCodigo("LAB01-PC01")).ReturnsAsync(_equipoBase);

            var ex = await Assert.ThrowsAsync<DomainError>(() => _service.Crear("LAB01-PC01", "lab-1"));
            Assert.Contains("ya está registrado", ex.Message);
        }

        [Fact]
        public async Task T210_LaboratorioInexistente_LanzaDomainError()
        {
            _labRepoMock.Setup(r => r.BuscarPorId("lab-x")).ReturnsAsync((Laboratorio?)null);

            var ex = await Assert.ThrowsAsync<DomainError>(() => _service.Crear("LAB01-PC99", "lab-x"));
            Assert.Contains("laboratorio no existe", ex.Message);
        }

        // ===================================================================
        // EditarEstado (T212–T213)
        // ===================================================================

        [Fact]
        public async Task T212_ConTicketsAbiertos_SuccessConWarning()
        {
            _equipoRepoMock.Setup(r => r.ContarTicketsAbiertos("eq-1")).ReturnsAsync(2);
            _equipoRepoMock.Setup(r => r.Editar("eq-1", EstadoEquipo.Inoperativo))
                .ReturnsAsync(new Equipo { Estado = EstadoEquipo.Inoperativo });

            var res = await _service.EditarEstado("eq-1", EstadoEquipo.Inoperativo);
            Assert.True(res.Success);
            Assert.NotNull(res.Warning);
        }

        [Fact]
        public async Task T213_SinTicketsAbiertos_SuccessLimpioSinWarning()
        {
            _equipoRepoMock.Setup(r => r.ContarTicketsAbiertos("eq-1")).ReturnsAsync(0);
            _equipoRepoMock.Setup(r => r.Editar("eq-1", EstadoEquipo.Inoperativo))
                .ReturnsAsync(new Equipo { Estado = EstadoEquipo.Inoperativo });

            var res = await _service.EditarEstado("eq-1", EstadoEquipo.Inoperativo);
            Assert.True(res.Success);
            Assert.Null(res.Warning);
        }

        // ===================================================================
        // DarDeBaja (T216–T217)
        // ===================================================================

        [Fact]
        public async Task T216_ConTicketsAbiertos_LanzaDomainError_BLOQUEO()
        {
            _equipoRepoMock.Setup(r => r.ContarTicketsAbiertos("eq-1")).ReturnsAsync(3);

            var ex = await Assert.ThrowsAsync<DomainError>(() => _service.DarDeBaja("eq-1"));
            Assert.Contains("tickets abiertos", ex.Message);
        }

        [Fact]
        public async Task T217_SinTicketsAbiertos_EstadoDadoDeBaja()
        {
            _equipoRepoMock.Setup(r => r.ContarTicketsAbiertos("eq-1")).ReturnsAsync(0);
            _equipoRepoMock.Setup(r => r.ActualizarEstado("eq-1", EstadoEquipo.DadoDeBaja))
                .ReturnsAsync(new Equipo { Estado = EstadoEquipo.DadoDeBaja });

            await _service.DarDeBaja("eq-1");
            _equipoRepoMock.Verify(r => r.ActualizarEstado("eq-1", EstadoEquipo.DadoDeBaja), Times.Once);
        }
    }
}
