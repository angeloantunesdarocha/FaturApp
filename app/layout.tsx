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
        <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-4 sm:py-6 lg:px-6">{children}</main>
        <footer className="border-t border-slate-200 px-3 py-4 text-center text-xs text-slate-500 sm:px-4"><p>FaturApp — descubra se você está lucrando ou pagando pra trabalhar.</p><p className="mt-1">Desenvolvido por: Ângelo Antunes</p></footer>
      </body>
    </html>
  );
}
