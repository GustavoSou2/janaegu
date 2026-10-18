# Confirmação de presença — Janaina & Gustavo (18.12.2026)

PWA de RSVP por família (React + Vite + Firebase) com painel administrativo. Construído a partir de
`prompt.md`, `docs/` e `specs/`.

**Arquitetura de deploy**: o frontend (React/Vite) é publicado na **Vercel**; Firestore e Authentication
continuam no **Firebase** (projeto `janaegu`). **Não há Cloud Functions** — todo o caminho público do
convidado (abrir o convite, responder o RSVP, ler o mural) fala direto com o Firestore pelo SDK do
cliente, e quem garante a segurança são as regras em `firestore.rules`. Isso significa que o projeto roda
inteiro no **plano gratuito (Spark)** do Firebase — sem cartão de crédito, sem depender de crédito
promocional de nenhum tipo.

## Como a segurança funciona sem backend próprio

- O ID de cada documento em `families/{id}` **é o próprio `inviteToken`** (o slug que vai no link do
  WhatsApp). Isso permite que a regra libere `get` público num documento específico — quem tem o link,
  acessa aquela família — mas **nunca libera `list`**, então não dá pra enumerar as outras famílias.
- O convidado só pode alterar os campos do fluxo de RSVP (`status`, `confirmedCount`, `message`,
  `messageApproved`, `declineReason`, `respondedAt`) e só pode mudar `attending` dos convidados — nunca
  nome, telefone, ou qualquer outro campo. `messageApproved` é travado em `false` por regra: só o admin
  autenticado consegue aprovar um recado.
- O mural público lê de uma coleção separada, `publicMessages/{familyId}`, que só guarda nome da família +
  texto aprovado — nunca o documento inteiro da família (que tem telefone, status etc.). Essa coleção é
  escrita pelo painel admin ao aprovar/reprovar (`src/lib/families.js` → `setMessageApproved`); o convidado
  só tem permissão de **apagar** a própria entrada (acontece sozinho quando ele reenvia o RSVP, resetando a
  aprovação).
- `settings/event` (data do casamento, textos, endereço) é de leitura pública — não tem nada sensível.

## O que já está pronto

- Frontend completo: convite público (`/convite/:token`) com abertura animada, contagem regressiva, "o dia",
  RSVP idempotente por pessoa, mural de recados em tempo real, botão de Google Agenda, link de presentes e
  imagem para Instagram.
- Painel admin (`/admin`): login, cadastro/edição de família e convidados (criança/meia, aviso de limite ao
  vivo), dashboard em tempo real (cards no celular, tabela em telas largas), geração de link do WhatsApp,
  moderação de recados, mover família entre lista principal/reserva, exportação CSV, remover família (no
  painel e dentro do próprio formulário de edição).
- Regras do Firestore (`firestore.rules`) cobrindo os três perfis de acesso: convidado público (por token),
  admin autenticado, e o espelho público do mural.

## Status do projeto Firebase "janaegu"

- ✅ **Projeto criado** e identificado em `.env` e `.firebaserc` (projectId `janaegu`).
- ✅ **Firestore já está provisionado** — confirmado via REST API.
- ⚠️ **Authentication ainda não foi habilitado** (a API de login retorna `CONFIGURATION_NOT_FOUND`). Veja o
  passo 1 abaixo.
- ⏳ **As regras do Firestore ainda não foram implantadas** — isso exige o Firebase CLI logado na sua conta
  Google, que eu não consigo fazer por você (fluxo interativo no navegador). Veja o passo 2.
- ⏳ **Frontend ainda não foi publicado na Vercel** — veja o passo 3.

## O que só você consegue fazer (fora deste editor)

1. **Habilitar Authentication**: Console do Firebase > Authentication > "Vamos começar" > ative o provedor
   **E-mail/senha**. Depois, em Authentication > Users > Add user, crie o primeiro login (seu e-mail +
   senha) — não há tela de cadastro no app, é só isso mesmo.
2. **Instalar e logar no Firebase CLI, e publicar as regras** (na sua máquina, não aqui no agente):
   ```
   npm install -g firebase-tools
   firebase login
   firebase use janaegu
   firebase deploy --only firestore:rules
   ```
   Isso não exige plano Blaze nem cartão de crédito — só Firestore e Authentication, que são gratuitos.
3. **Deploy do frontend na Vercel**:
   - Suba este repositório pro GitHub/GitLab (ou rode `vercel` pela CLI direto da pasta do projeto) e
     importe o projeto em vercel.com. O `vercel.json` já define `buildCommand`/`outputDirectory` e o
     rewrite de SPA (todas as rotas caem em `index.html`, senão `/convite/:token` e `/admin/...` dão 404 ao
     recarregar a página).
   - **Environment Variables** (Project Settings > Environment Variables, na Vercel): como o `.env` é
     ignorado pelo git, você precisa recriar lá as mesmas chaves do `.env.example` — `FIREBASE_API_KEY`,
     `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`,
     `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`.
   - Depois que a Vercel gerar o domínio (`algumacoisa.vercel.app` ou um domínio próprio), adicione-o em
     Firebase Console > Authentication > Settings > **Authorized domains**.
4. **Preencher `settings/event`** no Firestore (Console, depois que as regras estiverem publicadas): `coupleNames`,
   `weddingDateIso`, `weddingDateLabel`, `venueName`, `venueAddress`, `giftListUrl`, etc. Os valores default
   estão em `src/lib/settings.js`.
5. **Trocar os placeholders**: `public/convite-compartilhar.jpg` (imagem de compartilhar/Instagram) e os
   ícones em `public/icons/` são retângulos sólidos gerados automaticamente — troque pelas fotos e ícones
   reais antes do deploy. O texto da "nossa história" está fixo em `src/pages/Invite.jsx`
   (`STORY_TITLE`/`STORY_TEXT`).
6. **Rodar e testar localmente** (já dá pra fazer agora, mesmo sem Auth implantado):
   ```
   npm install
   npm run dev
   ```

## Push notifications — cortado por enquanto

A versão anterior tinha lembretes automáticos via Firebase Cloud Messaging, mas isso sempre exige algum
código rodando num servidor (pra disparar os lembretes agendados e validar o registro do token de push) —
e é exatamente a parte que motivou tirar as Cloud Functions do projeto. Como já estava marcado como o item
mais fácil de adiar (o WhatsApp continua sendo o canal garantido), removi por ora. Se mais pra frente
quiser recuperar isso sem voltar a depender do Firebase/Blaze, dá pra fazer com uma Vercel Cron Job + uma
function serverless da própria Vercel chamando a Admin API do FCM com uma service account.

## Perguntas em aberto do `prompt.md` (ainda sem resposta dos noivos)

- Prazo de resposta final (hoje: 20 de novembro, em `src/lib/settings.js`).
- Horário de encerramento da festa / espaço kids.
- Textos definitivos e fotos reais.

## Decisões já tomadas ao implementar (ver `interface/Casamento 18.12.2026 - Telas.dc.html`)

- Convidado da lista reserva vê um aviso no convite, mas desligado por padrão
  (`settings.waitlistNoticeToGuest`).
- A tela de RSVP permite recado mesmo quando a família recusa totalmente (`settings.declineAllowsMessage`),
  deixando claro que ninguém precisa se justificar.
- Lista reserva conta convidados **cadastrados**, não confirmados; promoção é sempre manual.
- Telefone é validado em formato DDI+DDD antes de salvar (`src/lib/phone.js`).
- Dois convidados com nome idêntico na mesma família continuam sendo uma limitação conhecida (sem
  mitigação) — evite repetir nomes exatos.
