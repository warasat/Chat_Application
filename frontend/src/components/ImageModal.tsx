import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[]; // All image URLs
  currentIndex: number; // Index of current image
  onChangeIndex: (index: number) => void;
}

const ImageModal = ({
  isOpen,
  onClose,
  images,
  currentIndex,
  onChangeIndex,
}: ImageModalProps) => {
  if (!isOpen || images.length === 0) return null;

  const total = images.length;

  const handlePrev = () => onChangeIndex((currentIndex - 1 + total) % total);
  const handleNext = () => onChangeIndex((currentIndex + 1) % total);

  return (
    <div
      className="fixed inset-0 bg-black/50 bg-opacity-80 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="relative max-w-[90%] max-h-[90%]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={images[currentIndex]}
          alt="full"
          className="max-w-full max-h-full rounded-lg shadow-lg"
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-white hover:bg-gray-800 cursor-pointer"
        >
          <X size={16} />
        </button>

        {/* Navigation Arrows */}
        {total > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-gray-700 bg-opacity-50 rounded-full flex items-center justify-center text-white hover:bg-gray-800 cursor-pointer"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-gray-700 bg-opacity-50 rounded-full flex items-center justify-center text-white hover:bg-gray-800 cursor-pointer"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ImageModal;
