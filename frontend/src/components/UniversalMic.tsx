import { useVoiceContext } from "react-voice-action-router";

const UniversalMic = () => {
  const { isListening } = useVoiceContext();

  return (
    <div className="flex flex-col items-end gap-2">
      {isListening && (
        <div className="bg-white px-4 py-2 rounded-lg shadow-xl border border-blue-100 text-sm text-gray-700 animate-pulse mb-2 max-w-200px wrap-break-words">
          <span className="text-blue-600 font-bold italic">Hearing: </span>"
        </div>
      )}
    </div>
  );
};

export default UniversalMic;
