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

None of this works before `0.37` and `0.38` hasn't been released yet as of this writing on May 11th 2025.

To use this with Open Hands AI under Docker:

1. First, build your docker container and run it (see instructions above). It is important that your
   `WORKSPACE_BASE` for this MCP server matches the `WORKSPACE_BASE` you are using with Open Hands AI.
2. You may need to delete your settings file and start fresh. The new version of Open Hands has an
   MCP settings editor UI, but it doesn't seem to like old settings files.

   The settings file lives here: `~/.openhands-state/settings.json`.
3. Start your Open Hands AI docker. My full example command looks like this:

   ```bash
   export WORKSPACE_BASE=/path/to/directory/you/want/AI/to/modify
   docker run -it --rm   \
    -p 3001:3000   \
    -e SANDBOX_USER_ID=$(id -u) \
    -e WORKSPACE_MOUNT_PATH=$WORKSPACE_BASE \
    -v $WORKSPACE_BASE:/opt/workspace_base \
    -e AGENT_ENABLE_PROMPT_EXTENSIONS=false \
    -e LOG_ALL_EVENTS=true \
    -e LLM_NATIVE_TOOL_CALLING=false \
    -v ~/.openhands-state:/.openhands-state \
    -v /var/run/docker.sock:/var/run/docker.sock   \
    --add-host host.docker.internal:host-gateway  \
    -e SANDBOX_RUNTIME_CONTAINER_IMAGE=docker.all-hands.dev/all-hands-ai/runtime:a7cec86-nikolaik   \
    --name openhands-app-a7cec86   \
    docker.all-hands.dev/all-hands-ai/openhands:a7cec86
   ```

   Eventually we will be able to add:

   ```
    -e AGENT_ENABLE_EDITOR=false \
   ```

   But not until this is merged: https://github.com/All-Hands-AI/OpenHands/issues/8304

4. Navigate to open hands in your browser. Setup your MCP server using the Settings UI. The URL should be:

   ```
   http://host.docker.internal:3002/sse
   ```

   Note the `/sse` postfix. This is the legacy SSE api. I couldn't get it working with the more modern
   `/mcp` streamable API. `3002` is the port of your MCP server that Open Hands will connect to.

   If you're having trouble with this, here's my `settings.json`, pretty printed using `jq . ~/.openhands-state/settings.json`,
   for reference:

   ```json
   {
     "language": "en",
     "agent": "CodeActAgent",
     "max_iterations": null,
     "security_analyzer": null,
     "confirmation_mode": false,
     "llm_model": "deepseek/Deepseek-V3-0324",
     "llm_api_key": "larry",
     "llm_base_url": "http://larry:11434/v1",
     "remote_runtime_resource_factor": 1,
     "secrets_store": {
       "provider_tokens": {}
     },
     "enable_default_condenser": true,
     "enable_sound_notifications": true,
     "enable_proactive_conversation_starters": true,
     "user_consents_to_analytics": false,
     "sandbox_base_container_image": null,
     "sandbox_runtime_container_image": null,
     "mcp_config": {
       "sse_servers": [
         {
           "url": "http://host.docker.internal:3002/sse",
           "api_key": null
         }
       ],
       "stdio_servers": []
     }
   }

   ```

5. Start a chat. Back in the terminal, you should see:

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
