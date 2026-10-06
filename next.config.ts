import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The older pages now live in the chamber toolbox. Every old address keeps
  // working: printed QR codes point at /w/<slug>, which /e/<key> also resolves.
  async redirects() {
    return [
      { source: "/w/:slug", destination: "/e/:slug", permanent: true },
      { source: "/w/:slug/vote", destination: "/e/:slug/vote", permanent: true },
      { source: "/pre-leave", destination: "/leave", permanent: true },
      { source: "/seats", destination: "/console/events", permanent: false },
      { source: "/seats/print", destination: "/console/events", permanent: false },
      { source: "/seats/:weekId", destination: "/console/events/:weekId/seating/grid", permanent: false },
      { source: "/admin", destination: "/console", permanent: false },
      { source: "/admin/events/:weekId", destination: "/console/events/:weekId", permanent: false },
    ];
  },
};

export default nextConfig;
