import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useState } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

// Use UNPKG CDN to avoid Vite static asset serving issues with the worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
}

export const PdfViewer = ({ url }: PdfViewerProps) => {
  const [numPages, setNumPages] = useState<number | null>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  return (
    <div className="pdf-viewer-container flex justify-center w-full h-full pb-4 overflow-y-auto">
      <Document
        file={url}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={
          <div className="flex flex-col items-center justify-center p-12 text-gray-500">
            <LoadingSpinner className="w-8 h-8 mb-4" />
            <p>Loading document...</p>
          </div>
        }
        error={
          <div className="p-8 text-center text-red-500">
            Failed to load PDF file.
          </div>
        }
      >
        {numPages && Array.from(new Array(numPages), (_el, index) => (
          <Page 
            key={`page_${index + 1}`} 
            pageNumber={index + 1} 
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="mb-4 shadow-md"
            width={800}
          />
        ))}
      </Document>
    </div>
  );
};
