// #!/usr/bin/env node

import { SolanaAgentKit, KeypairWallet, type Action } from "solana-agent-kit";
import { startMcpServer, createMcpServer } from "@solana-agent-kit/adapter-mcp";
import GodModePlugin from "@solana-agent-kit/plugin-god-mode";
import * as dotenv from "dotenv";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import express, { type Request, type Response } from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import cors from "cors";

dotenv.config();

// Validate required environment variables
function validateEnvironment() {
  const requiredEnvVars = {
    SOLANA_PRIVATE_KEY: process.env.SOLANA_PRIVATE_KEY,
    RPC_URL: process.env.RPC_URL,
  };

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }
}

// New function to start MCP server with SSE support
async function startMcpServerWithSse(
  actions: Record<string, any>,
  agent: SolanaAgentKit,
  options: {
    name: string;
    version: string;
  },
  port: number = 3000
) {
  const app = express();
  app.use(cors());
  // Store active transport instances
  const transports: { [sessionId: string]: SSEServerTransport } = {};

  // SSE endpoint for client connections
  app.get("/sse", async (_req: Request, res: Response) => {
    console.log("Received connection on /sse");
    const transport = new SSEServerTransport("/messages", res);

    // Store the transport for this session
    transports[transport.sessionId] = transport;

    res.on("close", () => {
      console.log(`Connection closed for session ${transport.sessionId}`);
      delete transports[transport.sessionId];
    });

    // Create the server and connect it to this transport
    const server = createMcpServer(actions, agent, options);
    await server.connect(transport);
  });

  // Message endpoint for client-to-server communication
  app.post("/messages", async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string;
    console.log(`Received message for session ${sessionId}`);

    const transport = transports[sessionId];
    if (transport) {
      await transport.handlePostMessage(req, res);
    } else {
      res.status(400).send("No transport found for sessionId");
    }
  });

  // Start the Express server
  app.listen(port, () => {
    console.log(`MCP SSE server listening on port ${port}`);
  });

  return app;
}

async function main() {
  try {
    // Validate environment before proceeding
    validateEnvironment();

    // Initialize the agent with error handling
    const decodedPrivateKey = bs58.decode(
      process.env.SOLANA_PRIVATE_KEY as string
    );
    const keypair = Keypair.fromSecretKey(decodedPrivateKey);
    const keypairWallet = new KeypairWallet(
      keypair,
      process.env.RPC_URL as string
    );

    const agent = new SolanaAgentKit(keypairWallet, keypairWallet.rpcUrl, {})
      .use(GodModePlugin);

    const mcp_actions: Record<string, Action> = {};

    for (const action of agent.actions) {
      mcp_actions[action.name] = action;
    }

    const serverOptions = {
      name: "sendai-agent",
      version: "0.0.1",
    };

    // Check if PORT environment variable exists to determine whether to use SSE
    if (process.env.PORT) {
      const port = Number.parseInt(process.env.PORT, 10);
      console.log(`Starting MCP server with SSE on port ${port}`);
      await startMcpServerWithSse(mcp_actions, agent, serverOptions, port);
    } else {
      // Start the MCP server with stdio transport (original behavior)
      console.log("Starting MCP server with stdio transport");
      await startMcpServer(mcp_actions, agent, serverOptions);
    }
  } catch (error) {
    console.error(
      "Failed to start MCP server:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

main();
