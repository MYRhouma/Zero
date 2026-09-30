import { phoneNumberClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import type { Auth } from '@zero/server/auth';
import { getYachtbaseMailToken } from './yachtbase-token';

export const authClient = createAuthClient({
  baseURL: `${import.meta.env.VITE_PUBLIC_BACKEND_URL}/api/auth`,
  fetchOptions: {
    credentials: 'include',
    // Members signed in to Yachtbase are identified by its short-lived session.
    async onRequest(context) {
      const token = await getYachtbaseMailToken();
      if (token) context.headers.set('Authorization', `Bearer ${token}`);
      return context;
    },
  },
  plugins: [phoneNumberClient()],
});

export const { signIn, signUp, signOut, useSession, getSession, $fetch } = authClient;
export type Session = Awaited<ReturnType<Auth['api']['getSession']>>;
