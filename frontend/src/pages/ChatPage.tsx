import { useState, useRef, useEffect } from "react";
import { Send, Mic, Square, Camera, X } from "lucide-react";
import { useChat } from "../hooks/useChat";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";
import { useAIChat } from "../hooks/useAIChat";
import type { User } from "../types/user";
import MessageBubble from "../components/MessageBubble";
import CameraModal from "../components/CameraModal";
import ImageModal from "../components/ImageModal";

interface ChatPageProps {
  chatId: string;
  currentUserId: string;
  receiver: User;
}

const ChatPage = ({ chatId, currentUserId, receiver }: ChatPageProps) => {
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showCameraOptions, setShowCameraOptions] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isSending, setIsSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Hooks ---
  const {
    messages,
    isOnline,
    sendMessage: sendUserMessage,
  } = useChat(chatId, currentUserId, receiver._id);

  const {
    sendMessage: sendAIMessage,
    getMessages,
    isSending: isAISending,
    setMessages: setAIMessages, // Added this from useAIChat
  } = useAIChat();

  // ChatPage.tsx ke andar useEffect update karein
  useEffect(() => {
    if (receiver.isBot) {
      const fetchAIHistory = async () => {
        try {
          const res = await fetch(
            `${import.meta.env.VITE_API_URL}/ai/${currentUserId}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );
          const data = await res.json();
          if (data.messages) {
            // 1. Pehle data ko map karein
            let formattedMessages = data.messages.map((m: any) => ({
              sender: m.sender_id === currentUserId ? "user" : "ai",
              text: m.content,
              time: m.message_time, // Timestamp store karein sorting ke liye
            }));

            // 2. Sorting logic: Time ke mutabiq purane messages upar, naye niche
            formattedMessages.sort(
              (a: any, b: any) =>
                new Date(a.time).getTime() - new Date(b.time).getTime()
            );

            setAIMessages(chatId, formattedMessages);
          }
        } catch (err) {
          console.error("Failed to fetch AI history:", err);
        }
      };
      fetchAIHistory();
    }
  }, [receiver.isBot, currentUserId, chatId, setAIMessages]);

  // decide which messages to show: normal user chat or AI
  const chatMessages = receiver.isBot ? getMessages(chatId) : messages;

  const { isRecording, startRecording, stopRecording } = useVoiceRecorder(
    async (audioUrl) => {
      try {
        setIsSending(true);
        if (receiver.isBot) await sendAIMessage(chatId, audioUrl);
        else await sendUserMessage(audioUrl, "audio");
      } finally {
        setIsSending(false);
      }
    }
  );

  // --- Image Modal ---
  const imageMessages = chatMessages.filter((m: any) => m.type === "image");
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleOpenImageModal = (url: string) => {
    const index = imageMessages.findIndex((m) => m.content === url);
    if (index === -1) return;
    setCurrentImageIndex(index);
    setIsImageModalOpen(true);
  };

  // --- Scroll to bottom on new message ---
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // --- Send handler ---
  const handleSend = async () => {
    if (!input.trim() && !selectedFile) return;

    let content = input;

    if (selectedFile) {
      setUploading(true);
      const formData = new FormData();
      formData.append("image", selectedFile);

      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/messages/upload-image`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: formData,
          }
        );
        const data = await res.json();
        if (data.url) content = data.url;
        else throw new Error("Image upload failed");
      } catch (err) {
        console.error("Upload error:", err);
        setUploading(false);
        return;
      }

      setUploading(false);
      setSelectedFile(null);
    }

    setInput("");
    setIsSending(true);

    if (receiver.isBot) await sendAIMessage(chatId, content);
    else sendUserMessage(content, selectedFile ? "image" : "text");

    setIsSending(false);
  };

  // --- File selection ---
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setShowCameraOptions(false);
  };

  // --- Camera ---
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setCameraOpen(true);
      setShowCameraOptions(false);
    } catch (err) {
      console.error("Cannot access camera", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f3f4f6] relative">
      {/* HEADER */}
      <div className="p-3 bg-white flex items-center gap-3 border-b shadow-sm z-10">
        <div className="relative">
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold overflow-hidden">
            {receiver.profilePic ? (
              <img
                src={receiver.profilePic}
                alt={receiver.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="bg-purple-600 text-white w-full h-full flex items-center justify-center">
                {receiver.username[0].toUpperCase()}
              </span>
            )}
          </div>
          <div
            className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${
              isOnline ? "bg-green-500" : "bg-gray-400"
            }`}
          />
        </div>
        <div>
          <h3 className="font-semibold text-gray-800">{receiver.username}</h3>
          <span className="text-[11px] text-gray-500 italic">
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {chatMessages.map((m: any, i: number) => (
          <MessageBubble
            key={i}
            message={
              receiver.isBot
                ? {
                    content: m.text,
                    senderId:
                      m.sender === "user" ? currentUserId : receiver._id,
                    type: "text",
                  }
                : m
            }
            currentUserId={currentUserId}
            onImageClick={handleOpenImageModal}
          />
        ))}
        <div ref={scrollRef} />
      </div>

      {/* IMAGE PREVIEW */}
      {selectedFile && (
        <div className="relative flex justify-start p-2 bg-gray-100">
          <div className="relative">
            <img
              src={URL.createObjectURL(selectedFile)}
              alt="preview"
              className="w-40 h-40 object-cover rounded-xl shadow-md border border-gray-200"
            />
            <button
              onClick={() => setSelectedFile(null)}
              className="absolute -top-2 -right-2 bg-gray-700 text-white w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-800"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* INPUT AREA */}
      <div className="p-3 bg-white flex items-center gap-2 border-t relative">
        {/* CAMERA DROPDOWN */}
        <div className="relative">
          <button
            onClick={() => setShowCameraOptions((prev) => !prev)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full cursor-pointer"
          >
            <Camera size={24} />
          </button>

          {showCameraOptions && (
            <div className="absolute bottom-12 left-0 bg-white border rounded shadow-md flex flex-col w-40 z-50">
              <button
                onClick={openCamera}
                className="px-4 py-2 text-left hover:bg-gray-100"
              >
                Take Photo
              </button>
              <label
                htmlFor="gallery-input"
                className="px-4 py-2 text-left hover:bg-gray-100 cursor-pointer"
              >
                Choose from Gallery
              </label>
            </div>
          )}
        </div>

        {/* HIDDEN FILE INPUT */}
        <input
          type="file"
          accept="image/*"
          id="gallery-input"
          className="hidden"
          onChange={handleFileSelected}
        />

        {/* TEXT INPUT */}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={isRecording || uploading || isSending || isAISending}
          placeholder={
            isRecording
              ? `Recording voice... ${recordingTime}s`
              : isSending || isAISending
              ? "Sending..."
              : uploading
              ? "Uploading image..."
              : "Type a message"
          }
          className="flex-1 p-2 px-4 bg-gray-100 rounded-full outline-none text-sm"
        />

        {/* VOICE BUTTON */}
        <div className="flex items-center gap-3">
          <button
            onMouseDown={() => {
              setRecordingTime(0);
              timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
              }, 1000);
              startRecording();
            }}
            onMouseUp={() => {
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
              stopRecording();
              setRecordingTime(0);
            }}
            className={`p-2 rounded-full transition-all ${
              isRecording
                ? "bg-red-500 text-white animate-pulse"
                : "text-purple-600 hover:bg-purple-50"
            }`}
          >
            {isRecording ? <Square size={20} /> : <Mic size={22} />}
          </button>
          {isRecording && (
            <span className="text-xs text-gray-500 font-medium">
              {recordingTime}s
            </span>
          )}
        </div>

        {/* SEND BUTTON */}
        <button
          onClick={handleSend}
          disabled={uploading}
          className="text-purple-600 p-1 cursor-pointer"
        >
          <Send size={22} />
        </button>
      </div>

      {/* CAMERA MODAL */}
      <CameraModal
        isOpen={cameraOpen}
        stream={cameraStream}
        onCapture={(file) => {
          setSelectedFile(file);
          setCameraOpen(false);
          cameraStream?.getTracks().forEach((t) => t.stop());
          setCameraStream(null);
        }}
        onClose={() => {
          setCameraOpen(false);
          cameraStream?.getTracks().forEach((t) => t.stop());
          setCameraStream(null);
        }}
      />

      {/* IMAGE MODAL */}
      <ImageModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        images={imageMessages.map((m: any) => m.content)}
        currentIndex={currentImageIndex}
        onChangeIndex={setCurrentImageIndex}
      />
    </div>
  );
};

export default ChatPage;
