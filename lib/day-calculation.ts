import { calculateFinancialChain, type FinancialEngineContext, type FuelType, type KmPerLiterCalculationMode } from "./financial-engine.ts";
import { summarizeRevenue, type RevenueItem, type RevenueItemPersisted } from "./revenue.ts";

export type DayFuelPurchase = {
  id: string;
  type: "gasoline" | "alcohol";
  amount: number;
  pricePerLiter: number;
  createdAt?: string;
};

export type DayMaintenanceItem = { description: string; value: number };
export type DayExtraItem = { name: string; value: number };

export type DayLaunchInput = {
  id?: string;
  number?: number;
  date: string;
  createdAt?: string;
  revenueItems?: RevenueItem[];
  hoursWorked?: number;
  kmInitial?: number;
  kmFinal?: number;
  fuelPurchases?: DayFuelPurchase[];
  fuelType?: FuelType;
  fullTank?: boolean;
  consumptionKmL?: number;
  maintenanceItems?: DayMaintenanceItem[];
  extraItems?: DayExtraItem[];
  /** Saída direta conhecida de um registro histórico sem seus lançamentos originais. */
  isolatedFuelExpenseOverride?: number;
};

export type DayCalculationContext = FinancialEngineContext & {
  fuelRemainingLiters?: number;
  fuelRemainingValue?: number;
};

export type DayLaunchResult = {
  id?: string;
  number?: number;
  date: string;
  createdAt?: string;
  revenueItems: RevenueItemPersisted[];
  revenueGross: number;
  fees: number;
  revenueNet: number;
  hours: number;
  km: number;
  kmInitial: number;
  kmFinal: number;
  fuelPurchases: DayFuelPurchase[];
  fuelPurchasedLiters: number;
  fuelPurchasedAmount: number;
  fuelPriceApplied: number;
  consumptionKmL: number;
  consumptionMode: KmPerLiterCalculationMode;
  fuelConsumedLiters: number;
  fuelConsumedCost: number;
  isolatedFuelExpense: number;
  fuelCostForProfit: number;
  fuelRemainingLiters: number;
  fuelRemainingValue: number;
  maintenanceItems: DayMaintenanceItem[];
  maintenance: number;
  extraItems: DayExtraItem[];
  extras: number;
  operatingCosts: number;
  totalOutflows: number;
  profit: number;
  costPerKm: number;
  gainPerKm: number;
  profitPerKm: number;
  profitPerHour: number;
  marginPercent: number;
};

export type DaySummary = {
  date: string;
  launchCount: number;
  launches: DayLaunchResult[];
  revenueItems: RevenueItemPersisted[];
  revenueGross: number;
  fees: number;
  revenueNet: number;
  hours: number;
  km: number;
  fuelPurchases: DayFuelPurchase[];
  fuelPurchasedLiters: number;
  fuelPurchasedAmount: number;
  fuelConsumedLiters: number;
  fuelConsumedCost: number;
  isolatedFuelExpense: number;
  fuelCostForProfit: number;
  fuelPriceApplied: number;
  consumptionKmL: number;
  consumptionMode: KmPerLiterCalculationMode;
  fuelRemainingLiters: number;
  fuelRemainingValue: number;
  maintenanceItems: DayMaintenanceItem[];
  maintenance: number;
  extraItems: DayExtraItem[];
  extras: number;
  operatingCosts: number;
  totalOutflows: number;
  profit: number;
  costPerKm: number;
  gainPerKm: number;
  profitPerKm: number;
  profitPerHour: number;
  marginPercent: number;
  context: Required<DayCalculationContext>;
};

const zeroIfInvalid = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const divide = (numerator: number, denominator: number) => denominator > 0 ? numerator / denominator : 0;

const normalizeMaintenance = (items: DayMaintenanceItem[] = []) => items
  .map((item, index) => ({
    description: String(item.description || "").trim() || `Manutenção ${index + 1}`,
    value: zeroIfInvalid(item.value),
  }))
  .filter((item) => item.value > 0);

