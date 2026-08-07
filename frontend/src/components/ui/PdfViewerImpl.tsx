interface PdfViewerProps {
  url: string;
}

export default function PdfViewerImpl({ url }: PdfViewerProps) {
  return (
    <div className="pdf-viewer-container w-full h-full bg-surface border border-border rounded-lg overflow-hidden">
      <iframe 
        src={url} 
        className="w-full h-full min-h-[70vh] md:min-h-[85vh]"
        title="PDF Document Viewer"
      />
    </div>
  );
}
