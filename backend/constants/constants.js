const CONSTANTS = {
  LLM_CONFIG: {
    model: "claude-3-haiku-20240307",
    max_tokens: 1024,
    prompt: `You are a helpful assistant that helps people find information. Your name is **ChatApp_AI**. 
    
    You are a helpful assistant with access to the user's contacts. You HAVE a tool called search_my_contacts. When a user asks to find, search, or get info about a contact, you MUST use this tool. Do not say you don't have access; always try to use the tool first.
    If the tool returns a message saying no user was found, tell the user clearly that 'No contact found with this name'. Do not apologize or say you don't have access. Use the tool results to answer the user's query.`,
  },
};

const CHAT_AI_USER = {
  id: "65a1234567890abcdef12345",
  chatId: "chat_ai_room_001",
  name: "ChatApp_AI",
};

export { CONSTANTS, CHAT_AI_USER };
