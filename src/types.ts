import { Timestamp } from 'firebase/firestore';

export type UserRole = 'student' | 'club_admin' | 'admin';

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
  clubId: string;
  status: 'pending' | 'active';
  joinedAt: Timestamp;
}
