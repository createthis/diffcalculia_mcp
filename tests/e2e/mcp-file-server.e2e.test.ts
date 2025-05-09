// tests/e2e/mcp-file-server.e2e.ts
import path from "path";
import { promises as fs } from "fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

describe("mcp-file-server e2e", () => {
  let client: Client;
  const FIX = path.resolve(__dirname, path.join("..", "fixtures"));
  const OUT = path.join(FIX, "out-e2e.txt");

  beforeAll(async () => {
    const serverScript = path.resolve(__dirname, "../../mcp-file-server.ts");
    const transport = new StdioClientTransport({
      command: "node",
      args: ["--import", "tsx/esm", serverScript],
    });
    client = new Client({ name: "file-server-client", version: "1.0.0" });
    await client.connect(transport);  // :contentReference[oaicite:0]{index=0}
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    const original = await fs.readFile(path.join(FIX, "original.txt"), "utf8");
    await fs.writeFile(OUT, original, "utf8");
  });

  it("applies a well-formed diff", async () => {
    const patch = await fs.readFile(path.join(FIX, "change.diff"), "utf8");
    const res = await client.callTool({ 
      name: "diffcalculia", 
      arguments: { diff: patch, path: OUT }  // :contentReference[oaicite:1]{index=1}
    });
    const expected = await fs.readFile(path.join(FIX, "expected.txt"), "utf8");
    expect(res.content[0].text).toBe(expected);
    expect(await fs.readFile(OUT, "utf8")).toBe(expected);
  });

  it("throws on malformed diff", async () => {
    const result = await client.callTool({ name: "diffcalculia", arguments: { diff: "not a diff", path: OUT } });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe('Need minimum 4 lines, got 1');
  });
});
