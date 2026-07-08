import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/sign-in", "/sign-up", "/forgot-password"],
        disallow: [
          "/dashboard",
          "/work-orders",
          "/clients",
          "/vehicles",
          "/employees",
          "/settings",
          "/whatsapp",
          "/assistant",
          "/guides",
        ],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://talleros.app"}/sitemap.xml`,
  };
}
