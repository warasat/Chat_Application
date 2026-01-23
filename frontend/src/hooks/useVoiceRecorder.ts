import { useState, useRef, useCallback } from "react";

export const useVoiceRecorder = (onSave: (audioUrl: string) => void) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Check available types
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
          // Debugging: Size check karein console mein
          console.log("Chunk received size:", e.data.size);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log("FINAL Total Blob Size:", audioBlob.size);

        // AGAR SIZE 5000 (5KB) SE KAM HAI TOH UPLOAD NA KAREIN
        if (audioBlob.size < 2000) {
          console.error(
            "Recording too small, mic might be muted or not capturing."
          );
          return;
        }

        const formData = new FormData();
        const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        formData.append("audio", audioFile);

        try {
          const token = localStorage.getItem("token");
          const res = await fetch(
            `${import.meta.env.VITE_API_URL}/messages/upload-audio`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
              body: formData,
            }
          );

          const data = await res.json();
          if (data.url) onSave(data.url);
        } catch (err) {
          console.error("Upload error:", err);
        }
      };

      // CRITICAL FIX: 200ms slices dein taake data flow hota rahe
      mediaRecorder.start(200);
      setIsRecording(true);
    } catch (err) {
      console.error("Mic Error:", err);
    }
  }, [onSave]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      // Chota sa delay taake aakhri data chunk capture ho jaye
      setTimeout(() => {
        mediaRecorderRef.current?.stop();
        mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
      }, 200);
    }
  }, []);

  return { isRecording, startRecording, stopRecording };
};
