import type { UserRole } from '../types';
import { LayoutDashboard, Users, Settings } from 'lucide-react';

export interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    roles: ['ADMIN', 'LOCAL_HR', 'HEAD_OFFICE_HR', 'SALARY_TEAM'],
  },
  {
    name: 'Candidates',
    href: '/candidates',
    icon: Users,
    roles: ['ADMIN', 'LOCAL_HR', 'HEAD_OFFICE_HR', 'DEPARTMENT_HEAD'],
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['ADMIN'],
  },
];
