import React, { useState, useEffect } from "react";
import { Empresa, MatrizItem, UserProfile } from "../types";
import { PlusCircle, Search, Sparkles, FileText, Check, X, ShieldAlert, Edit, Trash2, Download, Send, CheckCircle2, RotateCw, AlertTriangle } from "lucide-react";
import { FormattedText } from "./FormattedText";

interface ComplianceMatrixProps {
  selectedEmpresa: Empresa;
  currentProfile: UserProfile;
}

export default function ComplianceMatrix({ selectedEmpresa, currentProfile }: ComplianceMatrixProps) {
  const [items, setItems] = useState<MatrizItem[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterField, setFilterField] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("todos");

  // New states for compliance criteria requested by Nohelia:
  const [options, setOptions] = useState<{
    gerencias: string[];
    personas_a_cargo: string[];
    encargados_compliance: string[];
  }>({
    gerencias: [],
    personas_a_cargo: [],
    encargados_compliance: []
  });

  const [newGerenciaName, setNewGerenciaName] = useState("");
  const [newPersonaName, setNewPersonaName] = useState("");
  const [newComplianceName, setNewComplianceName] = useState("");

  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditingForm, setIsEditingForm] = useState(false);
  const [formValues, setFormValues] = useState<Partial<MatrizItem>>({
    articulo: "",
    requisito: "",
    sancion: "",
    multa_estimada_usd: 0,
    impacto_economico: 5,
    probabilidad_incumplimiento: 3,
    prioridad: "medio",
    estado: "pendiente",
    responsable: "",
    norma_nombre: "Código del Trabajo de Ecuador",
    tipo_norma: "Código",
    organismo_emisor: "Ministerio del Trabajo (MDT)",
    fecha_publicacion: new Date().toISOString().split("T")[0],
    resumen_experto: "",
    campo_juridico: "Laboral",
    gerencia: "",
    personas_a_cargo: [],
    encargados_compliance: [],
    fecha_limite: "",
    reminders: []
  });

  const openAddModal = () => {
    setFormValues({
      articulo: "",
      requisito: "",
      sancion: "",
      multa_estimada_usd: 0,
      impacto_economico: 5,
      probabilidad_incumplimiento: 3,
      prioridad: "medio",
      estado: "pendiente",
      responsable: "",
      norma_nombre: "Código del Trabajo de Ecuador",
      tipo_norma: "Código",
      organismo_emisor: "Ministerio del Trabajo (MDT)",
      fecha_publicacion: new Date().toISOString().split("T")[0],
      resumen_experto: "",
      campo_juridico: "Laboral",
      gerencia: options.gerencias[0] || "Gerencia Legal & Compliance",
      personas_a_cargo: [],
      encargados_compliance: [],
      fecha_limite: "",
      reminders: []
    });
    setIsEditingForm(false);
    setShowFormModal(true);
  };

  const openEditModal = (item: MatrizItem) => {
    setFormValues({
      ...item,
      personas_a_cargo: item.personas_a_cargo || [],
      encargados_compliance: item.encargados_compliance || [],
      reminders: item.reminders || []
    });
    setIsEditingForm(true);
    setShowFormModal(true);
  };

  const toggleMultiSelectValue = (field: "personas_a_cargo" | "encargados_compliance" | "reminders", value: string) => {
    setFormValues(prev => {
      const currentList = prev[field] || [];
      const updatedList = currentList.includes(value)
        ? currentList.filter(v => v !== value)
        : [...currentList, value];
      return { ...prev, [field]: updatedList };
    });
  };

  const handleAddOption = async (type: "gerencias" | "personas_a_cargo" | "encargados_compliance", name: string) => {
    if (!name.trim()) return;
    try {
      const res = await fetch("/api/matriz/options/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, name: name.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setOptions(data.options);
        if (type === "gerencias") {
          setFormValues(prev => ({ ...prev, gerencia: name.trim() }));
          setNewGerenciaName("");
        }
        else if (type === "personas_a_cargo") {
          toggleMultiSelectValue("personas_a_cargo", name.trim());
          setNewPersonaName("");
        }
        else if (type === "encargados_compliance") {
          toggleMultiSelectValue("encargados_compliance", name.trim());
          setNewComplianceName("");
        }
      }
    } catch (err) {
      console.error("Error al guardar opción en base de datos", err);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValues.norma_nombre || !formValues.requisito) {
      alert("Por favor, rellene los campos obligatorios: Nombre de la Norma y Requisito/Exigencia.");
      return;
    }

    try {
      const isEdit = isEditingForm;
      const url = isEdit ? "/api/matriz/update" : "/api/matriz/add";

      const mergedResponsable = [
        formValues.gerencia ? `[${formValues.gerencia}]` : "",
        formValues.personas_a_cargo && formValues.personas_a_cargo.length > 0 ? `Cargo: ${formValues.personas_a_cargo.join(", ")}` : "",
        formValues.encargados_compliance && formValues.encargados_compliance.length > 0 ? `Compliance: ${formValues.encargados_compliance.join(", ")}` : ""
      ].filter(Boolean).join(" | ") || "Sin responsable asignado";

      const finalItemBody = {
        ...formValues,
        responsable: mergedResponsable
      };

      const payload = isEdit 
        ? { id: formValues.id, updates: finalItemBody, autor_rol: currentProfile.rol, autor_nombre: currentProfile.nombre }
        : { item: { ...finalItemBody, negocio_id: selectedEmpresa.id }, autor_rol: currentProfile.rol, autor_nombre: currentProfile.nombre };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowFormModal(false);
        fetchMatrixData();
      } else {
        alert("Falla al guardar el registro.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOptions = async () => {
    try {
      const res = await fetch("/api/matriz/options");
      if (res.ok) {
        const data = await res.json();
        setOptions(data);
      }
    } catch (err) {
      console.warn("options error", err);
    }
  };
  
  // Q&A
  const [qaInput, setQaInput] = useState("");
  const [qaLoading, setQaLoading] = useState(false);
  const [qaResponse, setQaResponse] = useState("");

  // Gaps Loading
  const [completingGaps, setCompletingGaps] = useState(false);

  // Onboarding Wizard State
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [ciiu, setCiiu] = useState("Venta al por mayor de combustibles líquidos y gaseosos");
  const [empleadosCount, setEmpleadosCount] = useState("Más de 50");
  const [hasForeign, setHasForeign] = useState(true);
  const [sectorSalud, setSectorSalud] = useState(selectedEmpresa.id === "bellavista-id");
  const [wizardQuestions, setWizardQuestions] = useState<any[]>([]);
  const [wizardAnswers, setWizardAnswers] = useState<Record<string, string>>({});
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [mappingRules, setMappingRules] = useState(false);

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<MatrizItem>>({});

  // Real-time Audit states inside ComplianceMatrix
  const [selectedAuditItem, setSelectedAuditItem] = useState<MatrizItem | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<any | null>(null);

  const handleAuditItemWithIA = async (item: MatrizItem) => {
    setSelectedAuditItem(item);
    setAuditLoading(true);
    setAuditResult(null);
    try {
      const res = await fetch("/api/vigilancia/validate-norma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          norma_nombre: item.norma_nombre,
          tipo_norma: item.tipo_norma,
          organismo_emisor: item.organismo_emisor,
          negocio_id: selectedEmpresa.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setAuditResult(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleApplyAuditToItem = async () => {
    if (!selectedAuditItem || !auditResult) return;
    
    const formattedAnalysis = `🌐 [Auditoría de Vigencia Real-time]: Sigue totalmente vigente (Estado: ${auditResult.status?.toUpperCase()}).\nÚltima Reforma: ${auditResult.ultima_reforma}\nAnálisis Grounded: ${auditResult.analisis_google}\nAcciones obligatorias planteadas:\n${auditResult.acciones_recomendadas?.map((a: string) => `- ${a}`).join("\n") || "Ninguna acción puntual sugerida por internet."}`;

    try {
      const res = await fetch("/api/matriz/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedAuditItem.id,
          updates: {
            resumen_experto: formattedAnalysis,
            fecha_publicacion: new Date().toISOString().split("T")[0]
          },
          autor_rol: currentProfile.rol,
          autor_nombre: currentProfile.nombre
        })
      });
      if (res.ok) {
        alert("¡Análisis de Internet de IA aplicado con éxito! Se ha actualizado el Resumen de Experto en la matriz.");
        setSelectedAuditItem(null);
        setAuditResult(null);
        fetchMatrixData(); // reload
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Reactively calculate priority/criticality based on the fine amount and whether the sanction triggers a closure (clausura)
  useEffect(() => {
    if (!showFormModal) return;
    const multa = formValues.multa_estimada_usd || 0;
    const sancionText = (formValues.sancion || "").toLowerCase();

    let computedPrioridad: "critico" | "alto" | "medio" | "bajo" = "bajo";

    const isClausuraOrCierre = 
      sancionText.includes("clausura") || 
      sancionText.includes("cierre") || 
      sancionText.includes("suspensión definitiva") || 
      sancionText.includes("cancelación de permiso") ||
      sancionText.includes("cancelar") ||
      sancionText.includes("clausurar") ||
      sancionText.includes("paralización") ||
      sancionText.includes("paralizar") ||
      sancionText.includes("cese de operaciones") ||
      sancionText.includes("detención de operaciones");

    if (isClausuraOrCierre) {
      computedPrioridad = "critico";
    } else if (multa >= 10000) {
      computedPrioridad = "critico";
    } else if (multa >= 3000 || sancionText.includes("suspensión temporal") || sancionText.includes("revocación") || sancionText.includes("suspender")) {
      computedPrioridad = "alto";
    } else if (multa >= 500) {
      computedPrioridad = "medio";
    }

    if (computedPrioridad !== formValues.prioridad) {
      setFormValues(prev => ({
        ...prev,
        prioridad: computedPrioridad
      }));
    }
  }, [formValues.sancion, formValues.multa_estimada_usd, showFormModal]);

  // Missing Norms Discovery
  const [discoveringMissing, setDiscoveringMissing] = useState(false);
  const [discoveredNorms, setDiscoveredNorms] = useState<any[] | null>(null);
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);

  const handleDiscoverMissingNorms = async () => {
    setDiscoveringMissing(true);
    setDiscoveredNorms(null);
    try {
      const res = await fetch("/api/vigilancia/discover-missing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          negocio_id: selectedEmpresa.id
        })
      });
      const data = await res.json();
      if (data.success && data.list) {
        setDiscoveredNorms(data.list);
        setShowDiscoveryModal(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDiscoveringMissing(false);
    }
  };

  const handleAddDiscoveredNormToMatrix = async (discoveredItem: any, index: number) => {
    try {
      const res = await fetch("/api/matriz/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item: {
            negocio_id: selectedEmpresa.id,
            articulo: discoveredItem.articulo || "Sin artículo",
            requisito: discoveredItem.requisito || "Sin requisito",
            sancion: discoveredItem.sancion || "Sin sanción establecida",
            multa_estimada_usd: discoveredItem.prioridad === "alto" ? 3000 : 1000,
            impacto_economico: discoveredItem.prioridad === "alto" ? 8 : 4,
            probabilidad_incumplimiento: 3,
            prioridad: discoveredItem.prioridad || "medio",
            estado: "pendiente",
            responsable: "Oficial de Compliance Int.",
            norma_nombre: discoveredItem.norma_nombre,
            tipo_norma: discoveredItem.tipo_norma || "Ley",
            organismo_emisor: discoveredItem.organismo_emisor || "Asamblea Nacional",
            resumen_experto: `🔍 [Mapeada con IA de Internet]: Normativa ecuatoriana identificada para el sector de ${selectedEmpresa.sector}.`,
            campo_juridico: discoveredItem.campo_juridico || "General"
          },
          autor_rol: currentProfile.rol,
          autor_nombre: currentProfile.nombre
        })
      });

      if (res.ok) {
        alert(`¡Normativa "${discoveredItem.norma_nombre}" agregada a la matriz exitosamente!`);
        if (discoveredNorms) {
          const updated = [...discoveredNorms];
          updated[index] = { ...updated[index], added: true };
          setDiscoveredNorms(updated);
        }
        fetchMatrixData(); // reload compliance matrix
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMatrixData();
    fetchOptions();
  }, [selectedEmpresa]);

  const fetchMatrixData = async () => {
    try {
      const res = await fetch(`/api/matriz?negocio_id=${selectedEmpresa.id}`);
      const data = await res.json();
      setItems(data);

      const propRes = await fetch(`/api/proposals?negocio_id=${selectedEmpresa.id}`);
      const propData = await propRes.json();
      setProposals(propData);

      // Check if we need to show wizard initially
      if (data.length === 0) {
        setShowWizard(true);
      } else {
        setShowWizard(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartOnboarding = async () => {
    setLoadingQuestions(true);
    setWizardStep(2);
    try {
      const res = await fetch("/api/gemini/onboarding-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sector: selectedEmpresa.sector, ciiu })
      });
      const data = await res.json();
      setWizardQuestions(data.preguntas);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleConfirmOnboarding = async () => {
    setMappingRules(true);
    setWizardStep(3);
    setTimeout(async () => {
      // Create seed rows dynamically from Gemini
      try {
        const res = await fetch("/api/vigilancia/trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ negocio_id: selectedEmpresa.id })
        });
        await res.json();
        // Load proposed regulations into current business catalog
        await fetchMatrixData();
      } catch (err) {
        console.error(err);
      } finally {
        setMappingRules(false);
        setWizardStep(4);
      }
    }, 2000);
  };

  const handleCompleteMatrixGaps = async () => {
    setCompletingGaps(true);
    try {
      const res = await fetch("/api/gemini/complete-empty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items })
      });
      await res.json();
      fetchMatrixData();
    } catch (err) {
      console.error(err);
    } finally {
      setCompletingGaps(false);
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaInput.trim()) return;
    setQaLoading(true);
    setQaResponse("");
    try {
      const res = await fetch("/api/gemini/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: qaInput, negocio_id: selectedEmpresa.id })
      });
      const data = await res.json();
      setQaResponse(data.answer);
    } catch (err) {
      console.error(err);
    } finally {
      setQaLoading(false);
    }
  };

  const startEdit = (item: MatrizItem) => {
    openEditModal(item);
  };

  const hasHierarchyPermission = (authorRol: string | undefined): boolean => {
    if (!authorRol) return true;
    const rank: Record<string, number> = {
      "invitado": 1,
      "user": 2,
      "admin": 3,
      "super_admin": 4
    };
    const authorRank = rank[authorRol] || 1;
    const userRank = rank[currentProfile.rol] || 1;
    return userRank > authorRank;
  };

  const handleReviewAction = async (itemId: string, action: "approve" | "revoke" | "second_review") => {
    try {
      const res = await fetch("/api/acciones/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "compliance",
          itemId,
          action,
          revisado_por_nombre: currentProfile.nombre,
          revisado_por_rol: currentProfile.rol
        })
      });
      if (res.ok) {
        fetchMatrixData();
      }
    } catch (err) {
      console.error("Failed to review compliance item", err);
    }
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const res = await fetch("/api/matriz/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id, 
          updates: editValues,
          autor_rol: currentProfile.rol,
          autor_nombre: currentProfile.nombre
        })
      });
      if (res.ok) {
        setEditingId(null);
        fetchMatrixData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleEstado = async (item: MatrizItem) => {
    const nextEstadoMap: Record<string, "cumplido" | "pendiente" | "en_proceso"> = {
      pendiente: "en_proceso",
      en_proceso: "cumplido",
      cumplido: "pendiente"
    };
    const next = nextEstadoMap[item.estado] || "pendiente";
    
    try {
      await fetch("/api/matriz/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: item.id, 
          updates: { estado: next },
          autor_rol: currentProfile.rol,
          autor_nombre: currentProfile.nombre
        })
      });
      fetchMatrixData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleProposalAction = async (id: string, action: "approve" | "reject") => {
    try {
      const res = await fetch("/api/proposals/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action })
      });
      if (res.ok) {
        fetchMatrixData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm("¿Está seguro de eliminar esta obligación de la matriz?")) return;
    try {
      await fetch("/api/matriz/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      fetchMatrixData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Articulo,Requisito,Sancion,Multa USD,Responsable,Estado,Norma,Campo Juridico\n";
    items.forEach((it) => {
      const row = `"${it.articulo}","${it.requisito.replace(/"/g, '""')}","${it.sancion.replace(/"/g, '""')}","${it.multa_estimada_usd}","${it.responsable}","${it.estado}","${it.norma_nombre}","${it.campo_juridico}"`;
      csvContent += row + "\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `matriz_compliance_${selectedEmpresa.nombre}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    window.print();
  };

  // KPI calculations
  const totalObligations = items.length;
  const fulfilledCount = items.filter(u => u.estado === "cumplido").length;
  const pendingCount = items.filter(u => u.estado === "pendiente").length;
  const criticalCount = items.filter(u => u.prioridad === "critico" && u.estado !== "cumplido").length;
  const totalFineEstimate = items.reduce((acc, currentValue) => {
    if (currentValue.estado !== "cumplido") {
      return acc + (currentValue.multa_estimada_usd || 0);
    }
    return acc;
  }, 0);

  // Auto-calculated score
  const dynamicScore = totalObligations > 0 ? Math.round((fulfilledCount / totalObligations) * 100) : 0;

  const legalFields = ["todos", ...Array.from(new Set(items.map(it => it.campo_juridico)))];

  const filteredItems = items.filter((it) => {
    const matchesSearch =
      it.requisito.toLowerCase().includes(search.toLowerCase()) ||
      it.sancion.toLowerCase().includes(search.toLowerCase()) ||
      it.norma_nombre.toLowerCase().includes(search.toLowerCase()) ||
      it.articulo.toLowerCase().includes(search.toLowerCase());

    const matchesField = filterField === "todos" || it.campo_juridico === filterField;
    const matchesStatus = filterStatus === "todos" || it.estado === filterStatus;

    return matchesSearch && matchesField && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* 4-STEP ONBOARDING WIZARD */}
      {showWizard && (
        <div className="bg-paper border border-roseOld/30 rounded-2xl p-6 md:p-10 shadow-elevated max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-sidebarRose animate-pulse" />
            <div>
              <h2 className="text-3xl font-serif font-semibold text-charcoal">
                Asistente de Onboarding Corporativo de Ecuador
              </h2>
              <p className="text-xs text-charcoalSoft font-sans mt-0.5">
                Paso {wizardStep} de 4 para la empresa <strong>{selectedEmpresa.nombre}</strong>.
              </p>
            </div>
          </div>

          <div className="w-full bg-cream rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-sidebarRose h-full transition-all duration-300"
              style={{ width: `${(wizardStep / 4) * 100}%` }}
            ></div>
          </div>

          {wizardStep === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-charcoalSoft font-sans">
                Para perfilar las normas de la República del Ecuador aplicables a su modelo operativo, el sistema recopilará antecedentes básicos del modelo industrial de <strong>{selectedEmpresa.nombre}</strong>.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-charcoalMuted mb-2">Sector Industrial</label>
                  <input type="text" className="w-full bg-cream border border-borderSoft rounded-xl p-3 text-sm text-charcoal" defaultValue={selectedEmpresa.sector} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-charcoalMuted mb-2">Código de Actividad CIIU</label>
                  <input
                    type="text"
                    value={ciiu}
                    onChange={(e) => setCiiu(e.target.value)}
                    className="w-full bg-cream border border-borderSoft rounded-xl p-3 text-sm text-charcoal"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-charcoalMuted mb-2">Escala de Empleados (MDT)</label>
                  <select
                    value={empleadosCount}
                    onChange={(e) => setEmpleadosCount(e.target.value)}
                    className="w-full bg-cream border border-borderSoft rounded-xl p-3 text-sm text-charcoal"
                  >
                    <option>1 a 10 (Micro)</option>
                    <option>11 a 50 (Pyme)</option>
                    <option>Más de 50</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-charcoalMuted mb-2">Regulaciones de Salud Especiales</label>
                  <select
                    value={sectorSalud ? "si" : "no"}
                    onChange={(e) => setSectorSalud(e.target.value === "si")}
                    className="w-full bg-cream border border-borderSoft rounded-xl p-3 text-sm text-charcoal"
                  >
                    <option value="no">No hospitalario</option>
                    <option value="si">Clínicas y Permisos ACESS / MSP</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button
                  onClick={handleStartOnboarding}
                  className="bg-charcoal hover:bg-charcoalSoft text-cream text-sm px-6 py-2.5 rounded-xl font-medium cursor-pointer transition-colors"
                  type="button"
                >
                  Siguiente paso {loadingQuestions && "..."}
                </button>
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-serif font-semibold">Preguntas Clínico-Operativas adaptadas por Gemini</h3>
              <p className="text-xs text-charcoalSoft font-sans">
                La Inteligencia Artificial ha extraído los siguientes flancos según su actividad para moldear las ordenanzas y leyes:
              </p>
              {loadingQuestions ? (
                <div className="text-center py-8 text-charcoalMuted font-sans">Cargando cuestionario dinámico de riesgos...</div>
              ) : (
                <div className="space-y-4">
                  {wizardQuestions.map((q: any, qi: number) => (
                    <div key={qi} className="bg-cream p-4 rounded-xl border border-borderSoft space-y-2">
                      <label className="block text-xs font-semibold text-sidebarRose tracking-wide font-sans">
                        PREGUNTA {qi + 1} ({q.materia})
                      </label>
                      <p className="text-sm font-medium text-charcoal">{q.pregunta}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                        {q.opciones.map((opt: string, opti: number) => (
                          <label key={opti} className="flex items-center gap-2 bg-paper hover:bg-paperDark px-3 py-2 rounded-lg text-xs cursor-pointer border border-borderSoft/40 transition-colors">
                            <input
                              type="radio"
                              name={`res-${qi}`}
                              checked={wizardAnswers[q.pregunta] === opt}
                              onChange={() => setWizardAnswers(prev => ({ ...prev, [q.pregunta]: opt }))}
                              className="accent-charcoal"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between pt-4">
                    <button
                      onClick={() => setWizardStep(1)}
                      className="text-charcoalSoft font-medium text-sm hover:underline cursor-pointer"
                      type="button"
                    >
                      Atrás
                    </button>
                    <button
                      onClick={handleConfirmOnboarding}
                      className="bg-charcoal hover:bg-charcoalSoft text-cream text-sm px-6 py-2.5 rounded-xl font-medium cursor-pointer transition-colors"
                      type="button"
                    >
                      Ejecutar Mapeo Normativo Ecuador
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {wizardStep === 3 && (
            <div className="text-center py-12 space-y-4">
              <RotateCw className="w-12 h-12 text-sidebarRose animate-spin mx-auto" />
              <h3 className="text-2xl font-serif font-semibold">Trazando leyes contra Biblioteca de Drive...</h3>
              <p className="text-xs text-charcoalSoft font-sans max-w-md mx-auto">
                Gemini está mapeando la Constitución, Código del Trabajo, LOPDP y Directrices de IESS/Acess para generar propuestas específicas de obligaciones para <strong>{selectedEmpresa.nombre}</strong>.
              </p>
            </div>
          )}

          {wizardStep === 4 && (
            <div className="text-center py-12 space-y-4">
              <CheckCircle2 className="w-16 h-16 text-success mx-auto" />
              <h3 className="text-2xl font-serif font-semibold">¡Mapeo completado exitosamente!</h3>
              <p className="text-xs text-charcoalSoft font-sans max-w-sm mx-auto">
                Se detectaron <strong>1 propuesta legal</strong> correspondiente al sector. Por favor revise el buzón de propuestas.
              </p>
              <div className="pt-4">
                <button
                  onClick={() => setShowWizard(false)}
                  className="bg-charcoal hover:bg-charcoalSoft text-cream text-xs px-6 py-2.5 rounded-xl font-medium cursor-pointer transition-colors"
                  type="button"
                >
                  Ver Tablero Principal
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* DASHBOARD SUMMARY PANEL - BENTO GRID COMPLIANCE MATRIX */}
      {!showWizard && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            
            {/* KPI 1: SCORE */}
            <div className="bento-card flex items-center gap-4">
              <div className="relative w-14 h-14 flex items-center justify-center rounded-full bg-cream border-2 border-sidebarRose shrink-0 shadow-inner">
                <span className="font-serif font-extrabold text-sm text-charcoal">{dynamicScore || selectedEmpresa.complianceScore}%</span>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-charcoalMuted">Índice Compliance</dt>
                <dd className="text-sm font-semibold text-charcoal mt-0.5">Estatus Óptimo</dd>
                <div className="text-[10px] text-success font-medium">Bajo riesgo regulatorio</div>
              </div>
            </div>

            {/* KPI 2: FULFILLED COUNT */}
            <div className="bento-card flex flex-col justify-between">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-charcoalMuted">Se cumple</dt>
                <dd className="text-3xl font-serif font-bold text-success mt-1">{fulfilledCount}</dd>
              </div>
              <div className="text-[10px] text-charcoalMuted mt-1">sobre un total de {totalObligations} estatales</div>
            </div>

            {/* KPI 3: PENDING COUNT */}
            <div className="bento-card flex flex-col justify-between bg-white">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-charcoalMuted">Pendientes de Aseguramiento</dt>
                <dd className="text-3xl font-serif font-bold text-warning mt-1">{pendingCount}</dd>
              </div>
              <div className="text-[10px] text-charcoalMuted mt-1">{criticalCount} de alta prioridad crítica</div>
            </div>

            {/* KPI 4: FINES POTENTIAL - BEAUTIFUL COFFEE BROWN DARK BENTO */}
            <div className="bento-card-dark flex flex-col justify-between">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-cream/70">Multa Estimada de Riesgo</dt>
                <dd className="text-2xl font-mono font-bold text-[#D4A5A5] mt-1">
                  ${totalFineEstimate.toLocaleString()} USD
                </dd>
              </div>
              <div className="text-[10px] text-roseSoft font-medium mt-1">En caso de fiscalización inmediata</div>
            </div>

          </div>

          {/* TWO PANEL SPLIT: 1. Proposals triage, 2. Library Q&A */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 1. Proposals triage */}
            <div className="bento-card space-y-4 flex flex-col bg-white">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-serif font-semibold text-lg text-charcoal">Propuestas de Obligaciones Pendientes</h3>
                  <p className="text-xs text-charcoalSoft font-sans">
                    Nuevos artículos y exigencias legislativas detectadas por el módulo de Vigilancia.
                  </p>
                </div>
                {proposals.length > 0 && (
                  <span className="bg-dangerSoft text-danger text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap">
                    {proposals.length} Por Inscribir
                  </span>
                )}
              </div>

              {proposals.length === 0 ? (
                <div className="text-center py-12 text-charcoalMuted text-xs font-sans flex-1 flex items-center justify-center">
                  No existen propuestas normativas pendientes de aprobación para esta empresa.
                </div>
              ) : (
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[350px] pr-1">
                  {proposals.map((prop) => (
                    <div key={prop.id} className="bg-[#F9F7F5] border border-borderSoft rounded-xl p-3.5 space-y-3 hover:border-sidebarRose/30 transition-colors">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="text-[9px] uppercase font-bold tracking-wider text-sidebarRose">{prop.tipo_norma} · {prop.articulo}</span>
                          <h4 className="font-serif font-semibold text-sm text-charcoal mt-0.5 leading-snug">{prop.norma_nombre}</h4>
                          <span className="text-[9px] text-charcoalMuted font-mono">Emisor: {prop.organismo_emisor}</span>
                        </div>
                        <span className="bg-roseSoft text-sidebarRose text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-sans whitespace-nowrap">
                          {prop.prioridad}
                        </span>
                      </div>
                      <p className="text-xs font-sans text-charcoalSoft line-clamp-3 leading-relaxed">{prop.requisito}</p>
                      
                      <div className="text-[10px] bg-white border border-borderSoft/30 px-2.5 py-1.5 rounded-lg flex justify-between items-center">
                        <span>Multa estim. USD: <strong className="text-danger font-bold">${prop.multa_estimada_usd}</strong></span>
                        <span>Materia: <strong className="text-charcoal font-medium">{prop.campo_juridico}</strong></span>
                      </div>

                      <div className="flex gap-2 justify-end pt-2 border-t border-borderSoft/40">
                        <button
                          onClick={() => handleProposalAction(prop.id, "reject")}
                          className="bg-white border border-borderSoft text-danger hover:bg-dangerSoft text-[10px] px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                          type="button"
                        >
                          ✕ Rechazar
                        </button>
                        <button
                          onClick={() => handleProposalAction(prop.id, "approve")}
                          className="bg-charcoal text-cream hover:bg-charcoalSoft text-[10px] px-3.5 py-1.5 rounded-lg cursor-pointer transition-colors font-bold"
                          type="button"
                        >
                          ✓ Aprobar para Matriz
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Library Q&A */}
            <form onSubmit={handleAskQuestion} className="bento-card space-y-4 flex flex-col bg-white">
              <div>
                <h3 className="font-serif font-semibold text-lg text-charcoal">Q&A Consultor de Normativa de Ecuador</h3>
                <p className="text-xs text-charcoalSoft font-sans">
                  Realice consultas en lenguaje natural respecto a multas, reglamentos o responsabilidades patronales en base a las obligaciones mapeadas.
                </p>
              </div>

              <div className="flex-1 space-y-3 flex flex-col">
                <textarea
                  value={qaInput}
                  onChange={(e) => setQaInput(e.target.value)}
                  placeholder="Ej: ¿Cuál es nuestra sanción máxima por no nombrar el Delegado de Datos Personales (DPO) según el estatuto?"
                  className="w-full bg-[#F9F7F5] border border-borderSoft rounded-xl p-3 text-xs placeholder:text-charcoalMuted text-charcoal focus:outline-none focus:border-sidebarRose transition-colors font-sans flex-1"
                  rows={4}
                />
                
                {qaResponse && (
                  <div className="bg-cream border border-borderSoft rounded-xl p-4 max-h-[320px] overflow-y-auto text-xs text-charcoalSoft space-y-2 font-sans shadow-inner">
                    <strong className="text-[#8E222F] block text-[10px] uppercase tracking-widest font-bold">Respuesta Directa del Consultor:</strong>
                    <div className="leading-relaxed whitespace-pre-line text-charcoal text-[13px]">{qaResponse}</div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-borderSoft/60 shrink-0">
                <span className="text-[9px] text-charcoalMuted font-mono">Búsqueda Inteligente · gpt-3.5-flash</span>
                <button
                  type="submit"
                  disabled={qaLoading}
                  className="bg-charcoal text-cream hover:bg-charcoalSoft text-[11px] px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors font-bold"
                >
                  <Send className="w-3 h-3" />
                  {qaLoading ? "Buscando..." : "Consultar Biblioteca"}
                </button>
              </div>
            </form>

          </div>

          {/* MAIN COMPLIANCE MATRIX TABLE WORKSPACE */}
          <div className="bg-white border border-borderSoft rounded-2xl shadow-sm overflow-hidden">
            
            {/* Table Filters & Toolbar header */}
            <div className="p-4 md:p-5 border-b border-borderSoft flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#F9F7F5]/40">
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-3.5 h-3.5 text-charcoalMuted" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filtrar por artículo, requisito, norma..."
                    className="bg-cream border border-borderSoft rounded-xl pl-9 pr-4 py-2 text-xs text-charcoal placeholder:text-charcoalMuted focus:outline-none focus:border-charcoal transition-colors font-sans"
                  />
                </div>

                <select
                  value={filterField}
                  onChange={(e) => setFilterField(e.target.value)}
                  className="bg-cream border border-borderSoft rounded-xl px-3 py-2 text-xs text-charcoal focus:outline-none font-sans"
                >
                  <option value="todos">Todas las materias</option>
                  {legalFields.filter(f => f !== "todos").map(field => (
                    <option key={field} value={field}>{field}</option>
                  ))}
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-cream border border-borderSoft rounded-xl px-3 py-2 text-xs text-charcoal focus:outline-none font-sans"
                >
                  <option value="todos">Todos los Estados</option>
                  <option value="cumplido">Se cumple</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="en_proceso">En Proceso</option>
                </select>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap gap-2 justify-end sm:justify-start">
                <button
                  onClick={openAddModal}
                  className="bg-sidebarRose hover:bg-roseOld text-white font-semibold text-xs px-4 py-2 rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-sm transition-all hover:scale-[1.02]"
                  type="button"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-white" />
                  Nueva Obligación / Tarea
                </button>
                <button
                  onClick={handleCompleteMatrixGaps}
                  disabled={completingGaps}
                  className="bg-cream hover:bg-paperDark text-sidebarRose border border-borderSoft text-xs px-4 py-2 rounded-xl inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  type="button"
                >
                  <Sparkles className="w-3.5 h-3.5 text-roseOld" />
                  {completingGaps ? "Autocompletando..." : "Autocompletar vacíos con AI"}
                </button>
                <button
                  onClick={handleDiscoverMissingNorms}
                  disabled={discoveringMissing}
                  className="bg-cream hover:bg-paperDark text-sidebarRose border border-borderSoft text-xs px-4 py-2 rounded-xl inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  type="button"
                  title="Escanear bases gubernamentales con IA de Internet para encontrar normas obligatorias omitidas"
                >
                  <Sparkles className="w-3.5 h-3.5 text-roseOld animate-pulse" />
                  {discoveringMissing ? "Descubriendo..." : "Descubrir Normas Faltantes con IA 🌐"}
                </button>
                <button
                  onClick={handleExportCSV}
                  className="bg-cream hover:bg-paperDark border border-borderSoft text-xs px-3.5 py-2 rounded-xl inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  type="button"
                >
                  <Download className="w-3.5 h-3.5" />
                  Exportar CSV
                </button>
                <button
                  onClick={handleExportPDF}
                  className="bg-cream hover:bg-paperDark border border-borderSoft text-xs px-3.5 py-2 rounded-xl inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  type="button"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Imprimir PDF
                </button>
              </div>
            </div>

            {/* Matrix Data Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-paperDark/60 border-b border-borderSoft text-[10px] font-bold uppercase tracking-wider text-charcoalMuted">
                    <th className="px-6 py-3.5">Norma / Campo</th>
                    <th className="px-3 py-3.5">Artículo</th>
                    <th className="px-6 py-3.5 w-[30%]">Exigencia / Requisito</th>
                    <th className="px-6 py-3.5">Sanción del Estado</th>
                    <th className="px-4 py-3.5 text-center">Criticidad</th>
                    <th className="px-6 py-3.5">Resumen de Experto / Responsables</th>
                    <th className="px-4 py-3.5 text-center">Estado</th>
                    <th className="px-4 py-3.5 text-right">Manejo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderSoft text-xs">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-charcoalMuted font-sans">
                        No se encontraron filas que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const isEditing = editingId === item.id;
                      return (
                        <tr key={item.id} className="hover:bg-cream/40 transition-colors">
                          
                          {/* Norma Column */}
                          <td className="px-6 py-4">
                            <span className="text-[9px] uppercase tracking-wider font-bold text-sidebarRose block">{item.tipo_norma}</span>
                            <span className="font-serif font-semibold text-charcoal block text-xs mt-0.5 leading-tight">{item.norma_nombre}</span>
                            <span className="text-[10px] text-charcoalMuted block">{item.organismo_emisor}</span>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              <span className="inline-block px-2 py-0.5 bg-sidebarRose/10 text-sidebarRose rounded font-sans text-[9px] font-bold uppercase letter-spacing-tag">
                                {item.campo_juridico}
                              </span>
                              
                              <button
                                onClick={() => handleAuditItemWithIA(item)}
                                className="inline-flex items-center gap-1 text-[9px] text-sidebarRose hover:text-white bg-roseSoft/50 hover:bg-sidebarRose px-2 py-0.5 rounded border border-sidebarRose/15 font-semibold transition-all cursor-pointer"
                                title="Cotejar vigencia real de esta ley en Ecuador mediante Google Search Grounding"
                                type="button"
                              >
                                <Sparkles className="w-2.5 h-2.5" />
                                Cotejar con IA 🌐
                              </button>
                            </div>
                          </td>

                          {/* Artículo */}
                          <td className="px-3 py-4 font-mono font-medium text-charcoal">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editValues.articulo || ""}
                                onChange={(e) => setEditValues({ ...editValues, articulo: e.target.value })}
                                className="bg-cream border border-borderSoft rounded px-2 py-1 text-xs font-mono"
                              />
                            ) : (
                              item.articulo
                            )}
                          </td>

                          {/* Requisito */}
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <textarea
                                value={editValues.requisito || ""}
                                onChange={(e) => setEditValues({ ...editValues, requisito: e.target.value })}
                                className="w-full bg-cream border border-borderSoft rounded p-2 text-xs font-sans"
                                rows={3}
                              />
                            ) : (
                              <div className="text-charcoal leading-relaxed font-sans">
                                <FormattedText text={item.requisito} />
                              </div>
                            )}
                          </td>

                          {/* Sancion */}
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <div className="space-y-1">
                                <textarea
                                  value={editValues.sancion || ""}
                                  onChange={(e) => setEditValues({ ...editValues, sancion: e.target.value })}
                                  className="w-full bg-cream border border-borderSoft rounded p-2 text-xs"
                                />
                                <input
                                  type="number"
                                  value={editValues.multa_estimada_usd || 0}
                                  onChange={(e) => setEditValues({ ...editValues, multa_estimada_usd: parseInt(e.target.value) })}
                                  className="w-full bg-cream border border-borderSoft rounded px-2 py-1 text-xs"
                                />
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="text-charcoalSoft leading-normal font-sans">
                                  <FormattedText text={item.sancion} />
                                </div>
                                <div className="text-danger font-mono font-medium text-[11px] bg-dangerSoft/20 inline-block px-1.5 py-0.5 rounded">
                                  Est. USD: ${item.multa_estimada_usd?.toLocaleString() || 0}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Prioridad / Impacto */}
                          <td className="px-4 py-4 text-center">
                            <span className={`badge ${
                              item.prioridad === "critico"
                                ? "danger"
                                : item.prioridad === "alto"
                                ? "warning"
                                : "muted"
                            }`}>
                              {item.prioridad}
                            </span>
                          </td>

                          {/* Responsable & Expert summary */}
                          <td className="px-6 py-4 whitespace-normal">
                            <div className="space-y-2 max-w-xs">
                              {isEditing ? (
                                <textarea
                                  value={editValues.responsable || ""}
                                  onChange={(e) => setEditValues({ ...editValues, responsable: e.target.value })}
                                  className="w-full bg-cream border border-borderSoft rounded p-1.5 text-[11px]"
                                />
                              ) : (
                                <div className="space-y-1">
                                  {item.resumen_experto?.includes("Auditoría de Vigencia") && (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-[#059669] bg-[#E6FDF4] px-1.5 py-0.5 rounded border border-[#BCF0DA] font-mono uppercase tracking-wider mb-1">
                                      ✓ Validado por IA 2026 🌐
                                    </span>
                                  )}
                                  <p className="text-[11px] text-charcoalSoft italic font-serif leading-relaxed line-clamp-3" title={item.resumen_experto}>
                                    {item.resumen_experto || "Haga clic en 'Autocompletar con AI' para generar el consejo experto."}
                                  </p>
                                </div>
                              )}
                              <div className="text-[10px] text-charcoalMuted border-t border-borderSoft/30 pt-1.5 leading-relaxed font-sans space-y-1">
                                {item.gerencia && (
                                  <div className="flex items-center gap-1">
                                    <span className="font-semibold text-sidebarRose">🏢 Gerencia:</span>
                                    <span className="text-charcoalSoft">{item.gerencia}</span>
                                  </div>
                                )}
                                {item.personas_a_cargo && item.personas_a_cargo.length > 0 ? (
                                  <div className="flex flex-wrap items-center gap-1">
                                    <span className="font-semibold text-indigo-700">👤 Persona a cargo:</span>
                                    <span className="text-charcoal font-medium bg-indigo-50 px-1 py-0.5 rounded">{item.personas_a_cargo.join(", ")}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <span className="font-semibold text-charcoalMuted">👤 Responsable:</span>
                                    <span className="text-charcoalMuted italic">{item.responsable || "No asignado"}</span>
                                  </div>
                                )}
                                {item.encargados_compliance && item.encargados_compliance.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1">
                                    <span className="font-semibold text-[#059669]">🛡️ Compliance:</span>
                                    <span className="text-charcoal font-medium bg-[#E6FDF4] px-1 py-0.5 rounded text-[9px]">{item.encargados_compliance.join(", ")}</span>
                                  </div>
                                )}
                                {item.fecha_limite && (
                                  <div className="flex items-center gap-1 text-[10px] text-[#DC2626] font-semibold font-mono bg-[#FEF2F2] px-1.5 py-0.5 rounded border border-[#FCA5A5]/35 mt-1 w-fit">
                                    <span>📅 Límite:</span>
                                    <span>{item.fecha_limite}</span>
                                  </div>
                                )}
                                {item.reminders && item.reminders.length > 0 && (
                                  <div className="flex items-center gap-1 text-[9px] text-amber-700 bg-amber-50 px-1 py-0.5 rounded w-fit">
                                    <span>🔔 Alarmas:</span>
                                    <span>{item.reminders.map(r => r.replace(/_/g, " ")).join(", ")}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Status toggle button */}
                          <td className="px-4 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleEstado(item)}
                              className={`badge cursor-pointer transition-transform hover:scale-105 ${
                                item.estado === "cumplido"
                                  ? "success"
                                  : item.estado === "pendiente"
                                  ? "danger"
                                  : "warning"
                              }`}
                            >
                              {item.estado === "cumplido" ? "Se cumple" : item.estado === "pendiente" ? "Pendiente" : "En Proceso"}
                            </button>
                          </td>

                          {/* Actions inline */}
                          <td className="px-4 py-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => handleSaveEdit(item.id)}
                                    className="p-1 px-1.5 rounded bg-success text-cream text-[10px] cursor-pointer"
                                    type="button"
                                  >
                                    Listo
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="p-1 px-1.5 rounded bg-charcoalMuted text-cream text-[10px] cursor-pointer"
                                    type="button"
                                  >
                                    ✕
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => startEdit(item)}
                                    className="p-1.5 hover:bg-paperDark rounded text-charcoalSoft cursor-pointer"
                                    title="Editar fila"
                                    type="button"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="p-1.5 hover:bg-dangerSoft text-danger rounded cursor-pointer"
                                    title="Borrar de la matriz"
                                    type="button"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom table stats */}
            <div className="bg-paper px-6 py-3 border-t border-borderSoft flex justify-between font-mono text-[10px] text-charcoalMuted">
              <span>Registros mostrados: {filteredItems.length}</span>
              <span>Total matriz: {totalObligations}</span>
            </div>

          </div>
        </>
      )}

      {/* REAL-TIME AI AUDIT PANEL MODAL / DRAWER */}
      {selectedAuditItem && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm flex justify-end z-50 transition-opacity">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col relative animate-slide-in">
            
            {/* Drawer Header */}
            <div className="p-6 border-b border-borderSoft flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sidebarRose font-mono bg-roseSoft/60 px-2 py-0.5 rounded border border-sidebarRose/15">
                  AUDITORÍA DE VIGENCIA CON IA DE INTERNET
                </span>
                <h3 className="font-serif font-semibold text-lg text-charcoal mt-1">
                  {selectedAuditItem.norma_nombre}
                </h3>
                <p className="text-[10px] text-charcoalMuted mt-0.5">
                  Materia: <strong>{selectedAuditItem.campo_juridico}</strong> | Artículo: <strong>{selectedAuditItem.articulo}</strong>
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedAuditItem(null);
                  setAuditResult(null);
                }}
                className="p-1.5 hover:bg-cream rounded-full cursor-pointer text-charcoalMuted hover:text-charcoal transition-colors border border-borderSoft"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 flex-1 overflow-y-auto space-y-5">
              
              {/* If loading */}
              {auditLoading ? (
                <div className="h-48 flex flex-col items-center justify-center space-y-3">
                  <RotateCw className="w-10 h-10 text-sidebarRose animate-spin" />
                  <p className="text-xs font-mono font-medium text-charcoalSoft">Consultando bases gubernamentales y gacetas de Ecuador...</p>
                </div>
              ) : auditResult ? (
                <div className="space-y-5">
                  
                  {/* Status row info */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-charcoal">Estatus de Vigencia:</span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                      auditResult.status === "activo"
                        ? "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]"
                        : auditResult.status === "precaucion"
                        ? "bg-[#FFF1F2] text-[#E11D48] border-[#FECDD3]"
                        : "bg-[#FFF6EC] text-[#B86828] border-[#F2D0B6]"
                    }`}>
                      {auditResult.status === "activo" ? "Activo" : auditResult.status === "precaucion" ? "Atención Requerida" : "Modificado / Reformado"}
                    </span>
                  </div>

                  {/* Ultimate reform */}
                  <div className="bg-[#FAF7F4] border border-[#F2D0B6]/65 rounded-xl p-4 space-y-1">
                    <span className="text-[10px] font-mono uppercase font-bold text-charcoalMuted tracking-wider">Detalle del Registro Oficial / Reforma:</span>
                    <p className="font-serif font-bold text-sm text-charcoal leading-snug">
                      {auditResult.ultima_reforma}
                    </p>
                  </div>

                  {/* Google Search analysis detailed content */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase font-bold text-charcoalMuted tracking-wider">Análisis Crítico Grounded AI:</span>
                    <div className="bg-[#FAF8F5] p-4 rounded-xl border border-borderSoft text-xs text-charcoalSoft leading-relaxed text-justify space-y-2">
                      <p>{auditResult.analisis_google}</p>
                    </div>
                  </div>

                  {/* Recommended compliance actions */}
                  {auditResult.acciones_recomendadas && auditResult.acciones_recomendadas.length > 0 && (
                    <div className="space-y-2 border-t border-borderSoft/50 pt-4">
                      <span className="text-[10px] font-mono uppercase font-bold text-charcoalMuted tracking-wider">Acciones Obligatorias a Implementar:</span>
                      <div className="space-y-2">
                        {auditResult.acciones_recomendadas.map((act: string, aIdx: number) => (
                          <div key={aIdx} className="flex gap-2 items-start text-xs text-charcoal">
                            <span className="w-4 h-4 rounded-full bg-successSoft text-[#059669] flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">✓</span>
                            <span>{act}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-roseSoft/20 border border-sidebarRose/15 rounded-xl p-4 text-[11px] leading-relaxed text-charcoalSoft flex gap-2">
                    <ShieldAlert className="w-5 h-5 text-sidebarRose shrink-0" />
                    <div>
                      Al aplicar este análisis, el sistema reemplazará el <strong>Resumen de Experto</strong> del renglón digital actual de su matriz de cumplimiento con los resultados grounded oficiales obtenidos de Google Search de Ecuador (2025/2026).
                    </div>
                  </div>

                </div>
              ) : (
                <div className="text-center py-12 text-charcoalMuted space-y-2">
                  <p className="text-xs">No se ha podido iniciar la auditoría legal.</p>
                  <button
                    onClick={() => handleAuditItemWithIA(selectedAuditItem)}
                    className="text-xs font-bold text-sidebarRose underline"
                  >
                    Reintentar Escáner
                  </button>
                </div>
              )}

            </div>

            {/* Drawer Actions Footer */}
            <div className="p-4 border-t border-borderSoft bg-[#FAF8F5] flex justify-end gap-3 shrink-0">
              <button
                onClick={() => {
                  setSelectedAuditItem(null);
                  setAuditResult(null);
                }}
                className="bg-white border border-borderSoft px-4 py-2.5 rounded-xl text-xs font-bold text-charcoal hover:bg-cream cursor-pointer transition-colors"
                type="button"
              >
                Cerrar
              </button>

              {auditResult && (
                <button
                  onClick={handleApplyAuditToItem}
                  className="bg-charcoal hover:bg-charcoalSoft text-cream px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-all shadow-sm"
                  type="button"
                >
                  <Check className="w-4 h-4 text-cream" />
                  Aplicar Análisis de Internet de IA
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* REAL-TIME AI DISCOVERY MODAL */}
      {showDiscoveryModal && discoveredNorms && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col relative animate-scale-in max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-borderSoft flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sidebarRose font-mono bg-roseSoft/60 px-2.5 py-1 rounded border border-sidebarRose/15">
                  AUDITORÍA DE DESCUBRIMIENTO ACTIVA 🌐
                </span>
                <h3 className="font-serif font-semibold text-xl text-charcoal mt-1.5 leading-snug">
                  Leyes y Reglamentos Encontrados en Internet
                </h3>
                <p className="text-xs text-charcoalMuted mt-1">
                  Búsqueda con Google Search Grounding para el sector: <strong className="text-sidebarRose">{selectedEmpresa.sector}</strong>. Estas obligaciones se identificaron en repositorios gacetas de Ecuador pero no constan actualmente en su matriz local.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDiscoveryModal(false);
                  setDiscoveredNorms(null);
                }}
                className="p-1.5 hover:bg-cream rounded-full cursor-pointer text-charcoalMuted hover:text-charcoal transition-colors border border-borderSoft"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                {discoveredNorms.map((dNorm: any, idx: number) => (
                  <div key={idx} className="bg-[#FAF8F5] border border-borderSoft/80 hover:border-sidebarRose/35 rounded-xl p-4 flex flex-col justify-between transition-all space-y-4 shadow-sm">
                    <div className="space-y-2.5">
                      
                      {/* header badges */}
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] uppercase tracking-wider font-bold text-sidebarRose bg-roseSoft/70 px-2 py-0.5 rounded font-mono">
                          {dNorm.tipo_norma || "Ley Ecuatoriana"}
                        </span>
                        <div className="flex gap-1">
                          <span className={`text-[8px] tracking-wider uppercase font-bold px-1.5 py-0.5 rounded border ${
                            dNorm.prioridad === "alto" ? "bg-red-50 text-red-600 border-red-200" : "bg-amber-50 text-amber-600 border-amber-200"
                          }`}>
                            {dNorm.prioridad || "medio"}
                          </span>
                          <span className="text-[8px] tracking-wider uppercase font-bold px-1.5 py-0.5 rounded border bg-blue-50 text-blue-600 border-blue-200">
                            {dNorm.campo_juridico || "General"}
                          </span>
                        </div>
                      </div>

                      {/* title & emisor */}
                      <div>
                        <h4 className="font-serif font-bold text-charcoal text-sm leading-snug">
                          {dNorm.norma_nombre}
                        </h4>
                        <span className="text-[10px] text-charcoalMuted block font-sans mt-0.5">
                          🏛️ Organismo: {dNorm.organismo_emisor} {dNorm.articulo ? `• ${dNorm.articulo}` : ""}
                        </span>
                      </div>

                      {/* details */}
                      <div className="space-y-1.5 text-xs text-charcoalSoft leading-normal">
                        <div>
                          <strong>Exigencia:</strong>
                          <FormattedText text={dNorm.requisito} />
                        </div>
                        <div className="text-red-700 bg-red-50/50 p-2 rounded-lg border border-red-100 text-[11px] mt-1.5">
                          <strong>⚖️ Sanción aplicable:</strong>
                          <FormattedText text={dNorm.sancion} />
                        </div>
                      </div>

                    </div>

                    {/* Action */}
                    <div className="pt-2 border-t border-borderSoft/35 flex justify-end">
                      {dNorm.added ? (
                        <button
                          disabled
                          className="bg-[#D1FAE5] text-[#047857] border border-[#A7F3D0] px-3.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                          type="button"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Agregada a Matriz
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAddDiscoveredNormToMatrix(dNorm, idx)}
                          className="bg-charcoal hover:bg-charcoalSoft text-cream text-xs font-bold px-4 py-1.5 rounded-xl cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-sm"
                          type="button"
                        >
                          <PlusCircle className="w-3.5 h-3.5 text-cream" />
                          Integrar a Matriz local
                        </button>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-borderSoft bg-[#FAF8F5] flex justify-end shrink-0">
              <button
                onClick={() => {
                  setShowDiscoveryModal(false);
                  setDiscoveredNorms(null);
                }}
                className="bg-white border border-borderSoft hover:bg-cream text-charcoal px-5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                type="button"
              >
                Listo, finalizar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ADD / EDIT COMPLIANCE OBLIGATION MODAL */}
      {showFormModal && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto font-sans">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col relative animate-scale-in max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-borderSoft flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sidebarRose font-mono bg-roseSoft/60 px-2.5 py-1 rounded border border-sidebarRose/15">
                  {isEditingForm ? "MODIFICAR CONTROL DE COMPLIANCE" : "CREAR NUEVO CONTROL DE COMPLIANCE"}
                </span>
                <h3 className="font-serif font-semibold text-lg text-charcoal mt-1.5 leading-snug">
                  {isEditingForm ? "Editar Detalle de la Obligación" : "Establecer Nueva Obligación Regulada"}
                </h3>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="p-1.5 hover:bg-cream rounded-full cursor-pointer text-charcoalMuted hover:text-charcoal transition-colors border border-borderSoft"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmitForm} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Section 1: Regulatory Context */}
              <div className="space-y-4">
                <h4 className="text-xs uppercase font-bold tracking-wider text-sidebarRose">1. Contexto Legal y Regulador</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-charcoalMuted uppercase">Nombre de la Norma / Ley *</label>
                    <input
                      type="text"
                      className="w-full bg-cream border border-borderSoft rounded-lg p-2.5 text-xs text-charcoal outline-none focus:border-sidebarRose"
                      value={formValues.norma_nombre || ""}
                      onChange={e => setFormValues({ ...formValues, norma_nombre: e.target.value })}
                      placeholder="Ej. Código del Trabajo de Ecuador"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-charcoalMuted uppercase">Artículo / Cláusula de Referencia</label>
                    <input
                      type="text"
                      className="w-full bg-cream border border-borderSoft rounded-lg p-2.5 text-xs text-charcoal outline-none focus:border-sidebarRose"
                      value={formValues.articulo || ""}
                      onChange={e => setFormValues({ ...formValues, articulo: e.target.value })}
                      placeholder="Ej. Art. 42 numeral 1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-charcoalMuted uppercase">Organismo Emisor</label>
                    <input
                      type="text"
                      className="w-full bg-cream border border-borderSoft rounded-lg p-2.5 text-xs text-charcoal outline-none focus:border-sidebarRose"
                      value={formValues.organismo_emisor || ""}
                      onChange={e => setFormValues({ ...formValues, organismo_emisor: e.target.value })}
                      placeholder="Ej. Ministerio de Trabajo"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-charcoalMuted uppercase">Tipo de Norma / Jerarquía de Ley</label>
                    <input
                      type="text"
                      className="w-full bg-cream border border-borderSoft rounded-lg p-2.5 text-xs text-charcoal outline-none focus:border-sidebarRose"
                      value={formValues.tipo_norma || ""}
                      onChange={e => setFormValues({ ...formValues, tipo_norma: e.target.value })}
                      placeholder="Ej. Ley Orgánica / Código"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-charcoalMuted uppercase">Publicación / Fecha Oficial</label>
                    <input
                      type="date"
                      className="w-full bg-cream border border-borderSoft rounded-lg p-2.5 text-xs text-charcoal outline-none focus:border-sidebarRose"
                      value={formValues.fecha_publicacion || ""}
                      onChange={e => setFormValues({ ...formValues, fecha_publicacion: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Exigency and Penalties */}
              <div className="space-y-4 pt-4 border-t border-borderSoft/35">
                <h4 className="text-xs uppercase font-bold tracking-wider text-sidebarRose">2. Exigencia y Penalización</h4>
                
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-charcoalMuted uppercase">Descripción del Requisito / Obligación *</label>
                  <textarea
                    rows={2}
                    className="w-full bg-cream border border-borderSoft rounded-lg p-2.5 text-xs text-charcoal outline-none focus:border-sidebarRose leading-relaxed"
                    value={formValues.requisito || ""}
                    onChange={e => setFormValues({ ...formValues, requisito: e.target.value })}
                    placeholder="Detalle exactamente lo que debe ser cumplido en la corporación..."
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-charcoalMuted uppercase">Sanción o Multa Estipulada</label>
                    <input
                      type="text"
                      className="w-full bg-cream border border-borderSoft rounded-lg p-2.5 text-xs text-charcoal outline-none focus:border-sidebarRose"
                      value={formValues.sancion || ""}
                      onChange={e => setFormValues({ ...formValues, sancion: e.target.value })}
                      placeholder="Ej. Multas administrativas de hasta 10 SBU"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-charcoalMuted uppercase">Estimación Económica de la Multa (USD)</label>
                    <input
                      type="number"
                      className="w-full bg-cream border border-borderSoft rounded-lg p-2.5 text-xs text-charcoal outline-none focus:border-sidebarRose font-mono"
                      value={formValues.multa_estimada_usd || 0}
                      onChange={e => setFormValues({ ...formValues, multa_estimada_usd: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-charcoalMuted uppercase block">Probabilidad de Incumplimiento (1-5)</label>
                    <select
                      className="w-full bg-cream border border-borderSoft rounded-lg p-2.5 text-xs text-charcoal outline-none focus:border-sidebarRose"
                      value={formValues.probabilidad_incumplimiento || 3}
                      onChange={e => setFormValues({ ...formValues, probabilidad_incumplimiento: parseInt(e.target.value) || 3 })}
                    >
                      <option value="1">1 - Remota</option>
                      <option value="2">2 - Baja</option>
                      <option value="3">3 - Moderada</option>
                      <option value="4">4 - Alta</option>
                      <option value="5">5 - Inminente</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-charcoalMuted uppercase block">Impacto Económico/Operativo (1-10)</label>
                    <select
                      className="w-full bg-cream border border-borderSoft rounded-lg p-2.5 text-xs text-charcoal outline-none focus:border-sidebarRose"
                      value={formValues.impacto_economico || 5}
                      onChange={e => setFormValues({ ...formValues, impacto_economico: parseInt(e.target.value) || 5 })}
                    >
                      {[...Array(10)].map((_, i) => (
                        <option key={i+1} value={i+1}>{i+1} - {i < 3 ? "Leve" : i < 6 ? "Moderado" : i < 8 ? "Crítico" : "Catastrófico"}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-charcoalMuted uppercase flex justify-between items-center">
                      <span>Prioridad de Atención</span>
                      <span className="text-[9px] text-[#059669] bg-[#E6FDF4] px-1 rounded border border-[#BCF0DA] font-mono font-medium" title="Calculada en base a la multa o riesgo de clausura">Auto-calculada ⚡</span>
                    </label>
                    <select
                      className="w-full bg-cream border border-borderSoft rounded-lg p-2.5 text-xs text-charcoal outline-none focus:border-sidebarRose font-medium"
                      value={formValues.prioridad || "medio"}
                      onChange={e => setFormValues({ ...formValues, prioridad: e.target.value as any })}
                    >
                      <option value="critico">Critico 🛑 (Multa ≥ $10k o Clausura)</option>
                      <option value="alto">Alto (Multa ≥ $3k o Suspensión)</option>
                      <option value="medio">Medio (Multa ≥ $500)</option>
                      <option value="bajo">Bajo (Menor a $500)</option>
                    </select>
                    <div className="text-[9px] text-charcoalMuted leading-tight italic pt-0.5">
                      Riesgo de clausura o multas severas fuerzan criticidad Crítica/Alta según legislación de Ecuador.
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: DEPARTMENTS, TEAM AND COMPLIANCE OFFICERS CO-RESPONSIBILITY */}
              <div className="space-y-4 pt-4 border-t border-borderSoft/35 bg-[#FAF8F5]/40 p-3 rounded-xl border border-borderSoft/40 font-sans">
                <h4 className="text-xs uppercase font-bold tracking-wider text-sidebarRose">3. Gerencia Responsable e Integrantes Asignados</h4>
                
                {/* A. Department Selection */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-charcoalMuted uppercase flex justify-between items-center block">
                    <span>🏢 Gerencia / Dirección Competente</span>
                    <span className="text-[10px] text-sidebarRose font-normal lowercase italic">Seleccione o agregue una nueva dirección abajo</span>
                  </label>
                  
                  <select
                    className="w-full bg-cream border border-borderSoft rounded-lg p-2.5 text-xs text-charcoal outline-none focus:border-sidebarRose"
                    value={formValues.gerencia || ""}
                    onChange={e => setFormValues({ ...formValues, gerencia: e.target.value })}
                  >
                    <option value="">-- Sin Gerencia Asignada --</option>
                    {options.gerencias.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>

                  <div className="flex gap-2 items-center mt-1.5">
                    <input
                      type="text"
                      className="bg-white border border-borderSoft rounded-lg px-2.5 py-1 text-xs text-charcoal outline-none flex-1 max-w-sm placeholder:italic"
                      placeholder="Agregar nueva gerencia a la lista corporativa..."
                      value={newGerenciaName}
                      onChange={e => setNewGerenciaName(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddOption("gerencias", newGerenciaName)}
                      className="bg-charcoal hover:bg-charcoalSoft text-white text-[10px] uppercase font-bold px-3 py-1.5 rounded-lg shrink-0 cursor-pointer"
                    >
                      Agregar Gerencia
                    </button>
                  </div>
                </div>

                {/* B. Personas a Cargo Multi-select */}
                <div className="space-y-2 mt-4 pt-2 border-t border-borderSoft/20">
                  <label className="text-[11px] font-bold text-charcoalMuted uppercase flex justify-between items-center block">
                    <span>👤 Persona(s) de Línea a Cargo (Co-responsables)</span>
                    <span className="text-[10px] text-indigo-700 font-normal lowercase bg-indigo-50 px-2 py-0.5 rounded font-mono">Selección múltiple</span>
                  </label>

                  {/* Multi-select checkable list */}
                  <div className="bg-white border border-borderSoft rounded-lg p-3 max-h-32 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 shadow-inner">
                    {options.personas_a_cargo.map((person) => {
                      const isChecked = (formValues.personas_a_cargo || []).includes(person);
                      return (
                        <label key={person} className="flex items-center gap-2 text-xs text-charcoal cursor-pointer select-none hover:bg-cream p-1 rounded transition-colors">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleMultiSelectValue("personas_a_cargo", person)}
                            className="rounded border-borderSoft text-sidebarRose focus:ring-sidebarRose cursor-pointer"
                          />
                          <span className={`${isChecked ? 'font-semibold text-indigo-700' : 'text-charcoalSoft'}`}>{person}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex gap-2 items-center mt-1.5">
                    <input
                      type="text"
                      className="bg-white border border-borderSoft rounded-lg px-2.5 py-1 text-xs text-charcoal outline-none flex-1 max-w-sm placeholder:italic"
                      placeholder="Registrar nueva persona en la empresa..."
                      value={newPersonaName}
                      onChange={e => setNewPersonaName(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddOption("personas_a_cargo", newPersonaName)}
                      className="bg-charcoal hover:bg-charcoalSoft text-white text-[10px] uppercase font-bold px-3 py-1.5 rounded-lg shrink-0 cursor-pointer"
                    >
                      Agregar Persona
                    </button>
                  </div>
                </div>

                {/* C. Encargado del Área de Compliance Multi-select */}
                <div className="space-y-2 mt-4 pt-2 border-t border-borderSoft/20">
                  <label className="text-[11px] font-bold text-charcoalMuted uppercase flex justify-between items-center block">
                    <span>🛡️ Encargado del Área de Compliance (Supervisores)</span>
                    <span className="text-[10px] text-[#059669] font-normal lowercase bg-[#E6FDF4] px-2 py-0.5 rounded font-mono">Selección múltiple</span>
                  </label>

                  {/* Multi-select checkable list */}
                  <div className="bg-white border border-borderSoft rounded-lg p-3 max-h-32 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 shadow-inner">
                    {options.encargados_compliance.map((officer) => {
                      const isChecked = (formValues.encargados_compliance || []).includes(officer);
                      return (
                        <label key={officer} className="flex items-center gap-2 text-xs text-charcoal cursor-pointer select-none hover:bg-cream p-1 rounded transition-colors">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleMultiSelectValue("encargados_compliance", officer)}
                            className="rounded border-borderSoft text-sidebarRose focus:ring-sidebarRose cursor-pointer"
                          />
                          <span className={`${isChecked ? 'font-semibold text-[#059669]' : 'text-charcoalSoft'}`}>{officer}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex gap-2 items-center mt-1.5">
                    <input
                      type="text"
                      className="bg-white border border-borderSoft rounded-lg px-2.5 py-1 text-xs text-charcoal outline-none flex-1 max-w-sm placeholder:italic"
                      placeholder="Registrar nuevo oficial / inspector..."
                      value={newComplianceName}
                      onChange={e => setNewComplianceName(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddOption("encargados_compliance", newComplianceName)}
                      className="bg-charcoal hover:bg-charcoalSoft text-white text-[10px] uppercase font-bold px-3 py-1.5 rounded-lg shrink-0 cursor-pointer"
                    >
                      Agregar Oficial
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 4: DEADLINE DATE AND REMINDERS */}
              <div className="space-y-4 pt-4 border-t border-borderSoft/35 bg-amber-50/20 p-4 rounded-xl border border-amber-300/30">
                <h4 className="text-xs uppercase font-bold tracking-wider text-amber-800">4. Calendario Planner y Recordatorios Remotos</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
                  {/* Due Date picker */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-amber-950 uppercase block flex items-center gap-1.5">
                      <span>📅 Fecha Límite de Cumplimiento (Due Date)</span>
                    </label>
                    <input
                      type="date"
                      className="w-full bg-white border border-amber-300/60 rounded-lg p-2.5 text-xs text-charcoal outline-none focus:border-sidebarRose font-mono"
                      value={formValues.fecha_limite || ""}
                      onChange={e => setFormValues({ ...formValues, fecha_limite: e.target.value })}
                    />
                    <p className="text-[10px] text-amber-700 leading-normal italic mt-1.5">
                      Sincroniza de forma automática con el Planner Compartido para el asignador y todos los integrantes.
                    </p>
                  </div>

                  {/* Reminder Alarm switches */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-amber-950 uppercase block flex items-center gap-1.5">
                      <span>🔔 Alertas de Correo & Notificación</span>
                    </label>
                    
                    <div className="space-y-1 text-xs text-charcoal font-sans">
                      {[
                        { id: "1_dia_antes", label: "1 Día antes del vencimiento 📅" },
                        { id: "3_dias_antes", label: "3 Días antes del vencimiento 🔔" },
                        { id: "1_semana_antes", label: "1 Semana antes (Oficial) 🛡️" }
                      ].map(rem => {
                        const isChecked = (formValues.reminders || []).includes(rem.id);
                        return (
                          <label key={rem.id} className="flex items-center gap-2 cursor-pointer p-1.5 bg-white/70 hover:bg-white rounded border border-amber-200/40 select-none shadow-sm transition-all">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleMultiSelectValue("reminders", rem.id)}
                              className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                            />
                            <span className={`${isChecked ? 'font-semibold text-amber-900' : 'text-charcoalSoft'}`}>{rem.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Selector */}
              <div className="space-y-2 pt-4 border-t border-borderSoft/35 font-sans">
                <label className="text-[11px] font-bold text-charcoalMuted uppercase block">Estado de la Obligación</label>
                <select
                  className="w-full bg-cream border border-borderSoft rounded-lg p-2.5 text-xs text-charcoal outline-none focus:border-sidebarRose font-bold"
                  value={formValues.estado || "pendiente"}
                  onChange={e => setFormValues({ ...formValues, estado: e.target.value as any })}
                >
                  <option value="pendiente">Pendiente 🔴</option>
                  <option value="en_proceso">En Proceso 🟡</option>
                  <option value="cumplido">Se Cumple 🟢</option>
                  <option value="no_aplica">No Aplica ⚪</option>
                </select>
              </div>

            </form>

            {/* Modal Footer */}
            <div className="p-4 border-t border-borderSoft bg-[#FAF8F5] flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowFormModal(false)}
                className="bg-white border border-borderSoft hover:bg-cream text-charcoal px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                type="button"
              >
                Cancelar
              </button>

              <button
                onClick={handleSubmitForm}
                className="bg-sidebarRose hover:bg-roseOld text-cream px-6 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-all shadow-sm"
                type="button"
              >
                <Check className="w-4 h-4 text-cream" />
                {isEditingForm ? "Guardar Modificaciones" : "Establecer y Asignar Obligación"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
