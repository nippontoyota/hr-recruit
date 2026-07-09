import type { CandidateFormData } from '../wizardTypes';
import { Camera, UploadCloud, FileText } from 'lucide-react';
import { PdfViewer } from '../../../../components/ui/PdfViewer';

interface BasicInfoFormProps {
  data: CandidateFormData;
  update: (field: keyof CandidateFormData, value: any) => void;
}

export const BasicInfoForm = ({ data, update }: BasicInfoFormProps) => {
  return (
    <div className="flex flex-col md:flex-row gap-8 pb-4 h-full">
      
      {/* Left Column: Editable Profile Summary */}
      <div className="w-full md:w-72 flex-shrink-0">
        <div className="flex flex-col items-center text-center">
          <div className="relative group cursor-pointer mb-6">
            <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-border/60 bg-surface flex flex-col items-center justify-center text-text-secondary group-hover:border-primary group-hover:text-primary transition-all duration-300 overflow-hidden relative shadow-sm">
              {data.profilePicture ? (
                <img src={data.profilePicture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <>
                  <Camera className="w-8 h-8 mb-1" />
                  <span className="text-[10px] font-medium uppercase tracking-wider">Photo</span>
                </>
              )}
              <input 
                type="file" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-transparent" 
                accept="image/*"
                title=""
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    update('profilePicture', URL.createObjectURL(e.target.files[0]));
                  }
                }}
              />
            </div>
          </div>

          <input
            className="text-3xl font-extrabold text-text-primary tracking-tight mb-3 text-center bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary/30 rounded w-full placeholder:text-text-secondary/40"
            value={data.fullName}
            onChange={(e) => update('fullName', e.target.value)}
            placeholder="Candidate Name"
          />
          
          <div className="flex flex-col w-full space-y-1 mb-8">
            <input
              className="text-lg font-bold text-primary text-center bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary/30 rounded w-full placeholder:text-primary/40"
              value={data.branchName}
              onChange={(e) => update('branchName', e.target.value)}
              placeholder="Branch Name"
            />
            <input
              className="text-base font-medium text-text-secondary text-center bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary/30 rounded w-full placeholder:text-text-secondary/40"
              value={data.positionAppliedFor}
              onChange={(e) => update('positionAppliedFor', e.target.value)}
              placeholder="Position Applied For"
            />
          </div>

          <div className="w-full space-y-4 pt-6 border-t border-border/40">
            <div className="flex items-center gap-3 text-text-secondary relative z-10">
              <img src="/gmail.webp" alt="Email" className="w-5 h-5 object-contain flex-shrink-0" />
              <span className="flex-1 text-base font-medium text-text-secondary truncate text-left">
                {data.emailId || "Email Address"}
              </span>
            </div>
            
            <div className="flex items-center gap-3 text-text-secondary relative z-10">
              <img src="/phone.png" alt="Phone" className="w-5 h-5 object-contain flex-shrink-0" />
              <span className="flex-1 text-base font-medium text-text-secondary truncate text-left">
                {data.mobileNumber || "Phone Number"}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Right Column: Full-size Resume Upload */}
      <div className="flex-1 flex flex-col h-full min-h-[350px] max-h-[500px]">
        <div className={`flex-1 transition-all duration-300 flex flex-col items-center justify-center relative group overflow-hidden ${
          (data.resumeUrl || data.resumeFile) 
            ? "" 
            : "border-2 border-dashed border-border/60 rounded-2xl bg-surface hover:border-primary/30 shadow-sm"
        }`}>
          {data.resumeUrl ? (
            <div className="w-full h-full relative z-10 p-2 flex flex-col items-center justify-center bg-transparent">
              <div className="absolute top-4 right-6 z-20">
                <label className="px-4 py-2 bg-surface text-text-primary text-sm font-semibold rounded-lg shadow-md cursor-pointer border border-border hover:bg-background transition-colors flex items-center gap-2">
                  <UploadCloud className="w-4 h-4" />
                  Replace
                  <input 
                    type="file" 
                    className="hidden" 
                    accept=".pdf,.doc,.docx" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const file = e.target.files[0];
                        update('resumeFile', file.name);
                        update('resumeFileObject', file);
                        if (file.type === 'application/pdf') {
                          update('resumeUrl', URL.createObjectURL(file));
                        } else {
                          update('resumeUrl', null);
                        }
                      }
                    }}
                  />
                </label>
              </div>
              <div className="h-full w-full max-w-full flex justify-center pb-2 overflow-hidden rounded-xl">
                <PdfViewer url={data.resumeUrl} />
              </div>
            </div>
          ) : data.resumeFile ? (
            <div className="text-center z-10 flex flex-col items-center justify-center h-full w-full bg-primary/5">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold text-text-primary mb-2 max-w-sm truncate px-4">{data.resumeFile}</h3>
              <p className="text-text-secondary font-medium mb-6">Preview unavailable for this file type</p>
              
              <label className="px-6 py-2.5 bg-surface text-text-primary font-semibold rounded-lg shadow-sm cursor-pointer border border-border hover:bg-background transition-colors flex items-center gap-2">
                  <UploadCloud className="w-4 h-4" />
                  Replace Document
                  <input 
                    type="file" 
                    className="hidden" 
                    accept=".pdf,.doc,.docx" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const file = e.target.files[0];
                        update('resumeFile', file.name);
                        update('resumeFileObject', file);
                        if (file.type === 'application/pdf') {
                          update('resumeUrl', URL.createObjectURL(file));
                        } else {
                          update('resumeUrl', null);
                        }
                      }
                    }}
                  />
                </label>
            </div>
          ) : (
            <div className="text-center p-8 z-10 w-full h-full flex flex-col items-center justify-center">
              <div className="w-24 h-24 bg-surface shadow-sm border border-border/50 rounded-full flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                <UploadCloud className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-3">Upload Resume</h3>
              <p className="text-text-secondary mb-8 max-w-md mx-auto leading-relaxed">
                Drag and drop the candidate's PDF or DOCX file here, or click to browse files from your computer.
              </p>
              <div className="px-8 py-3 bg-primary text-white font-semibold rounded-lg inline-flex items-center gap-2 shadow-sm shadow-primary/20 hover:bg-primary-hover transition-colors">
                <FileText className="w-4 h-4" />
                Select Document
              </div>
            </div>
          )}
          
          {!data.resumeUrl && !data.resumeFile && (
            <input 
              type="file" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-transparent z-20" 
              accept=".pdf,.doc,.docx" 
              title=""
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  const file = e.target.files[0];
                  update('resumeFile', file.name);
                  update('resumeFileObject', file);
                  if (file.type === 'application/pdf') {
                    update('resumeUrl', URL.createObjectURL(file));
                  } else {
                    update('resumeUrl', null);
                  }
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
