import type { Product, ProductCategory, Supplier } from '../types';

/**
 * Importação de produtos via CSV.
 *
 * A planilha que o usuário monta no Excel raramente sai "limpa": vem com BOM,
 * separador `;` (padrão do Excel em português), preço com vírgula decimal e
 * cabeçalhos escritos de um jeito diferente a cada vez. Este módulo concentra
 * essa tolerância para que a tela só cuide da apresentação.
 *
 * Categoria e fornecedor são informados por **nome**: o import resolve para o
 * id correspondente, sem exigir que o usuário conheça os códigos internos.
 */

/** Campos aceitos, na ordem em que aparecem no modelo e na aba Produtos. */
export interface ImportColumn {
  /** Campo do produto que a coluna alimenta. */
  field: keyof ProductDraft | 'categoryName' | 'supplierName';
  /** Cabeçalho sugerido no modelo. */
  header: string;
  required: boolean;
  hint: string;
  /** Exemplo usado na linha de amostra do modelo. */
  sample: string;
  /** Grafias alternativas aceitas no cabeçalho (já normalizadas). */
  aliases: string[];
}

export const IMPORT_COLUMNS: ImportColumn[] = [
  {
    field: 'sku',
    header: 'SKU',
    required: true,
    hint: 'Código interno único do produto.',
    sample: 'PRD-001',
    aliases: ['sku', 'codigo', 'cod', 'codigointerno', 'referencia', 'ref']
  },
  {
    field: 'name',
    header: 'Nome',
    required: true,
    hint: 'Nome do produto.',
    sample: 'SSD Kingston 1TB NVMe',
    aliases: ['nome', 'name', 'produto', 'nomedoproduto', 'nomeproduto', 'descricaocurta']
  },
  {
    field: 'description',
    header: 'Descrição',
    required: false,
    hint: 'Descrição detalhada (opcional).',
    sample: 'SSD NVMe PCIe 4.0, leitura 7000MB/s',
    aliases: ['descricao', 'description', 'detalhes', 'observacao', 'observacoes', 'obs']
  },
  {
    field: 'categoryName',
    header: 'Categoria',
    required: false,
    hint: 'Nome da categoria. Pode ser criada automaticamente.',
    sample: 'Armazenamento',
    aliases: ['categoria', 'category', 'categoryname', 'grupo', 'departamento']
  },
  {
    field: 'brand',
    header: 'Marca',
    required: false,
    hint: 'Fabricante ou marca.',
    sample: 'Kingston',
    aliases: ['marca', 'brand', 'fabricante']
  },
  {
    field: 'unit',
    header: 'Unidade',
    required: false,
    hint: 'UN, PC, KG, CX... Padrão UN.',
    sample: 'UN',
    aliases: ['unidade', 'unid', 'un', 'unit', 'medida']
  },
  {
    field: 'costPrice',
    header: 'Preço de Custo',
    required: false,
    hint: 'Aceita 1.234,56 ou 1234.56. Padrão 0.',
    sample: '389,90',
    aliases: [
      'precocusto',
      'precodecusto',
      'custo',
      'valorcusto',
      'costprice',
      'cost',
      'precocompra'
    ]
  },
  {
    field: 'salePrice',
    header: 'Preço de Venda',
    required: true,
    hint: 'Obrigatório e maior que zero.',
    sample: '549,90',
    aliases: [
      'precovenda',
      'precodevenda',
      'venda',
      'valorvenda',
      'saleprice',
      'preco',
      'price',
      'valor'
    ]
  },
  {
    field: 'currentStock',
    header: 'Estoque',
    required: false,
    hint: 'Estoque inicial. Padrão 0.',
    sample: '12',
    aliases: [
      'estoque',
      'estoqueatual',
      'estoqueinicial',
      'quantidade',
      'qtd',
      'qtde',
      'currentstock',
      'stock'
    ]
  },
  {
    field: 'minStock',
    header: 'Estoque Mínimo',
    required: false,
    hint: 'Dispara o alerta de estoque baixo. Padrão 5.',
    sample: '3',
    aliases: ['estoqueminimo', 'minimo', 'estminimo', 'estmin', 'minstock', 'minimoestoque']
  },
  {
    field: 'supplierName',
    header: 'Fornecedor',
    required: false,
    hint: 'Nome de um fornecedor já cadastrado.',
    sample: 'Distribuidora Tech Nordeste',
    aliases: ['fornecedor', 'supplier', 'suppliername']
  },
  {
    field: 'barcode',
    header: 'Código de Barras',
    required: false,
    hint: 'EAN-13 / GTIN (opcional).',
    sample: '7891234567890',
    aliases: ['codigodebarras', 'codigobarras', 'barcode', 'ean', 'ean13', 'gtin', 'codbarras']
  },
  {
    field: 'imageUrl',
    header: 'URL da Imagem',
    required: false,
    hint: 'Endereço http(s) da foto (opcional).',
    sample: 'https://exemplo.com/ssd.jpg',
    aliases: ['urldaimagem', 'urlimagem', 'imagem', 'imageurl', 'foto', 'linkimagem', 'link']
  },
  {
    field: 'active',
    header: 'Ativo',
    required: false,
    hint: 'Sim/Não, 1/0, Ativo/Inativo. Padrão Sim.',
    sample: 'Sim',
    aliases: ['ativo', 'active', 'situacao', 'status', 'habilitado']
  }
];

