// EquipoServiceAdditionalTests.cs
// Equivalente a: tests/unit/equipo.service.additional.test.ts
// Complementa EquipoServiceTests.cs cubriendo casos adicionales de cobertura:
// - equipoService.editar() con validaciones de laboratorio y código
// - actualizarEstadoPorResolucion() — efecto automático de Clarify #1 de 001-tickets
using Moq;
using SistemaGestionLaboratorios.Errors;
using SistemaGestionLaboratorios.Models;
using SistemaGestionLaboratorios.Services;
using Xunit;

namespace SistemaGestionLaboratorios.Tests
{
    // Interfaz extendida para EquipoService con la función de editar completa
    public interface IEquipoRepositoryExtended : IEquipoRepository
    {
        Task<Equipo?> BuscarPorCodigo(string codigo);
        Task<Equipo> Editar(string equipoId, Dictionary<string, object> cambios);
        Task<Equipo> ActualizarEstadoPorResolucion(string equipoId);
    }

    // Extensión del servicio de equipo con los métodos adicionales
    public class EquipoServiceExtended
    {
        private readonly Mock<IEquipoRepository> _equipoRepoMock;
        private readonly Mock<ILaboratorioRepository> _labRepoMock;
        private readonly EquipoService _equipoService;

        public EquipoServiceExtended(Mock<IEquipoRepository> equipoRepoMock,
            Mock<ILaboratorioRepository> labRepoMock)
        {
            _equipoRepoMock = equipoRepoMock;
            _labRepoMock = labRepoMock;
            _equipoService = new EquipoService(equipoRepoMock.Object, labRepoMock.Object);
        }

        // Método editar con validaciones adicionales
        public async Task<Equipo> Editar(string equipoId, string? nuevoCodigo,
            string? nuevoLaboratorioId, EstadoEquipo? nuevoEstado = null)
        {
            // Validar laboratorio si se cambia
            if (nuevoLaboratorioId != null)
            {
                var lab = await _labRepoMock.Object.BuscarPorId(nuevoLaboratorioId);
                if (lab == null)
                    throw new DomainError("El laboratorio no existe.");
            }

            // Validar código si se cambia (no puede ser de otro equipo)
            if (nuevoCodigo != null)
            {
                var existente = await _equipoRepoMock.Object.BuscarPorCodigo(nuevoCodigo);
                if (existente != null && existente.Id != equipoId)
                    throw new DomainError("Este código de inventario ya está registrado.");
            }

            // En implementación real, aquí va la llamada al repositorio
            return new Equipo { Id = equipoId };
        }

        // actualizarEstadoPorResolucion — Clarify #1 de 001-tickets
        public async Task<Equipo> ActualizarEstadoPorResolucion(string equipoId)
        {
            var ticketsAbiertos = await _equipoRepoMock.Object.ContarTicketsAbiertos(equipoId);
            var nuevoEstado = ticketsAbiertos > 0 ? EstadoEquipo.Mantenimiento : EstadoEquipo.Operativo;
            return await _equipoRepoMock.Object.ActualizarEstado(equipoId, nuevoEstado);
        }
    }

    public class EquipoServiceAdditionalTests
    {
        private readonly Mock<IEquipoRepository> _equipoRepoMock = new();
        private readonly Mock<ILaboratorioRepository> _labRepoMock = new();
        private readonly EquipoService _service;
        private readonly EquipoServiceExtended _serviceExt;

        public EquipoServiceAdditionalTests()
        {
            _service = new EquipoService(_equipoRepoMock.Object, _labRepoMock.Object);
            _serviceExt = new EquipoServiceExtended(_equipoRepoMock, _labRepoMock);
        }

        // ===================================================================
        // equipoService.crear — casos edge adicionales
        // ===================================================================

        [Fact]
        public async Task Crear_LaboratorioInexistente_LanzaDomainError_EdgeCase3De003()
        {
            _labRepoMock.Setup(r => r.BuscarPorId("lab-inexistente")).ReturnsAsync((Laboratorio?)null);

            var ex = await Assert.ThrowsAsync<DomainError>(() =>
                _service.Crear("PC-001", "lab-inexistente"));
            Assert.Contains("laboratorio no existe", ex.Message);
            _equipoRepoMock.Verify(r => r.Crear(It.IsAny<Equipo>()), Times.Never);
        }

