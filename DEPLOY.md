# Festa do Zoo – passo a passo de implantação

Arquitetura: site estático (GitHub Pages) → Google Apps Script (API) → Google Sheets (banco de dados, **privado**).

## 1. Criar a planilha e a API (conta Google do Lufe)
1. Em sheets.google.com, crie uma planilha em branco chamada **Festa do Zoo 2026 – Dados**. **Não compartilhe** com ninguém.
2. Menu **Extensões → Apps Script**. Apague o conteúdo e cole todo o arquivo `apps-script/Code.gs`.
3. Selecione a função `setup` e clique em **Executar** (autorize quando o Google pedir). Isso cria as abas.
4. Na planilha, aba **Config**: troque `codigo_acesso` pelo código que será enviado aos convidados.
5. Aba **Organizadores**: troque os PINs de Lufe, Marina e Vanessa (um PIN pessoal para cada um).
6. No Apps Script: **Implantar → Nova implantação → Tipo: App da Web**.
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
   - Copie a URL que termina em `/exec`.
   - A cada mudança no `Code.gs`, use **Implantar → Gerenciar implantações → Editar → Nova versão**.

## 2. Apontar o site para a API
Edite `config.js` e cole a URL em `API_URL`. Faça commit e push.

## 3. Publicar no GitHub Pages
No repositório: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main / (root)**. A URL será `https://lufemattos.github.io/<nome-do-repo>/`.

## 4. Primeiro uso
1. Abra o site, entre com o código de acesso e clique em **Sou organizador** com o seu PIN.
2. Em **Configuração**, preencha horário, endereço, traje, valores por pessoa e Pix.
3. Vanessa cadastra os convidados (aba **Quem vai → ＋ Convidado**) e os quartos.
4. Compartilhe o link e o código no grupo do WhatsApp.

## Quem edita o quê
| Perfil | Edita |
|---|---|
| Lufe | Tudo: configuração, código de acesso, cardápio, fornecedores, convidados, pagamentos, despesas |
| Marina | Pagamentos (pago, valor, data) e despesas |
| Vanessa | Convidados (lista), acomodações, fornecedores/equipe |
| Convidados | Só a própria resposta de presença e as próprias caronas |

O código de acesso é guardado na aba **Config** da planilha privada. Só quem abre essa planilha (o Lufe) ou o PIN do Lufe no site consegue alterá-lo.

## Privacidade
- O repositório é público: **nunca coloque nomes, telefones ou Pix no código**. Tudo isso fica só na planilha.
- Quem tiver o código vê a lista de nomes, caronas (com WhatsApp) e valores. Contatos de fornecedores e despesas só aparecem para organizadores.
- Após 40 tentativas erradas, a API bloqueia novas tentativas por 10 minutos.
