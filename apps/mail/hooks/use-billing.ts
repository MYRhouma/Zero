import { useQuery } from '@tanstack/react-query';

type FeatureState = {
  total: number;
  remaining: number;
  unlimited: boolean;
  enabled: boolean;
  usage: number;
  nextResetAt: number | null;
  interval: string;
  included_usage: number;
};

type YachtbaseEmailAccess = {
  enabled: boolean;
  plan: string;
  source: string;
  access_state: string;
};

type Features = {
  chatMessages: FeatureState;
  connections: FeatureState;
  brainActivity: FeatureState;
};

const createFeature = (enabled: boolean, unlimited = false): FeatureState => ({
  total: unlimited && enabled ? -1 : 0,
  remaining: 0,
  unlimited: unlimited && enabled,
  enabled,
  usage: 0,
  nextResetAt: null,
  interval: '',
  included_usage: unlimited && enabled ? -1 : 0,
});

const getYachtbaseApiBaseUrl = () => {
  const configured = import.meta.env.VITE_PUBLIC_YACHTBASE_API_URL;
  if (configured) return configured.replace(/\/+$/, '');

  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'app.yachtbase.co') {
      return 'https://api.yachtbase.co/api/v1';
    }
    if (window.location.hostname === 'dev.yachtbase.co') {
      return 'https://api-dev.yachtbase.co/api/v1';
    }
  }

  return 'http://localhost:8000/api/v1';
};

const getEmailAccessUrl = () => `${getYachtbaseApiBaseUrl()}/payments/email-access/`;

/**
 * Yachtbase owns billing for the embedded mail workspace. This adapter keeps
 * the existing mail UI contract while sourcing entitlements from Yachtbase's
 * authenticated subscription endpoint instead of the legacy mail billing service.
 */
export const useBilling = () => {
  const { data, refetch, isLoading } = useQuery({
    queryKey: ['yachtbase-email-access'],
    queryFn: async () => {
      const response = await fetch(getEmailAccessUrl(), {
        credentials: 'include',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Unable to load Yachtbase email access (${response.status})`);
      }

      return (await response.json()) as YachtbaseEmailAccess;
    },
    staleTime: 60_000,
    retry: false,
  });

  const enabled = data?.enabled === true;
  const features: Features = {
    chatMessages: createFeature(enabled, true),
    connections: createFeature(enabled, true),
    brainActivity: createFeature(enabled),
  };

  return {
    isLoading,
    customer: null,
    refetch,
    // Yachtbase is the sole billing source for this embedded experience.
    attach: undefined,
    track: async () => undefined,
    openBillingPortal: () => {
      if (typeof window !== 'undefined') {
        window.location.assign('/dashboard/settings/billing');
      }
    },
    isPro: enabled,
    plan: data?.plan ?? null,
    ...features,
  };
};
