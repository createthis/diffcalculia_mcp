import { McpServer, ReadResourceCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import * as http from "http";

async function main() {
  try {
    console.log("Initializing transport...");
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => Math.random().toString(36).substring(2)
    });
    console.log("Transport initialized:", !!transport);

    console.log("Creating MCP server...");
    const server = new McpServer({
      name: "File Editor",
      version: "1.0.0",
      transport
    });
    console.log("Server created:", !!server);

    console.log("Registering test endpoint...");
    const testCallback: ReadResourceCallback = async (params, context) => {
      console.log("Test endpoint called with params:", params);
      return {
        contents: [{
          uri: "test-endpoint",
          text: "Server is working",
          mimeType: "text/plain"
        }],
        _meta: { status: "success" }
      };
    };
    server.resource("test", "/test", testCallback);

    const httpServer = http.createServer(async (req, res) => {
      console.log(`\nIncoming request: ${req.method} ${req.url}`);
      try {
        if (req.url === '/direct-test') {
          res.end(JSON.stringify({ success: true }));
          return;
        }
        await transport.handleRequest(req, res);
      } catch (err) {
        console.error("Request failed:", err);
        res.statusCode = 500;
        res.end(JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal error"
          }
        }));
      }
    });

    const PORT = 3003;
    console.log(`Starting server on port ${PORT}`); // Added debug logging
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Initialization failed:", err);
    process.exit(1);
  }
}

main();
