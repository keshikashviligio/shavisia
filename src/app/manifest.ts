import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "shavisia.ge — მძღოლების შავი სია",
    short_name: "shavisia.ge",
    description:
      "დაამატე ან გადაამოწმე მძღოლი მართვის მოწმობის ნომრით — შავი სია ავტომობილების გამქირავებლებისთვის",
    lang: "ka",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: "/icons/pwa-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/pwa-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/pwa-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
