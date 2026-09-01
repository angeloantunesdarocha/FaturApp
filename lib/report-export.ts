import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { sumPeriod, type DaySummary } from "./day-calculation.ts";
import { FATURAPP_LOGO_PNG_DATA_URI } from "./faturapp-logo.ts";
import { FATURAPP_PDF_FONT_BOLD_BASE64, FATURAPP_PDF_FONT_REGULAR_BASE64 } from "./faturapp-pdf-font.ts";
import { formatBRL, formatDateBR, formatDateTimeBrasilia } from "./utils.ts";

const NAVY: [number, number, number] = [11, 34, 57];
const BLUE: [number, number, number] = [30, 58, 138];
const GREEN: [number, number, number] = [34, 197, 94];
const LIGHT_GREEN: [number, number, number] = [220, 252, 231];
const LIGHT_GRAY: [number, number, number] = [248, 250, 252];
const WHITE: [number, number, number] = [255, 255, 255];
const BORDER: [number, number, number] = [226, 232, 240];
const MAIN_URL = "fatur-app.vercel.app/comece";
const PAGE_TOTAL_TOKEN = "__FATURAPP_TOTAL_PAGES__";
const PDF_FONT_FAMILY = "FaturAppSans";

const number = (value: number, digits = 2) => value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number) => `${number(value, 2)}%`;
const valueOrNotInformed = (value: string | undefined | null) => String(value || "").trim() || "Não informado";
const periodLabel = (from: string, to: string) => from === to ? formatDateBR(from) : `${formatDateBR(from)} a ${formatDateBR(to)}`;

function appName(app: string, custom: string) {
  if (app === "Outro") return String(custom || "").trim() || "Não informado";
  return String(app || "").trim() || "Não informado";
}

export function buildReportText(days: DaySummary[], from: string, to: string): string {
  const totals = sumPeriod(days);
  const lines = [
    "🚗 *FaturApp - Relatório Completo*",
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
    else lines.push("  • Não informado - R$ 0,00");
    lines.push("⛽ Abastecimentos:");
    if (day.fuelPurchases.length) day.fuelPurchases.forEach((item) => lines.push(`  • ${item.type === "alcohol" ? "Etanol" : "Gasolina"}: ${number(item.pricePerLiter > 0 ? item.amount / item.pricePerLiter : 0, 3)} L · ${formatBRL(item.amount)}`));
    else lines.push("  • Não informado");
    lines.push(`  *Combustível abastecido: ${number(day.fuelPurchasedLiters, 3)} L · ${formatBRL(day.fuelPurchasedAmount)}*`);
    lines.push(`  Combustível consumido estimado: ${number(day.fuelConsumedLiters, 3)} L · ${formatBRL(day.fuelConsumedCost)}`);
    if (day.isolatedFuelExpense > 0) lines.push(`  Abastecimento isolado contabilizado como saída: ${formatBRL(day.isolatedFuelExpense)}`);
    lines.push("🔧 Manutenção:");
    if (day.maintenanceItems.length) day.maintenanceItems.forEach((item) => lines.push(`  • ${valueOrNotInformed(item.description)}: ${formatBRL(item.value)}`));
    else lines.push("  • Não informado");
    lines.push("🧾 Gastos extras:");
    if (day.extraItems.length) day.extraItems.forEach((item) => lines.push(`  • ${valueOrNotInformed(item.name)}: ${formatBRL(item.value)}`));
    else lines.push("  • Não informado");
    lines.push("");
  }
  lines.push("_Organize os números do seu trabalho com o FaturApp._", `https://${MAIN_URL}`);
  return lines.join("\n");
}

function drawHeader(doc: jsPDF, from: string, to: string, issuedAt: string) {
  doc.setCharSpace(0);
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, 210, 30, "F");
  doc.addImage(FATURAPP_LOGO_PNG_DATA_URI, "PNG", 11, 4, 22, 22, "faturapp-logo", "FAST");
  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(15);
  doc.setTextColor(...WHITE);
  doc.text("FaturApp", 37, 14);
  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.setFontSize(7.5);
  doc.text("Visibilidade total sobre o seu lucro real", 37, 19);
  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(11);
  doc.text("Relatório Completo", 198, 10, { align: "right", maxWidth: 76 });
  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.setFontSize(7.5);
  doc.text(`Período: ${periodLabel(from, to)}`, 198, 16, { align: "right", maxWidth: 76 });
  doc.text(`Emitido em ${issuedAt}`, 198, 21, { align: "right", maxWidth: 76 });
}

