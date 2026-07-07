import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  disableNetwork,
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  setLogLevel
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  reload,
  sendPasswordResetEmail
} from 'firebase/auth';
import firebaseConfigJson from '../../firebase-applet-config.json';
import { CivicReport, UserCivicProfile, DigitalTwinZone, PredictionHotspot, CivicBadge, CivicVerification, CivicInternalNote } from '../types';

// Config overrides from environment or fallback to JSON
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfigJson.measurementId,
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export { app };

const databaseId = firebaseConfigJson.firestoreDatabaseId;
let dbInstance;
try {
  dbInstance = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
} catch (e) {
  console.warn("Could not retrieve Firestore with standard getFirestore, trying initializeFirestore", e);
  dbInstance = databaseId ? initializeFirestore(app, {}, databaseId) : initializeFirestore(app, {});
}

export const db = dbInstance;

// Silence internal Firestore warnings/errors in sandbox browser console
try {
  setLogLevel('silent');
} catch (e) {
  console.warn("Could not set Firestore log level to silent:", e);
}

let isFirestoreNetworkDisabled = false;

export const handleFirestoreError = async (error: any) => {
  console.warn("Firestore Operation Encountered Failure:", error);
  if (!isFirestoreNetworkDisabled && db) {
    try {
      isFirestoreNetworkDisabled = true;
      console.log("Automatically disabling Firestore network layer to operate reliably in local-first sandbox mode...");
      await disableNetwork(db);
      console.log("Firestore network layer successfully put offline.");
    } catch (e) {
      console.error("Failed to cleanly transition Firestore to offline mode:", e);
    }
  }
};
export const auth = getAuth(app);

// Graceful offline local fallback in case of firewall / iframe constraints
const LOCAL_STORAGE_KEY_REPORTS = 'civic_reports_local';
const LOCAL_STORAGE_KEY_USER = 'civic_user_local';
const LOCAL_STORAGE_KEY_DIGITAL_TWINS = 'civic_digital_twins_local';
const LOCAL_STORAGE_KEY_PREDICTIONS = 'civic_predictions_local';

// Sample coordinates centered around Lucknow, India
const CENTER_LAT = 26.8467;
const CENTER_LNG = 80.9462;

export const INITIAL_ZONES: DigitalTwinZone[] = [
  {
    id: 'zone_downtown',
    name: 'Hazratganj Heritage Precinct',
    healthScore: 58,
    activeIssuesCount: 4,
    resolvedIssuesCount: 15,
    riskMultiplier: 1.4,
    primaryCategory: 'waste',
    coordinates: { lat: 26.8467, lng: 80.9462 },
    environmentalScore: 45,
    infrastructureScore: 62,
    safetyScore: 67,
    predictions: ['Commercial garbage accumulation in side lanes post-weekends near Hazratganj commercial hubs.', 'Predictive streetlight outages due to overhead line deterioration near Hazratganj.']
  },
  {
    id: 'zone_mission',
    name: 'Gomti Nagar Sector',
    healthScore: 71,
    activeIssuesCount: 6,
    resolvedIssuesCount: 28,
    riskMultiplier: 1.1,
    primaryCategory: 'road_damage',
    coordinates: { lat: 26.8500, lng: 80.9700 },
    environmentalScore: 68,
    infrastructureScore: 71,
    safetyScore: 74,
    predictions: ['Thermal asphalt cracking on Gomti Nagar arterial lanes during high summer heat.', 'Potential road cavitation near age-old water utility pipes in Gomti Nagar.']
  },
  {
    id: 'zone_sunset',
    name: 'Chowk Heritage Enclave',
    healthScore: 88,
    activeIssuesCount: 2,
    resolvedIssuesCount: 42,
    riskMultiplier: 0.8,
    primaryCategory: 'street_light',
    coordinates: { lat: 26.8680, lng: 80.9000 },
    environmentalScore: 92,
    infrastructureScore: 84,
    safetyScore: 88,
    predictions: ['Monsoon rain lens fogging on historical Chowk-side street lighting.', 'Paving debris encroachment over pedestrian pathways in Chowk bazaar.']
  },
  {
    id: 'zone_soho',
    name: 'Rajajipuram Enclave',
    healthScore: 42,
    activeIssuesCount: 7,
    resolvedIssuesCount: 12,
    riskMultiplier: 1.7,
    primaryCategory: 'illegal_dumping',
    coordinates: { lat: 26.8370, lng: 80.8810 },
    environmentalScore: 31,
    infrastructureScore: 45,
    safetyScore: 50,
    predictions: ['Unlawful trash dumping near Rajajipuram residential blocks.', 'Standing drain water pooling due to clogged stormwater culverts near the local drainage canal.']
  }
];

export const INITIAL_PREDICTIONS: PredictionHotspot[] = [
  {
    id: 'pred_1',
    title: 'High Risk Thermal Pothole Formation',
    category: 'pothole',
    lat: 26.8480,
    lng: 80.9480,
    riskScore: 89,
    riskLevel: 'critical',
    reasoning: 'Heavy axle count city transport bus route combined with dynamic temperature fatigue. High water table nearby Hazratganj contributes to asphalt substrate softening.',
    confidence: 94,
    predictedTimeline: 'In next 14-21 days'
  },
  {
    id: 'pred_2',
    title: 'Recurrent Illegal Waste Aggregation Zone',
    category: 'illegal_dumping',
    lat: 26.8520,
    lng: 80.9720,
    riskScore: 74,
    riskLevel: 'high',
    reasoning: 'Under-lit commercial storage frontage near Gomti Nagar weekly market space. Consistent weekend night activity patterns.',
    confidence: 81,
    predictedTimeline: 'High probability on forthcoming Sunday night'
  },
  {
    id: 'pred_3',
    title: 'Corroded Subsurface Water Main Vulnerability',
    category: 'water_leakage',
    lat: 26.8690,
    lng: 80.9020,
    riskScore: 82,
    riskLevel: 'high',
    reasoning: 'High-pressure trunk line installed decades ago. Smart moisture sensors show abnormal high ground humidity, indicating water leaks around the old Chowk distribution line.',
    confidence: 88,
    predictedTimeline: 'In next 30 days'
  },
  {
    id: 'pred_4',
    title: 'Streetlight Cable Fault Isolation Area',
    category: 'street_light',
    lat: 26.8380,
    lng: 80.8830,
    riskScore: 54,
    riskLevel: 'medium',
    reasoning: 'Frequent circuit overcurrent trips recorded during high rain periods. Rajajipuram pole wiring nearing end-of-use phase.',
    confidence: 76,
    predictedTimeline: 'Next heavy monsoon downpour'
  }
];

