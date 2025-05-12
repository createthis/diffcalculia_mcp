import path from "path";
import { promises as fs } from "fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { startTestServer } from "./helpers";

describe("create_file tool (e2e)", () => {
  const TEST_FILE = path.join(__dirname, "test-file.txt");
  const specialPath = path.join(__dirname, "test-äéñ$@.txt");
  const relativePath = "./relative-test-file.txt";
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
  });

  beforeEach(async () => {
    try { await fs.unlink(TEST_FILE); } catch {}
    try { await fs.unlink(specialPath); } catch {}
    try { await fs.unlink(relativePath); } catch {}
  });

  afterEach(async () => {
    try { await fs.unlink(TEST_FILE); } catch {}
    try { await fs.unlink(specialPath); } catch {}
    try { await fs.unlink(relativePath); } catch {}
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
    expect(result.content[0].text).toContain("EEXIST: file already exists");
  });

  it("fails if directory does not exist", async () => {
    const nestedPath = path.join(__dirname, "nested", "dir", "test-file.txt");
    const content = "nested content";
    const result = await client.callTool({
      name: "create_file",
      arguments: { path: nestedPath, content }
    });
    expect(result.content[0].text).toContain("ENOENT: no such file or directory");
  });

  it("creates file with empty content", async () => {
    const result = await client.callTool({
      name: "create_file",
      arguments: { path: TEST_FILE, content: "" }
    });
    expect(result.content[0].text).toContain(`File created: ${TEST_FILE}`);
    expect(await fs.readFile(TEST_FILE, "utf8")).toBe("");
  });

  it("handles special characters in path and content", async () => {
    const content = "special content: äéñ$@";
    const result = await client.callTool({
      name: "create_file",
      arguments: { path: specialPath, content }
    });
    expect(result.content[0].text).toContain(`File created: ${specialPath}`);
    expect(await fs.readFile(specialPath, "utf8")).toBe(content);
  });

  it("works with relative paths", async () => {
    const content = "relative path content";
    const result = await client.callTool({
      name: "create_file",
      arguments: { path: relativePath, content }
    });
    const absolutePath = path.resolve(relativePath);
    expect(result.content[0].text).toContain(`File created: ${relativePath}`);
    expect(await fs.readFile(absolutePath, "utf8")).toBe(content);
  });

  it("sets correct file permissions", async () => {
    await client.callTool({
      name: "create_file",
      arguments: { path: TEST_FILE, content: "permission test" }
    });
    const stats = await fs.stat(TEST_FILE);
    expect(stats.mode & 0o777).toBe(0o644); // Expect rw-r--r--
  });
});
