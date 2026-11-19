import type { MetadataRoute } from "next";
import { PROJECTS } from "./components/projects";
import { SITE_URL } from "./site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "monthly", priority: 1 },
    ...PROJECTS.map((project) => ({
      url: `${SITE_URL}/projects/${project.id}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
