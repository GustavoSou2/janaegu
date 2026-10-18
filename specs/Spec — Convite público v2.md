# Spec — Convite público

Oct 17, 2026 · @Gustavo Souza

## Objetivo

Apresentar um convite com charme na página `/convite/:token`: contagem regressiva em tempo real, a história do casal, imagem pra baixar/compartilhar no Instagram e link da lista de presentes, além do RSVP (spec própria) e do mural de recados (spec própria).

**Status:** já implementado (`src/pages/Invite.jsx` + `src/components/Countdown.jsx`).

## Quebra SPIDR

| Eixo | Aplicação |
| --- | --- |
| **S**pike | Não aplicável |
| **P**ath | Sem caminhos alternativos — é uma página de leitura, as ações (RSVP, recado) têm spec própria |
| **I**nterface | Landing page mobile-first — funciona 100% só como página web no navegador, sem exigir instalação. Instalável como PWA (manifest + service worker via `vite-plugin-pwa`) como extra opcional, não obrigatório; sem push notification nesta fase |
| **D**ata | `coupleNames`, `weddingDateIso` e `weddingDateLabel` vêm de `settings/event` no Firestore (editáveis pelo painel). **História do casal** e **link da lista de presentes** estão fixos no código (`STORY_TITLE`, `STORY_TEXT`, `GIFT_LIST_URL` em `Invite.jsx`), não no painel `venueAddress` (novo campo em `settings/event`, mesmo local pra todos os convidados) é usado no botão "Adicionar ao Google Agenda". |
| **R**ules | Contagem regressiva atualiza a cada segundo no navegador do convidado; ao chegar a zero mostra "É hoje! 🎉"; imagem pra baixar é um arquivo estático (`/convite-compartilhar.jpg`) que precisa existir em `public/` antes do deploy Botão "Adicionar ao Google Agenda" monta um link `calendar.google.com/calendar/render` com título (nome do casal), início = `weddingDateIso`, fim = início + duração fixa de 5 horas, e local = `venueAddress`; abre em nova aba. |

## Cenários — happy path

1. Convidado abre o link no celular → vê nome do casal, data, contagem regressiva rodando, história, seção de RSVP com o nome da família, imagem pra baixar, link de presentes e mural.
2. Convidado clica em "Baixar imagem" → arquivo salvo no celular, pronto pra postar no Instagram.
3. Convidado clica em "Ver lista de presentes" → abre o link externo em nova aba.
4. Chega o dia 18/12 → contagem regressiva mostra "É hoje! 🎉" no lugar dos números.
5. Convidado usa "Adicionar à Tela de Início" no celular → PWA instalado, abre como app.
6. Convidado clica em "Adicionar ao Google Agenda" → abre nova aba com o evento pré-preenchido no Google Calendar (título, data, horário de início e fim, local), só falta ele salvar.

## Cenários — sad path

1. Token inválido/inexistente → mensagem "Convite não encontrado. Confira o link recebido no WhatsApp.", sem quebrar a página.
2. Arquivo `/convite-compartilhar.jpg` não existe no deploy → botão "Baixar imagem" leva a um link quebrado (404), sem aviso pro convidado.
3. `settings/event` não foi preenchido pelo admin ainda → contagem regressiva recebe `weddingDateIso` undefined, comportamento não tratado explicitamente (risco de exibir data inválida).

## Edge cases

- **Push notification no iPhone**: só funciona se o convidado adicionar o site à tela inicial em iOS 16.4+; aberto só no Safari não recebe push — mas como push está fora de escopo nesta fase, isso vale pra quando for implementado.
- **História e lista de presentes fixas no código**: qualquer mudança de texto exige editar `Invite.jsx` e rodar deploy de novo — não dá pra editar pelo painel admin.
- **Fuso horário da contagem regressiva**: depende do `weddingDateIso` estar com offset correto (`-03:00`); se gravado sem offset, a contagem pode ficar errada pro fuso do convidado.
- Se `venueAddress` não estiver preenchido em `settings/event`, o link do Google Agenda é gerado sem local (campo vazio), sem erro.

## Critérios de aceite

- [ ] Página carrega nome do casal, data e contagem regressiva vindos do painel (`settings/event`)
- [ ] Contagem regressiva atualiza a cada segundo e mostra "É hoje!" quando chega a zero
- [ ] Botão de baixar imagem funciona (arquivo presente em `public/`)
- [ ] Link da lista de presentes abre em nova aba
- [ ] Token inválido mostra mensagem de erro, não tela branca ou crash
- [ ] Página pode ser instalada como PWA ("Adicionar à Tela de Início")
- [ ] Página é totalmente funcional (história, contagem, RSVP, recado, imagem, lista de presentes) só como web, sem o convidado precisar instalar o PWA
- [ ] Botão "Adicionar ao Google Agenda" abre o Google Calendar com título, início, fim (início + 5h) e local preenchidos

## Fora de escopo / Perguntas abertas

- **Fora de escopo nesta fase**: push notifications (lembretes automáticos).
- **Pergunta aberta**: história do casal e link da lista de presentes são fixos no código hoje. Quer que eu mova isso pra `settings/event` (editável pelo painel, sem precisar de deploy pra mudar texto), ou mantém no código?
- **Pergunta aberta**: o que deveria acontecer se o admin ainda não preencheu a data do evento em `settings/event` quando um convidado abre o link — mostrar um placeholder, esconder a contagem, ou bloquear a página?
