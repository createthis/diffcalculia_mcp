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

# Build docker image

First, install Docker Desktop. Then:

```bash
npm run build-docker
```

# Run the server under docker

Running `diffcalculia-mcp` under docker gives you the ability to isolate the changes 
your AI can make to just one directory on your machine. This is HIGHLY RECOMMENDED!

```bash
export WORKSPACE_BASE=/path/to/directory/you/want/AI/to/modify
docker run -it --rm \
  -p 3002:3002 \
  -v $WORKSPACE_BASE:/workspace \
  -e SANDBOX_USER_ID=$(id -u) \
  diffcalculia-mcp
```


# Open Hands AI

So... how do you use this with Open Hands AI under Docker?

That's the neat part: You don't!

https://github.com/All-Hands-AI/OpenHands/issues/8435


# Running the server without docker (Not recommended! Dangerous!)

WARNING: If you do this your AI has the ability to modify anything on your machine that
you have the ability to modify! This is super dangerous! STRONGLY recommend using docker 
method above, instead.

```bash
npm run dev
```

# Tests

First, make sure the server isn't running. Then:

```bash
npm test
```
