import type { User } from "./user";

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  authLoading: boolean;
  loginAction: (
    phoneNumber: string
  ) => Promise<{ success: boolean; message?: string }>;
  registerAction: (
    username: string,
    phoneNumber: string,
    profilePic: File | null
  ) => Promise<{ success: boolean; message?: string }>;
  addContactAction: (
    currentUserId: string,
    phoneNumber: string
  ) => Promise<{ success: boolean; message?: string; contact?: User }>;
  updateUser: (updatedUser: User) => void;
  logout: () => void;
}
