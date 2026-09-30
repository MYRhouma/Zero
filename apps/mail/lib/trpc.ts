import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@zero/server/trpc';
import superjson from 'superjson';
import { getYachtbaseMailToken } from './yachtbase-token';

const getUrl = () => import.meta.env.VITE_PUBLIC_BACKEND_URL + '/api/trpc';

export const api = createTRPCClient<AppRouter>({
    links: [
        httpBatchLink({
            maxItems: 1,
            url: getUrl(),
            transformer: superjson,
            fetch: async (url, options) => {
                const token = await getYachtbaseMailToken();
                const headers = new Headers(options?.headers);
                if (token) headers.set('Authorization', `Bearer ${token}`);
                return fetch(url, { ...options, headers, credentials: 'include' }).then((res) => {
                    if (typeof window !== 'undefined') {
                        const currentPath = new URL(window.location.href).pathname;
                        const redirectPath = res.headers.get('X-Zero-Redirect');
                        if (!!redirectPath && redirectPath !== currentPath) {
                            window.location.href = redirectPath;
                            res.headers.delete('X-Zero-Redirect');
                        }
                    }
                    return res;
                });
            },
        }),
    ],
}); 
