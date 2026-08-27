import assert from "node:assert/strict";
import {
  calculateFinancialChain,
  calculateFinancialMetrics,
} from "../lib/financial-engine.ts";

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
