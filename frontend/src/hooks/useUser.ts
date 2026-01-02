import { useState, useEffect } from "react";
import API from "../services/api";
import socket from "../services/socket";
import type { User } from "../types/user";

export const useUsers = (loginUserId?: string) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Initial Load
  useEffect(() => {
    const fetchMyContacts = async () => {
      if (!loginUserId) return;
      try {
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

  // 2. WhatsApp Logic: Listen for ANY incoming message
  useEffect(() => {
    if (!loginUserId) return;

    // Jab koi manually add kare (Jo humne pehle kiya tha)
    socket.on("contact_added_success", (newContact: User) => {
      setUsers((prev) => {
        if (prev.find((u) => u._id === newContact._id)) return prev;
        return [newContact, ...prev];
      });
    });

    // --- WHATSAPP LOGIC ---
    // Jab koi unknown message bhejey
    socket.on("receive_message", async (msg: any) => {
      const senderId = msg.sender_id;

      // Check karein kya ye banda pehle se sidebar mein hai?
      setUsers((prevUsers) => {
        const exists = prevUsers.find((u) => u._id === senderId);

        if (!exists) {
          // Agar nahi hai, toh backend se iski info mangwao
          // Note: Iske liye aapko backend par ek route chahiye /users/:id
          API.get(`/users/${senderId}`)
            .then((res) => {
              setUsers((current) => [res.data, ...current]);
            })
            .catch((err) => console.log("New sender fetch error", err));
        }
        return prevUsers;
      });
    });

    return () => {
      socket.off("contact_added_success");
      socket.off("receive_message");
    };
  }, [loginUserId]);

  return { users, loading, setUsers };
};
