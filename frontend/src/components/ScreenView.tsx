import React, { useRef, useEffect } from "react";

interface ScreenViewProps {
  stream: MediaStream | null;
  label: string;
}

const ScreenView: React.FC<ScreenViewProps> = ({ stream, label }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="w-full max-w-4xl mt-4 bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-700">
      <div className="bg-gray-800 text-white text-xs p-2 px-4 flex justify-between">
        <span>{label}</span>
      </div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export default ScreenView;
