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

-- ---------------------------------------------------------
-- LISTAS DE OPÇÕES (Fonte, Sexo, disponibilidades) — editáveis
-- pela tela Administração → Listas, sem precisar mexer no código.
-- ---------------------------------------------------------

-- As colunas fonte/sexo tinham um "check" travando os valores
-- possíveis; agora a validação passa a vir da tabela abaixo.
alter table public.candidatos drop constraint if exists candidatos_fonte_check;
alter table public.candidatos drop constraint if exists candidatos_sexo_check;

create table if not exists public.opcoes_lista (
  id uuid primary key default gen_random_uuid(),
  campo text not null check (
    campo in (
      'fonte',
      'sexo',
      'disponibilidade_horario_trabalho',
      'disponibilidade_horario_treinamento',
      'disponibilidade_jornada'
    )
  ),
  valor text not null,
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  unique (campo, valor)
);

comment on table public.opcoes_lista is 'Opções dos campos de seleção do cadastro (Fonte, Sexo, disponibilidades) — editável pelo analista sem alterar o código.';

alter table public.opcoes_lista enable row level security;

-- Leitura pública (o formulário do candidato não exige login)
create policy "opcoes_select_publico"
  on public.opcoes_lista for select
  to anon, authenticated
  using (true);

-- Só o analista gerencia as listas
create policy "opcoes_insert_analista"
  on public.opcoes_lista for insert
  to authenticated
  with check (public.is_analista(auth.uid()));

create policy "opcoes_update_analista"
  on public.opcoes_lista for update
  to authenticated
  using (public.is_analista(auth.uid()));

create policy "opcoes_delete_analista"
  on public.opcoes_lista for delete
  to authenticated
  using (public.is_analista(auth.uid()));

insert into public.opcoes_lista (campo, valor, ordem) values
  ('fonte', 'Redes Sociais', 1),
  ('fonte', 'Indicação', 2),
  ('fonte', 'Outros', 3),
  ('sexo', 'Feminino', 1),
  ('sexo', 'Masculino', 2),
  ('sexo', 'Outro', 3),
  ('sexo', 'Prefiro não informar', 4),
  ('disponibilidade_horario_trabalho', 'Manhã', 1),
  ('disponibilidade_horario_trabalho', 'Tarde', 2),
  ('disponibilidade_horario_trabalho', 'Noite', 3),
  ('disponibilidade_horario_trabalho', 'Manhã/Tarde', 4),
  ('disponibilidade_horario_trabalho', 'Tarde/Noite', 5),
  ('disponibilidade_horario_trabalho', 'Flexível', 6),
  ('disponibilidade_horario_treinamento', 'Manhã/Tarde', 1),
  ('disponibilidade_horario_treinamento', 'Tarde/Noite', 2),
  ('disponibilidade_jornada', 'Meio período', 1),
  ('disponibilidade_jornada', 'Período integral', 2),
  ('disponibilidade_jornada', 'Escala 6x1', 3),
  ('disponibilidade_jornada', 'Escala 5x2', 4)
on conflict (campo, valor) do nothing;

-- =========================================================
-- RODADA 3 — colunas de rastreio de etapas/datas, log de
-- auditoria, comentários por campo e rede social (sub-opção
-- de Fonte = Redes Sociais).
-- =========================================================

-- ---------------------------------------------------------
-- Novas colunas em candidatos
-- ---------------------------------------------------------
alter table public.candidatos add column if not exists tempo_preenchimento_segundos int;
alter table public.candidatos add column if not exists rede_social text;
alter table public.candidatos add column if not exists documentacao_solicitada boolean;
alter table public.candidatos add column if not exists data_documentacao_solicitada date;
alter table public.candidatos add column if not exists data_envio_documentacao date;
alter table public.candidatos add column if not exists data_onboarding date;
alter table public.candidatos add column if not exists data_treinamento date;
alter table public.candidatos add column if not exists data_contato_whatsapp date;
alter table public.candidatos add column if not exists data_alo date;