export const INITIAL_REPORTS: CivicReport[] = [
  {
    id: 'rep_1',
    title: 'Massive Crater Pothole on Gomti Nagar Bypass',
    description: 'A deep, 10-inch pothole that occupies half of the oncoming lane near Mithai Chauraha. Vehicles are forced to veer into oncoming traffic to avoid it. Multiple two-wheeler riders have lost balance here.',
    category: 'pothole',
    severity: 'high',
    urgencyScore: 85,
    status: 'verified',
    location: {
      lat: 26.8510,
      lng: 80.9710,
      address: 'Mithai Chauraha Road, Gomti Nagar, Lucknow, Uttar Pradesh 226010',
      areaName: 'Gomti Nagar Sector'
    },
    createdBy: {
      uid: 'user_aarav_sharma',
      displayName: 'Mohd Afnan (Citizen)',
      email: 'afnan@civic.org.in'
    },
    createdAt: Date.now() - 3 * 24 * 3600 * 1000,
    updatedAt: Date.now() - 2 * 24 * 3600 * 1000,
    department: 'LMC (Lucknow Municipal Corporation) - Road Infrastructure Division',
    resolutionRecommendations: [
      'Immediate asphalt sub-grade dry compaction filling.',
      'Full repaving of a 10m lane segment to prevent structural edge cracking.',
      'Improve structural storm drain grading to prevent chronic rain-water pooling.'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?q=80&w=600&auto=format&fit=crop',
    aiConfidenceScore: 98,
    isEmergency: false,
    communityVotes: {
      upvotes: 42,
      downvotes: 1,
      userVotes: { 'user_aarav_sharma': 'up', 'demo_user_1': 'up' }
    },
    schoolProximity: true,
    hospitalProximity: false,
    trafficImpact: 'high',
    priorityScore: 78,
    verifications: [
      {
        uid: 'demo_user_1',
        userName: 'Officer Robert',
        type: 'verify',
        comments: 'Verified on-site. Highly hazardous during peak hours and evening monsoon showers when water fills the hole, completely masking its depth.',
        createdAt: Date.now() - 2 * 24 * 3600 * 1000
      }
    ]
  },
  {
    id: 'rep_2',
    title: 'Live Sparks & Exposed Cables near Hazratganj Crossing',
    description: 'Electricity transformer junction pole structure heavily chipped near Hazratganj Multi-Level Parking. Live wire is sparking when swinging in wind near the busy pedestrian crossing.',
    category: 'street_light',
    severity: 'critical',
    urgencyScore: 98,
    status: 'in_progress',
    location: {
      lat: 26.8465,
      lng: 80.9460,
      address: 'Hazratganj Multi-Level Parking Area, Lucknow, Uttar Pradesh 226001',
      areaName: 'Hazratganj Heritage Precinct'
    },
    createdBy: {
      uid: 'user_ananya_iyer',
      displayName: 'Ananya Iyer',
      email: 'ananya.i@gmail.com'
    },
    createdAt: Date.now() - 4 * 3600 * 1000,
    updatedAt: Date.now() - 2 * 3600 * 1000,
    department: 'LESA (Lucknow Electricity Supply Administration) - Grid Maintenance Division',
    resolutionRecommendations: [
      'De-energize the damaged grid circuit immediately!',
      'Replace structural framing and safely tuck/insulate high voltage core connection grounds.',
      'Re-anchor external weatherproof shield panel.'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=600&auto=format&fit=crop',
    aiConfidenceScore: 99,
    isEmergency: true,
    communityVotes: {
      upvotes: 89,
      downvotes: 0,
      userVotes: { 'user_aarav_sharma': 'up' }
    },
    schoolProximity: false,
    hospitalProximity: true,
    trafficImpact: 'high',
    priorityScore: 95,
    verifications: [
      {
        uid: 'demo_authority_1',
        userName: 'Asst. Commissioner Pandey',
        type: 'verify',
        comments: 'Critical electrical safety hazard. LESA grid isolation requested. Emergency field crew dispatched.',
        createdAt: Date.now() - 3 * 3600 * 1000
      }
    ]
  },
  {
    id: 'rep_3',
    title: 'Dangerous E-waste Dumping in Vacant Rajajipuram Lot',
    description: 'Bulk electronic scrap, batteries, and unidentified commercial containers dumped overnight in the open vacant plot near Rajajipuram Stadium. Pungent odor and hazardous chemical leakage to the soil.',
    category: 'illegal_dumping',
    severity: 'critical',
    urgencyScore: 91,
    status: 'reported',
    location: {
      lat: 26.8365,
      lng: 80.8805,
      address: 'F-Block Road, near Rajajipuram Sector Office, Lucknow, Uttar Pradesh 226017',
      areaName: 'Rajajipuram Enclave'
    },
    createdBy: {
      uid: 'user_vikram_malhotra',
      displayName: 'Vikram Malhotra',
      email: 'vikram.m@gmail.com'
    },
    createdAt: Date.now() - 12 * 3600 * 1000,
    updatedAt: Date.now() - 12 * 3600 * 1000,
    department: 'LMC Solid Waste Management Division & Pollution Control Board',
    resolutionRecommendations: [
      'Deploy specialized scientific toxic waste clearance teams.',
      'Safely extract contaminated topsoil to preserve biological safety.',
      'Deploy CCTV surveillance cameras around the corner to intercept dynamic serial night-dumpers.'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?q=80&w=600&auto=format&fit=crop',
    aiConfidenceScore: 95,
    isEmergency: true,
    communityVotes: {
      upvotes: 56,
      downvotes: 1,
      userVotes: {}
    },
    schoolProximity: true,
    hospitalProximity: false,
    trafficImpact: 'medium',
    priorityScore: 89,
    verifications: []
  },
  {
    id: 'rep_4',
    title: 'Ruptured Clean Water Trunk Main Flooding Chowk Chauraha',
    description: 'Clean drinking water is erupting like a geyser out of the pavement surface joint near Chowk. Millions of liters of clean water leaking onto the road, creating immediate waterlogging.',
    category: 'water_leakage',
    severity: 'high',
    urgencyScore: 88,
    status: 'resolved',
    location: {
      lat: 26.8675,
      lng: 80.8995,
      address: 'Chowk Crossing, near Phool Mandi, Lucknow, Uttar Pradesh 226003',
      areaName: 'Chowk Heritage Enclave'
    },
    createdBy: {
      uid: 'user_aarav_sharma',
      displayName: 'Mohd Afnan',
      email: 'afnan@civic.org.in'
    },
    createdAt: Date.now() - 10 * 24 * 3600 * 1000,
    updatedAt: Date.now() - 8 * 24 * 3600 * 1000,
    department: 'Lucknow Jal Sansthan - Hydraulic Infrastructure Division',
    resolutionRecommendations: [
      'Isolate the sub-sector trunk main shut-off gate valves.',
      'Excavate damaged concrete and pipe connection sector.',
      'Replace the fractured cast-iron distribution line.'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=600&auto=format&fit=crop',
    resolvedImageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=600&auto=format&fit=crop',
    resolvedAt: Date.now() - 8 * 24 * 3600 * 1000,
    resolutionImprovement: 97,
    resolutionSummary: 'Trunk main valve bypass and section replacement accomplished. Water pressure returned to nominal distribution safety thresholds, and road resurfaced.',
    aiConfidenceScore: 92,
    isEmergency: false,
    communityVotes: {
      upvotes: 114,
      downvotes: 0,
      userVotes: {}
    },
    schoolProximity: false,
    hospitalProximity: false,
    trafficImpact: 'high',
    priorityScore: 82,
    verifications: [
      {
        uid: 'demo_user_1',
        userName: 'Inspector P. Pandey',
        type: 'verify',
        comments: 'Fully resolved. Water leakage has entirely ceased. Pavement has been securely filled and asphalt has dried.',
        createdAt: Date.now() - 8 * 24 * 3600 * 1000
      }
    ]
  }
];

export const INITIAL_USERS: UserCivicProfile[] = [
  {
    uid: 'user_aarav_sharma',
    displayName: 'Mohd Afnan',
    email: 'afnan@civic.org.in',
    points: 840,
    badges: [
      { id: 'road_guardian', name: 'Road Guardian', description: 'Reported and verified 5+ road-related infrastructure hazards successfully', unlockedAt: Date.now() - 10 * 24 * 3600 * 1000, icon: 'shield' },
      { id: 'civic_leader', name: 'Civic Leader', description: 'Assigned to the level of elite community contributor with outstanding trust index', unlockedAt: Date.now() - 2 * 24 * 3600 * 1000, icon: 'award' }
    ],
    reportsCreatedCount: 12,
    verificationsCount: 22,
    impactScore: 94
  },
  {
    uid: 'user_ananya_iyer',
    displayName: 'Ananya Iyer',
    email: 'ananya.i@gmail.com',
    points: 420,
    badges: [
      { id: 'cleanliness_champion', name: 'Cleanliness Champion', description: 'Reported community health risks or dumping zones', unlockedAt: Date.now() - 15 * 24 * 3600 * 1000, icon: 'trash-2' }
    ],
    reportsCreatedCount: 5,
    verificationsCount: 11,
    impactScore: 68
  },
  {
    uid: 'user_vikram_malhotra',
    displayName: 'Vikram Malhotra',
    email: 'vikram.m@gmail.com',
    points: 290,
    badges: [
      { id: 'water_warrior', name: 'Water Warrior', description: 'Reported leaking fire hydrants or clean-water ruptures', unlockedAt: Date.now() - 5 * 24 * 3600 * 1000, icon: 'droplet' }
    ],
    reportsCreatedCount: 3,
    verificationsCount: 8,
    impactScore: 52
  }
];

// Initialize Local Storage with Seed Data if not present
const seedLocalStorage = () => {
  // Gracefully wipe out any old San Francisco or Bangalore data or old users cached in active sessions
  const oldDataStr = localStorage.getItem(LOCAL_STORAGE_KEY_REPORTS) || '';
  const oldUserStr = localStorage.getItem(LOCAL_STORAGE_KEY_USER) || '';
  if (
    oldDataStr.includes('San Francisco') || 
    oldDataStr.includes('Jane Doe') || 
    oldDataStr.includes('Mission St') ||
    oldDataStr.includes('Bengaluru') ||
    oldDataStr.includes('Bangalore') ||
    oldDataStr.includes('Indiranagar') ||
    oldDataStr.includes('Koramangala') ||
    oldDataStr.includes('Jayanagar') ||
    oldDataStr.includes('12.97') ||
    oldUserStr.includes('aarav@civic.org.in') ||
    oldUserStr.includes('Aarav Sharma')
  ) {
    localStorage.removeItem(LOCAL_STORAGE_KEY_REPORTS);
    localStorage.removeItem(LOCAL_STORAGE_KEY_DIGITAL_TWINS);
    localStorage.removeItem(LOCAL_STORAGE_KEY_PREDICTIONS);
    localStorage.removeItem(LOCAL_STORAGE_KEY_USER);
  }
  
  if (!localStorage.getItem(LOCAL_STORAGE_KEY_REPORTS)) {
    localStorage.setItem(LOCAL_STORAGE_KEY_REPORTS, JSON.stringify(INITIAL_REPORTS));
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEY_DIGITAL_TWINS)) {
    localStorage.setItem(LOCAL_STORAGE_KEY_DIGITAL_TWINS, JSON.stringify(INITIAL_ZONES));
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEY_PREDICTIONS)) {
    localStorage.setItem(LOCAL_STORAGE_KEY_PREDICTIONS, JSON.stringify(INITIAL_PREDICTIONS));
  }
};
seedLocalStorage();

// Auth state wrapper that handles standard auth with email,
// but supports "Virtual/Demo logins" flawlessly for rapid testing in isolated context.
export interface CurrentUser {
  uid: string;
  displayName: string;
  email: string;
  role: 'citizen' | 'authority' | 'admin';
  points: number;
  badges: CivicBadge[];
  impactScore: number;
  emailVerified?: boolean;
}

// Global state for logged-in user simulation
let demoUser: CurrentUser | null = {
  uid: 'user_aarav_sharma',
  displayName: 'Mohd Afnan',
  email: 'afnan@civic.org.in',
  role: 'citizen',
  points: 840,
  badges: [
    { id: 'road_guardian', name: 'Road Guardian', description: 'Reported and verified 5+ road-related infrastructure hazards successfully', unlockedAt: Date.now() - 10 * 24 * 3600 * 1000, icon: 'shield' },
    { id: 'civic_leader', name: 'Civic Leader', description: 'Assigned to the level of elite community contributor with outstanding trust index', unlockedAt: Date.now() - 2 * 24 * 3600 * 1000, icon: 'award' }
  ],
  impactScore: 94,
  emailVerified: true
};

const authCallbacks: ((user: CurrentUser | null) => void)[] = [];

// Subscribe to standard onAuthStateChanged to sync profiles automatically
onAuthStateChanged(auth, async (firebaseUser) => {
  if (firebaseUser) {
    const isVerified = firebaseUser.emailVerified;

    let profile: CurrentUser | null = null;
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.uid === firebaseUser.uid) {
          profile = parsed;
          profile.emailVerified = isVerified;
          // Auto-repair cached role if parsed incorrectly in previous versions
          const emailLower = (firebaseUser.email || '').toLowerCase();
          if (emailLower === 'citizen@swachhtam.demo') {
            profile.role = 'citizen';
          } else if (emailLower === 'authority@swachhtam.demo') {
            profile.role = 'authority';
          } else if (emailLower === 'admin@swachhtam.demo') {
            profile.role = 'admin';
          }
        }
      }
    } catch (_) {}

    if (!profile) {
      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const emailLower = (firebaseUser.email || '').toLowerCase();
          const isAdminEmail = emailLower === 'admin@swachhtam.demo' || emailLower.startsWith('admin@');
          const isEmailAuthority = !isAdminEmail && (emailLower.endsWith('.gov') || emailLower === 'authority@swachhtam.demo');
          const dataRoleLower = (data.role || '').toLowerCase();
          const finalRole = (dataRoleLower === 'admin' || isAdminEmail) 
            ? 'admin' 
            : (isEmailAuthority || dataRoleLower === 'authority') ? 'authority' : 'citizen';
          
          profile = {
            uid: firebaseUser.uid,
            displayName: data.fullName || data.displayName || firebaseUser.displayName || 'Contributor',
            email: firebaseUser.email || '',
            role: finalRole,
            points: data.points ?? 100,
            badges: data.badges ?? [],
            impactScore: data.impactScore ?? 50,
            emailVerified: isVerified
          };
          
          if (isEmailAuthority && data.role !== 'Authority') {
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), { role: 'Authority' }, { merge: true });
            } catch (err) {
              console.warn("Could not auto-repair Firestore role:", err);
            }
          }
        } else {
          profile = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Contributor',
            email: firebaseUser.email || '',
            role: (firebaseUser.email?.endsWith('.gov') || firebaseUser.email?.toLowerCase() === 'authority@swachhtam.demo') ? 'authority' : (firebaseUser.email?.toLowerCase() === 'admin@swachhtam.demo' || firebaseUser.email?.toLowerCase().startsWith('admin@')) ? 'admin' : 'citizen',
            points: 100,
            badges: [],
            impactScore: 50,
            emailVerified: isVerified
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), {
            uid: firebaseUser.uid,
            fullName: profile.displayName,
            email: profile.email,
            createdAt: new Date().toISOString(),
            language: 'en',
            role: profile.role === 'authority' ? 'Authority' : 'Citizen',
            trustScore: 100,
            points: 0
          });
        }
      } catch (err) {
        profile = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || 'Contributor',
          email: firebaseUser.email || '',
          role: (firebaseUser.email?.endsWith('.gov') || firebaseUser.email?.toLowerCase() === 'authority@swachhtam.demo') ? 'authority' : (firebaseUser.email?.toLowerCase() === 'admin@swachhtam.demo' || firebaseUser.email?.toLowerCase().startsWith('admin@')) ? 'admin' : 'citizen',
          points: 100,
          badges: [],
          impactScore: 50,
          emailVerified: isVerified
        };
      }
    } else {
      profile.emailVerified = isVerified;
    }

    demoUser = profile;
    localStorage.setItem(LOCAL_STORAGE_KEY_USER, JSON.stringify(profile));
    authCallbacks.forEach(cb => cb(profile));
  } else {
    demoUser = null;
    localStorage.removeItem(LOCAL_STORAGE_KEY_USER);
    authCallbacks.forEach(cb => cb(null));
  }
});

