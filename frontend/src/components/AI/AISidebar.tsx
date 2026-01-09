import React from "react";

interface ChatHistoryItem {
  id: string;
  title: string;
  messages: any[];
}

interface AISidebarProps {
  history: ChatHistoryItem[];
  onSelect: (id: string) => void;
}

const AISidebar: React.FC<AISidebarProps> = ({ history, onSelect }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center p-3 border-b border-gray-200 bg-gray-50 gap-2">
        <h2 className="font-semibold text-gray-800">AI Chat History</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {history.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelect(item.id)}
            className="p-2 mb-2 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition"
          >
            {item.title}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AISidebar;
