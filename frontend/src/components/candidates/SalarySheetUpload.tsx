import { useRef, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileSpreadsheet, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { uploadSalarySheet, type SalaryUploadResult, type SalaryUploadSkip } from '../../api/candidates';
import { extractError, cn } from '../../lib/utils';
import { Button, Modal, LoadingSpinner } from '../ui';

interface SalarySheetUploadProps {
  candidateId?: string;
  onDone?: () => void;
  compact?: boolean;
  variant?: 'button' | 'banner' | 'card';
  className?: string;
}

function rupees(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—';
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadSkippedReport(skipped: SalaryUploadSkip[]) {
  const lines = ['Name,Reason', ...skipped.map((row) => `${csvCell(row.name)},${csvCell(row.reason)}`)];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'salary-sheet-errors.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function SalarySheetUpload({
  candidateId,
  onDone,
  compact,
  variant = 'button',
  className,
}: SalarySheetUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<SalaryUploadResult | null>(null);

  const close = () => {
    setResult(null);
    fileRef.current = null;
    if (inputRef.current) inputRef.current.value = '';
  };

  const run = async (file: File, preview: boolean) => {
    setBusy(true);
    try {
      const data = await uploadSalarySheet(file, { candidateId, preview });
      setResult(data);
      if (!preview) {
        if (data.updated_count === 0) {
          toast.error(data.skipped[0]?.reason || 'No candidates updated.');
        } else {
          toast.success(data.message);
          onDone?.();
        }
        fileRef.current = null;
        if (inputRef.current) inputRef.current.value = '';
      }
    } catch (err) {
      toast.error(extractError(err, 'Failed to read salary sheet.'));
      close();
    } finally {
      setBusy(false);
    }
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast.error('Upload Salary Setting Sheet 2024 MASTER.xlsx');
      return;
    }
    fileRef.current = file;
    void run(file, true);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    onFile(file);
  };

  const proposed = result?.proposed ?? [];
  const isPreview = !!result?.preview;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      {variant === 'banner' || variant === 'card' ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative overflow-hidden rounded-2xl border transition-all duration-300 p-6 text-center flex flex-col items-center justify-center',
            isDragging
              ? 'border-emerald-500 bg-emerald-500/15 scale-[1.01] shadow-lg shadow-emerald-500/20'
              : 'border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent hover:border-emerald-500/50 shadow-sm hover:shadow-md',
            className
          )}
        >
          {/* Subtle ambient light gradient effect */}
          <div className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-72 h-32 bg-emerald-500/20 blur-3xl rounded-full" />

          {/* Centered Icon Badge */}
          <div className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-600/30 ring-4 ring-emerald-500/20 transition-transform duration-300 hover:scale-105">
            {busy ? (
              <LoadingSpinner size="md" className="text-white" />
            ) : (
              <FileSpreadsheet className="h-7 w-7" />
            )}
          </div>

          {/* Title & Badge */}
          <div className="flex items-center gap-2 justify-center mb-1">
            <h3 className="text-base font-bold text-foreground tracking-tight">
              Master Salary Setting Sheet
            </h3>
            <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              Excel 2024
            </span>
          </div>

          <p className="max-w-md text-xs text-muted-foreground leading-relaxed">
            Upload <span className="font-semibold text-foreground">Salary Setting Sheet 2024 MASTER.xlsx</span> to match compensation packages strictly by <span className="font-semibold text-foreground">Job Code / Candidate ID</span>.
          </p>

          {/* Prominent Centered Colored Button */}
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="mt-4 inline-flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] text-white text-sm font-bold shadow-md shadow-emerald-600/30 hover:shadow-lg hover:shadow-emerald-600/40 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="h-4 w-4 shrink-0" />
            <span>{busy ? 'Processing Salary Sheet...' : 'Upload Master Salary Sheet'}</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-lg font-bold text-white bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] shadow-sm shadow-emerald-700/25 hover:shadow-md hover:shadow-emerald-700/35 transition-all duration-200 cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed',
            compact ? 'h-8 px-3 text-xs' : 'h-9 px-4 text-xs tracking-wide uppercase',
            className
          )}
        >
          {busy ? (
            <LoadingSpinner size="sm" className="text-white" />
          ) : (
            <FileSpreadsheet className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4 text-emerald-100'} />
          )}
          <span>{busy ? 'Reading...' : 'Upload salary sheet'}</span>
        </button>
      )}

      <Modal
        isOpen={!!result}
        onClose={close}
        title={isPreview ? 'Confirm salary matches' : 'Salary sheet results'}
        size="md"
      >
        <div className="p-4 space-y-4 text-sm">
          {isPreview && (
            <p className="text-muted-foreground">
              Nothing is saved until you confirm. Check the name, branch, and package.
            </p>
          )}

          {!!proposed.length && (
            <ul className="space-y-3">
              {proposed.map((row) => (
                <li key={row.id} className="rounded-lg border border-border p-3 space-y-1">
                  <div className="font-semibold">
                    {row.candidate_id} · {row.full_name}
                  </div>
                  <div className="text-muted-foreground">
                    {[row.branch, row.department].filter(Boolean).join(' · ')}
                  </div>
                  <div>
                    Total {rupees(row.total_salary)} · Allowance {rupees(row.total_allowance)} ·
                    Incentive {rupees(row.others)} · <strong>Gross {rupees(row.gross_salary)}</strong>
                  </div>
                  {row.joining_date && (
                    <div className="text-muted-foreground">Join {row.joining_date}</div>
                  )}
                  {row.warnings.map((warning) => (
                    <div key={warning} className="text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                      {warning}
                    </div>
                  ))}
                </li>
              ))}
            </ul>
          )}

          {!!result?.skipped.length && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="font-medium">Skipped ({result.skipped.length})</div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => downloadSkippedReport(result.skipped)}
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Error report
                </Button>
              </div>
              <ul className="space-y-3 text-muted-foreground">
                {result.skipped.map((row, i) => (
                  <li key={`${row.name}-${i}`}>
                    <div>{row.reason}</div>
                    {!!row.matches?.length && (
                      <div className="mt-1 flex flex-col gap-1">
                        {row.matches.map((m) => (
                          <Link
                            key={m.id}
                            to={`/candidates/${m.id}`}
                            className="text-primary font-medium hover:underline"
                            onClick={close}
                          >
                            {m.candidate_id} · {m.full_name}
                            {m.branch ? ` · ${m.branch}` : ''}
                          </Link>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!!result?.updated.length && !isPreview && (
            <ul className="list-disc pl-5 space-y-1">
              {result.updated.map((row) => (
                <li key={row.id}>{row.full_name}</li>
              ))}
            </ul>
          )}

          <div className="flex justify-end gap-2 pt-2">
            {isPreview ? (
              <>
                <Button variant="secondary" onClick={close}>Cancel</Button>
                <Button
                  disabled={!proposed.length || busy}
                  isLoading={busy}
                  onClick={() => fileRef.current && void run(fileRef.current, false)}
                >
                  Confirm {proposed.length} match{proposed.length === 1 ? '' : 'es'}
                </Button>
              </>
            ) : (
              <Button onClick={close}>Close</Button>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
