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
