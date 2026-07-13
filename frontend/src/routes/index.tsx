/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { ProtectedRoute } from '../components/guards/ProtectedRoute';
import { RoleRoute } from '../components/guards/RoleRoute';
import { LoadingSpinner } from '../components/ui';
import { ALL_ROLES, ADMIN_ONLY } from '../types';
import { ErrorBoundary } from '../components/layout/ErrorBoundary';

// Lazy-loaded pages for code splitting
const Login = lazy(() => import('../pages/Login'));
const CandidatesList = lazy(() => import('../pages/candidates/CandidatesList'));
const CandidateProfile = lazy(() => import('../pages/candidates/CandidateProfile'));
const Settings = lazy(() => import('../pages/Settings'));
const NotFound = lazy(() => import('../pages/NotFound'));
const Users = lazy(() => import('../pages/Users'));
const Reports = lazy(() => import('../pages/Reports'));
const ApplyForm = lazy(() => import('../pages/candidates/ApplyForm'));
const PreFormPage = lazy(() => import('../pages/candidates/PreFormPage'));

const SuspenseFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <LoadingSpinner size="lg" />
  </div>
);

const PageSuspense = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<SuspenseFallback />}>{children}</Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/login',
    errorElement: <ErrorBoundary />,
    element: (
      <PageSuspense>
        <Login />
      </PageSuspense>
    ),
  },
  {
    path: '/apply',
    errorElement: <ErrorBoundary />,
    element: (
      <PageSuspense>
        <ApplyForm />
      </PageSuspense>
    ),
  },
  {
    path: '/pre-form/:token',
    errorElement: <ErrorBoundary />,
    element: (
      <PageSuspense>
        <PreFormPage />
      </PageSuspense>
    ),
  },
  {
    path: '/',
    errorElement: <ErrorBoundary />,
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/candidates" replace />,
      },
      {
        path: 'candidates',
        element: (
          <RoleRoute allowed={ALL_ROLES}>
            <PageSuspense>
              <CandidatesList />
            </PageSuspense>
          </RoleRoute>
        ),
      },
      {
        path: 'candidates/:id',
        element: (
          <RoleRoute allowed={ALL_ROLES}>
            <PageSuspense>
              <CandidateProfile />
            </PageSuspense>
          </RoleRoute>
        ),
      },
      {
        path: 'reports',
        element: (
          <RoleRoute allowed={ALL_ROLES}>
            <PageSuspense>
              <Reports />
            </PageSuspense>
          </RoleRoute>
        ),
      },
      {
        path: 'users',
        element: (
          <RoleRoute allowed={ADMIN_ONLY}>
            <PageSuspense>
              <Users />
            </PageSuspense>
          </RoleRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <RoleRoute allowed={ADMIN_ONLY}>
            <PageSuspense>
              <Settings />
            </PageSuspense>
          </RoleRoute>
        ),
      },
    ],
  },
  {
    path: '*',
    element: (
      <PageSuspense>
        <NotFound />
      </PageSuspense>
    ),
  },
]);
