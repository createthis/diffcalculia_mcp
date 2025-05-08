import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { execSync } from "child_process";
import path from "path";
import http from "http";
import fs from "fs";

const server = new McpServer({
  name: "File Editor",
  version: "1.0.0"
});

const FileEditRequest = z.object({
  path: z.string(),
  diff: z.string()
});

server.registerResource({
  name: "file",
  actions: {
    edit: {
      request: FileEditRequest,
      handler: async (req) => {
        const { path: filePath, diff } = req;
        const absolutePath = path.resolve(filePath);
        
        // Validate the file exists and is writable
        try {
          await fs.promises.access(absolutePath, fs.constants.W_OK);
        } catch (err) {
          return {
            status: "error",
            message: "File not found or not writable",
            details: err.message
          };
        }

        // Validate and fix the diff using diffcalculia
        try {
          const result = execSync(
            `echo "${diff.replace(/"/g, '\\"')}" | diffcalculia --fix`,
            { encoding: 'utf-8' }
          );

          // Apply the validated diff
          execSync(
            `echo "${result.replace(/"/g, '\\"')}" | patch -p0 --ignore-whitespace --verbose -r- --no-backup-if-mismatch "${absolutePath}"`,
            { stdio: 'inherit' }
          );

          return { status: "success" };
        } catch (err) {
          return {
            status: "error",
            message: "Invalid diff or patch failed",
            details: err.message
          };
        }
      }
    }
  }
});

const httpServer = http.createServer(StreamableHTTPServerTransport(server));
httpServer.listen(3000, () => {
  console.log("MCP File Server running on port 3000");
});
