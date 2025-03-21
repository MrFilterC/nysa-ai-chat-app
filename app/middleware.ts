import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  // Create a response object
  const res = NextResponse.next();
  
  // Log the request details
  const url = req.nextUrl.pathname;
  const method = req.method;
  console.log(`Middleware processing ${method} request to ${url}`);
  
  // Debug headers
  console.log("Cookies present:", req.headers.has('cookie') ? 'Yes' : 'No');
  
  // Create a Supabase client with the middleware configuration
  const supabase = createMiddlewareClient({ req, res });
  
  // Refresh the session to ensure it's valid
  const { data: { session }, error } = await supabase.auth.getSession();
  
  // Check if this is an API request
  const isApiRequest = url.startsWith('/api/');
  
  // Special handling for token conversion API
  const isConvertCreditsRequest = url === '/api/convert-credits';
  
  if (error) {
    console.error('Middleware auth error:', error.message);
  } else {
    console.log('Middleware session check:', session ? `Active session (${session.user.id})` : 'No session', 
      'for path:', url);
  }
  
  // For protected dashboard routes, redirect to login if no session
  // Temporarily bypass auth check for the convert-credits endpoint
  if (!session && 
    (url.startsWith('/dashboard') || 
    (isApiRequest && !url.startsWith('/api/auth') && !isConvertCreditsRequest))) {
    console.log('Middleware: Protected route accessed without session, will handle accordingly');
    
    // For API routes, we don't redirect but let the API handler return 401
    if (!isApiRequest) {
      const redirectUrl = new URL('/login', req.url);
      return NextResponse.redirect(redirectUrl);
    }
  }
  
  return res;
}

// Match all routes including API routes but exclude static assets
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
    '/api/:path*',
  ],
}; 