import { createBrowserClient } from '@supabase/ssr';

/**
 * Returns a Supabase client for use in Client Components.
 *
 * `createBrowserClient` automatically reads/writes the session via
 * `document.cookie` — no custom cookie adapter is needed here.
 *
 * The `isSingleton: true` option prevents multiple GoTrueClient instances from
 * being created during React hot-module replacement in development.
 *
 * Usage:
 * ```ts
 * import { createClient } from '@/lib/supabase/client';
 * const supabase = createClient();
 * const { data } = await supabase.from('applications').select();
 * ```
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { isSingleton: true }
  );
}
