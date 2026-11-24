-- Co-piloto Tecnopedagógico · Tabla de planeaciones (pegar en Supabase > SQL Editor > Run)
create table if not exists public.planeaciones (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  datos jsonb not null,            -- coordenadas, conversación con el agente, planeación y versiones
  updated_at timestamptz not null default now()
);
alter table public.planeaciones enable row level security;

-- Cada docente solo puede ver y modificar sus propias planeaciones.
drop policy if exists "docente_propias" on public.planeaciones;
create policy "docente_propias" on public.planeaciones
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Repositorio curricular: documentos que sube cada docente (solo se guarda el texto).
create table if not exists public.documentos (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre text not null,
  area text not null default 'Todas las áreas',
  texto text not null,
  created_at timestamptz not null default now()
);
alter table public.documentos enable row level security;
drop policy if exists "docente_documentos" on public.documentos;
create policy "docente_documentos" on public.documentos
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Plantilla de plan de clase (.docx) de cada docente, guardada en base64.
create table if not exists public.plantillas (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre text not null,
  archivo text not null,
  campos integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.plantillas enable row level security;
drop policy if exists "docente_plantillas" on public.plantillas;
create policy "docente_plantillas" on public.plantillas
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
