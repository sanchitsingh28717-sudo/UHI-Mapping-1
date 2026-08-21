import { create } from 'zustand';

interface UserProfile {
  role: string;
  role_display: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  profile: UserProfile;
}

interface AnalysisResult {
  coordinates: {
    latitude: number;
    longitude: number;
  };
  environmental_indicators: {
    dem: number;
    lst: number;
    lulc: number;
    ndbi: number;
    ndvi: number;
    ndwi: number;
  };
  prediction: {
    heat_zone: string;
    confidence: number;
    metrics: {
      accuracy: number;
      precision: number;
      recall: number;
      f1_score: number;
    };
  };
  explainability: {
    shap_summary: Record<string, number>;
  };
  risk_index: {
    risk_score: number;
    risk_category: string;
    population_density: number;
  };
  wind_corridor: {
    roughness_length_m: number;
    reference_wind_speed_ms: number;
    calculated_wind_speed_ms: number;
    ventilation_efficiency_pct: number;
    obstruction_status: string;
    building_height_recommendation: string;
    wind_vector_grid?: any[];
  };
  groundwater_recharge: {
    soil_sealing_index: number;
    permeability_index: number;
    estimated_slope_pct: number;
    recharge_suitability_score: number;
    recharge_category: string;
    planning_recommendation: string;
    recharge_suitability_grid?: any[];
  };
}

export interface SankalpOptimization {
  initial_height: number;
  initial_lst: number;
  initial_wind: number;
  initial_albedo: number;
  final_height: number;
  final_lst: number;
  final_wind: number;
  final_albedo: number;
  hvac_savings_mwh: number;
  cycles: number;
  lst_delta: number;
  wind_delta: number;
}

export interface SankalpActuation {
  target_zone_lat: number;
  target_zone_lng: number;
  hardware_triggers: {
    louver_servo_angle_deg: number;
    misting_grid_pulse_ms: number;
    smart_glass_opacity_pct: number;
  };
  protocol: string;
}

export interface SankalpData {
  optimization?: SankalpOptimization;
  actuation?: SankalpActuation;
  dossier_file?: string;
  logs?: string[];
  hardware_telemetry?: Record<string, string>;
  live_weather?: {
    ambient_temp: number;
    synoptic_wind: number;
  };
  state_hash?: string;
}

interface AppState {
  token: string | null;
  user: User | null;
  selectedCoords: { lat: number; lng: number } | null;
  analysisResult: AnalysisResult | null;
  recommendations: string | null;
  sankalpData: SankalpData | null;
  loading: boolean;
  error: string | null;
  hoveredWard: any | null;
  activeCity: string;
  
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setSelectedCoords: (coords: { lat: number; lng: number } | null) => void;
  setAnalysisResult: (result: AnalysisResult | null) => void;
  setRecommendations: (recs: string | null) => void;
  setSankalpData: (data: SankalpData | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setHoveredWard: (ward: any | null) => void;
  setActiveCity: (city: string) => void;
  
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  runAnalysis: (lat: number, lng: number) => Promise<boolean>;
  fetchRecommendations: (lat: number, lng: number) => Promise<void>;
}

const BACKEND_URL = 'http://127.0.0.1:8000';

export const useStore = create<AppState>((set, get) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  user: null,
  selectedCoords: null,
  analysisResult: null,
  recommendations: null,
  sankalpData: null,
  loading: false,
  error: null,
  hoveredWard: null,
  activeCity: 'Ahmedabad',

  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
    set({ token });
  },
  
  setUser: (user) => set({ user }),
  setSelectedCoords: (selectedCoords) => set({ selectedCoords }),
  setAnalysisResult: (analysisResult) => set({ analysisResult }),
  setRecommendations: (recommendations) => set({ recommendations }),
  setSankalpData: (sankalpData) => set({ sankalpData }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setHoveredWard: (hoveredWard) => set({ hoveredWard }),
  setActiveCity: (activeCity) => set({ activeCity, selectedCoords: null, analysisResult: null, recommendations: null, sankalpData: null, error: null }),

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      if (!res.ok) {
        throw new Error('Authentication failed. Please verify credentials.');
      }
      
      const data = await res.json();
      get().setToken(data.access);
      await get().fetchProfile();
      set({ loading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  logout: () => {
    get().setToken(null);
    set({ user: null, analysisResult: null, selectedCoords: null, recommendations: null, sankalpData: null });
  },

  fetchProfile: async () => {
    const token = get().token;
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/profile/`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const user = await res.json();
        set({ user });
      } else {
        get().logout();
      }
    } catch (err) {
      get().logout();
    }
  },

  runAnalysis: async (lat, lng) => {
    set({ loading: true, error: null, analysisResult: null, recommendations: null, sankalpData: null });
    const token = get().token;
    if (!token) {
      set({ error: 'Session expired. Please log in again.', loading: false });
      return false;
    }
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/analyze/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze coordinates.');
      }
      
      set({ analysisResult: data, loading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  fetchRecommendations: async (lat, lng) => {
    const token = get().token;
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/recommend/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
      if (res.ok) {
        const data = await res.json();
        set({
          recommendations: data.recommendations,
          sankalpData: data.sankalp || null
        });
      }
    } catch (err) {
      // Quiet fail or handle locally
    }
  }
}));