export const loginWithEmail = async (email: string, password: string, rememberMe: boolean = true): Promise<CurrentUser> => {
  await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const firebaseUser = userCredential.user;

  // Check if the email is verified (bypass for demo/gov accounts)
  const isDemoOrGov = firebaseUser.email?.endsWith('.demo') || firebaseUser.email?.endsWith('.gov');
  if (!firebaseUser.emailVerified && !isDemoOrGov) {
    await signOut(auth);
    const err = new Error('Your email has not been verified yet.') as any;
    err.code = 'auth/email-not-verified';
    throw err;
  }

  let profile: CurrentUser;
  try {
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      const emailLower = (email || '').toLowerCase();
      const isAdminEmail = emailLower === 'admin@swachhtam.demo' || emailLower.startsWith('admin@');
      const isEmailAuthority = !isAdminEmail && (emailLower.endsWith('.gov') || emailLower === 'authority@swachhtam.demo');
      const dataRoleLower = (data.role || '').toLowerCase();
      const finalRole = (dataRoleLower === 'admin' || isAdminEmail) 
        ? 'admin' 
        : (isEmailAuthority || dataRoleLower === 'authority') ? 'authority' : 'citizen';
      
      profile = {
        uid: firebaseUser.uid,
        displayName: data.fullName || data.displayName || firebaseUser.displayName || 'Contributor',
        email: email,
        role: finalRole,
        points: data.points ?? 100,
        badges: data.badges ?? [],
        impactScore: data.impactScore ?? 50,
        emailVerified: true
      };
      
      if (isEmailAuthority && data.role !== 'Authority') {
        try {
          await setDoc(doc(db, 'users', firebaseUser.uid), { role: 'Authority' }, { merge: true });
        } catch (err) {
          console.warn("Could not auto-repair Firestore role in login:", err);
        }
      } else if (isAdminEmail && data.role !== 'Admin') {
        try {
          await setDoc(doc(db, 'users', firebaseUser.uid), { role: 'Admin' }, { merge: true });
        } catch (err) {
          console.warn("Could not auto-repair Firestore admin role in login:", err);
        }
      }
    } else {
      const emailLower = (email || '').toLowerCase();
      const isAdminEmail = emailLower === 'admin@swachhtam.demo' || emailLower.startsWith('admin@');
      const isEmailAuthority = !isAdminEmail && (emailLower.endsWith('.gov') || emailLower === 'authority@swachhtam.demo');
      const matchingSeed = INITIAL_USERS.find(u => u.email === email);
      profile = {
        uid: firebaseUser.uid,
        displayName: matchingSeed ? matchingSeed.displayName : (firebaseUser.displayName || 'Contributor'),
        email: email,
        role: isAdminEmail ? 'admin' : isEmailAuthority ? 'authority' : 'citizen',
        points: matchingSeed ? matchingSeed.points : 100,
        badges: matchingSeed ? matchingSeed.badges : [],
        impactScore: matchingSeed ? matchingSeed.impactScore : 50,
        emailVerified: true
      };
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        uid: firebaseUser.uid,
        fullName: profile.displayName,
        email: email,
        createdAt: new Date().toISOString(),
        language: 'en',
        role: profile.role === 'admin' ? 'Admin' : profile.role === 'authority' ? 'Authority' : 'Citizen',
        trustScore: 100,
        points: profile.points
      });
    }
  } catch (err) {
    console.warn("Could not retrieve user profile, using local fallback:", err);
    const emailLower = (email || '').toLowerCase();
    const isAdminEmail = emailLower === 'admin@swachhtam.demo' || emailLower.startsWith('admin@');
    const isEmailAuthority = !isAdminEmail && (emailLower.endsWith('.gov') || emailLower === 'authority@swachhtam.demo');
    const matchingSeed = INITIAL_USERS.find(u => u.email === email);
    profile = {
      uid: firebaseUser.uid,
      displayName: matchingSeed ? matchingSeed.displayName : (firebaseUser.displayName || 'Contributor'),
      email: email,
      role: isAdminEmail ? 'admin' : isEmailAuthority ? 'authority' : 'citizen',
      points: matchingSeed ? matchingSeed.points : 100,
      badges: matchingSeed ? matchingSeed.badges : [],
      impactScore: matchingSeed ? matchingSeed.impactScore : 50,
      emailVerified: true
    };
  }

  demoUser = profile;
  localStorage.setItem(LOCAL_STORAGE_KEY_USER, JSON.stringify(profile));
  authCallbacks.forEach(cb => cb(profile));
  return profile;
};

