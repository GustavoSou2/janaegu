# Confirmação de presença — Janaina & Gustavo (18.12.2026)

PWA de RSVP por família (React + Vite + Firebase) com painel administrativo. Construído a partir de
`prompt.md`, `docs/` e `specs/`.

**Arquitetura de deploy**: o frontend (React/Vite) é publicado na **Vercel**; Firestore, Authentication e
as Cloud Functions continuam no **Firebase** (projeto `janaegu`). O app fala com as Functions por uma URL
absoluta (`FUNCTIONS_BASE_URL`), não por rewrites de hosting — por isso não usamos mais o Firebase
Hosting (removido do `firebase.json`).

## O que já está pronto

- Frontend completo: convite público (`/convite/:token`) com abertura animada, contagem regressiva, "o dia",
  RSVP idempotente por pessoa, mural de recados, botão de Google Agenda, link de presentes e imagem para
  Instagram.
- Painel admin (`/admin`): login, cadastro/edição de família e convidados (criança/meia, aviso de limite ao
  vivo), dashboard em tempo real, geração de link do WhatsApp, moderação de recados, mover família entre
  lista principal/reserva, exportação CSV.
- Cloud Functions (`functions/index.js`): `getInvite`, `submitRsvp`, `getMessages`, `registerPushToken`,
  `sendReminders` (lembrete agendado).
- Regras do Firestore (`firestore.rules`): nenhuma leitura/escrita pública em `families/**` (só via Cloud
  Functions com Admin SDK, ou admin autenticado no painel); `settings/event` com leitura pública.

## Status do projeto Firebase "janaegu"

- ✅ **Projeto criado** e já identificado em `.env`, `.firebaserc` e `public/firebase-messaging-sw.js`
  (projectId `janaegu`).
- ✅ **Firestore já está provisionado** (banco "(default)" responde e existe) — confirmado via REST API.
- ⚠️ **Authentication ainda não foi habilitado** (a API de login retorna `CONFIGURATION_NOT_FOUND`, ou seja,
  nenhum provedor foi ligado ainda). Veja o passo 1 abaixo.
- ⏳ **Cloud Functions e as regras do Firestore ainda não foram implantadas** — isso exige o Firebase CLI
  logado na sua conta Google, que eu não consigo fazer por você (fluxo interativo no navegador). Veja os
  passos 3–4.
- ⏳ **Frontend ainda não foi publicado na Vercel** — veja o passo 5.

## O que só você consegue fazer (fora deste editor)

1. **Habilitar Authentication**: Console do Firebase > Authentication > "Vamos começar" > ative o provedor
   **E-mail/senha**. Depois, em Authentication > Users > Add user, crie o primeiro login (seu e-mail +
   senha) — não há tela de cadastro no app, é só isso mesmo.
2. **Plano Blaze**: necessário para publicar qualquer Cloud Function (inclusive `sendReminders`, que é
   agendada). Se quiser cortar o lembrete automático por enquanto, é só não fazer deploy dessa function —
   o WhatsApp continua sendo o canal garantido (ver `docs/Plano de Arquitetura...md`).
3. **Instalar e logar no Firebase CLI** (na sua máquina, não aqui no agente):
   ```
   npm install -g firebase-tools
   firebase login
   firebase use janaegu
   ```
4. **Deploy das regras e das functions** (sem hosting — isso agora é com a Vercel):
   ```
   cd functions && npm install && cd ..
   firebase deploy --only functions,firestore:rules
   ```
   Depois do primeiro deploy, confira a URL real das functions no Console (Functions) e ajuste
   `FUNCTIONS_BASE_URL` se for diferente de `https://us-central1-janaegu.cloudfunctions.net`.
5. **Deploy do frontend na Vercel**:
   - Suba este repositório pro GitHub/GitLab (ou rode `vercel` pela CLI direto da pasta do projeto) e
     importe o projeto em vercel.com. O `vercel.json` já define `buildCommand`/`outputDirectory` e o
     rewrite de SPA (todas as rotas caem em `index.html`, senão `/convite/:token` e `/admin/...` dão 404 ao
     recarregar a página).
   - **Environment Variables** (Project Settings > Environment Variables, na Vercel): como o `.env` é
     ignorado pelo git, você precisa recriar lá as mesmas chaves do `.env.example` —
     `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`,
     `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`,
     `FIREBASE_VAPID_KEY` (se for usar push) e `FUNCTIONS_BASE_URL`.
   - Depois que a Vercel gerar o domínio (`algumacoisa.vercel.app` ou um domínio próprio), adicione-o em
     Firebase Console > Authentication > Settings > **Authorized domains** — evita bloqueio em qualquer
     fluxo de auth que dependa de domínio autorizado.
   - As Cloud Functions já aceitam chamadas de qualquer origem (CORS liberado em `functions/index.js`), então
     não precisa configurar nada extra do lado do Firebase pra isso funcionar.
6. **Chave VAPID** (só se for usar push): Console > Cloud Messaging > Certificados push na Web > gerar par
   de chaves, colar em `FIREBASE_VAPID_KEY` no `.env` (e na Vercel, passo 5).
7. **Preencher `settings/event`** no Firestore (Console, depois que Firestore estiver com as regras
   publicadas — ou direto pelo painel admin, se você expuser um formulário para isso): `coupleNames`,
   `weddingDateIso`, `weddingDateLabel`, `venueName`, `venueAddress`, `giftListUrl`, etc. Os valores
   default estão em `src/lib/settings.js`.
8. **Trocar os placeholders**: `public/convite-compartilhar.jpg` (imagem de compartilhar/Instagram) e os
   ícones em `public/icons/` são retângulos sólidos gerados automaticamente — troque pelas fotos e ícones
   reais antes do deploy. O texto da "nossa história" está fixo em `src/pages/Invite.jsx`
   (`STORY_TITLE`/`STORY_TEXT`).
9. **Rodar e testar localmente** (já dá pra fazer agora, mesmo sem Auth/Functions implantados):
   ```
   npm install
   npm run dev
   ```

## Perguntas em aberto do `prompt.md` (ainda sem resposta dos noivos)

- Prazo de resposta final (hoje: 20 de novembro, em `src/lib/settings.js`).
- Horário de encerramento da festa / espaço kids.
- Textos definitivos e fotos reais.

## Decisões já tomadas ao implementar (ver `interface/Casamento 18.12.2026 - Telas.dc.html`)

- Convidado da lista reserva vê um aviso no convite, mas desligado por padrão
  (`settings.waitlistNoticeToGuest`).
- A tela de RSVP permite recado mesmo quando a família recusa totalmente (`settings.declineAllowsMessage`).
- Lista reserva conta convidados **cadastrados**, não confirmados; promoção é sempre manual.
- Telefone é validado em formato DDI+DDD antes de salvar (`src/lib/phone.js`).
- Dois convidados com nome idêntico na mesma família continuam sendo uma limitação conhecida (sem
  mitigação) — evite repetir nomes exatos.
