import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import { getCurrentUser } from "@/lib/auth";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  metadataBase: new URL("https://fatur-app.vercel.app"),
  title: "FaturApp — Você está lucrando ou pagando pra trabalhar?",
  description:
    "O app do motorista de aplicativo que mostra o lucro real: por dia, por km e por hora. Receita, taxa do app, combustível e manutenção em um só lugar.",
  keywords: [
    "motorista de aplicativo",
    "lucro líquido",
    "ganhos Uber",
    "ganhos 99",
    "ganhos InDrive",
    "controle financeiro",
    "FaturApp",
  ],
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://fatur-app.vercel.app/",
    siteName: "FaturApp",
    title: "FaturApp — Descubra quanto realmente sobra no seu dia",
    description:
      "Calcule seu lucro real por dia, quilômetro e hora. Controle combustível, taxas, manutenção e descubra se você está lucrando.",
    images: [
      {
        url: "/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "FaturApp — controle do lucro para motoristas de aplicativo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FaturApp — Descubra quanto realmente sobra no seu dia",
    description:
      "Calcule seu lucro real e tenha mais controle sobre o seu trabalho como motorista de aplicativo.",
    images: ["/icon-512x512.png"],
  },
  icons: {
    icon: [
      { url: "/icon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FaturApp",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#123B63",
    "msapplication-TileImage": "/icon-192x192.png",
    subject:
      "Controle financeiro e cálculo de lucro para motoristas de aplicativo",
    copyright: "FaturApp — Desenvolvido por Ângelo Antunes",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="pt-BR">
      <body className="min-h-screen flex flex-col">
        <Header isAuthenticated={!!user} />
        <main className="mx-auto w-full max-w-6xl flex-1 overflow-x-hidden px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
          {children}
        </main>
        <footer className="border-t border-slate-200 px-3 py-4 text-center text-xs text-slate-500 sm:px-4">
          <p>FaturApp — descubra se você está lucrando ou pagando pra trabalhar.</p>
          <p className="mt-1">Desenvolvido por: Ângelo Antunes</p>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