comment on column public.candidatos.tempo_preenchimento_segundos is 'Tempo (segundos) que o candidato levou para preencher o formulário — medido no navegador, não exibido a ele mesmo.';

-- ---------------------------------------------------------
-- LOG DE ALTERAÇÕES (auditoria automática via trigger)
-- ---------------------------------------------------------
create table if not exists public.log_alteracoes (
  id uuid primary key default gen_random_uuid(),
  tabela text not null,
  registro_id uuid,
  acao text not null check (acao in ('INSERT', 'UPDATE', 'DELETE')),
  usuario_id uuid,
  dados_antes jsonb,
  dados_depois jsonb,
  criado_em timestamptz not null default now()
);

comment on table public.log_alteracoes is 'Auditoria automática: toda alteração em candidatos/profiles/opcoes_lista gera uma linha aqui, com quem fez e quando.';

alter table public.log_alteracoes enable row level security;

create policy "log_select_analista"
  on public.log_alteracoes for select
  to authenticated
  using (public.is_analista(auth.uid()));

create or replace function public.registrar_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.log_alteracoes (tabela, registro_id, acao, usuario_id, dados_antes, dados_depois)
  values (
    TG_TABLE_NAME,
    coalesce(NEW.id, OLD.id),
    TG_OP,
    auth.uid(),
    case when TG_OP != 'INSERT' then to_jsonb(OLD) else null end,
    case when TG_OP != 'DELETE' then to_jsonb(NEW) else null end
  );
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists trg_log_candidatos on public.candidatos;
create trigger trg_log_candidatos
  after insert or update or delete on public.candidatos
  for each row execute function public.registrar_log();

drop trigger if exists trg_log_profiles on public.profiles;
create trigger trg_log_profiles
  after insert or update or delete on public.profiles
  for each row execute function public.registrar_log();

drop trigger if exists trg_log_opcoes on public.opcoes_lista;
create trigger trg_log_opcoes
  after insert or update or delete on public.opcoes_lista
  for each row execute function public.registrar_log();

-- ---------------------------------------------------------
-- COMENTÁRIOS POR CAMPO (o analista deixa uma observação
-- visível para quem preenche aquele campo)
-- ---------------------------------------------------------
create table if not exists public.campo_comentarios (
  campo text primary key,
  comentario text not null,
  atualizado_em timestamptz not null default now()
);

comment on table public.campo_comentarios is 'Comentário/instrução opcional do analista, mostrado abaixo do campo correspondente nos formulários.';

alter table public.campo_comentarios enable row level security;

create policy "campo_comentarios_select_publico"
  on public.campo_comentarios for select
  to anon, authenticated
  using (true);

create policy "campo_comentarios_upsert_analista"
  on public.campo_comentarios for insert
  to authenticated
  with check (public.is_analista(auth.uid()));

create policy "campo_comentarios_update_analista"
  on public.campo_comentarios for update
  to authenticated
  using (public.is_analista(auth.uid()));

create policy "campo_comentarios_delete_analista"
  on public.campo_comentarios for delete
  to authenticated
  using (public.is_analista(auth.uid()));

-- ---------------------------------------------------------
-- Rede social (sub-opção de Fonte = "Redes Sociais")
-- ---------------------------------------------------------
alter table public.opcoes_lista drop constraint if exists opcoes_lista_campo_check;
alter table public.opcoes_lista add constraint opcoes_lista_campo_check check (
  campo in (
    'fonte',
    'sexo',
    'disponibilidade_horario_trabalho',
    'disponibilidade_horario_treinamento',
    'disponibilidade_jornada',
    'rede_social'
  )
);

insert into public.opcoes_lista (campo, valor, ordem) values
  ('rede_social', 'Instagram', 1),
  ('rede_social', 'X (antigo Twitter)', 2),
  ('rede_social', 'Facebook', 3),
  ('rede_social', 'LinkedIn', 4)
