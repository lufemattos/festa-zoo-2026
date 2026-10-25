/* Festa do Zoo – front-end estático (GitHub Pages). Dados: Google Sheets via Apps Script. */
(function () {
'use strict';
const API = (window.FESTA_CONFIG || {}).API_URL || '';
const DEMO = !API;
const $ = (s, r) => (r || document).querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
  sset(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
  sdel(k) { try { sessionStorage.removeItem(k); } catch (e) {} }
};
const money = n => (n === '' || n == null || isNaN(Number(n))) ? '—' : Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = n => { const v = Number(String(n).replace(',', '.')); return isNaN(v) ? 0 : v; };

/* ---------- estado ---------- */
const S = { code: store.get('festa.code') || '', pin: store.sget('festa.pin') || '', eu: store.get('festa.eu') || '',
            data: null, tab: 'convite', rides: JSON.parse(store.get('festa.rides') || '[]'),
            token: store.get('festa.token') || (Math.random().toString(36).slice(2) + Date.now().toString(36)) };
store.set('festa.token', S.token);

const WRITE_ROLES = { Convidados: ['lufe', 'vanessa', 'marina'], Acomodacoes: ['lufe', 'vanessa'], Cardapio: ['lufe'],
                      Fornecedores: ['lufe', 'vanessa'], Despesas: ['lufe', 'marina'] };
const canWrite = sh => S.data && S.data.role && WRITE_ROLES[sh].indexOf(S.data.role) >= 0;

/* ---------- API (real ou demo) ---------- */
async function call(payload) {
  if (DEMO) return mock(payload);
  const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
  return r.json();
}
function base() { return { code: S.code, pin: S.pin }; }
async function load() {
  const r = await call(Object.assign(base(), { action: 'bootstrap', eu: S.eu }));
  if (!r.ok) throw new Error(r.error || 'Erro ao carregar.');
  S.data = r; return r;
}
async function act(payload, okMsg) {
  try {
    const r = await call(Object.assign(base(), payload));
    if (!r.ok) throw new Error(r.error);
    await load(); render(); if (okMsg) toast(okMsg); return r;
  } catch (e) { toast('⚠ ' + e.message); return null; }
}
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 3200); }

/* ---------- regras de valor ---------- */
function devido(g) {
  const c = S.data.config;
  if (g.valor_acordado !== '' && g.valor_acordado != null) return num(g.valor_acordado);
  const v = g.bebe === 'nao' ? c.valor_nao_bebe : c.valor_bebe;
  return num(v);
}
function totals() {
  const d = S.data, conf = d.convidados.filter(g => g.status === 'confirmado');
  const esperado = conf.reduce((a, g) => a + devido(g), 0);
  const pagos = conf.filter(g => g.pago === 'sim');
  const arrecadado = pagos.reduce((a, g) => a + (g.valor_pago !== '' && g.valor_pago != null ? num(g.valor_pago) : devido(g)), 0);
  const custo = d.cardapio.reduce((a, i) => a + num(i.custo_estimado), 0) + d.fornecedores.reduce((a, f) => a + num(f.valor), 0);
  const criancas = conf.reduce((a, g) => a + num(g.criancas), 0);
  return { conf, esperado, pagos, arrecadado, custo, criancas, pendentes: d.convidados.filter(g => g.status === 'pendente').length };
}

/* ---------- abas ---------- */
const GUEST_TABS = [['convite', 'Convite'], ['presenca', 'Presença'], ['quemvai', 'Quem vai'], ['quartos', 'Acomodações'],
                    ['comes', 'Comes & Bebes'], ['banda', 'Banda & Atividades'], ['caronas', 'Caronas'], ['pagamento', 'Pagamento']];
const ORG_TABS = [['painel', 'Painel'], ['despesas', 'Despesas'], ['config', 'Configuração']];

function render() {
  const d = S.data; if (!d) return;
  $('#demoBadge').hidden = !DEMO;
  const rb = $('#roleBadge'); rb.hidden = !d.role; rb.textContent = d.role ? 'Organizador: ' + (d.nome || d.role) : '';
  $('#orgBtn').hidden = !!d.role;
  const tabs = GUEST_TABS.concat(d.role ? ORG_TABS : []);
  if (!tabs.some(t => t[0] === S.tab)) S.tab = 'convite';
  $('#tabs').innerHTML = tabs.map(t => `<button class="tab" data-tab="${t[0]}" aria-current="${t[0] === S.tab}">${t[1]}</button>`).join('');
  $('#view').innerHTML = VIEWS[S.tab]();
}

