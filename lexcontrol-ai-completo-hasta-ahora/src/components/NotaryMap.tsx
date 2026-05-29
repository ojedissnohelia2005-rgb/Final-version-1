import React, { useState, useEffect, useMemo } from "react";
import { Empresa, SedeEmpresa, Notaria, UserProfile } from "../types";
import { 
  Search, 
  MapPin, 
  Phone, 
  Clock, 
  User, 
  Building, 
  CheckCircle2, 
  Navigation, 
  Compass, 
  Sparkles, 
  Map as MapIcon, 
  ListOrdered,
  AlertCircle,
  Plus,
  Trash2,
  Building2,
  FolderOpen,
  Scale,
  ShieldAlert,
  HelpCircle,
  Locate,
  ArrowRight
} from "lucide-react";
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  Pin, 
  useMap, 
  useMapsLibrary 
} from "@vis.gl/react-google-maps";

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "";

const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY";

interface NotaryMapProps {
  currentNegocioId: string;
  selectedEmpresa?: Empresa;
  currentProfile?: UserProfile | null;
  onEmpresaUpdate?: (updatedEmpresa: Empresa) => void;
}

export interface MapLocation {
  id: string;
  tipo: "notaria" | "unidad_judicial" | "fiscalia" | "mediacion" | "sede_empresa";
  nombre: string;
  numero?: number;
  canton: string;
  provincia: string;
  direccion: string;
  telefono: string;
  horario_atencion: string;
  lat: number;
  lng: number;
  isGoogleResult?: boolean;
  distance?: number | null;
  notario_titular?: string; // for backward compatibility with catalog details
  tipo_sede?: "administrativa" | "planta" | "distribuidor" | "otro";
}

// MapController keeps map centered on selected location coordinates
function MapController({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    if (map && center && center.lat && center.lng) {
      map.panTo(center);
      map.setZoom(14);
    }
  }, [map, center]);
  return null;
}

// Inner Places Multi-Category Search Component utilizing Google Maps SDK
function GooglePlacesSearchTrigger({
  query,
  entityType,
  onResults,
  triggerCount,
  setSearching
}: {
  query: string;
  entityType: "notaria" | "unidad_judicial" | "fiscalia" | "mediacion";
  onResults: (res: MapLocation[]) => void;
  triggerCount: number;
  setSearching: (val: boolean) => void;
}) {
  const placesLib = useMapsLibrary("places");
  const map = useMap();

  useEffect(() => {
    if (triggerCount === 0 || !placesLib) return;
    
    setSearching(true);
    const term = query.trim();
    let textQuery = "";

    // Build precise legal entity queries localized in Ecuador
    if (entityType === "notaria") {
      textQuery = term ? `notaria publica ${term} ecuador` : "notaria publica en Ecuador";
    } else if (entityType === "unidad_judicial") {
      textQuery = term ? `complejo unidad judicial corte de justicia ${term} ecuador` : "unidad judicial complex corte de justicia Ecuador";
    } else if (entityType === "fiscalia") {
      textQuery = term ? `fiscalia general del estado canton ${term} ecuador` : "fiscalia general del estado Ecuador";
    } else if (entityType === "mediacion") {
      textQuery = term ? `centro de mediacion y arbitraje ${term} ecuador` : "centro de mediacion Ecuador";
    }

    placesLib.Place.searchByText({
      textQuery: textQuery,
      fields: ["id", "displayName", "formattedAddress", "location", "nationalPhoneNumber", "regularOpeningHours"],
      locationBias: map?.getCenter() || { lat: -2.19616, lng: -79.88621 },
      maxResultCount: 20,
    })
    .then(({ places }) => {
      const formatted = places.map((p, index): MapLocation => {
        let openTime = "Lunes a Viernes 08:00 - 17:00";
        if (p.regularOpeningHours?.weekdayDescriptions) {
          openTime = p.regularOpeningHours.weekdayDescriptions.slice(0, 3).join(" / ");
        }
        
        let customName = p.displayName || "";
        // Clean up or match naming conventions
        if (entityType === "notaria" && !customName.toLowerCase().includes("notaría")) {
          customName = `Notaría Pública - ${customName}`;
        } else if (entityType === "unidad_judicial" && !customName.toLowerCase().includes("judicial") && !customName.toLowerCase().includes("complejo")) {
          customName = `Unidad Judicial - ${customName}`;
        } else if (entityType === "fiscalia" && !customName.toLowerCase().includes("fiscalía") && !customName.toLowerCase().includes("fge")) {
          customName = `Fiscalía Cantonal - ${customName}`;
        }

        return {
          id: p.id || `g-${entityType}-${index}-${Date.now()}`,
          tipo: entityType,
          nombre: customName,
          numero: index + 1,
          canton: term || "Ecuador",
          provincia: "Google Maps Platform",
          direccion: p.formattedAddress || "Ecuador",
          telefono: p.nationalPhoneNumber || "Sin número registrado",
          horario_atencion: openTime,
          lat: p.location?.lat() || -2.19616,
          lng: p.location?.lng() || -79.88621,
          isGoogleResult: true,
          notario_titular: customName
        };
      });
      onResults(formatted);
    })
    .catch((err) => {
      console.error("Google Text Search fails", err);
    })
    .finally(() => {
      setSearching(false);
    });
  }, [placesLib, triggerCount]);

  return null;
}

