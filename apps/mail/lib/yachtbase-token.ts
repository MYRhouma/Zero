type SessionPayload = {
  token: string;
};

// Assertions are valid for 30s; reuse one briefly instead of fetching per request.
const REUSE_MS = 20_000;

let cached: { token: string; at: number } | null = null;
let inFlight: Promise<string | null> | null = null;

/** Get a short-lived Yachtbase assertion; never persist it in browser storage. */
export async function getYachtbaseMailToken(): Promise<string | null> {
  if (cached && Date.now() - cached.at < REUSE_MS) return cached.token;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const apiUrl = import.meta.env.VITE_PUBLIC_YACHTBASE_API_URL;
      if (!apiUrl) return null;
      const startedAt = Date.now();
      const response = await fetch(`${apiUrl}/integrations/email-workspace/session/`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!response.ok) {
        cached = null;
        return null;
      }
      const data = (await response.json()) as SessionPayload;
      if (!data.token) return null;
      cached = { token: data.token, at: startedAt };
      return data.token;
    } catch {
      return null;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}
