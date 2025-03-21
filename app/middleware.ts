import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextRequest, NextResponse } from 'next/server';

// Acil durumlar için API doğrulama kontrolleri devre dışı
const BYPASS_API_AUTH = true; // Geçici çözüm - normale dönünce FALSE yapılmalı

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
  
  try {
    // Refresh the session to ensure it's valid
    const { data: { session }, error } = await supabase.auth.getSession();
    
    // Check if this is an API request
    const isApiRequest = url.startsWith('/api/');
    
    if (error) {
      console.error('Middleware auth error:', error.message);
    } else {
      console.log('Middleware session check:', session ? `Active session (${session.user.id})` : 'No session', 
        'for path:', url);
    }
    
    // Geçici çözüm: API istekleri için doğrulama kontrolünü atla
    if (isApiRequest && BYPASS_API_AUTH) {
      console.log('API request auth check bypassed due to BYPASS_API_AUTH setting');
      // API isteklerini doğrulama yapmadan geçir
      return res;
    }
    
    // For protected dashboard routes, redirect to login if no session
    if (!session && 
      (url.startsWith('/dashboard') || 
      (isApiRequest && !url.startsWith('/api/auth')))) {
      console.log('Middleware: Protected route accessed without session, handling accordingly');
      
      // For API routes, let the API handler return 401 (API rotaları için doğrulama rotanın kendisinde yapılacak)
      if (isApiRequest) {
        return res;
      }
      
      // For browser routes, redirect to login
      const redirectUrl = new URL('/login', req.url);
      // Store the original URL to redirect back after login
      redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
    
    // If we're on login/register and have session, redirect to dashboard
    const authPages = ['/login', '/register'];
    const isAuthPage = authPages.some(page => url === page);
    
    if (isAuthPage && session) {
      console.log('Middleware: Auth page accessed with session, redirecting to dashboard');
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  } catch (e) {
    console.error('Middleware exception:', e);
  }
  
  return res;
}

// Match all routes except static files and api routes
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};