/** @type {import('next').NextConfig} */

// When this app is mounted in Webflow Cloud it lives under a sub-path
// (e.g. /planner-rsvp). Set NEXT_PUBLIC_BASE_PATH to that mount path so both
// the router and client-side fetch calls resolve correctly. Locally, leave it
// unset (or "") to serve the app from "/".
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  reactStrictMode: true,
  // basePath must be a non-empty string starting with "/" or omitted entirely.
  ...(basePath ? { basePath } : {}),
};

module.exports = nextConfig;
