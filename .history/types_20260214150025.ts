
export enum UserRole {
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN'
}

export enum ReportStatus {
  OPEN = 'OPEN',
  IN_REVIEW = 'IN_REVIEW',
  RESOLVED = 'RESOLVED'
}

export enum ReportType {
  SECURITY = 'SECURITY',
  MAINTENANCE = 'MAINTENANCE'
}

export interface Report {
  id: string;
  type: ReportType;
  category: string;
  description: string;
  location: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: ReportStatus;
  createdAt: string;
  userId: string;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  category: 'SECURITY' | 'MAINTENANCE' | 'EMERGENCY' | 'ACADEMIC';
  sourceType: 'PDF' | 'DOC' | 'TEXT';
  lastUpdated: string;
  status: 'EMBEDDED' | 'PENDING';
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  universityId: string;
  bio?: string;
  isActive?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}
