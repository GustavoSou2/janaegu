# Prompt de desenvolvimento — App de Confirmação de Casamento (Janaina & Gustavo)

> Cole este prompt inteiro no seu agente de código (Claude Code, Cursor, etc.) junto com os arquivos de spec e os dois protótipos `.dc.html` do projeto. Ele descreve o produto, o estado já prototipado e o que falta construir.

---

## Contexto

Construa um PWA de confirmação de presença (RSVP) para o casamento de **Janaina e Gustavo**, em **18/12/2026 às 20h**, no **Espaço Roma Eventos** — R. Adolfina Dagnone, 80, Chácara Recanto da Colina Verde, Campinas, SP, 13057-552.

O produto é organizado **por família**: cada família recebe um link pessoal por WhatsApp (`/convite/{token}`), abre o convite e confirma a presença de cada membro — a família inteira ou só parte dela. Existe também um painel administrativo privado para os noivos cadastrarem famílias, gerarem os links e acompanharem as respostas em tempo real.

**Mobile-first e sem instalação obrigatória.** A maioria dos convidados abre o link direto do WhatsApp, no navegador. Todo o fluxo (abertura, convite, confirmação) precisa funcionar 100% como página web mobile. O "Adicionar à Tela de Início" é extra opcional (útil para push no iOS 16.4+), nunca requisito.

## Stack

| Camada | Ferramenta |
| --- | --- |
| Frontend | React + Vite, PWA (`vite-plugin-pwa`: manifest + service worker) |
| Banco | Cloud Firestore |
| Auth | Firebase Auth (só painel admin) |
| Hospedagem | Firebase Hosting |
| Backend leve | Cloud Functions (validar RSVP, moderar recados, disparar push) |
| Push | Firebase Cloud Messaging |

## Modelo de dados (Firestore)

**`families/{familyId}`**
- `familyName: string` — ex. "Família Ribeiro"
- `inviteToken: string` — slug único do link (`/convite/abc123`)
- `phone: string` — DDI + DDD + número, validado no formato `wa.me` antes de salvar
- `status: 'pendente' | 'parcial' | 'confirmado' | 'recusado'` — *parcial* = só alguns responderam; só vira *confirmado* quando todos os membros responderam
- `isWaitlist: bool` — lista reserva (ver regra abaixo)
- `declineReason: string?`
- `message: string?` — recado para o mural
- `messageApproved: bool` — recado só aparece publicamente após moderação
- `createdAt / respondedAt: timestamp`

**`families/{familyId}/guests/{guestId}`**
- `name: string`
- `isChild: bool`
- `isHalf: bool` — criança que conta como 0,5 no limite (decisão manual do admin, só habilitada quando `isChild`)
- `attending: bool | null` — `null` = ainda não respondeu

**`pushSubscriptions`**: token do dispositivo vinculado a `familyId`.

**`settings/event`** (documento único): data do casamento, textos do convite, link da lista de presentes, URL da imagem de compartilhamento, prazo de resposta.

## Regras de negócio

**Idempotência do RSVP.** O RSVP sempre faz `update`/`merge` no documento existente da família (localizado por `inviteToken`), nunca `add`/`create`. Clicar duas vezes, dar refresh no meio ou reenviar resulta no mesmo documento com os mesmos dados. O botão desabilita ao clicar e dá confirmação visual imediata. O token só dá acesso à própria família.

**Limite e lista reserva.** Limite de 100 convidados por peso: adulto = 1, criança marcada como `isHalf` = 0,5. Ao salvar uma família que ultrapasse o limite, ela é marcada `isWaitlist = true` automaticamente, mas **recebe o link normalmente**. A promoção da reserva para a lista principal é **sempre manual** — nada é promovido sozinho quando uma vaga abre. O painel mostra a conta (peso atual + peso da família = total vs. limite) antes de salvar.

**Edição de convidados.** Ao editar uma família, os convidados são casados por **nome exato**: nome igual preserva a resposta, nome novo entra com `attending: null`, nome removido apaga o registro. Bloqueie dois convidados com o mesmo nome na mesma família.

**Moderação.** Recados entram com `messageApproved: false` e só aparecem no mural público depois de aprovados no painel.

## Telas já prototipadas (use como referência visual e de comportamento)

Os dois arquivos `.dc.html` do projeto são protótipos funcionais, mobile-first, com os tokens visuais aplicados. Reproduza layout, copy e interações deles.

### 1. `Convite - Experiência.dc.html` — fluxo do convidado

**Abertura (~17s, pulável).** Ao abrir o link, antes de qualquer informação, roda uma sequência de cinco frases em tela cheia sobre fundo preto. As frases ficam **todas empilhadas na mesma posição** e se atravessam: a que sai deriva 34px para cima com `blur(5px)` e `scale(1.03)`, a que entra sobe 34px de baixo saindo do blur — transições de 1500ms (opacidade/filtro) e 1800ms (transform), com 3,4s por frase. Não é troca de slides, é dissolve contínuo. Há pontinhos de progresso e um botão "pular abertura". Respeite `prefers-reduced-motion`: pule a abertura inteira.

Frases, nesta ordem e verbatim:
```
Está chegando o grande dia
E se este convite chegou até você
É porque vocês são especiais pra gente
Então queremos vocês lá
Fazendo parte desse dia com a gente
```

