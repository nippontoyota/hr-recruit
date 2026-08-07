import { useState } from 'react';
import { Button } from '../ui';
import { CheckCircle2, Circle, Users, Briefcase, Hash } from 'lucide-react';
import type { Candidate } from '../../types';

interface BackgroundVerificationWidgetProps {
  candidate: Candidate;
  onUpdate: () => void;
}

export function BackgroundVerificationWidget({ candidate, onUpdate }: BackgroundVerificationWidgetProps) {
  const [familyVerified, setFamilyVerified] = useState(false);
  const [employmentVerified, setEmploymentVerified] = useState(false);
  const [socialVerified, setSocialVerified] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-foreground font-accent">Background Verification</h2>
          <p className="text-sm text-text-secondary mt-1">Complete all necessary verification checks before proceeding.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 flex flex-col gap-4 border-2 border-dashed bg-surface rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-bold text-foreground">Family</h3>
          </div>
          <p className="text-xs text-text-secondary flex-1">Verify immediate family details and background.</p>
          <button 
            type="button"
            onClick={() => setFamilyVerified(!familyVerified)}
            className="flex items-center gap-2 mt-2 w-full justify-center py-2 rounded-lg bg-background hover:bg-muted border transition-colors"
          >
            {familyVerified ? (
              <><CheckCircle2 className="w-5 h-5 text-success" /><span className="font-bold text-success text-sm">Verified</span></>
            ) : (
              <><Circle className="w-5 h-5 text-muted-foreground" /><span className="font-bold text-text-secondary text-sm">Mark Verified</span></>
            )}
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4 border-2 border-dashed bg-surface rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="font-bold text-foreground">Employment</h3>
          </div>
          <p className="text-xs text-text-secondary flex-1">Check previous employment history and references.</p>
          <button 
            type="button"
            onClick={() => setEmploymentVerified(!employmentVerified)}
            className="flex items-center gap-2 mt-2 w-full justify-center py-2 rounded-lg bg-background hover:bg-muted border transition-colors"
          >
            {employmentVerified ? (
              <><CheckCircle2 className="w-5 h-5 text-success" /><span className="font-bold text-success text-sm">Verified</span></>
            ) : (
              <><Circle className="w-5 h-5 text-muted-foreground" /><span className="font-bold text-text-secondary text-sm">Mark Verified</span></>
            )}
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4 border-2 border-dashed bg-surface rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
              <Hash className="w-5 h-5 text-pink-600" />
            </div>
            <h3 className="font-bold text-foreground">Social Media</h3>
          </div>
          <p className="text-xs text-text-secondary flex-1">Review social footprints and online presence.</p>
          <button 
            type="button"
            onClick={() => setSocialVerified(!socialVerified)}
            className="flex items-center gap-2 mt-2 w-full justify-center py-2 rounded-lg bg-background hover:bg-muted border transition-colors"
          >
            {socialVerified ? (
              <><CheckCircle2 className="w-5 h-5 text-success" /><span className="font-bold text-success text-sm">Verified</span></>
            ) : (
              <><Circle className="w-5 h-5 text-muted-foreground" /><span className="font-bold text-text-secondary text-sm">Mark Verified</span></>
            )}
          </button>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-border">
        <Button variant="primary" disabled={!(familyVerified && employmentVerified && socialVerified)}>
          Complete Verification
        </Button>
      </div>
    </div>
  );
}
