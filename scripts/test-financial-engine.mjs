import assert from "node:assert/strict";
import {
  calculateFinancialChain,
  calculateFinancialMetrics,
  recalculateCompleteDay,
  recalculateDaySummary,
} from "../lib/financial-engine.ts";
import { calculateDay, calculateDaysFromEntries, sumPeriod } from "../lib/day-calculation.ts";

const closeTo = (actual, expected, message) => {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: esperado ${expected}, obtido ${actual}`);
};

const initialGasoline = calculateFinancialMetrics({
  receitaLiquida: 100,
  horasTrabalhadas: 5,
  kmInicial: 100,
  kmFinal: 150,
  tipoCombustivel: "gasoline",
});
assert.equal(initialGasoline.modo_calculo_km_litro, "estimativa_inicial");
assert.equal(initialGasoline.km_por_litro_aplicado, 10);
assert.equal(initialGasoline.litros_consumidos_rodagem, 5);
assert.equal(initialGasoline.lucro_por_hora, 20);

const initialEthanol = calculateFinancialMetrics({
  kmInicial: 0,
  kmFinal: 70,
  tipoCombustivel: "ethanol",
});
assert.equal(initialEthanol.km_por_litro_aplicado, 7);

const fullTankChain = calculateFinancialChain([
  {
    receitaLiquida: 120,
    horasTrabalhadas: 4,
    kmInicial: 950,
    kmFinal: 1000,
    valorAbastecido: 60,
    precoPorLitro: 6,
    tanqueCheio: true,
    consumoPerfilKmL: 12,
    tipoCombustivel: "gasoline",
  },
  {
    receitaLiquida: 180,
    horasTrabalhadas: 6,
    kmInicial: 1000,
    kmFinal: 1100,
    valorAbastecido: 50,
    precoPorLitro: 5,
    tanqueCheio: true,
    tipoCombustivel: "gasoline",
  },
  {
    receitaLiquida: 90,
    horasTrabalhadas: 3,
    kmInicial: 1100,
    kmFinal: 1150,
    manutencao: 10,
    gastosExtras: 5,
    tipoCombustivel: "gasoline",
  },
]);

assert.equal(fullTankChain.lancamentos[0].modo_calculo_km_litro, "media_perfil");
assert.equal(fullTankChain.lancamentos[1].modo_calculo_km_litro, "exato_tanque_cheio");
closeTo(fullTankChain.lancamentos[1].km_por_litro_aplicado, 10, "consumo exato entre tanques");
closeTo(fullTankChain.lancamentos[1].litros_consumidos_rodagem, 10, "litros consumidos na rodagem");
closeTo(fullTankChain.lancamentos[1].gasto_combustivel_rodagem, 50, "custo exato da rodagem");
assert.equal(fullTankChain.lancamentos[2].modo_calculo_km_litro, "media_perfil");
closeTo(fullTankChain.lancamentos[2].km_por_litro_aplicado, 10, "média exata herdada");
closeTo(fullTankChain.acumuladoDia.km_rodados, 200, "km acumulado");
closeTo(fullTankChain.acumuladoDia.horas_trabalhadas, 13, "horas acumuladas");
closeTo(fullTankChain.acumuladoDia.gasto_manutencao, 10, "manutenção acumulada");
closeTo(fullTankChain.acumuladoDia.gastos_extras, 5, "extras acumulados");
closeTo(
  fullTankChain.acumuladoDia.lucro_liquido_dia,
  fullTankChain.lancamentos.reduce((sum, item) => sum + item.lucro_liquido_dia, 0),
  "lucro encadeado",
);
closeTo(
  fullTankChain.acumuladoDia.custo_total_dia,
  fullTankChain.acumuladoDia.gasto_combustivel_rodagem + 10 + 5,
  "custo total financeiro",
);
closeTo(
  fullTankChain.acumuladoDia.margem_lucro_percentual,
  fullTankChain.acumuladoDia.lucro_liquido_dia / 390 * 100,
  "margem de lucro",
);

const movingAverage = calculateFinancialMetrics(
  { kmInicial: 0, kmFinal: 90 },
  { historicoConsumoKmL: [8, 10, 12, 10] },
);
assert.equal(movingAverage.modo_calculo_km_litro, "media_perfil");
closeTo(movingAverage.km_por_litro_aplicado, 10, "média móvel após quatro históricos");

const recalculated = calculateFinancialChain([
  { kmInicial: 950, kmFinal: 1000, valorAbastecido: 60, precoPorLitro: 6, tanqueCheio: true, consumoPerfilKmL: 12 },
  { kmInicial: 1000, kmFinal: 1120, valorAbastecido: 50, precoPorLitro: 5, tanqueCheio: true },
  { kmInicial: 1120, kmFinal: 1170 },
]);
closeTo(recalculated.lancamentos[1].km_por_litro_aplicado, 12, "edição recalcula o tanque posterior");
closeTo(recalculated.lancamentos[2].km_por_litro_aplicado, 12, "edição propaga a nova média");

const reactiveDay = recalculateCompleteDay([
  {
    receitaLiquida: 100,
    horasTrabalhadas: 4,
    kmInicial: 50,
    kmFinal: 70,
    consumoPerfilKmL: 10,
    valorAbastecido: 30,
    precoPorLitro: 5,
  },
  {
    receitaLiquida: 50,
    horasTrabalhadas: 2,
    kmInicial: 70,
    kmFinal: 100,
    valorAbastecido: 42,
    precoPorLitro: 6,
    manutencao: 10,
    gastosExtras: 5,
  },
]);
closeTo(reactiveDay.acumuladoDia.km_rodados, 50, "km total reativo");
closeTo(reactiveDay.acumuladoDia.horas_trabalhadas, 6, "horas totais reativas");
closeTo(reactiveDay.acumuladoDia.litros_consumidos_rodagem, 5, "litros pela média vigente");
closeTo(reactiveDay.acumuladoDia.gasto_combustivel_rodagem, 30, "último preço aplicado a todo o km");
closeTo(reactiveDay.acumuladoDia.custo_total_dia, 45, "custos acumulados reativos");
closeTo(reactiveDay.acumuladoDia.lucro_liquido_dia, 105, "lucro líquido reativo");
closeTo(reactiveDay.acumuladoDia.custo_por_km, 0.9, "custo por km reativo");
closeTo(reactiveDay.acumuladoDia.lucro_por_km, 2.1, "lucro por km reativo");
closeTo(reactiveDay.acumuladoDia.lucro_por_hora, 17.5, "lucro por hora reativo");
closeTo(reactiveDay.acumuladoDia.margem_lucro_percentual, 70, "margem reativa");

const repricedDay = recalculateCompleteDay([
  {
    receitaLiquida: 100,
    horasTrabalhadas: 4,
    kmInicial: 50,
    kmFinal: 70,
    consumoPerfilKmL: 10,
    valorAbastecido: 30,
    precoPorLitro: 5,
  },
  {
    receitaLiquida: 50,
    horasTrabalhadas: 2,
    kmInicial: 70,
    kmFinal: 100,
    valorAbastecido: 49,
    precoPorLitro: 7,
    manutencao: 10,
    gastosExtras: 5,
  },
]);
closeTo(repricedDay.acumuladoDia.gasto_combustivel_rodagem, 35, "novo preço recalcula toda a rodagem");
closeTo(repricedDay.acumuladoDia.lucro_liquido_dia, 100, "novo preço atualiza o lucro imediatamente");

const costsWithoutDescriptions = recalculateDaySummary([
  {
    receitaLiquida: 80,
    horasTrabalhadas: 2,
    kmInicial: 0,
    kmFinal: 20,
    precoPorLitro: 6.39,
    valorAbastecido: 30,
    consumoPerfilKmL: 10,
    manutencao: 15,
    gastosExtras: 5,
  },
]);
closeTo(costsWithoutDescriptions.acumuladoDia.gasto_combustivel_rodagem, 12.78, "combustível efetivo capturado");
closeTo(costsWithoutDescriptions.acumuladoDia.custo_total_dia, 32.78, "manutenção e extras capturados");
closeTo(costsWithoutDescriptions.acumuladoDia.lucro_liquido_dia, 47.22, "lucro do lançamento completo");

const savedLaunchEvents = [
  { receitaLiquida: 100, horasTrabalhadas: 2, kmInicial: 100, kmFinal: 120, consumoPerfilKmL: 10 },
  { valorAbastecido: 30, precoPorLitro: 6.39 },
  { manutencao: 15, gastosExtras: 5, horasTrabalhadas: 1 },
];
const afterInsert = recalculateDaySummary(savedLaunchEvents);
closeTo(afterInsert.acumuladoDia.horas_trabalhadas, 3, "inclusão atualiza horas sem F5");
closeTo(afterInsert.lancamentos[1].gasto_combustivel_rodagem, 30, "abastecimento isolado vira despesa direta");
closeTo(afterInsert.lancamentos[1].lucro_liquido_dia, -30, "abastecimento isolado fica negativo");
closeTo(afterInsert.acumuladoDia.gasto_combustivel_rodagem, 42.78, "despesa de abastecimento entra no acumulado");
closeTo(afterInsert.acumuladoDia.lucro_liquido_dia, 37.22, "inclusão atualiza o resumo");

const afterEdit = recalculateDaySummary(savedLaunchEvents.map((item,index)=>index===2?{...item,manutencao:25}:item));
closeTo(afterEdit.acumuladoDia.lucro_liquido_dia, 27.22, "edição atualiza o resumo");

const afterRemove = recalculateDaySummary(savedLaunchEvents.filter((_,index)=>index!==2));
closeTo(afterRemove.acumuladoDia.horas_trabalhadas, 2, "remoção atualiza horas");
closeTo(afterRemove.acumuladoDia.lucro_liquido_dia, 57.22, "remoção atualiza o resumo");

// Dados reais de homologação de 31/08/2026. O abastecimento de R$ 30,00
// sem quilometragem é uma saída direta; o de R$ 50,00 alimenta o tanque e
// a rodagem é custeada pelo combustível efetivamente consumido.
const validationDay = calculateDay([
  {
    id: "launch-1",
    number: 1,
    date: "2026-08-31",
    revenueItems: [{ id: "revenue-1", app: "Uber", nomeAppPersonalizado: "", bruto: 220, taxa: 0 }],
    hoursWorked: 8,
    kmInitial: 100,
    kmFinal: 165,
    consumptionKmL: 10,
    fuelPurchases: [{ id: "fuel-1", type: "gasoline", amount: 50, pricePerLiter: 6.2 }],
  },
  {
    id: "launch-2",
    number: 2,
    date: "2026-08-31",
    fuelPurchases: [{ id: "fuel-2", type: "gasoline", amount: 30, pricePerLiter: 6.4 }],
  },
  {
    id: "launch-3",
    number: 3,
    date: "2026-08-31",
    maintenanceItems: [{ description: "Manutenção", value: 17.89 }],
    extraItems: [{ name: "Gastos extras", value: 9.94 }],
  },
]);
closeTo(validationDay.revenueGross, 220, "receitas reais");
closeTo(validationDay.hours, 8, "horas reais");
closeTo(validationDay.km, 65, "km reais");
closeTo(validationDay.fuelPurchasedAmount, 80, "combustível abastecido em reais");
closeTo(validationDay.fuelPurchasedLiters, 12.752016129032258, "combustível abastecido em litros");
closeTo(validationDay.fuelConsumedLiters, 6.5, "combustível consumido em litros");
closeTo(validationDay.fuelConsumedCost, 41.6, "combustível consumido em reais");
closeTo(validationDay.isolatedFuelExpense, 30, "abastecimento isolado como saída");
closeTo(validationDay.operatingCosts, 99.43, "custos reais");
closeTo(validationDay.profit, 120.57, "lucro líquido real");
closeTo(validationDay.profitPerKm, 120.57 / 65, "lucro real por km");
closeTo(validationDay.profitPerHour, 120.57 / 8, "lucro real por hora");
closeTo(validationDay.marginPercent, 120.57 / 220 * 100, "margem real");
closeTo(validationDay.gainPerKm - validationDay.costPerKm, validationDay.profitPerKm, "prova real por km");

const validationPeriod = sumPeriod([validationDay]);
closeTo(validationPeriod.operatingCosts, 99.43, "custos iguais no período");
closeTo(validationPeriod.profit, 120.57, "lucro igual no período");
closeTo(validationPeriod.profitPerKm, 120.57 / 65, "lucro/km igual no período");

const persistedValidationDay = calculateDaysFromEntries([{
  id: "daily-entry-1",
  date: "2026-08-31",
  gross_amount: 220,
  fee_percent: 0,
  net_fare: 220,
  gas_expense: 80,
  alcohol_expense: 0,
  gasoline_price_per_liter: 80 / 12.752016129032258,
  alcohol_price_per_liter: 0,
  km_initial: 100,
  km_final: 165,
  km_driven: 65,
  hours_worked: 8,
  fuel_consumption_km_per_liter: 10,
  isolated_fuel_expense: 30,
  maintenance_expense: 17.89,
  maintenance_details: [{ description: "Manutenção", value: 17.89 }],
  extra_expenses: [{ name: "Gastos extras", value: 9.94 }],
  launch_details: validationDay.launches.map((launch) => ({
    id: launch.id,
    number: launch.number,
    date: launch.date,
    revenueItems: launch.revenueItems,
    hoursWorked: launch.hours,
    kmInitial: launch.kmInitial,
    kmFinal: launch.kmFinal,
    fuelPurchases: launch.fuelPurchases,
    consumptionKmL: launch.consumptionKmL,
    maintenanceItems: launch.maintenanceItems,
    extraItems: launch.extraItems,
    isolatedFuelExpenseOverride: launch.isolatedFuelExpense,
  })),
}])[0];
closeTo(persistedValidationDay.operatingCosts, 99.43, "relatórios usam os mesmos custos");
closeTo(persistedValidationDay.profit, 120.57, "relatórios usam o mesmo lucro");

const zero = calculateFinancialMetrics({});
for (const key of ["custo_por_km", "lucro_por_km", "lucro_por_hora", "margem_lucro_percentual"]) {
  assert.equal(zero[key], 0, `${key} deve proteger divisão por zero`);
}

assert.deepEqual(Object.keys(zero), [
  "km_rodados",
  "horas_trabalhadas",
  "km_por_litro_aplicado",
  "modo_calculo_km_litro",
  "litros_consumidos_rodagem",
  "gasto_combustivel_rodagem",
  "gasto_manutencao",
  "gastos_extras",
  "custo_total_dia",
  "lucro_liquido_dia",
  "custo_por_km",
  "lucro_por_km",
  "lucro_por_hora",
  "margem_lucro_percentual",
]);

console.log("Motor financeiro: todos os cenários passaram.");
