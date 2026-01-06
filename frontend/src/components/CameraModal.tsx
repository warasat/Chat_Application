import { useEffect, useRef } from "react";

interface CameraModalProps {
  isOpen: boolean;
  stream: MediaStream | null;
  onCapture: (file: File) => void;
  onClose: () => void;
}

const CameraModal = ({
  isOpen,
  stream,
  onCapture,
  onClose,
}: CameraModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!isOpen || !stream) return null;

  const handleCapture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
      onCapture(file);
    }, "image/jpeg");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-80 h-60 object-cover rounded-lg"
      />
      <div className="flex gap-4 mt-4">
        <button
          onClick={handleCapture}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Capture
        </button>
        <button
          onClick={onClose}
          className="bg-red-600 text-white px-4 py-2 rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default CameraModal;
