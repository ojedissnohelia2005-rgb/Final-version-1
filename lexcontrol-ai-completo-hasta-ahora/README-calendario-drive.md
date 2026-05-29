# Bloque Calendario + Drive

## Calendario y Planner

El modulo `Calendario Legal & Planner` unifica eventos manuales, plazos procesales, audiencias, reuniones y vencimientos de matriz en una sola vista por empresa.

Vistas disponibles:
- Planner: Hoy, Esta semana y Proximos 30 dias.
- Mes: calendario mensual lunes-domingo con feriados nacionales marcados.
- Agenda: lista cronologica de eventos futuros.

Reglas implementadas:
- `Mi planner` muestra eventos creados por el usuario o donde participa.
- `Planner del equipo` queda reservado para `admin` y `super_admin`.
- Externos solo ven eventos donde son participantes.
- Los eventos de matriz no se exponen a externos por defecto.
- Al calcular un plazo procesal, se crea/actualiza automaticamente el evento relacionado.
- Los recordatorios se procesan con `/api/cron/recordatorios` y no se duplican.

Prueba rapida:
1. Entrar con `emily.campos@duragas.com.ec`.
2. Crear un proceso judicial y calcular un plazo.
3. Entrar al calendario y verificar que el plazo aparezca como evento.
4. Entrar con `fiorella.rendon@montblanc.com.ec` y verificar que solo vea eventos donde participa.

## Google Drive

La integracion recomendada para produccion es OAuth 2.0 por empresa. No se deben guardar claves privadas ni tokens en el codigo.

Variables esperadas:

```env
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/drive/callback
DRIVE_ENCRYPTION_KEY=
OPENAI_API_KEY=
OPENAI_EMBEDDINGS_MODEL=text-embedding-3-small
CRON_SECRET=
```

Pasos en Google Cloud:
1. Crear proyecto en Google Cloud Console.
2. Habilitar Google Drive API, Google Docs API y Google Sheets API.
3. Configurar OAuth consent screen.
4. Crear OAuth Client ID tipo Web Application.
5. Registrar redirect URI local y de produccion.
6. Guardar `client_id` y `client_secret` solo en variables de entorno.

Limitaciones del bloque local:
- Este repo usa Express + `db.json`, no Supabase.
- La estructura SQL incluida en `migrations/006_planner_drive.sql` documenta la migracion esperada para Supabase.
- La indexacion avanzada con embeddings queda preparada como contrato tecnico para el despliegue con Postgres/pgvector.

## Cron

Configurar Vercel Cron o equivalente:

```json
{
  "crons": [
    { "path": "/api/cron/recordatorios", "schedule": "0 * * * *" }
  ]
}
```

Enviar header:

```http
Authorization: Bearer $CRON_SECRET
```
