/**
 * =============================================================================
 * MONITOR DE HONORÁRIOS · PUBLICAR BASE DA CALCULADORA
 * -----------------------------------------------------------------------------
 * Arquivo NOVO no projeto do Monitor. Não altera o Code.gs.
 *
 * Copia para a planilha "Calculadora de Preço - Base" SÓ o que a calculadora
 * precisa. Honorário, recebimento, inadimplência e resultado da carteira
 * ficam no Monitor e nunca saem daqui.
 *
 * Usa as mesmas funções que a tela do Monitor usa (api_carregarTudo e
 * api_seriesAgregadas), então o faturamento é o mesmo nos dois lugares.
 *
 * A ID da planilha da calculadora já vem gravada (CALC_PLANILHA_PADRAO).
 *
 * Primeira vez: rodar publicarBaseCalculadora() e depois
 * instalarAtualizacaoDiaria() (atualiza todo dia às 6h).
 * =============================================================================
 */

var CALC_PLANILHA_PADRAO = 'ID_EXEMPLO';

var CALC_CAB_EMPRESAS = ['cnpj', 'empresa', 'codigo_dominio', 'atividade', 'regime', 'faturamento_12m',
                         'notas_mes', 'funcionarios', 'outros_cnpj_raiz', 'faturamento_outros_raiz',
                         'pendencia_fiscal'];

function pub_json_(r) { return typeof r === 'string' ? JSON.parse(r) : r; }

function pub_regime_(t) {
  t = String(t || '').toLowerCase().trim();
  if (/presumido/.test(t) || t === 'lp' || t === 'p') return 'LP';
  if (/real/.test(t) || t === 'lr' || t === 'r') return 'LR';
  return 'SN';
}
function pub_ativ_(e) {
  var t = String(e.tipo || e.segmento || '').toLowerCase();
  if (/com[eé]rcio|varejo|atacad|loja|ind[uú]stria/.test(t)) return 'comercio';
  if (/patrimonial/.test(t)) return 'patrimonial';
  if (/sa[uú]de|m[eé]dic/.test(t)) return 'medico';
  return 'servico';
}

function publicarBaseCalculadora() {
  var id = PropertiesService.getScriptProperties().getProperty('CALC_PLANILHA_ID') || CALC_PLANILHA_PADRAO;

  var tudo = pub_json_(api_carregarTudo());
  if (!tudo || tudo.ok === false) throw new Error('Monitor não carregou: ' + (tudo && tudo.erro));
  var series = pub_json_(api_seriesAgregadas()) || {};
  var meses = series.meses || [], ult = meses.length - 1;

  function rbt12(e) {
    var pares = (series.serieEmpresa || {})[e.cnpj];
    if (!pares) return Number(e.rbt12) || 0;
    var s = 0;
    pares.forEach(function (p) { if (p[0] > ult - 12 && p[0] <= ult) s += p[1] || 0; });
    return Math.round(s * 100) / 100;
  }
  function notasMes(e) {
    var por = (series.porEmpresa || {})[e.cnpj];
    if (!por) return 0;
    var anos = Object.keys(por).sort(), a = por[anos[anos.length - 1]];
    return (a && a[4]) ? Math.round((a[1] || 0) / a[4]) : 0;
  }

  var ativos = (tudo.empresas || []).filter(function (e) { return !e.saiu; });
  var fat = {}, raiz = {};
  ativos.forEach(function (e) {
    fat[e.cnpj] = rbt12(e);
    var r = String(e.cnpj).slice(0, 8);
    raiz[r] = raiz[r] || { qtd: 0, soma: 0 };
    raiz[r].qtd++; raiz[r].soma += fat[e.cnpj];
  });

  var linhas = ativos.map(function (e) {
    var r = raiz[String(e.cnpj).slice(0, 8)];
    return ["'" + e.cnpj, e.empresa || '', "'" + (e.codigoDominio || ''), pub_ativ_(e), pub_regime_(e.tributacao),
            fat[e.cnpj], notasMes(e), Number(e.qtdFuncionarios) || 0,
            r.qtd - 1, Math.round((r.soma - fat[e.cnpj]) * 100) / 100,
            e.pendenciaFiscal ? 'Sim' : 'Não'];
  });

  var ss = SpreadsheetApp.openById(id);
  var aba = ss.getSheetByName('CALC_EMPRESAS') || ss.insertSheet('CALC_EMPRESAS');
  aba.clearContents();
  aba.getRange(1, 1, 1, CALC_CAB_EMPRESAS.length).setValues([CALC_CAB_EMPRESAS]).setFontWeight('bold');
  aba.setFrozenRows(1);
  if (linhas.length) aba.getRange(2, 1, linhas.length, CALC_CAB_EMPRESAS.length).setValues(linhas);

  var cfg = ss.getSheetByName('CALC_CONFIG') || ss.insertSheet('CALC_CONFIG');
  cfg.clearContents();
  cfg.getRange(1, 1, 3, 2).setValues([
    ['chave', 'valor'],
    ['salario_minimo', Number((tudo.config || {}).salario_minimo) || 1621],
    ['atualizado_em', new Date()]
  ]);
  return linhas.length + ' empresas publicadas para a calculadora.';
}

function instalarAtualizacaoDiaria() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'publicarBaseCalculadora') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('publicarBaseCalculadora').timeBased().everyDays(1).atHour(6).create();
  return 'Atualização diária às 6h instalada.';
}
