// O Supabase/PostgREST devolve no máximo ~1000 linhas por consulta. Esta função
// pagina sozinha (de 1000 em 1000) até trazer tudo — usada em todo lugar que
// precisa da base inteira (dashboard, filas dos entrevistadores, exportações).
export async function buscarTodos(query, tamanho = 1000) {
  let todos = []
  for (let desde = 0; ; desde += tamanho) {
    const { data, error } = await query.range(desde, desde + tamanho - 1)
    if (error) return { data: null, error }
    todos = todos.concat(data || [])
    if (!data || data.length < tamanho) break
  }
  return { data: todos, error: null }
}
