import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  try {
    // Create a response object
    const res = NextResponse.next();
    
    // Log the request details
    const url = req.nextUrl.pathname;
    const method = req.method;
    console.log(`Middleware processing ${method} request to ${url}`);
    
    // Debug headers
    const hasCookie = req.headers.has('cookie');
    console.log("Cookies present:", hasCookie ? 'Yes' : 'No');
    
    // Log authorization header (if exists) without exposing the actual token
    const hasAuthHeader = req.headers.has('authorization');
    console.log("Authorization header present:", hasAuthHeader ? 'Yes' : 'No');
    
    // Create a Supabase client with the middleware configuration
    const supabase = createMiddlewareClient({ req, res });
    
    // Refresh the session to ensure it's valid
    const { data: { session }, error } = await supabase.auth.getSession();
    
    // Check if this is an API request
    const isApiRequest = url.startsWith('/api/');
    const isAuthRequest = url.startsWith('/api/auth');
    
    if (error) {
      console.error('Middleware auth error:', error.message);
    } else {
      console.log(
        'Middleware session check:', 
        session ? `Active session (${session.user.id})` : 'No session', 
        'for path:', url
      );
    }
    
    // Set auth info in headers for downstream processing
    if (session) {
      res.headers.set('X-User-Id', session.user.id);
      res.headers.set('X-Auth-Status', 'authenticated');
    } else {
      res.headers.set('X-Auth-Status', 'unauthenticated');
    }
    
    // For protected dashboard routes, redirect to login if no session
    if (!session && url.startsWith('/dashboard')) {
      console.log('Middleware: Protected dashboard route accessed without session, redirecting to login');
      
      // For browser routes, redirect to login with return path
      const redirectUrl = new URL('/login', req.url);
      // Store the original URL to redirect back after login
      redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
    
    // For API routes other than auth routes, let the API route handle authentication
    // We pass the request through but with auth status headers set
    if (isApiRequest && !isAuthRequest) {
      console.log(`API request to ${url}, forwarding with auth status headers`);
      return res;
    }
    
    // If we're on login/register and have session, redirect to dashboard
    const authPages = ['/login', '/register'];
    const isAuthPage = authPages.some(page => url === page);
    
    if (isAuthPage && session) {
      console.log('Middleware: Auth page accessed with valid session, redirecting to dashboard');
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    
    return res;
  } catch (e) {
    console.error('Middleware exception:', e);
    // In case of error, continue the request to avoid blocking the user
    return NextResponse.next();
  }
}

// Match all routes except static files
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};