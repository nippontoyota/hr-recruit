import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardContent } from '../components/ui/Card';
import { Users, UserCheck, Calendar, AlertCircle } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';

const STATS = [
  { label: 'Total Active Candidates', value: '0', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
  { label: 'Pending Local Interviews', value: '0', icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-100' },
  { label: 'Joined this Month', value: '0', icon: UserCheck, color: 'text-green-600', bg: 'bg-green-100' },
  { label: 'Action Required', value: '0', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
];

export default function Dashboard() {
  return (
    <>
      <PageHeader 
        title="Dashboard" 
        description="Overview of recruitment activities and pending actions."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {STATS.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i}>
              <CardContent className="p-6 flex items-center">
                <div className={`p-4 rounded-lg ${stat.bg} ${stat.color} mr-4`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                  <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Action Required</h3>
          </div>
          <CardContent>
            <EmptyState 
              icon={<AlertCircle className="w-8 h-8" />}
              title="No pending actions"
              description="You're all caught up! There are no immediate tasks requiring your attention."
            />
          </CardContent>
        </Card>

        <Card>
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Interviews Today</h3>
          </div>
          <CardContent>
            <EmptyState 
              icon={<Calendar className="w-8 h-8" />}
              title="No interviews scheduled"
              description="There are no interviews scheduled for today at your branch."
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
