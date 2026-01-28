export interface Message {
  sender_id: string;
  senderId?: string; // Support both formats
  content: string;
  receiverId: string;
  type: "text" | "audio" | "image" | "missed-call";
  message_time?: string | Date;
  chat_id?: string;
}
