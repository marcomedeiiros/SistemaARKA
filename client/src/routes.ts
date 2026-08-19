import { ActiveModule } from './components/layout/Sidebar';

/**
 * Caminho de URL de cada módulo. Fonte única de verdade compartilhada entre a
 * navegação (Sidebar, Header, busca rápida) e o roteador. Os nomes das rotas
 * seguem o português usado na interface (ex.: /relatorio, /produtos).
 */
export const MODULE_PATHS: Record<ActiveModule, string> = {
  dashboard: '/dashboard',
  reports: '/relatorio',
  os: '/ordens-servico',
  sales: '/vendas',
  customers: '/clientes',
  products: '/produtos',
  services: '/servicos',
  stock: '/estoque',
  financial: '/financeiro',
  suppliers: '/fornecedores',
  users: '/usuarios',
  settings: '/configuracoes'
};

/** Modo da tela de autenticação. */
export type Mode = 'login' | 'register';

/** Rotas públicas de autenticação (fora do app logado). */
export const AUTH_PATHS: Record<Mode, string> = {
  login: '/login',
  register: '/cadastrar'
};

const PATH_TO_MODULE = new Map<string, ActiveModule>(
  (Object.entries(MODULE_PATHS) as [ActiveModule, string][]).map(([module, path]) => [path, module])
);

/** Módulo correspondente a um pathname; cai no dashboard quando a rota é desconhecida. */
export function moduleFromPath(pathname: string): ActiveModule {
  return PATH_TO_MODULE.get(pathname) ?? 'dashboard';
}
