export type FuelType = "gasoline" | "ethanol";

export type KmPerLiterCalculationMode =
  | "exato_tanque_cheio"
  | "media_perfil"
  | "estimativa_inicial";

export type FinancialCalculationInput = {
  receitaLiquida?: number;
  horasTrabalhadas?: number;
  kmInicial?: number;
  kmFinal?: number;
  valorAbastecido?: number;
  precoPorLitro?: number;
  manutencao?: number;
  gastosExtras?: number;
  tanqueCheio?: boolean;
  consumoPerfilKmL?: number;
  tipoCombustivel?: FuelType;
};

export type FinancialCalculationResult = {
  km_rodados: number;
  horas_trabalhadas: number;
  km_por_litro_aplicado: number;
  modo_calculo_km_litro: KmPerLiterCalculationMode;
  litros_consumidos_rodagem: number;
  gasto_combustivel_rodagem: number;
  gasto_manutencao: number;
  gastos_extras: number;
  custo_total_dia: number;
  lucro_liquido_dia: number;
  custo_por_km: number;
  lucro_por_km: number;
  lucro_por_hora: number;
  margem_lucro_percentual: number;
};

export type FinancialEngineContext = {
  consumoPerfilKmL?: number;
  tipoCombustivel?: FuelType;
  hodometroUltimoTanqueCheio?: number;
  historicoConsumoKmL?: number[];
  ultimoPrecoPorLitro?: number;
};

export type FinancialChainResult = {
  lancamentos: FinancialCalculationResult[];
  acumuladoDia: FinancialCalculationResult;
  contextoFinal: Required<FinancialEngineContext>;
};

const INITIAL_CONSUMPTION: Record<FuelType, number> = {
  gasoline: 10,
  ethanol: 7,
};

