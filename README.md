# Ray-osquery

[Raycast](https://www.raycast.com) Extension to provide a simple, schema-driven [osquery](https://osquery.io/schema/5.20.0/) tool for table discovery.

## Status 

Experimental

## Features

- **Search osquery Tables** - Search tables and columns with category filters
- **Find Column Across Tables** - Find a column and see all tables that have it, build JOIN queries
- **Query Templates** - Browse common query templates by category
- **Validate Query** - Validate SQL queries against the schema

## Prerequisites

Install Node.js and pnpm using [mise](https://mise.jdx.dev/):

```bash
# Install mise if not already installed
curl https://mise.run | sh

# Install tools automatically from mise.toml
mise install

# Or install manually
mise use -g node@latest pnpm
```

## Development

Checkout and run `mise install && pnpm install` to get the exact same dependency tree.

Or use `pnpm install` to install dependencies in case node and pnpm are already installed.

```bash
# Install dependencies
pnpm install

# Start development mode
pnpm dev

# Build extension
pnpm build

# Lint code
pnpm lint

# Audit dependencies for security vulnerabilities
pnpm audit
```

## Dependency Management

This project uses pnpm for package management with specific configurations:

- **`mise.toml`** - Defines required tools (Node.js, npm, pnpm) for consistent development environment
- **`pnpm-workspace.yaml`** - Configures pnpm to ignore esbuild built dependencies, preventing bundling conflicts common in Raycast extensions

### Security Auditing

Regularly check for security vulnerabilities in dependencies:

```bash
# Check for vulnerabilities
pnpm audit

# Fix automatically fixable vulnerabilities
pnpm audit --fix
```

## Installation in Raycast

1. Build the extension: `pnpm build`
2. Open Raycast preferences
3. Go to Extensions tab
4. Click "Add Extension"
5. Select "Import Extension"
6. Choose the built extension directory
7. The extension will be available in Raycast

## Usage

Once installed, use these commands in Raycast:

- `Search osquery Tables` - Explore available tables
- `Find Column Across Tables` - Search for specific columns
- `osquery Query Templates` - Access predefined queries
- `Validate osquery Query` - Check query syntax

## License

Apache License 2.0
