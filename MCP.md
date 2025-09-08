## Useful MCP Servers to connect to Claude Code

## Sequential Thinking — Claude's chain‑of‑thought engine

```bash
claude mcp add sequential-thinking -s user -- npx -y @modelcontextprotocol/server-sequential-thinking || true
```

## Filesystem — give Claude access to local folders

```bash
claude mcp add filesystem -s user -- npx -y @modelcontextprotocol/server-filesystem ~/Documents ~/Desktop ~/Downloads ~/Projects || true
```

## Playwright — modern multi‑browser automation

```bash
claude mcp add playwright -s user -- npx -y @playwright/mcp-server || true
```

## BrowserMCP

```bash
claude mcp add brower-mcp -s user -- npx -y @browsermcp/mcp@latest || true
```

## Fetch — simple HTTP GET/POST

```bash
claude mcp add fetch -s user -- npx -y @kazuph/mcp-fetch || true
```

## Browser‑Tools — DevTools logs, screenshots, etc.

```bash
claude mcp add browser-tools -s user -- npx -y @agentdeskai/browser-tools-mcp || true
```

## Wallaby - https://wallabyjs.com/docs/features/mcp/

```
claude mcp add wallaby -s project -- npx "-y" "-c" "node ~/.wallaby/mcp"
```