function finiteNonNegative(value: number | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function safeDivide(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function normalizeContext(context: FinancialEngineContext = {}): Required<FinancialEngineContext> {
  return {
    consumoPerfilKmL: finiteNonNegative(context.consumoPerfilKmL),
    tipoCombustivel: context.tipoCombustivel ?? "gasoline",
    hodometroUltimoTanqueCheio: finiteNonNegative(context.hodometroUltimoTanqueCheio),
    historicoConsumoKmL: (context.historicoConsumoKmL ?? []).map(finiteNonNegative).filter(value => value > 0),
    ultimoPrecoPorLitro: finiteNonNegative(context.ultimoPrecoPorLitro),
  };
}

function resolveConsumption(
  input: FinancialCalculationInput,
  context: Required<FinancialEngineContext>,
  kmFinal: number,
  litrosAbastecidos: number,
): { consumo: number; modo: KmPerLiterCalculationMode; exato: boolean } {
  const distanciaEntreTanques = kmFinal - context.hodometroUltimoTanqueCheio;
  const podeCalcularExato = Boolean(input.tanqueCheio)
    && context.hodometroUltimoTanqueCheio > 0
    && distanciaEntreTanques > 0
    && litrosAbastecidos > 0;

  if (podeCalcularExato) {
    return {
      consumo: distanciaEntreTanques / litrosAbastecidos,
      modo: "exato_tanque_cheio",
      exato: true,
    };
  }

  const consumoInformado = finiteNonNegative(input.consumoPerfilKmL);
  if (consumoInformado > 0) {
    return { consumo: consumoInformado, modo: "media_perfil", exato: false };
  }

  if (context.consumoPerfilKmL > 0) {
    return { consumo: context.consumoPerfilKmL, modo: "media_perfil", exato: false };
  }

  if (context.historicoConsumoKmL.length > 3) {
    const mediaMovel = context.historicoConsumoKmL.reduce((sum, value) => sum + value, 0)
      / context.historicoConsumoKmL.length;
    return { consumo: mediaMovel, modo: "media_perfil", exato: false };
  }

  const tipo = input.tipoCombustivel ?? context.tipoCombustivel;
  return { consumo: INITIAL_CONSUMPTION[tipo], modo: "estimativa_inicial", exato: false };
}

function calculateLaunch(
  input: FinancialCalculationInput,
  rawContext: FinancialEngineContext,
): { result: FinancialCalculationResult; context: Required<FinancialEngineContext> } {
  const context = normalizeContext(rawContext);
  const receitaLiquida = finiteNonNegative(input.receitaLiquida);
  const horasTrabalhadas = finiteNonNegative(input.horasTrabalhadas);
  const kmInicial = finiteNonNegative(input.kmInicial);
  const kmFinal = finiteNonNegative(input.kmFinal);
  const kmRodados = Math.max(0, kmFinal - kmInicial);
  const valorAbastecido = finiteNonNegative(input.valorAbastecido);
  const precoInformado = finiteNonNegative(input.precoPorLitro);
  const litrosAbastecidos = safeDivide(valorAbastecido, precoInformado);
  const { consumo, modo, exato } = resolveConsumption(input, context, kmFinal, litrosAbastecidos);
  const precoAplicado = precoInformado > 0 ? precoInformado : context.ultimoPrecoPorLitro;
  const litrosConsumidos = safeDivide(kmRodados, consumo);
  const gastoCombustivel = litrosConsumidos * precoAplicado;
  const manutencao = finiteNonNegative(input.manutencao);
  const extras = finiteNonNegative(input.gastosExtras);
  const custoTotal = gastoCombustivel + manutencao + extras;
  const lucro = receitaLiquida - custoTotal;

  const result: FinancialCalculationResult = {
    km_rodados: kmRodados,
    horas_trabalhadas: horasTrabalhadas,
    km_por_litro_aplicado: consumo,
    modo_calculo_km_litro: modo,
    litros_consumidos_rodagem: litrosConsumidos,
    gasto_combustivel_rodagem: gastoCombustivel,
    gasto_manutencao: manutencao,
    gastos_extras: extras,
    custo_total_dia: custoTotal,
    lucro_liquido_dia: lucro,
    custo_por_km: safeDivide(custoTotal, kmRodados),
    lucro_por_km: safeDivide(lucro, kmRodados),
    lucro_por_hora: safeDivide(lucro, horasTrabalhadas),
    margem_lucro_percentual: safeDivide(lucro * 100, receitaLiquida),
  };

  const tipoCombustivel = input.tipoCombustivel ?? context.tipoCombustivel;
  const historico = exato
    ? [...context.historicoConsumoKmL, consumo].slice(-10)
    : context.historicoConsumoKmL;

  return {
    result,
    context: {
      consumoPerfilKmL: exato ? consumo : finiteNonNegative(input.consumoPerfilKmL) || context.consumoPerfilKmL,
      tipoCombustivel,
      hodometroUltimoTanqueCheio: input.tanqueCheio && kmFinal > 0
        ? kmFinal
        : context.hodometroUltimoTanqueCheio,
      historicoConsumoKmL: historico,
      ultimoPrecoPorLitro: precoInformado > 0 ? precoInformado : context.ultimoPrecoPorLitro,
    },
  };
}

export function calculateFinancialMetrics(
  input: FinancialCalculationInput,
  context: FinancialEngineContext = {},
): FinancialCalculationResult {
  return calculateLaunch(input, context).result;
}

export function recalculateCompleteDay(
  launches: FinancialCalculationInput[],
  initialContext: FinancialEngineContext = {},
): FinancialChainResult {
  let context = normalizeContext(initialContext);
  const calculatedLaunches: FinancialCalculationResult[] = [];

  for (const launch of launches) {
    const calculated = calculateLaunch(launch, context);
    calculatedLaunches.push(calculated.result);
    context = calculated.context;
  }

  const latestCalculation = calculatedLaunches.at(-1);
  const consumption = latestCalculation?.km_por_litro_aplicado ?? 0;
  const mode = latestCalculation?.modo_calculo_km_litro ?? "estimativa_inicial";
  const latestPrice = [...launches].reverse().find(launch =>
    finiteNonNegative(launch.valorAbastecido) > 0
      && finiteNonNegative(launch.precoPorLitro) > 0,
  )?.precoPorLitro;
  const price = finiteNonNegative(latestPrice) || normalizeContext(initialContext).ultimoPrecoPorLitro;

  // O resumo do dia usa uma única referência vigente. Assim, quando o consumo
  // ou o preço mais recente muda, todos os quilômetros do dia são recalculados
  // pela mesma regra e os lançamentos deixam de carregar custos obsoletos.
  const results = calculatedLaunches.map(result => {
    const revenue = result.lucro_liquido_dia + result.custo_total_dia;
    const consumedLiters = safeDivide(result.km_rodados, consumption);
    const fuelCost = consumedLiters * price;
    const cost = fuelCost + result.gasto_manutencao + result.gastos_extras;
    const profit = revenue - cost;

    return {
      ...result,
      km_por_litro_aplicado: consumption,
      litros_consumidos_rodagem: consumedLiters,
      gasto_combustivel_rodagem: fuelCost,
      custo_total_dia: cost,
      lucro_liquido_dia: profit,
      custo_por_km: safeDivide(cost, result.km_rodados),
      lucro_por_km: safeDivide(profit, result.km_rodados),
      lucro_por_hora: safeDivide(profit, result.horas_trabalhadas),
      margem_lucro_percentual: safeDivide(profit * 100, revenue),
    } satisfies FinancialCalculationResult;
  });

  const sum = (pick: (result: FinancialCalculationResult) => number) =>
    results.reduce((total, result) => total + pick(result), 0);
  const km = sum(result => result.km_rodados);
  const hours = sum(result => result.horas_trabalhadas);
  const consumedLiters = sum(result => result.litros_consumidos_rodagem);
  const fuelCost = sum(result => result.gasto_combustivel_rodagem);
  const maintenance = sum(result => result.gasto_manutencao);
  const extras = sum(result => result.gastos_extras);
  const cost = sum(result => result.custo_total_dia);
  const profit = sum(result => result.lucro_liquido_dia);
  const revenue = profit + cost;

  return {
    lancamentos: results,
    acumuladoDia: {
      km_rodados: km,
      horas_trabalhadas: hours,
      km_por_litro_aplicado: consumption,
      modo_calculo_km_litro: mode,
      litros_consumidos_rodagem: consumedLiters,
      gasto_combustivel_rodagem: fuelCost,
      gasto_manutencao: maintenance,
      gastos_extras: extras,
      custo_total_dia: cost,
      lucro_liquido_dia: profit,
      custo_por_km: safeDivide(cost, km),
      lucro_por_km: safeDivide(profit, km),
      lucro_por_hora: safeDivide(profit, hours),
      margem_lucro_percentual: safeDivide(profit * 100, revenue),
    },
    contextoFinal: context,
  };
}

/** Compatibilidade com chamadas existentes; todo encadeamento usa a função mestre. */
export function calculateFinancialChain(
  launches: FinancialCalculationInput[],
  initialContext: FinancialEngineContext = {},
): FinancialChainResult {
  return recalculateCompleteDay(launches, initialContext);
}
