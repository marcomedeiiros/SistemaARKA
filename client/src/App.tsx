import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import './styles/index.css';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { ToastContainer } from './components/common/ToastContainer';
import { CommandPalette } from './components/common/CommandPalette';
import { VilmarAssistant } from './components/assistant/VilmarAssistant';
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
import { LoginScreen } from './components/auth/LoginScreen';
import { ErpLoadingScreen } from './components/auth/ErpLoadingScreen';
import { useAuth } from './context/AuthContext';
import { store } from './data/store';
import { AUTH_PATHS, MODULE_PATHS, moduleFromPath } from './routes';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, authReady, isEnteringDashboard, setIsEnteringDashboard, isLeaving, finishLogout } =
    useAuth();

  // O módulo ativo agora vem da URL; a navegação apenas troca a rota.
  const activeModule = moduleFromPath(location.pathname);
  const setActiveModule = (module: ActiveModule) => navigate(MODULE_PATHS[module]);

  // Os dados do sistema só são buscados depois de autenticado a rota de
  // snapshot exige token. Antes do login, apenas as telas públicas aparecem.
  const [bootState, setBootState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [bootError, setBootError] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const connect = useCallback(() => {
    setBootState('loading');
    store
      .refresh()
      .then(() => setBootState('ready'))
      .catch((error: unknown) => {
        console.error('Erro ao carregar os dados do servidor:', error);
        setBootError(error instanceof Error ? error.message : String(error));
        setBootState('error');
      });
  }, []);

  // Carrega (ou recarrega) os dados sempre que há um usuário autenticado.
  useEffect(() => {
    if (currentUser) {
      connect();
    } else {
      setBootState('idle');
    }
  }, [currentUser, connect]);

  useEffect(() => {
    const handleCustomSearchOpen = () => setIsSearchOpen(true);
    window.addEventListener('open-command-palette', handleCustomSearchOpen);
    return () => window.removeEventListener('open-command-palette', handleCustomSearchOpen);
  }, []);

  // Enquanto a sessão salva é validada no servidor.
  if (!authReady) {
    return <ErpLoadingScreen message="Verificando sua sessão..." duration={800} />;
  }

  // Transição de saída da conta: mostra a tela (com timer) e só então encerra
  // a sessão de fato, levando o usuário de volta ao login.
  if (isLeaving) {
    return (
      <ErpLoadingScreen
        variant="logout"
        user={currentUser}
        onFinish={finishLogout}
        duration={2200}
      />
    );
  }

  // Dados carregados, mas sem sessão: rotas públicas de login/cadastro.
  if (!currentUser) {
    return (
      <Routes>
        <Route path={AUTH_PATHS.login} element={<LoginScreen mode="login" />} />
        <Route path={AUTH_PATHS.register} element={<LoginScreen mode="register" />} />
        <Route path="*" element={<Navigate to={AUTH_PATHS.login} replace />} />
      </Routes>
    );
  }

  if (bootState === 'loading' || bootState === 'idle') {
    return <ErpLoadingScreen message="Conectando à base de dados do Sistemas Arka ERP..." duration={1200} />;
  }

  if (bootState === 'error') {
    return (
      <div className="boot-screen">
        <div className="boot-card">
          <div className="boot-card-icon">
            <AlertTriangle size={26} />
          </div>
          <h1 className="text-lg font-bold text-[var(--text-main)]">Servidor indisponível</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Não foi possível carregar os dados do Sistemas Arka. Verifique se a API está em
            execução e tente novamente.
          </p>
          <p className="boot-card-hint">
            Na pasta <code>server/</code>, rode <code>npm run dev</code>.
          </p>
          {bootError && <p className="boot-card-detail">{bootError}</p>}
          <button onClick={connect} className="btn btn-primary w-full">
            <RefreshCw size={15} /> Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // Tela de transição / carregamento para o painel executivo após o login
  if (isEnteringDashboard) {
    return (
      <ErpLoadingScreen
        user={currentUser}
        onFinish={() => setIsEnteringDashboard(false)}
        duration={1800}
      />
    );
  }

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
            <Routes>
              <Route path="/" element={<Navigate to={MODULE_PATHS.dashboard} replace />} />
              <Route path={MODULE_PATHS.dashboard} element={<Dashboard />} />
              <Route path={MODULE_PATHS.reports} element={<Reports />} />
              <Route path={MODULE_PATHS.os} element={<ServiceOrders />} />
              <Route path={MODULE_PATHS.sales} element={<Sales />} />
              <Route path={MODULE_PATHS.customers} element={<Customers />} />
              <Route path={MODULE_PATHS.products} element={<Products />} />
              <Route path={MODULE_PATHS.services} element={<Services />} />
              <Route path={MODULE_PATHS.stock} element={<StockMovements />} />
              <Route path={MODULE_PATHS.financial} element={<Financial />} />
              <Route path={MODULE_PATHS.suppliers} element={<Suppliers />} />
              <Route path={MODULE_PATHS.users} element={<Users />} />
              <Route path={MODULE_PATHS.settings} element={<Settings />} />
              <Route path="*" element={<Navigate to={MODULE_PATHS.dashboard} replace />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* Assistente Vilmar: bolinha flutuante que consulta os dados do sistema */}
      <VilmarAssistant onNavigate={setActiveModule} />

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