export const registerWithEmail = async (email: string, password: string, displayName: string, role: 'citizen' | 'authority' | 'admin'): Promise<CurrentUser & { emailVerified?: boolean }> => {
  console.log(`[FirebaseAuth Audit] [1/5] Starting registerWithEmail. Instance verification:`, {
    authExists: !!auth,
    currentUserBefore: auth?.currentUser?.uid || 'none'
  });

  if (!auth) {
    throw new Error("[FirebaseAuth Audit] Firebase Auth instance is not initialized or is invalid.");
  }

  // 1. Create user account
  let userCredential;
  try {
    console.log(`[FirebaseAuth Audit] [2/5] Creating user with email and password...`);
    userCredential = await createUserWithEmailAndPassword(auth, email, password);
  } catch (createErr: any) {
    console.error(`[FirebaseAuth Audit] Account creation failed: Code: ${createErr.code}, Message: ${createErr.message}`, createErr);
    throw createErr;
  }

  const firebaseUser = userCredential.user;
  if (!firebaseUser) {
    throw new Error("[FirebaseAuth Audit] createUserWithEmailAndPassword resolved successfully, but user object is missing.");
  }

  console.log(`[FirebaseAuth Audit] [3/5] User created. UID: ${firebaseUser.uid}. Verifying active session:`, {
    currentUserAfter: auth.currentUser?.uid || 'none',
    matchesCredentialUser: auth.currentUser?.uid === firebaseUser.uid
  });

  // 2. Select the valid target for sendEmailVerification
  // Use auth.currentUser if available, otherwise fall back to userCredential.user
  const verificationTarget = auth.currentUser || firebaseUser;
  console.log(`[FirebaseAuth Audit] [4/5] Preparing to send verification email. Selection:`, {
    targetUid: verificationTarget.uid,
    targetEmail: verificationTarget.email,
    isCurrentUserUsed: verificationTarget === auth.currentUser
  });

  // 3. Immediately call sendEmailVerification and await it sequentially (no detached async background task or race conditions)
  try {
    console.log(`[FirebaseAuth Audit] Calling sendEmailVerification() now...`);
    await sendEmailVerification(verificationTarget);
    console.log(`[FirebaseAuth Audit] sendEmailVerification() completed successfully. Promise resolved successfully!`);
  } catch (verifyErr: any) {
    console.error(`[FirebaseAuth Audit] sendEmailVerification() FAILED! Code: ${verifyErr.code || 'unknown'}, Message: ${verifyErr.message}`, verifyErr);
    
    // Clean up half-registered auth state so that user doesn't get blocked by "email-already-in-use" on subsequent attempts
    try {
      console.log(`[FirebaseAuth Audit] Cleanup: Attempting to delete auth user ${firebaseUser.uid} to allow clean retry...`);
      await firebaseUser.delete();
      console.log(`[FirebaseAuth Audit] Cleanup successful. Auth user deleted.`);
    } catch (cleanupErr: any) {
      console.error(`[FirebaseAuth Audit] Cleanup failed to delete auth user:`, cleanupErr);
    }

    // Do NOT suppress error. Propagate exact Firebase error
    const customErr = new Error(`Verification email failed: ${verifyErr.message} (Code: ${verifyErr.code || 'unknown'})`) as any;
    customErr.code = verifyErr.code;
    throw customErr;
  }

  // 4. Create Firestore document (Only executes if verification call succeeds)
  const profile: CurrentUser = {
    uid: firebaseUser.uid,
    displayName: displayName || 'Contributor',
    email: email,
    role: role,
    points: 0,
    badges: [],
    impactScore: 50,
    emailVerified: false
  };

  const firestoreUserDoc = {
    uid: firebaseUser.uid,
    fullName: displayName || 'Contributor',
    email: email,
    createdAt: new Date().toISOString(),
    language: 'en',
    role: role === 'admin' ? 'Admin' : role === 'authority' ? 'Authority' : 'Citizen',
    trustScore: 100,
    points: 0,
    profilePhoto: ''
  };

  try {
    console.log(`[FirebaseAuth Audit] [5/5] Writing user document to Firestore...`);
    await setDoc(doc(db, 'users', firebaseUser.uid), firestoreUserDoc);
    console.log(`[FirebaseAuth Audit] Firestore document written successfully.`);
  } catch (firestoreErr: any) {
    console.error(`[FirebaseAuth Audit] Failed to save Firestore document during registration:`, firestoreErr);
    // Note: User can still sign in and create this document on login, so we log but don't delete auth if firestore fails
  }

  demoUser = profile;
  localStorage.setItem(LOCAL_STORAGE_KEY_USER, JSON.stringify(profile));
  authCallbacks.forEach(cb => cb(profile));
  return profile;
};

