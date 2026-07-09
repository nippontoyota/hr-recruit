import { useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button, Modal } from '../../components/ui';
import { Plus, FileDown, Edit3 } from 'lucide-react';
import { AddCandidateWizard } from './wizard/AddCandidateWizard';

export default function CandidatesList() {
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [importMode, setImportMode] = useState(false);

  const handleStartManual = () => {
    setImportMode(false);
    setIsPromptOpen(false);
    setIsAddOpen(true);
  };

  const handleStartImport = () => {
    setImportMode(true);
    setIsPromptOpen(false);
    setIsAddOpen(true);
    // Note: Here we would trigger the actual API call or pre-fill data.
  };

  return (
    <>
      <PageHeader 
        title="Candidates" 
        action={
          <Button onClick={() => setIsPromptOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Candidate
          </Button>
        }
      />
      
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-text-secondary">Candidates list goes here</p>
      </div>

      {/* Pipeline Prompt Modal */}
      <Modal
        isOpen={isPromptOpen}
        onClose={() => setIsPromptOpen(false)}
        title="Add New Candidate"
        size="md"
      >
        <div className="p-4 space-y-6">
          <p className="text-text-secondary">How would you like to create this candidate profile?</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={handleStartImport}
              className="flex flex-col items-center justify-center p-6 border-2 border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-center group"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileDown className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-semibold text-text-primary mb-1">Import from Form</h4>
              <p className="text-xs text-text-secondary">Automatically fill details from a candidate's submitted form.</p>
            </button>

            <button 
              onClick={handleStartManual}
              className="flex flex-col items-center justify-center p-6 border-2 border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-center group"
            >
              <div className="w-12 h-12 rounded-full bg-surface border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Edit3 className="w-6 h-6 text-text-secondary" />
              </div>
              <h4 className="font-semibold text-text-primary mb-1">Manual Entry</h4>
              <p className="text-xs text-text-secondary">Start from scratch with a completely blank profile.</p>
            </button>
          </div>
        </div>
      </Modal>

      {/* Main Wizard Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Candidate Details"
      >
        <AddCandidateWizard
          importMode={importMode}
          onSuccess={() => setIsAddOpen(false)}
          onCancel={() => setIsAddOpen(false)}
        />
      </Modal>
    </>
  );
}
