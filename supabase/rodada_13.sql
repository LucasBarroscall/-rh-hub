-- =========================================================
-- RODADA 13 — legendas (horários) dentro dos botões de opção.
-- Cole no SQL Editor do Supabase e rode uma vez (pode repetir sem problema).
-- =========================================================
create table if not exists public.legendas_opcoes (
  campo text not null,
  opcao text not null,
  legenda text not null,
  primary key (campo, opcao)
);
alter table public.legendas_opcoes enable row level security;

drop policy if exists "legendas_opcoes_select" on public.legendas_opcoes;
drop policy if exists "legendas_opcoes_insert" on public.legendas_opcoes;
drop policy if exists "legendas_opcoes_update" on public.legendas_opcoes;
drop policy if exists "legendas_opcoes_delete" on public.legendas_opcoes;
create policy "legendas_opcoes_select" on public.legendas_opcoes for select to anon, authenticated using (true);
create policy "legendas_opcoes_insert" on public.legendas_opcoes for insert to authenticated with check (public.is_analista(auth.uid()));
create policy "legendas_opcoes_update" on public.legendas_opcoes for update to authenticated using (public.is_analista(auth.uid()));
create policy "legendas_opcoes_delete" on public.legendas_opcoes for delete to authenticated using (public.is_analista(auth.uid()));

-- Horários iniciais do treinamento (iguais aos turnos do horário de trabalho).
-- O analista ajusta em Administração → Campos do formulário → Legendas dos botões.
insert into public.legendas_opcoes (campo, opcao, legenda) values
  ('disponibilidade_horario_treinamento', 'Manhã', '06:00 - 12:00'),
  ('disponibilidade_horario_treinamento', 'Tarde', '12:00 - 18:00'),
  ('disponibilidade_horario_treinamento', 'Total', '06:00 - 18:00')
on conflict (campo, opcao) do nothing;

-- Registra no log de alterações (antes/depois)
drop trigger if exists trg_log_legendas_opcoes on public.legendas_opcoes;
create trigger trg_log_legendas_opcoes after insert or update or delete on public.legendas_opcoes
  for each row execute function public.registrar_log();
