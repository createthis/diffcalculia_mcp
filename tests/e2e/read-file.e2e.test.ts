import { promises as fs } from "fs";
import path from "path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp";
import { ChildProcess, spawn } from "child_process";
import { startTestServer } from "./helpers";

describe("read_file tool (e2e)", () => {
  const FIXTURES = path.resolve(__dirname, path.join("..", "fixtures"));
  const SAMPLE_FILE = path.join(FIXTURES, "sample.txt");
  const TRAILING_NEWLINE_FILE = path.join(FIXTURES, "original.txt");
  
  let client: Client;
  let serverProcess: ChildProcess;
  let testUrl: string;

  beforeAll(async () => {
    const { client: c, serverProcess: sp, port } = await startTestServer(path.resolve(__dirname, path.join("..", "..", "diffcalculia-mcp.ts")));
    client = c;
    serverProcess = sp;
    testUrl = `http://localhost:${port}/mcp`;
    await fs.writeFile(SAMPLE_FILE, "line1\nline2\nline3\nline4\nline5", "utf8");
  });

  afterAll(async () => {
    await client.close();
    serverProcess.kill();
  });

  it("reads entire file without trailing newline with correct formatting", async () => {
    const result = await client.callTool({
      name: "read_file",
      arguments: { path: TRAILING_NEWLINE_FILE }
    });
    expect(result.content[0].text).toBe(
      "1|test\n2|two\n3|three\n4|four\n"
    );
  });

  it("reads entire file with trailing newline with correct formatting", async () => {
    const result = await client.callTool({
      name: "read_file",
      arguments: { path: SAMPLE_FILE }
    });
    expect(result.content[0].text).toBe(
      "1|line1\n2|line2\n3|line3\n4|line4\n5|line5"
    );
  });

  it("selects line range correctly", async () => {
    const result = await client.callTool({
      name: "read_file",
      arguments: { 
        path: SAMPLE_FILE,
        line_number: "3",
        lines_before: "1",
        lines_after: "1"
      }
    });
    expect(result.content[0].text).toBe("2|line2\n3|line3\n4|line4");
  });

  it("handles non-existent files with error", async () => {
    const result = await client.callTool({
      name: "read_file",
      arguments: { path: "/nonexistent/file" }
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/ENOENT/);
  });

  it("formats line numbers with correct padding", async () => {
    const bigFile = path.join(FIXTURES, "big.txt");
    await fs.writeFile(bigFile, Array(15).fill(0).map((_,i) => `line${i+1}`).join("\n"));
    const result = await client.callTool({
      name: "read_file",
      arguments: { path: bigFile }
    });
    const lines = result.content[0].text.split("\n");
    expect(lines[0]).toBe(" 1|line1");
    expect(lines[9]).toBe("10|line10");
  });
});
