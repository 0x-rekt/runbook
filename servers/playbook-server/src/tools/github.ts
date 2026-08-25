import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getRecentDeploys, findDeployBySha, getPreviousDeploy } from "../github-data.js";
import { auditLog } from "../audit-log.js";

export function registerGithubTools(server: McpServer) {
  server.registerTool(
    "github_list_recent_deploys",
    {
      title: "List recent deploys",
      description:
        "Returns the most recent deploys for the given services, newest first, with commit " +
        "sha, author, and message. Read-only — safe to call as part of diagnosis.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        services: z.array(z.string()).describe("Service names to check, e.g. ['checkout']"),
        count: z.number().int().positive().default(4).describe("Max deploys to return"),
      },
    },
    async ({ services, count }) => {
      const deploys = getRecentDeploys(services, count);
      return { content: [{ type: "text", text: JSON.stringify(deploys, null, 2) }] };
    }
  );

  // IRREVERSIBLE. destructiveHint tells TrueForge to pause for approval, but
  // that's a client-side hint, not enforcement — a client that ignores it
  // could still call this handler directly. So the handler enforces its own
  // rule too: `confirm: true` is REQUIRED, not optional, and every call
  // (successful or rejected) is written to the audit log below. This is
  // defense in depth on top of the harness-level approval gate, not a
  // replacement for it.
  server.registerTool(
    "github_trigger_rollback",
    {
      title: "Trigger rollback",
      description:
        "Reverts a service to its previous deploy. IRREVERSIBLE — this changes what's running " +
        "in production. Only call this as the final step of a matched playbook, and only after " +
        "the preceding diagnostic steps (error rate / deploy history / sandbox verification) " +
        "support it. Requires confirm: true.",
      annotations: { destructiveHint: true },
      inputSchema: {
        service: z.string().describe("Service to roll back, e.g. 'checkout'"),
        sha: z
          .string()
          .optional()
          .describe(
            "Specific commit sha to roll back to. Must belong to the given service. " +
              "If omitted, rolls back to that service's previous deploy."
          ),
        confirm: z
          .literal(true)
          .describe("Must be explicitly true. The call is rejected without it."),
      },
    },
    async ({ service, sha, confirm }) => {
      const args = { service, sha, confirm };

      if (!confirm) {
        auditLog({
          timestamp: new Date().toISOString(),
          tool: "github_trigger_rollback",
          arguments: args,
          status: "rejected",
          reason: "confirm was not explicitly true",
        });
        return {
          content: [{ type: "text", text: "Rejected: rollback requires confirm: true." }],
          isError: true,
        };
      }

      let target;
      if (sha) {
        target = findDeployBySha(sha);
        if (!target) {
          auditLog({
            timestamp: new Date().toISOString(),
            tool: "github_trigger_rollback",
            arguments: args,
            status: "rejected",
            reason: `no deploy found with sha "${sha}"`,
          });
          return {
            content: [{ type: "text", text: `Rejected: no deploy found with sha "${sha}".` }],
            isError: true,
          };
        }
        if (target.service !== service) {
          auditLog({
            timestamp: new Date().toISOString(),
            tool: "github_trigger_rollback",
            arguments: args,
            status: "rejected",
            reason: `sha "${sha}" belongs to service "${target.service}", not "${service}"`,
          });
          return {
            content: [
              {
                type: "text",
                text: `Rejected: sha "${sha}" belongs to "${target.service}", not "${service}".`,
              },
            ],
            isError: true,
          };
        }
      } else {
        target = getPreviousDeploy(service);
        if (!target) {
          auditLog({
            timestamp: new Date().toISOString(),
            tool: "github_trigger_rollback",
            arguments: args,
            status: "rejected",
            reason: `no prior deploy exists for service "${service}" to roll back to`,
          });
          return {
            content: [
              { type: "text", text: `Rejected: no prior deploy found for "${service}".` },
            ],
            isError: true,
          };
        }
      }

      const result = {
        status: "rolled_back",
        service,
        reverted_to: target.short_sha,
        reverted_to_message: target.message,
        reverted_at: new Date().toISOString(),
        note: "Synthetic rollback — no real deployment was changed.",
      };
      auditLog({
        timestamp: new Date().toISOString(),
        tool: "github_trigger_rollback",
        arguments: args,
        status: "success",
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
