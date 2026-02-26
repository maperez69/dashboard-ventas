export const normalizeText = (v) => String(v ?? "").trim();

export const monthKey = (mesCompleto) => {
  const s = normalizeText(mesCompleto);
  const [mesTxtRaw, yearRaw] = s.split(/\s+/);

  const map = {
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

  const mesTxt = normalizeText(mesTxtRaw).toLowerCase();
  const year = Number(yearRaw) || 0;
  const month = map[mesTxt] || 0;

  if (!year || !month) return "9999-99";
  return `${year}-${String(month).padStart(2, "0")}`;
};

export const mesCorto = (mesCompleto) => {
  const s = normalizeText(mesCompleto).toLowerCase();
  const nombre = s.split(/\s+/)[0];

  const mapa = {
    enero: "Ene",
    febrero: "Feb",
    marzo: "Mar",
    abril: "Abr",
    mayo: "May",
    junio: "Jun",
    julio: "Jul",
    agosto: "Ago",
    septiembre: "Sep",
    setiembre: "Sep",
    octubre: "Oct",
    noviembre: "Nov",
    diciembre: "Dic",
  };

  return mapa[nombre] || normalizeText(nombre).slice(0, 3);
};