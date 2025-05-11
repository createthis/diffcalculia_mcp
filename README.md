# diffcalculia MCP server

A Model Context Protocol (MCP) server is a server AIs can use to extend their capabilities.
You can read about them here: https://modelcontextprotocol.io/

This particular server is written in Typescript and provides a tool the AI can use to edit
local files by passing a path and a diff in unified diff format. It uses https://github.com/createthis/diffcalculia-ts
internally to fix diffs before applying them using https://github.com/kpdecker/jsdiff.

**WARNING: This is pre-Alpha software. It is basically just a playground for an idea at this
point and is subject to change. IT WILL PROBABLY OVERWRITE YOUR FILESYSTEM AND BREAK YOUR
MACHINE. Seriously. DO NOT USE. Very very unsafe.**

This server is currently implemented using the StreamableHttp tranport layer. It starts on port 3002.


# Installation

1. Install dependencies:
```bash
npm install
```

# Running the Server

Start the server:
```bash
npm run dev
```

# Tests

First, make sure the server isn't running. Then:

```bash
npm test
```
