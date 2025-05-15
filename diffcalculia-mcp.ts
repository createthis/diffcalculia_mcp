import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import express = require("express");
import { validatePatch } from "diffcalculia-ts";
import { applyPatch } from "diff";
import { promises as fs } from "fs";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import chalk from 'chalk';

const { greenBright:gb, yellow, red, green, white } = chalk;

export const colorizeDiff=(d:string)=>
 d.split('\n').map(l=>
  l.startsWith('---')||l.startsWith('+++')?gb(l):
  l.startsWith('@@')?yellow(l):
  l.startsWith('-')?red(l):
  l.startsWith('+')?green(l):
  white(l)
 ).join('\n');

export const strongSeparator = chalk.magenta("===================================================");
export const weakSeparator = chalk.blue("---------------------------------------------------");

export function compareLine(lineNumber: number, line: string, operation: string, patchContent: string): boolean {
  // Normalize whitespace sequences to single space for comparison
  // This is similar to Mac/Darwin patch --ignore-whitespace
  const normalize = (s: string) => s.replace(/\s+/g, ' ');
  return normalize(line) === normalize(patchContent);
}

export async function patch(patch: string, filePath: string, verbose = false): Promise<string> {
  if (verbose) {
    console.log("\n\npatch filePath=", filePath);
    console.log(strongSeparator);
    console.log("\npatch");
    console.log(weakSeparator);
    console.log(colorizeDiff(patch));
    console.log(weakSeparator);
  }
  // validate & auto-fix headers
  const fixed = validatePatch(patch, true);
  let output = '';
  if (patch !== fixed) output += "Let me fix that for you\n";
  output += fixed;

  if (verbose) {
    if (patch !== fixed) {
      console.log("\noutput");
      console.log(weakSeparator);
      console.log(colorizeDiff(output));
      console.log(weakSeparator);
    }
  }

  const original = await fs.readFile(filePath, "utf8");
  const result = applyPatch(original, fixed, {
    autoConvertLineEndings: true,
    compareLine,
  });
  if (result === false) {
    const message = 'Failed to apply patch';
    if (verbose) {
      console.log("\nresult");
      console.log(weakSeparator);
      console.log("result=", result, ', message=', message);
      console.log(weakSeparator);
      console.log(strongSeparator);
      console.log("fail");
    }
    throw new Error(message);
  }
  if (verbose) {
    console.log(strongSeparator);
    console.log("success");
  }
  await fs.writeFile(filePath, result, "utf8");
  return output;
}

export async function createFile(path: string, content: string): Promise<string> {
  return fs.writeFile(path, content, { flag: "wx" }); // wx flag fails if exists
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
    const maxDigits = String(lines.length).length;
    const numberedLines = lines.map((line, i) =>
      i < lines.length - 1 || line !== '' // Skip numbering blank last line
        ? `${String(i+1).padStart(maxDigits)}|${line}`
        : line
    );
    return numberedLines.join('\n');
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

const server = new McpServer({
  name: "diffcalculia-mcp",
  version: "1.0.0"
});

server.tool(
  "patch",
  `This tool allows you to edit files. Give it a file path and a unified diff and it will edit the file for you.
The output of this tool is the diff that was applied. If the diff was modified, it will contain "Let me fix that for you".
This is your preferred file editing tool because it works well with long files and files that contain duplicate lines.
The context feature of the unified diff format prevents unintentional changes and allows precision edits.`,
  { diff: z.string(), path: z.string() },
  async ({ diff, path }) => {
    const verbose = process.argv.includes('--verbose');
    const newContents = await patch(diff, path, verbose);
    const response = { content: [{ type: "text", text: newContents }] };
    return response;
  }
);

server.tool(
  "read_file",
  `Reads a file with line numbers. For each line of output, the line number appears first, immediately
followed by a | character, immediately followed by the actual line's content.

Optionally specify line_number with lines_before/after.

This is your preferred tool for viewing the content of files because it provides line numbers. Line 
numbers are critical for crafting precision edits and unified diffs.

Don't forget to remove the line number and the | character when crafting unified diffs!`,
  { 
    path: z.string(),
    line_number: z.string().optional(),
    lines_before: z.string().optional(),
    lines_after: z.string().optional()
  },
  async ({ path, line_number, lines_before, lines_after }) => {
    let line_number_int;
    let lines_before_int;
    let lines_after_int;
    if (line_number) line_number_int = parseInt(line_number);
    if (lines_before) lines_before_int = parseInt(lines_before);
    if (lines_after) lines_after_int = parseInt(lines_after);
    return { content: [{ type: "text", text: await readFileWithLines(
      path,
      line_number_int,
      lines_before_int,
      lines_after_int
    ) }] };
  }
);

server.tool(
  "create_file",
  `Creates a new file with the specified content. Fails if file already exists.
  Arguments:
  - path: string - file path to create
  - content: string - file content`,
  { path: z.string(), content: z.string() },
  async ({ path, content }) => {
    await createFile(path, content);
    return { content: [{ type: "text", text: `File created: ${path}` }] };
  }
);
 
const app = express();
app.use(express.json());

const transports = {
  streamable: {} as Record<string, StreamableHTTPServerTransport>,
  sse: {} as Record<string, SSEServerTransport>
};

// Handle POST requests for client-to-server communication
app.all('/mcp', async (req, res) => {
  // Check for existing session ID
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports.streamable[sessionId]) {
    // Reuse existing transport
    transport = transports.streamable[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // New initialization request
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        // Store the transport by session ID
        transports.streamable[sessionId] = transport;
      }
    });

    // Clean up transport when closed
    transport.onclose = () => {
      if (transport.sessionId) {
        delete transports.streamable[transport.sessionId];
      }
    };

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

// Legacy SSE endpoint for older clients
app.get('/sse', async (req, res) => {
  // Create SSE transport for legacy clients
  const transport = new SSEServerTransport('/messages', res);
  transports.sse[transport.sessionId] = transport;

  res.on("close", () => {
    delete transports.sse[transport.sessionId];
  });

  await server.connect(transport);
});

// Legacy message endpoint for older clients
app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.sse[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res, req.body);
  } else {
    res.status(400).send('No transport found for sessionId');
  }
});

// Reusable handler for GET and DELETE requests
const handleSessionRequest = async (req: express.Request, res: express.Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports.streamable[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  
  const transport = transports.streamable[sessionId];
  await transport.handleRequest(req, res);
};

// Handle GET requests for server-to-client notifications via SSE
app.get('/mcp', handleSessionRequest);

// Handle DELETE requests for session termination
app.delete('/mcp', handleSessionRequest);

const port = process.argv.includes('--port') 
  ? parseInt(process.argv[process.argv.indexOf('--port') + 1]) 
  : 3002;
if (require.main === module) {
  app.listen(port, (error) => {
    if (error) return console.log(error);
    console.log('listening on port', port);
  });
}

