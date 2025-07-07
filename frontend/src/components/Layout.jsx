import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useTheme } from './ThemeProvider';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard,
  CheckSquare,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  Sun,
  Moon,
  Brain,
  Plus,
  Bell,
  RefreshCw,
  Calendar as CalendarIcon,
} from 'lucide-react';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Tasks',
    href: '/tasks',
    icon: CheckSquare,
  },
  {
    name: 'Calendar',
    href: '/calendar',
    icon: CalendarIcon,
  },
  {
    name: 'Context Input',
    href: '/context',
    icon: MessageSquare,
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

const Sidebar = ({ className = '' }) => {
  const location = useLocation();

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-4 border-b">
        <Brain className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Smart Todo</h1>
          <p className="text-xs text-muted-foreground">AI-Powered Tasks</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b">
        <Button asChild className="w-full">
          <Link to="/tasks/new">
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Link>
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};

const Header = () => {
  const { user, logout, loading: authLoading, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshingProfile, setRefreshingProfile] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const handleRefreshProfile = async () => {
    setRefreshingProfile(true);
    try {
      await refreshProfile();
    } finally {
      setRefreshingProfile(false);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 lg:px-6">
        {/* Mobile menu button */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <Sidebar />
          </SheetContent>
        </Sheet>

        {/* Logo for mobile */}
        <div className="flex items-center gap-2 lg:hidden ml-2">
          <Brain className="h-6 w-6 text-primary" />
          <span className="font-bold">Smart Todo</span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Header actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <Button variant="ghost" size="icon">
            <Bell className="h-4 w-4" />
          </Button>

          {/* Theme toggle */}
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === 'light' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  {authLoading || refreshingProfile ? (
                    <AvatarFallback className="animate-pulse">
                      <span className="sr-only">Loading</span>
                    </AvatarFallback>
                  ) : (
                    <>
                      <AvatarImage 
                        src={user?.profile_image || user?.avatar || ''} 
                        alt={user?.displayName || user?.username || 'User'} 
                      />
                      <AvatarFallback>
                        {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 
                         user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                      </AvatarFallback>
                    </>
                  )}
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              {authLoading || refreshingProfile ? (
                <div className="py-4 text-center">
                  <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <p className="text-xs text-muted-foreground mt-2">Loading profile...</p>
                </div>
              ) : (
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.displayName || user?.username || 'User'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email || ''}
                    </p>
                  </div>
                </DropdownMenuLabel>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleRefreshProfile} disabled={authLoading || refreshingProfile}>
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshingProfile ? 'animate-spin' : ''}`} />
                Refresh Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

const Layout = () => {
  return (
    <div className="flex h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r">
        <Sidebar />
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;

