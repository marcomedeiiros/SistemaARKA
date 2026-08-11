import { useState, useEffect } from 'react';
import './styles/index.css';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar, ActiveModule } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './components/dashboard/Dashboard';
import { Customers } from './components/customers/Customers';
import { ServiceOrders } from './components/os/ServiceOrders';
import { Sales } from './components/sales/Sales';
import { Products } from './components/products/Products';
import { Services } from './components/services/Services';
import { StockMovements } from './components/stock/StockMovements';
import { Financial } from './components/financial/Financial';
import { Suppliers } from './components/suppliers/Suppliers';
import { Reports } from './components/reports/Reports';
import { Users } from './components/users/Users';
import { seedDatabase } from './db/seed';

function AppContent() {
  const [activeModule, setActiveModule] = useState<ActiveModule>('dashboard');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        await seedDatabase();
        setIsInitialized(true);
      } catch (error) {
        console.error('Erro ao inicializar banco de dados:', error);
        setIsInitialized(true); // Continue mesmo se houver erro
      }
    }
    init();
  }, []);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-main)]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--text-main)] font-medium">Carregando Sistema Arka...</p>
        </div>
      </div>
    );
  }

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <Dashboard />;
      case 'customers':
        return <Customers />;
      case 'os':
        return <ServiceOrders />;
      case 'sales':
        return <Sales />;
      case 'products':
        return <Products />;
      case 'services':
        return <Services />;
      case 'stock':
        return <StockMovements />;
      case 'financial':
        return <Financial />;
      case 'suppliers':
        return <Suppliers />;
      case 'reports':
        return <Reports />;
      case 'users':
        return <Users />;
      case 'settings':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-[var(--text-main)] mb-4">Configurações</h2>
            <p className="text-[var(--text-muted)]">Módulo em desenvolvimento...</p>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg-main)]">
      <Sidebar active={activeModule} onNavigate={setActiveModule} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header activeModule={activeModule} />
        <main className="flex-1 overflow-auto">
          {renderModule()}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
