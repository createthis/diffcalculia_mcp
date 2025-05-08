import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import path from "path";
import http from "http";
import { applyPatch } from "diffcalculia-ts";
import fs from "fs";

const SANDBOX_DIR = path.resolve('/workspace/sandbox');
const server = new McpServer({
  name: "Sandboxed File Editor",
  version: "1.0.0"
}) as McpServer & {
  registerResource: (resource: {
    name: string;
    actions: Record<string, any>;
  }) => void;
};

// Ensure sandbox directory exists
fs.mkdirSync(SANDBOX_DIR, { recursive: true });

const FileEditRequest = z.object({
  path: z.string().regex(/^[a-zA-Z0-9_\-./]+$/),
  diff: z.string()
});

function validatePath(userPath: string): string {
  const requestedPath = path.normalize(userPath);
  const absolutePath = path.join(SANDBOX_DIR, requestedPath);

  if (!absolutePath.startsWith(SANDBOX_DIR)) {
    throw new Error("Path traversal attempt detected");
  }

  return absolutePath;
}

server.registerResource({
  name: "file",
  actions: {
    edit: {
      request: FileEditRequest,
      handler: async (req: { path: string; diff: string }) => {
        try {
          const absolutePath = validatePath(req.path);

          try {
            await fs.promises.access(absolutePath, fs.constants.W_OK);
          } catch (err) {
            return {
              status: "error",
              message: "File not found or not writable",
              details: `Path must be within sandbox (${SANDBOX_DIR})`
            };
          }

          try {
            const fileContent = await fs.promises.readFile(absolutePath, 'utf-8');
            const patchedContent = applyPatch(fileContent, req.diff);
            await fs.promises.writeFile(absolutePath, patchedContent);
            return { status: "success" };
          } catch (err: any) {
            console.error("Patch failed:", err);
            return {
              status: "error",
              message: "Invalid diff or patch failed",
              details: err.message
            };
          }
        } catch (err: any) {
          return {
            status: "error",
            message: "Invalid path",
            details: err.message
          };
        }
      }
    }
  }
});

const transport = new StreamableHTTPServerTransport(server);

// Configure session ID generation if needed
transport.sessionIdGenerator = () => Math.random().toString(36).substring(2);

const httpServer = http.createServer((req, res) => {
  transport.handleRequest(req, res);
});

httpServer.listen(3000, () => {
  console.log(`Sandboxed MCP File Server running on port 3000`);
  console.log(`Sandbox directory: ${SANDBOX_DIR}`);
});
