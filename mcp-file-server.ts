// mcp-file-server.ts
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import express = require("express");
import { validatePatch } from "diffcalculia-ts";
import { applyPatch } from "diff";
import { promises as fs } from "fs";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js"


export async function patch(patch: string, filePath: string): Promise<string> {
  // validate & auto-fix headers
  const fixed = validatePatch(patch, true);
  // load original
  const original = await fs.readFile(filePath, "utf8");
  // apply unified diff
  const result = applyPatch(original, fixed);
  if (result === false) throw new Error("Failed to apply patch");
  await fs.writeFile(filePath, result, "utf8");
  return result;
}


export async function readFileWithLines(
  filePath: string,
  lineNumber?: number,
  linesBefore?: number,
  linesAfter?: number
): Promise<string> {
  const content = await fs.readFile(filePath, "utf8");
  if (content === "") {
    return "";
  }
  const lines = content.split('\n');

  if (typeof lineNumber === 'undefined') {
    // Return all lines with numbering
    const maxDigits = String(lines.length).length;
    return lines.map((line, i) =>
      `${String(i+1).padStart(maxDigits)}|${line}`
    ).join('\n');
  }

  // Calculate line range
  const start = Math.max(0, lineNumber - 1 - (linesBefore || 0));
  const end = Math.min(lines.length, lineNumber + (linesAfter || 0));
  const selectedLines = lines.slice(start, end);

  const maxDigits = String(end).length;
  return selectedLines.map((line, i) =>
    `${String(start + i + 1).padStart(maxDigits)}|${line}`
  ).join('\n');
}

const app = express();
app.use(express.json());

// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// Handle POST requests for client-to-server communication
app.post('/mcp', async (req, res) => {
  // Check for existing session ID
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    // Reuse existing transport
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // New initialization request
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        // Store the transport by session ID
        transports[sessionId] = transport;
      }
    });

    // Clean up transport when closed
    transport.onclose = () => {
      if (transport.sessionId) {
        delete transports[transport.sessionId];
      }
    };
    const server = new McpServer({
      name: "diffcalculia-mcp",
      version: "1.0.0"
    });

    server.tool(
      "patch",
      "This tool allows you to edit files. Give it a file path and a unified diff and it will edit the file for you.",
      { diff: z.string(), path: z.string() },
      async ({ diff, path }) => {
        const newContents = await patch(diff, path);
        return { content: [{ type: "text", text: newContents }] };
      }
    );

    server.tool(
      "read_file",
      "Reads a file with line numbers. Optionally specify line_number with lines_before/after.",
      { path: z.string(), line_number: z.number().optional(), lines_before: z.number().optional(), lines_after: z.number().optional() },
      async ({ path, line_number, lines_before, lines_after }) => {
        return { content: [{ type: "text", text: await readFileWithLines(path, line_number, lines_before, lines_after) }] };
      }
    );

    // Connect to the MCP server
    await server.connect(transport);
  } else {
    // Invalid request
    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Bad Request: No valid session ID provided',
      },
      id: null,
    });
    return;
  }

  // Handle the request
  await transport.handleRequest(req, res, req.body);
});

// Reusable handler for GET and DELETE requests
const handleSessionRequest = async (req: express.Request, res: express.Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  
  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};

// Handle GET requests for server-to-client notifications via SSE
app.get('/mcp', handleSessionRequest);

// Handle DELETE requests for session termination
app.delete('/mcp', handleSessionRequest);

const port = 3002;
if (require.main === module) {
  app.listen(port, (error) => {
    if (error) return console.log(error);
    console.log('listening on port', port);
  });
}
