# Nippon Toyota Recruitment Portal - Frontend

This is the frontend foundation for the Nippon Toyota Recruitment Portal. It provides the application shell, routing, role-based access control, and placeholder pages.

## Tech Stack
- React 19
- TypeScript
- Vite
- React Router DOM v7
- Tailwind CSS v4
- Lucide React (Icons)
- Axios

## Setup & Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   ```
   By default, `VITE_USE_MOCK_AUTH=true` is set, allowing you to log in without a backend using mock credentials.

3. Start development server:
   ```bash
   npm run dev
   ```
   The app will run on `http://localhost:5173`.

## Authentication & Roles

The portal supports several roles based on `UserRole`:
- `ADMIN`
- `LOCAL_HR`
- `HEAD_OFFICE_HR`
- `DEPARTMENT_HEAD`
- `SALARY_TEAM`

### Testing with Mock Login
When `VITE_USE_MOCK_AUTH=true` is set in `.env`, you can use the following mock emails (any password works) to test different roles:
- `local@nippon.test` -> Local HR view
- `hq@nippon.test` -> Head Office HR view
- `admin@nippon.test` -> Admin view
- `dept@nippon.test` -> Department Head view
- `salary@nippon.test` -> Salary Team view

## Features Included
- **Role-based Layout**: Navigation items dynamically show/hide based on the logged-in user's role.
- **Route Guards**: `ProtectedRoute` ensures authenticated access, while `RoleRoute` enforces permissions.
- **UI Components**: Reusable `Button`, `Badge`, `Card`, `Input`, `Select`, `DataTable`, and more inside `src/components/ui`.
- **API Client**: Axios instance pre-configured to attach the JWT token on every request.

## Next Steps
- Implement real backend integration via the `src/api` clients.
- Add forms utilizing `react-hook-form` and validation libraries.
- Replace mock data with actual data mapping.
