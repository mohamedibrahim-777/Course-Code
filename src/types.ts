export interface User {
  id: string;
  name: string;
  email: string;
  role: 'hod' | 'staff' | 'student';
  bio?: string;
  profile_pic?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  language: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  thumbnail?: string;
  created_by: string;
  created_by_name?: string;
  enrolled?: boolean;
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  content: string;
  video_url?: string;
  resource_url?: string;
  resource_type?: 'pdf' | 'excel' | 'doc' | 'image';
  order_index: number;
}

export interface Progress {
  lesson_id: string;
}

export interface Comment {
  id: string;
  lesson_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  user_name: string;
  user_role: string;
  profile_pic: string | null;
}
