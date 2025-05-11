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

To use this with Open Hands AI under Docker:

1. First, build your docker container and run it (see instructions above). It is important that your
   `WORKSPACE_BASE` for this MCP server matches the `WORKSPACE_BASE` you are using with Open Hands AI.
2. Create `~/.openhands/config.toml`:

   ```bash
   mkdir ~/.openhands
   vim ~/.openhands/config.toml
   ```

   It should look like this:

   ```toml
   [mcp]
   # SSE Servers - External servers that communicate via Server-Sent Events
   sse_servers = [
     "http://host.docker.internal:3002/sse",
   ]
   ```

   Note the `/sse` postfix. This is the legacy SSE api. I couldn't get it working with the more modern
   `/mcp` streamable API. `3002` is the port of your MCP server that Open Hands will connect to.

2. Start your Open Hands AI docker. Add this command:

   ```bash
       -v ~/.openhands/config.toml:/app/config.toml \
   ```

   This mounts your `~/.openhands/config.toml` inside the docker container at `/app/config.toml`.

   My full example command looks like this:

   ```bash
   docker run -it --rm   \
    -p 3001:3000   \
    -e SANDBOX_USER_ID=$(id -u) \
    -e WORKSPACE_MOUNT_PATH=$WORKSPACE_BASE \
    -v $WORKSPACE_BASE:/opt/workspace_base \
    -e AGENT_ENABLE_EDITOR=false \
    -e AGENT_ENABLE_PROMPT_EXTENSIONS=false \
    -e LOG_ALL_EVENTS=true \
    -v ~/.openhands-state:/.openhands-state \
    -v ~/.openhands/config.toml:/app/config.toml \
    -v /var/run/docker.sock:/var/run/docker.sock   \
    --add-host host.docker.internal:host-gateway  \
    -e SANDBOX_RUNTIME_CONTAINER_IMAGE=docker.all-hands.dev/all-hands-ai/runtime:e26ca14-nikolaik   \
    --name openhands-app-e26ca14   \
    docker.all-hands.dev/all-hands-ai/openhands:e26ca14
   ```
3. Navigate to open hands in your browser and start a chat. Back in the terminal, you should see:

   ```
   19:55:11 - openhands:INFO: base.py:344 - In workspace mount mode, not initializing a new git repository.
   19:55:11 - openhands:INFO: utils.py:52 - Initializing MCP agent for url='http://host.docker.internal:3002/sse' api_key='******' with SSE connection...
   19:55:11 - openhands:INFO: client.py:90 - Connected to server with tools: ['patch', 'read_file']
   ```

   If you click the three vertical dots in the lower right next to `Conversation` then click `Show Agent Tools & Metadata`
   you should see the `patch` and `read_file` tools.


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