on conflict (campo, valor) do nothing;

-- =========================================================
-- RODADA 4 — fontes com dependências configuráveis (texto ou
-- lista), log exportável, correções.
-- =========================================================

-- ---------------------------------------------------------
-- Fonte com campo dependente configurável pelo analista:
-- 'nenhum' (ex.: Outros), 'texto' (ex.: Indicação, Funcionário
-- Callink) ou 'lista' (ex.: Redes Sociais).
-- ---------------------------------------------------------
alter table public.opcoes_lista add column if not exists tipo_dependencia text not null default 'nenhum'
  check (tipo_dependencia in ('nenhum', 'texto', 'lista'));
alter table public.opcoes_lista add column if not exists rotulo_dependencia text;
alter table public.opcoes_lista add column if not exists placeholder_dependencia text;

create table if not exists public.opcoes_sublista (
  id uuid primary key default gen_random_uuid(),
  opcao_pai_id uuid not null references public.opcoes_lista (id) on delete cascade,
  valor text not null,
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  unique (opcao_pai_id, valor)
);

comment on table public.opcoes_sublista is 'Opções da sub-lista de uma opção de Fonte com tipo_dependencia = lista (ex.: Instagram/Facebook para Redes Sociais).';

alter table public.opcoes_sublista enable row level security;

create policy "opcoes_sublista_select_publico"
  on public.opcoes_sublista for select
  to anon, authenticated
  using (true);

create policy "opcoes_sublista_insert_analista"
  on public.opcoes_sublista for insert
  to authenticated
  with check (public.is_analista(auth.uid()));

create policy "opcoes_sublista_update_analista"
  on public.opcoes_sublista for update
  to authenticated
  using (public.is_analista(auth.uid()));

create policy "opcoes_sublista_delete_analista"
  on public.opcoes_sublista for delete
  to authenticated
  using (public.is_analista(auth.uid()));

drop trigger if exists trg_log_opcoes_sub on public.opcoes_sublista;
create trigger trg_log_opcoes_sub
  after insert or update or delete on public.opcoes_sublista
  for each row execute function public.registrar_log();

-- Migra a config existente: Indicação e Redes Sociais viram exemplos
-- configurados; "Funcionário Callink" é criado com dependência de texto.
update public.opcoes_lista set tipo_dependencia = 'texto',
  rotulo_dependencia = 'Quem indicou?',
  placeholder_dependencia = 'Nome completo de quem indicou'
  where campo = 'fonte' and valor = 'Indicação';

update public.opcoes_lista set tipo_dependencia = 'lista',
  rotulo_dependencia = 'Qual rede social?'
  where campo = 'fonte' and valor = 'Redes Sociais';

insert into public.opcoes_sublista (opcao_pai_id, valor, ordem)
  select ol.id, r.valor, r.ordem
  from public.opcoes_lista ol, (values ('Instagram',1),('X (antigo Twitter)',2),('Facebook',3),('LinkedIn',4)) as r(valor, ordem)
  where ol.campo = 'fonte' and ol.valor = 'Redes Sociais'
  on conflict (opcao_pai_id, valor) do nothing;

insert into public.opcoes_lista (campo, valor, ordem, tipo_dependencia, rotulo_dependencia, placeholder_dependencia)
  values ('fonte', 'Funcionário Callink', 4, 'texto', 'Qual funcionário indicou?', 'Escreva o nome completo de quem indicou')
  on conflict (campo, valor) do nothing;

-- A antiga lista "rede_social" avulsa não é mais usada (virou opcoes_sublista);
-- mantemos as linhas antigas por segurança, mas o site não lê mais delas.

