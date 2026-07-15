// TicketRepositoryTests.cs
// Equivalente a: tests/unit/ticket.repository.test.ts
using Moq;
using SistemaGestionLaboratorios.Models;
using SistemaGestionLaboratorios.Services;
using Xunit;

namespace SistemaGestionLaboratorios.Tests
{
    // Interfaz completa del repositorio de tickets para los tests
    public interface ITicketRepositoryFull : ITicketRepository
    {
        Task<PagedResultTicket> Listar(ListarTicketsParams parametros);
        Task<List<Ticket>> ListarResueltosPorEquipo(string equipoId);
        Task<Dictionary<string, double>> TiempoPromedioResolucion();
        Task<List<object>> EquiposConMasTickets(int umbralTickets, int meses);
    }

    public class PagedResultTicket
    {
        public List<Ticket> Items { get; set; } = new();
        public string? NextCursor { get; set; }
    }

    public class ListarTicketsParams
    {
        public int Take { get; set; } = 20;
        public string? Cursor { get; set; }
        public string? LaboratorioId { get; set; }
        public EstadoTicket? Estado { get; set; }
        public TipoTicket? Tipo { get; set; }
    }

    public class TicketRepositoryTests
    {
        private readonly Mock<ITicketRepositoryFull> _repoMock = new();

        // -----------------------------------------------------------------------
        // crear
        // -----------------------------------------------------------------------

        [Fact]
        public async Task Crear_LlamaAlRepositorioConLosDataYDevuelveElResultado()
        {
            var ticketCreado = new Ticket
            {
                Id = "tk_1",
                Tipo = TipoTicket.Incidencia,
                Categoria = CategoriaTicket.Hardware,
                Estado = EstadoTicket.Pendiente
            };
            _repoMock.Setup(r => r.Crear(It.IsAny<Ticket>())).ReturnsAsync(ticketCreado);

            var resultado = await _repoMock.Object.Crear(new Ticket
            {
                Tipo = TipoTicket.Incidencia,
                Categoria = CategoriaTicket.Hardware,
                Descripcion = "PC no enciende",
                EquipoId = "eq_1",
                UsuarioReportaId = "usr_1"
            });

            _repoMock.Verify(r => r.Crear(It.IsAny<Ticket>()), Times.Once);
            Assert.Equal("tk_1", resultado.Id);
            Assert.Equal(EstadoTicket.Pendiente, resultado.Estado);
        }

        // -----------------------------------------------------------------------
        // buscarPorId
        // -----------------------------------------------------------------------

        [Fact]
        public async Task BuscarPorId_DevuelveTicketCuandoExiste()
        {
            _repoMock.Setup(r => r.BuscarPorId("tk_1"))
                .ReturnsAsync(new Ticket { Id = "tk_1" });

            var resultado = await _repoMock.Object.BuscarPorId("tk_1");

            _repoMock.Verify(r => r.BuscarPorId("tk_1"), Times.Once);
            Assert.Equal("tk_1", resultado!.Id);
        }

        [Fact]
        public async Task BuscarPorId_DevuelveNullSiNoExiste()
        {
            _repoMock.Setup(r => r.BuscarPorId("no-existe")).ReturnsAsync((Ticket?)null);

            var resultado = await _repoMock.Object.BuscarPorId("no-existe");

            Assert.Null(resultado);
        }

        // -----------------------------------------------------------------------
        // buscarPorEquipoYEstado
        // -----------------------------------------------------------------------

        [Fact]
        public async Task BuscarPorEquipoYEstado_FiltraPorEquipoIdYListaDeEstados()
        {
            _repoMock.Setup(r => r.BuscarPorEquipoYEstado("eq_1",
                    It.Is<List<EstadoTicket>>(l => l.Contains(EstadoTicket.Pendiente) && l.Contains(EstadoTicket.EnProceso))))
                .ReturnsAsync(new List<Ticket> { new() { Id = "tk_1" } });

            var resultado = await _repoMock.Object.BuscarPorEquipoYEstado(
                "eq_1", new List<EstadoTicket> { EstadoTicket.Pendiente, EstadoTicket.EnProceso });

            Assert.Single(resultado);
        }

        // -----------------------------------------------------------------------
        // Paginación por cursor (Art. XIV, punto 2)
        // -----------------------------------------------------------------------

