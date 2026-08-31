import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { sumPeriod, type DaySummary } from "./day-calculation.ts";
import { formatBRL, formatDateBR, formatDateTimeBrasilia } from "./utils.ts";

const NAVY: [number, number, number] = [11, 34, 57];
const BLUE: [number, number, number] = [30, 58, 138];
const GREEN: [number, number, number] = [34, 197, 94];
const LIGHT_GREEN: [number, number, number] = [220, 252, 231];
const LIGHT_GRAY: [number, number, number] = [248, 250, 252];
const MAIN_URL = "fatur-app.vercel.app/comece";

const number = (value: number, digits = 2) => value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number) => `${number(value, 2)}%`;
const valueOrDash = (value: string | undefined | null) => String(value || "").trim() || "—";
const periodLabel = (from: string, to: string) => from === to ? formatDateBR(from) : `${formatDateBR(from)} a ${formatDateBR(to)}`;

function appName(app: string, custom: string) {
  if (app === "Outro") return String(custom || "").trim() || "Não informado";
  return String(app || "").trim() || "Não informado";
}

export function buildReportText(days: DaySummary[], from: string, to: string): string {
  const totals = sumPeriod(days);
  const lines = [
    "🚗 *FaturApp — Relatório Completo*",
    `📅 Período: ${periodLabel(from, to)}`,
    `📊 ${days.length} dia(s) · ${totals.launches} lançamento(s)`,
    "",
    "📌 *RESUMO DO PERÍODO*",
    `💰 Receita bruta: *${formatBRL(totals.revenueGross)}*`,
    `💸 Taxas dos apps: *${formatBRL(totals.fees)}*`,
    `✅ Receita líquida: *${formatBRL(totals.revenueNet)}*`,
    `🔴 Custos operacionais: *${formatBRL(totals.operatingCosts)}*`,
    `🟢 Lucro líquido: *${formatBRL(totals.profit)}*`,
    `📈 Margem: *${percent(totals.marginPercent)}*`,
    `🛣 Distância: *${number(totals.km, 1)} km*`,
    `⏱ Horas: *${number(totals.hours, 1)} h*`,
    `📍 Lucro/km: *${formatBRL(totals.profitPerKm)}*`,
    `🕐 Lucro/h: *${formatBRL(totals.profitPerHour)}*`,
    "",
  ];

  for (const day of days) {
    lines.push(`📆 *${formatDateBR(day.date)}*`);
    lines.push(`Lucro ${formatBRL(day.profit)} · Custos ${formatBRL(day.operatingCosts)} · ${number(day.km, 1)} km · ${number(day.hours, 1)} h`);
    lines.push("💰 Receitas por aplicativo:");
    if (day.revenueItems.length) day.revenueItems.forEach((item) => lines.push(`  • ${appName(item.app, item.nomeAppPersonalizado)}: bruto ${formatBRL(item.bruto)} · taxa ${formatBRL(item.taxaValor)} · líquido ${formatBRL(item.liquido)}`));
    else lines.push("  • Não informado — R$ 0,00");
    lines.push("⛽ Abastecimentos:");
    if (day.fuelPurchases.length) day.fuelPurchases.forEach((item) => lines.push(`  • ${item.type === "alcohol" ? "Etanol" : "Gasolina"}: ${number(item.pricePerLiter > 0 ? item.amount / item.pricePerLiter : 0, 3)} L · ${formatBRL(item.amount)}`));
    else lines.push("  • —");
    lines.push(`  *Combustível abastecido: ${number(day.fuelPurchasedLiters, 3)} L · ${formatBRL(day.fuelPurchasedAmount)}*`);
    lines.push(`  Combustível consumido estimado: ${number(day.fuelConsumedLiters, 3)} L · ${formatBRL(day.fuelConsumedCost)}`);
    if (day.isolatedFuelExpense > 0) lines.push(`  Abastecimento isolado contabilizado como saída: ${formatBRL(day.isolatedFuelExpense)}`);
    lines.push("🔧 Manutenção:");
    if (day.maintenanceItems.length) day.maintenanceItems.forEach((item) => lines.push(`  • ${valueOrDash(item.description)}: ${formatBRL(item.value)}`));
    else lines.push("  • —");
    lines.push("🧾 Gastos extras:");
    if (day.extraItems.length) day.extraItems.forEach((item) => lines.push(`  • ${valueOrDash(item.name)}: ${formatBRL(item.value)}`));
    else lines.push("  • —");
    lines.push("");
  }
  lines.push("_Organize os números do seu trabalho com o FaturApp._", `https://${MAIN_URL}`);
  return lines.join("\n");
}