-- =========================================================
-- RODADA 5 — endereço estruturado (CEP/ViaCEP), acesso ao
-- dashboard para todos os entrevistadores (sem mudança de
-- schema aqui, só de código).
-- =========================================================
alter table public.candidatos add column if not exists logradouro text;
alter table public.candidatos add column if not exists numero text;
alter table public.candidatos add column if not exists complemento text;
alter table public.candidatos add column if not exists estado text;

comment on column public.candidatos.logradouro is 'Preenchido automaticamente via ViaCEP a partir do CEP informado.';
comment on column public.candidatos.numero is 'Número do endereço — único campo de endereço digitado manualmente quando o CEP é encontrado.';

-- =========================================================
-- RODADA 6 — cache de geolocalização (mapa de calor) e metas
-- mensais configuráveis.
-- =========================================================

create table if not exists public.geocache (
  chave text primary key,
  latitude double precision,
  longitude double precision,
  encontrado boolean not null default true,
  criado_em timestamptz not null default now()
);

comment on table public.geocache is 'Cache permanente de geocodificação (cidade/bairro → lat/lng) para o mapa de calor do dashboard, evita repetir consultas à API externa.';

alter table public.geocache enable row level security;

create policy "geocache_select_publico"
  on public.geocache for select
  to anon, authenticated
  using (true);

create policy "geocache_insert_autenticado"
  on public.geocache for insert
  to authenticated
  with check (true);

create table if not exists public.metas (
  id uuid primary key default gen_random_uuid(),
  mes date not null unique,
  meta_contratacoes int not null,
  criado_em timestamptz not null default now()
);

comment on table public.metas is 'Meta mensal de contratações (Entrega Realizada), configurável pelo analista, usada na barra de progresso do dashboard.';

alter table public.metas enable row level security;

create policy "metas_select_publico"
  on public.metas for select
  to authenticated
  using (true);

create policy "metas_insert_analista"
  on public.metas for insert
  to authenticated
  with check (public.is_analista(auth.uid()));

create policy "metas_update_analista"
  on public.metas for update
  to authenticated
  using (public.is_analista(auth.uid()));

-- =========================================================
-- RODADA 7 — títulos de campo customizáveis, comentário do
-- Entrevistador 1, capa do formulário.
-- =========================================================

alter table public.campo_comentarios add column if not exists titulo text;
comment on column public.campo_comentarios.titulo is 'Rótulo customizado do campo (sobrepõe o padrão do sistema) — deixe em branco para usar o rótulo padrão.';

alter table public.candidatos add column if not exists comentario_entrevistador1 text;

create table if not exists public.config_formulario (
  id int primary key default 1,
  capa_url text,
  atualizado_em timestamptz not null default now(),
  constraint somente_uma_linha check (id = 1)
);

comment on table public.config_formulario is 'Configuração global do formulário público do candidato (hoje só a imagem de capa).';

alter table public.config_formulario enable row level security;

create policy "config_formulario_select_publico"
  on public.config_formulario for select
  to anon, authenticated
  using (true);

create policy "config_formulario_upsert_analista"
  on public.config_formulario for insert
  to authenticated
  with check (public.is_analista(auth.uid()));

create policy "config_formulario_update_analista"
  on public.config_formulario for update
  to authenticated
  using (public.is_analista(auth.uid()));

insert into public.config_formulario (id, capa_url) values (1, null) on conflict (id) do nothing;

-- =========================================================
-- RODADA 8 — bucket de armazenamento para a capa do
-- formulário do candidato.
-- =========================================================
insert into storage.buckets (id, name, public)
values ('formulario', 'formulario', true)
on conflict (id) do nothing;

create policy "formulario_select_publico"
  on storage.objects for select
  to public
  using (bucket_id = 'formulario');

create policy "formulario_insert_analista"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'formulario' and public.is_analista(auth.uid()));

create policy "formulario_update_analista"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'formulario' and public.is_analista(auth.uid()));

create policy "formulario_delete_analista"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'formulario' and public.is_analista(auth.uid()));

