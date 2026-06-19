import { createClient } from '@supabase/supabase-js';
import { Database } from '../../database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

/**
 * Helper: wraps a Supabase call so it never throws when the service is
 * restricted (egress quota, plan limits, etc.).  Returns null on failure.
 *
 * Usage:
 *   const data = await safeSupa(() => supabase.from("liked_songs").select("*"));
 */
export async function safeSupa<T>(
  fn: () => PromiseLike<{ data: T | null; error: any }>
): Promise<T | null> {
  try {
    const { data, error } = await fn();
    if (error) {
      // Log but don't crash — let the app fall back to localStorage
      console.warn("[Supabase] Query failed (non-fatal):", error.message || error);
      return null;
    }
    return data;
  } catch (err: any) {
    console.warn("[Supabase] Network/service error (non-fatal):", err?.message || err);
    return null;
  }
}
