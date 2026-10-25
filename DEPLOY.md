# Festa do Zoo – guia completo de implantação

Arquitetura: site estático (GitHub Pages) → Google Apps Script (API) → Google Sheets (banco de dados **privado**).

Repositório: `lufemattos/festa-zoo-2026` · Site: `https://lufemattos.github.io/festa-zoo-2026/`

> Os nomes de botões e menus do GitHub e do Google podem mudar com o tempo. Se algo não aparecer igual, procure o equivalente.

## 1. GitHub: repositório e Pages
1. Em github.com, **+ → New repository**. Nome `festa-zoo-2026`, visibilidade **Public**, sem README/.gitignore/licença.
2. Envie os arquivos da pasta `site` (o conteúdo, não a pasta em si): pelo botão **uploading an existing file** do GitHub, ou conceda ao app do Claude acesso só a este repositório (`github.com/apps/claude/installations/select_target`) para ele enviar.
3. Só depois do primeiro envio existe a branch `main`. Em **Settings → Pages → Source: Deploy from a branch → Branch: main, /(root) → Save**.
4. A URL do site aparece no topo da página de Pages em 1 a 2 minutos.

## 2. Google: planilha e API (conta do Lufe)
1. Em sheets.google.com, crie a planilha **Festa do Zoo 2026 – Dados**. **Nunca compartilhe** com ninguém.
2. **Extensões → Apps Script**. Apague o exemplo e cole todo o `apps-script/Code.gs`. Salve.
3. Execute a função **`setup`** (autorize: Revisar permissões → conta → Avançado → Acessar). Isso cria as abas.
4. Aba **Config**: troque `codigo_acesso`. Aba **Organizadores**: troque os PINs (Lufe, Marina, Vanessa). **Os valores `TROQUE-…` são só provisórios.**
5. **Implantar → Nova implantação → App da Web**. Executar como: **Eu**. Quem pode acessar: **Qualquer pessoa**. Copie a URL `/exec`.
6. Teste a URL no navegador: deve mostrar `{"ok":true,"msg":"API da Festa do Zoo no ar."}`.
7. Cole a URL em `config.js` (`API_URL`) e envie ao GitHub. Sem URL, o site roda em **modo demonstração**.
8. Depois de **qualquer mudança no `Code.gs`**: **Implantar → Gerenciar implantações → editar (lápis) → Versão: Nova versão → Implantar**. Salvar sozinho não atualiza a API.

## 3. Pré-carga de dados (opcional, rodar uma única vez)
No Apps Script, crie um novo arquivo para cada seed (**+ → Script**), cole o conteúdo, selecione a função e clique em **Executar**:

| Arquivo | Função | O que faz |
|---|---|---|
| `apps-script/SeedCardapio2025.gs` (está no repositório) | `seedCardapio2025` | Carrega 51 itens do cardápio de 2025 com status **ref. 2025**. São valores antigos, só ponto de partida: aparecem em bloco separado e **não entram nos totais**. |
| `SeedConvidados.gs` (**só no seu computador, não vai ao GitHub**) | `seedConvidados` | Carrega os 25 nomes da lista de 2026 como **pendente**. |

Ambas se recusam a rodar de novo se já houver dados, para não duplicar.

## 4. Primeiro uso
1. Abra o site, entre com o código de acesso e clique em **Sou organizador** com o seu PIN.
2. **Configuração**: horário, endereço, link do mapa, traje, formato, valores por pessoa (com e sem álcool), prazo e Pix.
3. A Vanessa revisa convidados, define o perfil de cada um (Individual, Casal ou Família) e cadastra quartos.
4. Lufe: transforme itens de referência em itens de 2026 (**Editar → trocar status**) e ajuste os custos.
5. Teste cada perfil e um convidado fictício, e só então divulgue o link e o código no grupo.

## 5. Quem edita o quê
| Perfil | Edita |
|---|---|
| Lufe | Tudo: configuração, código de acesso, cardápio, fornecedores, convidados, pagamentos, despesas |
| Marina | Pagamentos (pago, valor, data) e despesas |
| Vanessa | Convidados (lista), acomodações, fornecedores/equipe |
| Convidados | Só a própria resposta de presença e as próprias caronas |

O campo **Perfil do convidado** (Individual, Casal ou Família) é um seletor que a Vanessa preenche em **Quem vai → Editar**. Aparece ao lado do nome em **Quem vai** e ajuda a montar os quartos. Não altera valores e não liga uma pessoa a outra.

## 6. Atualizar o site
Mudanças de visual ou de funcionalidade: altere os arquivos do repositório (ou peça ao Claude) e o Pages publica sozinho em 1 a 2 minutos.

## 7. Privacidade e segurança
- O repositório é público: **não coloque nomes, telefones nem Pix no código**. Isso fica só na planilha (por isso `SeedConvidados.gs` não vai ao GitHub).
- Quem tem o código vê lista de nomes, caronas (com WhatsApp) e valores. Contatos de fornecedores e despesas só aparecem para organizadores.
- Após 40 tentativas erradas, a API bloqueia novas tentativas por 10 minutos.
- Não há login individual: qualquer pessoa com o código pode responder pela presença de outra. A Marina confirma os pagamentos.
- Faça uma cópia da planilha de vez em quando (**Arquivo → Fazer uma cópia**).
