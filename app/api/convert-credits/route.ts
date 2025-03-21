import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { burnTokens, restoreWalletFromPrivateKey } from '../../lib/wallet';
import { supabase as clientSupabase, getCurrentSession, getAuthToken } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Admin/server client with service_role for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    }
  }
);

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

// Handle pre-flight OPTIONS requests
export async function OPTIONS() {
  return createApiResponse({ status: 'ok' });
}

export async function POST(req: NextRequest) {
  try {
    console.log('Convert-credits API endpoint called');
    
    // Debug request details
    console.log('Cookie header present:', req.headers.has('cookie') ? 'Yes' : 'No');
    console.log('Authorization header present:', req.headers.has('authorization') ? 'Yes' : 'No');
    
    // Try to get session using route handler client
    let userId = null;
    let userIdForCredit = null;
    
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    let session = null;
    
    try {
      // Method 1: Get session from route handler
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session from route handler:', error);
      } else if (data.session) {
        session = data.session;
        userId = session.user.id;
        userIdForCredit = userId;
        console.log('Session found via route handler for user:', userId);
      } else {
        console.log('No session found via route handler');
      }
      
      // Method 2: If no session from route handler, try the Authorization header
      if (!session) {
        const authHeader = req.headers.get('Authorization');
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
          try {
            const token = authHeader.split(' ')[1];
            console.log('Authorization header found, verifying token...');
            
            const { data: { user }, error } = await supabase.auth.getUser(token);
            
            if (!error && user) {
              userId = user.id;
              userIdForCredit = userId;
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
      
      // Method 3: Try client library as last resort
      if (!userId) {
        console.log('Trying to get session via client library...');
        const clientSession = await getCurrentSession();
        if (clientSession) {
          userId = clientSession.user.id;
          userIdForCredit = userId;
          session = clientSession;
          console.log('Session found via client library for user:', userId);
        } else {
          console.log('No session found via client library either');
        }
      }
    } catch (sessionError) {
      console.error('Error getting session:', sessionError);
    }
    
    // If we still don't have a user ID, reject the request
    if (!userId) {
      console.error('Authentication failed: No valid session or token found');
      return createApiResponse({ error: 'Not authenticated' }, 401);
    }
    
    // Parse request body
    const body = await req.json();
    const { amount, walletAddress, privateKey } = body;
    
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return createApiResponse({ error: 'Invalid amount specified' }, 400);
    }
    
    if (!walletAddress) {
      return createApiResponse({ error: 'Wallet address is required' }, 400);
    }
    
    if (!privateKey) {
      return createApiResponse({ error: 'Private key is required' }, 400);
    }
    
    console.log(`Converting ${amount} NYSA tokens to credits for user ${userId}`);
    
    try {
      // Restore wallet from private key
      const wallet = await restoreWalletFromPrivateKey(privateKey);
      
      // Verify the private key matches the wallet address
      if (wallet.publicKey.toString().toLowerCase() !== walletAddress.toLowerCase()) {
        return createApiResponse({
          error: 'Private key does not match the provided wallet address'
        }, 400);
      }
      
      // Burn tokens to convert to credits
      const burnResult = await burnTokens(privateKey, amount);
      
      if (!burnResult.success) {
        return createApiResponse({ 
          error: 'Token burn failed: ' + burnResult.error 
        }, 400);
      }
      
      console.log('Tokens burned successfully:', burnResult.signature);
      
      // Update user credits in database
      const creditAmount = Number(amount) * 10; // Each token is worth 10 credits
      
      console.log('Attempting to update credits for user ID:', userIdForCredit);
      console.log('Credit amount to add:', creditAmount);
      
      // Use admin client to bypass RLS
      const { data: updateResult, error: updateError } = await supabaseAdmin
        .from('profiles')
        .select('credits')
        .eq('id', userIdForCredit)
        .single();
      
      if (updateError) {
        console.error('Error fetching current credits:', updateError);
        return createApiResponse({ 
          error: 'Failed to fetch current credits: ' + updateError.message,
          txHash: burnResult.signature  // Still return transaction hash
        }, 500);
      }
      
      // Calculate new credit amount
      const currentCredits = Number(updateResult.credits) || 0;
      const newCredits = currentCredits + creditAmount;
      
      console.log('Current credits:', currentCredits);
      console.log('New credits after update:', newCredits);
      
      // Update the profile with new credits using admin client
      const { data: updateData, error: creditUpdateError } = await supabaseAdmin
        .from('profiles')
        .update({ credits: newCredits.toString() })
        .eq('id', userIdForCredit)
        .select();
      
      if (creditUpdateError) {
        console.error('Error updating credits:', creditUpdateError);
        return createApiResponse({ 
          error: 'Failed to update credits: ' + creditUpdateError.message,
          txHash: burnResult.signature  // Still return transaction hash
        }, 500);
      }
      
      console.log('Credit update result:', updateData);
      
      // Log the credit transaction using admin client
      const { error: logError } = await supabaseAdmin
        .from('credit_logs')
        .insert({
          user_id: userIdForCredit,
          amount: creditAmount,
          type: 'token_conversion',
          transaction_hash: burnResult.signature,
          description: `Converted ${amount} NYSA tokens to ${creditAmount} credits`,
          wallet_address: walletAddress
        });
      
      if (logError) {
        console.error('Error logging credit transaction:', logError);
        // Continue anyway since credits were added successfully
      }
      
      // Return success response
      return createApiResponse({
        success: true,
        txHash: burnResult.signature,
        tokensConverted: Number(amount),
        creditsAdded: creditAmount,
        newCreditBalance: newCredits
      });
      
    } catch (error: any) {
      console.error('Error in token conversion:', error);
      return createApiResponse({ 
        error: error.message || 'An error occurred during token conversion' 
      }, 500);
    }
  } catch (error: any) {
    console.error('Unhandled error in API route:', error);
    return createApiResponse({ 
      error: error.message || 'An unexpected error occurred' 
    }, 500);
  }
}