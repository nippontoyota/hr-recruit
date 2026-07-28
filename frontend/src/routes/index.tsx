/* eslint-disable react-refresh/only-export-components */
import { createHashRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { ProtectedRoute } from '../components/guards/ProtectedRoute';
import { RoleRoute } from '../components/guards/RoleRoute';
import { LoadingSpinner } from '../components/ui';
import { ALL_ROLES } from '../types';
import { RouteErrorPage } from '../components/layout/RouteErrorPage';

const Login = lazy(() => import('../pages/Login'));
const CandidatesList = lazy(() => import('../pages/candidates/CandidatesList'));
const CandidateProfile = lazy(() => import('../pages/candidates/CandidateProfile'));
const CandidatePrintView = lazy(() => import('../pages/candidates/CandidatePrintView'));
const NotFound = lazy(() => import('../pages/NotFound'));
const ApplyForm = lazy(() => import('../pages/candidates/ApplyForm'));
const PreFormPage = lazy(() => import('../pages/candidates/PreFormPage'));

const PublicInterviewerPage = lazy(() => import('../pages/candidates/PublicInterviewerPage'));
const PublicTestPage = lazy(() => import('../pages/candidates/PublicTestPage'));
const PrintTechnicalTestPage = lazy(() => import('../pages/candidates/PrintTechnicalTestPage'));
const CandidatePortalPage = lazy(() => import('../pages/candidates/CandidatePortalPage'));
const AdminUsers = lazy(() => import('../pages/AdminUsers'));

const SuspenseFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <LoadingSpinner size="lg" />
  </div>
);

const PageSuspense = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<SuspenseFallback />}>{children}</Suspense>
);

export const router = createHashRouter([
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
