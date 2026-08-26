import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateDistance,
  calculateFuelLiters,
  calculateFuelMetrics,
  calculatePerUnit,
} from "../lib/calculations.ts";
import { summarizeRevenue } from "../lib/revenue.ts";

test("calcula distância e litros sem aceitar resultados negativos", () => {
  assert.equal(calculateDistance(100, 350), 250);
  assert.equal(calculateDistance(350, 100), 0);
  assert.equal(calculateFuelLiters(100, 5), 20);
  assert.equal(calculateFuelLiters(100, 0), 0);
});

test("calcula automaticamente km/L com gasolina", () => {
  const metrics = calculateFuelMetrics({ distanceKm: 300, gasCost: 100, gasLiters: 20 });
  assert.equal(metrics.kmPerLiter, 15);
  assert.equal(metrics.source, "automatic");
  assert.equal(metrics.consumedLiters, 20);
  assert.equal(metrics.consumedCost, 100);
});

test("usa média ponderada e custo exato para combustível misto", () => {
  const metrics = calculateFuelMetrics({
    distanceKm: 120,
    gasCost: 60,
    gasLiters: 10,
    alcoholCost: 40,
    alcoholLiters: 10,
  });
  assert.equal(metrics.kmPerLiter, 6);
  assert.equal(metrics.weightedPricePerLiter, 5);
  assert.equal(metrics.consumedLiters, 20);
  assert.equal(metrics.consumedCost, 100);
});

test("uma referência manual explícita prevalece sobre a estimativa dos litros", () => {
  const metrics = calculateFuelMetrics({
    distanceKm: 240,
    gasCost: 120,
    gasLiters: 20,
    referenceConsumptionKmPerLiter: 99,
  });
  assert.equal(metrics.kmPerLiter, 99);
  assert.equal(metrics.source, "reference");
  assert.equal(metrics.consumedLiters, 240 / 99);
});

test("usa a referência quando não há litros", () => {
  const metrics = calculateFuelMetrics({ distanceKm: 150, referenceConsumptionKmPerLiter: 10 });
  assert.equal(metrics.kmPerLiter, 10);
  assert.equal(metrics.source, "reference");
  assert.equal(metrics.consumedLiters, 15);
  assert.equal(metrics.consumedCost, 0);
});

test("não divide por zero nem propaga NaN", () => {
  const metrics = calculateFuelMetrics({ distanceKm: Number.NaN, gasCost: -10, gasLiters: 0 });
  assert.equal(metrics.source, "unavailable");
  assert.equal(metrics.kmPerLiter, 0);
  assert.equal(calculatePerUnit(100, 0), null);
  assert.equal(calculatePerUnit(100, 20), 5);
});

test("mantém o encadeamento das receitas e taxas já existentes", () => {
  const summary = summarizeRevenue([
    { id: "uber", app: "Uber", nomeAppPersonalizado: "", bruto: 100, taxa: 20 },
    { id: "99", app: "99", nomeAppPersonalizado: "", bruto: 50, taxa: 10 },
  ]);
  assert.equal(summary.bruto, 150);
  assert.equal(summary.taxaValor, 25);
  assert.equal(summary.liquido, 125);
  assert.equal(summary.taxaPercentual, 16.67);
});

test("limita taxas e valores inválidos sem gerar totais negativos", () => {
  const summary = summarizeRevenue([
    { id: "a", app: "Uber", nomeAppPersonalizado: "", bruto: -100, taxa: -20 },
    { id: "b", app: "Outro", nomeAppPersonalizado: "Regional", bruto: 50, taxa: 150 },
  ]);
  assert.equal(summary.bruto, 50);
  assert.equal(summary.taxaValor, 50);
  assert.equal(summary.liquido, 0);
});
