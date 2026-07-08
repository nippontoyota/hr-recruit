import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { ProtectedRoute } from '../components/guards/ProtectedRoute';
import { RoleRoute } from '../components/guards/RoleRoute';

// Pages
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import CandidatesList from '../pages/candidates/CandidatesList';
import CandidateProfile from '../pages/candidates/CandidateProfile';
import PipelineBoard from '../pages/PipelineBoard';
import InterviewsToday from '../pages/InterviewsToday';
import Messages from '../pages/Messages';
import SalaryQueue from '../pages/SalaryQueue';
import Settings from '../pages/Settings';
import NotFound from '../pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
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
        element: <Dashboard />,
      },
      {
        path: 'candidates',
        element: (
          <RoleRoute allowed={['ADMIN', 'LOCAL_HR', 'HEAD_OFFICE_HR', 'DEPARTMENT_HEAD']}>
            <CandidatesList />
          </RoleRoute>
        ),
      },
      {
        path: 'candidates/:id',
        element: (
          <RoleRoute allowed={['ADMIN', 'LOCAL_HR', 'HEAD_OFFICE_HR', 'DEPARTMENT_HEAD']}>
            <CandidateProfile />
          </RoleRoute>
        ),
      },
      {
        path: 'pipeline',
        element: (
          <RoleRoute allowed={['ADMIN', 'LOCAL_HR', 'HEAD_OFFICE_HR']}>
            <PipelineBoard />
          </RoleRoute>
        ),
      },
      {
        path: 'interviews-today',
        element: (
          <RoleRoute allowed={['ADMIN', 'LOCAL_HR', 'HEAD_OFFICE_HR']}>
            <InterviewsToday />
          </RoleRoute>
        ),
      },
      {
        path: 'messages',
        element: (
          <RoleRoute allowed={['ADMIN', 'LOCAL_HR', 'HEAD_OFFICE_HR']}>
            <Messages />
          </RoleRoute>
        ),
      },
      {
        path: 'salary',
        element: (
          <RoleRoute allowed={['ADMIN', 'HEAD_OFFICE_HR', 'SALARY_TEAM']}>
            <SalaryQueue />
          </RoleRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <RoleRoute allowed={['ADMIN']}>
            <Settings />
          </RoleRoute>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);
