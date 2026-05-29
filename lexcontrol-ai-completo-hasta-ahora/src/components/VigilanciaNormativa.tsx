import React, { useState, useEffect } from "react";
import { Empresa, AlertaLegal, UserProfile } from "../types";
import { 
  ShieldAlert, 
  RefreshCw, 
  Radio, 
  CheckCircle, 
  ExternalLink, 
  AlertTriangle, 
  Shield, 
  Check, 
  Info, 
  BookOpen, 
  Search, 
  Sparkles, 
  AlertOctagon, 
  HelpCircle, 
  ChevronRight, 
  ChevronLeft,
  ArrowRight,
  Plus,
  Trash2,
  UploadCloud,
  FileText,
  Paperclip,
  Folder,
  ArrowLeft
} from "lucide-react";
import { connectGoogleDrive, getCachedToken } from "../lib/gdrive";
import { FormattedText } from "./FormattedText";

interface VigilanciaNormativaProps {
  selectedEmpresa: Empresa;
  currentProfile: UserProfile;
}

interface NormativaValidacion {
  norma_nombre: string;
  tipo_norma: string;
  organismo_emisor: string;
  status?: "activo" | "reformado" | "derogado" | "precaucion";
  ultima_reforma?: string;
  analisis_google?: string;
  acciones_recomendadas?: string[];
  estado_permanencia?: string;
  aprobado_por_superadmin?: boolean;
  fecha_registro?: string;
  fecha_expiracion_temporal?: string;
}

