import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { store } from './store';

/**
 * Reexecuta a consulta sempre que os dados em memória mudarem (ou seja, depois
 * de qualquer gravação) e quando alguma dependência informada mudar.
 *
 * Substitui o `useLiveQuery` do dexie-react-hooks mantendo a mesma assinatura,
 * então os módulos não precisaram mudar de forma.
 */
export function useLiveQuery<T>(
  querier: () => T | Promise<T>,
  deps: unknown[] = []
): T | undefined {
  const revision = useSyncExternalStore(
    store.subscribe,
    store.getRevision,
    store.getRevision
  );

  const [result, setResult] = useState<T | undefined>(undefined);

  // A consulta é lida por referência: o chamador normalmente passa uma arrow
  // nova a cada render, e incluí-la nas dependências causaria um laço.
  const querierRef = useRef(querier);
  querierRef.current = querier;

  // As dependências viram uma chave estável, para o array de dependências do
  // useEffect ter tamanho fixo (exigência das regras de hooks do React).
  const depsKey = JSON.stringify(deps ?? []);

  useEffect(() => {
    let active = true;

    Promise.resolve()
      .then(() => querierRef.current())
      .then((value) => {
        if (active) setResult(value);
      })
      .catch((error: unknown) => {
        console.error('[arka] falha ao consultar os dados:', error);
      });

    return () => {
      active = false;
    };
  }, [revision, depsKey]);

  return result;
}
