/**
 * Festa do Zoo – API em Google Apps Script (planilha como banco de dados).
 *
 * Como usar: abra a planilha > Extensões > Apps Script > cole este arquivo,
 * rode setup() uma vez e publique como "App da Web" (executar como: você;
 * acesso: qualquer pessoa). Passo a passo completo no DEPLOY.md.
 *
 * Segurança: a planilha NÃO é compartilhada. Só este script (rodando como o dono)
 * lê/grava. O código de acesso e os PINs ficam nas abas Config/Organizadores,
 * que só o dono da planilha edita.
 */

const SCHEMA = {
  Config: ['chave', 'valor'],
  Organizadores: ['nome', 'pin', 'perfil'], // perfil: lufe | marina | vanessa
  Convidados: ['id', 'nome', 'grupo', 'status', 'bebe', 'criancas', 'observacoes',
               'pago', 'valor_acordado', 'valor_pago', 'data_pagamento', 'atualizado_em'],
  Acomodacoes: ['id', 'quarto', 'tipo', 'capacidade', 'ocupantes', 'observacoes'],
  Cardapio: ['id', 'categoria', 'item', 'quantidade', 'custo_estimado', 'status', 'responsavel'],
  Fornecedores: ['id', 'tipo', 'nome', 'contato', 'valor', 'sinal_pago', 'status', 'detalhes', 'lista_ajudantes'],
  Despesas: ['id', 'descricao', 'valor', 'status', 'depositar_para', 'data', 'obs'],
  Caronas: ['id', 'tipo', 'nome', 'origem', 'vagas', 'horario', 'contato', 'obs', 'dono_token', 'criado_em']
};

// Quem pode gravar em cada aba (perfis de organizador).
const WRITE_ROLES = {
  Convidados: ['lufe', 'vanessa', 'marina'], // campos de pagamento: ver PAY_FIELDS
  Acomodacoes: ['lufe', 'vanessa'],
  Cardapio: ['lufe'],
  Fornecedores: ['lufe', 'vanessa'],
  Despesas: ['lufe', 'marina'],
  Caronas: ['lufe', 'vanessa', 'marina']
};
const PAY_FIELDS = ['pago', 'valor_acordado', 'valor_pago', 'data_pagamento'];
const PAY_ROLES = ['lufe', 'marina'];
const GUEST_RSVP_FIELDS = ['status', 'bebe', 'criancas', 'observacoes'];
const SECRET_KEYS = ['codigo_acesso'];

const DEFAULT_CONFIG = [
  ['codigo_acesso', 'TROQUE-ESTE-CODIGO'],
  ['evento_titulo', 'Festa de Final de Ano do Zoo'],
  ['data_evento', '2026-12-19'],
  ['horario', 'A definir'],
  ['local_nome', 'Sítio do Roque – Indaiatuba/SP'],
  ['endereco', 'A definir'],
  ['maps_url', ''],
  ['traje', 'A definir'],
  ['formato', 'A definir'],
  ['mensagem', ''],
  ['valor_bebe', ''],
  ['valor_nao_bebe', ''],
  ['prazo_pagamento', ''],
  ['pix_tipo', 'A definir'],
  ['pix_chave', ''],
  ['pix_nome', ''],
  ['pix_qr_url', '']
];

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SCHEMA).forEach(function (name) {
    let sh = ss.getSheetByName(name) || ss.insertSheet(name);
    const h = SCHEMA[name];
    sh.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold');
    sh.setFrozenRows(1);
  });
  const cfg = ss.getSheetByName('Config');
  if (cfg.getLastRow() < 2) cfg.getRange(2, 1, DEFAULT_CONFIG.length, 2).setValues(DEFAULT_CONFIG);
  const org = ss.getSheetByName('Organizadores');
  if (org.getLastRow() < 2) {
    org.getRange(2, 1, 3, 3).setValues([
      ['Lufe', 'TROQUE-1', 'lufe'], ['Marina', 'TROQUE-2', 'marina'], ['Vanessa', 'TROQUE-3', 'vanessa']
    ]);
  }
  const first = ss.getSheetByName('Planilha1') || ss.getSheetByName('Sheet1');
  if (first && ss.getSheets().length > 1) ss.deleteSheet(first);
}

/* ---------- entrada ---------- */

