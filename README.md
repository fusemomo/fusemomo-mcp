# FuseMomo MCP Server

## Overview

Fusemomo is Behavioral Entity Graph for AI agents. This MCP server is the primary integration surface a thin translation layer exposing Fusemomo's REST API as MCP tools compatible with Claude Desktop, Cursor, and any MCP client.

**One sentence:** Your agents call APIs blind. Fusemomo gives them eyes.

---

## Installation

### Option 1: npx (Recommended — no install needed)

```json
// claude_desktop_config.json or cursor MCP config
{
  "mcpServers": {
    "fusemomo": {
      "command": "npx",
      "args": ["-y", "@fusemomo/fusemomo-mcp"],
      "env": {
        "FUSEMOMO_API_KEY": "sk_live_your_key_here"
      }
    }
  }
}
```

### Option 2: Global Install

```bash
npm install -g @fusemomo/fusemomo-mcp
```

```json
{
  "mcpServers": {
    "fusemomo": {
      "command": "fusemomo-mcp",
      "env": {
        "FUSEMOMO_API_KEY": "sk_live_your_key_here"
      }
    }
  }
}
```

> Get your API key at [fusemomo.com](https://fusemomo.com)

---

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `FUSEMOMO_API_KEY` | ✅ | — | Your FuseMomo API key (`sk_live_...` or `sk_test_...`) |
| `FUSEMOMO_API_URL` | — | `https://api.fusemomo.com` | API base URL (override for self-hosted) |
| `FUSEMOMO_TIMEOUT` | — | `30000` | HTTP timeout in milliseconds |
| `LOG_LEVEL` | — | `info` | Log verbosity: `debug` \| `info` \| `warn` \| `error` |
| `NODE_ENV` | — | `production` | `development` for pretty-printed logs |

---

## Available Tools

### `resolve_entity`

Resolves one or more identifiers into a canonical entity. Creates the entity if it doesn't exist. Links identifiers across APIs into one unified record (L1 Identity Resolution).

**Required:** `identifiers` (object: key=source, value=identifier)

**Example:**
```
"Resolve alice@example.com"
→ { entity_id: "...", display_name: "Alice", behavioral_score: 0.82, total_interactions: 14, ... }
```

---

### `log_interaction`

Logs a behavioral event to the immutable interaction graph (L2 Behavioral Graph). Call this whenever your agent takes an action through any API.

**Required:** `entity_id`, `api`, `action_type`, `action`, `outcome`

**Example:**
```
"Log that we sent a payment reminder email to entity abc-123 via SendGrid, outcome: success"
→ "Interaction logged successfully. ID: xyz-789"
```

---

### `get_recommendation`

Gets the highest-success action recommendation for an entity based on historical behavioral data (L3 Behavioral Intelligence). Requires Builder plan.

**Required:** `entity_id`, `intent`

**Example:**
```
"What's the best way to recover payment from entity abc-123?"
→ { recommended_action_type: "send_email", confidence: 0.91, sample_size: 12, ... }
```

---

### `update_recommendation_outcome`

Closes the recommendation feedback loop by recording whether the recommendation was followed and what the outcome was. Improves future recommendation quality.

**Required:** `recommendation_id`, `was_followed`

**Example:**
```
"Mark recommendation rec-456 as followed, with outcome interaction int-789"
→ "Recommendation outcome updated. Followed: true, Outcome: success"
```

---

### `get_entity`

Retrieves a complete entity profile including all linked identifiers, behavioral stats, and recent interaction history.

**Required:** `entity_id`

**Example:**
```
"Get the full profile for entity abc-123"
→ { entity_id: "...", identifiers: [...], behavioral_score: 0.82, recent_interactions: [...], ... }
```

---

## Typical Agent Workflow

```
1. resolve_entity({ identifiers: { email: "customer@co.com" } })
   → get entity_id

2. get_recommendation({ entity_id, intent: "payment_recovery" })
   → get recommendation_id + recommended_action_type

3. // Agent executes action via external API...

4. log_interaction({ entity_id, api: "sendgrid", action_type: "send_email", ... })
   → get interaction_id

5. update_recommendation_outcome({ recommendation_id, was_followed: true, outcome_interaction_id })
   → feedback loop closed
```

---

## Development

```bash
# Clone and install
git clone https://github.com/fusemomo/mcp-server.git
cd fusemomo-mcp
npm install

# Copy env
cp .env.example .env
# Edit .env with your API key

# Run in dev mode (hot reload)
npm run dev

# Type check
npm run typecheck

# Run tests
npm test

# Build
npm run build
```

---

> [!NOTE]
> Backend API will be deployed soon!

## Troubleshooting

**Tool not showing up in Claude Desktop:**
Restart Claude Desktop after editing `claude_desktop_config.json`.

**Authentication failed:**
Check `FUSEMOMO_API_KEY` is set correctly and starts with `sk_live_` or `sk_test_`.

**Recommendations return plan upgrade error:**
`get_recommendation` requires a Builder plan ($99/month). Upgrade at [fusemomo.com/upgrade](https://fusemomo.com/upgrade).

**Connection refused:**
Verify `FUSEMOMO_API_URL` is reachable. Default: `https://api.fusemomo.com`.

---

## License

MIT — see [LICENSE](./LICENSE)