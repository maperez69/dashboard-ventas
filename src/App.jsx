import React, { useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { UploadCloud } from "lucide-react";

import KpiCard from "./components/KpiCard";
import { ENERO_2026_DATA } from "./data/enero2026Data";
import { mesCorto, monthKey, normalizeText } from "./lib/meses";
import { normalizeRow, parseCSVFile } from "./lib/csv";

const BASE_DATA = [...MOCK_DATA, ...(ENERO_2026_DATA || [])].map(normalizeRow);
const STORAGE_KEY = "mos_data_v1";
const MOCK_DATA = [
  { mes: "Noviembre 2025", sucursal: "Buenavista", linea: "Medicina Estética", vendedora: "Mar Campos", precioTotal: 400000, cantidad: 120 },
  { mes: "Noviembre 2025", sucursal: "Buenavista", linea: "Aparatología", vendedora: "Aura Castro", precioTotal: 322637, cantidad: 80 },
  { mes: "Noviembre 2025", sucursal: "Masaryk", linea: "Medicina Estética", vendedora: "Paulina", precioTotal: 300000, cantidad: 95 },
  { mes: "Noviembre 2025", sucursal: "Masaryk", linea: "Farmacia", vendedora: "Ana Gabriela", precioTotal: 272344, cantidad: 200 },

  { mes: "Diciembre 2025", sucursal: "Buenavista", linea: "Medicina Estética", vendedora: "Mar Campos", precioTotal: 450000, cantidad: 110 },
  { mes: "Diciembre 2025", sucursal: "Buenavista", linea: "Aparatología", vendedora: "Aura Castro", precioTotal: 333083, cantidad: 70 },
  { mes: "Diciembre 2025", sucursal: "Masaryk", linea: "Inyectables", vendedora: "Paulina", precioTotal: 200000, cantidad: 85 },
  { mes: "Diciembre 2025", sucursal: "Masaryk", linea: "Cosmetología", vendedora: "Ana Gabriela", precioTotal: 105361, cantidad: 150 },
];

const formatMoneda = (val) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Number(val) || 0);

const formatPercent = (val) => `${val >= 0 ? "+" : ""}${Number(val).toFixed(1)}%`;

