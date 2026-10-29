/* ==========================================================================
   FNCP CONTROL — script.js
   Sumário
     1.  Catálogo e constantes
     2.  Armazenamento, estado global e persistência
     3.  Helpers de formatação e templates
     4.  Permissões
     5.  Tema
     6.  Navegação, render principal e modal
     7.  Dashboard Mensal
     8.  Lançamentos
     9.  Histórico, auditoria e lixeira
    10.  Relatórios
    11.  Empresas e títulos
    12.  Exportação (CSV / Excel)
    13.  Dashboard Fiscal
    14.  Inicialização
   ========================================================================== */


/* ==========================================================================
   1. CATÁLOGO E CONSTANTES
   ========================================================================== */

const BASE = [
  ["CIRION - SP", ["CIRION - Link Internet Rochaverá"]],
  ["CIRION - RJ", ["CIRION - Internet redundante Rio-Sul"]],
  ["DIGITAL OCEAN", ["DIGITAL OCEAN - Hospedagem Site Lockton (pago via cartão de crédito do FACILITIES)"]],
  ["EQUINIX", ["EQUINIX - Datacenter - migração para Azure para 2025-2026"]],
  ["FATURA REAL", ["FATURA REAL - Consultoria e Analise de contas de celular"]],
  ["MICROWARE", ["MICROWARE TECNOLOGIA - SUPORTE TECNICO EM INFORMATICA"]],
  ["Mundivox #MVX-11000460 - Rochaverá - Internet", ["Mundivox #MVX-11000460 - Rochaverá - Internet"]],
  ["Mundivox #MVX-11008952 - Campinas - Internet", ["Mundivox #MVX-11008952 - Campinas - Internet"]],
  ["Mundivox #MVX-11014359 - Equinix Internet", ["Mundivox #MVX-11014359 - Equinix Internet"]],
  ["Mundivox #MVX-95326 - Internet RIO-Sul - 100 Mb", ["Mundivox #MVX-95326 - Internet RIO-Sul - 100 Mb"]],
  ["NET2PHONE", ["NET2PHONE - Provedor de telefonia Lockton SP e Lockton RJ"]],
  ["OSI Telecom", ["OSI Telecom - Internet Redundante Campinas"]],
  ["SELBETTI", ["SELBETTI - Telefonia (PABX) Lockton"]],
  ["SERVITEC", ["Servitec Brasil - Locação e Gerenciamento de Impressoras"]],
  ["SISCOR", ["SISCOR - Placement (créditos para área de People Solutions)"]],
  ["VIVO FIXA", ["VIVO - Telefonia Fixa Lockton"]],
  ["VIVO MOVEL", ["VIVO - Telefonia Movel Lockton+Compra de aparelhos em 24x"]],
  ["Manage Engine", ["Licenciamento do ME - Anual"]],
  ["CRYSTAL TELECOM", []],
  ["DELL MANUTENÇÕES", [
    "DELL COMPUTADORES - Reparo notebook",
    "DELL COMPUTADORES - Reparo teclado",
    "DELL COMPUTADORES - Reparo"
  ]],
  ["LENOVO NOTEBOOK", [
    "LENOVO - Compra de 30 Notebooks Jun.",
    "LENOVO - Compra de Equipamentos Rodrigo Botti 4 notebooks"
  ]],
  ["LENOVO SERVIDOR", ["LENOVO - Compra do Servidor de Arquivos para Migração Azure Files"]],
  ["LENOVO HEADSETS", ["LENOVO - Compra de 40 Headsets"]],
  ["LENOVO CARREGADORES", ["LENOVO - Compra de Carregadores"]],
  ["Registro - BR", ["Pagamento - Registro.br Domínio lockton.com.br"]],
  ["SCANSOURCE", ["SCANSOURCE - Licenciamento AP da Aruba Rio de Janeiro - 1572 - Services Portal"]]
];

const ST = [
  "Pendente",
  "Pago",
  "Cancelado",
  "Aguardando Pagamento"
];
const MON = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const ML = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];


/* ==========================================================================
   2. ARMAZENAMENTO, ESTADO GLOBAL E PERSISTÊNCIA
   ========================================================================== */

const storage = {
  get(k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  },
  set(k, v) {
    try { localStorage.setItem(k, v); return true; } catch (e) { return false; }
  },
  remove(k) {
    try { localStorage.removeItem(k); } catch (e) {}
  }
};

const get = (k, d) => {
  try {
    const raw = storage.get(k);
    return raw ? JSON.parse(raw) : structuredClone(d);
  } catch {
    return structuredClone(d);
  }
};

// CAT = catálogo | P = pagamentos | A = auditoria
// TD = títulos excluídos | CD = empresas excluídas
let CAT = get('fncp_catalog', BASE);
let P   = get('fncp_payments', []);
let A   = get('fncp_audit', []);
let TD  = get('fncp_deleted_titles', {});
let CD  = get('fncp_deleted_companies', {});

let S = {
  view: 'dash',
  q: '',
  year: String(new Date().getFullYear()),
  company: '',
  status: '',
  month: ''
};
let pendingTitleDelete = null;

const uid = () => {
  try {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  } catch (e) {}
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
};

const save = () => {
  const ok = [
    storage.set('fncp_catalog', JSON.stringify(CAT)),
    storage.set('fncp_payments', JSON.stringify(P)),
    storage.set('fncp_audit', JSON.stringify(A)),
    storage.set('fncp_deleted_titles', JSON.stringify(TD)),
    storage.set('fncp_deleted_companies', JSON.stringify(CD))
  ].every(Boolean);
  if (!ok) console.warn('Persistência local indisponível; dados mantidos somente nesta sessão.');
  return ok;
};

const titleKey = (ci, ti) => `${ci}:${ti}`;
const titleDeleted = (ci, ti) => !!TD[titleKey(ci, ti)];
function companyDeleted(i) { return !!CD[String(i)]; }


/* ==========================================================================
   3. HELPERS DE FORMATAÇÃO E TEMPLATES
   ========================================================================== */

// Lê o HTML de um <template id="..."> definido no index.html
const tpl = id => document.getElementById(id)?.innerHTML ?? '';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));

const brl = n => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dbr = s => s ? s.split('-').reverse().join('/') : '—';
const cn  = i => CAT[i]?.[0] || 'Empresa removida';
const tn  = p => CAT[p.cid]?.[1]?.[p.tid] || 'Título removido';
const comp = p => p.pay ? `${p.pay.slice(5, 7)}/${p.pay.slice(0, 4)}` : '—';

function formatDateTime(v) { return v ? new Date(v).toLocaleString('pt-BR') : '—'; }

function fmtVal(k, v) {
  if (v === null || v === undefined || v === '') return '—';
  if (k === 'amt') return brl(v);
  return String(v);
}

function entityName(type, id) {
  if (type === 'FNCP') {
    const p = P.find(x => x.id === id);
    return p?.fncp || id;
  }
  if (type === 'Empresa') return CAT[id]?.[0] || id;
  if (type === 'Título') {
    const [ci, ti] = String(id).split(':').map(Number);
    return CAT[ci]?.[1]?.[ti] || id;
  }
  return id;
}

function audit(action, entity, id, details, before = null, after = null) {
  A.unshift({
    id: uid(),
    at: new Date().toISOString(),
    user: currentUser(),
    action,
    entity,
    entityId: id,
    details,
    before,
    after
  });
  save();
}

function diffPayment(a, b) {
  const labels = {
    fncp: 'FNCP', cid: 'Empresa', tid: 'Título', amt: 'Valor', due: 'Vencimento',
    pay: 'Pagamento', st: 'Status', tag: 'TAG/TEG', obs: 'Observações'
  };
  const out = [];
  Object.keys(labels).forEach(k => {
    const x = a?.[k] ?? '', y = b?.[k] ?? '';
    if (String(x) !== String(y)) out.push({ field: labels[k], before: x, after: y, key: k });
  });
  return out;
}


/* ==========================================================================
   4. PERMISSÕES
   ========================================================================== */

