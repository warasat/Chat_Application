import { createContext, useContext, useState, useEffect } from "react";
import socket from "../services/socket";
import type { User } from "../types/user";
import type { AuthContextType } from "../types/authContext";
import {
  loginUser,
  registerUser,
  addContact,
} from "../services/auth/auth.service";

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
      const { user: userData, token } = await loginUser(phoneNumber);

      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("token", token);
      setUser(userData);

      socket.emit("set_session", { senderId: userData._id });

      return { success: true };
    } catch (err: any) {
      const message = err.response?.data?.message || "Login failed.";
      return { success: false, message };
    } finally {
      setAuthLoading(false);
    }
  };

  const registerAction = async (
    username: string,
    phoneNumber: string,
    profilePic: File | null,
  ) => {
    setAuthLoading(true);
    try {
      await registerUser(username, phoneNumber, profilePic);
      return { success: true };
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Registration failed";
      return { success: false, message };
    } finally {
      setAuthLoading(false);
    }
  };

  const addContactAction = async (
    currentUserId: string,
    phoneNumber: string,
  ) => {
    setAuthLoading(true);
    try {
      const { message, contact } = await addContact(currentUserId, phoneNumber);
      return { success: true, message, contact };
    } catch (err: any) {
      const message = err.response?.data?.message || "User not found";
      return { success: false, message };
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
