// #!/usr/bin/env node

import { SolanaAgentKit, KeypairWallet, type Action } from 'solana-agent-kit'
import { startMcpServer, createMcpServer } from '@solana-agent-kit/adapter-mcp'
import * as dotenv from 'dotenv'
import { Keypair, PublicKey } from '@solana/web3.js'
import bs58 from 'bs58'
import express, { type Request, type Response } from 'express'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import cors from 'cors'
import TokenPlugin from '@solana-agent-kit/plugin-token'
import DefiPlugin from '@solana-agent-kit/plugin-defi'
import NFTPlugin from '@solana-agent-kit/plugin-nft'
import { PrivyBaseWallet } from './privyWallet.js'

dotenv.config()

// Validate required environment variables
function validateEnvironment() {
  const requiredEnvVars = {
    SOLANA_PRIVATE_KEY: process.env.SOLANA_PRIVATE_KEY,
    RPC_URL: process.env.RPC_URL,
  }

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key)

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    )
  }
}

function extractPrivyHeaders(req: Request) {
  const walletId = req.headers['x-privy-wallet-id'] as string
  const appId = req.headers['x-privy-app-id'] as string
  const appSecret = req.headers['x-privy-app-secret'] as string
  const authorizationPrivateKey = req.headers[
    'x-privy-authorization-private-key'
  ] as string
  const walletAddress = req.headers['x-wallet-address'] as string
  const network = (req.headers['x-network'] as string) || 'mainnet'

  console.log('Extracted headers:', {
    walletId,
    appId,
    appSecret,
    authorizationPrivateKey,
    walletAddress,
    network,
  })

  if (!walletId || walletId === 'none') {
    throw new Error(
      'User has no privy wallet - X-Privy-Wallet-Id header missing or invalid'
    )
  }
  if (!appId) {
    throw new Error('X-Privy-App-Id header is required')
  }
  if (!appSecret) {
    throw new Error('X-Privy-App-Secret header is required')
  }
  if (!authorizationPrivateKey) {
    throw new Error('X-Privy-Authorization-Private-Key header is required')
  }
  if (!walletAddress) {
    throw new Error('X-Wallet-Address header is required')
  }

  if (!['mainnet', 'devnet', 'testnet'].includes(network)) {
    throw new Error('X-Network header must be one of: mainnet, devnet, testnet')
  }

  return {
    walletId,
    appId,
    appSecret,
    authorizationPrivateKey,
    walletAddress,
    network: network as 'mainnet' | 'devnet' | 'testnet',
  }
}

// New function to start MCP server with SSE support
async function startMcpServerWithSse(
  actions: Record<string, any>,
  agent: SolanaAgentKit,
  options: {
    name: string
    version: string
  },
  port: number = 3000
) {
  const app = express()
  app.use(cors())
  // Store active transport instances
  const transports: { [sessionId: string]: SSEServerTransport } = {}

  // SSE endpoint for client connections
  app.get('/sse', async (req: Request, res: Response) => {
    console.log('Received connection on /sse')

    try {
      const privyConfig = extractPrivyHeaders(req)
      console.log('Extracted Privy config:', {
        walletId: privyConfig.walletId,
        walletAddress: privyConfig.walletAddress,
        network: privyConfig.network,
      })

      const transport = new SSEServerTransport('/messages', res)

      transports[transport.sessionId] = transport

      res.on('close', () => {
        console.log(`Connection closed for session ${transport.sessionId}`)
        delete transports[transport.sessionId]
      })

      const walletPublicKey = new PublicKey(privyConfig.walletAddress)
      const privyWallet = new PrivyBaseWallet(
        walletPublicKey,
        privyConfig.walletId,
        privyConfig.appId,
        privyConfig.appSecret,
        privyConfig.authorizationPrivateKey,
        privyConfig.network
      )

      const privyAgent = new SolanaAgentKit(
        privyWallet,
        process.env.RPC_URL as string,
        {}
      )
        .use(TokenPlugin)
        .use(NFTPlugin)
        .use(DefiPlugin)

      // Create the server and connect it to this transport
      const server = createMcpServer(actions, privyAgent, options)
      await server.connect(transport)
    } catch (error) {
      console.error('Error setting up SSE connection:', error)
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  })

  // Message endpoint for client-to-server communication
  app.post('/messages', async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string
    console.log(`Received message for session ${sessionId}`)

    const transport = transports[sessionId]
    if (transport) {
      await transport.handlePostMessage(req, res)
    } else {
      res.status(400).send('No transport found for sessionId')
    }
  })

  // Start the Express server
  app.listen(port, () => {
    console.log(`MCP SSE server listening on port ${port}`)
  })

  return app
}

async function main() {
  try {
    // Validate environment before proceeding
    validateEnvironment()

    // Initialize the agent with error handling
    const decodedPrivateKey = bs58.decode(
      process.env.SOLANA_PRIVATE_KEY as string
    )
    const keypair = Keypair.fromSecretKey(decodedPrivateKey)
    const keypairWallet = new KeypairWallet(
      keypair,
      process.env.RPC_URL as string
    )

    const agent = new SolanaAgentKit(keypairWallet, keypairWallet.rpcUrl, {})
      .use(TokenPlugin)
      .use(NFTPlugin)
      .use(DefiPlugin)

    const mcp_actions: Record<string, Action> = {}

    for (const action of agent.actions) {
      mcp_actions[action.name] = action
    }

    console.log('mcp_actions:', mcp_actions)

    const serverOptions = {
      name: 'sendai-agent',
      version: '0.0.1',
    }

    // Check if PORT environment variable exists to determine whether to use SSE
    if (process.env.PORT) {
      const port = Number.parseInt(process.env.PORT, 10)
      console.log(`Starting MCP server with SSE on port ${port}`)
      await startMcpServerWithSse(mcp_actions, agent, serverOptions, port)
    } else {
      // Start the MCP server with stdio transport (original behavior)
      console.log('Starting MCP server with stdio transport')
      await startMcpServer(mcp_actions, agent, serverOptions)
    }
  } catch (error) {
    console.error(
      'Failed to start MCP server:',
      error instanceof Error ? error.message : String(error)
    )
    process.exit(1)
  }
}

main()
