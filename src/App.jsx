import React, { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { UploadCloud } from 'lucide-react';
import { ENERO_2026_DATA } from './data/enero2026Data';

// Mock (Nov 2025 - Dic 2025). Enero 2026 viene REAL desde ENERO_2026_DATA.
const MOCK_DATA = [
  { mes: 'Noviembre 2025', sucursal: 'Buenavista', linea: 'Medicina Estética', vendedora: 'Mar Campos', precioTotal: 400000, cantidad: 120 },
  { mes: 'Noviembre 2025', sucursal: 'Buenavista', linea: 'Aparatología', vendedora: 'Aura Castro', precioTotal: 322637, cantidad: 80 },
  { mes: 'Noviembre 2025', sucursal: 'Masaryk', linea: 'Medicina Estética', vendedora: 'Paulina', precioTotal: 300000, cantidad: 95 },
  { mes: 'Noviembre 2025', sucursal: 'Masaryk', linea: 'Farmacia', vendedora: 'Ana Gabriela', precioTotal: 272344, cantidad: 200 },

  { mes: 'Diciembre 2025', sucursal: 'Buenavista', linea: 'Medicina Estética', vendedora: 'Mar Campos', precioTotal: 450000, cantidad: 110 },
  { mes: 'Diciembre 2025', sucursal: 'Buenavista', linea: 'Aparatología', vendedora: 'Aura Castro', precioTotal: 333083, cantidad: 70 },
  { mes: 'Diciembre 2025', sucursal: 'Masaryk', linea: 'Inyectables', vendedora: 'Paulina', precioTotal: 200000, cantidad: 85 },
  { mes: 'Diciembre 2025', sucursal: 'Masaryk', linea: 'Cosmetología', vendedora: 'Ana Gabriela', precioTotal: 105361, cantidad: 150 },
];

// Orden fijo (evita líos por texto)
const MONTH_ORDER = {
  'Noviembre 2025': 1,
  'Diciembre 2025': 2,
  'Enero 2026': 3,
};

// --- CSV parsing (soporta comas dentro de comillas) ---
function parseCSVLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      // Escaped quote ""
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }

    cur += ch;
  }

  out.push(cur);
  return out.map((s) => s.trim());
}

