import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Every authenticated app route — kept as one explicit list rather
      // than a broader pattern so a new top-level route is a deliberate
      // addition here, not an accidental omission.
      disallow: [
        "/dashboard",
        "/resume",
        "/linkedin",
        "/opportunities",
        "/recruiters",
        "/billing",
        "/admin",
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
