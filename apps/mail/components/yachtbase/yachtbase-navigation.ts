import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Calendar,
  CalendarCheck,
  FileText,
  Globe,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Settings,
  Ship,
  Users,
} from 'lucide-react';

export type YachtbaseNavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const YACHTBASE_NAVIGATION: YachtbaseNavigationItem[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/fleet', label: 'Fleet', icon: Ship },
  { href: '/dashboard/bookings', label: 'Bookings', icon: CalendarCheck },
  { href: '/dashboard/calendar', label: 'Calendar', icon: Calendar },
  { href: '/dashboard/documents', label: 'Documents', icon: FileText },
  { href: '/dashboard/clients', label: 'Clients', icon: Users },
  { href: '/dashboard/inbox', label: 'Inbox', icon: MessageSquare },
  { href: '/dashboard/email', label: 'Email', icon: Mail },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/integrations', label: 'Integrations', icon: Globe },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];
