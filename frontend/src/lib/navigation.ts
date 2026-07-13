import type { ElementType } from 'react';
import type { UserRole } from '../types';
import { ALL_ROLES } from '../types';
import { Users } from 'lucide-react';

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
];
