import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';

export const createClient = async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const authHeader = headerStore.get('Authorization');
  
  const options: any = {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          // Safe to ignore in server components when middleware updates the session.
        }
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch (error) {
          // Safe to ignore in server components when middleware updates the session.
        }
      },
    },
  };
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    options.global = {
      headers: {
        Authorization: authHeader
      }
    };
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    options
  );
};
