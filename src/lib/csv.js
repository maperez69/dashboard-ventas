import Papa from "papaparse";
import { normalizeText } from "./meses";

export const canonicalHeader = (h) =>
  normalizeText(h)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[áàä]/g, "a")
    .replace(/[éèë]/g, "e")
    .replace(/[íìï]/g, "i")
    .replace(/[óòö]/g, "o")
    .replace(/[úùü]/g, "u");

const HEADER_MAP = {
  mes: ["mes"],
  sucursal: ["sucursal"],
  linea: ["linea", "línea"],
  vendedora: ["vendedora", "vendedor", "asesor", "asesora"],
  precioTotal: ["precio total", "total", "importe", "monto", "venta", "ventas"],
  cantidad: ["cantidad", "qty", "unidades", "transacciones", "tx"],
};

const pickHeader = (headers, wantedList) => {
  const canonHeaders = headers.map(canonicalHeader);
  for (const wanted of wantedList) {
    const idx = canonHeaders.indexOf(canonicalHeader(wanted));
    if (idx >= 0) return headers[idx];
  }
  return null;
};

export const normalizeRow = (r) => ({
  mes: normalizeText(r.mes),
  sucursal: normalizeText(r.sucursal),
  linea: normalizeText(r.linea),
  vendedora: normalizeText(r.vendedora),
  precioTotal: Number(r.precioTotal) || 0,
  cantidad: Number(r.cantidad) || 0,
});

export const parseCSVFile = (file, { onSuccess, onError }) => {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const rows = results.data || [];
      const headers = results.meta?.fields || [];

      const hMes = pickHeader(headers, HEADER_MAP.mes);
      const hSuc = pickHeader(headers, HEADER_MAP.sucursal);
      const hLin = pickHeader(headers, HEADER_MAP.linea);
      const hVen = pickHeader(headers, HEADER_MAP.vendedora);
      const hTot = pickHeader(headers, HEADER_MAP.precioTotal);
      const hCan = pickHeader(headers, HEADER_MAP.cantidad);

      const missing = [];
      if (!hMes) missing.push("Mes");
      if (!hSuc) missing.push("Sucursal");
      if (!hLin) missing.push("Linea");
      if (!hVen) missing.push("Vendedora");
      if (!hTot) missing.push("Precio Total");
      if (!hCan) missing.push("Cantidad");

      if (missing.length) {
        onError?.(
          `CSV inválido. Faltan columnas: ${missing.join(
            ", "
          )}\nSe esperan: Mes, Sucursal, Linea, Vendedora, Precio Total, Cantidad`
        );
        return;
      }

      const parsed = rows
        .map((r) => ({
          mes: r[hMes],
          sucursal: r[hSuc],
          linea: r[hLin],
          vendedora: r[hVen],
          precioTotal: Number(String(r[hTot]).replace(/[$,]/g, "")) || 0,
          cantidad: Number(String(r[hCan]).replace(/[,]/g, "")) || 0,
        }))
        .map(normalizeRow)
        .filter((x) => x.mes && x.sucursal && x.precioTotal > 0);

      if (!parsed.length) {
        onError?.("No se detectaron filas válidas en el CSV.");
        return;
      }

      onSuccess?.(parsed);
    },
    error: () => {
      onError?.("No pude leer el CSV. Cierra Excel si lo tienes abierto y vuelve a intentar.");
    },
  });
};