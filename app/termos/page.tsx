import type { Metadata } from "next";
import TrustPage from "@/components/TrustPage";

export const metadata: Metadata = {
  title: "Termos de Uso | FaturApp",
  description: "Regras básicas de uso do FaturApp, limitações dos cálculos e responsabilidades do usuário.",
  alternates: { canonical: "https://fatur-app.vercel.app/termos" },
};

export default function TermsPage() {
  return <TrustPage
    eyebrow="Termos de uso"
    title="Regras simples para usar o FaturApp com clareza."
    intro="Ao utilizar a plataforma, o usuário concorda em fornecer informações de forma responsável e entende que os resultados apresentados dependem dos dados registrados."
    sections={[
      {
        heading: "Finalidade da plataforma",
        paragraphs: [
          "O FaturApp é uma ferramenta de organização e cálculo para motoristas, entregadores e outros profissionais que desejam acompanhar receitas, custos, quilômetros, horas e indicadores relacionados ao próprio trabalho.",
          "A plataforma não oferece promessa de ganho, consultoria financeira, contábil, fiscal ou jurídica.",
        ],
      },
      {
        heading: "Responsabilidade pelos dados informados",
        paragraphs: [
          "Os cálculos dependem dos valores registrados pelo usuário. Dados incompletos, incorretos ou estimados podem produzir resultados diferentes da realidade.",
          "O usuário é responsável por conferir as informações inseridas e por decidir como utilizar os indicadores apresentados.",
        ],
      },
      {
        heading: "Conta e acesso",
        paragraphs: [
          "Cada usuário deve proteger suas credenciais e evitar compartilhar senhas ou sessões autenticadas. O uso indevido de uma conta pode comprometer a confidencialidade dos registros associados a ela.",
        ],
      },
      {
        heading: "Disponibilidade e evolução",
        paragraphs: [
          "O FaturApp pode receber melhorias, correções e alterações de interface ou funcionamento. Recursos podem ser ajustados para segurança, desempenho e qualidade do serviço.",
          "Falhas temporárias de internet, infraestrutura ou serviços de terceiros podem afetar o acesso em determinados momentos.",
        ],
      },
      {
        heading: "Uso adequado",
        paragraphs: [
          "Não é permitido utilizar o serviço para tentar obter acesso indevido a contas, dados, infraestrutura ou recursos que não pertençam ao próprio usuário, nem explorar deliberadamente falhas de segurança.",
        ],
      },
    ]}
  />;
}
