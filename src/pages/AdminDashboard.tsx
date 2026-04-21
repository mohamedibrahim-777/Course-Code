import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { useCachedData } from '../services/dataCache';
import SkeletonFallback from '../components/SkeletonFallback';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, BookOpen, BarChart3, Trash2, Edit, X, FileText, Save, ChevronDown, ChevronUp, Upload, Timer, Coffee, Zap, MessageCircle, Send, Reply } from 'lucide-react';
import { Course, Lesson } from '../types';

export default function AdminDashboard() {
  const { token } = useAuth();
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [managingLessons, setManagingLessons] = useState<string | null>(null);
  const [courseLessons, setCourseLessons] = useState<Lesson[]>([]);
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: '', description: '', language: '', level: 'beginner' });
  const [newLesson, setNewLesson] = useState({ title: '', content: '', video_url: '', resource_url: '', resource_type: 'pdf', order_index: 1 });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const { data, loading, refresh } = useCachedData(
    'admin-dashboard',
    async () => {
      const res = await fetch('/api/analytics/dashboard', { headers });
      const d = res.ok ? await res.json() : {};
      return {
        courses: (d.courses ?? []) as Course[],
        students: d.students ?? [],
        summary: d.summary ?? {},
        focusData: d.focusData ?? [],
        allComments: d.allComments ?? [],
      };
    },
    [token]
  );

  const fetchData = refresh;
  const courses: Course[] = data?.courses ?? [];
  const students: any[] = data?.students ?? [];
  const summary: any = data?.summary ?? {};
  const focusData: any[] = data?.focusData ?? [];
  const allComments: any[] = data?.allComments ?? [];

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch('/api/courses', { method: 'POST', headers, body: JSON.stringify(newCourse) });
      if (res.ok) {
        setShowAddCourse(false);
        setNewCourse({ title: '', description: '', language: '', level: 'beginner' });
        fetchData();
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || 'Failed to create course');
      }
    } catch (err: any) { setErrorMsg(err?.message || 'Network error'); }
  };

  const handleEditCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;
    setErrorMsg('');
    try {
      const res = await fetch(`/api/courses/${editingCourse.id}`, { method: 'PUT', headers, body: JSON.stringify(editingCourse) });
      if (res.ok) {
        setEditingCourse(null);
        fetchData();
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || 'Failed to update course');
      }
    } catch (err: any) { setErrorMsg(err?.message || 'Network error'); }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('Delete this course and all its lessons?')) return;
    try {
      const res = await fetch(`/api/courses/${id}`, { method: 'DELETE', headers });
      if (res.ok) fetchData();
      else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || 'Failed to delete course');
      }
    } catch (err: any) { setErrorMsg(err?.message || 'Network error'); }
  };

  const openLessonManager = async (courseId: string) => {
    if (managingLessons === courseId) { setManagingLessons(null); return; }
    try {
      const res = await fetch(`/api/courses/${courseId}`, { headers });
      const data = await res.json();
      setCourseLessons(data.lessons || []);
      setManagingLessons(courseId);
      setShowAddLesson(false);
    } catch (err: any) { setErrorMsg(err?.message || 'Failed to load lessons'); }
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingLessons) return;
    setErrorMsg('');
    try {
      const res = await fetch('/api/lessons', {
        method: 'POST', headers,
        body: JSON.stringify({ ...newLesson, course_id: managingLessons }),
      });
      if (res.ok) {
        setNewLesson({ title: '', content: '', video_url: '', resource_url: '', resource_type: 'pdf', order_index: courseLessons.length + 1 });
        setShowAddLesson(false);
        openLessonManager(managingLessons);
        fetchData();
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || 'Failed to add lesson');
      }
    } catch (err: any) { setErrorMsg(err?.message || 'Network error'); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'video_url' | 'resource_url') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData, headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        setUploadError(err.error || `Upload failed (${res.status})`);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setNewLesson(prev => ({ ...prev, [field]: data.url }));
      } else {
        setUploadError(data.error || 'Upload failed');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed - check file size');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Delete this lesson?')) return;
    try {
      const res = await fetch(`/api/lessons/${lessonId}`, { method: 'DELETE', headers });
      if (res.ok && managingLessons) openLessonManager(managingLessons);
      else if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || 'Failed to delete lesson');
      }
    } catch (err: any) { setErrorMsg(err?.message || 'Network error'); }
  };

  if (loading && !data) return <SkeletonFallback />;

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Staff Control Panel</h1>
          <p className="text-neutral-500">Manage courses, lessons, and student progress.</p>
        </div>
        <button
          onClick={() => setShowAddCourse(true)}
          className="btn-glow bg-[#0077FF]/80 backdrop-blur-xl text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-[#0077FF] transition-all shadow-lg shadow-blue-500/20 border border-blue-400/20"
        >
          <Plus size={20} /> Create New Course
        </button>
      </header>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start justify-between gap-2">
          <span className="text-sm">{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-red-600"><X size={16} /></button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={<Users />} label="Total Students" value={summary.totalStudents || 0} color="blue" />
        <StatCard icon={<BookOpen />} label="Active Courses" value={summary.totalCourses || 0} color="dark" />
        <StatCard icon={<BarChart3 />} label="Avg. Progress" value={`${summary.avgProgress || 0}%`} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Course Management */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
          <h2 className="text-xl font-bold text-neutral-900 mb-6 flex items-center gap-2">
            <BookOpen className="text-neutral-900" size={24} /> Course Management
          </h2>
          {courses.length === 0 ? (
            <p className="text-neutral-400 text-center py-8">No courses yet. Create your first course!</p>
          ) : (
            <div className="space-y-3">
              {courses.map(course => (
                <div key={course.id}>
                  <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-neutral-900 truncate">{course.title}</h4>
                      <p className="text-xs text-neutral-500 uppercase tracking-widest">{course.language} &bull; {course.level}</p>
                    </div>
                    <div className="flex gap-1 ml-3">
                      <button onClick={() => openLessonManager(course.id)} className="p-2 text-neutral-400 hover:text-blue-600 transition-colors" title="Manage Lessons">
                        <FileText size={18} />
                      </button>
                      <button onClick={() => setEditingCourse({ ...course })} className="p-2 text-neutral-400 hover:text-neutral-900 transition-colors" title="Edit Course">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => handleDeleteCourse(course.id)} className="p-2 text-neutral-400 hover:text-red-600 transition-colors" title="Delete Course">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Lesson Manager (inline) */}
                  <AnimatePresence>
                    {managingLessons === course.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-4 mt-2 p-4 bg-white border border-neutral-200 rounded-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="font-bold text-sm text-neutral-700">Lessons ({courseLessons.length})</h5>
                            <button
                              onClick={() => { setShowAddLesson(true); setNewLesson({ ...newLesson, order_index: courseLessons.length + 1 }); }}
                              className="text-neutral-900 text-xs font-bold flex items-center gap-1 hover:underline"
                            >
                              <Plus size={14} /> Add Lesson
                            </button>
                          </div>
                          {courseLessons.length === 0 && <p className="text-neutral-400 text-xs text-center py-2">No lessons yet.</p>}
                          {courseLessons.map(lesson => (
                            <div key={lesson.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg text-sm">
                              <div>
                                <span className="text-neutral-400 mr-2">#{lesson.order_index}</span>
                                <span className="font-medium text-neutral-800">{lesson.title}</span>
                              </div>
                              <button onClick={() => handleDeleteLesson(lesson.id)} className="text-neutral-400 hover:text-red-500">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}

                          {/* Add Lesson Form */}
                          {showAddLesson && (
                            <form onSubmit={handleAddLesson} className="space-y-3 pt-3 border-t border-neutral-100">
                              <input type="text" required placeholder="Lesson Title" value={newLesson.title}
                                onChange={e => setNewLesson({ ...newLesson, title: e.target.value })}
                                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-neutral-800"
                              />
                              <textarea placeholder="Lesson Content" value={newLesson.content}
                                onChange={e => setNewLesson({ ...newLesson, content: e.target.value })}
                                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-neutral-800 h-20"
                              />
                              <div className="space-y-2">
                                <label className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm cursor-pointer transition-colors ${
                                  newLesson.video_url && newLesson.video_url.startsWith('/uploads')
                                    ? 'bg-green-50 border-green-300 hover:bg-green-100'
                                    : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100'
                                }`}>
                                  <Upload size={16} className={newLesson.video_url && newLesson.video_url.startsWith('/uploads') ? 'text-green-600' : 'text-neutral-500'} />
                                  <span className={newLesson.video_url && newLesson.video_url.startsWith('/uploads') ? 'text-green-700 font-medium' : 'text-neutral-500'}>
                                    {uploading ? 'Uploading...' : newLesson.video_url && newLesson.video_url.startsWith('/uploads') ? `Video ready: ${newLesson.video_url.split('/').pop()}` : 'Upload Video (mp4, webm, ogg)'}
                                  </span>
                                  <input type="file" accept="video/mp4,video/webm,video/ogg,video/*" className="hidden" disabled={uploading} onChange={e => handleFileUpload(e, 'video_url')} />
                                </label>
                                {uploading && (
                                  <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-[#0077FF] h-full rounded-full animate-pulse" style={{ width: '60%' }} />
                                  </div>
                                )}
                                {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
                                <div className="flex items-center gap-2 text-xs text-neutral-400">
                                  <span className="flex-1 border-t border-neutral-200" />or paste link<span className="flex-1 border-t border-neutral-200" />
                                </div>
                                <input type="text" placeholder="YouTube or video URL (optional)"
                                  value={newLesson.video_url?.startsWith('/uploads') ? '' : (newLesson.video_url || '')}
                                  onChange={e => { if (!uploading) setNewLesson({ ...newLesson, video_url: e.target.value }); }}
                                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-neutral-800"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm cursor-pointer hover:bg-neutral-100 transition-colors">
                                  <Upload size={16} className="text-neutral-500" />
                                  <span className="text-neutral-500">{newLesson.resource_url ? 'Resource uploaded' : 'Upload Resource (optional)'}</span>
                                  <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" className="hidden" onChange={e => handleFileUpload(e, 'resource_url')} />
                                </label>
                                {newLesson.resource_url && <p className="text-xs text-green-600 mt-1">Uploaded: {newLesson.resource_url.split('/').pop()}</p>}
                              </div>
                              <div className="flex gap-2">
                                <select value={newLesson.resource_type} onChange={e => setNewLesson({ ...newLesson, resource_type: e.target.value })}
                                  className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm outline-none">
                                  <option value="pdf">PDF</option>
                                  <option value="doc">Document</option>
                                  <option value="excel">Excel</option>
                                  <option value="image">Image</option>
                                </select>
                                <input type="number" min={1} value={newLesson.order_index}
                                  onChange={e => setNewLesson({ ...newLesson, order_index: parseInt(e.target.value) })}
                                  className="w-20 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm outline-none" placeholder="#"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button type="button" onClick={() => setShowAddLesson(false)}
                                  className="flex-1 py-2 bg-neutral-100 text-neutral-600 font-bold rounded-lg text-sm hover:bg-neutral-200">Cancel</button>
                                <button type="submit" disabled={uploading}
                                  className={`btn-glow flex-1 py-2 font-bold rounded-lg text-sm ${uploading ? 'bg-neutral-400 text-neutral-200 cursor-not-allowed' : 'bg-neutral-900 text-white hover:bg-neutral-800'}`}>{uploading ? 'Wait for upload...' : 'Add Lesson'}</button>
                              </div>
                            </form>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Student Progress */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
          <h2 className="text-xl font-bold text-neutral-900 mb-6 flex items-center gap-2">
            <Users className="text-blue-600" size={24} /> Student Progress
          </h2>
          {students.length === 0 ? (
            <p className="text-neutral-400 text-center py-8">No students registered yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs text-neutral-400 uppercase tracking-widest border-b border-neutral-100">
                    <th className="pb-4 font-semibold">Student</th>
                    <th className="pb-4 font-semibold">Completed</th>
                    <th className="pb-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {students.map(student => (
                    <tr key={student.id}>
                      <td className="py-4">
                        <div className="font-bold text-neutral-900">{student.name}</div>
                        <div className="text-xs text-neutral-500">{student.email}</div>
                      </td>
                      <td className="py-4 text-sm text-neutral-600">{student.lessons_completed} Lessons</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase ${
                          student.lessons_completed > 0 ? 'bg-neutral-100 text-neutral-900' : 'bg-neutral-100 text-neutral-400'
                        }`}>
                          {student.lessons_completed > 0 ? 'Active' : 'New'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Student Focus Tracker */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
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

      {/* Student Doubts & Comments */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
        <h2 className="text-xl font-bold text-neutral-900 mb-6 flex items-center gap-2">
          <MessageCircle className="text-[#0077FF]" size={24} /> Student Doubts
          {allComments.filter(c => !c.parent_id).length > 0 && (
            <span className="text-xs bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full">{allComments.filter(c => !c.parent_id).length}</span>
          )}
        </h2>
        {allComments.filter(c => !c.parent_id).length === 0 ? (
          <p className="text-neutral-400 text-center py-8">No student doubts yet.</p>
        ) : (
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {allComments.filter(c => !c.parent_id).map(comment => {
              const replies = allComments.filter(c => c.parent_id === comment.id);
              const timeAgo = (date: string) => {
                const diff = Date.now() - new Date(date + (date.includes('Z') ? '' : 'Z')).getTime();
                const mins = Math.floor(diff / 60000);
                if (mins < 1) return 'just now';
                if (mins < 60) return `${mins}m ago`;
                const hrs = Math.floor(mins / 60);
                if (hrs < 24) return `${hrs}h ago`;
                return `${Math.floor(hrs / 24)}d ago`;
              };
              return (
                <div key={comment.id} className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4">
                  {/* Course & Lesson tag */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-neutral-200 text-neutral-600 px-2 py-0.5 rounded-full">{comment.course_title}</span>
                    <span className="text-[10px] text-neutral-400">&bull;</span>
                    <span className="text-[10px] font-medium text-neutral-500">{comment.lesson_title}</span>
                  </div>
                  {/* Comment header */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center text-[10px] font-bold text-neutral-600 shrink-0">
                      {comment.user_name[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-bold text-neutral-900">{comment.user_name}</span>
                    {comment.user_role === 'staff' && <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-[#0077FF]/20 text-[#0077FF]">Staff</span>}
                    {comment.user_role === 'hod' && <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-[#DC143C]/20 text-[#DC143C]">HOD</span>}
                    <span className="text-[10px] text-neutral-400">{timeAgo(comment.created_at)}</span>
                  </div>
                  {/* Comment body */}
                  <p className="text-sm text-neutral-700 leading-relaxed ml-9 whitespace-pre-wrap">{comment.content}</p>

                  {/* Reply button */}
                  <div className="ml-9 mt-2">
                    <button
                      onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyText(''); }}
                      className="text-[11px] font-bold text-neutral-400 hover:text-[#0077FF] flex items-center gap-1 transition-colors"
                    >
                      <Reply size={12} /> Reply
                    </button>
                  </div>

                  {/* Existing replies */}
                  {replies.length > 0 && (
                    <div className="ml-9 mt-3 space-y-3 pl-4 border-l-2 border-neutral-200">
                      {replies.map(reply => (
                        <div key={reply.id} className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center text-[9px] font-bold text-neutral-600 shrink-0 mt-0.5">
                            {reply.user_name[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-neutral-900">{reply.user_name}</span>
                              {reply.user_role === 'staff' && <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-[#0077FF]/20 text-[#0077FF]">Staff</span>}
                              {reply.user_role === 'hod' && <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-[#DC143C]/20 text-[#DC143C]">HOD</span>}
                              <span className="text-[10px] text-neutral-400">{timeAgo(reply.created_at)}</span>
                            </div>
                            <p className="text-xs text-neutral-600 leading-relaxed mt-0.5 whitespace-pre-wrap">{reply.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply input */}
                  {replyingTo === comment.id && (
                    <div className="ml-9 mt-3">
                      <div className="flex gap-2">
                        <textarea
                          autoFocus
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          placeholder={`Reply to ${comment.user_name}...`}
                          className="flex-1 px-3 py-2 bg-white border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-[#0077FF]/40 text-xs resize-none h-16"
                        />
                        <button
                          onClick={async () => {
                            if (!replyText.trim()) return;
                            try {
                              const res = await fetch(`/api/comments/${comment.id}/reply`, {
                                method: 'POST', headers,
                                body: JSON.stringify({ content: replyText }),
                              });
                              if (!res.ok) {
                                const data = await res.json().catch(() => ({}));
                                setErrorMsg(data.error || 'Failed to reply');
                                return;
                              }
                              setReplyingTo(null);
                              setReplyText('');
                              fetchData();
                            } catch (err: any) { setErrorMsg(err?.message || 'Network error'); }
                          }}
                          disabled={!replyText.trim()}
                          className="bg-[#0077FF] text-white px-3 rounded-lg text-xs font-bold hover:bg-[#0066DD] transition-colors disabled:opacity-40 self-end py-2"
                        >
                          <Send size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Add Course Modal */}
      <Modal show={showAddCourse} onClose={() => setShowAddCourse(false)} title="Create New Course">
        <form onSubmit={handleAddCourse} className="space-y-4">
          <Input label="Course Title" required value={newCourse.title} onChange={v => setNewCourse({ ...newCourse, title: v })} placeholder="e.g. Python for Beginners" />
          <Input label="Language" required value={newCourse.language} onChange={v => setNewCourse({ ...newCourse, language: v })} placeholder="e.g. Python" />
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1">Level</label>
            <select value={newCourse.level} onChange={e => setNewCourse({ ...newCourse, level: e.target.value })}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-neutral-800">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1">Description</label>
            <textarea required value={newCourse.description} onChange={e => setNewCourse({ ...newCourse, description: e.target.value })}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-neutral-800 h-24" placeholder="What will students learn?" />
          </div>
          <ModalButtons onCancel={() => setShowAddCourse(false)} submitText="Create Course" />
        </form>
      </Modal>

      {/* Edit Course Modal */}
      <Modal show={!!editingCourse} onClose={() => setEditingCourse(null)} title="Edit Course">
        {editingCourse && (
          <form onSubmit={handleEditCourse} className="space-y-4">
            <Input label="Course Title" required value={editingCourse.title} onChange={v => setEditingCourse({ ...editingCourse, title: v })} />
            <Input label="Language" required value={editingCourse.language} onChange={v => setEditingCourse({ ...editingCourse, language: v })} />
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-1">Level</label>
              <select value={editingCourse.level} onChange={e => setEditingCourse({ ...editingCourse, level: e.target.value as any })}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-neutral-800">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-1">Description</label>
              <textarea required value={editingCourse.description} onChange={e => setEditingCourse({ ...editingCourse, description: e.target.value })}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-neutral-800 h-24" />
            </div>
            <ModalButtons onCancel={() => setEditingCourse(null)} submitText="Save Changes" />
          </form>
        )}
      </Modal>
    </div>
  );
}

function Modal({ show, onClose, title, children }: { show: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="absolute inset-0"
        style={{
          background: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      />
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="relative z-10 w-full max-w-md p-8 rounded-3xl"
        style={{
          background: isDark ? 'rgba(20, 20, 50, 0.55)' : 'rgba(238, 242, 255, 0.6)',
          backdropFilter: 'blur(40px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(40px) saturate(1.2)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(99, 102, 241, 0.15)',
          boxShadow: isDark
            ? '0 8px 32px rgba(0, 0, 0, 0.4)'
            : '0 8px 32px rgba(99, 102, 241, 0.1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>{title}</h3>
          <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${isDark ? 'text-neutral-400 hover:text-white hover:bg-white/10' : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100'}`}><X size={20} /></button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function Input({ label, value, onChange, ...props }: any) {
  return (
    <div>
      <label className="block text-sm font-semibold text-neutral-700 mb-1">{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-neutral-800" {...props} />
    </div>
  );
}

function ModalButtons({ onCancel, submitText }: { onCancel: () => void; submitText: string }) {
  return (
    <div className="flex gap-3 pt-4">
      <button type="button" onClick={onCancel} className="flex-1 py-3 bg-neutral-100 text-neutral-600 font-bold rounded-xl hover:bg-neutral-200 transition-colors">Cancel</button>
      <button type="submit" className="btn-glow flex-1 py-3 bg-neutral-900 text-white font-bold rounded-xl hover:bg-neutral-800 transition-all">{submitText}</button>
    </div>
  );
}

function StatCard({ icon, label, value, color }: any) {
  const colors: any = { dark: 'bg-neutral-100 text-neutral-900', blue: 'bg-neutral-100 text-neutral-700', amber: 'bg-neutral-100 text-neutral-700' };
  return (
    <div className="card-hover bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-xs text-neutral-500 font-medium uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-bold text-neutral-900">{value}</p>
      </div>
    </div>
  );
}
