import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  MapPin, 
  Mic, 
  MicOff, 
  Sparkles, 
  Loader2, 
  CheckCircle, 
  School,
  Building,
  AlertTriangle,
  Image as ImageIcon,
  QrCode,
  ScanLine,
  Volume2,
  Edit3,
  Search,
  Navigation,
  Map as MapIcon,
  X,
  Crosshair,
  Video
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import ExifReader from 'exifreader';
import { CivicReport } from '../types';
import { createReport } from '../lib/firebase';
import { useLanguage } from '../lib/LanguageContext';
import { getCategories, getCities } from '../lib/adminStorage';
import 'leaflet/dist/leaflet.css';

const hasValidKey = true;

interface ReportIssueViewProps {
  user: any;
  onReportCreated: () => void;
}

const PRESET_SAMPLE_ASSETS = [
  {
    name: 'Pothole (सड़क का गड्ढा)',
    url: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?q=80&w=600&auto=format&fit=crop',
    description: 'A deep pothole on the main road causing traffic delays and vehicle damage.'
  },
  {
    name: 'Trash Pile (कचरे का ढेर)',
    url: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?q=80&w=600&auto=format&fit=crop',
    description: 'A large pile of plastic bags and household garbage dumped near the street.'
  },
  {
    name: 'Water Leak (पानी का रिसाव)',
    url: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=600&auto=format&fit=crop',
    description: 'Clean drinking water leaking from a broken underground pipe onto the sidewalk.'
  }
];

