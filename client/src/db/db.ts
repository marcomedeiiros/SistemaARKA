/**
 * Ponto de entrada histórico da camada de dados.
 *
 * O armazenamento local no navegador (Dexie/IndexedDB) foi substituído pela API
 * em `server/`. Este arquivo mantém o caminho de importação usado pelos módulos
 * e apenas reexporta o acesso baseado na API.
 */
export { db, store, initializeData } from '../data/store';
export type { Snapshot, TableName } from '../data/store';
export { admin, operations } from '../data/operations';
