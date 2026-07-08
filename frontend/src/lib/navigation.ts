import type { UserRole } from '../types';
import { LayoutDashboard, Users, Columns, Calendar, MessageSquare, IndianRupee, Settings } from 'lucide-react';

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
    name: 'Pipeline Board',
    href: '/pipeline',
    icon: Columns,
    roles: ['ADMIN', 'LOCAL_HR', 'HEAD_OFFICE_HR'],
  },
  {
    name: 'Interviews Today',
    href: '/interviews-today',
    icon: Calendar,
    roles: ['ADMIN', 'LOCAL_HR', 'HEAD_OFFICE_HR'],
  },
  {
    name: 'Messages',
    href: '/messages',
    icon: MessageSquare,
    roles: ['ADMIN', 'LOCAL_HR', 'HEAD_OFFICE_HR'],
  },
  {
    name: 'Salary Queue',
    href: '/salary',
    icon: IndianRupee,
    roles: ['ADMIN', 'HEAD_OFFICE_HR', 'SALARY_TEAM'],
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['ADMIN'],
  },
];
