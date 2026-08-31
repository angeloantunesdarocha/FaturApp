import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { calculateDay } from "../lib/day-calculation.ts";
import { buildReportText, createReportPdf } from "../lib/report-export.ts";

const launchFixture = (date, suffix = "") => [
  {
    id: `launch-1${suffix}`,
    number: 1,
    date,
    revenueItems: [{ id: `revenue-1${suffix}`, app: "Uber", nomeAppPersonalizado: "", bruto: 220, taxa: 0 }],
    hoursWorked: 8,
    kmInitial: 100,
    kmFinal: 165,
    consumptionKmL: 10,
    fuelPurchases: [{ id: `fuel-1${suffix}`, type: "gasoline", amount: 50, pricePerLiter: 6.2 }],
  },
  { id: `launch-2${suffix}`, number: 2, date, fuelPurchases: [{ id: `fuel-2${suffix}`, type: "gasoline", amount: 30, pricePerLiter: 6.4 }] },
  { id: `launch-3${suffix}`, number: 3, date, maintenanceItems: [{ description: "Manutenção", value: 17.89 }], extraItems: [{ name: "Gastos extras", value: 9.94 }] },
];

const day = calculateDay(launchFixture("2026-08-31"));
const month = Array.from({ length: 31 }, (_, index) => {
  const date = `2026-08-${String(index + 1).padStart(2, "0")}`;
  return calculateDay(launchFixture(date, `-${index + 1}`));
});

const text = buildReportText([day], "2026-08-31", "2026-08-31");
assert.match(text, /R\$\s?120,57/);
assert.match(text, /R\$\s?99,43/);
assert.match(text, /12,752 L/);
assert.match(text, /R\$\s?80,00/);
assert.match(text, /6,500 L/);
assert.match(text, /R\$\s?41,60/);

const dayPdf = createReportPdf([day], "2026-08-31", "2026-08-31");
const monthPdf = createReportPdf(month, "2026-08-01", "2026-08-31");
assert.ok(dayPdf.getNumberOfPages() >= 1);
assert.ok(monthPdf.getNumberOfPages() > dayPdf.getNumberOfPages());

await mkdir("tmp/pdfs", { recursive: true });
await writeFile("tmp/pdfs/faturapp-dia-validacao.pdf", Buffer.from(dayPdf.output("arraybuffer")));
await writeFile("tmp/pdfs/faturapp-mes-validacao.pdf", Buffer.from(monthPdf.output("arraybuffer")));
console.log(`PDF dia: ${dayPdf.getNumberOfPages()} página(s); PDF mês: ${monthPdf.getNumberOfPages()} página(s).`);
