"use client";

import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import { useChatPage } from './hooks/useChatPage';
import ChatSidebar from './components/ChatSidebar';
import ChatHeader from './components/ChatHeader';
import MessageList from './components/MessageList';
import MessageInput from './components/MessageInput';
import CreditDisplay from './components/CreditDisplay';

export default function ChatPage() {
  const router = useRouter();
  const {
    user,
    authLoading,
    chatState,
    showSidebar,
    isTyping,
    pendingMessageId,
    createNewChat,
    selectChat,
    deleteChat,
    clearCurrentChat,
    handleSendMessage,
    toggleSidebar,
    getCurrentSession,
    getCurrentMessages
  } = useChatPage();

  // Show error if any
  if (chatState.error) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col">
        <Header activePage="dashboard" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6 bg-red-900/30 rounded-lg border border-red-800">
            <h3 className="text-xl font-semibold text-white mb-2">Error</h3>
            <p className="text-red-200 mb-4">{chatState.error}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="rounded-lg bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (authLoading || (chatState.isLoading && chatState.sessions.length === 0)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-xl text-gray-200">Loading chat...</p>
        </div>
      </div>
    );
  }

  const currentMessages = getCurrentMessages();
  const currentSession = getCurrentSession();

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Header activePage="dashboard" />

      <div className="flex-1 flex">
        {/* Sidebar Component */}
        {showSidebar && (
          <ChatSidebar
            sessions={chatState.sessions}
            currentSessionId={chatState.currentSessionId}
            createNewChat={createNewChat}
            selectChat={selectChat}
            deleteChat={deleteChat}
            showSidebar={showSidebar}
          />
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header Component */}
          <ChatHeader 
            session={currentSession} 
            toggleSidebar={toggleSidebar} 
            clearChat={clearCurrentChat} 
          />

          {/* Messages Component */}
          <MessageList 
            messages={currentMessages}
            pendingMessageId={pendingMessageId}
            isTyping={isTyping}
            chatIsLoading={chatState.isLoading}
          />

          {/* Credit Display Component */}
          <CreditDisplay />

          {/* Message Input Component */}
          <MessageInput 
            onSendMessage={handleSendMessage}
            isLoading={chatState.isLoading}
          />
        </div>
      </div>
    </div>
  );
} 