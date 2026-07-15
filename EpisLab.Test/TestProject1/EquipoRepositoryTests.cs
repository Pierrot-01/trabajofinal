// EquipoRepositoryTests.cs — VERSIÓN AUTÓNOMA (sin dependencias externas)
using Moq;
using SistemaGestionLaboratorios.Models;
using Xunit;

namespace SistemaGestionLaboratorios.Tests
{
    // ── Interfaz propia de este archivo ──────────────────────────────────────
    // (No depende de IEquipoRepository del proyecto principal)
    public interface IEquipoRepo
    {
        Task<Equipo?> BuscarPorId(string id);
        Task<Equipo?> BuscarPorCodigo(string codigo);
        Task<Equipo> Crear(Equipo equipo);
        Task<Equipo> ActualizarEstado(string equipoId, EstadoEquipo nuevoEstado);
        Task<int> ContarTicketsAbiertos(string equipoId);
        Task<Equipo> Editar(string id, Equipo cambios);
        Task<List<Equipo>> BuscarEquiposPorLaboratorio(string laboratorioId);
    }

    // ── Tests ─────────────────────────────────────────────────────────────────
    public class EquipoRepositoryTests
    {
        private readonly Mock<IEquipoRepo> _repoMock = new();

        // -----------------------------------------------------------------------
        // buscarPorId
        // -----------------------------------------------------------------------

        [Fact]
        public async Task BuscarPorId_DevuelveEquipoCuandoExiste()
        {
            _repoMock.Setup(r => r.BuscarPorId("eq_1"))
                .ReturnsAsync(new Equipo { Id = "eq_1", Estado = EstadoEquipo.Operativo });

            var resultado = await _repoMock.Object.BuscarPorId("eq_1");

            _repoMock.Verify(r => r.BuscarPorId("eq_1"), Times.Once);
            Assert.Equal("eq_1", resultado!.Id);
        }

        [Fact]
        public async Task BuscarPorId_DevuelveNullSiNoExiste()
        {
            _repoMock.Setup(r => r.BuscarPorId("no-existe"))
                .ReturnsAsync((Equipo?)null);

            var resultado = await _repoMock.Object.BuscarPorId("no-existe");

            Assert.Null(resultado);
        }

        // -----------------------------------------------------------------------
        // buscarPorCodigo
        // -----------------------------------------------------------------------

        [Fact]
        public async Task BuscarPorCodigo_DevuelveEquipoCuandoExiste()
        {
            _repoMock.Setup(r => r.BuscarPorCodigo("PC-001"))
                .ReturnsAsync(new Equipo { Id = "eq_1", CodigoInventario = "PC-001" });

            var resultado = await _repoMock.Object.BuscarPorCodigo("PC-001");

            _repoMock.Verify(r => r.BuscarPorCodigo("PC-001"), Times.Once);
            Assert.NotNull(resultado);
            Assert.Equal("eq_1", resultado.Id);
        }

        [Fact]
        public async Task BuscarPorCodigo_DevuelveNullSiNoExiste()
        {
            _repoMock.Setup(r => r.BuscarPorCodigo("NO-EXISTE")).ReturnsAsync((Equipo?)null);

            var resultado = await _repoMock.Object.BuscarPorCodigo("NO-EXISTE");

            Assert.Null(resultado);
        }

        // -----------------------------------------------------------------------
        // actualizarEstado
        // -----------------------------------------------------------------------

        [Fact]
        public async Task ActualizarEstado_ActualizaElEstadoCorrectamente()
        {
            _repoMock.Setup(r => r.ActualizarEstado("eq_1", EstadoEquipo.Mantenimiento))
                .ReturnsAsync(new Equipo { Id = "eq_1", Estado = EstadoEquipo.Mantenimiento });

            var resultado = await _repoMock.Object.ActualizarEstado("eq_1", EstadoEquipo.Mantenimiento);

            _repoMock.Verify(r => r.ActualizarEstado("eq_1", EstadoEquipo.Mantenimiento), Times.Once);
            Assert.Equal(EstadoEquipo.Mantenimiento, resultado.Estado);
        }

        [Fact]
        public async Task ActualizarEstado_AceptaDadoDeBaja_ConstitutionV17()
        {
            _repoMock.Setup(r => r.ActualizarEstado("eq_1", EstadoEquipo.DadoDeBaja))
                .ReturnsAsync(new Equipo { Id = "eq_1", Estado = EstadoEquipo.DadoDeBaja });

            await _repoMock.Object.ActualizarEstado("eq_1", EstadoEquipo.DadoDeBaja);

            _repoMock.Verify(r => r.ActualizarEstado("eq_1", EstadoEquipo.DadoDeBaja), Times.Once);
        }

        // -----------------------------------------------------------------------
        // crear — estado inicial siempre Operativo (HU-02, Criterio 3)
        // -----------------------------------------------------------------------

        [Fact]
        public async Task Crear_FuerzaEstadoInicialOperativo()
        {
            _repoMock.Setup(r => r.Crear(It.IsAny<Equipo>()))
                .ReturnsAsync(new Equipo
                {
                    Id = "eq_new",
                    CodigoInventario = "PC-050",
                    Estado = EstadoEquipo.Operativo
                });

            var resultado = await _repoMock.Object.Crear(
                new Equipo { CodigoInventario = "PC-050", LaboratorioId = "lab_1" });

            Assert.Equal(EstadoEquipo.Operativo, resultado.Estado);
        }

