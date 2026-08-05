// Componente auxiliar simples, usado dentro de page.tsx para exibir
// o lucro do mês já renderizado no servidor.
import { formatBRL } from "@/lib/utils";

export default function MonthProfit({ value }: { value: number }) {
  return <span>{formatBRL(value)}</span>;
}