const normalizeExtras = (items: DayExtraItem[] = []) => items
  .map((item, index) => ({
    name: String(item.name || "").trim() || `Gasto extra ${index + 1}`,
    value: zeroIfInvalid(item.value),
  }))
  .filter((item) => item.value > 0);

const normalizePurchases = (items: DayFuelPurchase[] = []) => items
  .map((item, index) => ({
    id: String(item.id || `abastecimento-${index + 1}`),
    type: item.type === "alcohol" ? "alcohol" as const : "gasoline" as const,
    amount: zeroIfInvalid(item.amount),
    pricePerLiter: zeroIfInvalid(item.pricePerLiter),
    ...(item.createdAt ? { createdAt: item.createdAt } : {}),
  }))
  .filter((item) => item.amount > 0 || item.pricePerLiter > 0);

export function calculateDay(
  rawLaunches: DayLaunchInput[],
  initialContext: DayCalculationContext = {},
): DaySummary {
  const launches = rawLaunches.map((launch) => {
    const revenue = summarizeRevenue(launch.revenueItems ?? []);
    const fuelPurchases = normalizePurchases(launch.fuelPurchases);
    const maintenanceItems = normalizeMaintenance(launch.maintenanceItems);
    const extraItems = normalizeExtras(launch.extraItems);
    const kmInitial = zeroIfInvalid(launch.kmInitial);
    const kmFinal = zeroIfInvalid(launch.kmFinal);
    const km = Math.max(0, kmFinal - kmInitial);
    const fuelPurchasedAmount = fuelPurchases.reduce((sum, item) => sum + item.amount, 0);
    const fuelPurchasedLiters = fuelPurchases.reduce(
      (sum, item) => sum + divide(item.amount, item.pricePerLiter),
      0,
    );
    const latestPurchase = [...fuelPurchases].reverse().find((item) => item.amount > 0 && item.pricePerLiter > 0);
    return {
      ...launch,
      revenue,
      fuelPurchases,
      maintenanceItems,
      extraItems,
      kmInitial,
      kmFinal,
      km,
      hours: zeroIfInvalid(launch.hoursWorked),
      fuelPurchasedAmount,
      fuelPurchasedLiters,
      latestPrice: latestPurchase?.pricePerLiter ?? 0,
      maintenance: maintenanceItems.reduce((sum, item) => sum + item.value, 0),
      extras: extraItems.reduce((sum, item) => sum + item.value, 0),
    };
  });

  const chain = calculateFinancialChain(launches.map((launch) => ({
    receitaLiquida: launch.revenue.liquido,
    horasTrabalhadas: launch.hours,
    kmInicial: launch.kmInitial,
    kmFinal: launch.kmFinal,
    valorAbastecido: launch.fuelPurchasedAmount,
    precoPorLitro: launch.latestPrice,
    manutencao: launch.maintenance,
    gastosExtras: launch.extras,
    tanqueCheio: Boolean(launch.fullTank),
    consumoPerfilKmL: zeroIfInvalid(launch.consumptionKmL),
    tipoCombustivel: launch.fuelType ?? "gasoline",
  })), initialContext);

  const lastCalculation = chain.lancamentos.at(-1);
  const latestPrice = [...launches].reverse().find((launch) => launch.latestPrice > 0)?.latestPrice
    ?? zeroIfInvalid(initialContext.ultimoPrecoPorLitro);
  let remainingLiters = zeroIfInvalid(initialContext.fuelRemainingLiters);

  const calculatedLaunches: DayLaunchResult[] = launches.map((launch, index) => {
    const launchCalculation = chain.lancamentos[index];
    const launchConsumptionKmL = zeroIfInvalid(launchCalculation?.km_por_litro_aplicado);
    const launchConsumptionMode = launchCalculation?.modo_calculo_km_litro ?? "estimativa_inicial";
    const fuelConsumedLiters = divide(launch.km, launchConsumptionKmL);
    const fuelConsumedCost = fuelConsumedLiters * latestPrice;
    const directFuelExpense = launch.isolatedFuelExpenseOverride === undefined
      ? (launch.km <= 0 ? launch.fuelPurchasedAmount : 0)
      : zeroIfInvalid(launch.isolatedFuelExpenseOverride);
    const fuelCostForProfit = fuelConsumedCost + directFuelExpense;
    remainingLiters = Math.max(0, remainingLiters + launch.fuelPurchasedLiters - fuelConsumedLiters);
    const fuelRemainingValue = remainingLiters * latestPrice;
    const operatingCosts = fuelCostForProfit + launch.maintenance + launch.extras;
    const totalOutflows = launch.revenue.taxaValor + operatingCosts;
    const profit = launch.revenue.liquido - operatingCosts;

    return {
      id: launch.id,
      number: launch.number,
      date: launch.date,
      createdAt: launch.createdAt,
      revenueItems: launch.revenue.normalized,
      revenueGross: launch.revenue.bruto,
      fees: launch.revenue.taxaValor,
      revenueNet: launch.revenue.liquido,
      hours: launch.hours,
      km: launch.km,
      kmInitial: launch.kmInitial,
      kmFinal: launch.kmFinal,
      fuelPurchases: launch.fuelPurchases,
      fuelPurchasedLiters: launch.fuelPurchasedLiters,
      fuelPurchasedAmount: launch.fuelPurchasedAmount,
      fuelPriceApplied: latestPrice,
      consumptionKmL: launchConsumptionKmL,
      consumptionMode: launchConsumptionMode,
      fuelConsumedLiters,
      fuelConsumedCost,
      isolatedFuelExpense: directFuelExpense,
      fuelCostForProfit,
      fuelRemainingLiters: remainingLiters,
      fuelRemainingValue,
      maintenanceItems: launch.maintenanceItems,
      maintenance: launch.maintenance,
      extraItems: launch.extraItems,
      extras: launch.extras,
      operatingCosts,
      totalOutflows,
      profit,
      costPerKm: divide(totalOutflows, launch.km),
      gainPerKm: divide(launch.revenue.bruto, launch.km),
      profitPerKm: divide(profit, launch.km),
      profitPerHour: divide(profit, launch.hours),
      marginPercent: divide(profit * 100, launch.revenue.bruto),
    };
  });

  const sum = (pick: (launch: DayLaunchResult) => number) => calculatedLaunches.reduce((total, launch) => total + pick(launch), 0);
  const revenueGross = sum((launch) => launch.revenueGross);
  const fees = sum((launch) => launch.fees);
  const revenueNet = sum((launch) => launch.revenueNet);
  const hours = sum((launch) => launch.hours);
  const km = sum((launch) => launch.km);
  const fuelPurchasedLiters = sum((launch) => launch.fuelPurchasedLiters);
  const fuelPurchasedAmount = sum((launch) => launch.fuelPurchasedAmount);
  const fuelConsumedLiters = sum((launch) => launch.fuelConsumedLiters);
  const fuelConsumedCost = sum((launch) => launch.fuelConsumedCost);
  const isolatedFuelExpense = sum((launch) => launch.isolatedFuelExpense);
  const fuelCostForProfit = sum((launch) => launch.fuelCostForProfit);
  const maintenance = sum((launch) => launch.maintenance);
  const extras = sum((launch) => launch.extras);
  const operatingCosts = sum((launch) => launch.operatingCosts);
  const totalOutflows = sum((launch) => launch.totalOutflows);
  const profit = sum((launch) => launch.profit);
  const consumptionKmL = divide(km, fuelConsumedLiters)
    || zeroIfInvalid(lastCalculation?.km_por_litro_aplicado);
  const consumptionMode = lastCalculation?.modo_calculo_km_litro ?? "estimativa_inicial";
  const date = launches[0]?.date ?? "";
  const context: Required<DayCalculationContext> = {
    ...chain.contextoFinal,
    fuelRemainingLiters: remainingLiters,
    fuelRemainingValue: remainingLiters * latestPrice,
  };

  return {
    date,
    launchCount: calculatedLaunches.length,
    launches: calculatedLaunches,
    revenueItems: calculatedLaunches.flatMap((launch) => launch.revenueItems),
    revenueGross,
    fees,
    revenueNet,
    hours,
    km,
    fuelPurchases: calculatedLaunches.flatMap((launch) => launch.fuelPurchases),
    fuelPurchasedLiters,
    fuelPurchasedAmount,
    fuelConsumedLiters,
    fuelConsumedCost,
    isolatedFuelExpense,
    fuelCostForProfit,
    fuelPriceApplied: latestPrice,
    consumptionKmL,
    consumptionMode,
    fuelRemainingLiters: remainingLiters,
    fuelRemainingValue: remainingLiters * latestPrice,
    maintenanceItems: calculatedLaunches.flatMap((launch) => launch.maintenanceItems),
    maintenance,
    extraItems: calculatedLaunches.flatMap((launch) => launch.extraItems),
    extras,
    operatingCosts,
    totalOutflows,
    profit,
    costPerKm: divide(totalOutflows, km),
    gainPerKm: divide(revenueGross, km),
    profitPerKm: divide(profit, km),
    profitPerHour: divide(profit, hours),
    marginPercent: divide(profit * 100, revenueGross),
    context,
  };
}

