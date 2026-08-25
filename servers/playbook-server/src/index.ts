import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerPlaybookTools } from "./tools/playbook.js";
import { registerMetricsTools } from "./tools/metrics.js";
// GitHub and sandbox tool modules register the same way once built:
// import { registerGithubTools } from "./tools/github.js";
// import { registerSandboxTools } from "./tools/sandbox.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLAYBOOKS_DIR = process.env.PLAYBOOKS_DIR ?? path.resolve(__dirname, "../../../playbooks");
const PORT = Number(process.env.PORT ?? 8791);

function buildServer() {
  const server = new McpServer({ name: "runbook-server", version: "0.1.0" });
  registerPlaybookTools(server, PLAYBOOKS_DIR);
  registerMetricsTools(server);
  // registerGithubTools(server);
  // registerSandboxTools(server);
  return server;
}

const app = express();
app.use(express.json());

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
  console.log(`Runbook MCP server listening on http://localhost:${PORT}/mcp`);
  console.log(`Serving playbooks from ${PLAYBOOKS_DIR}`);
  console.log(`Tools: playbook_list, playbook_get, metrics_query_error_rate, metrics_query_latency`);
});
