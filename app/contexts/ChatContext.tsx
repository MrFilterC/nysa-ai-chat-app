'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { ChatState, ChatContextType } from '../types/chat';
import { loadChatSessions, MESSAGE_CREDIT_COST } from '../lib/chatService';
import * as chatActions from '../lib/chatActions';

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  const [chatState, setChatState] = useState<ChatState>({
    sessions: [],
    currentSessionId: null,
    isLoading: false,
    error: null,
    currentCredits: 0,
    notEnoughCredits: false,
    creditError: undefined
  });
  
  // Load chat sessions from supabase when user is logged in
  useEffect(() => {
    if (user) {
      loadUserChatSessions();
      fetchUserCredits();
    } else {
      setChatState({
        sessions: [],
        currentSessionId: null,
        isLoading: false,
        error: null,
        currentCredits: 0,
        notEnoughCredits: false,
        creditError: undefined
      });
    }
  }, [user]);
  
  const loadUserChatSessions = async () => {
    setChatState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const { sessions, error } = await loadChatSessions(user);
      
      setChatState({
        sessions,
        currentSessionId: sessions.length > 0 ? sessions[0].id : null,
        isLoading: false,
        error: error,
        currentCredits: chatState.currentCredits,
        notEnoughCredits: false,
        creditError: undefined
      });
    } catch (error: any) {
      setChatState(prev => ({ ...prev, error: error.message, isLoading: false }));
    }
  };

  // Kullanıcının mevcut kredilerini getir
  const fetchUserCredits = async () => {
    if (!user) return;
    
    try {
      // Get the current session to ensure we have the most recent user data
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        console.warn('No active session found in fetchUserCredits');
        return;
      }
      
      console.log(`Fetching credits for user ${user.id}`);
      
      // Force cache bypass with a unique timestamp to get fresh data
      const timestamp = Date.now();
      
      // Normal sorguyu kullanalım - başlarken daha güvenli
      const { data, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching credits:', error);
        return;
      }
      
      const credits = parseFloat(data.credits) || 0;
      console.log(`User ${user.id} has ${credits} credits (fetched at ${timestamp})`);
      
      // Always update the state with fresh credits
      setChatState(prev => {
        // Only log if there's a change to help debug
        if (prev.currentCredits !== credits) {
          console.log(`Updating credit display from ${prev.currentCredits} to ${credits}`);
        }
        return { ...prev, currentCredits: credits };
      });
      
      // For verification, also update immediately in a timeout
      setTimeout(() => {
        setChatState(prev => {
          if (prev.currentCredits !== credits) {
            console.log(`Delayed update of credit display to ${credits}`);
          }
          return { ...prev, currentCredits: credits };
        });
      }, 100);
    } catch (error) {
      console.error('Error in fetchUserCredits:', error);
    }
  };

  const updateChatState = (newState: Partial<ChatState>) => {
    setChatState(prev => ({
      ...prev,
      ...newState
    }));
  };

  const handleError = (error: string) => {
    setChatState(prev => ({
      ...prev,
      error,
      isLoading: false
    }));
  };

  // Modüler fonksiyonları kullanarak context metotlarını tanımlama
  const createNewChat = () => {
    chatActions.createNewChat(user, updateChatState);
  };

  const selectChat = (sessionId: string) => {
    chatActions.selectChat(sessionId, updateChatState);
  };

  const deleteChat = async (sessionId: string) => {
    setChatState(prev => ({ ...prev, isLoading: true }));
    await chatActions.deleteChat(
      sessionId, 
      chatState.sessions, 
      chatState.currentSessionId, 
      user, 
      updateChatState,
      handleError
    );
  };

  const clearCurrentChat = () => {
    chatActions.clearCurrentChat(
      chatState.sessions,
      chatState.currentSessionId,
      user,
      updateChatState
    );
  };

  const sendMessage = async (content: string, timestamp?: string) => {
    if (chatState.notEnoughCredits) {
      // Kullanıcıya kredi hatırlatması göster
      setChatState(prev => ({
        ...prev,
        error: `You don't have enough credits to send a message. Each message requires ${MESSAGE_CREDIT_COST} credits. Please add more credits.`
      }));
      return;
    }
    
    try {
      setChatState(prev => ({ ...prev, isLoading: true, error: null }));
      
      await chatActions.sendMessage(
        content,
        chatState.sessions,
        chatState.currentSessionId,
        user,
        updateChatState,
        timestamp
      );
      
      // Mesaj gönderildikten sonra kredileri güncelle
      if (user) {
        fetchUserCredits();
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      setChatState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: error.message || 'Failed to send message'
      }));
    }
  };

  return (
    <ChatContext.Provider value={{ 
      chatState, 
      sendMessage, 
      createNewChat, 
      selectChat, 
      deleteChat, 
      clearCurrentChat 
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}; 