import { PageHeader } from '../components/layout/PageHeader';

export default function Dashboard() {
  return (
    <>
      <PageHeader 
        title="Dashboard" 
      />
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-text-secondary">Dashboard content goes here</p>
      </div>
    </>
  );
}
