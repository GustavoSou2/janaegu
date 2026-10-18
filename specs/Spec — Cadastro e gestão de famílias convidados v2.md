# Spec — Cadastro e gestão de famílias/convidados

Oct 17, 2026 · @Gustavo Souza

## Objetivo

Permitir que o noivo/noiva cadastre, edite e remova famílias e seus convidados no painel administrativo, gerando o link de convite (token) e preservando as respostas já dadas quando a família é editada depois de ter respondido.

**Status:** já implementado (`src/pages/AdminFamilyForm.jsx` + `src/lib/families.js`).

## Quebra SPIDR

| Eixo | Aplicação |
| --- | --- |
| **S**pike | Não aplicável |
| **P**ath | Dois caminhos: criar família nova vs. editar família existente — lógica de convidados diverge entre os dois (ver Rules) |
| **I**nterface | Formulário no painel admin (`/admin/familia/nova` e `/admin/familia/:id`), protegido por login |
| **D**ata | Varia pelo número de convidados cadastrados (lista dinâmica, adicionar/remover linhas) e se a família já tem RSVP prévio ou não |
| **R**ules | Criar: gera `inviteToken` aleatório, status inicial `pendente`. Editar: convidados são casados por **nome exato** com os já existentes — nome igual preserva `attending`; nome novo entra com `attending: null`; nome removido da lista apaga o registro (e a resposta dele, se houver). `isWaitlist` é recalculado em toda gravação (ver spec de Lista reserva) Cada convidado pode ser marcado como criança (`isChild`); quando marcado, o admin decide na hora do cadastro se ele conta como meia (`isHalf`) — sem validação de idade no sistema, é sempre manual. Esse peso é usado no cálculo do limite de 100 convidados (ver spec de Lista reserva). |

## Cenários — happy path

1. Admin clica em "+ Nova família", preenche nome, telefone e adiciona 3 convidados, salva → família criada com token único, status `pendente`.
2. Admin edita o telefone de uma família (nomes dos convidados inalterados) → convidados mantêm exatamente o `attending` que já tinham.
3. Admin adiciona um convidado novo numa família que já confirmou parcialmente → convidados antigos mantém resposta, o novo entra sem resposta (`attending: null`).
4. Admin remove uma família inteira (e seus convidados) → confirmação antes, depois remove tudo.
5. Admin cadastra uma família com uma criança marcada como "conta como meia" → convidado é salvo com `isChild: true` e `isHalf: true`, usado no peso do limite de convidados (ver spec de Lista reserva).

## Cenários — sad path

1. Admin tenta salvar sem preencher o nome da família → campo obrigatório bloqueia o envio (validação HTML `required`).
2. Admin acessa `/admin/familia/:id` com um id que não existe → formulário fica vazio (sem crash), sem feedback explícito de "família não encontrada".
3. Sessão expira / usuário não autenticado tenta acessar o formulário → redirecionado pro login (ver spec de Autenticação).

## Edge cases

- **Dois convidados com o mesmo nome na mesma família** (ex.: duas pessoas chamadas "Maria"): o casamento por nome exato encontra o primeiro registro pra ambas as entradas — na prática, uma das duas pode perder a resposta/já ter sua resposta sobrescrita ao salvar de novo. **Limitação conhecida, sem mitigação implementada.**
- **Renomear um convidado que já respondeu** (corrigir erro de digitação no nome): como o casamento é por nome exato, isso é tratado como "removeu um e adicionou outro" — a resposta anterior desse convidado é perdida.
- **Reordenar convidados no formulário**: a ordem de exibição (`order`) é recalculada pela posição atual da lista no formulário, não há drag-and-drop, só adicionar/remover linhas no final ou no meio.

## Critérios de aceite

- [ ] Criar família gera um `inviteToken` único e status `pendente`
- [ ] Editar família sem mudar nomes de convidados preserva 100% das respostas já dadas
- [ ] Adicionar convidado novo numa família existente não afeta a resposta dos demais
- [ ] Remover convidado da lista remove o registro dele (e sua resposta, se havia)
- [ ] Remover família pede confirmação antes de apagar família + convidados
- [ ] Campo nome da família é obrigatório pra salvar
- [ ] Convidado marcado como criança permite indicar se conta como meia (`isHalf`), decidido pelo admin no momento do cadastro, sem validação de idade automática

## Fora de escopo / Perguntas abertas

- **Fora de escopo nesta fase**: importação em massa de famílias via CSV/planilha — cadastro é manual, um por um, pelo formulário.
- **Pergunta aberta**: convidados duplicados por nome (ex.: duas "Marias" na mesma família) quebram o casamento por nome ao editar. Quer que eu resolva isso (ex.: pedindo um identificador extra, ou usando ordem/posição em vez de nome quando há duplicatas) ou mantém como limitação conhecida (basta não repetir nomes idênticos)?
- **Pergunta aberta**: não há mensagem de erro quando se acessa um id de família inexistente — vale adicionar?
