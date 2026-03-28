# Fusemomo MCP Server

## Overview

Fusemomo is Behavioral Entity Graph for AI agents. This MCP server is the primary integration surface a thin translation layer exposing Fusemomo's REST API as MCP tools compatible with Claude Desktop, Cursor, and any MCP client.

**One sentence:** Your agents call APIs blind. Fusemomo gives them eyes.

---

## Installation

> [!IMPORTANT]
> **Do not put your API key in the config file.** Set it once in your shell profile — the MCP server reads it from your system environment automatically.

### Step 1 — Set your API key in your shell profile

Add the following line to your shell configuration file and restart your terminal (or run `source`):

**macOS / Linux (bash/zsh):**
```bash
# ~/.zshrc  or  ~/.bashrc  or  ~/.bash_profile
export FUSEMOMO_API_KEY="fm_live_your_key_here"
```

**Windows (PowerShell profile):**
```powershell
# $PROFILE
$Env:FUSEMOMO_API_KEY = "fm_live_your_key_here"
```

Verify it is set:
```bash
echo $FUSEMOMO_API_KEY
# fm_live_...
```

> Get your API key at [fusemomo.com/dashboard/api-keys](https://fusemomo.com/dashboard/api-keys)

---

### Step 2 — Add to your MCP client config

**Option A: npx (Recommended — no install needed)**

```json
{
  "mcpServers": {
    "fusemomo": {
      "command": "npx",
      "args": ["-y", "@fusemomo/fusemomo-mcp"]
    }
  }
}
```

**Option B: Global install**

```bash
npm install -g @fusemomo/fusemomo-mcp
```

```json
{
  "mcpServers": {
    "fusemomo": {
      "command": "fusemomo-mcp"
    }
  }
}
```

> [!NOTE]
> If your MCP client (e.g. Claude Desktop) spawns processes in a stripped environment and doesn't inherit your shell exports, add the reference explicitly — but still read it from the environment, not a hardcoded value:
> ```json
> {
>   "mcpServers": {
>     "fusemomo": {
>       "command": "npx",
>       "args": ["-y", "@fusemomo/fusemomo-mcp"],
>       "env": {
>         "FUSEMOMO_API_KEY": "${FUSEMOMO_API_KEY}"
>       }
>     }
>   }
> }
> ```
> Replace `${FUSEMOMO_API_KEY}` with `$FUSEMOMO_API_KEY` on Linux/macOS if your client supports shell expansion in env values.



## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `FUSEMOMO_API_KEY` | ✅ | — | Your FuseMomo API key (`fm_live_...` or `fm_test_...`) |
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
→ { data_sufficient: true, confidence_score: 0.91, primary: { action_type: "send_email", raw_success_rate: 0.85, ... }, ... }
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

**Authentication failed / `FUSEMOMO_API_KEY` missing:**
The server could not read your API key from the environment.
1. Verify it is exported: `echo $FUSEMOMO_API_KEY` (should print your key)
2. Ensure you added it to your shell profile (`~/.zshrc`, `~/.bashrc`, etc.) and ran `source <file>` or opened a new terminal
3. If using Claude Desktop (which may strip shell environments), add the env pass-through in the config — see the note in the Installation section above
4. Key must start with `fm_live_` or `fm_test_`

**Recommendations return plan upgrade error:**
`get_recommendation` requires a Builder plan ($99/month). Upgrade at [fusemomo.com/upgrade](https://fusemomo.com/upgrade).

**Connection refused:**
Verify `FUSEMOMO_API_URL` is reachable. Default: `https://api.fusemomo.com`.

---

## License

MIT — see [LICENSE](./LICENSE)