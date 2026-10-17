import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Ticket, LogOut, Plus, Shield, UserCheck, User } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
            <Shield className="w-3 h-3" />
            Admin
          </span>
        );
      case 'agent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
            <UserCheck className="w-3 h-3" />
            Agent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
            <User className="w-3 h-3" />
            Customer
          </span>
        );
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/tickets" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition-colors">
            <Ticket className="w-5 h-5" />
          </div>
          <span className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">
            Support Desk
          </span>
        </Link>

        {/* Actions & Profile */}
        <div className="flex items-center gap-3 sm:gap-5">
          <Link
            to="/tickets/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Ticket</span>
          </Link>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          {/* User profile */}
          <div className="flex items-center gap-2.5">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-800 leading-tight">
                {user?.name}
              </div>
              <div className="mt-0.5">{getRoleBadge(user?.role)}</div>
            </div>
            <div className="sm:hidden">{getRoleBadge(user?.role)}</div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