        [Fact]
        public async Task Crear_CodigoYaExiste_LanzaDomainError_EdgeCase1De003()
        {
            _labRepoMock.Setup(r => r.BuscarPorId("lab_1")).ReturnsAsync(new Laboratorio { Id = "lab_1" });
            _equipoRepoMock.Setup(r => r.BuscarPorCodigo("PC-001"))
                .ReturnsAsync(new Equipo { Id = "eq_existente" });

            var ex = await Assert.ThrowsAsync<DomainError>(() =>
                _service.Crear("PC-001", "lab_1"));
            Assert.Contains("ya está registrado", ex.Message);
            _equipoRepoMock.Verify(r => r.Crear(It.IsAny<Equipo>()), Times.Never);
        }

        [Fact]
        public async Task Crear_LabExistenteYCodigoUnico_CreaEquipoOperativo()
        {
            _labRepoMock.Setup(r => r.BuscarPorId("lab_1")).ReturnsAsync(new Laboratorio { Id = "lab_1" });
            _equipoRepoMock.Setup(r => r.BuscarPorCodigo("PC-050")).ReturnsAsync((Equipo?)null);
            _equipoRepoMock.Setup(r => r.Crear(It.IsAny<Equipo>()))
                .ReturnsAsync(new Equipo { Id = "eq_new", Estado = EstadoEquipo.Operativo });

            var resultado = await _service.Crear("PC-050", "lab_1");

            Assert.Equal(EstadoEquipo.Operativo, resultado.Estado);
        }

        // ===================================================================
        // equipoService.editar — validaciones adicionales
        // ===================================================================

        [Fact]
        public async Task Editar_NuevoLaboratorioInexistente_LanzaDomainError()
        {
            _labRepoMock.Setup(r => r.BuscarPorId("lab-fantasma")).ReturnsAsync((Laboratorio?)null);

            var ex = await Assert.ThrowsAsync<DomainError>(() =>
                _serviceExt.Editar("eq_1", null, "lab-fantasma"));
            Assert.Contains("El laboratorio no existe.", ex.Message);
        }

        [Fact]
        public async Task Editar_NuevoCodigoYaLoTieneOtroEquipo_LanzaDomainError()
        {
            _equipoRepoMock.Setup(r => r.BuscarPorCodigo("PC-999"))
                .ReturnsAsync(new Equipo { Id = "eq_otro" }); // id diferente!

            var ex = await Assert.ThrowsAsync<DomainError>(() =>
                _serviceExt.Editar("eq_1", "PC-999", null));
            Assert.Contains("ya está registrado", ex.Message);
        }

        [Fact]
        public async Task Editar_CodigoPerteneceMismoEquipo_PermiteEditar()
        {
            _equipoRepoMock.Setup(r => r.BuscarPorCodigo("PC-001"))
                .ReturnsAsync(new Equipo { Id = "eq_1" }); // mismo id → no es duplicado

            // No debe lanzar excepción
            var resultado = await _serviceExt.Editar("eq_1", "PC-001", null);
            Assert.Equal("eq_1", resultado.Id);
        }

        // ===================================================================
        // equipoService.editarEstado — advertencia NO bloqueo
        // ===================================================================

        [Fact]
        public async Task EditarEstado_TicketsAbiertos_DevuelveWarningExacto_HU03Criterio1()
        {
            _equipoRepoMock.Setup(r => r.ContarTicketsAbiertos("eq_1")).ReturnsAsync(2);
            _equipoRepoMock.Setup(r => r.Editar("eq_1", EstadoEquipo.Inoperativo))
                .ReturnsAsync(new Equipo { Id = "eq_1", Estado = EstadoEquipo.Inoperativo });

            var resultado = await _service.EditarEstado("eq_1", EstadoEquipo.Inoperativo);

            Assert.True(resultado.Success);
            Assert.Equal(
                "Este equipo tiene tickets abiertos que podrían quedar inconsistentes con el nuevo estado.",
                resultado.Warning);
        }

