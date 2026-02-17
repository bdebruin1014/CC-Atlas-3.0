import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TypeScript errors are expected until types are generated from Supabase:
  //   npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts
  // Set to false once connected to a live Supabase instance.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
