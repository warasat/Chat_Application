import { useState, useEffect } from "react";
import API from "../services/api";
import socket from "../services/socket";
import type { User } from "../types/user";

export const useUsers = (loginUserId?: string) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // 1️⃣ Fetch contacts on login
  useEffect(() => {
    const fetchMyContacts = async () => {
      if (!loginUserId) return;
      try {
        setLoading(true);
        const res = await API.get(`/users/my-contacts/${loginUserId}`);
        setUsers(res.data);
      } catch (err) {
        console.error("Fetch contacts error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyContacts();
  }, [loginUserId]);

  // 2️⃣ Socket event listeners for real-time updates
  useEffect(() => {
    if (!loginUserId) return;

    // 🔹 When someone adds you as a contact
    const handleNewContact = (newContact: User) => {
      setUsers((prev) => {
        if (prev.find((u) => u._id === newContact._id)) return prev;
        return [newContact, ...prev];
      });
    };

    // 🔹 When a message arrives (WhatsApp style)
    const handleReceiveMessage = async (msg: any) => {
      const senderId = msg.sender_id || msg.senderId;
      console.log("📩 Real-time message received:", msg);

      setUsers((prevUsers) => {
        const exists = prevUsers.find((u) => u._id === senderId);
        if (!exists) {
          API.get(`/users/${senderId}`)
            .then((res) => {
              setUsers((current) => [res.data, ...current]);
            })
            .catch((err) => console.log("New sender fetch error", err));
        }
        return prevUsers;
      });
    };

    // 🔹 When a brand new chat starts (first message from unknown sender)
    const handleNewChatStarted = async (data: any) => {
      try {
        const senderId = data.senderId;
        if (!senderId) return;

        const res = await API.get(`/users/${senderId}`);
        setUsers((prev) => {
          if (prev.find((u) => u._id === senderId)) return prev;
          return [res.data, ...prev];
        });
      } catch (err) {
        console.error("Error fetching new chat sender:", err);
      }
    };

    // ✅ Register all listeners
    socket.on("new_contact_added", handleNewContact);
    socket.on("contact_added_success", handleNewContact);
    socket.on("receive_message", handleReceiveMessage);
    socket.on("new_chat_started", handleNewChatStarted);

    // 🧹 Clean up listeners on unmount
    return () => {
      socket.off("new_contact_added", handleNewContact);
      socket.off("contact_added_success", handleNewContact);
      socket.off("receive_message", handleReceiveMessage);
      socket.off("new_chat_started", handleNewChatStarted);
    };
  }, [loginUserId]);

  return { users, loading, setUsers };
};
