import type { ElementType } from 'react';
import type { UserRole } from '../types';
import { ALL_ROLES } from '../types';
import { UsersRound, ShieldCheck, Activity } from 'lucide-react';

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
    icon: UsersRound,
    roles: ALL_ROLES,
  },
  {
    name: 'Updates',
    href: '/updates',
    icon: Activity,
    roles: ALL_ROLES,
  },
  {
    name: 'User Management',
    href: '/admin/users',
    icon: ShieldCheck,
    roles: ['ADMIN'],
  },
];
