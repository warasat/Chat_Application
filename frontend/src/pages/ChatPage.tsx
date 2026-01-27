import { useState, useRef, useEffect } from "react";
import { Send, Mic, Square, Camera, X } from "lucide-react";
import { useChat } from "../hooks/useChat";
// import { useVoiceRecorder } from "../hooks/useVoiceRecorder";
import { useAIChat } from "../hooks/useAIChat";
import type { User } from "../types/user";
import MessageBubble from "../components/MessageBubble";
import CameraModal from "../components/CameraModal";
import ImageModal from "../components/ImageModal";
import { useFetchAIHistory } from "../hooks/useFetchAIHistory";
import { useVoiceSendListener } from "../hooks/useVoiceSendListener";
import { useSendMessage } from "../hooks/useSendMessage";
import { useImageModal } from "../hooks/useImageModal";
import { useCameraHandler } from "../hooks/useCameraHandler";
import { useVoiceChat } from "../hooks/useVoiceChat";
import { useAudioCall } from "../hooks/useAudioCall";
import CallModal from "../components/CallModal";
import InCallScreen from "../components/InCallScreen";
import { IoCallOutline } from "react-icons/io5";
import { useAuth } from "../context/AuthContext";

interface ChatPageProps {
  chatId: string;
  currentUserId: string;
  receiver: User;
  phoneNumber: string;
}

const ChatPage = ({ chatId, currentUserId, receiver }: ChatPageProps) => {
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isSending, setIsSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const { user: currentUser } = useAuth();

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
    setMessages: setAIMessages,
  } = useAIChat();

  useFetchAIHistory({
    isBot: receiver.isBot,
    currentUserId,
    chatId,
    setAIMessages,
  });
  useVoiceSendListener({
    chatId,
    receiver,
    sendAIMessage,
    sendUserMessage,
    setIsSending,
  });

  // decide which messages to show: normal user chat or AI
  const { chatMessages, isRecording, startRecording, stopRecording } =
    useVoiceChat({
      receiver,
      chatId,
      sendAIMessage,
      sendUserMessage,
      setIsSending,
      messages,
      getMessages,
    });

  // --- Image Modal ---
  const {
    imageMessages,
    isImageModalOpen,
    currentImageIndex,
    openImageModal,
    closeImageModal,
    setCurrentImageIndex,
  } = useImageModal(chatMessages);
  // --- Scroll to bottom on new message ---
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // --- Send handler ---
  const { sendMessage, uploading } = useSendMessage({
    chatId,
    receiverId: receiver.isBot ? "bot" : receiver._id,
    sendUserMessage,
    sendAIMessage,
    setIsSending,
  });

  // Wrapper for JSX
  const handleSend = async () => {
    await sendMessage(input, "text", selectedFile ?? undefined);
    setInput("");
    setSelectedFile(null);
  };

  // --- File selection ---
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setShowCameraOptions(false);
  };

  // --- Camera ---
  const {
    cameraOpen,
    cameraStream,
    showCameraOptions,
    setShowCameraOptions,
    openCamera,
    closeCamera,
  } = useCameraHandler();

  // --- Audio Call Hook ---
  const {
    inCall,
    isCaller,
    incomingCall,
    localStream,
    remoteStream,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    callDuration,
    receiverOnline,
    callStatus,
  } = useAudioCall({
    currentUserId,
    // receiverId: receiver._id,
    chatId,
    phoneNumber: currentUser!.phoneNumber,
  });

  return (
    <div className="flex flex-col h-full bg-[#f3f4f6] relative">
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
          {!receiver.isBot && (
            <button
              onClick={startCall}
              className="ml-auto bg-black cursor-pointer text-white px-3 py-1 rounded-full text-xl transition"
            >
              <IoCallOutline />
            </button>
          )}
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
              onImageClick={openImageModal}
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
            closeCamera();
          }}
          onClose={closeCamera}
        />

        {/* IMAGE MODAL */}
        <ImageModal
          isOpen={isImageModalOpen}
          onClose={closeImageModal}
          images={imageMessages.map((m: any) => m.content)}
          currentIndex={currentImageIndex}
          onChangeIndex={setCurrentImageIndex}
        />

        {/* INCOMING CALL POPUP */}
        {incomingCall && !inCall && (
          <CallModal
            callerPhoneNumber={incomingCall.phoneNumber}
            isOnline={incomingCall.isOnline}
            onAccept={acceptCall}
            onReject={rejectCall}
          />
        )}
        {/* Call screen */}
        {inCall && (
          <InCallScreen
            callStatus={callStatus}
            localStream={localStream}
            remoteStream={remoteStream}
            callDuration={callDuration}
            receiverOnline={receiverOnline}
            isCaller={isCaller}
            onEnd={endCall}
          />
        )}
      </div>
    </div>
  );
};

export default ChatPage;