const VIEWS = {
  convite() {
    const c = S.data.config, dt = new Date((c.data_evento || '2026-12-19') + 'T12:00:00');
    const dias = Math.ceil((dt - new Date()) / 86400000);
    const dataFmt = dt.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    const t = totals();
    return `<section class="card hero"><div class="muted">${dias > 0 ? 'Faltam ' + dias + ' dias' : (dias === 0 ? 'É hoje!' : 'Evento realizado')}</div>
      <h2>${esc(c.evento_titulo)}</h2><div>${esc(dataFmt)}</div><div>${esc(c.local_nome)}</div>
      ${c.mensagem ? `<p>${esc(c.mensagem)}</p>` : ''}</section>
      <div class="grid">
        <div class="card"><h3>📍 Endereço</h3><p>${esc(c.endereco)}</p>${c.maps_url ? `<a class="btn sm" target="_blank" rel="noopener" href="${esc(c.maps_url)}">Abrir no mapa</a>` : ''}</div>
        <div class="card"><h3>🕑 Horário</h3><p>${esc(c.horario)}</p></div>
        <div class="card"><h3>👕 Traje</h3><p>${esc(c.traje)}</p></div>
        <div class="card"><h3>🍖 Formato</h3><p>${esc(c.formato)}</p></div>
        <div class="card"><h3>✅ Confirmados</h3><div class="kpi">${t.conf.length}<small>adultos · +${t.criancas} crianças</small></div></div>
      </div>`;
  },

  presenca() {
    const d = S.data, me = d.convidados.find(g => g.id === S.eu);
    const opts = d.convidados.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map(g => `<option value="${esc(g.id)}" ${g.id === S.eu ? 'selected' : ''}>${esc(g.nome)}</option>`).join('');
    let form = '<p class="muted">Escolha seu nome para responder.</p>';
    if (me) form = `<form id="rsvpForm">
        <label>Vou à festa?</label><select name="status">${['confirmado:Sim, confirmo', 'talvez:Talvez', 'recusado:Não vou', 'pendente:Ainda não sei'].map(o => { const [v, l] = o.split(':'); return `<option value="${v}" ${me.status === v ? 'selected' : ''}>${l}</option>`; }).join('')}</select>
        <label>Vou beber álcool?</label><select name="bebe"><option value="sim" ${me.bebe !== 'nao' ? 'selected' : ''}>Sim</option><option value="nao" ${me.bebe === 'nao' ? 'selected' : ''}>Não</option></select>
        <label>Quantas crianças vão com você?</label><input name="criancas" type="number" min="0" max="10" value="${esc(me.criancas || 0)}">
        <label>Observações (alergia, restrição, horário de chegada…)</label><textarea name="observacoes" rows="2">${esc(me.observacoes)}</textarea>
        <button class="btn" type="submit">Salvar minha resposta</button></form>`;
    return `<section class="card"><h2>Confirmar presença</h2>
      <label>Quem é você?</label><select id="whoSel"><option value="">— selecione —</option>${opts}</select>${form}
      <p class="muted">Não achou seu nome? Peça para a Vanessa incluir na lista de convidados.</p></section>`;
  },

  quemvai() {
    const g = S.data.convidados, by = s => g.filter(x => x.status === s);
    const li = a => a.length ? a.map(x => `<li>${esc(x.nome)}${num(x.criancas) ? ` <span class="muted">(+${esc(x.criancas)} cças)</span>` : ''}</li>`).join('') : '<li class="muted">—</li>';
    const add = S.data.role && canWrite('Convidados') && S.data.role !== 'marina' ? `<p><button class="btn sm" data-act="edit" data-sheet="Convidados">＋ Convidado</button></p>` : '';
    return `<section class="card"><h2>Quem vai</h2>${add}<div class="grid">
      <div><h3>✅ Confirmados (${by('confirmado').length})</h3><ul>${li(by('confirmado'))}</ul></div>
      <div><h3>🤔 Talvez / pendente (${by('talvez').length + by('pendente').length})</h3><ul>${li(by('talvez').concat(by('pendente')))}</ul></div>
      <div><h3>❌ Não vão (${by('recusado').length})</h3><ul>${li(by('recusado'))}</ul></div></div></section>
      ${S.data.role && S.data.role !== 'marina' ? tableCard('Convidados – edição', ['Nome', 'Grupo', 'Status'], g.map(x => [x.id, [x.nome, x.grupo, x.status]]), 'Convidados') : ''}`;
  },

  quartos() {
    const r = S.data.acomodacoes;
    const body = r.length ? r.map(x => [x.id, [x.quarto, x.tipo, `${x.ocupantes ? String(x.ocupantes).split(/[,;]/).length : 0}/${x.capacidade || '?'}`, x.ocupantes, x.observacoes]]) : [];
    return tableCard('Acomodações (quem dorme onde)', ['Quarto', 'Tipo', 'Ocupação', 'Quem', 'Obs.'], body, 'Acomodacoes', 'Vanessa define os quartos.');
  },

  comes() {
    const items = S.data.cardapio, tot = items.reduce((a, i) => a + num(i.custo_estimado), 0), t = totals();
    const cats = {}; items.forEach(i => (cats[i.categoria || 'Outros'] = cats[i.categoria || 'Outros'] || []).push(i));
    const blocks = Object.keys(cats).map(c => tableCard(c, ['Item', 'Qtd.', 'Custo est.', 'Status'], cats[c].map(i => [i.id, [i.item, i.quantidade, money(i.custo_estimado), i.status]]), 'Cardapio')).join('');
    return `<section class="card"><h2>Comes & Bebes</h2><div class="kpi">${money(tot)}<small>custo estimado dos itens${t.conf.length ? ' · ' + money(tot / t.conf.length) + ' por confirmado' : ''}</small></div>
      ${canWrite('Cardapio') ? '<p><button class="btn sm" data-act="edit" data-sheet="Cardapio">＋ Item</button></p>' : ''}</section>${blocks || '<p class="muted">Lista ainda não preenchida pelo Lufe.</p>'}`;
  },

  banda() {
    const f = S.data.fornecedores;
    const body = f.map(x => [x.id, [x.tipo, x.nome, money(x.valor), x.status, x.detalhes + (x.lista_ajudantes ? ' · Equipe: ' + x.lista_ajudantes : '') + (S.data.role && x.contato ? ' · ☎ ' + x.contato : '')]]);
    return tableCard('Churrasqueiro, banda, atividades e equipe', ['Tipo', 'Nome', 'Valor', 'Status', 'Detalhes'], body, 'Fornecedores', 'Lufe e Vanessa mantêm esta lista.');
  },

  caronas() {
    const c = S.data.caronas;
    const rows = c.map(x => `<tr><td>${x.tipo === 'oferta' ? '🚗 Oferece' : '🙋 Procura'}</td><td>${esc(x.nome)}</td><td>${esc(x.origem)}</td><td>${esc(x.vagas)}</td><td>${esc(x.horario)}</td><td>${esc(x.contato)}</td><td>${esc(x.obs)}</td>
      <td>${(S.rides.indexOf(x.id) >= 0 || S.data.role) ? `<button class="btn ghost sm" data-act="ride-del" data-id="${esc(x.id)}">Remover</button>` : ''}</td></tr>`).join('');
    return `<section class="card"><h2>Caronas</h2>
      <form id="rideForm"><div class="grid">
        <div><label>Tipo</label><select name="tipo"><option value="oferta">Tenho vagas</option><option value="pedido">Preciso de carona</option></select></div>
        <div><label>Seu nome</label><input name="nome" required></div>
        <div><label>Saindo de</label><input name="origem" required placeholder="Ex.: Pinheiros, SP"></div>
        <div><label>Vagas</label><input name="vagas" type="number" min="0"></div>
        <div><label>Horário</label><input name="horario" placeholder="Ex.: 10h"></div>
        <div><label>WhatsApp</label><input name="contato" placeholder="(11) 9…"></div></div>
        <label>Observações</label><input name="obs"><button class="btn" type="submit">Publicar</button></form></section>
      <section class="card"><div class="scroll"><table><thead><tr><th>Tipo</th><th>Nome</th><th>Origem</th><th>Vagas</th><th>Horário</th><th>Contato</th><th>Obs.</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="8" class="muted">Nenhuma carona ainda.</td></tr>'}</tbody></table></div></section>`;
  },

  pagamento() {
    const c = S.data.config, me = S.data.convidados.find(g => g.id === S.eu), m = S.data.meu;
    let st = '<p class="muted">Selecione seu nome na aba “Presença” para ver seu valor e status.</p>';
    if (me) {
      const g = Object.assign({}, me, m || {});
      const v = devido(g);
      st = `<div class="kpi">${v ? money(v) : '—'}<small>${me.bebe === 'nao' ? 'sem álcool' : 'com bebida alcoólica'}</small></div>
        <p>Status: ${m && m.pago === 'sim' ? '<span class="badge ok">Pagamento confirmado</span>' : '<span class="badge warn">Aguardando pagamento</span>'}</p>`;
    }
    return `<section class="card"><h2>Pagamento</h2>${st}
      <h3>Como pagar</h3>
      ${c.pix_chave ? `<p>${esc(c.pix_tipo)} — favorecido: ${esc(c.pix_nome)}</p><div class="pix">${esc(c.pix_chave)}</div><p><button class="btn sm" data-act="copy" data-v="${esc(c.pix_chave)}">Copiar chave</button></p>` : '<p class="muted">Chave Pix / QR Code ainda será divulgado.</p>'}
      ${c.pix_qr_url ? `<img alt="QR Code Pix" src="${esc(c.pix_qr_url)}" style="max-width:220px;border-radius:10px">` : ''}
      ${c.prazo_pagamento ? `<p>Prazo: <strong>${esc(c.prazo_pagamento)}</strong></p>` : ''}
      <p class="muted">Depois de pagar, envie o comprovante à Marina. Ela confirma aqui no site.</p></section>`;
  },

  painel() {
    const t = totals(), d = S.data, pend = t.conf.filter(g => g.pago !== 'sim');
    const pct = t.esperado ? Math.min(100, Math.round(t.arrecadado / t.esperado * 100)) : 0;
    const canPay = d.role === 'marina' || d.role === 'lufe';
    const rows = pend.map(g => [g.id, [g.nome, money(devido(g)), canPay ? `<button class="btn sm" data-act="mark-paid" data-id="${esc(g.id)}">Marcar pago</button>` : '']]);
    return `<div class="grid">
      <div class="card"><div class="kpi">${t.conf.length}<small>confirmados · ${t.pendentes} sem resposta · +${t.criancas} cças</small></div></div>
      <div class="card"><div class="kpi">${money(t.arrecadado)}<small>arrecadado de ${money(t.esperado)}</small></div><div class="bar"><i style="width:${pct}%"></i></div></div>
      <div class="card"><div class="kpi">${money(t.custo)}<small>custo previsto (cardápio + fornecedores)</small></div></div>
      <div class="card"><div class="kpi">${money(t.arrecadado - t.custo)}<small>saldo parcial (arrecadado − previsto)</small></div></div></div>
      ${canPay || d.role === 'vanessa' ? tableCard('Confirmados com pagamento pendente (' + pend.length + ')', ['Nome', 'Valor', ''], rows, null) : ''}
      ${canPay ? `<section class="card"><h3>Gerenciar pagamentos</h3>${tableCard('', ['Nome', 'Pago?', 'Valor pago'], d.convidados.map(g => [g.id, [g.nome, g.pago === 'sim' ? 'Sim' : 'Não', money(g.valor_pago)]]), 'Convidados')}</section>` : ''}`;
  },

  despesas() {
    const r = S.data.despesas || [];
    const tot = r.reduce((a, x) => a + num(x.valor), 0), paid = r.filter(x => x.status === 'pago').reduce((a, x) => a + num(x.valor), 0);
    return `<section class="card"><div class="kpi">${money(paid)} <small>pagos de ${money(tot)} lançados</small></div></section>` +
      tableCard('Despesas e depósitos (Marina / Lufe)', ['Descrição', 'Valor', 'Status', 'Depositar para', 'Data'], r.map(x => [x.id, [x.descricao, money(x.valor), x.status, x.depositar_para, x.data]]), 'Despesas');
  },

  config() {
    const d = S.data, c = d.config;
    if (d.role !== 'lufe') return `<section class="card"><h2>Configuração</h2><p class="muted">Somente o Lufe edita os dados do evento, o Pix e o código de acesso. Peça a ele para ajustar.</p>
      <div class="scroll"><table><tbody>${Object.keys(c).map(k => `<tr><th>${esc(k)}</th><td>${esc(c[k])}</td></tr>`).join('')}</tbody></table></div></section>`;
    return `<section class="card"><h2>Configuração do evento</h2><form id="cfgForm">
      ${Object.keys(CFG_LABELS).map(k => `<label>${CFG_LABELS[k]}</label><input name="${k}" value="${esc(c[k])}">`).join('')}
      <label>Novo código de acesso (deixe vazio para manter)</label><input name="codigo_acesso" autocomplete="off" placeholder="••••••">
      <button class="btn" type="submit">Salvar tudo</button></form></section>`;
  }
};
const CFG_LABELS = { evento_titulo: 'Título', data_evento: 'Data (AAAA-MM-DD)', horario: 'Horário', local_nome: 'Local', endereco: 'Endereço', maps_url: 'Link do mapa',
  traje: 'Traje', formato: 'Formato do evento', mensagem: 'Mensagem do convite', valor_bebe: 'Valor por pessoa – com álcool (R$)', valor_nao_bebe: 'Valor por pessoa – sem álcool (R$)',
  prazo_pagamento: 'Prazo de pagamento', pix_tipo: 'Tipo de chave Pix', pix_chave: 'Chave Pix', pix_nome: 'Nome do favorecido', pix_qr_url: 'URL da imagem do QR Code (opcional)' };