function toNumber(val) {
  if (val === null || val === undefined) return 0;
  const s = String(val).replaceAll('$', '').replaceAll(',', '').trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export default function App() {
  const [data, setData] = useState(() => [...MOCK_DATA, ...ENERO_2026_DATA]);

  const [mes, setMes] = useState('Enero 2026');
  const [sucursal, setSucursal] = useState('Todas');

  const [tab, setTab] = useState('departamentos'); // departamentos (linea), vendedoras, analisis
  const [analisisTipo, setAnalisisTipo] = useState('departamento'); // departamento | vendedora
  const [analisisItem, setAnalisisItem] = useState('');

  // 1) Meses disponibles ordenados
  const mesesDisponibles = useMemo(() => {
    const uniq = [...new Set(data.map((d) => d.mes))];
    return uniq.sort((a, b) => (MONTH_ORDER[a] ?? 999) - (MONTH_ORDER[b] ?? 999));
  }, [data]);

  // Asegurar mes válido
  useEffect(() => {
    if (!mesesDisponibles.includes(mes) && mesesDisponibles.length > 0) {
      setMes(mesesDisponibles[mesesDisponibles.length - 1]);
    }
  }, [mesesDisponibles, mes]);

  // 2) Upload CSV (agrega mes nuevo al dataset)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result ?? '';
      const lines = String(text)
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length < 2) return;

      const headers = parseCSVLine(lines[0]);

      const idx = (name) => headers.findIndex((h) => h === name);

      const iMes = idx('Mes');
      const iSucursal = idx('Sucursal');
      const iLinea = idx('Linea');
      const iVendedora = idx('Vendedora');
      const iPrecio = idx('Precio Total');
      const iCantidad = idx('Cantidad');

      // Validación mínima
      if ([iMes, iSucursal, iLinea, iVendedora, iPrecio, iCantidad].some((i) => i < 0)) {
        alert('CSV inválido. Headers esperados: Mes,Sucursal,Linea,Vendedora,Precio Total,Cantidad');
        return;
      }

      const parsed = lines
        .slice(1)
        .map((line) => parseCSVLine(line))
        .map((v) => ({
          mes: v[iMes],
          sucursal: v[iSucursal],
          linea: v[iLinea],
          vendedora: v[iVendedora],
          precioTotal: toNumber(v[iPrecio]),
          cantidad: toNumber(v[iCantidad]),
        }))
        .filter((r) => r.mes && r.sucursal && r.linea && r.vendedora && r.precioTotal > 0);

      if (parsed.length > 0) {
        // Ojo: esto APPENDEA. Si subes dos veces el mismo mes duplicas.
        // Si quieres "upsert", te lo hago en el siguiente paso.
        setData((prev) => [...prev, ...parsed]);

        // Si el nuevo CSV trae un mes que no existía, te muevo automáticamente al más reciente por orden
        const nuevosMeses = [...new Set(parsed.map((p) => p.mes))];
        const allMeses = [...new Set([...mesesDisponibles, ...nuevosMeses])].sort(
          (a, b) => (MONTH_ORDER[a] ?? 999) - (MONTH_ORDER[b] ?? 999)
        );
        setMes(allMeses[allMeses.length - 1]);
      }
    };
    reader.readAsText(file);
  };

  // 3) Filtrar datos por mes/sucursal
  const dataMesActual = useMemo(() => {
    return data.filter((d) => d.mes === mes && (sucursal === 'Todas' || d.sucursal === sucursal));
  }, [data, mes, sucursal]);

  const dataMesAnterior = useMemo(() => {
    const idx = mesesDisponibles.indexOf(mes);
    if (idx <= 0) return [];
    const mesAnt = mesesDisponibles[idx - 1];
    return data.filter((d) => d.mes === mesAnt && (sucursal === 'Todas' || d.sucursal === sucursal));
  }, [data, mes, sucursal, mesesDisponibles]);

  // 4) KPIs
  const kpis = useMemo(() => {
    const currentTotal = dataMesActual.reduce((acc, d) => acc + (d.precioTotal || 0), 0);
    const prevTotal = dataMesAnterior.reduce((acc, d) => acc + (d.precioTotal || 0), 0);
    const currentQty = dataMesActual.reduce((acc, d) => acc + (d.cantidad || 0), 0);
    const growth = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : null;

    return {
      total: currentTotal,
      growth,
      ticket: currentQty > 0 ? currentTotal / currentQty : 0,
      tx: currentQty,
    };
  }, [dataMesActual, dataMesAnterior]);

  // 5) Evolución
  const dataEvolucion = useMemo(() => {
    return mesesDisponibles.map((m) => {
      const mData = data.filter((d) => d.mes === m && (sucursal === 'Todas' || d.sucursal === sucursal));
      return {
        mes: m,
        label: m.split(' ')[0].substring(0, 3), // Nov, Dic, Ene
        total: mData.reduce((acc, d) => acc + (d.precioTotal || 0), 0),
      };
    });
  }, [data, sucursal, mesesDisponibles]);

  // 6) Breakdown (líneas o vendedoras)
  const dataBreakdown = useMemo(() => {
    const key = tab === 'departamentos' ? 'linea' : 'vendedora';
    const agrupado = {};
    dataMesActual.forEach((d) => {
      const k = d[key] || 'N/A';
      agrupado[k] = (agrupado[k] || 0) + (d.precioTotal || 0);
    });

    const arr = Object.keys(agrupado)
      .map((k) => ({ name: k, value: agrupado[k] }))
      .sort((a, b) => b.value - a.value);

    const max = arr.length > 0 ? arr[0].value : 1;
    return arr.map((a) => ({ ...a, percent: (a.value / max) * 100 }));
  }, [dataMesActual, tab]);

  // 7) Opciones análisis
  const opcionesAnalisis = useMemo(() => {
    const key = analisisTipo === 'departamento' ? 'linea' : 'vendedora';
    const all = data.filter((d) => sucursal === 'Todas' || d.sucursal === sucursal);
    return [...new Set(all.map((d) => d[key]).filter(Boolean))].sort();
  }, [data, sucursal, analisisTipo]);

  useEffect(() => {
    if (opcionesAnalisis.length > 0 && (!analisisItem || !opcionesAnalisis.includes(analisisItem))) {
      setAnalisisItem(opcionesAnalisis[0]);
    }
  }, [opcionesAnalisis, analisisItem]);

  const analisisData = useMemo(() => {
    if (!analisisItem) return null;

    const key = analisisTipo === 'departamento' ? 'linea' : 'vendedora';
    const evo = mesesDisponibles.map((m) => {
      const mData = data.filter(
        (d) => d.mes === m && d[key] === analisisItem && (sucursal === 'Todas' || d.sucursal === sucursal)
      );
      return {
        mes: m,
        label: m.split(' ')[0].substring(0, 3),
        total: mData.reduce((acc, d) => acc + (d.precioTotal || 0), 0),
      };
    });

    const vals = evo.map((i) => i.total);
    if (vals.length === 0) return null;

    const maxVal = Math.max(...vals);
    const minVal = Math.min(...vals);
    const maxMes = evo.find((i) => i.total === maxVal)?.mes || '';
    const minMes = evo.find((i) => i.total === minVal)?.mes || '';
    const promedio = vals.reduce((a, b) => a + b, 0) / vals.length || 0;
    const tendencia = vals[0] > 0 ? ((vals[vals.length - 1] - vals[0]) / vals[0]) * 100 : 0;

    return { evo, maxVal, minVal, maxMes, minMes, promedio, tendencia };
  }, [data, mesesDisponibles, sucursal, analisisTipo, analisisItem]);

  // Formateadores
  const formatMoneda = (val) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(val || 0);

  const formatPercent = (val) => (val >= 0 ? '+' : '') + val.toFixed(1) + '%';

  return (
    <div className="min-h-screen bg-[#f5f5f7] p-3 md:p-5 font-sans text-[#1d1d1f]">
      <div className="max-w-[1200px] mx-auto">
        {/* HEADER */}
        <div className="bg-white p-6 rounded-2xl mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-[28px] font-extrabold text-[#1d1d1f] tracking-tight mb-1">MOS Dashboard</h1>
            <p className="text-[#86868b] text-[14px]">Reporte de Ventas CRM (Odoo)</p>
          </div>

          <label className="cursor-pointer px-5 py-2.5 rounded-xl border border-[#d2d2d7] bg-white font-semibold text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all flex items-center gap-2 whitespace-nowrap">
            <UploadCloud size={18} />
            Cargar CSV (Mes Nuevo)
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>

        {/* FILTROS: MES */}
        <div className="flex gap-3 mb-4 overflow-x-auto pb-2 custom-scrollbar">
          {mesesDisponibles.map((m) => (
            <button
              key={m}
              onClick={() => setMes(m)}
              className={`px-5 py-2.5 rounded-xl border font-semibold text-[14px] transition-all whitespace-nowrap
                ${mes === m ? 'bg-[#007aff] text-white border-[#007aff]' : 'bg-white text-[#1d1d1f] border-[#d2d2d7] hover:bg-[#f5f5f7]'}`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* FILTROS: SUCURSAL */}
        <div className="flex gap-3 mb-5 overflow-x-auto pb-2 custom-scrollbar">
          {['Todas', 'Buenavista', 'Masaryk'].map((s) => (
            <button
              key={s}
              onClick={() => setSucursal(s)}
              className={`px-5 py-2.5 rounded-xl border font-semibold text-[14px] transition-all whitespace-nowrap
                ${sucursal === s ? 'bg-[#007aff] text-white border-[#007aff]' : 'bg-white text-[#1d1d1f] border-[#d2d2d7] hover:bg-[#f5f5f7]'}`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* KPIS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <KpiCard label="Facturación" value={formatMoneda(kpis.total)} />
          <KpiCard
            label="Crecimiento"
            value={kpis.growth !== null ? formatPercent(kpis.growth) : 'N/A'}
            isGrowth
            growthVal={kpis.growth}
          />
          <KpiCard label="Ticket Medio" value={formatMoneda(kpis.ticket)} />
          <KpiCard label="Transacciones" value={(kpis.tx || 0).toLocaleString()} />
        </div>

        {/* EVOLUCIÓN */}
        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] mb-5">
          <h2 className="text-[16px] font-bold text-[#1d1d1f] mb-5">Evolución de Ventas</h2>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataEvolucion} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#007aff" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#007aff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#f5f5f7" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                  tick={{ fill: '#86868b', fontSize: 14, fontWeight: 600, fontFamily: 'sans-serif' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={60}
                  tick={{ fill: '#86868b', fontSize: 13, fontFamily: 'sans-serif' }}
                  tickFormatter={(val) => `$${Math.round(val / 1000)}k`}
                />
                <Tooltip
                  cursor={{ stroke: '#e5e5ea', strokeWidth: 2, strokeDasharray: '5 5' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(val) => [formatMoneda(val), 'Ventas']}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#007aff"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                  activeDot={{ r: 6, strokeWidth: 3, stroke: '#fff', fill: '#007aff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-2 mb-5 bg-white p-2 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          {[
            { id: 'departamentos', label: 'Departamentos' },
            { id: 'vendedoras', label: 'Vendedoras' },
            { id: 'analisis', label: 'Análisis' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-3 px-2 rounded-xl text-center font-semibold text-[14px] transition-all
                ${tab === t.id ? 'bg-[#007aff] text-white' : 'text-[#86868b] hover:bg-[#f5f5f7]'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* CONTENIDO */}
        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <h2 className="text-[16px] font-bold text-[#1d1d1f] mb-5">{tab === 'analisis' ? 'Análisis Profundo' : 'Desglose'}</h2>

          {tab !== 'analisis' && (
            <div>
              {dataBreakdown.length === 0 ? (
                <div className="p-5 text-center text-[#86868b]">No hay datos para esta selección.</div>
              ) : (
                dataBreakdown.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-5 rounded-xl mb-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)] border border-slate-50"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <div className="font-semibold text-[15px] text-[#1d1d1f]">{item.name}</div>
                      <div className="font-bold text-[16px] text-[#007aff]">{formatMoneda(item.value)}</div>
                    </div>
                    <div className="h-1.5 bg-[#f5f5f7] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#007aff] to-[#0051d5] transition-all duration-500"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'analisis' && analisisData && (
            <div className="p-0 sm:p-2">
              {/* Radio */}
              <div className="mb-6">
                <div className="text-[13px] font-semibold text-[#86868b] mb-2 uppercase tracking-wide">Tipo de Análisis</div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={analisisTipo === 'departamento'}
                      onChange={() => setAnalisisTipo('departamento')}
                      className="w-4 h-4 accent-[#007aff]"
                    />
                    <span className="text-[15px] text-[#1d1d1f]">Departamento</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={analisisTipo === 'vendedora'}
                      onChange={() => setAnalisisTipo('vendedora')}
                      className="w-4 h-4 accent-[#007aff]"
                    />
                    <span className="text-[15px] text-[#1d1d1f]">Vendedora</span>
                  </label>
                </div>
              </div>

              {/* Select */}
              <div className="mb-8">
                <div className="text-[13px] font-semibold text-[#86868b] mb-2 uppercase tracking-wide">Seleccionar</div>
                <select
                  value={analisisItem}
                  onChange={(e) => setAnalisisItem(e.target.value)}
                  className="w-full p-3 text-[16px] border border-[#d1d1d6] rounded-xl bg-white outline-none focus:border-[#007aff]"
                >
                  {opcionesAnalisis.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chart análisis */}
              <div className="bg-[#f5f5f7] rounded-2xl p-5 mb-5">
                <div className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Evolución Mensual</div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analisisData.evo} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorAnalisis" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#007aff" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#007aff" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="#e5e5ea" />
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#86868b', fontSize: 13, fontWeight: 'bold' }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#86868b', fontSize: 12 }}
                        tickFormatter={(val) => `$${Math.round(val / 1000)}k`}
                      />
                      <Tooltip formatter={(val) => formatMoneda(val)} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke="#007aff"
                        strokeWidth={2.5}
                        fill="url(#colorAnalisis)"
                        activeDot={{ r: 5, fill: '#007aff', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Métricas */}
              <div className="bg-[#f5f5f7] rounded-2xl p-5">
                <div className="text-[15px] font-semibold text-[#1d1d1f] mb-4">📊 Métricas Clave</div>
                <div className="grid gap-3 text-[15px]">
                  <div className="flex justify-between border-b border-[#e5e5ea] pb-2">
                    <span className="text-[#86868b]">Promedio:</span>
                    <span className="font-semibold text-[#1d1d1f]">{formatMoneda(analisisData.promedio)}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#e5e5ea] pb-2">
                    <span className="text-[#86868b]">Mejor mes:</span>
                    <span className="font-semibold text-[#34c759]">
                      {analisisData.maxMes} ({formatMoneda(analisisData.maxVal)})
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[#e5e5ea] pb-2">
                    <span className="text-[#86868b]">Peor mes:</span>
                    <span className="font-semibold text-[#ff3b30]">
                      {analisisData.minMes} ({formatMoneda(analisisData.minVal)})
                    </span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-[#86868b]">Tendencia Global:</span>
                    <span className={`font-semibold ${analisisData.tendencia >= 0 ? 'text-[#34c759]' : 'text-[#ff3b30]'}`}>
                      {analisisData.tendencia >= 0 ? '↑' : '↓'} {Math.abs(analisisData.tendencia).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'analisis' && !analisisData && (
            <div className="p-5 text-center text-[#86868b]">No hay datos para análisis con esta selección.</div>
          )}
        </div>
      </div>

      {/* CSS extra para scroll horizontal */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar { height: 0px; }
        .custom-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `,
        }}
      />
    </div>
  );
}

function KpiCard({ label, value, isGrowth = false, growthVal = 0 }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex flex-col justify-center">
      <div className="text-[12px] text-[#86868b] uppercase tracking-wide font-semibold mb-2">{label}</div>
      <div className="text-[32px] font-bold text-[#1d1d1f] leading-none">{value}</div>

      {isGrowth && growthVal !== null && (
        <div className={`text-[14px] mt-2 font-semibold ${growthVal >= 0 ? 'text-[#34c759]' : 'text-[#ff3b30]'}`}>
          {growthVal >= 0 ? '↑' : '↓'} {Math.abs(growthVal).toFixed(1)}% vs anterior
        </div>
      )}

      {isGrowth && growthVal === null && <div className="text-[14px] mt-2 font-semibold text-[#86868b]">Sin mes anterior</div>}
    </div>
  );
}