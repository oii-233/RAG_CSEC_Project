
import React from 'react';
import { Icons } from '../constants';
import { User } from '../types';
import ChatPage from '../pages/ChatPage';

interface ChatBotProps {
  user: User;
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
}

const ChatBot: React.FC<ChatBotProps> = ({ user, isOpen, setIsOpen }) => {
  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      {/* Overlay Panel */}
      {isOpen && (
        <>
          {/* Backdrop for closing */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[-1] animate-in fade-in duration-300"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel Container */}
          <div className="absolute bottom-20 right-0 w-[90vw] md:w-[800px] h-[80vh] bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-500">
            {/* Header with Close Button */}
            <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-white flex-shrink-0">
              <div className="flex items-center gap-2 px-2">
                <div className="text-[#17A2B8]"><Icons.Shield /></div>
                <span className="text-xs font-black text-[#0F2A3D] uppercase tracking-tighter">ዘብ AI Hub</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors hover:bg-red-50 rounded-xl"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            {/* Render ChatPage directly */}
            <div className="flex-1 overflow-hidden relative">
              <ChatPage user={user} />
            </div>
          </div>
        </>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-4 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center border-4 border-white ${isOpen ? 'bg-red-500 rotate-90' : 'bg-[#17A2B8] hover:scale-110 active:scale-95'
          }`}
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        ) : (
          <div className="text-white scale-110">
            <Icons.Message />
          </div>
        )}
      </button>
    </div>
  );
};

// Also expose to window for external triggers if needed
if (typeof window !== 'undefined') {
  (window as any).triggerAIReporting = () => {
    // This is a bit hacky but works for the current architecture if needed
    const event = new CustomEvent('open-chatbot');
    window.dispatchEvent(event);
  };
}

export default ChatBot;
