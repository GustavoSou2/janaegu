# Spec — Lista reserva (limite de convidados)

Oct 17, 2026 · @Gustavo Souza

## Objetivo

Limitar o evento a 100 convidados sem bloquear o cadastro de novas famílias: quem exceder o limite entra automaticamente numa "lista reserva", continua recebendo convite normalmente, e pode ser promovido manualmente depois (ex.: em caso de desistência de outra família).

**Status:** já implementado (`src/lib/families.js` — `GUEST_LIMIT`, `isWaitlist`, `setWaitlist`).

## Quebra SPIDR

| Eixo | Aplicação |
| --- | --- |
| **S**pike | Não aplicável |
| **P**ath | Caminho automático (classificação ao salvar) + caminho manual (override pelo admin) |
| **I**nterface | Painel admin apenas — sem interface pro convidado final (ver pergunta aberta) |
| **D**ata | Depende do peso total já cadastrado nas famílias "principais" no momento da gravação — 1 por convidado, 0,5 por criança marcada como "meia" |
| **R**ules | `GUEST_LIMIT = 100`. Cada convidado conta como 1 no peso total, exceto quando é uma criança marcada como "conta como meia" (`isChild` + `isHalf`), que conta como 0,5. Ao salvar uma família, soma-se o peso de todas as outras famílias com `isWaitlist = false`; se esse total + peso da família atual > 100, `isWaitlist = true`. A classificação é feita só no momento da gravação — não há rebalanceamento automático depois (ex.: apagar uma família principal não promove ninguém da reserva sozinho). O admin pode sobrescrever manualmente a qualquer momento (`setWaitlist`). |

## Cenários — happy path

1. Total de convidados nas famílias principais está em 95. Admin cadastra família de 3 pessoas → 98 ≤ 100, fica na lista principal.
2. Total está em 98. Admin cadastra família de 5 pessoas → 103 > 100, família inteira marcada `isWaitlist: true`, mas cadastrada e recebe link normalmente.
3. Uma família da lista principal desiste (recusa). Admin clica em "mover p/ principal" numa família da reserva → passa a contar como principal.
4. Total (peso) está em 99,5. Admin cadastra uma criança sozinha marcada como "meia" (peso 0,5) → 100 ≤ 100, fica na lista principal.

## Cenários — sad path

Não há caminho de erro explícito nesta regra — não existe estado inválido possível (toda família cadastrada sempre recebe `isWaitlist: true` ou `false`, nunca falha o cadastro por causa do limite).

## Edge cases

- **Editar uma família principal aumentando o número de convidados** pode fazê-la ultrapassar o limite sozinha e virar reserva — mesmo já estando cadastrada há tempos. Comportamento intencional (a regra roda em toda gravação, não só na criação).
- **Apagar uma família principal** libera espaço no total, mas nenhuma família da reserva é promovida automaticamente — é sempre uma ação manual do admin.
- **Duas gravações simultâneas** (ex.: dois cadastros ao mesmo tempo): a soma não é feita numa transação atômica, então em tese duas famílias cadastradas ao mesmo tempo poderiam ambas se ver como "dentro do limite" e ultrapassar juntas. Risco baixo (uso é de um admin só, sequencial), mas existe.
- Alterar se uma criança é "meia" (ou se é criança) muda o peso dela e pode fazer a família ultrapassar o limite — a reclassificação só acontece na próxima gravação dessa família, igual às outras edições.

## Critérios de aceite

- [ ] Cadastrar família que mantém o total ≤ 100 fica na lista principal
- [ ] Cadastrar família que faz o total passar de 100 marca a família inteira como lista reserva
- [ ] Família na lista reserva é cadastrada normalmente, recebe link e pode responder o RSVP sem restrição
- [ ] Admin consegue mover manualmente qualquer família entre lista principal e reserva, a qualquer momento
- [ ] Dashboard mostra quantos convidados estão na lista principal (X/100) e quantos na reserva
- [ ] CSV exportado indica se cada família está ou não na lista reserva
- [ ] Criança marcada como "meia" conta como 0,5 (em vez de 1) no peso usado para decidir lista principal/reserva

## Fora de escopo / Perguntas abertas

- **Pergunta aberta (decisão pendente)**: o limite hoje conta **convidados cadastrados/convidados**, não **confirmados**. Se 120 forem convidados e só 90 confirmarem, as últimas famílias cadastradas já ficam na reserva mesmo cabendo no espaço real. Alternativa seria contar só quem confirmou (`attending`), mas isso exigiria promover/remover famílias da reserva automaticamente conforme respostas chegam (mais complexo). Mantém como está (convidados, com promoção manual) ou quer que eu mude pra contar confirmados?
- **Pergunta aberta**: o convidado da lista reserva não vê nenhuma indicação disso na página do convite. Quer que apareça algo pra ele, ou deve continuar transparente?
- **Fora de escopo**: rebalanceamento/promoção automática da lista reserva quando uma vaga abre — é sempre manual hoje.
