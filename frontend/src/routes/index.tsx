/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Suspense } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { ProtectedRoute } from '../components/guards/ProtectedRoute';
import { RoleRoute } from '../components/guards/RoleRoute';
import { LoadingSpinner } from '../components/ui';
import { ALL_ROLES } from '../types';
import { RouteErrorPage } from '../components/layout/RouteErrorPage';
import { lazyRetry } from '../lib/lazyRetry';

const Login = lazyRetry(() => import('../pages/Login'));
const CandidatesList = lazyRetry(() => import('../pages/candidates/CandidatesList'));
const CandidateProfile = lazyRetry(() => import('../pages/candidates/CandidateProfile'));
const CandidatePrintView = lazyRetry(() => import('../pages/candidates/CandidatePrintView'));
const NotFound = lazyRetry(() => import('../pages/NotFound'));
const ApplyForm = lazyRetry(() => import('../pages/candidates/ApplyForm'));
const PreFormPage = lazyRetry(() => import('../pages/candidates/PreFormPage'));

const PublicInterviewerPage = lazyRetry(() => import('../pages/candidates/PublicInterviewerPage'));
const PublicTestPage = lazyRetry(() => import('../pages/candidates/PublicTestPage'));
const PrintTechnicalTestPage = lazyRetry(() => import('../pages/candidates/PrintTechnicalTestPage'));
const CandidatePortalPage = lazyRetry(() => import('../pages/candidates/CandidatePortalPage'));
const AdminUsers = lazyRetry(() => import('../pages/AdminUsers'));

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
    errorElement: <RouteErrorPage />,
    element: (
      <PageSuspense>
        <Login />
      </PageSuspense>
    ),
  },
  {
    path: '/apply',
    errorElement: <RouteErrorPage />,
    element: (
      <PageSuspense>
        <ApplyForm />
      </PageSuspense>
    ),
  },
  {
    path: '/pre-form/:token',
    errorElement: <RouteErrorPage />,
    element: (
      <PageSuspense>
        <PreFormPage />
      </PageSuspense>
    ),
  },

  {
    path: '/eval/:token',
    errorElement: <RouteErrorPage />,
    element: (
      <PageSuspense>
        <PublicInterviewerPage />
      </PageSuspense>
    ),
  },
  {
    path: '/portal/:token',
    errorElement: <RouteErrorPage />,
    element: (
      <PageSuspense>
        <CandidatePortalPage />
      </PageSuspense>
    ),
  },
  {
    path: '/test/:token',
    errorElement: <RouteErrorPage />,
    element: (
      <PageSuspense>
        <PublicTestPage />
      </PageSuspense>
    ),
  },
  {
    path: '/candidates/:id/print',
    element: (
      <ProtectedRoute>
        <PageSuspense>
          <CandidatePrintView />
        </PageSuspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/candidates/:id/print-test',
    element: (
      <ProtectedRoute>
        <PageSuspense>
          <PrintTechnicalTestPage />
        </PageSuspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/',
    errorElement: <RouteErrorPage />,

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
        path: 'admin/users',
        element: (
          <RoleRoute allowed={['ADMIN']}>
            <PageSuspense>
              <AdminUsers />
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
