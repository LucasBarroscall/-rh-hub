-- =========================================================
-- RODADA 12 — campos personalizados completos (cole no SQL Editor e rode).
-- =========================================================

-- comentário/título de campo podem existir sozinhos (um sem o outro)
alter table public.campo_comentarios alter column comentario drop not null;

-- novos tipos de campo + condição de visibilidade + texto de exemplo
alter table public.campos_formulario drop constraint if exists campos_formulario_tipo_check;
alter table public.campos_formulario add constraint campos_formulario_tipo_check
  check (tipo in ('texto', 'texto_longo', 'numero', 'data', 'sim_nao', 'selecao', 'lista', 'multipla'));
alter table public.campos_formulario add column if not exists condicao jsonb;
alter table public.campos_formulario add column if not exists placeholder text;
