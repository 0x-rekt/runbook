import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getErrorRate, getLatency } from "../metrics-data.js";

export function registerMetricsTools(server: McpServer) {
  server.registerTool(
    "metrics_query_error_rate",
    {
      title: "Query error rate",
      description:
        "Returns a time series of error rate percentage for a service over the given window. " +
        "Read-only — safe to call as part of diagnosis.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        service: z.string().describe("Service name, e.g. 'checkout'"),
        window: z.string().describe("Lookback window, e.g. '15m'").optional(),
      },
    },
    async ({ service }) => {
      const series = getErrorRate(service);
      if (!series) {
        return {
          content: [{ type: "text", text: `No error-rate data for service "${service}"` }],
          isError: true,
        };
      }
      const current = series[series.length - 1].error_rate_pct;
      const baseline = series[0].error_rate_pct;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { service, baseline_pct: baseline, current_pct: current, series },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "metrics_query_latency",
    {
      title: "Query latency",
      description:
        "Returns a time series of p50/p99 latency in ms for a service over the given window. " +
        "Read-only — safe to call as part of diagnosis.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        service: z.string().describe("Service name, e.g. 'api-gateway'"),
        window: z.string().describe("Lookback window, e.g. '15m'").optional(),
      },
    },
    async ({ service }) => {
      const series = getLatency(service);
      if (!series) {
        return {
          content: [{ type: "text", text: `No latency data for service "${service}"` }],
          isError: true,
        };
      }
      const current = series[series.length - 1];
      const baseline = series[0];
      return {
        content: [
          { type: "text", text: JSON.stringify({ service, baseline, current, series }, null, 2) },
        ],
      };
    }
  );
}