-- =========================================================
-- RODADA 9 — CRUD completo de metas (faltava delete) e
-- posição do comentário de campo (antes/depois do item).
-- =========================================================
create policy "metas_delete_analista"
  on public.metas for delete
  to authenticated
  using (public.is_analista(auth.uid()));

alter table public.campo_comentarios add column if not exists posicao text not null default 'depois'
  check (posicao in ('antes', 'depois'));
comment on column public.campo_comentarios.posicao is 'Onde o comentário aparece em relação ao campo no formulário: antes ou depois.';


-- =========================================================
-- RODADA 10 — unifica "endereco" em "logradouro" (não faz
-- mais sentido ter os dois campos).
-- =========================================================
update public.candidatos
set logradouro = endereco
where logradouro is null and endereco is not null;

alter table public.candidatos drop column if exists endereco;

-- =========================================================
-- RODADA 11 — cole TUDO isto no SQL Editor do Supabase e rode uma vez.
-- (É seguro rodar mais de uma vez: usa "if not exists"/"drop if exists".)
-- =========================================================

-- 1) CPF só com dígitos (para busca e para checar duplicidade) -----------------
alter table public.candidatos
  add column if not exists cpf_digitos text
  generated always as (regexp_replace(coalesce(cpf, ''), '\D', '', 'g')) stored;
create index if not exists idx_candidatos_cpf_digitos on public.candidatos (cpf_digitos);

-- 2) Colunas novas em candidatos ------------------------------------------------
alter table public.candidatos
  add column if not exists respostas_extras jsonb not null default '{}'::jsonb,
  add column if not exists documentos jsonb not null default '{}'::jsonb,
  add column if not exists produto text,
  add column if not exists resultado_teste text,
  add column if not exists entrevistador1_id uuid,
  add column if not exists entrevistador2_id uuid,
  add column if not exists entrevistador3_id uuid;

-- 3) aprovado_teste deixa de ser calculado fixo (agora segue a regra do analista).
--    Os resultados antigos são preservados pela regra antiga (WPM>=20 e Precisão>=95).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'candidatos'
      and column_name = 'aprovado_teste' and is_generated = 'ALWAYS'
  ) then
    alter table public.candidatos drop column aprovado_teste;
    alter table public.candidatos add column aprovado_teste boolean;
    update public.candidatos
    set aprovado_teste = (wpm >= 20 and precisao >= 95),
        resultado_teste = case when wpm >= 20 and precisao >= 95 then 'Aprovado' else 'Reprovado' end
    where teste_realizado is true and wpm is not null and precisao is not null;
  end if;
end $$;

-- 4) Listas: novas listas "produto" e "documento" ------------------------------
alter table public.opcoes_lista drop constraint if exists opcoes_lista_campo_check;
alter table public.opcoes_lista add constraint opcoes_lista_campo_check check (campo in (
  'fonte', 'sexo', 'disponibilidade_horario_trabalho', 'disponibilidade_horario_treinamento',
  'disponibilidade_jornada', 'rede_social', 'produto', 'documento'
));
insert into public.opcoes_lista (campo, valor, ordem) values
  ('documento', 'CTPS', 1), ('documento', 'CPF', 2), ('documento', 'Histórico escolar', 3)
on conflict (campo, valor) do nothing;

-- 5) Campos personalizados do formulário e campos padrão ocultos ----------------
create table if not exists public.campos_formulario (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  rotulo text not null,
  tipo text not null check (tipo in ('texto', 'numero', 'data', 'sim_nao', 'selecao')),
  opcoes text[] not null default '{}',
  obrigatorio boolean not null default false,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);
create table if not exists public.config_campos (
  campo text primary key,
  oculto boolean not null default false
);
alter table public.campos_formulario enable row level security;
alter table public.config_campos enable row level security;

