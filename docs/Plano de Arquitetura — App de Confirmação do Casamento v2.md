# Plano de Arquitetura — App de Confirmação do Casamento

Oct 15, 2026 · @Gustavo Souza

## Visão geral

Um PWA de confirmação de presença para o casamento do dia 18/12/2026, organizado por família: cada família recebe um link pessoal pelo WhatsApp, abre um convite com a história do casal e confirma (ou recusa, com justificativa) a presença de cada membro. O app também centraliza, num painel só para você, quem já confirmou, quem falta cobrar e as mensagens deixadas pelos convidados.

**Design mobile-first, sem depender de instalação**: o convite é, antes de tudo, uma landing page web — a maioria dos convidados vai abrir o link direto do WhatsApp, no navegador, sem instalar nada. Todo o fluxo (ver história, contagem regressiva, confirmar presença, deixar recado) tem que funcionar 100% só como página web mobile. A instalação como PWA ("Adicionar à Tela de Início") é um extra opcional, útil pra quem quiser revisitar ou (futuramente) receber push — nunca um requisito pra usar o site.

Frentes do produto:

- **Convite público**: página bonita, com contagem regressiva, história do casal, imagem para baixar/postar, RSVP por família e mural de recados.
- **Painel administrativo**: cadastro de famílias e convidados, geração dos links de WhatsApp, acompanhamento em tempo real de quem confirmou.
- **Notificações push**: lembretes automáticos via PWA (ex.: "faltam 7 dias", "ainda não recebemos sua confirmação").

## Stack técnica

React + Firebase faz sentido para o seu caso: prazo curto (\~9 semanas), hospedagem e push já inclusos no mesmo ecossistema, e você não precisa manter servidor.

| Camada | Ferramenta | Papel |
| --- | --- | --- |
| Frontend | React + Vite, como PWA (manifest + service worker) | Convite público e painel admin |
| Banco de dados | Cloud Firestore | Famílias, convidados, RSVPs, recados |
| Autenticação | Firebase Auth (só para o painel admin) | Login seu e, se quiser, do(a) parceiro(a) |
| Hospedagem | Firebase Hosting | Deploy do PWA, HTTPS automático (exigido para push) |
| Backend leve | Cloud Functions | Validar RSVP, moderar recados, disparar push |
| Push | Firebase Cloud Messaging (FCM) | Lembretes e notificações |
| Imagem para redes | Geração estática (Canva/Figma) ou componente que renderiza um card a partir dos dados do evento | Imagem para download/Instagram |

Ferramenta como PWA Builder ou `vite-plugin-pwa` facilita o manifest e o service worker sem reinventar a roda.

## Modelo de dados (Firestore)

**`families`** (uma por família convidada)

| Campo | Tipo | Observação |
| --- | --- | --- |
| `familyName` | string | ex.: "Família Souza" |
| `inviteToken` | string | slug único usado no link enviado (`/convite/abc123`) |
| `phone` | string | número usado para montar o link do WhatsApp |
| `status` | enum | `pendente` \| `confirmado` \| `recusado` \| `parcial` — *parcial* quer dizer que só alguns membros confirmaram; o status só vira *confirmado* quando todos os convidados daquela família já responderam. |
| `declineReason` | string? | preenchido se a família recusar |
| `message` | string? | recado deixado no mural |
| `createdAt` / `respondedAt` | timestamp |  |

**`families/{familyId}/guests`** (subcoleção, um por pessoa da família)

| Campo | Tipo | Observação |
| --- | --- | --- |
| `name` | string |  |
| `isChild` | bool | para contagem de cardápio/cerimonialista |
| `isHalf` | bool \| null | só relevante quando isChild é true; marcado manualmente pelo admin no cadastro (sem validação de idade) — conta como 0,5 no limite de 100 convidados |
| `attending` | bool \| null | confirmação individual dentro da família |

**`pushSubscriptions`**: token do dispositivo vinculado a `familyId`, para notificar aquela família específica (ex.: lembrete de confirmação pendente).

**`settings`** (documento único): data do casamento, textos do convite, link da lista de presentes, URL da imagem para compartilhar.

Também guarda o **endereço do local** do evento (`venueAddress`), usado no convite e no botão "Adicionar ao Google Agenda" — é o mesmo local para todos os convidados.

Modelar por família com convidados em subcoleção permite confirmar "quem da família vem" sem perder a visão agregada por família, que é como vocês vão organizar mesas e a lista de presentes.

## Funcionalidades detalhadas

**Página do convite (`/convite/{token}`)**

- Capa com nome do casal, data e local
- Seção "nossa história" (texto + fotos)
- Contagem regressiva em tempo real até 18/12/2026
- Lista dos membros da família, com checkbox individual de presença e indicação clara se a confirmação é da família toda ou só de parte dela (ex.: "3 de 4 confirmados")
- Botão confirmar / recusar (recusar abre campo de justificativa)
- Imagem (card) para baixar ou compartilhar direto no Instagram
- Campo de recado para os noivos
- Link para a lista de presentes
- Botão "Adicionar ao Google Agenda" — gera um link do Google Calendar com título, data/hora de início (`weddingDateIso`), duração fixa de 5 horas e o endereço do evento (`venueAddress`)

**Painel administrativo**

