import { PageHeader } from '../components/layout/PageHeader';

export default function Settings() {
  return (
    <>
      <PageHeader 
        title="Settings" 
      />
      
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-text-secondary">Settings options will appear here</p>
      </div>
    </>
  );
}
