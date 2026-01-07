export interface Notification {
  _id: string;
  sender: {
    _id: string;
    username: string;
    profilePic?: string | null;
  };
  message: string;
  createdAt: string;
  isRead?: boolean;
}