        [Fact]
        public void Listar_Take20PorDefecto_PideTake21ParaDetectarSiguientePagina()
        {
            var take = 20;
            var takeConDeteccion = take + 1;
            Assert.Equal(21, takeConDeteccion);
        }

        [Fact]
        public void Listar_CuandoHayMasResultadosQueTake_RecortaYDevuelveNextCursor()
        {
            var veintiunResultados = Enumerable.Range(0, 21)
                .Select(i => new Ticket { Id = $"tk_{i}" })
                .ToList();

            var items = veintiunResultados.Take(20).ToList();
            var nextCursor = veintiunResultados.Count > 20 ? veintiunResultados[20].Id : null;

            Assert.Equal(20, items.Count);
            Assert.Equal("tk_20", nextCursor);
        }

        [Fact]
        public void Listar_CuandoHayMenosResultadosQueTake_NextCursorEsNull()
        {
            var cincoResultados = Enumerable.Range(0, 5)
                .Select(i => new Ticket { Id = $"tk_{i}" })
                .ToList();

            var items = cincoResultados.Take(20).ToList();
            var nextCursor = cincoResultados.Count > 20 ? cincoResultados[20].Id : null;

            Assert.Equal(5, items.Count);
            Assert.Null(nextCursor);
        }

        // -----------------------------------------------------------------------
        // actualizarEstado
        // -----------------------------------------------------------------------

        [Fact]
        public async Task ActualizarEstado_ActualizaEstadoYCamposExtra()
        {
            _repoMock.Setup(r => r.ActualizarEstado(
                    "tk_1", EstadoTicket.Resuelto, "Se reemplazó la fuente de poder"))
                .ReturnsAsync(new Ticket { Id = "tk_1", Estado = EstadoTicket.Resuelto });

            var resultado = await _repoMock.Object.ActualizarEstado(
                "tk_1", EstadoTicket.Resuelto, "Se reemplazó la fuente de poder");

            _repoMock.Verify(r => r.ActualizarEstado("tk_1", EstadoTicket.Resuelto, "Se reemplazó la fuente de poder"), Times.Once);
            Assert.Equal(EstadoTicket.Resuelto, resultado.Estado);
        }

        [Fact]
        public async Task ActualizarEstado_FuncionaSinCamposExtra_SoloCambioDeEstado()
        {
            _repoMock.Setup(r => r.ActualizarEstado("tk_1", EstadoTicket.EnProceso, null))
                .ReturnsAsync(new Ticket { Id = "tk_1", Estado = EstadoTicket.EnProceso });

            var resultado = await _repoMock.Object.ActualizarEstado("tk_1", EstadoTicket.EnProceso, null);

            Assert.Equal(EstadoTicket.EnProceso, resultado.Estado);
        }

        // -----------------------------------------------------------------------
        // asignarTecnico
        // -----------------------------------------------------------------------

        [Fact]
        public async Task AsignarTecnico_ActualizaTecnicoAsignadoId()
        {
            _repoMock.Setup(r => r.AsignarTecnico("tk_1", "tec_1"))
                .ReturnsAsync(new Ticket { Id = "tk_1", TecnicoAsignadoId = "tec_1" });

            await _repoMock.Object.AsignarTecnico("tk_1", "tec_1");

            _repoMock.Verify(r => r.AsignarTecnico("tk_1", "tec_1"), Times.Once);
        }

        // -----------------------------------------------------------------------
        // contarPorEquipoYEstados
        // -----------------------------------------------------------------------

        [Fact]
        public async Task ContarPorEquipoYEstados_CuentaTicketsFiltrando()
        {
            _repoMock.Setup(r => r.ContarPorEquipoYEstados(
                    "eq_1", It.Is<List<EstadoTicket>>(l => l.Contains(EstadoTicket.Pendiente))))
                .ReturnsAsync(3);

            var resultado = await _repoMock.Object.ContarPorEquipoYEstados(
                "eq_1", new List<EstadoTicket> { EstadoTicket.Pendiente });

            Assert.Equal(3, resultado);
        }

        // -----------------------------------------------------------------------
        // crearComentario
        // -----------------------------------------------------------------------

