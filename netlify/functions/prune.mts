import type { Config } from "@netlify/functions";

export default async function prune(): Promise<Response> {
  const site = process.env.URL;
  const secret = process.env.CRON_SECRET;
  if (!site || !secret) {
    return new Response("URL or CRON_SECRET is not set", { status: 500 });
  }
  const response = await fetch(`${site}/api/cron/prune`, {
    headers: { authorization: `Bearer ${secret}` },
    method: "POST",
  });
  return new Response(await response.text(), { status: response.status });
}

export const config: Config = { schedule: "@daily" };
