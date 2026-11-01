/**
 * Triggers prefetching of lazy route chunks on hover or focus
 * to make page transitions feel instantaneous (0ms perceived latency).
 */
const prefetched = new Set<string>();

export function prefetchRoute(route: 'candidate-profile' | 'candidates-list' | 'admin-dashboard' | 'admin-users'): void {
  if (prefetched.has(route)) return;
  prefetched.add(route);

  switch (route) {
    case 'candidate-profile':
      void import('../pages/candidates/CandidateProfile');
      break;
    case 'candidates-list':
      void import('../pages/candidates/CandidatesList');
      break;
    case 'admin-dashboard':
      void import('../pages/admin/AdminDashboard');
      break;
    case 'admin-users':
      void import('../pages/AdminUsers');
      break;
  }
}
