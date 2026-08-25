# Playbooks

Each `.md` file here is one playbook: YAML frontmatter (id, title, triggers, severity)
followed by `## Step N: ...` sections, each with a `tool:` line and a `params:` line
(single-line JSON).

Currently defined:
- `payment-failures.md` — primary demo scenario (happy path: match → diagnose → sandbox
  bisect → approval-gated rollback)
- `latency-spike.md` — secondary scenario, read-only diagnosis + sandbox replay, no
  irreversible step

## Deliberately unmatched scenario (refusal demo)

There is **no playbook for disk-space alerts** in this folder — that's intentional.
The refusal demo sends an alert like:

  "Disk usage on db-primary is at 94% and climbing"

against the Matcher Agent and confirms it returns a structured "no match" result
(low confidence against every trigger list above) instead of letting the Executor
Agent improvise a fix. Don't add a `disk-full.md` playbook — the absence is the
test fixture.
