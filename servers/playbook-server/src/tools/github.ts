import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getRecentDeploys, findDeployBySha } from "../github-data.js";

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

  // IRREVERSIBLE. This is the tool the approval gate exists for — the
  // destructiveHint annotation is what makes TrueForge pause the turn and
  // wait for an explicit Allow before this handler ever runs.
  server.registerTool(
    "github_trigger_rollback",
    {
      title: "Trigger rollback",
      description:
        "Reverts a service to its previous deploy. IRREVERSIBLE — this changes what's running " +
        "in production. Only call this as the final step of a matched playbook, and only after " +
        "the preceding diagnostic steps (error rate / deploy history / sandbox verification) " +
        "support it.",
      annotations: { destructiveHint: true },
      inputSchema: {
        service: z.string().describe("Service to roll back, e.g. 'checkout'"),
        sha: z
          .string()
          .optional()
          .describe("Specific commit sha to roll back to; defaults to the previous deploy"),
      },
    },
    async ({ service, sha }) => {
      const target = sha ? findDeployBySha(sha) : undefined;
      const result = {
        status: "rolled_back",
        service,
        reverted_to: target?.short_sha ?? "previous-deploy",
        reverted_at: new Date().toISOString(),
        note: "Synthetic rollback — no real deployment was changed.",
      };
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
