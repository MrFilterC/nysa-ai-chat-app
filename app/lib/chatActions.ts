import { v4 as uuidv4 } from 'uuid';
import { ChatSession, ChatState, Message } from '../types/chat';
import { User } from '@supabase/supabase-js';
import { systemMessage, saveChatSession, deleteChatSession, sendMessageToAPI, MESSAGE_CREDIT_COST, checkUserCredits } from './chatService';

/**
 * Yeni bir sohbet oturumu oluşturur
 */
export const createNewChat = (user: User | null, onSuccess: (newState: Partial<ChatState>) => void) => {
  const newSession: ChatSession = {
    id: uuidv4(),
    title: 'New Conversation',
    messages: [{ ...systemMessage }],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  onSuccess({
    sessions: [newSession],
    currentSessionId: newSession.id
  });
  
  if (user) {
    saveChatSession(newSession, user);
  }
  
  return newSession;
};

/**
 * Belirli bir sohbet oturumunu seçer
 */
export const selectChat = (sessionId: string, onSuccess: (newState: Partial<ChatState>) => void) => {
  onSuccess({ currentSessionId: sessionId });
};

/**
 * Bir sohbet oturumunu siler
 */
export const deleteChat = async (
  sessionId: string, 
  sessions: ChatSession[],
  currentSessionId: string | null,
  user: User | null, 
  onSuccess: (newState: Partial<ChatState>) => void,
  onError: (error: string) => void
) => {
  if (!user) {
    onError('User not authenticated');
    return;
  }
  
  try {
    const { error } = await deleteChatSession(sessionId, user);
    
    if (error) {
      onError(error);
      return;
    }
    
    const updatedSessions = sessions.filter(session => session.id !== sessionId);
    let updatedCurrentId = currentSessionId;
    
    if (sessionId === currentSessionId) {
      updatedCurrentId = updatedSessions.length > 0 ? updatedSessions[0].id : null;
    }
    
    onSuccess({
      sessions: updatedSessions,
      currentSessionId: updatedCurrentId
    });
  } catch (error: any) {
    onError(error.message || 'Failed to delete chat session');
  }
};

/**
 * Mevcut sohbet oturumunu temizler
 */
export const clearCurrentChat = (
  sessions: ChatSession[],
  currentSessionId: string | null,
  user: User | null,
  onSuccess: (newState: Partial<ChatState>) => void
) => {
  if (!currentSessionId) return;
  
  const currentSession = sessions.find(s => s.id === currentSessionId);
  if (!currentSession) return;
  
  const updatedSession = {
    ...currentSession,
    messages: [{ ...systemMessage }],
    updatedAt: Date.now()
  };
  
  const updatedSessions = sessions.map(s => 
    s.id === updatedSession.id ? updatedSession : s
  );
  
  onSuccess({ sessions: updatedSessions });
  
  if (user) {
    saveChatSession(updatedSession, user);
  }
};

/**
 * Mesaj gönderir ve yanıt alır
 */
export const sendMessage = async (
  content: string,
  sessions: ChatSession[],
  currentSessionId: string | null,
  user: User | null,
  onUpdateState: (newState: Partial<ChatState>) => void,
  timestampStr?: string
) => {
  if (!content.trim() || !currentSessionId) return;
  
  try {
    // Eğer oturum açmış bir kullanıcı varsa, kredi kontrolü yap
    if (user) {
      const creditCheck = await checkUserCredits(user);
      if (!creditCheck.hasSufficientCredits) {
        // Yetersiz kredi uyarısı
        onUpdateState({
          notEnoughCredits: true,
          creditError: `Insufficient credits. You need ${MESSAGE_CREDIT_COST} credits to send a message, but you only have ${creditCheck.credits} credits.`,
          currentCredits: creditCheck.credits,
          isLoading: false
        });
        
        throw new Error(`Insufficient credits. You need ${MESSAGE_CREDIT_COST} credits to send a message.`);
      }
    }
    
    // Find current session
    const currentSession = sessions.find(
      session => session.id === currentSessionId
    );
    
    if (!currentSession) throw new Error('Chat session not found');
    
    // Add user message with unique timestamp to avoid duplicates
    const timestamp = timestampStr ? parseInt(timestampStr) : Date.now();
    const userMessage: Message = {
      role: 'user',
      content,
      timestamp
    };
    
    // Update session with user message
    let updatedSession = {
      ...currentSession,
      messages: [...currentSession.messages, userMessage],
      updatedAt: timestamp
    };
    
    // Update state with user message
    onUpdateState({
      sessions: sessions.map(session => 
        session.id === updatedSession.id ? updatedSession : session
      ),
      isLoading: true
    });
    
    // Get messages for API (excluding timestamps)
    const messagesToSend = updatedSession.messages.map(({ role, content }) => ({
      role,
      content
    }));
    
    // Call API
    const { data, error } = await sendMessageToAPI(messagesToSend);
    
    if (error) {
      // Check if error is credit related
      if (error.includes('Insufficient credits') || error.includes('credit')) {
        onUpdateState({
          notEnoughCredits: true, 
          creditError: error,
          isLoading: false
        });
      }
      throw new Error(error);
    }
    
    // Get assistant's reply
    const assistantMessage: Message = {
      role: 'assistant',
      content: data.message.content || 'Sorry, I encountered an error.',
      timestamp: Date.now() // Different timestamp from user message
    };
    
    // Update session with assistant message
    updatedSession = {
      ...updatedSession,
      messages: [...updatedSession.messages, assistantMessage],
      title: updatedSession.messages.length <= 2 ? 
        content.substring(0, 30) + (content.length > 30 ? '...' : '') : 
        updatedSession.title,
      updatedAt: Date.now()
    };
    
    // Update state with credit info if available
    if (data.credits) {
      console.log('API returned credit info, updating UI:', data.credits);
      
      // Extract credit information
      const { remaining, deducted, deductionSuccessful } = data.credits;
      
      // Log to help debug credit updates
      if (deductionSuccessful) {
        console.log(`Credits deducted: ${deducted}, remaining: ${remaining}`);
      } else {
        console.warn('Credit deduction was not successful in API');
      }
      
      // Force the update with the latest credit info from API
      onUpdateState({
        currentCredits: remaining,
        isLoading: false,
        sessions: sessions.map(session => 
          session.id === updatedSession.id ? updatedSession : session
        )
      });
      
      // For debugging - show updated state
      console.log(`State updated with new credit amount: ${remaining}`);
      
      // Add a delayed update to make sure UI catches the credit update
      setTimeout(() => {
        console.log('Sending delayed credit update:', remaining);
        onUpdateState({ currentCredits: remaining });
      }, 500);
    } else {
      console.log('No credit info in API response');
      // Save to state without updating credits
      onUpdateState({
        sessions: sessions.map(session => 
          session.id === updatedSession.id ? updatedSession : session
        ),
        isLoading: false
      });
    }
    
    // Save to database
    if (user) {
      saveChatSession(updatedSession, user);
    }
    
    return updatedSession;
  } catch (error: any) {
    console.error('Error sending message:', error);
    onUpdateState({ isLoading: false });
    throw error;
  }
}; 