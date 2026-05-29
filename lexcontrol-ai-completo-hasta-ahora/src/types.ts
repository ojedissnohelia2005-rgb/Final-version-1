export type ProfileRole = "super_admin" | "admin" | "user" | "invitado";

export interface UserProfile {
  email: string;
  nombre: string;
  rol: ProfileRole;
  activo: boolean;
  empresa_id?: string;
  estudio_juridico?: string;
  permitir_compliance?: boolean;
  permitir_judicial?: boolean;
  materia_especifica?: string;
  proceso_especifico_id?: string;
  tarea_programada_tipo?: string;
}

export interface SedeEmpresa {
  id: string;
  nombre: string;
  tipo: "administrativa" | "planta" | "distribuidor" | "otro";
  canton: string;
  provincia: string;
  direccion: string;
  telefono: string;
  lat: number;
  lng: number;
}

export interface Empresa {
  id: string;
  nombre: string;
  sector: string;
  detalles: string;
  responsable_id: string;
  complianceScore: number;
  codigo_acceso: string;
  admin_unlock_code: string;
  sedes?: SedeEmpresa[];
  representante_legal_nombre?: string;
  procurador_judicial_nombre?: string;
}

export interface MatrizItem {
  id: string;
  negocio_id: string;
  articulo: string;
  requisito: string;
  sancion: string;
  multa_estimada_usd: number;
  impacto_economico: number; // 1-10
  probabilidad_incumplimiento: number; // 1-5
  prioridad: "critico" | "alto" | "medio" | "bajo";
  estado: "cumplido" | "pendiente" | "no_aplica" | "en_proceso";
  responsable: string;
  gerencia_competente?: string;
  area_competente?: string;
  sponsor?: string;
  responsable_proceso?: string;
  norma_nombre: string;
  tipo_norma: string;
  organismo_emisor: string;
  fecha_publicacion: string;
  resumen_experto: string;
  campo_juridico: string;
  creado_por_rol?: ProfileRole;
  creado_por_nombre?: string;
  review_estado?: "aprobado" | "pendiente_revision" | "revocado";
  
  // Custom new criteria requested by Nohelia:
  gerencia?: string; 
  personas_a_cargo?: string[]; 
  encargados_compliance?: string[]; 
  fecha_limite?: string; 
  reminders?: string[]; 
}

export interface ProcesoJudicial {
  id: string;
  negocio_id: string;
  numero_proceso: string;
  materia: string;
  titulo: string;
  demandante: string;
  demandados: string[];
  abogado_a_cargo_email: string;
  abogado_cargo_nombre: string;
  abogado_externoy_nombre: string;
  estado_procesal: string;
  fecha_creacion: string;
  monto_pretension: number;
  ficha_aprobada: boolean;
  ficha_caso: FichaCaso | null;
  etapas: EtapaProcesal[];
  plazos: PlazoProcesal[];
}

export interface FichaCaso {
  antecedentes: string;
  puntos_fuertes: string[];
  puntos_debiles: string[];
  analisis_dignidad_humana: string;
  conclusiones: string;
  limitaciones: string;
  probabilidad_exito_porcentaje?: number;
  probabilidad_exito_analisis?: string;
  recomendacion_estrategica?: string;
  analisis_economico_reputacional?: string;
}

export interface EtapaProcesal {
  id: string;
  titulo: string;
  tipo: "escrito" | " audiencia" | "providencia" | "notificacion" | "sentencia" | string;
  fecha: string;
  ejecutado_por: string;
  resumen_ia: string;
  adjunto_url?: string;
  creado_por_rol?: ProfileRole;
  creado_por_nombre?: string;
  review_estado?: "aprobado" | "pendiente_revision" | "revocado";
}

export interface PlazoProcesal {
  id: string;
  titulo: string;
  regla_origen: string;
  dias: number;
  horas?: number;
  tipo: "termino" | "plazo";
  fecha_limite: string;
  fundamento_legal?: string;
  observaciones?: string;
  verificado_manual?: boolean;
  alerta_estado?: "vence hoy" | "vence mañana" | "vence en 3 días" | "vencido" | "vigente";
  dias_no_habiles_excluidos: string[];
  estado: "pendiente" | "cumplido";
  anomalias: string[];
  creado_por_rol?: ProfileRole;
  creado_por_nombre?: string;
  review_estado?: "aprobado" | "pendiente_revision" | "revocado";
}

export interface AlertaLegal {
  id: string;
  negocio_id: string;
  titulo: string;
  nivel: "critica" | "importante" | "informativa";
  fuente_tipo: "registro_oficial" | "asamblea" | "x" | "academica" | "estudio_juridico" | "noticias_oficial" | "noticias_prensa" | "superintendencia";
  resumen_alerta: string;
  estado: "nueva" | "revisada";
  fecha: string;
  confianza_score?: number; // 0 - 100%
  confianza_nivel?: "Muy Alta (Verificable)" | "Alta" | "Media" | "Baja (Especulativa)";
}

export interface Notaria {
  id: string;
  numero: number;
  canton: string;
  provincia: string;
  direccion: string;
  telefono: string;
  notario_titular: string;
  horario_atencion: string;
  lat: number;
  lng: number;
}

export interface CalendarioEvento {
  id: string;
  negocio_id: string;
  titulo: string;
  descripcion?: string;
  fecha_inicio: string;
  fecha_fin?: string;
  todo_el_dia?: boolean;
  tipo: "vencimiento_matriz" | "plazo" | "audiencia" | "reunion" | "manual";
  visibilidad: "solo_yo" | "interno" | "externo" | "compartido";
  participantes: string[];
  proceso_id?: string;
  matriz_id?: string;
  plazo_id?: string;
  etapa_id?: string;
  recordatorio_minutos?: number[];
  cumplido?: boolean;
  created_by?: string;
  creado_por_rol?: ProfileRole;
  creado_por_nombre?: string;
  review_estado?: "aprobado" | "pendiente_revision" | "revocado";
}

export interface SimulatedEmail {
  id: string;
  negocio_id: string;
  destinatario_nombre: string;
  destinatario_rol: ProfileRole;
  asunto: string;
  cuerpo: string;
  fecha: string;
  origen_accion: string;
}

export interface ChatMensaje {
  id: string;
  negocio_id: string;
  remitente_email: string;
  remitente_nombre: string;
  remitente_rol: ProfileRole;
  contenido: string;
  fecha_envio: string;
  canal: string;
}

export interface NotificacionAlerta {
  id: string;
  negocio_id: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  leida: boolean;
  de_externo: boolean;
  remitente_nombre: string;
  remitente_rol: ProfileRole;
  tipo_accion: "carga_etapa" | "calculo_plazo" | "agenda_evento";
  causa_titulo?: string;
  causa_id?: string;
}
