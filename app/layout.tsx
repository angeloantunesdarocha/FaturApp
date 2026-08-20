import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import ContributionPendingReminder from "@/components/ContributionPendingReminder";
import { getCurrentUser } from "@/lib/auth";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";

export const metadata: Metadata = {
  metadataBase: new URL("https://fatur-app.vercel.app"),
  title: {
    default: "FaturApp — Descubra seu lucro real",
    template: "%s | FaturApp",
  },
  description:
    "Você sabe quanto realmente sobra? Calcule seu lucro líquido por dia, por km e por hora, descontando taxas, combustível, manutenção e outros custos.",
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://fatur-app.vercel.app/comece",
    siteName: "FaturApp",
    title: "FaturApp — Descubra quanto realmente sobra. Calcule agora.",
    description:
      "Descubra em poucos minutos se você está lucrando ou pagando para trabalhar. Calcule seu lucro real por dia, por km e por hora.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "FaturApp — descubra quanto realmente sobra",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FaturApp — Descubra quanto realmente sobra",
    description:
      "Calcule seu lucro real e descubra se você está lucrando ou pagando para trabalhar.",
    images: ["/opengraph-image"],
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
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="pt-BR">
      <body className="min-h-screen flex flex-col">
        <Header isAuthenticated={!!user} />
        <ContributionPendingReminder />
        <main className="mx-auto w-full max-w-6xl flex-1 overflow-x-hidden px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
          {children}
        </main>
        <footer className="border-t border-slate-200 px-3 py-4 text-center text-xs text-slate-500 sm:px-4">
          <p>FaturApp — descubra se você está lucrando ou pagando pra trabalhar.</p>
          <p className="mt-1">Desenvolvido por: Ângelo Antunes</p>
        </footer>
        <Analytics />
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '1046537313270817');
              fbq('track', 'PageView');
            `,
          }}
        />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1046537313270817&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
      </body>
    </html>
  );
}