/** Dados de produto prontos para gravar (o serviço não gera datas nem id). */
export type ProductDraft = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

/** O que será feito com a linha ao confirmar a importação. */
export type RowAction = 'create' | 'update' | 'skip' | 'error';

export interface AnalyzedRow {
  /** Linha no arquivo original, contando o cabeçalho, para o usuário localizar. */
  line: number;
  sku: string;
  name: string;
  action: RowAction;
  errors: string[];
  warnings: string[];
  /** Preenchido quando a linha é válida. */
  draft?: ProductDraft;
  /** Id do produto existente, quando a ação é `update`. */
  existingId?: number;
  /** Categoria que precisará ser criada antes de gravar esta linha. */
  pendingCategory?: string;
}

export interface ImportAnalysis {
  rows: AnalyzedRow[];
  /** Cabeçalhos do arquivo que não casaram com nenhum campo conhecido. */
  unknownHeaders: string[];
  /** Campos obrigatórios ausentes no cabeçalho. */
  missingRequired: string[];
  /** Categorias novas que serão criadas (nomes já deduplicados). */
  newCategories: string[];
  delimiter: string;
  counts: { total: number; create: number; update: number; skip: number; error: number };
}

export type DuplicateStrategy = 'skip' | 'update';

/* ────────────────────────── Normalização ────────────────────────── */

/** Minúsculas, sem acentos e sem separadores: casa "Preço de Custo" com "preco_custo". */
function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Comparação de nomes (categoria/fornecedor): ignora acento, caixa e espaços extras. */
function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Converte número escrito por humanos.
 *
 * Regras: vírgula é sempre separador decimal (padrão pt-BR). O ponto é decimal,
 * exceto quando aparece uma única vez seguido de exatamente 3 dígitos ou mais de
 * uma vez, casos em que é separador de milhar ("1.200" = 1200, "1.234.567").
 * Prefixos como "R$" e espaços são descartados.
 */
