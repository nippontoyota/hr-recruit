import type { CSSProperties } from 'react';
import { nipponToyotaLogo, riverLogo } from '../assets';

export type BrandKey = 'NIPPON_TOYOTA' | 'RIVER';

export interface BrandConfig {
  key: BrandKey;
  name: string;
  logo: string;
  subtitle: string;
  primary: string;
  primaryHover: string;
  primaryForeground: string;
  ink: string;
  content: string;
  border: string;
  companyName: string;
  documentAddress: string;
  documentContact: string;
  branches: string[];
}

const configs: Record<BrandKey, BrandConfig> = {
  NIPPON_TOYOTA: {
    key: 'NIPPON_TOYOTA',
    name: 'Nippon Toyota',
    logo: nipponToyotaLogo,
    subtitle: 'Recruitment',
    primary: '#D61C24',
    primaryHover: '#B5161D',
    primaryForeground: '#FFFFFF',
    ink: '#172033',
    content: '#F8FAFC',
    border: '#E2E8F0',
    companyName: 'Nippon Motor Corporation Pvt Ltd',
    documentAddress: 'Nippon Toyota, Kalamassery',
    documentContact: '8606986060, 9544286099',
    branches: ['Trivandrum', 'Kollam', 'Pathanamthitta', 'Kayamkulam', 'Kottayam', 'Muvattupuzha', 'Kalamassery', 'Cochin', 'Thrissur'],
  },
  RIVER: {
    key: 'RIVER',
    name: 'River',
    logo: riverLogo,
    subtitle: 'Electric mobility recruitment',
    primary: '#007DB6',
    primaryHover: '#006A9B',
    primaryForeground: '#FFFFFF',
    ink: '#12120D',
    content: '#F3FAFC',
    border: '#ABD5E7',
    companyName: 'River Mobility',
    documentAddress: 'Electric mobility recruitment',
    documentContact: 'River recruitment team',
    branches: ['River'],
  },
};

export function normalizeBrand(value?: string | null): BrandKey {
  return String(value || '').trim().toUpperCase() === 'RIVER' ? 'RIVER' : 'NIPPON_TOYOTA';
}

export function getBrandConfig(value?: string | null): BrandConfig {
  return configs[normalizeBrand(value)];
}

export function getBrandBranches(value?: string | null): string[] {
  return getBrandConfig(value).branches;
}

export function brandThemeStyle(value?: string | null): CSSProperties {
  const brand = getBrandConfig(value);
  return {
    '--background': brand.content,
    '--content': brand.content,
    '--surface': '#FFFFFF',
    '--foreground': brand.ink,
    '--text-primary': brand.ink,
    '--text-secondary': brand.key === 'RIVER' ? '#315A6C' : '#64748B',
    '--primary': brand.primary,
    '--primary-hover': brand.primaryHover,
    '--primary-foreground': brand.primaryForeground,
    '--border': brand.border,
    '--ring': brand.primary,
  } as CSSProperties;
}
