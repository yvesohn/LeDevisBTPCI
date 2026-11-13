import type { NextConfig } from "next";

/**
 * Domaines autorisés à afficher l'application dans un cadre (iframe).
 * Attention : en CSP, « https://*.domaine » ne couvre PAS « https://domaine ».
 * Il faut donc lister explicitement le domaine nu ET son joker.
 */
const DOMAINES_CADRE = [
  "'self'",
  "https://arena.ai",
  "https://*.arena.ai",
  "https://arena.site",
  "https://*.arena.site",
  "https://*.e2b.app",
  "https://e2b.app",
  "https://*.vercel.app",
  "https://vercel.app",
  "http://localhost:*",
  "http://127.0.0.1:*",
].join(" ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Volontairement PAS de X-Frame-Options : il écraserait la CSP et
          // bloquerait l'affichage dans l'aperçu de la plateforme.
          { key: "Content-Security-Policy", value: `frame-ancestors ${DOMAINES_CADRE}` },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
      { source: "/icons/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
};

export default nextConfig;
