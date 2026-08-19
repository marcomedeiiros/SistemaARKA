/**
 * Motor de conversa do assistente "Vilmar".
 *
 * Interpreta perguntas em português e responde consultando o retrato dos dados
 * que já vem do back-end (produtos, estoque, vendas, OS, financeiro). A lógica é
 * baseada em intenções e roda 100% no navegador não depende de nenhum serviço
 * de IA externo, então funciona offline e sem chave de API.
 *
 * O ponto de entrada é `answerQuestion(pergunta, dados)`. Todo o resto são
 * auxiliares de interpretação e formatação.
 */

import type { ActiveModule } from '../layout/Sidebar';
import type {
  AccountReceivable,
  Customer,
  Product,
  ProductCategory,
  Sale,
  ServiceOrder,
  Supplier
} from '../../types';

/** Conjunto de dados que o assistente consulta para responder. */
export interface AssistantData {
  products: Product[];
  categories: ProductCategory[];
  suppliers: Supplier[];
  customers: Customer[];
  sales: Sale[];
  serviceOrders: ServiceOrder[];
  accountsReceivable: AccountReceivable[];
}

/** Um item de lista exibido junto da resposta (produto, OS, título etc.). */
export interface AnswerItem {
  title: string;
  subtitle?: string;
  /** Etiqueta curta à direita (ex.: quantidade em estoque, valor). */
  badge?: string;
  /** Cor da etiqueta: define o tom (perigo para falta, alerta para baixo). */
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

/** Resposta estruturada devolvida pelo motor. */
export interface AssistantAnswer {
  text: string;
  items?: AnswerItem[];
  /** Módulo sugerido, exibido como botão "Abrir …" abaixo da resposta. */
  module?: ActiveModule;
  moduleLabel?: string;
}

/* ────────────────────────── Auxiliares ────────────────────────── */

/** Remove acentos e baixa a caixa, para comparar texto sem tropeçar em acento. */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Verifica se algum dos termos aparece no texto já normalizado. */
function has(text: string, ...terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

function money(value: number): string {
  return currency.format(Number.isFinite(value) ? value : 0);
}

/** Palavras muito comuns que não ajudam a localizar um produto. */
const STOP_WORDS = new Set([
  'qual',
  'quais',
  'quanto',
  'quantos',
  'quantas',
  'tem',
  'temos',
  'esta',
  'estao',
  'de',
  'do',
  'da',
  'dos',
  'das',
  'em',
  'no',
  'na',
  'para',
  'pra',
  'com',
  'sem',
  'o',
  'a',
  'os',
  'as',
  'um',
  'uma',
  'me',
  'meu',
  'minha',
  'estoque',
  'produto',
  'produtos',
  'preco',
  'valor',
  'custa',
  'sobre',
  'ainda',
  'que',
  'qtd',
  'quantidade',
  'saldo',
  'disponivel',
  'disponiveis',
  'falta',
  'faltando',
  'e',
  'ou',
  'por',
  'favor',
  'vilmar'
]);

/** Extrai termos úteis (>= 3 letras, fora da lista de parada) da pergunta. */
function keywords(normalized: string): string[] {
  return normalized
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
}

const isOutOfStock = (p: Product) => p.currentStock <= 0;
const isLowStock = (p: Product) => p.currentStock > 0 && p.currentStock <= p.minStock;

function activeProducts(data: AssistantData): Product[] {
  return data.products.filter((p) => p.active !== false);
}

/** Monta o subtítulo padrão de um produto (SKU + preço). */
function productSubtitle(p: Product): string {
  return `SKU ${p.sku || 'N/I'} · ${money(p.salePrice)}`;
}

/** Localiza produtos pela busca livre em nome, SKU e código de barras. */
function findProducts(data: AssistantData, terms: string[]): Product[] {
  if (terms.length === 0) return [];

  const scored = data.products
    .map((product) => {
      const haystack = normalize(
        `${product.name} ${product.sku} ${product.barcode ?? ''} ${product.brand ?? ''}`
      );
      const score = terms.reduce((total, term) => (haystack.includes(term) ? total + 1 : total), 0);
      return { product, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((entry) => entry.product);
}

/* ────────────────────────── Intenções ────────────────────────── */

function answerOutOfStock(data: AssistantData): AssistantAnswer {
  const missing = activeProducts(data).filter(isOutOfStock);

  if (missing.length === 0) {
    return {
      text: 'Boa notícia! Nenhum produto ativo está zerado no estoque no momento. 🎉'
    };
  }

  return {
    text: `Encontrei ${missing.length} produto(s) em falta (estoque zerado):`,
    items: missing.slice(0, 12).map((p) => ({
      title: p.name,
      subtitle: productSubtitle(p),
      badge: `${p.currentStock} un`,
      tone: 'danger'
    })),
    module: 'products',
    moduleLabel: 'Ver produtos'
  };
}

function answerLowStock(data: AssistantData): AssistantAnswer {
  const low = activeProducts(data)
    .filter(isLowStock)
    .sort((a, b) => a.currentStock - b.currentStock);

  if (low.length === 0) {
    return {
      text: 'Nenhum produto ativo está abaixo do estoque mínimo. Tudo sob controle. 👍'
    };
  }

  return {
    text: `Há ${low.length} produto(s) com estoque baixo (no mínimo ou abaixo dele):`,
    items: low.slice(0, 12).map((p) => ({
      title: p.name,
      subtitle: `${productSubtitle(p)} · mínimo ${p.minStock}`,
      badge: `${p.currentStock} un`,
      tone: 'warning'
    })),
    module: 'products',
    moduleLabel: 'Ver produtos'
  };
}

function answerStockOverview(data: AssistantData): AssistantAnswer {
  const products = activeProducts(data);
  const totalUnits = products.reduce((sum, p) => sum + (p.currentStock || 0), 0);
  const stockValue = products.reduce(
    (sum, p) => sum + (p.currentStock || 0) * (p.costPrice || 0),
    0
  );
  const missing = products.filter(isOutOfStock).length;
  const low = products.filter(isLowStock).length;

  return {
    text:
      `Visão geral do estoque:\n` +
      `• ${products.length} produtos ativos\n` +
      `• ${totalUnits} unidades no total\n` +
      `• ${missing} em falta e ${low} com estoque baixo\n` +
      `• Valor do estoque (custo): ${money(stockValue)}`,
    module: 'stock',
    moduleLabel: 'Ver estoque'
  };
}

function answerProductLookup(
  data: AssistantData,
  terms: string[],
  wantsPrice: boolean
): AssistantAnswer | null {
  const matches = findProducts(data, terms);
  if (matches.length === 0) return null;

  // Um único produto: resposta direta e detalhada.
  if (matches.length === 1) {
    const p = matches[0];
    const stockNote = isOutOfStock(p)
      ? '⚠️ em falta'
      : isLowStock(p)
        ? '🟡 estoque baixo'
        : '🟢 disponível';

    const text = wantsPrice
      ? `${p.name} custa ${money(p.salePrice)} (venda). Custo: ${money(p.costPrice)}. ` +
        `Estoque atual: ${p.currentStock} un (${stockNote}).`
      : `${p.name}: ${p.currentStock} un em estoque (${stockNote}). ` +
        `Preço de venda ${money(p.salePrice)} · mínimo ${p.minStock} un.`;

    return { text, module: 'products', moduleLabel: 'Abrir no catálogo' };
  }

  // Vários candidatos: lista para o usuário escolher.
  return {
    text: `Encontrei ${matches.length} produtos parecidos:`,
    items: matches.slice(0, 8).map((p) => ({
      title: p.name,
      subtitle: wantsPrice ? productSubtitle(p) : `SKU ${p.sku || 'N/I'}`,
      badge: wantsPrice ? money(p.salePrice) : `${p.currentStock} un`,
      tone: isOutOfStock(p) ? 'danger' : isLowStock(p) ? 'warning' : 'default'
    })),
    module: 'products',
    moduleLabel: 'Ver produtos'
  };
}

function answerOpenServiceOrders(data: AssistantData): AssistantAnswer {
  const open = data.serviceOrders.filter(
    (os) => os.status === 'aberta' || os.status === 'em_execucao'
  );

  if (open.length === 0) {
    return { text: 'Não há ordens de serviço abertas ou em execução no momento.' };
  }

  return {
    text: `Existem ${open.length} ordem(ns) de serviço em andamento:`,
    items: open.slice(0, 10).map((os) => ({
      title: `OS ${os.code} · ${os.customerName}`,
      subtitle: os.problemDescription?.slice(0, 60) || 'Sem descrição',
      badge: os.status === 'aberta' ? 'Aberta' : 'Em execução',
      tone: os.status === 'aberta' ? 'warning' : 'default'
    })),
    module: 'os',
    moduleLabel: 'Ver ordens de serviço'
  };
}

function answerReceivables(data: AssistantData): AssistantAnswer {
  const pending = data.accountsReceivable.filter(
    (r) => r.status === 'pendente' || r.status === 'vencido'
  );
  const overdue = pending.filter((r) => r.status === 'vencido');
  const openTotal = pending.reduce((sum, r) => sum + (r.amount - (r.paidAmount || 0)), 0);
  const overdueTotal = overdue.reduce((sum, r) => sum + (r.amount - (r.paidAmount || 0)), 0);

  if (pending.length === 0) {
    return { text: 'Não há contas a receber em aberto. Financeiro em dia! ✅' };
  }

  return {
    text:
      `Contas a receber em aberto: ${money(openTotal)} (${pending.length} título(s)).\n` +
      `Desses, ${overdue.length} estão vencidos, somando ${money(overdueTotal)}.`,
    items: overdue.slice(0, 8).map((r) => ({
      title: r.customerName,
      subtitle: `${r.description || 'Título'} · vence ${r.dueDate}`,
      badge: money(r.amount - (r.paidAmount || 0)),
      tone: 'danger'
    })),
    module: 'financial',
    moduleLabel: 'Ver financeiro'
  };
}

function answerSales(data: AssistantData): AssistantAnswer {
  const valid = data.sales.filter((s) => s.status !== 'cancelada');
  const today = new Date().toISOString().slice(0, 10);
  const todaySales = valid.filter((s) => (s.createdAt || '').slice(0, 10) === today);
  const todayTotal = todaySales.reduce((sum, s) => sum + (s.total || 0), 0);
  const grandTotal = valid.reduce((sum, s) => sum + (s.total || 0), 0);

  return {
    text:
      `Vendas de hoje: ${todaySales.length} venda(s), somando ${money(todayTotal)}.\n` +
      `Total acumulado: ${valid.length} venda(s) · ${money(grandTotal)}.`,
    module: 'sales',
    moduleLabel: 'Ver vendas'
  };
}

function answerCustomers(data: AssistantData): AssistantAnswer {
  return {
    text: `Você tem ${data.customers.length} cliente(s) cadastrado(s).`,
    module: 'customers',
    moduleLabel: 'Ver clientes'
  };
}

function answerHelp(): AssistantAnswer {
  return {
    text:
      'Sou o Vilmar, seu assistente do Sistemas Arka. Posso te dar informações rápidas do sistema. Experimente perguntar:\n' +
      '• "Quais produtos estão em falta?"\n' +
      '• "Tem algo com estoque baixo?"\n' +
      '• "Qual o preço do mouse gamer?"\n' +
      '• "Quanto tenho de estoque?"\n' +
      '• "Quais OS estão abertas?"\n' +
      '• "Tem contas vencidas?"\n' +
      '• "Como foram as vendas de hoje?"'
  };
}

/* ────────────────────────── Roteador ────────────────────────── */

/**
 * Interpreta a pergunta e devolve a melhor resposta possível.
 * A ordem das checagens importa: as intenções mais específicas vêm primeiro.
 */
export function answerQuestion(question: string, data: AssistantData): AssistantAnswer {
  const raw = question.trim();
  if (!raw) return answerHelp();

  const text = normalize(raw);
  const wantsPrice = has(text, 'preco', 'valor', 'custa', 'custo', 'quanto custa');

  // Saudações curtas.
  if (
    /^(oi|ola|opa|eae|e ai|bom dia|boa tarde|boa noite|hey|salve)\b/.test(text) &&
    text.length <= 18
  ) {
    return {
      text: 'Olá! 👋 Sou o Vilmar. Posso te ajudar com estoque, produtos em falta, vendas, OS e financeiro. O que você precisa saber?'
    };
  }

  // Ajuda explícita.
  if (has(text, 'ajuda', 'o que voce faz', 'o que voce pode', 'como funciona', 'comandos', 'pode fazer')) {
    return answerHelp();
  }

  // Produtos em falta / sem estoque.
  if (has(text, 'em falta', 'sem estoque', 'faltando', 'acabou', 'acabaram', 'zerad', 'esgotad', 'estoque zero', 'sem saldo')) {
    return answerOutOfStock(data);
  }

  // Estoque baixo / reposição.
  if (has(text, 'estoque baixo', 'baixo estoque', 'abaixo', 'minimo', 'repor', 'reposi', 'precisa comprar', 'preciso comprar', 'acabando')) {
    return answerLowStock(data);
  }

  // Ordens de serviço abertas.
  if (has(text, 'os aberta', 'os abertas', 'ordem de servico', 'ordens de servico', 'os em aberto', 'servico aberto', 'os em andamento', 'os pendente')) {
    return answerOpenServiceOrders(data);
  }

  // Financeiro / contas a receber.
  if (has(text, 'vencid', 'a receber', 'inadimpl', 'devendo', 'contas', 'financeiro', 'receber')) {
    return answerReceivables(data);
  }

  // Vendas / faturamento.
  if (has(text, 'venda', 'vendas', 'faturamento', 'faturei', 'vendi', 'vendeu', 'caixa hoje')) {
    return answerSales(data);
  }

  // Clientes.
  if (has(text, 'cliente', 'clientes')) {
    return answerCustomers(data);
  }

  // Visão geral do estoque (valor, total de unidades).
  if (has(text, 'valor do estoque', 'valor total', 'quanto vale', 'total de produtos', 'quantos produtos', 'resumo do estoque', 'visao geral', 'total em estoque', 'quanto tenho de estoque')) {
    return answerStockOverview(data);
  }

  // Busca de produto específico (preço ou estoque de um item nomeado).
  const terms = keywords(text);
  const lookup = answerProductLookup(data, terms, wantsPrice);
  if (lookup) return lookup;

  // Menção genérica a estoque sem produto identificado → visão geral.
  if (has(text, 'estoque')) {
    return answerStockOverview(data);
  }

  // Nada casou.
  return {
    text: 'Hmm, não encontrei essa informação. 🤔 Posso ajudar com produtos em falta, estoque baixo, preços, vendas, ordens de serviço e financeiro. Tente reformular, ou digite "ajuda".'
  };
}
