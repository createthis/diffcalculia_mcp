// mcp-file-server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { validatePatch } from "diffcalculia-ts";
import { applyPatch } from "diff";
import { promises as fs } from "fs";

export async function applyDiffCalculia(patch: string, filePath: string): Promise<string> {
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

const server = new McpServer({ name: "file-server", version: "1.0.0" });

server.tool(
  "diffcalculia",
  "This tool allows you to edit files. Give it a file path and a unified diff and it will edit the file for you.",
  { diff: z.string(), path: z.string() },
  async ({ diff, path }) => {
    const newContents = await applyDiffCalculia(diff, path);
    return { content: [{ type: "text", text: newContents }] };
  }
);

if (require.main === module) {
  const transport = new StdioServerTransport();
  server.connect(transport);
}
