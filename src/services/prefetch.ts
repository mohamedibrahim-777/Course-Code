// Kick off the dashboard data fetch the moment we know the user's role and
// token. By the time React mounts the dashboard component, the result is
// already in the dataCache and the dashboard renders synchronously.
//
// Everything flows through the single /api/analytics/dashboard endpoint so
// we only pay HTTP + auth overhead once per dashboard load.

import { setCached } from './dataCache';

export function prefetchDashboard(role: string | undefined, token: string | null) {
  if (!token || !role) return;
  const headers = { Authorization: `Bearer ${token}` };
  const cacheKey =
    role === 'student' ? 'student-dashboard' :
    role === 'hod' ? 'hod-dashboard' :
    role === 'staff' ? 'admin-dashboard' :
    null;
  if (!cacheKey) return;

  fetch('/api/analytics/dashboard', { headers })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (!data) return;
      if (role === 'student') {
        setCached(cacheKey, {
          enrolledCourses: data.enrolledCourses ?? [],
          availableCourses: data.availableCourses ?? [],
          progress: data.progress ?? [],
        });
      } else if (role === 'hod') {
        setCached(cacheKey, {
          staff: data.staff ?? [],
          students: data.students ?? [],
          courses: data.courses ?? [],
          summary: data.summary ?? {},
          focusData: data.focusData ?? [],
          allComments: data.allComments ?? [],
        });
      } else {
        // staff
        setCached(cacheKey, {
          courses: data.courses ?? [],
          students: data.students ?? [],
          summary: data.summary ?? {},
          focusData: data.focusData ?? [],
          allComments: data.allComments ?? [],
        });
      }
    })
    .catch(() => { /* dashboard component will retry on mount */ });
}
