import { useCallback, useEffect, useState } from 'react';
import { Trash2, Plus, Users, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Select, Modal } from '../ui';
import {
  createInterviewer,
  deleteInterviewer,
  listInterviewers,
  type InterviewerNameRow,
} from '../../api/settings';
import { extractError, isAbortError } from '../../lib/utils';

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
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [savingNew, setSavingNew] = useState(false);

  const refreshNames = useCallback(async () => {
    try {
      setLoadingNames(true);
      setSavedNames(await listInterviewers(branch));
    } catch (err) {
      if (isAbortError(err)) return;
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
    setSavingNew(true);
    try {
      const row = await createInterviewer(newNameDraft.trim(), branch);
      await refreshNames();
      onChange(row.name);
      setNewNameDraft('');
      setIsAdding(false);
      toast.success('Name saved');
    } catch (err) {
      toast.error(extractError(err, 'Failed to save name'));
    } finally {
      setSavingNew(false);
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
    <div className="rounded-xl border border-border/80 bg-surface/50 p-3.5 space-y-2.5 shadow-xs">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider">
          {label}
        </label>
        {!disabled && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsAdding(!isAdding)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold transition-colors cursor-pointer border border-primary/20"
            >
              <Plus className="w-3 h-3" />
              <span>{isAdding ? 'Cancel' : 'Add New'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsManageOpen(true)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-text-secondary hover:text-text-primary text-[11px] font-semibold transition-colors cursor-pointer border border-border"
              title="Manage names list"
            >
              <Users className="w-3 h-3" />
              <span>Manage</span>
            </button>
          </div>
        )}
      </div>

      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loadingNames}
        searchable
        className="w-full text-xs"
        addNewLabel={`${addPlaceholder}...`}
        onAddNew={(draft) => {
          if (draft) setNewNameDraft(draft);
          setIsAdding(true);
        }}
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

      {/* Quick Add Inline Form */}
      {isAdding && (
        <div className="flex items-center gap-1.5 pt-1">
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
            disabled={disabled || savingNew}
            className="h-8 text-xs flex-1"
            autoFocus
          />
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleAddName}
            isLoading={savingNew}
            className="h-8 px-2.5 text-xs font-semibold"
          >
            <Check className="w-3.5 h-3.5 mr-1" /> Save
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsAdding(false);
              setNewNameDraft('');
            }}
            className="h-8 px-2 text-xs"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Manage Names Modal */}
      <Modal
        isOpen={isManageOpen}
        onClose={() => setIsManageOpen(false)}
        title={`Manage ${label}`}
        description="View or remove existing entries."
        size="sm"
      >
        <div className="p-5 space-y-4">
          {savedNames.length === 0 ? (
            <p className="text-xs text-text-secondary text-center py-3">No names saved yet.</p>
          ) : (
            <ul className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {savedNames.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs border border-border/50"
                >
                  <span className="font-semibold text-text-primary truncate">{row.name}</span>
                  <button
                    type="button"
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                    onClick={() => handleRemoveName(row)}
                    title={`Remove ${row.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-end pt-2 border-t border-border">
            <Button variant="secondary" size="sm" onClick={() => setIsManageOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