export const resendVerificationEmail = async (email: string, password: string): Promise<void> => {
  console.log(`[FirebaseAuth Audit] resendVerificationEmail triggered for ${email}`);
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const firebaseUser = userCredential.user;
  
  if (!firebaseUser) {
    throw new Error("[FirebaseAuth Audit] Sign in returned null user during resend verification.");
  }

  const verificationTarget = auth.currentUser || firebaseUser;
  console.log(`[FirebaseAuth Audit] Sending verification email to: ${verificationTarget.email}`);
  
  try {
    await sendEmailVerification(verificationTarget);
    console.log("[FirebaseAuth Audit] Resend verification email completed successfully.");
  } catch (err: any) {
    console.error("[FirebaseAuth Audit] Resend verification email failed:", err);
    await signOut(auth);
    throw err;
  }
  
  await signOut(auth);
};

export const resendVerificationForCurrentUser = async (): Promise<void> => {
  console.log("[FirebaseAuth Audit] resendVerificationForCurrentUser triggered.");
  if (auth.currentUser) {
    const user = auth.currentUser;
    console.log(`[FirebaseAuth Audit] Sending verification email for current user: ${user.email}`);
    try {
      await sendEmailVerification(user);
      console.log("[FirebaseAuth Audit] Resend verification for current user completed successfully.");
    } catch (err: any) {
      console.error("[FirebaseAuth Audit] Resend verification for current user failed:", err);
      throw err;
    }
  } else {
    console.error("[FirebaseAuth Audit] Resend failed: No authenticated user session found.");
    throw new Error('No authenticated user session found.');
  }
};

