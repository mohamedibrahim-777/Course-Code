import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { motion } from 'framer-motion';
import { Book, Download, PlayCircle, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Course } from '../types';

export default function StudentDashboard() {
  const { user, token } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, progressRes] = await Promise.all([
          fetch('/api/courses', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/progress', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        const coursesData = await coursesRes.json();
        const progressData = await progressRes.json();
        setCourses(coursesData);
        setProgress(progressData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  if (loading) return <div className="text-center py-20">Loading your learning path...</div>;

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

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
            <Book className="text-neutral-900" size={24} /> Available Courses
          </h2>
          <span className="text-sm text-neutral-500">{courses.length} Courses found</span>
        </div>

        {courses.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-neutral-100">
            <Book className="mx-auto text-neutral-300 mb-4" size={48} />
            <h3 className="text-lg font-bold text-neutral-700 mb-2">No courses available yet</h3>
            <p className="text-neutral-400">Check back soon - our staff is preparing great content for you!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course, idx) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
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
                  <div className="flex items-center justify-between pt-4 border-t border-neutral-50">
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">{course.language}</span>
                    <Link
                      to={`/course/${course.id}`}
                      className="text-neutral-900 font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all"
                    >
                      Start Learning <PlayCircle size={16} />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Downloads Section */}
      {courses.length > 0 && (
        <section className="bg-neutral-900 rounded-3xl p-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-4">Download Center</h2>
            <p className="text-neutral-200 mb-6">Access all your course materials, PDFs, and practice sheets.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {courses.map(course => (
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
