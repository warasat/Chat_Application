import axios from "axios";
import { LLM_CONFIG } from "../config/llm.config.js";
import { callMCPTool } from "./mcpClient.js";
import dotenv from "dotenv";

dotenv.config();

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

export const sendToClaude = async (userMessage, history = [], userId) => {
  try {
    const response = await axios.post(
      CLAUDE_API_URL,
      {
        model: LLM_CONFIG.anthropic.model,
        max_tokens: LLM_CONFIG.anthropic.maxTokens,
        system: `
  You are a Voice Intent Parser. 
  Extract the contact name from the user's request.

  Example 1: "search for Zeeshan" -> {"commandId": "search_user", "params": {"name": "Zeeshan"}}
  Example 2: "open chat of Ali" -> {"commandId": "search_user", "params": {"name": "Ali"}}
  
  Current User Transcript: "${transcript}"

  Return ONLY JSON. If you find a name, put it in the "name" field of "params".
`,
        // FIX 1: 'messages' key repeat ho rahi thi, usay clean kiya
        messages: [...history, { role: "user", content: userMessage }],
        tools: [
          {
            name: "search_my_contacts",
            description:
              "Searches the user's contact list for a specific name.",
            input_schema: {
              type: "object",
              properties: {
                // FIX 2: input_schema mein 'searchTerm' tha, lekin required mein 'name' likha tha. Dono ko match karna zaroori hai.
                searchTerm: {
                  type: "string",
                  description: "The name or number to search",
                },
              },
              required: ["searchTerm"],
            },
          },
        ],
        // Auto tool choice taake Claude tool use kare hi kare
        tool_choice: { type: "tool", name: "search_my_contacts" },
      },
      {
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
      }
    );

    const content = response.data.content;
    const toolCall = content.find((block) => block.type === "tool_use");

    if (toolCall && toolCall.name === "search_my_contacts") {
      const { input, id: tool_use_id } = toolCall;

      const toolArgs = {
        myUserId: userId,
        // FIX 3: input.name ko input.searchTerm kiya kyunke upar schema mein searchTerm hai
        searchName: input.searchTerm,
      };

      const mcpResult = await callMCPTool("search_my_contacts", toolArgs);

      // MCP Result ko parse karne ka safe tareeqa
      let parsedContacts = [];
      try {
        // MCP results content array mein hote hain
        const resultText = mcpResult.content[0]?.text || "[]";
        parsedContacts = JSON.parse(resultText);
      } catch (e) {
        console.log("No valid JSON in MCP result");
      }

      if (parsedContacts.length === 0) {
        return {
          text: "",
          action: "NOT_FOUND_SILENT",
          data: [],
        };
      }

      // Second call Claude ko tool result batane ke liye
      const finalResponse = await axios.post(
        CLAUDE_API_URL,
        {
          model: LLM_CONFIG.anthropic.model,
          max_tokens: 1024,
          messages: [
            ...history,
            { role: "user", content: userMessage },
            { role: "assistant", content: content },
            {
              role: "user",
              content: [
                {
                  type: "tool_result",
                  tool_use_id: tool_use_id,
                  content: JSON.stringify(mcpResult),
                },
              ],
            },
          ],
        },
        {
          headers: {
            "x-api-key": process.env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
        }
      );

      return {
        text: finalResponse.data.content[0].text,
        action:
          Array.isArray(parsedContacts) && parsedContacts.length > 0
            ? "FILTER_SIDEBAR"
            : null,
        data: parsedContacts,
      };
    }

    const textContent = content.find((block) => block.type === "text");
    return {
      text: textContent ? textContent.text : "I'm here to help!",
      action: null,
      data: null,
    };
  } catch (error) {
    // FIX 4: Detailed Error Logging taake pata chale Claude kyun gussa hai
    console.error(
      "Claude API Error Detail:",
      error.response?.data || error.message
    );
    throw new Error("Failed to get response from Claude");
  }
};
export const analyzeVoiceIntent = async (transcript, commands, userId) => {
  try {
    // Debugging: Pehle check karein transcript backend tak pohncha?
    console.log("Backend received transcript:", transcript);

    const response = await axios.post(
      CLAUDE_API_URL,
      {
        model: "claude-3-haiku-20240307",
        max_tokens: 200,
        system: `You are a Voice Intent Parser.
        Task: Map the user transcript to a command ID and extract names.

        Rules:
        1. If user says 'search', 'open', 'find' or 'chat with' followed by a name, return commandId: "search_user".
        2.If the name is a city or place, just return the first 4 letters of the name
        3. Extract the person's name into the "name" field inside "params".
        4. RETURN ONLY JSON. NO TEXT EXPLANATION.

        Example:
        User: "search for Zeeshan" -> {"commandId": "search_user", "params": {"name": "Zeeshan"}}`,
        // FIX: Yahan transcript variable ka message pass ho raha hai
        messages: [{ role: "user", content: `Transcript: "${transcript}"` }],
      },
      {
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
      }
    );

    const resultText = response.data.content[0].text.trim();
    console.log("Claude Raw Response:", resultText);

    const jsonMatch = resultText.match(/\{.*\}/s);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Safety mapping: Ensure name is always there
      return {
        commandId: parsed.commandId || null,
        params: parsed.params || { name: "" },
      };
    }

    return { commandId: null, params: {} };
  } catch (error) {
    console.error(
      "Critical Error in analyzeVoiceIntent:",
      error.response?.data || error.message
    );
    return { commandId: null, params: {} };
  }
};
