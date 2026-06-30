import { CivicReport, DigitalTwinZone } from '../types';

export interface NeighborhoodStats {
  id: string;
  name: string;
  level: number;
  xp: number;
  xpForNextLevel: number;
  progressPercent: number;
  healthScores: {
    road: number;
    cleanliness: number;
    water: number;
    safety: number;
    overall: number;
  };
  activeIssues: number;
  resolvedIssues: number;
}

export interface UserReputation {
  trustScore: number; // 0 - 100
  accuracyScore: number; // 0 - 100
  impactScore: number; // 0 - 100
  citizensHelped: number;
  journeySummary: string;
  streaks: {
    daily: number;
    weekly: number;
    monthly: number;
    lastActive: number; // timestamp
  };
}

export interface CommunityMission {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  points: number;
  type: 'verify' | 'report' | 'health_boost' | 'xp_contrib';
  completed: boolean;
}

export interface HeroRecognition {
  id: string;
  title: string;
  description: string;
  personalizedReason: string;
  icon: string;
  category: 'road' | 'water' | 'cleanliness' | 'safety' | 'overall';
}

export interface NeighborhoodChallenge {
  id: string;
  title: string;
  metricName: string;
  leaders: {
    zoneName: string;
    value: string | number;
    rank: number;
  }[];
}

// Baseline XP and reports for zones
const BASELINE_ZONES_XP: Record<string, number> = {
  'zone_downtown': 2250,
  'zone_mission': 3780,
  'zone_sunset': 4900,
  'zone_soho': 1420
};

/**
 * Calculates neighborhood stats dynamically based on the current reports.
 * Connects the Digital Twin Map & Area Level-Up system.
 */
export function calculateNeighborhoodStats(reports: CivicReport[], initialZones: DigitalTwinZone[]): NeighborhoodStats[] {
  return initialZones.map((zone) => {
    const zoneReports = reports.filter((r) => r.location.areaName === zone.name || r.location.address?.includes(zone.name));
    
    const activeReports = zoneReports.filter((r) => r.status !== 'resolved' && r.status !== 'rejected');
    const resolvedReports = zoneReports.filter((r) => r.status === 'resolved');

    // Categorized unresolved issues
    const roadActive = activeReports.filter((r) => r.category === 'pothole' || r.category === 'road_damage');
    const cleanlinessActive = activeReports.filter((r) => r.category === 'garbage' || r.category === 'illegal_dumping');
    const waterActive = activeReports.filter((r) => r.category === 'water_leakage' || r.category === 'drainage');
    const safetyActive = activeReports.filter((r) => r.category === 'street_light' || r.category === 'safety_concern');

    // Calculate sub-health scores (base 100, subtract for active unresolved issues based on severity)
    const calcSubScore = (activeList: CivicReport[]) => {
      let score = 95; // default high-quality baseline
      activeList.forEach((r) => {
        if (r.severity === 'critical') score -= 15;
        else if (r.severity === 'high') score -= 10;
        else if (r.severity === 'medium') score -= 6;
        else score -= 3;
      });
      return Math.max(10, Math.min(100, score));
    };

    const roadScore = calcSubScore(roadActive);
    const cleanlinessScore = calcSubScore(cleanlinessActive);
    const waterScore = calcSubScore(waterActive);
    const safetyScore = calcSubScore(safetyActive);
    
    // Average overall health score
    const overallScore = Math.round((roadScore + cleanlinessScore + waterScore + safetyScore) / 4);

    // Dynamic XP calculation: Baseline + XP from activities
    let totalXp = BASELINE_ZONES_XP[zone.id] || 1000;
    
    // XP awarded dynamically from reports
    zoneReports.forEach((r) => {
      totalXp += 50; // report added
      totalXp += r.verifications.length * 20; // each validation
      if (r.status === 'resolved') {
        totalXp += 150; // issue solved
      }
    });

    // Level calculation (1000 XP per level)
    const level = Math.floor(totalXp / 1000) + 1;
    const xpInCurrentLevel = totalXp % 1000;
    const xpForNextLevel = 1000;
    const progressPercent = Math.round((xpInCurrentLevel / xpForNextLevel) * 100);

    return {
      id: zone.id,
      name: zone.name,
      level,
      xp: xpInCurrentLevel,
      xpForNextLevel,
      progressPercent,
      healthScores: {
        road: roadScore,
        cleanliness: cleanlinessScore,
        water: waterScore,
        safety: safetyScore,
        overall: overallScore
      },
      activeIssues: activeReports.length,
      resolvedIssues: resolvedReports.length
    };
  });
}

/**
 * Dynamic calculation of the user's gamification profiles, reputation scores, streaks, etc.
 */
