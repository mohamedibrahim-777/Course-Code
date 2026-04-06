import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Download, FileText, ChevronRight, BookOpen, Video, Mail, ArrowLeft, Lock, Clock, Eye, FileDown, MessageCircle, Send, Reply, Trash2, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Course, Lesson } from '../types';

export default function CourseView() {
  const { id } = useParams();
  const { token } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [showContact, setShowContact] = useState(false);

  // Engagement tracking per lesson
  const [videoWatched, setVideoWatched] = useState<Record<number, boolean>>({});
  const [resourceDownloaded, setResourceDownloaded] = useState<Record<number, boolean>>({});
  const [timeSpent, setTimeSpent] = useState<Record<number, number>>({});
  const [timerActive, setTimerActive] = useState(false);

  const MIN_READ_SECONDS = 30; // minimum time to spend reading before marking complete

  // Timer: track time spent on active lesson
  useEffect(() => {
    if (!activeLesson || completedLessons.includes(activeLesson.id)) return;
    setTimerActive(true);
    const interval = setInterval(() => {
      setTimeSpent(prev => ({ ...prev, [activeLesson.id]: (prev[activeLesson.id] || 0) + 1 }));
    }, 1000);
    return () => { clearInterval(interval); setTimerActive(false); };
  }, [activeLesson?.id]);

  // Reset engagement when switching lessons
  const switchLesson = (lesson: Lesson) => {
    setActiveLesson(lesson);
  };

  // Check if lesson can be marked complete
  const canMarkComplete = (lesson: Lesson): { ready: boolean; reasons: string[] } => {
    if (completedLessons.includes(lesson.id)) return { ready: true, reasons: [] };
    const reasons: string[] = [];
    const spent = timeSpent[lesson.id] || 0;
    if (spent < MIN_READ_SECONDS) reasons.push(`Read for ${MIN_READ_SECONDS - spent}s more`);
    if (lesson.video_url && !videoWatched[lesson.id]) reasons.push('Watch the video');
    if (lesson.resource_url && !resourceDownloaded[lesson.id]) reasons.push('Download the resource');
    return { ready: reasons.length === 0, reasons };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [courseRes, progressRes] = await Promise.all([
          fetch(`/api/courses/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/progress', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        const courseData = await courseRes.json();
        const progressData = await progressRes.json();

        setCourse(courseData);
        setCompletedLessons(progressData.map((p: any) => p.lesson_id));
        if (courseData.lessons?.length > 0) {
          setActiveLesson(courseData.lessons[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, token]);

  const markComplete = async (lessonId: number) => {
    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lesson_id: lessonId }),
      });
      setCompletedLessons(prev => [...prev, lessonId]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = (url: string, type: string) => {
    window.open(url, '_blank');
  };

  if (loading) return <div className="text-center py-20">Loading course content...</div>;
  if (!course) return (
    <div className="text-center py-20">
      <p className="text-neutral-500 mb-4">Course not found.</p>
      <Link to="/dashboard" className="text-neutral-900 font-bold hover:underline">Back to Dashboard</Link>
    </div>
  );

  const completedCount = course.lessons?.filter(l => completedLessons.includes(l.id)).length || 0;
  const totalLessons = course.lessons?.length || 0;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Back button + course header */}
      <div className="flex items-center gap-4">
        <Link to="/dashboard" className="p-2 bg-white rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{course.title}</h1>
          <p className="text-sm text-neutral-500">{course.language} &bull; {course.level} &bull; {totalLessons} lessons</p>
        </div>
      </div>

      {/* Progress bar */}
      {totalLessons > 0 && (
        <div className="bg-white p-4 rounded-xl border border-neutral-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-neutral-600">Course Progress</span>
            <span className="text-sm font-bold text-neutral-900">{progressPct}% ({completedCount}/{totalLessons})</span>
          </div>
          <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} className="bg-neutral-800 h-full rounded-full" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {activeLesson ? (
            <motion.div
              key={activeLesson.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden"
            >
              {activeLesson.video_url ? (
                <div className="aspect-video bg-neutral-900 relative">
                  {activeLesson.video_url.includes('youtube.com') || activeLesson.video_url.includes('youtu.be') ? (
                    <iframe
                      src={activeLesson.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                      className="w-full h-full"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      onLoad={() => {
                        // For YouTube, mark as watched after 10 seconds of having it open
                        setTimeout(() => setVideoWatched(prev => ({ ...prev, [activeLesson.id]: true })), 10000);
                      }}
                    />
                  ) : (
                    <video
                      src={activeLesson.video_url}
                      controls
                      className="w-full h-full"
                      onEnded={() => setVideoWatched(prev => ({ ...prev, [activeLesson.id]: true }))}
                      onTimeUpdate={(e) => {
                        const video = e.currentTarget;
                        if (video.currentTime / video.duration > 0.8) {
                          setVideoWatched(prev => ({ ...prev, [activeLesson.id]: true }));
                        }
                      }}
                    />
                  )}
                  {videoWatched[activeLesson.id] && (
                    <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                      <Eye size={12} /> Watched
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-2 bg-neutral-900" />
              )}

              <div className="p-8">
                <div className="flex items-center gap-2 text-neutral-900 text-xs font-bold uppercase tracking-widest mb-4">
                  <BookOpen size={14} /> Lesson {activeLesson.order_index}
                </div>
                <h2 className="text-3xl font-bold text-neutral-900 mb-6">{activeLesson.title}</h2>

                <div className="prose prose-neutral max-w-none text-neutral-600 leading-relaxed whitespace-pre-wrap">
                  {activeLesson.content || 'No content available for this lesson.'}
                </div>

                {activeLesson.resource_url && (
                  <div className="mt-8 p-6 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-neutral-900">
                        <FileText size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-neutral-900">Study Material</h4>
                        <p className="text-xs text-neutral-500 uppercase tracking-widest">{activeLesson.resource_type}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        handleDownload(activeLesson.resource_url!, activeLesson.resource_type || 'file');
                        setResourceDownloaded(prev => ({ ...prev, [activeLesson.id]: true }));
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-bold border flex items-center gap-2 transition-colors ${
                        resourceDownloaded[activeLesson.id]
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      {resourceDownloaded[activeLesson.id] ? (
                        <><CheckCircle size={16} /> Downloaded</>
                      ) : (
                        <><Download size={16} /> Download</>
                      )}
                    </button>
                  </div>
                )}

                <div className="mt-12 pt-8 border-t border-neutral-100 space-y-4">
                  {/* Engagement checklist */}
                  {!completedLessons.includes(activeLesson.id) && (() => {
                    const { ready, reasons } = canMarkComplete(activeLesson);
                    if (ready) return null;
                    return (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <p className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
                          <Lock size={14} /> Complete these to unlock:
                        </p>
                        <ul className="space-y-1">
                          {reasons.map((r, i) => (
                            <li key={i} className="text-sm text-amber-700 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" /> {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}

                  {/* Progress indicators */}
                  {!completedLessons.includes(activeLesson.id) && (
                    <div className="flex flex-wrap gap-3">
                      <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${
                        (timeSpent[activeLesson.id] || 0) >= MIN_READ_SECONDS
                          ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'
                      }`}>
                        <Clock size={12} />
                        {Math.min(timeSpent[activeLesson.id] || 0, MIN_READ_SECONDS)}/{MIN_READ_SECONDS}s reading
                      </div>
                      {activeLesson.video_url && (
                        <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${
                          videoWatched[activeLesson.id] ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'
                        }`}>
                          <Video size={12} /> {videoWatched[activeLesson.id] ? 'Video watched' : 'Watch video'}
                        </div>
                      )}
                      {activeLesson.resource_url && (
                        <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${
                          resourceDownloaded[activeLesson.id] ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'
                        }`}>
                          <FileDown size={12} /> {resourceDownloaded[activeLesson.id] ? 'Resource downloaded' : 'Download resource'}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                  {(() => {
                    const { ready } = canMarkComplete(activeLesson);
                    return (
                      <button
                        onClick={() => ready && markComplete(activeLesson.id)}
                        disabled={completedLessons.includes(activeLesson.id) || !ready}
                        className={`btn-glow px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
                          completedLessons.includes(activeLesson.id)
                            ? 'bg-neutral-100 text-neutral-900 cursor-default'
                            : ready
                            ? 'bg-neutral-900 text-white hover:bg-neutral-700 shadow-lg shadow-neutral-900/10'
                            : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                        }`}
                      >
                        {completedLessons.includes(activeLesson.id) ? (
                          <><CheckCircle size={20} /> Completed</>
                        ) : ready ? (
                          'Mark as Complete'
                        ) : (
                          <><Lock size={16} /> Mark as Complete</>
                        )}
                      </button>
                    );
                  })()}

                  {/* Next lesson */}
                  {course.lessons && (() => {
                    const currentIdx = course.lessons.findIndex(l => l.id === activeLesson.id);
                    const next = course.lessons[currentIdx + 1];
                    if (!next) return null;
                    return (
                      <button onClick={() => switchLesson(next)}
                        className="text-neutral-900 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all">
                        Next Lesson <ChevronRight size={16} />
                      </button>
                    );
                  })()}
                </div>
                </div>

                {/* Doubt / Comment Section */}
                <DoubtSection lessonId={activeLesson.id} />
              </div>
            </motion.div>
          ) : (
            <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 p-12 text-center">
              <BookOpen className="mx-auto text-neutral-300 mb-4" size={48} />
              <h3 className="text-lg font-bold text-neutral-700 mb-2">No lessons yet</h3>
              <p className="text-neutral-400">This course doesn't have any lessons yet. Check back later!</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
            <h3 className="text-lg font-bold text-neutral-900 mb-6">Course Content</h3>
            {(!course.lessons || course.lessons.length === 0) ? (
              <p className="text-neutral-400 text-sm text-center py-4">No lessons available.</p>
            ) : (
              <div className="space-y-2">
                {course.lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => switchLesson(lesson)}
                    className={`w-full text-left p-4 rounded-2xl transition-all flex items-center justify-between group ${
                      activeLesson?.id === lesson.id
                        ? 'bg-neutral-100 border border-neutral-200'
                        : 'hover:bg-neutral-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        completedLessons.includes(lesson.id)
                          ? 'bg-neutral-200 text-neutral-900'
                          : activeLesson?.id === lesson.id
                          ? 'bg-neutral-900 text-white'
                          : 'bg-neutral-100 text-neutral-400'
                      }`}>
                        {completedLessons.includes(lesson.id) ? <CheckCircle size={14} /> : lesson.order_index}
                      </div>
                      <span className={`text-sm font-medium ${activeLesson?.id === lesson.id ? 'text-neutral-900' : 'text-neutral-600'}`}>
                        {lesson.title}
                      </span>
                    </div>
                    <ChevronRight size={16} className={`transition-transform ${activeLesson?.id === lesson.id ? 'translate-x-1 text-neutral-900' : 'text-neutral-300'}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Contact Support */}
          <div className="bg-neutral-900 text-white p-8 rounded-3xl shadow-xl">
            <h4 className="font-bold mb-2">Need Help?</h4>
            <p className="text-neutral-200 text-sm mb-4">Our staff members are available for Q&A sessions every Friday.</p>
            <button
              onClick={() => setShowContact(!showContact)}
              className="w-full bg-neutral-800 py-3 rounded-xl text-sm font-bold hover:bg-neutral-700 transition-colors"
            >
              {showContact ? 'Hide Details' : 'Contact Support'}
            </button>
            {showContact && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 space-y-3">
                <a href="mailto:staff1@example.com" className="flex items-center gap-2 text-neutral-300 hover:text-white text-sm transition-colors">
                  <Mail size={14} /> staff1@example.com
                </a>
                <a href="mailto:staff2@example.com" className="flex items-center gap-2 text-neutral-300 hover:text-white text-sm transition-colors">
                  <Mail size={14} /> staff2@example.com
                </a>
                <p className="text-neutral-500 text-xs">Office hours: Friday 2PM - 5PM</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface Comment {
  id: number;
  lesson_id: number;
  user_id: number;
  parent_id: number | null;
  content: string;
  created_at: string;
  user_name: string;
  user_role: string;
  profile_pic: string | null;
}

function DoubtSection({ lessonId }: { lessonId: number }) {
  const { token, user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/lessons/${lessonId}/comments`, { headers: { Authorization: `Bearer ${token}` } });
      setComments(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchComments(); }, [lessonId]);

  const postComment = async (content: string, parentId?: number) => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content, parent_id: parentId }),
      });
      if (res.ok) {
        setNewComment('');
        setReplyTo(null);
        setReplyText('');
        fetchComments();
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const deleteComment = async (id: number) => {
    if (!confirm('Delete this comment?')) return;
    await fetch(`/api/comments/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    fetchComments();
  };

  const topLevel = comments.filter(c => !c.parent_id);
  const getReplies = (id: number) => comments.filter(c => c.parent_id === id);

  const roleBadge = (role: string) => {
    if (role === 'staff') return <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-[#0077FF]/20 text-[#0077FF]">Staff</span>;
    if (role === 'hod') return <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-[#DC143C]/20 text-[#DC143C]">HOD</span>;
    return null;
  };

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
    <div className="mt-10 pt-8 border-t border-neutral-100">
      <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2 mb-6">
        <MessageCircle size={20} className="text-[#0077FF]" /> Doubts & Discussion
        {topLevel.length > 0 && <span className="text-xs bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full">{comments.length}</span>}
      </h3>

      {/* Post new doubt */}
      <div className="mb-6">
        <textarea
          ref={inputRef}
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Ask a doubt or share your thoughts..."
          className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0077FF]/40 text-sm resize-none h-20"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={() => postComment(newComment)}
            disabled={!newComment.trim() || loading}
            className="bg-[#0077FF] text-white px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#0066DD] transition-colors disabled:opacity-40"
          >
            <Send size={14} /> Post
          </button>
        </div>
      </div>

      {/* Comments list */}
      {topLevel.length === 0 ? (
        <p className="text-neutral-400 text-sm text-center py-6">No doubts yet. Be the first to ask!</p>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {topLevel.map(comment => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4"
              >
                {/* Comment header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center text-[10px] font-bold text-neutral-600 shrink-0">
                      {comment.user_name[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-bold text-neutral-900">{comment.user_name}</span>
                    {roleBadge(comment.user_role)}
                    <span className="text-[10px] text-neutral-400">{timeAgo(comment.created_at)}</span>
                  </div>
                  {(comment.user_id === user?.id || user?.role !== 'student') && (
                    <button onClick={() => deleteComment(comment.id)} className="text-neutral-300 hover:text-[#DC143C] transition-colors p-1">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                {/* Comment body */}
                <p className="text-sm text-neutral-700 leading-relaxed ml-9 whitespace-pre-wrap">{comment.content}</p>

                {/* Reply button */}
                <div className="ml-9 mt-2">
                  <button
                    onClick={() => { setReplyTo(replyTo?.id === comment.id ? null : comment); setReplyText(''); }}
                    className="text-[11px] font-bold text-neutral-400 hover:text-[#0077FF] flex items-center gap-1 transition-colors"
                  >
                    <Reply size={12} /> Reply
                  </button>
                </div>

                {/* Replies */}
                {getReplies(comment.id).length > 0 && (
                  <div className="ml-9 mt-3 space-y-3 pl-4 border-l-2 border-neutral-200">
                    {getReplies(comment.id).map(reply => (
                      <div key={reply.id} className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center text-[9px] font-bold text-neutral-600 shrink-0 mt-0.5">
                          {reply.user_name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-neutral-900">{reply.user_name}</span>
                            {roleBadge(reply.user_role)}
                            <span className="text-[10px] text-neutral-400">{timeAgo(reply.created_at)}</span>
                            {(reply.user_id === user?.id || user?.role !== 'student') && (
                              <button onClick={() => deleteComment(reply.id)} className="text-neutral-300 hover:text-[#DC143C] transition-colors">
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-neutral-600 leading-relaxed mt-0.5 whitespace-pre-wrap">{reply.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply input */}
                {replyTo?.id === comment.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="ml-9 mt-3">
                    <div className="flex gap-2">
                      <textarea
                        autoFocus
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder={`Reply to ${comment.user_name}...`}
                        className="flex-1 px-3 py-2 bg-white border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-[#0077FF]/40 text-xs resize-none h-16"
                      />
                      <button
                        onClick={() => postComment(replyText, comment.id)}
                        disabled={!replyText.trim() || loading}
                        className="bg-[#0077FF] text-white px-3 rounded-lg text-xs font-bold hover:bg-[#0066DD] transition-colors disabled:opacity-40 self-end py-2"
                      >
                        <Send size={12} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
