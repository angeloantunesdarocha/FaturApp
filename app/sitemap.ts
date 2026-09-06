import type { MetadataRoute } from "next";
import { guideCategories, guides } from "@/lib/guides";

const baseUrl = "https://fatur-app.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/comece`, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/guias`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/sobre`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/contato`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/privacidade`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${baseUrl}/termos`, changeFrequency: "yearly", priority: 0.4 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = guideCategories.map((category) => ({
    url: `${baseUrl}/guias/categoria/${category.slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const guideRoutes: MetadataRoute.Sitemap = guides.map((guide) => ({
    url: `${baseUrl}/guias/${guide.slug}`,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...categoryRoutes, ...guideRoutes];
}