function doGet() { return json_({ ok: true, msg: 'API da Festa do Zoo no ar.' }); }

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents || '{}');
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try { return json_(route_(req)); } finally { lock.releaseLock(); }
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function route_(req) {
  const auth = auth_(req);
  switch (req.action) {
    case 'bootstrap': return bootstrap_(req, auth);
    case 'rsvp': return rsvp_(req);
    case 'ride_add': return rideAdd_(req);
    case 'ride_del': return rideDel_(req, auth);
    case 'upsert': return upsert_(req, auth);
    case 'delete': return delete_(req, auth);
    case 'config_set': return configSet_(req, auth);
    default: throw new Error('Ação desconhecida.');
  }
}

/* ---------- autenticação ---------- */

function auth_(req) {
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('fails') || 0);
  if (fails >= 40) throw new Error('Muitas tentativas incorretas. Aguarde 10 minutos.');
  const cfg = cfgMap_();
  let role = null, nome = null;
  if (req.pin) {
    const o = readAll_('Organizadores').filter(function (r) { return String(r.pin) === String(req.pin).trim(); })[0];
    if (!o) { cache.put('fails', String(fails + 1), 600); throw new Error('PIN de organizador inválido.'); }
    role = String(o.perfil).toLowerCase(); nome = o.nome;
  } else if (String(req.code || '').trim().toLowerCase() !== String(cfg.codigo_acesso || '').trim().toLowerCase()
             || !cfg.codigo_acesso) {
    cache.put('fails', String(fails + 1), 600);
    throw new Error('Código de acesso inválido.');
  }
  return { role: role, nome: nome };
}

/* ---------- leitura ---------- */

function bootstrap_(req, auth) {
  const cfg = cfgMap_();
  SECRET_KEYS.forEach(function (k) { delete cfg[k]; });
  const org = !!auth.role;
  const payOk = org && PAY_ROLES.indexOf(auth.role) >= 0;
  const convidados = readAll_('Convidados').map(function (g) {
    const o = strip_(g);
    if (!payOk) PAY_FIELDS.forEach(function (f) { delete o[f]; });
    return o;
  });
  const out = {
    ok: true, role: auth.role, nome: auth.nome, config: cfg, convidados: convidados,
    acomodacoes: readAll_('Acomodacoes').map(strip_),
    cardapio: readAll_('Cardapio').map(strip_),
    fornecedores: readAll_('Fornecedores').map(strip_),
    despesas: readAll_('Despesas').map(strip_),
    caronas: readAll_('Caronas').map(function (c) { const o = strip_(c); delete o.dono_token; return o; })
  };
  if (req.eu) { // pagamento do próprio convidado
    const me = readAll_('Convidados').filter(function (g) { return g.id === req.eu; })[0];
    if (me) out.meu = { id: me.id, pago: me.pago, valor_acordado: me.valor_acordado, valor_pago: me.valor_pago, data_pagamento: me.data_pagamento };
  }
  if (!org) { // despesas e contatos de fornecedores só para organizadores
    delete out.despesas;
    out.fornecedores.forEach(function (f) { delete f.contato; });
  }
  return out;
}

/* ---------- escrita ---------- */

function rsvp_(req) {
  const sh = sheet_('Convidados'), rows = readAll_('Convidados');
  const g = rows.filter(function (r) { return r.id === req.id; })[0];
  if (!g) throw new Error('Convidado não encontrado. Peça à Vanessa para incluir seu nome.');
  const patch = pick_(req.row || {}, GUEST_RSVP_FIELDS);
  if (['pendente', 'confirmado', 'talvez', 'recusado'].indexOf(patch.status) < 0 && 'status' in patch)
    throw new Error('Status inválido.');
  patch.atualizado_em = new Date().toISOString();
  writeRow_(sh, g._row, patch);
  return { ok: true };
}

function rideAdd_(req) {
  const r = req.row || {};
  if (!r.nome || !r.origem) throw new Error('Informe nome e origem.');
  const newId = id_();
  appendRow_('Caronas', {
    id: newId, tipo: r.tipo === 'pedido' ? 'pedido' : 'oferta', nome: r.nome, origem: r.origem,
    vagas: r.vagas || '', horario: r.horario || '', contato: r.contato || '', obs: r.obs || '',
    dono_token: String(req.token || ''), criado_em: new Date().toISOString()
  });
  return { ok: true, id: newId };
}

