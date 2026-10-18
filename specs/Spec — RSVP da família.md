# Spec — RSVP da família

Oct 17, 2026 · @Gustavo Souza

## Objetivo

Permitir que cada família convidada confirme ou recuse presença pelo link pessoal recebido no WhatsApp, indicando exatamente quem da família vai, sem risco de duplicar ou perder a resposta em reenvios, cliques duplos ou edições administrativas posteriores.

**Status:** já implementado (`functions/index.js` + `src/components/RsvpForm.jsx` + `src/pages/Invite.jsx`).

## Quebra SPIDR

| Eixo | Aplicação |
| --- | --- |
| **S**pike | Não aplicável — stack e abordagem (Firestore + Cloud Function) já definidas |
| **P**ath | Caminho feliz único por família: confirmar (todos/parte) ou recusar; reabrir e alterar resposta depois |
| **I**nterface | Um único canal: página pública `/convite/:token` no navegador/PWA. Sem variante por canal (ex.: não existe RSVP via WhatsApp direto) |
| **D**ata | Variação pelo número de convidados da família (1 convidado vs. vários) e pelo estado prévio (ainda não respondeu vs. já respondeu antes) |
| **R**ules | Status computado a partir dos `attending` de cada convidado: 0 confirmados = `recusado`, todos = `confirmado`, parte = `parcial`. Gravação sempre via `update`/`merge` no documento da família (nunca `create`) — é o que garante a idempotência |

## Cenários — happy path

1. Família abre o link, vê os nomes de todos os membros pré-marcados como presentes, clica em **Vamos sim!**, mantém todos marcados, confirma → status vira `confirmado`.
2. Família abre o link, desmarca 1 de 4 membros (quem não vai), deixa um recado, confirma → status vira `parcial`, recado salvo.
3. Família abre o link, clica em **Não poderemos ir**, escreve o motivo, confirma → status vira `recusado`, `declineReason` salvo.
4. Família já confirmada volta ao link, clica em **Alterar resposta**, muda quem vai, reenvia → mesmo documento é atualizado, status recalculado.

## Cenários — sad path

1. Link com token inexistente ou digitado errado → API retorna 404, página mostra "Convite não encontrado. Confira o link recebido no WhatsApp."
2. Falha de rede/servidor ao enviar o RSVP → mensagem "Não deu pra enviar agora. Tenta de novo...", nada é gravado, botão reabilitado pra nova tentativa.
3. Payload inválido (lista de convidados vazia ou malformada) → API retorna 400, sem gravar nada.

## Edge cases

- **Clique duplo / duplo envio**: a gravação é sempre `update`/`merge` no mesmo documento (achado pelo token) — nunca cria um segundo registro. Resultado final é idêntico a enviar uma vez.
- **Convidado removido/renomeado pelo admin após a família já ter respondido**: a function ignora ids de convidado que não existem mais na família (`validIds`), sem erro.
- **Família na lista reserva**: hoje o fluxo de RSVP é idêntico ao de uma família da lista principal — não há nenhuma indicação visual pro convidado de que está na reserva (ver spec de Lista reserva, pergunta aberta).
- **Família com 1 convidado só**: fluxo funciona igual, só não existe estado `parcial` possível (ou confirma 100% ou recusa).

## Critérios de aceite

- [ ] Confirmar com todos os membros marcados grava status `confirmado`
- [ ] Confirmar com parte dos membros desmarcados grava status `parcial`
- [ ] Recusar grava status `recusado` e, se preenchido, o motivo
- [ ] Enviar o mesmo RSVP duas vezes (clique duplo ou reenvio) nunca cria um segundo registro nem duplica contagem
- [ ] Reabrir o link e clicar em "Alterar resposta" permite mudar a resposta anterior
- [ ] Token inválido mostra mensagem de erro clara, sem quebrar a página
- [ ] Nenhuma escrita acontece no Firestore sem passar pela Cloud Function (regras bloqueiam acesso direto)

## Fora de escopo / Perguntas abertas

- **Fora de escopo nesta fase**: notificações push de lembrete pra quem não respondeu (combinado como "não precisa por enquanto").
- **Pergunta aberta**: o convidado de uma família da lista reserva deveria ver algum aviso disso na página de RSVP, ou continua totalmente transparente pra ele? Ainda não decidido (ver spec de Lista reserva).
- **Pergunta aberta**: hoje o campo de recado (`message`) só aparece na tela de confirmação; no fluxo de recusa só existe o campo "motivo". Famílias que recusam não têm como deixar um recado separado do motivo — isso é intencional ou deveria ter os dois campos?
