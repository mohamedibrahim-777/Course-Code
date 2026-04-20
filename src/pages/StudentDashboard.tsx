import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useCachedData } from '../services/dataCache';
import SkeletonFallback from '../components/SkeletonFallback';
import { motion, AnimatePresence } from 'framer-motion';
import { Book, Download, PlayCircle, TrendingUp, Timer, Coffee, Play, Pause, RotateCcw, Zap, Plus, Check, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Course } from '../types';

export default function StudentDashboard() {
  const { user, token } = useAuth();
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'enrolled' | 'browse'>('enrolled');

  const { data, loading, refresh } = useCachedData(
    'student-dashboard',
    async () => {
      const [enrolledRes, browseRes, progressRes] = await Promise.all([
        fetch('/api/courses?filter=enrolled', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/courses?filter=browse', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/progress', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      return {
        enrolledCourses: (enrolledRes.ok ? await enrolledRes.json() : []) as Course[],
        availableCourses: (browseRes.ok ? await browseRes.json() : []) as Course[],
        progress: progressRes.ok ? await progressRes.json() : [],
      };
    },
    [token]
  );

  const fetchData = refresh;
  const enrolledCourses: Course[] = data?.enrolledCourses ?? [];
  const availableCourses: Course[] = data?.availableCourses ?? [];
  const progress: any[] = data?.progress ?? [];

  const enroll = async (courseId: string) => {
    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchData();
      else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to enroll');
      }
    } catch (err: any) { setError(err?.message || 'Network error'); }
  };

  const courses = tab === 'enrolled' ? enrolledCourses : availableCourses;

  if (loading && !data) return <SkeletonFallback />;

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Hello, {user?.name}!</h1>
          <p className="text-neutral-500">Ready to master a new skill today?</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-neutral-200 text-neutral-900 rounded-xl flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-medium">Progress</p>
              <p className="text-lg font-bold text-neutral-900">{progress.length} Lessons</p>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">{error}</div>
      )}

      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('enrolled')}
              className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors ${
                tab === 'enrolled' ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              <BookOpen size={16} /> My Courses ({enrolledCourses.length})
            </button>
            <button
              onClick={() => setTab('browse')}
              className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors ${
                tab === 'browse' ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              <Book size={16} /> Browse ({availableCourses.length})
            </button>
          </div>
          <span className="text-sm text-neutral-500">{courses.length} Courses</span>
        </div>

        {courses.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-neutral-100">
            <Book className="mx-auto text-neutral-300 mb-4" size={48} />
            <h3 className="text-lg font-bold text-neutral-700 mb-2">
              {tab === 'enrolled' ? 'No enrolled courses yet' : 'No courses available'}
            </h3>
            <p className="text-neutral-400">
              {tab === 'enrolled' ? 'Browse the catalog and enroll in your first course.' : 'Check back soon - our staff is preparing great content!'}
            </p>
            {tab === 'enrolled' && availableCourses.length > 0 && (
              <button onClick={() => setTab('browse')} className="mt-4 text-[#0077FF] font-bold text-sm hover:underline">
                Browse Catalog →
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course, idx) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.05, 0.3) }}
                className="card-hover bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden group"
              >
                <div className="h-40 bg-gradient-to-br from-neutral-600 to-neutral-900 relative overflow-hidden flex items-center justify-center">
                  <span className="text-white/30 text-6xl font-black">{course.language?.slice(0, 2).toUpperCase()}</span>
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-neutral-700">
                    {course.level}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-neutral-900 mb-2">{course.title}</h3>
                  <p className="text-neutral-500 text-sm line-clamp-2 mb-4">{course.description}</p>
                  {course.created_by_name && (
                    <p className="text-xs text-neutral-400 mb-3">By {course.created_by_name}</p>
                  )}
                  <div className="flex items-center justify-between pt-4 border-t border-neutral-50">
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">{course.language}</span>
                    {tab === 'browse' ? (
                      <button
                        onClick={() => enroll(course.id)}
                        className="bg-[#0077FF] text-white px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 hover:bg-[#0066DD] transition-colors"
                      >
                        <Plus size={14} /> Enroll
                      </button>
                    ) : (
                      <Link
                        to={`/course/${course.id}`}
                        className="text-neutral-900 font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all"
                      >
                        Start Learning <PlayCircle size={16} />
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Focus Mode */}
      <FocusMode />

      {/* Downloads Section */}
      {enrolledCourses.length > 0 && (
        <section className="bg-neutral-900 rounded-3xl p-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-4">Download Center</h2>
            <p className="text-neutral-200 mb-6">Access all your course materials, PDFs, and practice sheets.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {enrolledCourses.map(course => (
                <Link
                  key={course.id}
                  to={`/course/${course.id}`}
                  className="bg-neutral-800/60 hover:bg-neutral-800 p-4 rounded-xl flex items-center gap-3 transition-colors"
                >
                  <Download size={18} className="text-neutral-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{course.title}</p>
                    <p className="text-neutral-500 text-xs">{course.language}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-neutral-800 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50" />
        </section>
      )}
    </div>
  );
}

const FOCUS_DURATION = 30 * 60;
const BREAK_DURATION = 5 * 60;

function FocusMode() {
  const { token } = useAuth();
  const [mode, setMode] = useState<'idle' | 'focus' | 'break'>('idle');
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_DURATION);
  const [paused, setPaused] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [totalFocusToday, setTotalFocusToday] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const logSession = useCallback(async (type: 'focus' | 'break', duration: number) => {
    try {
      await fetch('/api/focus-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type, duration }),
      });
    } catch (e) { console.error(e); }
  }, [token]);

  useEffect(() => {
    fetch('/api/focus-sessions/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const focus = data.find((d: any) => d.type === 'focus');
        if (focus) { setSessions(focus.count); setTotalFocusToday(focus.total_seconds); }
      }).catch(() => {});
  }, [token]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  useEffect(() => {
    if (mode === 'idle' || paused) { clearTimer(); return; }
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearTimer();
          if (mode === 'focus') {
            setSessions(s => s + 1);
            setTotalFocusToday(t => t + FOCUS_DURATION);
            logSession('focus', FOCUS_DURATION);
            setMode('break');
            return BREAK_DURATION;
          } else {
            logSession('break', BREAK_DURATION);
            setMode('idle');
            return FOCUS_DURATION;
          }
        }
        return prev - 1;
      });
    }, 1000);
    return clearTimer;
  }, [mode, paused, clearTimer, logSession]);

  const startFocus = () => { setMode('focus'); setSecondsLeft(FOCUS_DURATION); setPaused(false); };
  const startBreak = () => { setMode('break'); setSecondsLeft(BREAK_DURATION); setPaused(false); };
  const reset = () => { clearTimer(); setMode('idle'); setSecondsLeft(FOCUS_DURATION); setPaused(false); };

  const total = mode === 'focus' ? FOCUS_DURATION : mode === 'break' ? BREAK_DURATION : FOCUS_DURATION;
  const progress = ((total - secondsLeft) / total) * 100;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  const ringRadius = 54;
  const circumference = 2 * Math.PI * ringRadius;
  const strokeOffset = circumference - (progress / 100) * circumference;

  return (
    <section className="bg-white rounded-3xl p-8 shadow-sm border border-neutral-100 overflow-hidden relative">
      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Timer Ring */}
        <div className="relative shrink-0">
          <svg width="140" height="140" className="-rotate-90">
            <circle cx="70" cy="70" r={ringRadius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
            <motion.circle
              cx="70" cy="70" r={ringRadius} fill="none"
              strokeWidth="8" strokeLinecap="round"
              stroke={mode === 'break' ? '#22c55e' : '#0077FF'}
              strokeDasharray={circumference}
              animate={{ strokeDashoffset: strokeOffset }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black tabular-nums text-neutral-900">
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mt-1">
              {mode === 'idle' ? 'Ready' : mode === 'focus' ? 'Focusing' : 'Break'}
            </span>
          </div>
        </div>

        {/* Info & Controls */}
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center justify-center md:justify-start gap-2 mb-2">
            {mode === 'break' ? <Coffee size={22} className="text-green-500" /> : <Timer size={22} className="text-[#0077FF]" />}
            {mode === 'idle' ? 'Focus Mode' : mode === 'focus' ? 'Stay Focused!' : 'Take a Break!'}
          </h3>
          <p className="text-neutral-500 text-sm mb-5">
            {mode === 'idle' && 'Start a 30-minute focus session to boost your productivity.'}
            {mode === 'focus' && 'Stay on task — a 5-minute break is waiting for you!'}
            {mode === 'break' && 'Relax, stretch, grab a drink. You earned it!'}
          </p>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
            {mode === 'idle' ? (
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={startFocus}
                className="bg-[#0077FF] text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#0066DD] transition-colors shadow-sm">
                <Play size={16} /> Start Focus
              </motion.button>
            ) : (
              <>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => setPaused(!paused)}
                  className="bg-[#0077FF] text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#0066DD] transition-colors shadow-sm">
                  {paused ? <Play size={16} /> : <Pause size={16} />} {paused ? 'Resume' : 'Pause'}
                </motion.button>
                {mode === 'focus' && (
                  <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={startBreak}
                    className="bg-green-500/20 text-green-400 border border-green-500/30 px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-green-500/30 transition-colors">
                    <Coffee size={16} /> Skip to Break
                  </motion.button>
                )}
                {mode === 'break' && (
                  <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={startFocus}
                    className="bg-[#0077FF]/20 text-[#89CFF0] border border-[#0077FF]/30 px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#0077FF]/30 transition-colors">
                    <Zap size={16} /> New Focus
                  </motion.button>
                )}
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={reset}
                  className="bg-white/10 text-neutral-400 px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 hover:text-neutral-200 transition-colors">
                  <RotateCcw size={14} /> Reset
                </motion.button>
              </>
            )}
          </div>

          {sessions > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-neutral-500">
              <span className="flex items-center gap-1.5">
                <Zap size={12} className="text-[#0077FF]" /> {sessions} session{sessions > 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1.5">
                <Timer size={12} className="text-[#0077FF]" /> {Math.floor(totalFocusToday / 60)}m focused today
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
