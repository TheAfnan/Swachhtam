import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  FileText, 
  ClipboardCheck, 
  Building2, 
  UserCheck, 
  Search, 
  Calendar, 
  Truck, 
  CheckSquare, 
  ThumbsUp, 
  Users, 
  Wrench, 
  Sparkles, 
  HelpCircle, 
  Award,
  Bell,
  Clock,
  MapPin,
  Check,
  AlertTriangle
} from 'lucide-react';
import { CivicReport } from '../types';
import { updateReportStatusByAuthority } from '../lib/firebase';
import { useLanguage } from '../lib/LanguageContext';

interface IssueJourneyTrackerProps {
  report: CivicReport;
  onClose: () => void;
  user: any;
  onRefreshData: () => void;
}

export default function IssueJourneyTracker({ report, onClose, user, onRefreshData }: IssueJourneyTrackerProps) {
  const { language, speakText } = useLanguage();
  const [notification, setNotification] = useState<string | null>(null);
  const [verificationSelection, setVerificationSelection] = useState<'yes' | 'partially' | 'no' | null>(() => {
    const saved = localStorage.getItem(`verification_${report.id}`);
    return (saved as any) || null;
  });

  // Simulated live progress percentage
  const [liveProgress, setLiveProgress] = useState(65);
  const [activeMobileTab, setActiveMobileTab] = useState<'overview' | 'journey'>('journey');

  useEffect(() => {
    if (report.status === 'in_progress') {
      const interval = setInterval(() => {
        setLiveProgress((prev) => {
          if (prev >= 95) return 65; // loop for demo visual
          return prev + 5;
        });
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [report.status]);

  // Determine current active step index (0 to 13)
  // 14 stages:
  // 1. Issue Reported (0)
  // 2. Complaint Received (1)
  // 3. Assigned to Department (2)
  // 4. Officer Assigned (3)
  // 5. Under Review (4)
  // 6. Site Inspection Scheduled (5)
  // 7. Inspection Team On The Way (6)
  // 8. Inspection Completed (7)
  // 9. Work Approved (8)
  // 10. Repair Team Assigned (9)
  // 11. Work Started (10)
  // 12. Work Completed (11)
  // 13. Citizen Verification (12)
  // 14. Complaint Closed (13)
  let currentStepIndex = 2; // Default for 'reported'

  if (report.status === 'reported') {
    currentStepIndex = 2; // Assigned to Department is current
  } else if (report.status === 'verified') {
    currentStepIndex = 5; // Site Inspection Scheduled is current
  } else if (report.status === 'in_progress') {
    currentStepIndex = 10; // Work Started is current
  } else if (report.status === 'resolved') {
    if (verificationSelection === 'yes' || verificationSelection === 'partially') {
      currentStepIndex = 13; // Complaint Closed
    } else {
      currentStepIndex = 12; // Citizen Verification
    }
  } else if (report.status === 'rejected') {
    currentStepIndex = 4; // Stopped at Under Review
  }

  // Generate deterministic timestamps based on creation date
  const getStepTimestamp = (index: number) => {
    const start = report.createdAt;
    const offsets = [
      0, // Step 1: Reported
      10 * 60 * 1000, // Step 2: Received (+10m)
      45 * 60 * 1000, // Step 3: Assigned Dept (+45m)
      2 * 3600 * 1000, // Step 4: Officer Assigned (+2h)
      4 * 3600 * 1000, // Step 5: Under Review (+4h)
      24 * 3600 * 1000, // Step 6: Site Inspection Scheduled (+24h)
      26 * 3600 * 1000, // Step 7: En Route (+26h)
      28 * 3600 * 1000, // Step 8: Completed Inspection (+28h)
      32 * 3600 * 1000, // Step 9: Work Approved (+32h)
      48 * 3600 * 1000, // Step 10: Repair Team Assigned (+2d)
      52 * 3600 * 1000, // Step 11: Work Started (+2d 4h)
      72 * 3600 * 1000, // Step 12: Work Completed (+3d)
      74 * 3600 * 1000, // Step 13: Resident verification (+3d 2h)
      76 * 3600 * 1000, // Step 14: Archived (+3d 4h)
    ];

    const stepTime = start + offsets[index];
    if (index > currentStepIndex) {
      return { text: 'Upcoming Step', dateStr: '', isEstimated: true };
    }

    // If step is completed or current, show actual formatted timestamp
    // Ensure we do not project into future if current step has passed current time
    const finalTime = Math.min(stepTime, Date.now());
    const dateObj = new Date(finalTime);
    return {
      text: dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      timeStr: dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      isEstimated: index === currentStepIndex && index < 12
    };
  };

  // Notification simulator trigger on load
  useEffect(() => {
    let notifyText = '';
    if (report.status === 'reported') {
      notifyText = "AI update: Complaint filed. Assigned to Lucknow Municipal Corporation (LMC).";
    } else if (report.status === 'verified') {
      notifyText = "Officer assigned: Field team scheduling on-site structural check.";
    } else if (report.status === 'in_progress') {
      notifyText = "Repair crew arrived: Physical maintenance and concrete laying active.";
    } else if (report.status === 'resolved') {
      notifyText = "Work Completed: Citizen confirmation required to close this ticket.";
    }

    if (notifyText) {
      setNotification(notifyText);
      const timer = setTimeout(() => setNotification(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [report.id, report.status]);

  // Handle citizen verification voting
  const handleVerifyResolution = async (choice: 'yes' | 'partially' | 'no') => {
    setVerificationSelection(choice);
    localStorage.setItem(`verification_${report.id}`, choice);

    if (choice === 'no') {
      speakText("Reopening complaint. City department has been notified to inspect again.");
      // Reopen complaint: Update status back to 'in_progress' and set notes
      await updateReportStatusByAuthority(report.id, 'in_progress', 'Resident verified work as unsatisfactory. Automatically reopened.');
      onRefreshData();
      setNotification("Ticket Reopened: Officer instructed to reassess work layout.");
    } else {
      speakText("Thank you for verifying! Your points have been added.");
      onRefreshData();
      setNotification(`Awesome! Ticket verified as ${choice === 'yes' ? 'resolved' : 'partially fixed'}. Community hero points awarded.`);
    }
  };

  // Compute overall percentage
  const totalStages = 14;
  const overallProgressPercent = Math.round(((currentStepIndex + 1) / totalStages) * 100);

  // Departments & Officers
  const getDepartmentDetails = () => {
    switch (report.category) {
      case 'pothole':
      case 'road_damage':
        return { dept: "BBMP Road Infrastructure Division", officer: "Engineer Harish Kumar", contact: "+91 98860 12345", designation: "Chief Road Inspector" };
      case 'garbage':
      case 'illegal_dumping':
        return { dept: "BBMP Solid Waste Management Wing", officer: "Smt. Roopa Devi", contact: "+91 99000 54321", designation: "Ward Health Inspector" };
      case 'water_leakage':
        return { dept: "BWSSB Water Supply & Sewerage Board", officer: "Shri Manjunath Swamy", contact: "+91 94480 87654", designation: "Assistant Executive Engineer" };
      case 'street_light':
        return { dept: "BESCOM Grid Maintenance & Lighting Unit", officer: "Officer Anand Rao", contact: "+91 91410 98765", designation: "Sub-Station Engineer" };
      case 'drainage':
        return { dept: "BBMP Stormwater Drain Department", officer: "Officer Suresh Kumar", contact: "+91 98440 22334", designation: "Superintending Engineer" };
      default:
        return { dept: "Municipal Grievances Cell (Ward 150)", officer: "Officer Robert D'Souza", contact: "+91 98450 11223", designation: "Nodal Officer" };
    }
  };

  const contactDetails = getDepartmentDetails();

  // 14 Steps Definitions
  const stages = [
    {
      title: "Issue Reported",
      icon: FileText,
      description: "Citizen submitted the complaint. Location coordinates registered.",
      renderDetails: () => (
        <div className="mt-2 text-[11px] text-slate-400 space-y-1.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-left">
          <p className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-rose-500" />
            <span className="truncate">{report.location.address || "Lucknow Ward Layout"}</span>
          </p>
          {report.imageUrl && (
            <div className="w-24 h-16 rounded overflow-hidden bg-slate-950 border border-slate-800">
              <img src={report.imageUrl} alt="Complaint source" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          )}
          {report.videoUrl && (
            <div className="w-24 h-16 rounded overflow-hidden bg-slate-950 border border-slate-800 mt-1">
              <video src={report.videoUrl} className="w-full h-full object-cover" controls />
            </div>
          )}
        </div>
      )
    },
    {
      title: "Complaint Received",
      icon: ClipboardCheck,
      description: "Complaint successfully received and stored.",
      renderDetails: () => (
        <div className="mt-1 text-[11px] text-slate-400 font-mono text-left">
          Complaint ID: <span className="text-emerald-400 font-bold">COM-{report.id.toUpperCase().slice(0, 10)}</span>
        </div>
      )
    },
    {
      title: "Assigned to Department",
      icon: Building2,
      description: "AI identified the correct civic department for redressal.",
      renderDetails: () => (
        <div className="mt-1 text-[11px] text-slate-300 font-bold text-left">
          Dept: <span className="text-cyan-400">{contactDetails.dept}</span>
        </div>
      )
    },
    {
      title: "Officer Assigned",
      icon: UserCheck,
      description: "Professional field inspector allocated to supervise resolution.",
      renderDetails: () => (
        <div className="mt-1.5 text-[11px] text-slate-400 space-y-1 p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/40 text-left">
          <p className="font-bold text-slate-200">{contactDetails.officer}</p>
          <p className="text-slate-500 text-[10px]">{contactDetails.designation}</p>
          <p className="text-[10px] text-emerald-400 font-bold">Contact: {contactDetails.contact}</p>
        </div>
      )
    },
    {
      title: "Under Review",
      icon: Search,
      description: "Officer reviews priority metrics, proximities, and safety scores.",
      renderDetails: () => (
        <div className="mt-1 text-[11px] text-slate-400 text-left font-serif italic">
          "{report.authoritiesNotes || `Reviewing ${report.category} severity triggers near public zones. High hazard rating.`}"
        </div>
      )
    },
    {
      title: "Site Inspection Scheduled",
      icon: Calendar,
      description: "On-site assessment date scheduled for precision reporting.",
      renderDetails: () => {
        const dateStr = new Date(report.createdAt + 24 * 3600 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        return (
          <div className="mt-1 text-[11px] text-amber-400 font-bold text-left">
            Inspection Date: {dateStr} (10:00 AM - 12:30 PM)
          </div>
        );
      }
    },
    {
      title: "Inspection Team On The Way",
      icon: Truck,
      description: "Field vehicle dispatched to physical GPS node.",
      renderDetails: () => (
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400 text-left">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          <span>Live ETA: <span className="text-cyan-400 font-bold">14 minutes</span> (Team en route)</span>
        </div>
      )
    },
    {
      title: "Inspection Completed",
      icon: CheckSquare,
      description: "Physical measurements and ground survey conducted.",
      renderDetails: () => (
        <div className="mt-1.5 text-[11px] text-slate-400 space-y-1.5 text-left">
          <p className="italic">"Pavement integrity validated. Heavy heavy-vehicle impact cracks observed."</p>
          <div className="flex gap-2">
            <div className="w-16 h-12 bg-slate-900 border border-slate-800 rounded overflow-hidden flex items-center justify-center text-[8px] text-slate-600 font-mono">
              INSPECT_1
            </div>
            <div className="w-16 h-12 bg-slate-900 border border-slate-800 rounded overflow-hidden flex items-center justify-center text-[8px] text-slate-600 font-mono">
              INSPECT_2
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Work Approved",
      icon: ThumbsUp,
      description: "Budget sanctioned and public repair order authorized.",
      renderDetails: () => {
        const estDate = new Date(report.createdAt + 4 * 24 * 3600 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        return (
          <div className="mt-1 text-[11px] text-slate-400 text-left">
            Est. Repair Action: <span className="text-emerald-400 font-bold">{estDate}</span>
          </div>
        );
      }
    },
    {
      title: "Repair Team Assigned",
      icon: Users,
      description: "Professional engineers and contractor squad allocated.",
      renderDetails: () => (
        <div className="mt-1 text-[11px] text-slate-400 text-left">
          Team: <span className="text-slate-200 font-bold">Karnataka Infrastructure Squad</span>
        </div>
      )
    },
    {
      title: "Work Started",
      icon: Wrench,
      description: "Civic repair squads operating physical machinery on ground.",
      renderDetails: () => (
        <div className="mt-1.5 text-[11px] text-slate-400 space-y-1.5 text-left">
          <div className="flex justify-between text-[10px]">
            <span>Re-laying process status:</span>
            <span className="text-emerald-400 font-bold">{report.status === 'resolved' ? '100%' : `${liveProgress}%`}</span>
          </div>
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
            <div 
              className="bg-emerald-500 h-full transition-all duration-1000" 
              style={{ width: report.status === 'resolved' ? '100%' : `${liveProgress}%` }}
            />
          </div>
        </div>
      )
    },
    {
      title: "Work Completed",
      icon: Sparkles,
      description: "Full site cleanup done. Quality check certified.",
      renderDetails: () => (
        <div className="mt-2 text-[11px] text-slate-400 space-y-2 text-left">
          <p className="font-serif italic">"{report.resolutionSummary || 'Pavement completely leveled, re-asphalted, and waterlogged segments grading re-engineered.'}"</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[9px] text-slate-500 block mb-0.5 uppercase font-mono">Before</span>
              <div className="w-full h-16 rounded overflow-hidden bg-slate-950 border border-slate-800">
                <img src={report.imageUrl} alt="Before" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block mb-0.5 uppercase font-mono">After</span>
              <div className="w-full h-16 rounded overflow-hidden bg-slate-950 border border-slate-800">
                <img 
                  src={report.resolvedImageUrl || "https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=600&auto=format&fit=crop"} 
                  alt="After" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                />
              </div>
            </div>
          </div>
          {report.videoUrl && (
            <div className="mt-2">
              <span className="text-[9px] text-slate-500 block mb-0.5 uppercase font-mono font-bold">Before (Video)</span>
              <div className="w-full h-24 rounded overflow-hidden bg-slate-950 border border-slate-800">
                <video src={report.videoUrl} className="w-full h-full object-contain" controls />
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      title: "Citizen Verification",
      icon: HelpCircle,
      description: "Citizen reviews resolution quality to release Community Hero points.",
      renderDetails: () => {
        // Only interactive if we are at this step or ahead
        if (currentStepIndex < 12) {
          return <span className="text-[10px] text-slate-500 font-mono block mt-1">Pending physical work completion.</span>;
        }

        return (
          <div className="mt-3 p-4 rounded-2xl bg-[#090d16] border border-emerald-500/30 text-left space-y-3">
            <span className="block text-slate-200 font-black text-xs">
              Has your issue been resolved?
            </span>
            <p className="text-[10px] text-slate-400">
              Please inspect the site location. Your vote ensures transparency and rewards contractors fairly.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                id="btn-verify-yes"
                onClick={() => handleVerifyResolution('yes')}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 border ${
                  verificationSelection === 'yes'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/10'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Yes, Fixed</span>
              </button>

              <button
                type="button"
                id="btn-verify-partially"
                onClick={() => handleVerifyResolution('partially')}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 border ${
                  verificationSelection === 'partially'
                    ? 'bg-blue-500 text-white border-blue-400 shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span>Partially</span>
              </button>

              <button
                type="button"
                id="btn-verify-no"
                onClick={() => handleVerifyResolution('no')}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 border ${
                  verificationSelection === 'no'
                    ? 'bg-rose-600 text-white border-rose-500'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>No, Reopen</span>
              </button>
            </div>
          </div>
        );
      }
    },
    {
      title: "Complaint Closed",
      icon: Award,
      description: "Archived with honor. Contractor audited.",
      renderDetails: () => {
        if (currentStepIndex < 13) {
          return null;
        }

        const closedDate = new Date(report.resolvedAt || Date.now());
        const totalHours = Math.round((closedDate.getTime() - report.createdAt) / (3600 * 1000));
        const days = Math.floor(totalHours / 24);
        const hours = totalHours % 24;

        return (
          <div className="mt-3 p-4 rounded-2xl bg-emerald-950/20 border-2 border-emerald-500/30 text-left space-y-2">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-400" />
              <span className="font-extrabold text-xs text-emerald-400 uppercase tracking-wide">
                Community Hero Tier Closed!
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed font-bold">
              Total Resolution Time: <span className="text-white font-mono">{days > 0 ? `${days} days, ` : ''}{hours} hours</span>.
            </p>
            <p className="text-[10px] text-slate-400">
              Thank you for anchoring your local area! <span className="text-emerald-400 font-bold">+100 Hero Points</span> have been locked to your civic scorecard.
            </p>
            <div className="pt-1 text-[11px] text-emerald-500 font-black">
              ★ Active Area Champion Verified
            </div>
          </div>
        );
      }
    }
  ];

  // Dynamic estimated completion
  const getEstCompletionText = () => {
    if (report.status === 'resolved') {
      return "Resolution Complete";
    }
    const daysLeft = report.severity === 'critical' ? 1 : report.severity === 'high' ? 3 : 5;
    const estDate = new Date(report.createdAt + daysLeft * 24 * 3600 * 1000);
    return estDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 25 }}
        className="w-full max-w-4xl bg-[#070b13] border-2 border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[92vh] md:h-[820px]"
      >
        {/* Mobile Unified Header */}
        <div className="flex md:hidden justify-between items-center p-4 border-b border-slate-800 bg-[#0c1220] shrink-0">
          <div>
            <span className="text-[9px] uppercase font-mono font-bold tracking-wider text-slate-500">Civic Lifecycle</span>
            <h2 className="text-sm font-black text-white leading-none">Complaint Tracker</h2>
            <span className="text-[10px] font-mono text-emerald-400 mt-1 block">COM-{report.id.toUpperCase().slice(0, 10)}</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile Tab Selectors */}
        <div className="flex md:hidden border-b border-slate-800 bg-[#0c1220] p-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveMobileTab('overview')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
              activeMobileTab === 'overview'
                ? 'bg-slate-900 text-white border border-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveMobileTab('journey')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer relative ${
              activeMobileTab === 'journey'
                ? 'bg-slate-900 text-white border border-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Resolution Journey
            <span className="absolute top-1.5 right-4 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          </button>
        </div>

        {/* LEFT COLUMN: Flipkart-style Overview Summary */}
        <div className={`w-full md:w-[320px] bg-[#0c1220] p-6 border-b md:border-b-0 md:border-r border-slate-800 flex-col justify-between text-left space-y-6 overflow-y-auto ${
          activeMobileTab === 'overview' ? 'flex flex-1 md:flex-none' : 'hidden md:flex'
        }`}>
          <div className="space-y-5">
            {/* Header Title with ID */}
            <div className="hidden md:flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500">Civic Lifecycle</span>
                <h2 className="text-lg font-black text-white leading-tight">Complaint Tracker</h2>
                <span className="text-[10px] font-mono text-emerald-400 mt-1 block">COM-{report.id.toUpperCase().slice(0, 10)}</span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white md:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Overall Progress Progressbar */}
            <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl space-y-3">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400 font-bold">Overall Progress</span>
                <span className="text-emerald-400 font-black">{overallProgressPercent}%</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${overallProgressPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 font-mono">
                Stage {currentStepIndex + 1} of 14: <span className="text-slate-300 font-bold">{stages[currentStepIndex].title}</span>
              </p>
            </div>

            {/* Target Card details */}
            <div className="space-y-2.5">
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500 block">Report Details</span>
              <div className="p-3 bg-slate-900/40 border border-slate-800/40 rounded-xl text-xs space-y-1">
                <span className="block font-black text-slate-200 truncate">{report.title}</span>
                <span className="block text-[10px] text-slate-500">Category: <span className="text-slate-300 uppercase font-mono font-bold">{report.category}</span></span>
                <span className="block text-[10px] text-slate-500">Severity: <span className={`uppercase font-mono font-bold ${report.severity === 'critical' ? 'text-red-500' : 'text-amber-500'}`}>{report.severity}</span></span>
              </div>
            </div>

            {/* Estimated Completion Time */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500 block">Est. Completion Target</span>
              <p className="text-sm font-black text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>{getEstCompletionText()}</span>
              </p>
            </div>

            {/* Live activity log ticker inside side drawer */}
            <div className="space-y-2.5">
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500 block">Operational AI Assistant</span>
              <div className="p-3 bg-emerald-500/[0.03] border border-emerald-500/20 rounded-xl text-[11px] leading-relaxed text-slate-300 text-left">
                <p className="font-medium">
                  {report.status === 'reported' ? "Our artificial intelligence has evaluated this hazard and automatically mapped it to local municipal work-queues based on road parameters." :
                   report.status === 'verified' ? "Verified by peer citizen reports. Ground team scheduled an automated drone/vehicle scan to record repair volumes." :
                   report.status === 'in_progress' ? "Asphalt materials scheduled. Real-time sensor networks active to inspect structural laying heat levels." :
                   "Resolution achieved. Awaiting your approval. Click 'Yes' to verify or 'No' to flag defects and automatically reopen."}
                </p>
              </div>
            </div>
          </div>

          {/* Desktop Close button */}
          <button
            type="button"
            id="btn-close-tracker-desktop"
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 transition-all font-black text-xs text-slate-300 cursor-pointer hidden md:block text-center mt-4"
          >
            Back to Dashboard
          </button>
        </div>

        {/* RIGHT COLUMN: The 14-Step vertical timeline */}
        <div className={`flex-1 flex-col h-full overflow-hidden text-left bg-[#070b13] ${
          activeMobileTab === 'journey' ? 'flex' : 'hidden md:flex'
        }`}>
          {/* Header Row */}
          <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-[#070b13] shrink-0">
            <div>
              <h3 className="text-sm font-extrabold uppercase text-white tracking-wide">Complaint Resolution Journey</h3>
              <p className="text-[11px] text-slate-500 font-mono">14 critical verification checkpoints logged from dispatch to approval</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hidden md:block"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Notification Overlay inside right section */}
          <AnimatePresence>
            {notification && (
              <motion.div
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="mx-5 mt-4 p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-center justify-between text-[11px] font-mono text-emerald-400 shrink-0"
              >
                <div className="flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 animate-bounce text-emerald-400" />
                  <span>{notification}</span>
                </div>
                <button onClick={() => setNotification(null)} className="text-emerald-500 hover:text-emerald-300">
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Vertical scrollable container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="relative pl-8 border-l-2 border-slate-850 space-y-6">
              
              {stages.map((stage, index) => {
                const isCompleted = index < currentStepIndex;
                const isActive = index === currentStepIndex;
                const isUpcoming = index > currentStepIndex;

                const StageIcon = stage.icon;
                const timestampInfo = getStepTimestamp(index);

                return (
                  <div key={index} className="relative text-left">
                    {/* Circle Node dot on left line */}
                    <div className="absolute -left-[41px] top-1 z-10 flex items-center justify-center">
                      <div className={`w-6.5 h-6.5 rounded-full flex items-center justify-center border transition-all ${
                        isCompleted ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-md shadow-emerald-500/10' :
                        isActive ? 'bg-blue-600 border-blue-400 text-white shadow-lg ring-4 ring-blue-500/20' :
                        'bg-[#0c1220] border-slate-800 text-slate-500'
                      }`}>
                        <StageIcon className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Step Info Content Box */}
                    <div className={`p-4 rounded-2xl border transition-all ${
                      isActive ? 'bg-[#0c1322] border-blue-500/30 shadow-lg' :
                      isCompleted ? 'bg-[#090e18]/40 border-slate-850' :
                      'bg-[#070b13]/20 border-transparent opacity-50'
                    }`}>
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-mono font-bold ${
                            isCompleted ? 'text-emerald-400' :
                            isActive ? 'text-blue-400' :
                            'text-slate-500'
                          }`}>
                            Step {index + 1}.
                          </span>
                          <h4 className={`text-xs font-black tracking-wide ${
                            isCompleted ? 'text-slate-100' :
                            isActive ? 'text-blue-300' :
                            'text-slate-500'
                          }`}>
                            {stage.title}
                          </h4>
                        </div>

                        {/* Timestamp badge */}
                        {timestampInfo.text && (
                          <div className="flex items-center gap-1 font-mono text-[9px] text-slate-500 sm:self-center">
                            <span>{timestampInfo.text}</span>
                            {timestampInfo.timeStr && <span>• {timestampInfo.timeStr}</span>}
                            {timestampInfo.isEstimated && (
                              <span className="text-blue-400 font-bold uppercase text-[8px] border border-blue-500/20 px-1 py-0.2 rounded bg-blue-500/5">
                                Estimated
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed mt-1 font-sans">
                        {stage.description}
                      </p>

                      {/* Render custom stage expanded info details if step is completed or active */}
                      {!isUpcoming && stage.renderDetails && (
                        <div className="transition-all duration-300">
                          {stage.renderDetails()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