**Hero.** Foto do casal em preto e branco com parallax suave (fator 0.16 desktop, 0.08 abaixo de 640px, desligado em reduced-motion), gradiente escuro, nomes "Janaina e Gustavo", data e local, e um indicador "role" pulsando.

**Contagem regressiva.** Dias / horas / min / seg até 18/12/2026 20h, em células de grade com números tabulares, atualizando a cada segundo.

**O dia.** Quatro células: Cerimônia (20h00, "chegue 30 minutos antes"), Recepção ("logo após"), Local (Espaço Roma Eventos, Campinas), Traje (esporte fino). Abaixo: foto do espaço em preto e branco, endereço completo e botão "Abrir no mapa" apontando para a busca do Google Maps.

**Confirmação** (bloco preto, entra com animação própria quando aparece na tela):
- Dois atalhos: "Vamos todos" e "Ninguém poderá ir", que resolvem a família inteira de uma vez
- Lista pessoa a pessoa com par de botões "Vai / Não vai" (alvo mínimo de 44px), estado visual claro por pessoa
- Campo opcional de recado para os noivos
- Botão de envio **bloqueado enquanto faltar alguém**, com rótulo dizendo quantos faltam ("Falta responder 2 de 4")
- Após enviar: título conforme o resultado (todos / parcial / ninguém), resumo nome a nome com status, e botão "Alterar resposta"

**Fechamento.** Foto grande em preto e branco com a assinatura do casal.

Ainda falta, nesta tela: mural de recados aprovados, imagem para baixar/postar no Instagram, link da lista de presentes, aviso "adicionar à tela de início" e aviso de lista reserva ao convidado (hoje é um toggle no protótipo, desligado por padrão).

### 2. `Casamento 18.12.2026 - Telas.dc.html` — painel admin

Três telas navegáveis por abas:
- **Login** — e-mail e senha, Firebase Auth; sessão expirada volta para cá antes de qualquer dado aparecer
- **Cadastro de família** — nome da família, telefone validado (DDI+DDD), lista editável de convidados com marcação de criança e de "meia" (0,5), adicionar/remover, e o aviso ao vivo da conta do limite
- **Lista reserva** — números do topo (98/100, confirmados, crianças, reserva), barra de ocupação, tabela de famílias com status, contagem, lista (principal/reserva), botão de mover manualmente, atalho de WhatsApp e exportação CSV

Ainda falta: dashboard de acompanhamento em tempo real (`onSnapshot`), geração do link `wa.me` com a mensagem pronta, tela de moderação de recados, e a exportação CSV de verdade.

## Mensagem do WhatsApp

O painel monta `https://wa.me/55<DDD+número>?text=<mensagem codificada>` e oferece também "copiar link". Texto base, personalizável por família:

```
Oi, {nome_familia}! 💍
Faltam poucos dias para o nosso grande dia e adoraríamos ter vocês com a gente!

Confirme a presença de vocês neste link, com detalhes da festa, nossa história e tudo mais:
{link_convite}

Com carinho,
{nome_dos_noivos}
```

## Identidade visual

Os tokens estão em `tokens-mono.css` (paleta "Alicercei"): monocromática — fundo `#F4F4F5`, tinta `#0A0A0A`, superfícies brancas, escuros `#0A0A0A`/`#1C1C1E`, sem cor de acento. Tipografia Plus Jakarta Sans (títulos, peso 300) sobre Inter (corpo, peso 300) e Montserrat para rótulos em caixa alta com `letter-spacing: .1em`. Raio leve de 8px em botões, campos e imagens; divisores de 1px; fotografias sempre em preto e branco. Escalas de tipo e espaço são todas `clamp()` — não fixe px. Use as variáveis, não hex solto.

Motion: `cubic-bezier(.22,1,.36,1)` para entradas, 200/280/400ms para interação, 900ms+ para reveals de seção. Reveals por `IntersectionObserver` com fallback que mostra tudo após alguns segundos — nada pode ficar invisível se o observer falhar.

## Entregáveis, em ordem

1. Projeto Vite + React + Firebase configurado (Firestore, Auth, Hosting, FCM) e `vite-plugin-pwa`
2. Modelo de dados e regras de segurança do Firestore: convite público lê/escreve só a própria família via token; admin autenticado lê/escreve tudo
3. Cadastro de famílias e convidados com as regras de limite, meia e casamento por nome
4. Página `/convite/{token}` completa, com a abertura animada e o RSVP individual idempotente
5. Geração dos links de WhatsApp
6. Dashboard em tempo real + exportação CSV
7. Mural de recados com moderação
8. Push (FCM) com lembretes — lembrando que no iPhone só funciona com o site adicionado à tela inicial no iOS 16.4+; o WhatsApp segue como canal garantido

## Perguntas em aberto a confirmar com os noivos

- Prazo de resposta (o protótipo usa 20 de novembro)
- Se o convidado da lista reserva deve ver algum aviso no convite (hoje: não vê)
- Horário de encerramento da festa e se haverá espaço kids
- Textos definitivos e fotos reais (os protótipos usam placeholders, exceto a foto do espaço)


