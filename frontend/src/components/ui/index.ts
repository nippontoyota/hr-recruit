export * from './Button';
export * from './Input';
export * from './EmptyState';
export * from './Popover';
export * from './Select';
export * from './PipelineStepper';
export * from './Modal';
import { lazy } from 'react';

export const PdfViewer = lazy(() => import('./PdfViewer').then((module) => ({ default: module.PdfViewer })));
export * from './Badge';
export * from './LoadingSpinner';
export const DocxViewer = lazy(() => import('./DocxViewer').then((module) => ({ default: module.DocxViewer })));
