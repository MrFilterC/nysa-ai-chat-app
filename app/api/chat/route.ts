import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';
import { checkUserCredits, deductCreditsForMessage, MESSAGE_CREDIT_COST } from '../../lib/chatService';

// API key from environment variable
const openaiApiKey = process.env.OPENAI_API_KEY;

// Allow responses without authentication during development
const SKIP_AUTH = true;

// Should we enforce credit checking? Set to false for development if needed
const ENFORCE_CREDITS = true;

export async function POST(req: NextRequest) {
  try {
    console.log('Chat API endpoint called');

    // Initialize OpenAI client with project API key
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });
    
    // Create a supabase client for each request
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    });
    
    // Get the user session
    const { data, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      if (SKIP_AUTH) {
        console.log('Authentication bypassed due to SKIP_AUTH setting');
      } else {
        return NextResponse.json(
          { error: 'Authentication error: ' + sessionError.message },
          { status: 401 }
        );
      }
    }
    
    const session = data.session;
    
    // Log authentication attempt for debugging
    console.log('Auth check result:', session ? 'Session found' : 'No session found');
    
    // Check authentication - can be bypassed in development
    if (!session && !SKIP_AUTH) {
      console.error('Authentication failed: No session found');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Get user ID for database operations
    const userId = session?.user?.id || 'dev-user';
    let userForCredits: { id: string } | null = session?.user || null; 
    
    // For development: If we're skipping auth and have no user, create a fake user
    if (!userForCredits && SKIP_AUTH) {
      console.log('Using development user for credit operations');
      // Sabit bir geliştirme kullanıcısı kullan, gerçek kullanıcıları karıştırma
      userForCredits = { id: 'dev-user' };
    }
    
    // Log the user object we're using for better debugging
    console.log('User object for credit operations:');
    console.dir(userForCredits, { depth: 3 });
    
    // Check user credits if we're enforcing credit checks
    if (userForCredits && ENFORCE_CREDITS) {
      console.log(`Checking credits for user ${userForCredits.id}`);
      
      // Eğer geliştirme modu ve dev-user kullanıyorsak, kredi kontrolünü atla
      if (SKIP_AUTH && userForCredits.id === 'dev-user') {
        console.log('Development mode: Skipping credit check for dev-user');
      } else {
        const { hasSufficientCredits, credits, error: creditError } = await checkUserCredits(userForCredits);
        
        if (creditError) {
          console.error('Error checking credits:', creditError);
          return NextResponse.json(
            { error: creditError },
            { status: 400 }
          );
        }
        
        if (!hasSufficientCredits) {
          console.error(`Insufficient credits. User has ${credits} credits, but needs ${MESSAGE_CREDIT_COST}`);
          return NextResponse.json(
            { 
              error: `Insufficient credits. You need ${MESSAGE_CREDIT_COST} credits to send a message, but you only have ${credits} credits.`,
              credits: credits,
              requiredCredits: MESSAGE_CREDIT_COST
            },
            { status: 402 } // 402 Payment Required
          );
        }
      }
    }
    
    // Parse request body
    const body = await req.json();
    const { messages } = body;
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid request. Messages array is required.' },
        { status: 400 }
      );
    }
    
    console.log('Calling OpenAI API with user:', userId);
    console.log('Message count:', messages.length);
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.7,
      max_tokens: 800,
    });
    
    // Deduct credits after successful AI response
    let deductionResult: {
      success: boolean;
      remainingCredits: number;
      error: string | null;
    } = { success: true, remainingCredits: 0, error: null };
    
    if (userForCredits && ENFORCE_CREDITS) {
      // Eğer geliştirme modu ve dev-user kullanıyorsak, kredi düşmeyi atla
      if (SKIP_AUTH && userForCredits.id === 'dev-user') {
        console.log('Development mode: Skipping credit deduction for dev-user');
      } else {
        console.log(`Attempting to deduct credits for user ${userForCredits.id}`);
        deductionResult = await deductCreditsForMessage(userForCredits);
        
        console.log(`Credit deduction result: success=${deductionResult.success}, remaining=${deductionResult.remainingCredits}`);
        
        if (!deductionResult.success) {
          console.error('Error deducting credits:', deductionResult.error);
          // Still return the AI response even if credit deduction failed
          // But log the error so we can investigate
        }
      }
    } else {
      console.log(`Skipping credit deduction: user=${!!userForCredits}, enforce=${ENFORCE_CREDITS}`);
    }
    
    // Return successful response with AI message and credit info
    console.log('Returning successful response with message and credit info');
    
    return NextResponse.json({
      message: response.choices[0].message,
      // Include credit information in the response
      credits: {
        deducted: deductionResult.success ? MESSAGE_CREDIT_COST : 0,
        remaining: deductionResult.remainingCredits,
        deductionSuccessful: deductionResult.success
      }
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during the API call' },
      { status: 500 }
    );
  }
} 