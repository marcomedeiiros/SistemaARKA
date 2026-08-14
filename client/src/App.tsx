import { useState, useEffect } from 'react';
import './styles/index.css';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { ToastContainer } from './components/common/ToastContainer';
import { CommandPalette } from './components/common/CommandPalette';
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
import { Settings } from './components/settings/Settings';
import { seedDatabase } from './db/seed';

function AppContent() {
  const [activeModule, setActiveModule] = useState<ActiveModule>('dashboard');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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

    const handleCustomSearchOpen = () => setIsSearchOpen(true);
    window.addEventListener('open-command-palette', handleCustomSearchOpen);
    return () => window.removeEventListener('open-command-palette', handleCustomSearchOpen);
  }, []);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-main)]">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-main)] font-semibold text-sm">Carregando Sistemas Arka ERP...</p>
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
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-root bg-[var(--bg-main)]">
      <Sidebar
        active={activeModule}
        onNavigate={setActiveModule}
        mobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />
      <div className="app-shell">
        <Header
          activeModule={activeModule}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onNavigate={setActiveModule}
        />
        <main className="app-main">
          <div className="layout-inner">
            {renderModule()}
          </div>
        </main>
      </div>

      {/* Global Toast Container */}
      <ToastContainer />

      {/* Quick Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={setActiveModule}
      />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
