import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuContent,
  ListItem,
} from '@/components/ui/navigation-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Mail } from 'lucide-react';
import { signIn, useSession } from '@/lib/auth-client';
import { Separator } from '@/components/ui/separator';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { toast } from 'sonner';

const resources = [
  {
    title: 'Yachtbase email',
    href: '/dashboard/email',
    description: 'Open your Yachtbase email workspace.',
  },
  {
    title: 'Yachtbase inbox',
    href: '/dashboard/inbox',
    description: 'Open your Yachtbase inbox and conversations.',
  },
  {
    title: 'Support',
    href: 'mailto:support@yachtbase.co',
    description: 'Contact Yachtbase priority support.',
  },
];

const aboutLinks = [
  {
    title: 'About',
    href: '/about',
    description: 'Learn more about Yachtbase and our mission.',
  },
  {
    title: 'Privacy',
    href: '/privacy',
    description: 'Read our privacy policy and data handling practices.',
  },
  {
    title: 'Terms of Service',
    href: '/terms',
    description: 'Review our terms of service and usage guidelines.',
  },
  {
    title: 'Contributors',
    href: '/contributors',
    description: 'Learn more about the Yachtbase team.',
  },
];

export function Navigation() {
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const navigate = useNavigate();

  return (
    <>
      {/* Desktop Navigation - Hidden on mobile */}
      <header className="fixed left-[50%] z-50 hidden w-full max-w-4xl translate-x-[-50%] items-center justify-center px-4 pt-6 lg:flex">
        <nav className="border-input/50 flex w-full max-w-4xl items-center justify-between gap-2 rounded-xl border-t bg-[#1E1E1E] p-3 px-6">
          <div className="flex items-center gap-6">
            <Link to="/" className="relative bottom-1 cursor-pointer">
              <img src="white-icon.svg" alt="Yachtbase" width={22} height={22} />
              <span className="text-muted-foreground absolute -right-[-0.5px] text-[10px]">
                beta
              </span>
            </Link>
            <NavigationMenu>
              <NavigationMenuList className="gap-1">
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent text-white cursor-pointer">
                    Company
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[300px] gap-3 p-4 md:w-[300px] md:grid-cols-1 lg:w-[400px]">
                      {aboutLinks.map((link) => (
                        <ListItem key={link.title} title={link.title} href={link.href}>
                          {link.description}
                        </ListItem>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent text-white cursor-pointer">
                    Resources
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                      {resources.map((resource) => (
                        <ListItem
                          key={resource.title}
                          title={resource.title}
                          href={resource.href}
                        >
                          {resource.description}
                        </ListItem>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem className="bg-transparent text-white">
                  <Button asChild variant="ghost" className="h-9 bg-transparent cursor-pointer">
                    <a href="/dashboard/settings/billing">Yachtbase plans</a>
                  </Button>
                </NavigationMenuItem>
                <NavigationMenuItem className="bg-transparent text-white cursor-pointer">
                  <a href="/privacy">
                    <Button variant="ghost" className="ml-1 h-9 bg-transparent">
                      Privacy
                    </Button>
                  </a>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>
          <div className="flex gap-2">
            <Button
              className="h-8 bg-white text-black hover:bg-white hover:text-black cursor-pointer"
              onClick={() => {
                if (session) {
                  navigate('/mail/inbox');
                } else {
                  toast.promise(
                    signIn.social({
                      provider: 'google',
                      callbackURL: `${import.meta.env.VITE_PUBLIC_APP_URL}/mail/inbox`,
                    }),
                    {
                      error: 'Login redirect failed',
                    },
                  );
                }
              }}
            >
              Get Started
            </Button>
          </div>
        </nav>
      </header>

      {/* Mobile Navigation Sheet */}
      <div className="lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="fixed left-4 top-6 z-50">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[400px] dark:bg-[#111111]">
            <SheetHeader className="flex flex-row items-center justify-between">
              <SheetTitle>
                <Link to="/" onClick={() => setOpen(false)}>
                  <img
                    src="white-icon.svg"
                    alt="Yachtbase"
                    className="hidden object-contain dark:block"
                    width={22}
                    height={22}
                  />
                  <img
                    src="/black-icon.svg"
                    alt="Yachtbase"
                    className="object-contain dark:hidden"
                    width={22}
                    height={22}
                  />
                </Link>
              </SheetTitle>
            </SheetHeader>
            <div className="mt-8 flex flex-col space-y-3">
              <div className="flex flex-col space-y-3">
                <Link to="/" onClick={() => setOpen(false)}>
                  Home
                </Link>
                <Link to="/dashboard/settings/billing" onClick={() => setOpen(false)}>
                  Yachtbase plans
                </Link>
                {aboutLinks.map((link) => (
                  <a key={link.title} href={link.href} className="block font-medium">
                    {link.title}
                  </a>
                ))}
              </div>
              <a
                target="_blank"
                rel="noreferrer noopener"
                href="mailto:support@yachtbase.co"
                className="font-medium"
              >
                Contact Us
              </a>
            </div>
            <Separator className="mt-8" />
            <div className="mt-8 flex flex-row items-center justify-center gap-4">
              {resources.map((resource) => (
                <Link key={resource.title} to={resource.href} className="flex items-center gap-2 font-medium">
                  <Mail className="h-5 w-5" />
                </Link>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
