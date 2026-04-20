// Kick off the dashboard data fetch the moment we know the user's role and
// token. By the time React mounts the dashboard component, the result is
// already in the dataCache and the dashboard renders synchronously.

import { setCached } from './dataCache';

const fetchJSON = async (url: string, headers: HeadersInit) => {
  const r = await fetch(url, { headers });
  return r.ok ? r.json() : null;
};

export function prefetchDashboard(role: string | undefined, token: string | null) {
  if (!token || !role) return;
  const headers = { Authorization: `Bearer ${token}` };

  if (role === 'student') {
    const key = 'student-dashboard';
    Promise.all([
      fetchJSON('/api/courses?filter=enrolled', headers),
      fetchJSON('/api/courses?filter=browse', headers),
      fetchJSON('/api/progress', headers),
    ]).then(([enrolledCourses, availableCourses, progress]) => {
      setCached(key, {
        enrolledCourses: enrolledCourses ?? [],
        availableCourses: availableCourses ?? [],
        progress: progress ?? [],
      });
    }).catch(() => { /* ignore — the dashboard component will retry */ });
    return;
  }

  if (role === 'hod') {
    const key = 'hod-dashboard';
    Promise.all([
      fetchJSON('/api/analytics/staff', headers),
      fetchJSON('/api/analytics/students', headers),
      fetchJSON('/api/courses', headers),
      fetchJSON('/api/analytics/summary', headers),
      fetchJSON('/api/analytics/focus', headers),
    ]).then(([staff, students, courses, summary, focusData]) => {
      setCached(key, {
        staff: staff ?? [],
        students: students ?? [],
        courses: courses ?? [],
        summary: summary ?? {},
        focusData: focusData ?? [],
      });
    }).catch(() => {});
    return;
  }

  if (role === 'staff') {
    const key = 'admin-dashboard';
    Promise.all([
      fetchJSON('/api/courses', headers),
      fetchJSON('/api/analytics/students', headers),
      fetchJSON('/api/analytics/summary', headers),
      fetchJSON('/api/analytics/focus', headers),
      fetchJSON('/api/comments/all', headers),
    ]).then(([courses, students, summary, focusData, allComments]) => {
      setCached(key, {
        courses: courses ?? [],
        students: students ?? [],
        summary: summary ?? {},
        focusData: focusData ?? [],
        allComments: allComments ?? [],
      });
    }).catch(() => {});
    return;
  }
}
