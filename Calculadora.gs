/**
 * =============================================================================
 * MONITOR DE HONORÁRIOS · CALCULADORA DE PREÇO (v4.2.0)
 * -----------------------------------------------------------------------------
 * Arquivo NOVO. Não altera nada do Code.gs: só acrescenta 4 funções que a tela
 * "Calculadora de preço" do Index.html chama via google.script.run.
 *
 * O cálculo do honorário roda na tela (Index.html). Este arquivo só guarda:
 *   PRECIF_DIRETRIZES  as regras da régua (valor, status, quem definiu, critério)
 *   PRECIF_TESTES      os testes com clientes reais
 *   PRECIF_EDITORES    e-mails de quem pode mudar as regras (vazia = todos)
 *
 * Primeira vez: rodar configurarPrecificacao() uma vez pelo editor.
 *
 * Planilha usada: a mesma do Monitor. Se o script não estiver preso a uma
 * planilha, grave o ID em Propriedades do projeto > PRECIF_PLANILHA_ID.
 * =============================================================================
 */

var PRECIF_ABA_DIRETRIZES = 'PRECIF_DIRETRIZES';
var PRECIF_ABA_TESTES     = 'PRECIF_TESTES';
var PRECIF_ABA_EDITORES   = 'PRECIF_EDITORES';

var PRECIF_CAB_DIRETRIZES = ['chave', 'valor', 'status', 'fonte', 'criterio', 'alterado_por', 'alterado_em'];
var PRECIF_CAB_TESTES     = ['id', 'data', 'cnpj', 'empresa', 'honorario_atual', 'sugerido', 'diferenca',
                             'situacao', 'usuario', 'observacao', 'entrada_json'];
var PRECIF_CAB_EDITORES   = ['email', 'nome', 'observacao'];

/* ------------------------------------------------------------ utilitários */
function prec_planilha_() {
  /* Mesma planilha da calculadora da equipe: as regras são uma só. */
  var id = PropertiesService.getScriptProperties().getProperty('PRECIF_PLANILHA_ID') ||
           'ID_EXEMPLO';
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Planilha não encontrada. Defina PRECIF_PLANILHA_ID nas propriedades do projeto.');
  return ss;
}

function prec_aba_(nome, cabecalho) {
  var ss = prec_planilha_();
  var aba = ss.getSheetByName(nome);
  if (!aba) {
    aba = ss.insertSheet(nome);
    aba.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho]).setFontWeight('bold');
    aba.setFrozenRows(1);
  }
  return aba;
}

function prec_linhas_(aba) {
  var ult = aba.getLastRow();
  if (ult < 2) return [];
  return aba.getRange(2, 1, ult - 1, aba.getLastColumn()).getValues();
}

function prec_email_() {
  try { return Session.getActiveUser().getEmail() || ''; } catch (e) { return ''; }
}

/** Vazia = todos editam. Com e-mails = só quem está na lista. */
function prec_podeEditar_() {
  var lista = prec_linhas_(prec_aba_(PRECIF_ABA_EDITORES, PRECIF_CAB_EDITORES))
    .map(function (l) { return String(l[0] || '').trim().toLowerCase(); })
    .filter(function (e) { return e; });
  if (!lista.length) return true;
  return lista.indexOf(prec_email_().toLowerCase()) >= 0;
}

function prec_iso_(v) {
  if (v instanceof Date) return v.toISOString();
  return v ? String(v) : '';
}
function prec_numOuNulo_(v) {
  if (v === '' || v === null || v === undefined) return null;
  var n = Number(v);
  return isNaN(n) ? null : n;
}

/* ------------------------------------------------------ configuração inicial */
function configurarPrecificacao() {
  prec_aba_(PRECIF_ABA_DIRETRIZES, PRECIF_CAB_DIRETRIZES);
  prec_aba_(PRECIF_ABA_TESTES, PRECIF_CAB_TESTES);
  prec_aba_(PRECIF_ABA_EDITORES, PRECIF_CAB_EDITORES);
  return 'Abas da calculadora prontas.';
}

/* ================================================================== API */

