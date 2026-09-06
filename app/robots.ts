import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/comece", "/guias", "/sobre", "/contato", "/privacidade", "/termos"],
      disallow: ["/admin", "/relatorios", "/api", "/auth", "/recuperar", "/redefinir-senha"],
    },
    sitemap: "https://fatur-app.vercel.app/sitemap.xml",
  };
}
