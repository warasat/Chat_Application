export interface Message {
  sender_id: string;
  senderId?: string; // Support both formats
  content: string;
  type: "text" | "audio";
  chat_id?: string;
}
