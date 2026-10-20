import React, { useRef } from 'react';
import {
  Database,
  Download,
  Moon,
  RotateCcw,
  ShoppingBag,
  Sun,
  Upload,
} from 'lucide-react';
import { formatIntegerBR } from '../utils/formatters';

interface HeaderProps {
  activeSource: string;
  totalRows: number;
  filteredRows: number;
  isUploading: boolean;
  isExporting: boolean;
  isDark: boolean;
  onToggleTheme: () => void;
  onUploadFile: (file: File) => void;
  onResetDataset: () => void;
  onExportCsv: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeSource,
  totalRows,
  filteredRows,
  isUploading,
  isExporting,
  isDark,
  onToggleTheme,
  onUploadFile,
  onResetDataset,
  onExportCsv,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isCustomDataset =
    activeSource !== '' && activeSource !== 'sales_2023.csv';

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (selected) {
      onUploadFile(selected);
      event.target.value = '';
    }
  };

  return (
    <header className="sticky top-0 z-30 shadow-sm">
      {/* Iconic Mercado Livre Yellow Accent Strip */}
      <div className="h-1.5 w-full bg-ml-yellow" />

      {/* Deep Navy Structural Header */}
      <div className="bg-ml-navy text-white border-b border-ml-navy-dark dark:bg-slate-900 dark:border-slate-800">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-3.5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          {/* Brand Identity & Active Dataset Badge */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ml-yellow text-ml-navy shadow-sm">
                <ShoppingBag className="h-5 w-5 stroke-[2.2]" aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold tracking-tight text-white sm:text-lg">
                    Mercado Livre Seller Analytics
                  </h1>
                  <span className="hidden rounded-md bg-ml-yellow px-2 py-0.5 text-[11px] font-bold text-slate-900 sm:inline-block">
                    Central do Vendedor
                  </span>
                </div>
                <p className="text-xs text-slate-200/90">
                  Inteligência financeira, logística e performance comercial de pedidos
                </p>
              </div>
            </div>

            {/* Active Dataset Badge */}
            <div
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-100"
              title={`Fonte ativa: ${activeSource || 'sales_2023.csv'}`}
            >
              <Database
                className="h-3.5 w-3.5 text-ml-yellow shrink-0"
                aria-hidden="true"
              />
              <span className="font-mono font-semibold text-white">
                {activeSource || 'sales_2023.csv'}
              </span>
              <span className="text-slate-300">•</span>
              <span>
                {filteredRows !== totalRows
                  ? `${formatIntegerBR(filteredRows)} de ${formatIntegerBR(totalRows)} pedidos`
                  : `${formatIntegerBR(totalRows)} pedidos`}
              </span>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Selecionar arquivo CSV de vendas do Mercado Livre"
            />

            {/* Importar CSV */}
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ml-yellow px-3 py-1.5 text-xs font-bold text-slate-900 shadow-sm transition-colors hover:bg-ml-yellow-hover focus:outline-none focus:ring-2 focus:ring-ml-yellow focus:ring-offset-2 focus:ring-offset-ml-navy disabled:opacity-60"
            >
              <Upload className="h-3.5 w-3.5 stroke-[2.2]" aria-hidden="true" />
              <span>{isUploading ? 'Importando...' : 'Importar CSV'}</span>
            </button>

            {/* Restaurar Padrão (shown prominently when custom CSV is active, or available to reset) */}
            {isCustomDataset && (
              <button
                type="button"
                disabled={isUploading}
                onClick={onResetDataset}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/40 bg-amber-400/20 px-3 py-1.5 text-xs font-semibold text-amber-100 transition-colors hover:bg-amber-400/30 focus:outline-none focus:ring-2 focus:ring-amber-300"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Restaurar Padrão</span>
              </button>
            )}

            {/* Exportar CSV */}
            <button
              type="button"
              disabled={isExporting || filteredRows === 0}
              onClick={onExportCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{isExporting ? 'Exportando...' : 'Exportar CSV'}</span>
            </button>

            {/* Light / Dark Theme Toggle */}
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
              title={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              {isDark ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-ml-yellow" aria-hidden="true" />
                  <span className="hidden sm:inline">Claro</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-slate-200" aria-hidden="true" />
                  <span className="hidden sm:inline">Escuro</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
