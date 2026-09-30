import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { useBilling } from '@/hooks/use-billing';
import { emailProviders } from '@/lib/constants';
import { authClient } from '@/lib/auth-client';
import { Plus, UserPlus } from 'lucide-react';
import { useLocation } from 'react-router';
import { m } from '@/paraglide/messages';
import { motion } from 'motion/react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

export const AddConnectionDialog = ({
  children,
  className,
  onOpenChange,
}: {
  children?: React.ReactNode;
  className?: string;
  onOpenChange?: (open: boolean) => void;
}) => {
  const { connections, isLoading, openBillingPortal } = useBilling();

  const canCreateConnection = useMemo(() => {
    if (isLoading) return false;
    if (!connections?.remaining && !connections?.unlimited) return false;
    return (connections?.unlimited && !connections?.remaining) || (connections?.remaining ?? 0) > 0;
  }, [connections, isLoading]);
  const pathname = useLocation().pathname;

  const handleManagePlan = () => {
    openBillingPortal();
  };

  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button
            size={'dropdownItem'}
            variant={'dropdownItem'}
            className={cn('w-full justify-start gap-2', className)}
          >
            <UserPlus size={16} strokeWidth={2} className="opacity-60" aria-hidden="true" />
            <p className="text-[13px] opacity-60">{m['pages.settings.connections.addEmail']()}</p>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent showOverlay={true}>
        <DialogHeader>
          <DialogTitle>{m['pages.settings.connections.connectEmail']()}</DialogTitle>
          <DialogDescription>
            {m['pages.settings.connections.connectEmailDescription']()}
          </DialogDescription>
        </DialogHeader>
        {!isLoading && !canCreateConnection && (
          <div className="mt-2 flex justify-between gap-2 rounded-lg border border-red-800 bg-red-800/20 p-2">
            <span className="text-sm">
              Email connections require an active Yachtbase plan.{' '}
              <span
                onClick={handleManagePlan}
                className="hover:bg-subtleWhite hover:text-subtleBlack cursor-pointer underline"
              >
                View Yachtbase billing
              </span>{' '}
              to manage access.
            </span>
            <Button onClick={handleManagePlan} className="text-sm">
              Billing
            </Button>
          </div>
        )}
        <motion.div
          className="mt-4 grid grid-cols-2 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {emailProviders.map((provider, index) => {
            const Icon = provider.icon;
            return (
              <motion.div
                key={provider.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Button
                  disabled={isLoading || !canCreateConnection}
                  variant="outline"
                  className="h-24 w-full flex-col items-center justify-center gap-2"
                  onClick={async () =>
                    await authClient.linkSocial({
                      provider: provider.providerId,
                      callbackURL: `${window.location.origin}${pathname}`,
                    })
                  }
                >
                  <Icon className="size-6!" />
                  <span className="text-xs">{provider.name}</span>
                </Button>
              </motion.div>
            );
          })}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: emailProviders.length * 0.1, duration: 0.3 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Button
              variant="outline"
              className="h-24 w-full flex-col items-center justify-center gap-2 border-dashed"
            >
              <Plus className="h-12 w-12" />
              <span className="text-xs">{m['pages.settings.connections.moreComingSoon']()}</span>
            </Button>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
