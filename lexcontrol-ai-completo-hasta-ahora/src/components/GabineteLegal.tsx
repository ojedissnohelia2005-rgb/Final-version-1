import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import { Empresa, UserProfile } from "../types";
import { 
  connectGoogleDrive, 
  getCachedToken, 
  getOrCreateFolder, 
  uploadOrOverwriteTextFile,
  setCachedToken
} from "../lib/gdrive";
import { 
  FileText, Folder, FolderOpen, ShieldAlert, Sparkles, Upload, 
  Check, Share2, Globe, Clock, HelpCircle, ArrowRight, Save, 
  Search, RefreshCw, AlertTriangle, Eye, Send, Lock, Plus, X, ListFilter, Play, Cloud
} from "lucide-react";

interface GabineteLegalProps {
  selectedEmpresa: Empresa;
  currentProfile: UserProfile;
}

interface CabinetDoc {
  id: string;
  nombre: string;
  tipo: string; // "Escritura Pública" | "Oficio Recibido" | "Minuta" | "Contrato"
  clasificacion: string; // "copia certificada" | "procuración judicial" | "declaración juramentada" | "oficios recibidos" | "minuta_notaria" | "contrato_general"
  fecha: string;
  estado: string; // "aprobado" | "registro" | "finalizado"
  notaria_asociada?: string;
  url?: string | null;
  cuerpo_original?: string;
  cuerpo_contestacion?: string;
  fecha_contestacion?: string;
}

