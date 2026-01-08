import { createContext, useContext, useState, useEffect } from "react";
import API from "../services/api";
import type { User } from "../types/user";
import socket from "../services/socket";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authLoading: boolean;
  loginAction: (
    phoneNumber: string
  ) => Promise<{ success: boolean; message?: string }>;
  registerAction: (
    username: string,
    phoneNumber: string,
    profilePic: File | null // 🔹 New parameter
  ) => Promise<{ success: boolean; message?: string }>;
  addContactAction: (
    currentUserId: string,
    phoneNumber: string
  ) => Promise<{ success: boolean; message?: string; contact?: User }>;
  updateUser: (updatedUser: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Error parsing saved user", e);
      }
    }
    setLoading(false);
  }, []);

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  const loginAction = async (phoneNumber: string) => {
    setAuthLoading(true);
    try {
      const res = await API.post("/auth/login", { phoneNumber });
      const { user: userData, token } = res.data.data;

      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("token", token);
      setUser(userData);

      socket.emit("set_session", { senderId: userData._id });
      return { success: true };
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Login failed.";
      return { success: false, message: errorMsg };
    } finally {
      setAuthLoading(false);
    }
  };

  // 🔹 Updated Register Action to handle FormData
  const registerAction = async (
    username: string,
    phoneNumber: string,
    profilePic: File | null
  ) => {
    setAuthLoading(true);
    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("phoneNumber", phoneNumber);

      if (profilePic) {
        formData.append("profilePic", profilePic); // "profilePic" match with backend upload.single
      }

      await API.post("/auth/register", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return { success: true };
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Registration failed";
      return { success: false, message: errorMsg };
    } finally {
      setAuthLoading(false);
    }
  };

  const addContactAction = async (
    currentUserId: string,
    phoneNumber: string
  ) => {
    setAuthLoading(true);
    try {
      const res = await API.post("/users/add-contact", {
        phoneNumber,
        currentUserId,
      });
      return {
        success: true,
        message: res.data.message,
        contact: res.data.contact,
      };
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "User not found";
      return { success: false, message: errorMsg };
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authLoading,
        loginAction,
        registerAction,
        addContactAction,
        updateUser,
        logout,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
