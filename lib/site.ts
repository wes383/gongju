/**
 * Canonical origin of the deployed site.
 *
 * Set NEXT_PUBLIC_SITE_URL in the environment to the production origin
 * (for example https://tools.example.com); everything that needs absolute
 * URLs — sitemap, robots, Open Graph tags — reads it from here.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  ""
);

export const SITE_NAME = "GongJu";
