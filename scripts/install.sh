#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Solana MCP Server Installation...${NC}"

# Check if curl is installed
if ! command -v curl &> /dev/null; then
    echo -e "${RED}Error: curl is not installed${NC}"
    echo "Please install curl first:"
    echo "  - On macOS: brew install curl"
    echo "  - On Ubuntu/Debian: sudo apt-get install curl"
    echo "  - On Fedora: sudo dnf install curl"
    exit 1
fi

# Create temporary directory
TEMP_DIR=$(mktemp -d)
SCRIPT_URL="https://raw.githubusercontent.com/sendaifun/solana-mcp/main/scripts/init.sh"

echo -e "${YELLOW}Downloading installation script...${NC}"
if curl -fsSL "$SCRIPT_URL" -o "$TEMP_DIR/init.sh"; then
    chmod +x "$TEMP_DIR/init.sh"
    echo -e "${GREEN}Download successful!${NC}"
    
    # Run the script with --yes flag if being piped
    if [ ! -t 0 ]; then
        bash "$TEMP_DIR/init.sh" "$@" --yes
    else
        echo -e "\n${YELLOW}Press Enter to continue with installation or Ctrl+C to cancel...${NC}"
        read
        bash "$TEMP_DIR/init.sh" "$@"
    fi
    
    # Cleanup
    rm -rf "$TEMP_DIR"
else
    echo -e "${RED}Failed to download the installation script${NC}"
    echo "Please check your internet connection and try again"
    rm -rf "$TEMP_DIR"
    exit 1
fi 