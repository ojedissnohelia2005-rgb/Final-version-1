-- Bloque Calendario + Drive para futura migracion Supabase/Postgres.
-- El entorno local actual usa db.json; este SQL conserva el contrato productivo.

alter table eventos add column if not exists descripcion text;
alter table eventos add column if not exists fecha_fin timestamptz;
alter table eventos add column if not exists todo_el_dia boolean default false;
alter table eventos add column if not exists recordatorio_minutos int[] default array[1440, 60];
alter table eventos add column if not exists cumplido boolean default false;

create table if not exists recordatorios_enviados (
  id uuid primary key default uuid_generate_v4(),
  evento_id uuid not null,
  participante uuid not null,
  minutos_antes int not null,
  enviado_at timestamptz default now(),
  unique (evento_id, participante, minutos_antes)
);

create table if not exists drive_credentials (
  empresa_id uuid primary key references empresas(id) on delete cascade,
  access_token_cifrado bytea not null,
  refresh_token_cifrado bytea not null,
  token_expira_at timestamptz,
  email_cuenta text,
  scopes text[],
  carpeta_raiz_id text,
  carpeta_raiz_nombre text,
  conectado_por uuid references profiles(id),
  conectado_at timestamptz default now(),
  ultimo_sync timestamptz,
  estado text default 'activo'
);

create table if not exists drive_archivos (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid references empresas(id) on delete cascade not null,
  drive_file_id text not null,
  drive_url text,
  nombre text not null,
  mime_type text,
  size_bytes bigint,
  carpeta_drive_id text,
  carpeta_drive_path text,
  tipo_documento text,
  proceso_id uuid references procesos_judiciales(id) on delete set null,
  etapa_id uuid references etapas_proceso(id) on delete set null,
  normativa_doc_id uuid,
  texto_extraido text,
  hash_contenido text,
  version_drive int,
  ultima_modificacion_drive timestamptz,
  indexado_at timestamptz,
  detectado_at timestamptz default now(),
  sincronizado_at timestamptz,
  estado text default 'pendiente_indexacion',
  error_msg text,
  unique (empresa_id, drive_file_id)
);

create table if not exists drive_chunks (
  id uuid primary key default uuid_generate_v4(),
  archivo_id uuid references drive_archivos(id) on delete cascade,
  empresa_id uuid references empresas(id) on delete cascade,
  chunk_index int not null,
  texto text not null,
  tokens int,
  embedding vector(1536),
  articulo_detectado text,
  created_at timestamptz default now()
);

create table if not exists drive_watch_channels (
  channel_id text primary key,
  empresa_id uuid references empresas(id) on delete cascade,
  resource_id text not null,
  expira_at timestamptz not null,
  creado_at timestamptz default now()
);

create index if not exists drive_chunks_embedding_idx
  on drive_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create or replace function match_drive_chunks(
  query_embedding vector(1536),
  empresa_id uuid,
  match_threshold float,
  match_count int
) returns table (
  archivo_id uuid,
  nombre_archivo text,
  texto text,
  articulo text,
  similarity float
) language sql stable as $$
  select
    a.id as archivo_id,
    a.nombre as nombre_archivo,
    c.texto,
    c.articulo_detectado as articulo,
    1 - (c.embedding <=> query_embedding) as similarity
  from drive_chunks c
  join drive_archivos a on a.id = c.archivo_id
  where c.empresa_id = match_drive_chunks.empresa_id
    and a.estado = 'indexado'
    and 1 - (c.embedding <=> query_embedding) > match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
