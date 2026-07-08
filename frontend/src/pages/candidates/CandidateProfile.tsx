import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button, EmptyState } from '../../components/ui';
import { ArrowLeft, User, FileText, MessageSquare, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';

const TABS = [
  { id: 'overview', name: 'Overview', icon: User },
  { id: 'interviews', name: 'Interviews & Remarks', icon: FileText },
  { id: 'documents', name: 'Documents', icon: FileText },
  { id: 'messages', name: 'Messages', icon: MessageSquare },
  { id: 'activity', name: 'Activity', icon: Clock },
];

export default function CandidateProfile() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <>
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/candidates')} className="-ml-3">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Candidates
        </Button>
      </div>

      <PageHeader 
        title={`Candidate Profile`}
        action={
          <div className="flex items-center gap-3">
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
      <div className="p-12">
          <EmptyState 
            icon={<FileText className="w-8 h-8" />}
            title="Content Placeholder"
            description={`The ${TABS.find(t => t.id === activeTab)?.name} section goes here.`}
          />
        </div>
    </>
  );
}
