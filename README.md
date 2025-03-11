# Solana Agent Kit MCP Server

[![npm version](https://badge.fury.io/js/solana-mcp.svg)](https://www.npmjs.com/package/solana-mcp)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

A Model Context Protocol (MCP) server that provides onchain tools for Claude AI, allowing it to interact with the Solana blockchain through a standardized interface. This implementation is based on the Solana Agent Kit and enables AI agents to perform blockchain operations seamlessly.

## Overview

This MCP server extends Claude's capabilities by providing tools to:

* Interact with Solana blockchain
* Execute transactions
* Query account information
* Manage Solana wallets

The server implements the Model Context Protocol specification to standardize blockchain interactions for AI agents.

## Prerequisites

* Node.js (v16 or higher)
* pnpm (recommended), npm, or yarn
* Solana wallet with private key
* Solana RPC URL (mainnet, testnet, or devnet)

## Installation

### Option 1: Install from npm (Recommended)

```bash
# Install globally
npm install -g solana-mcp

# Or install locally in your project
npm install solana-mcp
```

### Option 2: Build from Source

1. Clone this repository:
```bash
git clone https://github.com/sendaifun/solana-mcp-server
cd solana-mcp-server
```

2. Install dependencies:
```bash
pnpm install
```

3. Build the project:
```bash
pnpm run build
```

## Configuration

### Environment Setup

Create a `.env` file with your credentials:

```env
# Solana Configuration
SOLANA_PRIVATE_KEY=your_private_key_here
RPC_URL=your_solana_rpc_url_here
OPENAI_API_KEY=your_openai_api_key # OPTIONAL
```

### Integration with Claude Desktop

To add this MCP server to Claude Desktop, follow these steps:

1. **Locate the Claude Desktop Configuration File**
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. **Add the Configuration**
   Create or edit the configuration file and add the following JSON:

   If you installed via npm (Option 1):
   ```json
   {
     "mcpServers": {
       "solana-mcp": {
         "command": "npx",
         "args": ["solana-mcp"],
         "env": {
           "RPC_URL": "your_solana_rpc_url_here",
           "SOLANA_PRIVATE_KEY": "your_private_key_here",
           "OPENAI_API_KEY": "your_openai_api_key"  // OPTIONAL
         },
         "disabled": false,
         "autoApprove": []
       }
     }
   }
   ```

   If you built from source (Option 2):
   ```json
   {
     "mcpServers": {
       "solana-mcp": {
         "command": "node",
         "args": ["/path/to/solana-mcp/build/index.js"],
         "env": {
           "RPC_URL": "your_solana_rpc_url_here",
           "SOLANA_PRIVATE_KEY": "your_private_key_here",
           "OPENAI_API_KEY": "your_openai_api_key"  // OPTIONAL
         },
         "disabled": false,
         "autoApprove": []
       }
     }
   }
   ```

3. **Restart Claude Desktop**
   After making these changes, restart Claude Desktop for the configuration to take effect.

## Project Structure

```
solana-agent-kit-mcp/
├── src/
│   ├── index.ts          # Main entry point
├── package.json
└── tsconfig.json
```

## Available Tools

The MCP server provides the following Solana blockchain tools:

* `GET_ASSET` - Retrieve information about a Solana asset/token
* `DEPLOY_TOKEN` - Deploy a new token on Solana
* `GET_PRICE` - Fetch price information for tokens
* `WALLET_ADDRESS` - Get the wallet address
* `BALANCE` - Check wallet balance
* `TRANSFER` - Transfer tokens between wallets
* `MINT_NFT` - Create and mint new NFTs
* `TRADE` - Execute token trades
* `REQUEST_FUNDS` - Request funds (useful for testing/development)
* `RESOLVE_DOMAIN` - Resolve Solana domain names
* `GET_TPS` - Get current transactions per second on Solana

## Security Considerations

* Keep your private key secure and never share it
* Use environment variables for sensitive information
* Consider using a dedicated wallet for AI agent operations
* Regularly monitor and audit AI agent activities
* Test operations on devnet/testnet before mainnet

## Troubleshooting

If you encounter issues:

1. Verify your Solana private key is correct
2. Check your RPC URL is accessible
3. Ensure you're on the intended network (mainnet, testnet, or devnet)
4. Check Claude Desktop logs for error messages
5. Verify the build was successful

## Dependencies

Key dependencies include:
* [@solana/web3.js](https://github.com/solana-labs/solana-web3.js)
* [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk)
* [solana-agent-kit](https://github.com/sendaifun/solana-agent-kit)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
