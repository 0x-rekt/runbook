/**
 * Fixed, reproducible synthetic deploy history — mirrors the shape of a real
 * GitHub API response closely enough to swap in the real thing later, but
 * doesn't depend on network/auth for the demo to run reliably.
 */

export interface Deploy {
  sha: string;
  short_sha: string;
  service: string;
  author: string;
  message: string;
  deployed_at: string;
}

function minutesAgo(mins: number): string {
  return new Date(Date.now() - mins * 60_000).toISOString();
}

// The 4th entry (30 min ago) is the deliberately "bad" deploy: it lands right
// before the checkout error-rate spike in the metrics data, and is what the
// bisect step (once built) and the rollback target should both point at.
const CHECKOUT_DEPLOYS: Deploy[] = [
  {
    sha: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    short_sha: "a1b2c3d",
    service: "checkout",
    author: "priya",
    message: "Add gift-card redemption UI",
    deployed_at: minutesAgo(180),
  },
  {
    sha: "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3",
    short_sha: "b2c3d4e",
    service: "checkout",
    author: "dev-bot",
    message: "Bump dependency versions",
    deployed_at: minutesAgo(120),
  },
  {
    sha: "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
    short_sha: "c3d4e5f",
    service: "payments",
    author: "arjun",
    message: "Refactor payment retry logic",
    deployed_at: minutesAgo(60),
  },
  {
    sha: "d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5",
    short_sha: "d4e5f6a",
    service: "checkout",
    author: "arjun",
    message: "Switch Stripe client to new API version",
    deployed_at: minutesAgo(30),
  },
];

const DEPLOYS_BY_SERVICE: Record<string, Deploy[]> = {
  checkout: CHECKOUT_DEPLOYS,
  payments: CHECKOUT_DEPLOYS.filter((d) => d.service === "payments" || d.service === "checkout"),
};

export function getRecentDeploys(services: string[], count: number): Deploy[] {
  const all = services.flatMap((s) => DEPLOYS_BY_SERVICE[s] ?? []);
  const deduped = Array.from(new Map(all.map((d) => [d.sha, d])).values());
  return deduped
    .sort((a, b) => new Date(b.deployed_at).getTime() - new Date(a.deployed_at).getTime())
    .slice(0, count);
}

export function findDeployBySha(sha: string): Deploy | undefined {
  return CHECKOUT_DEPLOYS.find((d) => d.sha === sha || d.short_sha === sha);
}
