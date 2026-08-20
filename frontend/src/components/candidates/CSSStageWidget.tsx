import { useState, useRef } from 'react';
import { Printer, Pencil } from 'lucide-react';
import { usePrint } from '../../hooks/usePrint';
import { Button } from '../ui';
import type { Candidate, Evaluation } from '../../types';
import { HoReviewPacket } from './HoReviewPacket';
import { EditableCandidateSummarySheet } from './EditableCandidateSummarySheet';
import { updateCandidateRawData, uploadCandidatePhoto } from '../../api/candidates';
import { extractError } from '../../lib/utils';
import { toast } from 'sonner';

interface CSSStageWidgetProps {
  candidate: Candidate;
  evaluations: Evaluation[];
  onUpdate: () => void;
  isReadOnly?: boolean;
}

export function CSSStageWidget({ candidate, evaluations, onUpdate, isReadOnly = false }: CSSStageWidgetProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = usePrint({
    contentRef: printRef,
    documentTitle: `Candidate_Dossier_${candidate.full_name.replace(/\s+/g, '_')}`,
    pageStyle: `@page { size: A4 portrait; margin: 0; } html, body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .css-sheet, .iaf-sheet, .iaf-page { width: 210mm !important; min-height: 297mm !important; height: 297mm !important; max-height: 297mm !important; box-sizing: border-box !important; margin: 0 !important; padding: 6mm 8mm !important; box-shadow: none !important; border: none !important; }`,
  });

  const handleSave = async (updatedRawData: Record<string, unknown>, newPhotoFile?: File) => {
    setIsSaving(true);
    try {
      if (newPhotoFile) {
        toast.loading('Uploading candidate photo...', { id: 'save-css' });
        await uploadCandidatePhoto(candidate.id, newPhotoFile);
      }
      toast.loading('Saving Summary Sheet details...', { id: 'save-css' });
      await updateCandidateRawData(candidate.id, updatedRawData);
      toast.success('Candidate Summary Sheet updated successfully!', { id: 'save-css' });
      setIsEditing(false);
      onUpdate();
    } catch (err: unknown) {
      toast.error(extractError(err, 'Failed to update Summary Sheet'), { id: 'save-css' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 mt-2">
      {/* Top Action Bar */}
      {!isEditing && (
        <div className="flex justify-center items-center gap-3 mb-4 no-print">
          <Button 
            variant="outline" 
            onClick={() => handlePrint()} 
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-sm shadow-xs transition-all duration-200"
          >
            <Printer className="w-4 h-4" /> Print Dossier
          </Button>

          {!isReadOnly && (
            <Button
              variant="secondary"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 font-bold text-sm rounded-sm shadow-xs transition-all duration-200"
            >
              <Pencil className="w-4 h-4" /> Edit Summary Sheet
            </Button>
          )}
        </div>
      )}

      {/* Sheet Display */}
      {isEditing ? (
        <div className="iaf-screen-wrap">
          <EditableCandidateSummarySheet
            candidate={candidate}
            evaluations={evaluations}
            onSave={handleSave}
            onCancel={() => setIsEditing(false)}
            isSaving={isSaving}
          />
        </div>
      ) : (
        <div className="iaf-screen-wrap">
          <div ref={printRef} className="w-[210mm] mx-auto">
            <HoReviewPacket
              candidate={candidate}
              evaluations={evaluations}
              includeCss={true}
              includeSalaryProposal={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}
