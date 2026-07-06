import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Users, 
  Globe, 
  Sliders, 
  Clock, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Search, 
  Filter, 
  Sparkles, 
  ShieldAlert, 
  CheckCircle,
  HelpCircle,
  Hammer,
  Trash,
  Droplet,
  Lightbulb,
  Activity,
  AlertTriangle,
  Construction,
  Shield,
  MapPin,
  ChevronRight,
  Info
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { 
  getCities, 
  saveCities, 
  getCategories, 
  saveCategories, 
  getAdminUsers, 
  saveAdminUsers, 
  updateUserRole, 
  getAuditLogs, 
  addAuditLog,
  AdminUser
} from '../lib/adminStorage';
import { CityConfig, CategoryConfig } from '../types';
import { useLanguage } from '../lib/LanguageContext';

interface AdminDashboardViewProps {
  user: any;
  onRefreshData?: () => void;
  onNavigateTab?: (tab: string) => void;
}

// Utility to render Lucide icons dynamically
const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  const IconComponent = (Icons as any)[name] || HelpCircle;
  return <IconComponent className={className} />;
};

export default function AdminDashboardView({ user, onRefreshData, onNavigateTab }: AdminDashboardViewProps) {
  const { language, t, speakText } = useLanguage();
  
  // Dashboard Tabs
  const [activeTab, setActiveTab] = useState<'cities' | 'users' | 'categories' | 'logs'>('cities');
  
  // Storage states
  const [cities, setCitiesList] = useState<CityConfig[]>([]);
  const [categories, setCategoriesList] = useState<CategoryConfig[]>([]);
  const [users, setUsersList] = useState<AdminUser[]>([]);
  const [logs, setLogsList] = useState<any[]>([]);

  // Search/Filters
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [citySearch, setCitySearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  // Creation/Edit Forms states
  const [showAddCity, setShowAddCity] = useState(false);
  const [newCity, setNewCity] = useState({ id: '', name: '', state: '', country: 'India' });
  const [editingCityId, setEditingCityId] = useState<string | null>(null);
  const [editCityData, setEditCityData] = useState({ name: '', state: '', country: 'India' });

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({
    id: '',
    name: '',
    hindiName: '',
    icon: 'Sliders',
    slaHours: 48,
    department: ''
  });
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatData, setEditCatData] = useState({
    name: '',
    hindiName: '',
    icon: 'Sliders',
    slaHours: 48,
    department: ''
  });

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load active data
  const loadData = () => {
    setCitiesList(getCities());
    setCategoriesList(getCategories());
    setUsersList(getAdminUsers());
    setLogsList(getAuditLogs());
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    speakText(message);
    setTimeout(() => setFeedback(null), 4000);
  };

  // CITIES OPERATIONS
  const handleAddCity = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newCity.id.trim().toLowerCase();
    if (!cleanId || !newCity.name.trim() || !newCity.state.trim()) {
      triggerFeedback('error', 'Please fill all fields for the city.');
      return;
    }

    if (cities.some(c => c.id === cleanId)) {
      triggerFeedback('error', `City with ID "${cleanId}" already exists.`);
      return;
    }

    const added: CityConfig = {
      id: cleanId,
      name: newCity.name.trim(),
      state: newCity.state.trim(),
      country: newCity.country.trim(),
      active: true,
      createdAt: Date.now()
    };

    const updated = [...cities, added];
    setCitiesList(updated);
    saveCities(updated);
    
    addAuditLog('Created City', `Added new city "${added.name}" (ID: ${added.id})`, user?.email || 'Admin');
    setNewCity({ id: '', name: '', state: '', country: 'India' });
    setShowAddCity(false);
    setLogsList(getAuditLogs());
    triggerFeedback('success', `City "${added.name}" added successfully.`);
    if (onRefreshData) onRefreshData();
  };

  const handleToggleCity = (id: string) => {
    const updated = cities.map(c => {
      if (c.id === id) {
        const nextState = !c.active;
        addAuditLog('Toggle City Status', `${c.name} active status set to ${nextState}`, user?.email || 'Admin');
        return { ...c, active: nextState };
      }
      return c;
    });
    setCitiesList(updated);
    saveCities(updated);
    setLogsList(getAuditLogs());
    triggerFeedback('success', 'City status updated.');
    if (onRefreshData) onRefreshData();
  };

  const handleDeleteCity = (id: string) => {
    if (id === 'lucknow' || id === 'bengaluru') {
      triggerFeedback('error', 'Default primary cities cannot be removed.');
      return;
    }

    const target = cities.find(c => c.id === id);
    const updated = cities.filter(c => c.id !== id);
    setCitiesList(updated);
    saveCities(updated);
    addAuditLog('Deleted City', `Removed city "${target?.name || id}"`, user?.email || 'Admin');
    setLogsList(getAuditLogs());
    triggerFeedback('success', 'City removed successfully.');
    if (onRefreshData) onRefreshData();
  };

  const startEditCity = (city: CityConfig) => {
    setEditingCityId(city.id);
    setEditCityData({ name: city.name, state: city.state, country: city.country });
  };

  const handleSaveCityEdit = (id: string) => {
    if (!editCityData.name.trim() || !editCityData.state.trim()) {
      triggerFeedback('error', 'All fields are required.');
      return;
    }
    const updated = cities.map(c => {
      if (c.id === id) {
        addAuditLog('Updated City Details', `Edited "${c.name}" -> "${editCityData.name}"`, user?.email || 'Admin');
        return { ...c, name: editCityData.name.trim(), state: editCityData.state.trim(), country: editCityData.country.trim() };
      }
      return c;
    });
    setCitiesList(updated);
    saveCities(updated);
    setEditingCityId(null);
    setLogsList(getAuditLogs());
    triggerFeedback('success', 'City updated.');
    if (onRefreshData) onRefreshData();
  };

  // CATEGORIES OPERATIONS
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newCategory.id.trim().toLowerCase().replace(/\s+/g, '_');
    if (!cleanId || !newCategory.name.trim() || !newCategory.department.trim()) {
      triggerFeedback('error', 'Please fill English name, ID, and department.');
      return;
    }

    if (categories.some(c => c.id === cleanId)) {
      triggerFeedback('error', `Category "${cleanId}" already exists.`);
      return;
    }

    const added: CategoryConfig = {
      id: cleanId,
      name: newCategory.name.trim(),
      hindiName: newCategory.hindiName.trim() || undefined,
      icon: newCategory.icon,
      slaHours: Number(newCategory.slaHours) || 48,
      department: newCategory.department.trim(),
      active: true
    };

    const updated = [...categories, added];
    setCategoriesList(updated);
    saveCategories(updated);
    addAuditLog('Created Category', `Added category "${added.name}" with SLA ${added.slaHours}h`, user?.email || 'Admin');
    
    setNewCategory({ id: '', name: '', hindiName: '', icon: 'Sliders', slaHours: 48, department: '' });
    setShowAddCategory(false);
    setLogsList(getAuditLogs());
    triggerFeedback('success', `Category "${added.name}" added successfully.`);
    if (onRefreshData) onRefreshData();
  };

  const handleToggleCategory = (id: string) => {
    const updated = categories.map(c => {
      if (c.id === id) {
        const nextState = !c.active;
        addAuditLog('Toggle Category Status', `Category "${c.name}" active status set to ${nextState}`, user?.email || 'Admin');
        return { ...c, active: nextState };
      }
      return c;
    });
    setCategoriesList(updated);
    saveCategories(updated);
    setLogsList(getAuditLogs());
    triggerFeedback('success', 'Category status updated.');
    if (onRefreshData) onRefreshData();
  };

  const handleDeleteCategory = (id: string) => {
    if (id === 'other') {
      triggerFeedback('error', 'The fallback category "Other" cannot be removed.');
      return;
    }
    const target = categories.find(c => c.id === id);
    const updated = categories.filter(c => c.id !== id);
    setCategoriesList(updated);
    saveCategories(updated);
    addAuditLog('Deleted Category', `Removed category "${target?.name || id}"`, user?.email || 'Admin');
    setLogsList(getAuditLogs());
    triggerFeedback('success', 'Category removed.');
    if (onRefreshData) onRefreshData();
  };

  const startEditCategory = (cat: CategoryConfig) => {
    setEditingCatId(cat.id);
    setEditCatData({
      name: cat.name,
      hindiName: cat.hindiName || '',
      icon: cat.icon,
      slaHours: cat.slaHours,
      department: cat.department
    });
  };

  const handleSaveCategoryEdit = (id: string) => {
    if (!editCatData.name.trim() || !editCatData.department.trim()) {
      triggerFeedback('error', 'Name and Department cannot be empty.');
      return;
    }
    const updated = categories.map(c => {
      if (c.id === id) {
        addAuditLog('Updated Category Details', `Modified SLA and department of "${c.name}"`, user?.email || 'Admin');
        return {
          ...c,
          name: editCatData.name.trim(),
          hindiName: editCatData.hindiName.trim() || undefined,
          icon: editCatData.icon,
          slaHours: Number(editCatData.slaHours) || 48,
          department: editCatData.department.trim()
        };
      }
      return c;
    });
    setCategoriesList(updated);
    saveCategories(updated);
    setEditingCatId(null);
    setLogsList(getAuditLogs());
    triggerFeedback('success', 'Category updated.');
    if (onRefreshData) onRefreshData();
  };

  // ROLE PROMOTION
  const handleRoleChange = async (uid: string, newRole: 'citizen' | 'authority' | 'admin') => {
    const oldUser = users.find(u => u.uid === uid);
    if (!oldUser) return;

    if (uid === user.uid && newRole !== 'admin') {
      const confirmSelfDemote = window.confirm("Warning: You are about to change your own role. Demoting yourself will restrict your access to this Admin Dashboard immediately. Are you sure you want to proceed?");
      if (!confirmSelfDemote) return;
    }

    try {
      await updateUserRole(uid, newRole, user?.email || 'Admin');
      // Reload list and logs
      setUsersList(getAdminUsers());
      setLogsList(getAuditLogs());
      triggerFeedback('success', `Successfully updated role of ${oldUser.displayName} to "${newRole.toUpperCase()}".`);
      
      // If current user updated themselves, let's refresh the whole app state
      if (uid === user.uid && onRefreshData) {
        window.location.reload();
      }
    } catch (err) {
      triggerFeedback('error', 'Failed to update user role.');
    }
  };

  // Filter lists
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.displayName.toLowerCase().includes(userSearch.toLowerCase()) || 
                          u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = roleFilter === 'all' ? true : u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredCities = cities.filter(c => 
    c.name.toLowerCase().includes(citySearch.toLowerCase()) || 
    c.state.toLowerCase().includes(citySearch.toLowerCase())
  );

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(categorySearch.toLowerCase()) || 
    c.department.toLowerCase().includes(categorySearch.toLowerCase())
  );

  return (
    <div className="w-full space-y-6" id="admin-dashboard-container">
      
      {/* Header card with welcome/status details */}
      <div className="relative overflow-hidden p-6 md:p-8 rounded-3xl bg-slate-900 border border-slate-800 text-left shadow-2xl">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Sliders className="w-40 h-40 text-emerald-500" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>SYSTEM COMMAND CENTER</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-100 tracking-tight">
              Administrative Command Control
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Verify platform parameters, add and scope municipal cities, customize AI category classifications, set responsible SLA departments, and manage citizen and official credentials globally.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 shrink-0 font-mono text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Active Jurisdictions</p>
              <p className="text-lg font-black text-slate-200 mt-1 flex items-center gap-1.5">
                <Globe className="w-4.5 h-4.5 text-emerald-500" />
                {cities.filter(c => c.active).length} Cities
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Configured Categories</p>
              <p className="text-lg font-black text-slate-200 mt-1 flex items-center gap-1.5">
                <Sliders className="w-4.5 h-4.5 text-indigo-400" />
                {categories.length} Issues
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating feedback alert */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            id="admin-toast-feedback"
            className={`p-4 rounded-2xl flex items-center gap-3 shadow-2xl border text-sm font-bold text-left ${
              feedback.type === 'success' 
                ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-400' 
                : 'bg-rose-950/90 border-rose-500/30 text-rose-400'
            }`}
          >
            {feedback.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <ShieldAlert className="w-5 h-5 shrink-0" />}
            <p className="flex-1 leading-snug">{feedback.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary tab switcher */}
      <div className="flex flex-wrap gap-2.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/60 font-mono text-xs font-bold">
        <button
          id="btn-admin-tab-cities"
          onClick={() => { speakText('Cities list'); setActiveTab('cities'); }}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'cities' 
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-emerald-400 shadow-md border border-slate-200 dark:border-slate-800' 
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>CITIES ({cities.length})</span>
        </button>
        <button
          id="btn-admin-tab-categories"
          onClick={() => { speakText('Categories list'); setActiveTab('categories'); }}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'categories' 
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-emerald-400 shadow-md border border-slate-200 dark:border-slate-800' 
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>CATEGORIES & SLA ({categories.length})</span>
        </button>
        <button
          id="btn-admin-tab-users"
          onClick={() => { speakText('Users list'); setActiveTab('users'); }}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'users' 
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-emerald-400 shadow-md border border-slate-200 dark:border-slate-800' 
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>CREDENTIALS & ROLES ({users.length})</span>
        </button>
        <button
          id="btn-admin-tab-logs"
          onClick={() => { speakText('Audit logs'); setActiveTab('logs'); }}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'logs' 
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-emerald-400 shadow-md border border-slate-200 dark:border-slate-800' 
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>AUDIT HISTORY ({logs.length})</span>
        </button>
      </div>

      {/* TAB CONTENT CARDS */}
      <div className="space-y-6">

        {/* CITIES TAB */}
        {activeTab === 'cities' && (
          <div className="space-y-6" id="panel-admin-cities">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  id="input-city-search"
                  type="text"
                  placeholder="Search cities by name..."
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs font-mono border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                id="btn-toggle-add-city"
                onClick={() => { speakText('Open add city form'); setShowAddCity(!showAddCity); }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold font-mono flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                {showAddCity ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{showAddCity ? "CLOSE FORM" : "ADD NEW JURISDICTION"}</span>
              </button>
            </div>

            {/* Add City Form Panel */}
            <AnimatePresence>
              {showAddCity && (
                <motion.form
                  onSubmit={handleAddCity}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  id="form-add-city"
                  className="overflow-hidden p-5 rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/40 text-left space-y-4"
                >
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1.5">
                    <Globe className="w-4 h-4" />
                    <span>Setup New Civic City Boundary</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-500 font-mono">Unique City ID (Lowercase)</label>
                      <input
                        id="new-city-id"
                        type="text"
                        placeholder="e.g. pune"
                        value={newCity.id}
                        onChange={(e) => setNewCity({ ...newCity, id: e.target.value })}
                        className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-500 font-mono">City Name</label>
                      <input
                        id="new-city-name"
                        type="text"
                        placeholder="e.g. Pune"
                        value={newCity.name}
                        onChange={(e) => setNewCity({ ...newCity, name: e.target.value })}
                        className="w-full p-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-500 font-mono">State / Region</label>
                      <input
                        id="new-city-state"
                        type="text"
                        placeholder="e.g. Maharashtra"
                        value={newCity.state}
                        onChange={(e) => setNewCity({ ...newCity, state: e.target.value })}
                        className="w-full p-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-500 font-mono">Country</label>
                      <input
                        id="new-city-country"
                        type="text"
                        placeholder="e.g. India"
                        value={newCity.country}
                        onChange={(e) => setNewCity({ ...newCity, country: e.target.value })}
                        className="w-full p-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      id="btn-add-city-submit"
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold font-mono cursor-pointer transition-all"
                    >
                      INITIALIZE REGION
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Cities Grid List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCities.map((city) => {
                const isEditing = editingCityId === city.id;
                return (
                  <div
                    key={city.id}
                    id={`city-card-${city.id}`}
                    className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800/70 bg-white dark:bg-[#06090e] shadow-md flex flex-col justify-between gap-5 text-left transition-all hover:border-slate-300 dark:hover:border-slate-700/80"
                  >
                    <div className="space-y-3.5">
                      <div className="flex justify-between items-start">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                          <Globe className="w-5 h-5" />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            id={`btn-toggle-city-active-${city.id}`}
                            onClick={() => handleToggleCity(city.id)}
                            className={`px-2 py-1 rounded-md text-[9px] font-bold font-mono border cursor-pointer transition-colors ${
                              city.active 
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
                                : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-500'
                            }`}
                          >
                            {city.active ? "● ACTIVE JURISDICTION" : "○ INACTIVE"}
                          </button>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="space-y-2 pt-1.5" id={`city-edit-fields-${city.id}`}>
                          <input
                            type="text"
                            value={editCityData.name}
                            onChange={(e) => setEditCityData({ ...editCityData, name: e.target.value })}
                            className="w-full p-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                            placeholder="City Name"
                          />
                          <input
                            type="text"
                            value={editCityData.state}
                            onChange={(e) => setEditCityData({ ...editCityData, state: e.target.value })}
                            className="w-full p-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                            placeholder="State"
                          />
                        </div>
                      ) : (
                        <div>
                          <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <span>{city.name}</span>
                            <span className="text-[10px] font-mono text-slate-450 uppercase tracking-widest bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">
                              {city.id}
                            </span>
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                            {city.state}, {city.country}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-900/60 flex justify-between items-center text-[10px] font-mono font-bold">
                      <span className="text-slate-400">
                        Added: {new Date(city.createdAt).toLocaleDateString()}
                      </span>

                      <div className="flex gap-2">
                        {isEditing ? (
                          <>
                            <button
                              id={`btn-save-city-edit-${city.id}`}
                              onClick={() => handleSaveCityEdit(city.id)}
                              className="p-1.5 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 cursor-pointer"
                              title="Save changes"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`btn-cancel-city-edit-${city.id}`}
                              onClick={() => setEditingCityId(null)}
                              className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-850 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              id={`btn-start-city-edit-${city.id}`}
                              onClick={() => startEditCity(city)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer"
                              title="Edit City Details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`btn-delete-city-${city.id}`}
                              onClick={() => handleDeleteCity(city.id)}
                              disabled={city.id === 'lucknow' || city.id === 'bengaluru'}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/25 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                              title="Remove City"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CATEGORIES TAB */}
        {activeTab === 'categories' && (
          <div className="space-y-6" id="panel-admin-categories">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  id="input-category-search"
                  type="text"
                  placeholder="Search categories by name / department..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs font-mono border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                id="btn-toggle-add-category"
                onClick={() => { speakText('Open add category form'); setShowAddCategory(!showAddCategory); }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold font-mono flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                {showAddCategory ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{showAddCategory ? "CLOSE FORM" : "ADD NEW CLASSIFICATION"}</span>
              </button>
            </div>

            {/* Add Category Form Panel */}
            <AnimatePresence>
              {showAddCategory && (
                <motion.form
                  onSubmit={handleAddCategory}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  id="form-add-category"
                  className="overflow-hidden p-5 rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/40 text-left space-y-4"
                >
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1.5">
                    <Sliders className="w-4 h-4" />
                    <span>Setup Custom AI Issue Category</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-500 font-mono">Category ID (Lowercase)</label>
                      <input
                        id="new-cat-id"
                        type="text"
                        placeholder="e.g. noise_pollution"
                        value={newCategory.id}
                        onChange={(e) => setNewCategory({ ...newCategory, id: e.target.value })}
                        className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-500 font-mono">Name (English)</label>
                      <input
                        id="new-cat-name"
                        type="text"
                        placeholder="e.g. Noise Pollution"
                        value={newCategory.name}
                        onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                        className="w-full p-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-500 font-mono">Name (Hindi)</label>
                      <input
                        id="new-cat-hindi"
                        type="text"
                        placeholder="e.g. ध्वनि प्रदूषण"
                        value={newCategory.hindiName}
                        onChange={(e) => setNewCategory({ ...newCategory, hindiName: e.target.value })}
                        className="w-full p-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-500 font-mono">Lucide Icon ID</label>
                      <select
                        id="new-cat-icon"
                        value={newCategory.icon}
                        onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                        className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-200 focus:outline-none"
                      >
                        <option value="Sliders">Sliders (General)</option>
                        <option value="Activity">Activity (Drainage)</option>
                        <option value="Droplet">Droplet (Water)</option>
                        <option value="Trash2">Trash (Garbage)</option>
                        <option value="Lightbulb">Lightbulb (Streetlight)</option>
                        <option value="Hammer">Hammer (Pothole)</option>
                        <option value="Construction">Construction (Road Surface)</option>
                        <option value="ShieldAlert">Shield (Public Safety)</option>
                        <option value="Volume2">Volume2 (Noise Pollution)</option>
                        <option value="AlertTriangle">Alert (Hazards)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-500 font-mono">SLA Resolution Hours</label>
                      <input
                        id="new-cat-sla"
                        type="number"
                        placeholder="e.g. 24"
                        value={newCategory.slaHours}
                        onChange={(e) => setNewCategory({ ...newCategory, slaHours: Number(e.target.value) })}
                        className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                        min={1}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-500 font-mono">Assigned Department</label>
                      <input
                        id="new-cat-dept"
                        type="text"
                        placeholder="e.g. Environmental Protection Division"
                        value={newCategory.department}
                        onChange={(e) => setNewCategory({ ...newCategory, department: e.target.value })}
                        className="w-full p-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      id="btn-add-category-submit"
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold font-mono cursor-pointer transition-all"
                    >
                      SAVE CLASSIFICATION
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Categories Table / List */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#06090e] overflow-hidden text-left shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-medium" id="table-admin-categories">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-850 font-mono text-[10px] text-slate-500 uppercase">
                      <th className="px-5 py-3 text-left">Category & Icon</th>
                      <th className="px-5 py-3 text-left">Alternative / Hindi</th>
                      <th className="px-5 py-3 text-center">SLA Constraint</th>
                      <th className="px-5 py-3 text-left">Department Responsible</th>
                      <th className="px-5 py-3 text-center">Platform Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-900/50">
                    {filteredCategories.map((cat) => {
                      const isEditing = editingCatId === cat.id;
                      return (
                        <tr key={cat.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20" id={`category-row-${cat.id}`}>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                                {isEditing ? (
                                  <select
                                    value={editCatData.icon}
                                    onChange={(e) => setEditCatData({ ...editCatData, icon: e.target.value })}
                                    className="bg-transparent text-[10px] font-mono focus:outline-none"
                                  >
                                    <option value="Sliders">Sliders</option>
                                    <option value="Activity">Activity</option>
                                    <option value="Droplet">Droplet</option>
                                    <option value="Trash2">Trash</option>
                                    <option value="Lightbulb">Lightbulb</option>
                                    <option value="Hammer">Hammer</option>
                                    <option value="Construction">Construction</option>
                                    <option value="ShieldAlert">Shield</option>
                                    <option value="Volume2">Volume</option>
                                    <option value="AlertTriangle">Alert</option>
                                  </select>
                                ) : (
                                  <DynamicIcon name={cat.icon} className="w-4 h-4" />
                                )}
                              </div>
                              <div>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editCatData.name}
                                    onChange={(e) => setEditCatData({ ...editCatData, name: e.target.value })}
                                    className="p-1.5 rounded border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
                                  />
                                ) : (
                                  <div className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                    <span>{cat.name}</span>
                                    <span className="text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-900 text-slate-500 px-1.5 py-0.5 rounded uppercase">
                                      {cat.id}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-slate-600 dark:text-slate-350">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editCatData.hindiName}
                                onChange={(e) => setEditCatData({ ...editCatData, hindiName: e.target.value })}
                                className="p-1.5 rounded border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold w-36"
                                placeholder="Alternative Name"
                              />
                            ) : (
                              <span className="font-hindi text-sm">{cat.hindiName || '—'}</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-center whitespace-nowrap font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editCatData.slaHours}
                                onChange={(e) => setEditCatData({ ...editCatData, slaHours: Number(e.target.value) })}
                                className="p-1.5 rounded border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 w-16 text-center font-bold"
                                min={1}
                              />
                            ) : (
                              <span>{cat.slaHours} Hours</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-slate-600 dark:text-slate-350 max-w-xs truncate">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editCatData.department}
                                onChange={(e) => setEditCatData({ ...editCatData, department: e.target.value })}
                                className="p-1.5 rounded border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold w-full text-xs"
                              />
                            ) : (
                              <span>{cat.department}</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-center whitespace-nowrap">
                            <button
                              id={`btn-toggle-category-active-${cat.id}`}
                              onClick={() => handleToggleCategory(cat.id)}
                              className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono border cursor-pointer transition-colors ${
                                cat.active 
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
                                  : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-500'
                              }`}
                            >
                              {cat.active ? "ACTIVE" : "INACTIVE"}
                            </button>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-right">
                            <div className="flex gap-2 justify-end">
                              {isEditing ? (
                                <>
                                  <button
                                    id={`btn-save-category-edit-${cat.id}`}
                                    onClick={() => handleSaveCategoryEdit(cat.id)}
                                    className="p-1 rounded bg-emerald-500 text-slate-950 hover:bg-emerald-400 cursor-pointer"
                                    title="Save category"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    id={`btn-cancel-category-edit-${cat.id}`}
                                    onClick={() => setEditingCatId(null)}
                                    className="p-1 rounded bg-slate-200 dark:bg-slate-850 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                                    title="Cancel"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    id={`btn-start-category-edit-${cat.id}`}
                                    onClick={() => startEditCategory(cat)}
                                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer"
                                    title="Edit SLA / Department"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    id={`btn-delete-category-${cat.id}`}
                                    onClick={() => handleDeleteCategory(cat.id)}
                                    disabled={cat.id === 'other'}
                                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/25 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                    title="Delete category"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="space-y-6" id="panel-admin-users">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
              <div className="relative flex-1 sm:max-w-md">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  id="input-user-search"
                  type="text"
                  placeholder="Search user profiles by name, email, uid..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs font-mono border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-3 text-xs font-mono font-bold">
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-500">Role Filter:</span>
                </div>
                <select
                  id="select-user-role-filter"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="all">All Roles</option>
                  <option value="citizen">Citizens</option>
                  <option value="authority">Authorities</option>
                  <option value="admin">Administrators</option>
                </select>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#06090e] overflow-hidden text-left shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-medium" id="table-admin-users">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-850 font-mono text-[10px] text-slate-500 uppercase">
                      <th className="px-5 py-3 text-left">Display Name</th>
                      <th className="px-5 py-3 text-left">Email Identifier</th>
                      <th className="px-5 py-3 text-center">Trust Index</th>
                      <th className="px-5 py-3 text-center">Leaderboard Points</th>
                      <th className="px-5 py-3 text-left">Assigned Role Privilege</th>
                      <th className="px-5 py-3 text-right">System Privilege Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-900/50">
                    {filteredUsers.map((u) => {
                      const isSelf = u.uid === user.uid;
                      return (
                        <tr key={u.uid} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20" id={`user-row-${u.uid}`}>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold flex items-center justify-center">
                                {u.displayName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                  <span>{u.displayName}</span>
                                  {isSelf && (
                                    <span className="text-[9px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md font-mono uppercase">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="text-[9px] font-mono text-slate-400 mt-0.5 select-all">
                                  UID: {u.uid}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-slate-600 dark:text-slate-350 select-all font-mono">
                            {u.email}
                          </td>
                          <td className="px-5 py-4 text-center whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded font-mono font-bold bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                              {u.impactScore}%
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center whitespace-nowrap font-bold text-slate-800 dark:text-slate-200">
                            {u.points} pts
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono border ${
                              u.role === 'admin' 
                                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400' 
                                : u.role === 'authority'
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                                : 'bg-slate-100 border-slate-300 dark:bg-slate-900 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                              {u.role === 'admin' && <Shield className="w-3 h-3 text-indigo-500" />}
                              {u.role === 'authority' && <Building2 className="w-3 h-3 text-amber-500" />}
                              {u.role === 'citizen' && <Users className="w-3 h-3 text-slate-400" />}
                              <span>{u.role.toUpperCase()}</span>
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2 text-xs font-mono font-bold">
                              <span className="text-slate-400 text-[10px]">PROMOTE TO:</span>
                              <select
                                id={`select-promote-role-${u.uid}`}
                                value={u.role}
                                onChange={(e) => handleRoleChange(u.uid, e.target.value as any)}
                                className="p-1 bg-slate-100 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 cursor-pointer text-[10px] uppercase font-bold font-mono focus:outline-none"
                              >
                                <option value="citizen">CITIZEN HERO</option>
                                <option value="authority">AUTHORITY</option>
                                <option value="admin">ADMIN PRIVILEGE</option>
                              </select>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* AUDIT LOGS TAB */}
        {activeTab === 'logs' && (
          <div className="space-y-4" id="panel-admin-logs">
            <div className="flex justify-between items-center text-xs font-mono font-bold">
              <span className="text-slate-500">Live system parameters auditing</span>
              <button
                id="btn-clear-audit-logs"
                onClick={() => {
                  localStorage.removeItem('civic_admin_audit_logs');
                  setLogsList([]);
                  speakText('Logs cleared');
                  triggerFeedback('success', 'Audit history wiped successfully.');
                }}
                className="px-3 py-1.5 rounded-xl border border-rose-500/30 hover:bg-rose-950/20 text-rose-500 hover:text-rose-400 flex items-center gap-1 cursor-pointer transition-all"
              >
                <Trash className="w-3.5 h-3.5" />
                <span>WIPE LOGS</span>
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#06090e] p-5 text-left shadow-md space-y-4">
              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
                {logs.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 space-y-1">
                    <Info className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-sm font-semibold">No audit records exist.</p>
                    <p className="text-[11px] font-mono">Administrative actions will log here in real time.</p>
                  </div>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      id={`log-item-${log.id}`}
                      className="p-3 rounded-xl border border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-950/40 text-xs font-mono flex flex-col md:flex-row md:items-center justify-between gap-3 text-left hover:border-slate-250 dark:hover:border-slate-800"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold uppercase text-[9px] tracking-wide">
                            {log.action}
                          </span>
                          <span className="text-slate-500 text-[10px]">on</span>
                          <span className="text-slate-800 dark:text-slate-200 font-extrabold">{log.target}</span>
                        </div>
                        <div className="text-[10px] text-slate-450 flex items-center gap-1">
                          <span>Operator:</span>
                          <span className="font-semibold text-slate-600 dark:text-slate-350">{log.performedBy}</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold shrink-0 text-left md:text-right">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
