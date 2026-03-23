export interface Location {
  id: string;
  name: string;
  timezone: string;
}

export interface UserSkill {
  id: string;
  skill: string;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  skills: UserSkill[];
}

export interface ShiftAssignment {
  id: string;
  userId: string;
  shiftId: string;
  assignedAt: string;
  user: StaffUser;
}

export interface Shift {
  id: string;
  locationId: string;
  location: Location;
  requiredSkill: string;
  headcount: number;
  startTime: string;
  endTime: string;
  isOvernight: boolean;
  published: boolean;
  publishedAt: string | null;
  weekOf: string;
  assignments: ShiftAssignment[];
}

export interface Violation {
  rule: string;
  message: string;
  severity: 'BLOCK' | 'WARN';
}

export interface Suggestion {
  userId: string;
  name: string;
  reason: string;
}

export interface ConstraintResult {
  allowed: boolean;
  violations: Violation[];
  suggestions: Suggestion[];
  projectedWeeklyHours?: number;
}

export interface SwapRequest {
  id: string;
  type: 'SWAP' | 'DROP';
  status: 'PENDING' | 'ACCEPTED' | 'MANAGER_REVIEW' | 'APPROVED' | 'CANCELLED' | 'EXPIRED';
  requesterId: string;
  targetUserId: string | null;
  shiftId: string;
  expiresAt: string;
  createdAt: string;
  requester: { id: string; name: string; email: string };
  targetUser: { id: string; name: string; email: string } | null;
  shift: Shift & { location: Location };
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}
