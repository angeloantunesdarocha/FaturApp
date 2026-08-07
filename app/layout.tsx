import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "FaturApp — Lucro líquido para motoristas de app",
  description: "Calcule o lucro líquido diário e mensal das suas corridas.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6">
          {children}
        </main>
        <footer className="text-center text-xs text-slate-500 py-4 border-t border-slate-200">
          FaturApp — Desenvolvido por: Ângelo Antunes
        </footer>
      </body>
    </html>
  );
}