import { Timestamp } from 'firebase/firestore';

export type UserRole = 'student' | 'club_admin' | 'admin';
export type MembershipRole = 'member' | 'volunteer' | 'core' | 'head';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: UserRole;
  createdAt: Timestamp;
}

export interface Club {
  id: string;
  name: string;
  description: string;
  category: string;
  logo: string;
  coverImage: string;
  adminUid: string;
  socialLinks?: {
    instagram?: string;
    linkedin?: string;
    website?: string;
  };
  createdAt: Timestamp;
}

export interface ClubEvent {
  id: string;
  clubId: string;
  clubName: string;
  title: string;
  description: string;
  date: Timestamp;
  location: string;
  image?: string;
  createdAt: Timestamp;
}

export interface Membership {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  clubId: string;
  clubName: string;
  status: 'pending' | 'active';
  role: MembershipRole;
  joinedAt: Timestamp;
}

export interface Attendance {
  id: string;
  userId: string;
  eventId: string;
  clubId: string;
  status: 'present' | 'absent';
  markedAt: Timestamp;
}

export interface Volunteering {
  id: string;
  userId: string;
  eventId: string;
  clubId: string;
  role: string;
  hours: number;
  description: string;
  createdAt: Timestamp;
}

export interface PerformanceMetric {
  id: string;
  userId: string;
  clubId: string;
  score: number;
  attendanceRate: number;
  eventsParticipated: number;
  volunteerHours: number;
  updatedAt: Timestamp;
}

export interface Certification {
  id: string;
  userId: string;
  clubId: string;
  eligible: boolean;
  issuedAt?: Timestamp;
  criteriaMet: {
    attendance: boolean;
    participation: boolean;
    volunteering: boolean;
  };
}
