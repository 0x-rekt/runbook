import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadPlaybooks, loadPlaybook } from "../playbook-parser.js";

export function registerPlaybookTools(server: McpServer, playbooksDir: string) {
  server.registerTool(
    "playbook_list",
    {
      title: "List playbooks",
      description:
        "Lists all available SRE playbooks with their id, title, trigger phrases, and severity. " +
        "Use this to find which playbook (if any) matches an incoming alert's description.",
      annotations: { readOnlyHint: true },
      inputSchema: {},
    },
    async () => {
      const playbooks = loadPlaybooks(playbooksDir);
      const summary = playbooks.map(({ id, title, triggers, severity }) => ({
        id,
        title,
        triggers,
        severity,
      }));
      return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
    }
  );

  server.registerTool(
    "playbook_get",
    {
      title: "Get playbook",
      description:
        "Returns the full parsed step sequence for one playbook by id, including each step's " +
        "tool name and params. This is the ONLY source of truth for what steps to execute — " +
        "never execute a step or call a tool that isn't listed here for the matched playbook.",
      annotations: { readOnlyHint: true },
      inputSchema: { id: z.string().describe("The playbook id, e.g. 'payment-failures'") },
    },
    async ({ id }) => {
      const playbook = loadPlaybook(playbooksDir, id);
      if (!playbook) {
        return {
          content: [{ type: "text", text: `No playbook found with id "${id}"` }],
          isError: true,
        };
      }
      return { content: [{ type: "text", text: JSON.stringify(playbook, null, 2) }] };
    }
  );
}