function tableCard(title, heads, rows, sheet, hint) {
  const edit = sheet && canWrite(sheet) && !(sheet === 'Convidados' && false);
  const head = heads.map(h => `<th>${esc(h)}</th>`).join('') + (edit ? '<th></th>' : '');
  const body = rows.map(r => `<tr>${r[1].map(c => `<td>${/^<button/.test(String(c)) ? c : esc(c)}</td>`).join('')}${edit ? `<td class="num"><button class="btn ghost sm" data-act="edit" data-sheet="${sheet}" data-id="${esc(r[0])}">Editar</button></td>` : ''}</tr>`).join('');
  return `<section class="card">${title ? `<h3>${esc(title)}</h3>` : ''}${hint && !rows.length ? `<p class="muted">${esc(hint)}</p>` : ''}
    ${sheet && edit && sheet !== 'Convidados' ? `<p><button class="btn sm" data-act="edit" data-sheet="${sheet}">＋ Adicionar</button></p>` : ''}
    <div class="scroll"><table><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td colspan="${heads.length + 1}" class="muted">Sem registros.</td></tr>`}</tbody></table></div></section>`;
}

/* ---------- formulários de edição ---------- */
const FORMS = {
  Convidados: [['nome', 'Nome'], ['grupo', 'Família / grupo'], ['status', 'Status', ['pendente', 'confirmado', 'talvez', 'recusado']], ['bebe', 'Bebe álcool?', ['sim', 'nao']], ['criancas', 'Crianças (nº)'], ['observacoes', 'Observações'],
               ['pago', 'Pago?', ['nao', 'sim'], 'pay'], ['valor_acordado', 'Valor acordado (R$, opcional)', null, 'pay'], ['valor_pago', 'Valor pago (R$)', null, 'pay'], ['data_pagamento', 'Data do pagamento (AAAA-MM-DD)', null, 'pay']],
  Acomodacoes: [['quarto', 'Quarto / local'], ['tipo', 'Tipo (casal, beliche, colchão…)'], ['capacidade', 'Capacidade'], ['ocupantes', 'Quem dorme aqui (separe por vírgula)'], ['observacoes', 'Observações']],
  Cardapio: [['categoria', 'Categoria', ['Comida', 'Bebida alcoólica', 'Bebida sem álcool', 'Sobremesa', 'Descartáveis', 'Outros']], ['item', 'Item'], ['quantidade', 'Quantidade'], ['custo_estimado', 'Custo estimado (R$)'], ['status', 'Status', ['a comprar', 'comprado', 'fornecedor leva']], ['responsavel', 'Responsável']],
  Fornecedores: [['tipo', 'Tipo', ['Churrasqueiro', 'Empresa de comida', 'Banda / dupla', 'Atividade', 'Garçom / ajudante', 'Limpeza', 'Outro']], ['nome', 'Nome'], ['contato', 'Contato (só organizadores veem)'], ['valor', 'Valor (R$)'], ['sinal_pago', 'Sinal pago (R$)'], ['status', 'Status', ['orçando', 'reservado', 'contratado', 'pago']], ['detalhes', 'Detalhes (horário, repertório, cardápio…)'], ['lista_ajudantes', 'Equipe / ajudantes']],
  Despesas: [['descricao', 'Descrição'], ['valor', 'Valor (R$)'], ['status', 'Status', ['a pagar', 'pago']], ['depositar_para', 'Depositar para'], ['data', 'Data'], ['obs', 'Obs.']]
};

function openForm(sheet, id) {
  const d = S.data, key = { Convidados: 'convidados', Acomodacoes: 'acomodacoes', Cardapio: 'cardapio', Fornecedores: 'fornecedores', Despesas: 'despesas' }[sheet];
  const row = id ? d[key].find(x => x.id === id) || {} : {};
  let fields = FORMS[sheet];
  if (sheet === 'Convidados') fields = fields.filter(f => d.role === 'lufe' || (d.role === 'marina' ? f[3] === 'pay' : f[3] !== 'pay'));
  const f = $('#dlgForm');
  f.innerHTML = `<h3>${id ? 'Editar' : 'Adicionar'}</h3>` + fields.map(([k, l, opts]) => `<label>${l}</label>` +
    (opts ? `<select name="${k}">${opts.map(o => `<option ${row[k] === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>` : `<input name="${k}" value="${esc(row[k])}">`)).join('') +
    `<div class="row"><button class="btn" value="ok">Salvar</button><button class="btn ghost" value="cancel" formnovalidate>Cancelar</button>${id && d.role !== 'marina' ? '<button class="btn danger" value="del" formnovalidate>Excluir</button>' : ''}</div>`;
  const dlg = $('#dlg');
  f.onsubmit = async ev => {
    const v = ev.submitter && ev.submitter.value;
    if (v === 'ok') { const r = {}; fields.forEach(([k]) => r[k] = f.querySelector('[name="' + k + '"]').value); if (id) r.id = id; await act({ action: 'upsert', sheet, row: r }, 'Salvo ✔'); }
    if (v === 'del' && confirm('Excluir este registro?')) await act({ action: 'delete', sheet, id }, 'Excluído');
  };
  dlg.showModal();
}

