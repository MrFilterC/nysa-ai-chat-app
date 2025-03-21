import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  console.log('Middleware processing request for path:', req.nextUrl.pathname);
  
  try {
    // Refresh session if needed
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error in auth middleware:', error.message);
    }
    
    // Log auth status for debugging (path and session presence)
    console.log(`Auth middleware path: ${req.nextUrl.pathname} - Session exists: ${!!session}`);
    
    // If we're on an authenticated route and no session, redirect to login
    const authenticatedRoutes = ['/dashboard', '/profile', '/chat'];
    const isAuthRoute = authenticatedRoutes.some(route => 
      req.nextUrl.pathname.startsWith(route)
    );
    
    if (isAuthRoute && !session) {
      console.log('Redirecting unauthenticated user to login from', req.nextUrl.pathname);
      
      // Store the original URL to redirect back after login
      const redirectUrl = new URL('/login', req.url);
      redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname);
      
      return NextResponse.redirect(redirectUrl);
    }
    
    // If we're on login/register and have session, redirect to dashboard
    const authPages = ['/login', '/register'];
    const isAuthPage = authPages.some(page => req.nextUrl.pathname === page);
    
    if (isAuthPage && session) {
      console.log('Redirecting authenticated user to dashboard from', req.nextUrl.pathname);
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