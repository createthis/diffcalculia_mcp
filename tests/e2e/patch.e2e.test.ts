import path from "path";
import { promises as fs } from "fs";
import { ChildProcess, spawn } from "child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

describe("patch e2e", () => {
  let client: Client;
  let serverProcess: ChildProcess;
  const FIX = path.resolve(__dirname, path.join("..", "fixtures"));
  const OUT = path.join(FIX, "out-e2e.txt");

  beforeAll(async () => {
    const serverScript = path.resolve(__dirname, path.join("..", "..", "diffcalculia-mcp.ts"));
    serverProcess = spawn("node", ["--import", "tsx/esm", serverScript]);

    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    client = new Client({ name: "diffcalculia-mcp-client", version: "1.0.0" });
    await client.connect(new StreamableHTTPClientTransport(new URL("http://localhost:3002/mcp")));
  });

  afterAll(async () => {
    await client.close();
    serverProcess.kill();
  });

  beforeEach(async () => {
    const original = await fs.readFile(path.join(FIX, "original.txt"), "utf8");
    await fs.writeFile(OUT, original, "utf8");
  });

  it("applies a well-formed diff", async () => {
    const patch = await fs.readFile(path.join(FIX, "change.diff"), "utf8");
    const res = await client.callTool({
      name: "patch",
      arguments: { diff: patch, path: OUT }
    });
    const expected = await fs.readFile(path.join(FIX, "expected.txt"), "utf8");
    expect(res.content[0].text).toBe(expected);
    expect(await fs.readFile(OUT, "utf8")).toBe(expected);
  });

  it("throws on malformed diff", async () => {
    const result = await client.callTool({ name: "patch", arguments: { diff: "not a diff", path: OUT } });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe('Need minimum 4 lines, got 1');
  });
});
