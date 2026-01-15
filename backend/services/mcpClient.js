import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
import { fileURLToPath } from "url";

// File paths set karne ke liye
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MCP Server ka sahi path (Backend folder se bahar nikal kar mcp_server folder mein)
const serverPath = path.resolve(__dirname, "../../mcp_server/index.js");

const transport = new StdioClientTransport({
  command: "node",
  args: [serverPath],
});

const mcpClient = new Client(
  { name: "chat-app-backend-client", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Connection Function
export const connectMCP = async () => {
  try {
    await mcpClient.connect(transport);
    console.log(" MCP Server connected successfully");

    // Check karein ke tools load huye ya nahi
    const tools = await mcpClient.listTools();
    console.log(
      "Available Tools:",
      tools.tools.map((t) => t.name)
    );
  } catch (error) {
    console.error(" Failed to connect to MCP Server:", error);
  }
};

// Tool Call karne ka generic function
export const callMCPTool = async (toolName, toolArgs) => {
  try {
    const response = await mcpClient.callTool({
      name: toolName,
      arguments: toolArgs,
    });
    return response;
  } catch (error) {
    console.error(`Error calling tool ${toolName}:`, error);
    throw error;
  }
};

export default mcpClient;
