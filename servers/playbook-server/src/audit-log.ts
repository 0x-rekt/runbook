import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIT_LOG_PATH = process.env.AUDIT_LOG_PATH ?? path.resolve(__dirname, "../audit.log");

export interface AuditEntry {
  timestamp: string;
  tool: string;
  arguments: unknown;
  status: "success" | "rejected";
  reason?: string;
}

/**
 * Appends one JSON-lines record per destructive tool call. Best-effort: a
 * logging failure should never block or crash the actual tool call, so
 * failures are swallowed after being surfaced to stderr.
 */
export function auditLog(entry: AuditEntry) {
  const line = JSON.stringify(entry) + "\n";
  try {
    fs.appendFileSync(AUDIT_LOG_PATH, line, "utf-8");
  } catch (err) {
    console.error("audit log write failed:", err);
  }
  // Always echo to stdout too, so it shows up in the running server's console
  // even before anyone goes looking for the file.
  console.log("AUDIT:", line.trim());
}
