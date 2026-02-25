import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  Award,
  ShoppingBag,
  DollarSign,
  UploadCloud,
  Filter,
} from 'lucide-react';

// Datos pre-cargados basados en el análisis real de los archivos de Odoo
const MOCK_DATA = [
  {
    mes: 'Noviembre',
    sucursal: 'Buenavista',
    linea: 'Medicina Estética',
    vendedora: 'Mar Campos',
    precioTotal: 450000,
    cantidad: 120,
  },
  {
    mes: 'Noviembre',
    sucursal: 'Buenavista',
    linea: 'Aparatología',
    vendedora: 'Daniela Perez',
    precioTotal: 250000,
    cantidad: 80,
  },
  {
    mes: 'Noviembre',
    sucursal: 'Masaryk',
    linea: 'Medicina Estética',
    vendedora: 'Paulina',
    precioTotal: 300000,
    cantidad: 95,
  },
  {
    mes: 'Noviembre',
    sucursal: 'Masaryk',
    linea: 'Farmacia',
    vendedora: 'Ana Gabriela',
    precioTotal: 294981,
    cantidad: 200,
  },

  {
    mes: 'Diciembre',
    sucursal: 'Buenavista',
    linea: 'Medicina Estética',
    vendedora: 'Mar Campos',
    precioTotal: 400000,
    cantidad: 110,
  },
  {
    mes: 'Diciembre',
    sucursal: 'Buenavista',
    linea: 'Aparatología',
    vendedora: 'Daniela Perez',
    precioTotal: 200000,
    cantidad: 70,
  },
  {
    mes: 'Diciembre',
    sucursal: 'Masaryk',
    linea: 'Inyectables',
    vendedora: 'Paulina',
    precioTotal: 280000,
    cantidad: 85,
  },
  {
    mes: 'Diciembre',
    sucursal: 'Masaryk',
    linea: 'Cosmetología',
    vendedora: 'Ana Gabriela',
    precioTotal: 208444,
    cantidad: 150,
  },

  {
    mes: 'Enero',
    sucursal: 'Buenavista',
    linea: 'Medicina Estética',
    vendedora: 'Mar Campos',
    precioTotal: 173614,
    cantidad: 60,
  },
  {
    mes: 'Enero',
    sucursal: 'Buenavista',
    linea: 'Aparatología',
    vendedora: 'Daniela Perez',
    precioTotal: 150000,
    cantidad: 50,
  },
  {
    mes: 'Enero',
    sucursal: 'Masaryk',
    linea: 'Medicina Estética',
    vendedora: 'Paulina',
    precioTotal: 200000,
    cantidad: 75,
  },
  {
    mes: 'Enero',
    sucursal: 'Masaryk',
    linea: 'Farmacia',
    vendedora: 'Ana Gabriela',
    precioTotal: 137505,
    cantidad: 120,
  },
];

const COLORES_PIE = [
  '#0ea5e9',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#f97316',
];

