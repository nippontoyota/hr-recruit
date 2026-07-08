import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui';
import { Columns } from 'lucide-react';

export default function PipelineBoard() {
  return (
    <div className="h-full flex flex-col">
      <PageHeader 
        title="Pipeline Board" 
        description="Visual overview of candidates across different stages."
      />
      
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
        {/* Placeholder Columns */}
        {['New', 'Local HR Review', 'HQ Review', 'Offered', 'Joined'].map((col) => (
          <div key={col} className="w-80 shrink-0 flex flex-col bg-gray-50 rounded-lg border border-gray-200">
            <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-white rounded-t-lg">
              <h3 className="font-semibold text-gray-900">{col}</h3>
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium">
                0
              </span>
            </div>
            <div className="p-3 flex-1 flex flex-col">
              <EmptyState 
                icon={<Columns className="w-6 h-6" />}
                title="Empty"
                className="flex-1 py-8 text-xs border-0 bg-transparent shadow-none"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
