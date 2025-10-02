import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Home,
  Utensils,
  Droplets,
  Weight,
  Pill,
  MessageCircle,
  LogOut,
  Heart,
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout(props: LayoutProps) {
  const location = useLocation();
  const auth = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/nutrition', label: 'Nutrition', icon: Utensils },
    { path: '/water', label: 'Water', icon: Droplets },
    { path: '/weight', label: 'Weight', icon: Weight },
    { path: '/supplements', label: 'Supplements', icon: Pill },
    { path: '/assistant', label: 'AI Assistant', icon: MessageCircle },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
      <nav className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" fill="white" />
              </div>
              <span className="text-xl font-bold text-gray-900">BariTech</span>
            </Link>

            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                const activeClass = isActive ? 'bg-teal-100 text-teal-700 font-semibold' : 'text-gray-600 hover:bg-gray-100';
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={"flex items-center space-x-2 px-4 py-2 rounded-lg transition-all " + activeClass}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{props.children}</main>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex justify-around items-center h-16">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const textColor = isActive ? 'text-teal-600' : 'text-gray-600';
            return (
              <Link
                key={item.path}
                to={item.path}
                className={"flex flex-col items-center justify-center flex-1 h-full " + textColor}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