/** Diretrizes + testes + permissão de edição. */
function api_precCarregar() {
  var itens = {};
  prec_linhas_(prec_aba_(PRECIF_ABA_DIRETRIZES, PRECIF_CAB_DIRETRIZES)).forEach(function (l) {
    var ch = String(l[0] || '').trim();
    if (!ch) return;
    itens[ch] = { valor: prec_numOuNulo_(l[1]), status: l[2] || 'Provisório', fonte: l[3] || '',
                  obs: l[4] || '', alteradoPor: l[5] || '', alteradoEm: prec_iso_(l[6]) };
  });

  var testes = prec_linhas_(prec_aba_(PRECIF_ABA_TESTES, PRECIF_CAB_TESTES)).map(function (l) {
    var entrada = {};
    try { entrada = JSON.parse(l[10] || '{}'); } catch (e) { entrada = {}; }
    return { id: String(l[0]), data: prec_iso_(l[1]), cnpj: String(l[2] || ''), empresa: l[3] || '',
             atual: prec_numOuNulo_(l[4]), sugerido: prec_numOuNulo_(l[5]), diferenca: prec_numOuNulo_(l[6]),
             situacao: l[7] || '', usuario: l[8] || '', observacao: l[9] || '', entrada: entrada };
  }).filter(function (t) { return t.id; });

  return { ok: true, diretrizes: itens, testes: testes, podeEditar: prec_podeEditar_(), usuario: prec_email_() };
}

/** Grava só as regras que mudaram. Quem alterou vem da sessão Google. */
function api_precSalvarDiretrizes(lista, usuario) {
  if (!prec_podeEditar_()) return { ok: false, erro: 'Seu acesso à calculadora é só de consulta.' };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var aba = prec_aba_(PRECIF_ABA_DIRETRIZES, PRECIF_CAB_DIRETRIZES);
    var linhas = prec_linhas_(aba);
    var posicao = {};
    linhas.forEach(function (l, i) { posicao[String(l[0])] = i + 2; });
    var quem = prec_email_() || usuario || 'equipe Exemplo';
    var agora = new Date();

    (lista || []).forEach(function (m) {
      var linha = [m.chave, (m.valor === '' || m.valor === null) ? '' : Number(m.valor), m.status || 'Provisório', m.fonte || '', m.obs || '', quem, agora];
      if (posicao[m.chave]) {
        aba.getRange(posicao[m.chave], 1, 1, linha.length).setValues([linha]);
      } else {
        aba.appendRow(linha);
        posicao[m.chave] = aba.getLastRow();
      }
    });
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  var res = api_precCarregar();
  return { ok: true, diretrizes: res.diretrizes, mensagem: (lista || []).length + ' regra(s) salva(s).' };
}

/** Um teste com cliente real, com a entrada completa para recalcular depois. */
function api_precSalvarTeste(t) {
  t = t || {};
  var id = 't' + new Date().getTime();
  var agora = new Date();
  var quem = t.usuario || prec_email_();
  prec_aba_(PRECIF_ABA_TESTES, PRECIF_CAB_TESTES).appendRow([
    id, agora, t.cnpj ? "'" + t.cnpj : '', t.empresa || '',
    t.atual === null || t.atual === undefined ? '' : t.atual,
    t.sugerido, t.diferenca === null || t.diferenca === undefined ? '' : t.diferenca,
    t.situacao || '', quem, t.observacao || '', JSON.stringify(t.entrada || {})
  ]);
  var reg = {};
  for (var k in t) reg[k] = t[k];
  reg.id = id; reg.data = agora.toISOString(); reg.usuario = quem;
  return { ok: true, teste: reg, mensagem: 'Teste salvo na aba ' + PRECIF_ABA_TESTES + '.' };
}

function api_precExcluirTeste(id) {
  var aba = prec_aba_(PRECIF_ABA_TESTES, PRECIF_CAB_TESTES);
  var linhas = prec_linhas_(aba);
  for (var i = linhas.length - 1; i >= 0; i--) {
    if (String(linhas[i][0]) === String(id)) { aba.deleteRow(i + 2); return { ok: true }; }
  }
  return { ok: false, erro: 'Teste não encontrado.' };
}
