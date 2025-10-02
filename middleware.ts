import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthenticated = !!token;
  const isAuthPage = request.nextUrl.pathname.startsWith("/auth");
  const isOnboardingPage = request.nextUrl.pathname.startsWith("/onboarding");
  const isHomePage = request.nextUrl.pathname === "/";
  const isApiRoute = request.nextUrl.pathname.startsWith("/api");

  // Skip onboarding check for API routes
  if (isApiRoute) {
    return NextResponse.next();
  }

  // Redirect authenticated users from auth pages to home
  if (isAuthPage && isAuthenticated && request.nextUrl.pathname !== "/auth/callback") {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  // Redirect unauthenticated users from home to login
  if (isHomePage && !isAuthenticated) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Check onboarding status for authenticated users
  if (isAuthenticated && !isOnboardingPage && !isAuthPage) {
    try {
      const userId = token.userId as string;

      // Fetch onboarding status from Supabase
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users_profiles?id=eq.${userId}&select=onboarding_completed`,
        {
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const profile = data[0];

        // Redirect to onboarding if not completed
        if (profile && !profile.onboarding_completed) {
          return NextResponse.redirect(new URL("/onboarding", request.url));
        }
      }
    } catch (error) {
      console.error('[Middleware] Error checking onboarding status:', error);
      // Continue to page on error - don't block user
    }
  }

  // Redirect onboarded users away from onboarding pages
  if (isAuthenticated && isOnboardingPage) {
    try {
      const userId = token.userId as string;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users_profiles?id=eq.${userId}&select=onboarding_completed`,
        {
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const profile = data[0];

        // Redirect to home if already onboarded
        if (profile && profile.onboarding_completed) {
          return NextResponse.redirect(new URL("/home", request.url));
        }
      }
    } catch (error) {
      console.error('[Middleware] Error checking onboarding status:', error);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
