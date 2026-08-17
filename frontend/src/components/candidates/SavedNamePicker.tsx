import { useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Select } from '../ui';
import {
  createInterviewer,
  deleteInterviewer,
  listInterviewers,
  type InterviewerNameRow,
} from '../../api/settings';
import { extractError } from '../../lib/utils';

interface SavedNamePickerProps {
  label: string;
  value: string;
  onChange: (name: string) => void;
  branch?: string | null;
  disabled?: boolean;
  addPlaceholder?: string;
}

export function SavedNamePicker({
  label,
  value,
  onChange,
  branch,
  disabled = false,
  addPlaceholder = 'Add new name',
}: SavedNamePickerProps) {
  const [savedNames, setSavedNames] = useState<InterviewerNameRow[]>([]);
  const [newNameDraft, setNewNameDraft] = useState('');
  const [loadingNames, setLoadingNames] = useState(true);

  const refreshNames = useCallback(async () => {
    try {
      setLoadingNames(true);
      setSavedNames(await listInterviewers(branch));
    } catch (err) {
      toast.error(extractError(err, 'Failed to load saved names'));
    } finally {
      setLoadingNames(false);
    }
  }, [branch]);

  useEffect(() => {
    void refreshNames();
  }, [refreshNames]);

  const handleAddName = async () => {
    if (!newNameDraft.trim()) {
      toast.error('Enter a name');
      return;
    }
    try {
      const row = await createInterviewer(newNameDraft, branch);
      await refreshNames();
      onChange(row.name);
      setNewNameDraft('');
      toast.success('Name saved');
    } catch (err) {
      toast.error(extractError(err, 'Failed to save name'));
    }
  };

  const handleRemoveName = async (row: InterviewerNameRow) => {
    try {
      await deleteInterviewer(row.id, branch);
      await refreshNames();
      if (value.toLowerCase() === row.name.toLowerCase()) {
        onChange('');
      }
      toast.success('Name removed');
    } catch (err) {
      toast.error(extractError(err, 'Failed to remove name'));
    }
  };

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <label className="block text-xs font-bold text-text-secondary uppercase">{label}</label>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loadingNames}
        searchable
      >
        <option value="">{loadingNames ? 'Loading…' : 'Select name…'}</option>
        {savedNames.map((row) => (
          <option key={row.id} value={row.name}>
            {row.name}
          </option>
        ))}
        {value && !savedNames.some((n) => n.name.toLowerCase() === value.toLowerCase()) && (
          <option value={value}>{value}</option>
        )}
      </Select>

      {savedNames.length > 0 && (
        <ul className="space-y-1 max-h-24 overflow-y-auto">
          {savedNames.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1 text-sm"
            >
              <button
                type="button"
                className="truncate text-left font-medium hover:text-primary disabled:pointer-events-none"
                onClick={() => onChange(row.name)}
                disabled={disabled}
              >
                {row.name}
              </button>
              <button
                type="button"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
                onClick={() => handleRemoveName(row)}
                disabled={disabled}
                title={`Remove ${row.name}`}
                aria-label={`Remove ${row.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2">
        <Input
          placeholder={addPlaceholder}
          value={newNameDraft}
          onChange={(e) => setNewNameDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void handleAddName();
            }
          }}
          disabled={disabled}
        />
        <Button type="button" variant="secondary" size="sm" onClick={handleAddName} disabled={disabled}>
          Save name
        </Button>
      </div>
    </div>
  );
}
