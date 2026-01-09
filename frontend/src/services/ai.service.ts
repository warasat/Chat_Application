import type { AIMessage } from "../hooks/useAIChat";

export async function sendAIMessage(
  text: string,
  messages: AIMessage[]
): Promise<string> {
  const token = localStorage.getItem("token"); // get logged-in token

  const res = await fetch(`${import.meta.env.VITE_API_URL}/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`, // send token here
    },
    body: JSON.stringify({ message: text, history: messages }),
  });

  if (!res.ok) {
    throw new Error(`AI request failed: ${res.status}`);
  }

  const data = await res.json();
  return data.reply;
}
