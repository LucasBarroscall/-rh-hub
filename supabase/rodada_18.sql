-- =========================================================
-- RODADA 18 — correção/garantia: matrícula, vale, chave M e padrão dos horários.
-- Pode rodar mesmo que a rodada_17 já tenha sido aplicada (ou parcialmente).
-- Cole no SQL Editor do Supabase e rode.
-- =========================================================

-- 1) Colunas do colaborador (uma por vez)
alter table public.candidatos add column if not exists matricula text;
alter table public.candidatos add column if not exists vale text;
alter table public.candidatos add column if not exists vale_via text;
alter table public.candidatos add column if not exists chave_m text;

-- 2) Valores aceitos
alter table public.candidatos drop constraint if exists candidatos_vale_check;
alter table public.candidatos add constraint candidatos_vale_check
  check (vale is null or vale in ('VA', 'VR'));
alter table public.candidatos drop constraint if exists candidatos_vale_via_check;
alter table public.candidatos add constraint candidatos_vale_via_check
  check (vale_via is null or vale_via in ('1ª via', '2ª via'));

-- 3) Só o analista e o Entrevistador 3 alteram esses campos
create or replace function public.proteger_dados_colaborador()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and (NEW.matricula is distinct from OLD.matricula
          or NEW.vale is distinct from OLD.vale
          or NEW.vale_via is distinct from OLD.vale_via
          or NEW.chave_m is distinct from OLD.chave_m)
     and not public.is_analista(auth.uid())
     and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'entrevistador3')
  then
    raise exception 'DADOS_COLABORADOR_SOMENTE_ENTREVISTADOR3';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_proteger_dados_colaborador on public.candidatos;
create trigger trg_proteger_dados_colaborador
  before update on public.candidatos
  for each row execute function public.proteger_dados_colaborador();

-- 4) Padrão dos horários (só as opções; sem frases)
create or replace function public.normalizar_turnos_trabalho(p text)
returns text
language plpgsql
immutable
as $$
declare
  t text;
  tem_manha boolean;
  tem_tarde boolean;
  tem_noite boolean;
  tem_madrugada boolean;
  partes text[] := '{}';
begin
  if p is null or btrim(p) = '' then
    return p;
  end if;
  t := lower(translate(p,
    'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇáàãâäéèêëíìîïóòõôöúùûüç',
    'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'));
  if t like '%total%' or t like '%24 horas%' then
    return 'MANHÃ | TARDE | NOITE | MADRUGADA';
  end if;
  tem_manha := position('manha' in t) > 0;
  tem_tarde := position('tarde' in t) > 0;
  tem_noite := position('noite' in t) > 0;
  tem_madrugada := position('madrugada' in t) > 0;
  if tem_noite and not tem_madrugada and t like '%ate as 06:00 do dia seguinte%' and t not like '%abrangendo%' then
    tem_madrugada := true;
  end if;
  if tem_manha then partes := array_append(partes, 'MANHÃ'); end if;
  if tem_tarde then partes := array_append(partes, 'TARDE'); end if;
  if tem_noite then partes := array_append(partes, 'NOITE'); end if;
  if tem_madrugada then partes := array_append(partes, 'MADRUGADA'); end if;
  if coalesce(array_length(partes, 1), 0) = 0 then
    return upper(p);
  end if;
  return array_to_string(partes, ' | ');
end;
$$;

create or replace function public.normalizar_turnos_treinamento(p text)
returns text
language plpgsql
immutable
as $$
declare
  t text;
  tem_manha boolean;
  tem_tarde boolean;
begin
  if p is null or btrim(p) = '' then
    return p;
  end if;
  t := lower(translate(p,
    'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇáàãâäéèêëíìîïóòõôöúùûüç',
    'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'));
  tem_manha := position('manha' in t) > 0;
  tem_tarde := position('tarde' in t) > 0;
  if (tem_manha and tem_tarde) or t like '%total%' then
    return 'MANHÃ | TARDE';
  elsif tem_manha then
    return 'MANHÃ';
  elsif tem_tarde then
    return 'TARDE';
  end if;
  return upper(p);
end;
$$;

-- 5) Converte o que já existe para o padrão (simples; o log registra as alterações)
update public.candidatos
set disponibilidade_horario_trabalho = public.normalizar_turnos_trabalho(disponibilidade_horario_trabalho),
    disponibilidade_horario_treinamento = public.normalizar_turnos_treinamento(disponibilidade_horario_treinamento)
where disponibilidade_horario_trabalho is distinct from public.normalizar_turnos_trabalho(disponibilidade_horario_trabalho)
   or disponibilidade_horario_treinamento is distinct from public.normalizar_turnos_treinamento(disponibilidade_horario_treinamento);

-- 6) Faz a API enxergar as colunas novas na hora
notify pgrst, 'reload schema';

-- 7) Conferência: deve listar as 4 colunas (matricula, vale, vale_via, chave_m)
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'candidatos'
  and column_name in ('matricula', 'vale', 'vale_via', 'chave_m')
order by column_name;
