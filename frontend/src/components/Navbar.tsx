import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Boxes, 
  ClipboardList, 
  ArrowLeftRight, 
  ShoppingCart, 
  LogOut, 
  User as UserIcon 
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();

  const roleBadgeColor = {
    ADMIN: 'bg-purple-100 text-purple-700 border-purple-200',
    OPERATIONS: 'bg-blue-100 text-blue-700 border-blue-200',
    SALES: 'bg-emerald-100 text-emerald-700 border-emerald-200'
  };

  const navItems = [
    { id: 'inventory', label: 'Inventory', icon: Boxes, roles: ['ADMIN', 'OPERATIONS', 'SALES'] },
    { id: 'work-orders', label: 'Work Orders', icon: ClipboardList, roles: ['ADMIN', 'OPERATIONS'] },
    { id: 'transfers', label: 'Internal Transfers', icon: ArrowLeftRight, roles: ['ADMIN', 'OPERATIONS'] },
    { id: 'orders', label: 'Customer Orders', icon: ShoppingCart, roles: ['ADMIN', 'SALES'] }
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                O
              </div>
              <span className="font-bold text-slate-800 text-lg tracking-tight">Mini Operations ERP</span>
            </div>

            <nav className="hidden md:flex space-x-1">
              {navItems
                .filter((item) => user && item.roles.includes(user.role))
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {user && (
              <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                <UserIcon className="h-4 w-4 text-slate-500" />
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-800 leading-tight">{user.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium inline-block border mt-0.5 ${roleBadgeColor[user.role]}`}>
                    {user.role}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={logout}
              title="Logout"
              className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};