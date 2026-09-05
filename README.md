# Hub RH · People Analytics

Sistema completo de controle do funil de recrutamento: formulário público do
candidato, páginas para os 3 entrevistadores, dashboard com filtros cruzados e
painel de administração (CRUD + permissões). Frontend em React (Vite), banco
de dados no Supabase.

## 1. Criar o projeto no Supabase

1. Crie uma conta gratuita em [supabase.com](https://supabase.com) e clique em **New Project**.
2. Escolha uma senha para o banco e a região mais próxima (ex.: São Paulo).
3. Quando o projeto terminar de provisionar, vá em **SQL Editor**, cole todo o
   conteúdo do arquivo `supabase/schema.sql` deste projeto e clique em **Run**.
   Isso cria as tabelas `candidatos` e `profiles`, os cálculos automáticos de
   idade/aprovação e as regras de segurança (RLS).
4. Vá em **Project Settings → API** e copie:
   - **Project URL** → vai em `VITE_SUPABASE_URL`
   - **anon public key** → vai em `VITE_SUPABASE_ANON_KEY`

## 2. Criar o primeiro usuário (analista)

1. No painel Supabase, vá em **Authentication → Users → Add user** e crie um
   usuário com e-mail e senha (esse será o login do analista de People
   Analytics).
2. Copie o **UUID** desse usuário (aparece na lista de usuários).
3. Volte ao **SQL Editor** e rode, trocando os valores:
   ```sql
   insert into public.profiles (id, nome, email, role)
   values ('COLE-O-UUID-AQUI', 'Seu Nome', 'seu-email@empresa.com', 'analista');
   ```
4. Repita o processo para cada entrevistador, usando `role` igual a
   `entrevistador1`, `entrevistador2` ou `entrevistador3`. Depois do primeiro
   analista existir, você também pode gerenciar os papéis pela própria tela
   **Administração → Acessos e permissões** do sistema (mas a criação do
   *login* em si sempre precisa ser feita no painel do Supabase, por segurança).

## 3. Rodar localmente

Requer [Node.js](https://nodejs.org) 18+.

```bash
cd rh-hub
cp .env.example .env
# edite o .env com a URL e a anon key copiadas no passo 1
npm install
npm run dev
```

Acesse `http://localhost:5173`. As rotas são:

| Rota | Quem acessa | O que faz |
|---|---|---|
| `/cadastro` | Público (QR code) | Formulário do candidato |
| `/login` | Todos | Login |
| `/` | Analista | Dashboard |
| `/entrevistador1` | Entrevistador 1 + analista | Entrevista |
| `/entrevistador2` | Entrevistador 2 + analista | Teste de digitação |
| `/entrevistador3` | Entrevistador 3 + analista | Decisão final |
| `/admin` | Analista | CRUD e permissões |

Gere o QR code apontando para `SEU-DOMINIO/cadastro` (qualquer gerador de QR
code gratuito, como qrcode-monkey.com, resolve).

## 4. Publicar de graça (Vercel)

1. Suba esta pasta para um repositório no GitHub.
2. Crie uma conta gratuita em [vercel.com](https://vercel.com) e clique em
   **Add New → Project**, selecionando o repositório.
3. Em **Environment Variables**, adicione `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY` com os mesmos valores do seu `.env`.
4. Clique em **Deploy**. Em ~1 minuto o site estará no ar em um domínio
   gratuito `*.vercel.app`.

(Netlify funciona de forma equivalente: *New site from Git* → configurar as
mesmas variáveis de ambiente → *Deploy*.)

## Regras de negócio já implementadas

- **Data da entrevista**: preenchida automaticamente na hora do cadastro (não depende mais do candidato).
- **Idade**: calculada automaticamente a partir da data de nascimento (coluna gerada no banco).
- **Aprovação no teste de digitação**: automática — WPM ≥ 20 **e** Precisão ≥ 95%.
- **Fila de cada entrevistador**: mostra só quem está pronto para aquela etapa, na ordem em que chegou.
- **Alerta de comportamento** (Entrevistador 2): fica visível com destaque para o Entrevistador 3 na hora da decisão.
- **Dashboard**: KPIs (total, taxa de aprovação, WPM médio, precisão média), funil, origem, sexo, faixa etária, cidade, evolução de WPM/precisão no tempo e candidatos por dia — todos os gráficos clicáveis funcionam como filtros cruzados.
- **Permissões**: cada entrevistador só acessa a própria página; o analista acessa tudo, incluindo o CRUD completo da base e a gestão de papéis de acesso.

## Aparência

Cores da marca (`tailwind.config.js`): principal `#2f4c73`, secundária
`#D4D943`, mais `#30cff2`, `#2a438c` e `#a64170`, fundo branco. Tem modo
escuro completo — o botão de sol/lua fica no topo do menu lateral, e a
preferência fica salva no navegador de cada pessoa.

## Listas editáveis (Fonte, Sexo, disponibilidades)

As opções desses campos do formulário do candidato vêm do banco (tabela
`opcoes_lista`), não do código. Para adicionar/remover uma opção, use
**Administração → Listas** — o site reflete a mudança na hora.

## Validações do formulário

- **RG**: aceita só números.
- **CPF**: ganha os pontos e o traço automaticamente enquanto você digita, e o
  dígito verificador é validado de verdade antes de enviar.
- **Telefone**: formatado sozinho no padrão `(00) 0 0000-0000`.
- **E-mail**: campo `type="email"` do navegador.

## Sequência oficial do funil

Cadastro → Entrevista → Teste de Digitação → Contato no WhatsApp →
Documentação Solicitada → Documentação Enviada → Documentação Aprovada →
Data do Exame (fica "Exame atrasado" se passar da data sem comparecimento) →
Compareceu no Exame → Aprovado no Exame → Data do Onboarding → Onboarding →
Data do Treinamento → Treinamento → Data do Alô → Alô → **Entrega Realizada**.

Essa sequência mora em `src/lib/status.js` — é a fonte única usada pelo
status exibido nas listas, pelo funil do dashboard e pelo tempo entre etapas.

## Permissões hierárquicas

- Entrevistador 1: só a Etapa 1
- Entrevistador 2: Etapas 1 e 2
- Entrevistador 3: Etapas 1, 2 e 3
- Analista: tudo, incluindo Administração (Alô e entrega final ficam com o analista)

## Log de alterações

Toda alteração em candidatos, acessos e listas é registrada automaticamente
(quem, quando, antes/depois) via trigger no banco — visível em
**Administração → Log de alterações**. Não precisa de nenhum código a mais
no site para isso continuar funcionando.

## CPF duplicado

Ao abrir um candidato em qualquer etapa (1, 2 ou 3), o sistema verifica se o
CPF já apareceu antes e mostra um alerta com o histórico. É preciso
confirmar "seguir normalmente" ou "repetir resultado mais recente" para
continuar.

## Fonte com campos dependentes (configurável)

Em Administração → Listas → Fonte, clique no lápis de qualquer opção para
escolher: nenhum campo extra (como "Outros"), campo de texto livre (como
"Indicação" ou "Funcionário Callink") ou uma lista de opções (como "Redes
Sociais" → Instagram/X/Facebook/LinkedIn, que você também gerencia ali
dentro). O formulário do candidato se adapta sozinho.

## Endereço automático por CEP

O formulário consulta o [ViaCEP](https://viacep.com.br) assim que o CEP é
digitado (8 dígitos) ou ao sair do campo. Rua, Bairro, Cidade e Estado vêm
travados (somente leitura) quando o CEP é encontrado — só Número e
Complemento ficam livres. Se o CEP não existir, os campos destravam para
preenchimento manual.

## Padronização dos dados

Nome, nome da mãe, e endereço são normalizados automaticamente ao sair do
campo: maiúsculas, sem acento, sem pontuação — igual um MAIÚSCULA()+ARRUMAR()
do Excel. Os horários de trabalho/treinamento também são "limpos": se as
opções escolhidas cobrem todos os períodos possíveis, vira "Total"; senão,
os períodos ficam únicos e sem repetição (ex.: "Manhã | Tarde | Noite").

## Observação sobre os campos

O campo **Sexo** foi adicionado ao formulário do candidato porque o dashboard
pedido inclui "separação por sexo" e esse dado não existia na planilha atual.
A quebra "por região" do dashboard usa a **Cidade** informada pelo candidato.
