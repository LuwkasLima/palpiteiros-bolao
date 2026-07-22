import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/jogos", "/news", "/regras"],
      disallow: ["/pools/", "/perfil/", "/admin/", "/join/", "/onboarding/", "/auth/"],
    },
  };
}
