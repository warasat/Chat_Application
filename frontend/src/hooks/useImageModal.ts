import { useState } from "react";

export const useImageModal = (chatMessages: any[]) => {
  // filter only image messages
  const imageMessages = chatMessages.filter((m: any) => m.type === "image");

  // modal state
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // open modal by image url
  const openImageModal = (url: string) => {
    const index = imageMessages.findIndex((m) => m.content === url);
    if (index === -1) return;
    setCurrentImageIndex(index);
    setIsImageModalOpen(true);
  };

  // close modal
  const closeImageModal = () => {
    setIsImageModalOpen(false);
  };

  return {
    imageMessages,
    isImageModalOpen,
    currentImageIndex,
    openImageModal,
    closeImageModal,
    setCurrentImageIndex, // in case we want navigation buttons
  };
};
