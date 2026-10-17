import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Ticket as TicketIcon, User as UserIcon } from 'lucide-react';

export const TicketsPlaceholderPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <TicketIcon className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-900 text-lg">Support Ticket System</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-slate-900">{user?.name}</div>
                <div className="text-[11px] text-slate-500 capitalize">{user?.role}</div>
              </div>
            </div>

            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-slate-500" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Welcome, {user?.name}!</h2>
          <p className="text-sm text-slate-600 mb-4">
            You are signed in as an authenticated <strong className="capitalize">{user?.role}</strong> ({user?.email}).
          </p>
          <div className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200">
            Phase 3: Login & Register pages successfully authenticated.
          </div>
        </div>
      </main>
    </div>
  );
};