const isLoggedIn = () => true;
const isAdmin = () => true;
const currentUser = () => "Sistema";
const currentEmail = () => "";

function requireAdmin() {
  return true;
}

function requireAuth() {
  return true;
}


/* ==========================================================================
   5. TEMA
   ========================================================================== */

function applyTheme() {
  const dark = storage.get('fncp_theme') === 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const b = document.getElementById('themeBtn');
  if (b) {
    b.textContent = dark ? '☀️' : '🌙';
    b.title = dark ? 'Ativar modo claro' : 'Ativar modo noturno';
  }
}

function toggleTheme() {
  const dark = document.documentElement.dataset.theme !== 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  storage.set('fncp_theme', dark ? 'dark' : 'light');
  const b = document.getElementById('themeBtn');
  if (b) {
    b.textContent = dark ? '☀️' : '🌙';
    b.title = dark ? 'Ativar modo claro' : 'Ativar modo noturno';
  }
}


/* ==========================================================================
   6. NAVEGAÇÃO, RENDER PRINCIPAL E MODAL
   ========================================================================== */

function go(v) {
  S.view = v;
  render();
}

function yrs() {
  const a = new Set(P.filter(p => p.cy).map(p => +p.cy));
  a.add(new Date().getFullYear());
  return [...a].sort((a, b) => b - a);
}

function render() {
  const items = isLoggedIn()
    ? [
        ['dash', 'Dashboard Mensal'],
        ['fiscal', 'Dashboard Fiscal'],
        ['reports', 'Relatórios'],
        ['companies', 'Empresas'],
        ['history', 'Histórico'],
        ['trash', 'Lixeira']
      ]
    : [
        ['dash', 'Dashboard Mensal'],
        ['fiscal', 'Dashboard Fiscal'],
        ['companies', 'Empresas']
      ];

  if (!items.some(x => x[0] === S.view)) S.view = 'dash';

  document.getElementById('nav').innerHTML = items
    .map(x => `<button class="${S.view == x[0] ? 'active' : ''}" onclick="go('${x[0]}')">${x[1]}</button>`)
    .join('');

  const views = { dash, reports, companies, history, trash };
  document.getElementById('app').innerHTML = (S.view === 'fiscal')
    ? fiscalView()
    : (views[S.view] || dash)();

  if (S.view === 'fiscal') {
    document.getElementById('fiscalWrap')?.classList.add('active');
    initFiscalDashboard();
  }

  const ul = document.getElementById('userLabel');
  if (ul) ul.textContent = isLoggedIn() ? currentUser() : 'Entrar';
}

function closeModal() {
  document.getElementById('modal').classList.remove('show');
}

function userModal() {
  document.getElementById('modalBody').innerHTML = tpl('tpl-system-info');
  document.getElementById('modal').classList.add('show');
}


/* ==========================================================================
   7. DASHBOARD MENSAL
   ========================================================================== */

let DASH_DATA = [];
let DASH_API_READY = false;

const DASH_MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DASH_SHORT  = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/* ---- 7.1 Parsers e helpers ---- */

