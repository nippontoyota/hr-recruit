import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button, Modal, Input, Select, LoadingSpinner, EmptyState } from '../../components/ui';
import { Plus, Link, UploadCloud, Eye, RefreshCw } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { getCandidates, createCandidate, uploadResume } from '../../api/candidates';
import type { Candidate } from '../../types';

export default function CandidatesList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Form Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchCandidatesList = async () => {
    try {
      setLoading(true);
      const list = await getCandidates();
      setCandidates(list);
    } catch (err) {
      console.error('Failed to load candidates', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidatesList();
  }, []);

  const handleCopyLink = () => {
    if (!user) return;
    const url = `${window.location.origin}/apply?hr=${user.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenAddModal = () => {
    setFullName('');
    setPhone('');
    setEmail('');
    setSource('');
    setResumeFile(null);
    setFormError('');
    setIsAddOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      setFormError('Full Name and Phone Number are required.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const newCandidate = await createCandidate({
        full_name: fullName,
        phone: phone,
        email: email || undefined,
        source_channel: source || 'OTHER',
      } as any);

      if (resumeFile) {
        await uploadResume(newCandidate.id, resumeFile);
      }

      setIsAddOpen(false);
      fetchCandidatesList();
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || err.message || 'Failed to create candidate.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Candidates"
        action={
          <div className="flex gap-3">
            {user?.role === 'HR' && (
              <Button variant="secondary" onClick={handleCopyLink}>
                <Link className="w-4 h-4 mr-2" />
                {copied ? 'Copied!' : 'Copy Recruiter Link'}
              </Button>
            )}
            <Button onClick={handleOpenAddModal}>
              <Plus className="w-4 h-4 mr-2" />
              Add Candidate
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : candidates.length === 0 ? (
        <div className="py-12">
          <EmptyState
            title="No Candidates Found"
            description="No candidates have applied or been registered under your recruiter profile yet."
            action={
              <Button onClick={handleOpenAddModal}>
                <Plus className="w-4 h-4 mr-2" /> Register Candidate
              </Button>
            }
          />
        </div>
      ) : (
        <div className="bg-surface border border-border/80 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-background/50 border-b border-border/40 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                <th className="px-6 py-4">Candidate ID</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Stage</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 text-sm text-text-primary">
              {candidates.map((candidate) => (
                <tr key={candidate.id} className="hover:bg-background/20 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs">{candidate.candidate_id}</td>
                  <td className="px-6 py-4 font-semibold">{candidate.full_name}</td>
                  <td className="px-6 py-4">{candidate.phone}</td>
                  <td className="px-6 py-4">{candidate.email || '-'}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {candidate.current_stage.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/candidates/${candidate.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-1.5" /> View Profile
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Simplified Add Candidate Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New Candidate"
        size="md"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Full Name <span className="text-danger">*</span>
            </label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Phone Number <span className="text-danger">*</span>
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Email Address <span className="text-text-secondary">(Optional)</span>
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. rahul@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Source <span className="text-text-secondary">(Optional)</span>
            </label>
            <Select
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="">Select source</option>
              <option value="WALK_IN">Walk-In</option>
              <option value="INDEED">Indeed</option>
              <option value="REFERRAL">Referral</option>
              <option value="CAMPUS">Campus</option>
              <option value="OTHER">Other / LinkedIn</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Upload Resume <span className="text-text-secondary">(Optional)</span>
            </label>
            <div className="border-2 border-dashed border-border/80 rounded-xl p-4 bg-background text-center relative hover:border-primary/40 transition-colors">
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept=".pdf,.doc,.docx"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setResumeFile(e.target.files[0]);
                  }
                }}
              />
              <div className="flex flex-col items-center justify-center pointer-events-none">
                <UploadCloud className="w-8 h-8 text-text-secondary mb-2" />
                <span className="text-xs text-text-secondary">
                  {resumeFile ? resumeFile.name : 'Select PDF or Word resume'}
                </span>
              </div>
            </div>
          </div>

          {formError && (
            <p className="text-xs text-danger text-center font-medium">{formError}</p>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save Candidate
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
