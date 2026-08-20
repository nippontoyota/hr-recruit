import { useEffect, useState, useMemo } from 'react';
import {
  Briefcase,
  MapPin,
  Building2,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  Users,
  Search,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Modal, Select } from '../ui';
import { useAuth } from '../../auth';
import { CANDIDATE_DEPARTMENTS, NIPPON_BRANCHES } from '../../types';
import { extractError, isAbortError } from '../../lib/utils';
import {
  createOpening,
  deleteOpening,
  listOpenings,
  updateOpening,
  type JobOpening,
  type JobOpeningInput,
} from '../../api/openings';

const EMPTY_FORM: JobOpeningInput = {
  position: '',
  department: '',
  location: '',
  headcount: 1,
};

interface DeptTheme {
  border: string;
  hoverBorder: string;
  bgGradient: string;
  accentBar: string;
  tag: string;
  slotBadge: string;
  iconColor: string;
}

function getDeptTheme(department: string): DeptTheme {
  const d = (department || '').toLowerCase();
  if (d.includes('sales')) {
    return {
      border: 'border-indigo-200/90',
      hoverBorder: 'hover:border-indigo-500 hover:shadow-indigo-500/10',
      bgGradient: 'bg-gradient-to-br from-indigo-50/60 via-white to-white',
      accentBar: 'bg-indigo-600',
      tag: 'bg-indigo-100/70 text-indigo-800 border-indigo-200/80',
      slotBadge: 'bg-indigo-600 text-white shadow-xs',
      iconColor: 'text-indigo-600',
    };
  }
  if (d.includes('service')) {
    return {
      border: 'border-emerald-200/90',
      hoverBorder: 'hover:border-emerald-500 hover:shadow-emerald-500/10',
      bgGradient: 'bg-gradient-to-br from-emerald-50/60 via-white to-white',
      accentBar: 'bg-emerald-600',
      tag: 'bg-emerald-100/70 text-emerald-800 border-emerald-200/80',
      slotBadge: 'bg-emerald-600 text-white shadow-xs',
      iconColor: 'text-emerald-600',
    };
  }
  if (d.includes('cr') || d.includes('call centre') || d.includes('customer')) {
    return {
      border: 'border-amber-200/90',
      hoverBorder: 'hover:border-amber-500 hover:shadow-amber-500/10',
      bgGradient: 'bg-gradient-to-br from-amber-50/60 via-white to-white',
      accentBar: 'bg-amber-500',
      tag: 'bg-amber-100/70 text-amber-900 border-amber-200/80',
      slotBadge: 'bg-amber-600 text-white shadow-xs',
      iconColor: 'text-amber-600',
    };
  }
  if (d.includes('hr') || d.includes('admin') || d.includes('training')) {
    return {
      border: 'border-purple-200/90',
      hoverBorder: 'hover:border-purple-500 hover:shadow-purple-500/10',
      bgGradient: 'bg-gradient-to-br from-purple-50/60 via-white to-white',
      accentBar: 'bg-purple-600',
      tag: 'bg-purple-100/70 text-purple-800 border-purple-200/80',
      slotBadge: 'bg-purple-600 text-white shadow-xs',
      iconColor: 'text-purple-600',
    };
  }
  if (d.includes('account') || d.includes('finance') || d.includes('purchase')) {
    return {
      border: 'border-sky-200/90',
      hoverBorder: 'hover:border-sky-500 hover:shadow-sky-500/10',
      bgGradient: 'bg-gradient-to-br from-sky-50/60 via-white to-white',
      accentBar: 'bg-sky-600',
      tag: 'bg-sky-100/70 text-sky-800 border-sky-200/80',
      slotBadge: 'bg-sky-600 text-white shadow-xs',
      iconColor: 'text-sky-600',
    };
  }
  if (d.includes('insurance') || d.includes('system') || d.includes('project') || d.includes('security')) {
    return {
      border: 'border-teal-200/90',
      hoverBorder: 'hover:border-teal-500 hover:shadow-teal-500/10',
      bgGradient: 'bg-gradient-to-br from-teal-50/60 via-white to-white',
      accentBar: 'bg-teal-600',
      tag: 'bg-teal-100/70 text-teal-800 border-teal-200/80',
      slotBadge: 'bg-teal-600 text-white shadow-xs',
      iconColor: 'text-teal-600',
    };
  }
  return {
    border: 'border-slate-200',
    hoverBorder: 'hover:border-blue-500 hover:shadow-blue-500/10',
    bgGradient: 'bg-gradient-to-br from-slate-50/60 via-white to-white',
    accentBar: 'bg-blue-600',
    tag: 'bg-slate-100 text-slate-800 border-slate-200',
    slotBadge: 'bg-blue-600 text-white shadow-xs',
    iconColor: 'text-blue-600',
  };
}

