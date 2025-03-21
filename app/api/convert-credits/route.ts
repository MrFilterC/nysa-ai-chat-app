import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { burnTokens, restoreWalletFromPrivateKey } from '../../lib/wallet';
import { supabase as clientSupabase, getCurrentSession } from '../../lib/supabase';

// For development, we can bypass authentication checks
const SKIP_AUTH = true; // Temporarily set to true to bypass auth

// Helper function to create a standard API response with proper headers
function createApiResponse(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

export async function OPTIONS() {
  return createApiResponse({ success: true });
}

export async function POST(req: NextRequest) {
  try {
    console.log('Convert-credits API endpoint called');
    
    // Debug request details
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    console.log('Cookie header present:', req.headers.has('cookie'));
    
    // Try to get session using client lib directly first
    let userId = null; // Start with null, we'll require a valid session
    let userIdForCredit = null;
    
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    let session;
    
    try {
      // Get session from route handler
      const { data, error } = await supabase.auth.getSession();
      session = data.session;
      
      if (session) {
        userId = session.user.id;
        userIdForCredit = userId;
        console.log('Session found via createRouteHandlerClient:', userId);
      } else {
        console.log('No session found via createRouteHandlerClient');
        
        // Try getting session via client library as fallback
        const clientSession = await getCurrentSession();
        if (clientSession) {
          userId = clientSession.user.id;
          userIdForCredit = userId;
          session = clientSession;
          console.log('Session found via client library:', userId);
        } else {
          console.log('No session found via client library either');
        }
      }
    } catch (sessionError) {
      console.error('Error getting session:', sessionError);
    }
    
    // Check authentication - only if we're enforcing auth
    if (!userId && !SKIP_AUTH) {
      console.error('Authentication failed: No session found');
      return createApiResponse({ error: 'Not authenticated' }, 401);
    }
    
    // If we're skipping auth and have no user ID, we'll handle it differently
    if (!userId && SKIP_AUTH) {
      console.log('Auth is being skipped, but we still need a valid UUID for the database operation');
      // We'll set userIdForCredit to null, then handle it below
    }
    
    console.log('Processing for user:', userId || 'No user ID');
    
    // Parse request body - careful not to consume the request stream twice
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error('Error parsing request body:', e);
      return createApiResponse({ error: 'Invalid request body' }, 400);
    }
    
    const { amount, privateKey } = body;
    
    console.log('Received request to convert tokens:', { 
      amount, 
      privateKeyProvided: !!privateKey
    });
    
    // Validate input
    if (!amount || !privateKey) {
      return createApiResponse({ error: 'Amount and private key are required' }, 400);
    }
    
    const tokenAmount = parseFloat(amount);
    if (isNaN(tokenAmount) || tokenAmount <= 0) {
      return createApiResponse({ error: 'Invalid amount' }, 400);
    }
    
    // Burn tokens
    console.log('Attempting to burn tokens...');
    const { success, error, signature } = await burnTokens(privateKey, tokenAmount);
    
    if (!success || !signature) {
      console.error('Token burn failed:', error);
      return createApiResponse({ error: error?.message || 'Failed to burn tokens' }, 400);
    }
    
    console.log('Tokens burned successfully. Adding credits...');
    
    // Find the user profile associated with this private key
    if (!userIdForCredit) {
      try {
        // Use the public key from the wallet to find the user
        const keypair = restoreWalletFromPrivateKey(privateKey);
        const publicKey = keypair.publicKey.toString();
        
        if (publicKey) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('wallet_public_key', publicKey)
            .single();
            
          if (profileError) {
            console.error('Error finding profile for wallet:', profileError);
            return createApiResponse({ 
              error: 'Could not find a user associated with this wallet',
              transactionSuccessful: true,
              signature 
            }, 400);
          }
          
          if (profileData?.id) {
            userIdForCredit = profileData.id;
            console.log('Found user ID from wallet public key:', userIdForCredit);
          }
        }
      } catch (walletError) {
        console.error('Error getting wallet info:', walletError);
      }
    }
    
    // If we still don't have a valid user ID, we can't proceed
    if (!userIdForCredit) {
      return createApiResponse({ 
        error: 'Could not determine which user account to credit',
        transactionSuccessful: true,
        signature
      }, 400);
    }
    
    // Add credits to user profile using the stored procedure
    try {
      const { data: creditData, error: creditError } = await supabase.rpc('add_credits', {
        user_id: userIdForCredit,
        credit_amount: tokenAmount
      });
      
      if (creditError) {
        console.error('Error adding credits:', creditError);
        return createApiResponse({ 
          error: creditError.message || 'Failed to add credits',
          transactionSuccessful: true,
          signature
        }, 500);
      }
      
      console.log('Credits added successfully');
      
      // Return success response
      return createApiResponse({ 
        success: true,
        message: 'Tokens successfully converted to credits',
        signature,
        amount: tokenAmount
      });
    } catch (creditAddError) {
      console.error('Exception when adding credits:', creditAddError);
      return createApiResponse({ 
        error: 'An unexpected error occurred while adding credits',
        transactionSuccessful: true, 
        signature
      }, 500);
    }
  } catch (error: any) {
    console.error('Error in convert-credits API:', error);
    return createApiResponse({ 
      error: error.message || 'An unexpected error occurred'
    }, 500);
  }
} 