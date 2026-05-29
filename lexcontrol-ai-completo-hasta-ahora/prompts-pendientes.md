# Prompts Pendientes LexControl AI

## Bloque Planner + Calendario

Construir el modulo de calendario como vista unificada de plazos, audiencias, vencimientos de matriz y eventos manuales, con coordinacion automatica entre abogados internos y externos.

Requisitos clave:
- Planner por horizontes: hoy, esta semana y proximos 30 dias.
- Vista mensual y vista agenda.
- Filtros por tipo, proceso, visibilidad y participante.
- Creacion manual de eventos con recordatorios.
- Detalle de evento con participantes, cumplimiento, reagendamiento y eliminacion.
- Auto-creacion desde plazos, audiencias, vencimientos de matriz y minutas futuras.
- Cron horario para recordatorios sin duplicados.
- Reglas de visibilidad: solo yo, interno, compartido y externo.
- Procesos confidenciales solo visibles para participantes explicitos.

## Bloque Google Drive

Integrar Google Drive como fuente de verdad documental del cliente. Supabase o la base local solo guarda metadatos, texto extraido, embeddings y referencias.

Requisitos clave:
- OAuth 2.0 con refresh tokens, no service account compartido para clientes.
- Tabla de credenciales cifradas por empresa.
- Mapeo Drive a documentos indexados.
- Extraccion de texto desde PDF, DOCX, Google Docs y Sheets.
- Chunks de texto y embeddings para Q&A normativo.
- Webhooks/watch channels para sync incremental.
- Exportacion de fichas y minutas a Google Docs.
- Adjuntar archivos de Drive a etapas de procesos.
- README con configuracion Google Cloud, scopes y variables de entorno.

Nota de implementacion actual:
Este repositorio local corre con Vite/React + Express y `db.json`; por eso el bloque se adapto al stack existente. Si luego se migra a Next/Supabase, este archivo conserva el alcance funcional esperado.
