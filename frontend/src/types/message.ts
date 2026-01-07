export interface Message {
  sender_id: string;
  senderId?: string; // Support both formats
  content: string;
  receiverId: string;
  type: "text" | "audio" | "image";
  chat_id?: string;
}
