import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://minionsbid.vercel.app",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    // 추후 방 목록이나 공개된 페이지가 있다면 여기에 추가 가능
  ];
}
