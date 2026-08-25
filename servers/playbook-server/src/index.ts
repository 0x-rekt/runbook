import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { loadPlaybooks, loadPlaybook } from "./parser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLAYBOOKS_DIR = process.env.PLAYBOOKS_DIR ?? path.resolve(__dirname, "../../../playbooks");
const PORT = Number(process.env.PORT ?? 8791);

function buildServer() {
  const server = new McpServer({ name: "playbook-server", version: "0.1.0" });

  // Read-only: safe to call freely, never triggers TrueForge's approval gate.
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
      const playbooks = loadPlaybooks(PLAYBOOKS_DIR);
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
      const playbook = loadPlaybook(PLAYBOOKS_DIR, id);
      if (!playbook) {
        return {
          content: [{ type: "text", text: `No playbook found with id "${id}"` }],
          isError: true,
        };
      }
      return { content: [{ type: "text", text: JSON.stringify(playbook, null, 2) }] };
    }
  );

  return server;
}

const app = express();
app.use(express.json());

// Stateless mode: a fresh transport per request is fine here since our tools
// are pure reads off disk — no session state to keep between calls.
app.post("/mcp", async (req, res) => {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.listen(PORT, () => {
  console.log(`Playbook MCP server listening on http://localhost:${PORT}/mcp`);
  console.log(`Serving playbooks from ${PLAYBOOKS_DIR}`);
});