drop policy if exists "campos_formulario_select" on public.campos_formulario;
drop policy if exists "campos_formulario_insert" on public.campos_formulario;
drop policy if exists "campos_formulario_update" on public.campos_formulario;
drop policy if exists "campos_formulario_delete" on public.campos_formulario;
create policy "campos_formulario_select" on public.campos_formulario for select to anon, authenticated using (true);
create policy "campos_formulario_insert" on public.campos_formulario for insert to authenticated with check (public.is_analista(auth.uid()));
create policy "campos_formulario_update" on public.campos_formulario for update to authenticated using (public.is_analista(auth.uid()));
create policy "campos_formulario_delete" on public.campos_formulario for delete to authenticated using (public.is_analista(auth.uid()));

drop policy if exists "config_campos_select" on public.config_campos;
drop policy if exists "config_campos_insert" on public.config_campos;
drop policy if exists "config_campos_update" on public.config_campos;
drop policy if exists "config_campos_delete" on public.config_campos;
create policy "config_campos_select" on public.config_campos for select to anon, authenticated using (true);
create policy "config_campos_insert" on public.config_campos for insert to authenticated with check (public.is_analista(auth.uid()));
create policy "config_campos_update" on public.config_campos for update to authenticated using (public.is_analista(auth.uid()));
create policy "config_campos_delete" on public.config_campos for delete to authenticated using (public.is_analista(auth.uid()));

-- 6) Regras do teste de digitação (faixas de WPM x Precisão) --------------------
create table if not exists public.regras_teste (
  id uuid primary key default gen_random_uuid(),
  ordem int not null default 0,
  resultado text not null,
  aprova boolean not null default true,
  wpm_min int,
  wpm_max int,
  precisao_min numeric,
  precisao_max numeric,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
alter table public.regras_teste enable row level security;
drop policy if exists "regras_teste_select" on public.regras_teste;
drop policy if exists "regras_teste_insert" on public.regras_teste;
drop policy if exists "regras_teste_update" on public.regras_teste;
drop policy if exists "regras_teste_delete" on public.regras_teste;
create policy "regras_teste_select" on public.regras_teste for select to authenticated using (true);
create policy "regras_teste_insert" on public.regras_teste for insert to authenticated with check (public.is_analista(auth.uid()));
create policy "regras_teste_update" on public.regras_teste for update to authenticated using (public.is_analista(auth.uid()));
create policy "regras_teste_delete" on public.regras_teste for delete to authenticated using (public.is_analista(auth.uid()));

insert into public.regras_teste (ordem, resultado, aprova, wpm_min, wpm_max, precisao_min, precisao_max)
select 1, 'Aprovado', true, 20, 256, 95, 100
where not exists (select 1 from public.regras_teste);

-- 7) Bloqueia o mesmo CPF cadastrado mais de uma vez no mesmo dia ---------------
create or replace function public.bloquear_cpf_duplicado_no_dia()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  dia_br date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if NEW.cpf is null or regexp_replace(NEW.cpf, '\D', '', 'g') = '' then
    return NEW;
  end if;
  -- só vale para cadastros feitos hoje (importações de datas antigas passam)
  if (coalesce(NEW.created_at, now()) at time zone 'America/Sao_Paulo')::date <> dia_br then
    return NEW;
  end if;
  if exists (
    select 1 from public.candidatos c
    where regexp_replace(coalesce(c.cpf, ''), '\D', '', 'g') = regexp_replace(NEW.cpf, '\D', '', 'g')
      and (c.created_at at time zone 'America/Sao_Paulo')::date = dia_br
  ) then
    raise exception 'CPF_DUPLICADO_HOJE';
  end if;
  return NEW;
end;
$$;
drop trigger if exists trg_cpf_duplicado_no_dia on public.candidatos;
create trigger trg_cpf_duplicado_no_dia before insert on public.candidatos
  for each row execute function public.bloquear_cpf_duplicado_no_dia();

