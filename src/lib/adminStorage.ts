import { CityConfig, CategoryConfig, AdminAuditLog } from '../types';
import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const LOCAL_STORAGE_KEY_CITIES = 'civic_admin_cities';
const LOCAL_STORAGE_KEY_CATEGORIES = 'civic_admin_categories';
const LOCAL_STORAGE_KEY_AUDIT_LOGS = 'civic_admin_audit_logs';
const LOCAL_STORAGE_KEY_USERS = 'civic_admin_users';

export const DEFAULT_CITIES: CityConfig[] = [
  { id: 'lucknow', name: 'Lucknow', state: 'Uttar Pradesh', country: 'India', active: true, createdAt: Date.now() - 365 * 24 * 3600 * 1000 },
  { id: 'bengaluru', name: 'Bengaluru', state: 'Karnataka', country: 'India', active: true, createdAt: Date.now() - 200 * 24 * 3600 * 1000 },
  { id: 'delhi', name: 'New Delhi', state: 'Delhi NCR', country: 'India', active: false, createdAt: Date.now() - 50 * 24 * 3600 * 1000 }
];

export const DEFAULT_CATEGORIES: CategoryConfig[] = [
  { id: 'pothole', name: 'Pothole', hindiName: 'सड़क का गड्ढा', icon: 'Hammer', slaHours: 48, department: 'Lucknow Municipal Corporation (LMC) - Road Division', active: true },
  { id: 'garbage', name: 'Garbage Pile', hindiName: 'कचरे का ढेर', icon: 'Trash2', slaHours: 24, department: 'Lucknow Municipal Corporation (LMC) - Waste Management', active: true },
  { id: 'water_leakage', name: 'Water Pipeline Leakage', hindiName: 'पानी के पाइप का रिसाव', icon: 'Droplet', slaHours: 36, department: 'Lucknow Jal Sansthan', active: true },
  { id: 'street_light', name: 'Streetlight Malfunction', hindiName: 'स्ट्रीट लाइट की खराबी', icon: 'Lightbulb', slaHours: 48, department: 'LESA - Grid Maintenance', active: true },
  { id: 'drainage', name: 'Clogged Sewer / Drainage', hindiName: 'रुकी हुई नाली / सीवर', icon: 'Activity', slaHours: 72, department: 'Lucknow Jal Sansthan', active: true },
  { id: 'illegal_dumping', name: 'Illegal Garbage Dumping', hindiName: 'अवैध कचरा डंपिंग', icon: 'AlertTriangle', slaHours: 24, department: 'LMC - Sanitary Inspector', active: true },
  { id: 'road_damage', name: 'Road Surface Damage', hindiName: 'सड़क की सतह का नुकसान', icon: 'Construction', slaHours: 96, department: 'LMC - Civil Works Division', active: true },
  { id: 'safety_concern', name: 'Public Safety Concern', hindiName: 'जन सुरक्षा संबंधी चिंता', icon: 'ShieldAlert', slaHours: 12, department: 'Lucknow Police & Municipal Ward Vigilance', active: true },
  { id: 'other', name: 'Other Infrastructure Issue', hindiName: 'अन्य समस्या', icon: 'HelpCircle', slaHours: 48, department: 'LMC - General Administration', active: true }
];

export interface AdminUser {
  uid: string;
  displayName: string;
  email: string;
  role: 'citizen' | 'authority' | 'admin';
  points: number;
  impactScore: number;
  joinedAt: number;
}

export const DEFAULT_USERS: AdminUser[] = [
  { uid: 'user_aarav_sharma', displayName: 'Mohd Afnan', email: 'afnan@civic.org.in', role: 'citizen', points: 840, impactScore: 94, joinedAt: Date.now() - 120 * 24 * 3600 * 1000 },
  { uid: 'supervisor_vance', displayName: 'Supervisor Vance', email: 'authority@swachhtam.demo', role: 'authority', points: 200, impactScore: 85, joinedAt: Date.now() - 90 * 24 * 3600 * 1000 },
  { uid: 'user_ananya_iyer', displayName: 'Ananya Iyer', email: 'ananya.i@gmail.com', role: 'citizen', points: 420, impactScore: 68, joinedAt: Date.now() - 45 * 24 * 3600 * 1000 },
  { uid: 'user_vikram_malhotra', displayName: 'Vikram Malhotra', email: 'vikram.m@gmail.com', role: 'citizen', points: 290, impactScore: 52, joinedAt: Date.now() - 30 * 24 * 3600 * 1000 },
  { uid: 'admin_officer', displayName: 'Municipal Admin', email: 'admin@swachhtam.demo', role: 'admin', points: 1500, impactScore: 100, joinedAt: Date.now() - 250 * 24 * 3600 * 1000 }
];

