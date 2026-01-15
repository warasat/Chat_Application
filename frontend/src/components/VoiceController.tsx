// src/components/VoiceController.tsx
import React from "react";
import { VoiceControlProvider } from "react-voice-action-router";
import type { LLMAdapter } from "react-voice-action-router";
import axios from "axios";

const claudeAdapter: LLMAdapter = async (transcript, commands) => {
  try {
    const res = await axios.post(
      `${import.meta.env.VITE_API_URL}/ai/voice-intent`,
      {
        transcript,
        commands: commands.map((cmd) => ({
          id: cmd.id,
          description: cmd.description,
        })),
      },
      { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
    );

    const data = res.data;
    console.log("Adapter Data:", data);

    if (data.commandId === "search_user" && data.params?.name) {
      console.log(
        "Triggering event directly from Adapter for:",
        data.params.name
      );
      window.dispatchEvent(
        new CustomEvent("voice-search-user", {
          detail: { name: data.params.name },
        })
      );
    }

    return {
      commandId: data.commandId || null,
      parameters: data.params || {},
    };
  } catch (err) {
    console.error("Voice routing error:", err);
    return { commandId: null, parameters: {} };
  }
};

const VoiceController = ({ children }: { children: React.ReactNode }) => {
  return (
    <VoiceControlProvider adapter={claudeAdapter}>
      {children}
    </VoiceControlProvider>
  );
};

export default VoiceController;
