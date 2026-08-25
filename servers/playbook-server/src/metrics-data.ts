/**
 * Fixed, reproducible synthetic metrics — not randomized per call.
 * The demo depends on the same alert always producing the same evidence,
 * so these are hand-authored scenarios keyed by service name, not live data.
 */

export interface ErrorRatePoint {
  timestamp: string;
  error_rate_pct: number;
}

export interface LatencyPoint {
  timestamp: string;
  p50_ms: number;
  p99_ms: number;
}

const NOW = () => new Date();

function minutesAgo(mins: number): string {
  return new Date(NOW().getTime() - mins * 60_000).toISOString();
}

// checkout: baseline ~0.4% error rate, spikes to ~8% over the last 15 minutes,
// consistent with the payment-failures playbook's demo scenario.
const CHECKOUT_ERROR_RATE: ErrorRatePoint[] = [
  { timestamp: minutesAgo(15), error_rate_pct: 0.4 },
  { timestamp: minutesAgo(12), error_rate_pct: 0.5 },
  { timestamp: minutesAgo(9), error_rate_pct: 2.1 },
  { timestamp: minutesAgo(6), error_rate_pct: 5.8 },
  { timestamp: minutesAgo(3), error_rate_pct: 8.2 },
  { timestamp: minutesAgo(0), error_rate_pct: 8.4 },
];

// api-gateway: baseline p99 ~180ms, climbs to ~1400ms over 15 minutes.
const API_GATEWAY_LATENCY: LatencyPoint[] = [
  { timestamp: minutesAgo(15), p50_ms: 42, p99_ms: 180 },
  { timestamp: minutesAgo(12), p50_ms: 48, p99_ms: 310 },
  { timestamp: minutesAgo(9), p50_ms: 61, p99_ms: 640 },
  { timestamp: minutesAgo(6), p50_ms: 80, p99_ms: 980 },
  { timestamp: minutesAgo(3), p50_ms: 95, p99_ms: 1350 },
  { timestamp: minutesAgo(0), p50_ms: 97, p99_ms: 1420 },
];

const ERROR_RATE_SERIES: Record<string, ErrorRatePoint[]> = {
  checkout: CHECKOUT_ERROR_RATE,
  payments: CHECKOUT_ERROR_RATE,
};

const LATENCY_SERIES: Record<string, LatencyPoint[]> = {
  "api-gateway": API_GATEWAY_LATENCY,
};

export function getErrorRate(service: string): ErrorRatePoint[] | undefined {
  return ERROR_RATE_SERIES[service];
}

export function getLatency(service: string): LatencyPoint[] | undefined {
  return LATENCY_SERIES[service];
}
