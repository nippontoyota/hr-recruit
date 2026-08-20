import { useState, useEffect, useCallback } from 'react';
import { User, Phone, Plus, Edit2, Trash2, Check, X, Users, AlertCircle, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Select, Modal } from '../ui';
import {
  listInterviewers,
  createInterviewer,
  updateInterviewerPhone,
  deleteInterviewer,
  type InterviewerNameRow,
} from '../../api/settings';
import { extractError, isAbortError } from '../../lib/utils';
import { validatePhone, digitsOnly } from '../../lib/validation';

interface InterviewerPickerProps {
  value: string;
  onChange: (name: string) => void;
  branch?: string | null;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  onInterviewerChange?: (interviewer: InterviewerNameRow | null) => void;
}

export function InterviewerPicker({
  value,
  onChange,
  branch,
  disabled = false,
  required = false,
  label = 'Interviewer',
  onInterviewerChange,
}: InterviewerPickerProps) {
  const [savedNames, setSavedNames] = useState<InterviewerNameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Selected interviewer inline phone editing state
  const [isEditingSelectedPhone, setIsEditingSelectedPhone] = useState(false);
  const [selectedPhoneDraft, setSelectedPhoneDraft] = useState('');
  const [savingSelectedPhone, setSavingSelectedPhone] = useState(false);

  // Modal directory editing state
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [rowPhoneDraft, setRowPhoneDraft] = useState('');
  const [savingRowPhone, setSavingRowPhone] = useState(false);

  // Add new interviewer draft in modal
  const [newNameDraft, setNewNameDraft] = useState('');
  const [newPhoneDraft, setNewPhoneDraft] = useState('');
  const [addingInterviewer, setAddingInterviewer] = useState(false);

  const refreshNames = useCallback(async () => {
    try {
      setLoading(true);
      const list = await listInterviewers(branch);
      setSavedNames(list);
    } catch (err) {
      if (isAbortError(err)) return;
      toast.error(extractError(err, 'Failed to load interviewers'));
    } finally {
      setLoading(false);
    }
  }, [branch]);

  useEffect(() => {
    void refreshNames();
  }, [refreshNames]);

  const selectedInterviewer = savedNames.find(
    (n) => n.name.toLowerCase() === value.trim().toLowerCase()
  ) || null;

  useEffect(() => {
    onInterviewerChange?.(selectedInterviewer);
  }, [selectedInterviewer, onInterviewerChange]);

  const handleSelectChange = (name: string) => {
    onChange(name);
    setIsEditingSelectedPhone(false);
  };

  const handleSaveSelectedPhone = async () => {
    if (!selectedInterviewer) return;
    const phoneCheck = validatePhone(selectedPhoneDraft, 'Interviewer phone');
    if (!phoneCheck.ok) {
      toast.error(phoneCheck.message);
      return;
    }
    setSavingSelectedPhone(true);
    try {
      const updated = await updateInterviewerPhone(selectedInterviewer.id, digitsOnly(selectedPhoneDraft), branch);
      await refreshNames();
      setIsEditingSelectedPhone(false);
      onInterviewerChange?.(updated);
      toast.success(`Phone saved for ${selectedInterviewer.name}`);
    } catch (err) {
      toast.error(extractError(err, 'Failed to update phone number'));
    } finally {
      setSavingSelectedPhone(false);
    }
  };

  const handleSaveRowPhone = async (row: InterviewerNameRow) => {
    const phoneCheck = validatePhone(rowPhoneDraft, 'Interviewer phone');
    if (!phoneCheck.ok) {
      toast.error(phoneCheck.message);
      return;
    }
    setSavingRowPhone(true);
    try {
      await updateInterviewerPhone(row.id, digitsOnly(rowPhoneDraft), branch);
      await refreshNames();
      setEditingRowId(null);
      toast.success(`Phone updated for ${row.name}`);
    } catch (err) {
      toast.error(extractError(err, 'Failed to update phone number'));
    } finally {
      setSavingRowPhone(false);
    }
  };

  const handleAddNewInterviewer = async () => {
    if (!newNameDraft.trim()) {
      toast.error('Enter the interviewer name');
      return;
    }
    if (newPhoneDraft.trim()) {
      const phoneCheck = validatePhone(newPhoneDraft, 'Interviewer phone');
      if (!phoneCheck.ok) {
        toast.error(phoneCheck.message);
        return;
      }
    }
    setAddingInterviewer(true);
    try {
      const row = await createInterviewer(newNameDraft.trim(), branch, newPhoneDraft.trim() ? digitsOnly(newPhoneDraft) : undefined);
      await refreshNames();
      onChange(row.name);
      setNewNameDraft('');
      setNewPhoneDraft('');
      toast.success(`${row.name} added to interviewer directory`);
    } catch (err) {
      toast.error(extractError(err, 'Failed to add interviewer'));
    } finally {
      setAddingInterviewer(false);
    }
  };

  const handleDeleteInterviewer = async (row: InterviewerNameRow) => {
    try {
      await deleteInterviewer(row.id, branch);
      await refreshNames();
      if (value.toLowerCase() === row.name.toLowerCase()) {
        onChange('');
      }
      toast.success(`${row.name} removed from directory`);
    } catch (err) {
      toast.error(extractError(err, 'Failed to delete interviewer'));
    }
  };

  const filteredSavedNames = savedNames.filter((row) =>
    !searchFilter.trim() || row.name.toLowerCase().includes(searchFilter.toLowerCase()) || (row.phone && row.phone.includes(searchFilter))
  );

  return (
    <div className="space-y-2.5">
      {/* Label & Header Actions */}
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <button
          type="button"
          onClick={() => setIsManageOpen(true)}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-semibold border border-slate-200 transition-all cursor-pointer disabled:pointer-events-none disabled:opacity-50"
        >
          <Users className="w-3.5 h-3.5 text-slate-500" />
          <span>Directory</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-300/80 text-[10px] font-bold text-slate-800">
            {savedNames.length}
          </span>
        </button>
      </div>

      {/* Primary Selector */}
      <div className="space-y-2">
        <Select
          value={value}
          onChange={(e) => handleSelectChange(e.target.value)}
          disabled={disabled || loading}
          searchable
          className="w-full"
          addNewLabel="Add New Interviewer..."
          onAddNew={(draftName) => {
            if (draftName) setNewNameDraft(draftName);
            setIsManageOpen(true);
          }}
        >
          <option value="">{loading ? 'Loading interviewers…' : 'Select interviewer…'}</option>
          {savedNames.map((row) => (
            <option key={row.id} value={row.name}>
              {row.name} {row.phone ? `(+91 ${row.phone})` : '(No phone)'}
            </option>
          ))}
          {value && !savedNames.some((n) => n.name.toLowerCase() === value.toLowerCase()) && (
            <option value={value}>{value}</option>
          )}
        </Select>

        {/* Selected Interviewer Information Card */}
        {value && (
          <div className="flex flex-col gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center font-bold text-[10px] shrink-0 shadow-xs">
                  {value.charAt(0).toUpperCase()}
                </div>
                <span className="font-semibold text-slate-900 truncate">{value}</span>
              </div>

              {selectedInterviewer ? (
                selectedInterviewer.phone ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200/80">
                      <Phone className="w-3 h-3 text-emerald-600" /> +91 {selectedInterviewer.phone}
                    </span>
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPhoneDraft(selectedInterviewer.phone || '');
                          setIsEditingSelectedPhone(true);
                        }}
                        className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-200/60 transition-colors"
                        title="Edit phone number"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-medium border border-amber-200/80">
                      <AlertCircle className="w-3 h-3 text-amber-600" /> No WhatsApp phone
                    </span>
                    {!disabled && !isEditingSelectedPhone && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPhoneDraft('');
                          setIsEditingSelectedPhone(true);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-[#1e3a5f] bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                      >
                        <Edit2 className="w-3 h-3" /> Add Phone
                      </button>
                    )}
                  </div>
                )
              ) : (
                <span className="text-[11px] text-slate-400 italic">Custom Name</span>
              )}
            </div>

            {/* Inline Phone Editor for Selected Interviewer */}
            {isEditingSelectedPhone && selectedInterviewer && (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200 mt-1">
                <span className="text-slate-500 font-semibold text-[11px] shrink-0">+91</span>
                <Input
                  placeholder="10-digit mobile"
                  value={selectedPhoneDraft}
                  onChange={(e) => setSelectedPhoneDraft(digitsOnly(e.target.value, 10))}
                  maxLength={10}
                  className="h-7 text-xs flex-1 bg-white"
                  autoFocus
                />
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={handleSaveSelectedPhone}
                  isLoading={savingSelectedPhone}
                  className="h-7 px-2.5 text-xs bg-[#1e3a5f] hover:bg-[#284c7a]"
                >
                  <Check className="w-3 h-3 mr-1" /> Save
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingSelectedPhone(false)}
                  disabled={savingSelectedPhone}
                  className="h-7 px-2 text-xs"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interviewer Directory Modal */}
      <Modal
        isOpen={isManageOpen}
        onClose={() => {
          setIsManageOpen(false);
          setEditingRowId(null);
        }}
        title="Interviewer Directory"
        description={`Manage registered interviewers and WhatsApp contacts${branch ? ` for ${branch}` : ''}.`}
        size="md"
      >
        <div className="p-6 space-y-6">
          {/* Section 1: Saved Interviewers Header & Search */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search interviewers..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
                />
              </div>
              <span className="text-xs text-slate-500 font-medium shrink-0">
                {savedNames.length} {savedNames.length === 1 ? 'interviewer' : 'interviewers'}
              </span>
            </div>

            {filteredSavedNames.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-50 border border-slate-200/80 text-center text-xs text-slate-500">
                {searchFilter ? 'No interviewers match your search.' : 'No interviewers in directory yet. Add one below.'}
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {filteredSavedNames.map((row) => {
                  const isEditingThisRow = editingRowId === row.id;
                  const isSelected = value.toLowerCase() === row.name.toLowerCase();

                  return (
                    <div
                      key={row.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-blue-300 bg-blue-50/50 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                            {row.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-slate-900 truncate">
                                {row.name}
                              </span>
                              {isSelected && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                  Current
                                </span>
                              )}
                            </div>
                            <div className="text-xs flex items-center gap-1.5 mt-0.5">
                              {row.phone ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                                  <Phone className="w-3 h-3 text-emerald-600" /> +91 {row.phone}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">No WhatsApp phone</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (isEditingThisRow) {
                                setEditingRowId(null);
                              } else {
                                setRowPhoneDraft(row.phone || '');
                                setEditingRowId(row.id);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3 text-slate-500" />
                            <span>{row.phone ? 'Edit' : 'Add Phone'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteInterviewer(row)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            title={`Delete ${row.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Inline Phone Edit in Modal */}
                      {isEditingThisRow && (
                        <div className="flex items-center gap-2 pt-2.5 mt-2.5 border-t border-slate-200">
                          <span className="text-xs text-slate-500 font-semibold">+91</span>
                          <Input
                            placeholder="10-digit mobile"
                            value={rowPhoneDraft}
                            onChange={(e) => setRowPhoneDraft(digitsOnly(e.target.value, 10))}
                            maxLength={10}
                            className="h-8 text-xs flex-1 bg-white"
                            autoFocus
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            onClick={() => handleSaveRowPhone(row)}
                            isLoading={savingRowPhone}
                            className="h-8 px-3 text-xs bg-[#1e3a5f] hover:bg-[#284c7a]"
                          >
                            Save Phone
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingRowId(null)}
                            disabled={savingRowPhone}
                            className="h-8 px-2 text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Add New Interviewer */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-[#1e3a5f]" />
              Add New Interviewer
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Rahul Varma"
                  value={newNameDraft}
                  onChange={(e) => setNewNameDraft(e.target.value)}
                  className="h-8.5 text-xs bg-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Phone (+91 WhatsApp)
                </label>
                <Input
                  placeholder="10-digit mobile (optional)"
                  value={newPhoneDraft}
                  onChange={(e) => setNewPhoneDraft(digitsOnly(e.target.value, 10))}
                  maxLength={10}
                  className="h-8.5 text-xs bg-white"
                />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleAddNewInterviewer}
                isLoading={addingInterviewer}
                className="h-8.5 px-4 font-bold text-xs bg-[#1e3a5f] hover:bg-[#284c7a] text-white"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add to Directory
              </Button>
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-200 pt-4">
            <Button variant="secondary" onClick={() => setIsManageOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