function parseNumericValue(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  let s = String(value).trim();
  if (!s) return null;

  const negative = /^\s*\(.*\)\s*$/.test(s);
  s = s.replace(/[()\s]/g, '').replace(/[^0-9,.-]/g, '');
  if (!s || !/[0-9]/.test(s)) return null;

  const comma = s.lastIndexOf(','), dot = s.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) {
    if (comma > dot) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (comma >= 0) {
    s = s.replace(/\./g, '').replace(',', '.');
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -Math.abs(n) : n;
}

function dashAmount(r) { return parseNumericValue(r?.valor) ?? 0; }

function dashDate(s) {
  if (!s) return null;
  const x = String(s).trim();
  let m = x.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = x.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
}

function dashComp(r) {
  const m = String(r?.competencia || '').match(/^(\d{4})-(\d{1,2})$/);
  if (m) {
    const month = +m[2];
    if (month >= 1 && month <= 12) return { y: +m[1], m: month };
  }
  const d = dashDate(r?.dataPagamento);
  return d ? { y: d.getFullYear(), m: d.getMonth() + 1 } : null;
}

/* ---- 7.2 Fonte de dados ---- */

function dashRows() {
  if (DASH_API_READY) return DASH_DATA;
  return P.filter(p => !p.deleted).map(p => ({
    fncp: p.fncp,
    empresa: cn(p.cid),
    titulo: tn(p),
    valor: p.amt,
    competencia: p.pay ? p.cy + '-' + String(p.cm).padStart(2, '0') : '',
    dataVencimento: p.due,
    dataPagamento: p.pay,
    status: p.st,
    formaPagamento: '',
    identificadorErp: '',
    observacoes: p.obs,
    jiraKey: p.fncp,
    jiraUrl: ''
  }));
}

function loadDashboardApi() {
  fetch('/api/fncps', { cache: 'no-store' })
    .then(r => {
      if (!r.ok) throw Error('HTTP ' + r.status);
      return r.json();
    })
    .then(x => {
      const rows = Array.isArray(x) ? x : x?.fncps;
      if (!Array.isArray(rows)) throw Error('Resposta sem lista fncps');
      DASH_DATA = rows;
      DASH_API_READY = true;
      render();
    })
    .catch(e => {
      console.warn('API FNCP não disponível; usando dados locais.', e.message);
      render();
    });
}

/* ---- 7.3 Agregações e filtros ---- */

function dashYears() {
  const ys = new Set([2025, new Date().getFullYear()]);
  dashRows().forEach(r => {
    const d = dashComp(r);
    if (d) ys.add(d.y);
  });
  return [...ys].sort((a, b) => b - a);
}

function dashMonthValue(y, m, rows) {
  return rows
    .filter(r => { const d = dashComp(r); return d && d.y === y && d.m === m; })
    .reduce((s, r) => s + dashAmount(r), 0);
}

function dashYearRows(y, rows) {
  const now = new Date();
  return rows.filter(r => {
    const d = dashComp(r);
    if (!d || d.y !== y) return false;
    if (y === now.getFullYear() && d.m > now.getMonth() + 1) return false;
    return true;
  });
}

function dashCurrentFilters(rows) {
  const company = S.company, status = S.status;
  const q = String(S.q || '').toLocaleLowerCase('pt-BR').trim();
  return rows.filter(r => {
    if (company && String(r.empresa || '') !== company) return false;
    if (status && String(r.status || '') !== status) return false;
    if (q && ![r.fncp, r.jiraKey, r.titulo, r.empresa, r.empresaJira, r.tag, r.observacoes, r.identificadorErp]
      .some(x => String(x || '').toLocaleLowerCase('pt-BR').includes(q))) return false;
    return true;
  });
}

function dashPickMonth(m) { S.month = String(m); render(); }

/* ---- 7.4 Exportação do dashboard ---- */

function dashCsv(rows, name) {
  const h = ['FNCP', 'Empresa', 'Título', 'Valor', 'Competência', 'Vencimento', 'Pagamento', 'Status', 'Forma de pagamento', 'Identificador ERP', 'Observações', 'Jira'];
  const out = [
    h,
    ...rows.map(r => [
      r.fncp || r.jiraKey || '', r.empresa || '', r.titulo || '', dashAmount(r),
      r.competencia || '', r.dataVencimento || '', r.dataPagamento || '', r.status || '',
      r.formaPagamento || '', r.identificadorErp || '', r.observacoes || '', r.jiraUrl || ''
    ])
  ].map(row => row.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(';'));

  const b = new Blob(['\ufeff' + out.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = name + '.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function dashExcel(rows, name) {
  const h = ['FNCP', 'Empresa', 'Título', 'Valor', 'Competência', 'Vencimento', 'Pagamento', 'Status', 'Forma de pagamento', 'Identificador ERP', 'Observações'];
  const body = rows.map(r => [
    r.fncp || r.jiraKey || '', r.empresa || '', r.titulo || '', dashAmount(r),
    r.competencia || '', r.dataVencimento || '', r.dataPagamento || '', r.status || '',
    r.formaPagamento || '', r.identificadorErp || '', r.observacoes || ''
  ]);

  const table = '<table border="1"><tr>' + h.map(x => '<th>' + esc(x) + '</th>').join('') + '</tr>'
    + body.map(row => '<tr>' + row.map(x => '<td>' + esc(x) + '</td>').join('') + '</tr>').join('')
    + '</table>';

  const b = new Blob(['<html><meta charset="utf-8"><body>' + table + '</body></html>'], { type: 'application/vnd.ms-excel' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = name + '.xls';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---- 7.5 Tabela de lançamentos ---- */

function dashRenderTable(rows) {
  const sorted = [...rows].sort((a, b) =>
    String(b.jiraUpdated || b.dataPagamento || b.jiraCreated || '')
      .localeCompare(String(a.jiraUpdated || a.dataPagamento || a.jiraCreated || '')));

  if (!sorted.length) return '<div class="empty">Nenhum lançamento encontrado para o período selecionado.</div>';

  // FNCP clicável: usa a URL do Jira da API; se não houver, monta a partir da chave
  const fncpCell = r => {
    const key = r.fncp || r.jiraKey || '';
    if (!key) return '—';
    const url =
      r.jiraUrl ||
      `https://locktonbrasil.atlassian.net/browse/${encodeURIComponent(key)}`;
    return `<a href="${esc(url)}" target="_blank" rel="noopener"><b>${esc(key)}</b></a>`;
  };

  return '<div class="table"><table><tr><th>FNCP</th><th>Empresa</th><th>Título</th><th class="num">Valor</th><th>Vencimento</th><th>Pagamento</th><th>Status</th><th>Jira</th></tr>'
    + sorted.map(r =>
      '<tr><td>' + fncpCell(r) + '</td>'
      + '<td>' + esc(r.empresa || '—') + '</td>'
      + '<td>' + esc(r.titulo || '—') + '</td>'
      + '<td class="num">' + brl(dashAmount(r)) + '</td>'
      + '<td>' + esc(r.dataVencimento || '—') + '</td>'
      + '<td>' + esc(r.dataPagamento || '—') + '</td>'
      + '<td>' + esc(r.status || '—') + '</td>'
      + '<td>' + (r.jiraUrl ? '<a href="' + esc(r.jiraUrl) + '" target="_blank" rel="noopener">Abrir</a>' : '—') + '</td></tr>'
    ).join('')
    + '</table></div>';
}

/* ---- 7.6 View ---- */

function dash() {
  const rows = dashRows(), ys = dashYears();
  const y = ys.includes(+S.year) ? +S.year : ys[0];
  const selectedMonth = S.month ? +S.month : null;
  const m = selectedMonth ? +selectedMonth : new Date().getMonth() + 1;

  if (!S.year) S.year = String(y);
  if (!S.month) S.month = String(m);

  const filtered = dashCurrentFilters(rows);
  const monthRows = selectedMonth
    ? filtered.filter(r => { const d = dashComp(r); return d && d.y === y && d.m === m; })
    : filtered.filter(r => { const d = dashComp(r); return d && d.y === y; });

  const annual = dashYearRows(y, filtered);
  const annualTotal = annual.reduce((s, r) => s + dashAmount(r), 0);
  const monthTotal = monthRows.reduce((s, r) => s + dashAmount(r), 0);

  const vals = Array.from({ length: 12 }, (_, i) => dashMonthValue(y, i + 1, filtered));
  const mx = Math.max(...vals, 1);

  const bars = vals.map((v, i) => {
    const h = v ? Math.max(3, v / mx * 175) : 0;
    return `<div class="barcol clickable" onclick="dashPickMonth(${i + 1})" title="${DASH_MONTHS[i]}: ${brl(v)}">
      <div class="barval">${v ? brl(v) : '—'}</div>
      <div class="bar ${m === i + 1 ? 'selected' : ''}" style="height:${h}px"></div>
      <div class="barlabel">${DASH_SHORT[i]}</div>
    </div>`;
  }).join('');

  const by = {};
  monthRows.forEach(r => {
    const k = String(r.empresa || 'Sem empresa').trim() || 'Sem empresa';
    by[k] = (by[k] || 0) + dashAmount(r);
  });

  const statuses = [
    "Pendente",
    "Pago",
    "Cancelado",
    "Aguardando Pagamento"
  ];
  const companies = [...new Set(rows.map(r => String(r.empresa || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const now = new Date();
  const end = y === now.getFullYear() ? now.toLocaleDateString('pt-BR') : `31/12/${y}`;

  return `<div class="monthly-dashboard">
    <div class="head"><div>
      <h1>Dashboard Mensal</h1>
      <div class="muted">Acompanhamento financeiro por mês e competência. ${DASH_API_READY ? rows.length + ' FNCP(s) carregados do Jira.' : 'Carregando dados do Jira...'}</div>
    </div></div>

    <div class="card filters-monthly">
      <div class="field"><label>Ano</label>
        <select onchange="S.year=this.value;S.month='';render()">
          ${ys.map(v => `<option value="${v}" ${v === y ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>Mês</label>
        <select onchange="S.month=this.value;render()">
          <option value="" ${!S.month ? 'selected' : ''}>Todos</option>
          ${DASH_MONTHS.map((v, i) => `<option value="${i + 1}" ${i + 1 === m && S.month ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>Empresa</label>
        <select onchange="S.company=this.value;render()">
          <option value="">Todas as empresas</option>
          ${companies.map(c => `<option value="${esc(c)}" ${S.company === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>Status</label>
        <select onchange="S.status=this.value;render()">
          <option value="">Todos os status</option>
          ${statuses.map(st => `<option value="${esc(st)}" ${S.status === st ? 'selected' : ''}>${esc(st)}</option>`).join('')}
        </select>
      </div>
      <div class="actions span-all">
        <button class="btn secondary" onclick="S.q='';S.company='';S.status='';render()">Limpar filtros</button>
        <button class="btn secondary" onclick="dashCsv(monthRows,'FNCP_'+y+(selectedMonth?'_'+String(m).padStart(2,'0'):'_TODOS'))">Exportar CSV</button>
        <button class="btn secondary" onclick="dashExcel(monthRows,'FNCP_'+y+(selectedMonth?'_'+String(m).padStart(2,'0'):'_TODOS'))">Exportar Excel</button>
      </div>
    </div>

    <div class="kpis-monthly">
      <div class="card kpi"><small>Gasto anual</small><strong>${brl(annualTotal)}</strong><em>01/01/${y} até ${end}</em></div>
      <div class="card kpi"><small>Gasto do mês</small><strong>${brl(monthTotal)}</strong><em>${DASH_MONTHS[m - 1]}/${y}</em></div>
    </div>

    <div class="two">
      <div class="card">
        <h2>Gasto mensal</h2>
        <div class="muted">Valores gastos em cada mês do ano selecionado.</div>
        <div class="chart"><div class="monthly-bars">${bars}</div></div>
        <div class="note">Clique em uma barra para selecionar o mês e carregar os lançamentos abaixo.</div>
      </div>
      <div class="card">
        <h2>Gasto por empresa</h2>
        <div class="muted">Valores após aplicar os filtros do mês.</div>
        ${Object.keys(by).length
          ? `<div class="company-list">${Object.entries(by).sort((a, b) => b[1] - a[1])
              .map(([name, v]) => `<div class="company-row"><span>${esc(name)}</span><b>${brl(v)}</b></div>`).join('')}</div>`
          : '<div class="empty">Sem dados no mês selecionado.</div>'}
      </div>
    </div>

    <div class="card">
      <h2>Lançamentos do mês</h2>
      <div class="muted mb-10">${selectedMonth ? DASH_MONTHS[m - 1] + '/' + y : 'Todos os meses de ' + y} · ${monthRows.length} lançamento(s)</div>
      ${dashRenderTable(monthRows)}
    </div>
  </div>`;
}


/* ==========================================================================
   8. LANÇAMENTOS
   ========================================================================== */

// Tela "Nova FNCP" desativada: redireciona para o Dashboard Mensal
function newF() {
  go('dash');
}

/* ---- 8.1 Exclusão, recuperação e detalhes ---- */

function delP(id) {
  if (!requireAuth()) return;
  const p = P.find(x => x.id === id);
  if (p && confirm('Excluir ' + p.fncp + '? A FNCP poderá ser recuperada no Histórico.')) {
    const before = { ...p };
    p.deleted = true;
    p.deletedAt = new Date().toISOString();
    p.deletedBy = currentUser();
    audit('Excluiu', 'FNCP', id, `Excluiu a FNCP ${p.fncp}. O registro foi movido para o Histórico/Lixeira.`, before, p);
    render();
  }
}

function restoreP(id) {
  if (!requireAdmin()) return;
  const p = P.find(x => x.id === id);
  if (p) {
    const before = { ...p };
    p.deleted = false;
    p.restoredAt = new Date().toISOString();
    p.restoredBy = currentUser();
    audit('Recuperou', 'FNCP', id, `Recuperou a FNCP ${p.fncp}.`, before, p);
    render();
  }
}

function detailsP(id) {
  const p = P.find(x => x.id === id);
  if (!p) return;
  const items = historyItems(id);

  document.getElementById('modalBody').innerHTML = `
    <div class="modalhead"><h2>Detalhes da FNCP</h2><button class="close" onclick="closeModal()">×</button></div>
    <div class="grid">
      <div class="card"><small>FNCP</small><strong>${esc(p.fncp)}</strong></div>
      <div class="card"><small>Valor</small><strong>${brl(p.amt)}</strong></div>
      <div class="card"><small>Competência</small><strong>${esc(comp(p))}</strong></div>
      <div class="card"><small>Status</small><strong>${esc(p.st)}</strong></div>
    </div>
    <div class="row">
      <div class="field"><label>Empresa</label><input value="${esc(cn(p.cid))}" disabled></div>
      <div class="field"><label>Título</label><input value="${esc(tn(p))}" disabled></div>
      <div class="field"><label>TAG/TEG</label><input value="${esc(p.tag || '')}" disabled></div>
    </div>
    <div class="row">
      <div class="field"><label>Vencimento</label><input value="${esc(dbr(p.due))}" disabled></div>
      <div class="field"><label>Pagamento</label><input value="${esc(dbr(p.pay))}" disabled></div>
    </div>
    <div class="field"><label>Observações</label><textarea rows="3" disabled>${esc(p.obs || '')}</textarea></div>
    <div class="actions">
      <button class="btn secondary" onclick="historyModal('${p.id}')">Ver histórico</button>
      ${isAdmin() ? `<button class="btn danger" onclick="delP('${p.id}')">Excluir</button>` : ''}
    </div>
    <div class="card">
      <h2>Histórico da FNCP</h2>
      ${items.length ? items.map(a => auditHtml(a)).join('') : '<div class="empty">Nenhum histórico registrado.</div>'}
    </div>`;
  document.getElementById('modal').classList.add('show');
}

/* ---- 8.2 Listagem (lançamentos) ---- */

function list() {
  const q = S.q.toLowerCase();
  const L = P.filter(p => {
    const hit = !p.deleted && !q
      || [p.fncp, cn(p.cid), tn(p), brl(p.amt), String(p.amt), p.tag].some(x => String(x || '').toLowerCase().includes(q));
    return hit
      && (!S.company || p.cid == S.company)
      && (!S.status || p.st == S.status)
      && (!S.month || String(p.pay || '').slice(0, 7) === S.month);
  }).sort((a, b) => (b.pay || '').localeCompare(a.pay || ''));

  return `
    <div class="head">
      <div><h1>Lançamentos</h1><div class="muted">${L.length} resultado(s).</div></div>
    </div>

    <div class="card">
      <div class="toolbar">
        <div class="field wide"><label>Pesquisa global — FNCP, valor, empresa, título ou TAG/TEG</label>
          <input value="${esc(S.q)}" oninput="S.q=this.value;render()"></div>
        <div class="field"><label>Competência</label>
          <input type="month" value="${S.month}" onchange="S.month=this.value;render()"></div>
        <div class="field"><label>Status</label>
          <select onchange="S.status=this.value;render()">
            <option value="">Todos</option>
            ${ST.map(x => `<option ${S.status == x ? 'selected' : ''}>${x}</option>`).join('')}
          </select></div>
        <div class="field"><label>Empresa</label>
          <select onchange="S.company=this.value;render()">
            <option value="">Todas</option>
            ${CAT.map((c, i) => companyDeleted(i) ? '' : `<option value="${i}" ${S.company == i ? 'selected' : ''}>${esc(c[0])}</option>`).join('')}
          </select></div>
      </div>
      <div class="actions">
        <button class="btn secondary" onclick="clearF()">Limpar filtros</button>
        <button class="btn secondary" onclick="csv()">Exportar CSV</button>
        <button class="btn secondary" onclick="excel()">Exportar Excel</button>
      </div>
    </div>

    <div class="card"><div class="table">
      ${L.length ? `<table>
        <tr><th>FNCP</th><th>Empresa</th><th>Título</th><th class="num">Valor</th><th>Vencimento</th><th>Pagamento</th><th>Competência</th><th>Status</th><th>TAG/TEG</th><th>Ações</th></tr>
        ${L.map(p => `<tr>
          <td>${esc(p.fncp)}</td>
          <td>${esc(cn(p.cid))}</td>
          <td>${esc(tn(p))}</td>
          <td class="num">${brl(p.amt)}</td>
          <td>${dbr(p.due)}</td>
          <td>${dbr(p.pay)}</td>
          <td><span class="badge">${comp(p)}</span></td>
          <td><span class="badge status-${p.st}">${esc(p.st)}</span></td>
          <td>${esc(p.tag) || '—'}</td>
          <td>
            <button class="btn small secondary" onclick="detailsP('${p.id}')">Detalhes</button>
            <button class="btn small secondary" onclick="historyModal('${p.id}')">Histórico</button>
            <button class="btn small danger" onclick="delP('${p.id}')">Excluir</button>
          </td>
        </tr>`).join('')}
      </table>` : '<div class="empty">Nenhum lançamento encontrado.</div>'}
    </div></div>`;
}

function clearF() {
  S.q = ''; S.company = ''; S.status = ''; S.month = '';
  render();
}


/* ==========================================================================
   9. HISTÓRICO, AUDITORIA E LIXEIRA
   ========================================================================== */

function historyItems(id) {
  return A
    .filter(a => a.entity === 'FNCP' && (!id || a.entityId === id))
    .sort((a, b) => b.at.localeCompare(a.at));
}

function auditHtml(a) {
  const d = new Date(a.at).toLocaleString('pt-BR');
  return `<div class="audit">
    <div class="meta">${d} · <b>${esc(a.user)}</b> · ${esc(a.action)}</div>
    <div class="change">${esc(a.details || '')}</div>
  </div>`;
}

function historyModal(id) {
  const p = P.find(x => x.id === id), items = historyItems(id);
  document.getElementById('modalBody').innerHTML = `
    <div class="modalhead"><h2>Histórico · ${esc(p?.fncp || id)}</h2><button class="close" onclick="closeModal()">×</button></div>
    ${items.length ? items.map(a => auditHtml(a)).join('') : '<div class="empty">Nenhum histórico registrado.</div>'}`;
  document.getElementById('modal').classList.add('show');
}

function history() {
  if (!requireAuth()) return dash();
  const q = S.q.toLowerCase();
  const items = A.filter(a => {
    const n = entityName(a.entity, a.entityId);
    return !q || [a.user, a.action, a.entity, a.details, n].some(x => String(x || '').toLowerCase().includes(q));
  }).sort((a, b) => b.at.localeCompare(a.at));

  return `
    <div class="head">
      <div><h1>Histórico / Auditoria</h1><div class="muted">Todas as alterações, exclusões e recuperações ficam registradas.</div></div>
    </div>
    <div class="card">
      <div class="notice"><b>Exclusões são recuperáveis.</b> Nenhuma FNCP é removida definitivamente pela tela normal.</div>
      <div class="field wide"><label>Pesquisar histórico</label>
        <input value="${esc(S.q)}" oninput="S.q=this.value;render()" placeholder="Usuário, FNCP, ação ou alteração..."></div>
    </div>
    <div class="card">
      <h2>Movimentações (${items.length})</h2>
      ${items.length ? items.map(a => `
        <div class="audit">
          <div class="meta">${new Date(a.at).toLocaleString('pt-BR')} · <b>${esc(a.user)}</b> · ${esc(a.action)} · ${esc(a.entity)}</div>
          <div class="change"><b>${esc(entityName(a.entity, a.entityId))}</b> — ${esc(a.details || '')}</div>
          ${a.entity === 'FNCP' && a.action === 'Excluiu' && isAdmin() ? `<div class="actions">
            <button class="btn small" onclick="restoreP('${a.entityId}')">♻️ Recuperar FNCP</button>
            <button class="btn small secondary" onclick="historyModal('${a.entityId}')">Ver histórico</button>
          </div>` : ''}
          ${a.entity === 'Título' && a.action === 'Excluiu' && isAdmin() ? `<div class="actions">
            <button class="btn small" onclick="restoreTitle('${a.entityId}')">♻️ Recuperar título</button>
          </div>` : ''}
          ${a.entity === 'Empresa' && a.action === 'Excluiu' && isAdmin() ? `<div class="actions">
            <button class="btn small" onclick="restoreCompany('${a.entityId}')">♻️ Recuperar empresa</button>
          </div>` : ''}
        </div>`).join('') : '<div class="empty">Nenhuma movimentação encontrada.</div>'}
    </div>`;
}

function trash() {
  if (!requireAuth()) return dash();

  const deletedP = P.filter(p => p.deleted).sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || ''));
  const deletedC = Object.entries(CD).map(([i, v]) => ({ i, ...v }))
    .sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || ''));
  const deletedT = Object.entries(TD).map(([key, v]) => {
    const [ci, ti] = key.split(':').map(Number);
    return { key, ci, ti, ...v };
  }).sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || ''));

  const adminOnly = '<span class="muted">Somente ADM</span>';

  return `
    <div class="head"><div><h1>Lixeira</h1><div class="muted">Registros excluídos logicamente. Somente o Administrador pode recuperar.</div></div></div>

    <div class="card">
      <div class="notice"><b>Recuperação restrita:</b> somente o perfil Administrador pode recuperar FNCPs, empresas e títulos.</div>
      <h2>FNCPs excluídas (${deletedP.length})</h2>
      ${deletedP.length ? `<div class="table"><table>
        <tr><th>FNCP</th><th>Empresa</th><th>Título</th><th>Excluído por</th><th>Quando</th><th>Ação</th></tr>
        ${deletedP.map(p => `<tr>
          <td>${esc(p.fncp)}</td><td>${esc(cn(p.cid))}</td><td>${esc(tn(p))}</td>
          <td>${esc(p.deletedBy || '—')}</td><td>${esc(formatDateTime(p.deletedAt))}</td>
          <td>${isAdmin() ? `<button class="btn small" onclick="restoreP('${p.id}')">♻️ Recuperar</button>` : adminOnly}</td>
        </tr>`).join('')}
      </table></div>` : '<div class="empty">Nenhuma FNCP excluída.</div>'}
    </div>

    <div class="card">
      <h2>Empresas excluídas (${deletedC.length})</h2>
      ${deletedC.length ? `<div class="table"><table>
        <tr><th>Empresa</th><th>Excluída por</th><th>Quando</th><th>Ação</th></tr>
        ${deletedC.map(x => `<tr>
          <td>${esc(x.name)}</td><td>${esc(x.deletedBy || '—')}</td><td>${esc(formatDateTime(x.deletedAt))}</td>
          <td>${isAdmin() ? `<button class="btn small" onclick="restoreCompany('${x.i}')">♻️ Recuperar</button>` : adminOnly}</td>
        </tr>`).join('')}
      </table></div>` : '<div class="empty">Nenhuma empresa excluída.</div>'}
    </div>

    <div class="card">
      <h2>Títulos excluídos (${deletedT.length})</h2>
      ${deletedT.length ? `<div class="table"><table>
        <tr><th>Título</th><th>Empresa</th><th>Excluído por</th><th>Quando</th><th>Ação</th></tr>
        ${deletedT.map(x => `<tr>
          <td>${esc(x.name || tn({ cid: x.ci, tid: x.ti }))}</td><td>${esc(cn(x.ci))}</td>
          <td>${esc(x.deletedBy || '—')}</td><td>${esc(formatDateTime(x.deletedAt))}</td>
          <td>${isAdmin() ? `<button class="btn small" onclick="restoreTitle('${x.key}')">♻️ Recuperar</button>` : adminOnly}</td>
        </tr>`).join('')}
      </table></div>` : '<div class="empty">Nenhum título excluído.</div>'}
    </div>`;
}


/* ==========================================================================
   10. RELATÓRIOS
   ========================================================================== */

function reports() {
  if (!requireAuth()) return dash();

  const rows = dashRows(), y = +S.year, now = new Date();
  const annual = dashYearRows(y, rows);
  const vals = Array.from({ length: 12 }, (_, i) => dashMonthValue(y, i + 1, rows));
  const total = annual.reduce((s, r) => s + dashAmount(r), 0);

  const paid = rows.filter(r => {
    const d = dashDate(r.dataPagamento);
    if (!d) return false;
    const a = new Date(y, 0, 1);
    const b = y === now.getFullYear() ? now : new Date(y, 11, 31, 23, 59, 59, 999);
    return d >= a && d <= b;
  }).length;

  const by = {};
  annual.forEach(r => {
    const k = String(r.empresa || 'Sem empresa');
    by[k] = (by[k] || 0) + dashAmount(r);
  });

  const mx = Math.max(...vals, 1);
  const end = y === now.getFullYear() ? now.toLocaleDateString('pt-BR') : `31/12/${y}`;

  // Mesmo padrão de barras do Dashboard Mensal (sem seleção de mês)
  const bars = vals.map((v, i) => {
    const h = v ? Math.max(3, v / mx * 175) : 0;
    return `<div class="barcol" title="${DASH_MONTHS[i]}: ${brl(v)}">
      <div class="barval">${v ? brl(v) : '—'}</div>
      <div class="bar" style="height:${h}px"></div>
      <div class="barlabel">${DASH_SHORT[i]}</div>
    </div>`;
  }).join('');

  return `
    <div class="head">
      <div><h1>Relatórios</h1><div class="muted">Consolidação anual. ${y === now.getFullYear() ? 'Período: 01/01 até hoje.' : 'Período: 01/01 até 31/12.'}</div></div>
      <div class="actions">
        <button class="btn" onclick="dashCsv(annual,'FNCP_Relatorio_'+y)">Exportar CSV</button>
        <button class="btn secondary" onclick="dashExcel(annual,'FNCP_Relatorio_'+y)">Exportar Excel</button>
      </div>
    </div>

    <div class="card"><div class="field field-sm"><label>Ano</label>
      <select onchange="S.year=this.value;render()">
        ${dashYears().map(v => `<option value="${v}" ${v === y ? 'selected' : ''}>${v}</option>`).join('')}
      </select>
    </div></div>

    <div class="grid">
      <div class="card kpi"><small>Total gasto no ano</small><strong>${brl(total)}</strong><em>01/01/${y} até ${end}</em></div>
      <div class="card kpi"><small>Pagamentos realizados</small><strong>${paid}</strong><em>Registros com data de pagamento no período.</em></div>
    </div>

    <div class="two">
      <div class="card">
        <h2>Gasto mensal — ${y}</h2>
        <div class="chart"><div class="monthly-bars">${bars}</div></div>
        <div class="note">Valores gastos em cada mês do ano selecionado.</div>
      </div>
      <div class="card">
        <h2>Gasto por empresa</h2>
        ${Object.keys(by).length
          ? `<ul class="list">${Object.entries(by).sort((a, b) => b[1] - a[1])
              .map(([name, v]) => `<li><span>${esc(name)}</span><b>${brl(v)}</b></li>`).join('')}</ul>`
          : '<div class="empty">Sem dados no ano selecionado.</div>'}
      </div>
    </div>`;
}


/* ==========================================================================
   11. EMPRESAS E TÍTULOS
   ========================================================================== */

/* ---- 11.1 Listagens ---- */

function companies() {
  return `
    <div class="head">
      <div><h1>Empresas e títulos</h1><div class="muted">Cadastro e organização. Empresas e títulos excluídos ficam recuperáveis.</div></div>
      <button class="btn" onclick="companyModal()">+ Nova empresa</button>
    </div>
    <div class="card">
      ${CAT.map((c, i) => {
        const removed = companyDeleted(i);
        const l = P.filter(p => !p.deleted && p.cid === i);
        const t = l.reduce((a, p) => a + (+p.amt || 0), 0);
        const active = c[1].filter((_, j) => !titleDeleted(i, j));
        const deleted = c[1].filter((_, j) => titleDeleted(i, j));

        if (removed) {
          return `<details class="deleted-company">
            <summary><span class="danger-text">Excluída:</span> ${esc(c[0])} <span class="muted">· ${c[1].length} título(s) · ${l.length} lançamento(s)</span></summary>
            <div class="actions">${isAdmin() ? `<button class="btn small" onclick="restoreCompany('${i}')">♻️ Recuperar empresa</button>` : ''}</div>
            <div class="note danger-text">Esta empresa está excluída e não aparece para novos cadastros.</div>
          </details>`;
        }

        return `<details>
          <summary>${esc(c[0])} <span class="muted">· ${active.length} título(s)${deleted.length ? ' · ' + deleted.length + ' excluído(s)' : ''} · ${l.length} lançamento(s)${l.length ? ' · ' + brl(t) : ''}</span></summary>
          <div class="actions">
            <button class="btn small secondary" onclick="companyDetails(${i})">Detalhes</button>
            <button class="btn small secondary" onclick="companyModal(${i})">Editar empresa</button>
            <button class="btn small" onclick="titleModal(${i})">+ Novo título</button>
          </div>
          <ul>
            ${c[1].map((x, j) => titleDeleted(i, j)
              ? `<li class="deleted-row"><span class="danger-text">Excluído:</span> ${esc(x)} ${isAdmin() ? `<button class="btn small secondary" onclick="restoreTitle('${titleKey(i, j)}')">♻️ Recuperar</button>` : ''}</li>`
              : `<li>${esc(x)} <button class="btn small secondary" onclick="titleModal(${i},${j})">Editar</button></li>`
            ).join('') || '<li class="muted">Sem títulos cadastrados.</li>'}
          </ul>
        </details>`;
      }).join('')}
    </div>`;
}

function companyDetails(i) {
  if (!CAT[i]) return;
  const c = CAT[i];
  const L = P.filter(p => !p.deleted && p.cid === i);
  const total = L.reduce((a, p) => a + (+p.amt || 0), 0);
  const byStatus = {};
  L.forEach(p => byStatus[p.st] = (byStatus[p.st] || 0) + 1);

  document.getElementById('modalBody').innerHTML = `
    <div class="modalhead"><h2>Ficha da empresa</h2><button class="close" onclick="closeModal()">×</button></div>
    <div class="card">
      <h2>${esc(c[0])}</h2>
      <div class="grid">
        <div><small class="muted">Títulos ativos</small><strong>${c[1].filter((_, j) => !titleDeleted(i, j)).length}</strong></div>
        <div><small class="muted">Lançamentos</small><strong>${L.length}</strong></div>
        <div><small class="muted">Total</small><strong>${brl(total)}</strong></div>
        <div><small class="muted">Pago</small><strong>${byStatus.Pago || 0}</strong></div>
      </div>
    </div>
    <div class="card">
      <h2>Títulos</h2>
      ${c[1].length
        ? `<ul class="list">${c[1].map((t, j) => `<li><span>${titleDeleted(i, j) ? '<span class="danger-text">Excluído:</span> ' : ''}${esc(t)}</span></li>`).join('')}</ul>`
        : '<div class="empty">Nenhum título.</div>'}
    </div>
    <div class="card">
      <h2>Últimos lançamentos</h2>
      ${L.length ? `<div class="table"><table>
        <tr><th>FNCP</th><th>Título</th><th>Valor</th><th>Pagamento</th><th>Status</th></tr>
        ${L.slice().sort((a, b) => (b.pay || '').localeCompare(a.pay || '')).slice(0, 10).map(p => `<tr>
          <td>${esc(p.fncp)}</td><td>${esc(tn(p))}</td><td>${brl(p.amt)}</td><td>${dbr(p.pay)}</td><td>${esc(p.st)}</td>
        </tr>`).join('')}
      </table></div>` : '<div class="empty">Nenhum lançamento.</div>'}
    </div>
    <div class="actions">${isLoggedIn() ? `<button class="btn" onclick="companyModal(${i})">Editar empresa</button>` : ''}</div>`;
  document.getElementById('modal').classList.add('show');
}

/* ---- 11.2 Empresa: criar, editar, excluir, recuperar ---- */

function companyModal(i = null) {
  if (!requireAuth()) return;
  const editing = i !== null, deleted = editing && companyDeleted(i);

  document.getElementById('modalBody').innerHTML = `
    <div class="modalhead"><h2>${editing ? 'Editar empresa' : 'Nova empresa'}</h2><button type="button" class="close" id="closeCompanyModal">×</button></div>
    <div class="field"><label>Nome *</label><input id="m_name" value="${editing ? esc(CAT[i][0]) : ''}" ${deleted ? 'disabled' : ''}></div>
    ${deleted ? '<div class="note danger-text">Esta empresa está excluída e pode ser recuperada pelo Histórico ou pela lista de Empresas.</div>' : ''}
    <div class="actions">
      ${deleted
        ? `<button type="button" class="btn" id="restoreCompanyBtn">♻️ Recuperar empresa</button>`
        : `<button type="button" class="btn" id="saveCompanyBtn">Salvar</button>
           ${editing ? `<button type="button" class="btn danger" id="excludeCompanyBtn">🗑️ Excluir empresa</button>` : ''}`}
      <button type="button" class="btn secondary" id="cancelCompanyBtn">Cancelar</button>
    </div>`;
  document.getElementById('modal').classList.add('show');

  const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  bind('closeCompanyModal', () => closeModal());
  bind('cancelCompanyBtn', () => closeModal());
  bind('saveCompanyBtn', () => saveCompany(i));
  bind('excludeCompanyBtn', () => beginExcludeCompany(i));
  bind('restoreCompanyBtn', () => restoreCompany(String(i)));
}

function saveCompany(i) {
  if (!requireAuth()) return;
  const n = document.getElementById('m_name')?.value.trim();
  if (!n) return;

  if (i === null) {
    CAT.push([n, []]);
    audit('Criou', 'Empresa', String(CAT.length - 1), `Criou a empresa ${n}`);
  } else {
    const old = CAT[i][0];
    CAT[i][0] = n;
    audit('Alterou', 'Empresa', String(i), `Nome: ${old} → ${n}`, { name: old }, { name: n });
  }
  closeModal();
  render();
}

function beginExcludeCompany(i) {
  if (!requireAuth()) return;
  i = Number(i);
  if (!CAT[i]) { alert('Não foi possível identificar esta empresa.'); return false; }
  const name = CAT[i][0];

  document.getElementById('modalBody').innerHTML = `
    <div class="modalhead"><h2>Confirmar exclusão</h2><button type="button" class="close" id="cancelCompanyDeleteTop">×</button></div>
    <div class="notice warn">
      <b>Você está prestes a excluir:</b> <strong>${esc(name)}</strong>
      Esta empresa ficará oculta para novos cadastros. Os títulos e lançamentos existentes não serão apagados e a empresa poderá ser recuperada depois.
    </div>
    <div class="actions">
      <button type="button" class="btn danger" id="confirmExcludeCompanyBtn">🗑️ Sim, excluir empresa</button>
      <button type="button" class="btn secondary" id="cancelCompanyDeleteBtn">Cancelar</button>
    </div>`;

  const back = () => companyModal(i);
  document.getElementById('cancelCompanyDeleteTop').onclick = back;
  document.getElementById('cancelCompanyDeleteBtn').onclick = back;
  document.getElementById('confirmExcludeCompanyBtn').onclick = () => doExcludeCompany(i);
  return true;
}

function doExcludeCompany(i) {
  if (!requireAuth()) return;
  i = Number(i);
  if (!CAT[i]) return;
  const name = CAT[i][0];
  CD[String(i)] = { deletedAt: new Date().toISOString(), deletedBy: currentUser(), name };
  audit('Excluiu', 'Empresa', String(i), `Excluiu a empresa ${name}. A empresa permanece recuperável.`, { name }, { deleted: true, name });
  closeModal();
  render();
}

function restoreCompany(key) {
  if (!requireAdmin()) return;
  const i = Number(key);
  if (!CAT[i]) return;
  const name = CAT[i][0];
  delete CD[String(i)];
  audit('Recuperou', 'Empresa', String(i), `Recuperou a empresa ${name}.`, { deleted: true, name }, { deleted: false, name });
  closeModal();
  render();
}

/* ---- 11.3 Título: criar, editar, excluir, recuperar ---- */

function titleModal(ci, ti = null) {
  if (!requireAuth()) return;
  ci = Number(ci);
  if (companyDeleted(ci) && ti === null) {
    alert('Esta empresa está excluída. Recupere a empresa antes de cadastrar um novo título.');
    return;
  }
  if (ti !== null) ti = Number(ti);

  const deleted = ti !== null && titleDeleted(ci, ti);
  const titleValue = ti === null ? '' : CAT[ci]?.[1]?.[ti] || '';
  pendingTitleDelete = null;

  document.getElementById('modalBody').innerHTML = `
    <div class="modalhead"><h2>${ti === null ? 'Novo título' : 'Editar título'}</h2><button type="button" class="close" id="closeModalBtn">×</button></div>
    <p class="muted">Empresa: <b>${esc(CAT[ci]?.[0] || '')}</b></p>
    <div class="field"><label>Título *</label><input id="m_title" value="${esc(titleValue)}" ${deleted ? 'disabled' : ''}></div>
    ${ti !== null && !deleted ? `<div class="notice"><b>Excluir título</b> <span>O título será ocultado dos novos lançamentos, mas continuará guardado para consulta e recuperação. Os lançamentos existentes não serão apagados.</span></div>` : ''}
    <div class="actions">
      ${!deleted ? `<button type="button" class="btn" id="saveTitleBtn">Salvar</button>` : ''}
      ${ti !== null && !deleted ? `<button type="button" class="btn danger" id="excludeTitleBtn">🗑️ Excluir título</button>` : ''}
      ${deleted ? `<button type="button" class="btn" id="restoreTitleBtn">♻️ Recuperar título</button>` : ''}
      <button type="button" class="btn secondary" id="cancelModalBtn">Cancelar</button>
    </div>
    ${deleted ? '<div class="note danger-text">Este título está excluído e não aparece para novos lançamentos.</div>' : ''}`;
  document.getElementById('modal').classList.add('show');

  const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  bind('closeModalBtn', () => closeModal());
  bind('cancelModalBtn', () => closeModal());
  bind('saveTitleBtn', () => saveTitle(ci, ti));
  bind('excludeTitleBtn', () => beginExcludeTitle(ci, ti));
  bind('restoreTitleBtn', () => restoreTitle(titleKey(ci, ti)));
}

function beginExcludeTitle(ci, ti) {
  if (!requireAuth()) return;
  ci = Number(ci);
  ti = Number(ti);
  const title = CAT[ci]?.[1]?.[ti];
  if (!title) { alert('Não foi possível identificar este título.'); return false; }

  pendingTitleDelete = { ci, ti };
  document.getElementById('modalBody').innerHTML = `
    <div class="modalhead"><h2>Confirmar exclusão</h2><button type="button" class="close" id="cancelDeleteTop">×</button></div>
    <div class="notice warn">
      <b>Você está prestes a excluir:</b>
      <strong>${esc(title)}</strong>
      <span>Empresa: ${esc(CAT[ci]?.[0] || '')}</span>
      O título ficará oculto para novos lançamentos, mas poderá ser recuperado depois.
    </div>
    <div class="actions">
      <button type="button" class="btn danger" id="confirmExcludeTitleBtn">🗑️ Sim, excluir título</button>
      <button type="button" class="btn secondary" id="cancelDeleteBtn">Cancelar</button>
    </div>`;

  const top = document.getElementById('cancelDeleteTop');
  if (top) top.onclick = () => titleModal(ci, ti);
  const cancel = document.getElementById('cancelDeleteBtn');
  if (cancel) cancel.onclick = () => titleModal(ci, ti);
  const confirmBtn = document.getElementById('confirmExcludeTitleBtn');
  if (confirmBtn) confirmBtn.onclick = () => doExcludeTitle();
  return true;
}

function doExcludeTitle() {
  if (!requireAuth()) return;
  if (!pendingTitleDelete) return;
  const { ci, ti } = pendingTitleDelete;
  const title = CAT[ci]?.[1]?.[ti];
  if (!title) { pendingTitleDelete = null; closeModal(); return; }

  TD[titleKey(ci, ti)] = { deletedAt: new Date().toISOString(), deletedBy: currentUser(), name: title };
  audit(
    'Excluiu', 'Título', titleKey(ci, ti),
    `Excluiu o título ${title} da empresa ${CAT[ci][0]}. O título permanece recuperável.`,
    { title, company: CAT[ci][0] }, { deleted: true }
  );
  pendingTitleDelete = null;
  closeModal();
  render();
}

function excludeTitle(ci, ti) {
  if (!requireAuth()) return;
  return beginExcludeTitle(ci, ti);
}

function restoreTitle(key) {
  if (!requireAdmin()) return;
  const raw = String(key), [ci, ti] = raw.split(':').map(Number);
  if (!CAT[ci]?.[1]?.[ti]) return;

  const title = CAT[ci][1][ti];
  const before = { deleted: true, title, company: CAT[ci][0] };
  delete TD[raw];
  audit(
    'Recuperou', 'Título', raw,
    `Recuperou o título ${title} da empresa ${CAT[ci][0]}.`,
    before, { deleted: false, title, company: CAT[ci][0] }
  );
  closeModal();
  render();
}


/* ==========================================================================
   12. EXPORTAÇÃO (CSV / EXCEL) — tela de Lançamentos
   ========================================================================== */

function excel() {
  const L = P.filter(p => !p.deleted && (!S.q || [p.fncp, cn(p.cid), tn(p), brl(p.amt), String(p.amt), p.tag]
    .some(x => String(x || '').toLowerCase().includes(S.q.toLowerCase()))));

  const rows = [
    ['FNCP', 'Empresa', 'Título', 'Valor', 'Vencimento', 'Pagamento', 'Competência', 'Status', 'TAG/TEG', 'Observações'],
    ...L.map(p => [p.fncp, cn(p.cid), tn(p), p.amt, dbr(p.due), dbr(p.pay), comp(p), p.st, p.tag || '', p.obs || ''])
  ];

  const table = '<table border="1">'
    + rows.map((r, i) => '<tr>' + r.map(v => `<${i ? 'td' : 'th'}>${esc(v)}</${i ? 'td' : 'th'}>`).join('') + '</tr>').join('')
    + '</table>';

  const blob = new Blob(['<html><head><meta charset="utf-8"></head><body>' + table + '</body></html>'], { type: 'application/vnd.ms-excel' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'FNCP_Control.xls';
  a.click();
  URL.revokeObjectURL(a.href);
}

function csv() {
  const L = P.filter(p => !p.deleted && (!S.q || [p.fncp, cn(p.cid), tn(p), brl(p.amt), String(p.amt), p.tag]
    .some(x => String(x || '').toLowerCase().includes(S.q.toLowerCase()))));

  const h = ['FNCP', 'Empresa', 'Título', 'Valor', 'Vencimento', 'Pagamento', 'Competência', 'Status', 'TAG/TEG', 'Observações'];
  const rows = [
    h,
    ...L.map(p => [p.fncp, cn(p.cid), tn(p), p.amt, dbr(p.due), dbr(p.pay), comp(p), p.st, p.tag || '', p.obs || ''])
  ].map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';'));

  const b = new Blob(['\ufeff' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = 'FNCP_Control.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}


/* ==========================================================================
   13. DASHBOARD FISCAL
   O HTML fica em <template id="tpl-fiscal"> no index.html.
   ========================================================================== */

function fiscalView() {
  return tpl('tpl-fiscal');
}

function initFiscalDashboard() {
  const root = document.getElementById('fiscalWrap');
  if (!root || root.dataset.init === '1') return;
  root.dataset.init = '1';

  const $ = id => root.querySelector('#' + id);
  let all = [];

  const months = [
    { m: 5, n: 'Mai' }, { m: 6, n: 'Jun' }, { m: 7, n: 'Jul' }, { m: 8, n: 'Ago' },
    { m: 9, n: 'Set' }, { m: 10, n: 'Out' }, { m: 11, n: 'Nov' }, { m: 12, n: 'Dez' },
    { m: 1, n: 'Jan' }, { m: 2, n: 'Fev' }, { m: 3, n: 'Mar' }, { m: 4, n: 'Abr' }
  ];

  const money = n => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  const safe = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const num = x => parseNumericValue(x);

  function iso(s) {
    if (!s) return null;
    const m = String(s).match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : null;
  }

  function fiscalRange() {
    const y = +$('fy').value;
    $('from').value = `${y}-05-01`;
    $('to').value = `${y + 1}-04-30`;
    renderFiscal();
  }

  function dateOf(r) {
    const b = $('basis').value;
    if (b === 'competencia') {
      const c = String(r.competencia || '');
      return /^\d{4}-\d{2}$/.test(c) ? c + '-01' : null;
    }
    return iso(r[b]);
  }

  function load(obj) {
    const a = Array.isArray(obj) ? obj : obj?.fncps;
    if (!Array.isArray(a)) throw Error('JSON inválido: lista fncps não encontrada.');
    all = a;

    const companies = [...new Set(a.map(x => String(x.empresa || '').trim()).filter(Boolean))]
      .sort((x, y) => x.localeCompare(y, 'pt-BR'));
    $('company').innerHTML = '<option value="">Todas as empresas</option>'
      + companies.map(x => `<option>${safe(x)}</option>`).join('');

    const statuses = [
      "Pendente",
      "Pago",
      "Cancelado",
      "Aguardando Pagamento"
    ];
    $('status').innerHTML = '<option value="">Todos os status</option>'
      + statuses.map(x => `<option>${safe(x)}</option>`).join('');

    $('loadstatus').textContent = `${a.length} FNCPs carregadas da API`;
    renderFiscal();
  }

  function renderFiscal() {
    if (!all.length) return;

    const from = $('from').value, to = $('to').value;
    const company = $('company').value, status = $('status').value;
    const q = $('q').value.toLocaleLowerCase('pt-BR').trim();

    const rec = all.filter(r => {
      const d = dateOf(r);
      if (!d || (from && d < from) || (to && d > to)) return false;
      if (company && String(r.empresa || '') !== company) return false;
      if (status && String(r.status || '') !== status) return false;
      if (q && ![r.fncp, r.jiraKey, r.titulo, r.empresa, r.empresaJira]
        .some(x => String(x || '').toLocaleLowerCase('pt-BR').includes(q))) return false;
      return true;
    });

    // KPIs
    const total = rec.reduce((s, r) => s + (num(r.valor) || 0), 0);
    const paid = rec
      .filter(r => String(r.status || '').toLowerCase() === 'pago')
      .reduce((s, r) => s + (num(r.valor) || 0), 0);

    $('total').textContent = money(total);
    $('totalnote').textContent = `${rec.length} registro(s) filtrados`;
    $('count').textContent = rec.length.toLocaleString('pt-BR');
    $('complete').textContent = money(paid);
    $('missing').textContent = rec.filter(r => num(r.valor) === null).length;

    // Gráfico por mês fiscal
    const fy = +$('fy').value;
    const ms = months.map(x => {
      const year = x.m >= 5 ? fy : fy + 1;
      const key = `${year}-${String(x.m).padStart(2, '0')}`;
      const v = rec.filter(r => dateOf(r)?.slice(0, 7) === key).reduce((s, r) => s + (num(r.valor) || 0), 0);
      return { ...x, v };
    });
    const max = Math.max(1, ...ms.map(x => x.v));

    $('chartdesc').textContent = `AF ${fy}–${fy + 1} · ${$('basis').selectedOptions[0].textContent}`;
    $('bars').innerHTML = ms.map(x => `
      <div class="barcol">
        <div class="barval">${x.v ? money(x.v) : '—'}</div>
        <div class="bar" title="${x.n}: ${money(x.v)}" style="height:${x.v ? Math.max(3, x.v / max * 175) : 0}px"></div>
        <div class="barlabel">${x.n}</div>
      </div>`).join('');

    // Maiores gastos por empresa
    const sums = {};
    rec.forEach(r => {
      const k = String(r.empresa || '').trim() || 'OUTROS / não classificada';
      sums[k] = (sums[k] || 0) + (num(r.valor) || 0);
    });
    const top = Object.entries(sums).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const mx = Math.max(1, ...top.map(x => x[1]));

    $('companies').innerHTML = top.length
      ? top.map(([k, v]) => `
          <div class="company">
            <div>${safe(k)}</div>
            <div class="track"><div class="fill" style="width:${v / mx * 100}%"></div></div>
            <strong>${money(v)}</strong>
          </div>`).join('')
      : '<div class="empty">Nenhum resultado.</div>';

    // Tabela
    rec.sort((a, b) => (dateOf(b) || '').localeCompare(dateOf(a) || ''));
    $('rows').innerHTML = rec.length
      ? rec.map(r => {
          const key = r.jiraKey || r.fncp || '';
          const url =
            r.jiraUrl ||
            `https://locktonbrasil.atlassian.net/browse/${encodeURIComponent(key)}`;
          return `<tr>
            <td><a href="${safe(url)}" target="_blank" rel="noopener">${safe(key)}</a></td>
            <td>${safe(r.empresa || 'OUTROS / não classificada')}</td>
            <td title="${safe(r.titulo || '')}">${safe(r.titulo || '')}</td>
            <td>${safe(dateOf(r) || '—')}</td>
            <td>${safe(r.status || '—')}</td>
            <td class="money">${num(r.valor) === null ? '—' : money(num(r.valor))}</td>
          </tr>`;
        }).join('')
      : '<tr><td colspan="6" class="empty">Nenhuma FNCP corresponde aos filtros.</td></tr>';

    $('tableinfo').textContent = `${rec.length} registro(s) · Data: ${$('basis').selectedOptions[0].textContent} · Total: ${money(total)}`;
  }

  // Eventos
  $('fy').addEventListener('change', fiscalRange);
  ['basis', 'from', 'to', 'company', 'status', 'q'].forEach(id =>
    $(id).addEventListener(id === 'q' ? 'input' : 'change', renderFiscal));
  $('reset').addEventListener('click', () => {
    $('company').value = '';
    $('status').value = '';
    $('q').value = '';
    fiscalRange();
  });

  // Carga inicial
  fetch('/api/fncps')
    .then(r => {
      if (!r.ok) throw Error('HTTP ' + r.status);
      return r.json();
    })
    .then(load)
    .catch(e => {
      $('loadstatus').textContent = 'Falha ao conectar à API: ' + e.message + ' (verifique se o servidor está aberto e permite CORS).';
    });
}


/* ==========================================================================
   14. INICIALIZAÇÃO
   ========================================================================== */

render();
applyTheme();
loadDashboardApi();
