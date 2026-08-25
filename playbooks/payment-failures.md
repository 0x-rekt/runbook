---
id: payment-failures
title: Payment Failure Rate Spike
triggers:
  - "payment failure"
  - "checkout error rate"
  - "stripe errors"
  - "payments down"
severity: high
---

## Step 1: Check error rate by service (read-only)
tool: metrics.query_error_rate
params: { "service": "checkout", "window": "15m" }

## Step 2: Check recent deploys (read-only)
tool: github.list_recent_deploys
params: { "services": ["checkout", "payments"], "count": 4 }

## Step 3: Bisect deploys in sandbox (sandboxed)
tool: sandbox.bisect_deploys
params: { "service": "checkout" }

## Step 4: Roll back offending deploy (IRREVERSIBLE)
tool: github.trigger_rollback
params: { "service": "checkout" }
