import { ChatSession, Message } from '../types/chat';
import { supabase, getAuthToken } from './supabase';
import { User } from '@supabase/supabase-js';

// Kredi maliyeti - her mesaj için bu kadar kredi düşülecek
export const MESSAGE_CREDIT_COST = 10;

export const systemMessage: Message = {
  role: 'system',
  content: "You are Nysa, a friendly and helpful AI assistant. Always respond in a kind, helpful manner. Keep responses concise but informative. If you don't know something, be honest about it. Your primary goal is to assist the user with any questions or tasks they have."
};

/**
 * Kullanıcının yeterli kredisi olup olmadığını kontrol eder
 */
export const checkUserCredits = async (user: any): Promise<{
  hasSufficientCredits: boolean;
  credits: number;
  error: string | null;
}> => {
  if (!user || !user.id) {
    return { 
      hasSufficientCredits: false, 
      credits: 0, 
      error: 'No valid user ID provided' 
    };
  }
  
  try {
    const userId = user.id;
    console.log(`Checking credits for user ID: ${userId}`);
    
    // Kullanıcının mevcut kredilerini getir
    const { data, error } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error('Error checking user credits:', error);
      return { 
        hasSufficientCredits: false, 
        credits: 0, 
        error: 'Error checking credits: ' + error.message 
      };
    }
    
    const userCredits = parseFloat(data.credits) || 0;
    console.log(`User ${userId} has ${userCredits} credits`);
    
    // Yeterli kredi var mı?
    return { 
      hasSufficientCredits: userCredits >= MESSAGE_CREDIT_COST, 
      credits: userCredits,
      error: null 
    };
  } catch (error: any) {
    console.error('Exception checking user credits:', error);
    return { 
      hasSufficientCredits: false, 
      credits: 0,
      error: error.message || 'Failed to check credits' 
    };
  }
};

/**
 * Kullanıcıdan kredi düşer
 */
export const deductCreditsForMessage = async (user: any): Promise<{
  success: boolean;
  remainingCredits: number;
  error: string | null;
}> => {
  try {
    console.log(`Attempting to deduct ${MESSAGE_CREDIT_COST} credits for user ${user.id}`);
    
    // Get current credits first
    const { data: currentData, error: getCurrentError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();
    
    if (getCurrentError) {
      console.error('Error fetching current credits:', getCurrentError);
      return {
        success: false,
        remainingCredits: 0,
        error: 'Failed to fetch current credits: ' + getCurrentError.message
      };
    }
    
    const currentCredits = parseFloat(currentData.credits) || 0;
    console.log(`Current credits before deduction: ${currentCredits}`);
    
    if (currentCredits < MESSAGE_CREDIT_COST) {
      console.error(`Insufficient credits: ${currentCredits} < ${MESSAGE_CREDIT_COST}`);
      return {
        success: false,
        remainingCredits: currentCredits,
        error: `Insufficient credits. You need ${MESSAGE_CREDIT_COST} credits, but you only have ${currentCredits}.`
      };
    }
    
    // Calculate new credits
    const newCredits = Math.max(0, currentCredits - MESSAGE_CREDIT_COST);
    console.log(`New credits after deduction: ${newCredits}`);
    
    // Supabase RPC ile kredi güncellemesi
    const { data: updateData, error: updateError } = await supabase
      .rpc('update_user_credits', {
        user_id: user.id,
        new_credits: newCredits
      });

    if (updateError) {
      console.error('Error updating credits:', updateError);
      return {
        success: false,
        remainingCredits: currentCredits, // Return original credit count on error
        error: 'Failed to update credits: ' + updateError.message
      };
    }
    
    // Verify the update was successful by reading back the value
    const { data: verifyData, error: verifyError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();
      
    if (verifyError) {
      console.error('Error verifying credit update:', verifyError);
    } else {
      const verifiedCredits = parseFloat(verifyData.credits) || 0;
      if (verifiedCredits !== newCredits) {
        console.error(`Credit update verification failed: Expected ${newCredits}, got ${verifiedCredits}`);
      } else {
        console.log(`Credit update verified: ${verifiedCredits}`);
      }
    }
    
    console.log(`Successfully deducted ${MESSAGE_CREDIT_COST} credits. New balance: ${newCredits}`);
    
    return {
      success: true,
      remainingCredits: newCredits,
      error: null
    };
  } catch (error: any) {
    console.error('Error in deductCreditsForMessage:', error);
    return {
      success: false,
      remainingCredits: 0,
      error: error.message || 'Unknown error deducting credits'
    };
  }
};

/**
 * Kullanıcı için sohbet oturumlarını yükler
 */
export const loadChatSessions = async (user: User | null) => {
  if (!user) return { sessions: [], error: null };
  
  try {
    console.log("Loading chat sessions for user:", user.id);
    
    // Check if the user can authenticate with Supabase properly
    const { data: authTest, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Authentication error with Supabase:', authError);
      return { sessions: [], error: 'Authentication error: ' + authError.message };
    }
    
    // Try/catch for table check to handle potential errors
    try {
      // First check if the table exists
      const { error: tableError } = await supabase
        .from('chat_sessions')
        .select('id')
        .limit(1);
      
      if (tableError) {
        if (tableError.code === '42P01') { // Table doesn't exist error code
          console.warn('chat_sessions table does not exist yet');
          return { sessions: [], error: null };
        } else {
          console.error('Error checking chat_sessions table:', tableError);
          return { sessions: [], error: 'Table check error: ' + tableError.message };
        }
      }
    } catch (tableCheckError) {
      console.error('Exception checking table:', tableCheckError);
      return { sessions: [], error: 'Error checking table structure' };
    }
    
    // Fetch chat sessions
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching chat sessions:', error);
        return { sessions: [], error: 'Error loading chat sessions: ' + error.message };
      }
      
      console.log("Fetched chat sessions:", data?.length || 0);
      
      // If no data, initialize with empty array
      const sessions: ChatSession[] = data ? data.map(session => ({
        id: session.id,
        title: session.title,
        messages: session.messages,
        createdAt: new Date(session.created_at).getTime(),
        updatedAt: new Date(session.updated_at).getTime()
      })) : [];
      
      return { sessions, error: null };
    } catch (fetchError) {
      console.error('Exception fetching sessions:', fetchError);
      return { sessions: [], error: 'Error retrieving chat sessions' };
    }
  } catch (error: any) {
    console.error('Error loading chat sessions:', error);
    return { 
      sessions: [], 
      error: 'Error loading chat sessions: ' + (error.message || 'Unknown error') 
    };
  }
};

