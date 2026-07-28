import type { ElementType } from 'react';
import type { UserRole } from '../types';
import { ALL_ROLES } from '../types';
import { Users, Shield, Bell } from 'lucide-react';

export interface NavItem {
  name: string;
  href: string;
  icon: ElementType;
  roles: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    name: 'Candidates',
    href: '/candidates',
    icon: Users,
    roles: ALL_ROLES,
  },
  {
    name: 'Updates',
    href: '/updates',
    icon: Bell,
    roles: ALL_ROLES,
  },
  {
    name: 'User Management',
    href: '/admin/users',
    icon: Shield,
    roles: ['ADMIN'],
  },
];
