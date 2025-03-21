import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';
import { checkUserCredits, deductCreditsForMessage, MESSAGE_CREDIT_COST } from '../../lib/chatService';
import { getAuthToken } from '../../lib/supabase';

// API key from environment variable
const openaiApiKey = process.env.OPENAI_API_KEY;

export async function POST(req: NextRequest) {
  try {
    console.log('Chat API endpoint called');
    
    // Debug request headers
    console.log('Cookie header present:', req.headers.has('cookie') ? 'Yes' : 'No');
    
    // Initialize OpenAI client with project API key
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });
    
    // Create a supabase client for each request
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    });
    
    // Step 1: Try to get the session from the route handler client
    let session = null;
    let userId = null;
    let userForCredits = null;
    
    try {
      // Get the user session using the route handler client
      const { data, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error from route handler client:', sessionError);
      } else if (data.session) {
        session = data.session;
        userId = session.user.id;
        userForCredits = session.user;
        console.log('Auth session found via route handler client for user:', userId);
      } else {
        console.log('No session found via route handler client');
      }
    } catch (e) {
      console.error('Exception getting session from route handler:', e);
    }
    
    // If no session was found through the route handler client, try the Authorization header
    if (!session) {
      const authHeader = req.headers.get('Authorization');
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          console.log('Authorization header found, verifying token...');
          
          const { data: { user }, error } = await supabase.auth.getUser(token);
          
          if (!error && user) {
            userId = user.id;
            userForCredits = user;
            console.log('Auth session found via Authorization header for user:', userId);
          } else {
            console.error('Invalid token in Authorization header:', error);
          }
        } catch (e) {
          console.error('Error processing Authorization header:', e);
        }
      } else {
        console.log('No Authorization header found');
      }
    }
    
    // If still no session, reject the request
    if (!userId) {
      console.error('Authentication failed: No valid session or token found');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Log the user object we're using
    console.log('User ID for this request:', userId);
    
    // Check user credits
    if (userForCredits) {
      console.log(`Checking credits for user ${userForCredits.id}`);
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
    
    if (userForCredits) {
      console.log(`Attempting to deduct credits for user ${userForCredits.id}`);
      deductionResult = await deductCreditsForMessage(userForCredits);
      
      console.log(`Credit deduction result: success=${deductionResult.success}, remaining=${deductionResult.remainingCredits}`);
      
      if (!deductionResult.success) {
        console.error('Error deducting credits:', deductionResult.error);
        // Still return the AI response even if credit deduction failed
        // But log the error so we can investigate
      }
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