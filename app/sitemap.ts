import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";
import { siteRoutes } from "@/lib/site-routes";

const baseUrl = getSiteUrl();
const now = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  return siteRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.7,
  }));
}