// Load Cities
export const getCities = (): CityConfig[] => {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY_CITIES);
  if (!saved) {
    localStorage.setItem(LOCAL_STORAGE_KEY_CITIES, JSON.stringify(DEFAULT_CITIES));
    return DEFAULT_CITIES;
  }
  return JSON.parse(saved);
};

// Save Cities
export const saveCities = (cities: CityConfig[]): void => {
  localStorage.setItem(LOCAL_STORAGE_KEY_CITIES, JSON.stringify(cities));
};

// Load Categories
export const getCategories = (): CategoryConfig[] => {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY_CATEGORIES);
  if (!saved) {
    localStorage.setItem(LOCAL_STORAGE_KEY_CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
    return DEFAULT_CATEGORIES;
  }
  return JSON.parse(saved);
};

// Save Categories
export const saveCategories = (categories: CategoryConfig[]): void => {
  localStorage.setItem(LOCAL_STORAGE_KEY_CATEGORIES, JSON.stringify(categories));
};

// Load Users
export const getAdminUsers = (): AdminUser[] => {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY_USERS);
  if (!saved) {
    localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }
  return JSON.parse(saved);
};

// Save Users
export const saveAdminUsers = (users: AdminUser[]): void => {
  localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify(users));
};

// Update User Role (Local + Firebase if online)
export const updateUserRole = async (uid: string, newRole: 'citizen' | 'authority' | 'admin', performedBy: string): Promise<void> => {
  // Update LocalStorage list
  const users = getAdminUsers();
  const updated = users.map(u => u.uid === uid ? { ...u, role: newRole } : u);
  saveAdminUsers(updated);

  // If the user being updated is the CURRENT logged-in user, sync their active local user profile as well
  const currentSaved = localStorage.getItem('civic_user_local');
  if (currentSaved) {
    const parsed = JSON.parse(currentSaved);
    if (parsed && parsed.uid === uid) {
      parsed.role = newRole;
      localStorage.setItem('civic_user_local', JSON.stringify(parsed));
    }
  }

  // Update in Firestore (Best Effort)
  try {
    const userRef = doc(db, 'users', uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      await updateDoc(userRef, { role: newRole });
    } else {
      await setDoc(userRef, { role: newRole }, { merge: true });
    }
    console.log(`[Admin] Role updated for ${uid} in Firestore to ${newRole}`);
  } catch (err) {
    console.warn(`[Admin] Could not sync user role update to Firestore for ${uid}:`, err);
  }

  // Log Audit
  const targetUser = users.find(u => u.uid === uid);
  const targetLabel = targetUser ? `${targetUser.displayName} (${targetUser.email})` : uid;
  addAuditLog(`Role changed to ${newRole}`, targetLabel, performedBy);
};

// Load Audit Logs
export const getAuditLogs = (): AdminAuditLog[] => {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY_AUDIT_LOGS);
  if (!saved) {
    const initialLogs: AdminAuditLog[] = [
      { id: 'log_1', action: 'System Setup', target: 'Default Cities & Categories initialized', performedBy: 'System', timestamp: Date.now() - 5 * 24 * 3600 * 1000 },
      { id: 'log_2', action: 'Role Promotion', target: 'authority@swachhtam.demo changed to Authority', performedBy: 'admin@swachhtam.demo', timestamp: Date.now() - 3 * 24 * 3600 * 1000 }
    ];
    localStorage.setItem(LOCAL_STORAGE_KEY_AUDIT_LOGS, JSON.stringify(initialLogs));
    return initialLogs;
  }
  return JSON.parse(saved);
};

// Add Audit Log
export const addAuditLog = (action: string, target: string, performedBy: string): void => {
  const logs = getAuditLogs();
  const newLog: AdminAuditLog = {
    id: 'log_' + Math.random().toString(36).slice(2, 9),
    action,
    target,
    performedBy,
    timestamp: Date.now()
  };
  logs.unshift(newLog);
  localStorage.setItem(LOCAL_STORAGE_KEY_AUDIT_LOGS, JSON.stringify(logs));
};