export default function App() {
const [data, setData] = useState(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return BASE_DATA;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return BASE_DATA;

    return parsed.map(normalizeRow);
  } catch {
    return BASE_DATA;
  }
});

  const [mes, setMes] = useState("Enero 2026");
  const [sucursal, setSucursal] = useState("Todas");

  const [tab, setTab] = useState("departamentos"); // departamentos | vendedoras | analisis
  const [analisisTipo, setAnalisisTipo] = useState("departamento"); // departamento | vendedora
  const [analisisItem, setAnalisisItem] = useState("");

  const mesesDisponibles = useMemo(() => {
    return [...new Set(data.map((d) => normalizeText(d.mes)))]
      .filter(Boolean)
      .sort((a, b) => monthKey(a).localeCompare(monthKey(b)));
  }, [data]);

  useEffect(() => {
    if (!mesesDisponibles.length) return;
    if (!mesesDisponibles.includes(mes)) setMes(mesesDisponibles[mesesDisponibles.length - 1]);
  }, [mesesDisponibles, mes]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    parseCSVFile(file, {
      onSuccess: (parsed) => {
        // REEMPLAZA meses existentes (evita duplicados)
        setData((prev) => {
          const nuevosMeses = new Set(parsed.map((p) => p.mes));
          const sinEsosMeses = prev.filter((p) => !nuevosMeses.has(p.mes));
          return [...sinEsosMeses, ...parsed].map(normalizeRow);
        });

        const mesesSubidos = [...new Set(parsed.map((p) => p.mes))].sort((a, b) =>
          monthKey(a).localeCompare(monthKey(b))
        );
        setMes(mesesSubidos[mesesSubidos.length - 1]);

        e.target.value = "";
      },
      onError: (msg) => alert(msg),
    });
  };

  const dataMesActual = useMemo(() => {
    return data.filter(
      (d) =>
        normalizeText(d.mes) === mes &&
        (sucursal === "Todas" || normalizeText(d.sucursal) === sucursal)
    );
  }, [data, mes, sucursal]);

  const dataMesAnterior = useMemo(() => {
    const idx = mesesDisponibles.indexOf(mes);
    if (idx <= 0) return [];
    const mesAnt = mesesDisponibles[idx - 1];
    return data.filter(
      (d) =>
        normalizeText(d.mes) === mesAnt &&
        (sucursal === "Todas" || normalizeText(d.sucursal) === sucursal)
    );
  }, [data, mes, sucursal, mesesDisponibles]);

  const kpis = useMemo(() => {
    const currentTotal = dataMesActual.reduce((acc, d) => acc + d.precioTotal, 0);
    const prevTotal = dataMesAnterior.reduce((acc, d) => acc + d.precioTotal, 0);
    const currentQty = dataMesActual.reduce((acc, d) => acc + d.cantidad, 0);
    const growth = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : null;

    return {
      total: currentTotal,
      growth,
      ticket: currentQty > 0 ? currentTotal / currentQty : 0,
      tx: currentQty,
    };
  }, [dataMesActual, dataMesAnterior]);

  const dataEvolucion = useMemo(() => {
    return mesesDisponibles.map((m) => {
      const mData = data.filter(
        (d) =>
          normalizeText(d.mes) === m &&
          (sucursal === "Todas" || normalizeText(d.sucursal) === sucursal)
      );
      return {
        mes: m,
        label: mesCorto(m), // Ene, Feb, Mar...
        total: mData.reduce((acc, d) => acc + d.precioTotal, 0),
      };
    });
  }, [data, sucursal, mesesDisponibles]);

  const dataBreakdown = useMemo(() => {
    const key = tab === "departamentos" ? "linea" : "vendedora";
    const agrupado = {};
    dataMesActual.forEach((d) => {
      const k = normalizeText(d[key]) || "Sin dato";
      agrupado[k] = (agrupado[k] || 0) + d.precioTotal;
    });

    const arr = Object.entries(agrupado)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const max = arr[0]?.value || 1;
    return arr.map((a) => ({ ...a, percent: (a.value / max) * 100 }));
  }, [dataMesActual, tab]);

  const opcionesAnalisis = useMemo(() => {
    const key = analisisTipo === "departamento" ? "linea" : "vendedora";
    const all = data.filter((d) => sucursal === "Todas" || normalizeText(d.sucursal) === sucursal);
    return [...new Set(all.map((d) => normalizeText(d[key])))].filter(Boolean).sort();
  }, [data, sucursal, analisisTipo]);