function drawFooter(doc: jsPDF, page: number) {
  // Strings deliberately remain single text nodes: jsPDF never splits these
  // into the broken words seen in the previous footer implementation.
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.25);
  doc.line(12, 276, 198, 276);
  doc.setCharSpace(0);
  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("Organize os números do seu trabalho", 12, 282);
  doc.text(`Página ${page} de ${PAGE_TOTAL_TOKEN}`, 12, 290);
  doc.text(MAIN_URL, 105, 290, { align: "center" });
  doc.addImage(FATURAPP_LOGO_PNG_DATA_URI, "PNG", 186, 278, 10, 10, "faturapp-logo", "FAST");
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
    doc.setFont(PDF_FONT_FAMILY, "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(card.label.toUpperCase(), x + 3, y + 4);
    doc.setFont(PDF_FONT_FAMILY, "bold");
    doc.setFontSize(index === 0 ? 10 : 8.5);
    doc.setTextColor(...card.color);
    doc.text(card.value, x + 3, y + 10);
  });
}

type TableLayout = {
  left?: number;
  width?: number;
  right?: number;
};
type ColumnStyles = Record<number, { halign: "left" | "right"; cellWidth?: number | "wrap" }>;

function tableTheme(
  columnStyles: ColumnStyles,
  decoratePage: (doc: jsPDF) => void,
  layout: TableLayout = {},
) {
  const left = layout.left ?? 12;
  const right = layout.right ?? 12;
  return {
    theme: "plain" as const,
    styles: {
      font: PDF_FONT_FAMILY,
      fontSize: 6.2,
      cellWidth: "wrap" as const,
      cellPadding: { top: 2, right: 1.8, bottom: 2, left: 1.8 },
      valign: "middle" as const,
      lineColor: BORDER,
      lineWidth: 0.15,
      overflow: "linebreak" as const,
    },
    headStyles: {
      fillColor: NAVY,
      textColor: WHITE,
      fontStyle: "bold" as const,
      halign: "left" as const,
      cellPadding: { top: 2.4, right: 1.8, bottom: 2.4, left: 1.8 },
    },
    footStyles: {
      fillColor: LIGHT_GREEN,
      textColor: NAVY,
      fontStyle: "bold" as const,
      cellPadding: { top: 2.2, right: 1.8, bottom: 2.2, left: 1.8 },
    },
    columnStyles,
    // Let each column use only the width required by its longest cell. This
    // keeps the report compact while retaining predictable left alignment.
    tableWidth: layout.width ?? ("wrap" as const),
    rowPageBreak: "avoid" as const,
    margin: { top: 34, right, bottom: 25, left },
    showHead: "everyPage" as const,
    showFoot: "lastPage" as const,
    didParseCell(data: any) {
      const columnStyle = columnStyles[data.column.index];
      if (columnStyle) {
        // AutoTable applies columnStyles.halign to body cells only. Applying
        // it here also keeps headers and TOTAL cells on the same left edge.
        data.cell.styles.halign = columnStyle.halign;
        if (columnStyle.cellWidth !== undefined) {
          data.cell.styles.cellWidth = columnStyle.cellWidth;
        }
      }
      if (data.section === "body") {
        data.cell.styles.fillColor = data.row.index % 2 === 0 ? WHITE : LIGHT_GRAY;
      }
      if (data.section === "foot") {
        data.cell.styles.fillColor = LIGHT_GREEN;
        data.cell.styles.fontStyle = "bold";
      }
    },
    didDrawPage(data: any) {
      decoratePage(data.doc as jsPDF);
    },
  };
}

function sectionTitle(doc: jsPDF, title: string, y: number, x = 12, width = 186) {
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.35);
  doc.line(x, y - 8, x + width, y - 8);
  doc.setTextColor(...NAVY);
  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(10);
  doc.text(title, x, y);
}

