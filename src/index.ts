import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { config } from './config.js';
import { logger } from './utils/logger.js';
import {
    ResolveEntitySchema,
    LogInteractionSchema,
    GetRecommendationSchema,
    UpdateOutcomeSchema,
    GetEntitySchema,
} from './schemas/tools.js';
import { resolveEntityToolDef, handleResolveEntity } from './tools/resolve-entity.js';
import { logInteractionToolDef, handleLogInteraction } from './tools/log-interaction.js';
import { getRecommendationToolDef, handleGetRecommendation } from './tools/get-recommendation.js';
import { updateOutcomeToolDef, handleUpdateOutcome } from './tools/update-outcome.js';
import { getEntityToolDef, handleGetEntity } from './tools/get-entity.js';

//  mcpserver 
const server = new McpServer({
    name: 'fusemomo-mcp',
    version: '1.0.0',
});

//  Tool Registration 
// McpServer.tool() handles ListTools + CallTool routing automatically.

server.tool(
    resolveEntityToolDef.name,
    resolveEntityToolDef.description,
    ResolveEntitySchema.shape,
    async (args) => handleResolveEntity(args),
);

server.tool(
    logInteractionToolDef.name,
    logInteractionToolDef.description,
    LogInteractionSchema.shape,
    async (args) => handleLogInteraction(args),
);

server.tool(
    getRecommendationToolDef.name,
    getRecommendationToolDef.description,
    GetRecommendationSchema.shape,
    async (args) => handleGetRecommendation(args),
);

server.tool(
    updateOutcomeToolDef.name,
    updateOutcomeToolDef.description,
    UpdateOutcomeSchema.shape,
    async (args) => handleUpdateOutcome(args),
);

server.tool(
    getEntityToolDef.name,
    getEntityToolDef.description,
    GetEntitySchema.shape,
    async (args) => handleGetEntity(args),
);

//  Transport + Connect 

async function main() {
    logger.info('Fusemomo MCP Server starting', {
        api_url: config.apiUrl,
        api_key: '***',
        timeout: config.timeout,
        log_level: config.logLevel,
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);

    process.stderr.write('Fusemomo MCP Server running on stdio\n');
}

//  Graceful Shutdown 

process.on('SIGINT', async () => {
    logger.info('Shutting down Fusemomo MCP Server...');
    await server.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down...');
    await server.close();
    process.exit(0);
});

main().catch((err) => {
    process.stderr.write(
        `Fatal error: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
});
