# MCP File Server

A Model Context Protocol (MCP) server for safe file editing using diffs and patch operations.

## Installation

1. Install dependencies:
```bash
python3 -m venv my_venv
source my_venv/bin/activate
python3 -m pip install --force-reinstall git+https://github.com/createthis/diffcalculia.git
npm install @modelcontextprotocol/sdk zod
```

## Running the Server

Start the server:
```bash
node mcp-file-server.ts
```

The server will start on port 3000.

## API Endpoints

### Edit a File
`POST /file/edit`

Request format:
```json
{
  "path": "/path/to/file",
  "diff": "--- original\n+++ modified\n@@ -1,3 +1,3 @@\n old line 1\n-old line 2\n+new line 2\n old line 3"
}
```

Successful response:
```json
{
  "status": "success"
}
```

Error responses may include:
```json
{
  "status": "error",
  "message": "File not found or not writable",
  "details": "..."
}
```

## Example Usage

1. First, start the server as shown above
2. Then send a request to edit a file:
```bash
curl -X POST http://localhost:3000/file/edit \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/workspace/example.txt",
    "diff": "--- original\n+++ modified\n@@ -1 +1 @@\n-old content\n+new content"
  }'
```

## Security Notes

- The server will only edit files that the process has write permissions for
- All diffs are validated and fixed using diffcalculia before application
- The server runs on localhost by default (not exposed to network)

