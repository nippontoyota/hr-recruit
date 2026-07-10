import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { ProtectedRoute } from '../components/guards/ProtectedRoute';
import { RoleRoute } from '../components/guards/RoleRoute';
import { LoadingSpinner } from '../components/ui';
import { ALL_ROLES, ADMIN_ONLY } from '../types';

// Lazy-loaded pages for code splitting
const Login = lazy(() => import('../pages/Login'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const CandidatesList = lazy(() => import('../pages/candidates/CandidatesList'));
const CandidateProfile = lazy(() => import('../pages/candidates/CandidateProfile'));
const Settings = lazy(() => import('../pages/Settings'));
const NotFound = lazy(() => import('../pages/NotFound'));
const Pipeline = lazy(() => import('../pages/Pipeline'));
const Users = lazy(() => import('../pages/Users'));
const Reports = lazy(() => import('../pages/Reports'));
const ApplyForm = lazy(() => import('../pages/candidates/ApplyForm'));
const ApplyFullForm = lazy(() => import('../pages/candidates/ApplyFullForm'));

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
    element: (
      <PageSuspense>
        <Login />
      </PageSuspense>
    ),
  },
  {
    path: '/apply',
    element: (
      <PageSuspense>
        <ApplyForm />
      </PageSuspense>
    ),
  },
  {
    path: '/apply/full',
    element: (
      <PageSuspense>
        <ApplyFullForm />
      </PageSuspense>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <PageSuspense>
            <Dashboard />
          </PageSuspense>
        ),
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
        path: 'pipeline',
        element: (
          <RoleRoute allowed={ALL_ROLES}>
            <PageSuspense>
              <Pipeline />
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