export function getUserReputation(user: any, reports: CivicReport[]): UserReputation {
  const myReports = reports.filter(r => r.createdBy.uid === user.uid);
  const myVerifications = reports.filter(r => r.verifications.some(v => v.uid === user.uid));
  
  // Calculate Trust Score (starts at 75, max 100)
  let trustScore = 75;
  
  // High-trust actions
  const myVerifiedReports = myReports.filter(r => r.status === 'verified' || r.status === 'resolved');
  const myRejectedReports = myReports.filter(r => r.status === 'rejected');
  
  trustScore += myVerifiedReports.length * 3;
  trustScore += myVerifications.length * 1.5;
  trustScore -= myRejectedReports.length * 15; // penalty for rejected fake reports
  
  trustScore = Math.max(30, Math.min(100, Math.round(trustScore)));

  // Calculate Accuracy Score
  // Matching rate: if user verified a report and its final status matches their verification type
  let accuracyScore = 80; // baseline
  if (myVerifications.length > 0) {
    let matched = 0;
    myVerifications.forEach(r => {
      const userV = r.verifications.find(v => v.uid === user.uid);
      if (userV) {
        if (userV.type === 'verify' && (r.status === 'verified' || r.status === 'resolved' || r.status === 'in_progress')) {
          matched++;
        } else if (userV.type === 'dispute' && (r.status === 'rejected' || r.status === 'reported')) {
          matched++;
        }
      }
    });
    accuracyScore = Math.round((matched / myVerifications.length) * 100);
  }

  // Citizens Helped: reports resolved or highly voted protect the community.
  // Each upvote represents a resident supported. Each resolved issue helps ~500 residents.
  let citizensHelped = 0;
  myReports.forEach(r => {
    citizensHelped += (r.communityVotes?.upvotes || 0) * 15;
    if (r.status === 'resolved') {
      citizensHelped += 500;
    }
  });
  myVerifications.forEach(r => {
    citizensHelped += 10;
    if (r.status === 'resolved') {
      citizensHelped += 100; // peer helper multiplier
    }
  });

  // Default streaks from local storage or initialize
  const key = `streaks_${user.uid}`;
  const savedStreaks = localStorage.getItem(key);
  let streaks = savedStreaks ? JSON.parse(savedStreaks) : {
    daily: 4,
    weekly: 2,
    monthly: 1,
    lastActive: Date.now() - 4 * 3600 * 1000
  };

  // Check if active today
  const lastActiveDate = new Date(streaks.lastActive).toDateString();
  const todayDate = new Date().toDateString();
  if (lastActiveDate !== todayDate) {
    // Increment daily streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (lastActiveDate === yesterday.toDateString()) {
      streaks.daily += 1;
    } else {
      // Keep current/reset
      streaks.daily = 1;
    }
    streaks.lastActive = Date.now();
    localStorage.setItem(key, JSON.stringify(streaks));
  }

  // Calculate Impact Score (0 - 100)
  const impactScore = Math.max(10, Math.min(100, Math.round((user.points / 1200) * 100)));

  return {
    trustScore,
    accuracyScore,
    impactScore,
    citizensHelped: citizensHelped || 120, // default minimum for seed user
    journeySummary: "", // Will be filled dynamically by Gemini or local AI text
    streaks
  };
}

/**
 * Gets weekly missions for a user.
 */
export function getWeeklyMissions(user: any, reports: CivicReport[]): CommunityMission[] {
  const myVerifications = reports.filter(r => r.verifications.some(v => v.uid === user.uid));
  const myReports = reports.filter(r => r.createdBy.uid === user.uid);
  
  const key = `missions_${user.uid}`;
  const savedMissions = localStorage.getItem(key);
  if (savedMissions) {
    const missions: CommunityMission[] = JSON.parse(savedMissions);
    // Update progress dynamically
    return missions.map(m => {
      if (m.completed) return m;
      let progress = m.progress;
      if (m.type === 'verify') {
        progress = myVerifications.length % 5; // Simulates active progress toward 5
      } else if (m.type === 'report') {
        progress = myReports.length % 2; // Simulates active progress toward 2
      } else if (m.type === 'health_boost') {
        // Mock progress
        progress = 1; 
      } else if (m.type === 'xp_contrib') {
        progress = Math.min(m.target, user.points % m.target);
      }
      
      const completed = progress >= m.target;
      return { ...m, progress, completed };
    });
  }

  // Default mission list
  const defaultMissions: CommunityMission[] = [
    {
      id: 'm1',
      title: 'Local Sentinel',
      description: 'Conduct 5 peer verifications on active community complaints.',
      progress: Math.min(5, myVerifications.length % 5 || 2),
      target: 5,
      points: 100,
      type: 'verify',
      completed: false
    },
    {
      id: 'm2',
      title: 'Area Health Optimizer',
      description: 'Improve Gomti Nagar Sector overall health score by resolving 1 issue.',
      progress: 0,
      target: 1,
      points: 150,
      type: 'health_boost',
      completed: false
    },
    {
      id: 'm3',
      title: 'Hazard Hunter',
      description: 'Report 2 critical or high severity safety hazards.',
      progress: Math.min(2, myReports.filter(r => r.severity === 'high' || r.severity === 'critical').length % 2 || 1),
      target: 2,
      points: 120,
      type: 'report',
      completed: false
    },
    {
      id: 'm4',
      title: 'Community Uplifter',
      description: 'Contribute 200 Loyalty points to the civic pool.',
      progress: 140,
      target: 200,
      points: 180,
      type: 'xp_contrib',
      completed: false
    }
  ];

  localStorage.setItem(key, JSON.stringify(defaultMissions));
  return defaultMissions;
}