/* ---------- eventos ---------- */
document.addEventListener('click', async ev => {
  const t = ev.target.closest('[data-tab],[data-act]'); if (!t) return;
  if (t.dataset.tab) { S.tab = t.dataset.tab; render(); window.scrollTo(0, 0); return; }
  const a = t.dataset.act;
  if (a === 'edit') openForm(t.dataset.sheet, t.dataset.id);
  if (a === 'copy') { try { await navigator.clipboard.writeText(t.dataset.v); toast('Chave copiada'); } catch (e) { toast('Copie manualmente'); } }
  if (a === 'mark-paid') await act({ action: 'upsert', sheet: 'Convidados', row: { id: t.dataset.id, pago: 'sim', data_pagamento: new Date().toISOString().slice(0, 10) } }, 'Pagamento confirmado ✔');
  if (a === 'ride-del') await act({ action: 'ride_del', id: t.dataset.id, token: S.token }, 'Removida');
});
document.addEventListener('change', ev => {
  if (ev.target.id === 'whoSel') { S.eu = ev.target.value; store.set('festa.eu', S.eu); load().then(render); }
});
document.addEventListener('submit', async ev => {
  const f = ev.target;
  if (f.id === 'rsvpForm') { ev.preventDefault(); const row = Object.fromEntries(new FormData(f)); await act({ action: 'rsvp', id: S.eu, row }, 'Resposta salva ✔'); }
  if (f.id === 'rideForm') { ev.preventDefault(); const row = Object.fromEntries(new FormData(f));
    const r = await act({ action: 'ride_add', row, token: S.token }, 'Carona publicada ✔');
    if (r && r.id) { S.rides.push(r.id); store.set('festa.rides', JSON.stringify(S.rides)); render(); } }
  if (f.id === 'cfgForm') { ev.preventDefault(); const row = Object.fromEntries(new FormData(f));
    try { for (const k of Object.keys(row)) { if (k === 'codigo_acesso' && !row[k]) continue; if (k !== 'codigo_acesso' && row[k] === String(S.data.config[k] == null ? '' : S.data.config[k])) continue;
        const r = await call(Object.assign(base(), { action: 'config_set', chave: k, valor: row[k] })); if (!r.ok) throw new Error(r.error);
        if (k === 'codigo_acesso') { S.code = row[k]; store.set('festa.code', S.code); } }
      await load(); render(); toast('Configuração salva ✔'); } catch (e) { toast('⚠ ' + e.message); } }
  if (f.id === 'gateForm') { ev.preventDefault(); S.code = $('#codeInput').value.trim(); S.pin = ''; await enter(true); }
});
$('#logoutBtn').onclick = () => { store.del('festa.code'); store.sdel('festa.pin'); S.code = ''; S.pin = ''; S.data = null; $('#app').hidden = true; showGate(); };
$('#orgBtn').onclick = async () => {
  const p = prompt('PIN de organizador:'); if (!p) return;
  S.pin = p.trim(); try { await load(); store.sset('festa.pin', S.pin); render(); toast('Modo organizador ativo'); } catch (e) { S.pin = ''; toast('⚠ ' + e.message); }
};

