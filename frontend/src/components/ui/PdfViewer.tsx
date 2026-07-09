import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Loader2 } from 'lucide-react';

// Setup worker for Vite
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
}

export const PdfViewer = ({ url }: PdfViewerProps) => {
  const [numPages, setNumPages] = useState<number>();

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
  }

  return (
    <div className="w-full h-full bg-transparent overflow-y-auto custom-scrollbar flex flex-col items-center py-4 px-2 relative">
      <Document 
        file={url} 
        onLoadSuccess={onDocumentLoadSuccess}
        loading={
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10 rounded-xl">
             <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        }
        className="flex flex-col items-center max-w-full"
      >
        {Array.from(new Array(numPages), (_, index) => (
          <div key={`page_${index + 1}`} className="mb-6 shadow-md border border-border/30 max-w-full overflow-hidden">
             <Page 
               pageNumber={index + 1} 
               renderTextLayer={true} 
               renderAnnotationLayer={false}
               width={480}
               className="max-w-full h-auto"
             />
          </div>
        ))}
      </Document>
    </div>
  );
};
