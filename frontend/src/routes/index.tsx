import { useAuth } from "../auth";
/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { AdminDemoShell } from '../components/layout/AdminDemoShell';
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
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const AdminCandidatesList = lazy(() => import('../pages/admin/AdminCandidatesList'));
const AdminBottlenecksList = lazy(() => import('../pages/admin/AdminBottlenecksList'));
const AdminOutcomesList = lazy(() => import('../pages/admin/AdminOutcomesList'));
const DemoAdminDashboard = lazy(() => import('../pages/admin/demo/DemoAdminDashboard'));
const DemoAdminCandidatesList = lazy(() => import('../pages/admin/demo/DemoAdminCandidatesList'));
const DemoAdminBottlenecksList = lazy(() => import('../pages/admin/demo/DemoAdminBottlenecksList'));
const DemoAdminOutcomesList = lazy(() => import('../pages/admin/demo/DemoAdminOutcomesList'));

const SuspenseFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <LoadingSpinner size="lg" />
  </div>
);

const PageSuspense = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<SuspenseFallback />}>{children}</Suspense>
);

const RootRedirect = () => {
  const { role } = useAuth();
  if (role === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Navigate to="/candidates" replace />;
};

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
    path: '/demo-admin',
    errorElement: <RouteErrorPage />,
    element: (
      <ProtectedRoute>
        <AdminDemoShell />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/demo-admin/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: (
          <RoleRoute allowed={['ADMIN']}>
            <PageSuspense>
              <DemoAdminDashboard />
            </PageSuspense>
          </RoleRoute>
        ),
      },
      {
        path: 'pipeline',
        element: (
          <RoleRoute allowed={['ADMIN']}>
            <PageSuspense>
              <DemoAdminCandidatesList />
            </PageSuspense>
          </RoleRoute>
        ),
      },
      {
        path: 'bottlenecks',
        element: (
          <RoleRoute allowed={['ADMIN']}>
            <PageSuspense>
              <DemoAdminBottlenecksList />
            </PageSuspense>
          </RoleRoute>
        ),
      },
      {
        path: 'outcomes',
        element: (
          <RoleRoute allowed={['ADMIN']}>
            <PageSuspense>
              <DemoAdminOutcomesList />
            </PageSuspense>
          </RoleRoute>
        ),
      },
    ]
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
        element: <RootRedirect />,
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
      {
        path: 'admin/dashboard',
        element: (
          <RoleRoute allowed={['ADMIN']}>
            <PageSuspense>
              <AdminDashboard />
            </PageSuspense>
          </RoleRoute>
        ),
      },
      {
        path: 'admin/pipeline',
        element: (
          <RoleRoute allowed={['ADMIN']}>
            <PageSuspense>
              <AdminCandidatesList />
            </PageSuspense>
          </RoleRoute>
        ),
      },
      {
        path: 'admin/bottlenecks',
        element: (
          <RoleRoute allowed={['ADMIN']}>
            <PageSuspense>
              <AdminBottlenecksList />
            </PageSuspense>
          </RoleRoute>
        ),
      },
      {
        path: 'admin/outcomes',
        element: (
          <RoleRoute allowed={['ADMIN']}>
            <PageSuspense>
              <AdminOutcomesList />
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
