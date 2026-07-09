import type { ElementType } from 'react';
import type { UserRole } from '../types';
import { ALL_ROLES, ADMIN_ONLY } from '../types';
import { LayoutDashboard, Users, Settings, Kanban, FileText, UserCog } from 'lucide-react';

export interface NavItem {
  name: string;
  href: string;
  icon: ElementType;
  roles: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    roles: ALL_ROLES,
  },
  {
    name: 'Candidates',
    href: '/candidates',
    icon: Users,
    roles: ALL_ROLES,
  },
  {
    name: 'Pipeline',
    href: '/pipeline',
    icon: Kanban,
    roles: ALL_ROLES,
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: FileText,
    roles: ALL_ROLES,
  },
  {
    name: 'Users',
    href: '/users',
    icon: UserCog,
    roles: ADMIN_ONLY,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ADMIN_ONLY,
  },
];
