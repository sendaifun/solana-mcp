#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ASCII Art Banner
echo -e "${BLUE}"
cat << "EOF"
 ____        _                     __  __  ____ ____  
/ ___|  ___ | | __ _ _ __   __ _ |  \/  |/ ___|  _ \ 
\___ \ / _ \| |/ _` | '_ \ / _` || |\/| | |   | |_) |
 ___) | (_) | | (_| | | | | (_| || |  | | |__|  __/ 
|____/ \___/|_|\__,_|_| |_|\__,_||_|  |_|\____|_|    
                                                      
EOF
echo -e "${NC}"

# Function to display help
show_help() {
    echo -e "${BLUE}Solana MCP Server Installation Script${NC}"
    echo -e "This script helps you set up the Solana MCP server for Claude Desktop.\n"
    echo -e "The script will:"
    echo -e "  1. Check and install Node.js if needed"
    echo -e "  2. Install solana-mcp globally"
    echo -e "  3. Configure Claude Desktop settings\n"
    echo -e "Requirements:"
    echo -e "  - Internet connection"
    echo -e "  - Admin privileges (for some installations)"
    echo -e "  - Solana RPC URL"
    echo -e "  - Solana private key\n"
    echo -e "Options:"
    echo -e "  -h, --help     Show this help message"
    echo -e "  -b, --backup   Backup existing configuration before modifying"
    echo -e "  -y, --yes      Non-interactive mode (skip confirmations)\n"
}

# Function to validate Solana RPC URL
validate_rpc_url() {
    local url=$1
    if [[ ! $url =~ ^https?:// ]]; then
        echo -e "${RED}Error: Invalid RPC URL format. URL should start with http:// or https://${NC}"
        return 1
    fi
    return 0
}

# Function to validate Solana private key
validate_private_key() {
    local key=$1
    local key_length=${#key}
    echo -e "${YELLOW}Debug: Key length is $key_length characters${NC}"
    echo -e "${YELLOW}Debug: Key value: '$key'${NC}"
    if [[ ! $key =~ ^[0-9a-zA-Z]+$ ]]; then
        echo -e "${RED}Error: Invalid private key format. Should contain only alphanumeric characters${NC}"
        return 1
    fi
    return 0
}

# Function to backup config
backup_config() {
    local config_file=$1
    if [ -f "$config_file" ]; then
        local backup_file="${config_file}.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$config_file" "$backup_file"
        echo -e "${GREEN}Backup created: ${YELLOW}$backup_file${NC}"
    fi
}

# Parse command line arguments
BACKUP=false
NON_INTERACTIVE=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        -h|--help) show_help; exit 0 ;;
        -b|--backup) BACKUP=true ;;
        -y|--yes) NON_INTERACTIVE=true ;;
        *) echo -e "${RED}Unknown parameter: $1${NC}"; show_help; exit 1 ;;
    esac
    shift
done

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to get OS type
get_os_type() {
    case "$(uname -s)" in
        Darwin*)    echo "macos";;
        Linux*)     echo "linux";;
        MINGW*|CYGWIN*|MSYS*) echo "windows";;
        *)          echo "unknown";;
    esac
}

# Function to install Node.js and npm on macOS
install_node_macos() {
    echo -e "${YELLOW}Installing Node.js and npm using Homebrew...${NC}"
    if ! command_exists brew; then
        echo -e "${YELLOW}Installing Homebrew first...${NC}"
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    brew install node
}

# Function to install Node.js and npm on Linux
install_node_linux() {
    echo -e "${YELLOW}Installing Node.js and npm using package manager...${NC}"
    if command_exists apt-get; then
        # Debian/Ubuntu
        curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif command_exists dnf; then
        # Fedora
        sudo dnf install -y nodejs npm
    elif command_exists yum; then
        # CentOS/RHEL
        curl -fsSL https://rpm.nodesource.com/setup_16.x | sudo bash -
        sudo yum install -y nodejs
    elif command_exists pacman; then
        # Arch Linux
        sudo pacman -S nodejs npm
    else
        echo -e "${RED}Unsupported Linux distribution. Please install Node.js manually.${NC}"
        exit 1
    fi
}