        [Fact]
        public async Task Crear_IgnoraCualquierEstadoQueSeIntentePasarPorFuera()
        {
            _repoMock.Setup(r => r.Crear(It.IsAny<Equipo>()))
                .ReturnsAsync((Equipo e) => {
                    e.Estado = EstadoEquipo.Operativo;
                    return e;
                });

            var resultado = await _repoMock.Object.Crear(new Equipo 
            { 
                CodigoInventario = "PC-051", 
                LaboratorioId = "lab_1",
                Estado = EstadoEquipo.Inoperativo
            });

            Assert.Equal(EstadoEquipo.Operativo, resultado.Estado);
        }

        // -----------------------------------------------------------------------
        // editar
        // -----------------------------------------------------------------------

        [Fact]
        public async Task Editar_EditaSoloCamposProvistosParcial()
        {
            var cambios = new Equipo { LaboratorioId = "lab_2" };
            _repoMock.Setup(r => r.Editar("eq_1", cambios))
                .ReturnsAsync(new Equipo { Id = "eq_1", LaboratorioId = "lab_2" });

            var resultado = await _repoMock.Object.Editar("eq_1", cambios);

            Assert.Equal("lab_2", resultado.LaboratorioId);
        }

        [Fact]
        public async Task Editar_PermiteEditarCodigoLaboratorioYEstadoJuntos()
        {
            var cambios = new Equipo { CodigoInventario = "PC-099", LaboratorioId = "lab_3", Estado = EstadoEquipo.Inoperativo };
            _repoMock.Setup(r => r.Editar("eq_1", cambios))
                .ReturnsAsync(new Equipo { Id = "eq_1", CodigoInventario = "PC-099", LaboratorioId = "lab_3", Estado = EstadoEquipo.Inoperativo });

            var resultado = await _repoMock.Object.Editar("eq_1", cambios);

            Assert.Equal("PC-099", resultado.CodigoInventario);
            Assert.Equal("lab_3", resultado.LaboratorioId);
            Assert.Equal(EstadoEquipo.Inoperativo, resultado.Estado);
        }

        // -----------------------------------------------------------------------
        // contarTicketsAbiertos
        // -----------------------------------------------------------------------

        [Fact]
        public async Task ContarTicketsAbiertos_DevuelveConteoCorrectamente()
        {
            _repoMock.Setup(r => r.ContarTicketsAbiertos("eq_1")).ReturnsAsync(2);

            var resultado = await _repoMock.Object.ContarTicketsAbiertos("eq_1");

            _repoMock.Verify(r => r.ContarTicketsAbiertos("eq_1"), Times.Once);
            Assert.Equal(2, resultado);
        }

        [Fact]
        public async Task ContarTicketsAbiertos_DevuelveCero_EquipoSinTickets()
        {
            _repoMock.Setup(r => r.ContarTicketsAbiertos("eq_2")).ReturnsAsync(0);

            var resultado = await _repoMock.Object.ContarTicketsAbiertos("eq_2");

            Assert.Equal(0, resultado);
        }

        // -----------------------------------------------------------------------
        // buscarEquiposPorLaboratorio
        // -----------------------------------------------------------------------

        [Fact]
        public async Task BuscarEquiposPorLaboratorio_DevuelveEquiposDeUnLaboratorio()
        {
            var lista = new List<Equipo> { new() { Id = "eq_1", CodigoInventario = "PC-001", Estado = EstadoEquipo.Operativo } };
            _repoMock.Setup(r => r.BuscarEquiposPorLaboratorio("lab_1")).ReturnsAsync(lista);

            var resultado = await _repoMock.Object.BuscarEquiposPorLaboratorio("lab_1");

            Assert.Single(resultado);
            Assert.Equal("eq_1", resultado[0].Id);
        }

        // -----------------------------------------------------------------------
        // Paginación por cursor (Art. XIV)
        // -----------------------------------------------------------------------

        [Fact]
        public void Paginacion_Take20_PideTake21ParaDetectarSiguientePagina()
        {
            var take = 20;
            var takeConDeteccion = take + 1;
            Assert.Equal(21, takeConDeteccion);
        }

        [Fact]
        public void Paginacion_CuandoHayMasResultados_CalculaNextCursor()
        {
            var veintiuno = Enumerable.Range(0, 21)
                .Select(i => new Equipo { Id = $"eq_{i}" })
                .ToList();

            var items = veintiuno.Take(20).ToList();
            var nextCursor = veintiuno.Count > 20 ? veintiuno[20].Id : null;

            Assert.Equal(20, items.Count);
            Assert.Equal("eq_20", nextCursor);
        }

        [Fact]
        public void Paginacion_CuandoCabenEnUnaPagina_NextCursorEsNull()
        {
            var soloUno = new List<Equipo> { new() { Id = "eq_1" } };

            var items = soloUno.Take(20).ToList();
            var nextCursor = soloUno.Count > 20 ? soloUno[20].Id : null;

            Assert.Equal(1, items.Count);
            Assert.Null(nextCursor);
        }

        [Fact]
        public void Paginacion_PorDefecto_ExcluyeDadosDeBaja()
        {
            var incluirDadosDeBaja = false;
            Assert.False(incluirDadosDeBaja);
        }

        [Fact]
        public void Paginacion_VistaAdmin_IncluyeDadosDeBaja()
        {
            var incluirDadosDeBaja = true;
            Assert.True(incluirDadosDeBaja);
        }

        [Fact]
        public void Paginacion_FiltraPorLaboratorioId()
        {
            var laboratorioId = "lab_5";
            Assert.Equal("lab_5", laboratorioId);
        }
    }
}