export function parseDecimal(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,-]/g, '').trim();
  if (!cleaned) return null;

  const hasComma = cleaned.includes(',');
  const dots = (cleaned.match(/\./g) ?? []).length;

  let normalized = cleaned;

  if (hasComma) {
    // Vírgula decidiu: tudo que for ponto vira separador de milhar.
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (dots > 1) {
    normalized = cleaned.replace(/\./g, '');
  } else if (dots === 1 && /\.\d{3}$/.test(cleaned)) {
    normalized = cleaned.replace('.', '');
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

const TRUE_WORDS = new Set(['sim', 's', 'true', 'verdadeiro', '1', 'ativo', 'x', 'yes', 'y']);
const FALSE_WORDS = new Set(['nao', 'n', 'false', 'falso', '0', 'inativo', 'no', 'desativado']);

export function parseFlag(raw: string): boolean | null {
  const key = normalizeKey(raw);
  if (!key) return null;
  if (TRUE_WORDS.has(key)) return true;
  if (FALSE_WORDS.has(key)) return false;
  return null;
}

/* ────────────────────────── Leitura do arquivo ────────────────────────── */

/**
 * Lê o arquivo como texto tentando UTF-8 e, se aparecer caractere de
 * substituição (sinal de acento quebrado), relê como Windows-1252 que é o que
 * o Excel usa ao salvar "CSV (separado por vírgulas)" no Windows.
 */
export async function readCsvFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();

  const utf8 = new TextDecoder('utf-8').decode(buffer);
  if (!utf8.includes('\uFFFD')) return stripBom(utf8);

  try {
    return stripBom(new TextDecoder('windows-1252').decode(buffer));
  } catch {
    return stripBom(utf8);
  }
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** Escolhe o separador contando ocorrências fora de trechos entre aspas. */
export function detectDelimiter(text: string): string {
  const candidates = [';', ',', '\t', '|'];
  const sample = text.slice(0, 5000);

  let best = ';';
  let bestCount = -1;

  for (const candidate of candidates) {
    let count = 0;
    let quoted = false;

    for (let i = 0; i < sample.length; i += 1) {
      const char = sample[i];
      if (char === '"') {
        quoted = !quoted;
      } else if (!quoted && char === candidate) {
        count += 1;
      }
    }

    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }

  return bestCount > 0 ? best : ';';
}

/**
 * Parser de CSV conforme RFC 4180: campos entre aspas podem conter o separador,
 * quebras de linha e aspas escapadas (`""`). Aceita LF e CRLF.
 */
export function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };

  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      pushField();
    } else if (char === '\r') {
      if (text[i + 1] === '\n') i += 1;
      pushRow();
    } else if (char === '\n') {
      pushRow();
    } else {
      field += char;
    }
  }

  // Último campo só entra se houver conteúdo pendente.
  if (field !== '' || row.length > 0) pushRow();

  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}

/* ────────────────────────── Análise ────────────────────────── */

interface AnalyzeInput {
  text: string;
  existingProducts: Product[];
  categories: ProductCategory[];
  suppliers: Supplier[];
  createMissingCategories: boolean;
  duplicateStrategy: DuplicateStrategy;
}

/** Erro de formato do arquivo (cabeçalho ausente, arquivo vazio etc.). */
export class ImportFormatError extends Error {}

/**
 * Interpreta o CSV e devolve, linha por linha, o que será gravado e o que está
 * impedindo a gravação. Nada é persistido aqui: a tela mostra o resultado e só
 * então confirma.
 */
