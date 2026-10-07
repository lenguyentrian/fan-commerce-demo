import { jsonOk } from '@/server/http';

/** GET /api/health — used by the CI smoke test and by Playwright's webServer. */
export function GET() {
  return jsonOk({
    status: 'ok',
    version: process.env.npm_package_version ?? '0.1.0',
    uptimeSeconds: Math.round(process.uptime()),
  });
}
