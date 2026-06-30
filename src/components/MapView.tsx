import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Minus, 
  MapPin, 
  Activity, 
  Eye, 
  AlertTriangle, 
  Sparkles, 
  ShieldAlert, 
  ThumbsUp,
  ThumbsDown,
  Navigation,
  CheckSquare,
  HelpCircle,
  Wifi,
  WifiOff,
  Database,
  Download,
  RefreshCw,
  Check,
  Map as MapIcon
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Ensure window.L is set before importing leaflet.heat dynamically to prevent hoisting issues in Vite
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.L = L;
  // @ts-ignore
  import('leaflet.heat');
}
import { CivicReport, DigitalTwinZone, PredictionHotspot } from '../types';
import { submitVerification, submitVote } from '../lib/firebase';
import { useLanguage } from '../lib/LanguageContext';

interface MapViewProps {
  reports: CivicReport[];
  zones: DigitalTwinZone[];
  predictions: PredictionHotspot[];
  user: any;
  onRefreshData: () => void;
  selectedReportId?: string;
  onClearSelectedReport?: () => void;
  onNavigate?: (tab: string) => void;
}

export default function MapView({ 
  reports, 
  zones, 
  predictions, 
  user, 
  onRefreshData,
  selectedReportId,
  onClearSelectedReport,
  onNavigate
}: MapViewProps) {
  
  const { language, speakText } = useLanguage();
  
  // Local states
  const [zoom, setZoom] = useState(13);
  const [viewMode, setViewMode] = useState<'normal' | 'heatmap' | 'digital_twin' | 'predictions'>('digital_twin');
  const [heatPluginLoaded, setHeatPluginLoaded] = useState(false);
  const [mapEngine, setMapEngine] = useState<'dark' | 'standard' | 'vector'>(() => {
    if (typeof document !== 'undefined') {
      return document.querySelector('.dark') !== null ? 'dark' : 'standard';
    }
    return 'dark';
  });

  // Handle asynchronous dynamic import of leaflet.heat safely for heatmap modes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.L = L;
      // @ts-ignore
      if (L.heatLayer) {
        setHeatPluginLoaded(true);
      } else {
        // @ts-ignore
        import('leaflet.heat')
          .then(() => {
            setHeatPluginLoaded(true);
          })
          .catch((err) => {
            console.error("Failed to load leaflet.heat plugin", err);
          });
      }
    }
  }, []);

  // Listen to the global theme dynamically and update map tiles accordingly
  useEffect(() => {
    const isDark = document.querySelector('.dark') !== null;
    setMapEngine(isDark ? 'dark' : 'standard');

    const observer = new MutationObserver(() => {
      const darkActive = document.querySelector('.dark') !== null;
      setMapEngine(darkActive ? 'dark' : 'standard');
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);
  const [googleMapCenter, setGoogleMapCenter] = useState<{ lat: number, lng: number } | null>(null);

  const [selectedReport, setSelectedReport] = useState<CivicReport | null>(null);
  const [selectedTwinZone, setSelectedTwinZone] = useState<DigitalTwinZone | null>(null);
  const [selectedPredictiveHotspot, setSelectedPredictiveHotspot] = useState<PredictionHotspot | null>(null);

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [tempReportCoords, setTempReportCoords] = useState<[number, number] | null>(null);

  // Smart Layers Toggles
  const [showHealthOverlay, setShowHealthOverlay] = useState(true);
  const [showRoadOverlay, setShowRoadOverlay] = useState(true);
  const [showWaterOverlay, setShowWaterOverlay] = useState(true);
  const [showGarbageOverlay, setShowGarbageOverlay] = useState(true);
  const [showSafetyOverlay, setShowSafetyOverlay] = useState(true);
  const [showPredictionOverlay, setShowPredictionOverlay] = useState(true);
  const [showLiveActivity, setShowLiveActivity] = useState(true);

  // Global Map Filters
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Time machine timeline values (July 2025 to June 2026)
  const timelineMonths = useMemo(() => [
    'Jul 2025', 'Aug 2025', 'Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025',
    'Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026'
  ], []);
  const [timeIndex, setTimeIndex] = useState(11); // Default to current (index 11)
  const [isPlaying, setIsPlaying] = useState(false);

  // Auto-play timer for timeline slider
  useEffect(() => {
    let timer: any = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setTimeIndex((prev) => {
          if (prev >= timelineMonths.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, timelineMonths]);

  // Leaflet refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  // Connection and Offline Caching states
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);

  // Calculate dynamic bounding box of all markers/zones to make the map auto-center anywhere in India/the world!
  const bounds = useMemo(() => {
    const lats = reports.map(r => r.location?.lat).concat(zones.map(z => z.coordinates?.lat)).concat(predictions.map(p => p.lat)).filter(l => l !== undefined && l !== null && !isNaN(l));
    const lngs = reports.map(r => r.location?.lng).concat(zones.map(z => z.coordinates?.lng)).concat(predictions.map(p => p.lng)).filter(l => l !== undefined && l !== null && !isNaN(l));

    if (lats.length === 0 || lngs.length === 0) {
      return {
        latMin: 26.8200,
        latMax: 26.9000,
        lngMin: 80.8800,
        lngMax: 80.9900
      };
    }

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latSpan = Math.max(0.01, maxLat - minLat);
    const lngSpan = Math.max(0.01, maxLng - minLng);

    return {
      latMin: minLat - latSpan * 0.15,
      latMax: maxLat + latSpan * 0.15,
      lngMin: minLng - lngSpan * 0.15,
      lngMax: maxLng + lngSpan * 0.15
    };
  }, [reports, zones, predictions]);

  // Dynamic average center calculated from bounds
  const centerLat = useMemo(() => {
    return (bounds.latMax + bounds.latMin) / 2;
  }, [bounds]);

  const centerLng = useMemo(() => {
    return (bounds.lngMax + bounds.lngMin) / 2;
  }, [bounds]);
  const [isCaching, setIsCaching] = useState(false);
  const [cacheProgress, setCacheProgress] = useState(0);
  const [cacheStepText, setCacheStepText] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    return localStorage.getItem('civic_map_last_sync') || new Date().toLocaleTimeString();
  });

  // Track physical connectivity
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Spatial database caching engine
  const triggerCacheDownload = () => {
    setIsCaching(true);
    setCacheProgress(0);
    
    const steps = [
      { progress: 15, text: language === 'hi' ? 'स्थानीय वार्ड सीमाओं से जुड़ रहा है...' : 'Connecting to local ward map...' },
      { progress: 35, text: language === 'hi' ? 'सड़क और वार्ड सीमाओं को सहेज रहा है...' : 'Caching street layout curves...' },
      { progress: 60, text: language === 'hi' ? `सक्रिय ${reports.length} नागरिक रिपोर्ट चिह्नित कर रहा है...` : `Bundling ${reports.length} active civic markers...` },
      { progress: 85, text: language === 'hi' ? 'जिला सीमाओं और मानचित्र क्षेत्रों को सहेज रहा है...' : 'Saving offline map zones...' },
      { progress: 100, text: language === 'hi' ? 'ऑफ़लाइन मानचित्र डेटा सिंक कर रहा है...' : 'Syncing offline map databases...' }
    ];

    let currentStepIdx = 0;
    
    const interval = setInterval(() => {
      if (currentStepIdx < steps.length) {
        const step = steps[currentStepIdx];
        setCacheProgress(step.progress);
        setCacheStepText(step.text);
        currentStepIdx++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsCaching(false);
          const nowStr = new Date().toLocaleTimeString();
          setLastSyncTime(nowStr);
          localStorage.setItem('civic_map_last_sync', nowStr);
          speakText(
            language === 'hi' 
              ? "ऑफ़लाइन मैप डेटा पूरी तरह से सहेज लिया गया है। अब आप बिना नेटवर्क के काम कर सकते हैं।" 
              : "Offline spatial cache successfully synced. Ready for field operations."
          );
        }, 500);
      }
    }, 500);
  };

  // spatial grid-based clustering
  const getClusteredMarkers = (reps: CivicReport[], currentZoom: number) => {
    const gridSize = 0.04 / Math.pow(2, currentZoom - 10);
    const clusters: {
      id: string;
      center: { lat: number; lng: number };
      count: number;
      reports: CivicReport[];
      severity: 'critical' | 'high' | 'normal';
    }[] = [];

    reps.forEach(report => {
      let foundCluster = false;
      for (const cluster of clusters) {
        const distance = Math.sqrt(
          Math.pow(cluster.center.lat - report.location.lat, 2) +
          Math.pow(cluster.center.lng - report.location.lng, 2)
        );
        if (distance < gridSize) {
          cluster.reports.push(report);
          cluster.count++;
          cluster.center.lat = (cluster.center.lat * (cluster.count - 1) + report.location.lat) / cluster.count;
          cluster.center.lng = (cluster.center.lng * (cluster.count - 1) + report.location.lng) / cluster.count;
          if (report.severity === 'critical') {
            cluster.severity = 'critical';
          } else if (report.severity === 'high' && cluster.severity !== 'critical') {
            cluster.severity = 'high';
          }
          foundCluster = true;
          break;
        }
      }
      if (!foundCluster) {
        clusters.push({
          id: `cluster-${report.id}`,
          center: { lat: report.location.lat, lng: report.location.lng },
          count: 1,
          reports: [report],
          severity: report.severity === 'critical' ? 'critical' : (report.severity === 'high' ? 'high' : 'normal')
        });
      }
    });

    return clusters;
  };

  const createIndividualMarker = (r: CivicReport, group: L.LayerGroup) => {
    const isSelected = selectedReport?.id === r.id;
    const isResolved = r.status === 'resolved';

    // Get Emoji representation
    let emoji = '📍';
    if (isResolved) {
      emoji = '✅';
    } else {
      switch (r.category) {
        case 'pothole': emoji = '🕳️'; break;
        case 'garbage': emoji = '🗑️'; break;
        case 'water_leakage': emoji = '💧'; break;
        case 'street_light': emoji = '💡'; break;
        case 'drainage': emoji = '🌊'; break;
        case 'illegal_dumping': emoji = '🚯'; break;
        case 'road_damage': emoji = '🚧'; break;
        case 'safety_concern': emoji = '🚨'; break;
      }
    }

    // Color definitions
    const borderCol = isSelected ? 'border-emerald-400 ring-4 ring-emerald-500/40 scale-125 font-black' :
                      isResolved ? 'border-emerald-500 bg-emerald-950/90 text-emerald-400' :
                      r.severity === 'critical' ? 'border-red-500 bg-red-950/90 text-red-400 animate-pulse' :
                      r.severity === 'high' ? 'border-amber-500 bg-amber-950/90 text-amber-400' :
                      'border-teal-500 bg-teal-950/90 text-teal-400';

    const customIcon = L.divIcon({
      html: `
        <div class="relative group">
          <div class="flex items-center justify-center w-8 h-8 rounded-full border-2 ${borderCol} shadow-xl transition-transform duration-200 hover:scale-110">
            <span class="text-sm">${emoji}</span>
          </div>
          <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-r border-b ${
            isSelected ? 'bg-emerald-400 border-emerald-400' : 'bg-[#040810] border-teal-950/45'
          }"></div>
        </div>
      `,
      className: 'leaflet-custom-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });

    const marker = L.marker([r.location.lat, r.location.lng], { icon: customIcon }).addTo(group);
    
    marker.on('click', () => {
      setSelectedReport(r);
      setSelectedTwinZone(null);
      setSelectedPredictiveHotspot(null);
      setGoogleMapCenter({ lat: r.location.lat, lng: r.location.lng });
      
      const map = mapInstanceRef.current;
      if (map) {
        map.setView([r.location.lat, r.location.lng], 14);
      }
    });

    marker.bindPopup(`
      <div class="text-slate-900 font-sans p-1 leading-normal w-[180px] text-left">
        <div class="font-extrabold text-xs truncate">${r.title}</div>
        <div class="text-[9px] uppercase font-mono text-slate-500 mt-0.5">${r.category.replace('_', ' ')} • ${r.severity}</div>
        <div class="text-[10px] text-slate-600 mt-1 line-clamp-2">${r.description}</div>
        <div class="text-[9px] font-mono text-slate-400 mt-1.5">${new Date(r.createdAt).toLocaleDateString()}</div>
      </div>
    `);

    if (isSelected) {
      marker.openPopup();
    }
  };

  const handleLocateUser = () => {
    if (navigator.geolocation) {
      speakText(language === 'hi' ? 'आपकी लोकेशन खोजी जा रही है' : 'Acquiring your coordinates...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLocation([lat, lng]);
          setGoogleMapCenter({ lat, lng });
          
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([lat, lng], 15);
          }
          speakText(language === 'hi' ? 'स्थान प्राप्त हो गया है' : 'Coordinates loaded.');
        },
        (err) => {
          console.error("GPS fetch error:", err);
          speakText(language === 'hi' ? 'लोकेशन प्राप्त करने में त्रुटि' : 'Unable to acquire GPS signal.');
        }
      );
    } else {
      speakText(language === 'hi' ? 'जीपीएस अनुपलब्ध' : 'Geolocation is not supported by your browser.');
    }
  };

  // Create Leaflet map instance
  useEffect(() => {
    if (mapEngine === 'vector') {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      return;
    }

    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const initCenter: [number, number] = googleMapCenter 
      ? [googleMapCenter.lat, googleMapCenter.lng] 
      : (selectedReport?.location 
          ? [selectedReport.location.lat, selectedReport.location.lng] 
          : [centerLat || 26.8467, centerLng || 80.9462]);

    const map = L.map(mapContainerRef.current, {
      center: initCenter,
      zoom: zoom,
      zoomControl: false,
      attributionControl: true
    });

    const tileUrl = mapEngine === 'dark' 
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const attribution = mapEngine === 'dark'
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    L.tileLayer(tileUrl, { attribution }).addTo(map);

    const group = L.layerGroup().addTo(map);
    layerGroupRef.current = group;

    mapInstanceRef.current = map;

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setTempReportCoords([lat, lng]);
    });

    map.on('zoomend', () => {
      setZoom(map.getZoom());
    });

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapEngine]);

  // Center map on selections
  useEffect(() => {
    if (mapInstanceRef.current) {
      if (googleMapCenter) {
        mapInstanceRef.current.setView([googleMapCenter.lat, googleMapCenter.lng]);
      } else if (selectedReport?.location) {
        mapInstanceRef.current.setView([selectedReport.location.lat, selectedReport.location.lng]);
      }
    }
  }, [googleMapCenter, selectedReport]);

  // Compute active timeframe end timestamp (July 2025 starts, timeIndex is 0 to 11)
  const activeTimeframeEnd = useMemo(() => {
    const startYear = 2025;
    const startMonthOffset = 6; // July
    const monthTotal = startMonthOffset + timeIndex;
    const year = startYear + Math.floor(monthTotal / 12);
    const month = monthTotal % 12;
    // Return end of selected month (e.g., month + 1, day 0)
    return new Date(year, month + 1, 0, 23, 59, 59).getTime();
  }, [timeIndex]);

  // Dynamic filter application
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      // 1. Time Travel filter
      if (r.createdAt > activeTimeframeEnd) return false;

      // 2. Category filter
      if (filterCategory !== 'all' && r.category !== filterCategory) return false;

      // 3. Severity filter
      if (filterSeverity !== 'all' && r.severity !== filterSeverity) return false;

      // 4. Status filter with time adjustment (re-opens resolved issues if they were active in that month!)
      const adjustedStatus = (r.status === 'resolved' && r.resolvedAt && r.resolvedAt > activeTimeframeEnd)
        ? 'in_progress'
        : r.status;

      if (filterStatus !== 'all') {
        if (filterStatus === 'active' && adjustedStatus === 'resolved') return false;
        if (filterStatus === 'resolved' && adjustedStatus !== 'resolved') return false;
        if (filterStatus === 'pending' && adjustedStatus !== 'reported' && adjustedStatus !== 'verified') return false;
      }

      return true;
    });
  }, [reports, activeTimeframeEnd, filterCategory, filterSeverity, filterStatus]);

  // Dynamic Digital Twin Zones computation based on historical timeframe issues
  const computedZones = useMemo(() => {
    return zones.map(z => {
      const zoneReports = reports.filter(r => {
        if (r.createdAt > activeTimeframeEnd) return false;
        const dist = Math.sqrt(
          Math.pow(r.location.lat - z.coordinates.lat, 2) +
          Math.pow(r.location.lng - z.coordinates.lng, 2)
        );
        return dist < 0.015; // roughly 1.5km radius
      });

      const unresolved = zoneReports.filter(r => {
        const adjustedStatus = (r.status === 'resolved' && r.resolvedAt && r.resolvedAt > activeTimeframeEnd)
          ? 'in_progress'
          : r.status;
        return adjustedStatus !== 'resolved';
      }).length;

      const critical = zoneReports.filter(r => {
        const adjustedStatus = (r.status === 'resolved' && r.resolvedAt && r.resolvedAt > activeTimeframeEnd)
          ? 'in_progress'
          : r.status;
        return adjustedStatus !== 'resolved' && r.severity === 'critical';
      }).length;

      const baseHealth = 100 - (unresolved * 7) - (critical * 14);
      const healthScore = Math.max(25, Math.min(98, Math.round(baseHealth)));

      return {
        ...z,
        healthScore,
        activeIssuesCount: unresolved,
        resolvedIssuesCount: zoneReports.length - unresolved
      };
    });
  }, [zones, reports, activeTimeframeEnd]);

  // Road Corridors config
  const roadCorridors = useMemo(() => {
    const isBangalore = centerLat < 15;
    if (isBangalore) {
      return [
        {
          id: 'corridor-1',
          name: 'M.G. Road Expressway (एम जी रोड)',
          coordinates: [
            [12.975, 77.585],
            [12.974, 77.610],
            [12.973, 77.640]
          ] as [number, number][],
          baseQuality: 88
        },
        {
          id: 'corridor-2',
          name: 'Indiranagar Ring Road (इंदिरा नगर ओ आर आर)',
          coordinates: [
            [12.960, 77.641],
            [12.978, 77.642],
            [12.990, 77.643]
          ] as [number, number][],
          baseQuality: 74
        },
        {
          id: 'corridor-3',
          name: 'Koramangala Block Corridor (कोरामंगला)',
          coordinates: [
            [12.930, 77.615],
            [12.934, 77.628],
            [12.942, 77.645]
          ] as [number, number][],
          baseQuality: 58
        }
      ];
    } else {
      return [
        {
          id: 'corridor-1',
          name: 'Hazratganj Main Avenue (हजरतगंज एवेन्यू)',
          coordinates: [
            [26.850, 80.935],
            [26.852, 80.945],
            [26.855, 80.960]
          ] as [number, number][],
          baseQuality: 92
        },
        {
          id: 'corridor-2',
          name: 'Gomti Nagar Expressway (गोमती नगर)',
          coordinates: [
            [26.840, 80.950],
            [26.855, 80.965],
            [26.865, 80.975]
          ] as [number, number][],
          baseQuality: 78
        },
        {
          id: 'corridor-3',
          name: 'Aminabad Heritage Corridor (अमीनाबाद)',
          coordinates: [
            [26.841, 80.920],
            [26.845, 80.925],
            [26.850, 80.932]
          ] as [number, number][],
          baseQuality: 50
        }
      ];
    }
  }, [centerLat]);

  // Compute live Road Quality index dynamically based on local complaints
  const computedRoads = useMemo(() => {
    return roadCorridors.map(road => {
      const roadIssues = filteredReports.filter(r => {
        const adjustedStatus = (r.status === 'resolved' && r.resolvedAt && r.resolvedAt > activeTimeframeEnd)
          ? 'in_progress'
          : r.status;
        if (adjustedStatus === 'resolved') return false;
        if (r.category !== 'pothole' && r.category !== 'road_damage') return false;

        return road.coordinates.some(coord => {
          const dist = Math.sqrt(
            Math.pow(r.location.lat - coord[0], 2) +
            Math.pow(r.location.lng - coord[1], 2)
          );
          return dist < 0.006; // within ~600 meters
        });
      });

      const penalty = roadIssues.length * 12;
      const qualityScore = Math.max(15, Math.min(100, road.baseQuality - penalty));

      return {
        ...road,
        qualityScore,
        activeIssuesCount: roadIssues.length
      };
    });
  }, [roadCorridors, filteredReports, activeTimeframeEnd]);

  // Live community field activities
  const liveActivities = useMemo(() => {
    const isBangalore = centerLat < 15;
    const baseLat = isBangalore ? 12.97 : 26.85;
    const baseLng = isBangalore ? 77.61 : 80.95;

    return [
      {
        id: 'act-1',
        worker: language === 'hi' ? 'फील्ड तकनीशियन अमित' : 'Field Lead Amit',
        action: language === 'hi' ? 'पानी के पाइप रिसाव जांच' : 'Water pipeline leak inspection',
        lat: baseLat + 0.005,
        lng: baseLng - 0.008,
        time: 'Active Now',
        icon: '🔧'
      },
      {
        id: 'act-2',
        worker: language === 'hi' ? 'सफाई निरीक्षक राहुल' : 'Sanitation Lead Rahul',
        action: language === 'hi' ? 'ठोस कचरा हॉटस्पॉट सत्यापन' : 'Solid waste accumulation verification',
        lat: baseLat - 0.008,
        lng: baseLng + 0.005,
        time: '2 mins ago',
        icon: '🗑️'
      },
      {
        id: 'act-3',
        worker: language === 'hi' ? 'नागरिक स्वयंसेवक प्रिया' : 'Volunteer Priya',
        action: language === 'hi' ? 'पॉटहोल मरम्मत की फोटो अपलोड की' : 'Uploaded resolution feedback image',
        lat: baseLat + 0.012,
        lng: baseLng + 0.003,
        time: '5 mins ago',
        icon: '📸'
      },
      {
        id: 'act-4',
        worker: language === 'hi' ? 'स्मार्ट पोल #११' : 'Smart Pole #11',
        action: language === 'hi' ? 'कम रोशनी ऑटो-अलर्ट प्रेषण' : 'Autodispatched low visibility hazard warning',
        lat: baseLat - 0.003,
        lng: baseLng - 0.012,
        time: 'Just now',
        icon: '💡'
      }
    ];
  }, [centerLat, language]);

  // Sync Leaflet map layers dynamically
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    if (circleRef.current) {
      circleRef.current.remove();
      circleRef.current = null;
    }

    // 1. Current User Coordinates Pin
    if (userLocation) {
      const userIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center w-6 h-6">
            <span class="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-blue-600 border border-white"></span>
          </div>
        `,
        className: 'user-loc-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      L.marker(userLocation, { icon: userIcon })
        .addTo(group)
        .bindPopup(`<span class="font-bold text-xs text-slate-800">${language === 'hi' ? 'आपकी वर्तमान स्थिति' : 'Your Current Location'}</span>`);
    }

    // 2. Click-to-create Report Coordinates Pin
    if (tempReportCoords) {
      const tempIcon = L.divIcon({
        html: `
          <div class="relative animate-bounce">
            <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1.5 bg-black/40 rounded-full blur-[1px]"></div>
            <div class="flex items-center justify-center w-8 h-8 rounded-full bg-rose-500 border-2 border-white shadow-xl text-white font-extrabold text-xs">
              ➕
            </div>
          </div>
        `,
        className: 'temp-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      });

      const buttonText = language === 'hi' ? 'यहाँ नया मुद्दा रिपोर्ट करें' : 'Report An Issue Here';
      const tempMarker = L.marker(tempReportCoords, { icon: tempIcon })
        .addTo(group)
        .bindPopup(() => {
          const div = document.createElement('div');
          div.className = 'p-1 text-slate-900 font-sans space-y-1.5';
          div.innerHTML = `
            <div class="font-bold text-xs">${language === 'hi' ? 'नया मुद्दा जोड़ें' : 'Report New Issue'}</div>
            <div class="text-[10px] text-slate-500">${tempReportCoords[0].toFixed(5)}, ${tempReportCoords[1].toFixed(5)}</div>
            <button id="btn-create-report-at-coords" class="w-full bg-emerald-600 text-white font-bold text-[10px] py-1 px-2 rounded hover:bg-emerald-700 transition-colors cursor-pointer">
              ${buttonText}
            </button>
          `;
          setTimeout(() => {
            const btn = document.getElementById('btn-create-report-at-coords');
            if (btn) {
              btn.onclick = () => {
                localStorage.setItem('pending_report_coords', JSON.stringify({ lat: tempReportCoords[0], lng: tempReportCoords[1] }));
                if (onNavigate) {
                  onNavigate('report');
                }
              };
            }
          }, 50);
          return div;
        });

      tempMarker.openPopup();

      circleRef.current = L.circle(tempReportCoords, {
        radius: 500,
        color: '#f43f5e',
        fillColor: '#fda4af',
        fillOpacity: 0.1,
        weight: 1,
        dashArray: '3 3'
      }).addTo(map);
    }

    // 3. Civic Health Score Overlay (Futuristic Digital Twin Circles)
    if (showHealthOverlay) {
      computedZones.forEach(z => {
        const isSelected = selectedTwinZone?.id === z.id;
        const borderCol = z.healthScore < 50 ? '#ef4444' : z.healthScore < 75 ? '#f59e0b' : '#10b981';
        const fillCol = z.healthScore < 50 ? '#f87171' : z.healthScore < 75 ? '#fbbf24' : '#34d399';

        const circle = L.circle([z.coordinates.lat, z.coordinates.lng], {
          radius: 700, // ~700 meters
          color: borderCol,
          fillColor: fillCol,
          fillOpacity: isSelected ? 0.35 : 0.14,
          weight: isSelected ? 3 : 1.5,
          dashArray: isSelected ? '4 4' : undefined
        }).addTo(group);

        circle.on('click', () => {
          setSelectedTwinZone(z);
          setSelectedReport(null);
          setSelectedPredictiveHotspot(null);
          if (onClearSelectedReport) onClearSelectedReport();
          map.setView([z.coordinates.lat, z.coordinates.lng], 14);
        });

        circle.bindTooltip(`
          <div class="font-mono text-[10px] p-1.5 text-slate-100 bg-[#020408]/95 border border-teal-950/40 rounded shadow-2xl">
            <div class="font-bold text-teal-400 text-xs">${z.name}</div>
            <div class="mt-1">Civic Health Score: <span class="font-extrabold text-white">${z.healthScore}%</span></div>
            <div>Active Complaints: <span class="text-red-400 font-bold">${z.activeIssuesCount}</span></div>
            <div>Closed Tickets: <span class="text-emerald-400 font-bold">${z.resolvedIssuesCount}</span></div>
          </div>
        `, { sticky: true });
      });
    }

    // 4. Road Condition Overlay (Thick glowing vectors with flows)
    if (showRoadOverlay) {
      computedRoads.forEach(road => {
        const borderCol = road.qualityScore < 50 ? '#f43f5e' : road.qualityScore < 75 ? '#f59e0b' : '#10b981';
        const animClass = road.qualityScore > 75 ? 'animated-road-good' : road.qualityScore > 50 ? 'animated-road-fair' : 'animated-road-poor';

        const polyline = L.polyline(road.coordinates, {
          color: borderCol,
          weight: 4.5,
          opacity: 0.75,
          className: animClass
        }).addTo(group);

        polyline.bindPopup(`
          <div class="text-slate-900 font-sans p-2 leading-normal w-[190px]">
            <div class="font-extrabold text-xs text-slate-800">${road.name}</div>
            <div class="text-[9px] font-mono text-slate-400 mt-0.5 uppercase tracking-wide">Live Road Quality Telemetry</div>
            <div class="text-[11px] text-slate-600 mt-1.5">
              Roughness Index: <span class="font-extrabold ${road.qualityScore < 50 ? 'text-red-500 animate-pulse' : road.qualityScore < 75 ? 'text-amber-500' : 'text-emerald-600'}">${road.qualityScore}/100</span>
            </div>
            <div class="text-[9px] text-slate-500 mt-1">${road.activeIssuesCount} unpatched road hazards recorded on this stretch.</div>
          </div>
        `);
      });
    }

    // 5. Water Leakage Hotspots Overlay (Cybernetic acoustic blue ripples)
    if (showWaterOverlay) {
      filteredReports
        .filter(r => r.category === 'water_leakage' || r.category === 'drainage')
        .forEach(r => {
          const waterIcon = L.divIcon({
            html: `
              <div class="relative flex items-center justify-center w-8 h-8">
                <span class="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75 ripple-ring-cyan"></span>
                <span class="relative flex items-center justify-center rounded-full h-4 w-4 bg-cyan-600 border border-white text-[10px] shadow-md">💧</span>
              </div>
            `,
            className: 'water-ripple-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });

          L.marker([r.location.lat, r.location.lng], { icon: waterIcon })
            .addTo(group)
            .on('click', () => {
              setSelectedReport(r);
              setSelectedTwinZone(null);
              setSelectedPredictiveHotspot(null);
              map.setView([r.location.lat, r.location.lng], 14);
            })
            .bindTooltip(`
              <div class="font-mono text-[9px] p-1 bg-[#020408]/90 text-cyan-300 rounded border border-cyan-800 shadow">
                💧 Pipeline Leak Alert
              </div>
            `, { sticky: true });
        });
    }

    // 6. Garbage Hotspot Heatmap & Warning Nodes
    if (showGarbageOverlay) {
      // Draw heat points if L.heatLayer exists
      // @ts-ignore
      if (L.heatLayer) {
        const heatPoints = filteredReports
          .filter(r => r.category === 'garbage' || r.category === 'illegal_dumping')
          .map(r => [
            r.location.lat,
            r.location.lng,
            r.severity === 'critical' ? 1.0 : r.severity === 'high' ? 0.75 : 0.45
          ]);

        if (heatPoints.length > 0) {
          // @ts-ignore
          const heat = L.heatLayer(heatPoints, {
            radius: 35,
            blur: 18,
            maxZoom: 15
          });
          heat.addTo(group);
        }
      }

      // Draw high-visibility warning trash pins on top
      filteredReports
        .filter(r => r.category === 'garbage' || r.category === 'illegal_dumping')
        .forEach(r => {
          const garbageIcon = L.divIcon({
            html: `
              <div class="relative flex items-center justify-center w-8 h-8">
                <span class="absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-60 ripple-ring-red"></span>
                <span class="relative flex items-center justify-center rounded-full h-4 w-4 bg-amber-700 border border-white text-[10px] shadow-md">🗑️</span>
              </div>
            `,
            className: 'garbage-pulse-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });

          L.marker([r.location.lat, r.location.lng], { icon: garbageIcon })
            .addTo(group)
            .on('click', () => {
              setSelectedReport(r);
              setSelectedTwinZone(null);
              setSelectedPredictiveHotspot(null);
              map.setView([r.location.lat, r.location.lng], 14);
            })
            .bindTooltip(`
              <div class="font-mono text-[9px] p-1 bg-[#020408]/90 text-amber-400 rounded border border-amber-700 shadow">
                🗑️ Waste Accumulation Center
              </div>
            `, { sticky: true });
        });
    }

    // 6b. General Incident Density Heatmap (Active in 'heatmap' View Mode)
    if (viewMode === 'heatmap') {
      // @ts-ignore
      if (L.heatLayer) {
        const heatPoints = filteredReports.map(r => [
          r.location.lat,
          r.location.lng,
          r.severity === 'critical' ? 1.0 : r.severity === 'high' ? 0.75 : 0.45
        ]);

        if (heatPoints.length > 0) {
          // @ts-ignore
          const heat = L.heatLayer(heatPoints, {
            radius: 35,
            blur: 18,
            maxZoom: 15
          });
          heat.addTo(group);
        }
      }
    }

    // 7. Safety Risk Zones (Low Lux visibility red transparent bounds)
    if (showSafetyOverlay) {
      filteredReports
        .filter(r => r.category === 'safety_concern' || r.category === 'street_light')
        .forEach(r => {
          // Glow buffer area
          L.circle([r.location.lat, r.location.lng], {
            radius: 160,
            color: '#f43f5e',
            fillColor: '#f43f5e',
            fillOpacity: 0.12,
            weight: 1,
            dashArray: '3 3'
          }).addTo(group);

          const safetyIcon = L.divIcon({
            html: `
              <div class="relative flex items-center justify-center w-8 h-8">
                <span class="absolute inline-flex h-6 w-6 rounded-full bg-rose-500 opacity-50 ripple-ring-red"></span>
                <span class="relative flex items-center justify-center rounded-full h-4 w-4 bg-rose-600 border border-white text-[9px] shadow-md">🚨</span>
              </div>
            `,
            className: 'safety-hazard-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });

          L.marker([r.location.lat, r.location.lng], { icon: safetyIcon })
            .addTo(group)
            .on('click', () => {
              setSelectedReport(r);
              setSelectedTwinZone(null);
              setSelectedPredictiveHotspot(null);
              map.setView([r.location.lat, r.location.lng], 14);
            })
            .bindTooltip(`
              <div class="font-mono text-[9px] p-1 bg-[#020408]/90 text-rose-400 rounded border border-rose-700 shadow">
                🚨 Public Safety Risk Area
              </div>
            `, { sticky: true });
        });
    }

    // 8. Predicted future issue hotspots (Gemini ML Anomalies)
    if (showPredictionOverlay) {
      predictions.forEach(p => {
        const isSelected = selectedPredictiveHotspot?.id === p.id;
        const borderCol = isSelected ? 'border-cyan-400 ring-2 ring-cyan-400 bg-cyan-950/80 text-white scale-105 animate-bounce' : 'border-cyan-500 bg-[#040810]/95 text-cyan-400';

        // Draw dotted predicted repair zone
        L.circle([p.lat, p.lng], {
          radius: 250,
          color: '#c084fc',
          fillColor: '#d8b4fe',
          fillOpacity: 0.08,
          weight: 1.2,
          dashArray: '2 4'
        }).addTo(group);

        const predIcon = L.divIcon({
          html: `
            <div class="flex items-center justify-center space-x-1 px-2.5 py-1.5 rounded-full border ${borderCol} shadow-2xl font-mono text-[10px] animate-pulse">
              <span class="text-xs">🔮</span>
              <span class="font-extrabold">${p.riskScore}% Risk</span>
            </div>
          `,
          className: 'leaflet-prediction-icon',
          iconSize: [85, 28],
          iconAnchor: [42, 14]
        });

        L.marker([p.lat, p.lng], { icon: predIcon })
          .addTo(group)
          .on('click', () => {
            setSelectedPredictiveHotspot(p);
            setSelectedReport(null);
            setSelectedTwinZone(null);
            if (onClearSelectedReport) onClearSelectedReport();
            map.setView([p.lat, p.lng], 14);
          });
      });
    }

    // 9. Live community activity beacons
    if (showLiveActivity) {
      liveActivities.forEach(act => {
        const liveIcon = L.divIcon({
          html: `
            <div class="relative flex items-center justify-center w-8 h-8">
              <span class="absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-80 ripple-ring-cyan"></span>
              <span class="relative flex items-center justify-center rounded-full h-4 w-4 bg-lime-500 border border-white text-[10px] shadow-lg">${act.icon}</span>
            </div>
          `,
          className: 'live-telemetry-marker',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        L.marker([act.lat, act.lng], { icon: liveIcon })
          .addTo(group)
          .bindTooltip(`
            <div class="font-mono text-[9px] p-1.5 bg-[#020408]/95 text-lime-400 rounded border border-lime-800 shadow-2xl text-left">
              <div class="font-bold flex items-center text-[10px]">
                <span class="w-1.5 h-1.5 rounded-full bg-lime-400 inline-block mr-1.5 animate-ping"></span> ${act.worker}
              </div>
              <div class="text-slate-300 text-[8px] mt-0.5">${act.action}</div>
              <div class="text-slate-500 text-[7px] mt-0.5 font-sans">${act.time}</div>
            </div>
          `, { sticky: true });
      });
    }

    // 10. Default General / Normal Pins (Shown in normal, digital twin, and predictions modes so pins are always visible and clickable)
    if (viewMode === 'normal' || viewMode === 'digital_twin' || viewMode === 'predictions') {
      if (zoom < 14) {
        const clusters = getClusteredMarkers(filteredReports.filter(r => !r.isDuplicateMerged), zoom);
        clusters.forEach(c => {
          if (c.count === 1) {
            createIndividualMarker(c.reports[0], group);
          } else {
            const borderCol = c.severity === 'critical' ? 'border-red-500 bg-red-950/80 text-red-400 font-extrabold' :
                              c.severity === 'high' ? 'border-amber-500 bg-amber-950/80 text-amber-400 font-bold' :
                              'border-emerald-500 bg-emerald-950/80 text-emerald-400';
            const clusterIcon = L.divIcon({
              html: `
                <div class="flex items-center justify-center w-8 h-8 rounded-full border-2 ${borderCol} shadow-lg animate-pulse">
                  ${c.count}
                </div>
              `,
              className: 'leaflet-cluster-icon',
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            });

            L.marker([c.center.lat, c.center.lng], { icon: clusterIcon })
              .addTo(group)
              .on('click', () => {
                map.setView([c.center.lat, c.center.lng], map.getZoom() + 2);
              });
          }
        });
      } else {
        filteredReports.filter(r => !r.isDuplicateMerged).forEach(r => {
          createIndividualMarker(r, group);
        });
      }
    }

    // Highlighting current selection bounds circle
    if (selectedTwinZone && selectedTwinZone.coordinates) {
      circleRef.current = L.circle([selectedTwinZone.coordinates.lat, selectedTwinZone.coordinates.lng], {
        radius: 1000,
        color: '#10b981',
        fillColor: '#34d399',
        fillOpacity: 0.15,
        weight: 2.5,
        dashArray: '6 6'
      }).addTo(map);
    } else if (selectedPredictiveHotspot) {
      circleRef.current = L.circle([selectedPredictiveHotspot.lat, selectedPredictiveHotspot.lng], {
        radius: 500,
        color: '#c084fc',
        fillColor: '#d8b4fe',
        fillOpacity: 0.15,
        weight: 2.5,
        dashArray: '6 6'
      }).addTo(map);
    } else if (selectedReport && selectedReport.location) {
      circleRef.current = L.circle([selectedReport.location.lat, selectedReport.location.lng], {
        radius: 500,
        color: '#0ea5e9',
        fillColor: '#38bdf8',
        fillOpacity: 0.12,
        weight: 1.2,
        dashArray: '4 4'
      }).addTo(map);
    }

  }, [
    reports,
    computedZones,
    predictions,
    viewMode,
    googleMapCenter,
    selectedReport,
    selectedTwinZone,
    selectedPredictiveHotspot,
    tempReportCoords,
    userLocation,
    zoom,
    language,
    showHealthOverlay,
    showRoadOverlay,
    showWaterOverlay,
    showGarbageOverlay,
    showSafetyOverlay,
    showPredictionOverlay,
    showLiveActivity,
    filteredReports,
    liveActivities,
    computedRoads,
    heatPluginLoaded
  ]);

  // Verification Form states inside popup
  const [verifyComments, setVerifyComments] = useState('');
  const [verifyType, setVerifyType] = useState<'verify' | 'dispute'>('verify');
  const [submittingVerify, setSubmittingVerify] = useState(false);

  // If a report ID was requested externally
  useEffect(() => {
    if (selectedReportId) {
      const match = reports.find(r => r.id === selectedReportId);
      if (match) {
        setSelectedReport(match);
        setSelectedTwinZone(null);
        setSelectedPredictiveHotspot(null);
        if (match.location) {
          setGoogleMapCenter({ lat: match.location.lat, lng: match.location.lng });
        }
      }
    }
  }, [selectedReportId, reports]);

  // Convert GPS Coordinates to Localized Card coordinates (relative 0-100% SVG box)
  const coordsToPercent = (lat: number, lng: number) => {
    const { latMin, latMax, lngMin, lngMax } = bounds;
    
    const latDiff = latMax - latMin;
    const lngDiff = lngMax - lngMin;

    const x = lngDiff === 0 ? 50 : ((lng - lngMin) / lngDiff) * 100;
    const y = latDiff === 0 ? 50 : 100 - (((lat - latMin) / latDiff) * 100);

    return { 
      x: isNaN(x) ? 50 : Math.max(0, Math.min(100, x)), 
      y: isNaN(y) ? 50 : Math.max(0, Math.min(100, y)) 
    };
  };

  const reportMarkers = useMemo(() => {
    return reports
      .filter(r => !r.isDuplicateMerged && r.status !== 'resolved')
      .map(r => ({
        ...r,
        coords: coordsToPercent(r.location.lat, r.location.lng)
      }));
  }, [reports]);

  const resolvedMarkers = useMemo(() => {
    return reports
      .filter(r => !r.isDuplicateMerged && r.status === 'resolved')
      .map(r => ({
        ...r,
        coords: coordsToPercent(r.location.lat, r.location.lng)
      }));
  }, [reports]);

  const zonePolygons = useMemo(() => {
    return zones.map(z => ({
      ...z,
      coords: coordsToPercent(z.coordinates.lat, z.coordinates.lng)
    }));
  }, [zones]);

  const predictiveMarkers = useMemo(() => {
    return predictions.map(p => ({
      ...p,
      coords: coordsToPercent(p.lat, p.lng)
    }));
  }, [predictions]);

  // Handle active vote
  const handleVoteAction = async (reportId: string, type: 'up' | 'down') => {
    await submitVote(reportId, user.uid, type);
    onRefreshData();
    const match = reports.find(r => r.id === reportId);
    if (match) setSelectedReport(match);
  };

  // Handle peer verification
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;
    setSubmittingVerify(true);

    try {
      await submitVerification(selectedReport.id, {
        uid: user.uid,
        userName: user.displayName,
        type: verifyType,
        comments: verifyComments || (verifyType === 'verify' ? 'Verified on-site infrastructure anomaly.' : 'No trace found on relocation.'),
        createdAt: Date.now()
      });

      setVerifyComments('');
      onRefreshData();
      
      const match = reports.find(r => r.id === selectedReport.id);
      if (match) setSelectedReport(match);
      
    } catch(err) {
      console.error(err);
    } finally {
      setSubmittingVerify(false);
    }
  };

  return (
    <div className="relative h-[80vh] grid grid-cols-1 lg:grid-cols-12 gap-4 rounded-lg bg-[#020408] border border-teal-950/40 p-3 overflow-hidden text-slate-100 shadow-2xl">
      
      {/* Visual Overlay Toggles */}
      <div className="lg:col-span-8 flex flex-col relative bg-[#040810] rounded border border-teal-950/45 shadow-inner h-full min-h-[450px]">
        
        {/* Map Header Floating controls: Vercel style tabs */}
        <div id="map-layer-selector" className="absolute top-4 left-4 right-4 z-20 flex flex-wrap gap-2 justify-between items-center pointer-events-none">
          <div className="flex bg-[#020408]/90 backdrop-blur-md p-1 rounded border border-teal-950/50 shadow-lg pointer-events-auto space-x-1">
            {(['dark', 'standard', 'vector'] as const).map((eng) => {
              const active = mapEngine === eng;
              return (
                <button
                  key={eng}
                  id={`btn-map-engine-${eng}`}
                  type="button"
                  onClick={() => {
                    setMapEngine(eng);
                    setTempReportCoords(null);
                    speakText(
                      language === 'hi'
                        ? (eng === 'dark' ? 'डार्क मोड नक्शा लोड हो रहा है' : eng === 'standard' ? 'साधारण नक्शा लोड हो रहा है' : 'वेक्टर बेस मैप लोड हो रहा है')
                        : (eng === 'dark' ? 'Loading dark themed map layer' : eng === 'standard' ? 'Loading standard street map layer' : 'Switching to high-contrast Vector map')
                    );
                  }}
                  className={`px-2.5 py-1.5 text-[9px] font-mono font-bold uppercase rounded transition-all cursor-pointer flex items-center space-x-1 ${
                    active 
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <MapIcon className="w-3 h-3 text-emerald-400" />
                  <span>
                    {eng === 'dark' ? (language === 'hi' ? 'डार्क' : 'Dark Map') :
                     eng === 'standard' ? (language === 'hi' ? 'मानक' : 'Standard') :
                     (language === 'hi' ? 'वेक्टर' : 'Vector')}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex bg-[#020408]/90 backdrop-blur-md p-1 rounded border border-teal-950/50 shadow-lg pointer-events-auto">
            {(['digital_twin', 'heatmap', 'predictions', 'normal'] as const).map((mode) => {
              const active = viewMode === mode;
              return (
                <button
                  key={mode}
                  id={`btn-map-mode-${mode}`}
                  onClick={() => {
                    setViewMode(mode);
                    setSelectedReport(null);
                    setSelectedTwinZone(null);
                    setSelectedPredictiveHotspot(null);
                    if (onClearSelectedReport) onClearSelectedReport();
                  }}
                  className={`px-3 py-1.5 text-[9px] font-mono font-bold uppercase rounded transition-all cursor-pointer ${
                    active 
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {mode === 'digital_twin' ? (language === 'hi' ? 'वार्ड स्वास्थ्य' : 'Ward Health') :
                   mode === 'heatmap' ? (language === 'hi' ? 'शिकायत घनत्व' : 'Incident Density') :
                   mode === 'predictions' ? (language === 'hi' ? 'मरम्मत पूर्वानुमान' : 'Repair Forecast') :
                   (language === 'hi' ? 'सामान्य मानचित्र' : 'Standard Map')}
                </button>
              );
            })}
          </div>

          <div className="flex space-x-1 bg-[#020408]/95 backdrop-blur-md p-1 rounded border border-teal-950/50 shadow-lg pointer-events-auto">
            <button 
              id="map-zoom-in"
              onClick={() => {
                const map = mapInstanceRef.current;
                if (map) {
                  map.zoomIn();
                  setZoom(map.getZoom());
                } else {
                  setZoom(prev => Math.min(prev + 1, 15));
                }
              }}
              className="p-1 px-2 hover:bg-[#060b13] rounded font-black text-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
            </button>
            <button 
              id="map-zoom-out"
              onClick={() => {
                const map = mapInstanceRef.current;
                if (map) {
                  map.zoomOut();
                  setZoom(map.getZoom());
                } else {
                  setZoom(prev => Math.max(prev - 1, 10));
                }
              }}
              className="p-1 px-2 hover:bg-[#060b13] rounded font-black text-xs cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5 text-emerald-400" />
            </button>
            <button 
              id="map-locate-me"
              onClick={handleLocateUser}
              title="Locate Me via GPS"
              className="p-1 px-2 hover:bg-[#060b13] rounded font-black text-xs cursor-pointer border-l border-teal-950/30 flex items-center justify-center"
            >
              <Navigation className="w-3.5 h-3.5 text-sky-400" />
            </button>
          </div>
        </div>

        {/* Connection Mode Banner */}
        {(isOffline || isSimulatedOffline) && (
          <div id="offline-map-banner" className="absolute top-[64px] left-4 right-4 z-20 flex items-center justify-between px-3 py-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 backdrop-blur-md text-[10px] font-mono leading-none shadow-md pointer-events-auto">
            <div className="flex items-center space-x-2">
              <WifiOff className="w-3.5 h-3.5 animate-pulse text-amber-400" />
              <span>
                {language === 'hi' 
                  ? `ऑफ़लाइन मोड सक्रिय — इंदिरा नगर और हज़रतगंज के स्थानीय मुद्दे लोड हैं` 
                  : `OPERATING IN OFFLINE CACHE MODE — Rendered locally via lightweight mathematical SVG vectors`}
              </span>
            </div>
            <span className="text-[9px] uppercase px-1 py-0.5 bg-amber-500/20 text-amber-300 rounded font-black">
              {language === 'hi' ? 'ऑफ़लाइन' : 'Offline'}
            </span>
          </div>
        )}

        {/* Vector SVG Sandbox Map workspace: Mapbox stylized */}
        <div className="relative flex-1 bg-[#020408] overflow-hidden select-none transition-colors">
          {mapEngine !== 'vector' ? (
            <div className="w-full h-full text-slate-900 absolute inset-0 z-10">
              <div 
                ref={mapContainerRef} 
                className="w-full h-full rounded" 
                style={{ background: '#020408' }} 
              />
              
              {/* Overlay GPS Tip helper when clicking empty map */}
              <div className="absolute bottom-4 right-4 bg-[#020408]/95 border border-teal-950/55 p-2 rounded text-[9px] font-mono text-slate-400 z-20 pointer-events-none text-right max-w-[200px]">
                💡 {language === 'hi' 
                  ? 'मैप पर क्लिक करके नया शिकायत बिंदु चुनें और ५०० मीटर का दायरा देखें।' 
                  : 'Click anywhere on the map to drop a new complaint pin and draw a 500m radius.'}
              </div>
            </div>
          ) : (
            <>
              <svg 
                id="vector-map-frame"
                viewBox="10 10 80 80" 
                className="w-full h-full transform transition-all duration-300" 
                style={{ transform: `scale(${1 + (zoom - 13) * 0.15})`, transformOrigin: 'center center' }}
              >
                
                {/* Coastline Land Base layout */}
                <path 
                  d="M 12 18 Q 28 28 32 40 T 48 56 T 60 76 T 82 85 Q 92 88 100 89 L 100 0 L 0 0 Z" 
                  className="fill-[#04080e] stroke-teal-950/30" 
                  strokeWidth="0.15"
                />
                {/* Blueprint high-contrast ocean */}
                <path 
                  d="M 0 100 L 40 100 Q 55 90 70 80 T 100 68 L 100 0 L 80 0 Q 70 12 55 24 T 30 18 T 10 12 Z" 
                  className="fill-[#020408] stroke-teal-900/15" 
                  strokeWidth="0.3"
                />

                {/* Grid Coordinates helper marks */}
                {[20, 30, 40, 50, 60, 70, 80].map((coord, cIdx) => (
                  <React.Fragment key={cIdx}>
                    <line x1={coord} y1="0" x2={coord} y2="100" className="stroke-emerald-500/5" strokeWidth="0.08" strokeDasharray="1 3" />
                    <line x1="0" y1={coord} x2="100" y2={coord} className="stroke-emerald-500/5" strokeWidth="0.08" strokeDasharray="1 3" />
                  </React.Fragment>
                ))}

                {/* Major Arterial Transits / Expressways */}
                <path d="M 10 15 L 90 85" className="stroke-teal-900/15" strokeWidth="0.25" />
                <path d="M 25 10 L 75 90" className="stroke-teal-900/15" strokeWidth="0.2" />
                <path d="M 10 65 L 100 65" className="stroke-teal-905/10" strokeWidth="0.18" />
                <path d="M 45 10 L 45 100" className="stroke-teal-905/10" strokeWidth="0.15" />

                {/* View Mode: Digital Twin Boundaries */}
                {viewMode === 'digital_twin' && zonePolygons.map((z) => {
                  const isSelected = selectedTwinZone?.id === z.id;
                  return (
                    <g key={z.id}>
                      <circle
                        cx={z.coords.x}
                        cy={z.coords.y}
                        r="8"
                        id={`svg-zone-${z.id}`}
                        onClick={() => {
                          setSelectedTwinZone(z);
                          setSelectedReport(null);
                          setSelectedPredictiveHotspot(null);
                        }}
                        className={`cursor-pointer transition-all ${
                          isSelected 
                            ? 'fill-emerald-500/10 stroke-emerald-400 stroke-[0.35] filter drop-shadow(0_0_4px_rgba(16,185,129,0.3))' 
                            : (z.healthScore < 50 ? 'fill-red-500/5 hover:fill-red-500/10 stroke-red-500/50 hover:stroke-red-400' :
                               z.healthScore < 75 ? 'fill-amber-500/5 hover:fill-amber-500/10 stroke-amber-500/50 hover:stroke-amber-400' :
                               'fill-emerald-500/5 hover:fill-emerald-500/10 stroke-emerald-555 stroke-emerald-500/40 hover:stroke-emerald-400')
                        } stroke-dasharray="0.3 0.15"`}
                        strokeWidth="0.18"
                      />
                      {isSelected && (
                        <>
                          <circle
                            cx={z.coords.x}
                            cy={z.coords.y}
                            r="12"
                            className="fill-transparent stroke-emerald-400 stroke-[0.15] animate-pulse pointer-events-none"
                            strokeDasharray="0.4 0.2"
                          />
                          <circle
                            cx={z.coords.x}
                            cy={z.coords.y}
                            r="15"
                            className="fill-transparent stroke-emerald-400/50 stroke-[0.1] animate-ping pointer-events-none"
                          />
                        </>
                      )}
                      <text
                        x={z.coords.x}
                        y={z.coords.y + 11}
                        textAnchor="middle"
                        className="fill-slate-600 font-mono text-[1.4px] font-bold uppercase tracking-wider"
                      >
                        {z.name.replace('District', '').replace('Ward', '').replace('Center', '')} ({z.healthScore}%)
                      </text>
                    </g>
                  );
                })}

                {/* View Mode: Heatmaps glow rings */}
                {viewMode === 'heatmap' && reportMarkers.map((m) => (
                  <g key={m.id}>
                    <circle
                      cx={m.coords.x}
                      cy={m.coords.y}
                      r="6"
                      className="fill-teal-500/5 animate-pulse stroke-none"
                    />
                    <circle
                      cx={m.coords.x}
                      cy={m.coords.y}
                      r="3.5"
                      className="fill-emerald-500/10 stroke-none"
                    />
                  </g>
                ))}

                {/* View Mode: Predictions layout */}
                {viewMode === 'predictions' && predictiveMarkers.map((p) => {
                  const isSelected = selectedPredictiveHotspot?.id === p.id;
                  return (
                    <polygon
                      key={p.id}
                      id={`svg-pred-${p.id}`}
                      onClick={() => {
                        setSelectedPredictiveHotspot(p);
                        setSelectedReport(null);
                        setSelectedTwinZone(null);
                      }}
                      points={`${p.coords.x},${p.coords.y - 2.5} ${p.coords.x - 2.2},${p.coords.y + 1.5} ${p.coords.x + 2.2},${p.coords.y + 1.5}`}
                      className={`cursor-pointer transition-all ${
                        isSelected 
                          ? 'fill-teal-500 stroke-teal-300 stroke-[0.35] filter drop-shadow(0_0_3px_teal)' 
                          : 'fill-emerald-950/40 stroke-emerald-500/45 hover:fill-emerald-950 hover:stroke-emerald-400'
                      }`}
                      strokeWidth="0.15"
                    />
                  );
                })}

                {/* Standard Unresolved Markers */}
                {reportMarkers.map((m) => {
                  const isSelected = selectedReport?.id === m.id;
                  return (
                    <g 
                      key={m.id} 
                      id={`svg-marker-${m.id}`}
                      onClick={() => {
                        setSelectedReport(m);
                        setSelectedTwinZone(null);
                        setSelectedPredictiveHotspot(null);
                      }}
                      className="cursor-pointer group"
                    >
                      <circle
                        cx={m.coords.x}
                        cy={m.coords.y}
                        r={isSelected ? "1.8" : "1.2"}
                        className={`${
                          m.severity === 'critical' ? 'fill-red-500' :
                          m.severity === 'high' ? 'fill-amber-500 animate-pulse' :
                          'fill-teal-400'
                        } stroke-slate-950`}
                        strokeWidth={isSelected ? "0.25" : "0.12"}
                      />
                      {isSelected && (
                        <circle
                          cx={m.coords.x}
                          cy={m.coords.y}
                          r="3.5"
                          className="fill-transparent stroke-emerald-400 stroke-[0.2] animate-ping"
                        />
                      )}
                    </g>
                  );
                })}

                {/* Standard Resolved Markers (Squares) */}
                {viewMode !== 'predictions' && resolvedMarkers.map((m) => {
                  const isSelected = selectedReport?.id === m.id;
                  return (
                    <g 
                      key={m.id} 
                      onClick={() => {
                        setSelectedReport(m);
                        setSelectedTwinZone(null);
                        setSelectedPredictiveHotspot(null);
                      }}
                      className="cursor-pointer group"
                    >
                      <rect
                        x={m.coords.x - 0.75}
                        y={m.coords.y - 0.75}
                        width="1.5"
                        height="1.5"
                        className="fill-emerald-500 stroke-slate-900"
                        strokeWidth={isSelected ? "0.3" : "0.15"}
                      />
                    </g>
                  );
                })}

              </svg>
            </>
          )}

          {/* AI TIME MACHINE SLIDER OVERLAY */}
          <div className="absolute bottom-4 left-4 z-20 p-3.5 rounded-lg bg-[#020408]/95 border border-emerald-500/30 text-xs font-mono shadow-2xl text-left space-y-3 w-[280px] backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                <span className="font-extrabold uppercase text-emerald-400 tracking-wider text-[10px]">AI Civic Time-Machine</span>
              </div>
              <span className="text-[9px] text-slate-300 bg-emerald-500/10 px-1.5 py-0.5 rounded font-black border border-emerald-500/15">
                {timelineMonths[timeIndex]}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[8px] text-slate-400 font-mono">
                <span>Jul 2025 (Past)</span>
                <span className="text-cyan-400 font-bold">Prediction Model Active</span>
                <span>Jun 2026 (Live)</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1 px-1.5 text-[8px] font-bold rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer select-none shrink-0"
                >
                  {isPlaying ? '⏸ PAUSE' : '▶ AUTO'}
                </button>
                
                <input 
                  type="range"
                  min={0}
                  max={11}
                  value={timeIndex}
                  onChange={(e) => {
                    setTimeIndex(Number(e.target.value));
                    setIsPlaying(false);
                  }}
                  className="flex-1 accent-emerald-500 h-1 bg-slate-900 rounded-lg cursor-pointer appearance-none border border-teal-950/40"
                />
              </div>
            </div>
            <p className="text-[8.5px] leading-relaxed text-slate-500 italic">
              Slide to observe how civic indices heal or decay based on complaints.
            </p>
          </div>

          {/* Persistent Telemetry Legend HUD */}
          <div className="absolute bottom-4 right-4 p-3 rounded-lg bg-[#020408]/95 border border-teal-950/50 text-[10px] space-y-1 z-20 font-mono shadow-2xl text-left hidden md:block max-w-[190px] backdrop-blur-md">
            <span className="font-bold uppercase text-emerald-500 block mb-1">Telemetry Legend</span>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-slate-400 text-[9px]">Critical Hazard Area</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              <span className="text-slate-400 text-[9px]">Report Triage Pending</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-0.5 bg-rose-500 inline-block" />
              <span className="text-slate-400 text-[9px]">Road Condition Line</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column context panel */}
      <div className="lg:col-span-4 h-full flex flex-col bg-[#040810] rounded border border-teal-950/45 p-4 shadow overflow-y-auto w-full">
        
        <AnimatePresence mode="wait">
          
          {/* 1. REPORT POPUP */}
          {selectedReport && (
            <motion.div 
              key="report-popup" 
              initial={{ opacity:0, y:10 }} 
              animate={{ opacity:1, y:0 }} 
              exit={{ opacity:0 }}
              className="space-y-4 text-xs font-light leading-relaxed text-left"
            >
              
              <div className="flex justify-between items-start border-b border-teal-950/30 pb-3 text-left">
                <div className="space-y-0.5 text-left">
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border ${
                    selectedReport.status === 'resolved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                    selectedReport.severity === 'critical' ? 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse' :
                    'bg-teal-500/10 border-teal-500/20 text-teal-400'
                  }`}>
                    {selectedReport.status.toUpperCase()}
                  </span>
                  <p className="text-[10px] text-slate-500 font-mono block">ID: {selectedReport.id}</p>
                </div>
                <button 
                  id="btn-close-map-panel"
                  onClick={() => {
                    setSelectedReport(null);
                    if (onClearSelectedReport) onClearSelectedReport();
                  }}
                  className="font-mono text-slate-500 hover:text-emerald-400 cursor-pointer"
                >
                  [esc]
                </button>
              </div>

              {/* image preview */}
              {selectedReport.imageUrl && (
                <div className="rounded overflow-hidden aspect-video bg-[#020408] border border-teal-950/40 relative">
                  <img referrerPolicy="no-referrer" src={selectedReport.imageUrl} alt={selectedReport.title} className="object-cover w-full h-full" />
                </div>
              )}

              {selectedReport.videoUrl && (
                <div className="rounded overflow-hidden aspect-video bg-[#020408] border border-teal-950/40 relative mt-2">
                  <video controls src={selectedReport.videoUrl} className="w-full h-full object-contain" />
                </div>
              )}

              <div className="text-left">
                <h3 className="text-sm font-bold text-white leading-tight font-sans tracking-tight">{selectedReport.title}</h3>
                <p className="text-slate-400 pt-1 text-xs">{selectedReport.description}</p>
              </div>

              {/* Urgencies and points metrics indicators */}
              <div className="grid grid-cols-2 gap-3 bg-[#020408] p-2.5 rounded border border-teal-950/40 font-mono text-[11px] text-left">
                <div>
                  <span className="block text-slate-500 uppercase text-[9px]">Priority Level</span>
                  <span className="font-bold text-red-400">{selectedReport.priorityScore} / 100</span>
                </div>
                <div>
                  <span className="block text-slate-400 uppercase text-[9px]">Urgency Score</span>
                  <span className="font-bold text-teal-400">{selectedReport.urgencyScore}%</span>
                </div>
              </div>

              {/* Community votes HUD block */}
              <div className="flex justify-between items-center p-2 rounded bg-[#020408] border border-teal-950/40 text-left">
                <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Consensus Voting</span>
                <div className="flex space-x-1">
                  <button
                    id="btn-map-upvote"
                    onClick={() => handleVoteAction(selectedReport.id, 'up')}
                    className="p-1 px-2.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center space-x-1 text-xs font-bold cursor-pointer"
                  >
                    <ThumbsUp className="w-3 h-3 text-emerald-400" />
                    <span>{selectedReport.communityVotes.upvotes}</span>
                  </button>
                  <button
                    id="btn-map-downvote"
                    onClick={() => handleVoteAction(selectedReport.id, 'down')}
                    className="p-1 px-2.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex items-center space-x-1 text-xs font-bold cursor-pointer"
                  >
                    <ThumbsDown className="w-3 h-3 text-red-400" />
                    <span>{selectedReport.communityVotes.downvotes}</span>
                  </button>
                </div>
              </div>

              {/* Verification subsystem */}
              {selectedReport.status !== 'resolved' && (
                <form onSubmit={handleVerifySubmit} className="space-y-2 pt-2 border-t border-teal-950/35 text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-500/90 block font-mono">Deploy Peer Verification</span>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      id="btn-type-verify"
                      onClick={() => setVerifyType('verify')}
                      className={`flex-1 py-1 px-2 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                        verifyType === 'verify' 
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' 
                          : 'border-teal-950/40 text-slate-500'
                      }`}
                    >
                      Verify Present
                    </button>
                    <button
                      type="button"
                      id="btn-type-dispute"
                      onClick={() => setVerifyType('dispute')}
                      className={`flex-1 py-1 px-2 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                        verifyType === 'dispute' 
                          ? 'border-red-500 bg-red-500/10 text-red-400' 
                          : 'border-teal-950/40 text-slate-500'
                      }`}
                    >
                      Dispute (No Trace)
                    </button>
                  </div>

                  <input
                    type="text"
                    id="input-verify-comment"
                    placeholder="Provide comment for peer logs..."
                    value={verifyComments}
                    onChange={(e) => setVerifyComments(e.target.value)}
                    className="w-full text-xs p-2 rounded border border-teal-950/50 bg-[#020408] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                  />

                  <button
                    id="btn-submit-verification"
                    type="submit"
                    disabled={submittingVerify}
                    className="w-full py-2 bg-emerald-950/80 hover:bg-[#071d15] text-emerald-400 rounded text-[10px] font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 cursor-pointer border border-emerald-500/30 shadow-md"
                  >
                    <span>Submit peer check</span>
                  </button>
                </form>
              )}

            </motion.div>
          )}

          {/* 2. WARD SANITATION INFO POPUP */}
          {selectedTwinZone && (
            <motion.div 
              key="twin-popup" 
              initial={{ opacity:0, y:10 }} 
              animate={{ opacity:1, y:0 }} 
              exit={{ opacity:0 }}
              className="space-y-4 text-xs font-light leading-relaxed text-left"
            >
              <div className="flex justify-between items-center border-b border-teal-950/30 pb-3 text-left">
                <span className="text-[10px] font-bold font-mono text-teal-400">WARD SANITATION SUMMARY</span>
                <button 
                  onClick={() => setSelectedTwinZone(null)}
                  className="font-mono text-slate-500 hover:text-emerald-400 cursor-pointer"
                >
                  X
                </button>
              </div>

              <div className="text-left">
                <h3 className="text-sm font-bold text-white tracking-tight font-sans">{selectedTwinZone.name}</h3>
                <span className="text-[10px] text-slate-400 block font-mono mt-0.5">Area Sanitation & Infrastructure Status</span>
              </div>

              {/* Core Scores */}
              <div className="space-y-2.5 p-3 rounded bg-[#020408] border border-teal-950/40 text-left">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-300 font-mono text-[11px]">Overall Cleanliness Rating</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">{selectedTwinZone.healthScore}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#020408] rounded-full mt-1.5 overflow-hidden border border-teal-950/50">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: `${selectedTwinZone.healthScore}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                <div className="p-1 px-1.5 bg-[#020408] border border-teal-950/40 rounded">
                  <span className="block text-slate-500 font-bold uppercase mt-0.5">Sanitation</span>
                  <span className="font-bold text-teal-400">{selectedTwinZone.environmentalScore}</span>
                </div>
                <div className="p-1 px-1.5 bg-[#020408] border border-teal-950/40 rounded">
                  <span className="block text-slate-500 font-bold uppercase mt-0.5">Infra</span>
                  <span className="font-bold text-emerald-400">{selectedTwinZone.infrastructureScore}</span>
                </div>
                <div className="p-1 px-1.5 bg-[#020408] border border-teal-950/40 rounded">
                  <span className="block text-slate-500 font-bold uppercase mt-0.5">Safety</span>
                  <span className="font-bold text-red-400">{selectedTwinZone.safetyScore}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <span className="text-[10px] font-bold text-slate-500 block uppercase font-mono">Anticipated Maintenance & Alerts</span>
                <div className="space-y-1 bg-emerald-500/5 p-2.5 rounded border border-teal-950/30 text-left space-y-2">
                  {selectedTwinZone.predictions.map((pText, pIdx) => (
                    <p key={pIdx} className="text-[11px] leading-relaxed text-slate-300 block font-mono">• {pText}</p>
                  ))}
                </div>
              </div>

            </motion.div>
          )}

          {/* 3. GEMINI PREDICTIVE HOTSPOT POPUP */}
          {selectedPredictiveHotspot && (
            <motion.div 
              key="pred-popup" 
              initial={{ opacity:0, y:10 }} 
              animate={{ opacity:1, y:0 }} 
              exit={{ opacity:0 }}
              className="space-y-4 text-xs font-light leading-relaxed text-left"
            >
              
              <div className="flex justify-between items-center border-b border-teal-950/30 pb-3 text-left">
                <span className="text-[10px] font-mono font-bold text-teal-400 flex items-center">
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-400 animate-pulse" /> ANTICIPATED MAINTENANCE ALERT
                </span>
                <button 
                  onClick={() => setSelectedPredictiveHotspot(null)}
                  className="font-mono text-slate-500 hover:text-emerald-400 cursor-pointer"
                >
                  X
                </button>
              </div>

              <div className="text-left">
                <span className="px-2 py-0.5 bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 font-mono text-[9px] font-bold rounded uppercase">
                  {selectedPredictiveHotspot.category}
                </span>
                <h3 className="text-sm font-bold text-white mt-1.5 tracking-tight font-sans">{selectedPredictiveHotspot.title}</h3>
              </div>

              <div className="p-3 bg-emerald-500/5 rounded border border-teal-950/30 space-y-1.5 text-left">
                <div className="flex justify-between items-center text-[10px] font-mono font-bold text-teal-450 text-teal-400 animate-pulse">
                  <span>anticipated repair window</span>
                  <span>{selectedPredictiveHotspot.predictedTimeline}</span>
                </div>
                <p className="text-xs text-slate-300 font-light leading-relaxed font-mono">{selectedPredictiveHotspot.reasoning}</p>
              </div>

              <div className="grid grid-cols-2 gap-3.5 font-mono text-[11px] text-left">
                <div className="p-2 bg-[#020408] rounded border border-teal-950/40">
                  <span className="block text-slate-500 text-[9px]">Priority Score</span>
                  <span className="font-bold text-red-400 text-sm block mt-0.5">{selectedPredictiveHotspot.riskScore}%</span>
                </div>
                <div className="p-2 bg-[#020408] rounded border border-teal-950/40">
                  <span className="block text-slate-400 text-[9px]">Data Confidence</span>
                  <span className="font-bold text-emerald-400 text-sm block mt-0.5">{selectedPredictiveHotspot.confidence}%</span>
                </div>
              </div>

            </motion.div>
          )}

          {/* 4. DEFAULT EMPTY SELECTION */}
          {!selectedReport && !selectedTwinZone && !selectedPredictiveHotspot && (
            <motion.div 
              key="default-control-deck" 
              initial={{ opacity:0, y: 10 }} 
              animate={{ opacity:1, y: 0 }}
              className="flex-1 flex flex-col space-y-4 text-left overflow-y-auto pr-1"
            >
              <div className="flex items-center space-x-2 border-b border-teal-950/30 pb-3">
                <div className="p-1.5 rounded bg-emerald-950/40 border border-emerald-500/20 text-emerald-400">
                  <Activity className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-emerald-400">AI Civic Intelligence Deck</h3>
                  <p className="text-[9px] text-slate-500 font-mono">Lucknow Spatial Intelligence Hub</p>
                </div>
              </div>

              {/* SECTION: GLOBAL MAP FILTERS */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Global Filters</span>
                
                <div className="grid grid-cols-1 gap-2 bg-[#020408]/60 p-2 rounded border border-teal-950/30">
                  <div className="flex flex-col space-y-1">
                    <label className="text-[8px] font-mono text-slate-500 uppercase">Category</label>
                    <select 
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="bg-[#040810] border border-teal-950/40 rounded px-2 py-1 text-[10px] font-mono text-slate-300 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="all">All Issue Categories</option>
                      <option value="pothole">🕳️ Potholes & Roads</option>
                      <option value="garbage">🗑️ Illegal Dumping</option>
                      <option value="water_leakage">💧 Water Leakage</option>
                      <option value="street_light">💡 Street Light Failures</option>
                      <option value="drainage">🌊 Drainage & Flooding</option>
                      <option value="safety_concern">🚨 Safety Concerns</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col space-y-1">
                      <label className="text-[8px] font-mono text-slate-500 uppercase">Severity</label>
                      <select 
                        value={filterSeverity}
                        onChange={(e) => setFilterSeverity(e.target.value)}
                        className="bg-[#040810] border border-teal-950/40 rounded px-2 py-1 text-[10px] font-mono text-slate-300 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="all">All Severities</option>
                        <option value="critical">🔴 Critical Risk</option>
                        <option value="high">🟠 High Urgency</option>
                        <option value="medium">🟡 Medium Urgency</option>
                        <option value="low">🟢 Low Urgency</option>
                      </select>
                    </div>

                    <div className="flex flex-col space-y-1">
                      <label className="text-[8px] font-mono text-slate-500 uppercase">Ticket Status</label>
                      <select 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="bg-[#040810] border border-teal-950/40 rounded px-2 py-1 text-[10px] font-mono text-slate-300 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="all">All Tickets</option>
                        <option value="active">⚠️ Active (Unsolved)</option>
                        <option value="pending">⏳ Triage / Pending</option>
                        <option value="resolved">✅ Resolved (Closed)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: ACTIVE TELEMETRY OVERLAYS */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block font-black">AI Sensory Layers</span>
                  <span className="text-[8px] font-mono text-slate-500 bg-[#020408] px-1.5 py-0.5 rounded uppercase tracking-wider">Interactive Overlays</span>
                </div>

                <div className="space-y-1 bg-[#020408]/60 p-2.5 rounded border border-teal-950/30 font-mono text-[9px]">
                  
                  {/* Layer 1: Civic Health Overlay */}
                  <div className="flex items-center justify-between py-0.5">
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-slate-300">District Health Index</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setShowHealthOverlay(!showHealthOverlay)}
                      className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase border tracking-wider transition-all cursor-pointer ${
                        showHealthOverlay 
                          ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-400' 
                          : 'bg-transparent border-teal-950/50 text-slate-600'
                      }`}
                    >
                      {showHealthOverlay ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Layer 2: Road Condition Overlay */}
                  <div className="flex items-center justify-between py-0.5">
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span className="text-slate-300">Road Quality Index</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setShowRoadOverlay(!showRoadOverlay)}
                      className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase border tracking-wider transition-all cursor-pointer ${
                        showRoadOverlay 
                          ? 'bg-amber-950/50 border-amber-500/30 text-amber-400' 
                          : 'bg-transparent border-teal-950/50 text-slate-600'
                      }`}
                    >
                      {showRoadOverlay ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Layer 3: Water Leakage Hotspots */}
                  <div className="flex items-center justify-between py-0.5">
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span className="text-slate-300">Water Leakage Ripples</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setShowWaterOverlay(!showWaterOverlay)}
                      className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase border tracking-wider transition-all cursor-pointer ${
                        showWaterOverlay 
                          ? 'bg-cyan-950/50 border-cyan-500/30 text-cyan-400' 
                          : 'bg-transparent border-teal-950/50 text-slate-600'
                      }`}
                    >
                      {showWaterOverlay ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Layer 4: Garbage Hotspot Heatmap */}
                  <div className="flex items-center justify-between py-0.5">
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                      <span className="text-slate-300">Waste Density Heatmap</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setShowGarbageOverlay(!showGarbageOverlay)}
                      className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase border tracking-wider transition-all cursor-pointer ${
                        showGarbageOverlay 
                          ? 'bg-orange-950/50 border-orange-500/30 text-orange-400' 
                          : 'bg-transparent border-teal-950/50 text-slate-600'
                      }`}
                    >
                      {showGarbageOverlay ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Layer 5: Safety Risk Zones */}
                  <div className="flex items-center justify-between py-0.5">
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <span className="text-slate-300">Low Lux Safety Risks</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setShowSafetyOverlay(!showSafetyOverlay)}
                      className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase border tracking-wider transition-all cursor-pointer ${
                        showSafetyOverlay 
                          ? 'bg-red-950/50 border-red-500/30 text-red-400' 
                          : 'bg-transparent border-teal-950/50 text-slate-600'
                      }`}
                    >
                      {showSafetyOverlay ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Layer 6: Predicted Issue Hotspots */}
                  <div className="flex items-center justify-between py-0.5">
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      <span className="text-slate-300">Gemini Predictive ML</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setShowPredictionOverlay(!showPredictionOverlay)}
                      className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase border tracking-wider transition-all cursor-pointer ${
                        showPredictionOverlay 
                          ? 'bg-purple-950/50 border-purple-500/30 text-purple-400' 
                          : 'bg-transparent border-teal-950/50 text-slate-600'
                      }`}
                    >
                      {showPredictionOverlay ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Layer 7: Live Community Activity */}
                  <div className="flex items-center justify-between py-0.5">
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-lime-400" />
                      <span className="text-slate-300">Live Field Operations</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setShowLiveActivity(!showLiveActivity)}
                      className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase border tracking-wider transition-all cursor-pointer ${
                        showLiveActivity 
                          ? 'bg-lime-950/50 border-lime-500/30 text-lime-400' 
                          : 'bg-transparent border-teal-950/50 text-slate-600'
                      }`}
                    >
                      {showLiveActivity ? 'ON' : 'OFF'}
                    </button>
                  </div>

                </div>
              </div>

              {/* SECTION: REAL-TIME TELEMETRY STATS HUD */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Sensory Diagnostics</span>
                <div className="grid grid-cols-3 gap-2 text-center font-mono">
                  <div className="p-1.5 bg-[#020408]/60 border border-teal-950/30 rounded">
                    <span className="block text-slate-500 text-[8px] uppercase font-black">Active Issues</span>
                    <span className="font-bold text-red-400 text-xs">{filteredReports.filter(r => {
                      const adjustedStatus = (r.status === 'resolved' && r.resolvedAt && r.resolvedAt > activeTimeframeEnd) ? 'in_progress' : r.status;
                      return adjustedStatus !== 'resolved';
                    }).length}</span>
                  </div>
                  <div className="p-1.5 bg-[#020408]/60 border border-teal-950/30 rounded">
                    <span className="block text-slate-500 text-[8px] uppercase font-black">Patched Cases</span>
                    <span className="font-bold text-emerald-400 text-xs">{filteredReports.filter(r => {
                      const adjustedStatus = (r.status === 'resolved' && r.resolvedAt && r.resolvedAt > activeTimeframeEnd) ? 'in_progress' : r.status;
                      return adjustedStatus === 'resolved';
                    }).length}</span>
                  </div>
                  <div className="p-1.5 bg-[#020408]/60 border border-teal-950/30 rounded">
                    <span className="block text-slate-500 text-[8px] uppercase font-black">Avg Civic HP</span>
                    <span className="font-bold text-teal-400 text-xs">
                      {Math.round(computedZones.reduce((sum, z) => sum + z.healthScore, 0) / Math.max(1, computedZones.length))}%
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION: LIVE VERIFICATION ACTIVITY FEED */}
              <div className="space-y-1 flex-1 flex flex-col min-h-[100px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Live Activity Stream</span>
                <div className="flex-1 overflow-y-auto max-h-[120px] pr-1 space-y-1.5 bg-[#020408]/40 border border-teal-950/20 p-2 rounded">
                  {liveActivities.map((act) => (
                    <div key={act.id} className="flex items-start space-x-1.5 text-[9px] font-mono leading-relaxed border-b border-teal-950/10 pb-1 last:border-b-0">
                      <span className="text-[11px] mt-0.5">{act.icon}</span>
                      <div className="flex-1 text-left">
                        <span className="font-bold text-emerald-400">{act.worker}</span>
                        <p className="text-slate-300 text-[8px]">{act.action}</p>
                      </div>
                      <span className="text-slate-500 text-[8px] font-sans flex items-center shrink-0">
                        <span className="w-1 h-1 rounded-full bg-lime-400 animate-pulse mr-1"></span> {act.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>
          )}

        </AnimatePresence>

        {/* Offline Caching Console Section */}
        <div id="offline-cache-console" className="mt-auto border-t border-teal-950/40 pt-4 space-y-3">
          <div className="flex items-center space-x-2 text-emerald-400">
            <Database className="w-4 h-4" />
            <h4 className="text-xs font-bold uppercase tracking-wider font-mono">
              {language === 'hi' ? 'ऑफ़लाइन फ़ील्ड-कैश केंद्र' : 'Offline Field-Cache Center'}
            </h4>
          </div>

          <div className="space-y-2 text-[11px] font-mono leading-relaxed text-left text-slate-400 bg-[#020408]/50 p-2.5 rounded border border-teal-950/20">
            
            <div className="flex justify-between items-center">
              <span>{language === 'hi' ? 'बेस मैप स्थिति:' : 'Base Map Engine:'}</span>
              <span className="text-emerald-400 font-bold flex items-center">
                <Check className="w-3 h-3 mr-1" />
                {language === 'hi' ? 'ऑफ़लाइन सुरक्षित (SVG)' : '100% Offline (SVG Math)'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span>{language === 'hi' ? 'कनेक्टिविटी:' : 'Connectivity:'}</span>
              {(isOffline || isSimulatedOffline) ? (
                <span className="text-amber-400 font-bold flex items-center">
                  <WifiOff className="w-3 h-3 mr-1" />
                  {isSimulatedOffline 
                    ? (language === 'hi' ? 'सिम्युलेटेड ऑफ़लाइन' : 'Simulated Offline') 
                    : (language === 'hi' ? 'कोई नेटवर्क नहीं' : 'No Network')}
                </span>
              ) : (
                <span className="text-emerald-400 font-bold flex items-center">
                  <Wifi className="w-3 h-3 mr-1" />
                  {language === 'hi' ? 'क्लाउड से सिंक' : 'Cloud Sync Active'}
                </span>
              )}
            </div>

            <div className="flex justify-between items-center border-t border-teal-950/20 pt-1.5 mt-1.5">
              <span>{language === 'hi' ? 'सुरक्षित नागरिक रिपोर्ट:' : 'Cached Civic Tickets:'}</span>
              <span className="text-slate-200 font-bold">{reports.length}</span>
            </div>

            <div className="flex justify-between items-center">
              <span>{language === 'hi' ? 'डिजिटल ट्विन ज़ोन:' : 'Cached District Twins:'}</span>
              <span className="text-slate-200 font-bold">{zones.length}</span>
            </div>

            <div className="flex justify-between items-center">
              <span>{language === 'hi' ? 'अंतिम सिंक समय:' : 'Last Cache Sync:'}</span>
              <span className="text-slate-300 font-bold">{lastSyncTime}</span>
            </div>

          </div>

          {/* Offline Testing Simulation Pill Toggle */}
          <div className="flex items-center justify-between p-2 rounded bg-[#020408] border border-teal-950/30">
            <span className="text-[10px] text-slate-400 font-mono">
              {language === 'hi' ? 'ऑफ़लाइन मोड का परीक्षण करें:' : 'Simulate Offline Mode:'}
            </span>
            <button
              id="btn-toggle-offline-simulation"
              type="button"
              onClick={() => {
                const nextVal = !isSimulatedOffline;
                setIsSimulatedOffline(nextVal);
                speakText(
                  language === 'hi' 
                    ? (nextVal ? "ऑफ़लाइन मोड शुरू किया गया।" : "ऑनलाइन मोड पर वापस आ गए।")
                    : (nextVal ? "Simulating low connectivity offline mode." : "Reconnected to cloud synchronization server.")
                );
              }}
              className={`px-2.5 py-1 text-[9px] font-mono font-bold rounded border uppercase cursor-pointer transition-all ${
                isSimulatedOffline 
                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-400' 
                  : 'bg-teal-950/20 border-teal-950/40 text-slate-500 hover:text-slate-300'
              }`}
            >
              {isSimulatedOffline 
                ? (language === 'hi' ? 'सक्रिय' : 'ACTIVE') 
                : (language === 'hi' ? 'बंद' : 'DISABLED')}
            </button>
          </div>

          {/* Cache/Download Action Button */}
          {isCaching ? (
            <div className="space-y-1.5 p-2 bg-[#020408] rounded border border-emerald-950/30">
              <div className="flex justify-between text-[10px] font-mono font-bold text-emerald-400">
                <span className="animate-pulse">{cacheStepText}</span>
                <span>{cacheProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#03060c] rounded-full overflow-hidden border border-emerald-950">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-300 rounded-full" 
                  style={{ width: `${cacheProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <button
              id="btn-download-offline-map"
              type="button"
              onClick={triggerCacheDownload}
              className="w-full py-2 bg-emerald-950/80 hover:bg-[#071d15] text-emerald-400 rounded text-[10px] font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 cursor-pointer border border-emerald-500/30 shadow-md transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'ऑफ़लाइन कैश सिंक करें' : 'Download Spatial Cache'}</span>
            </button>
          )}
        </div>

      </div>

    </div>
  );
}
