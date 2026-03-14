import React from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Store, 
  Users as UsersIcon, 
  Truck, 
  FileText, 
  Calculator, 
  BarChart3, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Layout() {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/', show: profile?.role !== 'vendor' },
    { name: 'Outlets', icon: Store, path: '/outlets', show: profile?.role === 'owner' },
    { name: 'Users', icon: UsersIcon, path: '/users', show: profile?.role === 'owner' },
    { name: 'Vendors', icon: Truck, path: '/vendors', show: profile?.role === 'owner' || profile?.role === 'manager' || profile?.permissions?.manage_vendors },
    { name: 'Bills', icon: FileText, path: '/bills', show: profile?.role !== 'vendor' && (profile?.role === 'owner' || profile?.role === 'manager' || profile?.permissions?.upload_bills) },
    { name: 'My Bills', icon: FileText, path: '/bills', show: profile?.role === 'vendor' },
    { name: 'Settlements', icon: Calculator, path: '/settlements', show: profile?.role === 'owner' || profile?.role === 'manager' || profile?.permissions?.view_settlements },
    { name: 'Reports', icon: BarChart3, path: '/reports', show: profile?.role === 'owner' || profile?.role === 'manager' },
  ];

  return (
    <div className="flex h-screen bg-stone-100 font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-stone-900 text-stone-300">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-white tracking-tight">Kapi Coast</h1>
          <p className="text-xs text-stone-500 mt-1 uppercase tracking-widest">Business Management</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {menuItems.filter(item => item.show).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors",
                location.pathname === item.path 
                  ? "bg-white/10 text-white" 
                  : "hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center px-4 py-3 mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile?.name}</p>
              <p className="text-xs text-stone-500 truncate capitalize">{profile?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-stone-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-stone-200">
          <h1 className="text-xl font-bold text-stone-900">Kapi Coast</h1>
          <button onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="w-6 h-6 text-stone-600" />
          </button>
        </header>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
            <aside className="fixed inset-y-0 left-0 w-64 bg-stone-900 text-stone-300 flex flex-col">
              <div className="p-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">Kapi Coast</h1>
                <button onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
              <nav className="flex-1 px-4 space-y-1">
                {menuItems.filter(item => item.show).map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors",
                      location.pathname === item.path 
                        ? "bg-white/10 text-white" 
                        : "hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                ))}
              </nav>
              <div className="p-4 border-t border-white/10">
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-3 text-sm font-medium text-stone-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Logout
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
