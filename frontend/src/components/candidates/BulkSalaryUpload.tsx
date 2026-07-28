import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { Button, LoadingSpinner, Modal } from '../ui';
import { toast } from 'sonner';
import { uploadBulkSalary } from '../../api/candidates';

export function BulkSalaryUpload() {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    
    setUploading(true);
    try {
      const response = await uploadBulkSalary(file);
      toast.success(response.message || 'Salaries updated successfully.');
      setIsOpen(false);
      setFile(null);
      // Optional: Refresh candidates list
      window.location.reload(); 
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to upload salary data.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Button variant="secondary" onClick={() => setIsOpen(true)} className="!bg-emerald-600 hover:!bg-emerald-700 !text-white !border-none !rounded-md font-semibold">
        <FileSpreadsheet className="w-4 h-4 mr-2" />
        Bulk Salary Upload
      </Button>

      <Modal isOpen={isOpen} onClose={() => !uploading && setIsOpen(false)} title="Upload Salary Annexure (Bulk)" size="md">
        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload an Excel file (<code>.xlsx</code> or <code>.xls</code>) to automatically map salary structures to candidates. 
            Ensure your Excel sheet has columns for <strong>Candidate ID</strong> or <strong>Email</strong> to map correctly.
          </p>

          <div 
            onClick={handleUploadClick}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${
              file ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
            }`}
          >
            <input 
              type="file" 
              accept=".xlsx,.xls" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange}
            />
            
            {file ? (
              <>
                <FileSpreadsheet className="w-10 h-10 text-primary mb-3" />
                <p className="text-sm font-semibold text-foreground text-center">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                <button 
                  className="text-xs text-danger mt-3 font-medium hover:underline"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                >
                  Remove File
                </button>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-sm font-semibold text-foreground text-center">Click to select an Excel file</p>
                <p className="text-xs text-muted-foreground mt-1">Supports .xlsx and .xls formats</p>
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={uploading}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={!file || uploading} className="min-w-[120px]">
              {uploading ? <LoadingSpinner className="w-4 h-4 mr-2 text-white" /> : 'Process Excel'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