export const sendTestVerificationEmail = async (): Promise<string> => {
  console.log("[FirebaseAuth Audit] sendTestVerificationEmail manual trigger requested.");
  if (!auth.currentUser) {
    console.error("[FirebaseAuth Audit] Manual test trigger failed: No authenticated user session found.");
    throw new Error('No authenticated user session found.');
  }

  const user = auth.currentUser;
  console.log(`[FirebaseAuth Audit] Active manual test details:`, {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    isAnonymous: user.isAnonymous
  });

  try {
    console.log("[FirebaseAuth Audit] Invoking sendEmailVerification()...");
    await sendEmailVerification(user);
    console.log("[FirebaseAuth Audit] Manual test sendEmailVerification() completed successfully. Promise resolved successfully!");
    return `Test verification email sent successfully to ${user.email} at ${new Date().toLocaleTimeString()}!`;
  } catch (err: any) {
    console.error("[FirebaseAuth Audit] Manual test sendEmailVerification() FAILED!", err);
    throw new Error(`Test email failed: ${err.message} (Code: ${err.code || 'unknown'})`);
  }
};

export const checkVerificationStatus = async (): Promise<boolean> => {
  if (auth.currentUser) {
    await reload(auth.currentUser);
    const isVerified = auth.currentUser.emailVerified;
    if (isVerified) {
      let profile = getCurrentUser();
      if (profile) {
        profile.emailVerified = true;
        demoUser = profile;
        localStorage.setItem(LOCAL_STORAGE_KEY_USER, JSON.stringify(profile));
        authCallbacks.forEach(cb => cb(profile));
      }
    }
    return isVerified;
  }
  return false;
};

export const resetPassword = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email);
};

export const loginWithGoogle = async (): Promise<CurrentUser> => {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  const firebaseUser = userCredential.user;

  let profile: CurrentUser;
  try {
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      const emailLower = (firebaseUser.email || '').toLowerCase();
      const isEmailAuthority = emailLower.endsWith('.gov') || emailLower.endsWith('.demo');
      const dataRoleLower = (data.role || '').toLowerCase();
      const finalRole = (dataRoleLower === 'admin') 
        ? 'admin' 
        : (isEmailAuthority || dataRoleLower === 'authority') ? 'authority' : 'citizen';
      
      profile = {
        uid: firebaseUser.uid,
        displayName: data.fullName || data.displayName || firebaseUser.displayName || 'Contributor',
        email: firebaseUser.email || '',
        role: finalRole,
        points: data.points ?? 0,
        badges: data.badges ?? [],
        impactScore: data.impactScore ?? 50,
        emailVerified: true
      };
      
      if (isEmailAuthority && data.role !== 'Authority') {
        try {
          await setDoc(doc(db, 'users', firebaseUser.uid), { role: 'Authority' }, { merge: true });
        } catch (err) {
          console.warn("Could not auto-repair Firestore role in google login:", err);
        }
      }
    } else {
      const emailLower = (firebaseUser.email || '').toLowerCase();
      const isEmailAuthority = emailLower.endsWith('.gov') || emailLower.endsWith('.demo');
      profile = {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName || 'Contributor',
        email: firebaseUser.email || '',
        role: isEmailAuthority ? 'authority' : 'citizen',
        points: 0,
        badges: [],
        impactScore: 50,
        emailVerified: true
      };
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        uid: firebaseUser.uid,
        fullName: profile.displayName,
        email: profile.email,
        createdAt: new Date().toISOString(),
        language: 'en',
        role: profile.role === 'authority' ? 'Authority' : 'Citizen',
        trustScore: 100,
        points: 0,
        profilePhoto: firebaseUser.photoURL || ''
      });
    }
  } catch (err) {
    console.warn("Could not retrieve user profile, using local fallback:", err);
    const emailLower = (firebaseUser.email || '').toLowerCase();
    const isEmailAuthority = emailLower.endsWith('.gov') || emailLower.endsWith('.demo');
    profile = {
      uid: firebaseUser.uid,
      displayName: firebaseUser.displayName || 'Contributor',
      email: firebaseUser.email || '',
      role: isEmailAuthority ? 'authority' : 'citizen',
      points: 0,
      badges: [],
      impactScore: 50,
      emailVerified: true
    };
  }

  demoUser = profile;
  localStorage.setItem(LOCAL_STORAGE_KEY_USER, JSON.stringify(profile));
  authCallbacks.forEach(cb => cb(profile));
  return profile;
};

export const simulateLogin = async (email: string, role: 'citizen' | 'authority' | 'admin', displayName?: string): Promise<CurrentUser> => {
  try {
    return await loginWithEmail(email, 'password123');
  } catch (err: any) {
    if (
      err.code === 'auth/user-not-found' || 
      err.code === 'auth/invalid-credential' || 
      err.code === 'auth/user-disabled' ||
      err.message?.includes('user-not-found') || 
      err.message?.includes('INVALID_LOGIN_CREDENTIALS') ||
      err.message?.includes('invalid-credential')
    ) {
      try {
        const name = displayName || (role === 'authority' ? 'Supervisor Vance' : 'Mohd Afnan');
        const prof = await registerWithEmail(email, 'password123', name, role);
        prof.emailVerified = true;
        demoUser = prof;
        localStorage.setItem(LOCAL_STORAGE_KEY_USER, JSON.stringify(prof));
        authCallbacks.forEach(cb => cb(prof));
        return prof;
      } catch (regErr) {
        console.warn("Could not register demo user in Firebase Auth, falling back to offline", regErr);
      }
    }

    const matchingSeed = INITIAL_USERS.find(u => u.email === email);
    demoUser = {
      uid: matchingSeed ? matchingSeed.uid : 'demo_' + Math.random().toString(36).slice(2, 9),
      displayName: displayName || (role === 'authority' ? 'Supervisor Vance' : (matchingSeed ? matchingSeed.displayName : 'Guest Citizen')),
      email: email,
      role: role,
      points: matchingSeed ? matchingSeed.points : 100,
      badges: matchingSeed ? matchingSeed.badges : [],
      impactScore: matchingSeed ? matchingSeed.impactScore : 50,
      emailVerified: true
    };
    localStorage.setItem(LOCAL_STORAGE_KEY_USER, JSON.stringify(demoUser));
    authCallbacks.forEach(cb => cb(demoUser));
    return demoUser;
  }
};

