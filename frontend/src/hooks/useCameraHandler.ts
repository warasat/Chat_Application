import { useState } from "react";

export const useCameraHandler = () => {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showCameraOptions, setShowCameraOptions] = useState(false);

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

  const closeCamera = () => {
    setCameraOpen(false);
    cameraStream?.getTracks().forEach((t) => t.stop());
    setCameraStream(null);
  };

  return {
    cameraOpen,
    cameraStream,
    showCameraOptions,
    setShowCameraOptions,
    openCamera,
    closeCamera,
    setCameraOpen,
    setCameraStream,
  };
};
