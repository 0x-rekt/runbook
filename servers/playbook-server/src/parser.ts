import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export interface PlaybookStep {
  order: number;
  title: string;
  tool: string;
  params: Record<string, unknown>;
}

export interface Playbook {
  id: string;
  title: string;
  triggers: string[];
  severity: string;
  steps: PlaybookStep[];
}

const STEP_HEADER_RE = /^##\s*Step\s*(\d+):\s*(.+)$/;
const TOOL_LINE_RE = /^tool:\s*(\S+)\s*$/;
const PARAMS_LINE_RE = /^params:\s*(\{.*\})\s*$/;

/**
 * Parses the markdown body into an ordered list of steps.
 * Deliberately strict: a malformed step (missing tool/params) throws at
 * load time rather than letting the agent guess what a step means.
 */
function parseSteps(body: string): PlaybookStep[] {
  const lines = body.split("\n");
  const steps: PlaybookStep[] = [];
  let current: Partial<PlaybookStep> | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const headerMatch = line.match(STEP_HEADER_RE);
    if (headerMatch) {
      if (current) steps.push(finalizeStep(current));
      current = { order: Number(headerMatch[1]), title: headerMatch[2].trim() };
      continue;
    }
    if (!current) continue;

    const toolMatch = line.match(TOOL_LINE_RE);
    if (toolMatch) {
      current.tool = toolMatch[1];
      continue;
    }
    const paramsMatch = line.match(PARAMS_LINE_RE);
    if (paramsMatch) {
      current.params = JSON.parse(paramsMatch[1]);
      continue;
    }
  }
  if (current) steps.push(finalizeStep(current));
  return steps;
}

function finalizeStep(step: Partial<PlaybookStep>): PlaybookStep {
  if (!step.tool) {
    throw new Error(`Step "${step.title}" is missing a "tool:" line`);
  }
  return {
    order: step.order ?? 0,
    title: step.title ?? "",
    tool: step.tool,
    params: step.params ?? {},
  };
}

export function loadPlaybooks(dir: string): Playbook[] {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md") && f !== "README.md");
  return files.map((file) => {
    const raw = fs.readFileSync(path.join(dir, file), "utf-8");
    const { data, content } = matter(raw);
    return {
      id: data.id,
      title: data.title,
      triggers: data.triggers ?? [],
      severity: data.severity ?? "unknown",
      steps: parseSteps(content),
    } satisfies Playbook;
  });
}

export function loadPlaybook(dir: string, id: string): Playbook | undefined {
  return loadPlaybooks(dir).find((p) => p.id === id);
}