export const simulateLogout = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn("SignOut from Firebase Auth failed:", e);
  }
  demoUser = null;
  localStorage.removeItem(LOCAL_STORAGE_KEY_USER);
  authCallbacks.forEach(cb => cb(null));
};

export const getCurrentUser = (): CurrentUser | null => {
  if (demoUser) return demoUser;
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY_USER);
  if (saved) {
    demoUser = JSON.parse(saved);
  }
  return demoUser;
};

export const subscribeToAuth = (cb: (user: CurrentUser | null) => void) => {
  authCallbacks.push(cb);
  cb(getCurrentUser());
  return () => {
    const idx = authCallbacks.indexOf(cb);
    if (idx !== -1) authCallbacks.splice(idx, 1);
  };
};

/* Helper to race an operation with a timeout */
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Firebase operation timed out')), timeoutMs)
    )
  ]);
};

/* Database Queries with Sync Fallback */
export const getReportsLocal = (): CivicReport[] => {
  seedLocalStorage();
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY_REPORTS);
  return raw ? JSON.parse(raw) : [];
};

export const saveReportsLocal = (reports: CivicReport[]) => {
  localStorage.setItem(LOCAL_STORAGE_KEY_REPORTS, JSON.stringify(reports));
};

// Seed Firestore DB under async flow so we do not block standard UI,
// but keep Firestore in full state-sync with mock lists.
export const syncToFirestore = async () => {
  try {
    const reportsCollection = collection(db, 'reports');
    // Using a fast 1500ms timeout check to gracefully handle environments where the firestore backend is unreachable
    const existingDocs = await withTimeout(getDocs(reportsCollection), 1500);
    if (existingDocs.empty) {
      console.log("Seeding Firestore DB reports collection...");
      for (const r of INITIAL_REPORTS) {
        await setDoc(doc(db, 'reports', r.id), r);
      }
    }
  } catch (err) {
    console.warn("Firestore syncing skipped or offline (common in isolated contexts)", err);
    await handleFirestoreError(err);
  }
};
syncToFirestore().catch(e => console.warn("Background Firestore database sync skipped gracefully:", e));

// High level data manipulation helpers
export const fetchReports = async (): Promise<CivicReport[]> => {
  try {
    const reportsCollection = collection(db, 'reports');
    // Faster timeout check to prevent blocking if firestore under corporate proxy/isolated environments is unreachable
    const snap = await withTimeout(getDocs(reportsCollection), 1500);
    if (!snap.empty) {
      const localReports = getReportsLocal();
      const dbReports: CivicReport[] = [];
      
      snap.forEach(doc => {
        const dbRep = doc.data() as CivicReport;
        const localRep = localReports.find(l => l.id === dbRep.id);
        // If local version has a newer updatedAt, preserve the local version
        if (localRep && (localRep.updatedAt || 0) > (dbRep.updatedAt || 0)) {
          dbReports.push(localRep);
        } else {
          dbReports.push(dbRep);
        }
      });

      // Also preserve any local reports that are not present in Firestore
      localReports.forEach(localRep => {
        if (!dbReports.some(d => d.id === localRep.id)) {
          dbReports.push(localRep);
        }
      });

      // Synchronize back to local so UI stays updated instantly
      saveReportsLocal(dbReports);
      return dbReports;
    }
  } catch (e) {
    console.warn("Firestore fetch query failed, returning synced local data:", e);
    await handleFirestoreError(e);
  }
  return getReportsLocal();
};

export const createReport = async (report: Omit<CivicReport, 'id' | 'createdAt' | 'updatedAt' | 'communityVotes' | 'verifications' | 'priorityScore'>): Promise<CivicReport> => {
  const newReport: CivicReport = {
    ...report,
    id: 'rep_' + Math.random().toString(36).slice(2, 9),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    communityVotes: {
      upvotes: 0,
      downvotes: 0,
      userVotes: {}
    },
    verifications: [],
    priorityScore: calculatePriorityScore({
      severity: report.severity,
      schoolProximity: report.schoolProximity,
      hospitalProximity: report.hospitalProximity,
      trafficImpact: report.trafficImpact || 'none',
      isEmergency: report.isEmergency,
      upvotes: 0
    })
  };

  // 1. Write to local storage
  const reports = getReportsLocal();
  reports.unshift(newReport);
  saveReportsLocal(reports);

  // 2. Write to Firestore asynchronously
  try {
    await setDoc(doc(db, 'reports', newReport.id), newReport);
  } catch (e) {
    console.warn("Could not save to active Firestore. Kept local.", e);
    await handleFirestoreError(e);
  }

  // Award user points
  const user = getCurrentUser();
  if (user && user.uid === report.createdBy.uid) {
    user.points += 50;
    // Check badging
    if (user.points >= 500 && !user.badges.some(b => b.id === 'road_guardian')) {
      user.badges.push({
        id: 'road_guardian',
        name: 'Road Guardian',
        description: 'Earned 500+ Community points from elite submissions',
        unlockedAt: Date.now(),
        icon: 'shield'
      });
    }
    localStorage.setItem(LOCAL_STORAGE_KEY_USER, JSON.stringify(user));
    authCallbacks.forEach(cb => cb(user));
  }

  return newReport;
};

// Priority Engine logic
export function calculatePriorityScore(data: {
  severity: CivicReport['severity'];
  schoolProximity?: boolean;
  hospitalProximity?: boolean;
  trafficImpact: CivicReport['trafficImpact'];
  isEmergency: boolean;
  upvotes: number;
}): number {
  let score = 20; // baseline

  // Severity Weight
  if (data.severity === 'critical') score += 35;
  else if (data.severity === 'high') score += 25;
  else if (data.severity === 'medium') score += 15;

  // Proximity multipliers
  if (data.schoolProximity) score += 10;
  if (data.hospitalProximity) score += 12;

  // Traffic impact
  if (data.trafficImpact === 'high') score += 15;
  else if (data.trafficImpact === 'medium') score += 10;
  else if (data.trafficImpact === 'low') score += 5;

  // Emergency
  if (data.isEmergency) score += 15;

  // Community votes influence
  score += Math.min(data.upvotes * 0.2, 10);

  return Math.min(Math.round(score), 100);
}

