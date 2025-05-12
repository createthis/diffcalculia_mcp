import path from "path";
import { ChildProcess, spawn } from "child_process";
import net from "net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

export async function startTestServer(serverScript: string): Promise<{
  client: Client;
  serverProcess: ChildProcess;
  port: number;
}> {
  let port: number;
  let serverProcess: ChildProcess;
  let attempts = 0;

  // Try to find an available port
  while (attempts < 10) {
    port = 3002 + Math.floor(Math.random() * 1000);
    
    const isAvailable = await new Promise((resolve) => {
      const tester = net.createServer()
        .once('error', () => resolve(false))
        .once('listening', () => {
          tester.close(() => resolve(true));
        })
        .listen(port);
    });

    if (isAvailable) {
      break;
    }
    attempts++;
  }

  if (attempts >= 10) {
    throw new Error("Could not find available port after 10 attempts");
  }

  serverProcess = spawn("node", ["--import", "tsx/esm", serverScript, "--port", port.toString()]);

  // Wait for "listening" message
  await new Promise<void>((resolve) => {
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('listening on port')) {
        resolve();
      }
    });
  });

  const client = new Client({ name: "diffcalculia-mcp-client", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/mcp`)));

  return { client, serverProcess, port };
}

export async function startTestServerSSE(serverScript: string): Promise<{
  client: Client;
  serverProcess: ChildProcess;
  port: number;
}> {
  const { serverProcess, port } = await startTestServer(serverScript);
  const client = new Client({ name: "diffcalculia-mcp-client", version: "1.0.0" });
  await client.connect(new SSEClientTransport(new URL(`http://localhost:${port}/sse`)));
  return { client, serverProcess, port };
}