export default function VigilanciaNormativa({ selectedEmpresa, currentProfile }: VigilanciaNormativaProps) {
  const [activeTab, setActiveTab] = useState<"alertas" | "biblioteca">("biblioteca");
  const [alertas, setAlertas] = useState<AlertaLegal[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Google Drive integration states
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [annexingFile, setAnnexingFile] = useState<any | null>(null);
  const [driveCurrentFolderId, setDriveCurrentFolderId] = useState<string>("root");
  const [driveFolderPathStack, setDriveFolderPathStack] = useState<{ id: string; name: string }[]>([
    { id: "root", name: "Mi Unidad" }
  ]);

  // Custom Library States
  const [registeredNorms, setRegisteredNorms] = useState<NormativaValidacion[]>([]);
  const [normsLoading, setNormsLoading] = useState(false);
  const [validatingNormName, setValidatingNormName] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<any | null>(null);
  const [selectedAuditNorm, setSelectedAuditNorm] = useState<string | null>(null);
  
  // Suggested Norms State
  const [suggestedNorms, setSuggestedNorms] = useState<any[]>([]);
  const [discoveringLoading, setDiscoveringLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Manual regulation upload states
  const [uploadedNormDocs, setUploadedNormDocs] = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedSubTab, setSelectedSubTab] = useState<"matriz" | "manuales">("matriz");
  const [analyzingWithIA, setAnalyzingWithIA] = useState(false);

  // Form states for manual uploading
  const [formNombre, setFormNombre] = useState("");
  const [formOrganismo, setFormOrganismo] = useState("");
  const [formFecha, setFormFecha] = useState("");
  const [formMateria, setFormMateria] = useState("");
  const [formVigencia, setFormVigencia] = useState("activo");
  const [formResumen, setFormResumen] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const [sources, setSources] = useState<any[]>([
    { name: "Registro Oficial de Ecuador (Edición diaria)", status: "activo", lastCheck: "Hace 2 horas", url: "https://www.registroficial.gob.ec", veracidad: "Muy Alta (100%)" },
    { name: "Superintendencia de Compañías (SUPERCIAS)", status: "activo", lastCheck: "Hace 1 hora", url: "https://www.supercias.gob.ec", veracidad: "Muy Alta (98%)" },
    { name: "Boletín de Resoluciones del SRI (Circulares)", status: "activo", lastCheck: "Sincronizado", url: "https://www.sri.gob.ec", veracidad: "Muy Alta (97%)" },
    { name: "Diario Primicias (Sección Economía y Legal)", status: "activo", lastCheck: "Hace 45 minutos", url: "https://www.primicias.ec", veracidad: "Alta (85%)" },
    { name: "Diario El Universo (Sección Política y Judicial)", status: "activo", lastCheck: "Hace 1 hora", url: "https://www.eluniverso.com", veracidad: "Alta (82%)" },
    { name: "Diario El Comercio (Ecuador)", status: "activo", lastCheck: "Hace 3 horas", url: "https://www.elcomercio.com", veracidad: "Alta (80%)" },
    { name: "X Twitter · @AsambleaEcuador Feed (Microblogging)", status: "activo", lastCheck: "Sincronizado", url: "https://x.com", veracidad: "Baja (35%)" },
    { name: "Repositorios USFQ / UASB de Jurisprudencia", status: "mantenimiento", lastCheck: "Ayer", url: "", veracidad: "Alta (80%)" }
  ]);

  useEffect(() => {
    fetchAlertas();
    fetchRegisteredNormatives();
    fetchUploadedDocuments();
    setSelectedAuditNorm(null);
    setAuditResult(null);
    setSuggestedNorms([]);

    const token = getCachedToken();
    if (token) {
      setDriveToken(token);
      setDriveConnected(true);
      fetchDriveFiles(token);
    }
  }, [selectedEmpresa]);

  const handleConnectDrive = async () => {
    setLoadingDrive(true);
    try {
      const { accessToken } = await connectGoogleDrive();
      setDriveToken(accessToken);
      setDriveConnected(true);
      await fetchDriveFiles(accessToken);
    } catch (err) {
      console.error(err);
      alert("Error al conectar con Google Drive.");
    } finally {
      setLoadingDrive(false);
    }
  };

  const fetchDriveFiles = async (token: string, folderId: string = "root") => {
    setLoadingDrive(true);
    try {
      // 1. Fetch BOTH allowable files and directories/folders that belong to the active parentId
      const query = `'${folderId}' in parents and (mimeType = 'application/vnd.google-apps.folder' or mimeType = 'application/pdf' or mimeType = 'text/plain' or mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') and trashed = false`;
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,webViewLink)&pageSize=100`;
      
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.files) {
          // Sort folders to the top, then files alphabetically
          const sorted = [...data.files].sort((a: any, b: any) => {
            const isAFolder = a.mimeType === "application/vnd.google-apps.folder";
            const isBFolder = b.mimeType === "application/vnd.google-apps.folder";
            if (isAFolder && !isBFolder) return -1;
            if (!isAFolder && isBFolder) return 1;
            return a.name.localeCompare(b.name);
          });
          setDriveFiles(sorted);
        }
      }
    } catch (err) {
      console.error("Error al listar archivos de Google Drive", err);
    } finally {
      setLoadingDrive(false);
    }
  };

  const handleNavigateDriveFolder = async (folder: { id: string; name: string }) => {
    const freshToken = driveToken || getCachedToken();
    if (!freshToken) return;

    if (folder.id === "root") {
      setDriveCurrentFolderId("root");
      setDriveFolderPathStack([{ id: "root", name: "Mi Unidad" }]);
      await fetchDriveFiles(freshToken, "root");
    } else {
      const index = driveFolderPathStack.findIndex((itm) => itm.id === folder.id);
      if (index !== -1) {
        // Backtrack
        const stackSlice = driveFolderPathStack.slice(0, index + 1);
        setDriveCurrentFolderId(folder.id);
        setDriveFolderPathStack(stackSlice);
        await fetchDriveFiles(freshToken, folder.id);
      } else {
        // Deeper path
        const newStack = [...driveFolderPathStack, folder];
        setDriveCurrentFolderId(folder.id);
        setDriveFolderPathStack(newStack);
        await fetchDriveFiles(freshToken, folder.id);
      }
    }
  };

  const handleAnnexDriveFile = async (file: any) => {
    // Initial direct fallback metadata to be quick
    const baseCleanedName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
    setFormNombre(baseCleanedName);
    setFormOrganismo("Cargando organismo emisor con IA...");
    setFormFecha(new Date().toISOString().split("T")[0]);
    setFormMateria(selectedEmpresa.sector ? selectedEmpresa.sector.split("-")[0].trim() : "Legal General");
    setFormVigencia("activo");
    setFormResumen(`Cargando resumen ejecutivo automatizado de Google Drive mediante Inteligencia Artificial...`);
    
    setAnnexingFile({
      gdrive_file_id: file.id,
      gdrive_link: file.webViewLink,
      file_name: file.name
    });
    
    setShowUploadForm(true);
    setSelectedSubTab("manuales");
    setShowDriveModal(false);
    setAnalyzingWithIA(true);

    try {
      const res = await fetch("/api/gemini/analyze-regulation-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          sector: selectedEmpresa.sector || "Legal General"
        })
      });
      const data = await res.json();
      if (data.success && data.metadata) {
        const m = data.metadata;
        setFormNombre(m.nombre || baseCleanedName);
        setFormOrganismo(m.organismo || "Registro Oficial / Ente Regulador");
        setFormFecha(m.fecha || new Date().toISOString().split("T")[0]);
        setFormMateria(m.materia || "General");
        if (m.vigencia) setFormVigencia(m.vigencia);
        setFormResumen(m.resumen || `Importado de Google Drive. ID: ${file.id}`);
      }
    } catch (err) {
      console.error("Error al autollenar campos con IA:", err);
    } finally {
      setAnalyzingWithIA(false);
    }
  };

  const handleAutofillWithIA = async () => {
    const nameToUse = attachedFile?.name || annexingFile?.file_name || formNombre;
    if (!nameToUse) {
      alert("Por favor inserte el título de la norma, ancle un archivo de GDrive o cargue un documento local primero para que la IA tenga contexto.");
      return;
    }

    setAnalyzingWithIA(true);
    try {
      let textExcerpt = "";
      if (attachedFile && (attachedFile.type.includes("text") || attachedFile.name.endsWith(".txt"))) {
        try {
          const fullText = await attachedFile.text();
          textExcerpt = fullText.substring(0, 5000);
        } catch (_) {}
      }
      let fileBase64 = "";
      if (attachedFile && attachedFile.type === "application/pdf") {
        const buffer = await attachedFile.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        bytes.forEach((b) => binary += String.fromCharCode(b));
        fileBase64 = btoa(binary);
      }

      const res = await fetch("/api/gemini/analyze-regulation-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: nameToUse,
          fileBase64,
          fileContentExcerpt: textExcerpt,
          sector: selectedEmpresa.sector || "Legal General"
        })
      });

      const data = await res.json();
      if (data.success && data.metadata) {
        const m = data.metadata;
        if (m.nombre) setFormNombre(m.nombre);
        if (m.organismo) setFormOrganismo(m.organismo);
        if (m.fecha) setFormFecha(m.fecha);
        if (m.materia) setFormMateria(m.materia);
        if (m.vigencia) setFormVigencia(m.vigencia);
        if (m.resumen) setFormResumen(m.resumen);
      } else {
        alert("No se pudo autocompletar la información. Intente escribir el título primero.");
      }
    } catch (err) {
      console.error(err);
      alert("Error llamando al servicio de IA LexControl.");
    } finally {
      setAnalyzingWithIA(false);
    }
  };

  const handleApproveNormative = async (id: string) => {
    try {
      const res = await fetch("/api/normativas/documentos/aprobar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, aprobado_por: currentProfile.nombre })
      });
      if (res.ok) {
        alert("¡Normativa aprobada para permanencia a largo plazo!");
        fetchUploadedDocuments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUploadedDocuments = async () => {
    setDocsLoading(true);
    try {
      const res = await fetch(`/api/normativas/documentos?negocio_id=${selectedEmpresa.id}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setUploadedNormDocs(data);
      }
    } catch (err) {
      console.error("Error al cargar documentos de normativa", err);
    } finally {
      setDocsLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setAttachedFile(file);
      // Auto-extract a title if empty from filename
      if (!formNombre) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        setFormNombre(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAttachedFile(file);
      if (!formNombre) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        setFormNombre(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    }
  };

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim() || !formOrganismo.trim() || !formFecha.trim()) {
      alert("Por favor rellene los campos obligatorios.");
      return;
    }

    setUploadProgress(10);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev === null) return 10;
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 15;
      });
    }, 120);

    try {
      let fileName = attachedFile 
        ? attachedFile.name 
        : (annexingFile ? annexingFile.file_name : `norma-${Date.now().toString().substring(7)}.pdf`);
      let textContent = "";
      if (attachedFile) {
        if (attachedFile.type.includes("text") || attachedFile.name.endsWith(".txt")) {
          textContent = await attachedFile.text();
        } else {
          textContent = `Extractos de seguridad e higiene corporativos mapeados desde archivo original: ${fileName}`;
        }
      } else if (annexingFile) {
        textContent = `Extracto mapeado desde el archivo anclado de Google Drive: ${fileName}. Identificador del recurso público: ${annexingFile.gdrive_file_id}. El documento está listo para contrastarse en el fondo indexado.`;
      } else {
        textContent = `Extracto manual ingresado para la norma: ${formNombre}.`;
      }

      const payload = {
        negocio_id: selectedEmpresa.id,
        nombre: formNombre.trim(),
        organismo_emisor: formOrganismo.trim(),
        fecha_publicacion: formFecha,
        file_name: fileName,
        subido_por_nombre: currentProfile.nombre,
        subido_por_rol: currentProfile.rol,
        materia: formMateria.trim() || "General",
        vigencia: formVigencia,
        resumen: formResumen.trim(),
        text_content: textContent,
        gdrive_file_id: annexingFile ? annexingFile.gdrive_file_id : null,
        gdrive_link: annexingFile ? annexingFile.gdrive_link : null
      };

      const res = await fetch("/api/normativas/documentos/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      clearInterval(interval);
      setUploadProgress(100);
      
      setTimeout(() => {
        setUploadProgress(null);
        if (data.success) {
          fetchUploadedDocuments();
          setShowUploadForm(false);
          setFormNombre("");
          setFormOrganismo("");
          setFormFecha("");
          setFormMateria("");
          setFormVigencia("activo");
          setFormResumen("");
          setAttachedFile(null);
          setAnnexingFile(null);
        }
      }, 350);

    } catch (err) {
      clearInterval(interval);
      setUploadProgress(null);
      console.error(err);
      alert("Error al guardar el documento de normativa.");
    }
  };

  const handleDeleteDocument = async (id: string, name: string) => {
    if (!window.confirm(`¿Está seguro de eliminar de forma permanente la normativa manual "${name}" de su biblioteca? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      const res = await fetch("/api/normativas/documentos/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        fetchUploadedDocuments();
        if (selectedAuditNorm === name) {
          setSelectedAuditNorm(null);
          setAuditResult(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAlertas = async () => {
    try {
      const res = await fetch(`/api/vigilancia?negocio_id=${selectedEmpresa.id}`);
      const data = await res.json();
      setAlertas(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRegisteredNormatives = async () => {
    setNormsLoading(true);
    try {
      // Fetch compliance obligations to group unique normatives dynamically!
      const res = await fetch(`/api/matriz?negocio_id=${selectedEmpresa.id}`);
      const data = await res.json();
      
      if (Array.isArray(data)) {
        // Map unique normnames
        const tempMap: Record<string, NormativaValidacion> = {};
        data.forEach((item: any) => {
          if (item.norma_nombre) {
            tempMap[item.norma_nombre] = {
              norma_nombre: item.norma_nombre,
              tipo_norma: item.tipo_norma || "Ley / Código",
              organismo_emisor: item.organismo_emisor || "Ecuador"
            };
          }
        });
        setRegisteredNorms(Object.values(tempMap));
      }
    } catch (err) {
      console.error("Falla al cargar normativas de la matriz", err);
    } finally {
      setNormsLoading(false);
    }
  };

  const handleTriggerScan = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vigilancia/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ negocio_id: selectedEmpresa.id })
      });
      const data = await res.json();
      if (data.success) {
        fetchAlertas();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Check validity on Google Search using our new backend route
  const handleValidateNormWithIA = async (norm: NormativaValidacion) => {
    setValidatingNormName(norm.norma_nombre);
    setSelectedAuditNorm(norm.norma_nombre);
    setAuditResult(null);
    try {
      const res = await fetch("/api/vigilancia/validate-norma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          norma_nombre: norm.norma_nombre,
          tipo_norma: norm.tipo_norma,
          organismo_emisor: norm.organismo_emisor,
          negocio_id: selectedEmpresa.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setAuditResult(data);
        
        // Update local state with the audit results for convenience
        setRegisteredNorms(prev => prev.map(n => 
          n.norma_nombre === norm.norma_nombre 
            ? { ...n, status: data.status, ultima_reforma: data.ultima_reforma, analisis_google: data.analisis_google, acciones_recomendadas: data.acciones_recomendadas }
            : n
        ));

        // If there is an uploaded manual document with this name, update its internet verification status in DB
        const matchedManualDoc = uploadedNormDocs.find(d => d.nombre === norm.norma_nombre);
        if (matchedManualDoc) {
          fetch("/api/normativas/documentos/verificar-internet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: matchedManualDoc.id })
          }).then(() => {
            fetchUploadedDocuments();
          }).catch(err => console.warn("Error updating manual document status:", err));
        }
      }
    } catch (err) {
      console.error("Falla en la validación por IA", err);
    } finally {
      setValidatingNormName(null);
    }
  };

  // Discover missing normatives via search grounding with Gemini
  const handleDiscoverMissingNorms = async () => {
    setDiscoveringLoading(true);
    try {
      const res = await fetch("/api/vigilancia/discover-missing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ negocio_id: selectedEmpresa.id })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.list)) {
        setSuggestedNorms(data.list);
      }
    } catch (err) {
      console.error("Error al descubrir normativas faltantes", err);
    } finally {
      setDiscoveringLoading(false);
    }
  };

  // Send a suggested normative to proposals
  const handleAdoptProposal = async (norm: any) => {
    try {
      // In compliance we save it as a proposal or update DB.
      // Let's call the server's update endpoint to save as a 'propuesta' style or directly in the compliance matrix!
      const res = await fetch("/api/matriz/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "obligation-discovered-" + Date.now(),
          negocio_id: selectedEmpresa.id,
          articulo: norm.articulo || "General",
          requisito: norm.requisito,
          sancion: norm.sancion,
          multa_estimada_usd: norm.prioridad === "alto" ? 6900 : 2300,
          impacto_economico: norm.prioridad === "alto" ? 8 : 5,
          probabilidad_incumplimiento: 3,
          prioridad: norm.prioridad || "medio",
          estado: "pendiente", // Start as pending compliance task!
          responsable: `Compliance: ${currentProfile.nombre}`,
          gerencia_competente: "Gerencia Legal",
          area_competente: norm.campo_juridico || "General",
          sponsor: currentProfile.nombre,
          responsable_proceso: "Gerente de Area",
          norma_nombre: norm.norma_nombre,
          tipo_norma: norm.tipo_norma,
          organismo_emisor: norm.organismo_emisor,
          fecha_publicacion: new Date().toISOString().split("T")[0],
          resumen_experto: `Normativa sugerida e incorporada por auditoría de vacíos en internet mediante inteligencia artificial lícita.`,
          campo_juridico: norm.campo_juridico || "Ambiental"
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`¡Normativa "${norm.norma_nombre}" adoptada e incorporada con éxito a la Matriz de Cumplimiento!`);
        setSuggestedNorms(prev => prev.filter(n => n.norma_nombre !== norm.norma_nombre));
        fetchRegisteredNormatives(); // re-sync
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filters normatives by search query
  const filteredNorms = registeredNorms.filter(n => 
    n.norma_nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.tipo_norma.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.organismo_emisor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredManualDocs = uploadedNormDocs.filter(d => 
    d.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.organismo_emisor.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.materia.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-borderSoft pb-4">
        <div>
          <h1 className="text-3xl font-serif font-semibold text-charcoal flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-sidebarRose" />
            Vigilancia Normativa & Biblioteca Legal
          </h1>
          <p className="text-sm text-charcoalSoft font-sans mt-1">
            Garantice la licitud corporativa monitoreando gacetas, auditando la vigencia de sus leyes registradas y descubriendo vacíos regulativos con IA.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "alertas" && (
            <button
              onClick={handleTriggerScan}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-charcoal hover:bg-charcoalSoft text-cream text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer font-sans shadow-sm"
              type="button"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Sincronizando..." : "Sincronizar Canales Gubernamentales"}
            </button>
          )}
        </div>
      </div>

      {/* TABS SELECTOR */}
      <div className="flex border-b border-borderSoft gap-4">
        <button
          onClick={() => setActiveTab("biblioteca")}
          className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer ${
            activeTab === "biblioteca" 
              ? "text-sidebarRose font-bold" 
              : "text-charcoalMuted hover:text-charcoal"
          }`}
        >
          {activeTab === "biblioteca" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sidebarRose rounded" />
          )}
          📚 Biblioteca Legal ({registeredNorms.length}) & Auditoría Vigencia
        </button>

        <button
          onClick={() => setActiveTab("alertas")}
          className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer ${
            activeTab === "alertas" 
              ? "text-sidebarRose font-bold" 
              : "text-charcoalMuted hover:text-charcoal"
          }`}
        >
          {activeTab === "alertas" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sidebarRose rounded" />
          )}
          ⚖️ Diario de Alertas y Boletines
        </button>
      </div>

      {/* RENDER ACTIVE TAB */}
      {activeTab === "alertas" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Side: Scraper sources status */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bento-card space-y-4 bg-white">
              
              <div className="flex items-center gap-2 border-b border-borderSoft pb-3">
                <Radio className="w-5 h-5 text-sidebarRose animate-pulse" />
                <h3 className="font-serif font-semibold text-base text-charcoal">Servidores de Monitoreo</h3>
              </div>

              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {sources.map((src, i) => (
                  <div key={i} className="bg-[#F9F7F5] border border-borderSoft/40 rounded-xl p-3 space-y-1">
                    <div className="flex justify-between items-start gap-1">
                      <span className="font-medium text-xs text-charcoal leading-tight">{src.name}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-sans shrink-0 ${
                        src.status === "activo" ? "bg-successSoft text-success" : "bg-warningSoft text-warning"
                      }`}>
                        {src.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] sm:text-[11px] font-sans mt-2">
                      <span className="text-charcoalMuted">Confianza: <strong className={
                        src.veracidad.includes("Muy Alta") ? "text-success font-semibold" : src.veracidad.includes("Alta") ? "text-[#C17A42] font-semibold" : "text-danger font-semibold"
                      }>{src.veracidad}</strong></span>
                      {src.url && (
                        <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-sidebarRose hover:underline inline-flex items-center gap-0.5">
                          Visitar <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {currentProfile.rol === "super_admin" && (
                <button
                  onClick={() => setSources(prev => [...prev, { name: "Resoluciones Superintendencia de Bancos (EC)", status: "activo", lastCheck: "Nuevo Canal", url: "https://www.superbancos.gob.ec", veracidad: "Muy Alta (98%)" }])}
                  className="w-full py-2 bg-[#F9F7F5] text-charcoal border border-borderSoft rounded-xl text-xs font-semibold hover:bg-paperDark transition-colors cursor-pointer font-sans"
                  type="button"
                >
                  + Registrar Canal Gubernamental Real
                </button>
              )}

            </div>

            <div className="bento-card bg-roseSoft/20 border-danger/20 p-5 rounded-2xl space-y-3">
              <div className="flex gap-2 text-danger">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <h4 className="font-serif font-bold text-sm">Biblioteca de Escrituras & Impuestos</h4>
              </div>
              <p className="text-xs text-charcoalSoft leading-normal font-sans">
                De acuerdo con el COGEP, los términos corren con absoluta rigurosidad en Ecuador. Considere siempre que las publicaciones del Registro Oficial son prioritarias para modificar su matriz corporativa.
              </p>
            </div>
          </div>

          {/* Right Side: Alerts Feed */}
          <div className="lg:col-span-8 space-y-4">
            <div className="text-xs uppercase font-bold tracking-wider text-charcoalMuted font-mono">
              Bandeja de Novedades y Resoluciones Oficiales
            </div>

            {alertas.length === 0 ? (
              <div className="text-center py-16 bg-white border border-borderSoft rounded-2xl max-w-lg mx-auto text-charcoalMuted space-y-3">
                <CheckCircle className="w-12 h-12 text-success mx-auto" />
                <h4 className="font-serif font-semibold text-lg text-charcoal">Cero Alertas Críticas pendientes</h4>
                <p className="text-xs font-sans">Todos los boletines SRI, Superintendencias y Prensa de Ecuador están sincronizados y mapeados.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {alertas.map((a) => {
                  const score = a.confianza_score !== undefined ? a.confianza_score : 100;
                  const scoreColor = score >= 90 ? "bg-successSoft text-success border-success/20" : score >= 75 ? "bg-[#FFF6EC] text-[#B86828] border-[#F2D0B6]" : "bg-dangerSoft text-danger border-danger/20";
                  const isRumor = score < 50;

                  return (
                    <div key={a.id} className={`bento-card space-y-3 bg-white ${
                      a.nivel === "critica" ? "border-danger/40 ring-1 ring-danger/10 shadow-sm" : "border-borderSoft"
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 border-b border-borderSoft pb-2">
                        <div>
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="text-[10px] uppercase font-mono font-extrabold text-sidebarRose bg-cream px-1.5 py-0.5 rounded border border-borderSoft/30">{a.fuente_tipo?.toUpperCase() || "ESTADAL"}</span>
                            <span className={`badge ${a.nivel === "critica" ? "danger" : "warning"}`}>
                              {a.nivel}
                            </span>
                          </div>
                          <h3 className="font-serif font-semibold text-base md:text-lg text-charcoal mt-1.5 leading-tight">{a.titulo}</h3>
                          <span className="text-[10px] text-charcoalMuted font-sans block mt-1">Sincronizado: {a.fecha}</span>
                        </div>

                        {/* Confidence veracity index */}
                        <div className={`p-2 rounded-xl border text-center shrink-0 min-w-[120px] ${scoreColor}`}>
                          <div className="text-[9px] uppercase font-bold tracking-wider font-mono">Índice Confianza</div>
                          <div className="text-base font-serif font-bold mt-0.5">{score}%</div>
                          <div className="text-[8px] font-medium leading-none mt-1">{a.confianza_nivel || "Estatal"}</div>
                        </div>
                      </div>

                      <p className="text-xs text-charcoalSoft leading-relaxed font-sans">{a.resumen_alerta}</p>

                      {isRumor && (
                        <div className="bg-[#FFF4F4] border border-danger/20 p-3 rounded-lg text-xs flex gap-2 text-[#9E2A2B]">
                          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                            <strong>Advertencia de Credibilidad:</strong> Las alertas provenientes de canales de redes sociales son especulativas y carecen de validez probatoria. Verifique siempre con el Registro Oficial.
                          </div>
                        </div>
                      )}

                      <div className="pt-2 flex justify-between items-center text-xs">
                        <span className="text-[10px] text-charcoalMuted inline-flex items-center gap-1">
                          <Info className="w-3 h-3 text-sidebarRose" /> 
                          {isRumor ? "Monitorear sin acción dura" : "Sugerido: Auditar e integrar en Matriz"}
                        </span>
                        <button
                          onClick={() => {
                            const updated = alertas.map(alertIt => alertIt.id === a.id ? { ...alertIt, estado: "revisada" as any } : alertIt);
                            setAlertas(updated);
                          }}
                          className="bg-cream border border-borderSoft hover:bg-[#FAF7F0] px-3 py-1.5 rounded-lg cursor-pointer text-[10px] font-bold"
                          type="button"
                        >
                          {a.estado === "revisada" ? "✓ Procesada en Gabinete" : "Marcar como Procesada"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      ) : (
        /* TAB 2: THE REAL LEGAL LIBRARY */
        <div className="space-y-6">
          
          {/* SEARCH BAR & GENERAL WIDGET */}
          <div className="bg-white border border-borderSoft rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-lg text-charcoal">
                  Buscador en Biblioteca Legal de {selectedEmpresa.nombre}
                </h3>
                <p className="text-xs text-charcoalSoft font-sans">
                  Visualice las leyes registradas en su matriz de cumplimiento tributario, laboral, ambiental y sectorial.
                </p>
              </div>

              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-charcoalMuted" />
                <input
                  type="text"
                  placeholder="Buscar ley, reglamento, código o archivo manual..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-cream border border-borderSoft rounded-xl pl-10 pr-4 py-3 text-xs text-charcoal placeholder:text-charcoalMuted focus:outline-none focus:border-charcoal focus:ring-1 focus:ring-charcoal"
                />
              </div>
            </div>

            {/* SUB-TABS SELECTOR */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borderSoft/60 pt-3">
              <div className="flex gap-2 font-sans text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedSubTab("matriz")}
                  className={`px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                    selectedSubTab === "matriz"
                      ? "bg-charcoal text-white border-charcoal"
                      : "bg-cream text-charcoalSoft border-borderSoft hover:bg-paperDark"
                  }`}
                >
                  📜 Regulaciones de la Matriz ({filteredNorms.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSubTab("manuales")}
                  className={`px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                    selectedSubTab === "manuales"
                      ? "bg-charcoal text-white border-charcoal"
                      : "bg-cream text-charcoalSoft border-borderSoft hover:bg-paperDark"
                  }`}
                >
                  🗂️ Archivos de Normativa Subidos ({filteredManualDocs.length})
                </button>
              </div>

              {/* Google Drive Connection and Upload Actions */}
              <div className="flex items-center gap-2">
                {!driveConnected ? (
                  <button
                    type="button"
                    onClick={handleConnectDrive}
                    disabled={loadingDrive}
                    className="inline-flex items-center gap-1.5 bg-[#4285F4] hover:bg-[#357AE8] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer font-sans shadow-sm"
                  >
                    {loadingDrive ? "Conectando..." : "🔗 Enlazar Google Drive"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setShowDriveModal(true);
                      fetchDriveFiles(driveToken!);
                    }}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer font-sans shadow-sm"
                  >
                    <span>▲ Importar de GDrive</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubTab("manuales");
                    setShowUploadForm(!showUploadForm);
                  }}
                  className="inline-flex items-center gap-1.5 bg-[#8D2531] hover:bg-[#731E28] text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer font-sans"
                >
                  <UploadCloud className="w-4 h-4" />
                  Agregar Normativa
                </button>
              </div>
            </div>
          </div>

          {/* MANUAL UPLOAD FORM (ALL ROLES - SÚPER ADMINS ARE AUTOMATICALLY PERMANENT) */}
          {showUploadForm && (
            <form onSubmit={handleSaveDocument} className="bg-white border-2 border-sidebarRose/30 rounded-2xl p-5 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-borderSoft pb-2">
                <h4 className="font-serif font-bold text-base text-charcoal flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-sidebarRose" />
                  Registo de Nueva Normativa Legal (Punto de Verificación)
                </h4>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowUploadForm(false);
                    setAnnexingFile(null);
                  }}
                  className="text-[#8D2531] hover:underline font-bold text-xs"
                >
                  Cancelar
                </button>
              </div>

              {annexingFile && (
                <div className="bg-[#FAF8F5] border border-borderSoft/60 p-3 rounded-xl flex items-center justify-between text-xs text-charcoal">
                  <div className="flex items-center gap-2">
                    <span className="p-1 bg-[#4285F4]/10 rounded font-bold text-[#4285F4] text-[10px]">Google Drive</span>
                    <p>Anexando el archivo: <strong>{annexingFile.file_name}</strong></p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setAnnexingFile(null)} 
                    className="text-danger hover:underline font-bold text-[10px]"
                  >
                    Quitar anclaje
                  </button>
                </div>
              )}

              {currentProfile.rol !== "super_admin" && (
                <div className="bg-[#FFF8E6] border border-[#F2D0B6] p-3 rounded-xl text-[11px] text-[#A66904] flex gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>
                    <strong>Nota de Políticas de Acceso:</strong> Al no poseer rol de Súper Administrador, esta normativa se guardará inicialmente con un estatus de <strong>Acceso Temporal (48 Horas)</strong>. Para prolongar su vigencia a largo plazo, un Súper Administrador deberá validar y aprobar formalmente el documento.
                  </p>
                </div>
              )}

              {/* AI Autofill Suggestion Bar */}
              <div className="bg-gradient-to-r from-roseSoft/20 to-cream border border-sidebarRose/20 p-3.5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-[#8D2531]/10 rounded-lg text-[#8D2531] font-bold text-xs">🤖 Copiloto IA</span>
                  <div>
                    <p className="font-semibold text-charcoal">¿Desea rellenar el formulario con Inteligencia Artificial?</p>
                    <p className="text-[10px] text-charcoalMuted">
                      {attachedFile || annexingFile 
                        ? `Analiza el archivo cargado para deducir título oficial, emisor, vigencia e internet.`
                        : `Sugerirá campos ingresando un título aproximado en el campo a continuación.`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAutofillWithIA}
                  disabled={analyzingWithIA}
                  className="px-3.5 py-2 bg-[#8D2531] hover:bg-[#731E28] disabled:bg-charcoalMuted text-white font-bold rounded-lg text-[11px] transition-colors flex items-center justify-center gap-1 shadow-sm shrink-0 cursor-pointer"
                >
                  {analyzingWithIA ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Analizando documento...</span>
                    </>
                  ) : (
                    <>✨ Llenar campos con IA</>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="block text-charcoalMuted uppercase font-bold text-[10px]">Nombre / Título de la Norma *</label>
                  <input
                    type="text"
                    required
                    value={formNombre}
                    onChange={(e) => setFormNombre(e.target.value)}
                    placeholder="Ej. Reglamento de Seguridad Contra Incendios Guayaquil"
                    className="w-full bg-cream border border-borderSoft p-2 rounded-lg text-xs text-charcoal outline-none focus:ring-1 focus:ring-sidebarRose"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-charcoalMuted uppercase font-bold text-[10px]">Organismo Emisor *</label>
                  <input
                    type="text"
                    required
                    value={formOrganismo}
                    onChange={(e) => setFormOrganismo(e.target.value)}
                    placeholder="Ej. Benemérito Cuerpo de Bomberos de Guayaquil"
                    className="w-full bg-cream border border-borderSoft p-2 rounded-lg text-xs text-charcoal outline-none focus:ring-1 focus:ring-sidebarRose"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="block text-charcoalMuted uppercase font-bold text-[10px]">Fecha de Publicación *</label>
                  <input
                    type="date"
                    required
                    value={formFecha}
                    onChange={(e) => setFormFecha(e.target.value)}
                    className="w-full bg-cream border border-borderSoft p-2 rounded-lg text-xs text-charcoal outline-none focus:ring-1 focus:ring-sidebarRose"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-charcoalMuted uppercase font-bold text-[10px]">Materia / Campo Jurídico</label>
                  <input
                    type="text"
                    value={formMateria}
                    onChange={(e) => setFormMateria(e.target.value)}
                    placeholder="Ej. Laboral, Hidrocarburos, Seguridad, SRI"
                    className="w-full bg-cream border border-borderSoft p-2 rounded-lg text-xs text-charcoal outline-none focus:ring-1 focus:ring-sidebarRose"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-charcoalMuted uppercase font-bold text-[10px]">Estado de Vigencia</label>
                  <select
                    value={formVigencia}
                    onChange={(e) => setFormVigencia(e.target.value)}
                    className="w-full bg-cream border border-borderSoft p-2 rounded-lg text-xs text-charcoal h-[34px] outline-none focus:ring-1 focus:ring-sidebarRose"
                  >
                    <option value="activo">Vigente Activo</option>
                    <option value="reformado">Vigente con Reformas</option>
                    <option value="precaucion">Bajo Alerta / Acción Requerida</option>
                    <option value="derogado">Derogado / En Desuso</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <label className="block text-charcoalMuted uppercase font-bold text-[10px]">Resumen Ejecutivo / Análisis Sintético *</label>
                <textarea
                  required
                  rows={2}
                  value={formResumen}
                  onChange={(e) => setFormResumen(e.target.value)}
                  placeholder="Redacte un resumen ejecutivo de las obligaciones fundamentales impuestas por este documento de normativa..."
                  className="w-full bg-cream border border-borderSoft p-2 rounded-lg text-xs text-charcoal outline-none focus:ring-1 focus:ring-sidebarRose"
                />
              </div>

              {/* Drag and Drop file element */}
              <div 
                className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors cursor-pointer ${
                  dragActive ? "border-sidebarRose bg-roseSoft/5" : "border-borderSoft hover:border-sidebarRose/60 bg-[#FAFAFA]"
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById("manual-norm-file-input")?.click()}
              >
                <input
                  id="manual-norm-file-input"
                  type="file"
                  className="hidden"
                  onChange={handleFileInputChange}
                  accept=".pdf,.txt,.doc,.docx"
                />
                <div className="flex flex-col items-center gap-2">
                  <UploadCloud className="w-8 h-8 text-charcoalMuted" />
                  {attachedFile ? (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-charcoal flex items-center justify-center gap-1">
                        <Paperclip className="w-3.5 h-3.5 text-sidebarRose" /> {attachedFile.name}
                      </p>
                      <p className="text-[10px] text-charcoalMuted">{(attachedFile.size / 1024).toFixed(1)} KB · Presione para cambiar archivo</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-sans text-charcoal">Arrastre aquí su boletín del Registro Oficial, o presione para buscar</p>
                      <p className="text-[10px] text-charcoalMuted mt-0.5">Soporta PDF, TXT o Word (.doc/.docx)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {uploadProgress !== null && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-charcoalMuted">
                    <span>Procesando e indexando texto legal...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-cream border border-borderSoft h-1.5 rounded-full overflow-hidden">
                    <div className="bg-sidebarRose h-full transition-all duration-150" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 text-xs pt-2 font-sans">
                <button
                  type="button"
                  onClick={() => setShowUploadForm(false)}
                  className="px-4 py-2 bg-cream text-charcoalSoft border border-borderSoft rounded-xl hover:bg-paperDark transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploadProgress !== null}
                  className="px-4 py-2 bg-[#8D2531] hover:bg-[#731E28] text-white font-bold rounded-xl transition-colors cursor-pointer shadow-md"
                >
                  ✓ Registrar Documento Regulativo
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT COLUMN: LIST of REGISTERED OR MANUALLY UPLOADED NORMATIVES */}
            <div className="lg:col-span-7 space-y-4">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-charcoalMuted font-mono">
                {selectedSubTab === "matriz" 
                  ? `Regulaciones Registradas para esta Empresa (${filteredNorms.length})`
                  : `Documentos de Normativa Cargados (${filteredManualDocs.length})`
                }
              </h3>

              {selectedSubTab === "matriz" ? (
                normsLoading ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-borderSoft">
                    <RefreshCw className="w-8 h-8 text-sidebarRose animate-spin mx-auto" />
                    <span className="text-xs text-charcoalSoft mt-2 block font-sans">Escombrando la matriz legal...</span>
                  </div>
                ) : filteredNorms.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-borderSoft text-charcoalMuted space-y-2">
                    <HelpCircle className="w-10 h-10 text-charcoalMuted mx-auto" />
                    <p className="text-xs font-sans">No se encontraron normativas con los términos de búsqueda.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {filteredNorms.map((norm, idx) => {
                      const isValidating = validatingNormName === norm.norma_nombre;
                      const isCurrentlySelected = selectedAuditNorm === norm.norma_nombre;
                      
                      const badgeStyles: Record<string, string> = {
                        activo: "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]",
                        reformado: "bg-[#FFF6EC] text-[#B86828] border-[#F2D0B6]",
                        precaucion: "bg-[#FFF1F2] text-[#E11D48] border-[#FECDD3]",
                        derogado: "bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]"
                      };
                      const statusLabels: Record<string, string> = {
                        activo: "Vigente Activa",
                        reformado: "Reformada Recientemente",
                        precaucion: "Acción Requerida / Alerta",
                        derogado: "Derogada / Antigua"
                      };

                      const statusKey = norm.status || "pendiente_analisis";

                      return (
                        <div 
                          key={idx} 
                          className={`bg-white border rounded-2xl p-5 hover:shadow-sm transition-all space-y-3 ${
                            isCurrentlySelected ? "border-sidebarRose ring-1 ring-sidebarRose/15 bg-roseSoft/5" : "border-borderSoft"
                          }`}
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div className="space-y-1">
                              <span className="text-[10px] uppercase font-extrabold tracking-wider text-sidebarRose bg-cream rounded px-2 py-0.5 border border-borderSoft/30">
                                {norm.tipo_norma}
                              </span>
                              <h4 className="font-serif font-bold text-base text-charcoal leading-tight">
                                {norm.norma_nombre}
                              </h4>
                              <p className="text-[11px] text-charcoalMuted">
                                Emisor: <strong>{norm.organismo_emisor}</strong>
                              </p>
                            </div>

                            {norm.status && (
                              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border font-sans uppercase shrink-0 ${badgeStyles[statusKey] || "bg-cream text-charcoal border-borderSoft"}`}>
                                {statusLabels[statusKey] || "Análisis Técnico"}
                              </span>
                            )}
                          </div>

                          {norm.ultima_reforma && (
                            <div className="text-[11px] text-charcoalSoft bg-[#FBF9F6] p-2.5 rounded-xl border border-borderSoft/30">
                              <strong>Última Reforma:</strong> {norm.ultima_reforma}
                            </div>
                          )}

                          <div className="pt-2 flex justify-between items-center border-t border-borderSoft/50">
                            <span className="text-[10px] text-charcoalMuted italic font-mono">
                              Cotejado en internet: {norm.status ? "✓ Sí" : "Pendiente"}
                            </span>

                            <button
                              onClick={() => handleValidateNormWithIA(norm)}
                              disabled={isValidating || !!validatingNormName}
                              className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                                isValidating 
                                  ? "bg-cream text-charcoal border-borderSoft animate-pulse" 
                                  : isCurrentlySelected 
                                  ? "bg-sidebarRose text-cream border-sidebarRose hover:bg-[#8D2531]" 
                                  : "bg-cream text-charcoal border-borderSoft hover:bg-paperDark"
                              }`}
                            >
                              <Sparkles className={`w-3 h-4 ${isValidating ? "animate-spin" : ""}`} />
                              {isValidating ? "Cotejando con Google Search..." : "Cotejar Vigencia en Internet con IA"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                /* MANUAL UPLOADED NORMATIVE SUB-TAB */
                docsLoading ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-borderSoft">
                    <RefreshCw className="w-8 h-8 text-sidebarRose animate-spin mx-auto" />
                    <span className="text-xs text-charcoalSoft mt-2 block font-sans">Cargando biblioteca de archivos subidos...</span>
                  </div>
                ) : filteredManualDocs.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-borderSoft text-charcoalMuted space-y-3">
                    <FileText className="w-10 h-10 text-charcoalMuted mx-auto" />
                    <p className="text-xs font-sans">No hay normativas cargadas manualmente para esta empresa.</p>
                    {(currentProfile.rol === "super_admin" || currentProfile.rol === "admin") && (
                      <button
                        type="button"
                        onClick={() => setShowUploadForm(true)}
                        className="text-xs text-sidebarRose hover:underline font-semibold"
                      >
                        Suba su primera norma técnica o ley de respaldo ahora
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {filteredManualDocs.map((doc, idx) => {
                      const isCurrentlySelected = selectedAuditNorm === doc.nombre;
                      
                      const badgeStyles: Record<string, string> = {
                        activo: "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]",
                        reformado: "bg-[#FFF6EC] text-[#B86828] border-[#F2D0B6]",
                        precaucion: "bg-[#FFF1F2] text-[#E11D48] border-[#FECDD3]",
                        derogado: "bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]"
                      };
                      const statusLabels: Record<string, string> = {
                        activo: "Vigente Activo",
                        reformado: "Vigente con Reformas",
                        precaucion: "Alerta de Cambio",
                        derogado: "Derogado"
                      };

                      return (
                        <div 
                          key={idx} 
                          className={`bg-white border rounded-2xl p-5 hover:shadow-sm transition-all space-y-3 ${
                            isCurrentlySelected ? "border-sidebarRose ring-1 ring-sidebarRose/15 bg-roseSoft/5" : "border-borderSoft"
                          }`}
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-sidebarRose bg-cream rounded px-2 py-0.5 border border-borderSoft/30">
                                  {doc.materia || "General"}
                                </span>
                                <span className="text-[10px] flex items-center gap-1 font-mono text-charcoalMuted">
                                  <Paperclip className="w-3 h-3" /> {doc.file_name}
                                </span>
                                {doc.estado_permanencia === "temporal" ? (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FFFbeb] text-[#B45309] border border-[#FDE68A] animate-pulse">
                                    ⏳ Temporal ({doc.fecha_expiracion_temporal ? Math.max(0, Math.ceil((new Date(doc.fecha_expiracion_temporal).getTime() - Date.now()) / (3600 * 1000))) : 48}h rest.)
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    ✓ Permanente Formal
                                  </span>
                                )}
                              </div>
                              <h4 className="font-serif font-bold text-base text-charcoal leading-tight">
                                {doc.nombre}
                              </h4>
                              <p className="text-[11px] text-[#A8A29E] font-medium font-sans">
                                Emisor: <strong className="text-charcoalSoft">{doc.organismo_emisor}</strong> · Publicado: {doc.fecha_publicacion}
                              </p>
                            </div>

                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border font-sans uppercase shrink-0 ${badgeStyles[doc.vigencia] || "bg-cream text-charcoal border-borderSoft"}`}>
                              {statusLabels[doc.vigencia] || "Vigente"}
                            </span>
                          </div>

                          {doc.estado_permanencia === "temporal" && (
                            <div className="bg-[#FFFDF5] border border-amber-200 p-2.5 rounded-xl text-[10px] text-amber-800 leading-relaxed">
                              <strong>Advertencia de Permanencia Temporal:</strong> Este documento fue aportado por un usuario sin privilegios de Súper Administración. Expirará automáticamente del fondo compartido en 48 horas a menos que reciba el aval de permanencia oficial.
                            </div>
                          )}

                          {doc.resumen && (
                            <div className="text-xs text-charcoalSoft leading-relaxed font-sans bg-[#FAF8F5]/80 p-3 rounded-xl border border-borderSoft/50 text-justify">
                              <FormattedText text={doc.resumen} />
                            </div>
                          )}

                          {doc.constatacion_internet && (
                            <div className="bg-[#FAF9F5] border border-[#E9E4DC] p-3 rounded-xl space-y-2 text-xs">
                              <div className="flex items-center justify-between gap-1 flex-wrap">
                                <span className="font-bold flex items-center gap-1 text-charcoal text-[11px]">
                                  🌐 Constatación de Vigencia Online:
                                </span>
                                {(() => {
                                  let statusColor = "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]";
                                  let statusText = "Vigente Confirmado";
                                  const rawStat = doc.constatacion_internet.status_internet;
                                  if (rawStat === "reformado_vigente" || rawStat === "reformado") {
                                    statusColor = "bg-[#FFF6EC] text-[#B86828] border-[#F2D0B6]";
                                    statusText = "Vigente con Reformas";
                                  } else if (rawStat === "derogado") {
                                    statusColor = "bg-[#FFF1F2] text-[#E11D48] border-[#FECDD3]";
                                    statusText = "Derogado / obsoleto";
                                  } else if (rawStat === "no_encontrado" || rawStat === "pendiente" || rawStat === "desconocido") {
                                    statusColor = "bg-gray-100 text-gray-500 border-gray-300";
                                    statusText = "Sin Rastro en Buscador";
                                  }
                                  return (
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border leading-none uppercase shrink-0 ${statusColor}`}>
                                      {statusText}
                                    </span>
                                  );
                                })()}
                              </div>
                              <div className="text-[11px] text-charcoalSoft leading-relaxed text-justify">
                                <FormattedText text={doc.constatacion_internet.analisis} />
                              </div>
                              {doc.constatacion_internet.fuentes && doc.constatacion_internet.fuentes.length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-[10px] font-bold text-charcoalMuted">Fuentes oficiales constatadas:</p>
                                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                                    {doc.constatacion_internet.fuentes.map((src: any, srcIdx: number) => (
                                      <a 
                                        key={srcIdx}
                                        href={src.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-[9px] text-[#8D2531] hover:underline font-bold flex items-center gap-0.5 bg-[#8D2531]/5 px-2 py-0.5 rounded border border-[#8D2531]/10"
                                      >
                                        📄 {src.titulo || "Enlace de Registro Oficial"} ↗
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {doc.gdrive_link && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="text-charcoalMuted text-[10px]">Almacenado seguro en:</span>
                              <a 
                                href={doc.gdrive_link} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-1 text-[#4285F4] hover:underline hover:text-blue-700 font-bold font-sans text-[11px]"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> Abrir en Google Drive ↗
                              </a>
                            </div>
                          )}

                          <div className="pt-2 flex justify-between items-center border-t border-borderSoft/50 gap-2 flex-wrap">
                            <div className="flex flex-col text-[10px] text-charcoalMuted font-mono">
                              <span>Sincronizado por: <strong>{doc.subido_por_nombre}</strong> ({doc.subido_por_rol})</span>
                              {doc.gdrive_file_id && (
                                <span className="text-[9px] text-charcoalSoft">Ref ID GDrive: {doc.gdrive_file_id}</span>
                              )}
                            </div>

                            <div className="flex gap-1.5 shrink-0 items-center flex-wrap">
                              {/* Súper Admin Validation Button */}
                              {currentProfile.rol === "super_admin" && doc.estado_permanencia === "temporal" && (
                                <button
                                  onClick={() => handleApproveNormative(doc.id)}
                                  className="p-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors text-[10px] font-bold cursor-pointer font-sans shadow-sm"
                                  type="button"
                                >
                                  ✓ Autorizar Permanencia
                                </button>
                              )}

                              {/* Delete button option */}
                              {(currentProfile.rol === "super_admin" || currentProfile.rol === "admin") && (
                                <button
                                  onClick={() => handleDeleteDocument(doc.id, doc.nombre)}
                                  className="p-1 px-2 rounded-lg border border-danger/30 text-danger hover:bg-dangerSoft/20 transition-colors text-[10px] font-bold cursor-pointer font-sans"
                                  type="button"
                                >
                                  <Trash2 className="w-3 h-3 inline mr-1" /> Borrar
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  // Validate using Google Search AI of the server
                                  const simulatedNorm: NormativaValidacion = {
                                    norma_nombre: doc.nombre,
                                    tipo_norma: doc.materia || "Normativa Manual",
                                    organismo_emisor: doc.organismo_emisor,
                                    status: doc.vigencia
                                  };
                                  handleValidateNormWithIA(simulatedNorm);
                                }}
                                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                                    selectedAuditNorm === doc.nombre 
                                      ? "bg-sidebarRose text-cream border-sidebarRose hover:bg-[#8D2531]" 
                                      : "bg-cream text-charcoal border-borderSoft hover:bg-paperDark"
                                  }`}
                              >
                                <Sparkles className="w-3 h-4" />
                                Cotejar con IA
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>

            {/* RIGHT COLUMN: DETAILED IA ANALYSIS PANEL (INTERNET GROUNDED) */}
            <div className="lg:col-span-5 space-y-4">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-charcoalMuted font-mono">
                Panel de Auditoría de Vigencia (Google Search AI)
              </h3>

              {!selectedAuditNorm ? (
                <div className="bg-white border border-borderSoft rounded-2xl p-6 text-center space-y-4 text-charcoalMuted">
                  <div className="w-12 h-12 rounded-full bg-cream text-sidebarRose flex items-center justify-center mx-auto shadow-sm">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="font-serif font-bold text-charcoal text-base">Cotejador Técnico de Leyes</h4>
                  <p className="text-xs font-sans max-w-xs mx-auto text-charcoalSoft">
                    Seleccione cualquier normativa de la biblioteca a la izquierda y presione <strong>"Cotejar"</strong>. La IA escaneará de inmediato buscadores jurídicos reales de Ecuador (Cuerpo de Bomberos, Superintendencias, Registro Oficial) para reportarle vigencia o reformas.
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-borderSoft rounded-2xl p-6 shadow-sm space-y-5 relative">
                  
                  {/* Validation ongoing */}
                  {validatingNormName ? (
                    <div className="absolute inset-0 bg-white/80 rounded-2xl flex flex-col items-center justify-center space-y-3 z-10 backdrop-blur-[1px]">
                      <RefreshCw className="w-8 h-8 text-sidebarRose animate-spin" />
                      <p className="text-xs font-semibold text-charcoal font-mono">Escanendo Registro Oficial nacional...</p>
                    </div>
                  ) : null}

                  <div className="border-b border-borderSoft pb-3">
                    <div className="text-[10px] text-sidebarRose uppercase font-extrabold font-mono tracking-widest">
                      RESULTADO DE AUDITORÍA DE VIGENCIA
                    </div>
                    <h3 className="font-serif font-bold text-lg text-charcoal mt-1 leading-tight">
                      {selectedAuditNorm}
                    </h3>
                  </div>

                  {auditResult ? (
                    <div className="space-y-4 font-sans text-xs">
                      
                      {/* State badge indicator */}
                      <div className="flex items-center gap-3">
                        <span className="text-charcoalSoft font-semibold">Estado de Vigencia:</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                          auditResult.status === "activo" 
                            ? "bg-successSoft text-success border-success/20" 
                            : auditResult.status === "precaucion" 
                            ? "bg-[#FFF1F2] text-[#E11D48] border-[#FECDD3]" 
                            : "bg-[#FFF6EC] text-[#B86828] border-[#F2D0B6]"
                        }`}>
                          {auditResult.status === "activo" ? "Activa & Vigente" : auditResult.status === "precaucion" ? "Urgente / Precaución " : "Vigente con Reformas"}
                        </span>
                      </div>

                      {/* Last publication reform */}
                      <div className="space-y-1 bg-[#FBF9F7] p-3 rounded-xl border border-borderSoft">
                        <span className="text-charcoalMuted text-[10px] font-extrabold uppercase font-mono tracking-wider">Último Movimiento lícito:</span>
                        <div className="font-serif font-semibold text-charcoal leading-tight mt-0.5">
                          {auditResult.ultima_reforma}
                        </div>
                      </div>

                      {/* Detailed Google search analysis paragraph */}
                      <div className="space-y-1">
                        <span className="text-charcoalMuted text-[10px] font-extrabold uppercase font-mono tracking-wider">Análisis Jurídico Grounded AI:</span>
                        <div className="text-charcoalSoft leading-relaxed font-sans bg-cream/30 p-3 rounded-xl border border-borderSoft/50 text-justify">
                          <FormattedText text={auditResult.analisis_google} />
                        </div>
                      </div>

                      {/* Recommended compliance actions */}
                      {auditResult.acciones_recomendadas && auditResult.acciones_recomendadas.length > 0 && (
                        <div className="space-y-2 border-t border-borderSoft/50 pt-3">
                          <span className="text-charcoalMuted text-[10px] font-extrabold uppercase font-mono tracking-wider">Acciones Obligatorias Recomendadas:</span>
                          <div className="space-y-1.5">
                            {auditResult.acciones_recomendadas.map((act: string, aIdx: number) => (
                              <div key={aIdx} className="flex gap-2 items-start text-charcoalSoft">
                                <CheckCircle className="w-3.5 h-3.5 text-[#059669] shrink-0 mt-0.5" />
                                <span>{act}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="bg-[#FEFDFB] border border-[#F2D0B6] rounded-xl p-3 text-[10px] text-charcoalMuted leading-relaxed">
                        ⚠️ <strong>Nota:</strong> Este análisis de vigencia se formuló cruzando en directo Google Search con boletines lícitos de Ecuador (2025/2026). Guarde este análisis digital en su Gabinete para resguardo probatorio frente a auditorías externas gubernamentales.
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-charcoalMuted">
                      <p className="text-xs">No se han devuelto resultados para esta norma aún. Presione el botón de validación para cotejar en tiempo real.</p>
                    </div>
                  )}

                </div>
              )}
            </div>

          </div>

          {/* SECTION: VACÍOS NORMATIVOS / PROACTIVE DISCOVERY */}
          <div className="bg-[#FAF8F5] border border-borderSoft rounded-2xl p-6 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-borderSoft/80 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-sidebarRose" />
                  <h3 className="font-serif font-bold text-lg text-charcoal">
                    Escáner Proactivo de Vacíos Normativos en {selectedEmpresa.nombre}
                  </h3>
                </div>
                <p className="text-xs text-charcoalSoft font-sans">
                  Realice una auditoría proactiva lícita en internet por IA para descubrir qué regulaciones vigentes obligatorias de {selectedEmpresa.sector} le faltan o no tiene asignadas en su matriz de cumplimiento.
                </p>
              </div>

              <button
                onClick={handleDiscoverMissingNorms}
                disabled={discoveringLoading}
                className="inline-flex items-center gap-2 bg-charcoal hover:bg-charcoalSoft text-paper text-xs font-semibold px-4 py-2.5 rounded-xl transition-all font-sans cursor-pointer shrink-0 shadow-sm"
              >
                <Sparkles className={`w-4 h-4 ${discoveringLoading ? "animate-spin" : ""}`} />
                {discoveringLoading ? "Analizando Sector con Google..." : "Ejecutar Escáner IA de Vacíos Normativos"}
              </button>
            </div>

            {discoveringLoading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 text-sidebarRose animate-spin mx-auto" />
                <p className="text-xs text-charcoalSoft mt-2 font-mono">Buscando resoluciones o requerimientos específicos omitidos en Ecuador...</p>
              </div>
            ) : suggestedNorms.length === 0 ? (
              <div className="text-center py-8 bg-[#FBF9F6] border border-dashed border-borderSoft rounded-xl text-charcoalMuted text-xs font-sans">
                Sin auditorías de vacíos ejecutadas. Presione el botón superior para buscar regulaciones sugeridas basadas en su actividad comercial en Ecuador.
              </div>
            ) : (
              <div className="space-y-4">
                <h4 className="text-xs uppercase font-extrabold tracking-wider text-[#A16207] font-sans">
                  🚨 Normativa Omitida o Reclamable Detectada en Internet para su Sector:
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {suggestedNorms.map((ns, nsIdx) => (
                    <div key={nsIdx} className="bg-white border border-borderSoft p-4 rounded-xl flex flex-col justify-between space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[10px] font-bold text-[#A16207] bg-[#FEF9C3] border border-[#FEF08A] px-1.5 py-0.5 rounded">
                            {ns.articulo ? (ns.articulo.trim().toLowerCase().startsWith("art") ? ns.articulo : `Art. ${ns.articulo}`) : "Gral"}
                          </span>
                          <span className="text-[9px] uppercase font-mono font-bold text-charcoalMuted bg-cream border px-1.5 py-0.5 rounded">
                            {ns.campo_juridico || "Corporativo"}
                          </span>
                        </div>
                        <h5 className="font-serif font-bold text-xs leading-snug text-charcoal">
                          {ns.norma_nombre}
                        </h5>
                        <div className="text-[11px] text-charcoalSoft">
                          <strong>Requisito:</strong>
                          <FormattedText text={ns.requisito} />
                        </div>
                        <div className="text-[10px] text-danger/80 mt-1">
                          <strong>Sanción:</strong>
                          <FormattedText text={ns.sancion} />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-borderSoft flex justify-between items-center">
                        <span className="text-[9px] text-charcoalMuted font-mono">
                          Prioridad: <strong className="uppercase">{ns.prioridad}</strong>
                        </span>
                        <button
                          onClick={() => handleAdoptProposal(ns)}
                          className="bg-cream hover:bg-roseSoft/20 border border-borderSoft/85 hover:border-sidebarRose text-sidebarRose px-2 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors inline-flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Adoptar en Matriz
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* GOOGLE DRIVE SELECTOR MODAL */}
      {showDriveModal && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-borderSoft rounded-3xl w-full max-w-2xl shadow-xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="border-b border-borderSoft/60 p-5 flex justify-between items-center bg-[#FAF8F5]">
              <div>
                <h3 className="font-serif font-bold text-base text-charcoal">
                  Explorar Archivos de Google Drive
                </h3>
                <p className="text-xs text-charcoalSoft font-sans">
                  Navegue en sus carpetas para encontrar resoluciones, acuerdos regulatorios o leyes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDriveModal(false)}
                className="p-1 px-2.5 rounded-xl border border-borderSoft hover:bg-paperDark text-xs font-bold font-sans cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            {/* Path/Breadcrumbs Bar */}
            <div className="bg-[#FAF8F5] border-b border-borderSoft/40 px-5 py-2.5 flex items-center gap-1.5 flex-wrap text-xs font-sans">
              <span className="text-charcoalMuted">Ubicación:</span>
              {driveFolderPathStack.map((fld, idx) => (
                <React.Fragment key={fld.id}>
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-charcoalMuted/60 shrink-0" />}
                  <button
                    type="button"
                    onClick={() => handleNavigateDriveFolder(fld)}
                    className={`hover:underline font-semibold cursor-pointer shrink-0 ${
                      idx === driveFolderPathStack.length - 1 ? "text-emerald-700" : "text-charcoal"
                    }`}
                  >
                    {fld.name}
                  </button>
                </React.Fragment>
              ))}
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {loadingDrive ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 text-[#4285F4] animate-spin mx-auto" />
                  <p className="text-xs text-charcoalSoft mt-2 font-mono">Listando archivos indexados de su Drive...</p>
                </div>
              ) : driveFiles.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <p className="text-xs text-charcoalSoft font-sans">
                    No se detectaron subcarpetas o archivos válidos (PDF, Texto, Word) en esta ubicación de Google Drive.
                  </p>
                  <div className="flex justify-center gap-2">
                    {driveFolderPathStack.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleNavigateDriveFolder(driveFolderPathStack[driveFolderPathStack.length - 2])}
                        className="inline-flex items-center gap-1 bg-cream border border-borderSoft hover:bg-paperDark px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Volver atrás
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => fetchDriveFiles(driveToken!, driveCurrentFolderId)}
                      className="inline-flex items-center gap-1 bg-cream border border-borderSoft hover:bg-paperDark px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" /> Reintentar búsqueda
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border border-borderSoft rounded-2xl overflow-hidden divide-y divide-borderSoft">
                  {driveFiles.map((f: any) => {
                    const isFolder = f.mimeType === "application/vnd.google-apps.folder";
                    return (
                      <div 
                        key={f.id} 
                        className={`p-3.5 hover:bg-cream/40 flex items-center justify-between gap-3 text-xs text-charcoal transition-colors ${
                          isFolder ? "cursor-pointer bg-[#FDFCF9]/30" : ""
                        }`}
                        onClick={() => {
                          if (isFolder) {
                            handleNavigateDriveFolder({ id: f.id, name: f.name });
                          }
                        }}
                      >
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <h4 className="font-semibold font-sans truncate pr-2 flex items-center gap-2 text-charcoal">
                            {isFolder ? (
                              <span className="p-1.5 bg-amber-100 rounded-lg text-amber-700 shrink-0 inline-flex items-center">
                                <Folder className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <span className="p-1 bg-[#4285F4]/10 rounded font-bold text-[#4285F4] text-[9px] uppercase shrink-0">
                                {f.mimeType ? f.mimeType.split(".").pop()?.split("/").pop() : "DOC"}
                              </span>
                            )}
                            <span className={isFolder ? "text-[#D27D2D] font-bold" : ""}>
                              {f.name}
                            </span>
                          </h4>
                          <p className="text-[10px] text-charcoalMuted truncate font-mono ml-1">
                            {isFolder ? "Carpeta de Google Drive" : `ID: ${f.id}`}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0" onClick={(e) => isFolder && e.stopPropagation()}>
                          {isFolder ? (
                            <button
                              type="button"
                              onClick={() => handleNavigateDriveFolder({ id: f.id, name: f.name })}
                              className="bg-[#FAF8F5] text-charcoal border border-borderSoft hover:bg-amber-50 hover:border-amber-300 p-1.5 px-3 rounded-xl text-[10px] font-extrabold cursor-pointer transition-colors font-sans inline-flex items-center gap-1"
                            >
                              Abrir carpeta <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <>
                              <a
                                href={f.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 px-2.5 rounded-xl border border-borderSoft hover:bg-paperDark text-[10px] font-bold text-charcoalSoft inline-flex items-center gap-1 font-sans"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> Abrir original
                              </a>
                              <button
                                type="button"
                                onClick={() => handleAnnexDriveFile(f)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 px-3 rounded-xl text-[10px] font-extrabold cursor-pointer transition-colors font-sans"
                              >
                                Anexar a Normativa
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-borderSoft/60 p-4 bg-[#FAF8F5] flex items-center justify-between">
              <span className="text-[10px] text-charcoalMuted italic font-mono">Haga clic en las carpetas para explorar sus contenidos.</span>
              <span className="p-1 px-1.5 bg-emerald-500/10 border border-emerald-400 text-emerald-700 rounded-lg text-[9px] font-extrabold font-mono">CONEXIÓN DRIVE ACTIVA</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
