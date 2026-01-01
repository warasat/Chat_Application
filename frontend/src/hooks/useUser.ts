import { useState, useEffect } from "react";
import API from "../services/api";
import type { User } from "../types/user";

export const useUsers = (loginUserId?: string) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await API.get("/users");
        // Filter logic yahan shift kar di
        const filtered = res.data.filter((u: User) => u._id !== loginUserId);
        setUsers(filtered);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (loginUserId) fetchUsers();
  }, [loginUserId]);

  return { users, loading };
};
