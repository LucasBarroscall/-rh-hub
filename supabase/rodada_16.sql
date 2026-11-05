-- =========================================================
-- RODADA 16 — Compliance (importação do retorno + proteção) e modelo da planilha.
-- Cole no SQL Editor do Supabase e rode uma vez (pode repetir sem problema).
-- =========================================================
alter table public.candidatos
  add column if not exists compliance_dados jsonb,
  add column if not exists compliance_em timestamptz;

-- Só o analista altera o compliance (Entrevistador 3 apenas visualiza)
create or replace function public.proteger_compliance()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null
     and (NEW.compliance is distinct from OLD.compliance or NEW.compliance_dados is distinct from OLD.compliance_dados)
     and not public.is_analista(auth.uid()) then
    raise exception 'COMPLIANCE_SOMENTE_ANALISTA';
  end if;
  return NEW;
end;
$$;
drop trigger if exists trg_proteger_compliance on public.candidatos;
create trigger trg_proteger_compliance before update on public.candidatos
  for each row execute function public.proteger_compliance();

-- A atribuição de "quem atendeu a etapa 3" deixa de olhar o compliance (agora é importado pelo analista)
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
      NEW.compareceu_alo, NEW.decisao_final, NEW.produto)
     is distinct from
     (OLD.contatado_whatsapp, OLD.documentacao_solicitada, OLD.enviou_documentacao, OLD.aprovado_documentacao,
      OLD.compareceu_exame, OLD.aprovado_exame, OLD.compareceu_onboarding, OLD.compareceu_treinamento,
      OLD.compareceu_alo, OLD.decisao_final, OLD.produto) then
    NEW.entrevistador3_id := auth.uid();
  end if;
  return NEW;
end;
$$;

-- Importação do retorno do Compliance: grava em TODOS os cadastros do mesmo CPF (qualquer data).
-- Só o analista executa. Cada linha traz status OK (Aprovado) ou NOK (Reprovado); outros valores são ignorados.
create or replace function public.importar_compliance(p_linhas jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  l jsonb;
  v_cpf text;
  v_status text;
  v_n int;
  v_total int := 0;
  v_nao jsonb := '[]'::jsonb;
begin
  if not public.is_analista(auth.uid()) then
    raise exception 'SEM_PERMISSAO';
  end if;
  for l in select value from jsonb_array_elements(p_linhas)
  loop
    v_status := upper(coalesce(l->>'status', ''));
    if v_status not in ('OK', 'NOK') then
      continue;
    end if;
    v_cpf := regexp_replace(coalesce(l->>'cpf', ''), '\D', '', 'g');
    if length(v_cpf) = 0 or length(v_cpf) > 11 then
      v_nao := v_nao || to_jsonb(coalesce(l->>'cpf', ''));
      continue;
    end if;
    v_cpf := lpad(v_cpf, 11, '0');
    update public.candidatos
    set compliance = case v_status when 'OK' then 'Aprovado' else 'Reprovado' end,
        compliance_dados = jsonb_build_object(
          'lote', l->>'lote',
          'data_importacao', l->>'data_importacao',
          'data_consulta', l->>'data_consulta',
          'juridico', l->>'juridico',
          'ok_nok_compliance', l->>'ok_nok_compliance',
          'status_final', v_status
        ),
        compliance_em = now()
    where cpf_digitos = v_cpf;
    get diagnostics v_n = row_count;
    if v_n = 0 then
      v_nao := v_nao || to_jsonb(v_cpf);
    else
      v_total := v_total + v_n;
    end if;
  end loop;
  return jsonb_build_object('candidatos_atualizados', v_total, 'nao_encontrados', v_nao);
end;
$$;
grant execute on function public.importar_compliance(jsonb) to authenticated;

-- Espaço (privado) onde fica salvo o modelo da planilha do Compliance — só o analista acessa
insert into storage.buckets (id, name, public)
values ('modelos', 'modelos', false)
on conflict (id) do nothing;

drop policy if exists "modelos_select_analista" on storage.objects;
drop policy if exists "modelos_insert_analista" on storage.objects;
drop policy if exists "modelos_update_analista" on storage.objects;
drop policy if exists "modelos_delete_analista" on storage.objects;
create policy "modelos_select_analista" on storage.objects for select to authenticated
  using (bucket_id = 'modelos' and public.is_analista(auth.uid()));
create policy "modelos_insert_analista" on storage.objects for insert to authenticated
  with check (bucket_id = 'modelos' and public.is_analista(auth.uid()));
create policy "modelos_update_analista" on storage.objects for update to authenticated
  using (bucket_id = 'modelos' and public.is_analista(auth.uid()));
create policy "modelos_delete_analista" on storage.objects for delete to authenticated
  using (bucket_id = 'modelos' and public.is_analista(auth.uid()));
