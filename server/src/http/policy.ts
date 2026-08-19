import type { UserRole } from '../types.js';

/**
 * Política de autorização de ESCRITA por coleção.
 *
 * Fonte única de verdade, espelhando os módulos de cada perfil. Vale tanto para
 * o CRUD genérico quanto para as operações de negócio, para que não exista um
 * caminho (ex.: /operations) que contorne a trava de outro (o CRUD genérico).
 *
 * Administrador escreve em tudo. Coleção fora do mapa: negada por padrão.
 * Leituras permanecem abertas a qualquer usuário autenticado (o app é de
 * inquilino único e o snapshot já entrega o conjunto todo) o endurecimento
 * aqui é sobre quem pode ALTERAR cada coisa.
 */
const WRITE_POLICY: Record<string, UserRole[]> = {
  // Sensíveis: só administradores.
  users: [],
  companySettings: [],
  suppliers: [],
  stockMovements: [],

  // Compartilhadas / de negócio.
  customers: ['technician', 'financial'],
  products: ['technician'],
  categories: ['technician'],
  services: ['technician'],
  sales: ['technician'],
  serviceOrders: ['technician'],

  // Razão financeiro.
  accountsReceivable: ['financial'],
  accountsPayable: ['financial']
};

/** `true` se o perfil pode escrever na coleção. Admin sempre pode. */
export function canWriteCollection(role: UserRole, collection: string): boolean {
  if (role === 'admin') return true;
  const allowed = WRITE_POLICY[collection];
  return allowed ? allowed.includes(role) : false;
}