useEffect(() => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // si el storage está lleno o bloqueado, no rompemos la app
  }
}, [data]);

  const analisisData = useMemo(() => {
    if (!analisisItem) return null;

    const key = analisisTipo === "departamento" ? "linea" : "vendedora";
    const evo = mesesDisponibles.map((m) => {
      const mData = data.filter(
        (d) =>
          normalizeText(d.mes) === m &&
          normalizeText(d[key]) === analisisItem &&
          (sucursal === "Todas" || normalizeText(d.sucursal) === sucursal)
      );
      return {
        mes: m,
        label: mesCorto(m),
        total: mData.reduce((acc, d) => acc + d.precioTotal, 0),
      };
    });

    const vals = evo.map((i) => i.total);
    if (!vals.length) return null;

    const maxVal = Math.max(...vals);
    const minVal = Math.min(...vals);
    const maxMes = evo.find((i) => i.total === maxVal)?.mes || "";
    const minMes = evo.find((i) => i.total === minVal)?.mes || "";
    const promedio = vals.reduce((a, b) => a + b, 0) / vals.length || 0;
    const tendencia = vals[0] > 0 ? ((vals[vals.length - 1] - vals[0]) / vals[0]) * 100 : 0;

    return { evo, maxVal, minVal, maxMes, minMes, promedio, tendencia };
  }, [data, mesesDisponibles, sucursal, analisisTipo, analisisItem]);

  return (
    <div className="min-h-screen bg-[#f5f5f7] p-3 md:p-5 font-sans text-[#1d1d1f]">
      <div className="max-w-[1200px] mx-auto">
        {/* HEADER */}
<button
  onClick={() => {
    if (!confirm("¿Resetear datos cargados y volver al baseline?")) return;
    setData(BASE_DATA);
    localStorage.removeItem(STORAGE_KEY);
  }}
  className="px-5 py-2.5 rounded-xl border border-[#d2d2d7] bg-white font-semibold text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all whitespace-nowrap"
>
  Reset
</button>
<div className="flex items-center gap-3">
  <label className="cursor-pointer px-5 py-2.5 rounded-xl border border-[#d2d2d7] bg-white font-semibold text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all flex items-center gap-2 whitespace-nowrap">
    <UploadCloud size={18} />
    Cargar CSV (Mes Nuevo)
    <input
      type="file"
      accept=".csv"
      className="hidden"
      onChange={handleFileUpload}
    />
  </label>

  <button
    onClick={() => {
      if (!confirm("¿Resetear datos cargados y volver al baseline?")) return;
      setData(BASE_DATA);
      localStorage.removeItem(STORAGE_KEY);
    }}
    className="px-5 py-2.5 rounded-xl border border-[#d2d2d7] bg-white font-semibold text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all whitespace-nowrap"
  >
    Reset
  </button>
</div>

        {/* FILTROS: MES */}
        <div className="flex gap-3 mb-4 overflow-x-auto pb-2 custom-scrollbar">
          {mesesDisponibles.map((m) => (
            <button
              key={m}
              onClick={() => setMes(m)}
              className={`px-5 py-2.5 rounded-xl border font-semibold text-[14px] transition-all whitespace-nowrap
                ${mes === m ? "bg-[#007aff] text-white border-[#007aff]" : "bg-white text-[#1d1d1f] border-[#d2d2d7] hover:bg-[#f5f5f7]"}`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* FILTROS: SUCURSAL */}
        <div className="flex gap-3 mb-5 overflow-x-auto pb-2 custom-scrollbar">
          {["Todas", "Buenavista", "Masaryk"].map((s) => (
            <button
              key={s}
              onClick={() => setSucursal(s)}
              className={`px-5 py-2.5 rounded-xl border font-semibold text-[14px] transition-all whitespace-nowrap
                ${sucursal === s ? "bg-[#007aff] text-white border-[#007aff]" : "bg-white text-[#1d1d1f] border-[#d2d2d7] hover:bg-[#f5f5f7]"}`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* KPIS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <KpiCard label="Facturación" value={formatMoneda(kpis.total)} />
          <KpiCard label="Crecimiento" value={kpis.growth !== null ? formatPercent(kpis.growth) : "N/A"} isGrowth growthVal={kpis.growth} />
          <KpiCard label="Ticket Medio" value={formatMoneda(kpis.ticket)} />
          <KpiCard label="Transacciones" value={Number(kpis.tx || 0).toLocaleString()} />
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
                <XAxis dataKey="label" axisLine={false} tickLine={false} dy={10} tick={{ fill: "#86868b", fontSize: 14, fontWeight: 600, fontFamily: "sans-serif" }} />
                <YAxis axisLine={false} tickLine={false} width={70} tick={{ fill: "#86868b", fontSize: 13, fontFamily: "sans-serif" }} tickFormatter={(val) => `$${Math.round(val / 1000)}k`} />
                <Tooltip
                  cursor={{ stroke: "#e5e5ea", strokeWidth: 2, strokeDasharray: "5 5" }}
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  formatter={(val) => [formatMoneda(val), "Ventas"]}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.mes || label}
                />
                <Area type="monotone" dataKey="total" stroke="#007aff" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" activeDot={{ r: 6, strokeWidth: 3, stroke: "#fff", fill: "#007aff" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-2 mb-5 bg-white p-2 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          {[
            { id: "departamentos", label: "Departamentos" },
            { id: "vendedoras", label: "Vendedoras" },
            { id: "analisis", label: "Análisis" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-3 px-2 rounded-xl text-center font-semibold text-[14px] transition-all
                ${tab === t.id ? "bg-[#007aff] text-white" : "text-[#86868b] hover:bg-[#f5f5f7]"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* CONTENIDO */}
        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <h2 className="text-[16px] font-bold text-[#1d1d1f] mb-5">{tab === "analisis" ? "Análisis Profundo" : "Desglose"}</h2>

          {tab !== "analisis" && (
            <div>
              {dataBreakdown.length === 0 ? (
                <div className="p-5 text-center text-[#86868b]">No hay datos para esta selección.</div>
              ) : (
                dataBreakdown.map((item, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-xl mb-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)] border border-slate-50">
                    <div className="flex justify-between items-center mb-3">
                      <div className="font-semibold text-[15px] text-[#1d1d1f]">{item.name}</div>
                      <div className="font-bold text-[16px] text-[#007aff]">{formatMoneda(item.value)}</div>
                    </div>
                    <div className="h-1.5 bg-[#f5f5f7] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#007aff] to-[#0051d5] transition-all duration-500" style={{ width: `${item.percent}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "analisis" && (
            <div className="p-0 sm:p-2">
              <div className="mb-6">
                <div className="text-[13px] font-semibold text-[#86868b] mb-2 uppercase tracking-wide">Tipo de Análisis</div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={analisisTipo === "departamento"} onChange={() => setAnalisisTipo("departamento")} className="w-4 h-4 accent-[#007aff]" />
                    <span className="text-[15px] text-[#1d1d1f]">Departamento</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={analisisTipo === "vendedora"} onChange={() => setAnalisisTipo("vendedora")} className="w-4 h-4 accent-[#007aff]" />
                    <span className="text-[15px] text-[#1d1d1f]">Vendedora</span>
                  </label>
                </div>
              </div>

              <div className="mb-8">
                <div className="text-[13px] font-semibold text-[#86868b] mb-2 uppercase tracking-wide">Seleccionar</div>
                <select value={analisisItem} onChange={(e) => setAnalisisItem(e.target.value)} className="w-full p-3 text-[16px] border border-[#d1d1d6] rounded-xl bg-white outline-none focus:border-[#007aff]">
                  {opcionesAnalisis.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {!analisisData ? (
                <div className="p-5 text-center text-[#86868b]">No hay datos para este análisis.</div>
              ) : (
                <>
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
                          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#86868b", fontSize: 13, fontWeight: "bold" }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#86868b", fontSize: 12 }} tickFormatter={(val) => `$${Math.round(val / 1000)}k`} />
                          <Tooltip formatter={(val) => formatMoneda(val)} contentStyle={{ borderRadius: "8px", border: "none" }} />
                          <Area type="monotone" dataKey="total" stroke="#007aff" strokeWidth={2.5} fill="url(#colorAnalisis)" activeDot={{ r: 5, fill: "#007aff", stroke: "#fff", strokeWidth: 2 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-[#f5f5f7] rounded-2xl p-5">
                    <div className="text-[15px] font-semibold text-[#1d1d1f] mb-4">📊 Métricas Clave</div>
                    <div className="grid gap-3 text-[15px]">
                      <div className="flex justify-between border-b border-[#e5e5ea] pb-2">
                        <span className="text-[#86868b]">Promedio:</span>
                        <span className="font-semibold text-[#1d1d1f]">{formatMoneda(analisisData.promedio)}</span>
                      </div>
                      <div className="flex justify-between border-b border-[#e5e5ea] pb-2">
                        <span className="text-[#86868b]">Mejor mes:</span>
                        <span className="font-semibold text-[#34c759]">{analisisData.maxMes} ({formatMoneda(analisisData.maxVal)})</span>
                      </div>
                      <div className="flex justify-between border-b border-[#e5e5ea] pb-2">
                        <span className="text-[#86868b]">Peor mes:</span>
                        <span className="font-semibold text-[#ff3b30]">{analisisData.minMes} ({formatMoneda(analisisData.minVal)})</span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="text-[#86868b]">Tendencia Global:</span>
                        <span className={`font-semibold ${analisisData.tendencia >= 0 ? "text-[#34c759]" : "text-[#ff3b30]"}`}>
                          {analisisData.tendencia >= 0 ? "↑" : "↓"} {Math.abs(analisisData.tendencia).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

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