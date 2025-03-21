import { ChatSession } from "@/app/types/chat";

interface ChatHeaderProps {
  session: ChatSession | undefined;
  toggleSidebar: () => void;
  clearChat: () => void;
}

export default function ChatHeader({ session, toggleSidebar, clearChat }: ChatHeaderProps) {
  return (
    <div className="bg-gray-800 p-2 flex items-center">
      <button
        className="text-gray-400 hover:text-white p-1"
        onClick={toggleSidebar}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div className="flex-1 text-center">
        <h2 className="text-lg font-semibold text-white">
          {session?.title || 'Chat with Nysa'}
        </h2>
      </div>
      <button
        className="text-gray-400 hover:text-white p-1"
        onClick={clearChat}
        title="Clear conversation"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
} 