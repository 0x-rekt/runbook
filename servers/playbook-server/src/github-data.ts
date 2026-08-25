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

const ALL_DEPLOYS = CHECKOUT_DEPLOYS;

/**
 * Returns deploys for exactly the requested services — no cross-service leakage.
 * (Previously the `payments` bucket was built by filtering in `checkout` entries
 * too, which meant a `payments`-only query silently returned `checkout` deploys.)
 */
export function getRecentDeploys(services: string[], count: number): Deploy[] {
  const serviceSet = new Set(services);
  const matching = ALL_DEPLOYS.filter((d) => serviceSet.has(d.service));
  return matching
    .sort((a, b) => new Date(b.deployed_at).getTime() - new Date(a.deployed_at).getTime())
    .slice(0, count);
}

export function findDeployBySha(sha: string): Deploy | undefined {
  return ALL_DEPLOYS.find((d) => d.sha === sha || d.short_sha === sha);
}

/**
 * The deploy that should be rolled back TO for a service when no explicit sha
 * is given: the second-most-recent deploy for that service (i.e. the one
 * before the presumed-bad latest one). Returns undefined if there isn't a
 * prior deploy to fall back to.
 */
export function getPreviousDeploy(service: string): Deploy | undefined {
  const forService = getRecentDeploys([service], 2);
  return forService[1];
}
