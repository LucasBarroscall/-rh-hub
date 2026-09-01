-- =========================================================
-- Hub RH · People Analytics — schema Supabase
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase.
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- PERFIS (papéis de acesso: entrevistador1/2/3, analista)
-- ---------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text not null,
  role text not null check (role in ('entrevistador1', 'entrevistador2', 'entrevistador3', 'analista')),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Um registro por usuário do sistema, define o papel/permissão de cada entrevistador ou analista.';

-- ---------------------------------------------------------
-- CANDIDATOS (tabela central do funil de recrutamento)
-- ---------------------------------------------------------
create table if not exists public.candidatos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Preenchido pelo candidato no formulário público
  fonte text check (fonte in ('Redes Sociais', 'Indicação', 'Outros')),
  nome_indicador text,
  nome_completo text not null,
  telefone text,
  rg text,
  cpf text,
  data_nascimento date,
  sexo text check (sexo in ('Feminino', 'Masculino', 'Outro', 'Prefiro não informar')),
  nome_mae text,
  endereco text,
  bairro text,
  cidade text,
  cep text,
  email text,
  disponibilidade_horario_trabalho text,
  disponibilidade_horario_treinamento text,
  disponibilidade_jornada text,
  possui_veiculo boolean,
  concorda_turno_treinamento boolean,
  possui_ensino_superior boolean,
  observacoes text,
  data_entrevista date not null default current_date,

  -- Preenchido pelo Entrevistador 1
  compareceu_entrevista boolean,
  aprovado_entrevista boolean,
  entrevista_em timestamptz,

  -- Preenchido pelo Entrevistador 2 (teste de digitação)
  teste_realizado boolean,
  wpm numeric(5, 1),
  precisao numeric(5, 2),
  alerta_comportamental text,
  teste_em timestamptz,

  -- Preenchido pelo Entrevistador 3 (etapa final / decisão)
  compliance text,
  data_exame date,
  compareceu_exame boolean,
  aprovado_exame boolean,
  enviou_documentacao boolean,
  aprovado_documentacao boolean,
  compareceu_onboarding boolean,
  compareceu_treinamento boolean,
  decisao_final text check (decisao_final in ('Aprovado', 'Reprovado', 'Pendente')),
  contatado_whatsapp boolean default false,
  decisao_em timestamptz,

  -- Preenchido pelo People Analytics
  compareceu_alo boolean,

  updated_at timestamptz not null default now()
);

comment on table public.candidatos is 'Registro completo de cada candidato ao longo do funil de recrutamento.';

-- Idade calculada automaticamente a partir da data de nascimento
create or replace function public.calcular_idade(nascimento date)
returns int
language sql
immutable
as $$
  select case
    when nascimento is null then null
    else date_part('year', age(current_date, nascimento))::int
  end
$$;

alter table public.candidatos
  add column if not exists idade int generated always as (public.calcular_idade(data_nascimento)) stored;

-- Aprovação automática no teste de digitação: WPM >= 20 e Precisão >= 95%
create or replace function public.calcular_aprovado_teste(p_wpm numeric, p_precisao numeric, p_realizado boolean)
returns boolean
language sql
immutable
as $$
  select case
    when p_realizado is not true then null
    when p_wpm is null or p_precisao is null then null
    else (p_wpm >= 20 and p_precisao >= 95)
  end
$$;

alter table public.candidatos
  add column if not exists aprovado_teste boolean generated always as
    (public.calcular_aprovado_teste(wpm, precisao, teste_realizado)) stored;

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_candidatos_updated_at on public.candidatos;
create trigger trg_candidatos_updated_at
  before update on public.candidatos
  for each row execute function public.set_updated_at();

create index if not exists idx_candidatos_created_at on public.candidatos (created_at);
create index if not exists idx_candidatos_data_entrevista on public.candidatos (data_entrevista);
create index if not exists idx_candidatos_fonte on public.candidatos (fonte);

-- ---------------------------------------------------------
-- RLS — Row Level Security
-- ---------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.candidatos enable row level security;

-- Função auxiliar que verifica o papel do usuário sem re-acionar a
-- política de RLS da própria tabela profiles (evita recursão infinita:
-- uma policy de profiles NUNCA deve fazer um select direto em profiles).
create or replace function public.is_analista(uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = uid and role = 'analista'
  );
$$;

-- profiles: cada usuário lê o próprio perfil; analista lê e edita todos
create policy "profiles_select_own_or_analista"
  on public.profiles for select
  using (auth.uid() = id or public.is_analista(auth.uid()));

create policy "profiles_update_analista"
  on public.profiles for update
  using (public.is_analista(auth.uid()));

create policy "profiles_insert_analista"
  on public.profiles for insert
  with check (public.is_analista(auth.uid()));

create policy "profiles_delete_analista"
  on public.profiles for delete
  using (public.is_analista(auth.uid()));

-- candidatos: qualquer visitante (anônimo) pode se CADASTRAR via formulário público
create policy "candidatos_insert_publico"
  on public.candidatos for insert
  to anon, authenticated
  with check (true);

-- candidatos: apenas usuários logados com perfil válido podem ver e atualizar
create policy "candidatos_select_autenticado"
  on public.candidatos for select
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.ativo));

create policy "candidatos_update_autenticado"
  on public.candidatos for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.ativo));

-- candidatos: apenas analista pode excluir
create policy "candidatos_delete_analista"
  on public.candidatos for delete
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'analista'));

-- ---------------------------------------------------------
-- Primeiro usuário analista (rode manualmente após criar o
-- usuário em Authentication > Users, veja o README).
-- ---------------------------------------------------------
-- insert into public.profiles (id, nome, email, role)
-- values ('COLE-O-UUID-DO-USUARIO-AQUI', 'Seu Nome', 'seu-email@empresa.com', 'analista');
