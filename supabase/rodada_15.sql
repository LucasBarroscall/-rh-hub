-- =========================================================
-- RODADA 15 — resultado final (Aprovado(a) - Chat/Voz, Reprovado(a)), exame,
-- cor dos documentos e exibição dos campos adicionais.
-- Cole no SQL Editor do Supabase e rode uma vez (pode repetir sem problema).
-- =========================================================
alter table public.opcoes_lista add column if not exists cor text;
alter table public.campos_formulario add column if not exists exibicao jsonb;
alter table public.candidatos add column if not exists data_aprovacao_exame date;

-- Todo campo adicional do formulário é obrigatório
update public.campos_formulario set obrigatorio = true where obrigatorio is distinct from true;

-- Cores iniciais dos documentos (o analista troca em Administração → Listas → Documentos)
update public.opcoes_lista
set cor = case valor when 'CTPS' then '#2f4c73' when 'CPF' then '#C1594B' when 'Histórico escolar' then '#5C8A6E' end
where campo = 'documento' and cor is null and valor in ('CTPS', 'CPF', 'Histórico escolar');

-- Resultado final: só "Aprovado(a) - Chat/Voz", "Reprovado(a)" ou nulo (Pendente)
create or replace function public.calcular_resultado_final()
returns trigger language plpgsql as $$
begin
  if NEW.aprovado_entrevista is false then
    NEW.resultado_final := 'Reprovado(a)';
  elsif NEW.teste_realizado is true and NEW.aprovado_teste is not null then
    if NEW.aprovado_teste then
      NEW.resultado_final := case
        when NEW.resultado_teste is null or lower(trim(NEW.resultado_teste)) in ('aprovado', 'aprovado(a)') then 'Aprovado(a)'
        else 'Aprovado(a) - ' || trim(NEW.resultado_teste)
      end;
    else
      NEW.resultado_final := 'Reprovado(a)';
    end if;
  else
    NEW.resultado_final := null;
  end if;
  return NEW;
end;
$$;

-- Recalcula o resultado final de quem já existe (sem encher o log de alterações)
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
    when aprovado_entrevista is false then 'Reprovado(a)'
    when teste_realizado is true and aprovado_teste is not null then
      case when aprovado_teste then
        case when resultado_teste is null or lower(trim(resultado_teste)) in ('aprovado', 'aprovado(a)') then 'Aprovado(a)'
             else 'Aprovado(a) - ' || trim(resultado_teste) end
      else 'Reprovado(a)' end
    else null
  end;

  for t in select tgname from pg_trigger
           where tgrelid = 'public.candidatos'::regclass and not tgisinternal and tgname like 'trg_log%'
  loop
    execute format('alter table public.candidatos enable trigger %I', t.tgname);
  end loop;
end $$;
