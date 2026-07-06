import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Trophy, 
  Award, 
  Shield, 
  Trash2, 
  Droplet, 
  Star, 
  MapPin,
  Volume2
} from 'lucide-react';
import { CivicReport, DigitalTwinZone } from '../types';
import { INITIAL_USERS } from '../lib/firebase';
import { 
  calculateNeighborhoodStats, 
  getNeighborhoodChallenges
} from '../lib/gamification';
import { useLanguage } from '../lib/LanguageContext';

interface LeaderboardViewProps {
  userProfile: any;
  reports: CivicReport[];
  zones: DigitalTwinZone[];
}

export default function LeaderboardView({ userProfile, reports, zones }: LeaderboardViewProps) {
  const { language, isSimpleMode, t, speakText } = useLanguage();
  const [activeLeaderboardType, setActiveLeaderboardType] = useState<'citizens' | 'wards'>('citizens');

  // Compute dynamic stats
  const neighborhoodStats = React.useMemo(() => {
    return calculateNeighborhoodStats(reports, zones);
  }, [reports, zones]);

  const challenges = React.useMemo(() => {
    return getNeighborhoodChallenges(neighborhoodStats);
  }, [neighborhoodStats]);

  // Merge current user state details
  const leaderboardList: any[] = React.useMemo(() => {
    const list = [...INITIAL_USERS];
    
    if (!userProfile) {
      return list.sort((a,b) => b.points - a.points);
    }
    
    const foundIdx = list.findIndex(u => u.uid === userProfile.uid);
    if (foundIdx !== -1) {
      list[foundIdx] = {
        ...list[foundIdx],
        points: Math.max(list[foundIdx].points, userProfile.points || 0),
        badges: userProfile.badges || []
      };
    } else {
      list.push({
        uid: userProfile.uid,
        displayName: userProfile.displayName || 'Guest Citizen',
        email: userProfile.email || '',
        points: userProfile.points || 0,
        badges: userProfile.badges || [],
        reportsCreatedCount: 2,
        verificationsCount: 3,
        impactScore: 60
      });
    }

    return list.sort((a,b) => b.points - a.points);
  }, [userProfile]);

  const badgeLibrary = [
    { id: 'road_guardian', name: 'Road Guardian / सड़क रक्षक', description: 'Reported 3+ potholes or broken roads successfully.', icon: Shield, color: 'text-rose-400 bg-rose-500/10 border border-rose-500/20' },
    { id: 'water_warrior', name: 'Water Warrior / जल रक्षक', description: 'Reported water leaks or pipe ruptures to save clean water.', icon: Droplet, color: 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/20' },
    { id: 'cleanliness_champion', name: 'Cleanliness Champion / स्वच्छता रक्षक', description: 'Reported trash piles to clean up streets.', icon: Trash2, color: 'text-amber-400 bg-amber-500/10 border border-amber-500/20' },
    { id: 'civic_leader', name: 'Civic Hero / जन सेवक', description: 'Earned 500+ helper points for outstanding neighborhood care.', icon: Award, color: 'text-purple-400 bg-purple-500/10 border border-purple-500/20' },
  ];

  const sortedWards = [...neighborhoodStats].sort((a, b) => {
    const totalXpA = a.level * 1000 + a.xp;
    const totalXpB = b.level * 1000 + b.xp;
    return totalXpB - totalXpA;
  });

  return (
    <div className={`space-y-6 text-slate-100 ${isSimpleMode ? 'px-2' : ''}`}>
      
      {/* Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 rounded-3xl bg-[#0c1017] text-white relative overflow-hidden border-2 border-slate-800 shadow-xl w-full text-left">
        <div className="space-y-1 relative z-10 text-left">
          <span className="text-xs bg-amber-500/10 text-amber-400 font-bold uppercase px-3 py-1 rounded-full border border-amber-500/20 flex items-center w-fit">
            <Trophy className="w-4 h-4 mr-1 text-amber-400 animate-bounce" /> {t('leaderboard')}
          </span>
          <h1 className={`font-black tracking-tight pt-1 ${isSimpleMode ? 'text-2xl' : 'text-xl'}`}>
            {language === 'en' ? "Neighborhood Leaderboard & Helper Cups" : "क्षेत्र की प्रतियोगिता और रैंकिंग"}
          </h1>
          <p className={`text-slate-400 ${isSimpleMode ? 'text-base font-semibold leading-relaxed' : 'text-xs'}`}>
            Report issues, verify complaints filed by neighbors, and earn helpful points to raise your rank!
          </p>
        </div>

        <div className="mt-4 sm:mt-0 p-4 bg-[#111621] border-2 border-slate-800 rounded-2xl flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
            <Star className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-500">My Helper Points</span>
            <span className="block text-2xl font-black text-amber-400 font-mono">{(userProfile?.points) || 0} pts</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
        
        {/* Leaderboard tables */}
        <div className="lg:col-span-7 p-5 bg-[#0c1017] border-2 border-slate-800 rounded-3xl space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-850 pb-3">
            <h3 className={`font-black text-white ${isSimpleMode ? 'text-lg' : 'text-sm'}`}>
              {activeLeaderboardType === 'citizens' ? 'Top Helpful Residents (मुख्य सहायक नागरिक)' : 'Top Neighborhood Sectors (मुख्य क्षेत्र रैंकिंग)'}
            </h3>
            
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800/80">
              <button
                id="btn-lead-toggle-citizens"
                onClick={() => setActiveLeaderboardType('citizens')}
                className={`px-4 py-2 text-xs rounded-lg font-black uppercase transition-all cursor-pointer ${
                  activeLeaderboardType === 'citizens'
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'text-slate-400'
                }`}
              >
                Residents / नागरिक
              </button>
              <button
                id="btn-lead-toggle-wards"
                onClick={() => setActiveLeaderboardType('wards')}
                className={`px-4 py-2 text-xs rounded-lg font-black uppercase transition-all cursor-pointer ${
                  activeLeaderboardType === 'wards'
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'text-slate-400'
                }`}
              >
                Sectors / क्षेत्र
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {activeLeaderboardType === 'citizens' ? (
              leaderboardList.map((hero, index) => {
                const isCurrentUser = userProfile && hero.uid === userProfile.uid;
                const rank = index + 1;

                return (
                  <div 
                    key={hero.uid} 
                    id={`hero-rank-${rank}`}
                    className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all text-left cursor-pointer ${
                      isCurrentUser 
                        ? 'border-emerald-500 bg-emerald-950/20' 
                        : 'border-slate-850 bg-[#111621]/40'
                    }`}
                    onClick={() => speakText(`${hero.displayName} is ranked ${rank} with ${hero.points} points`)}
                  >
                    <div className="flex items-center space-x-4">
                      {/* Position */}
                      <div className={`w-8 h-8 rounded-xl font-mono font-black text-xs flex items-center justify-center ${
                        rank === 1 ? 'bg-amber-500 text-slate-950 animate-pulse' :
                        rank === 2 ? 'bg-slate-300 text-slate-950' :
                        rank === 3 ? 'bg-amber-700 text-white' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {rank}
                      </div>

                      <div className="space-y-0.5 text-left">
                        <span className={`block font-black text-slate-200 ${isSimpleMode ? 'text-base' : 'text-xs'}`}>
                          {hero.displayName} {isCurrentUser && <span className="text-emerald-400 text-[10px] ml-1">(You)</span>}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold block">
                          Filed {hero.reportsCreatedCount || 2} reports • Checked {hero.verificationsCount || 4} problems
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3.5">
                      <div className="text-right">
                        <span className="block text-sm font-black text-emerald-400 font-mono">{hero.points} pts</span>
                        <span className="text-[8px] uppercase font-bold text-slate-500 block">Helper XP</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              sortedWards.map((ward, index) => {
                const rank = index + 1;
                const totalXp = ward.level * 1000 + ward.xp;

                return (
                  <div 
                    key={ward.id} 
                    id={`ward-rank-${rank}`}
                    className="p-4 rounded-2xl border-2 border-slate-850 bg-[#111621]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left"
                  >
                    <div className="flex items-start sm:items-center space-x-4">
                      <div className="w-9 h-9 rounded-xl font-mono font-black text-sm flex items-center justify-center bg-slate-950 border border-slate-800">
                        {rank === 1 ? <Trophy className="w-4 h-4 text-amber-400" /> : `#${rank}`}
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-slate-200 uppercase">{ward.name}</h4>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-450">
                          <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 font-bold">
                            LEVEL {ward.level}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between sm:justify-end items-center gap-4">
                      <div className="text-left sm:text-right font-mono">
                        <span className="block text-[8px] text-slate-500 uppercase">Area Condition</span>
                        <span className="text-xs font-black text-emerald-400">
                          {ward.healthScores.overall} / 100
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="block text-xs font-black text-emerald-400">{totalXp} XP</span>
                        <span className="text-[8px] text-slate-500 block uppercase">Area Pool</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Badges Achievements */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Challenges */}
          <div className="p-5 bg-[#0c1017] border-2 border-slate-800 rounded-3xl space-y-4 shadow-xl">
            <h3 className={`font-black text-white ${isSimpleMode ? 'text-lg' : 'text-sm'}`}>
              Neighborhood Challenges (वार्ड प्रतियोगिता)
            </h3>
            <p className="text-xs text-slate-450 leading-relaxed text-slate-400">
              Complete these active challenges together with your neighborhood neighbors!
            </p>

            <div className="space-y-3 pt-1">
              {challenges.map((c) => {
                const leader = c.leaders && c.leaders.length > 0 ? c.leaders[0] : { zoneName: 'Analyzing...', value: '...' };
                return (
                  <div key={c.id} className="p-3.5 bg-[#111621] border border-slate-800 rounded-2xl space-y-2 text-left">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-slate-200">{c.title}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold flex items-center text-[10px]">
                        <MapPin className="w-3.5 h-3.5 text-emerald-500 inline mr-1" /> Leader: {leader.zoneName}
                      </span>
                      <span className="font-bold text-emerald-400 font-mono">{leader.value}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Badges Lock Checklist */}
          <div className="p-5 bg-[#0c1017] border-2 border-slate-800 rounded-3xl space-y-4 shadow-xl">
            <h3 className={`font-black text-white flex items-center gap-1.5 ${isSimpleMode ? 'text-lg' : 'text-sm'}`}>
              <Award className="w-4.5 h-4.5 text-amber-500" /> Awards & Badges (पुरस्कार और बिल्ले)
            </h3>
            
            <div className="space-y-3 pt-1">
              {badgeLibrary.map((b) => {
                const IconComp = b.icon;
                const hasBadge = userProfile?.badges?.some((ownerB: any) => ownerB.id === b.id);

                return (
                  <div 
                    key={b.id} 
                    className={`p-3.5 rounded-2xl border flex items-start space-x-3.5 transition-all text-left ${
                      hasBadge 
                        ? 'border-emerald-500 bg-emerald-950/10' 
                        : 'border-slate-850 bg-slate-900/10 opacity-60'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${b.color} flex-shrink-0 mt-0.5`}>
                      <IconComp className="w-4 h-4" />
                    </div>

                    <div className="flex-1 space-y-1 text-xs">
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-slate-200 font-bold">{b.name}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${
                          hasBadge 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {hasBadge ? 'Unlocked' : 'Locked'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight">{b.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