/**
 * AI Hero Recognition Monthly Titles list
 */
export function getHeroRecognitions(user: any, reports: CivicReport[]): HeroRecognition[] {
  const myReports = reports.filter(r => r.createdBy.uid === user.uid);
  
  const hasRoad = myReports.some(r => r.category === 'pothole' || r.category === 'road_damage');
  const hasWater = myReports.some(r => r.category === 'water_leakage' || r.category === 'drainage');
  const hasClean = myReports.some(r => r.category === 'garbage' || r.category === 'illegal_dumping');
  const hasSafety = myReports.some(r => r.category === 'street_light' || r.category === 'safety_concern');

  const recognitions: HeroRecognition[] = [];

  if (hasRoad || user.points > 500) {
    recognitions.push({
      id: 'rec_road',
      title: 'ROAD GUARDIAN',
      description: 'Automated Monthly AI Recognition Title for Outstanding Street Infrastructure Triage.',
      personalizedReason: `${user.displayName} has consistently reported pothole craters and road splits on Patrakar Puram Road, saving two-wheeler drivers from catastrophic accidents and driving immediate LMC contractor response.`,
      icon: 'shield',
      category: 'road'
    });
  }

  if (hasWater || user.points > 400) {
    recognitions.push({
      id: 'rec_water',
      title: 'WATER WARRIOR',
      description: 'AI Title for Hydrology Conservation and Clean Water Pipeline Security.',
      personalizedReason: `By logging major water geysers and ruptures in Aminabad, ${user.displayName} prevented an estimated waste of 45,000 liters of pure filtered municipal water and averted local crawl-way floods.`,
      icon: 'droplet',
      category: 'water'
    });
  }

  if (hasClean || user.points > 300) {
    recognitions.push({
      id: 'rec_clean',
      title: 'CLEANLINESS CHAMPION',
      description: 'AI Title for Anti-Waste Accumulation & Land Preservation Operations.',
      personalizedReason: `Cleared heavy toxic commercial illegal dumpings behind residential pockets, lowering pathogen multiplication indicators in Chowk and Rajajipuram Wards.`,
      icon: 'trash-2',
      category: 'cleanliness'
    });
  }

  if (hasSafety || user.points > 600) {
    recognitions.push({
      id: 'rec_safety',
      title: 'SAFETY SENTINEL',
      description: 'AI Title for Public Corridor Lighting & Security Upgrades.',
      personalizedReason: `Flagged unlit park pedestrian corners and live transformer wire hazards, contributing to a 24% reduction in predicted safety risk indexes.`,
      icon: 'shield-check',
      category: 'safety'
    });
  }

  // Always offer at least a baseline Civic Champion if points > 100
  if (recognitions.length === 0 || user.points > 200) {
    recognitions.push({
      id: 'rec_overall',
      title: 'CIVIC CHAMPION',
      description: 'Universal Elite Resident Coordinator Medal of Honour.',
      personalizedReason: `${user.displayName} has established themselves as a core anchor of Gomti Nagar Sector, maintaining a 96% peer triage verification score and actively coordinating local safety efforts.`,
      icon: 'award',
      category: 'overall'
    });
  }

  return recognitions;
}

/**
 * Custom Challenges list
 */
export function getNeighborhoodChallenges(stats: NeighborhoodStats[]): NeighborhoodChallenge[] {
  const sortedByClean = [...stats].sort((a,b) => b.healthScores.cleanliness - a.healthScores.cleanliness);
  const sortedBySafety = [...stats].sort((a,b) => b.healthScores.safety - a.healthScores.safety);
  const sortedByImproving = [...stats].sort((a,b) => b.resolvedIssues - a.resolvedIssues);
  const sortedByActive = [...stats].sort((a,b) => (b.level * 1000 + b.xp) - (a.level * 1000 + a.xp));

  return [
    {
      id: 'challenge_clean',
      title: '🌟 Cleanest Neighborhood Cup',
      metricName: 'Cleanliness Score',
      leaders: sortedByClean.map((s, idx) => ({ zoneName: s.name, value: `${s.healthScores.cleanliness}/100`, rank: idx + 1 }))
    },
    {
      id: 'challenge_safe',
      title: '🛡️ Shield of Public Safety',
      metricName: 'Safety Rating',
      leaders: sortedBySafety.map((s, idx) => ({ zoneName: s.name, value: `${s.healthScores.safety}/100`, rank: idx + 1 }))
    },
    {
      id: 'challenge_improve',
      title: '⚡ Fastest Improving Zone',
      metricName: 'Completed Fixes',
      leaders: sortedByImproving.map((s, idx) => ({ zoneName: s.name, value: `${s.resolvedIssues} Resolved`, rank: idx + 1 }))
    },
    {
      id: 'challenge_active',
      title: '🔥 Most Active Civic Ward',
      metricName: 'Ward Community XP',
      leaders: sortedByActive.map((s, idx) => ({ zoneName: s.name, value: `${s.level * 1000 + s.xp} XP`, rank: idx + 1 }))
    }
  ];
}
