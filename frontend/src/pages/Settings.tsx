import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardHeader, CardTitle } from '../components/ui';
import { Settings as SettingsIcon, Users, FileText, Building } from 'lucide-react';

const SECTIONS = [
  { title: 'User Management', description: 'Manage portal users and roles', icon: Users },
  { title: 'Templates', description: 'Email and WhatsApp templates', icon: FileText },
  { title: 'Branches', description: 'Manage branch locations', icon: Building },
  { title: 'General Settings', description: 'System-wide configuration', icon: SettingsIcon },
];

export default function Settings() {
  return (
    <>
      <PageHeader 
        title="Settings" 
        description="System administration and configuration."
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SECTIONS.map((section, idx) => {
          const Icon = section.icon;
          return (
            <Card key={idx} className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader className="flex flex-row items-center gap-4 py-4">
                <div className="bg-gray-100 p-2 rounded-lg">
                  <Icon className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <CardTitle className="text-base">{section.title}</CardTitle>
                  <p className="text-sm text-gray-500 mt-0.5">{section.description}</p>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </>
  );
}