# Function to install Node.js and npm on Windows
install_node_windows() {
    echo -e "${YELLOW}Installing Node.js and npm using winget...${NC}"
    if command_exists winget; then
        winget install -e --id OpenJS.NodeJS
    else
        echo -e "${RED}Please install Node.js manually from https://nodejs.org/${NC}"
        exit 1
    fi
}

# Function to install Node.js based on OS
install_node() {
    local os_type=$1
    case "$os_type" in
        "macos")
            install_node_macos
            ;;
        "linux")
            install_node_linux
            ;;
        "windows")
            install_node_windows
            ;;
        *)
            echo -e "${RED}Unsupported operating system${NC}"
            exit 1
            ;;
    esac
}

# Function to get Claude config path based on OS
get_claude_config_path() {
    local os_type=$1
    case "$os_type" in
        "macos")
            echo "$HOME/Library/Application Support/Claude/claude_desktop_config.json"
            ;;
        "linux")
            echo "$HOME/.config/Claude/claude_desktop_config.json"
            ;;
        "windows")
            echo "%APPDATA%\\Claude\\claude_desktop_config.json"
            ;;
        *)
            echo ""
            ;;
    esac
}

# Function to merge JSON configurations
merge_config() {
    local config_file=$1
    local temp_file=$(mktemp)
    
    # Check if jq is installed
    if ! command_exists jq; then
        echo -e "${YELLOW}Installing jq for JSON processing...${NC}"
        case "$OS_TYPE" in
            "macos")
                brew install jq
                ;;
            "linux")
                if command_exists apt-get; then
                    sudo apt-get install -y jq
                elif command_exists dnf; then
                    sudo dnf install -y jq
                elif command_exists yum; then
                    sudo yum install -y jq
                elif command_exists pacman; then
                    sudo pacman -S jq
                fi
                ;;
            "windows")
                echo -e "${RED}Please install jq manually${NC}"
                exit 1
                ;;
        esac
    fi

    # Create new MCP config
    local mcp_config="{
      \"command\": \"npx\",
      \"args\": [\"solana-mcp\"],
      \"env\": {
        \"RPC_URL\": \"$RPC_URL\",
        \"SOLANA_PRIVATE_KEY\": \"$SOLANA_PRIVATE_KEY\""

    if [ ! -z "$OPENAI_API_KEY" ]; then
        mcp_config="$mcp_config,
        \"OPENAI_API_KEY\": \"$OPENAI_API_KEY\""
    fi

    mcp_config="$mcp_config
      },
      \"disabled\": false,
      \"autoApprove\": []
    }"

    if [ -f "$config_file" ]; then
        # File exists, merge configurations
        jq --arg mcp "$mcp_config" '.mcpServers."solana-mcp" = ($mcp | fromjson)' "$config_file" > "$temp_file"
    else
        # Create new config file
        echo "{
  \"mcpServers\": {
    \"solana-mcp\": $mcp_config
  }
}" > "$temp_file"
    fi

    # Move temp file to config location
    mv "$temp_file" "$config_file"
    chmod 644 "$config_file"
}

echo -e "${BLUE}Welcome to Solana MCP Server Installation Script${NC}"
echo -e "${YELLOW}This script will help you set up the Solana MCP server for Claude Desktop${NC}"
echo "----------------------------------------"

if [ "$NON_INTERACTIVE" = false ]; then
    read -p "Would you like to proceed with the installation? (y/N) " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Installation cancelled by user${NC}"
        exit 0
    fi
fi

# Check OS type
OS_TYPE=$(get_os_type)
echo -e "\n${BLUE}System Information:${NC}"
echo -e "Operating System: ${YELLOW}$OS_TYPE${NC}"

