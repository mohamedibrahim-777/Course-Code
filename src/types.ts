export interface User {
  id: number;
  name: string;
  email: string;
  role: 'hod' | 'staff' | 'student';
  bio?: string;
  profile_pic?: string;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  language: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  thumbnail?: string;
  created_by: number;
  lessons?: Lesson[];
}

export interface Lesson {
  id: number;
  course_id: number;
  title: string;
  content: string;
  video_url?: string;
  resource_url?: string;
  resource_type?: 'pdf' | 'excel' | 'doc' | 'image';
  order_index: number;
}

export interface Progress {
  lesson_id: number;
}
