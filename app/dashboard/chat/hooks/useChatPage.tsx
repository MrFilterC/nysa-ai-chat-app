import { useState, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useChat } from '@/app/contexts/ChatContext';
import { useRouter } from 'next/navigation';
import { Message } from '@/app/types/chat';

export function useChatPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { chatState, sendMessage, createNewChat, selectChat, deleteChat, clearCurrentChat } = useChat();
  const router = useRouter();
  const [showSidebar, setShowSidebar] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [pendingMessageId, setPendingMessageId] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Create a new chat if none exists
  useEffect(() => {
    if (user && chatState.sessions.length === 0 && !chatState.isLoading) {
      createNewChat();
    }
  }, [user, chatState.sessions, chatState.isLoading, createNewChat]);

  // Manage pending message display
  useEffect(() => {
    if (pendingMessageId && chatState.sessions.length > 0) {
      const currentSession = chatState.sessions.find(
        session => session.id === chatState.currentSessionId
      );
      
      if (currentSession && currentSession.messages.length > 0) {
        const lastUserMessage = [...currentSession.messages]
          .reverse()
          .find(m => m.role === 'user');
          
        if (lastUserMessage && lastUserMessage.timestamp?.toString() === pendingMessageId) {
          setPendingMessageId(null);
        }
      }
    }
  }, [chatState.sessions, chatState.currentSessionId, pendingMessageId]);

  // Track when assistant's message is received
  useEffect(() => {
    if (chatState.sessions.length > 0 && !chatState.isLoading) {
      setIsTyping(false);
    }
  }, [chatState.isLoading, chatState.sessions]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || chatState.isLoading) return;
    
    // Generate a unique ID for this message based on timestamp
    const messageTimestamp = Date.now().toString();
    setPendingMessageId(messageTimestamp);
    
    // Track loading state locally
    setIsTyping(true);
    
    // Send the message in the background
    try {
      await sendMessage(message, messageTimestamp);
    } catch (error) {
      console.error('Failed to send message:', error);
      setPendingMessageId(null);
      setIsTyping(false);
    }
  };

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  const getCurrentSession = () => {
    return chatState.sessions.find(session => session.id === chatState.currentSessionId);
  };

  const getCurrentMessages = () => {
    const session = getCurrentSession();
    return session ? session.messages.filter(msg => msg.role !== 'system') : [];
  };

  return {
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
  };
} 