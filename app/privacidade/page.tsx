import type { Metadata } from "next";
import TrustPage from "@/components/TrustPage";

export const metadata: Metadata = {
  title: "Política de Privacidade | FaturApp",
  description: "Entenda de forma clara quais dados o FaturApp usa para autenticação, funcionamento e melhoria da plataforma.",
  alternates: { canonical: "https://fatur-app.vercel.app/privacidade" },
};

export default function PrivacyPage() {
  return <TrustPage
    eyebrow="Privacidade"
    title="Como tratamos os dados usados no FaturApp."
    intro="Esta página resume, em linguagem simples, como os dados informados e gerados durante o uso da plataforma são utilizados para autenticação, funcionamento, segurança e melhoria do serviço."
    sections={[
      {
        heading: "Dados de conta",
        paragraphs: [
          "Para criar e acessar uma conta, o FaturApp utiliza dados necessários à autenticação, como endereço de e-mail e informações fornecidas pelo provedor de login quando o usuário escolhe uma opção de acesso externo.",
          "Esses dados são utilizados para identificar a conta, permitir o login, recuperar o acesso quando solicitado e associar os registros ao usuário correto.",
        ],
      },
      {
        heading: "Dados inseridos no FaturApp",
        paragraphs: [
          "Os lançamentos podem incluir receitas, taxas, quilômetros, horas, combustível, manutenção e despesas extras. Esses dados são usados para calcular e apresentar os indicadores e relatórios solicitados pelo próprio usuário.",
          "O FaturApp não precisa que o usuário informe dados de passageiros, clientes ou terceiros para realizar esses cálculos.",
        ],
      },
      {
        heading: "Medição de uso e tecnologias de terceiros",
        paragraphs: [
          "A página pública pode utilizar ferramentas de medição e analytics para entender visitas, navegação e desempenho. Serviços de infraestrutura, autenticação e hospedagem também podem processar dados técnicos necessários ao funcionamento da aplicação.",
          "Essas tecnologias podem registrar informações técnicas como endereço IP, navegador, dispositivo, páginas acessadas e eventos de navegação, conforme as configurações e políticas dos respectivos provedores.",
        ],
      },
      {
        heading: "Segurança e acesso",
        paragraphs: [
          "O acesso aos registros depende de autenticação. O usuário também deve proteger sua senha, evitar compartilhá-la e encerrar sessões em dispositivos que não controla.",
          "Medidas técnicas podem ser atualizadas ao longo do tempo conforme a plataforma evolui e novas necessidades de segurança são identificadas.",
        ],
      },
      {
        heading: "Solicitações sobre seus dados",
        paragraphs: [
          "Quando precisar esclarecer uma questão sobre privacidade ou solicitar orientação relacionada à sua conta, use os canais oficiais indicados na página de contato do FaturApp.",
        ],
      },
    ]}
  />;
}
