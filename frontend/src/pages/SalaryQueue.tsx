import { PageHeader } from '../components/layout/PageHeader';
import { Card, Button, DataTable } from '../components/ui';
import { Upload } from 'lucide-react';

export default function SalaryQueue() {
  const columns = [
    { header: 'Candidate ID' },
    { header: 'Name' },
    { header: 'Department' },
    { header: 'Proposed Salary' },
    { header: 'Status' }
  ];

  return (
    <>
      <PageHeader 
        title="Salary Queue" 
        description="Candidates pending salary sheet upload and approval."
        action={
          <Button>
            <Upload className="w-4 h-4 mr-2" />
            Upload Salary Sheet
          </Button>
        }
      />
      <Card>
        <DataTable
          columns={columns}
          data={[]}
          keyExtractor={(item: any) => item.id}
          className="border-0 rounded-none shadow-none"
        />
      </Card>
    </>
  );
}
