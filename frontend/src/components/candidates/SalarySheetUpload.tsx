import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { uploadSalarySheet, type SalaryUploadResult, type SalaryUploadSkip } from '../../api/candidates';
import { extractError } from '../../lib/utils';
import { Button, Modal } from '../ui';

interface SalarySheetUploadProps {
  candidateId?: string;
  onDone?: () => void;
  compact?: boolean;
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

export function SalarySheetUpload({ candidateId, onDone, compact }: SalarySheetUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<File | null>(null);
  const [busy, setBusy] = useState(false);
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
      <Button
        variant="secondary"
        size={compact ? 'sm' : 'md'}
        isLoading={busy}
        onClick={() => inputRef.current?.click()}
      >
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        Upload salary sheet
      </Button>

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