export default function App() {
  const [data, setData] = useState(MOCK_DATA);
  const [filtroMes, setFiltroMes] = useState('Todos');
  const [filtroSucursal, setFiltroSucursal] = useState('Todas');

  // Procesador simple de CSV para cuando el usuario suba su archivo limpio
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const rows = text.split('\n');
        const headers = rows[0].split(',').map((h) => h.trim());

        const parsedData = rows
          .slice(1)
          .filter((row) => row.trim() !== '')
          .map((row) => {
            // Manejo simple de comas en CSV (no soporta comas dentro de comillas en esta versión básica)
            const values = row.split(',');
            const obj = {};
            headers.forEach((header, index) => {
              let val = values[index] ? values[index].trim() : '';
              // Convertir a número si es cantidad o precio
              if (header === 'Precio Total' || header === 'Cantidad') {
                val = parseFloat(val) || 0;
              }
              obj[header] = val;
            });
            // Mapeo para que coincida con las claves del estado
            return {
              mes: obj['Mes'],
              sucursal: obj['Sucursal'],
              linea: obj['Linea'],
              vendedora: obj['Vendedora'],
              precioTotal: obj['Precio Total'],
              cantidad: obj['Cantidad'],
            };
          })
          .filter((item) => item.mes && item.precioTotal > 0); // Filtrar filas inválidas

        if (parsedData.length > 0) {
          setData(parsedData);
        }
      };
      reader.readAsText(file);
    }
  };

  // Filtrado reactivo de datos
  const datosFiltrados = useMemo(() => {
    return data.filter((item) => {
      const cumpleMes = filtroMes === 'Todos' || item.mes === filtroMes;
      const cumpleSucursal =
        filtroSucursal === 'Todas' || item.sucursal === filtroSucursal;
      return cumpleMes && cumpleSucursal;
    });
  }, [data, filtroMes, filtroSucursal]);

  // Cálculos de KPIs
  const kpis = useMemo(() => {
    const total = datosFiltrados.reduce(
      (acc, curr) => acc + (curr.precioTotal || 0),
      0,
    );
    const cantidad = datosFiltrados.reduce(
      (acc, curr) => acc + (curr.cantidad || 0),
      0,
    );

    // Calcular mejor vendedora
    const vendedoras = {};
    datosFiltrados.forEach((item) => {
      vendedoras[item.vendedora] =
        (vendedoras[item.vendedora] || 0) + item.precioTotal;
    });
    const topVendedora =
      Object.keys(vendedoras).sort(
        (a, b) => vendedoras[b] - vendedoras[a],
      )[0] || 'N/A';

    return {
      totalVentas: total,
      ticketPromedio: cantidad > 0 ? total / cantidad : 0,
      totalProductos: cantidad,
      vendedoraEstrella: topVendedora,
    };
  }, [datosFiltrados]);

  // Datos para gráficas
  const datosEvolucion = useMemo(() => {
    const agrupado = {};
    datosFiltrados.forEach((item) => {
      if (!agrupado[item.mes])
        agrupado[item.mes] = {
          mes: item.mes,
          Buenavista: 0,
          Masaryk: 0,
          Total: 0,
        };
      if (item.sucursal.includes('Buenavista'))
        agrupado[item.mes].Buenavista += item.precioTotal;
      else if (item.sucursal.includes('Masaryk'))
        agrupado[item.mes].Masaryk += item.precioTotal;
      agrupado[item.mes].Total += item.precioTotal;
    });
    // Forzar orden de meses para el demo
    const orden = { Noviembre: 1, Diciembre: 2, Enero: 3 };
    return Object.values(agrupado).sort((a, b) => orden[a.mes] - orden[b.mes]);
  }, [datosFiltrados]);

  const datosLinea = useMemo(() => {
    const agrupado = {};
    datosFiltrados.forEach((item) => {
      agrupado[item.linea] = (agrupado[item.linea] || 0) + item.precioTotal;
    });
    return Object.entries(agrupado)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [datosFiltrados]);

  const datosVendedoras = useMemo(() => {
    const agrupado = {};
    datosFiltrados.forEach((item) => {
      agrupado[item.vendedora] =
        (agrupado[item.vendedora] || 0) + item.precioTotal;
    });
    return Object.entries(agrupado)
      .map(([name, Total]) => ({ name, Total }))
      .sort((a, b) => b.Total - a.Total)
      .slice(0, 5); // Top 5
  }, [datosFiltrados]);

  // Formateador de moneda
  const formatoMoneda = (valor) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(valor);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Tribune Tech
          </h1>
          <p className="text-slate-500">Dashboard de Ventas CRM (Odoo)</p>
        </div>

        <div className="flex items-center gap-4 bg-white p-2 rounded-lg shadow-sm border border-slate-200">
          <label className="flex items-center gap-2 cursor-pointer px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors text-sm font-medium">
            <UploadCloud size={18} />
            <span>Cargar CSV Limpio</span>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-8 flex flex-wrap gap-6 items-center">
        <div className="flex items-center gap-2 text-slate-500 font-medium">
          <Filter size={18} />
          <span>Filtros:</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Mes:</label>
          <select
            className="border-slate-300 rounded-md text-sm border p-1.5 focus:ring-blue-500 focus:border-blue-500"
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
          >
            <option value="Todos">Todos los meses</option>
            <option value="Noviembre">Noviembre</option>
            <option value="Diciembre">Diciembre</option>
            <option value="Enero">Enero</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Sucursal:</label>
          <select
            className="border-slate-300 rounded-md text-sm border p-1.5 focus:ring-blue-500 focus:border-blue-500"
            value={filtroSucursal}
            onChange={(e) => setFiltroSucursal(e.target.value)}
          >
            <option value="Todas">Todas las sucursales</option>
            <option value="Buenavista">Buenavista</option>
            <option value="Masaryk">Masaryk</option>
          </select>
        </div>
      </div>

      {/* KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard
          titulo="Ventas Totales"
          valor={formatoMoneda(kpis.totalVentas)}
          icono={<DollarSign size={24} className="text-emerald-600" />}
          bgIcon="bg-emerald-100"
        />
        <KpiCard
          titulo="Vendedora Estrella"
          valor={kpis.vendedoraEstrella}
          icono={<Award size={24} className="text-amber-600" />}
          bgIcon="bg-amber-100"
        />
        <KpiCard
          titulo="Ticket Promedio"
          valor={formatoMoneda(kpis.ticketPromedio)}
          icono={<TrendingUp size={24} className="text-blue-600" />}
          bgIcon="bg-blue-100"
        />
        <KpiCard
          titulo="Productos Vendidos"
          valor={kpis.totalProductos.toLocaleString()}
          icono={<ShoppingBag size={24} className="text-purple-600" />}
          bgIcon="bg-purple-100"
        />
      </div>

      {/* GRÁFICAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Gráfica de Línea - Evolución */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 text-slate-800">
            Evolución de Ventas por Mes
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={datosEvolucion}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="mes"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b' }}
                  tickFormatter={(value) => `$${value / 1000}k`}
                />
                <Tooltip
                  formatter={(value) => formatoMoneda(value)}
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ paddingTop: '20px' }}
                />
                <Line
                  type="monotone"
                  dataKey="Total"
                  stroke="#0ea5e9"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="Buenavista"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="Masaryk"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica de Pastel - Líneas de Negocio */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold mb-4 text-slate-800">
            Ventas por Línea
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={datosLinea}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {datosLinea.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORES_PIE[index % COLORES_PIE.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatoMoneda(value)} />
                <Legend
                  layout="vertical"
                  verticalAlign="bottom"
                  align="center"
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* TABLA DE VENDEDORAS */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold mb-4 text-slate-800">
          Top 5 Vendedoras
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={datosVendedoras}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="#e2e8f0"
              />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `$${value / 1000}k`}
              />
              <YAxis
                dataKey="name"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#334155', fontWeight: 500 }}
              />
              <Tooltip
                formatter={(value) => formatoMoneda(value)}
                cursor={{ fill: '#f1f5f9' }}
              />
              <Bar dataKey="Total" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                {datosVendedoras.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 0 ? '#0ea5e9' : '#94a3b8'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// Componente Tarjeta KPI
function KpiCard({ titulo, valor, icono, bgIcon }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
      <div
        className={`${bgIcon} w-14 h-14 rounded-full flex items-center justify-center shrink-0`}
      >
        {icono}
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium mb-1">{titulo}</p>
        <p className="text-2xl font-bold text-slate-800">{valor}</p>
      </div>
    </div>
  );
}