- Cadastro de famílias e, dentro de cada uma, dos membros
- Geração automática do link `wa.me` com mensagem pronta por família
- Dashboard com contagem de confirmados / recusados / pendentes
- Lista de recados recebidos (com opção de moderar antes de exibir no site, se quiser)
- Exportação da lista final (CSV) para cerimonial/buffet

**Notificações**

- Pedido de permissão de push na primeira visita ao convite
- Disparo de lembretes para quem ainda não respondeu

## Fluxo do convidado

&#91;embedded content: fluxo do convidado · 5 passos, 1 decisão\]

Tudo acontece sem precisar instalar nada: o link já abre o PWA no navegador, e o convite oferece "adicionar à tela inicial" para quem quiser revisitar ou receber notificações.

## Fluxo do noivo/noiva (painel admin)

&#91;embedded content: fluxo do noivo/noiva · cadastro até acompanhamento\]

O painel é onde você cadastra cada família com seus convidados, gera o link do WhatsApp já pronto (texto + número), envia manualmente pela sua conversa real e depois acompanha tudo em tempo real: o dashboard atualiza sozinho conforme as famílias respondem, com o status de cada uma (pendente, parcial, confirmado ou recusado) e quantos de cada família confirmaram.

## Confiabilidade: evitar duplicidade

Projeto simples, com uma salvaguarda que já resolve a maior parte do risco de graça: o RSVP sempre **atualiza o mesmo documento da família** (pelo `familyId`/`inviteToken`), nunca cria um novo registro a cada clique. Isso já é idempotente por construção — clicar duas vezes, dar refresh no meio do processo ou reenviar o formulário resulta no mesmo documento com os mesmos dados, nunca em duas confirmações.

Na prática:

- Botão de confirmar/recusar desabilita assim que clicado, com confirmação visual imediata ("recebemos sua resposta!")
- A escrita no Firestore é sempre um `update`/`merge` no documento existente da família, nunca um `add`/`create`
- O link de cada família carrega o `inviteToken` dela — só dá pra alterar a própria família, sem risco de mexer na resposta de outra

Não precisa de fila, chave de idempotência ou nada mais sofisticado do que isso: o modelo de dados (um documento por família, atualizado no lugar) já evita a duplicação sozinho.

## Painel administrativo

Área protegida por login (Firebase Auth), separada do convite público:

- **Famílias**: cadastrar família + membros, editar telefone, ver status (pendente/confirmado/recusado/parcial)
- **Confirmações**: visão geral em tempo real — total de convidados, confirmados, recusados, crianças (para o buffet)
- **Links**: botão "gerar link WhatsApp" por família, já com o texto pronto
- **Recados**: lista dos recados deixados no mural, com opção de aprovar antes de exibir publicamente
- **Exportar**: CSV com a lista final de confirmados, para passar ao cerimonial/buffet
- **Lista reserva**: limite de 100 convidados. Dá pra cadastrar famílias além disso — elas são marcadas automaticamente como "lista reserva" (isWaitlist), continuam recebendo o link normalmente, e você pode mover manualmente a qualquer momento (ex.: se alguém desistir).

## Link do WhatsApp (envio manual)

Sem custo e sem aprovação de API: o painel monta um link no formato `https://wa.me/55<DDD+número>?text=<mensagem codificada>`, você clica e o WhatsApp Web/App abre a conversa já com o texto pronto — só apertar enviar.

Mensagem sugerida (personalizável por família):

```
Oi, {nome_familia}! 💍
Faltam poucos dias para o nosso grande dia e adoraríamos ter vocês com a gente!

Confirme a presença de vocês neste link, com detalhes da festa, nossa história e tudo mais:
{link_convite}

Com carinho,
{nome_dos_noivos}
```

O painel pode ter um botão "copiar link" por família, para os casos em que você prefere colar manualmente em vez de abrir o WhatsApp direto.

## Push notifications via PWA

Firebase Cloud Messaging + service worker cuidam disso. Usos práticos:

- Lembrete automático para quem não respondeu (ex.: 7 e 2 dias antes do prazo que vocês definirem)
- Confirmação de recebimento ("recebemos sua confirmação, obrigado!")
- Aviso no dia do evento (endereço, horário)

**Atenção a uma limitação real**: push web funciona bem em Android e desktop (Chrome, Edge, Firefox), mas no iPhone só funciona se a pessoa adicionar o site à tela inicial ("Adicionar à Tela de Início") em iOS 16.4 ou mais recente — Safari não dá push para um PWA só aberto no navegador. Vale deixar essa instrução visível no convite para quem usa iPhone, e não depender só do push: o WhatsApp continua sendo o canal garantido.

## Cronograma sugerido

&#91;embedded content: cronograma estimado · outubro a dezembro de 2026\]

Se algo atrasar, dá pra cortar o mural de recados e a moderação de mensagens sem comprometer o essencial: cadastro, RSVP e envio dos links.

## Próximos passos

1. Criar o projeto no Firebase (Firestore, Auth, Hosting, Cloud Messaging)
2. Decidir textos e fotos da "nossa história" e a arte da imagem para Instagram
3. Fechar a lista de famílias e números de telefone num CSV simples, para importar
4. Eu começo pelo cadastro de famílias/convidados e a tela de RSVP — é o coração do app
5. Depois disso, entra o link do WhatsApp, o push e os detalhes de charme (contagem, imagem, mural)

Quando quiser, já posso começar a estruturar o projeto (React + Firebase) e ir te mostrando telas conforme ficarem prontas.