const SIMULATED_QR_ASSETS = [
  {
    assetId: 'QR-POT-5091',
    title: 'Main Road Pothole #5091',
    category: 'pothole' as const,
    latitude: 26.8505,
    longitude: 80.9705,
    address: '840 Patrakar Puram Road, Gomti Nagar, Lucknow, UP',
    areaName: 'Gomti Nagar Sector',
    description: 'Deep road damage outside the main market square. High risk of accidents for scooters.',
    severity: 'high' as const,
    urgencyScore: 88,
    department: 'Road & Transport Division',
    resolutionRecommendations: [
      'Place warning signs around the pothole.',
      'Fill with high-quality gravel and tar.'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?q=80&w=600&auto=format&fit=crop'
  },
  {
    assetId: 'QR-BIN-8820',
    title: 'Public Waste Bin #8820',
    category: 'garbage' as const,
    latitude: 26.8405,
    longitude: 80.9205,
    address: '42 Aminabad Road, Aminabad, Lucknow, UP',
    areaName: 'Aminabad Enclave',
    description: 'Public waste container overflowing. Attracting stray dogs and flies.',
    severity: 'medium' as const,
    urgencyScore: 64,
    department: 'Waste Cleanup Department',
    resolutionRecommendations: [
      'Empty the bin immediately.',
      'Spray disinfectant around the sidewalk.'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?q=80&w=600&auto=format&fit=crop'
  },
  {
    assetId: 'QR-LINE-3104',
    title: 'Electric Gutter Pole #3104',
    category: 'street_light' as const,
    latitude: 26.8465,
    longitude: 80.9465,
    address: '10 Hazratganj Crossing, Lucknow, UP',
    areaName: 'Hazratganj Heritage Precinct',
    description: 'Exposed electrical wires at the base of the light pole near water gutter. Immediate threat of electrical shock.',
    severity: 'critical' as const,
    urgencyScore: 98,
    department: 'Electricity Board Office',
    resolutionRecommendations: [
      'Turn off power immediately.',
      'Seal wires with proper insulation caps.'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1509395062183-67c5ad6faff9?q=80&w=600&auto=format&fit=crop'
  }
];

export default function ReportIssueView({ user, onReportCreated }: ReportIssueViewProps) {
  const { language, isSimpleMode, t, speakText } = useLanguage();

  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [userDescription, setUserDescription] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState('');
  const [areaName, setAreaName] = useState('Gomti Nagar Sector');
  
  // Custom Ola/Swiggy-style real-time location selection states
  const [showLocationPrompt, setShowLocationPrompt] = useState(true);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pickerCity, setPickerCity] = useState<'lucknow' | 'bengaluru'>('lucknow');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [googleMapCenter, setGoogleMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [isAcquiringGps, setIsAcquiringGps] = useState(false);

  // Leaflet map refs and effects for picker
  const pickerMapContainerRef = useRef<HTMLDivElement | null>(null);
  const pickerMapInstanceRef = useRef<any | null>(null);
  const pickerMarkerRef = useRef<any | null>(null);
  const pickerCircleRef = useRef<any | null>(null);

  useEffect(() => {
    if (!showMapPicker || !pickerMapContainerRef.current) {
      if (pickerMapInstanceRef.current) {
        pickerMapInstanceRef.current.remove();
        pickerMapInstanceRef.current = null;
        pickerMarkerRef.current = null;
        pickerCircleRef.current = null;
      }
      return;
    }

    import('leaflet').then((L) => {
      if (!pickerMapContainerRef.current) return;
      if (pickerMapInstanceRef.current) {
        pickerMapInstanceRef.current.invalidateSize();
        return;
      }

      const initialLat = lat || 26.8467;
      const initialLng = lng || 80.9462;

      const map = L.map(pickerMapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false
      });

      pickerMapInstanceRef.current = map;

      // CartoDB Dark Matter style to fit the dark futuristic grid
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(map);

      // On map click, place/drag target marker & calculate area
      map.on('click', (e: any) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        setLat(clickLat);
        setLng(clickLng);
        setGoogleMapCenter({ lat: clickLat, lng: clickLng });
        reverseGeocode(clickLat, clickLng);
      });

      const customIcon = L.divIcon({
        html: `<div class="relative animate-bounce">
                 <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1.5 bg-black/45 rounded-full blur-[1px]"></div>
                 <span style="font-size: 28px; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));">📍</span>
               </div>`,
        className: 'custom-leaflet-picker-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 28]
      });

      const marker = L.marker([initialLat, initialLng], { icon: customIcon }).addTo(map);
      pickerMarkerRef.current = marker;

      const circle = L.circle([initialLat, initialLng], {
        radius: 500,
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.1,
        weight: 1
      }).addTo(map);
      pickerCircleRef.current = circle;

      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    });

    return () => {
      if (pickerMapInstanceRef.current) {
        pickerMapInstanceRef.current.remove();
        pickerMapInstanceRef.current = null;
        pickerMarkerRef.current = null;
        pickerCircleRef.current = null;
      }
    };
  }, [showMapPicker]);

  useEffect(() => {
    const map = pickerMapInstanceRef.current;
    if (!map || !lat || !lng) return;

    import('leaflet').then((L) => {
      const pos: [number, number] = [lat, lng];
      map.setView(pos, map.getZoom());

      if (pickerMarkerRef.current) {
        pickerMarkerRef.current.setLatLng(pos);
      } else {
        const customIcon = L.divIcon({
          html: `<div class="relative animate-bounce">
                   <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1.5 bg-black/45 rounded-full blur-[1px]"></div>
                   <span style="font-size: 28px; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));">📍</span>
                 </div>`,
          className: 'custom-leaflet-picker-marker',
          iconSize: [32, 32],
          iconAnchor: [16, 28]
        });
        pickerMarkerRef.current = L.marker(pos, { icon: customIcon }).addTo(map);
      }

      if (pickerCircleRef.current) {
        pickerCircleRef.current.setLatLng(pos);
      } else {
        pickerCircleRef.current = L.circle(pos, {
          radius: 500,
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.1,
          weight: 1
        }).addTo(map);
      }
    });
  }, [lat, lng]);
  
  const [geotagSource, setGeotagSource] = useState<'photo' | 'device' | null>(null);
  const [geotagSuccessMessage, setGeotagSuccessMessage] = useState('');
  
  const [schoolProximity, setSchoolProximity] = useState(false);
  const [hospitalProximity, setHospitalProximity] = useState(false);
  const [trafficImpact, setTrafficImpact] = useState<'none' | 'low' | 'medium' | 'high'>('none');

  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiAnalyzed, setAiAnalyzed] = useState(false);
  const [aiFields, setAiFields] = useState<{
    category: CivicReport['category'];
    title: string;
    description: string;
    severity: CivicReport['severity'];
    urgencyScore: number;
    department: string;
    resolutionRecommendations: string[];
    isEmergency: boolean;
    aiConfidenceScore?: number;
  } | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recognitionError, setRecognitionError] = useState('');
  const recognitionRef = useRef<any>(null);

  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [scanNotice, setScanNotice] = useState('');
  const [scannedAssetDetails, setScannedAssetDetails] = useState<any | null>(null);
  const [isSimulatingScan, setIsSimulatingScan] = useState(false);

  const [validationError, setValidationError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Initialize native browser speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      
      // Match with active app language
      rec.lang = 
        language === 'hi' ? 'hi-IN' :
        language === 'ta' ? 'ta-IN' :
        language === 'te' ? 'te-IN' :
        language === 'kn' ? 'kn-IN' :
        language === 'mr' ? 'mr-IN' : 'en-US';

      rec.onstart = () => {
        setIsRecording(true);
        setRecognitionError('');
      };

      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setUserDescription(prev => (prev ? prev + " " + text : text));
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error", event);
        setRecognitionError("Could not hear clearly. Please try again.");
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, [language]);

  const toggleVoiceRecording = () => {
    if (!recognitionRef.current) {
      setRecognitionError("Voice speech is not supported on this device.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      speakText("Listening now. Please speak clearly.");
      recognitionRef.current.start();
    }
  };

  const simulateQrScan = (asset: typeof SIMULATED_QR_ASSETS[0]) => {
    setIsSimulatingScan(true);
    speakText("Scanning code now.");
    setTimeout(() => {
      setScannedAssetDetails({
        assetId: asset.assetId,
        title: asset.title,
        category: asset.category,
        lat: asset.latitude,
        lng: asset.longitude,
        address: asset.address,
        areaName: asset.areaName,
        description: asset.description
      });
      setLat(asset.latitude);
      setLng(asset.longitude);
      setAddress(asset.address);
      setAreaName(asset.areaName);
      setUserDescription(asset.description);
      
      setAiFields({
        category: asset.category,
        title: asset.title,
        description: asset.description,
        severity: asset.severity,
        urgencyScore: asset.urgencyScore,
        department: asset.department,
        resolutionRecommendations: asset.resolutionRecommendations,
        isEmergency: asset.severity === 'critical',
        aiConfidenceScore: 98
      });
      setAiAnalyzed(true);
      setIsSimulatingScan(false);
      setScanNotice(`SUCCESS! Attached code ${asset.assetId} for ${asset.title}.`);
      setTimeout(() => setScanNotice(''), 6000);
    }, 1000);
  };

  // Real Camera scan effect setup
  useEffect(() => {
    if (!isQrScannerOpen) return;

    const timer = setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          "qr-reader-target",
          { 
            fps: 10, 
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.7;
              return { width: Math.max(180, size), height: Math.max(180, size) };
            },
            aspectRatio: 1.0,
            rememberLastUsedCamera: true
          },
          false
        );

        scanner.render(
          (decodedText) => {
            // Match with one of simulated assets if scanned random text
            const foundAsset = SIMULATED_QR_ASSETS.find(a => decodedText.includes(a.assetId)) || SIMULATED_QR_ASSETS[0];
            simulateQrScan(foundAsset);
            scanner.clear().then(() => {
              setIsQrScannerOpen(false);
            }).catch(e => {
              setIsQrScannerOpen(false);
            });
          },
          (error) => {}
        );

        return () => {
          scanner.clear().catch(err => {});
        };
      } catch (err) {
        console.error("Failed to initialize html5-qrcode scanner:", err);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
    };
  }, [isQrScannerOpen]);

  // Reusable reverse geocoding helper using Nominatim API
  const reverseGeocode = async (latitude: number, longitude: number) => {
    setIsGeocoding(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
        headers: {
          'Accept-Language': language === 'hi' ? 'hi' : 'en',
          'User-Agent': 'CivicReporterApplet/1.0'
        }
      });
      const data = await response.json();
      if (data && data.display_name) {
        setAddress(data.display_name);
        const addr = data.address || {};
        const localArea = addr.suburb || addr.neighbourhood || addr.residential || addr.village || addr.city_district || addr.county || 'Local Area';
        setAreaName(localArea);
        setIsGeocoding(false);
        return data.display_name;
      } else {
        throw new Error("No display name returned");
      }
    } catch (error) {
      console.error("Error reverse geocoding:", error);
      // Dynamic fallback based on coordinates
      let fallbackAddr = "";
      let fallbackArea = "";
      if (latitude >= 25.5 && latitude <= 28.0 && longitude >= 79.5 && longitude <= 82.5) {
        fallbackAddr = language === 'hi' ? "हजरतगंज, लखनऊ, उत्तर प्रदेश, भारत" : "Hazratganj, Lucknow, Uttar Pradesh, India";
        fallbackArea = language === 'hi' ? "हजरतगंज सेक्टर" : "Hazratganj Sector";
      } else {
        fallbackAddr = language === 'hi' ? "गोमती नगर, लखनऊ, उत्तर प्रदेश, भारत" : "Gomti Nagar, Lucknow, Uttar Pradesh, India";
        fallbackArea = language === 'hi' ? "गोमती नगर सेक्टर" : "Gomti Nagar Sector";
      }
      setAddress(fallbackAddr);
      setAreaName(fallbackArea);
      setIsGeocoding(false);
      return fallbackAddr;
    }
  };

  const acquireLocation = (onSuccessCallback?: () => void) => {
    setIsAcquiringGps(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          setLat(latitude);
          setLng(longitude);
          setGoogleMapCenter({ lat: latitude, lng: longitude });
          
          // Auto-detect city for custom vector map snapping
          if (latitude >= 25.0 && latitude <= 28.0 && longitude >= 79.0 && longitude <= 83.0) {
            setPickerCity('lucknow');
          } else {
            setPickerCity('bengaluru');
          }

          const resolved = await reverseGeocode(latitude, longitude);
          setIsAcquiringGps(false);
          
          speakText(language === 'hi' ? "स्थान प्राप्त कर लिया गया है।" : "Location acquired successfully.");
          if (onSuccessCallback) {
            onSuccessCallback();
          }
        },
        (error) => {
          console.warn("Geolocation permission denied or timed out:", error);
          // Fallback to Lucknow
          const mockLat = 26.8467 + (Math.random() - 0.5) * 0.01;
          const mockLng = 80.9462 + (Math.random() - 0.5) * 0.01;
          setLat(mockLat);
          setLng(mockLng);
          setGoogleMapCenter({ lat: mockLat, lng: mockLng });
          setPickerCity('lucknow');
          setAddress(language === 'hi' ? "हजरतगंज, लखनऊ, उत्तर प्रदेश, भारत" : "Hazratganj, Lucknow, Uttar Pradesh, India");
          setAreaName(language === 'hi' ? "हजरतगंज सेक्टर" : "Hazratganj Sector");
          setIsAcquiringGps(false);
          if (onSuccessCallback) {
            onSuccessCallback();
          }
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      // Fallback
      const mockLat = 26.8467;
      const mockLng = 80.9462;
      setLat(mockLat);
      setLng(mockLng);
      setGoogleMapCenter({ lat: mockLat, lng: mockLng });
      setPickerCity('lucknow');
      setAddress(language === 'hi' ? "हजरतगंज, लखनऊ, उत्तर प्रदेश, भारत" : "Hazratganj, Lucknow, Uttar Pradesh, India");
      setAreaName(language === 'hi' ? "हजरतगंज सेक्टर" : "Hazratganj Sector");
      setIsAcquiringGps(false);
      if (onSuccessCallback) {
        onSuccessCallback();
      }
    }
  };

  // On page mount, trigger location popup onboarding!
  useEffect(() => {
    // We can fetch quietly in the background, or just let prompt handle it
    acquireLocation();
  }, []);

  const LANDMARK_PRESETS = [
    { name: 'Hazratganj, Lucknow (हजरतगंज)', lat: 26.8467, lng: 80.9462 },
    { name: 'Gomti Nagar, Lucknow (गोमती नगर)', lat: 26.8500, lng: 80.9700 },
    { name: 'Aminabad, Lucknow (अमीनाबाद)', lat: 26.8400, lng: 80.9200 },
    { name: 'Chowk, Lucknow (चौक)', lat: 26.8680, lng: 80.9000 },
    { name: 'Rajajipuram, Lucknow (राजाजीपुरम)', lat: 26.8370, lng: 80.8810 },
    { name: 'Indira Nagar, Lucknow (इंदिरा नगर)', lat: 26.8800, lng: 80.9600 },
    { name: 'Aliganj, Lucknow (अलीगंज)', lat: 26.8850, lng: 80.9400 }
  ];

  const handleSearchLocation = async (query: string) => {
    if (!query) return;
    setSearchQuery(query);
    const lower = query.toLowerCase();
    const matchedPreset = LANDMARK_PRESETS.find(p => p.name.toLowerCase().includes(lower));
    if (matchedPreset) {
      setLat(matchedPreset.lat);
      setLng(matchedPreset.lng);
      setGoogleMapCenter({ lat: matchedPreset.lat, lng: matchedPreset.lng });
      if (matchedPreset.lat >= 25) {
        setPickerCity('lucknow');
      } else {
        setPickerCity('bengaluru');
      }
      reverseGeocode(matchedPreset.lat, matchedPreset.lng);
      return;
    }

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
        headers: {
          'User-Agent': 'CivicReporterApplet/1.0'
        }
      });
      const results = await response.json();
      if (results && results.length > 0) {
        const match = results[0];
        const newLat = parseFloat(match.lat);
        const newLng = parseFloat(match.lon);
        setLat(newLat);
        setLng(newLng);
        setGoogleMapCenter({ lat: newLat, lng: newLng });
        if (newLat >= 25) {
          setPickerCity('lucknow');
        } else {
          setPickerCity('bengaluru');
        }
        setAddress(match.display_name);
        // Find area if possible
        const localArea = match.display_name.split(',')[0] || 'Local Area';
        setAreaName(localArea);
      }
    } catch (e) {
      console.error("OSM Nominatim Search failed:", e);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 1. Read preview image
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      // 2. Read EXIF GPS Geotag metadata
      try {
        setGeotagSuccessMessage(language === 'hi' ? "फोटो से जीपीएस जानकारी निकाली जा रही है..." : "Extracting GPS geotags from photo...");
        const tags = await ExifReader.load(file);
        
        if (tags.GPSLatitude && tags.GPSLongitude) {
          const latRef = tags.GPSLatitudeRef?.description || 'N';
          const lngRef = tags.GPSLongitudeRef?.description || 'E';
          
          let photoLat = 0;
          let photoLng = 0;

          // Standard parsing of description which is decimal string/number in ExifReader
          if (typeof tags.GPSLatitude.description === 'number') {
            photoLat = tags.GPSLatitude.description;
          } else if (tags.GPSLatitude.description) {
            photoLat = parseFloat(tags.GPSLatitude.description);
          }

          if (typeof tags.GPSLongitude.description === 'number') {
            photoLng = tags.GPSLongitude.description;
          } else if (tags.GPSLongitude.description) {
            photoLng = parseFloat(tags.GPSLongitude.description);
          }

          // If description is not standard decimal, try fallback calculated from value array
          if ((!photoLat || isNaN(photoLat)) && tags.GPSLatitude.value) {
            const val = tags.GPSLatitude.value as any;
            if (Array.isArray(val) || val instanceof Float32Array || val instanceof Float64Array) {
              const getNum = (v: any) => {
                if (v && typeof v === 'object' && 'numerator' in v && 'denominator' in v) {
                  return v.denominator !== 0 ? v.numerator / v.denominator : 0;
                }
                return Number(v);
              };
              if (val.length >= 3) {
                photoLat = getNum(val[0]) + (getNum(val[1]) / 60) + (getNum(val[2]) / 3600);
              }
            }
          }

          if ((!photoLng || isNaN(photoLng)) && tags.GPSLongitude.value) {
            const val = tags.GPSLongitude.value as any;
            if (Array.isArray(val) || val instanceof Float32Array || val instanceof Float64Array) {
              const getNum = (v: any) => {
                if (v && typeof v === 'object' && 'numerator' in v && 'denominator' in v) {
                  return v.denominator !== 0 ? v.numerator / v.denominator : 0;
                }
                return Number(v);
              };
              if (val.length >= 3) {
                photoLng = getNum(val[0]) + (getNum(val[1]) / 60) + (getNum(val[2]) / 3600);
              }
            }
          }

          if (photoLat && photoLng && !isNaN(photoLat) && !isNaN(photoLng)) {
            // Adjust signs
            if (latRef === 'S' || latRef === 'South' || photoLat < 0) {
              photoLat = -Math.abs(photoLat);
            }
            if (lngRef === 'W' || lngRef === 'West' || photoLng < 0) {
              photoLng = -Math.abs(photoLng);
            }

            setLat(photoLat);
            setLng(photoLng);
            setGeotagSource('photo');
            
            // Reverse-geocode the photo coordinates for a fully accurate address
            try {
              const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${photoLat}&lon=${photoLng}&zoom=18&addressdetails=1`, {
                headers: {
                  'Accept-Language': language === 'hi' ? 'hi' : 'en',
                  'User-Agent': 'CivicReporterApplet/1.0'
                }
              });
              const data = await response.json();
              if (data && data.display_name) {
                setAddress(data.display_name);
                const addr = data.address || {};
                const localArea = addr.suburb || addr.neighbourhood || addr.residential || addr.village || addr.city_district || addr.county || 'Local Area';
                setAreaName(localArea);
              } else {
                throw new Error("No address name from Nominatim");
              }
            } catch (geoErr) {
              console.warn("Could not reverse geocode photo coordinates, using coordinate fallback:", geoErr);
              const area = photoLat.toFixed(4) + " N, " + photoLng.toFixed(4) + " E";
              setAddress(language === 'hi' ? `फोटो जीपीएस लोकेशन: ${area}` : `Photo GPS Location: ${area}`);
            }

            setGeotagSuccessMessage(
              language === 'hi' 
                ? `सफलतापूर्वक फोटो से जीपीएस टैग मिला: ${photoLat.toFixed(5)}°, ${photoLng.toFixed(5)}°`
                : `Successfully geotagged from photo coordinates: ${photoLat.toFixed(5)}°, ${photoLng.toFixed(5)}°`
            );
            speakText(language === 'hi' ? "सफलतापूर्वक फोटो से जीपीएस टैग मिल गया।" : "Successfully geotagged from photo coordinates.");
          } else {
            throw new Error("Invalid coordinate values");
          }
        } else {
          setGeotagSource('device');
          setGeotagSuccessMessage(
            language === 'hi'
              ? "फोटो में कोई जीपीएस टैग नहीं मिला। आपके मोबाइल का चालू जीपीएस लोकेशन उपयोग किया जा रहा है।"
              : "No GPS tag found in photo. Using your mobile's live location."
          );
        }
      } catch (err) {
        console.error("EXIF Metadata error:", err);
        setGeotagSource('device');
        setGeotagSuccessMessage(
          language === 'hi'
            ? "ℹ️ फोटो के जीपीएस टैग को नहीं पढ़ा जा सका। आपके मोबाइल का चालू जीपीएस लोकेशन उपयोग किया जा रहा है।"
            : "ℹ️ Could not read photo GPS tags. Using your mobile's live location."
        );
      }
    }
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setVideoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      speakText(language === 'hi' ? "वीडियो सफलतापूर्वक लोड हो गया है।" : "Video loaded successfully.");
    }
  };

  const handleAiTriageAnalysis = async () => {
    if (!imageUrl && !videoUrl && !userDescription) {
      setValidationError("Please add a photo, video or write details about the problem first.");
      setTimeout(() => setValidationError(''), 5000);
      return;
    }
    setValidationError('');
    setAiAnalyzing(true);
    setAiAnalyzed(false);

    try {
      const payload = {
        image: imageUrl.startsWith('data:image') ? imageUrl : null,
        descriptionText: userDescription || "",
        location: { lat, lng, address }
      };

      const res = await fetch('/api/analyze-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to analyze');
      const data = await res.json();
      
      setAiFields({
        category: data.category || 'other',
        title: data.title || 'Reported Issue',
        description: data.description || userDescription,
        severity: data.severity || 'medium',
        urgencyScore: data.urgencyScore || 60,
        department: data.department || 'Public Safety Team',
        resolutionRecommendations: data.resolutionRecommendations || ['City team will inspect'],
        isEmergency: data.isEmergency || false,
        aiConfidenceScore: data.aiConfidenceScore || 92
      });
      setAiAnalyzed(true);
      speakText("Problem analyzed. Please check details and confirm.");
    } catch (e) {
      console.error(e);
      // Fallback
      setAiFields({
        category: 'other',
        title: 'New Reported Problem',
        description: userDescription || 'Reported local issue needing repair.',
        severity: 'medium',
        urgencyScore: 50,
        department: 'Public Maintenance Division',
        resolutionRecommendations: ['Schedule inspection', 'Fix reported issue'],
        isEmergency: false,
        aiConfidenceScore: 85
      });
      setAiAnalyzed(true);
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!aiFields) return;
    setSubmitting(true);

    try {
      const finalReport: Partial<CivicReport> = {
        title: aiFields.title,
        description: aiFields.description,
        category: aiFields.category,
        severity: aiFields.severity,
        imageUrl: imageUrl || undefined,
        videoUrl: videoUrl || undefined,
        location: {
          lat: lat || 26.8467,
          lng: lng || 80.9462,
          address: address || 'Acquired Location',
          areaName: areaName || 'Gomti Nagar Sector'
        },
        priorityScore: aiFields.urgencyScore,
        urgencyScore: aiFields.urgencyScore,
        isEmergency: aiFields.isEmergency,
        status: 'reported',
        createdBy: {
          uid: user.uid,
          displayName: user.displayName || 'Citizen Operative',
          email: user.email || ''
        },
        schoolProximity,
        hospitalProximity,
        trafficImpact,
        department: aiFields.department,
        resolutionRecommendations: aiFields.resolutionRecommendations,
        verifications: []
      };

      await createReport(finalReport as any);
      setSuccess(true);
      speakText("Thank you! Your report has been saved successfully.");
      setTimeout(() => {
        onReportCreated();
      }, 3500);
    } catch (err) {
      console.error(err);
      setValidationError("Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`max-w-4xl mx-auto space-y-6 text-slate-100 ${isSimpleMode ? 'px-2' : ''}`}>
      
      {/* Page Header */}
      <div className="space-y-1 text-left">
        <h1 className={`font-black text-white flex items-center gap-2 ${isSimpleMode ? 'text-3xl' : 'text-2xl'}`} id="report-heading">
          <Edit3 className="w-5.5 h-5.5 text-emerald-400" />
          <span>{t('reportIssue')}</span>
        </h1>
        <p className={`text-slate-400 ${isSimpleMode ? 'text-lg leading-relaxed' : 'text-xs'}`}>
          Let the city team know what is broken in your neighborhood. You can take a photo, type or speak your problem.
        </p>
      </div>

      {validationError && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-rose-950/40 border-2 border-rose-500/40 text-rose-400 rounded-2xl text-sm text-left font-bold flex items-center space-x-2"
        >
          <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse flex-shrink-0" />
          <span>{validationError}</span>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {!success ? (
          <div className="space-y-6 pb-12 w-full text-left">
            
            {/* EASY QR SCAN ATTACH BLOCK */}
            <div className={`p-5 rounded-3xl bg-[#0a0d14] border-2 border-slate-800 shadow-xl space-y-4`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-3">
                <div className="flex items-center space-x-3 text-left">
                  <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                    <Camera className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className={`font-black text-white ${isSimpleMode ? 'text-base' : 'text-sm'}`}>
                      Scan Code on Pole or Bin (पोल या डिब्बे पर लगा कोड स्कैन करें)
                    </h3>
                    <p className={`text-slate-400 mt-0.5 ${isSimpleMode ? 'text-sm' : 'text-xs'}`}>
                      Instantly attach your exact location by scanning the metal code tag.
                    </p>
                  </div>
                </div>
                
                <button
                  id="btn-toggle-qr-scanner-view"
                  type="button"
                  onClick={() => setIsQrScannerOpen(!isQrScannerOpen)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    isQrScannerOpen 
                      ? 'bg-rose-500/20 text-rose-400 border-2 border-rose-500/40' 
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/10'
                  }`}
                >
                  <ScanLine className="w-4 h-4" />
                  <span>{isQrScannerOpen ? 'Close Scanner' : 'Activate Live Camera / कैमरा शुरू करें'}</span>
                </button>
              </div>

              {scanNotice && (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 font-bold flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{scanNotice}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-1 text-left">
                {/* Live Camera Scanner Box */}
                <div className="md:col-span-5 flex flex-col justify-center rounded-2xl bg-[#0e121a] p-4 border-2 border-slate-800 relative min-h-[220px]">
                  {isQrScannerOpen ? (
                    <div className="space-y-3 text-center">
                      <div className="relative">
                        <div id="qr-reader-target" className="overflow-hidden rounded-lg border-2 border-emerald-500/40 bg-black aspect-square w-full max-w-[180px] mx-auto shadow-inner" />
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500/80 animate-pulse pointer-events-none" />
                      </div>
                      <p className="text-xs text-emerald-400 font-bold">
                        ● CAMERA ACTIVE: Hold QR code in front of lens
                      </p>
                    </div>
                  ) : (
                    <div className="text-center p-6 space-y-2">
                      <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center mx-auto text-slate-500 border border-slate-800">
                        <Camera className="w-6 h-6" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-300">Camera Offline</h4>
                      <p className="text-[10px] text-slate-500 max-w-[180px] mx-auto">
                        Your phone camera is currently off. Click above to start camera.
                      </p>
                    </div>
                  )}
                </div>

                {/* Simulated Preset Tags */}
                <div className="md:col-span-7 space-y-3">
                  <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                    Quick test choices (क्लिक करके टेस्ट करें)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {SIMULATED_QR_ASSETS.map((asset) => (
                      <button
                        key={asset.assetId}
                        id={`btn-simulate-qr-${asset.assetId}`}
                        type="button"
                        onClick={() => simulateQrScan(asset)}
                        disabled={isSimulatingScan}
                        className={`p-3.5 rounded-2xl border-2 text-left flex flex-col justify-between transition-all bg-[#0c1017]/90 cursor-pointer min-h-[140px] ${
                          scannedAssetDetails?.assetId === asset.assetId
                            ? 'border-emerald-500 bg-emerald-950/20 text-emerald-400'
                            : 'border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="space-y-1">
                          <span className="font-mono text-[10px] font-bold bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                            {asset.assetId}
                          </span>
                          <h4 className="text-xs font-black leading-tight pt-1">
                            {asset.title}
                          </h4>
                          <span className="text-[10px] text-slate-500 block">
                            {asset.areaName}
                          </span>
                        </div>
                        <span className="text-xs text-emerald-400 font-bold hover:underline">
                          Simulate Scan
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Input fields left column */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
              
              <div className="lg:col-span-6 space-y-5">
                {/* Image upload */}
                <div id="image-upload-box" className="p-5 rounded-3xl bg-[#0c1017] border-2 border-slate-800 space-y-4 shadow-xl">
                  <label className="text-sm font-black text-slate-300 flex items-center gap-1.5 text-left">
                    <Camera className="w-4.5 h-4.5 text-emerald-400" /> Add a Photo of the Problem (समस्या का फोटो जोड़ें)
                  </label>
                  
                  {imageUrl ? (
                    <div className="space-y-3">
                      <div className="relative rounded-2xl overflow-hidden group aspect-video bg-[#05070a] flex items-center justify-center border border-slate-800">
                        <img referrerPolicy="no-referrer" src={imageUrl} alt="Uploaded preview" className="object-cover w-full h-full" />
                        <button 
                          id="btn-remove-report-img"
                          type="button"
                          onClick={() => {
                            setImageUrl('');
                            setGeotagSuccessMessage('');
                            setGeotagSource(null);
                          }}
                          className="absolute top-3 right-3 px-3.5 py-1.5 bg-black/85 text-white text-xs font-bold rounded-xl"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Photo Clicking (Live Camera capture on mobile) */}
                      <div className="border-2 border-dashed border-slate-800 rounded-2xl p-6 text-center hover:bg-slate-900/40 relative flex flex-col items-center justify-center space-y-2 cursor-pointer min-h-[140px]">
                        <input 
                          type="file" 
                          id="report-file-camera-input"
                          accept="image/*" 
                          capture="environment"
                          onChange={handleFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <Camera className="w-8 h-8 text-emerald-400" />
                        <span className="text-xs font-black text-slate-200">Take Live Photo</span>
                        <span className="text-[10px] text-slate-500 font-medium">Use mobile camera</span>
                      </div>

                      {/* Photo Uploading (From gallery) */}
                      <div className="border-2 border-dashed border-slate-800 rounded-2xl p-6 text-center hover:bg-slate-900/40 relative flex flex-col items-center justify-center space-y-2 cursor-pointer min-h-[140px]">
                        <input 
                          type="file" 
                          id="report-file-gallery-input"
                          accept="image/*" 
                          onChange={handleFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <ImageIcon className="w-8 h-8 text-blue-400" />
                        <span className="text-xs font-black text-slate-200">Choose from Gallery</span>
                        <span className="text-[10px] text-slate-500 font-medium">Browse stored files</span>
                      </div>
                    </div>
                  )}

                  {geotagSuccessMessage && (
                    <div className={`p-3 rounded-xl border text-xs font-bold leading-tight text-left ${
                      geotagSource === 'photo'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    }`}>
                      {geotagSuccessMessage}
                    </div>
                  )}

                  <div className="space-y-1.5 text-left">
                    <span className="text-[11px] uppercase font-bold text-slate-500">Fast photo templates (फोटो चुनें)</span>
                    <div className="grid grid-cols-3 gap-2">
                      {PRESET_SAMPLE_ASSETS.map((p, idx) => (
                        <button
                          key={idx}
                          id={`btn-report-preset-${idx}`}
                          type="button"
                          onClick={() => {
                            setImageUrl(p.url);
                            setUserDescription(p.description);
                          }}
                          className="p-2 rounded-xl border border-slate-800 text-[10px] bg-[#111621] font-bold text-slate-300 flex flex-col items-center gap-1 cursor-pointer"
                        >
                          <img referrerPolicy="no-referrer" src={p.url} className="w-8 h-8 rounded object-cover" />
                          <span className="truncate w-full text-center">{p.name.split(' ')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Video upload */}
                <div id="video-upload-box" className="p-5 rounded-3xl bg-[#0c1017] border-2 border-slate-800 space-y-4 shadow-xl">
                  <label className="text-sm font-black text-slate-300 flex items-center gap-1.5 text-left">
                    <Video className="w-4.5 h-4.5 text-emerald-400" /> Add a Video of the Problem (समस्या का वीडियो जोड़ें)
                  </label>
                  
                  {videoUrl ? (
                    <div className="space-y-3">
                      <div className="relative rounded-2xl overflow-hidden group aspect-video bg-[#05070a] flex items-center justify-center border border-slate-800">
                        <video controls src={videoUrl} className="w-full h-full object-contain" />
                        <button 
                          id="btn-remove-report-video"
                          type="button"
                          onClick={() => {
                            setVideoUrl('');
                            setVideoFile(null);
                          }}
                          className="absolute top-3 right-3 px-3.5 py-1.5 bg-black/85 text-white text-xs font-bold rounded-xl z-10"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Video Recording (Live Camera capture on mobile) */}
                      <div className="border-2 border-dashed border-slate-800 rounded-2xl p-6 text-center hover:bg-slate-900/40 relative flex flex-col items-center justify-center space-y-2 cursor-pointer min-h-[140px]">
                        <input 
                          type="file" 
                          id="report-video-camera-input"
                          accept="video/*" 
                          capture="environment"
                          onChange={handleVideoChange}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <Video className="w-8 h-8 text-emerald-400" />
                        <span className="text-xs font-black text-slate-200">Record Live Video</span>
                        <span className="text-[10px] text-slate-500 font-medium">Use mobile camera</span>
                      </div>

                      {/* Video Uploading (From gallery) */}
                      <div className="border-2 border-dashed border-slate-800 rounded-2xl p-6 text-center hover:bg-slate-900/40 relative flex flex-col items-center justify-center space-y-2 cursor-pointer min-h-[140px]">
                        <input 
                          type="file" 
                          id="report-video-gallery-input"
                          accept="video/*" 
                          onChange={handleVideoChange}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <Video className="w-8 h-8 text-blue-400" />
                        <span className="text-xs font-black text-slate-200">Choose from Gallery</span>
                        <span className="text-[10px] text-slate-500 font-medium">Browse stored files</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Narrative Description & Speech-to-text dictation */}
                <div id="desc-voice-box" className="p-5 rounded-3xl bg-[#0c1017] border-2 border-slate-800 space-y-4 shadow-xl">
                  <div className="flex justify-between items-center text-xs">
                    <label className="text-sm font-black text-slate-300 flex items-center gap-1.5">
                      <Edit3 className="w-4 h-4 text-emerald-400" /> Describe the Problem (समस्या के बारे में बताएं)
                    </label>
                    
                    <button
                      id="btn-voice-recorder"
                      type="button"
                      onClick={toggleVoiceRecording}
                      className={`flex items-center space-x-1 px-4 py-2 rounded-2xl font-black text-xs transition-colors cursor-pointer ${
                        isRecording 
                          ? 'bg-rose-600 text-white animate-pulse' 
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      <span>{isRecording ? 'Listening...' : 'बोलकर लिखें (माइक)'}</span>
                    </button>
                  </div>

                  {recognitionError && (
                    <p className="text-xs text-rose-500 font-bold text-left">{recognitionError}</p>
                  )}

                  <textarea
                    id="textarea-user-desc"
                    rows={4}
                    value={userDescription}
                    onChange={(e) => setUserDescription(e.target.value)}
                    placeholder="Write details of the issue here. E.g., 'Big pothole outside school gateway. Water has filled it and cars are splashing puddle...'"
                    className="w-full text-sm font-semibold bg-[#111621] text-slate-100 p-4 rounded-2xl border border-slate-800 focus:outline-none focus:border-emerald-500"
                  />

                  {/* Geolocation Coordinate display & manual map entry buttons */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-bold text-slate-400 block text-left">Incident Location (घटना का स्थान)</label>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900/60 p-4 rounded-2xl border border-slate-800 gap-3">
                      <div className="flex items-start space-x-3 text-left">
                        <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20 mt-0.5">
                          <MapPin className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="space-y-0.5">
                          <span className="block text-xs font-black text-slate-200">Incident Address / पता</span>
                          {isGeocoding || isAcquiringGps ? (
                            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                              <span>Resolving coordinates...</span>
                            </div>
                          ) : (
                            <span className="block text-xs text-slate-300 font-medium leading-relaxed max-w-[280px] break-words">
                              {address || 'No location set yet'}
                            </span>
                          )}
                          {lat && lng && (
                            <span className="block text-[10px] font-mono text-slate-500 font-bold">
                              GPS: {lat.toFixed(5)}, {lng.toFixed(5)} ({areaName})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          id="btn-re-acquire-gps"
                          type="button" 
                          onClick={() => acquireLocation()}
                          disabled={isAcquiringGps}
                          className="px-3.5 py-2.5 text-xs font-black bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-emerald-400 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          {isAcquiringGps ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Crosshair className="w-3.5 h-3.5" />
                          )}
                          <span>📍 Detect</span>
                        </button>
                        <button 
                          id="btn-open-map-picker"
                          type="button" 
                          onClick={() => setShowMapPicker(true)}
                          className="px-3.5 py-2.5 text-xs font-black bg-blue-500 hover:bg-blue-400 text-slate-950 rounded-xl shadow-md transition-colors flex items-center gap-1 cursor-pointer font-bold"
                        >
                          <MapIcon className="w-3.5 h-3.5" />
                          <span>🗺️ Choose on Map</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Important Places nearby modifiers */}
                <div id="proximity-box" className="p-5 rounded-3xl bg-[#0c1017] border-2 border-slate-800 space-y-4 shadow-xl">
                  <label className="text-sm font-black text-slate-300 flex items-center gap-1.5 text-left">
                    <Building className="w-4 h-4 text-emerald-400" /> Important Places Nearby (आसपास कोई खास जगह है?)
                  </label>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      id="btn-toggle-school-prox"
                      type="button"
                      onClick={() => setSchoolProximity(!schoolProximity)}
                      className={`p-3.5 rounded-2xl border-2 flex items-center justify-between text-left transition-all ${
                        schoolProximity 
                          ? 'border-emerald-500 bg-emerald-950/20 text-emerald-400 font-bold' 
                          : 'border-slate-800 bg-transparent text-slate-500'
                      }`}
                    >
                      <span className="text-xs">Near School / स्कूल के पास</span>
                      <School className="w-4 h-4" />
                    </button>

                    <button
                      id="btn-toggle-hospital-prox"
                      type="button"
                      onClick={() => setHospitalProximity(!hospitalProximity)}
                      className={`p-3.5 rounded-2xl border-2 flex items-center justify-between text-left transition-all ${
                        hospitalProximity 
                          ? 'border-emerald-500 bg-emerald-950/20 text-emerald-400 font-bold' 
                          : 'border-slate-800 bg-transparent text-slate-500'
                      }`}
                    >
                      <span className="text-xs">Near Hospital / अस्पताल</span>
                      <Building className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-slate-400 block">Is the road blocked? (रास्ता बंद है?)</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['none', 'low', 'medium', 'high'] as const).map((impact) => {
                        const labels: Record<string, string> = {
                          none: 'No / नहीं',
                          low: 'Little / थोड़ा',
                          medium: 'Medium / आधा',
                          high: 'Large / पूरा'
                        };
                        return (
                          <button
                            key={impact}
                            id={`btn-traffic-${impact}`}
                            type="button"
                            onClick={() => setTrafficImpact(impact)}
                            className={`py-3.5 rounded-xl border-2 font-bold text-xs ${
                              trafficImpact === impact 
                                ? 'border-emerald-500 bg-emerald-950/20 text-emerald-400' 
                                : 'border-slate-800 text-slate-500 hover:bg-slate-900/40'
                            }`}
                          >
                            {labels[impact]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* RUN TRIAGE BUTTON */}
                  <button
                    id="btn-run-ai-triage"
                    type="button"
                    onClick={handleAiTriageAnalysis}
                    disabled={aiAnalyzing || (!userDescription && !imageUrl && !videoUrl)}
                    className="w-full py-5 rounded-2xl text-base font-black text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 flex items-center justify-center space-x-2 shadow-lg"
                  >
                    {aiAnalyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                        <span>Checking Problem Details...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify & Submit Details / जांच करें</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right column: AI analysis preview & edit */}
              <div className="lg:col-span-6">
                {!aiAnalyzed ? (
                  <div className="h-full min-h-[300px] border-2 border-dashed border-slate-800 rounded-3xl flex flex-col justify-center items-center p-8 text-center bg-[#0c1017]">
                    <ScanLine className="w-8 h-8 text-slate-500 animate-pulse mb-4" />
                    <h3 className="text-sm font-bold text-slate-300">Triage Center Waiting</h3>
                    <p className="text-xs text-slate-500 max-w-xs mt-2">
                      Add a photo or type/speak detail of the problem on the left, then click "Verify & Submit Details" to analyze and prepare your city ticket.
                    </p>
                  </div>
                ) : (
                  <div className="p-6 rounded-3xl bg-[#0c1017] border-2 border-slate-800 space-y-6 shadow-xl animate-fade-in text-left">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                        <span className="text-xs font-bold text-slate-300">Evaluation Verification Details</span>
                      </div>
                    </div>

                    {aiFields && (
                      <div className="space-y-4 text-xs font-light leading-relaxed">
                        
                        {/* Title section */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-400">Problem Title / विषय</label>
                          <input
                            type="text"
                            id="input-ai-title"
                            value={aiFields.title}
                            onChange={(e) => setAiFields({ ...aiFields, title: e.target.value })}
                            className="w-full p-3.5 rounded-2xl border-2 border-slate-800 bg-[#111621] text-sm font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        {/* Row categories and urgencies */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-400">Category / समस्या का प्रकार</label>
                            <select
                              id="select-ai-category"
                              value={aiFields.category}
                              onChange={(e) => setAiFields({ ...aiFields, category: e.target.value as any })}
                              className="w-full p-3.5 rounded-2xl border-2 border-slate-800 bg-[#111621] text-sm font-bold text-slate-300"
                            >
                              {getCategories().filter(c => c.active).map(cat => (
                                <option key={cat.id} value={cat.id}>
                                  {language === 'hi' ? (cat.hindiName || cat.name) : cat.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-400">How Serious is It? / गंभीरता</label>
                            <select
                              id="select-ai-severity"
                              value={aiFields.severity}
                              onChange={(e) => setAiFields({ ...aiFields, severity: e.target.value as any })}
                              className="w-full p-3.5 rounded-2xl border-2 border-slate-800 bg-[#111621] text-sm font-bold text-slate-300"
                            >
                              <option value="low">{t('low')}</option>
                              <option value="medium">{t('medium')}</option>
                              <option value="high">{t('high')}</option>
                              <option value="critical">{t('critical')}</option>
                            </select>
                          </div>
                        </div>

                        {/* Detailed Description */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-400">Refined Report Details</label>
                          <textarea
                            id="textarea-ai-desc"
                            rows={3}
                            value={aiFields.description}
                            onChange={(e) => setAiFields({ ...aiFields, description: e.target.value })}
                            className="w-full p-3.5 rounded-2xl border-2 border-slate-800 bg-[#111621] text-xs text-slate-300 font-semibold"
                          />
                        </div>

                        {/* Submit */}
                        <button
                          id="btn-report-submit-final"
                          type="button"
                          onClick={handleFinalSubmit}
                          disabled={submitting}
                          className="w-full py-5 rounded-2xl text-base font-black text-slate-950 bg-emerald-500 hover:bg-emerald-400 shadow-xl"
                        >
                          {submitting ? 'Sending report to city board...' : 'Confirm & Save Report / समस्या दर्ज करें'}
                        </button>

                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        ) : (
          <div className="py-20 text-center space-y-4 max-w-md mx-auto bg-[#0c1017] p-8 border-2 border-slate-800 rounded-3xl" id="report-success-screen">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border-2 border-emerald-500/20 animate-bounce">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-white">Report Successfully Saved!</h2>
            <p className="text-sm text-slate-400 font-semibold leading-relaxed">
              Thank you for keeping our community safe. Your report has been dispatched to the area maintenance team. Returning to dashboard...
            </p>
          </div>
        )}
      </AnimatePresence>

      {/* 1. ONBOARDING LOCATION ACCESSIBILITY PROMPT MODAL */}
      <AnimatePresence>
        {showLocationPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0c1017] border-2 border-slate-800 p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-6 text-center text-slate-100"
            >
              <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
                <div className="w-12 h-12 bg-emerald-500/25 border-2 border-emerald-500 rounded-full flex items-center justify-center text-emerald-400">
                  <MapPin className="w-6 h-6 animate-bounce" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-white">📍 Set Incident Location</h3>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">स्थान निर्धारित करें</p>
                <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                  Help the response team fix reported issues faster by providing the exact incident coordinate. Share your live GPS or pin any location manually.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  id="btn-prompt-detect-gps"
                  type="button"
                  onClick={() => {
                    acquireLocation(() => setShowLocationPrompt(false));
                  }}
                  disabled={isAcquiringGps}
                  className="w-full p-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10 animate-pulse"
                >
                  {isAcquiringGps ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  ) : (
                    <Crosshair className="w-4 h-4 text-slate-950" />
                  )}
                  <span>Auto-Detect Live GPS (जीपीएस से खोजें)</span>
                </button>

                <button
                  id="btn-prompt-open-map"
                  type="button"
                  onClick={() => {
                    setShowLocationPrompt(false);
                    setShowMapPicker(true);
                  }}
                  className="w-full p-4 bg-slate-850 hover:bg-slate-800 text-white border-2 border-slate-800 hover:border-slate-700 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MapIcon className="w-4 h-4 text-emerald-400" />
                  <span>Select Manually on Map (मैप पर चुनें)</span>
                </button>
              </div>

              <button
                id="btn-prompt-skip"
                type="button"
                onClick={() => setShowLocationPrompt(false)}
                className="text-xs text-slate-500 hover:text-slate-400 font-black block mx-auto underline cursor-pointer"
              >
                Skip and use default Hazratganj (छोड़ें)
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. INTERACTIVE MANUALLY PIN LOCATION MAP PICKER MODAL */}
      <AnimatePresence>
        {showMapPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-[#0c1017] border-2 border-slate-800 rounded-3xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden shadow-2xl text-slate-100 animate-fade-in"
            >
              {/* Picker Header */}
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <MapIcon className="w-5 h-5 text-emerald-400" />
                    <span>Select Incident Location (घटना स्थान चुनें)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Search or tap on the map below to pinpoint the exact location.
                  </p>
                </div>
                <button
                  id="btn-close-map-picker"
                  type="button"
                  onClick={() => setShowMapPicker(false)}
                  className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-5 h-5 text-slate-400 hover:text-white" />
                </button>
              </div>

              {/* Picker Search Panel */}
              <div className="p-4 bg-slate-900/40 border-b border-slate-800 space-y-3">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSearchLocation(searchQuery);
                  }}
                  className="flex gap-2"
                >
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      id="input-picker-search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search landmark, street, sector (e.g. Hazratganj, Chowk, Gomti Nagar)..."
                      className="w-full pl-10 pr-4 py-3 bg-[#111621] border border-slate-800 rounded-2xl text-sm font-semibold text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button
                    id="btn-picker-search-submit"
                    type="submit"
                    className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-2xl transition-all shadow-md cursor-pointer"
                  >
                    Search
                  </button>
                </form>

                {/* Popular Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold mr-1">Tapping choices:</span>
                  {LANDMARK_PRESETS.map((preset, pIdx) => (
                    <button
                      key={pIdx}
                      id={`btn-preset-chip-${pIdx}`}
                      type="button"
                      onClick={() => {
                        setSearchQuery(preset.name.split(',')[0]);
                        handleSearchLocation(preset.name);
                      }}
                      className="px-2.5 py-1 bg-slate-800/60 hover:bg-slate-800 text-[10px] font-bold text-slate-300 border border-slate-800 hover:border-slate-700 rounded-lg transition-all cursor-pointer"
                    >
                      {preset.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Map Canvas Frame Area */}
              <div className="flex-1 relative bg-[#04070d] flex flex-col overflow-hidden">
                
                {/* City selector banner for vector fallback map */}
                {!hasValidKey && (
                  <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase bg-slate-950 text-slate-400 px-2 py-1 rounded-lg border border-slate-800">
                      City Grid:
                    </span>
                    <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                      {getCities().filter(c => c.active).map(city => {
                        const coords = {
                          lucknow: { lat: 26.8467, lng: 80.9462 },
                          bengaluru: { lat: 12.9719, lng: 77.6412 },
                          delhi: { lat: 28.6139, lng: 77.2090 },
                          pune: { lat: 18.5204, lng: 73.8567 },
                          mumbai: { lat: 19.0760, lng: 72.8777 },
                          chennai: { lat: 13.0827, lng: 80.2707 },
                          kolkata: { lat: 22.5726, lng: 88.3639 },
                          hyderabad: { lat: 17.3850, lng: 78.4867 }
                        }[city.id] || { lat: 26.8467, lng: 80.9462 };

                        return (
                          <button
                            key={city.id}
                            type="button"
                            onClick={() => {
                              setPickerCity(city.id as any);
                              setLat(coords.lat);
                              setLng(coords.lng);
                              setGoogleMapCenter(coords);
                              reverseGeocode(coords.lat, coords.lng);
                            }}
                            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${pickerCity === city.id ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                          >
                            {city.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Main map rendering element */}
                <div className="w-full h-full flex-1 relative z-10">
                  <div ref={pickerMapContainerRef} className="w-full h-full rounded" style={{ minHeight: '350px' }} />
                </div>

                {/* Map corner device gps recalibrate */}
                <button
                  id="btn-picker-my-location"
                  type="button"
                  onClick={() => acquireLocation()}
                  disabled={isAcquiringGps}
                  className="absolute bottom-4 right-4 z-20 p-3 bg-[#0c1017] border border-slate-800 hover:border-slate-700 hover:bg-slate-900 rounded-2xl shadow-xl transition-all flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-200"
                >
                  {isAcquiringGps ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  ) : (
                    <Crosshair className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>GPS Center</span>
                </button>
              </div>

              {/* Bottom Address Confirmation Panel */}
              <div className="p-5 border-t border-slate-800 bg-slate-950/40 space-y-4">
                <div className="flex items-start gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 text-left">
                  <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20 mt-0.5">
                    <MapPin className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">Selected Location Details</span>
                    {isGeocoding ? (
                      <div className="flex items-center space-x-2 text-xs text-slate-400 py-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                        <span>Finding street address details...</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-200 font-bold leading-normal block">
                        {address || 'Mark a spot on the map to resolve address details.'}
                      </span>
                    )}
                    {lat && lng && (
                      <span className="text-[10px] font-mono text-slate-500 font-bold block">
                        Coordinates: {lat.toFixed(6)}, {lng.toFixed(6)}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  id="btn-confirm-map-picker-location"
                  type="button"
                  onClick={() => {
                    setShowMapPicker(false);
                    speakText(language === 'hi' ? "लोकेशन सेट कर दी गई है।" : "Location selection saved.");
                  }}
                  className="w-full py-4.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base rounded-2xl transition-all shadow-lg shadow-emerald-500/10 cursor-pointer"
                >
                  Confirm Pin Location (स्थान की पुष्टि करें)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
