-- =========================================================
-- RODADA 14 — resultado final (Voz/Chat/Reprovado) e repetição de resultado.
-- Cole no SQL Editor do Supabase e rode uma vez (pode repetir sem problema).
-- =========================================================
alter table public.candidatos
  add column if not exists resultado_final text,
  add column if not exists resultado_repetido_de uuid,
  add column if not exists resultado_repetido_em timestamptz;

-- Resultado final = entrevista + teste:
--   reprovado na entrevista            => Reprovado (o resultado do teste NÃO é apagado)
--   aprovado na entrevista e no teste  => resultado da regra do teste (Chat, Voz…)
--   aprovado na entrevista, reprovado no teste => Reprovado
--   sem os dois resultados ainda       => nulo (Pendente)
create or replace function public.calcular_resultado_final()
returns trigger language plpgsql as $$
begin
  if NEW.aprovado_entrevista is false then
    NEW.resultado_final := 'Reprovado';
  elsif NEW.teste_realizado is true and NEW.aprovado_teste is not null then
    NEW.resultado_final := case when NEW.aprovado_teste then coalesce(NEW.resultado_teste, 'Aprovado') else 'Reprovado' end;
  else
    NEW.resultado_final := null;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_resultado_final on public.candidatos;
create trigger trg_resultado_final before insert or update on public.candidatos
  for each row execute function public.calcular_resultado_final();

create index if not exists idx_candidatos_resultado_final on public.candidatos (resultado_final);

-- Preenche o resultado final dos candidatos que já existem (sem encher o log de alterações).
do $$
declare t record;
begin
  for t in select tgname from pg_trigger
           where tgrelid = 'public.candidatos'::regclass and not tgisinternal and tgname like 'trg_log%'
  loop
    execute format('alter table public.candidatos disable trigger %I', t.tgname);
  end loop;

  update public.candidatos
  set resultado_final = case
    when aprovado_entrevista is false then 'Reprovado'
    when teste_realizado is true and aprovado_teste is not null
      then case when aprovado_teste then coalesce(resultado_teste, 'Aprovado') else 'Reprovado' end
    else null
  end;

  for t in select tgname from pg_trigger
           where tgrelid = 'public.candidatos'::regclass and not tgisinternal and tgname like 'trg_log%'
  loop
    execute format('alter table public.candidatos enable trigger %I', t.tgname);
  end loop;
end $$;
