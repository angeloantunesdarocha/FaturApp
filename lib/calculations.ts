export type FuelMetricsInput = {
  distanceKm: number;
  gasCost?: number;
  alcoholCost?: number;
  gasLiters?: number;
  alcoholLiters?: number;
  referenceConsumptionKmPerLiter?: number;
};

export type FuelMetrics = {
  distanceKm: number;
  totalLiters: number;
  totalFuelCost: number;
  weightedPricePerLiter: number;
  kmPerLiter: number;
  source: "automatic" | "reference" | "unavailable";
  consumedLiters: number;
  consumedCost: number;
};

export function toFiniteNonNegative(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

export function calculateDistance(kmInitial: number, kmFinal: number): number {
  return Math.max(0, toFiniteNonNegative(kmFinal) - toFiniteNonNegative(kmInitial));
}

export function calculateFuelLiters(amount: number, pricePerLiter: number): number {
  const safeAmount = toFiniteNonNegative(amount);
  const safePrice = toFiniteNonNegative(pricePerLiter);
  return safeAmount > 0 && safePrice > 0 ? safeAmount / safePrice : 0;
}

export function calculatePerUnit(value: number, units: number): number | null {
  const safeValue = Number(value);
  const safeUnits = toFiniteNonNegative(units);
  return Number.isFinite(safeValue) && safeUnits > 0 ? safeValue / safeUnits : null;
}

/**
 * Regra canônica do FaturApp para consumo de combustível.
 *
 * Quando distância e litros abastecidos estão disponíveis, calculamos uma
 * estimativa operacional: km rodados / litros abastecidos. Isso não é
 * chamado de “consumo real”, porque um abastecimento pode abastecer o
 * tanque e ser consumido ao longo de vários dias. O consumo real exige a
 * medição tanque-a-tanque (odômetro entre dois abastecimentos completos).
 * Quando o motorista informa uma referência, ela é uma escolha explícita e
 * passa a ser usada na fórmula litros consumidos = km rodados ÷ km/L. Se o
 * campo ficar vazio, usamos km ÷ litros abastecidos como estimativa operacional.
 */
export function calculateFuelMetrics(input: FuelMetricsInput): FuelMetrics {
  const distanceKm = toFiniteNonNegative(input.distanceKm);
  const gasCost = toFiniteNonNegative(input.gasCost);
  const alcoholCost = toFiniteNonNegative(input.alcoholCost);
  const gasLiters = toFiniteNonNegative(input.gasLiters);
  const alcoholLiters = toFiniteNonNegative(input.alcoholLiters);
  const referenceConsumption = toFiniteNonNegative(input.referenceConsumptionKmPerLiter);
  const totalLiters = gasLiters + alcoholLiters;
  const totalFuelCost = gasCost + alcoholCost;
  const weightedPricePerLiter = totalLiters > 0 ? totalFuelCost / totalLiters : 0;

  if (distanceKm > 0 && referenceConsumption > 0) {
    const consumedLiters = distanceKm / referenceConsumption;
    return {
      distanceKm,
      totalLiters,
      totalFuelCost,
      weightedPricePerLiter,
      kmPerLiter: referenceConsumption,
      source: "reference",
      consumedLiters,
      consumedCost: consumedLiters * weightedPricePerLiter,
    };
  }

  if (distanceKm > 0 && totalLiters > 0) {
    return {
      distanceKm,
      totalLiters,
      totalFuelCost,
      weightedPricePerLiter,
      kmPerLiter: distanceKm / totalLiters,
      source: "automatic",
      consumedLiters: totalLiters,
      consumedCost: totalFuelCost,
    };
  }

  return {
    distanceKm,
    totalLiters,
    totalFuelCost,
    weightedPricePerLiter,
    kmPerLiter: 0,
    source: "unavailable",
    consumedLiters: 0,
    consumedCost: 0,
  };
}