export function sumPeriod(days: DaySummary[]) {
  const sum = (pick: (day: DaySummary) => number) => days.reduce((total, day) => total + pick(day), 0);
  const revenueGross = sum((day) => day.revenueGross);
  const fees = sum((day) => day.fees);
  const revenueNet = sum((day) => day.revenueNet);
  const operatingCosts = sum((day) => day.operatingCosts);
  const totalOutflows = sum((day) => day.totalOutflows);
  const profit = sum((day) => day.profit);
  const km = sum((day) => day.km);
  const hours = sum((day) => day.hours);
  return {
    days: days.length,
    launches: sum((day) => day.launchCount),
    revenueGross,
    fees,
    revenueNet,
    operatingCosts,
    totalOutflows,
    profit,
    km,
    hours,
    fuelPurchasedLiters: sum((day) => day.fuelPurchasedLiters),
    fuelPurchasedAmount: sum((day) => day.fuelPurchasedAmount),
    fuelConsumedLiters: sum((day) => day.fuelConsumedLiters),
    fuelConsumedCost: sum((day) => day.fuelConsumedCost),
    isolatedFuelExpense: sum((day) => day.isolatedFuelExpense),
    fuelCostForProfit: sum((day) => day.fuelCostForProfit),
    maintenance: sum((day) => day.maintenance),
    extras: sum((day) => day.extras),
    costPerKm: divide(totalOutflows, km),
    gainPerKm: divide(revenueGross, km),
    profitPerKm: divide(profit, km),
    profitPerHour: divide(profit, hours),
    marginPercent: divide(profit * 100, revenueGross),
  };
}