-- 8) Sugestões de endereço no preenchimento manual (só nomes de rua/bairro/cidade) -
create or replace function public.sugerir_endereco(p_campo text, p_termo text)
returns table (valor text) language plpgsql stable security definer set search_path = public as $$
begin
  if p_campo not in ('logradouro', 'bairro', 'cidade') then
    return;
  end if;
  if length(coalesce(p_termo, '')) < 2 then
    return;
  end if;
  return query execute format(
    'select distinct %I::text from public.candidatos where %I ilike $1 and %I is not null order by 1 limit 8',
    p_campo, p_campo, p_campo
  ) using upper(p_termo) || '%';
end;
$$;
grant execute on function public.sugerir_endereco(text, text) to anon, authenticated;

-- 9) Quem atendeu cada etapa (para o gráfico por entrevistador) ------------------
create or replace function public.atribuir_entrevistadores()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return NEW;
  end if;
  if (NEW.compareceu_entrevista, NEW.aprovado_entrevista) is distinct from (OLD.compareceu_entrevista, OLD.aprovado_entrevista) then
    NEW.entrevistador1_id := auth.uid();
  end if;
  if (NEW.teste_realizado, NEW.wpm, NEW.precisao) is distinct from (OLD.teste_realizado, OLD.wpm, OLD.precisao) then
    NEW.entrevistador2_id := auth.uid();
  end if;
  if (NEW.contatado_whatsapp, NEW.documentacao_solicitada, NEW.enviou_documentacao, NEW.aprovado_documentacao,
      NEW.compareceu_exame, NEW.aprovado_exame, NEW.compareceu_onboarding, NEW.compareceu_treinamento,
      NEW.compareceu_alo, NEW.decisao_final, NEW.compliance, NEW.produto)
     is distinct from
     (OLD.contatado_whatsapp, OLD.documentacao_solicitada, OLD.enviou_documentacao, OLD.aprovado_documentacao,
      OLD.compareceu_exame, OLD.aprovado_exame, OLD.compareceu_onboarding, OLD.compareceu_treinamento,
      OLD.compareceu_alo, OLD.decisao_final, OLD.compliance, OLD.produto) then
    NEW.entrevistador3_id := auth.uid();
  end if;
  return NEW;
end;
$$;
drop trigger if exists trg_atribuir_entrevistadores on public.candidatos;
create trigger trg_atribuir_entrevistadores before update on public.candidatos
  for each row execute function public.atribuir_entrevistadores();

-- 10) Log completo (antes e depois) para TODAS as tabelas do hub -----------------
alter table public.log_alteracoes add column if not exists registro_chave text;

create or replace function public.registrar_log()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  antigo jsonb;
  novo jsonb;
  chave text;
begin
  antigo := case when TG_OP <> 'INSERT' then to_jsonb(OLD) end;
  novo := case when TG_OP <> 'DELETE' then to_jsonb(NEW) end;
  -- atualização sem mudança real (só updated_at) não vira log
  if TG_OP = 'UPDATE' and (novo - 'updated_at') = (antigo - 'updated_at') then
    return NEW;
  end if;
  chave := coalesce(novo->>'id', antigo->>'id', novo->>'campo', antigo->>'campo', novo->>'mes', antigo->>'mes');
  insert into public.log_alteracoes (tabela, registro_id, registro_chave, acao, usuario_id, dados_antes, dados_depois)
  values (
    TG_TABLE_NAME,
    case when chave ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then chave::uuid end,
    chave, TG_OP, auth.uid(), antigo, novo
  );
  return coalesce(NEW, OLD);
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['campo_comentarios', 'metas', 'config_formulario', 'campos_formulario', 'config_campos', 'regras_teste']
  loop
    execute format('drop trigger if exists trg_log_%1$s on public.%1$I', t);
    execute format('create trigger trg_log_%1$s after insert or update or delete on public.%1$I for each row execute function public.registrar_log()', t);
  end loop;
end $$;
