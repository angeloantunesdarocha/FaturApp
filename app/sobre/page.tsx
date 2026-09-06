import type { Metadata } from "next";
import TrustPage from "@/components/TrustPage";

export const metadata: Metadata = {
  title: "Sobre o FaturApp",
  description: "Conheça a proposta do FaturApp e como a plataforma ajuda motoristas e entregadores a entender receita, custos e lucro real.",
  alternates: { canonical: "https://fatur-app.vercel.app/sobre" },
};

export default function AboutPage() {
  return <TrustPage
    eyebrow="Sobre o FaturApp"
    title="Mais clareza sobre o que realmente sobra do seu trabalho."
    intro="O FaturApp foi criado para ajudar motoristas e entregadores a organizar ganhos, custos, quilômetros e horas em uma visão simples do resultado real."
    sections={[
      {
        heading: "Por que o FaturApp existe",
        paragraphs: [
          "O valor recebido em um dia não mostra sozinho quanto o motorista realmente ganhou. Taxas, combustível, manutenção e outras despesas reduzem o resultado e muitas vezes ficam espalhadas entre aplicativos, recibos e memória.",
          "A proposta do FaturApp é reunir esses dados para facilitar a leitura do lucro por dia, por hora e por quilômetro.",
        ],
      },
      {
        heading: "Para quem foi criado",
        paragraphs: ["A plataforma é voltada a profissionais que trabalham com deslocamentos e precisam acompanhar o resultado financeiro da rotina."],
        bullets: ["Motoristas de aplicativo", "Entregadores", "Profissionais que usam carro ou moto no trabalho", "Quem precisa comparar ganhos e custos por período"],
      },
      {
        heading: "O que o FaturApp faz hoje",
        paragraphs: [
          "O usuário pode registrar receitas, taxas, combustível, quilômetros, horas, manutenção e despesas extras. A partir desses dados, o sistema apresenta indicadores e relatórios para acompanhar o resultado do período.",
          "Também há recursos de exportação e compartilhamento para facilitar o acompanhamento fora da tela principal.",
        ],
      },
      {
        heading: "Nosso princípio",
        paragraphs: ["O FaturApp não promete ganhos nem garante resultados. O objetivo é oferecer organização e clareza para que cada usuário analise os próprios números e tome decisões com base no seu histórico real."],
      },
    ]}
  />;
}