function drawHeader(doc: jsPDF, from: string, to: string, issuedAt: string) {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, 210, 30, "F");
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(1.2);
  doc.roundedRect(12, 8, 18, 12, 2, 2, "S");
  doc.line(15, 17, 19, 13);
  doc.line(19, 13, 22, 15);
  doc.line(22, 15, 27, 10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text("FaturApp", 35, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Visibilidade total sobre o seu lucro real", 35, 19);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Relatório Completo", 198, 10, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`Período: ${periodLabel(from, to)}`, 198, 16, { align: "right" });
  doc.text(`Emitido em ${issuedAt}`, 198, 21, { align: "right" });
}

function drawSummary(doc: jsPDF, days: DaySummary[]) {
  const totals = sumPeriod(days);
  const cards = [
    { label: "Lucro líquido", value: formatBRL(totals.profit), color: totals.profit >= 0 ? GREEN : [225, 29, 72] as [number, number, number] },
    { label: "Receita bruta", value: formatBRL(totals.revenueGross), color: BLUE },
    { label: "Taxas", value: formatBRL(totals.fees), color: NAVY },
    { label: "Custos", value: formatBRL(totals.operatingCosts), color: NAVY },
    { label: "Km", value: `${number(totals.km, 1)} km`, color: BLUE },
    { label: "Horas", value: `${number(totals.hours, 1)} h`, color: BLUE },
    { label: "Lucro/km", value: formatBRL(totals.profitPerKm), color: totals.profitPerKm >= 0 ? GREEN : [225, 29, 72] as [number, number, number] },
    { label: "Lucro/h", value: formatBRL(totals.profitPerHour), color: totals.profitPerHour >= 0 ? GREEN : [225, 29, 72] as [number, number, number] },
    { label: "Margem", value: percent(totals.marginPercent), color: totals.marginPercent >= 0 ? GREEN : [225, 29, 72] as [number, number, number] },
  ];
  cards.forEach((card, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const x = 12 + col * 63;
    const y = 36 + row * 17;
    doc.setFillColor(...LIGHT_GRAY);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, 59, 13, 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(card.label.toUpperCase(), x + 3, y + 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(index === 0 ? 10 : 8.5);
    doc.setTextColor(...card.color);
    doc.text(card.value, x + 3, y + 10);
  });
}

function tableTheme() {
  return {
    theme: "striped" as const,
    styles: { font: "helvetica", fontSize: 7, cellPadding: 1.8, valign: "middle" as const },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255] as [number, number, number], fontStyle: "bold" as const },
    alternateRowStyles: { fillColor: LIGHT_GRAY },
    footStyles: { fillColor: LIGHT_GREEN, textColor: NAVY, fontStyle: "bold" as const },
    margin: { top: 34, right: 12, bottom: 17, left: 12 },
    showHead: "everyPage" as const,
    showFoot: "lastPage" as const,
  };
}