# Check for Node.js and install if not present
if ! command_exists node; then
    echo -e "\n${YELLOW}Node.js is not installed. Installing now...${NC}"
    if [ "$NON_INTERACTIVE" = false ]; then
        read -p "Would you like to install Node.js? (Y/n) " confirm
        if [[ ! $confirm =~ ^[Nn]$ ]]; then
            install_node "$OS_TYPE"
        else
            echo -e "${RED}Node.js is required for this installation. Exiting.${NC}"
            exit 1
        fi
    else
        install_node "$OS_TYPE"
    fi
    
    # Verify installation
    if ! command_exists node; then
        echo -e "${RED}Node.js installation failed. Please install manually from https://nodejs.org/${NC}"
        exit 1
    fi
fi

NODE_VERSION=$(node -v)
echo -e "Node.js version: ${GREEN}$NODE_VERSION${NC}"

# Check for npm and install if not present
if ! command_exists npm; then
    echo -e "${YELLOW}npm is not installed. Installing now...${NC}"
    # npm usually comes with Node.js, but if not:
    case "$OS_TYPE" in
        "linux")
            sudo apt-get install -y npm || sudo dnf install -y npm || sudo yum install -y npm || sudo pacman -S npm
            ;;
        *)
            echo -e "${RED}npm installation failed. Please install manually${NC}"
            exit 1
            ;;
    esac
    
    # Verify installation
    if ! command_exists npm; then
        echo -e "${RED}npm installation failed. Please install manually${NC}"
        exit 1
    fi
fi

NPM_VERSION=$(npm -v)
echo -e "npm version: ${GREEN}$NPM_VERSION${NC}"

# Check if solana-mcp is already installed globally
if npm list -g solana-mcp > /dev/null 2>&1; then
    SOLANA_MCP_VERSION=$(npm list -g solana-mcp | grep solana-mcp | cut -d@ -f2)
    echo -e "\nsolana-mcp is already installed globally (version: ${GREEN}$SOLANA_MCP_VERSION${NC})"
    if [ "$NON_INTERACTIVE" = false ]; then
        read -p "Would you like to reinstall/update solana-mcp? (y/N) " confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            echo -e "\n${YELLOW}Updating solana-mcp globally...${NC}"
            npm install -g solana-mcp@latest
        fi
    fi
else
    echo -e "\n${YELLOW}Installing solana-mcp globally...${NC}"
    npm install -g solana-mcp
fi

# Get Claude config path
CONFIG_PATH=$(get_claude_config_path "$OS_TYPE")
if [ -z "$CONFIG_PATH" ]; then
    echo -e "${RED}Unsupported operating system${NC}"
    exit 1
fi

# Backup existing config if requested
if [ "$BACKUP" = true ] && [ -f "$CONFIG_PATH" ]; then
    backup_config "$CONFIG_PATH"
fi

# Collect required information with validation
echo -e "\n${BLUE}Configuration Setup:${NC}"
echo -e "${YELLOW}Please provide the following information:${NC}"

while true; do
    read -p "Enter your Solana RPC URL: " RPC_URL
    if validate_rpc_url "$RPC_URL"; then
        break
    fi
done

while true; do
    read -p "Enter your Solana private key: " SOLANA_PRIVATE_KEY
    if validate_private_key "$SOLANA_PRIVATE_KEY"; then
        break
    fi
done

read -p "Enter your OpenAI API key (optional, press Enter to skip): " OPENAI_API_KEY

# Create directory if it doesn't exist
CONFIG_DIR=$(dirname "$CONFIG_PATH")
mkdir -p "$CONFIG_DIR"

# Merge or create configuration
echo -e "\n${YELLOW}Updating Claude configuration...${NC}"
merge_config "$CONFIG_PATH"

echo -e "\n${GREEN}Installation completed successfully!${NC}"
echo -e "Configuration file has been updated at: ${YELLOW}$CONFIG_PATH${NC}"
echo -e "\n${BLUE}Next steps:${NC}"
echo -e "1. Restart Claude Desktop for the changes to take effect"
echo -e "2. Test the Solana MCP server functionality"
echo -e "3. If you encounter any issues, check the logs in Claude Desktop\n"

if [ "$BACKUP" = true ]; then
    echo -e "${YELLOW}Note: A backup of your previous configuration was created${NC}"
fi 