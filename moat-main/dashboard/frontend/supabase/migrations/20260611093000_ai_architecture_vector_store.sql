-- ============================================================================
-- MOAT — AI ARCHITECTURE VECTOR STORE
-- Adds pgvector-backed document/chunk storage for RAG, hybrid retrieval, and
-- multi-stage ranking. Non-destructive and independent of existing tables.
-- ============================================================================

create extension if not exists vector;

create table if not exists public.ai_vector_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  source_type text not null,
  source_id text,
  title text not null,
  content text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_vector_documents enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ai_vector_documents' and policyname = 'ai_vector_documents_own'
  ) then
    create policy ai_vector_documents_own on public.ai_vector_documents
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end;
$$;

create table if not exists public.ai_vector_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  document_id uuid not null references public.ai_vector_documents on delete cascade,
  chunk_index int not null,
  content text not null,
  token_estimate int not null default 0,
  embedding vector(1536),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique(document_id, chunk_index)
);

alter table public.ai_vector_chunks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ai_vector_chunks' and policyname = 'ai_vector_chunks_own'
  ) then
    create policy ai_vector_chunks_own on public.ai_vector_chunks
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end;
$$;

create index if not exists ai_vector_documents_user_id_idx on public.ai_vector_documents(user_id);
create index if not exists ai_vector_documents_source_idx on public.ai_vector_documents(source_type, source_id);
create index if not exists ai_vector_documents_metadata_gin_idx on public.ai_vector_documents using gin(metadata);
create index if not exists ai_vector_chunks_user_id_idx on public.ai_vector_chunks(user_id);
create index if not exists ai_vector_chunks_document_id_idx on public.ai_vector_chunks(document_id);
create index if not exists ai_vector_chunks_metadata_gin_idx on public.ai_vector_chunks using gin(metadata);
create index if not exists ai_vector_chunks_embedding_idx on public.ai_vector_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create or replace function public.match_ai_vector_chunks(
  query_embedding vector(1536),
  match_count int default 10,
  filter_user_id uuid default auth.uid(),
  filter_metadata jsonb default '{}'
)
returns table (
  id uuid,
  document_id uuid,
  source_type text,
  source_id text,
  title text,
  content text,
  metadata jsonb,
  similarity float
)
language sql
stable
as $$
  select
    c.id,
    c.document_id,
    d.source_type,
    d.source_id,
    d.title,
    c.content,
    c.metadata || jsonb_build_object('document_metadata', d.metadata) as metadata,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.ai_vector_chunks c
  join public.ai_vector_documents d on d.id = c.document_id
  where c.user_id = filter_user_id
    and c.embedding is not null
    and (filter_metadata = '{}'::jsonb or c.metadata @> filter_metadata or d.metadata @> filter_metadata)
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