export type PersistedDayEntry = {
  id: string;
  date: string;
  created_at?: string;
  gross_amount: number | null;
  fee_percent: number | null;
  net_fare: number | null;
  revenue_details?: RevenueItemPersisted[];
  gas_expense?: number;
  alcohol_expense?: number;
  gasoline_price_per_liter?: number;
  alcohol_price_per_liter?: number;
  km_initial?: number;
  km_final?: number;
  km_driven?: number;
  hours_worked?: number;
  fuel_consumption_km_per_liter?: number;
  fuel_consumed_liters?: number;
  fuel_consumed_cost?: number;
  fuel_remaining_liters?: number;
  fuel_remaining_value?: number;
  isolated_fuel_expense?: number;
  maintenance_expense?: number;
  maintenance_details?: DayMaintenanceItem[];
  manutencao_itens?: DayMaintenanceItem[];
  extra_expenses?: DayExtraItem[];
  extras_itens?: DayExtraItem[];
  launch_details?: DayLaunchInput[];
};

function fallbackLaunch(entry: PersistedDayEntry): DayLaunchInput {
  const revenueItems: RevenueItem[] = entry.revenue_details?.length
    ? entry.revenue_details.map((item) => ({
      id: String(item.id),
      app: item.app || "",
      nomeAppPersonalizado: item.nomeAppPersonalizado || "",
      bruto: zeroIfInvalid(item.bruto),
      taxa: zeroIfInvalid(item.taxa),
    }))
    : (() => {
      const gross = zeroIfInvalid(entry.gross_amount);
      const net = zeroIfInvalid(entry.net_fare);
      if (gross > 0) return [{ id: `${entry.id}-receita`, app: "" as const, nomeAppPersonalizado: "", bruto: gross, taxa: zeroIfInvalid(entry.fee_percent) }];
      if (net > 0) return [{ id: `${entry.id}-receita`, app: "" as const, nomeAppPersonalizado: "", bruto: net, taxa: 0 }];
      return [];
    })();
  const fuelPurchases: DayFuelPurchase[] = [];
  const gas = zeroIfInvalid(entry.gas_expense);
  const alcohol = zeroIfInvalid(entry.alcohol_expense);
  if (gas > 0) fuelPurchases.push({ id: `${entry.id}-gasoline`, type: "gasoline", amount: gas, pricePerLiter: zeroIfInvalid(entry.gasoline_price_per_liter), createdAt: entry.created_at });
  if (alcohol > 0) fuelPurchases.push({ id: `${entry.id}-alcohol`, type: "alcohol", amount: alcohol, pricePerLiter: zeroIfInvalid(entry.alcohol_price_per_liter), createdAt: entry.created_at });
  const kmInitial = zeroIfInvalid(entry.km_initial);
  const storedKm = zeroIfInvalid(entry.km_driven);
  const kmFinal = Math.max(kmInitial, zeroIfInvalid(entry.km_final), kmInitial + storedKm);
  const purchasedFuelAmount = gas + alcohol;
  const hasPersistedLaunches = Array.isArray(entry.launch_details) && entry.launch_details.length > 0;
  const storedIsolatedFuelExpense = zeroIfInvalid(entry.isolated_fuel_expense);
  // Older rows did not have `isolated_fuel_expense`. After the column was
  // added with a zero default, those rows still need to count a fuel-only
  // purchase as an outflow; otherwise historical reports silently lose the
  // money paid at the pump. A row with distance remains a normal rodagem cost.
  const shouldInferFuelOnlyExpense = purchasedFuelAmount > 0
    && kmFinal <= kmInitial
    && !hasPersistedLaunches
    && storedIsolatedFuelExpense <= 0;
  const maintenanceItems = entry.maintenance_details?.length
    ? entry.maintenance_details
    : entry.manutencao_itens?.length
      ? entry.manutencao_itens
      : zeroIfInvalid(entry.maintenance_expense) > 0
        ? [{ description: "Manutenção não detalhada", value: zeroIfInvalid(entry.maintenance_expense) }]
        : [];
  const extraItems = entry.extra_expenses?.length ? entry.extra_expenses : (entry.extras_itens ?? []);
  return {
    id: entry.id,
    date: entry.date,
    createdAt: entry.created_at,
    revenueItems,
    hoursWorked: zeroIfInvalid(entry.hours_worked),
    kmInitial,
    kmFinal,
    fuelPurchases,
    fuelType: alcohol > gas ? "ethanol" : "gasoline",
    consumptionKmL: zeroIfInvalid(entry.fuel_consumption_km_per_liter),
    maintenanceItems,
    extraItems,
    isolatedFuelExpenseOverride: shouldInferFuelOnlyExpense
      ? purchasedFuelAmount
      : entry.isolated_fuel_expense === undefined
        ? undefined
        : storedIsolatedFuelExpense,
  };
}

export function calculateDaysFromEntries(entries: PersistedDayEntry[]): DaySummary[] {
  const launchesByDate = new Map<string, DayLaunchInput[]>();
  for (const entry of entries) {
    const launches = Array.isArray(entry.launch_details) && entry.launch_details.length
      ? entry.launch_details
      : [fallbackLaunch(entry)];
    launchesByDate.set(entry.date, [...(launchesByDate.get(entry.date) ?? []), ...launches]);
  }
  return Array.from(launchesByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, launches]) => calculateDay(launches.map((launch: DayLaunchInput) => ({ ...launch, date }))));
}
