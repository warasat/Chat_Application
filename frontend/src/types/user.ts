export interface User {
  _id: string;
  username: string;
  phoneNumber: string;
  profilePic?: string;
  bio?: string;
  isBot: boolean;
  isOnline: string;
}