function showGate(msg) {
  $('#gate').hidden = false; $('#app').hidden = true; $('#gateMsg').textContent = msg || '';
  if (DEMO) $('#gateMsg').textContent = msg || 'Modo demonstração: código “demo”. PINs: lufe / marina / vanessa.';
}
async function enter(fromGate) {
  try { await load(); store.set('festa.code', S.code); $('#gate').hidden = true; $('#app').hidden = false; render(); }
  catch (e) { S.data = null; if (fromGate || S.code) store.del('festa.code'); S.code = ''; showGate(e.message); }
}

/* ---------- MODO DEMO (dados fictícios, só no navegador) ---------- */
function mock(p) {
  const KEY = 'festa.demo';
  let db = JSON.parse(store.get(KEY) || 'null');
  if (!db) {
    db = { config: { evento_titulo: 'Festa de Final de Ano do Zoo', data_evento: '2026-12-19', horario: 'A definir', local_nome: 'Sítio do Roque – Indaiatuba/SP', endereco: 'A definir', maps_url: '', traje: 'A definir', formato: 'A definir', mensagem: 'Dados fictícios de demonstração.', valor_bebe: '250', valor_nao_bebe: '150', prazo_pagamento: '', pix_tipo: 'A definir', pix_chave: '', pix_nome: '', pix_qr_url: '' },
      convidados: ['Ana Exemplo', 'Bruno Exemplo', 'Carla Exemplo', 'Diego Exemplo', 'Eva Exemplo'].map((n, i) => ({ id: 'g' + i, nome: n, grupo: '', status: i < 2 ? 'confirmado' : 'pendente', bebe: i === 1 ? 'nao' : 'sim', criancas: i === 0 ? 1 : 0, observacoes: '', pago: '', valor_acordado: '', valor_pago: '', data_pagamento: '' })),
      acomodacoes: [{ id: 'a1', quarto: 'Quarto 1', tipo: 'casal', capacidade: 2, ocupantes: 'Ana Exemplo, Bruno Exemplo', observacoes: '' }],
      cardapio: [{ id: 'c1', categoria: 'Comida', item: 'Picanha', quantidade: '3 peças', custo_estimado: '600', status: 'a comprar', responsavel: 'Lufe' }],
      fornecedores: [{ id: 'f1', tipo: 'Banda / dupla', nome: 'Dupla Exemplo', contato: '', valor: '2000', sinal_pago: '', status: 'orçando', detalhes: 'Sertanejo universitário', lista_ajudantes: '' }],
      despesas: [{ id: 'd1', descricao: 'Sinal da dupla', valor: '500', status: 'a pagar', depositar_para: 'Tadeu', data: '', obs: '' }], caronas: [], pins: { lufe: 'lufe', marina: 'marina', vanessa: 'vanessa' }, code: 'demo' };
  }
  const save = () => store.set(KEY, JSON.stringify(db));
  let role = null; const found = p.pin && Object.keys(db.pins).find(k => db.pins[k] === p.pin);
  if (p.pin && !found) return { ok: false, error: 'PIN de organizador inválido.' };
  if (found) role = found; else if (String(p.code || '').toLowerCase() !== db.code) return { ok: false, error: 'Código de acesso inválido.' };
  const keymap = { Convidados: 'convidados', Acomodacoes: 'acomodacoes', Cardapio: 'cardapio', Fornecedores: 'fornecedores', Despesas: 'despesas' };
  const nid = () => Math.random().toString(36).slice(2, 10);
  const PAY = ['pago', 'valor_acordado', 'valor_pago', 'data_pagamento'];
  switch (p.action) {
    case 'bootstrap': {
      const payOk = role === 'lufe' || role === 'marina', out = JSON.parse(JSON.stringify(db));
      out.convidados.forEach(g => { if (!payOk) PAY.forEach(f => delete g[f]); });
      out.caronas.forEach(c => delete c.dono_token); delete out.pins; delete out.code;
      const me = db.convidados.find(g => g.id === p.eu);
      const r = Object.assign({ ok: true, role, nome: role }, out);
      if (me) r.meu = { id: me.id, pago: me.pago, valor_acordado: me.valor_acordado, valor_pago: me.valor_pago, data_pagamento: me.data_pagamento };
      if (!role) { delete r.despesas; r.fornecedores.forEach(f => delete f.contato); }
      return r; }
    case 'rsvp': { const g = db.convidados.find(x => x.id === p.id); if (!g) return { ok: false, error: 'Convidado não encontrado.' };
      ['status', 'bebe', 'criancas', 'observacoes'].forEach(k => { if (k in p.row) g[k] = p.row[k]; }); save(); return { ok: true }; }
    case 'ride_add': { const id = nid(); db.caronas.push(Object.assign({ id, dono_token: p.token }, p.row)); save(); return { ok: true, id }; }
    case 'ride_del': { const i = db.caronas.findIndex(c => c.id === p.id); if (i >= 0 && (role || db.caronas[i].dono_token === p.token)) db.caronas.splice(i, 1); save(); return { ok: true }; }
    case 'upsert': { if (!role || WRITE_ROLES[p.sheet].indexOf(role) < 0) return { ok: false, error: 'Seu perfil não edita "' + p.sheet + '".' };
      const arr = db[keymap[p.sheet]]; let r = Object.assign({}, p.row);
      if (p.sheet === 'Convidados') { if (role === 'marina') r = Object.fromEntries(Object.entries(r).filter(([k]) => PAY.concat('id').indexOf(k) >= 0)); else if (role === 'vanessa') r = Object.fromEntries(Object.entries(r).filter(([k]) => PAY.indexOf(k) < 0)); }
      const ex = r.id && arr.find(x => x.id === r.id);
      if (ex) Object.assign(ex, r); else { if (p.sheet === 'Convidados' && role === 'marina') return { ok: false, error: 'Marina não cria convidados.' }; r.id = nid(); arr.push(r); }
      save(); return { ok: true, id: r.id }; }
    case 'delete': { if (!role || WRITE_ROLES[p.sheet].indexOf(role) < 0 || (p.sheet === 'Convidados' && role === 'marina')) return { ok: false, error: 'Sem permissão.' };
      const arr = db[keymap[p.sheet]], i = arr.findIndex(x => x.id === p.id); if (i >= 0) arr.splice(i, 1); save(); return { ok: true }; }
    case 'config_set': { if (role !== 'lufe') return { ok: false, error: 'Somente o Lufe altera a configuração.' };
      if (p.chave === 'codigo_acesso') db.code = String(p.valor).toLowerCase(); else db.config[p.chave] = p.valor; save(); return { ok: true }; }
  }
  return { ok: false, error: 'Ação desconhecida.' };
}

/* ---------- início ---------- */
if (S.code || S.pin) enter(false); else showGate();
})();
