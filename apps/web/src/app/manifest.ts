import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sri Lanka Navigator",
    short_name: "Navigator",
    description: "Plan your Sri Lanka trip and travel it with verified local guides.",
    start_url: "/trips",
    display: "standalone",
    background_color: "#F2F2F7",
    theme_color: "#006B6B",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
