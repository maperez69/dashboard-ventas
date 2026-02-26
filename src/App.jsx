import React, { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
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

import { enero2026Data } from "./data/enero2026Data";
import { octubre2025Data } from "./data/octubre2025Data";

/** =========================
 *  CONFIG
 *  ========================= */
const STORAGE_KEY = "mos_data_v1";

const MONTHS_ES = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

const MONTH_ABBR = {
  1: "Ene",
  2: "Feb",
  3: "Mar",
  4: "Abr",
  5: "May",
  6: "Jun",
  7: "Jul",
  8: "Ago",
  9: "Sep",
  10: "Oct",
  11: "Nov",
  12: "Dic",
};

const SUCURSALES = ["Todas", "Buenavista", "Masaryk"];

/** =========================
 *  HELPERS
 *  ========================= */
function normalizeText(s) {
  return String(s ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function toNumber(x) {
  if (x === null || x === undefined) return 0;
  const s = String(x)
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/**
 * "Enero 2026" -> { y: 2026, m: 1, key: "2026-01" }
 */
function parseMesLabel(mesLabel) {
  const raw = normalizeText(mesLabel).toLowerCase();
  const parts = raw.split(" ");
  // acepta "Enero 2026" / "Enero-2026" / "Enero_2026"
  const tokens = raw.replace(/[-_]/g, " ").split(" ").filter(Boolean);
  const monthName = tokens[0] || "";
  const yearStr = tokens.find((t) => /^\d{4}$/.test(t)) || "";
  const y = Number(yearStr) || 0;
  const m = MONTHS_ES[monthName] || 0;
  const key = y && m ? `${y}-${String(m).padStart(2, "0")}` : "0000-00";
  return { y, m, key };
}

function monthButtonLabel(mesLabel) {
  const { y, m } = parseMesLabel(mesLabel);
  if (!y || !m) return mesLabel;
  return `${MONTH_ABBR[m]} ${String(y).slice(-2)}`; // Oct 25, Ene 26
}

/**
 * Dedupe key por fila: mes|sucursal|linea|vendedora|precioTotal|cantidad
 * (si vuelves a subir el mismo CSV, no duplica)
 */
function rowKey(r) {
  return [
    normalizeText(r.mes).toLowerCase(),
    normalizeText(r.sucursal).toLowerCase(),
    normalizeText(r.linea).toLowerCase(),
    normalizeText(r.vendedora).toLowerCase(),
    String(Number(r.precioTotal || 0)),
    String(Number(r.cantidad || 0)),
  ].join("|");
}

function formatMoneda(val) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
  }).format(val || 0);
}

function formatPercent(val) {
  if (val === null || val === undefined) return "N/A";
  const sign = val >= 0 ? "+" : "";
  return `${sign}${val.toFixed(1)}%`;
}

/** =========================
 *  BASELINE DATA
 *  ========================= */
const BASE_DATA = [
  ...octubre2025Data,
  // si tienes noviembre/diciembre como data files también, agrégalos aquí
  ...enero2026Data,
];

/** =========================
 *  APP
 *  ========================= */
export default function App() {
  // 1) Data (persistente)
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return BASE_DATA;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return BASE_DATA;
      return parsed;
    } catch {
      return BASE_DATA;
    }
  });

  // persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // si localStorage falla, no truena la app
    }
  }, [data]);

  // 2) Meses disponibles (ordenados por fecha real)
  const mesesDisponibles = useMemo(() => {
    const unique = Array.from(new Set(data.map((d) => d.mes))).filter(Boolean);
    unique.sort((a, b) => {
      const A = parseMesLabel(a).key;
      const B = parseMesLabel(b).key;
      return A.localeCompare(B);
    });
    return unique;
  }, [data]);

  // 3) Filtros
  const [mes, setMes] = useState(() => {
    // default: último mes disponible
    if (BASE_DATA.length === 0) return "";
    const unique = Array.from(new Set(BASE_DATA.map((d) => d.mes))).filter(Boolean);
    unique.sort((a, b) => parseMesLabel(a).key.localeCompare(parseMesLabel(b).key));
    return unique[unique.length - 1] || "";
  });
  const [sucursal, setSucursal] = useState("Todas");

  // asegura mes válido
  useEffect(() => {
    if (!mesesDisponibles.length) return;
    if (!mesesDisponibles.includes(mes)) {
      setMes(mesesDisponibles[mesesDisponibles.length - 1]);
    }
  }, [mesesDisponibles, mes]);

  // 4) Upload CSV (robusto)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = Array.isArray(results.data) ? results.data : [];

        // Mapeo flexible de headers (por si vienen con mayúsculas/acentos)
        const pick = (obj, keys) => {
          for (const k of keys) {
            if (obj[k] !== undefined) return obj[k];
          }
          return "";
        };

        const parsed = rows
          .map((r) => {
            const mesVal = pick(r, ["Mes", "mes"]);
            const sucVal = pick(r, ["Sucursal", "sucursal"]);
            const linVal = pick(r, ["Linea", "Línea", "linea", "línea"]);
            const venVal = pick(r, ["Vendedora", "vendedora"]);
            const ptVal = pick(r, ["Precio Total", "precioTotal", "precio total", "Total", "total"]);
            const cVal = pick(r, ["Cantidad", "cantidad", "Qty", "qty"]);

            const item = {
              mes: normalizeText(mesVal),
              sucursal: normalizeText(sucVal),
              linea: normalizeText(linVal),
              vendedora: normalizeText(venVal),
              precioTotal: toNumber(ptVal),
              cantidad: toNumber(cVal),
            };

            // filtros mínimos
            if (!item.mes || !item.sucursal || !item.linea) return null;
            if (item.precioTotal <= 0) return null;

            return item;
          })
          .filter(Boolean);

        if (!parsed.length) return;

        // dedupe contra lo existente + dentro del mismo upload
        const existing = new Set(data.map(rowKey));
        const next = [...data];

        for (const r of parsed) {
          const k = rowKey(r);
          if (existing.has(k)) continue;
          existing.add(k);
          next.push(r);
        }

        setData(next);
      },
      error: () => {
        // si falla parseo, no revientes UI
      },
    });

    // permitir re-subir el mismo archivo
    e.target.value = "";
  };

  // 5) Data filtrada por mes/sucursal
  const dataMesActual = useMemo(() => {
    return data.filter(
      (d) => d.mes === mes && (sucursal === "Todas" || d.sucursal === sucursal)
    );
  }, [data, mes, sucursal]);

  const dataMesAnterior = useMemo(() => {
    const idx = mesesDisponibles.indexOf(mes);
    if (idx <= 0) return [];
    const mesAnt = mesesDisponibles[idx - 1];
    return data.filter(
      (d) => d.mes === mesAnt && (sucursal === "Todas" || d.sucursal === sucursal)
    );
  }, [data, mes, sucursal, mesesDisponibles]);

  // 6) KPIs
  const kpis = useMemo(() => {
    const total = dataMesActual.reduce((acc, d) => acc + (d.precioTotal || 0), 0);
    const prev = dataMesAnterior.reduce((acc, d) => acc + (d.precioTotal || 0), 0);
    const tx = dataMesActual.reduce((acc, d) => acc + (d.cantidad || 0), 0);
    const growth = prev > 0 ? ((total - prev) / prev) * 100 : null;
    const ticket = tx > 0 ? total / tx : 0;

    return { total, prev, tx, growth, ticket };
  }, [dataMesActual, dataMesAnterior]);

  // 7) Evolución
  const dataEvolucion = useMemo(() => {
    return mesesDisponibles.map((mLabel) => {
      const mData = data.filter(
        (d) => d.mes === mLabel && (sucursal === "Todas" || d.sucursal === sucursal)
      );
      return {
        mes: mLabel,
        label: monthButtonLabel(mLabel).split(" ")[0], // "Oct", "Ene" en el eje
        total: mData.reduce((acc, d) => acc + (d.precioTotal || 0), 0),
      };
    });
  }, [data, mesesDisponibles, sucursal]);

  // Reset baseline
  const handleReset = () => {
    if (!confirm("¿Resetear datos cargados y volver al baseline?")) return;
    setData(BASE_DATA);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] p-3 md:p-5 font-sans text-[#1d1d1f]">
      <div className="max-w-[1200px] mx-auto">
        {/* HEADER */}
        <div className="bg-white p-6 rounded-2xl mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex justify-between items-center flex-wrap gap-3">
          <div>
            <h1 className="text-[28px] font-extrabold tracking-tight mb-1">
              MOS Dashboard
            </h1>
            <p className="text-[#86868b] text-[14px]">Reporte de Ventas CRM (Odoo)</p>
          </div>

          <div className="flex gap-2">
            <label className="cursor-pointer px-5 py-2.5 rounded-xl border border-[#d2d2d7] bg-white font-semibold text-[14px] hover:bg-[#f5f5f7] transition-all flex items-center gap-2 whitespace-nowrap">
              <UploadCloud size={18} />
              Cargar CSV (Mes Nuevo)
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>

            <button
              onClick={handleReset}
              className="px-5 py-2.5 rounded-xl border border-[#d2d2d7] bg-white font-semibold text-[14px] hover:bg-[#f5f5f7] transition-all whitespace-nowrap"
            >
              Reset
            </button>
          </div>
        </div>

        {/* FILTROS: MES */}
        <div className="flex gap-3 mb-4 overflow-x-auto pb-2 custom-scrollbar">
          {mesesDisponibles.map((m) => (
            <button
              key={m}
              onClick={() => setMes(m)}
              className={`px-5 py-2.5 rounded-xl border font-semibold text-[14px] transition-all whitespace-nowrap
                ${
                  mes === m
                    ? "bg-[#007aff] text-white border-[#007aff]"
                    : "bg-white text-[#1d1d1f] border-[#d2d2d7] hover:bg-[#f5f5f7]"
                }`}
            >
              {monthButtonLabel(m)} {/* Oct 25 / Ene 26 */}
            </button>
          ))}
        </div>

        {/* FILTROS: SUCURSAL */}
        <div className="flex gap-3 mb-5 overflow-x-auto pb-2 custom-scrollbar">
          {SUCURSALES.map((s) => (
            <button
              key={s}
              onClick={() => setSucursal(s)}
              className={`px-5 py-2.5 rounded-xl border font-semibold text-[14px] transition-all whitespace-nowrap
                ${
                  sucursal === s
                    ? "bg-[#007aff] text-white border-[#007aff]"
                    : "bg-white text-[#1d1d1f] border-[#d2d2d7] hover:bg-[#f5f5f7]"
                }`}
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
            value={kpis.growth !== null ? formatPercent(kpis.growth) : "N/A"}
            isGrowth
            growthVal={kpis.growth}
          />
          <KpiCard label="Ticket Medio" value={formatMoneda(kpis.ticket)} />
          <KpiCard label="Transacciones" value={(kpis.tx || 0).toLocaleString()} />
        </div>

        {/* EVOLUCIÓN */}
        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] mb-5">
          <h2 className="text-[16px] font-bold mb-5">Evolución de Ventas</h2>
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
                  tick={{ fill: "#86868b", fontSize: 14, fontWeight: 600, fontFamily: "sans-serif" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={70}
                  tick={{ fill: "#86868b", fontSize: 13, fontFamily: "sans-serif" }}
                  tickFormatter={(val) => `$${Math.round(val / 1000)}k`}
                />
                <Tooltip
                  cursor={{ stroke: "#e5e5ea", strokeWidth: 2, strokeDasharray: "5 5" }}
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  formatter={(val) => [formatMoneda(val), "Ventas"]}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#007aff"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                  activeDot={{ r: 6, strokeWidth: 3, stroke: "#fff", fill: "#007aff" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* scroll bar mobile */}
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
      <div className="text-[12px] text-[#86868b] uppercase tracking-wide font-semibold mb-2">
        {label}
      </div>
      <div className="text-[32px] font-bold leading-none">{value}</div>

      {isGrowth && growthVal !== null && (
        <div className={`text-[14px] mt-2 font-semibold ${growthVal >= 0 ? "text-[#34c759]" : "text-[#ff3b30]"}`}>
          {growthVal >= 0 ? "↑" : "↓"} {Math.abs(growthVal).toFixed(1)}% vs anterior
        </div>
      )}

      {isGrowth && growthVal === null && (
        <div className="text-[14px] mt-2 font-semibold text-[#86868b]">Sin mes anterior</div>
      )}
    </div>
  );
}