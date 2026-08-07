import { lazy, Suspense } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

const PdfViewerImpl = lazy(() => import('./PdfViewerImpl'));

interface PdfViewerProps {
  url: string;
}

export const PdfViewer = ({ url }: PdfViewerProps) => {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center p-12 text-gray-500 w-full h-full">
        <LoadingSpinner className="w-8 h-8 mb-4" />
        <p>Loading document engine...</p>
      </div>
    }>
      <PdfViewerImpl url={url} />
    </Suspense>
  );
};
