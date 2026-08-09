import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Exclude public static files, assets, and unauthenticated auth routes
  if (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/invite/') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const cookieHeader = request.headers.get('cookie') || '';
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  try {
    // 2. Fetch session data from the API gateway
    const sessionRes = await fetch(`${apiBaseUrl}/api/auth/get-session`, {
      headers: { Cookie: cookieHeader },
    });

    if (!sessionRes.ok) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const sessionData = await sessionRes.json();
    if (!sessionData || !sessionData.session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // 3. Handle root path "/" redirection to last-used active org slug or fallback
    if (pathname === '/') {
      const orgsRes = await fetch(`${apiBaseUrl}/api/auth/organization/list`, {
        headers: { Cookie: cookieHeader },
      });
      
      if (orgsRes.ok) {
        const orgs = await orgsRes.json();
        if (orgs && orgs.length > 0) {
          const activeOrgId = sessionData.session.activeOrganizationId;
          const activeOrg = orgs.find((o: any) => o.id === activeOrgId);
          if (activeOrg) {
            return NextResponse.redirect(new URL(`/${activeOrg.slug}`, request.url));
          }

          // Fallback to PERSONAL organization first
          const personalOrg = orgs.find((o: any) => o.kind === 'PERSONAL');
          if (personalOrg) {
            return NextResponse.redirect(new URL(`/${personalOrg.slug}`, request.url));
          }

          // Fallback to the first organization in the list
          return NextResponse.redirect(new URL(`/${orgs[0].slug}`, request.url));
        }
      }
      
      // If user has no organization memberships, let them proceed (a default personal org will be created on login hooks or settings)
      return NextResponse.next();
    }

    // 4. Extract orgSlug from /[orgSlug]/...
    const pathParts = pathname.split('/').filter(Boolean);
    const orgSlug = pathParts[0];

    if (orgSlug) {
      const orgsRes = await fetch(`${apiBaseUrl}/api/auth/organization/list`, {
        headers: { Cookie: cookieHeader },
      });

      if (!orgsRes.ok) {
        // Return 404 Not Found to prevent org Slug enumeration (slugs must not be enumerable)
        return new NextResponse('Not Found', { status: 404 });
      }

      const orgs = await orgsRes.json();
      const hasMembership = orgs.some((org: any) => org.slug === orgSlug);

      if (!hasMembership) {
        // Safe 404 boundaries for unauthorized scope requests
        return new NextResponse('Not Found', { status: 404 });
      }
    }
  } catch (error) {
    console.error('Middleware network authentication check failed:', error);
    // If backend is waking up or throws error, proceed to render page where client-side API will show loading skeleton
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