export const submitVerification = async (reportId: string, verification: CivicVerification): Promise<CivicReport | null> => {
  const reports = getReportsLocal();
  const reportIndex = reports.findIndex(r => r.id === reportId);
  if (reportIndex === -1) return null;

  const r = reports[reportIndex];
  // Remove prior verification by same user if any
  r.verifications = r.verifications.filter(v => v.uid !== verification.uid);
  r.verifications.push(verification);

  // Adjust trust status based on verify ratio
  const verifiedCount = r.verifications.filter(v => v.type === 'verify').length;
  const disputeCount = r.verifications.filter(v => v.type === 'dispute').length;

  if (r.status === 'reported' && verifiedCount >= 2 && verifiedCount > disputeCount) {
    r.status = 'verified';
  } else if (r.status === 'verified' && disputeCount >= 3 && disputeCount > verifiedCount) {
    r.status = 'reported'; // demote
  }

  r.priorityScore = calculatePriorityScore({
    severity: r.severity,
    schoolProximity: r.schoolProximity,
    hospitalProximity: r.hospitalProximity,
    trafficImpact: r.trafficImpact || 'none',
    isEmergency: r.isEmergency,
    upvotes: r.communityVotes.upvotes + (verification.type === 'verify' ? 3 : -2)
  });

  reports[reportIndex] = r;
  saveReportsLocal(reports);

  try {
    await updateDoc(doc(db, 'reports', reportId), {
      verifications: r.verifications,
      status: r.status,
      priorityScore: r.priorityScore
    });
  } catch (e) {
    console.warn("Firestore update verification skipped.", e);
    await handleFirestoreError(e);
  }

  // Award verify points
  const user = getCurrentUser();
  if (user && user.uid === verification.uid) {
    user.points += 20;
    localStorage.setItem(LOCAL_STORAGE_KEY_USER, JSON.stringify(user));
    authCallbacks.forEach(cb => cb(user));
  }

  return r;
};

export const submitVote = async (reportId: string, userId: string, voteType: 'up' | 'down'): Promise<CivicReport | null> => {
  const reports = getReportsLocal();
  const reportIndex = reports.findIndex(r => r.id === reportId);
  if (reportIndex === -1) return null;

  const r = reports[reportIndex];
  const previousVote = r.communityVotes.userVotes[userId];

  if (previousVote === voteType) {
    // Revoke vote
    delete r.communityVotes.userVotes[userId];
    if (voteType === 'up') r.communityVotes.upvotes--;
    else r.communityVotes.downvotes--;
  } else {
    // Apply new or flip vote
    if (previousVote) {
      if (previousVote === 'up') r.communityVotes.upvotes--;
      else r.communityVotes.downvotes--;
    }
    r.communityVotes.userVotes[userId] = voteType;
    if (voteType === 'up') r.communityVotes.upvotes++;
    else r.communityVotes.downvotes++;
  }

  r.priorityScore = calculatePriorityScore({
    severity: r.severity,
    schoolProximity: r.schoolProximity,
    hospitalProximity: r.hospitalProximity,
    trafficImpact: r.trafficImpact || 'none',
    isEmergency: r.isEmergency,
    upvotes: r.communityVotes.upvotes
  });

  reports[reportIndex] = r;
  saveReportsLocal(reports);

  try {
    await updateDoc(doc(db, 'reports', reportId), {
      communityVotes: r.communityVotes,
      priorityScore: r.priorityScore
    });
  } catch (e) {
    console.warn("Firestore update votes skipped.", e);
    await handleFirestoreError(e);
  }

  return r;
};

export const updateReportStatusByAuthority = async (reportId: string, status: CivicReport['status'], notes?: string): Promise<CivicReport | null> => {
  const reports = getReportsLocal();
  const reportIndex = reports.findIndex(r => r.id === reportId);
  if (reportIndex === -1) return null;

  const r = reports[reportIndex];
  r.status = status;
  if (notes) {
    r.authoritiesNotes = notes;
  }
  if (status === 'resolved') {
    r.resolvedAt = Date.now();
  }
  r.updatedAt = Date.now();

  reports[reportIndex] = r;
  saveReportsLocal(reports);

  try {
    await updateDoc(doc(db, 'reports', reportId), {
      status: r.status,
      authoritiesNotes: r.authoritiesNotes,
      resolvedAt: r.resolvedAt || null,
      updatedAt: r.updatedAt
    });
  } catch (e) {
    console.warn("Firestore update status failed.", e);
    await handleFirestoreError(e);
  }
  return r;
};

export const addInternalNoteToReport = async (reportId: string, noteText: string, authorName: string): Promise<CivicReport | null> => {
  const reports = getReportsLocal();
  const reportIndex = reports.findIndex(r => r.id === reportId);
  if (reportIndex === -1) return null;

  const r = reports[reportIndex];
  if (!r.internalNotes) {
    r.internalNotes = [];
  }

  const newNote: CivicInternalNote = {
    id: 'note_' + Math.random().toString(36).substring(2, 9),
    text: noteText,
    author: authorName,
    createdAt: Date.now()
  };

  r.internalNotes.push(newNote);
  r.updatedAt = Date.now();

  reports[reportIndex] = r;
  saveReportsLocal(reports);

  try {
    await updateDoc(doc(db, 'reports', reportId), {
      internalNotes: r.internalNotes,
      updatedAt: r.updatedAt
    });
  } catch (e) {
    console.warn("Firestore update internalNotes failed.", e);
    await handleFirestoreError(e);
  }
  return r;
};

export const submitResolutionLocal = async (reportId: string, payload: {
  resolvedImageUrl: string;
  resolutionImprovement: number;
  resolutionSummary: string;
}): Promise<CivicReport | null> => {
  const reports = getReportsLocal();
  const idx = reports.findIndex(r => r.id === reportId);
  if (idx === -1) return null;

  const r = reports[idx];
  r.status = 'resolved';
  r.resolvedImageUrl = payload.resolvedImageUrl;
  r.resolutionImprovement = payload.resolutionImprovement;
  r.resolutionSummary = payload.resolutionSummary;
  r.resolvedAt = Date.now();
  r.updatedAt = Date.now();

  reports[idx] = r;
  saveReportsLocal(reports);

  try {
    await updateDoc(doc(db, 'reports', reportId), {
      status: 'resolved',
      resolvedImageUrl: r.resolvedImageUrl,
      resolutionImprovement: r.resolutionImprovement,
      resolutionSummary: r.resolutionSummary,
      resolvedAt: r.resolvedAt,
      updatedAt: r.updatedAt
    });
  } catch (e) {
    console.warn("Firestore resolution upload failed.", e);
    await handleFirestoreError(e);
  }

  return r;
};

export const getDigitalTwins = (): DigitalTwinZone[] => {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY_DIGITAL_TWINS);
  return raw ? JSON.parse(raw) : INITIAL_ZONES;
};

export const getPredictions = (): PredictionHotspot[] => {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY_PREDICTIONS);
  return raw ? JSON.parse(raw) : INITIAL_PREDICTIONS;
};
