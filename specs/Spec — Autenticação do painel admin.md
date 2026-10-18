# Spec — Autenticação do painel admin

Oct 17, 2026 · @Gustavo Souza

## Objetivo

Proteger o painel administrativo (dados das famílias, convidados e configurações do evento) com login, impedindo que qualquer pessoa com o link do site acesse as telas de gestão.

**Status:** já implementado (`src/pages/AdminLogin.jsx` + `src/lib/useAuth.js` + `RequireAuth` em `src/App.jsx`).

## Quebra SPIDR

| Eixo | Aplicação |
| --- | --- |
| **S**pike | Não aplicável |
| **P**ath | Caminho único: e-mail + senha. Sem login social, sem "esqueci minha senha", sem cadastro próprio (ver fora de escopo) |
| **I**nterface | Tela `/admin/login`; redirecionamento automático pra lá sempre que `/admin` ou `/admin/familia/*` são acessadas sem sessão válida |
| **D**ata | Não aplicável — não há variação de dados nesse fluxo |
| **R**ules | Usuário é criado manualmente no Firebase Console (não há tela de cadastro); qualquer conta autenticada tem acesso total ao painel, sem diferença de papel (ver spec do Painel administrativo) |

## Cenários — happy path

1. Admin acessa `/admin/login`, digita e-mail e senha válidos, clica em Entrar → redirecionado pro painel (`/admin`).
2. Admin autenticado acessa `/admin` diretamente (ex.: favorito salvo) → entra direto, sem passar pelo login de novo.
3. Admin clica em "Sair" no painel → sessão encerrada, redirecionado pro login.

## Cenários — sad path

1. E-mail ou senha incorretos → mensagem "E-mail ou senha inválidos.", sem detalhar qual dos dois está errado (evita dar pista pra tentativa de acesso indevido).
2. Usuário não autenticado tenta acessar `/admin` ou `/admin/familia/*` diretamente pela URL → redirecionado pro login antes de ver qualquer dado.
3. Pessoa sem login criado tenta entrar → mesma mensagem genérica de erro (não revela se o e-mail existe ou não).

## Edge cases

- **Carregando estado de autenticação**: enquanto o Firebase ainda não resolveu se há sessão ativa (`user === undefined`), a tela mostra "Carregando…" em vez de decidir errado (nem mostra o painel, nem redireciona precocemente pro login).
- **Esqueci minha senha**: não há fluxo de recuperação — se perder a senha, só resolve direto no Firebase Console.
- **Múltiplas abas abertas**: logout numa aba não fecha a sessão das outras automaticamente até elas recarregarem (comportamento padrão do Firebase Auth).

## Critérios de aceite

- [ ] Login com credenciais corretas dá acesso ao painel
- [ ] Login com credenciais incorretas mostra erro, sem revelar qual campo está errado
- [ ] Acessar `/admin` ou `/admin/familia/*` sem sessão ativa redireciona pro login, sem vazar dados
- [ ] Logout encerra a sessão e redireciona pro login
- [ ] Recarregar a página estando logado mantém a sessão (não pede login de novo)

## Fora de escopo / Perguntas abertas

- **Fora de escopo**: autocadastro de admin, recuperação de senha pela própria tela, múltiplos papéis/permissões.
- **Pergunta aberta**: só você vai ter login, ou seu/sua parceiro(a) também vai precisar de acesso próprio ao painel? (Hoje basta criar mais um usuário no Firebase Console — não muda código.)