export default function GabineteLegal({ selectedEmpresa, currentProfile }: GabineteLegalProps) {
  const [activeSubTab, setActiveSubTab] = useState<"archivos" | "contratos" | "oficios" | "satje">("archivos");
  const [documents, setDocuments] = useState<CabinetDoc[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClasificacion, setFilterClasificacion] = useState("all");
  const [loading, setLoading] = useState(false);

  // Contract Builder States
  const [contractPurpose, setContractPurpose] = useState("");
  const [contractCustom, setContractCustom] = useState("");
  const [generatedContractDraft, setGeneratedContractDraft] = useState("");
  const [isBuildingContract, setIsBuildingContract] = useState(false);
  const [contractTitle, setContractTitle] = useState("");
  const [contractClasif, setContractClasif] = useState("contrato_general");
  const [contractKind, setContractKind] = useState("prestacion_servicios");

  // Oficio Responder States
  const [pastedOficioText, setPastedOficioText] = useState("");
  const [isAnalyzingOficio, setIsAnalyzingOficio] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState<any[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [generatedOficioReply, setGeneratedOficioReply] = useState("");
  const [isDraftingOficio, setIsDraftingOficio] = useState(false);
  const [oficioNameTitle, setOficioNameTitle] = useState("");
  
  // New Oficio Drag & Drop / Export states
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [exportFormat, setExportFormat] = useState<"pdf" | "docx">("docx");

  // SATJE states
  const [satjeResults, setSatjeResults] = useState<any[]>([]);
  const [isQueryingSatje, setIsQueryingSatje] = useState(false);
  const [satjeRucInput, setSatjeRucInput] = useState("");
  const [satjeCompanyCreation, setSatjeCompanyCreation] = useState("2015");
  
  // SATJE representative & schedule states
  const [satjeRepName, setSatjeRepName] = useState("");
  const [satjeCedula, setSatjeCedula] = useState("");
  const [satjeScheduleActive, setSatjeScheduleActive] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [scheduleStatusMessage, setScheduleStatusMessage] = useState("");

  // Share Modal States
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharingDoc, setSharingDoc] = useState<CabinetDoc | null>(null);
  const [shareTimeLimit, setShareTimeLimit] = useState("24_horas");
  const [shareUrlResult, setShareUrlResult] = useState("");

  // Upload/Finalize Minuta Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<CabinetDoc | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [selectedNotariaOficial, setSelectedNotariaOficial] = useState("Notaría 38 de Guayaquil");

  // Google Drive integration states
  const [driveToken, setDriveToken] = useState<string | null>(() => getCachedToken());
  const [driveUser, setDriveUser] = useState<any>(null);
  const [isLinkingDrive, setIsLinkingDrive] = useState(false);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [driveSyncProgress, setDriveSyncProgress] = useState("");
  const [driveSyncSuccess, setDriveSyncSuccess] = useState(false);
  const [companyFolderId, setCompanyFolderId] = useState<string | null>(null);
  const [syncedCount, setSyncedCount] = useState(0);

  const handleConnectDrive = async () => {
    setIsLinkingDrive(true);
    setDriveSyncSuccess(false);
    try {
      const result = await connectGoogleDrive();
      setDriveToken(result.accessToken);
      setDriveUser(result.user);
      
      // Auto trigger folder structure creation
      await setupDriveStructure(result.accessToken);
    } catch (err: any) {
      alert("Error al conectar con Google Drive: " + err.message);
    } finally {
      setIsLinkingDrive(false);
    }
  };

  const setupDriveStructure = async (token: string) => {
    setDriveSyncProgress("Estableciendo conexión y consultando jerarquía de carpetas...");
    try {
      let targetFolderId = "";
      
      if (currentProfile.rol === "super_admin") {
        setDriveSyncProgress("Creando carpeta raíz 'LexControl - Consola Super Admin'...");
        const adminRootId = await getOrCreateFolder("LexControl - Consola Super Admin", token);
        
        setDriveSyncProgress(`Creando carpeta para corporativo '${selectedEmpresa.nombre}'...`);
        const companyFolder = await getOrCreateFolder(`LexControl - ${selectedEmpresa.nombre}`, token, adminRootId);
        targetFolderId = companyFolder;
      } else {
        // admin or user directly in company root
        setDriveSyncProgress(`Creando carpeta raíz '${selectedEmpresa.nombre}'...`);
        const companyFolder = await getOrCreateFolder(`LexControl - ${selectedEmpresa.nombre}`, token);
        targetFolderId = companyFolder;
      }
      
      setCompanyFolderId(targetFolderId);
      setDriveSyncProgress("¡Conexión y estructura de carpetas de Google Drive lista!");
      return targetFolderId;
    } catch (err) {
      console.error("Error setting up drive structure", err);
      setDriveSyncProgress("No se pudo estructurar el directorio de forma automática.");
      throw err;
    }
  };

  const handleSyncAllToDrive = async () => {
    const token = driveToken || getCachedToken();
    if (!token) {
      alert("Debe autorizar el enlace a Google Drive primero.");
      return;
    }
    
    setIsSyncingDrive(true);
    setDriveSyncSuccess(false);
    
    try {
      // 1. Double check / ensure folder structure is set up
      let folderId = companyFolderId;
      if (!folderId) {
        folderId = await setupDriveStructure(token);
      }
      
      if (!folderId) {
        throw new Error("No se pudo resolver la carpeta de destino en Google Drive.");
      }
      
      // Filter current company's documents
      const docsToSync = documents;
      if (docsToSync.length === 0) {
        setDriveSyncProgress("No hay documentos en el gabinete actual para sincronizar.");
        setTimeout(() => setDriveSyncProgress(""), 3000);
        setIsSyncingDrive(false);
        return;
      }
      
      setSyncedCount(0);
      let count = 0;
      
      for (const doc of docsToSync) {
        const fileContent = `========================================================================
LEXCONTROL DIGITAL ARCHIVE COPY: ${doc.nombre}
========================================================================
ID REGISTRO: ${doc.id}
NEGOCIO: ${selectedEmpresa.nombre}
TIPO: ${doc.tipo}
CLASIFICACIÓN: ${doc.clasificacion}
FECHA REGISTRO: ${doc.fecha}
NOTARIA ASOCIADA: ${doc.notaria_asociada || "N/A"}
ESTADO ACTUACIÓN: ${doc.estado.toUpperCase()}
========================================================================

DESCRIPCIÓN / TEXTO ORIGINAL DEL REQUERIMIENTO O MINUTA:
------------------------------------------------------------------------
${doc.cuerpo_original || "No se registró cuerpo original."}

------------------------------------------------------------------------
RESPUESTA, TEXTO DE DEFENSA O EXPEDIENTE PROTOCOLIZADO:
------------------------------------------------------------------------
${doc.cuerpo_contestacion || "No se ha generado material de contestación/cuerpo legal lícito."}

========================================================================
LEXCONTROL SECURE CLOUD DESK COPIER SYNC (5.0)
========================================================================`;
        
        const filename = `${doc.nombre.replace(/[\/\\?%*:|"<>]/g, "-")}.txt`;
        setDriveSyncProgress(`Subiendo (${count + 1}/${docsToSync.length}): ${doc.nombre}...`);
        
        await uploadOrOverwriteTextFile(filename, fileContent, folderId, token);
        count++;
        setSyncedCount(count);
      }
      
      setDriveSyncSuccess(true);
      setDriveSyncProgress(`¡Éxito! Se han respaldado y sincronizado ${count} archivos del gabinete en Google Drive.`);
    } catch (err: any) {
      console.error("Sync to Drive failed", err);
      alert("La sincronización falló: " + err.message);
    } finally {
      setIsSyncingDrive(false);
    }
  };

  const autoSyncSingleDocToDrive = async (docName: string, docType: string, docClasif: string, docText: string, originalText?: string) => {
    const token = driveToken || getCachedToken();
    if (!token) return; // Silent return if not connected to Google Drive
    
    try {
      let folderId = companyFolderId;
      if (!folderId) {
        if (currentProfile.rol === "super_admin") {
          const adminRootId = await getOrCreateFolder("LexControl - Consola Super Admin", token);
          folderId = await getOrCreateFolder(`LexControl - ${selectedEmpresa.nombre}`, token, adminRootId);
        } else {
          folderId = await getOrCreateFolder(`LexControl - ${selectedEmpresa.nombre}`, token);
        }
        setCompanyFolderId(folderId);
      }
      
      if (!folderId) return;
      
      const fileContent = `========================================================================
LEXCONTROL DIGITAL ARCHIVE COPY: ${docName}
========================================================================
ID REGISTRO: auto-sync-${Date.now()}
NEGOCIO: ${selectedEmpresa.nombre}
TIPO: ${docType}
CLASIFICACIÓN: ${docClasif}
FECHA REGISTRO: ${new Date().toISOString().split("T")[0]}
========================================================================

DESCRIPCIÓN / TEXTO ORIGINAL:
------------------------------------------------------------------------
${originalText || "No hay texto original cargado."}

------------------------------------------------------------------------
RESPUESTA, TEXTO O PLANILLA DIGITALIZADA:
------------------------------------------------------------------------
${docText}

========================================================================`;

      const filename = `${docName.replace(/[\/\\?%*:|"<>]/g, "-")}.txt`;
      await uploadOrOverwriteTextFile(filename, fileContent, folderId, token);
      console.log(`[Google Drive] Auto-sincronizado exitosamente: ${filename}`);
    } catch (err) {
      console.warn("Auto-syncing single document to Google Drive failed", err);
    }
  };

  useEffect(() => {
    fetchDocuments();
    setSatjeRucInput("");
    fetchScheduleInfo();
  }, [selectedEmpresa]);

  const fetchScheduleInfo = async () => {
    try {
      const res = await fetch(`/api/satje/schedule?negocio_id=${selectedEmpresa.id}`);
      const data = await res.json();
      if (data.success && data.schedule) {
        setSatjeScheduleActive(data.schedule.active);
        setSatjeRepName(data.schedule.representante || selectedEmpresa.representante_legal_nombre || "");
        setSatjeCedula(data.schedule.cedula || "");
      } else {
        setSatjeRepName(selectedEmpresa.representante_legal_nombre || "");
        setSatjeCedula("");
        setSatjeScheduleActive(false);
      }
    } catch (err) {
      console.error("Error fetching schedule info", err);
      setSatjeRepName(selectedEmpresa.representante_legal_nombre || "");
      setSatjeCedula("");
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/gabinete/documents?negocio_id=${selectedEmpresa.id}`);
      const data = await res.json();
      setDocuments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractPurpose.trim()) return;
    setIsBuildingContract(true);
    try {
      const res = await fetch("/api/gemini/generate-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: contractPurpose,
          customDetails: contractCustom,
          contractKind,
          companyName: selectedEmpresa.nombre
        })
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedContractDraft(data.draft);
        setContractTitle(`Minuta / Contrato para ${contractPurpose.substring(0, 30)}...`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsBuildingContract(false);
    }
  };

  const handleSaveCompiledContract = async () => {
    if (!generatedContractDraft) return;
    try {
      const payload = {
        negocio_id: selectedEmpresa.id,
        nombre: contractTitle || `Contrato de Operación: ${contractPurpose.substring(0, 30)}`,
        tipo: contractClasif === "minuta_notaria" ? "Minuta" : "Contrato",
        clasificacion: contractClasif,
        estado: contractClasif === "minuta_notaria" ? "registro" : "aprobado",
        url: contractClasif === "minuta_notaria" ? null : `${contractPurpose.toLowerCase().replace(/[^a-z]/g, "_")}_aprobado.pdf`,
        cuerpo_contestacion: generatedContractDraft,
        fecha: new Date().toISOString().split("T")[0]
      };

      const res = await fetch("/api/gabinete/documents/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert("¡Éxito! El documento generado y revisado ha sido registrado con todas las credenciales lícitas en el Gabinete Empresarial.");
        
        // Auto-sync to Google Drive if authorized
        autoSyncSingleDocToDrive(
          payload.nombre,
          payload.tipo,
          payload.clasificacion,
          payload.cuerpo_contestacion || ""
        );

        fetchDocuments();
        setActiveSubTab("archivos");
        // Clear forms
        setContractPurpose("");
        setContractCustom("");
        setGeneratedContractDraft("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Oficio Analysis and responder
  const handleAnalyzeOficio = async () => {
    if (!pastedOficioText.trim()) return;
    setIsAnalyzingOficio(true);
    try {
      const res = await fetch("/api/gemini/analyze-oficio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pastedOficioText })
      });
      const data = await res.json();
      if (data.success) {
        setExtractedQuestions(data.preguntas);
        // Preset values
        const initialAnswers: Record<string, string> = {};
        data.preguntas.forEach((q: any) => {
          initialAnswers[q.id] = "";
        });
        setQuestionAnswers(initialAnswers);
        setOficioNameTitle(`Contestación Oficio Requerimiento de ${new Date().toISOString().split("T")[0]}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzingOficio(false);
    }
  };

  const handleOficioAnswerChange = (qId: string, val: string) => {
    setQuestionAnswers(prev => ({
      ...prev,
      [qId]: val
    }));
  };

  const handleOficioDraftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDraftingOficio(true);
    try {
      // Map ques to ans
      const mappedAnswers = extractedQuestions.map(q => ({
        requerimiento: q.requerimiento,
        ansVal: questionAnswers[q.id] || "No especificado por el abogado"
      }));

      const res = await fetch("/api/gemini/draft-oficio-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalOficio: pastedOficioText,
          answers: mappedAnswers,
          companyName: selectedEmpresa.nombre
        })
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedOficioReply(data.draft);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDraftingOficio(false);
    }
  };

  const handleSaveOficioPairToCabinet = async () => {
    if (!generatedOficioReply) return;
    try {
      const payload = {
        negocio_id: selectedEmpresa.id,
        nombre: oficioNameTitle || `Contestación Oficial de Oficio Recibido`,
        tipo: "Oficio Recibido",
        clasificacion: "oficios recibidos",
        estado: "aprobado",
        url: `oficio_contestacion_${Date.now()}.pdf`,
        cuerpo_original: pastedOficioText,
        cuerpo_contestacion: generatedOficioReply,
        fecha_contestacion: new Date().toISOString().split("T")[0],
        fecha: new Date().toISOString().split("T")[0]
      };

      const res = await fetch("/api/gabinete/documents/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert("¡Éxito! El par enlazado de Oficio Recibido y su Contestación IA Certificada se guardó de forma permanente.");
        
        // Auto-sync to Google Drive if authorized
        autoSyncSingleDocToDrive(
          payload.nombre,
          payload.tipo,
          payload.clasificacion,
          payload.cuerpo_contestacion || "",
          payload.cuerpo_original || ""
        );

        fetchDocuments();
        setActiveSubTab("archivos");
        // Clear
        setPastedOficioText("");
        setExtractedQuestions([]);
        setGeneratedOficioReply("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // File Drag & Drop processing
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      processIncomingFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      processIncomingFile(files[0]);
    }
  };

  const processIncomingFile = async (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (!["pdf", "docx", "doc", "txt"].includes(extension || "")) {
      alert("Formato no soportado. Cargue un archivo PDF, Word (.doc/.docx) o de Texto (.txt).");
      return;
    }

    setUploadProgress(10);
    let currentPrg = 10;
    const interval = setInterval(async () => {
      currentPrg += 20;
      if (currentPrg >= 100) {
        clearInterval(interval);
        setUploadProgress(null);
        
        if (extension === "txt") {
          const reader = new FileReader();
          reader.onload = (e) => {
            const txt = e.target?.result as string;
            setPastedOficioText(txt);
          };
          reader.readAsText(file);
        } else if (extension === "pdf") {
          try {
            const buffer = await file.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            let binary = "";
            bytes.forEach((b) => binary += String.fromCharCode(b));
            const res = await fetch("/api/files/extract-pdf", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ fileName: file.name, fileBase64: btoa(binary) })
            });
            const data = await res.json();
            setPastedOficioText(data.text || "");
          } catch (err) {
            console.error(err);
            alert("No se pudo extraer texto del PDF. Copie el texto manualmente en el cuadro inferior.");
          }
        } else {
          alert("La lectura automática de Word todavía requiere convertir a PDF o pegar el texto del oficio.");
        }
      } else {
        setUploadProgress(currentPrg);
      }
    }, 120);
  };

  // Download contestacion as PDF or Word (.docx)
  const handleDownloadContestacion = () => {
    if (!generatedOficioReply) return;
    
    const safeTitle = oficioNameTitle.trim().replace(/\s+/g, "_") || "contestacion_oficio";
    
    if (exportFormat === "pdf") {
      try {
        const doc = new jsPDF();
        doc.setFont("helvetica", "normal");
        
        // Premium corporate header stylings
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("LEXCONTROL - CONTESTACIÓN DE REQUERIMIENTO", 15, 18);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Empresa activa: ${selectedEmpresa.nombre} | Registro Digital de Defensa`, 15, 23);
        
        // Horizontal rule divider
        doc.setLineWidth(0.4);
        doc.setDrawColor(222, 207, 190);
        doc.line(15, 26, 195, 26);
        
        doc.setFontSize(10);
        // Split text properly so lines don't clip at margins
        const splitText = doc.splitTextToSize(generatedOficioReply, 175);
        doc.text(splitText, 15, 34);
        
        doc.save(`${safeTitle}.pdf`);
      } catch (err) {
        console.error("PDF generation error, downloading as txt fallback:", err);
        // Fallback txt
        const blob = new Blob([generatedOficioReply], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${safeTitle}.txt`;
        a.click();
      }
    } else {
      // Microsoft Word compatible HTML representation download
      const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <title>${oficioNameTitle || "Contestación Oficial"}</title>
          <style>
            body { font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.6; margin: 40px; }
            h2 { color: #1E293B; font-family: 'Times New Roman', serif; font-size: 16pt; border-bottom: 2px solid #DECFBE; padding-bottom: 5px; }
            p { font-size: 11pt; font-family: 'Times New Roman', serif; margin-bottom: 12px; text-align: justify; }
          </style>
        </head>
        <body>
          <h2>CONTESTACIÓN FORMAL DE OFICIO - ${selectedEmpresa.nombre.toUpperCase()}</h2>
          <div style="font-size: 10pt; color: #555555; margin-bottom: 15px;">
            Generado lícitamente por LexControl el ${new Date().toLocaleDateString("es-EC")}
          </div>
          ${generatedOficioReply.split("\n\n").map(paragraph => `<p>${paragraph.replace(/\n/g, "<br/>")}</p>`).join("")}
        </body>
        </html>
      `;
      const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeTitle}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // SATJE Automated Scraper Action taking Representative and ID Card
  const handleQuerySatje = async () => {
    setIsQueryingSatje(true);
    setSatjeResults([]);
    try {
      const res = await fetch("/api/satje/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ruc: satjeRucInput, 
          representante: satjeRepName,
          cedula: satjeCedula,
          creationYear: satjeCompanyCreation,
          negocio_id: selectedEmpresa.id
        })
      });
      const data = await res.json();
      if (data.success) {
        // Mock a brief scraper animation
        setTimeout(() => {
          setSatjeResults(data.demandas_encontradas);
          setIsQueryingSatje(false);
        }, 1100);
      }
    } catch (err) {
      console.error(err);
      setIsQueryingSatje(false);
    }
  };

  // Save/Update SATJE weekly schedule check
  const handleSaveScheduleConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSchedule(true);
    setScheduleStatusMessage("");
    try {
      const res = await fetch("/api/satje/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          negocio_id: selectedEmpresa.id,
          active: satjeScheduleActive,
          ruc: satjeRucInput,
          representante: satjeRepName,
          cedula: satjeCedula
        })
      });
      const data = await res.json();
      if (data.success) {
        setScheduleStatusMessage(satjeScheduleActive 
          ? "¡Sincronización Semanal Programada! Escaneo configurado para RUC y Representante Legal exitosamente." 
          : "Sincronización Semanal desactivada con éxito.");
        setTimeout(() => setScheduleStatusMessage(""), 4000);
      }
    } catch (err) {
      console.error(err);
      setScheduleStatusMessage("Error al guardar la preferencia de escaneo automático.");
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Share actions
  const handleOpenShareModal = (doc: CabinetDoc) => {
    setSharingDoc(doc);
    setShareTimeLimit("24_horas");
    // Generate a beautiful encrypted-like simulated URL
    setShareUrlResult(`https://lexcontrol.ojedistech.com/share/token_aud_${Math.random().toString(36).substring(2, 10).toUpperCase()}_ext`);
    setIsShareModalOpen(true);
  };

  const handleConfirmShare = () => {
    alert(`Enlace temporal generado. Acceso autorizado para Terceros Externos mediante canal seguro. Duración configurada: ${shareTimeLimit.replace("_", " ")}.`);
    setIsShareModalOpen(false);
    setSharingDoc(null);
  };

  // Complete Minuta Actions
  const handleOpenUploadModal = (doc: CabinetDoc) => {
    setUploadingDoc(doc);
    setUploadedFileName("");
    setSelectedNotariaOficial(doc.notaria_asociada || "Notaría 38 de Guayaquil");
    setIsUploadModalOpen(true);
  };

  const handleConfirmUploadAndFinalize = async () => {
    if (!uploadingDoc) return;
    try {
      const payload = {
        ...uploadingDoc,
        estado: "finalizado", // Transition status!
        notaria_asociada: selectedNotariaOficial,
        url: uploadedFileName || `minuta_protocolizada_${uploadingDoc.id}.pdf`,
        fecha: new Date().toISOString().split("T")[0]
      };

      const res = await fetch("/api/gabinete/documents/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert("¡Minuta Protocolizada con éxito! El estado ha cambiado a 'Finalizado' y se ha anexado la Escritura digital escaneada.");
        
        // Auto-sync to Google Drive if authorized
        autoSyncSingleDocToDrive(
          payload.nombre || `Protocolización Minuta ${uploadingDoc.nombre}`,
          "Minuta Finalizada",
          uploadingDoc.clasificacion,
          `Minuta protocolizada y finalizada el ${new Date().toISOString().split("T")[0]} en la ${selectedNotariaOficial}.`
        );

        fetchDocuments();
        setIsUploadModalOpen(false);
        setUploadingDoc(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter & Search Documents logic
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (doc.notaria_asociada && doc.notaria_asociada.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filterClasificacion === "all") return matchesSearch;
    return matchesSearch && doc.clasificacion === filterClasificacion;
  });

  // Access constraints Check: guest (invitado) is forbidden from Archivos unless shared
  const isGuest = currentProfile.rol === "invitado";

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="border-b border-borderSoft pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-semibold text-charcoal">
            Gabinete Documental & Automatización SATJE
          </h1>
          <p className="text-sm text-charcoalSoft font-sans mt-1">
            Gestión de escrituras, minutas y oficios de contestación procesal con consulta de la Función Judicial de Ecuador.
          </p>
        </div>

        {/* Small Powered By stamp */}
        <div className="text-[10px] font-mono text-charcoalMuted self-end md:self-auto bg-cream px-3 py-1.5 rounded-xl border border-borderSoft/40">
          POWERED BY <strong className="text-sidebarRose">OJEDISTECH</strong>
        </div>
      </div>

      {/* CORE NAVIGATION SUBTABS */}
      <div className="flex border-b border-borderSoft gap-2 pb-px overflow-x-auto">
        <button
          onClick={() => setActiveSubTab("archivos")}
          className={`px-4 py-2.5 text-xs font-semibold font-sans border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === "archivos" 
              ? "border-sidebarRose text-charcoal font-bold" 
              : "border-transparent text-charcoalMuted hover:text-charcoal"
          }`}
        >
          📂 Archivos Empresariales
        </button>
        <button
          onClick={() => setActiveSubTab("contratos")}
          className={`px-4 py-2.5 text-xs font-semibold font-sans border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === "contratos" 
              ? "border-sidebarRose text-charcoal font-bold" 
              : "border-transparent text-charcoalMuted hover:text-charcoal"
          }`}
        >
          🤖 Redactor IA de Contratos
        </button>
        <button
          onClick={() => setActiveSubTab("oficios")}
          className={`px-4 py-2.5 text-xs font-semibold font-sans border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === "oficios" 
              ? "border-sidebarRose text-charcoal font-bold" 
              : "border-transparent text-charcoalMuted hover:text-charcoal"
          }`}
        >
          📬 Contestador de Oficios IA
        </button>
        <button
          onClick={() => setActiveSubTab("satje")}
          className={`px-4 py-2.5 text-xs font-semibold font-sans border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === "satje" 
              ? "border-sidebarRose text-charcoal font-bold" 
              : "border-transparent text-charcoalMuted hover:text-charcoal"
          }`}
        >
          ⚖ Consulta Automatizada SATJE
        </button>
      </div>

      {/* GOOGLE DRIVE INTEGRATION CONSOLE BANNER */}
      <div className="bg-[#FAF6F0] border border-[#DECFBE]/60 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-[#8E222F]/5 text-[#8E222F] rounded-xl border border-[#8E222F]/10 shrink-0">
            <Cloud className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-charcoal flex items-center gap-2">
              Sincronización Segura con Google Drive
              {driveToken && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                  VINCULADO
                </span>
              )}
            </h3>
            <p className="text-xs text-charcoalSoft leading-relaxed max-w-xl">
              {driveToken
                ? `Respaldos automáticos en la nube activos. Rol: ${currentProfile.rol === "super_admin" ? "Super Administrador (Estructura Multicorporativa)" : "Administrador (Workspace Directo)"}.`
                : "Conecte su cuenta de Google Drive para archivar automáticamente escrituras protocolizadas, contratos IA y oficios directamente en sus carpetas corporativas."}
            </p>
            {driveToken && (
              <div className="text-[10px] text-charcoalMuted flex flex-wrap items-center gap-2 font-mono mt-1">
                <span className="font-semibold text-charcoal">Cuenta:</span> {driveUser?.email || currentProfile.email}
                <span className="text-borderSoft">|</span>
                <span className="font-semibold text-charcoal">Estructura de Carpeta:</span>{" "}
                <span className="bg-white px-1.5 py-0.5 rounded border border-[#DECFBE]/40 text-[#8E222F] font-bold">
                  {currentProfile.rol === "super_admin"
                    ? `LexControl - Consola Super Admin / LexControl - ${selectedEmpresa.nombre}`
                    : `LexControl - ${selectedEmpresa.nombre}`}
                </span>
              </div>
            )}
            {driveSyncProgress && (
              <div className="text-[11px] font-medium text-[#8E222F] flex items-center gap-2 mt-1.5 bg-[#8E222F]/5 px-2.5 py-1 rounded-lg">
                {isSyncingDrive || isLinkingDrive ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-[#8E222F]" />
                ) : (
                  <Check className="w-3 h-3 text-emerald-600" />
                )}
                <span>{driveSyncProgress}</span>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {!driveToken ? (
            <button
              onClick={handleConnectDrive}
              disabled={isLinkingDrive}
              className="cursor-pointer bg-white border border-[#DECFBE] hover:bg-cream hover:border-[#8E222F]/40 text-charcoal text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLinkingDrive ? (
                <RefreshCw className="w-4 h-4 animate-spin text-charcoalMuted" />
              ) : (
                <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z" />
                </svg>
              )}
              Enlazar Google Drive
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <button
                onClick={handleSyncAllToDrive}
                disabled={isSyncingDrive}
                className="cursor-pointer bg-[#8E222F] hover:bg-[#8E222F]/95 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-75"
              >
                {isSyncingDrive ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Cloud className="w-4 h-4" />
                )}
                ⚡ Respaldar todo en Drive
              </button>
              
              <button
                onClick={() => {
                  setDriveToken(null);
                  setCachedToken(null);
                  setDriveSyncProgress("");
                  setDriveSyncSuccess(false);
                }}
                className="cursor-pointer bg-white border border-[#DECFBE] hover:bg-[#8E222F]/5 hover:border-[#8E222F]/30 text-charcoalMuted text-xs font-medium px-3 py-2.5 rounded-xl transition-all text-center"
              >
                Desvincular
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div>
        
        {/* SUBTAB 1: ARCHIVOS EMPRESARIALES */}
        {activeSubTab === "archivos" && (
          <div className="space-y-6">
            
            {/* SEARCH AND FILTER BAR */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-charcoalMuted" />
                <input
                  type="text"
                  placeholder="Buscar escrituras, oficios, contestaciones..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-borderSoft rounded-xl pl-9 pr-4 py-2 text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-sidebarRose font-sans"
                />
              </div>

              <select
                value={filterClasificacion}
                onChange={(e) => setFilterClasificacion(e.target.value)}
                className="bg-white border border-borderSoft rounded-xl px-3 py-2 text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-sidebarRose font-sans"
              >
                <option value="all">Todas las Clasificaciones</option>
                <option value="copia certificada">Copia Certificada (Escritura)</option>
                <option value="procuración judicial">Procuración Judicial</option>
                <option value="declaración juramentada">Declaración Juramentada</option>
                <option value="oficios recibidos">Oficios Recibidos & Respuestas</option>
                <option value="minuta_notaria">Minutas de Notaría (En trámite)</option>
                <option value="contrato_general">Contratos Comerciales / Laborales</option>
              </select>
            </div>

            {/* IF VISITOR HAS AN INVITADO (GUEST) ROLE, BAR INTERNAL ACCESS OR SHOW COMPARTIDOS */}
            {isGuest ? (
              <div className="bento-card bg-roseSoft/20 border-danger/20 p-8 text-center space-y-4 max-w-xl mx-auto rounded-2xl">
                <Lock className="w-12 h-12 text-danger mx-auto animate-bounce" />
                <h3 className="font-serif font-semibold text-lg text-charcoal">Control de Acceso Cerrado</h3>
                <p className="text-xs text-charcoalSoft leading-relaxed font-sans">
                  Su credencial es de <strong>Defensa Externa (Invitado)</strong>. Los archivos y escrituras maestras de <strong>{selectedEmpresa.nombre}</strong> solo son visibles para directores in-house y administradores jerárquicos de la empresa.
                </p>
                <div className="pt-3 border-t border-borderSoft/40 text-[10px] text-charcoalMuted">
                  Solicite al Abg. de Planta un token temporal utilizando el <strong className="text-sidebarRose">+ Compartir</strong> en su esquina.
                </div>
              </div>
            ) : (
              <div className="bg-white border border-borderSoft rounded-2xl overflow-hidden shadow-sm">
                
                <div className="px-5 py-4 border-b border-borderSoft flex justify-between items-center bg-[#FDFBF7]">
                  <h3 className="font-serif font-bold text-base text-charcoal">Expedientes Generales Corporativos</h3>
                  <span className="text-[10px] bg-sidebarRose/10 text-sidebarRose px-2 py-1 rounded font-bold font-mono">
                    {filteredDocs.length} Registros Activos
                  </span>
                </div>

                {filteredDocs.length === 0 ? (
                  <div className="text-center py-12 text-charcoalMuted space-y-2">
                    <FileText className="w-10 h-10 text-charcoalMuted mx-auto opacity-50" />
                    <p className="font-serif text-sm">Cero documentos registrados bajo esta clasificación.</p>
                    <p className="text-[11px] font-sans">Utilice los generadores IA para redactar y guardar escrituras o contestaciones.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-borderSoft">
                    {filteredDocs.map((doc) => {
                      const isMinuta = doc.tipo === "Minuta";
                      const isInRegister = doc.estado === "registro";

                      return (
                        <div key={doc.id} className="p-4 hover:bg-cream/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                          
                          {/* File Details */}
                          <div className="flex items-start gap-3">
                            <div className="p-2.5 rounded-xl bg- cream border border-borderSoft shrink-0 bg-[#F9F7F5]">
                              {isMinuta ? (
                                <FileText className="w-5 h-5 text-[#C17A42]" />
                              ) : doc.tipo === "Oficio Recibido" ? (
                                <Send className="w-5 h-5 text-sidebarRose" />
                              ) : (
                                <FolderOpen className="w-5 h-5 text-success" />
                              )}
                            </div>

                            <div className="space-y-1">
                              <h4 className="font-serif font-medium text-sm text-charcoal leading-tight">{doc.nombre}</h4>
                              
                              <div className="flex flex-wrap gap-2 text-[10px] text-charcoalMuted font-sans">
                                <span className="bg-cream/80 px-2 py-0.5 rounded border border-borderSoft/30 font-semibold">{doc.tipo}</span>
                                <span className="uppercase text-charcoalSoft font-mono">{doc.clasificacion}</span>
                                <span>Fecha: {doc.fecha}</span>
                                {doc.notaria_asociada && (
                                  <span className="text-charcoalMuted">Asignado: <strong>{doc.notaria_asociada}</strong></span>
                                )}
                              </div>

                              {/* Oficio received description snippet */}
                              {doc.cuerpo_original && (
                                <div className="mt-2 text-[11px] bg-paperDark/40 p-2.5 rounded-lg border border-borderSoft/30 max-w-2xl text-charcoalSoft space-y-1.5 font-sans">
                                  <div>
                                    <strong className="text-danger">📩 Requerimiento del Oficio Original:</strong>
                                    <p className="italic">"{doc.cuerpo_original}"</p>
                                  </div>
                                  {doc.cuerpo_contestacion && (
                                    <div className="border-t border-borderSoft/50 pt-1.5">
                                      <strong className="text-success">✏ Contestación Radicada:</strong>
                                      <p className="whitespace-pre-line bg-white/70 p-2 rounded border border-borderSoft/20 font-mono text-[10px] leading-relaxed select-all">
                                        {doc.cuerpo_contestacion}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions and Status */}
                          <div className="flex items-center gap-3 self-end md:self-auto">
                            
                            {/* State Badge */}
                            {isInRegister ? (
                              <span className="badge warning uppercase font-bold text-[9px]">En Notaría (Trámite)</span>
                            ) : (
                              <span className="badge success uppercase font-bold text-[9px]">Aprobado</span>
                            )}

                            {/* Action Operations */}
                            <div className="flex gap-1">
                              
                              {isInRegister && (
                                <button
                                  onClick={() => handleOpenUploadModal(doc)}
                                  className="p-1 px-2.5 bg-sidebarRose text-cream hover:bg-sidebarRose/90 text-[10px] font-semibold rounded-lg flex items-center gap-1 cursor-pointer font-sans"
                                  title="Subir copia escaneada física para protocolizar"
                                >
                                  <Upload className="w-3.5 h-3.5" /> Protocolizar
                                </button>
                              )}

                              {!isInRegister && doc.url && (
                                <a
                                  href="#"
                                  onClick={(e) => { e.preventDefault(); alert(`Descargando archivo consolidado de Ecuador: ${doc.url}`); }}
                                  className="p-1.5 bg-[#FAF8F5] border border-borderSoft hover:bg-cream rounded-lg text-charcoal cursor-pointer flex gap-1 items-center text-[10px] font-sans"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Ver PDF
                                </a>
                              )}

                              {/* Sharing trigger - adds the external sharing capability for time limited permissions requested */}
                              <button
                                onClick={() => handleOpenShareModal(doc)}
                                className="p-1.5 bg-[#FAF8F5] border border-[#DECFBE] text-charcoal hover:bg-cream rounded-lg cursor-pointer flex items-center gap-1 text-[10px] hover:text-sidebarRose"
                                title="Compartir Folder / Alianza de tiempo delimitado con Tercero Externo"
                              >
                                <Plus className="w-3.5 h-3.5 text-sidebarRose" /> Compartir
                              </button>

                            </div>

                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            )}

          </div>
        )}

        {/* SUBTAB 2: REDACTOR IA DE CONTRATOS */}
        {activeSubTab === "contratos" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* INTAKE FORM */}
            <div className="lg:col-span-5 bento-card bg-white space-y-4">
              
              <div className="flex items-center gap-2 border-b border-borderSoft pb-3">
                <Sparkles className="w-5 h-5 text-sidebarRose animate-pulse" />
                <h3 className="font-serif font-bold text-base text-charcoal">Definición de Necesidades</h3>
              </div>

              <form onSubmit={handleContractSubmit} className="space-y-4 font-sans">
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-charcoalMuted uppercase tracking-wider">
                    ¿Para qué objeto o necesidad requiere el contrato? (Escriba llanamente)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Arrendar bodega de GLP, contrato de servicios con chofer de carga pesada..."
                    value={contractPurpose}
                    onChange={(e) => setContractPurpose(e.target.value)}
                    className="w-full bg-cream border border-borderSoft rounded-xl p-3 text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-sidebarRose"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-charcoalMuted uppercase tracking-wider">
                    Clausulado Especial o Condiciones Específicas (Opcional)
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Ej: El contratista debe contar con su propio tractocamión. El canon de arrendamiento será de 1500 USD pagaderos en Guayaquil..."
                    value={contractCustom}
                    onChange={(e) => setContractCustom(e.target.value)}
                    className="w-full bg-cream border border-borderSoft rounded-xl p-3 text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-sidebarRose font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-charcoalMuted uppercase tracking-wider">
                    Tipo de contrato a redactar
                  </label>
                  <select
                    value={contractKind}
                    onChange={(e) => setContractKind(e.target.value)}
                    className="w-full bg-cream border border-borderSoft rounded-xl p-2.5 text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-sidebarRose"
                  >
                    <option value="prestacion_servicios">Prestación de servicios</option>
                    <option value="confidencialidad_nda">Confidencialidad / NDA</option>
                    <option value="arrendamiento">Arrendamiento civil o comercial</option>
                    <option value="distribucion">Distribución / agencia comercial</option>
                    <option value="transporte_logistica">Transporte y logística</option>
                    <option value="laboral">Contrato laboral</option>
                    <option value="transaccion">Acta transaccional</option>
                    <option value="compraventa">Compraventa</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-charcoalMuted uppercase tracking-wider">
                    Clasificación de archivo
                  </label>
                  <select
                    value={contractClasif}
                    onChange={(e) => setContractClasif(e.target.value)}
                    className="w-full bg-cream border border-borderSoft rounded-xl p-2.5 text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-sidebarRose"
                  >
                    <option value="contrato_general">Contrato Comercial / Civil de Servicios</option>
                    <option value="minuta_notaria">Minuta Notarial (Para posterior inscripción en Notaría)</option>
                    <option value="copia certificada">Escritura Pública Consolidada</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isBuildingContract || !contractPurpose.trim()}
                  className="w-full py-3 bg-charcoal hover:bg-charcoalSoft text-cream text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow"
                >
                  {isBuildingContract ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Escribiendo Cláusulas con Rigor Jurídico de Ecuador...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> Generar Modelo Completado por IA
                    </>
                  )}
                </button>

              </form>

            </div>

            {/* ATTORNEY EDITOR INTERFACE */}
            <div className="lg:col-span-7 bento-card bg-white flex flex-col justify-between space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-borderSoft pb-3">
                <div>
                  <h3 className="font-serif font-bold text-base text-charcoal">Panel de Modificación del Abogado</h3>
                  <p className="text-[10px] text-charcoalMuted font-sans">
                    El abogado puede libremente revisar, añadir o alterar el clausulado para proteger a la empresa.
                  </p>
                </div>

                {generatedContractDraft && (
                  <input
                    type="text"
                    value={contractTitle}
                    onChange={(e) => setContractTitle(e.target.value)}
                    className="bg-cream border border-borderSoft rounded-lg px-2 py-1 text-[11px] text-charcoal font-sans max-w-[200px]"
                    placeholder="Título del documento..."
                  />
                )}
              </div>

              {generatedContractDraft ? (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <textarea
                    rows={16}
                    value={generatedContractDraft}
                    onChange={(e) => setGeneratedContractDraft(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-borderSoft rounded-xl p-4 text-xs font-mono text-charcoal focus:outline-none focus:ring-1 focus:ring-sidebarRose leading-relaxed resize-none"
                  />

                  <div className="pt-3 border-t border-borderSoft/40 flex justify-between items-center bg-[#FFFBF4] p-3 rounded-xl border border-[#F2DCA5]/30">
                    <span className="text-[10px] text-charcoalMuted flex items-center gap-1 font-sans">
                      <Lock className="w-3.5 h-3.5 text-success" /> Borrador Editable ( OJEDISTECH Secure Model )
                    </span>

                    <button
                      onClick={handleSaveCompiledContract}
                      className="bg-success text-cream hover:bg-success/90 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer font-sans"
                    >
                      <Save className="w-4 h-4" /> Aprobar y Guardar en Archivos Empresariales
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-20 text-center text-charcoalMuted space-y-2">
                  <FileText className="w-12 h-12 text-borderSoft animate-pulse" />
                  <p className="font-serif text-sm">Sin borrador generado</p>
                  <p className="text-[11px] font-sans max-w-sm">Complete el formulario de la izquierda. La inteligencia artificial redactará un modelo robusto amparado en el Código de Comercio de Ecuador.</p>
                </div>
              )}

            </div>

          </div>
        )}

        {/* SUBTAB 3: CONTESTADOR DE OFICIOS IA */}
        {activeSubTab === "oficios" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* OFICIO INTAKE & ANALYSIS */}
            <div className="lg:col-span-5 space-y-4">
              
              <div className="bento-card bg-white space-y-4">
                <div className="flex items-center gap-2 border-b border-borderSoft pb-3">
                  <Send className="w-5 h-5 text-sidebarRose" />
                  <h3 className="font-serif font-bold text-base text-charcoal">Carga de Oficio</h3>
                </div>

                {/* Drag and Drop Zone Container */}
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  className={`border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${
                    isDragging ? "border-sidebarRose bg-[#DECFBE]/40 scale-[0.99]" : "border-borderSoft bg-cream/30 hover:bg-cream/60"
                  }`}
                >
                  <label className="cursor-pointer block space-y-2">
                    <input 
                      type="file" 
                      accept=".pdf,.docx,.doc,.txt" 
                      onChange={handleFileSelect} 
                      className="hidden" 
                    />
                    <Upload className={`w-8 h-8 mx-auto ${uploadProgress !== null ? "animate-bounce text-sidebarRose" : "text-charcoalMuted"}`} />
                    <p className="text-xs font-serif font-bold text-charcoal">
                      Cargar Oficio Digital (.pdf, .doc, .docx, .txt)
                    </p>
                    <p className="text-[10px] text-charcoalMuted font-sans">
                      Arrastre y suelte su archivo aquí, o haga clic para examinar
                    </p>
                  </label>
                  
                  {uploadProgress !== null && (
                    <div className="mt-3.5 space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-mono text-charcoal font-bold">
                        <span>EXTRAYENDO TEXTO MEDIANTE OCR DE LEXCONTROL...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#C17A42] transition-all duration-150" style={{ width: `${uploadProgress}%` }}></div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-charcoalMuted uppercase tracking-wider font-sans flex justify-between items-center">
                    <span>O Copie el Oficio Recibido o Decreto de la Institución</span>
                    {pastedOficioText && (
                      <button 
                        onClick={() => setPastedOficioText("")}
                        className="text-[9px] text-sidebarRose underline normal-case cursor-pointer"
                      >
                        Limpiar texto
                      </button>
                    )}
                  </label>
                  <textarea
                    rows={8}
                    required
                    placeholder={`Por ejemplo: texto del oficio recibido dirigido a ${selectedEmpresa.nombre}, con requerimientos, fechas, apercibimientos y anexos solicitados.`}
                    value={pastedOficioText}
                    onChange={(e) => setPastedOficioText(e.target.value)}
                    className="w-full bg-[#FAF9F5] border border-borderSoft rounded-xl p-3 text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-sidebarRose font-mono leading-relaxed"
                  />
                </div>

                <button
                  onClick={handleAnalyzeOficio}
                  disabled={isAnalyzingOficio || !pastedOficioText.trim()}
                  className="w-full py-2.5 bg-charcoal hover:bg-charcoalSoft text-cream text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm font-sans"
                >
                  {isAnalyzingOficio ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Extrayendo Requerimientos Críticos...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 animate-pulse" /> Analizar Requerimientos Técnicos
                    </>
                  )}
                </button>
              </div>

              {/* Factual Q&A extracted */}
              {extractedQuestions.length > 0 && (
                <div className="bento-card bg-white space-y-4 border-2 border-sidebarRose/30">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif font-semibold text-charcoal text-sm">Interrogatorio de Hechos IA</h3>
                    <span className="text-[9px] uppercase font-mono font-bold text-success bg-successSoft px-1.5 py-0.5 rounded">Requerimiento Identificado</span>
                  </div>
                  <p className="text-[10.5px] text-charcoalSoft leading-normal font-sans">
                    La inteligencia artificial ha detectado que para contestar este oficio lícitamente y salvaguardar a la empresa, <strong>debe ingresar los siguientes datos reales:</strong>
                  </p>

                  <form onSubmit={handleOficioDraftSubmit} className="space-y-4 font-sans">
                    {extractedQuestions.map((q, idx) => (
                      <div key={q.id || idx} className="space-y-1">
                        <label className="text-[11px] font-semibold text-charcoal">
                          🎯 {q.requerimiento}
                        </label>
                        <input
                          type="text"
                          required
                          placeholder={q.viga_ejemplo || "Escriba los hechos fácticos exactos..."}
                          value={questionAnswers[q.id] || ""}
                          onChange={(e) => handleOficioAnswerChange(q.id, e.target.value)}
                          className="w-full bg-[#FAF9F5] border border-borderSoft rounded-lg p-2.5 text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-sidebarRose"
                        />
                      </div>
                    ))}

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-charcoalMuted uppercase tracking-wider">Título de Archivo de Salida</label>
                      <input
                        type="text"
                        value={oficioNameTitle}
                        onChange={(e) => setOficioNameTitle(e.target.value)}
                        className="w-full bg-[#FAF9F5] border border-borderSoft rounded-lg p-2.5 text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-sidebarRose"
                        placeholder="ej: Oficio de respuesta a SUPERCIAS-GYE..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isDraftingOficio}
                      className="w-full py-3 bg-[#DECFBE] hover:bg-charcoal text-charcoal hover:text-cream text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
                    >
                      {isDraftingOficio ? "Generando Abisamiento IA..." : "Siguiente: Generar Oficio de Contestación Formal"}
                    </button>
                  </form>
                </div>
              )}

            </div>

            {/* GENERATED ANSWER OUTPUT REVIEW */}
            <div className="lg:col-span-7 bento-card bg-white flex flex-col justify-between space-y-4">
              
              <div className="border-b border-borderSoft pb-3">
                <h3 className="font-serif font-bold text-base text-charcoal">Oficio de Contestación Propuesto</h3>
                <p className="text-[10px] text-charcoalMuted font-sans mt-0.5">
                  Radicado oficial del artículo de defensa en idioma formal para descoyuntar requerimientos regulatorios.
                </p>
              </div>

              {generatedOficioReply ? (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <textarea
                    rows={16}
                    value={generatedOficioReply}
                    onChange={(e) => setGeneratedOficioReply(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-borderSoft rounded-xl p-4 text-xs font-mono text-charcoal focus:outline-none focus:ring-1 focus:ring-sidebarRose leading-relaxed resize-none flex-1"
                  />

                  {/* Export Options Panel */}
                  <div className="bg-[#FAF9F5] border border-borderSoft rounded-xl p-3 flex flex-col sm:flex-row justify-between sm:items-center gap-3 font-sans">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-charcoalMuted block tracking-wider">Formato de Contestación</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setExportFormat("docx")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            exportFormat === "docx" ? "bg-charcoal text-cream" : "bg-cream border border-borderSoft/60 text-charcoalSoft hover:bg-[#FAF9F6]"
                          }`}
                        >
                          📄 Word (.doc)
                        </button>
                        <button
                          type="button"
                          onClick={() => setExportFormat("pdf")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            exportFormat === "pdf" ? "bg-charcoal text-cream" : "bg-cream border border-borderSoft/60 text-charcoalSoft hover:bg-[#FAF9F6]"
                          }`}
                        >
                          📕 PDF (.pdf)
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadContestacion}
                      className="bg-sidebarRose hover:bg-charcoal text-cream hover:text-cream px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 justify-center cursor-pointer shadow-sm"
                    >
                      Descargar documento como {exportFormat.toUpperCase()}
                    </button>
                  </div>

                  <div className="pt-3 border-t border-borderSoft/40 flex justify-between items-center bg-[#FDFBF7] p-3 rounded-xl border border-borderSoft">
                    <span className="text-[10px] text-charcoalMuted flex items-center gap-1 font-sans">
                      <ShieldActiveIcon className="w-4 h-4 text-success" /> Oficio Formal de Contestación Enlazado
                    </span>

                    <button
                      onClick={handleSaveOficioPairToCabinet}
                      className="bg-success text-cream hover:bg-success/90 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer font-sans shadow"
                    >
                      <Save className="w-4 h-4" /> Registrar copia en el "Sistema de Archivos"
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-24 text-center text-charcoalMuted space-y-2">
                  <Send className="w-12 h-12 text-borderSoft animate-pulse" />
                  <p className="font-serif text-sm">Oficio de Contestación sin redactar</p>
                  <p className="text-[11px] font-sans max-w-sm">
                    Copie el oficio original de la entidad, efectúe el análisis de requisitos lícitos e ingrese las respuestas. La IA estructurará el escrito formal de descargo.
                  </p>
                </div>
              )}

            </div>

          </div>
        )}

        {/* SUBTAB 4: CONSULTA AUTOMATIZADA SATJE */}
        {activeSubTab === "satje" && (
          <div className="space-y-6">
            
            {/* PARAMETERS CONFIG CARD */}
            <div className="bento-card bg-white space-y-5 font-sans">
              
              <div className="flex items-center justify-between border-b border-borderSoft pb-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-sidebarRose" />
                  <h3 className="font-serif font-bold text-base text-charcoal">Mapeo Avanzado Judicial con Servidores SATJE</h3>
                </div>
                {satjeScheduleActive && (
                  <span className="text-[10px] bg-[#FAF8F3] text-success border border-success/30 uppercase font-bold px-2.5 py-1 rounded-full flex items-center gap-1 font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-ping"></span> Vigilancia Activa Semanal
                  </span>
                )}
              </div>

              {/* INPUT FIELDS GROUPS (Double Row Grid) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-charcoalMuted uppercase tracking-wider block">RUC de la Compañía</label>
                  <input
                    type="text"
                    value={satjeRucInput}
                    onChange={(e) => setSatjeRucInput(e.target.value)}
                    placeholder="RUC de la compañía"
                    className="w-full bg-[#FAF9F5] border border-borderSoft rounded-xl p-2.5 text-xs text-charcoal focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-charcoalMuted uppercase tracking-wider block">Nombre del Representante Legal</label>
                  <input
                    type="text"
                    value={satjeRepName}
                    onChange={(e) => setSatjeRepName(e.target.value)}
                    placeholder="Nombre completo"
                    className="w-full bg-[#FAF9F5] border border-borderSoft rounded-xl p-2.5 text-xs text-charcoal focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-charcoalMuted uppercase tracking-wider block">Número de Cédula</label>
                  <input
                    type="text"
                    value={satjeCedula}
                    onChange={(e) => setSatjeCedula(e.target.value)}
                    placeholder="Ej / 0912345678"
                    className="w-full bg-[#FAF9F5] border border-borderSoft rounded-xl p-2.5 text-xs text-charcoal focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-charcoalMuted uppercase tracking-wider block font-sans">Consultar Desde (Año)</label>
                  <input
                    type="number"
                    value={satjeCompanyCreation}
                    onChange={(e) => setSatjeCompanyCreation(e.target.value)}
                    className="w-full bg-[#FAF9F5] border border-borderSoft rounded-xl p-2.5 text-xs text-charcoal focus:outline-none"
                  />
                </div>

              </div>

              {/* ACTION TRIGGER FOOTER */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <p className="text-[10.5px] text-charcoalMuted max-w-md font-sans">
                  Ingrese RUC de la empresa, nombre o cédula de su representante legal para cotejar expedientes judiciales en tiempo real en la Función Judicial de Ecuador.
                </p>

                <button
                  type="button"
                  onClick={handleQuerySatje}
                  disabled={isQueryingSatje || !satjeRucInput.trim()}
                  className="py-2.5 px-6 bg-charcoal hover:bg-charcoalSoft text-cream text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow"
                >
                  {isQueryingSatje ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Conectando Servidores Judiciales...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 text-success" /> Ejecutar Consulta SATJE Ahora
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* AUTOMATED WEEKLY MONITORING (VIGILANCIA CRON SCHEDULE PREFERENCE) */}
            <div className="bento-card border border-borderSoft bg-[#FAF8F5]/50 p-5 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 border-b border-borderSoft pb-3">
                <Clock className="w-5 h-5 text-[#C17A42]" />
                <div>
                  <h3 className="font-serif font-bold text-sm text-charcoal">Vigilancia Judicial Automatizada Semanal</h3>
                  <p className="text-[10.5px] text-charcoalMuted font-sans">Búsqueda recurrente en segundo plano para notificar citaciones imprevistas</p>
                </div>
              </div>

              <form onSubmit={handleSaveScheduleConfig} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
                <div className="lg:col-span-4 flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={satjeScheduleActive}
                      onChange={(e) => setSatjeScheduleActive(e.target.checked)}
                    />
                    {/* Toggle slider styled nicely with tailwind standard peer-classes */}
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-success"></div>
                  </label>
                  <div className="font-sans">
                    <span className="text-xs font-bold text-charcoal block">Búsqueda Automática Coactiva</span>
                    <span className="text-[10px] text-charcoalMuted font-mono">Frecuencia: Cada 7 días (Lunes 08:00)</span>
                  </div>
                </div>

                <div className="lg:col-span-5 font-sans space-y-1">
                  <p className="text-[11px] text-charcoalSoft leading-normal">
                    Al activar el escaneo automático, el sistema de LexControl revisará semanalmente si existen nuevas demandas o citaciones que nombren a <strong>{satjeRepName || "el Representante Legal"}</strong>. Si se halla un evento adverso, <strong>se enviará una notificación con alerta roja instantáneamente</strong>.
                  </p>
                </div>

                <div className="lg:col-span-3 flex flex-col gap-2">
                  <button
                    type="submit"
                    disabled={isSavingSchedule}
                    className="w-full py-2 bg-charcoal hover:bg-charcoalSoft text-cream text-xs font-bold rounded-xl transition-all font-sans cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isSavingSchedule ? "Guardando..." : "Guardar Preferencia"}
                  </button>
                  
                  {satjeScheduleActive && (
                    <button
                      type="button"
                      onClick={async () => {
                        // Let's force generate a simulated notification immediately so the user can see it!
                        try {
                          await fetch("/api/satje/schedule", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              negocio_id: selectedEmpresa.id,
                              active: true,
                              ruc: satjeRucInput,
                              representante: satjeRepName,
                              cedula: satjeCedula
                            })
                          });
                          alert("⚡ ¡Simulación de escaneo semanal completada con éxito! Se ha ejecutado el chequeo cron de SATJE de esta semana y se ha enviado una alerta de co-gestión a su panel de notificaciones.");
                          
                          // Trigger parent shell notification sync
                          window.location.reload();
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="w-full py-1.5 bg-[#FAF9F5] border border-borderSoft hover:bg-cream text-[#C17A42] text-[10.5px] font-bold rounded-lg transition-all font-sans cursor-pointer flex items-center justify-center gap-1"
                    >
                      ⚡ Forzar Escaneo & Alerta de Prueba
                    </button>
                  )}
                </div>
              </form>

              {scheduleStatusMessage && (
                <div className="text-xs bg-successSoft border border-success/35 px-4 py-2.5 rounded-xl text-success font-sans font-bold text-center transition-all animate-pulse duration-700">
                  ✓ {scheduleStatusMessage}
                </div>
              )}

            </div>

            {/* SATJE RESULTS */}
            {satjeResults.length > 0 && (
              <div className="bg-white border border-borderSoft rounded-2xl overflow-hidden shadow-sm">
                
                <div className="px-5 py-4 border-b border-borderSoft flex flex-col sm:flex-row justify-between sm:items-center gap-2 bg-[#FDFBF7]">
                  <div>
                    <h3 className="font-serif font-bold text-base text-charcoal">Índice de Causas y Litigios Encontrados</h3>
                    <p className="text-[10px] text-charcoalMuted font-sans">Reporte sincronizado de expedientes con RUC {satjeRucInput} ingresado</p>
                  </div>

                  <span className="text-[10px] font-mono text-charcoal bg-[#EBE7DF] border border-borderSoft px-2.5 py-1.5 rounded-lg">
                    Sincronización: Activa {new Date().toLocaleTimeString()}
                  </span>
                </div>

                <div className="divide-y divide-borderSoft">
                  {satjeResults.map((result, idx) => (
                    <div key={idx} className="p-4 hover:bg-[#FAF8F5]/30 transition-colors space-y-3">
                      
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-charcoal bg-cream/70 border border-borderSoft px-2 py-0.5 rounded leading-none">
                            Causa No: {result.causa}
                          </span>
                          <span className="badge warning uppercase font-bold text-[8.5px] tracking-wide shrink-0">
                            {result.materia}
                          </span>
                          <span className="badge info font-bold text-[8.5px] uppercase tracking-wide shrink-0 font-mono">
                            {result.estado_proceso}
                          </span>
                        </div>

                        <span className="text-[10px] text-charcoalMuted font-sans shrink-0">
                          Fecha Registro: {result.fecha_registro}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 font-sans text-xs">
                        
                        <div className="md:col-span-4 space-y-1">
                          <span className="text-[9px] uppercase font-bold text-charcoalMuted block">Dignidad / Juez Competente</span>
                          <span className="font-medium text-charcoal">{result.juez}</span>
                          <span className="text-[10px] text-charcoalMuted block">{result.jurisdiccion}</span>
                        </div>

                        <div className="md:col-span-8 space-y-1 bg-[#FCFCFA] p-3 rounded-xl border border-borderSoft/30">
                          <span className="text-[9px] uppercase font-bold text-charcoalMuted block">Resumen de Contención & Defensa Activa</span>
                          <p className="font-medium text-charcoal leading-tight">{result.defensa_inbound}</p>
                          <div className="border-t border-borderSoft/40 pt-2.5 mt-2.5 text-[10.5px] text-[#AB5151] font-semibold flex items-start gap-1">
                            <span className="shrink-0 font-serif">Última actuación:</span> <span>"{result.ultima_actualizacion_satje}"</span>
                          </div>
                        </div>

                      </div>

                    </div>
                  ))}
                </div>

              </div>
            )}

            {isQueryingSatje && (
              <div className="text-center py-16 bg-white border border-borderSoft rounded-2xl max-w-md mx-auto space-y-3">
                <RefreshCw className="w-10 h-10 text-sidebarRose mx-auto animate-spin" />
                <h4 className="font-serif font-semibold text-charcoal text-base">Accediendo a satje.funcionjudicial.gob.ec...</h4>
                <p className="text-[11px] text-charcoalMuted max-w-xs mx-auto font-sans">Autenticando certificado lícito del gabinete de OJEDISTECH para barrido automatizado de causas asociadas.</p>
              </div>
            )}

          </div>
        )}

      </div>

      {/* SHARE MODAL */}
      {isShareModalOpen && sharingDoc && (
        <div className="fixed inset-0 bg-charcoal/45 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-borderSoft rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative font-sans animate-fade-in">
            
            <button 
              onClick={() => setIsShareModalOpen(false)}
              className="absolute right-4 top-4 text-charcoalMuted hover:text-charcoal cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <h3 className="font-serif font-bold text-lg text-charcoal">Compartir Acceso Seguro con Externo</h3>
              <p className="text-xs text-charcoalMuted">Utilidades lícitas para compartir folder o escrituras temporales.</p>
            </div>

            <div className="bg-[#FAF8F5] p-3 rounded-xl border border-borderSoft/60 text-xs text-charcoalMuted space-y-1">
              <div>Documento: <strong className="text-charcoal">{sharingDoc.nombre}</strong></div>
              <div>Clasificación: <strong className="text-charcoal uppercase font-mono">{sharingDoc.clasificacion}</strong></div>
            </div>

            <div className="space-y-3.5">
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-charcoalMuted uppercase tracking-wider block">Tiempo Límite del Token de Acceso</label>
                <select
                  value={shareTimeLimit}
                  onChange={(e) => setShareTimeLimit(e.target.value)}
                  className="w-full bg-cream border border-borderSoft rounded-xl p-2.5 text-xs text-charcoal focus:outline-none"
                >
                  <option value="1_hora">Autorización Temporal (1 Hora)</option>
                  <option value="24_horas">Un día de trabajo (24 Horas)</option>
                  <option value="7_dias">Una semana hábil (7 Días)</option>
                  <option value="ilimitado">Sin caducidad (Acceso Permanente)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-charcoalMuted uppercase tracking-wider block">Enlace Cifrado de Acceso Externo</label>
                <input
                  type="text"
                  readOnly
                  value={shareUrlResult}
                  className="w-full bg-[#EBE7DF]/40 border border-borderSoft rounded-lg p-2.5 text-xs font-mono text-sidebarRose select-all cursor-pointer focus:outline-none"
                  title="Copiar token lícito de compartición externa"
                />
              </div>

            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="px-4 py-2 bg-cream text-charcoalSoft hover:bg-cream/80 text-xs rounded-xl font-bold cursor-pointer font-sans"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmShare}
                className="px-4 py-2 bg-charcoal hover:bg-charcoalSoft text-cream text-xs rounded-xl font-bold cursor-pointer font-sans shadow"
              >
                Autorizar y Enviar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* UPLOAD/PROTOCOLIZE MODAL */}
      {isUploadModalOpen && uploadingDoc && (
        <div className="fixed inset-0 bg-charcoal/45 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-borderSoft rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative font-sans">
            
            <button 
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute right-4 top-4 text-charcoalMuted hover:text-charcoal cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <h3 className="font-serif font-bold text-lg text-charcoal">Protocolización de Minuta Notarial</h3>
              <p className="text-xs text-charcoalMuted">Cargue copia escaneada física para registrar definitiva la escritura pública.</p>
            </div>

            <div className="space-y-3.5">
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-charcoalMuted uppercase tracking-wider block">Notaría Competente Elegida</label>
                <select
                  value={selectedNotariaOficial}
                  onChange={(e) => setSelectedNotariaOficial(e.target.value)}
                  className="w-full bg-cream border border-borderSoft rounded-xl p-2.5 text-xs text-charcoal focus:outline-none"
                >
                  <option value="Notaría 38 de Guayaquil">Notaría 38 de Guayaquil (Abg. Humberto Moya)</option>
                  <option value="Notaría 21 de Guayaquil">Notaría 21 de Guayaquil</option>
                  <option value="Notaría 10 de Guayaquil">Notaría 10 de Guayaquil</option>
                  <option value="Notaría 4 de Quito">Notaría 4 de Quito</option>
                </select>
              </div>

              {/* SIMULATED FILE DRAG AND DROP ZONE AS PER SYSTEM RULES */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-charcoalMuted uppercase tracking-wider block">Arrastre el PDF de la Escritura Protocolizada</label>
                <div 
                  className="border-2 border-dashed border-borderSoft bg-[#FAF9F5] hover:bg-[#F4F3ED] rounded-xl p-6 text-center cursor-pointer space-y-1.5 transition-all"
                  onClick={() => setUploadedFileName(`escritura_protocolizada_${uploadingDoc.id.replace("gdoc-", "")}.pdf`)}
                >
                  <Upload className="w-8 h-8 text-charcoalMuted mx-auto animate-bounce" />
                  {uploadedFileName ? (
                    <span className="text-xs font-semibold text-success flex items-center justify-center gap-1">
                      <Check className="w-4 h-4" /> Archivo cargado: {uploadedFileName}
                    </span>
                  ) : (
                    <>
                      <span className="text-[11px] font-semibold text-charcoal block">Haga click para simular selección de archivo</span>
                      <span className="text-[10px] text-charcoalMuted block">Tamaño permitido: Hasta 25MB (.pdf, .tiff scaneados)</span>
                    </>
                  )}
                </div>
              </div>

            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 bg-cream text-charcoalSoft hover:bg-cream/80 text-xs rounded-xl font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmUploadAndFinalize}
                disabled={!uploadedFileName}
                className="px-4 py-2 bg-success text-cream hover:bg-success/90 text-xs rounded-xl font-bold cursor-pointer shadow disabled:opacity-50"
              >
                Finalizar e Inscribir Archivo
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// Micro icons helpers
function ShieldActiveIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 11l2 2 4-4" />
    </svg>
  );
}