const INITIAL_VISIBLE_COUNT = 8;

export function RecentOpeningsCard() {
  const { user } = useAuth();
  const canManage = user?.role === 'HO_HR' || user?.role === 'ADMIN';
  const canView = user?.role === 'HO_HR' || user?.role === 'LOCAL_HR' || user?.role === 'ADMIN';

  const [openings, setOpenings] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<JobOpening | null>(null);
  const [form, setForm] = useState<JobOpeningInput>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<JobOpening | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!canView) return;
    let cancelled = false;
    setLoading(true);
    listOpenings()
      .then((rows) => {
        if (!cancelled) setOpenings(rows);
      })
      .catch((err) => {
        if (cancelled || isAbortError(err)) return;
        toast.error(extractError(err, 'Failed to load openings'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canView]);

  // Department counts
  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    openings.forEach((row) => {
      counts[row.department] = (counts[row.department] || 0) + 1;
    });
    return counts;
  }, [openings]);

  const uniqueDepts = useMemo(() => {
    return Object.keys(deptCounts).sort();
  }, [deptCounts]);

  // Filtered openings
  const filteredOpenings = useMemo(() => {
    return openings.filter((row) => {
      const matchDept = selectedDept === 'ALL' || row.department === selectedDept;
      const q = searchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        row.position.toLowerCase().includes(q) ||
        row.department.toLowerCase().includes(q) ||
        row.location.toLowerCase().includes(q);
      return matchDept && matchQuery;
    });
  }, [openings, selectedDept, searchQuery]);

  // Sliced for compact display unless expanded or searching
  const displayedOpenings = useMemo(() => {
    if (isExpanded || searchQuery || filteredOpenings.length <= INITIAL_VISIBLE_COUNT) {
      return filteredOpenings;
    }
    return filteredOpenings.slice(0, INITIAL_VISIBLE_COUNT);
  }, [filteredOpenings, isExpanded, searchQuery]);

  if (!canView) return null;
  if (!canManage && !loading && openings.length === 0) return null;

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setFormOpen(true);
  }

  function openEdit(row: JobOpening) {
    setEditing(row);
    setForm({
      position: row.position,
      department: row.department,
      location: row.location,
      headcount: row.headcount,
    });
    setFormError('');
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    setEditing(null);
    setFormError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const position = form.position.trim();
    if (!position) {
      setFormError('Position is required.');
      return;
    }
    if (!form.department) {
      setFormError('Department is required.');
      return;
    }
    if (!form.location) {
      setFormError('Location is required.');
      return;
    }
    const headcount = Number(form.headcount);
    if (!Number.isInteger(headcount) || headcount < 1) {
      setFormError('Number of openings must be at least 1.');
      return;
    }

    setSaving(true);
    setFormError('');
    const payload: JobOpeningInput = {
      position,
      department: form.department,
      location: form.location,
      headcount,
    };
    try {
      if (editing) {
        const updated = await updateOpening(editing.id, payload);
        setOpenings((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
        toast.success('Opening updated');
      } else {
        const created = await createOpening(payload);
        setOpenings((prev) => [created, ...prev]);
        toast.success('Opening added');
      }
      setFormOpen(false);
      setEditing(null);
    } catch (err) {
      setFormError(extractError(err, 'Failed to save opening'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteOpening(toDelete.id);
      setOpenings((prev) => prev.filter((row) => row.id !== toDelete.id));
      setToDelete(null);
      toast.success('Opening deleted');
    } catch (err) {
      toast.error(extractError(err, 'Failed to delete opening'));
    } finally {
      setDeleting(false);
    }
  }

  const totalPositions = openings.reduce((acc, row) => acc + (row.headcount || 1), 0);
  const uniqueBranches = new Set(openings.map((row) => row.location)).size;

  return (
    <section
      aria-labelledby="active-openings-heading"
      className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 via-white to-white p-3.5 shadow-xs"
    >
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200/70">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-2xs">
            <Briefcase className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="active-openings-heading" className="text-sm font-black tracking-tight text-slate-900">
                Active Job Openings
              </h2>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100/80 text-emerald-800 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {totalPositions} Positions · {openings.length} Roles
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
              {uniqueBranches} branch locations actively recruiting
            </p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2">
          {/* Quick Search Input */}
          <div className="relative w-40 sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search roles / branch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full pl-8 pr-6 text-xs rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {canManage && (
            <Button
              type="button"
              size="sm"
              onClick={openCreate}
              className="h-8 px-3 text-xs font-bold gap-1 bg-blue-600 hover:bg-blue-700 text-white shadow-xs rounded-lg transition-all"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              Post Opening
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs (Department Chips) */}
      {uniqueDepts.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 py-2 text-xs">
          <button
            type="button"
            onClick={() => setSelectedDept('ALL')}
            className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedDept === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            All Roles ({openings.length})
          </button>
          {uniqueDepts.map((dept) => {
            const count = deptCounts[dept];
            const isSelected = selectedDept === dept;
            const theme = getDeptTheme(dept);
            return (
              <button
                key={dept}
                type="button"
                onClick={() => setSelectedDept(dept)}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? `${theme.slotBadge} ring-2 ring-blue-500/20`
                    : `${theme.tag} hover:opacity-100 opacity-80`
                }`}
              >
                {dept} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Responsive Wrapping Grid (NO side scrolling!) */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 py-1">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl border border-slate-200 bg-white p-3 animate-pulse"
            />
          ))}
        </div>
      ) : filteredOpenings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 py-5 px-4 text-center">
          <Sparkles className="h-5 w-5 text-slate-400 mx-auto mb-1.5" />
          <p className="text-xs font-semibold text-slate-600">
            {searchQuery || selectedDept !== 'ALL'
              ? 'No job openings match current filters'
              : 'No active job openings posted'}
          </p>
          {(searchQuery || selectedDept !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSelectedDept('ALL');
                setSearchQuery('');
              }}
              className="text-xs font-bold text-blue-600 hover:underline mt-1 cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 pt-1">
            {displayedOpenings.map((row) => {
              const theme = getDeptTheme(row.department);
              return (
                <div
                  key={row.id}
                  className={`group relative flex flex-col justify-between rounded-xl border ${theme.border} ${theme.bgGradient} ${theme.hoverBorder} p-2.5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden`}
                >
                  {/* Top Accent Stripe */}
                  <div className={`absolute top-0 left-0 right-0 h-1 ${theme.accentBar}`} />

                  <div>
                    <div className="flex items-start justify-between gap-1.5">
                      <h3 className="font-extrabold text-[12.5px] text-slate-900 leading-snug truncate" title={row.position}>
                        {row.position}
                      </h3>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-bold ${theme.slotBadge}`}
                      >
                        <Users className="h-2.5 w-2.5" />
                        {row.headcount} {row.headcount === 1 ? 'Slot' : 'Slots'}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1 items-center">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${theme.tag}`}
                      >
                        <Building2 className="h-2.5 w-2.5 shrink-0 opacity-70" />
                        {row.department}
                      </span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/90 text-slate-700 border border-slate-200 shadow-2xs">
                        <MapPin className={`h-2.5 w-2.5 shrink-0 ${theme.iconColor}`} />
                        {row.location}
                      </span>
                    </div>
                  </div>

                  {canManage && (
                    <div className="mt-2 pt-1.5 border-t border-slate-200/70 flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-100/70 rounded transition-colors cursor-pointer"
                        title={`Edit ${row.position}`}
                        onClick={() => openEdit(row)}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        className="p-1 text-slate-500 hover:text-red-700 hover:bg-red-100/70 rounded transition-colors cursor-pointer"
                        title={`Delete ${row.position}`}
                        onClick={() => setToDelete(row)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Show more / Show less toggle when > 8 items */}
          {filteredOpenings.length > INITIAL_VISIBLE_COUNT && !searchQuery && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-slate-700 hover:text-blue-700 bg-white hover:bg-blue-50/60 border border-slate-200 rounded-full shadow-2xs transition-all cursor-pointer"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" />
                    Show fewer openings
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    Show all {filteredOpenings.length} openings (+{filteredOpenings.length - INITIAL_VISIBLE_COUNT} more)
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Edit/Add Modal */}
      <Modal
        isOpen={formOpen}
        onClose={closeForm}
        title={editing ? 'Edit Job Opening' : 'Add New Job Opening'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="opening-position" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Job Position <span className="text-red-500">*</span>
            </label>
            <Input
              id="opening-position"
              placeholder="e.g. Sales Executive, Technician"
              value={form.position}
              onChange={(e) => setForm((prev) => ({ ...prev, position: e.target.value }))}
              maxLength={100}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="opening-department" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Department <span className="text-red-500">*</span>
              </label>
              <Select
                id="opening-department"
                value={form.department}
                onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
                required
              >
                <option value="" disabled>
                  Select department
                </option>
                {CANDIDATE_DEPARTMENTS.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="opening-location" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Branch Location <span className="text-red-500">*</span>
              </label>
              <Select
                id="opening-location"
                value={form.location}
                onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                required
              >
                <option value="" disabled>
                  Select location
                </option>
                {NIPPON_BRANCHES.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <label htmlFor="opening-headcount" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Number of Openings / Slots <span className="text-red-500">*</span>
            </label>
            <Input
              id="opening-headcount"
              type="number"
              min={1}
              max={999}
              value={form.headcount}
              onChange={(e) => setForm((prev) => ({ ...prev, headcount: Number(e.target.value) }))}
              required
            />
          </div>
          {formError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700" role="alert">
              {formError}
            </div>
          )}
          <div className="flex justify-end gap-2.5 border-t border-slate-200 pt-4">
            <button
              type="button"
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
              onClick={closeForm}
              disabled={saving}
            >
              Cancel
            </button>
            <Button
              type="submit"
              variant="primary"
              isLoading={saving}
              className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
            >
              {editing ? 'Save Changes' : 'Post Opening'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!toDelete}
        onClose={() => !deleting && setToDelete(null)}
        size="sm"
      >
        <div className="p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 ring-8 ring-red-50 mb-4">
            <Trash2 className="h-6 w-6" />
          </div>

          <h3 className="text-lg font-black text-slate-900 mb-1.5">
            Delete Job Opening?
          </h3>

          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Are you sure you want to remove this opening? Branch HR will no longer see this vacancy.
          </p>

          {toDelete && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 mb-5 text-left">
              <div className="font-bold text-slate-900 text-xs truncate">{toDelete.position}</div>
              <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-1.5">
                <span className="font-medium text-slate-700">{toDelete.department}</span>
                <span>•</span>
                <span className="font-medium text-slate-700">{toDelete.location}</span>
                <span>•</span>
                <span className="font-bold text-blue-700">{toDelete.headcount} {toDelete.headcount === 1 ? 'Slot' : 'Slots'}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
              onClick={() => setToDelete(null)}
              disabled={deleting}
            >
              Cancel
            </button>
            <Button
              type="button"
              variant="danger"
              isLoading={deleting}
              onClick={() => void handleDelete()}
              className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-xs"
            >
              Delete Opening
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
