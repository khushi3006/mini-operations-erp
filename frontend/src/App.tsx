import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { Inventory } from './pages/Inventory';
import { WorkOrders } from './pages/WorkOrders';
import { InternalTransfers } from './pages/InternalTransfers';
import { CustomerOrders } from './pages/CustomerOrders';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('inventory');

  if (!user) return <Login />;

  const renderContent = () => {
    switch (activeTab) {
      case 'inventory':
        return <Inventory />;
      case 'work-orders':
        return <WorkOrders />;
      case 'transfers':
        return <InternalTransfers />;
      case 'orders':
        return <CustomerOrders />;
      default:
        return <Inventory />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
};

export default App;