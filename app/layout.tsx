import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "FaturApp — Você está lucrando ou pagando pra trabalhar?",
  description: "O app do motorista de aplicativo que mostra o lucro real: por dia, por km e por hora. Receita, taxa do app, combustível e manutenção em um só lugar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6">{children}</main>
        <footer className="text-center text-xs text-slate-500 py-4 border-t border-slate-200"><p>FaturApp — descubra se você está lucrando ou pagando pra trabalhar.</p><p className="mt-1">Desenvolvido por: Ângelo Antunes</p></footer>
      </body>
    </html>
  );
}
