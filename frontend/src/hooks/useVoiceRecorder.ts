import { useState, useRef, useCallback } from "react";

export const useVoiceRecorder = (onSave: (audioUrl: string) => void) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const formData = new FormData();
        formData.append("audio", audioBlob, `voice-${Date.now()}.webm`);

        try {
          // Upload to backend
          const token = localStorage.getItem("token");
          const res = await fetch(
            `${import.meta.env.VITE_API_URL}/messages/upload-audio`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: formData,
            }
          );

          const data = await res.json();
          if (data.url) {
            onSave(data.url);
          } else {
            console.error("Audio upload failed", data);
          }
        } catch (err) {
          console.error("Audio upload error:", err);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied or unavailable:", err);
    }
  }, [onSave]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream
      .getTracks()
      .forEach((track) => track.stop());
    setIsRecording(false);
  }, []);

  return { isRecording, startRecording, stopRecording };
};
