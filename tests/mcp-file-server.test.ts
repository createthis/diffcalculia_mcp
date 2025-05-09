import { Server } from 'http';
import request from 'supertest';
import fs from 'fs/promises';
import path from 'path';
import { createMcpServer } from '../mcp-file-server';

describe('MCP File Server', () => {
  let server: Server;

  beforeAll(async () => {
    server = await createMcpServer();
    await fs.mkdir(path.join(process.cwd(), 'sandbox'), { recursive: true });
  });

  afterAll(async () => {
    await server.close();
  });

  test('applies diff via MCP endpoint', async () => {
    const testFile = 'test-file.txt';
    const filePath = path.join('sandbox', testFile);
    await fs.writeFile(filePath, 'Initial content\nline 2\nline 3');

    const requestBody = {
      jsonrpc: '2.0',
      method: 'file.edit',
      id: 1,
      params: {
        path: testFile,
        diff: `--- ${testFile}
+++ ${testFile}
@@ -1,3 +1,4 @@
 Initial content
+New inserted line
 line 2
 line 3`
      }
    };

    console.log('Sending request:', JSON.stringify(requestBody, null, 2));
    const response = await request(server)
      .post('/')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json, text/event-stream')
      .send(requestBody);

    console.log('Response status:', response.status);
    console.log('Response body:', response.body);

    if (response.status !== 200) {
      console.log('Error details:', {
        status: response.status,
        text: response.text,
        headers: response.headers
      });
    }

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      jsonrpc: '2.0',
      id: 1,
      result: { status: "success" }
    });

    const updatedContent = await fs.readFile(filePath, 'utf-8');
    expect(updatedContent).toBe('Initial content\nNew inserted line\nline 2\nline 3');
  });
});
