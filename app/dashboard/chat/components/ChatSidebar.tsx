import { ChatSession } from "@/app/types/chat";

interface ChatSidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  createNewChat: () => void;
  selectChat: (sessionId: string) => void;
  deleteChat: (sessionId: string) => void;
  showSidebar: boolean;
}

export default function ChatSidebar({
  sessions,
  currentSessionId,
  createNewChat,
  selectChat,
  deleteChat,
  showSidebar
}: ChatSidebarProps) {
  if (!showSidebar) return null;

  return (
    <div className={`w-64 transition-all duration-300 bg-gray-800 overflow-hidden flex flex-col`}>
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={createNewChat}
          className="w-full rounded-md bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          New Chat
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto py-2">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`px-4 py-3 cursor-pointer hover:bg-gray-700 flex justify-between items-center ${
              session.id === currentSessionId ? 'bg-gray-700' : ''
            }`}
            onClick={() => selectChat(session.id)}
          >
            <div className="truncate flex-1">
              <p className="text-gray-200 truncate">{session.title}</p>
              <p className="text-xs text-gray-400">
                {new Date(session.updatedAt).toLocaleDateString()}
              </p>
            </div>
            <button
              className="text-gray-400 hover:text-red-400 ml-2"
              onClick={(e) => { e.stopPropagation(); deleteChat(session.id); }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
} 