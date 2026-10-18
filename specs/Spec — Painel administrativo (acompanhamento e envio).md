# Spec — Painel administrativo (acompanhamento e envio)

Oct 17, 2026 · @Gustavo Souza

## Objetivo

Dar ao noivo/noiva uma visão em tempo real de quantas famílias e convidados confirmaram, recusaram ou ainda não responderam, além das ferramentas pra gerar o link de WhatsApp de cada família e exportar a lista final.

**Status:** já implementado (`src/pages/AdminDashboard.jsx`).

## Quebra SPIDR

| Eixo | Aplicação |
| --- | --- |
| **S**pike | Não aplicável |
| **P**ath | Sem caminho alternativo — é uma tela única de leitura + ações pontuais (gerar link, exportar, remover, mover de lista) |
| **I**nterface | Painel web, protegido por login, atualização em tempo real via `onSnapshot` do Firestore (sem precisar recarregar a página) |
| **D**ata | Varia pela quantidade de famílias cadastradas e seus status |
| **R**ules | Link do WhatsApp é sempre `wa.me/<telefone>?text=<mensagem>` com texto fixo (nome da família + link do convite + nome do casal); envio é manual (clique no admin abre o WhatsApp Web/App, ele mesmo aperta enviar); CSV inclui Família, Status, Lista reserva, Confirmados, Total, Motivo de recusa |

## Cenários — happy path

1. Admin abre o painel e vê os cards de contagem (famílias, confirmadas, parciais, recusadas, pendentes) já atualizados.
2. Admin clica em "WhatsApp" na linha de uma família → abre o WhatsApp com o texto já preenchido, clica em enviar.
3. Uma família confirma pelo link → sem a admin fazer nada, a linha dela na tabela atualiza o status sozinha (tempo real).
4. Admin clica em "Exportar CSV" → baixa um arquivo com todas as famílias, convidados confirmados/total e status.
5. Admin marca "mostrar no mural" no recado de uma família → recado passa a aparecer na página pública do convite.

## Cenários — sad path

1. Família sem telefone cadastrado → botão de WhatsApp vira texto "sem telefone", sem link quebrado.
2. Admin clica em remover família por engano → dialog de confirmação do navegador antes de apagar de verdade.
3. Admin não está autenticado (sessão expirou) → redirecionado pro login antes de ver qualquer dado.

## Edge cases

- **Telefone com formato inválido** (ex.: faltando DDI/DDD): o link `wa.me` é montado só removendo não-dígitos do campo, sem validação de formato — pode gerar um link que não abre a conversa certa.
- **Exportar CSV com muitas famílias**: a exportação faz uma leitura por família (`getFamilyWithGuests`) em paralelo — funciona bem na escala do projeto (\~dezenas de famílias), mas não foi pensado pra centenas.
- **Qualquer usuário autenticado tem acesso total**: as regras do Firestore liberam leitura/escrita pra qualquer `request.auth != null`, sem distinguir papéis — aceitável enquanto só você (e talvez seu par) tiverem login criado.

## Critérios de aceite

- [ ] Contadores (famílias, confirmadas, parciais, recusadas, pendentes) refletem o estado real a qualquer momento, sem precisar recarregar
- [ ] Mudança de status de uma família (RSVP recebido) aparece no painel sem ação do admin, em tempo real
- [ ] Botão de WhatsApp gera o link certo com o texto certo pra cada família
- [ ] Exportar CSV baixa um arquivo com todas as famílias e os dados corretos
- [ ] Remover família pede confirmação antes de executar
- [ ] Aprovar/desaprovar um recado reflete imediatamente na página pública

## Fora de escopo / Perguntas abertas

- **Fora de escopo nesta fase**: envio automático de WhatsApp em massa (exigiria WhatsApp Business API, com custo e aprovação) — envio é sempre manual, um clique por família.
- **Fora de escopo**: papéis/permissões diferentes entre usuários admin — modelo atual é "quem tem login, tem acesso total".
- **Pergunta aberta**: vale validar o formato do telefone no cadastro (ex.: exigir DDI+DDD) pra evitar link de WhatsApp quebrado?
