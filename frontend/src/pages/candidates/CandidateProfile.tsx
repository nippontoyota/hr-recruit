import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, Button, StageBadge, LoadingSpinner, EmptyState } from '../../components/ui';
import { getCandidateById } from '../../api/candidates';
import type { Candidate } from '../../types';
import { ArrowLeft, User, FileText, MessageSquare, Clock, Phone, Mail } from 'lucide-react';
import { cn } from '../../lib/utils';

const TABS = [
  { id: 'overview', name: 'Overview', icon: User },
  { id: 'interviews', name: 'Interviews & Remarks', icon: FileText },
  { id: 'documents', name: 'Documents', icon: FileText },
  { id: 'messages', name: 'Messages', icon: MessageSquare },
  { id: 'activity', name: 'Activity', icon: Clock },
];

export default function CandidateProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (id) {
      getCandidateById(id).then((data) => {
        setCandidate(data || null);
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold mb-4">Candidate not found</h2>
        <Button onClick={() => navigate('/candidates')}>Back to list</Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/candidates')} className="-ml-3">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Candidates
        </Button>
      </div>

      <PageHeader 
        title={candidate.full_name} 
        description={`Candidate ID: ${candidate.candidate_id}`}
        action={
          <div className="flex items-center gap-3">
            <StageBadge stage={candidate.current_stage} className="px-3 py-1 text-sm" />
            <Button variant="primary">Update Stage</Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                  'group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium whitespace-nowrap'
                )}
              >
                <Icon
                  className={cn(
                    isActive ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500',
                    'mr-2 h-5 w-5'
                  )}
                  aria-hidden="true"
                />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content Shells */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="col-span-1 md:col-span-2">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Application Details</h3>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Source</dt>
                  <dd className="mt-1 text-sm text-gray-900">{candidate.source_channel}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Applied On</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(candidate.applied_at).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>
          </Card>
          
          <Card className="col-span-1">
             <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Contact</h3>
            </div>
            <div className="p-6 space-y-4">
               <div className="flex items-center text-sm">
                 <Phone className="w-5 h-5 text-gray-400 mr-3" />
                 {candidate.phone}
               </div>
               {candidate.email && (
                 <div className="flex items-center text-sm">
                   <Mail className="w-5 h-5 text-gray-400 mr-3" />
                   {candidate.email}
                 </div>
               )}
            </div>
          </Card>
        </div>
      )}

      {activeTab !== 'overview' && (
        <Card>
          <div className="p-12">
            <EmptyState 
              icon={<FileText className="w-8 h-8" />}
              title="Coming Soon"
              description={`The ${TABS.find(t => t.id === activeTab)?.name} section is currently under construction.`}
            />
          </div>
        </Card>
      )}
    </>
  );
}
