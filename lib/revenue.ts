export const REVENUE_APPS = ["Uber", "99", "inDrive", "Outro"] as const;

export type RevenueAppName = (typeof REVENUE_APPS)[number];

export type RevenueItem = {
  id: string;
  app: RevenueAppName | "";
  nomeAppPersonalizado: string;
  bruto: number;
  taxa: number;
};

export type RevenueItemPersisted = RevenueItem & {
  taxaValor: number;
  liquido: number;
};

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function normalizeRevenueItems(items: RevenueItem[]): RevenueItemPersisted[] {
  return items.map((item) => {
    const bruto = roundMoney(Math.max(0, Number(item.bruto) || 0));
    const taxa = Math.min(100, Math.max(0, Number(item.taxa) || 0));
    const taxaValor = roundMoney(bruto * (taxa / 100));
    const liquido = roundMoney(bruto - taxaValor);
    // Registros antigos que usavam "Indefinido" continuam legíveis e passam
    // a aparecer como "Outro", sem manter a opção confusa para novos lançamentos.
    const app = (item.app as string) === "Indefinido" ? "Outro" : item.app;
    return {
      id: String(item.id),
      app,
      nomeAppPersonalizado: String(item.nomeAppPersonalizado || "").trim(),
      bruto,
      taxa,
      taxaValor,
      liquido,
    };
  });
}

export function summarizeRevenue(items: RevenueItem[]) {
  const normalized = normalizeRevenueItems(items);
  const bruto = roundMoney(normalized.reduce((sum, item) => sum + item.bruto, 0));
  const taxaValor = roundMoney(normalized.reduce((sum, item) => sum + item.taxaValor, 0));
  const liquido = roundMoney(normalized.reduce((sum, item) => sum + item.liquido, 0));
  const taxaPercentual = bruto > 0 ? roundMoney((taxaValor / bruto) * 100) : 0;
  return { normalized, bruto, taxaValor, liquido, taxaPercentual };
}

export function createRevenueItem(): RevenueItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    app: "",
    nomeAppPersonalizado: "",
    bruto: 0,
    taxa: 0,
  };
}
