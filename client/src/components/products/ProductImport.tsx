import React, { useMemo, useRef, useState } from 'react';
import { useLiveQuery } from '../../data/useLiveQuery';
import { db } from '../../db/db';
import { Modal } from '../common/Modal';
import { Alert, formatCurrency } from '../common/FormComponents';
import { useToast } from '../../context/ToastContext';
import {
  IMPORT_COLUMNS,
  ImportFormatError,
  analyzeProductCsv,
  downloadTemplateCsv,
  readCsvFile,
  type AnalyzedRow,
  type DuplicateStrategy,
  type ImportAnalysis
} from '../../services/productImportService';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  HelpCircle,
  RefreshCw,
  Upload,
  X
} from 'lucide-react';

interface ProductImportProps {
  onClose: () => void;
  /** Chamado após uma importação que gravou pelo menos um produto. */
  onImported?: () => void;
}

const actionBadge: Record<AnalyzedRow['action'], { label: string; className: string }> = {
  create: { label: 'Novo', className: 'badge-green' },
  update: { label: 'Atualizar', className: 'badge-blue' },
  skip: { label: 'Ignorado', className: 'badge-slate' },
  error: { label: 'Erro', className: 'badge-red' }
};

/** Quantidade de linhas exibidas na prévia, para não travar a tela com arquivos grandes. */
const PREVIEW_LIMIT = 60;

/**
 * Importação de produtos por CSV.
 *
 * O fluxo é sempre em duas etapas: o arquivo é analisado e apresentado como
 * prévia (com erros e avisos por linha) e só grava depois da confirmação. Assim
 * uma planilha com problema não deixa o catálogo pela metade.
 */
