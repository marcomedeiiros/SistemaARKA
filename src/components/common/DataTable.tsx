import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface Column<T> {
  header: string;
  key: keyof T | string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T extends Record<string, any>> {
  columns: Column<T>[];
  data: T[];
  keyField?: string;
  onRowClick?: (row: T) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFields?: string[];
  actions?: (row: T) => React.ReactNode;
  emptyMessage?: string;
  loading?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField = 'id',
  onRowClick,
  searchable = true,
  searchPlaceholder = 'Buscar...',
  searchFields = [],
  actions,
  emptyMessage = 'Nenhum registro encontrado.',
  loading = false
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const filteredData = React.useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    const fields = searchFields.length > 0 ? searchFields : columns.map((c) => String(c.key));
    return data.filter((row) =>
      fields.some((f) => {
        const val = row[f];
        return val && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, searchFields, columns]);

  const sortedData = React.useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (va == null) return 1;
      if (vb == null) return -1;
      const cmp = String(va).localeCompare(String(vb), 'pt-BR', { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredData, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="flex flex-col gap-3">
      {searchable && (
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={searchPlaceholder}
            className="arka-input pl-9"
          />
        </div>
      )}

      <div className="arka-table-container">
        <table className="arka-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  onClick={() => col.sortable !== false && handleSort(String(col.key))}
                  className={col.sortable !== false ? 'cursor-pointer select-none hover:bg-[var(--border-color)]/40' : ''}
                >
                  <span className="flex items-center gap-1">
                    {col.header}
                    {sortKey === String(col.key) && (
                      <span className="text-[var(--accent-primary)]">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </span>
                </th>
              ))}
              {actions && <th className="text-right">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-12">
                  <div className="flex items-center justify-center gap-2 text-[var(--text-muted)]">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    Carregando...
                  </div>
                </td>
              </tr>
            ) : pagedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-12 text-[var(--text-muted)]">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pagedData.map((row, idx) => (
                <tr
                  key={row[keyField] ?? idx}
                  onClick={() => onRowClick?.(row)}
                  className={onRowClick ? 'cursor-pointer' : ''}
                >
                  {columns.map((col) => (
                    <td key={String(col.key)}>
                      {col.render ? col.render(row) : String(row[col.key as string] ?? '')}
                    </td>
                  ))}
                  {actions && (
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">{actions(row)}</div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
          <span>
            Mostrando {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sortedData.length)} de {sortedData.length} registros
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={currentPage === 1}
              className="px-2 py-1 rounded border border-[var(--border-color)] disabled:opacity-40 hover:bg-[var(--border-color)]/40"
            >«</button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 rounded border border-[var(--border-color)] disabled:opacity-40 hover:bg-[var(--border-color)]/40"
            >‹</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(currentPage - 2 + i, totalPages - 4 + i));
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`px-2.5 py-1 rounded border text-xs font-medium ${
                    pageNum === currentPage
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-[var(--border-color)] hover:bg-[var(--border-color)]/40'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2 py-1 rounded border border-[var(--border-color)] disabled:opacity-40 hover:bg-[var(--border-color)]/40"
            >›</button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 rounded border border-[var(--border-color)] disabled:opacity-40 hover:bg-[var(--border-color)]/40"
            >»</button>
          </div>
        </div>
      )}
    </div>
  );
}
