import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  const pages = ["", "/mentions-legales", "/cgu", "/confidentialite"];
  return pages.map((p) => ({ url: `${base}${p || "/"}`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: p === "" ? 1 : 0.5 }));
}