export default function NotaryMap({ currentNegocioId, selectedEmpresa, currentProfile, onEmpresaUpdate }: NotaryMapProps) {
  const [notarias, setNotarias] = useState<Notaria[]>([]);
  const [googleResults, setGoogleResults] = useState<MapLocation[]>([]);

  // Notaria manual registration states
  const [showAddNotaryPanel, setShowAddNotaryPanel] = useState(false);
  const [savingNotary, setSavingNotary] = useState(false);
  const [newNotaryForm, setNewNotaryForm] = useState({
    numero: "",
    canton: "Guayaquil",
    provincia: "Guayas",
    direccion: "",
    telefono: "",
    notario_titular: "",
    horario_atencion: "Lunes a Viernes 08:30 - 17:00",
    lat: "",
    lng: ""
  });
  
  const [activeTab, setActiveTab] = useState<"catalog" | "google" | "sedes">("catalog");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCanton, setSelectedCanton] = useState<string>("todos");
  const [openOnly, setOpenOnly] = useState(false);
  
  // Custom type selector for live Google searches
  const [googleEntityType, setGoogleEntityType] = useState<"notaria" | "unidad_judicial" | "fiscalia" | "mediacion">("notaria");
  
  // Selected Map item state
  const [selectedItem, setSelectedItem] = useState<MapLocation | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [searchingGoogle, setSearchingGoogle] = useState(false);
  const [googleTriggerCount, setGoogleTriggerCount] = useState(0);

  // User location and sorting by proximity states
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sortByProximity, setSortByProximity] = useState(false);

  // Sede creation / management states
  const [showAddSedePanel, setShowAddSedePanel] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [newSedeForm, setNewSedeForm] = useState({
    nombre: "",
    tipo: "administrativa" as "administrativa" | "planta" | "distribuidor" | "otro",
    canton: "Guayaquil",
    provincia: "Guayas",
    direccion: "",
    telefono: "",
    lat: "",
    lng: ""
  });
  const [savingSede, setSavingSede] = useState(false);

  // Fetch baseline local notary records
  useEffect(() => {
    fetchNotarias();
    // Prompt the user for geolocation respectfully to suggest closest entities
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setSortByProximity(true); // default option enabled if permission is granted
        },
        (err) => {
          console.warn("User geolocation rejected or not available:", err);
        }
      );
    }
  }, []);

  const fetchNotarias = async () => {
    try {
      const res = await fetch("/api/notarias");
      let data = await res.json();
      
      if (!Array.isArray(data)) data = [];

      setNotarias(data);
      if (data.length > 0) {
        const firstAsLocation: MapLocation = {
          id: data[0].id,
          tipo: "notaria",
          nombre: `Notaría ${data[0].numero} de ${data[0].canton}`,
          numero: data[0].numero,
          canton: data[0].canton,
          provincia: data[0].provincia,
          direccion: data[0].direccion,
          telefono: data[0].telefono,
          horario_atencion: data[0].horario_atencion,
          lat: data[0].lat,
          lng: data[0].lng,
          notario_titular: data[0].notario_titular
        };
        setSelectedItem(firstAsLocation);
      }
    } catch (err) {
      console.error("Error fetching local catalog of notaries", err);
    } finally {
      setLoading(false);
    }
  };

  // Live-search requires Google Maps. Without a key, no synthetic results are shown.
  useEffect(() => {
    if (activeTab !== "google") return;
    if (hasValidKey) return;
    setGoogleResults([]);
    setSearchingGoogle(false);
  }, [activeTab, hasValidKey, searchQuery, googleEntityType]);

  const cantones = ["todos", ...Array.from(new Set(notarias.map((n) => n.canton)))];

  const handleCantonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCanton(e.target.value);
  };

  const isCurrentlyOpen = (horarioStr: string) => {
    const now = new Date();
    const hours = now.getHours();
    const day = now.getDay(); // 0 Sunday, 6 Saturday
    if (day === 0) return false;
    if (day === 6) {
      if (horarioStr.toLowerCase().includes("sábado")) {
        return hours >= 9 && hours < 13;
      }
      return false;
    }
    return hours >= 8 && hours < 17;
  };

  // Haversine formula to compute geodesic distance in kilometers
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Converted catalog notaries to MapLocation array
  const catalogLocations = useMemo((): MapLocation[] => {
    return notarias.map(n => ({
      id: n.id,
      tipo: "notaria",
      nombre: n.notario_titular.startsWith("Notaría") ? n.notario_titular : `Notaría ${n.numero} de ${n.canton}`,
      numero: n.numero,
      canton: n.canton,
      provincia: n.provincia,
      direccion: n.direccion,
      telefono: n.telefono,
      horario_atencion: n.horario_atencion,
      lat: n.lat,
      lng: n.lng,
      notario_titular: n.notario_titular
    }));
  }, [notarias]);

  // Filter local catalog based on user controls
  const filteredCatalogLocations = useMemo(() => {
    return catalogLocations.filter((item) => {
      const matchesSearch =
        item.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.direccion.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.notario_titular || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCanton = selectedCanton === "todos" || item.canton === selectedCanton;
      const matchesOpen = !openOnly || isCurrentlyOpen(item.horario_atencion);

      return matchesSearch && matchesCanton && matchesOpen;
    });
  }, [catalogLocations, searchQuery, selectedCanton, openOnly]);

  // Map company's custom sedes list to standard UI locations
  const companyLocations = useMemo((): MapLocation[] => {
    if (!selectedEmpresa || !selectedEmpresa.sedes) return [];
    return selectedEmpresa.sedes.map(s => ({
      id: s.id,
      tipo: "sede_empresa",
      nombre: s.nombre,
      canton: s.canton,
      provincia: s.provincia,
      direccion: s.direccion,
      telefono: s.telefono || "Sin teléfono registrado",
      horario_atencion: "Lunes a Viernes 08:30 - 17:30 (Sede Administrativa)",
      lat: s.lat,
      lng: s.lng,
      tipo_sede: s.tipo
    }));
  }, [selectedEmpresa]);

  // Render combined array with computed distances
  const displayedItems = useMemo((): MapLocation[] => {
    let source: MapLocation[] = [];
    if (activeTab === "catalog") {
      source = filteredCatalogLocations;
    } else if (activeTab === "google") {
      source = googleResults;
    } else if (activeTab === "sedes") {
      source = companyLocations.filter(loc => 
        loc.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.direccion.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Map each location with proximity metrics if GPS coordinate is enabled
    const mapped = source.map((item) => {
      let distance: number | null = null;
      if (userLocation && item.lat && item.lng) {
        distance = calculateDistance(userLocation.lat, userLocation.lng, item.lat, item.lng);
      }
      return { ...item, distance };
    });

    if (sortByProximity && userLocation) {
      return [...mapped].sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    }

    return mapped;
  }, [activeTab, googleResults, filteredCatalogLocations, companyLocations, searchQuery, userLocation, sortByProximity]);

  // Keep selected element synchronized elegantly
  useEffect(() => {
    if (displayedItems.length > 0) {
      const found = displayedItems.find((x) => x.id === selectedItem?.id);
      if (!found) {
        setSelectedItem(displayedItems[0]);
      }
    } else {
      setSelectedItem(null);
    }
  }, [displayedItems]);

  const handleGoogleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab !== "google") {
      setActiveTab("google");
    }
    setGoogleTriggerCount((prev) => prev + 1);
  };

  // Queries matching real coordinates dynamically using Google Places service in the background
  const handleQueryNewSedeLocation = async () => {
    if (!newSedeForm.direccion && !newSedeForm.nombre) {
      alert("Por favor ingrese un nombre o dirección de la oficina para buscar.");
      return;
    }
    
    const searchString = `${newSedeForm.nombre} ${newSedeForm.direccion} ${newSedeForm.canton} Ecuador`;
    setIsGeocoding(true);
    
    try {
      if ((window as any).google && (window as any).google.maps) {
        const div = document.createElement("div");
        const service = new (window as any).google.maps.places.PlacesService(div);
        service.textSearch({ query: searchString }, (results: any, status: any) => {
          if (status === "OK" && results?.[0]?.geometry?.location) {
            const loc = results[0].geometry.location;
            setNewSedeForm(prev => ({
              ...prev,
              lat: loc.lat().toFixed(6),
              lng: loc.lng().toFixed(6)
            }));
          } else {
            alert("Google Maps no encontró coordenadas para esa sede. Ingrese latitud y longitud verificadas manualmente.");
          }
          setIsGeocoding(false);
        });
      } else {
        throw new Error("SDK de Google Maps no cargado");
      }
    } catch (err) {
      console.warn("Autolocate failed:", err);
      alert("Active Google Maps para autoubicar sedes o ingrese coordenadas verificadas manualmente.");
      setIsGeocoding(false);
    }
  };

  // POST new corporate facility to backend
  const handleAddSedeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSedeForm.nombre) {
      alert("Por favor ingrese el nombre oficial de la sede.");
      return;
    }

    setSavingSede(true);
    
    let finalLat = parseFloat(newSedeForm.lat);
    let finalLng = parseFloat(newSedeForm.lng);
    
    if (isNaN(finalLat) || isNaN(finalLng)) {
      alert("Ingrese coordenadas reales de la sede o use Google Maps para autoubicarla.");
      setSavingSede(false);
      return;
    }

    try {
      const resp = await fetch(`/api/negocios/${currentNegocioId}/sedes/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: newSedeForm.nombre,
          tipo: newSedeForm.tipo,
          canton: newSedeForm.canton,
          provincia: newSedeForm.provincia,
          direccion: newSedeForm.direccion,
          telefono: newSedeForm.telefono,
          lat: finalLat,
          lng: finalLng
        })
      });

      if (resp.ok) {
        const result = await resp.json();
        if (result.success && onEmpresaUpdate && selectedEmpresa) {
          const updatedEmpresa: Empresa = {
            ...selectedEmpresa,
            sedes: result.sedes
          };
          onEmpresaUpdate(updatedEmpresa);
          
          // Clear form values
          setNewSedeForm({
            nombre: "",
            tipo: "administrativa",
            canton: "Guayaquil",
            provincia: "Guayas",
            direccion: "",
            telefono: "",
            lat: "",
            lng: ""
          });
          setShowAddSedePanel(false);
          setActiveTab("sedes"); // switch back to see it
        }
      }
    } catch (err) {
      console.error("Error setting company offices", err);
    } finally {
      setSavingSede(false);
    }
  };

  const handleQueryNewNotaryLocation = async () => {
    if (!newNotaryForm.direccion) {
      alert("Por favor ingrese la dirección de la Notaría para buscar geolocalización.");
      return;
    }
    
    const searchString = `Notaria ${newNotaryForm.numero} canton ${newNotaryForm.canton} Ecuador`;
    setIsGeocoding(true);
    
    try {
      if ((window as any).google && (window as any).google.maps) {
        const div = document.createElement("div");
        const service = new (window as any).google.maps.places.PlacesService(div);
        service.textSearch({ query: searchString }, (results: any, status: any) => {
          if (status === "OK" && results?.[0]?.geometry?.location) {
            const loc = results[0].geometry.location;
            setNewNotaryForm(prev => ({
              ...prev,
              lat: loc.lat().toFixed(6),
              lng: loc.lng().toFixed(6)
            }));
          } else {
            alert("Google Maps no encontró coordenadas para esa notaría. Ingrese latitud y longitud verificadas manualmente.");
          }
          setIsGeocoding(false);
        });
      } else {
        throw new Error("SDK de Google Maps no detectado");
      }
    } catch (err) {
      console.warn("No se pudo geolocalizar la notaría:", err);
      alert("Active Google Maps para autoubicar notarías o ingrese coordenadas verificadas manualmente.");
      setIsGeocoding(false);
    }
  };

  const handleAddNotarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotaryForm.numero || !newNotaryForm.canton || !newNotaryForm.direccion) {
      alert("Por favor complete los campos obligatorios (*).");
      return;
    }

    setSavingNotary(true);

    let finalLat = parseFloat(newNotaryForm.lat);
    let finalLng = parseFloat(newNotaryForm.lng);

    if (isNaN(finalLat) || isNaN(finalLng)) {
      alert("Ingrese coordenadas reales de la notaría o use Google Maps para autoubicarla.");
      setSavingNotary(false);
      return;
    }

    try {
      const resp = await fetch("/api/notarias/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numero: Number(newNotaryForm.numero),
          canton: newNotaryForm.canton,
          provincia: newNotaryForm.provincia,
          direccion: newNotaryForm.direccion,
          telefono: newNotaryForm.telefono,
          notario_titular: newNotaryForm.notario_titular,
          horario_atencion: newNotaryForm.horario_atencion,
          lat: finalLat,
          lng: finalLng
        })
      });

      if (resp.ok) {
        const result = await resp.json();
        if (result.success) {
          alert(`¡Notaría ${newNotaryForm.numero} de ${newNotaryForm.canton} guardada de forma segura!`);
          
          // Re-fetch local data
          fetchNotarias();

          // Clear form values
          setNewNotaryForm({
            numero: "",
            canton: "Guayaquil",
            provincia: "Guayas",
            direccion: "",
            telefono: "",
            notario_titular: "",
            horario_atencion: "Lunes a Viernes 08:30 - 17:00",
            lat: "",
            lng: ""
          });
          setShowAddNotaryPanel(false);
          setActiveTab("catalog");
        }
      }
    } catch (err) {
      console.error("Error saving manual notary registered", err);
    } finally {
      setSavingNotary(false);
    }
  };

  // Helper colors and glyph identifiers based on category
  const getCategoryDetails = (tipo: MapLocation["tipo"]) => {
    switch (tipo) {
      case "notaria":
        return {
          bgColor: "bg-dangerSoft/80",
          textColor: "text-danger",
          icon: <FolderOpen className="w-4 h-4" />,
          pinColor: "#be123c",
          glyph: "N",
          label: "Notaría Pública"
        };
      case "unidad_judicial":
        return {
          bgColor: "bg-indigo-50",
          textColor: "text-indigo-600",
          icon: <Scale className="w-4 h-4" />,
          pinColor: "#4f46e5",
          glyph: "J",
          label: "Unidad/Complejo Judicial"
        };
      case "fiscalia":
        return {
          bgColor: "bg-amber-50",
          textColor: "text-amber-600",
          icon: <ShieldAlert className="w-4 h-4" />,
          pinColor: "#d97706",
          glyph: "F",
          label: "Fiscalía del Estado"
        };
      case "mediacion":
        return {
          bgColor: "bg-[#EBF7FC]",
          textColor: "text-[#0891b2]",
          icon: <Compass className="w-4 h-4" />,
          pinColor: "#0891b2",
          glyph: "M",
          label: "Mediación / Defensoría"
        };
      case "sede_empresa":
        return {
          bgColor: "bg-emerald-50",
          textColor: "text-emerald-600",
          icon: <Building2 className="w-4 h-4" />,
          pinColor: "#059669",
          glyph: "🏭",
          label: "Sede de la Empresa"
        };
      default:
        return {
          bgColor: "bg-gray-100",
          textColor: "text-gray-700",
          icon: <HelpCircle className="w-4 h-4" />,
          pinColor: "#374151",
          glyph: "?",
          label: "Ubicación Judicial"
        };
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-borderSoft pb-4">
        <div>
          <h1 className="text-3xl font-serif font-semibold tracking-tight text-charcoal">
            Geolocalización Judicial e Infraestructura
          </h1>
          <p className="text-sm text-charcoalSoft font-sans">
            Mapee y controle Notarías, Unidades Judiciales, Fiscalías y contraste con las localidades físicas (oficinas, plantas y distribuidores) de {selectedEmpresa?.nombre || "la Empresa"}.
          </p>
        </div>

        {/* DATA SOURCE TOGGLE */}
        <div className="flex bg-[#F5F1EB] rounded-2xl p-1 shrink-0 border border-borderSoft select-none shadow-sm">
          <button
            onClick={() => {
              setActiveTab("catalog");
              setSearchQuery("");
            }}
            className={`cursor-pointer px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === "catalog"
                ? "bg-charcoal text-cream shadow-sm"
                : "text-charcoalSoft hover:text-charcoal"
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            Catálogo Notarías
          </button>
          <button
            onClick={() => {
              setActiveTab("google");
              setSearchQuery("");
              if (googleResults.length === 0) {
                setGoogleTriggerCount((prev) => prev + 1);
              }
            }}
            className={`cursor-pointer px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === "google"
                ? "bg-charcoal text-cream shadow-sm"
                : "text-charcoalSoft hover:text-charcoal"
            }`}
          >
            <Sparkles className="w-4 h-4 text-sidebarRose" />
            Buscar en Vivo (Google)
          </button>
          <button
            onClick={() => {
              setActiveTab("sedes");
              setSearchQuery("");
            }}
            className={`cursor-pointer px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === "sedes"
                ? "bg-charcoal text-cream shadow-sm"
                : "text-charcoalSoft hover:text-charcoal"
            }`}
          >
            <Building2 className="w-4 h-4 text-emerald-600" />
            Sedes Empresa ({companyLocations.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT VIEWPORT: CONTROLS & DIRECTORY RESULTS */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* SEARCH FORMS */}
          <div className="bg-paper border border-borderSoft rounded-2xl p-4 shadow-sm space-y-3">
            
            {activeTab === "google" && (
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-charcoalMuted font-mono">
                  ¿Qué entidad desea geolocalizar?
                </label>
                <select
                  value={googleEntityType}
                  onChange={(e) => {
                    setGoogleEntityType(e.target.value as any);
                    setGoogleResults([]);
                  }}
                  className="w-full bg-cream border border-borderSoft rounded-xl px-3 py-2.5 text-xs text-charcoal font-semibold focus:outline-none focus:border-charcoal font-sans"
                >
                  <option value="notaria">📂 Notarías Públicas (Faltantes y Oficiales)</option>
                  <option value="unidad_judicial">⚖️ Unidades Judiciales / Tribunales / Cortes</option>
                  <option value="fiscalia">🏢 Fiscalías / Delegaciones del Ministerio Público</option>
                  <option value="mediacion">🤝 Centros de Mediación y Apoyo</option>
                </select>
              </div>
            )}

            {/* Direct query box */}
            <form onSubmit={handleGoogleSearchSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-charcoalMuted mb-1 font-mono">
                  {activeTab === "google" 
                    ? `Ciudad / Cantón para Encontrar ${getCategoryDetails(googleEntityType).label}`
                    : "Filtrar por términos"
                  }
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-charcoalMuted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      activeTab === "google" 
                        ? "ej: Guayaquil, Quito, Ceibos, Samborondón..." 
                        : activeTab === "sedes" 
                          ? "Buscar en sedes registradas..."
                          : "Buscar titular, dirección o número..."
                    }
                    className="w-full bg-cream border border-borderSoft rounded-xl pl-9 pr-4 py-2.5 text-xs text-charcoal placeholder:text-charcoalMuted focus:outline-none focus:border-charcoal transition-colors font-sans"
                  />
                </div>
              </div>

              {/* If catalog, filter by Canton available */}
              {activeTab === "catalog" && (
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-charcoalMuted mb-1 font-sans">
                    Filtrar por Cantón
                  </label>
                  <select
                    value={selectedCanton}
                    onChange={handleCantonChange}
                    className="w-full bg-cream border border-borderSoft rounded-xl px-3 py-2 text-xs text-charcoal focus:outline-none focus:border-charcoal font-sans"
                  >
                    {cantones.map((c) => (
                      <option key={c} value={c}>
                        {c === "todos" ? "Todos los Cantones de Catálogo" : c}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Custom filters */}
              <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1 select-none">
                {activeTab !== "sedes" && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={openOnly}
                      onChange={(e) => setOpenOnly(e.target.checked)}
                      className="w-4 h-4 rounded text-charcoal border-borderSoft focus:ring-charcoal accent-charcoal"
                    />
                    <span className="text-xs font-semibold text-charcoalSoft font-sans">
                      Abiertas ahora
                    </span>
                  </label>
                )}

                {userLocation && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sortByProximity}
                      onChange={(e) => setSortByProximity(e.target.checked)}
                      className="w-4 h-4 rounded text-charcoal border-borderSoft focus:ring-charcoal accent-charcoal"
                    />
                    <span className="text-xs font-semibold text-sidebarRose font-sans flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5" /> Más cercanas primero
                    </span>
                  </label>
                )}
              </div>

              {/* Live Search Trigger button for Google Map Source */}
              {activeTab === "google" && (
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={searchingGoogle}
                    className="cursor-pointer w-full bg-charcoal hover:bg-charcoalSoft text-cream text-[11px] font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-sidebarRose shrink-0" />
                    {searchingGoogle ? "Explorando Base de Google..." : `Escanear ${getCategoryDetails(googleEntityType).label} en Google`}
                  </button>
                  <div className="text-[9.5px] text-charcoalMuted text-center mt-1.5 leading-tight">
                    Cruza la base de datos de Google Maps en vivo para recopilar entidades judicialmente válidas.
                  </div>
                </div>
              )}
            </form>

            {/* REGISTER CORPORATE SEDE BUTTON */}
            {activeTab === "sedes" && !showAddSedePanel && (
              <button
                onClick={() => setShowAddSedePanel(true)}
                className="cursor-pointer w-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Registrar Nueva Sede / Oficina
              </button>
            )}

            {/* REGISTER NEW NOTARY CATALOG BUTTON FOR ADMIN & SUPER_ADMIN */}
            {activeTab === "catalog" && !showAddNotaryPanel && (currentProfile?.rol === "super_admin" || currentProfile?.rol === "admin") && (
              <button
                onClick={() => setShowAddNotaryPanel(true)}
                className="cursor-pointer w-full bg-[#8E222F] hover:bg-[#731D28] text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm animate-pulse-subtle"
              >
                <Plus className="w-4 h-4" />
                Registrar Nueva Notaría en Catálogo
              </button>
            )}

          </div>

          {/* ADD SEDE REGISTRY PANEL */}
          {activeTab === "sedes" && showAddSedePanel && (
            <div className="bg-[#E6FDF4] border border-[#BCF0DA] rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b border-[#BCF0DA] pb-2">
                <h3 className="font-serif font-bold text-sm text-[#065f46] flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 shrink-0" />
                  Nueva Dirección de la Empresa
                </h3>
                <button 
                  onClick={() => setShowAddSedePanel(false)}
                  className="text-xs text-emerald-700 hover:underline font-bold"
                >
                  Cancelar
                </button>
              </div>

              <form onSubmit={handleAddSedeSubmit} className="space-y-2.5 text-xs text-charcoal">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#047857] font-mono mb-1">Nombre Oficial Sede / Oficina</label>
                  <input
                    type="text"
                    required
                    value={newSedeForm.nombre}
                    onChange={(e) => setNewSedeForm({...newSedeForm, nombre: e.target.value})}
                    placeholder="ej: Planta El Chorrillo, Oficinas Samborondón..."
                    className="w-full bg-white border border-[#BCF0DA] rounded-lg p-2 text-xs focus:outline-none focus:border-[#059669] font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#047857] font-mono mb-1">Tipo de Localidad</label>
                    <select
                      value={newSedeForm.tipo}
                      onChange={(e) => setNewSedeForm({...newSedeForm, tipo: e.target.value as any})}
                      className="w-full bg-white border border-[#BCF0DA] rounded-lg p-2 text-xs focus:outline-none focus:border-[#059669]"
                    >
                      <option value="administrativa">Oficina Administrativa</option>
                      <option value="planta">Planta de Producción</option>
                      <option value="distribuidor">Distribuidor Autorizado</option>
                      <option value="otro">Otras Instalaciones / Bodega</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#047857] font-mono mb-1">Canton / Ciudad</label>
                    <input
                      type="text"
                      required
                      value={newSedeForm.canton}
                      onChange={(e) => setNewSedeForm({...newSedeForm, canton: e.target.value})}
                      placeholder="Guayaquil"
                      className="w-full bg-white border border-[#BCF0DA] rounded-lg p-2 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#047857] font-mono mb-1">Dirección Física Completa</label>
                  <input
                    type="text"
                    required
                    value={newSedeForm.direccion}
                    onChange={(e) => setNewSedeForm({...newSedeForm, direccion: e.target.value})}
                    placeholder="ej: Av. Interoceánica Km 14, Frente a Colegio..."
                    className="w-full bg-white border border-[#BCF0DA] rounded-lg p-2 text-xs focus:outline-none focus:border-[#059669]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#047857] font-mono mb-1">Teléfono Directo</label>
                    <input
                      type="text"
                      value={newSedeForm.telefono}
                      onChange={(e) => setNewSedeForm({...newSedeForm, telefono: e.target.value})}
                      placeholder="04-2XXXXXX"
                      className="w-full bg-white border border-[#BCF0DA] rounded-lg p-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#047857] font-mono mb-1">Provincia</label>
                    <input
                      type="text"
                      value={newSedeForm.provincia}
                      onChange={(e) => setNewSedeForm({...newSedeForm, provincia: e.target.value})}
                      placeholder="Guayas"
                      className="w-full bg-white border border-[#BCF0DA] rounded-lg p-2 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                {/* GEOPOSITION GENERATOR CARD */}
                <div className="bg-white p-2.5 rounded-lg border border-[#BCF0DA] space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-emerald-800">Ubicación Coordinada (lat & lng)</span>
                    <button
                      type="button"
                      onClick={handleQueryNewSedeLocation}
                      disabled={isGeocoding}
                      className="text-[9px] font-bold bg-[#D1FAE5] text-[#047857] px-2 py-1 rounded hover:bg-[#A7F3D0] shrink-0 font-sans"
                    >
                      {isGeocoding ? "Autolocalizando..." : "⚡ Traducir Dirección"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Latitud: -2.1583"
                      value={newSedeForm.lat}
                      onChange={(e) => setNewSedeForm({...newSedeForm, lat: e.target.value})}
                      className="bg-cream p-1.5 text-xs rounded border border-borderSoft font-mono"
                    />
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Longitud: -79.8891"
                      value={newSedeForm.lng}
                      onChange={(e) => setNewSedeForm({...newSedeForm, lng: e.target.value})}
                      className="bg-cream p-1.5 text-xs rounded border border-borderSoft font-mono"
                    />
                  </div>
                  <div className="text-[8.5px] text-charcoalMuted leading-tight leading-normal font-sans">
                    Haga click en "Traducir Dirección" para georreferenciar su oficina mediante Google Places automáticamente.
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingSede}
                  className="cursor-pointer w-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold p-2.5 rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm font-sans"
                >
                  {savingSede ? "Guardando..." : "Registrar Oficina Permanentemente"}
                </button>
              </form>
            </div>
          )}

          {/* ADD NOTARY CATALOG REGISTRY PANEL */}
          {activeTab === "catalog" && showAddNotaryPanel && (
            <div className="bg-[#FFF1F2] border border-[#FECDD3] rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b border-[#FECDD3] pb-2">
                <h3 className="font-serif font-bold text-sm text-[#9F1239] flex items-center gap-1.5 font-sans uppercase tracking-wider">
                  <Scale className="w-4 h-4 shrink-0" />
                  Nueva Notaría en Catálogo
                </h3>
                <button 
                  onClick={() => setShowAddNotaryPanel(false)}
                  className="text-xs text-[#9F1239] hover:underline font-bold"
                >
                  Cancelar
                </button>
              </div>

              <form onSubmit={handleAddNotarySubmit} className="space-y-2.5 text-xs text-charcoal">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#9F1239] font-mono mb-1">Número de Notaría *</label>
                    <input
                      type="number"
                      required
                      value={newNotaryForm.numero}
                      onChange={(e) => setNewNotaryForm({...newNotaryForm, numero: e.target.value})}
                      placeholder="ej: 38"
                      className="w-full bg-white border border-[#FECDD3] rounded-lg p-2 text-xs focus:outline-none focus:border-sidebarRose font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#9F1239] font-mono mb-1">Cantón / Ciudad *</label>
                    <input
                      type="text"
                      required
                      value={newNotaryForm.canton}
                      onChange={(e) => setNewNotaryForm({...newNotaryForm, canton: e.target.value})}
                      placeholder="Ej. Guayaquil"
                      className="w-full bg-white border border-[#FECDD3] rounded-lg p-2 text-xs focus:outline-none focus:border-sidebarRose"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#9F1239] font-mono mb-1">Notario Titular (Nombre)</label>
                  <input
                    type="text"
                    value={newNotaryForm.notario_titular}
                    onChange={(e) => setNewNotaryForm({...newNotaryForm, notario_titular: e.target.value})}
                    placeholder="Abg. Juan Pérez Castro"
                    className="w-full bg-white border border-[#FECDD3] rounded-lg p-2 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#9F1239] font-mono mb-1">Dirección Física Completa *</label>
                  <input
                    type="text"
                    required
                    value={newNotaryForm.direccion}
                    onChange={(e) => setNewNotaryForm({...newNotaryForm, direccion: e.target.value})}
                    placeholder="ej: Urdesa Central, Av. Principal 123..."
                    className="w-full bg-white border border-[#FECDD3] rounded-lg p-2 text-xs focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#9F1239] font-mono mb-1">Teléfono Directo</label>
                    <input
                      type="text"
                      value={newNotaryForm.telefono}
                      onChange={(e) => setNewNotaryForm({...newNotaryForm, telefono: e.target.value})}
                      placeholder="04-2XXXXXX"
                      className="w-full bg-white border border-[#FECDD3] rounded-lg p-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#9F1239] font-mono mb-1">Provincia</label>
                    <input
                      type="text"
                      value={newNotaryForm.provincia}
                      onChange={(e) => setNewNotaryForm({...newNotaryForm, provincia: e.target.value})}
                      placeholder="Guayas"
                      className="w-full bg-white border border-[#FECDD3] rounded-lg p-2 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#9F1239] font-mono mb-1">Horario de Atención</label>
                  <input
                    type="text"
                    value={newNotaryForm.horario_atencion}
                    onChange={(e) => setNewNotaryForm({...newNotaryForm, horario_atencion: e.target.value})}
                    placeholder="Lunes a Viernes 08:30 - 17:00"
                    className="w-full bg-white border border-[#FECDD3] rounded-lg p-2 text-xs focus:outline-none"
                  />
                </div>

                {/* GEOPOSITION GENERATOR CARD */}
                <div className="bg-white p-2.5 rounded-lg border border-[#FECDD3] space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-[#9F1239]">Ubicación Coordinada (lat & lng)</span>
                    <button
                      type="button"
                      onClick={handleQueryNewNotaryLocation}
                      disabled={isGeocoding}
                      className="text-[9px] font-bold bg-[#FFE4E6] text-[#9F1239] px-2 py-1 rounded hover:bg-[#FECDD3] shrink-0 font-sans"
                    >
                      {isGeocoding ? "Autolocalizando..." : "⚡ Traducir Dirección"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Latitud: -2.1642"
                      value={newNotaryForm.lat}
                      onChange={(e) => setNewNotaryForm({...newNotaryForm, lat: e.target.value})}
                      className="bg-cream p-1.5 text-xs rounded border border-[#FECDD3] font-mono"
                    />
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Longitud: -79.9103"
                      value={newNotaryForm.lng}
                      onChange={(e) => setNewNotaryForm({...newNotaryForm, lng: e.target.value})}
                      className="bg-cream p-1.5 text-xs rounded border border-[#FECDD3] font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingNotary}
                  className="cursor-pointer w-full bg-[#8E222F] hover:bg-[#731D28] text-white text-xs font-bold p-2.5 rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm font-sans"
                >
                  {savingNotary ? "Registrando..." : "Añadir Notaría al Catálogo Regional"}
                </button>
              </form>
            </div>
          )}

          {/* Directory Listings */}
          <div className="overflow-y-auto max-h-[420px] space-y-2 pr-1">
            {loading ? (
              <div className="text-center py-12 text-charcoalMuted font-sans">
                <Compass className="w-8 h-8 animate-spin mx-auto text-sidebarRose mb-2" />
                Cargando directorio legal de Ecuador...
              </div>
            ) : displayedItems.length === 0 ? (
              <div className="text-center py-8 bg-paper border border-borderSoft rounded-2xl text-charcoalMuted text-xs font-sans p-6 space-y-2">
                <AlertCircle className="w-6 h-6 mx-auto text-charcoalMuted" />
                <p>No se encontraron registros activos en esta pestaña con los filtros especificados.</p>
                {activeTab === "google" && <p className="text-[10px] text-roseOld">Intente presionar el botón "Escanear" superior para consultar a Google.</p>}
              </div>
            ) : (
              displayedItems.map((item) => {
                const isOpen = isCurrentlyOpen(item.horario_atencion);
                const isSelected = selectedItem?.id === item.id;
                const catInfo = getCategoryDetails(item.tipo);
                
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`p-4 border rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? "bg-roseSoft border-roseOld/40 shadow-sm"
                        : "bg-paper hover:bg-paperDark border-borderSoft"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-serif font-bold text-base text-charcoal leading-snug">
                        {item.nombre}
                      </h4>
                      <span className={`text-[9px] uppercase px-2 py-0.5 rounded-full font-bold font-mono tracking-wider ${
                        isOpen ? "bg-[#d1fae5] text-[#065f46]" : "bg-[#f3f4f6] text-[#374151]"
                      }`}>
                        {isOpen ? "Abierta" : "Cerrada"}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 leading-none ${catInfo.bgColor} ${catInfo.textColor}`}>
                        {catInfo.icon}
                        <span>{catInfo.label}</span>
                      </span>
                      {item.isGoogleResult && (
                        <span className="text-[9px] bg-[#EBF7FC] text-[#0369a1] font-mono px-1.5 rounded leading-none py-0.5">En Vivo (Google)</span>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-charcoalMuted font-sans">
                      <div className="flex items-center gap-1 truncate w-9/12">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{item.direccion}</span>
                      </div>
                      {item.distance !== undefined && item.distance !== null && (
                        <span className="shrink-0 bg-roseSoft/60 text-sidebarRose px-1.5 py-0.5 rounded font-mono font-bold text-[9px]">
                          📍 {(item.distance).toFixed(1)} km
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT VIEWPORT: INTERACTIVE MAP & DETAILS PANEL */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          {/* Map Section */}
          <div className="relative bg-[#F3F0E9] border border-borderSoft rounded-2xl h-[330px] overflow-hidden flex flex-col justify-end shadow-sm">
            
            {hasValidKey ? (
              <div className="absolute inset-0 w-full h-full">
                <APIProvider apiKey={API_KEY} version="weekly">
                  <Map
                    defaultCenter={{ lat: -2.19616, lng: -79.88621 }}
                    defaultZoom={11}
                    mapId="DEMO_MAP_ID"
                    internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
                    style={{ width: "100%", height: "100%" }}
                  >
                    {/* MapController centers the view dynamically */}
                    {selectedItem && selectedItem.lat && selectedItem.lng && (
                      <MapController center={{ lat: selectedItem.lat, lng: selectedItem.lng }} />
                    )}

                    {/* Render User GPS Beacon */}
                    {userLocation && (
                      <AdvancedMarker position={userLocation} title="Tu ubicación estimada">
                        <Pin background="#ef4444" scale={0.9} glyphColor="#fff" />
                      </AdvancedMarker>
                    )}

                    {/* ALWAYS show the Company's offices as Context Anchors (Green pins) */}
                    {companyLocations.map((s) => {
                      if (!s.lat || !s.lng) return null;
                      const isMainSelected = selectedItem?.id === s.id;
                      return (
                        <AdvancedMarker
                          key={`company-anchor-${s.id}`}
                          position={{ lat: s.lat, lng: s.lng }}
                          title={`[Sede Local] ${s.nombre}`}
                          onClick={() => setSelectedItem(s)}
                        >
                          <Pin
                            background="#059669"
                            glyphColor="#fff"
                            borderColor="#059669"
                            glyphText="🏭"
                            scale={isMainSelected ? 1.2 : 0.9}
                          />
                        </AdvancedMarker>
                      );
                    })}

                    {/* Render active searching results (Notaries, Judges, Fiscalias) */}
                    {displayedItems.map((loc) => {
                      if (!loc.lat || !loc.lng || loc.tipo === "sede_empresa") return null; // already rendered as anchor
                      const isSelected = selectedItem?.id === loc.id;
                      const conf = getCategoryDetails(loc.tipo);
                      
                      return (
                        <AdvancedMarker
                          key={loc.id}
                          position={{ lat: loc.lat, lng: loc.lng }}
                          title={loc.nombre}
                          onClick={() => setSelectedItem(loc)}
                        >
                          <Pin
                            background={isSelected ? "#be123c" : conf.pinColor}
                            glyphColor="#fff"
                            borderColor={isSelected ? "#be123c" : conf.pinColor}
                            glyphText={conf.glyph}
                            scale={isSelected ? 1.2 : 0.9}
                          />
                        </AdvancedMarker>
                      );
                    })}

                    {/* Invisible Places Search engine bridge for active search types */}
                    <GooglePlacesSearchTrigger
                      query={searchQuery || selectedCanton}
                      entityType={googleEntityType}
                      onResults={(results) => {
                        setGoogleResults(results);
                        if (results.length > 0) {
                          setSelectedItem(results[0]);
                        }
                      }}
                      triggerCount={googleTriggerCount}
                      setSearching={setSearchingGoogle}
                    />

                  </Map>
                </APIProvider>
              </div>
            ) : (
              // Splendid Map Setup Guide Splash screen when Google API Key is absent
              <div className="absolute inset-0 bg-[#EFECE6] p-6 flex flex-col justify-center items-center text-center space-y-4 font-sans select-none border-b border-borderSoft">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md">
                  <MapIcon className="w-6 h-6 text-sidebarRose" />
                </div>
                <div className="max-w-md space-y-2">
                  <h3 className="text-sm font-serif font-extrabold text-charcoal">
                    Sincronización de Google Maps Desactivada
                  </h3>
                  <p className="text-[11px] text-charcoalMuted leading-relaxed">
                    Ingrese su Clave de Google Maps como Variable de Entorno para activar el mapa judicial real, contrastar notarías en vivo, ubicar Unidades Judiciales, Fiscalías e identificar las sedes más cercanas.
                  </p>
                  <div className="bg-white border border-borderSoft rounded-xl p-3 text-[10px] text-left text-charcoalSoft leading-normal space-y-1 block">
                    <span className="block font-bold">Instrucciones de activación:</span>
                    <span className="block">1. Copie o genere su clave desde <a className="text-[#be123c] font-bold hover:underline" href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener noreferrer">Google Cloud Console</a>.</span>
                    <span className="block">2. Vaya a <strong>Configuración (⚙️ Ícono superior derecho)</strong> → <strong>Secrets</strong>.</span>
                    <span className="block">3. Guarde una nueva variable con el nombre <code>GOOGLE_MAPS_PLATFORM_KEY</code>.</span>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom attribute badge */}
            <div className="relative bg-charcoal/85 text-paper px-4 py-2 text-[10px] font-mono flex justify-between items-center z-10 select-none">
              <span>🗺️ Coordenadas Consejo de la Judicatura - Ecuador</span>
              <span>{hasValidKey ? "API Google Maps Activada" : "Catálogo local vacío / Google Maps pendiente"}</span>
            </div>
          </div>

          {/* Expanded Selected Item Details Card */}
          {selectedItem ? (
            <div className="bg-paper border border-borderSoft rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 border-b border-borderSoft pb-4">
                <div>
                  <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-charcoalMuted font-mono">
                    <span>{selectedItem.provincia || "Punto de Interés"} · Cantón {selectedItem.canton}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] ${getCategoryDetails(selectedItem.tipo).bgColor} ${getCategoryDetails(selectedItem.tipo).textColor}`}>
                      {getCategoryDetails(selectedItem.tipo).label}
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-xl text-charcoal leading-snug mt-1">
                    {selectedItem.nombre}
                  </h3>
                </div>
                
                <div className="shrink-0">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${selectedItem.nombre}, ${selectedItem.direccion}, ${selectedItem.canton}, Ecuador`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-charcoal text-cream text-[11px] px-3.5 py-2 rounded-xl hover:bg-charcoalSoft transition-all font-sans font-bold"
                  >
                    <Navigation className="w-3.5 h-3.5 text-sidebarRose" />
                    Cómo Llegar (Google Maps)
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Details layout */}
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-roseSoft text-sidebarRose flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[9px] uppercase font-bold text-charcoalMuted tracking-wider font-mono leading-none mb-1">
                        Responsable u Oficina del Estado
                      </div>
                      <span className="text-xs font-bold text-charcoal font-sans">
                        {selectedItem.tipo === "notaria" 
                          ? (selectedItem.notario_titular || "Abogado Autentificado de Fe Pública") 
                          : selectedItem.tipo === "sede_empresa"
                            ? `${selectedEmpresa?.nombre} (Ubicación Corporativa)`
                            : `Dependencia del Estado Ecuatoriano`
                        }
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-roseSoft text-sidebarRose flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[9px] uppercase font-bold text-charcoalMuted tracking-wider font-mono leading-none mb-1">
                        Dirección Física
                      </div>
                      <span className="text-[11px] font-semibold text-charcoalSoft font-sans leading-normal">
                        {selectedItem.direccion}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-roseSoft text-sidebarRose flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[9px] uppercase font-bold text-charcoalMuted tracking-wider font-mono leading-none mb-1">
                        Horario de Trámites
                      </div>
                      <span className="text-xs font-bold text-charcoal font-sans block">
                        {selectedItem.horario_atencion}
                      </span>
                      <span className={`text-[10px] inline-flex items-center gap-1 mt-1 font-bold ${
                        isCurrentlyOpen(selectedItem.horario_atencion) ? "text-[#065f46]" : "text-charcoalMuted"
                      }`}>
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        {isCurrentlyOpen(selectedItem.horario_atencion) ? "Abierta actualmente para trámites" : "Cerrada fuera de horario habilitado"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-roseSoft text-sidebarRose flex items-center justify-center shrink-0 mt-0.5">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[9px] uppercase font-bold text-charcoalMuted tracking-wider font-mono leading-none mb-1">
                        Contacto Telefónico Directo
                      </div>
                      {selectedItem.telefono && selectedItem.telefono !== "Sin número registrado" ? (
                        <a href={`tel:${selectedItem.telefono}`} className="text-xs font-bold text-sidebarRose hover:underline font-mono">
                          {selectedItem.telefono}
                        </a>
                      ) : (
                        <span className="text-xs italic text-charcoalMuted font-sans">No hay teléfono registrado</span>
                      )}
                    </div>
                  </div>
                </div>

              </div>
              
              {selectedItem.isGoogleResult && (
                <div className="bg-successSoft border border-success/20 rounded-xl p-3 text-[10px] text-charcoalMuted flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                  <span>Este resultado fue recuperado en vivo mediante Google Places API mapeando la infraestructura en Ecuador.</span>
                </div>
              )}

              {selectedItem.tipo === "sede_empresa" && (
                <div className="bg-[#E6FDF4] border border-[#BCF0DA] rounded-xl p-3 text-[10px] text-[#047857] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                  <span>Ubicación corporativa oficial. Puede utilizar esta coordenada del mapa para determinar distancias a notarías de confianza o delegaciones penales de la Fiscalía.</span>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-paper border border-dashed border-borderSoft rounded-2xl p-12 text-center text-charcoalMuted text-xs font-sans">
              Seleccione un punto georreferenciado de la izquierda para desplegar sus detalles de contacto y geolocalización judicial.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
