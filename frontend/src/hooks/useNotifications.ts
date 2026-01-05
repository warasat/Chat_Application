import { useState, useEffect, useCallback } from "react";
import API from "../services/api";
import socket from "../services/socket";

export interface Notification {
  _id: string;
  senderId: string;
  senderName: string;
  message: string;
  createdAt: string;
  isRead?: boolean;
}

export const useNotifications = (loginUserId?: string) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // 1️⃣ Fetch all notifications on mount
  useEffect(() => {
    if (!loginUserId) return;

    const fetchNotifications = async () => {
      try {
        const res = await API.get(`/notifications/${loginUserId}`);
        const data = res.data.data || [];
        setNotifications(data);
        const unread = data.filter((n: Notification) => !n.isRead).length;
        setUnreadCount(unread);
      } catch (err) {
        console.error("Fetch notifications error:", err);
      }
    };

    fetchNotifications();
  }, [loginUserId]);

  // 2️⃣ Setup real-time notifications
  useEffect(() => {
    if (!loginUserId) return;

    // join user room so backend knows where to emit
    socket.emit("set_session", { senderId: loginUserId });

    const handleNewNotification = (notif: Notification) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    socket.on("contact_added_notification", handleNewNotification);

    return () => {
      socket.off("contact_added_notification", handleNewNotification);
    };
  }, [loginUserId]);

  // 3️⃣ Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!loginUserId) return;
    try {
      await API.put(`/notifications/mark-read/${loginUserId}`);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Mark all as read error:", err);
    }
  }, [loginUserId]);

  // 4️⃣ Mark one as read
  const markOneAsRead = useCallback(async (id: string) => {
    try {
      await API.put(`/notifications/read/${id}`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Mark one as read error:", err);
    }
  }, []);

  // 5️⃣ Delete notification
  const deleteNotification = useCallback(
    async (id: string) => {
      try {
        await API.delete(`/notifications/${id}`);
        setNotifications((prev) => prev.filter((n) => n._id !== id));
        setUnreadCount(
          (prev) =>
            prev - (notifications.find((n) => n._id === id)?.isRead ? 0 : 1)
        );
      } catch (err) {
        console.error("Delete notification error:", err);
      }
    },
    [notifications]
  );

  return {
    notifications,
    unreadCount,
    markAllAsRead,
    markOneAsRead,
    deleteNotification,
    setNotifications,
  };
};
