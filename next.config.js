/** @type {import('next').NextConfig} */

// When this app is mounted in Webflow Cloud it lives under a sub-path
// (e.g. /planner-rsvp). Webflow provides that path as COSMIC_MOUNT_PATH at
// build time; you can also set NEXT_PUBLIC_BASE_PATH yourself. Either one works.
// Locally, leave both unset to serve the app from "/".
const basePath =
  process.env.NEXT_PUBLIC_BASE_PATH || process.env.COSMIC_MOUNT_PATH || '';

const nextConfig = {
  reactStrictMode: true,
  // basePath must be a non-empty string starting with "/" or omitted entirely.
  ...(basePath
    ? {
        basePath,
        // Inline the resolved value so client-side fetch() calls prefix it too,
        // even when only COSMIC_MOUNT_PATH was provided.
        env: { NEXT_PUBLIC_BASE_PATH: basePath },
      }
    : {}),
};

module.exports = nextConfig;
