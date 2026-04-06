import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Users, BookOpen, Activity, ChevronRight, BarChart, PieChart, TrendingUp, X, Mail, Timer, Coffee, Zap } from 'lucide-react';

export default function HODDashboard() {
  const { token } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [reportType, setReportType] = useState<'staff' | 'students' | 'courses'>('staff');
  const [focusData, setFocusData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const [staffRes, studentsRes, coursesRes, summaryRes, focusRes] = await Promise.all([
          fetch('/api/analytics/staff', { headers }),
          fetch('/api/analytics/students', { headers }),
          fetch('/api/courses', { headers }),
          fetch('/api/analytics/summary', { headers }),
          fetch('/api/analytics/focus', { headers }),
        ]);
        setStaff(await staffRes.json());
        setStudents(await studentsRes.json());
        setCourses(await coursesRes.json());
        setSummary(await summaryRes.json());
        setFocusData(await focusRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  if (loading) return <div className="text-center py-20">Loading HOD Analytics...</div>;

  const openReport = (type: 'staff' | 'students' | 'courses') => {
    setReportType(type);
    setShowReport(true);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 flex items-center gap-3">
            <Shield className="text-neutral-900" size={32} /> HOD Analytics Dashboard
          </h1>
          <p className="text-neutral-500">Department-wide performance and activity monitoring.</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-neutral-900 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest">Live Monitoring</div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div onClick={() => openReport('students')} className="cursor-pointer">
          <StatCard icon={<Users />} label="Total Students" value={summary.totalStudents || students.length} />
        </div>
        <div onClick={() => openReport('staff')} className="cursor-pointer">
          <StatCard icon={<Shield />} label="Staff Members" value={summary.totalStaff || staff.length} />
        </div>
        <div onClick={() => openReport('courses')} className="cursor-pointer">
          <StatCard icon={<BookOpen />} label="Total Courses" value={summary.totalCourses || courses.length} />
        </div>
        <StatCard icon={<Activity />} label="System Health" value="Optimal" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Staff Activity */}
        <section className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-neutral-100">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
              <TrendingUp className="text-neutral-900" size={24} /> Staff Performance
            </h2>
            <button onClick={() => openReport('staff')} className="text-neutral-900 text-sm font-bold hover:underline">View Full Report</button>
          </div>
          {staff.length === 0 ? (
            <p className="text-neutral-400 text-center py-8">No staff members found.</p>
          ) : (
            <div className="space-y-6">
              {staff.map(member => (
                <div key={member.id} className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center font-bold text-neutral-600">
                        {member.name[0]}
                      </div>
                      <div>
                        <h4 className="font-bold text-neutral-900">{member.name}</h4>
                        <p className="text-xs text-neutral-500">{member.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-neutral-900">{member.courses_created}</span>
                      <p className="text-[10px] text-neutral-400 uppercase font-bold">Courses</p>
                    </div>
                  </div>
                  <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((member.courses_created / Math.max(courses.length, 1)) * 100, 100)}%` }}
                      className="bg-neutral-800 h-full rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick Stats */}
        <section className="space-y-6">
          <div className="bg-neutral-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <BarChart size={20} className="text-neutral-600" /> Department Stats
            </h3>
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-center">
                <span className="text-neutral-400 text-sm">Total Lessons</span>
                <span className="font-bold">{summary.totalLessons || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400 text-sm">Lessons Completed</span>
                <span className="font-bold">{summary.totalCompleted || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400 text-sm">Avg. Progress</span>
                <span className="font-bold">{summary.avgProgress || 0}%</span>
              </div>
            </div>
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-neutral-800/10 rounded-full blur-3xl" />
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100">
            <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
              <PieChart size={20} className="text-neutral-900" /> Courses by Language
            </h3>
            {courses.length === 0 ? (
              <p className="text-neutral-400 text-sm text-center py-4">No courses yet.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(
                  courses.reduce((acc: any, c: any) => { acc[c.language] = (acc[c.language] || 0) + 1; return acc; }, {})
                ).map(([lang, count]) => (
                  <div key={lang} className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                    <span className="text-sm font-medium text-neutral-700">{lang}</span>
                    <span className="text-sm font-bold text-neutral-900">{count as number}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Student Focus Tracker */}
      <section className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100">
        <h2 className="text-xl font-bold text-neutral-900 mb-6 flex items-center gap-2">
          <Timer className="text-[#0077FF]" size={24} /> Student Focus Tracker
        </h2>
        {focusData.length === 0 || focusData.every((s: any) => s.focus_count === 0 && s.break_count === 0) ? (
          <p className="text-neutral-400 text-center py-8">No focus session data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-neutral-400 uppercase tracking-widest border-b border-neutral-100">
                  <th className="pb-4 font-semibold">Student</th>
                  <th className="pb-4 font-semibold">Focus Sessions</th>
                  <th className="pb-4 font-semibold">Total Focus</th>
                  <th className="pb-4 font-semibold">Breaks</th>
                  <th className="pb-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {focusData.map((s: any) => {
                  const focusMins = Math.floor(s.total_focus_seconds / 60);
                  const breakMins = Math.floor(s.total_break_seconds / 60);
                  const isActive = s.last_session && (Date.now() - new Date(s.last_session + 'Z').getTime()) < 35 * 60 * 1000;
                  return (
                    <tr key={s.id}>
                      <td className="py-4">
                        <div className="font-bold text-neutral-900">{s.name}</div>
                        <div className="text-xs text-neutral-500">{s.email}</div>
                      </td>
                      <td className="py-4">
                        <span className="flex items-center gap-1.5 text-sm text-neutral-600">
                          <Zap size={14} className="text-[#0077FF]" /> {s.focus_count}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className="text-sm font-bold text-neutral-900">{focusMins >= 60 ? `${Math.floor(focusMins/60)}h ${focusMins%60}m` : `${focusMins}m`}</span>
                      </td>
                      <td className="py-4">
                        <span className="flex items-center gap-1.5 text-sm text-neutral-600">
                          <Coffee size={14} className="text-green-500" /> {s.break_count} ({breakMins}m)
                        </span>
                      </td>
                      <td className="py-4">
                        {s.focus_count === 0 ? (
                          <span className="px-2 py-1 text-[10px] font-bold rounded-full uppercase bg-neutral-100 text-neutral-400">No data</span>
                        ) : isActive ? (
                          <span className="px-2 py-1 text-[10px] font-bold rounded-full uppercase bg-green-500/20 text-green-400 flex items-center gap-1 w-fit">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-[10px] font-bold rounded-full uppercase bg-neutral-100 text-neutral-500">Offline</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Full Report Modal */}
      <AnimatePresence>
        {showReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowReport(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-2xl max-h-[80vh] overflow-y-auto p-8 rounded-3xl shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-neutral-900 capitalize">{reportType} Report</h3>
                <button onClick={() => setShowReport(false)} className="text-neutral-400 hover:text-neutral-600"><X size={20} /></button>
              </div>

              {reportType === 'staff' && (
                <div className="space-y-4">
                  {staff.map(s => (
                    <div key={s.id} className="p-4 bg-neutral-50 rounded-xl flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-neutral-900">{s.name}</h4>
                        <p className="text-sm text-neutral-500 flex items-center gap-1"><Mail size={12} /> {s.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-neutral-900">{s.courses_created}</p>
                        <p className="text-xs text-neutral-400">courses created</p>
                      </div>
                    </div>
                  ))}
                  {staff.length === 0 && <p className="text-neutral-400 text-center py-8">No staff data.</p>}
                </div>
              )}

              {reportType === 'students' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs text-neutral-400 uppercase tracking-widest border-b border-neutral-100">
                        <th className="pb-3">Name</th><th className="pb-3">Email</th><th className="pb-3">Completed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                      {students.map(s => (
                        <tr key={s.id}>
                          <td className="py-3 font-bold text-neutral-900">{s.name}</td>
                          <td className="py-3 text-sm text-neutral-500">{s.email}</td>
                          <td className="py-3"><span className="bg-neutral-100 text-neutral-900 px-2 py-1 rounded-full text-xs font-bold">{s.lessons_completed} lessons</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {students.length === 0 && <p className="text-neutral-400 text-center py-8">No student data.</p>}
                </div>
              )}

              {reportType === 'courses' && (
                <div className="space-y-4">
                  {courses.map((c: any) => (
                    <div key={c.id} className="p-4 bg-neutral-50 rounded-xl">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-neutral-900">{c.title}</h4>
                        <span className="text-xs bg-neutral-100 text-neutral-900 px-2 py-1 rounded-full font-bold uppercase">{c.level}</span>
                      </div>
                      <p className="text-sm text-neutral-500 mt-1">{c.language} &bull; {c.description}</p>
                    </div>
                  ))}
                  {courses.length === 0 && <p className="text-neutral-400 text-center py-8">No course data.</p>}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ icon, label, value }: any) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, boxShadow: '0 0 18px rgba(0,119,255,0.3), 0 0 40px rgba(0,119,255,0.1)' }}
      whileTap={{ scale: 0.97, boxShadow: '0 0 24px rgba(0,119,255,0.5), 0 0 60px rgba(0,119,255,0.15)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 cursor-pointer"
    >
      <div className="text-neutral-900 mb-3">{icon}</div>
      <p className="text-xs text-neutral-500 font-medium uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-bold text-neutral-900 mt-1">{value}</p>
    </motion.div>
  );
}
