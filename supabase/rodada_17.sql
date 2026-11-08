-- =========================================================
-- RODADA 17 — padrão dos horários, matrícula / vale / chave M.
-- Cole no SQL Editor do Supabase e rode uma vez (pode repetir sem problema).
-- =========================================================

-- 1) Novas colunas do colaborador
alter table public.candidatos
  add column if not exists matricula text,
  add column if not exists vale text,
  add column if not exists vale_via text,
  add column if not exists chave_m text;

alter table public.candidatos drop constraint if exists candidatos_vale_check;
alter table public.candidatos add constraint candidatos_vale_check check (vale is null or vale in ('VA', 'VR'));
alter table public.candidatos drop constraint if exists candidatos_vale_via_check;
alter table public.candidatos add constraint candidatos_vale_via_check check (vale_via is null or vale_via in ('1ª via', '2ª via'));

-- Só o analista e o Entrevistador 3 alteram matrícula, vale, via e chave M
create or replace function public.proteger_dados_colaborador()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null
     and (NEW.matricula, NEW.vale, NEW.vale_via, NEW.chave_m) is distinct from (OLD.matricula, OLD.vale, OLD.vale_via, OLD.chave_m)
     and coalesce((select role from public.profiles where id = auth.uid()), '') not in ('analista', 'entrevistador3') then
    raise exception 'DADOS_COLABORADOR_SOMENTE_ENTREVISTADOR3';
  end if;
  return NEW;
end;
$$;
drop trigger if exists trg_proteger_dados_colaborador on public.candidatos;
create trigger trg_proteger_dados_colaborador before update on public.candidatos
  for each row execute function public.proteger_dados_colaborador();

-- 2) Padrão dos horários (sem frases/descrições — só as opções)
--    trabalho: MANHÃ | TARDE | NOITE | MADRUGADA (qualquer combinação, sempre nessa ordem)
--    treinamento: MANHÃ | TARDE | MANHÃ | TARDE
create or replace function public.normalizar_turnos_trabalho(p text)
returns text language plpgsql immutable as $$
declare
  t text;
  m boolean; ta boolean; n boolean; ma boolean;
  partes text[] := array[]::text[];
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
  m := position('manha' in t) > 0;
  ta := position('tarde' in t) > 0;
  n := position('noite' in t) > 0;
  ma := position('madrugada' in t) > 0;
  -- frase antiga "Das 18:00 (Noite) até às 06:00 do dia seguinte" = Noite + Madrugada
  if n and not ma and t like '%ate as 06:00 do dia seguinte%' and t not like '%abrangendo%' then
    ma := true;
  end if;
  if m then partes := partes || 'MANHÃ'; end if;
  if ta then partes := partes || 'TARDE'; end if;
  if n then partes := partes || 'NOITE'; end if;
  if ma then partes := partes || 'MADRUGADA'; end if;
  if array_length(partes, 1) is null then
    return upper(p);
  end if;
  return array_to_string(partes, ' | ');
end;
$$;

create or replace function public.normalizar_turnos_treinamento(p text)
returns text language plpgsql immutable as $$
declare
  t text;
  m boolean; ta boolean;
begin
  if p is null or btrim(p) = '' then
    return p;
  end if;
  t := lower(translate(p,
    'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇáàãâäéèêëíìîïóòõôöúùûüç',
    'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'));
  m := position('manha' in t) > 0;
  ta := position('tarde' in t) > 0;
  if (m and ta) or t like '%total%' then
    return 'MANHÃ | TARDE';
  elsif m then
    return 'MANHÃ';
  elsif ta then
    return 'TARDE';
  end if;
  return upper(p);
end;
$$;

-- Converte tudo o que já existe para o padrão novo (sem encher o log de alterações)
do $$
declare t record;
begin
  for t in select tgname from pg_trigger
           where tgrelid = 'public.candidatos'::regclass and not tgisinternal and tgname like 'trg_log%'
  loop
    execute format('alter table public.candidatos disable trigger %I', t.tgname);
  end loop;

  update public.candidatos
  set disponibilidade_horario_trabalho = public.normalizar_turnos_trabalho(disponibilidade_horario_trabalho),
      disponibilidade_horario_treinamento = public.normalizar_turnos_treinamento(disponibilidade_horario_treinamento)
  where disponibilidade_horario_trabalho is distinct from public.normalizar_turnos_trabalho(disponibilidade_horario_trabalho)
     or disponibilidade_horario_treinamento is distinct from public.normalizar_turnos_treinamento(disponibilidade_horario_treinamento);

  for t in select tgname from pg_trigger
           where tgrelid = 'public.candidatos'::regclass and not tgisinternal and tgname like 'trg_log%'
  loop
    execute format('alter table public.candidatos enable trigger %I', t.tgname);
  end loop;
end $$;