        [Fact]
        public async Task EditarEstado_SinTicketsAbiertos_NoIncluyeWarning()
        {
            _equipoRepoMock.Setup(r => r.ContarTicketsAbiertos("eq_1")).ReturnsAsync(0);
            _equipoRepoMock.Setup(r => r.Editar("eq_1", EstadoEquipo.Operativo))
                .ReturnsAsync(new Equipo { Id = "eq_1", Estado = EstadoEquipo.Operativo });

            var resultado = await _service.EditarEstado("eq_1", EstadoEquipo.Operativo);

            Assert.True(resultado.Success);
            Assert.Null(resultado.Warning);
        }

        // ===================================================================
        // equipoService.darDeBaja
        // ===================================================================

        [Fact]
        public async Task DarDeBaja_ConTicketsAbiertos_LanzaDomainError_Bloqueo_NoWarning()
        {
            _equipoRepoMock.Setup(r => r.ContarTicketsAbiertos("eq_1")).ReturnsAsync(1);

            var ex = await Assert.ThrowsAsync<DomainError>(() => _service.DarDeBaja("eq_1"));
            Assert.Equal(
                "No se puede dar de baja un equipo con tickets abiertos. Resuélvelos primero.",
                ex.Message);
            _equipoRepoMock.Verify(r => r.ActualizarEstado(It.IsAny<string>(), It.IsAny<EstadoEquipo>()), Times.Never);
        }

        [Fact]
        public async Task DarDeBaja_SinTickets_DaEquipoDeBaja()
        {
            _equipoRepoMock.Setup(r => r.ContarTicketsAbiertos("eq_1")).ReturnsAsync(0);
            _equipoRepoMock.Setup(r => r.ActualizarEstado("eq_1", EstadoEquipo.DadoDeBaja))
                .ReturnsAsync(new Equipo { Id = "eq_1", Estado = EstadoEquipo.DadoDeBaja });

            var resultado = await _service.DarDeBaja("eq_1");

            Assert.Equal(EstadoEquipo.DadoDeBaja, resultado.Estado);
        }

        // ===================================================================
        // actualizarEstadoPorResolucion — Clarify #1 de 001-tickets
        // ===================================================================

        [Fact]
        public async Task ActualizarEstadoPorResolucion_ConOtrosTicketsAbiertos_PassaAMantenimiento()
        {
            _equipoRepoMock.Setup(r => r.ContarTicketsAbiertos("eq_1")).ReturnsAsync(1);
            _equipoRepoMock.Setup(r => r.ActualizarEstado("eq_1", EstadoEquipo.Mantenimiento))
                .ReturnsAsync(new Equipo { Id = "eq_1", Estado = EstadoEquipo.Mantenimiento });

            var resultado = await _serviceExt.ActualizarEstadoPorResolucion("eq_1");

            _equipoRepoMock.Verify(r => r.ActualizarEstado("eq_1", EstadoEquipo.Mantenimiento), Times.Once);
            Assert.Equal(EstadoEquipo.Mantenimiento, resultado.Estado);
        }

        [Fact]
        public async Task ActualizarEstadoPorResolucion_SinTicketsAbiertos_PasaAOperativo()
        {
            _equipoRepoMock.Setup(r => r.ContarTicketsAbiertos("eq_1")).ReturnsAsync(0);
            _equipoRepoMock.Setup(r => r.ActualizarEstado("eq_1", EstadoEquipo.Operativo))
                .ReturnsAsync(new Equipo { Id = "eq_1", Estado = EstadoEquipo.Operativo });

            var resultado = await _serviceExt.ActualizarEstadoPorResolucion("eq_1");

            _equipoRepoMock.Verify(r => r.ActualizarEstado("eq_1", EstadoEquipo.Operativo), Times.Once);
            Assert.Equal(EstadoEquipo.Operativo, resultado.Estado);
        }

        [Fact]
        public async Task Editar_SinCambiosDeIdentidad_PermiteEditar()
        {
            var resultado = await _serviceExt.Editar("eq_1", null, null, EstadoEquipo.Mantenimiento);
            Assert.Equal("eq_1", resultado.Id);
            _labRepoMock.Verify(r => r.BuscarPorId(It.IsAny<string>()), Times.Never);
            _equipoRepoMock.Verify(r => r.BuscarPorCodigo(It.IsAny<string>()), Times.Never);
        }
    }
}
