import React, { useState, useRef } from 'react';
import { Button } from '../ui';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { CandidateSummaryDocument } from './CandidateSummaryDocument';
import { InterviewPanelSuggestionDocument } from './InterviewPanelSuggestionDocument';
import { BackgroundVerificationDocument } from './BackgroundVerificationDocument';
import { TechnicalTestDocument } from './TechnicalTestDocument';
import { getCandidateResume } from '../../api/candidates';
import type { Candidate, Evaluation } from '../../types';
import { getDepartmentQuestions } from '../../api/evaluations';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { PDFDocument } from 'pdf-lib';

interface DownloadApplicationButtonProps {
  candidate: Candidate;
  evaluations: Evaluation[];
  className?: string;
}

export function DownloadApplicationButton({ candidate, evaluations, className = '' }: DownloadApplicationButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [questions, setQuestions] = useState<any[]>([]);
  const [hasFetchedQs, setHasFetchedQs] = useState(false);

  const prepareQuestions = async () => {
    if (!hasFetchedQs) {
      try {
        const qs = await getDepartmentQuestions(candidate.department || 'Call Centre');
        setQuestions(qs);
        setHasFetchedQs(true);
      } catch (err) {
        console.error('Failed to fetch questions for PDF', err);
      }
    }
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    const toastId = toast.loading('Generating 5-page PDF Application...');
    try {
      await prepareQuestions();

      // Wait a moment for React to render the questions into the DOM
      await new Promise(r => setTimeout(r, 500));

      if (!containerRef.current) throw new Error("Render container missing");

      // 1. Generate jspdf for our 4 HTML pages
      // We will capture each child separately to ensure they are on different pages
      const pages = containerRef.current.children;
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i] as HTMLElement;
        const canvas = await html2canvas(pageEl, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }

      // Convert jsPDF to ArrayBuffer
      const generatedPdfBytes = pdf.output('arraybuffer');

      // 2. Fetch native resume
      let resumeBytes: ArrayBuffer | null = null;
      try {
        const resumeDoc = await getCandidateResume(candidate.id);
        const resumeRes = await fetch(resumeDoc.url);
        if (resumeRes.ok) {
          resumeBytes = await resumeRes.arrayBuffer();
        }
      } catch (err) {
        console.error("Resume fetch failed:", err);
        // Continue even if resume fails to fetch (or if there is no resume)
      }

      // 3. Merge them using pdf-lib
      const mergedPdf = await PDFDocument.create();
      
      // Load generated PDF
      const generatedDoc = await PDFDocument.load(generatedPdfBytes);
      const copiedGeneratedPages = await mergedPdf.copyPages(generatedDoc, generatedDoc.getPageIndices());
      copiedGeneratedPages.forEach(page => mergedPdf.addPage(page));

      // Append resume if it exists and is PDF
      if (resumeBytes) {
        try {
          const resumePdfDoc = await PDFDocument.load(resumeBytes);
          const copiedResumePages = await mergedPdf.copyPages(resumePdfDoc, resumePdfDoc.getPageIndices());
          copiedResumePages.forEach(page => mergedPdf.addPage(page));
        } catch (e) {
          console.warn("Could not merge resume. It might not be a valid PDF.", e);
          toast.error("Could not append resume. It may not be a valid PDF format.");
        }
      }

      // 4. Save and trigger download
      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${candidate.full_name.replace(/\s+/g, '_')}_Application.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Application PDF downloaded!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to generate PDF', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Button
        variant="primary"
        onClick={handleDownload}
        isLoading={isGenerating}
        className={className}
      >
        <Download className="w-4 h-4 mr-2" />
        Download Application Packet
      </Button>

      {/* Hidden container to render pages for html2canvas */}
      <div className="fixed top-0 left-[-9999px] opacity-0 pointer-events-none w-[794px]">
        <div ref={containerRef}>
          <div className="w-[794px] bg-white"><CandidateSummaryDocument candidate={candidate} evaluations={evaluations} /></div>
          <div className="w-[794px] bg-white"><InterviewPanelSuggestionDocument candidate={candidate} evaluations={evaluations} /></div>
          <div className="w-[794px] bg-white"><BackgroundVerificationDocument candidate={candidate} /></div>
          <div className="w-[794px] bg-white"><TechnicalTestDocument candidate={candidate} questions={questions} /></div>
        </div>
      </div>
    </>
  );
}
