package main

import (
	"context"
	"log"
	"mcpserver/internal/server"
	"os/signal"
	"syscall"

	_ "github.com/joho/godotenv/autoload"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func main() {
	// Create context that listens for interrupt signals
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	// Create and configure the MCP server
	mcpServer := server.New()

	// Create stdio transport - this is the standard transport for MCP servers
	// MCP servers communicate via stdin/stdout, not HTTP
	transport := &mcp.StdioTransport{}

	log.Println("Starting MCP server on stdio...")

	// Run the server - this will block until the context is cancelled or an error occurs
	if err := mcpServer.Run(ctx, transport); err != nil {
		log.Fatalf("MCP server error: %v", err)
	}

	log.Println("MCP server shutdown complete")
}