export function analyzeProductCsv({
  text,
  existingProducts,
  categories,
  suppliers,
  createMissingCategories,
  duplicateStrategy
}: AnalyzeInput): ImportAnalysis {
  const delimiter = detectDelimiter(text);
  const table = parseDelimited(text, delimiter);

  if (table.length === 0) {
    throw new ImportFormatError('O arquivo está vazio.');
  }

  const headerCells = table[0]!;
  const dataRows = table.slice(1);

  // Mapa: índice da coluna no arquivo -> campo do produto.
  const columnField = new Map<number, ImportColumn>();
  const unknownHeaders: string[] = [];

  headerCells.forEach((cell, index) => {
    const key = normalizeKey(cell);
    if (!key) return;

    const column = IMPORT_COLUMNS.find(
      (candidate) => candidate.aliases.includes(key) || normalizeKey(candidate.header) === key
    );

    if (column) {
      // Se a mesma coluna vier duplicada, a primeira ocorrência manda.
      const alreadyMapped = [...columnField.values()].some((c) => c.field === column.field);
      if (!alreadyMapped) columnField.set(index, column);
      else unknownHeaders.push(cell.trim());
    } else {
      unknownHeaders.push(cell.trim());
    }
  });

  const mappedFields = new Set([...columnField.values()].map((column) => column.field));
  const missingRequired = IMPORT_COLUMNS.filter(
    (column) => column.required && !mappedFields.has(column.field)
  ).map((column) => column.header);

  if (missingRequired.length > 0) {
    throw new ImportFormatError(
      `O arquivo não tem a(s) coluna(s) obrigatória(s): ${missingRequired.join(', ')}. ` +
        'Baixe o modelo para conferir os nomes esperados.'
    );
  }

  // Índices de busca por nome normalizado.
  const categoryByName = new Map(
    categories.filter((c) => c.id !== undefined).map((c) => [normalizeName(c.name), c])
  );
  const supplierByName = new Map(
    suppliers.filter((s) => s.id !== undefined).map((s) => [normalizeName(s.name), s])
  );
  const productBySku = new Map(
    existingProducts
      .filter((p) => p.id !== undefined && p.sku)
      .map((p) => [normalizeName(p.sku), p])
  );

  const seenSkus = new Map<string, number>();
  const pendingCategories = new Map<string, string>();
  const rows: AnalyzedRow[] = [];

  dataRows.forEach((cells, index) => {
    const line = index + 2; // +1 pelo cabeçalho, +1 porque planilha começa em 1.
    const errors: string[] = [];
    const warnings: string[] = [];

    const raw = (field: ImportColumn['field']): string => {
      for (const [columnIndex, column] of columnField) {
        if (column.field === field) return (cells[columnIndex] ?? '').trim();
      }
      return '';
    };

    const sku = raw('sku');
    const name = raw('name');

    if (!sku) errors.push('SKU em branco.');
    if (!name) errors.push('Nome em branco.');

    /** Lê um número opcional, acusando erro quando o texto não é numérico. */
    const readNumber = (
      field: ImportColumn['field'],
      label: string,
      fallback: number
    ): number => {
      const value = raw(field);
      if (!value) return fallback;

      const parsed = parseDecimal(value);
      if (parsed === null) {
        errors.push(`${label} inválido: "${value}".`);
        return fallback;
      }
      if (parsed < 0) {
        errors.push(`${label} não pode ser negativo.`);
        return fallback;
      }
      return parsed;
    };

    const costPrice = readNumber('costPrice', 'Preço de custo', 0);
    const currentStock = readNumber('currentStock', 'Estoque', 0);
    const minStock = readNumber('minStock', 'Estoque mínimo', 5);

    // Venda é obrigatória: mensagem própria quando vem vazia.
    const salePriceRaw = raw('salePrice');
    let salePrice = 0;
    if (!salePriceRaw) {
      errors.push('Preço de venda em branco.');
    } else {
      const parsed = parseDecimal(salePriceRaw);
      if (parsed === null) {
        errors.push(`Preço de venda inválido: "${salePriceRaw}".`);
      } else if (parsed <= 0) {
        errors.push('Preço de venda deve ser maior que zero.');
      } else {
        salePrice = parsed;
      }
    }

    // Categoria por nome: encontra, cria depois, ou fica sem categoria.
    const categoryNameRaw = raw('categoryName');
    let categoryId = 0;
    let categoryName: string | undefined;
    let pendingCategory: string | undefined;

    if (categoryNameRaw) {
      const found = categoryByName.get(normalizeName(categoryNameRaw));
      if (found) {
        categoryId = found.id!;
        categoryName = found.name;
      } else if (createMissingCategories) {
        const key = normalizeName(categoryNameRaw);
        // A primeira grafia encontrada vira a oficial, para que "Cabos" e "cabos"
        // não gerem duas categorias diferentes.
        if (!pendingCategories.has(key)) pendingCategories.set(key, categoryNameRaw);
        pendingCategory = pendingCategories.get(key);
        categoryName = pendingCategory;
      } else {
        warnings.push(`Categoria "${categoryNameRaw}" não existe: produto ficará sem categoria.`);
      }
    }

    // Fornecedor é opcional e nunca criado automaticamente (exige documento, contato...).
    const supplierNameRaw = raw('supplierName');
    let supplierId: number | undefined;
    let supplierName: string | undefined;

    if (supplierNameRaw) {
      const found = supplierByName.get(normalizeName(supplierNameRaw));
      if (found) {
        supplierId = found.id!;
        supplierName = found.name;
      } else {
        warnings.push(
          `Fornecedor "${supplierNameRaw}" não cadastrado: produto ficará sem fornecedor.`
        );
      }
    }

    const activeRaw = raw('active');
    let active = true;
    if (activeRaw) {
      const flag = parseFlag(activeRaw);
      if (flag === null) {
        warnings.push(`Valor de "Ativo" não reconhecido ("${activeRaw}"): assumindo Sim.`);
      } else {
        active = flag;
      }
    }

    const imageUrl = raw('imageUrl');
    if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
      warnings.push('URL da imagem ignorada: precisa começar com http:// ou https://.');
    }

    const unitRaw = raw('unit');

    // Duplicidade dentro do próprio arquivo.
    const skuKey = normalizeName(sku);
    if (sku) {
      const firstLine = seenSkus.get(skuKey);
      if (firstLine !== undefined) {
        errors.push(`SKU repetido no arquivo (já usado na linha ${firstLine}).`);
      } else {
        seenSkus.set(skuKey, line);
      }
    }

    const existing = sku ? productBySku.get(skuKey) : undefined;

    if (errors.length > 0) {
      rows.push({ line, sku, name, action: 'error', errors, warnings });
      return;
    }

    // SKU já no catálogo: atualiza ou ignora, conforme a escolha do usuário.
    if (existing && duplicateStrategy === 'skip') {
      rows.push({
        line,
        sku,
        name,
        action: 'skip',
        errors,
        warnings: [...warnings, `SKU já cadastrado (${existing.name}): linha ignorada.`]
      });
      return;
    }

    const draft: ProductDraft = {
      sku,
      name,
      description: raw('description') || undefined,
      categoryId,
      categoryName,
      brand: raw('brand'),
      unit: unitRaw ? unitRaw.toUpperCase() : 'UN',
      costPrice,
      salePrice,
      currentStock,
      minStock,
      supplierId,
      supplierName,
      barcode: raw('barcode'),
      imageUrl: imageUrl && /^https?:\/\//i.test(imageUrl) ? imageUrl : undefined,
      active
    };

    rows.push({
      line,
      sku,
      name,
      action: existing ? 'update' : 'create',
      errors,
      warnings,
      draft,
      existingId: existing?.id,
      pendingCategory
    });
  });

  const counts = {
    total: rows.length,
    create: rows.filter((r) => r.action === 'create').length,
    update: rows.filter((r) => r.action === 'update').length,
    skip: rows.filter((r) => r.action === 'skip').length,
    error: rows.filter((r) => r.action === 'error').length
  };

  // Só conta como categoria nova a que sobrou em alguma linha aproveitável.
  const usedPending = new Set(
    rows
      .filter((row) => row.action === 'create' || row.action === 'update')
      .map((row) => (row.pendingCategory ? normalizeName(row.pendingCategory) : ''))
      .filter(Boolean)
  );

  const newCategories = [...pendingCategories.entries()]
    .filter(([key]) => usedPending.has(key))
    .map(([, label]) => label);

  return { rows, unknownHeaders, missingRequired, newCategories, delimiter, counts };
}

/* ────────────────────────── Modelo ────────────────────────── */

/** Escapa o campo se contiver separador, aspas ou quebra de linha. */
function csvCell(value: string, delimiter: string): string {
  const needsQuotes =
    value.includes(delimiter) || value.includes('"') || /[\r\n]/.test(value);
  return needsQuotes ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Monta o CSV de modelo com cabeçalho e uma linha de exemplo.
 *
 * Usa `;` e BOM porque é assim que o Excel em português abre o arquivo com as
 * colunas já separadas e os acentos corretos, sem passar pelo assistente de
 * importação.
 */
export function buildTemplateCsv(delimiter = ';'): string {
  const header = IMPORT_COLUMNS.map((column) => csvCell(column.header, delimiter)).join(delimiter);
  const sample = IMPORT_COLUMNS.map((column) => csvCell(column.sample, delimiter)).join(delimiter);
  return `\uFEFF${header}\r\n${sample}\r\n`;
}

/** Dispara o download do modelo no navegador. */
export function downloadTemplateCsv(filename = 'modelo-produtos.csv'): void {
  const blob = new Blob([buildTemplateCsv()], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
