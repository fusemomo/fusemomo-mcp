package server

import (
	"context"
	"fmt"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// MCPServer wraps the MCP server instance
type MCPServer struct {
	*mcp.Server
}

// GreetInput defines the input schema for the greet tool
type GreetInput struct {
	Name string `json:"name" jsonschema:"The name of the person to greet"`
}

// GreetOutput defines the output schema for the greet tool
type GreetOutput struct {
	Greeting string `json:"greeting" jsonschema:"The greeting message"`
}

// GreetHandler is an example tool handler that greets a person
func GreetHandler(ctx context.Context, req *mcp.CallToolRequest, input GreetInput) (
	*mcp.CallToolResult, GreetOutput, error,
) {
	greeting := fmt.Sprintf("Hello, %s! Welcome to your MCP server.", input.Name)
	return nil, GreetOutput{Greeting: greeting}, nil
}

// New creates and configures a new MCP server
func New() *MCPServer {
	// Create MCP server with implementation details
	impl := &mcp.Implementation{
		Name:    "mcpserver",
		Version: "v1.0.0",
	}

	server := mcp.NewServer(impl, nil)

	// Add example tool - you can add more tools, resources, and prompts here
	mcp.AddTool(server, &mcp.Tool{
		Name:        "greet",
		Description: "Greets a person by name",
	}, GreetHandler)

	return &MCPServer{
		Server: server,
	}
}

// Run starts the MCP server with the given transport
func (s *MCPServer) Run(ctx context.Context, transport mcp.Transport) error {
	return s.Server.Run(ctx, transport)
}
