import path from "path";
import { promises as fs } from "fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { startTestServer } from "./helpers";

describe("create_file tool (e2e)", () => {
  const TEST_FILE = path.join(__dirname, "test-file.txt");
  let client: Client;
  let serverProcess: ChildProcess;

  beforeAll(async () => {
    ({ client, serverProcess } = await startTestServer(
      path.resolve(__dirname, path.join("..", "..", "diffcalculia-mcp.ts"))
    ));
  });

  afterAll(async () => {
    await client.close();
    serverProcess.kill();
    try { await fs.unlink(TEST_FILE); } catch {}
  });

  it("creates new file with content", async () => {
    const content = "test content";
    const result = await client.callTool({
      name: "create_file",
      arguments: { path: TEST_FILE, content }
    });
    expect(result.content[0].text).toContain(`File created: ${TEST_FILE}`);
    expect(await fs.readFile(TEST_FILE, "utf8")).toBe(content);
  });

  it("fails if file exists", async () => {
    await fs.writeFile(TEST_FILE, "existing");
    const result = await client.callTool({
      name: "create_file",
      arguments: { path: TEST_FILE, content: "new content" }
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("File creation failed");
  });

  it("creates parent directories if needed", async () => {
    const nestedPath = path.join(__dirname, "nested", "dir", "test-file.txt");
    const content = "nested content";
    const result = await client.callTool({
      name: "create_file",
      arguments: { path: nestedPath, content }
    });
    expect(result.content[0].text).toContain(`File created: ${nestedPath}`);
    expect(await fs.readFile(nestedPath, "utf8")).toBe(content);
  });
});