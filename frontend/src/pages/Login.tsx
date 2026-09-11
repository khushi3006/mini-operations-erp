import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertCircle, Shield, Wrench, BadgePercent } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setQuickCredentials = (userEmail: string, pass: string) => {
    setEmail(userEmail);
    setPassword(pass);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex h-12 w-12 rounded-xl bg-indigo-600 items-center justify-center text-white font-bold text-2xl shadow-md mb-2">
          O
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Mini Operations ERP</h2>
        <p className="mt-1 text-sm text-slate-500">Sign in to your role account to continue</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 flex items-center space-x-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="name@erp.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 text-center">
              Quick Role Switcher (Pre-Seeded)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setQuickCredentials('admin@erp.com', 'admin123')}
                className="flex flex-col items-center justify-center p-2 rounded-lg border border-purple-200 bg-purple-50/50 hover:bg-purple-100 text-purple-700 text-xs font-medium transition-colors"
              >
                <Shield className="h-4 w-4 mb-1" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => setQuickCredentials('ops@erp.com', 'ops123')}
                className="flex flex-col items-center justify-center p-2 rounded-lg border border-blue-200 bg-blue-50/50 hover:bg-blue-100 text-blue-700 text-xs font-medium transition-colors"
              >
                <Wrench className="h-4 w-4 mb-1" />
                <span>Operations</span>
              </button>
              <button
                type="button"
                onClick={() => setQuickCredentials('sales@erp.com', 'sales123')}
                className="flex flex-col items-center justify-center p-2 rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium transition-colors"
              >
                <BadgePercent className="h-4 w-4 mb-1" />
                <span>Sales</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};