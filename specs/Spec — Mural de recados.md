# Spec — Mural de recados

Oct 17, 2026 · @Gustavo Souza

## Objetivo

Deixar os convidados registrarem uma mensagem para os noivos ao responder o RSVP, com moderação manual do admin antes de aparecer publicamente no mural da página do convite.

**Status:** já implementado (`src/components/MessageWall.jsx` + campo `message`/`messageApproved` em `functions/index.js` e `src/lib/families.js`).

## Quebra SPIDR

| Eixo | Aplicação |
| --- | --- |
| **S**pike | Não aplicável |
| **P**ath | Caminho único: escrever recado → aguardar aprovação → aparecer no mural. Não há edição de recado já enviado |
| **I**nterface | Campo de texto dentro do RSVP (lado convidado) + checkbox de aprovação no painel (lado admin) + lista pública no mural (`GET /messages`) |
| **D**ata | Um recado por família (não por convidado individual) |
| **R**ules | Recado é opcional. Só aparece no mural público se `messageApproved = true`, que começa sempre `false` em toda gravação de RSVP (precisa ser aprovado de novo mesmo se a família só alterou a resposta). O campo de recado hoje só existe na tela de **confirmação** — a tela de **recusa** só tem o campo "motivo" (ver pergunta aberta) |

## Cenários — happy path

1. Família confirma presença e escreve um recado → salvo com `messageApproved: false`.
2. Admin vê o recado no painel, marca "mostrar no mural" → recado passa a aparecer na página pública do convite, junto com o nome da família.
3. Convidado abre a página do convite sem ter respondido ainda → já vê os recados aprovados de outras famílias no mural.

## Cenários — sad path

1. Falha ao buscar os recados aprovados (erro de rede) → mural simplesmente não renderiza nada, sem mensagem de erro visível pro convidado.
2. Admin tenta aprovar um recado de uma família sem recado nenhum → não há checkbox pra marcar (só aparece quando há `message`).

## Edge cases

- **Família altera a resposta depois de já ter o recado aprovado**: ao reenviar o RSVP, `messageApproved` volta pra `false` automaticamente (precisa ser aprovado de novo), mesmo que o texto do recado não tenha mudado.
- **Família recusa a presença**: não tem campo de recado na tela de recusa, só "motivo" — não dá pra deixar uma mensagem separada do motivo da ausência.
- **Mural sem nenhum recado aprovado ainda**: mostra o texto "Seja o primeiro a deixar um recado para os noivos!" em vez de ficar vazio.

## Critérios de aceite

- [ ] Recado digitado na confirmação é salvo com `messageApproved: false` por padrão
- [ ] Recado só aparece no mural público depois do admin marcar "mostrar no mural"
- [ ] Reenvio do RSVP reseta a aprovação do recado pra `false`
- [ ] Mural sem recados aprovados mostra mensagem de incentivo, não fica em branco
- [ ] Desaprovar um recado já exibido remove ele do mural imediatamente

## Fora de escopo / Perguntas abertas

- **Pergunta aberta**: famílias que recusam não têm campo de recado (só "motivo"). Isso é intencional, ou elas também deveriam poder deixar uma mensagem mesmo não indo?
- **Fora de escopo**: edição do recado já enviado pelo próprio convidado — só dá pra mudar reenviando o RSVP inteiro (o que também reseta a aprovação).
- **Fora de escopo**: moderação automática de conteúdo (filtro de palavras, etc.) — aprovação é 100% manual, um por um.