function sectionTitle(doc: jsPDF, title: string, y: number) {
  doc.setFillColor(...BLUE);
  doc.roundedRect(12, y - 5, 186, 8, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(title, 16, y);
}

export function createReportPdf(days: DaySummary[], from: string, to: string): jsPDF {
  const totals = sumPeriod(days);
  const issued = formatDateTimeBrasilia(new Date());
  const issuedAt = `${issued.date} às ${issued.time}`;
  const doc = new jsPDF("portrait", "mm", "a4");
  drawSummary(doc, days);
  sectionTitle(doc, "Balanço total por dia", 91);
  autoTable(doc, {
    ...tableTheme(),
    startY: 96,
    head: [["Data", "Receita bruta", "Receita líquida", "Taxas", "Custos", "Lucro", "Km", "Horas", "Lucro/km", "Lucro/h"]],
    body: days.map((day) => [formatDateBR(day.date), formatBRL(day.revenueGross), formatBRL(day.revenueNet), formatBRL(day.fees), formatBRL(day.operatingCosts), formatBRL(day.profit), number(day.km, 1), number(day.hours, 1), formatBRL(day.profitPerKm), formatBRL(day.profitPerHour)]),
    foot: [["TOTAL", formatBRL(totals.revenueGross), formatBRL(totals.revenueNet), formatBRL(totals.fees), formatBRL(totals.operatingCosts), formatBRL(totals.profit), number(totals.km, 1), number(totals.hours, 1), formatBRL(totals.profitPerKm), formatBRL(totals.profitPerHour)]],
    columnStyles: Object.fromEntries(Array.from({ length: 10 }, (_, index) => [index, { halign: index === 0 ? "left" : "right" }])),
  });

  let y = (doc as any).lastAutoTable.finalY + 12;
  const ensure = (height = 30) => { if (y + height > 278) { doc.addPage(); y = 40; } };
  const addTable = (title: string, head: string[], body: string[][], foot: string[]) => {
    ensure(30);
    sectionTitle(doc, title, y);
    autoTable(doc, {
      ...tableTheme(),
      startY: y + 5,
      head: [head],
      body: body.length ? body : [["—", ...head.slice(1).map(() => "—")]],
      foot: [foot],
      columnStyles: Object.fromEntries(head.map((_, index) => [index, { halign: index < 2 ? "left" : "right" }])),
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  };

  const revenueRows = days.flatMap((day) => day.revenueItems.map((item) => [formatDateBR(day.date), appName(item.app, item.nomeAppPersonalizado), formatBRL(item.bruto), percent(item.taxa), formatBRL(item.taxaValor), formatBRL(item.liquido)]));
  addTable("Receitas por aplicativo", ["Data", "Aplicativo", "Bruta", "Taxa %", "Taxa R$", "Líquida"], revenueRows, ["TOTAL", "", formatBRL(totals.revenueGross), "", formatBRL(totals.fees), formatBRL(totals.revenueNet)]);

  const fuelRows = days.flatMap((day) => day.fuelPurchases.map((item) => [formatDateBR(day.date), item.type === "alcohol" ? "Etanol" : "Gasolina", `${number(item.pricePerLiter > 0 ? item.amount / item.pricePerLiter : 0, 3)} L`, formatBRL(item.amount)]));
  addTable("Combustível", ["Data", "Tipo", "Litros abastecidos", "Valor"], fuelRows, ["Combustível abastecido", "", `${number(totals.fuelPurchasedLiters, 3)} L`, formatBRL(totals.fuelPurchasedAmount)]);
  addTable("Combustível consumido estimado", ["Período", "Descrição", "Litros", "Valor"], [[periodLabel(from, to), "Consumo estimado da rodagem", `${number(totals.fuelConsumedLiters, 3)} L`, formatBRL(totals.fuelConsumedCost)]], ["TOTAL", "", `${number(totals.fuelConsumedLiters, 3)} L`, formatBRL(totals.fuelConsumedCost)]);

  const maintenanceRows = days.flatMap((day) => day.maintenanceItems.map((item) => [formatDateBR(day.date), valueOrDash(item.description), formatBRL(item.value)]));
  addTable("Manutenção", ["Data", "Descrição", "Valor"], maintenanceRows, ["", "TOTAL", formatBRL(totals.maintenance)]);
  const extraRows = days.flatMap((day) => day.extraItems.map((item) => [formatDateBR(day.date), valueOrDash(item.name), formatBRL(item.value)]));
  addTable("Gastos extras", ["Data", "Descrição", "Valor"], extraRows, ["", "TOTAL", formatBRL(totals.extras)]);

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    drawHeader(doc, from, to, issuedAt);
    doc.setDrawColor(226, 232, 240);
    doc.line(12, 285, 198, 285);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("Organize os números do seu trabalho", 12, 290);
    doc.text(MAIN_URL, 105, 290, { align: "center" });
    doc.text(`Página ${page} de ${pages}`, 198, 290, { align: "right" });
  }
  return doc;
}
