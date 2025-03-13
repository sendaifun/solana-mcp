#!/usr/bin/env node

import { ACTIONS, SolanaAgentKit, startMcpServer } from "solana-agent-kit";
import * as dotenv from "dotenv";

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

async function main() {
  try {
    // Validate environment before proceeding
    validateEnvironment();

    // Initialize the agent with error handling
    const agent = new SolanaAgentKit(
      process.env.SOLANA_PRIVATE_KEY as string,
      process.env.RPC_URL as string,
      {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
      }
    );

    const mcp_actions = {
      GET_ASSET: ACTIONS.GET_ASSET_ACTION,
      DEPLOY_TOKEN: ACTIONS.DEPLOY_TOKEN_ACTION,
      GET_PRICE: ACTIONS.FETCH_PRICE_ACTION,
      WALLET_ADDRESS: ACTIONS.WALLET_ADDRESS_ACTION,
      BALANCE: ACTIONS.BALANCE_ACTION,
      TOKEN_BALANCES: ACTIONS.TOKEN_BALANCES_ACTION,
      TRANSFER: ACTIONS.TRANSFER_ACTION,
      MINT_NFT: ACTIONS.MINT_NFT_ACTION,
      TRADE: ACTIONS.TRADE_ACTION,
      REQUEST_FUNDS: ACTIONS.REQUEST_FUNDS_ACTION,
      RESOLVE_DOMAIN: ACTIONS.RESOLVE_SOL_DOMAIN_ACTION,
      GET_TPS: ACTIONS.GET_TPS_ACTION,
    };
    // Start the MCP server with error handling
    await startMcpServer(mcp_actions, agent, {
      name: "solana-agent",
      version: "0.0.1",
    });
  } catch (error) {
    console.error(
      "Failed to start MCP server:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

main();
