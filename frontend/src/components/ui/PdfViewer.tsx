import { useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { LoadingSpinner } from './LoadingSpinner';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PdfViewerProps {
  url?: string;
  blob?: Blob;
  className?: string;
}

interface PageData {
  pageNum: number;
  canvasDataUrl: string;
  width: number;
  height: number;
}

export function PdfViewer({ url, blob, className = '' }: PdfViewerProps) {
  const [pages, setPages] = useState<PageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!url && !blob) return;

    setLoading(true);
    setError(null);
    setPages([]);

    const loadPdf = async () => {
      try {
        let pdfData: Uint8Array | string;
        if (blob) {
          const arrayBuffer = await blob.arrayBuffer();
          pdfData = new Uint8Array(arrayBuffer);
        } else if (url) {
          // If blob URL or web URL, fetch arrayBuffer directly for reliable rendering
          const resp = await fetch(url);
          const buf = await resp.arrayBuffer();
          pdfData = new Uint8Array(buf);
        } else {
          return;
        }

        const loadingTask = pdfjsLib.getDocument({
          data: pdfData,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
          cMapPacked: true,
        });

        const pdf = await loadingTask.promise;
        if (!active) return;

        const renderedPages: PageData[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          if (!active) return;
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2.2 });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext('2d');

          if (context) {
            await page.render({
              canvasContext: context,
              viewport,
            }).promise;

            renderedPages.push({
              pageNum: i,
              canvasDataUrl: canvas.toDataURL('image/png'),
              width: viewport.width,
              height: viewport.height,
            });
          }
        }

        if (active) {
          setPages(renderedPages);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : 'Failed to render PDF pages.';
        setError(msg);
        setLoading(false);
      }
    };

    loadPdf();

    return () => {
      active = false;
    };
  }, [url, blob]);

  return (
    <div className={`pdf-rendered-document w-full flex flex-col items-center gap-6 print:gap-0 ${className}`}>
      {loading && (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500 no-print">
          <LoadingSpinner size="md" />
          <p className="text-xs font-medium">Rendering PDF pages…</p>
        </div>
      )}

      {error && (
        <div className="py-8 text-center text-xs text-danger font-medium no-print">
          {error}
        </div>
      )}

      {!loading && !error && pages.map((p) => (
        <div
          key={p.pageNum}
          className="pdf-page-sheet w-full max-w-[210mm] bg-white shadow-md rounded overflow-hidden print:shadow-none print:rounded-none print:m-0 print:p-0 print:w-[210mm] print:break-after-page"
          style={{ breakAfter: 'page', pageBreakAfter: 'always' }}
        >
          <img
            src={p.canvasDataUrl}
            alt={`PDF Page ${p.pageNum}`}
            className="w-full h-auto block print:w-full print:h-auto"
          />
        </div>
      ))}
    </div>
  );
}
