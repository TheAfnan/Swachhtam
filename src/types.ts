/**
 * Shared Type Definitions for Swachhtam
 */

export interface CivicReport {
  id: string;
  title: string;
  description: string;
  category: 'pothole' | 'garbage' | 'water_leakage' | 'street_light' | 'drainage' | 'illegal_dumping' | 'road_damage' | 'safety_concern' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  urgencyScore: number; // 0 - 100
  status: 'reported' | 'verified' | 'in_progress' | 'resolved' | 'rejected';
  location: {
    lat: number;
    lng: number;
    address?: string;
    areaName?: string;
  };
  createdBy: {
    uid: string;
    displayName: string;
    email: string;
  };
  createdAt: number;
  updatedAt: number;
  department: string;
  resolutionRecommendations: string[];
  imageUrl: string; // Base64 or mock URL
  videoUrl?: string; // Optional Base64 or mock video URL
  resolvedImageUrl?: string; // Image uploaded on resolution
  resolvedAt?: number;
  resolutionImprovement?: number; // 0 - 100 calculated by AI
  resolutionSummary?: string;
  aiConfidenceScore?: number; // 0 - 100
  isEmergency: boolean;
  communityVotes: {
    upvotes: number;
    downvotes: number;
    userVotes: Record<string, 'up' | 'down'>;
  };
  schoolProximity?: boolean;
  hospitalProximity?: boolean;
  trafficImpact?: 'none' | 'low' | 'medium' | 'high';
  priorityScore: number; // calculated priority (0-100)
  authoritiesNotes?: string;
  internalNotes?: CivicInternalNote[];
  verifications: CivicVerification[];
  isDuplicateMerged?: boolean;
  mergedIntoReportId?: string;
}

export interface CivicInternalNote {
  id: string;
  text: string;
  author: string;
  createdAt: number;
}

export interface CivicVerification {
  uid: string;
  userName: string;
  type: 'verify' | 'dispute';
  comments: string;
  createdAt: number;
}

export interface PredictionHotspot {
  id: string;
  title: string;
  category: string;
  lat: number;
  lng: number;
  riskScore: number; // 1-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reasoning: string;
  confidence: number;
  predictedTimeline: string;
}

export interface DigitalTwinZone {
  id: string;
  name: string;
  healthScore: number; // 0 - 100
  activeIssuesCount: number;
  resolvedIssuesCount: number;
  riskMultiplier: number;
  primaryCategory: string;
  coordinates: { lat: number; lng: number }; // Center
  environmentalScore: number;
  infrastructureScore: number;
  safetyScore: number;
  predictions: string[];
}

export interface UserCivicProfile {
  uid: string;
  displayName: string;
  email: string;
  points: number;
  badges: CivicBadge[];
  reportsCreatedCount: number;
  verificationsCount: number;
  impactScore: number;
}

export interface CivicBadge {
  id: 'road_guardian' | 'water_warrior' | 'cleanliness_champion' | 'civic_leader';
  name: string;
  description: string;
  unlockedAt: number;
  icon: string;
}

export interface CivicChatHistoryItem {
  sender: 'user' | 'bot';
  text: string;
  timestamp: number;
  suggestedAction?: {
    type: 'view_report' | 'view_map' | 'report_issue';
    payload?: string;
  };
}

export interface CityConfig {
  id: string;
  name: string;
  state: string;
  country: string;
  active: boolean;
  createdAt: number;
}

export interface CategoryConfig {
  id: string;
  name: string;
  hindiName?: string;
  icon: string;
  slaHours: number;
  department: string;
  active: boolean;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  target: string;
  performedBy: string;
  timestamp: number;
}