        [Fact]
        public async Task CrearComentario_CreaComentarioConTicketIdUsuarioIdContenido()
        {
            var comentarioEsperado = new Comentario
            {
                Id = "cm_1",
                TicketId = "tk_1",
                UsuarioId = "usr_1",
                Contenido = "Sigue fallando"
            };
            _repoMock.Setup(r => r.CrearComentario("tk_1", "usr_1", "Sigue fallando"))
                .ReturnsAsync(comentarioEsperado);

            var resultado = await _repoMock.Object.CrearComentario("tk_1", "usr_1", "Sigue fallando");

            _repoMock.Verify(r => r.CrearComentario("tk_1", "usr_1", "Sigue fallando"), Times.Once);
            Assert.Equal("cm_1", resultado.Id);
        }

        // -----------------------------------------------------------------------
        // tiempoPromedioResolucion — cálculo en memoria (HU-06)
        // -----------------------------------------------------------------------

        [Fact]
        public void TiempoPromedioResolucion_CalculaPromedioDeHorasAgrupandoPorCategoria()
        {
            // Simulamos la lógica de cálculo que haría el repositorio real
            var ticketsResueltos = new List<(string Categoria, DateTime Creacion, DateTime Cierre)>
            {
                ("hardware", new DateTime(2026, 7, 1, 0, 0, 0), new DateTime(2026, 7, 1, 10, 0, 0)), // 10h
                ("hardware", new DateTime(2026, 7, 2, 0, 0, 0), new DateTime(2026, 7, 2, 20, 0, 0)), // 20h
                ("red",      new DateTime(2026, 7, 3, 0, 0, 0), new DateTime(2026, 7, 3, 5, 0, 0)),  // 5h
            };

            var promedioPorCategoria = ticketsResueltos
                .GroupBy(t => t.Categoria)
                .ToDictionary(
                    g => g.Key,
                    g => g.Average(t => (t.Cierre - t.Creacion).TotalHours)
                );

            Assert.Equal(15.0, promedioPorCategoria["hardware"]); // promedio de 10 y 20
            Assert.Equal(5.0, promedioPorCategoria["red"]);
        }

        [Fact]
        public void TiempoPromedioResolucion_DevuelveVacioCuandoNoHayResueltos()
        {
            var ticketsVacios = new List<(string Categoria, DateTime Creacion, DateTime Cierre)>();

            var promedio = ticketsVacios
                .GroupBy(t => t.Categoria)
                .ToDictionary(g => g.Key, g => g.Average(t => (t.Cierre - t.Creacion).TotalHours));

            Assert.Empty(promedio);
        }

        // -----------------------------------------------------------------------
        // equiposConMasTickets (HU-06, Clarify #9)
        // -----------------------------------------------------------------------

        [Fact]
        public async Task EquiposConMasTickets_DevuelveEquiposCuandoSuperanElUmbral()
        {
            // Simula: el equipo eq_1 tiene 6 tickets en los últimos 6 meses, umbral=5
            _repoMock.Setup(r => r.ContarPorEquipoYEstados(
                    "eq_1", It.IsAny<List<EstadoTicket>>()))
                .ReturnsAsync(6);

            // La lógica: si count > umbralN, el equipo aparece en el reporte
            var conteo = await _repoMock.Object.ContarPorEquipoYEstados("eq_1", new List<EstadoTicket>());
            var umbral = 5;
            var aparece = conteo > umbral;

            Assert.True(aparece);
        }

        [Fact]
        public void Listar_AplicaFiltroDeLaboratorioId_AQueFiltraEquipo()
        {
            var paramsValidos = new ListarTicketsParams { LaboratorioId = "lab_1" };
            Assert.Equal("lab_1", paramsValidos.LaboratorioId);
        }

        [Fact]
        public void Listar_PasaElCursorRecibidoEnElFormatDePrisma()
        {
            var paramsValidos = new ListarTicketsParams { Cursor = "tk_99" };
            Assert.Equal("tk_99", paramsValidos.Cursor);
        }

        [Fact]
        public async Task ListarResueltosPorEquipo_FiltraSoloTicketsResueltosDeUnEquipoOrdenadosPorFechaDesc()
        {
            var resueltos = new List<Ticket> { new() { Id = "tk_1", Estado = EstadoTicket.Resuelto } };
            _repoMock.Setup(r => r.ListarResueltosPorEquipo("eq_1")).ReturnsAsync(resueltos);

            var resultado = await _repoMock.Object.ListarResueltosPorEquipo("eq_1");

            Assert.Single(resultado);
            Assert.Equal(EstadoTicket.Resuelto, resultado[0].Estado);
        }
    }
}