export const ProductImport: React.FC<ProductImportProps> = ({ onClose, onImported }) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // O fallback vazio é memoizado para não gerar uma referência nova a cada
  // render, o que faria a análise do arquivo ser recalculada sem necessidade.
  const productsData = useLiveQuery(() => db.products.toArray(), []);
  const categoriesData = useLiveQuery(() => db.categories.toArray(), []);
  const suppliersData = useLiveQuery(() => db.suppliers.toArray(), []);

  const products = useMemo(() => productsData ?? [], [productsData]);
  const categories = useMemo(() => categoriesData ?? [], [categoriesData]);
  const suppliers = useMemo(() => suppliersData ?? [], [suppliersData]);

  const [fileName, setFileName] = useState('');
  const [rawText, setRawText] = useState('');
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>('skip');
  const [createMissingCategories, setCreateMissingCategories] = useState(true);
  const [formatError, setFormatError] = useState('');
  const [importing, setImporting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number; categories: number } | null>(
    null
  );

  // A análise é derivada: mudar a estratégia de duplicados reavalia na hora,
  // sem precisar escolher o arquivo de novo.
  const analysis: ImportAnalysis | null = useMemo(() => {
    if (!rawText) return null;

    try {
      return analyzeProductCsv({
        text: rawText,
        existingProducts: products,
        categories,
        suppliers,
        createMissingCategories,
        duplicateStrategy
      });
    } catch {
      // Erro de formato já foi reportado na escolha do arquivo.
      return null;
    }
  }, [rawText, products, categories, suppliers, createMissingCategories, duplicateStrategy]);

  const loadFile = async (file: File) => {
    setFormatError('');
    setResult(null);

    try {
      const text = await readCsvFile(file);
      setFileName(file.name);

      // Valida o formato agora para dar a mensagem imediata do cabeçalho.
      analyzeProductCsv({
        text,
        existingProducts: products,
        categories,
        suppliers,
        createMissingCategories,
        duplicateStrategy
      });

      setRawText(text);
    } catch (err) {
      setRawText('');
      setFormatError(
        err instanceof ImportFormatError || err instanceof Error
          ? err.message
          : 'Não foi possível ler o arquivo.'
      );
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void loadFile(file);
    // Permite reescolher o mesmo arquivo depois de editá-lo.
    event.target.value = '';
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void loadFile(file);
  };

  const reset = () => {
    setRawText('');
    setFileName('');
    setFormatError('');
    setResult(null);
  };

  const handleImport = async () => {
    if (!analysis) return;

    const importable = analysis.rows.filter(
      (row) => (row.action === 'create' || row.action === 'update') && row.draft
    );

    if (importable.length === 0) {
      showToast('Nenhuma linha válida para importar.', 'error');
      return;
    }

    setImporting(true);
    try {
      // 1. Cria as categorias novas primeiro, para que os produtos já nasçam ligados a elas.
      const categoryIdByName = new Map<string, number>();

      for (const name of analysis.newCategories) {
        const id = await db.categories.add({
          name,
          description: 'Criada pela importação de produtos'
        });
        categoryIdByName.set(name, id);
      }

      const resolveDraft = (row: AnalyzedRow) => {
        const draft = { ...row.draft! };
        if (row.pendingCategory) {
          const id = categoryIdByName.get(row.pendingCategory);
          if (id !== undefined) {
            draft.categoryId = id;
            draft.categoryName = row.pendingCategory;
          }
        }
        return draft;
      };

      const now = new Date().toISOString();

      // 2. Inserções em lote: uma requisição só, em vez de uma por produto.
      const toCreate = importable.filter((row) => row.action === 'create');
      if (toCreate.length > 0) {
        await db.products.bulkAdd(
          toCreate.map((row) => ({ ...resolveDraft(row), createdAt: now, updatedAt: now }))
        );
      }

      // 3. Atualizações preservam o createdAt original do produto.
      const toUpdate = importable.filter((row) => row.action === 'update');
      for (const row of toUpdate) {
        const existing = products.find((p) => p.id === row.existingId);
        await db.products.put({
          ...resolveDraft(row),
          id: row.existingId!,
          createdAt: existing?.createdAt || now,
          updatedAt: now
        });
      }

      setResult({
        created: toCreate.length,
        updated: toUpdate.length,
        categories: analysis.newCategories.length
      });
      setRawText('');
      setFileName('');

      showToast(
        `Importação concluída: ${toCreate.length} novo(s), ${toUpdate.length} atualizado(s).`,
        'success'
      );
      onImported?.();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Erro ao importar os produtos.',
        'error'
      );
    } finally {
      setImporting(false);
    }
  };

  const counts = analysis?.counts;
  const importableCount = (counts?.create ?? 0) + (counts?.update ?? 0);
  const previewRows = analysis?.rows.slice(0, PREVIEW_LIMIT) ?? [];
  const hiddenRows = (analysis?.rows.length ?? 0) - previewRows.length;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Importar produtos por CSV"
      description="Envie uma planilha para cadastrar vários produtos de uma vez."
      maxWidth="4xl"
      footer={
        <>
          <button
            type="button"
            onClick={() => downloadTemplateCsv()}
            className="btn btn-secondary mr-auto"
          >
            <Download size={14} /> Baixar modelo
          </button>

          {analysis && (
            <button type="button" onClick={reset} className="btn btn-ghost">
              <X size={14} /> Trocar arquivo
            </button>
          )}

          <button type="button" onClick={onClose} className="btn btn-secondary">
            Fechar
          </button>

          <button
            type="button"
            onClick={handleImport}
            disabled={!analysis || importableCount === 0 || importing}
            className="btn btn-primary"
            title={
              importableCount === 0
                ? 'Nenhuma linha válida para importar'
                : `Importar ${importableCount} produto(s)`
            }
          >
            <Upload size={14} />
            {importing ? 'Importando...' : `Importar ${importableCount || ''}`.trim()}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {result && (
          <Alert
            type="success"
            message={
              `Importação concluída: ${result.created} produto(s) criado(s), ` +
              `${result.updated} atualizado(s)` +
              (result.categories > 0 ? `, ${result.categories} categoria(s) criada(s).` : '.')
            }
            onClose={() => setResult(null)}
          />
        )}

        {formatError && (
          <Alert type="error" message={formatError} onClose={() => setFormatError('')} />
        )}

        {/* Seleção do arquivo */}
        {!analysis && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className="rounded-xl border-2 border-dashed p-8 text-center transition"
            style={{
              borderColor: dragging ? '#3b82f6' : 'var(--border-color)',
              background: dragging ? 'rgba(59,130,246,0.06)' : 'transparent'
            }}
          >
            <FileSpreadsheet size={32} className="mx-auto text-[var(--text-muted)]" />
            <p className="mt-3 text-sm font-medium text-[var(--text-main)]">
              Arraste o arquivo CSV aqui ou escolha no computador
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Separador ponto e vírgula ou vírgula. Preços aceitam 1.234,56 ou 1234.56.
            </p>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-primary mt-4"
            >
              <Upload size={14} /> Escolher arquivo
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Arquivo CSV de produtos"
            />
          </div>
        )}

        {/* Ajuda das colunas */}
        <div className="rounded-xl border border-[var(--border-color)]">
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            className="flex w-full items-center gap-2 px-4 py-3 text-left"
            aria-expanded={showHelp}
          >
            <HelpCircle size={15} className="text-blue-400" />
            <span className="text-sm font-semibold text-[var(--text-main)]">
              Colunas aceitas ({IMPORT_COLUMNS.filter((c) => c.required).length} obrigatórias)
            </span>
            <span className="ml-auto text-xs text-[var(--text-muted)]">
              {showHelp ? 'ocultar' : 'ver'}
            </span>
          </button>

          {showHelp && (
            <div className="border-t border-[var(--border-color)] px-4 py-3">
              <p className="mb-3 text-xs text-[var(--text-muted)]">
                A ordem das colunas não importa e o cabeçalho não diferencia maiúsculas nem
                acentos. Colunas desconhecidas são ignoradas.
              </p>
              <div className="overflow-x-auto">
                <table className="arka-table">
                  <thead>
                    <tr>
                      <th>Coluna</th>
                      <th>Obrigatória</th>
                      <th>Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {IMPORT_COLUMNS.map((column) => (
                      <tr key={String(column.field)}>
                        <td className="font-semibold text-xs sm:text-sm">{column.header}</td>
                        <td>
                          <span className={`badge ${column.required ? 'badge-red' : 'badge-slate'}`}>
                            {column.required ? 'Sim' : 'Não'}
                          </span>
                        </td>
                        <td className="text-xs text-[var(--text-muted)]">{column.hint}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Opções + prévia */}
        {analysis && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <FileSpreadsheet size={15} className="text-blue-400" />
              <span className="font-semibold text-[var(--text-main)]">{fileName}</span>
              <span className="text-xs text-[var(--text-muted)]">
                separador "{analysis.delimiter === '\t' ? 'tab' : analysis.delimiter}" ·{' '}
                {analysis.counts.total} linha(s)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="arka-card border-l-4 border-l-emerald-500 p-3">
                <p className="text-xs font-medium text-[var(--text-muted)]">Novos</p>
                <p className="mt-1 text-xl font-bold text-emerald-400">{analysis.counts.create}</p>
              </div>
              <div className="arka-card border-l-4 border-l-blue-500 p-3">
                <p className="text-xs font-medium text-[var(--text-muted)]">Atualizações</p>
                <p className="mt-1 text-xl font-bold text-blue-400">{analysis.counts.update}</p>
              </div>
              <div className="arka-card border-l-4 border-l-slate-500 p-3">
                <p className="text-xs font-medium text-[var(--text-muted)]">Ignorados</p>
                <p className="mt-1 text-xl font-bold text-[var(--text-muted)]">
                  {analysis.counts.skip}
                </p>
              </div>
              <div className="arka-card border-l-4 border-l-red-500 p-3">
                <p className="text-xs font-medium text-[var(--text-muted)]">Com erro</p>
                <p className="mt-1 text-xl font-bold text-red-400">{analysis.counts.error}</p>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-[var(--border-color)] p-4">
              <div>
                <p className="text-sm font-medium text-[var(--text-main)]">
                  Quando o SKU já existir no catálogo
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(
                    [
                      { key: 'skip', label: 'Ignorar a linha' },
                      { key: 'update', label: 'Atualizar o produto' }
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setDuplicateStrategy(option.key)}
                      aria-pressed={duplicateStrategy === option.key}
                      className="rounded-lg border px-3 py-1.5 text-sm font-medium transition"
                      style={{
                        borderColor:
                          duplicateStrategy === option.key ? '#3b82f6' : 'var(--border-color)',
                        background:
                          duplicateStrategy === option.key ? 'rgba(59,130,246,0.12)' : 'transparent',
                        color:
                          duplicateStrategy === option.key ? '#3b82f6' : 'var(--text-muted)'
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-3">
                <span className="switch">
                  <input
                    type="checkbox"
                    checked={createMissingCategories}
                    onChange={(e) => setCreateMissingCategories(e.target.checked)}
                  />
                </span>
                <span className="text-sm font-medium text-[var(--text-main)]">
                  Criar categorias que ainda não existem
                  {analysis.newCategories.length > 0 && (
                    <span className="block text-xs font-normal text-[var(--text-muted)]">
                      Serão criadas: {analysis.newCategories.join(', ')}
                    </span>
                  )}
                </span>
              </label>
            </div>

            {analysis.unknownHeaders.length > 0 && (
              <Alert
                type="info"
                message={`Coluna(s) ignorada(s) por não corresponder a nenhum campo: ${analysis.unknownHeaders.join(', ')}.`}
              />
            )}

            {analysis.counts.error > 0 && (
              <Alert
                type="warning"
                message={`${analysis.counts.error} linha(s) com erro não serão importadas. Corrija o arquivo e envie de novo se precisar delas.`}
              />
            )}

            {/* Prévia linha a linha */}
            <div className="arka-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="arka-table">
                  <thead>
                    <tr>
                      <th>Linha</th>
                      <th>Situação</th>
                      <th>SKU</th>
                      <th>Produto</th>
                      <th>Venda</th>
                      <th>Estoque</th>
                      <th>Observações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row) => {
                      const badge = actionBadge[row.action];
                      const notes = [...row.errors, ...row.warnings];

                      return (
                        <tr key={row.line}>
                          <td className="text-xs text-[var(--text-muted)]">{row.line}</td>
                          <td>
                            <span className={`badge ${badge.className}`}>{badge.label}</span>
                          </td>
                          <td className="text-xs font-semibold">{row.sku || '-'}</td>
                          <td className="max-w-[220px] truncate text-sm">{row.name || '-'}</td>
                          <td className="text-sm">
                            {row.draft ? formatCurrency(row.draft.salePrice) : '-'}
                          </td>
                          <td className="text-sm">
                            {row.draft ? `${row.draft.currentStock} ${row.draft.unit}` : '-'}
                          </td>
                          <td className="text-xs">
                            {notes.length === 0 ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400">
                                <CheckCircle2 size={13} /> Pronto
                              </span>
                            ) : (
                              <ul className="space-y-0.5">
                                {notes.map((note, i) => (
                                  <li
                                    key={i}
                                    className={`flex items-start gap-1 ${
                                      row.errors.includes(note)
                                        ? 'text-red-400'
                                        : 'text-amber-400'
                                    }`}
                                  >
                                    <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                                    <span>{note}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {hiddenRows > 0 && (
                <p className="border-t border-[var(--border-color)] px-4 py-2 text-center text-xs text-[var(--text-muted)]">
                  <RefreshCw size={11} className="mr-1 inline" />
                  Mostrando as primeiras {PREVIEW_LIMIT} linhas. Outras {hiddenRows} serão
                  processadas do mesmo jeito.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