export function createReportPdf(days: DaySummary[], from: string, to: string): jsPDF {
  const totals = sumPeriod(days);
  const issued = formatDateTimeBrasilia(new Date());
  const issuedAt = `${issued.date} às ${issued.time}`;
  const doc = new jsPDF("portrait", "mm", "a4");
  doc.addFileToVFS(`${PDF_FONT_FAMILY}-regular.ttf`, FATURAPP_PDF_FONT_REGULAR_BASE64);
  doc.addFileToVFS(`${PDF_FONT_FAMILY}-bold.ttf`, FATURAPP_PDF_FONT_BOLD_BASE64);
  doc.addFont(`${PDF_FONT_FAMILY}-regular.ttf`, PDF_FONT_FAMILY, "normal");
  doc.addFont(`${PDF_FONT_FAMILY}-bold.ttf`, PDF_FONT_FAMILY, "bold");
  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.setCharSpace(0);
  const decoratedPages = new Set<number>();
  const decoratePage = (currentDoc: jsPDF) => {
    const page = currentDoc.getCurrentPageInfo().pageNumber;
    if (decoratedPages.has(page)) return;
    decoratedPages.add(page);
    drawHeader(currentDoc, from, to, issuedAt);
    drawFooter(currentDoc, page);
  };

  drawSummary(doc, days);
  sectionTitle(doc, "Balanço total por dia", 91);
  autoTable(doc, {
    ...tableTheme({
      0: { halign: "left", cellWidth: 19 },
      1: { halign: "left", cellWidth: 21 },
      2: { halign: "left", cellWidth: 22 },
      3: { halign: "left", cellWidth: 18 },
      4: { halign: "left", cellWidth: 19 },
      5: { halign: "left", cellWidth: 19 },
      6: { halign: "left", cellWidth: 13 },
      7: { halign: "left", cellWidth: 15 },
      8: { halign: "left", cellWidth: 20 },
      9: { halign: "left", cellWidth: 20 },
    }, decoratePage, { width: 186 }),
    startY: 96,
    head: [["Data", "Receita bruta", "Receita líquida", "Taxas", "Custos", "Lucro", "Km", "Horas", "Lucro/km", "Lucro/h"]],
    body: days.map((day) => [formatDateBR(day.date), formatBRL(day.revenueGross), formatBRL(day.revenueNet), formatBRL(day.fees), formatBRL(day.operatingCosts), formatBRL(day.profit), number(day.km, 1), number(day.hours, 1), formatBRL(day.profitPerKm), formatBRL(day.profitPerHour)]),
    foot: [["TOTAL", formatBRL(totals.revenueGross), formatBRL(totals.revenueNet), formatBRL(totals.fees), formatBRL(totals.operatingCosts), formatBRL(totals.profit), number(totals.km, 1), number(totals.hours, 1), formatBRL(totals.profitPerKm), formatBRL(totals.profitPerHour)]],
  });

  let y = (doc as any).lastAutoTable.finalY + 12;
  const ensure = (height = 30) => { if (y + height > 270) { doc.addPage(); y = 40; } };
  const renderTable = (
    title: string,
    head: string[],
    body: string[][],
    foot: string[],
    columnStyles: ColumnStyles,
    startY: number,
    left = 12,
    width = 186,
  ) => {
    const right = 210 - left - width;
    sectionTitle(doc, title, startY, left, width);
    autoTable(doc, {
      ...tableTheme(columnStyles, decoratePage, { left, right, width }),
      startY: startY + 5,
      head: [head],
      body: body.length ? body : [["Não informado", ...head.slice(1).map(() => "Não informado")]],
      foot: [foot],
    });
    return (doc as any).lastAutoTable.finalY as number;
  };

  const revenueRows = days.flatMap((day) => day.revenueItems.map((item) => [formatDateBR(day.date), appName(item.app, item.nomeAppPersonalizado), formatBRL(item.bruto), percent(item.taxa), formatBRL(item.taxaValor), formatBRL(item.liquido)]));
  ensure(30);
  y = renderTable("Receitas por aplicativo", ["Data", "Aplicativo", "Bruta", "Taxa %", "Taxa R$", "Líquida"], revenueRows, ["TOTAL", "Não informado", formatBRL(totals.revenueGross), percent(totals.revenueGross > 0 ? totals.fees * 100 / totals.revenueGross : 0), formatBRL(totals.fees), formatBRL(totals.revenueNet)], {
    0: { halign: "left" }, 1: { halign: "left" }, 2: { halign: "left" }, 3: { halign: "left" }, 4: { halign: "left" }, 5: { halign: "left" },
  }, y) + 12;

  const fuelRows = days.flatMap((day) => day.fuelPurchases.map((item) => [formatDateBR(day.date), item.type === "alcohol" ? "Etanol" : "Gasolina", `${number(item.pricePerLiter > 0 ? item.amount / item.pricePerLiter : 0, 3)} L`, formatBRL(item.amount)]));
  const fuelPurchasedSpec = {
    title: "Combustível abastecido",
    head: ["Data", "Tipo", "Litros abastecidos", "Valor"],
    body: fuelRows,
    foot: ["Combustível abastecido", "Não informado", `${number(totals.fuelPurchasedLiters, 3)} L`, formatBRL(totals.fuelPurchasedAmount)],
    styles: {
      0: { halign: "left" }, 1: { halign: "left" }, 2: { halign: "left" }, 3: { halign: "left" },
    } as ColumnStyles,
  };
  const fuelConsumedSpec = {
    title: "Combustível consumido estimado",
    head: ["Período", "Descrição", "Litros", "Valor"],
    body: [[periodLabel(from, to), "Consumo estimado da rodagem", `${number(totals.fuelConsumedLiters, 3)} L`, formatBRL(totals.fuelConsumedCost)]],
    foot: ["TOTAL", "Não informado", `${number(totals.fuelConsumedLiters, 3)} L`, formatBRL(totals.fuelConsumedCost)],
    styles: {
      0: { halign: "left" }, 1: { halign: "left" }, 2: { halign: "left" }, 3: { halign: "left" },
    } as ColumnStyles,
  };

  const maintenanceRows = days.flatMap((day) => day.maintenanceItems.map((item) => [formatDateBR(day.date), valueOrNotInformed(item.description), formatBRL(item.value)]));
  const maintenanceSpec = {
    title: "Manutenção",
    head: ["Data", "Descrição", "Valor"],
    body: maintenanceRows,
    foot: ["Não informado", "TOTAL", formatBRL(totals.maintenance)],
    styles: {
      0: { halign: "left" }, 1: { halign: "left" }, 2: { halign: "left" },
    } as ColumnStyles,
  };
  const extraRows = days.flatMap((day) => day.extraItems.map((item) => [formatDateBR(day.date), valueOrNotInformed(item.name), formatBRL(item.value)]));
  const extraSpec = {
    title: "Gastos extras",
    head: ["Data", "Descrição", "Valor"],
    body: extraRows,
    foot: ["Não informado", "TOTAL", formatBRL(totals.extras)],
    styles: {
      0: { halign: "left" }, 1: { halign: "left" }, 2: { halign: "left" },
    } as ColumnStyles,
  };

  // Short daily reports use two columns so the right side of the page is
  // occupied. Larger ranges fall back to reliable full-width tables, avoiding
  // independent column pagination when one section has many rows.
  const useTwoColumns = fuelRows.length <= 12 && maintenanceRows.length <= 12 && extraRows.length <= 12;
  const columnWidth = 96;
  const columnGap = 2;
  const columnLeft = 10;
  const columnRight = columnLeft + columnWidth + columnGap;
  if (useTwoColumns) {
    ensure(58);
    const rowStart = y;
    const leftFuelEnd = renderTable(fuelPurchasedSpec.title, fuelPurchasedSpec.head, fuelPurchasedSpec.body, fuelPurchasedSpec.foot, fuelPurchasedSpec.styles, rowStart, columnLeft, columnWidth);
    const rightMaintenanceEnd = renderTable(maintenanceSpec.title, maintenanceSpec.head, maintenanceSpec.body, maintenanceSpec.foot, maintenanceSpec.styles, rowStart, columnRight, columnWidth);
    y = Math.max(leftFuelEnd, rightMaintenanceEnd) + 12;
    ensure(58);
    const secondRowStart = y;
    const leftConsumedEnd = renderTable(fuelConsumedSpec.title, fuelConsumedSpec.head, fuelConsumedSpec.body, fuelConsumedSpec.foot, fuelConsumedSpec.styles, secondRowStart, columnLeft, columnWidth);
    const rightExtrasEnd = renderTable(extraSpec.title, extraSpec.head, extraSpec.body, extraSpec.foot, extraSpec.styles, secondRowStart, columnRight, columnWidth);
    y = Math.max(leftConsumedEnd, rightExtrasEnd) + 12;
  } else {
    ensure(30);
    y = renderTable(fuelPurchasedSpec.title, fuelPurchasedSpec.head, fuelPurchasedSpec.body, fuelPurchasedSpec.foot, fuelPurchasedSpec.styles, y) + 12;
    ensure(30);
    y = renderTable(fuelConsumedSpec.title, fuelConsumedSpec.head, fuelConsumedSpec.body, fuelConsumedSpec.foot, fuelConsumedSpec.styles, y) + 12;
    ensure(30);
    y = renderTable(maintenanceSpec.title, maintenanceSpec.head, maintenanceSpec.body, maintenanceSpec.foot, maintenanceSpec.styles, y, 12, 186) + 12;
    ensure(30);
    y = renderTable(extraSpec.title, extraSpec.head, extraSpec.body, extraSpec.foot, extraSpec.styles, y, 12, 186) + 12;
  }

  // AutoTable invokes didDrawPage for every generated page. A token keeps the
  // total page count correct even though it is unknown while tables paginate.
  doc.putTotalPages(PAGE_TOTAL_TOKEN);
  return doc;
}