/**
 * Bir sohbet oturumunu kaydeder
 */
export const saveChatSession = async (session: ChatSession, user: User | null) => {
  if (!user) return { error: 'User not authenticated' };
  
  try {
    const { error } = await supabase
      .from('chat_sessions')
      .upsert({
        id: session.id,
        user_id: user.id,
        title: session.title,
        messages: session.messages,
        created_at: new Date(session.createdAt).toISOString(),
        updated_at: new Date(session.updatedAt).toISOString()
      });
    
    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    console.error('Error saving chat session:', error);
    return { error: error.message || 'Failed to save chat session' };
  }
};

/**
 * Bir sohbet oturumunu siler
 */
export const deleteChatSession = async (sessionId: string, user: User | null) => {
  if (!user) return { error: 'User not authenticated' };
  
  try {
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user.id);
    
    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    console.error('Error deleting chat session:', error);
    return { error: error.message || 'Failed to delete chat session' };
  }
};

/**
 * API'ye mesaj gönderir ve yanıt alır
 */
export const sendMessageToAPI = async (messages: Pick<Message, 'role' | 'content'>[]) => {
  try {
    // Check auth status before sending request - but continue even if it fails
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      console.log('Auth session before API call:', authSession ? 'Session exists' : 'No session');
    } catch (authError) {
      console.warn('Auth check failed, but continuing with request:', authError);
    }
    
    // Get auth token for API call
    const authToken = getAuthToken();
    
    // Set up headers with Authorization if we have a token
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
      console.log('Adding Authorization header with Bearer token');
    } else {
      console.warn('No auth token available, proceeding without Authorization header');
    }
    
    console.log('Sending message to API with credentials: include');
    
    // Call API endpoint with credentials included and Authorization header if available
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers,
      credentials: 'include', // Important for including cookies
      body: JSON.stringify({ messages }),
    });
    
    console.log('API response status:', response.status);
    
    if (!response.ok) {
      let errorMessage = 'Failed to get response from API';
      try {
        const errorData = await response.json();
        console.error('API error response:', errorData);
        errorMessage = errorData.error || errorMessage;
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError);
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log('API response data:', data.message ? 'Message received' : 'No message in response', 
                'Credits info:', data.credits ? 'Included' : 'Not included');
    
    return { data, error: null };
  } catch (error: any) {
    console.error('Error sending message to API:', error);
    return { 
      data: null, 
      error: error.message || 'Failed to get response from API' 
    };
  }
};