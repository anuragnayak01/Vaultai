-- ═══════════════════════════════════════════════
--  VaultAI — Supabase Schema
--  Paste this into Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════

-- 1. Projects
create table if not exists projects (
  id          uuid        default gen_random_uuid() primary key,
  name        text        not null,
  description text        default '',
  created_by  text        not null,
  created_at  timestamptz default now()
);

-- 2. Messages (each message = own row → no race conditions)
create table if not exists messages (
  id          uuid        default gen_random_uuid() primary key,
  project_id  uuid        references projects(id) on delete cascade not null,
  role        text        not null check (role in ('user','assistant')),
  content     text        not null,
  thinking    text,
  username    text        not null,
  created_at  timestamptz default now()
);

-- 3. File metadata
create table if not exists files (
  id           uuid        default gen_random_uuid() primary key,
  project_id   uuid        references projects(id) on delete cascade not null,
  name         text        not null,
  mime_type    text,
  size_bytes   bigint,
  username     text        not null,
  storage_path text        not null,
  created_at   timestamptz default now()
);

-- 4. Project context (one row per project)
create table if not exists project_context (
  project_id  uuid        references projects(id) on delete cascade primary key,
  content     text        default '',
  updated_by  text,
  updated_at  timestamptz default now()
);

-- ── Indexes ──────────────────────────────────────────────────
create index if not exists idx_messages_project   on messages(project_id, created_at);
create index if not exists idx_files_project      on files(project_id);

-- ── Disable RLS (private deployment — all users trusted) ─────
alter table projects        disable row level security;
alter table messages        disable row level security;
alter table files           disable row level security;
alter table project_context disable row level security;

-- ── Enable Realtime on all tables ────────────────────────────
alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table files;
alter publication supabase_realtime add table project_context;

-- ── Storage bucket for files ──────────────────────────────────
-- Run this separately in Supabase → Storage → New Bucket
-- Name: vault-files
-- Public: false
-- (or run the insert below)
insert into storage.buckets (id, name, public)
values ('vault-files', 'vault-files', false)
on conflict (id) do nothing;

-- Allow all operations on vault-files bucket (private deployment)
create policy "allow all on vault-files"
  on storage.objects for all
  using (bucket_id = 'vault-files')
  with check (bucket_id = 'vault-files');
