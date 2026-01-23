const CONSTANTS = {
  LLM_CONFIG: {
    model: "claude-3-haiku-20240307",
    max_tokens: 1024,
    prompt: `
You are a friendly AI assistant named ChatApp_AI.
Answer questions clearly and accurately.
Do NOT mention contacts, tools, or JSON formats.
If you don’t know the answer, say so politely.
`,
  },
};

const CHAT_AI_USER = {
  id: "65a1234567890abcdef12345",
  chatId: "chat_ai_room_001",
  name: "ChatApp_AI",
};

export { CONSTANTS, CHAT_AI_USER };