function rideDel_(req, auth) {
  const row = readAll_('Caronas').filter(function (c) { return c.id === req.id; })[0];
  if (!row) return { ok: true };
  const mine = req.token && String(req.token) === String(row.dono_token);
  if (!mine && !auth.role) throw new Error('Sem permissão para remover esta carona.');
  sheet_('Caronas').deleteRow(row._row);
  return { ok: true };
}

function upsert_(req, auth) {
  const name = req.sheet;
  if (!auth.role) throw new Error('Apenas organizadores.');
  if (!WRITE_ROLES[name] || WRITE_ROLES[name].indexOf(auth.role) < 0) throw new Error('Seu perfil não edita "' + name + '".');
  let row = Object.assign({}, req.row || {});
  const editable = SCHEMA[name].filter(function (c) { return c !== 'id' && c !== 'dono_token' && c !== 'criado_em' && c !== 'atualizado_em'; });
  let allowed = editable;
  if (name === 'Convidados') {
    allowed = PAY_ROLES.indexOf(auth.role) >= 0 ? editable : editable.filter(function (c) { return PAY_FIELDS.indexOf(c) < 0; });
    if (auth.role === 'marina') allowed = PAY_FIELDS; // Marina cuida só de pagamentos
  }
  const patch = pick_(row, allowed);
  const existing = row.id ? readAll_(name).filter(function (r) { return r.id === row.id; })[0] : null;
  if (name === 'Convidados') patch.atualizado_em = new Date().toISOString();
  if (existing) writeRow_(sheet_(name), existing._row, patch);
  else {
    if (name === 'Convidados' && auth.role === 'marina') throw new Error('Marina não cria convidados.');
    patch.id = id_(); appendRow_(name, patch); row.id = patch.id;
  }
  return { ok: true, id: existing ? existing.id : patch.id };
}

function delete_(req, auth) {
  const name = req.sheet;
  if (!auth.role || !WRITE_ROLES[name] || WRITE_ROLES[name].indexOf(auth.role) < 0) throw new Error('Sem permissão.');
  if (name === 'Convidados' && auth.role === 'marina') throw new Error('Sem permissão.');
  const row = readAll_(name).filter(function (r) { return r.id === req.id; })[0];
  if (row) sheet_(name).deleteRow(row._row);
  return { ok: true };
}

function configSet_(req, auth) {
  if (auth.role !== 'lufe') throw new Error('Somente o Lufe altera a configuração.');
  const sh = sheet_('Config'), rows = readAll_('Config');
  const hit = rows.filter(function (r) { return r.chave === req.chave; })[0];
  if (hit) sh.getRange(hit._row, 2).setValue(req.valor);
  else sh.appendRow([req.chave, req.valor]);
  return { ok: true };
}

/* ---------- utilitários ---------- */

function sheet_(n) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(n); }
function id_() { return Utilities.getUuid().slice(0, 8); }
function strip_(o) { const c = Object.assign({}, o); delete c._row; return c; }
function pick_(src, keys) { const o = {}; keys.forEach(function (k) { if (k in src) o[k] = src[k]; }); return o; }

function readAll_(name) {
  const sh = sheet_(name), last = sh.getLastRow(), h = SCHEMA[name];
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, h.length).getValues().map(function (v, i) {
    const o = { _row: i + 2 };
    h.forEach(function (c, j) {
      let x = v[j];
      if (x instanceof Date) x = Utilities.formatDate(x, 'America/Sao_Paulo', "yyyy-MM-dd");
      o[c] = x;
    });
    return o;
  });
}

function cfgMap_() {
  const m = {};
  readAll_('Config').forEach(function (r) { m[r.chave] = r.valor; });
  return m;
}

function writeRow_(sh, rowNum, patch) {
  const name = sh.getName(), h = SCHEMA[name];
  Object.keys(patch).forEach(function (k) {
    const col = h.indexOf(k);
    if (col >= 0) sh.getRange(rowNum, col + 1).setValue(patch[k]);
  });
}

function appendRow_(name, obj) {
  const h = SCHEMA[name];
  sheet_(name).appendRow(h.map(function (c) { return c in obj ? obj[c] : ''; }));
}
