import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Returns a Supabase client for use in Server Components, Server Functions
 * (Server Actions), and Route Handlers.
 *
 * **Important:**
 * - Call this function once per request — never share a client across requests.
 * - `cookies()` is async in Next.js 15+ and must be awaited.
 * - `setAll` is provided so that session token refreshes are written back to
 *   the response cookie jar automatically. Without it, auth state changes
 *   (token refreshes, sign-in, sign-out) would be silently lost.
 * - Always call `await supabase.auth.getClaims()` (or `getUser()`) early in
 *   your handler before generating any response, to ensure a token refresh
 *   completes before the response is committed.
 *
 * Usage in a Server Component:
 * ```ts
 * import { createClient } from '@/lib/supabase/server';
 * const supabase = await createClient();
 * const { data } = await supabase.from('applications').select();
 * ```
 *
 * Usage in a Server Action / Route Handler:
 * ```ts
 * 'use server';
 * import { createClient } from '@/lib/supabase/server';
 * export async function myAction() {
 *   const supabase = await createClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 * }
 * ```
 */
export async function createClient() {
  // cookies() is async in Next.js 16 — must be awaited
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        /**
         * Read all cookies from the incoming request.
         * Return value must be { name, value }[] per the @supabase/ssr API.
         */
        getAll() {
          return cookieStore.getAll();
        },
        /**
         * Write cookies to the outgoing response after a token refresh or
         * auth-state change.
         *
         * Note: In pure Server Components (not Server Actions or Route
         * Handlers), `cookieStore.set()` will throw because the render is
         * already committed. The try/catch here swallows that gracefully.
         * A Next.js Middleware should handle session refreshes for page routes
         * to avoid this limitation.
         */
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Silently ignore — happens in Server Components where cookie
            // mutations are not permitted. Session refresh is handled by middleware.
          }
        },
      },
    }
  );
}
