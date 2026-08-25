---
id: latency-spike
title: API Latency Spike
triggers:
  - "high latency"
  - "slow response times"
  - "p99 latency alert"
  - "api slow"
severity: medium
---

## Step 1: Check latency by service (read-only)
tool: metrics.query_latency
params: { "service": "api-gateway", "window": "15m" }

## Step 2: Check recent deploys (read-only)
tool: github.list_recent_deploys
params: { "services": ["api-gateway"], "count": 4 }

## Step 3: Replay a sample request in sandbox (sandboxed)
tool: sandbox.replay_request
params: { "service": "api-gateway" }
