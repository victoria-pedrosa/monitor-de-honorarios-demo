/**
 * =============================================================================
 * MONITOR DE HONORÁRIOS — Escritório Contábil Exemplo
 * Code.gs — backend completo do Web App
 * -----------------------------------------------------------------------------
 * Projeto de 2 arquivos:  Code.gs  +  Index.html
 *
 * Fluxo:  Google Sheets → Apps Script → Code.gs → Index.html → Web App
 *
 * PRIMEIRA EXECUÇÃO
 *   1. Rode `configurarMonitor` uma vez (cria as abas que faltarem e semeia
 *      CONFIG_REGRAS). Autorize os acessos quando o Apps Script pedir.
 *   2. Implantar → Nova implantação → Aplicativo da Web.
 *   3. Executar como: Eu. Quem tem acesso: sua organização.
 *
 * Toda função chamada pelo Index.html começa com `api_` e existe neste arquivo.
 * =============================================================================
 */

var APP = {
  nome: 'Monitor de Honorários',
  org: 'Escritório Contábil Exemplo',
  versao: '4.0.0'
};

var ABAS = {
  EMPRESAS:   'EMPRESAS',
  HISTORICO:  'HISTORICO_MENSAL',
  GATILHOS:   'GATILHOS',
  TRATATIVAS: 'TRATATIVAS',
  CONFIG:     'CONFIG_REGRAS',
  HONORARIOS: 'HISTORICO_HONORARIOS',
  INADIMPLENCIA: 'INADIMPLENCIA_TITULOS',
  MOVIMENTO:  'MOVIMENTO_CARTEIRA',
  MOV_HONORARIOS: 'MOVIMENTO_HONORARIOS',
  LOG:        'LOG_EXECUCAO'
};

/** Colunas por aba. garantirEstrutura() só ACRESCENTA o que faltar. */
var ESQUEMA = {};

ESQUEMA[ABAS.EMPRESAS] = [
  'CNPJ', 'Código Domínio', 'Empresa', 'Matriz/Filial', 'Tributação', 'Folha',
  'Situação Tabelão', 'Honorário Atual', 'Data Último Reajuste',
  'Motivo Última Alteração', 'Honorário Sugerido', 'Última Sincronização',
  'Fiscal Responsável', 'Folha Responsável', 'Segmento', 'Data Exemplo',
  'Tipo', 'Plano', 'Nicho', 'Indicado Por', 'Responsável Comercial',
  'Contato', 'WhatsApp', 'Cidade',
  'Qtd Funcionários Atual', 'RBT12', 'Faixa Simples', 'Porte',
  'Score', 'Prioridade', 'Gatilhos Ativos',
  'Var Faturamento %', 'Var 12 Meses %',
  'Meses Histórico Faturamento', 'Meses Histórico Notas',
  'Última Competência Faturamento', 'Qualidade dos Dados', 'Última Análise',
  'Grupo Honorário', 'Tipo Cobrança', 'Percentual SM',
  'Honorário Ideal', 'Grupo Ideal', 'Gap Honorário',
  'Ramo', 'Plano Indicado', 'Piso do Plano', 'Gap Plano',
  'Situação Atendimento', 'Canal Preferido', 'Responsável Atendimento',
  'Urgência Cobrança', 'É Indicador', 'Observação Atendimento',
  'Valor Vencido', 'Títulos Vencidos', 'Maior Atraso',
  'Pendência Fiscal', 'Equipe Fiscal',
  'Data Baixa', 'Motivo Baixa', 'Observação Baixa', 'Data Retorno',
  'Honorário 2024', 'Honorário 2025', 'Var Honorário 24-25 %',
  'UF', 'Grupo Econômico', 'CNPJs no Grupo', 'Honorário do Grupo',
  'Observação Financeira', 'Não Cobramos', 'Grupo de Empresas'
];

/* Movimento da carteira. Entrada e saída ficam na mesma aba porque são o mesmo
   fato com sinal trocado, e separar obrigaria a ler duas abas para responder
   "como foi o mês". A competência (Mês) é o mês em que a cobrança passa a
   valer — não a data do contrato, que pode ser de dois meses antes. */
ESQUEMA[ABAS.MOVIMENTO] = [
  'Data', 'Mês', 'Tipo', 'Empresa', 'CNPJ', 'Início Cobrança',
  'Valor Contrato', 'Valor Cobrado', 'Situação', 'Observação', 'Origem'
];

ESQUEMA[ABAS.MOV_HONORARIOS] = [
  'Empresa', 'CNPJ', 'Tipo', 'Honorário Anterior', 'Honorário Novo',
  'Diferença', 'Mês', 'Motivo', 'Origem'
];

ESQUEMA[ABAS.HISTORICO] = [
  'CNPJ', 'Competência', 'Competência_Chave', 'Faturamento',
  'Qtd_Funcionários', 'Qtd_Notas', 'Valor_Notas',
  'Origem_Faturamento', 'Última Sincronização'
];

ESQUEMA[ABAS.GATILHOS] = [
  'ID_Gatilho', 'CNPJ', 'Empresa', 'Competência', 'Competência_Chave',
  'Tipo_Gatilho', 'Descrição', 'Score', 'Valor_Atual', 'Valor_Anterior',
  'Variação_%', 'Data_Geração', 'Status', 'Responsável', 'Observação',
  'Justificativa', 'Score_Total_Empresa', 'Prioridade_Empresa', 'Data_Tratativa'
];

ESQUEMA[ABAS.TRATATIVAS] = [
  'ID', 'CNPJ', 'Empresa', 'Data', 'Responsável', 'Status', 'Ação',
  'Honorário_Anterior', 'Honorário_Novo', 'Data_Reajuste', 'Motivo',
  'Justificativa', 'Observação', 'ID_Gatilho', 'Incremento_Mensal', 'Incremento_Anual'
];

ESQUEMA[ABAS.INADIMPLENCIA] = [
  'CNPJ', 'Empresa', 'Vencimento', 'Competência_Chave', 'Valor',
  'Dias_Atraso', 'Descrição', 'Origem'
];

ESQUEMA[ABAS.CONFIG] = ['Chave', 'Valor', 'Tipo', 'Grupo', 'Descrição', 'Atualizado_Em', 'Atualizado_Por'];

ESQUEMA[ABAS.HONORARIOS] = [
  'CNPJ', 'Empresa', 'Data', 'Honorário_Anterior', 'Honorário_Novo',
  'Incremento_Mensal', 'Motivo', 'Responsável', 'Origem'
];

ESQUEMA[ABAS.LOG] = ['Data', 'Função', 'Status', 'Mensagem', 'Duração_ms', 'Registros', 'Usuário'];

/**
 * SEED do CONFIG_REGRAS. Só grava chave que ainda não existe — valores já
 * ajustados pela equipe nunca são sobrescritos.
 */
var CONFIG_SEED = [
  ['ano_referencia',                  2026, 'int',     'Parâmetros anuais', 'Ano dos parâmetros abaixo'],
  ['salario_minimo',               1621.00, 'number',  'Parâmetros anuais', 'Salário mínimo vigente — base da régua (G20 = 20% deste valor). MUDA TODO ANO.'],
  ['teto_inss',                    8475.55, 'number',  'Parâmetros anuais', 'Teto do salário de contribuição do INSS. MUDA TODO ANO.'],
  ['custo_multa_estimado',             200, 'number',  'Parâmetros anuais', 'Custo médio de uma multa por pendência fiscal'],

  ['pct_reajuste_sem_nota',           0.20, 'percent', 'Honorários', 'Honorário-alvo sem emissão de notas — 20% do SM'],
  ['pct_reajuste_com_nota',           0.30, 'percent', 'Honorários', 'Honorário-alvo com emissão de notas e BPO — 30% do SM'],
  ['faixa_limite_regua_fixa',            4, 'int',     'Honorários', 'A partir desta faixa a régua fixa não se aplica'],
  ['desvio_honorario_alerta',         0.25, 'percent', 'Honorários', 'Desvio abaixo da régua que vira alerta'],

  ['pct_faturamento_forte',           0.20, 'percent', 'Limiares', 'Variação mínima no gatilho faturamento + funcionários'],
  ['pct_faturamento',                 0.30, 'percent', 'Limiares', 'Variação mínima no gatilho de faturamento isolado'],
  ['pct_funcionarios',                0.20, 'percent', 'Limiares', 'Aumento percentual mínimo de funcionários'],
  ['abs_funcionarios',                   3, 'int',     'Limiares', 'Aumento absoluto mínimo de funcionários'],
  ['min_funcionarios_base',              5, 'int',     'Limiares', 'Abaixo deste quadro só o aumento absoluto vale'],
  ['pct_notas',                       0.20, 'percent', 'Limiares', 'Quanto as notas precisam superar a média'],
  ['janela_media_notas',                 3, 'int',     'Limiares', 'Meses da média de notas'],
  ['min_meses_historico',                3, 'int',     'Limiares', 'Mínimo de competências para o motor concluir algo'],
  ['ignorar_competencia_corrente',    true, 'bool',    'Limiares', 'Ignora o mês corrente (incompleto)'],
  ['variacao_maxima_plausivel',       10.0, 'number',  'Limiares', 'Acima disso é erro de importação, não gatilho'],

  ['pontos_faturamento_funcionarios',   50, 'int', 'Pontuação', 'Faturamento + funcionários'],
  ['pontos_faturamento_forte',          25, 'int', 'Pontuação', 'Faturamento forte'],
  ['pontos_funcionarios',               20, 'int', 'Pontuação', 'Aumento de funcionários'],
  ['pontos_notas',                      30, 'int', 'Pontuação', 'Aumento de notas'],
  ['pontos_honorario_defasado',         25, 'int', 'Pontuação', 'Honorário abaixo da régua'],

  ['faixa_normal_ate',                  29, 'int', 'Classificação', 'Score máximo da faixa Normal'],
  ['faixa_monitorar_ate',               49, 'int', 'Classificação', 'Score máximo da faixa Monitorar'],
  ['faixa_analisar_ate',                69, 'int', 'Classificação', 'Score máximo da faixa Analisar'],

  ['gatilho_ativo_faturamento_funcionarios', true, 'bool', 'Gatilhos ativos', 'Liga/desliga faturamento + funcionários'],
  ['gatilho_ativo_faturamento_forte',        true, 'bool', 'Gatilhos ativos', 'Liga/desliga faturamento forte'],
  ['gatilho_ativo_funcionarios',             true, 'bool', 'Gatilhos ativos', 'Liga/desliga aumento de funcionários'],
  ['gatilho_ativo_notas',                    true, 'bool', 'Gatilhos ativos', 'Liga/desliga aumento de notas'],
  ['gatilho_ativo_honorario_defasado',       true, 'bool', 'Gatilhos ativos', 'Liga/desliga honorário abaixo da régua'],

  ['faixa_sn_1_ate',  180000, 'number', 'Faixas do Simples', 'Limite superior da 1ª faixa (RBT12)'],
  ['faixa_sn_2_ate',  360000, 'number', 'Faixas do Simples', 'Limite superior da 2ª faixa'],
  ['faixa_sn_3_ate',  720000, 'number', 'Faixas do Simples', 'Limite superior da 3ª faixa'],
  ['faixa_sn_4_ate', 1800000, 'number', 'Faixas do Simples', 'Limite superior da 4ª faixa'],
  ['faixa_sn_5_ate', 3600000, 'number', 'Faixas do Simples', 'Limite superior da 5ª faixa'],
  ['faixa_sn_6_ate', 4800000, 'number', 'Faixas do Simples', 'Limite superior da 6ª faixa'],

  /* -------------------------------------------------------------------------
     Preço praticado pelos 5 principais concorrentes. Fica em CONFIG (e não no
     código) porque preço de mercado muda sozinho e sem aviso — a equipe
     atualiza pela tela Regras do monitor sem mexer no script.
     Só o valor da Contabilizei está conferido na fonte (set/2026, planos de
     R$ 139 a R$ 515). Os demais nascem em 0 = "a confirmar": o comparativo
     ignora concorrente zerado em vez de inventar um número.
     ------------------------------------------------------------------------- */
  ['conc_contabilizei_min',   139, 'number', 'Concorrência', 'Contabilizei — menor mensalidade publicada'],
  ['conc_contabilizei_max',   515, 'number', 'Concorrência', 'Contabilizei — maior mensalidade publicada'],
  ['conc_agilize_min',          0, 'number', 'Concorrência', 'Agilize — menor mensalidade publicada'],
  ['conc_agilize_max',          0, 'number', 'Concorrência', 'Agilize — maior mensalidade publicada'],
  ['conc_contaja_min',          0, 'number', 'Concorrência', 'Conta Já — menor mensalidade publicada'],
  ['conc_contaja_max',          0, 'number', 'Concorrência', 'Conta Já — maior mensalidade publicada'],
  ['conc_conube_min',           0, 'number', 'Concorrência', 'CONUBE — menor mensalidade publicada'],
  ['conc_conube_max',           0, 'number', 'Concorrência', 'CONUBE — maior mensalidade publicada'],
  ['conc_facilite_min',         0, 'number', 'Concorrência', 'Facilite — menor mensalidade publicada'],
  ['conc_facilite_max',         0, 'number', 'Concorrência', 'Facilite — maior mensalidade publicada'],
  ['conc_data_consulta', '2026-09-17', 'text', 'Concorrência', 'Data da última conferência dos preços de mercado'],
  ['conc_grupo_alerta_ate',    20, 'int',    'Concorrência', 'Até este grupo (G) cobramos abaixo do mercado — gera alerta'],

  /* Acesso: a lista fixa está em ACESSO_LIBERADO, no código. Esta chave SOMA
     pessoas a ela e nunca remove — apagar isto aqui não abre o painel para
     ninguém nem tira quem já está liberado. */
  ['emails_autorizados_extra', '', 'text', 'Acesso',
   'E-mails adicionais liberados, separados por vírgula. Soma-se à lista fixa do código; não substitui.']
];

var GATILHO_INFO = {
  faturamento_funcionarios: { label: 'Faturamento + funcionários', cor: 'alta' },
  faturamento_forte:        { label: 'Faturamento forte',          cor: 'analisar' },
  funcionarios:             { label: 'Aumento de funcionários',    cor: 'monitorar' },
  notas:                    { label: 'Aumento de notas',           cor: 'info' },
  honorario_defasado:       { label: 'Honorário abaixo da régua',  cor: 'accent' }
};

var PRIORIDADE_LABEL = {
  NORMAL: 'Normal', MONITORAR: 'Monitorar', ANALISAR: 'Analisar', ALTA_PRIORIDADE: 'Alta prioridade'
};

var STATUS_TRATATIVA = ['Novo alerta', 'Em análise', 'Contato realizado', 'Proposta enviada',
  'Negociação', 'Reajustado', 'Não reajustado', 'Acompanhar', 'Gatilho descartado'];

var MOTIVOS_NAO_REAJUSTE = ['Cliente recusou o aumento', 'Cliente ameaçou trocar de contabilidade',
  'Crescimento pontual, não recorrente', 'Cliente em dificuldade financeira',
  'Contrato recém-assinado ou reajustado', 'Cliente é indicador — preservar relação',
  'Negociação adiada a pedido do cliente', 'Decisão da diretoria',
  'Erro de dado — o crescimento não se confirmou', 'Outro (descrito na observação)'];

var SIT_ATENDIMENTO = ['Sem registro', 'Ativo e responsivo', 'Responde com atraso', 'Não responde',
  'Relação desgastada', 'Em negociação', 'Risco de saída'];

var MOTIVOS_SAIDA = ['Encerrou as atividades', 'Trocou de contabilidade — preço',
  'Trocou de contabilidade — atendimento', 'Trocou de contabilidade — outro motivo',
  'Inadimplência — encerramos', 'Fusão ou incorporação', 'Mudou de cidade/estado',
  'Cliente inativo sem movimento', 'Outro (descrito na observação)'];

/** Planos comerciais — tabela do site, valores "a partir de". */
var PLANOS = {
  servico:  { label: 'Serviço',  niveis: [
    { id: 'starter', nome: 'Exemplo Starter', cheio: 489,  por: 329 },
    { id: 'pro',     nome: 'Exemplo Pro',     cheio: 707,  por: 529 },
    { id: 'prime',   nome: 'Exemplo Prime',   cheio: 989,  por: 759 }]},
  comercio: { label: 'Comércio', niveis: [
    { id: 'starter', nome: 'Exemplo Starter', cheio: 631,  por: 459 },
    { id: 'pro',     nome: 'Exemplo Pro',     cheio: 859,  por: 609 },
    { id: 'prime',   nome: 'Exemplo Prime',   cheio: 1314, por: 1069 }]}
};

var PROP = { SPREADSHEET_ID: 'SPREADSHEET_ID' };

/* ===========================================================================
   1. WEB APP
   =========================================================================== */

function doGet(e) {
  // Porteiro da tela. O back-end tem o dele em cada api_* — este aqui só
  // evita entregar a interface para quem não deveria nem vê-la.
  if (!temAcesso_()) {
    try { registrarLog_('doGet', 'NEGADO', 'Abertura por ' + (emailAtivo_() || '(anônimo)'), 0, 0); }
    catch (err) {}
    return paginaSemAcesso_();
  }
  var t = HtmlService.createTemplateFromFile('Index');
  t.appNome = APP.nome;
  t.appOrg = APP.org;
  t.appVersao = APP.versao;
  return t.evaluate()
    .setTitle(APP.nome + ' — ' + APP.org)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('Monitor de Honorários')
      .addItem('Abrir painel', 'abrirPainel')
      .addSeparator()
      .addItem('Configurar / verificar estrutura', 'configurarMonitor')
      .addItem('Recalcular gatilhos e score', 'recalcularTudo')
      .addToUi();
  } catch (err) {
    Logger.log('onOpen: ' + err);
  }
}

function abrirPainel() {
  if (!temAcesso_()) {
    SpreadsheetApp.getUi().alert('Monitor de Honorários',
      'Acesso restrito. Sua conta (' + (emailAtivo_() || 'não identificada') +
      ') não está na lista de liberados.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  var t = HtmlService.createTemplateFromFile('Index');
  t.appNome = APP.nome; t.appOrg = APP.org; t.appVersao = APP.versao;
  SpreadsheetApp.getUi().showModalDialog(t.evaluate().setWidth(1500).setHeight(900), APP.nome);
}

/* ===========================================================================
   2. PLANILHA E ESTRUTURA
   =========================================================================== */

function obterPlanilha_() {
  if (obterPlanilha_._ss) return obterPlanilha_._ss;
  var ss = null;
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { ss = null; }
  if (!ss) {
    var id = PropertiesService.getScriptProperties().getProperty(PROP.SPREADSHEET_ID);
    if (!id) {
      throw new Error('Planilha não configurada. Rode configurarPlanilha("<link da planilha>") ' +
                      'uma vez, ou vincule este script à planilha por Extensões → Apps Script.');
    }
    ss = SpreadsheetApp.openById(id);
  }
  obterPlanilha_._ss = ss;
  return ss;
}

function configurarPlanilha(idOuUrl) {
  if (!idOuUrl) {
    var ativa = null;
    try { ativa = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { ativa = null; }
    if (ativa) return 'Script já vinculado a "' + ativa.getName() + '". Rode configurarMonitor.';
    throw new Error('Informe o link da planilha: configurarPlanilha("https://docs.google.com/spreadsheets/d/...").');
  }
  var s = String(idOuUrl).trim();
  var m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  var id = m ? m[1] : (/^[a-zA-Z0-9-_]{20,}$/.test(s) ? s : null);
  if (!id) throw new Error('Não consegui extrair o ID da planilha de: ' + idOuUrl);
  var ss = SpreadsheetApp.openById(id);
  PropertiesService.getScriptProperties().setProperty(PROP.SPREADSHEET_ID, id);
  obterPlanilha_._ss = null;
  return 'Planilha configurada: ' + ss.getName();
}

function configurarMonitor() {
  var msg = garantirEstrutura();
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(APP.nome, msg, SpreadsheetApp.getUi().ButtonSet.OK); }
  catch (e) { /* execução sem interface */ }
  return msg;
}

/** Cria abas e acrescenta colunas que faltarem. Nunca apaga nem reordena. */
function garantirEstrutura() {
  var ss = obterPlanilha_();
  var criadas = [], colunasNovas = [];

  Object.keys(ESQUEMA).forEach(function (nomeAba) {
    var cabecalho = ESQUEMA[nomeAba];
    var aba = ss.getSheetByName(nomeAba);
    if (!aba) {
      aba = ss.insertSheet(nomeAba);
      aba.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho])
         .setFontWeight('bold').setBackground('#107A45').setFontColor('#FFFFFF');
      aba.setFrozenRows(1);
      criadas.push(nomeAba);
      return;
    }
    if (aba.getLastColumn() === 0) {
      aba.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho]).setFontWeight('bold');
      aba.setFrozenRows(1);
      return;
    }
    var atual = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0]
      .map(function (h) { return String(h || '').trim(); });
    var faltando = cabecalho.filter(function (col) {
      return !atual.some(function (h) { return normalizarChave_(h) === normalizarChave_(col); });
    });
    if (faltando.length) {
      aba.getRange(1, atual.length + 1, 1, faltando.length).setValues([faltando]).setFontWeight('bold');
      colunasNovas.push(nomeAba + ': ' + faltando.join(', '));
    }
    if (aba.getFrozenRows() === 0) aba.setFrozenRows(1);
  });

  semearConfig_();

  var msg = 'Estrutura verificada. Abas criadas: ' + (criadas.length ? criadas.join(', ') : 'nenhuma') +
            '. Colunas acrescentadas: ' + (colunasNovas.length ? colunasNovas.join(' | ') : 'nenhuma') + '.';
  registrarLog_('garantirEstrutura', 'OK', msg, 0, criadas.length + colunasNovas.length);
  return msg;
}

function garantirEstruturaSeNecessario_() {
  var ss = obterPlanilha_();
  var precisa = Object.keys(ESQUEMA).some(function (nome) {
    var aba = ss.getSheetByName(nome);
    if (!aba || aba.getLastColumn() === 0) return true;
    var atual = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0]
      .map(function (h) { return String(h || '').trim(); });
    return ESQUEMA[nome].some(function (col) {
      return !atual.some(function (h) { return normalizarChave_(h) === normalizarChave_(col); });
    });
  });
  return precisa ? garantirEstrutura() : 'Estrutura já presente.';
}

/* ===========================================================================
   3. LEITURA E ESCRITA NA PLANILHA
   =========================================================================== */

function normalizarChave_(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}

function obterAba_(nome) {
  var ss = obterPlanilha_();
  var aba = ss.getSheetByName(nome);
  if (!aba) {
    garantirEstrutura();
    aba = ss.getSheetByName(nome);
    if (!aba) throw new Error('Aba não encontrada e não foi possível criar: ' + nome);
  }
  return aba;
}

function mapaColunas_(aba) {
  var ultima = aba.getLastColumn();
  if (ultima === 0) return { headers: [], indice: {} };
  var headers = aba.getRange(1, 1, 1, ultima).getValues()[0]
    .map(function (h) { return String(h || '').trim(); });
  var indice = {};
  headers.forEach(function (h, i) { if (h) indice[normalizarChave_(h)] = i; });
  return { headers: headers, indice: indice };
}

function lerAba_(nome) {
  var aba = obterAba_(nome);
  var ultLinha = aba.getLastRow(), ultCol = aba.getLastColumn();
  if (ultLinha < 2 || ultCol === 0) return [];
  var valores = aba.getRange(1, 1, ultLinha, ultCol).getValues();
  var headers = valores[0].map(function (h) { return String(h || '').trim(); });
  var out = [];
  for (var l = 1; l < valores.length; l++) {
    var linha = valores[l], vazia = true;
    for (var c = 0; c < linha.length; c++) {
      if (linha[c] !== '' && linha[c] !== null) { vazia = false; break; }
    }
    if (vazia) continue;
    var obj = { _linha: l + 1 };
    for (var k = 0; k < headers.length; k++) if (headers[k]) obj[headers[k]] = linha[k];
    out.push(obj);
  }
  return out;
}

function garantirLinhas_(aba, linhasNecessarias) {
  var precisa = linhasNecessarias + 1;
  var atual = aba.getMaxRows();
  if (precisa > atual) aba.insertRowsAfter(atual, precisa - atual);
}

function anexarLinhas_(nome, objetos) {
  if (!objetos || !objetos.length) return 0;
  var aba = obterAba_(nome);
  var m = mapaColunas_(aba);
  var matriz = objetos.map(function (o) {
    var linha = new Array(m.headers.length).fill('');
    Object.keys(o).forEach(function (k) {
      if (k.charAt(0) === '_') return;
      var i = m.indice[normalizarChave_(k)];
      if (i !== undefined) linha[i] = (o[k] === null || o[k] === undefined) ? '' : o[k];
    });
    return linha;
  });
  var inicio = aba.getLastRow() + 1;
  garantirLinhas_(aba, inicio - 1 + matriz.length);
  aba.getRange(inicio, 1, matriz.length, m.headers.length).setValues(matriz);
  return matriz.length;
}

function atualizarLinha_(nome, numeroLinha, campos) {
  var aba = obterAba_(nome);
  var m = mapaColunas_(aba);
  Object.keys(campos).forEach(function (k) {
    if (k.charAt(0) === '_') return;
    var i = m.indice[normalizarChave_(k)];
    if (i === undefined) return;
    var v = campos[k];
    aba.getRange(numeroLinha, i + 1).setValue(v === null || v === undefined ? '' : v);
  });
}

function upsertLinhas_(nome, objetos, chaveFn) {
  if (!objetos || !objetos.length) return { atualizados: 0, inseridos: 0 };
  var aba = obterAba_(nome);
  var m = mapaColunas_(aba);
  var ultLinha = aba.getLastRow();
  var existentes = {}, matrizAtual = [];

  if (ultLinha > 1) {
    matrizAtual = aba.getRange(2, 1, ultLinha - 1, m.headers.length).getValues();
    for (var l = 0; l < matrizAtual.length; l++) {
      var obj = {};
      for (var c = 0; c < m.headers.length; c++) if (m.headers[c]) obj[m.headers[c]] = matrizAtual[l][c];
      var ch = chaveFn(obj);
      if (ch) existentes[ch] = l;
    }
  }

  var inseridos = 0, atualizados = 0;
  objetos.forEach(function (o) {
    var ch = chaveFn(o);
    var idx = (ch && existentes[ch] !== undefined) ? existentes[ch] : -1;
    if (idx >= 0) {
      Object.keys(o).forEach(function (k) {
        if (k.charAt(0) === '_') return;
        var i = m.indice[normalizarChave_(k)];
        if (i === undefined) return;
        if (o[k] === null || o[k] === undefined) return;
        matrizAtual[idx][i] = o[k];
      });
      atualizados++;
    } else {
      var linha = new Array(m.headers.length).fill('');
      Object.keys(o).forEach(function (k) {
        if (k.charAt(0) === '_') return;
        var i = m.indice[normalizarChave_(k)];
        if (i !== undefined) linha[i] = (o[k] === null || o[k] === undefined) ? '' : o[k];
      });
      if (ch) existentes[ch] = matrizAtual.length;
      matrizAtual.push(linha);
      inseridos++;
    }
  });

  if (matrizAtual.length) {
    garantirLinhas_(aba, matrizAtual.length);
    aba.getRange(2, 1, matrizAtual.length, m.headers.length).setValues(matrizAtual);
  }
  return { atualizados: atualizados, inseridos: inseridos };
}

/** Escreve as colunas calculadas da aba EMPRESAS numa operação só. */
function aplicarAtualizacoesEmpresas_(atualizacoes) {
  if (!atualizacoes.length) return;
  var aba = obterAba_(ABAS.EMPRESAS);
  var m = mapaColunas_(aba);
  var primeira = 2, ultima = aba.getLastRow();
  if (ultima < primeira) return;
  var faixa = aba.getRange(primeira, 1, ultima - primeira + 1, m.headers.length);
  var matriz = faixa.getValues();
  atualizacoes.forEach(function (u) {
    var idx = u.linha - primeira;
    if (idx < 0 || idx >= matriz.length) return;
    Object.keys(u.campos).forEach(function (col) {
      var i = m.indice[normalizarChave_(col)];
      if (i !== undefined) matriz[idx][i] = u.campos[col];
    });
  });
  faixa.setValues(matriz);
}

/* ===========================================================================
   4. CONFIG_REGRAS
   =========================================================================== */

function semearConfig_() {
  var existentes = {};
  lerAba_(ABAS.CONFIG).forEach(function (r) {
    if (r['Chave']) existentes[String(r['Chave']).trim()] = true;
  });
  var faltando = CONFIG_SEED.filter(function (s) { return !existentes[s[0]]; });
  if (!faltando.length) return 0;
  var agora = new Date();
  anexarLinhas_(ABAS.CONFIG, faltando.map(function (s) {
    return { 'Chave': s[0], 'Valor': s[1], 'Tipo': s[2], 'Grupo': s[3],
             'Descrição': s[4], 'Atualizado_Em': agora, 'Atualizado_Por': 'seed' };
  }));
  return faltando.length;
}

function obterConfig(forcar) {
  var cache = CacheService.getScriptCache();
  if (!forcar) {
    var bruto = cache.get('cfg_regras');
    if (bruto) { try { return JSON.parse(bruto); } catch (e) { /* relê */ } }
  }
  var cfg = {};
  lerAba_(ABAS.CONFIG).forEach(function (r) {
    var chave = String(r['Chave'] || '').trim();
    if (!chave) return;
    cfg[chave] = converterValorConfig_(r['Valor'], String(r['Tipo'] || 'text'));
  });
  CONFIG_SEED.forEach(function (s) { if (cfg[s[0]] === undefined) cfg[s[0]] = s[1]; });
  try { cache.put('cfg_regras', JSON.stringify(cfg), 300); } catch (e) { /* ignora */ }
  return cfg;
}

function converterValorConfig_(v, tipo) {
  if (tipo === 'bool') {
    if (typeof v === 'boolean') return v;
    var s = String(v).trim().toLowerCase();
    return s === 'true' || s === 'sim' || s === 'verdadeiro' || s === '1';
  }
  if (tipo === 'int') { var n = parseInt(String(v).replace(/[^\d-]/g, ''), 10); return isNaN(n) ? 0 : n; }
  if (tipo === 'number' || tipo === 'percent') {
    if (typeof v === 'number') return v;
    var f = parseFloat(String(v).replace(/\./g, '').replace(',', '.'));
    return isNaN(f) ? 0 : f;
  }
  return v === null || v === undefined ? '' : String(v);
}

function salvarConfig(mudancas, usuario) {
  var linhas = lerAba_(ABAS.CONFIG);
  var porChave = {};
  linhas.forEach(function (r) { porChave[String(r['Chave'] || '').trim()] = r; });
  var agora = new Date(), alteradas = 0;

  Object.keys(mudancas).forEach(function (chave) {
    var atual = porChave[chave];
    if (!atual) {
      anexarLinhas_(ABAS.CONFIG, [{ 'Chave': chave, 'Valor': mudancas[chave],
        'Tipo': typeof mudancas[chave] === 'boolean' ? 'bool' : (typeof mudancas[chave] === 'number' ? 'number' : 'text'),
        'Grupo': 'Personalizado', 'Descrição': '', 'Atualizado_Em': agora,
        'Atualizado_Por': usuario || usuarioAtual_() }]);
    } else {
      atualizarLinha_(ABAS.CONFIG, atual._linha, { 'Valor': mudancas[chave],
        'Atualizado_Em': agora, 'Atualizado_Por': usuario || usuarioAtual_() });
    }
    alteradas++;
  });

  CacheService.getScriptCache().remove('cfg_regras');
  registrarLog_('salvarConfig', 'OK', alteradas + ' regra(s) alterada(s)', 0, alteradas);
  return alteradas;
}

/* ===========================================================================
   5. UTILITÁRIOS
   =========================================================================== */

function limparCNPJ(valor) {
  if (valor === null || valor === undefined) return '';
  var s = String(valor);
  if (typeof valor === 'number') s = valor.toFixed(0);
  s = s.replace(/\D/g, '');
  if (s.length >= 11 && s.length < 14) s = ('00000000000000' + s).slice(-14);
  return s;
}

function formatarCNPJ(cnpj) {
  var c = limparCNPJ(cnpj);
  if (c.length !== 14) return String(cnpj || '');
  return c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/** Chave cronológica YYYYMM. Nunca compare competência como texto. */
function competenciaParaChave_(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (Object.prototype.toString.call(valor) === '[object Date]' && !isNaN(valor)) {
    return String(valor.getFullYear()) + ('0' + (valor.getMonth() + 1)).slice(-2);
  }
  if (typeof valor === 'number') {
    if (valor >= 190001 && valor <= 299912) return String(Math.round(valor));
    if (valor > 20000 && valor < 80000) {
      var d = new Date(Math.round((valor - 25569) * 86400000));
      return String(d.getUTCFullYear()) + ('0' + (d.getUTCMonth() + 1)).slice(-2);
    }
  }
  var s = String(valor).trim(), m;
  m = s.match(/^(\d{4})[-\/]?(\d{2})$/);                  if (m && +m[2] >= 1 && +m[2] <= 12) return m[1] + m[2];
  m = s.match(/^(\d{1,2})\s*[\/\-]\s*(\d{4})$/);          if (m && +m[1] >= 1 && +m[1] <= 12) return m[2] + ('0' + m[1]).slice(-2);
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/); if (m) return m[3] + ('0' + m[2]).slice(-2);
  m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/); if (m) return m[1] + ('0' + m[2]).slice(-2);
  var meses = { jan:1, fev:2, mar:3, abr:4, mai:5, jun:6, jul:7, ago:8, set:9, out:10, nov:11, dez:12 };
  m = s.toLowerCase().match(/^([a-zç]{3})[a-zç]*[\/\-\s]+(\d{2,4})$/);
  if (m && meses[m[1]]) {
    var ano = m[2].length === 2 ? '20' + m[2] : m[2];
    return ano + ('0' + meses[m[1]]).slice(-2);
  }
  m = s.match(/^(\d{1,2})\s*[\/\-]\s*(\d{2})$/);
  if (m && +m[1] >= 1 && +m[1] <= 12) return '20' + m[2] + ('0' + m[1]).slice(-2);
  return null;
}

function competenciaDisplay_(chave) {
  var s = String(chave || '');
  if (!/^\d{6}$/.test(s)) return s || '—';
  return s.slice(4, 6) + '/' + s.slice(0, 4);
}

function competenciaCorrente_() {
  var d = new Date();
  return String(d.getFullYear()) + ('0' + (d.getMonth() + 1)).slice(-2);
}

function deslocarCompetencia_(chave, meses) {
  var ano = parseInt(String(chave).slice(0, 4), 10);
  var mes = parseInt(String(chave).slice(4, 6), 10) - 1 + meses;
  ano += Math.floor(mes / 12);
  mes = ((mes % 12) + 12) % 12;
  return String(ano) + ('0' + (mes + 1)).slice(-2);
}

function mesesDesde_(data) {
  var d = paraData_(data);
  if (!d) return null;
  var hoje = new Date();
  return (hoje.getFullYear() - d.getFullYear()) * 12 + (hoje.getMonth() - d.getMonth());
}

function paraData_(v) {
  if (!v && v !== 0) return null;
  if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v) ? null : v;
  var s = String(v).trim();
  if (!s) return null;
  var m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  var d = new Date(s);
  return isNaN(d) ? null : d;
}

/* A frase do acordo de nao cobranca. Constante porque ela e gravada na
   planilha e lida de volta: qualquer divergencia de acentuacao ou espaco
   transformaria o acordo em celula ilegivel, que paraNumero_ leria como null
   e a empresa voltaria para a fila de defasagem. */
var SEM_COBRANCA = 'NÃO COBRAMOS';

/* No Tabelao a ausencia de grupo e escrita como "Não", nao como celula vazia.
   Tratar o texto como nome criaria um grupo gigante chamado "Não". */
function nomeGrupo_(v) {
  var s = texto_(v).trim();
  if (!s) return '';
  var n = s.toLowerCase();
  return (n === 'não' || n === 'nao' || n === '-' || n === 'n/a') ? '' : s;
}

function ehSemCobranca_(v) {
  if (v === null || v === undefined) return false;
  return /n[ãa]o\s*cobr/i.test(String(v));
}

function paraNumero_(v) {
  if (ehSemCobranca_(v)) return null;
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return isNaN(v) ? null : v;
  var s = String(v).replace(/[R$\s ]/g, '').trim();
  if (!s || s === '-') return null;
  var negativo = /^\(.*\)$/.test(s);
  s = s.replace(/[()]/g, '');
  if (s.indexOf(',') > -1 && s.indexOf('.') > -1) {
    s = (s.lastIndexOf(',') > s.lastIndexOf('.'))
      ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (s.indexOf(',') > -1) {
    s = s.replace(/\./g, '').replace(',', '.');
  }
  var n = parseFloat(s);
  if (isNaN(n)) return null;
  return negativo ? -n : n;
}

function variacao_(atual, anterior) {
  if (atual === null || anterior === null || atual === undefined || anterior === undefined) return null;
  if (!anterior) return null;
  return (atual - anterior) / anterior;
}

function arredondar_(n, casas) {
  if (n === null || n === undefined || isNaN(n)) return null;
  var f = Math.pow(10, casas === undefined ? 4 : casas);
  return Math.round(n * f) / f;
}

function texto_(v) { return v === null || v === undefined ? '' : String(v).trim(); }

function iso_(v) { var d = paraData_(v); return d ? d.toISOString() : ''; }

function verdadeiro_(v) {
  if (typeof v === 'boolean') return v;
  var s = String(v || '').trim().toLowerCase();
  return s === 'true' || s === 'sim' || s === '1';
}

function chavePrioridade_(v) {
  var s = normalizarChave_(v);
  if (s === 'altaprioridade') return 'ALTA_PRIORIDADE';
  if (s === 'analisar') return 'ANALISAR';
  if (s === 'monitorar') return 'MONITORAR';
  return 'NORMAL';
}

function normalizarTributacao_(t) {
  var u = String(t || '').toUpperCase().trim();
  if (!u) return 'Não informado';
  if (u.indexOf('SIMPLES') > -1 || u === 'SN') return 'Simples Nacional';
  if (u.indexOf('PRESUMIDO') > -1 || u === 'LP') return 'Lucro Presumido';
  if (u.indexOf('REAL') > -1 || u === 'LR') return 'Lucro Real';
  if (u.indexOf('MEI') > -1) return 'MEI';
  return String(t).trim();
}

function usuarioAtual_() {
  try { return Session.getActiveUser().getEmail() || 'desconhecido'; }
  catch (e) { return 'desconhecido'; }
}

function registrarLog_(funcao, status, mensagem, duracaoMs, registros) {
  try {
    anexarLinhas_(ABAS.LOG, [{ 'Data': new Date(), 'Função': funcao, 'Status': status,
      'Mensagem': String(mensagem || '').slice(0, 2000), 'Duração_ms': duracaoMs || 0,
      'Registros': registros || 0, 'Usuário': usuarioAtual_() }]);
  } catch (e) { Logger.log('Falha ao registrar log: ' + e); }
}

/* ===========================================================================
   6. FAIXAS, PORTE, PLANOS E RÉGUA DO SALÁRIO MÍNIMO
   =========================================================================== */

var FAIXAS_ROTULOS = ['1ª faixa', '2ª faixa', '3ª faixa', '4ª faixa', '5ª faixa', '6ª faixa'];

function faixasSimples_(cfg) {
  var tetos = [cfg.faixa_sn_1_ate, cfg.faixa_sn_2_ate, cfg.faixa_sn_3_ate,
               cfg.faixa_sn_4_ate, cfg.faixa_sn_5_ate, cfg.faixa_sn_6_ate];
  return tetos.map(function (teto, i) {
    return { numero: i + 1, rotulo: FAIXAS_ROTULOS[i],
             limiteInferior: i === 0 ? 0 : arredondar_(tetos[i - 1] + 0.01, 2),
             limiteSuperior: teto };
  });
}

/**
 * Faixa pelo RBT12. Sem faturamento NÃO vira 1ª faixa: vira "Sem faturamento",
 * para não confundir quem não movimentou com quem fatura pouco.
 */
function calcularFaixaSimples_(rbt12, cfg) {
  if (rbt12 === null || rbt12 === undefined || rbt12 === '' || rbt12 <= 0) {
    return { numero: 0, rotulo: 'Sem faturamento', limiteInferior: null, limiteSuperior: null };
  }
  var lista = faixasSimples_(cfg);
  for (var i = 0; i < lista.length; i++) if (rbt12 <= lista[i].limiteSuperior) return lista[i];
  return { numero: 7, rotulo: 'Acima do teto',
           limiteInferior: arredondar_(cfg.faixa_sn_6_ate + 0.01, 2), limiteSuperior: null };
}

function rotuloPorte_(faixaNumero) {
  if (!faixaNumero) return 'Sem faturamento';
  if (faixaNumero === 1) return 'Pequeno';
  if (faixaNumero <= 3) return 'Médio';
  if (faixaNumero <= 5) return 'Grande';
  return 'Muito grande';
}

/**
 * Valor de um percentual do SM, arredondado ao real inteiro — é assim que a
 * planilha de honorários trabalha (1621 × 0,20 = 324,20 cobrado como 324).
 * Sem arredondar, a carteira inteira apareceria centavos defasada.
 */
function valorPorPercentualSM_(percentual, cfg) {
  if (percentual === null || percentual === undefined) return null;
  return Math.round(cfg.salario_minimo * percentual);
}

function percentualSM_(valor, cfg) {
  var v = paraNumero_(valor);
  if (v === null || !cfg.salario_minimo) return null;
  return arredondar_(v / cfg.salario_minimo, 4);
}

function grupoDoPercentual_(p) {
  return (p === null || p === undefined) ? '' : 'G' + Math.round(p * 100);
}

/** Honorário-alvo pela régua: 20% do SM sem NF, 30% com NF. */
function honorarioIdeal_(dados, cfg) {
  if ((dados.faixaNumero || 0) >= cfg.faixa_limite_regua_fixa) {
    return { percentual: null, valor: null, grupo: '', motivo: 'FORA_DA_REGUA',
      explicacao: 'Porte acima da ' + cfg.faixa_limite_regua_fixa + 'ª faixa — precificação caso a caso.' };
  }
  var pct = dados.emiteNota ? cfg.pct_reajuste_com_nota : cfg.pct_reajuste_sem_nota;
  return { percentual: pct, valor: valorPorPercentualSM_(pct, cfg), grupo: grupoDoPercentual_(pct),
    motivo: dados.emiteNota ? 'COM_NOTA' : 'SEM_NOTA',
    explicacao: (dados.emiteNota ? 'Emite nota fiscal — ' : 'Sem emissão de notas — ') +
                (pct * 100).toFixed(0) + '% do salário mínimo.' };
}

function ramoDaEmpresa_(empresa) {
  var t = String(empresa['Tipo'] || empresa['Segmento'] || '').toLowerCase();
  if (t.indexOf('comérc') > -1 || t.indexOf('comerc') > -1 ||
      t.indexOf('indúst') > -1 || t.indexOf('indust') > -1) return 'comercio';
  return 'servico';
}

/**
 * Plano indicado pelo porte: 1ª faixa → Starter, 2ª/3ª → Pro, 4ª+ → Prime.
 * Quem tem folha nunca fica no Starter — folha só existe a partir do Pro.
 */
function planoIndicado_(empresa, faixaNumero) {
  var ramo = ramoDaEmpresa_(empresa);
  var temFolha = (paraNumero_(empresa['Qtd Funcionários Atual']) || 0) > 0;
  var idx = faixaNumero >= 4 ? 2 : (faixaNumero >= 2 ? 1 : 0);
  if (temFolha && idx === 0) idx = 1;
  return { ramo: ramo, ramoLabel: PLANOS[ramo].label, nivel: PLANOS[ramo].niveis[idx], temFolha: temFolha };
}

/* ===========================================================================
   7. MOTOR DE REGRAS
   =========================================================================== */

function montarSeries_(linhasHistorico) {
  var porCnpj = {};
  (linhasHistorico || []).forEach(function (r) {
    var cnpj = limparCNPJ(r['CNPJ']);
    if (cnpj.length !== 14) return;
    var chave = String(r['Competência_Chave'] || '').trim();
    if (!/^\d{6}$/.test(chave)) chave = competenciaParaChave_(r['Competência']);
    if (!chave) return;
    if (!porCnpj[cnpj]) porCnpj[cnpj] = [];
    porCnpj[cnpj].push({
      chave: chave,
      faturamento: paraNumero_(r['Faturamento']),
      funcionarios: paraNumero_(r['Qtd_Funcionários']),
      notas: paraNumero_(r['Qtd_Notas'])
    });
  });
  Object.keys(porCnpj).forEach(function (c) {
    porCnpj[c].sort(function (a, b) { return a.chave < b.chave ? -1 : (a.chave > b.chave ? 1 : 0); });
  });
  return porCnpj;
}

function serieDe_(serie, campo) {
  return (serie || []).filter(function (p) {
    return p[campo] !== null && p[campo] !== undefined && p[campo] !== '';
  });
}

function plausivel_(pct, cfg) {
  if (pct === null || pct === undefined) return false;
  return Math.abs(pct) <= cfg.variacao_maxima_plausivel;
}

function aumentoFuncionariosSignificativo_(atual, anterior, cfg) {
  if (atual === null || anterior === null) return null;
  var delta = atual - anterior;
  if (delta <= 0) return null;
  var pct = anterior > 0 ? delta / anterior : null;
  var significativo = anterior < cfg.min_funcionarios_base
    ? delta >= cfg.abs_funcionarios
    : ((pct !== null && pct >= cfg.pct_funcionarios) || delta >= cfg.abs_funcionarios);
  return significativo ? { delta: delta, pct: pct } : null;
}

function pctTexto_(p) {
  if (p === null || p === undefined) return '—';
  return (p >= 0 ? '+' : '') + (p * 100).toFixed(1).replace('.', ',') + '%';
}

function moedaBR_(v) {
  if (v === null || v === undefined) return '—';
  return 'R$ ' + Number(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function detectarFaturamento_(serieFat, serieFunc, cfg) {
  if (serieFat.length < 2) return null;
  var atual = serieFat[serieFat.length - 1], anterior = serieFat[serieFat.length - 2];
  var pct = variacao_(atual.faturamento, anterior.faturamento);
  if (pct === null || !plausivel_(pct, cfg)) return null;

  var funcAtual = null, funcAnterior = null;
  for (var i = 0; i < serieFunc.length; i++) {
    if (serieFunc[i].chave === atual.chave) funcAtual = serieFunc[i].funcionarios;
    if (serieFunc[i].chave === anterior.chave) funcAnterior = serieFunc[i].funcionarios;
  }
  var alta = aumentoFuncionariosSignificativo_(funcAtual, funcAnterior, cfg);

  if (alta && pct >= cfg.pct_faturamento_forte && cfg.gatilho_ativo_faturamento_funcionarios) {
    return { tipo: 'faturamento_funcionarios', chave: atual.chave,
      valorAtual: atual.faturamento, valorAnterior: anterior.faturamento,
      variacao: pct, pontos: cfg.pontos_faturamento_funcionarios,
      descricao: 'Faturamento ' + pctTexto_(pct) + ' e folha +' + alta.delta + ' funcionário(s)' };
  }
  if (pct >= cfg.pct_faturamento && cfg.gatilho_ativo_faturamento_forte) {
    return { tipo: 'faturamento_forte', chave: atual.chave,
      valorAtual: atual.faturamento, valorAnterior: anterior.faturamento,
      variacao: pct, pontos: cfg.pontos_faturamento_forte,
      descricao: 'Faturamento ' + pctTexto_(pct) + ' sem aumento equivalente de folha' };
  }
  return null;
}

function detectarFuncionarios_(serieFunc, cfg) {
  if (!cfg.gatilho_ativo_funcionarios || serieFunc.length < 2) return null;
  var atual = serieFunc[serieFunc.length - 1], anterior = serieFunc[serieFunc.length - 2];
  var alta = aumentoFuncionariosSignificativo_(atual.funcionarios, anterior.funcionarios, cfg);
  if (!alta) return null;
  return { tipo: 'funcionarios', chave: atual.chave,
    valorAtual: atual.funcionarios, valorAnterior: anterior.funcionarios,
    variacao: alta.pct, pontos: cfg.pontos_funcionarios,
    descricao: 'Quadro passou de ' + anterior.funcionarios + ' para ' + atual.funcionarios + ' funcionários' };
}

function detectarNotas_(serieNotas, cfg) {
  if (!cfg.gatilho_ativo_notas) return null;
  var janela = cfg.janela_media_notas;
  if (serieNotas.length < janela + 1) return null;
  var atual = serieNotas[serieNotas.length - 1];
  var anteriores = serieNotas.slice(-1 - janela, -1);
  var soma = anteriores.reduce(function (a, p) { return a + p.notas; }, 0);
  var media = soma / anteriores.length;
  if (!media || media <= 0) return null;
  var pct = (atual.notas - media) / media;
  if (pct < cfg.pct_notas || !plausivel_(pct, cfg)) return null;
  return { tipo: 'notas', chave: atual.chave, valorAtual: atual.notas,
    valorAnterior: arredondar_(media, 1), variacao: pct, pontos: cfg.pontos_notas,
    descricao: atual.notas + ' notas contra média de ' + arredondar_(media, 1) +
               ' nos últimos ' + janela + ' meses (' + pctTexto_(pct) + ')' };
}

/**
 * Honorário abaixo da régua do SM. NÃO depende de histórico de faturamento —
 * por isso dispara sozinho em empresa sem série mensal, que é justamente o
 * caso do grupo "G Outros".
 */
function detectarHonorarioDefasado_(empresa, faixaNumero, emiteNota, cfg, competenciaRef) {
  if (!cfg.gatilho_ativo_honorario_defasado) return null;
  /* Acordo de nao cobranca nao e defasagem: alguem decidiu nao cobrar. Marcar
     score nele encheria a fila de ataque de casos ja resolvidos. */
  if (ehSemCobranca_(empresa['Honorário Atual']) || verdadeiro_(empresa['Não Cobramos'])) return null;
  var atual = paraNumero_(empresa['Honorário Atual']);
  if (atual === null || atual <= 0) return null;

  /* Regra do Colaborador 45: empresa SEM FATURAMENTO que paga ao menos 10% do salario
     minimo esta OK. Ela nao tem movimento que sustente a regua cheia, e o que
     se cobra dela e a manutencao da obrigacao acessoria. Sem essa excecao toda
     empresa parada aparecia defasada e a fila deixava de ser fila. */
  if (!faixaNumero) {
    var pisoParado = valorPorPercentualSM_(
      cfg.pct_minimo_sem_faturamento === undefined ? 0.10 : cfg.pct_minimo_sem_faturamento, cfg);
    if (atual >= pisoParado) return null;
  }
  var ideal = honorarioIdeal_({ emiteNota: emiteNota, faixaNumero: faixaNumero }, cfg);
  if (ideal.motivo === 'FORA_DA_REGUA' || ideal.valor === null) return null;
  var gap = ideal.valor - atual;
  if (gap <= 0) return null;
  var gapPct = gap / ideal.valor;
  if (gapPct < cfg.desvio_honorario_alerta) return null;
  return { tipo: 'honorario_defasado', chave: competenciaRef,
    valorAtual: atual, valorAnterior: ideal.valor,
    variacao: arredondar_(gapPct, 4), pontos: cfg.pontos_honorario_defasado,
    descricao: 'Paga ' + moedaBR_(atual) + ' · régua ' + ideal.grupo + ' = ' + moedaBR_(ideal.valor) };
}

function classificarPrioridade_(score, cfg) {
  if (score <= cfg.faixa_normal_ate) return 'NORMAL';
  if (score <= cfg.faixa_monitorar_ate) return 'MONITORAR';
  if (score <= cfg.faixa_analisar_ate) return 'ANALISAR';
  return 'ALTA_PRIORIDADE';
}

/** RBT12 sobre competências fechadas. Menos de 12 meses: projeta e marca. */
function avaliarEmpresa_(empresa, serieBruta, cfg) {
  var corrente = competenciaCorrente_();
  var serie = (serieBruta || []).filter(function (p) {
    return cfg.ignorar_competencia_corrente ? p.chave < corrente : true;
  });
  var serieFat = serieDe_(serie, 'faturamento');
  var serieFunc = serieDe_(serie, 'funcionarios');
  var serieNotas = serieDe_(serie, 'notas');

  var res = { gatilhos: [], score: 0, prioridade: 'NORMAL', qualidade: 'OK',
    varFaturamento: null, var12m: null, mesesFat: serieFat.length, mesesNotas: serieNotas.length,
    ultimaCompFat: serieFat.length ? serieFat[serieFat.length - 1].chave : null,
    qtdFuncionariosAtual: serieFunc.length ? serieFunc[serieFunc.length - 1].funcionarios : null,
    faturamentoAnual: null };

  if (serieFat.length >= 2) {
    res.varFaturamento = variacao_(serieFat[serieFat.length - 1].faturamento,
                                   serieFat[serieFat.length - 2].faturamento);
  }
  if (serieFat.length >= 24) {
    var rec = serieFat.slice(-12).reduce(function (a, p) { return a + p.faturamento; }, 0) / 12;
    var ant = serieFat.slice(-24, -12).reduce(function (a, p) { return a + p.faturamento; }, 0) / 12;
    res.var12m = variacao_(rec, ant);
  }
  if (serieFat.length) {
    var ult12 = serieFat.slice(-12);
    res.faturamentoAnual = ult12.reduce(function (a, p) { return a + (p.faturamento || 0); }, 0);
    if (ult12.length < 12) res.faturamentoAnual = res.faturamentoAnual / ult12.length * 12;
  }

  // A régua do SM independe de série mensal — avaliada sempre.
  var faixaRegua = calcularFaixaSimples_(res.faturamentoAnual, cfg);
  var emiteNota = serieNotas.length > 0;
  var ref = res.ultimaCompFat || corrente;
  var gHon = detectarHonorarioDefasado_(empresa, faixaRegua.numero, emiteNota, cfg, ref);
  if (gHon) res.gatilhos.push(gHon);

  if (serieFat.length < cfg.min_meses_historico && serieNotas.length < cfg.min_meses_historico) {
    res.qualidade = 'DADO INSUFICIENTE';
    res.score = res.gatilhos.reduce(function (a, x) { return a + (x.pontos || 0); }, 0);
    res.prioridade = classificarPrioridade_(res.score, cfg);
    return res;
  }
  if (res.varFaturamento !== null && !plausivel_(res.varFaturamento, cfg)) {
    res.qualidade = 'DADO INCONSISTENTE';
    return res;
  }

  var g;
  if ((g = detectarFaturamento_(serieFat, serieFunc, cfg))) res.gatilhos.push(g);
  if ((g = detectarFuncionarios_(serieFunc, cfg))) {
    var jaCombinado = res.gatilhos.some(function (x) { return x.tipo === 'faturamento_funcionarios'; });
    if (!jaCombinado) res.gatilhos.push(g);
  }
  if ((g = detectarNotas_(serieNotas, cfg))) res.gatilhos.push(g);

  res.score = res.gatilhos.reduce(function (a, x) { return a + (x.pontos || 0); }, 0);
  res.prioridade = classificarPrioridade_(res.score, cfg);
  if (serieFunc.length === 0 && res.qualidade === 'OK') res.qualidade = 'SEM DADOS DE FOLHA';
  return res;
}

/** Recalcula score e gatilhos da base inteira. Idempotente. */
function recalcularTudo() {
  var t0 = new Date().getTime();
  var cfg = obterConfig(true);
  var empresas = lerAba_(ABAS.EMPRESAS);
  var series = montarSeries_(lerAba_(ABAS.HISTORICO));
  var agora = new Date();

  var gatilhosExistentes = {};
  lerAba_(ABAS.GATILHOS).forEach(function (r) {
    var id = String(r['ID_Gatilho'] || '').trim();
    if (id) gatilhosExistentes[id] = r;
  });

  var atualizacoes = [], gatilhosParaGravar = [], novos = 0, comAlerta = 0;

  empresas.forEach(function (emp) {
    var cnpj = limparCNPJ(emp['CNPJ']);
    if (cnpj.length !== 14) return;
    // Cliente com baixa não gera oportunidade — não há o que atacar.
    if (paraData_(emp['Data Baixa']) && !paraData_(emp['Data Retorno'])) return;

    var res = avaliarEmpresa_(emp, series[cnpj], cfg);
    var faixa = calcularFaixaSimples_(res.faturamentoAnual, cfg);
    var plano = planoIndicado_(emp, faixa.numero);
    var hon = paraNumero_(emp['Honorário Atual']);
    var ideal = honorarioIdeal_({ emiteNota: res.mesesNotas > 0, faixaNumero: faixa.numero }, cfg);

    atualizacoes.push({ linha: emp._linha, campos: {
      'Score': res.score,
      'Prioridade': PRIORIDADE_LABEL[res.prioridade] || res.prioridade,
      'Gatilhos Ativos': res.gatilhos.map(function (g) { return g.tipo; }).join(', '),
      'Var Faturamento %': res.varFaturamento === null ? '' : arredondar_(res.varFaturamento, 4),
      'Var 12 Meses %': res.var12m === null ? '' : arredondar_(res.var12m, 4),
      'Meses Histórico Faturamento': res.mesesFat,
      'Meses Histórico Notas': res.mesesNotas,
      'Última Competência Faturamento': res.ultimaCompFat ? competenciaDisplay_(res.ultimaCompFat) : '',
      'Qtd Funcionários Atual': res.qtdFuncionariosAtual === null ? '' : res.qtdFuncionariosAtual,
      'RBT12': res.faturamentoAnual === null ? '' : arredondar_(res.faturamentoAnual, 2),
      'Faixa Simples': faixa.rotulo,
      'Porte': rotuloPorte_(faixa.numero),
      'Percentual SM': hon === null ? '' : percentualSM_(hon, cfg),
      'Honorário Ideal': ideal.valor === null ? '' : ideal.valor,
      'Grupo Ideal': ideal.grupo,
      'Gap Honorário': (ideal.valor === null || hon === null) ? '' : Math.max(0, arredondar_(ideal.valor - hon, 2)),
      'Ramo': plano.ramoLabel,
      'Plano Indicado': plano.nivel.nome,
      'Piso do Plano': plano.nivel.por,
      'Gap Plano': hon === null ? '' : Math.max(0, arredondar_(plano.nivel.por - hon, 2)),
      'Qualidade dos Dados': res.qualidade,
      'Última Análise': agora
    }});

    if (res.score > 0) comAlerta++;

    res.gatilhos.forEach(function (g) {
      var id = cnpj + '_' + g.chave + '_' + g.tipo;
      var antigo = gatilhosExistentes[id];
      if (!antigo) novos++;
      gatilhosParaGravar.push({
        'ID_Gatilho': id, 'CNPJ': cnpj, 'Empresa': emp['Empresa'] || '',
        'Competência': competenciaDisplay_(g.chave), 'Competência_Chave': g.chave,
        'Tipo_Gatilho': g.tipo,
        'Descrição': g.descricao || (GATILHO_INFO[g.tipo] ? GATILHO_INFO[g.tipo].label : g.tipo),
        'Score': g.pontos,
        'Valor_Atual': g.valorAtual === undefined ? '' : g.valorAtual,
        'Valor_Anterior': g.valorAnterior === undefined ? '' : g.valorAnterior,
        'Variação_%': (g.variacao === undefined || g.variacao === null) ? '' : arredondar_(g.variacao, 4),
        // Campos de tratativa só são definidos na criação — nunca sobrescritos.
        'Data_Geração': antigo ? antigo['Data_Geração'] : agora,
        'Status': antigo ? antigo['Status'] : 'Novo alerta',
        'Responsável': antigo ? antigo['Responsável'] : '',
        'Observação': antigo ? antigo['Observação'] : '',
        'Justificativa': antigo ? antigo['Justificativa'] : '',
        'Data_Tratativa': antigo ? antigo['Data_Tratativa'] : '',
        'Score_Total_Empresa': res.score,
        'Prioridade_Empresa': PRIORIDADE_LABEL[res.prioridade] || res.prioridade
      });
    });
  });

  aplicarAtualizacoesEmpresas_(atualizacoes);
  if (gatilhosParaGravar.length) {
    upsertLinhas_(ABAS.GATILHOS, gatilhosParaGravar, function (o) {
      return String(o['ID_Gatilho'] || '').trim();
    });
  }

  var ms = new Date().getTime() - t0;
  var msg = empresas.length + ' empresas avaliadas · ' + comAlerta + ' com sinal · ' +
            gatilhosParaGravar.length + ' gatilhos (' + novos + ' novos)';
  registrarLog_('recalcularTudo', 'OK', msg, ms, gatilhosParaGravar.length);
  return { empresas: empresas.length, comAlerta: comAlerta,
           gatilhos: gatilhosParaGravar.length, novos: novos, duracaoMs: ms, mensagem: msg };
}

/* ===========================================================================
   8. API DO WEB APP
   Tudo que o Index.html chama por google.script.run está aqui.
   =========================================================================== */

/**
 * Carga inicial. O histórico mês a mês NÃO viaja inteiro — só o resumo por
 * empresa. Ler a aba toda faria a tela levar dezenas de segundos para abrir.
 */
function api_carregarTudo() {
  var t0 = new Date().getTime();
  try {
    exigirAcesso_();
    garantirEstruturaSeNecessario_();
    var cfg = obterConfig();
    var resumo = resumoHistorico_();
    var empresasRaw = lerAba_(ABAS.EMPRESAS);

    var empresas = empresasRaw.map(function (e) {
      var cnpj = limparCNPJ(e['CNPJ']);
      var r = resumo.porCnpj[cnpj] || { total: 0, meses: 0, ultimo: null, ultimaChave: '' };
      var baixa = paraData_(e['Data Baixa']);
      var retorno = paraData_(e['Data Retorno']);
      return {
        cnpj: cnpj, cnpjFmt: formatarCNPJ(cnpj),
        codigoDominio: texto_(e['Código Domínio']),
        empresa: texto_(e['Empresa']),
        tributacao: normalizarTributacao_(e['Tributação']),
        situacao: texto_(e['Situação Tabelão']),
        tipo: texto_(e['Tipo']), segmento: texto_(e['Segmento']),
        matrizFilial: texto_(e['Matriz/Filial']),
        /* Nome do grupo como o time registra no Tabelao. A raiz do CNPJ so
           enxerga matriz e filial; o grupo de verdade costuma ser por socio. */
        grupoEmpresarial: nomeGrupo_(e['Grupo de Empresas']),
        fiscal: texto_(e['Fiscal Responsável']),
        folhaResp: texto_(e['Folha Responsável']),
        contato: texto_(e['Contato']), whatsapp: texto_(e['WhatsApp']),
        cidade: texto_(e['Cidade']),
        honorarioAtual: paraNumero_(e['Honorário Atual']),
        /* "NAO COBRAMOS" na celula do honorario e um acordo, nao um zero. Ler
           como texto preserva a diferenca entre "existe acordo" e "ninguem
           preencheu" -- as duas viravam R$ 0,00 e caiam na mesma fila. */
        naoCobramos: ehSemCobranca_(e['Honorário Atual']) || verdadeiro_(e['Não Cobramos']),
        obsFinanceiro: texto_(e['Observação Financeira']),
        grupoHonorario: texto_(e['Grupo Honorário']),
        tipoCobranca: texto_(e['Tipo Cobrança']),
        pctSM: paraNumero_(e['Percentual SM']),
        honorarioIdeal: paraNumero_(e['Honorário Ideal']),
        grupoIdeal: texto_(e['Grupo Ideal']),
        gapHonorario: paraNumero_(e['Gap Honorário']),
        ramo: texto_(e['Ramo']),
        planoIndicado: texto_(e['Plano Indicado']),
        pisoPlano: paraNumero_(e['Piso do Plano']),
        gapPlano: paraNumero_(e['Gap Plano']),
        dataUltimoReajuste: iso_(e['Data Último Reajuste']),
        mesesSemReajuste: mesesDesde_(e['Data Último Reajuste']),
        rbt12: paraNumero_(e['RBT12']),
        faixa: texto_(e['Faixa Simples']), porte: texto_(e['Porte']),
        qtdFuncionarios: paraNumero_(e['Qtd Funcionários Atual']),
        score: paraNumero_(e['Score']) || 0,
        prioridade: chavePrioridade_(e['Prioridade']),
        gatilhos: texto_(e['Gatilhos Ativos']) ? texto_(e['Gatilhos Ativos']).split(/,\s*/) : [],
        varFat: paraNumero_(e['Var Faturamento %']),
        var12m: paraNumero_(e['Var 12 Meses %']),
        mesesFat: paraNumero_(e['Meses Histórico Faturamento']) || r.meses,
        mesesNotas: paraNumero_(e['Meses Histórico Notas']) || 0,
        qualidade: texto_(e['Qualidade dos Dados']),
        situacaoAtendimento: texto_(e['Situação Atendimento']),
        canalPreferido: texto_(e['Canal Preferido']),
        respAtendimento: texto_(e['Responsável Atendimento']),
        urgenciaCobranca: texto_(e['Urgência Cobrança']),
        eIndicador: verdadeiro_(e['É Indicador']),
        obsAtendimento: texto_(e['Observação Atendimento']),
        valorVencido: paraNumero_(e['Valor Vencido']) || 0,
        titulosVencidos: paraNumero_(e['Títulos Vencidos']) || 0,
        maiorAtraso: paraNumero_(e['Maior Atraso']) || 0,
        pendenciaFiscal: texto_(e['Pendência Fiscal']),
        equipeFiscal: texto_(e['Equipe Fiscal']),
        dataBaixa: iso_(e['Data Baixa']), motivoBaixa: texto_(e['Motivo Baixa']),
        dataRetorno: iso_(e['Data Retorno']),
        saiu: !!(baixa && !retorno),
        totalFat: r.total, ultimoFat: r.ultimo
      };
    });

    var gatilhos = lerAba_(ABAS.GATILHOS).map(function (g) {
      return { id: texto_(g['ID_Gatilho']), cnpj: limparCNPJ(g['CNPJ']),
        empresa: texto_(g['Empresa']), competencia: texto_(g['Competência']),
        competenciaChave: texto_(g['Competência_Chave']), tipo: texto_(g['Tipo_Gatilho']),
        descricao: texto_(g['Descrição']), score: paraNumero_(g['Score']) || 0,
        variacao: paraNumero_(g['Variação_%']), dataGeracao: iso_(g['Data_Geração']),
        status: texto_(g['Status']) || 'Novo alerta', responsavel: texto_(g['Responsável']),
        observacao: texto_(g['Observação']), justificativa: texto_(g['Justificativa']),
        scoreEmpresa: paraNumero_(g['Score_Total_Empresa']) || 0,
        prioridadeEmpresa: chavePrioridade_(g['Prioridade_Empresa']) };
    });

    var tratativas = lerAba_(ABAS.TRATATIVAS).map(function (t) {
      return { id: texto_(t['ID']), cnpj: limparCNPJ(t['CNPJ']), empresa: texto_(t['Empresa']),
        data: iso_(t['Data']), responsavel: texto_(t['Responsável']), status: texto_(t['Status']),
        honorarioAnterior: paraNumero_(t['Honorário_Anterior']),
        honorarioNovo: paraNumero_(t['Honorário_Novo']),
        motivo: texto_(t['Motivo']), justificativa: texto_(t['Justificativa']),
        observacao: texto_(t['Observação']),
        incrementoMensal: paraNumero_(t['Incremento_Mensal']) };
    });

    return {
      ok: true,
      empresas: empresas, gatilhos: gatilhos, tratativas: tratativas,
      config: cfg,
      planos: PLANOS,
      listas: {
        statusTratativa: STATUS_TRATATIVA, motivosNaoReajuste: MOTIVOS_NAO_REAJUSTE,
        sitAtendimento: SIT_ATENDIMENTO, motivosSaida: MOTIVOS_SAIDA,
        gatilhoInfo: GATILHO_INFO, prioridadeLabel: PRIORIDADE_LABEL,
        faixas: faixasSimples_(cfg)
      },
      meta: {
        usuario: usuarioAtual_(), versao: APP.versao,
        planilha: obterPlanilha_().getName(), planilhaUrl: obterPlanilha_().getUrl(),
        competenciaCorrente: competenciaDisplay_(competenciaCorrente_()),
        competenciasFiscais: competenciasFiscais_(),
        linhasHistorico: resumo.linhas,
        salarioMinimo: cfg.salario_minimo, tetoINSS: cfg.teto_inss,
        reguaSemNota: valorPorPercentualSM_(cfg.pct_reajuste_sem_nota, cfg),
        reguaComNota: valorPorPercentualSM_(cfg.pct_reajuste_com_nota, cfg),
        carregadoEm: new Date().toISOString(),
        duracaoMs: new Date().getTime() - t0
      }
    };
  } catch (err) {
    registrarLog_('api_carregarTudo', 'ERRO', String(err && err.stack || err), 0, 0);
    return { ok: false, erro: String(err && err.message || err) };
  }
}

/** Lê só as 3 colunas de que a carga inicial precisa do HISTORICO_MENSAL. */
function resumoHistorico_() {
  var vazio = { porCnpj: {}, linhas: 0 };
  var aba = obterAba_(ABAS.HISTORICO);
  var ultLinha = aba.getLastRow();
  if (ultLinha < 2) return vazio;

  var m = mapaColunas_(aba);
  var iCnpj = m.indice[normalizarChave_('CNPJ')];
  var iFat = m.indice[normalizarChave_('Faturamento')];
  var iChave = m.indice[normalizarChave_('Competência_Chave')];
  if (iChave === undefined) iChave = m.indice[normalizarChave_('Competência')];
  if (iCnpj === undefined || iFat === undefined || iChave === undefined) return vazio;

  var n = ultLinha - 1;
  var colCnpj = aba.getRange(2, iCnpj + 1, n, 1).getValues();
  var colFat = aba.getRange(2, iFat + 1, n, 1).getValues();
  var colChave = aba.getRange(2, iChave + 1, n, 1).getValues();

  var porCnpj = {}, linhas = 0;
  for (var i = 0; i < n; i++) {
    var cnpj = limparCNPJ(colCnpj[i][0]);
    if (cnpj.length !== 14) continue;
    linhas++;
    var fat = paraNumero_(colFat[i][0]);
    if (fat === null) continue;
    var chave = String(colChave[i][0] || '').trim();
    if (!/^\d{6}$/.test(chave)) chave = competenciaParaChave_(colChave[i][0]);
    var r = porCnpj[cnpj];
    if (!r) r = porCnpj[cnpj] = { total: 0, meses: 0, ultimo: null, ultimaChave: '' };
    r.total += fat; r.meses++;
    if (chave && chave >= r.ultimaChave) { r.ultimaChave = chave; r.ultimo = fat; }
  }
  return { porCnpj: porCnpj, linhas: linhas };
}

/** Série mensal completa de UMA empresa — carregada só na tela de detalhe. */
function api_carregarEmpresa(cnpjBruto) {
  try {
    exigirAcesso_();
    var cnpj = limparCNPJ(cnpjBruto);
    if (cnpj.length !== 14) throw new Error('CNPJ inválido.');
    var aba = obterAba_(ABAS.HISTORICO);
    var ultLinha = aba.getLastRow();
    var serie = [];

    if (ultLinha >= 2) {
      var m = mapaColunas_(aba);
      var n = ultLinha - 1;
      function col(nome) {
        var i = m.indice[normalizarChave_(nome)];
        return i === undefined ? null : aba.getRange(2, i + 1, n, 1).getValues();
      }
      var cCnpj = col('CNPJ');
      if (cCnpj) {
        var cChave = col('Competência_Chave') || col('Competência');
        var cFat = col('Faturamento'), cFunc = col('Qtd_Funcionários'), cNotas = col('Qtd_Notas');
        for (var i = 0; i < n; i++) {
          if (limparCNPJ(cCnpj[i][0]) !== cnpj) continue;
          var chave = cChave ? String(cChave[i][0] || '').trim() : '';
          if (!/^\d{6}$/.test(chave)) chave = cChave ? competenciaParaChave_(cChave[i][0]) : null;
          if (!chave) continue;
          serie.push({ competencia: chave, competenciaDisplay: competenciaDisplay_(chave),
            faturamento: cFat ? paraNumero_(cFat[i][0]) : null,
            funcionarios: cFunc ? paraNumero_(cFunc[i][0]) : null,
            notas: cNotas ? paraNumero_(cNotas[i][0]) : null });
        }
        serie.sort(function (a, b) { return a.competencia < b.competencia ? -1 : 1; });
      }
    }

    var honorarios = lerAba_(ABAS.HONORARIOS)
      .filter(function (h) { return limparCNPJ(h['CNPJ']) === cnpj; })
      .map(function (h) {
        return { data: iso_(h['Data']), anterior: paraNumero_(h['Honorário_Anterior']),
          novo: paraNumero_(h['Honorário_Novo']), motivo: texto_(h['Motivo']),
          responsavel: texto_(h['Responsável']), origem: texto_(h['Origem']) };
      });

    return { ok: true, cnpj: cnpj, serie: serie, honorarios: honorarios };
  } catch (err) {
    return { ok: false, erro: String(err && err.message || err) };
  }
}

/**
 * Registra tratativa. Status "Reajustado" com honorário novo atualiza o
 * cadastro e grava o histórico — é assim que o resultado vira mensurável.
 * Status "Não reajustado" EXIGE justificativa.
 */
function api_salvarTratativa(dados) {
  try {
    exigirAcesso_();
    var cnpj = limparCNPJ(dados.cnpj);
    var empresas = lerAba_(ABAS.EMPRESAS);
    var emp = null;
    for (var i = 0; i < empresas.length; i++) {
      if (limparCNPJ(empresas[i]['CNPJ']) === cnpj) { emp = empresas[i]; break; }
    }
    if (!emp) throw new Error('Empresa não encontrada: ' + formatarCNPJ(cnpj));
    if (dados.status === 'Não reajustado' && !texto_(dados.justificativa)) {
      throw new Error('Escolha a justificativa: é ela que explica a decisão daqui a um ano.');
    }

    var agora = new Date();
    var responsavel = texto_(dados.responsavel) || usuarioAtual_();
    var honAnterior = paraNumero_(dados.honorarioAnterior);
    var honNovo = paraNumero_(dados.honorarioNovo);
    var reajustou = dados.status === 'Reajustado' && honNovo !== null;
    var incremento = (reajustou && honAnterior !== null) ? arredondar_(honNovo - honAnterior, 2) : null;

    var id = 'TR' + agora.getTime() + '_' + cnpj.slice(-4);
    anexarLinhas_(ABAS.TRATATIVAS, [{
      'ID': id, 'CNPJ': cnpj, 'Empresa': emp['Empresa'] || '', 'Data': agora,
      'Responsável': responsavel, 'Status': dados.status, 'Ação': texto_(dados.acao),
      'Honorário_Anterior': honAnterior === null ? '' : honAnterior,
      'Honorário_Novo': honNovo === null ? '' : honNovo,
      'Data_Reajuste': reajustou ? agora : '',
      'Motivo': texto_(dados.motivo), 'Justificativa': texto_(dados.justificativa),
      'Observação': texto_(dados.observacao), 'ID_Gatilho': texto_(dados.idGatilho),
      'Incremento_Mensal': incremento === null ? '' : incremento,
      'Incremento_Anual': incremento === null ? '' : arredondar_(incremento * 12, 2)
    }]);

    if (reajustou) {
      atualizarLinha_(ABAS.EMPRESAS, emp._linha, {
        'Honorário Atual': honNovo, 'Data Último Reajuste': agora,
        'Motivo Última Alteração': texto_(dados.motivo) || texto_(dados.observacao) || 'Reajuste via Monitor'
      });
      anexarLinhas_(ABAS.HONORARIOS, [{
        'CNPJ': cnpj, 'Empresa': emp['Empresa'] || '', 'Data': agora,
        'Honorário_Anterior': honAnterior === null ? '' : honAnterior,
        'Honorário_Novo': honNovo, 'Incremento_Mensal': incremento === null ? '' : incremento,
        'Motivo': texto_(dados.motivo) || texto_(dados.observacao),
        'Responsável': responsavel, 'Origem': 'Tratativa no Monitor'
      }]);
    }

    if (dados.idGatilho) {
      var gats = lerAba_(ABAS.GATILHOS);
      for (var j = 0; j < gats.length; j++) {
        if (String(gats[j]['ID_Gatilho']).trim() === dados.idGatilho) {
          atualizarLinha_(ABAS.GATILHOS, gats[j]._linha, {
            'Status': dados.status, 'Responsável': responsavel,
            'Observação': texto_(dados.observacao),
            'Justificativa': texto_(dados.justificativa), 'Data_Tratativa': agora });
          break;
        }
      }
    }

    registrarLog_('api_salvarTratativa', 'OK', dados.status + ' — ' + (emp['Empresa'] || cnpj), 0, 1);
    return { ok: true, id: id, mensagem: 'Tratativa registrada.' };
  } catch (err) {
    registrarLog_('api_salvarTratativa', 'ERRO', String(err && err.message || err), 0, 0);
    return { ok: false, erro: String(err && err.message || err) };
  }
}

/** Edita campos comerciais da empresa. Honorário alterado vira histórico. */
function api_salvarEmpresa(dados) {
  try {
    exigirAcesso_();
    var cnpj = limparCNPJ(dados.cnpj);
    if (cnpj.length !== 14) throw new Error('CNPJ inválido — informe os 14 dígitos.');
    var empresas = lerAba_(ABAS.EMPRESAS);
    var existente = null;
    for (var i = 0; i < empresas.length; i++) {
      if (limparCNPJ(empresas[i]['CNPJ']) === cnpj) { existente = empresas[i]; break; }
    }

    var campos = {};
    var mapa = { empresa: 'Empresa', codigoDominio: 'Código Domínio', tributacao: 'Tributação',
      situacao: 'Situação Tabelão', tipo: 'Tipo', segmento: 'Segmento', plano: 'Plano',
      nicho: 'Nicho', fiscal: 'Fiscal Responsável', folhaResp: 'Folha Responsável',
      contato: 'Contato', whatsapp: 'WhatsApp', cidade: 'Cidade',
      grupoHonorario: 'Grupo Honorário', tipoCobranca: 'Tipo Cobrança',
      obsFinanceiro: 'Observação Financeira', grupoEmpresarial: 'Grupo de Empresas',
      responsavel: 'Responsável Comercial' };
    Object.keys(mapa).forEach(function (k) {
      if (dados[k] !== undefined && dados[k] !== null) campos[mapa[k]] = dados[k];
    });
    if (dados.naoCobramos === true || ehSemCobranca_(dados.honorarioAtual)) {
      campos['Honorário Atual'] = SEM_COBRANCA;
      campos['Não Cobramos'] = 'Sim';
    } else if (dados.honorarioAtual !== undefined && dados.honorarioAtual !== null && dados.honorarioAtual !== '') {
      campos['Honorário Atual'] = paraNumero_(dados.honorarioAtual);
      if (dados.naoCobramos === false) campos['Não Cobramos'] = '';
    }

    if (existente) {
      var antes = paraNumero_(existente['Honorário Atual']);
      var depois = campos['Honorário Atual'];
      if (depois !== undefined && antes !== depois) {
        campos['Data Último Reajuste'] = new Date();
        anexarLinhas_(ABAS.HONORARIOS, [{
          'CNPJ': cnpj, 'Empresa': existente['Empresa'] || '', 'Data': new Date(),
          'Honorário_Anterior': antes === null ? '' : antes, 'Honorário_Novo': depois,
          'Incremento_Mensal': antes === null ? '' : arredondar_(depois - antes, 2),
          'Motivo': texto_(dados.motivo) || 'Edição manual no Monitor',
          'Responsável': usuarioAtual_(), 'Origem': 'Cadastro' }]);
      }
      atualizarLinha_(ABAS.EMPRESAS, existente._linha, campos);
      return { ok: true, criado: false, mensagem: 'Empresa atualizada.' };
    }

    campos['CNPJ'] = cnpj;
    campos['Última Sincronização'] = new Date();
    anexarLinhas_(ABAS.EMPRESAS, [campos]);
    return { ok: true, criado: true, mensagem: 'Empresa cadastrada.' };
  } catch (err) {
    return { ok: false, erro: String(err && err.message || err) };
  }
}

/** Relacionamento: atendimento, urgência de cobrança e indicações. */
function api_salvarRelacionamento(dados) {
  try {
    exigirAcesso_();
    var cnpj = limparCNPJ(dados.cnpj);
    var empresas = lerAba_(ABAS.EMPRESAS);
    var emp = null;
    for (var i = 0; i < empresas.length; i++) {
      if (limparCNPJ(empresas[i]['CNPJ']) === cnpj) { emp = empresas[i]; break; }
    }
    if (!emp) throw new Error('Empresa não encontrada.');

    atualizarLinha_(ABAS.EMPRESAS, emp._linha, {
      'Situação Atendimento': texto_(dados.situacaoAtendimento),
      'Canal Preferido': texto_(dados.canalPreferido),
      'Responsável Atendimento': texto_(dados.respAtendimento),
      'Urgência Cobrança': texto_(dados.urgenciaCobranca),
      'É Indicador': dados.eIndicador ? 'Sim' : 'Não',
      'Indicado Por': texto_(dados.indicadoPor),
      'Observação Atendimento': texto_(dados.obsAtendimento)
    });
    return { ok: true, mensagem: 'Relacionamento atualizado.' };
  } catch (err) {
    return { ok: false, erro: String(err && err.message || err) };
  }
}

/**
 * Baixa ou reativação. A baixa NÃO apaga nada: o cliente sai das telas de
 * oportunidade e o histórico fica guardado para quando ele voltar.
 */
function api_baixaCliente(dados) {
  try {
    exigirAcesso_();
    var cnpj = limparCNPJ(dados.cnpj);
    var empresas = lerAba_(ABAS.EMPRESAS);
    var emp = null;
    for (var i = 0; i < empresas.length; i++) {
      if (limparCNPJ(empresas[i]['CNPJ']) === cnpj) { emp = empresas[i]; break; }
    }
    if (!emp) throw new Error('Empresa não encontrada.');

    if (dados.reativar) {
      atualizarLinha_(ABAS.EMPRESAS, emp._linha, {
        'Data Retorno': new Date(),
        'Observação Baixa': texto_(emp['Observação Baixa']) + ' | Reativado em ' +
          Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy') +
          (texto_(dados.observacao) ? ': ' + texto_(dados.observacao) : '')
      });
      registrarLog_('api_baixaCliente', 'OK', 'Reativado: ' + (emp['Empresa'] || cnpj), 0, 1);
      return { ok: true, mensagem: 'Cliente reativado.' };
    }

    if (!texto_(dados.motivo)) throw new Error('Informe o motivo da saída.');
    atualizarLinha_(ABAS.EMPRESAS, emp._linha, {
      'Data Baixa': paraData_(dados.data) || new Date(),
      'Motivo Baixa': texto_(dados.motivo),
      'Observação Baixa': texto_(dados.observacao),
      'Data Retorno': ''
    });
    registrarLog_('api_baixaCliente', 'OK', 'Baixa: ' + (emp['Empresa'] || cnpj) + ' — ' + dados.motivo, 0, 1);
    return { ok: true, mensagem: 'Baixa registrada. O histórico foi preservado.' };
  } catch (err) {
    return { ok: false, erro: String(err && err.message || err) };
  }
}

/** Parâmetros do ano: SM, teto do INSS, régua e faixas do Simples. */
function api_salvarParametros(p) {
  try {
    exigirAcesso_();
    p = p || {};
    var mudancas = {};
    var permitidas = ['ano_referencia', 'salario_minimo', 'teto_inss', 'custo_multa_estimado',
      'pct_reajuste_sem_nota', 'pct_reajuste_com_nota', 'faixa_limite_regua_fixa',
      'desvio_honorario_alerta', 'pct_minimo_sem_faturamento'];
    permitidas.forEach(function (k) {
      if (p[k] !== undefined && p[k] !== null && p[k] !== '') mudancas[k] = paraNumero_(p[k]);
    });
    if (p.faixas_sn && p.faixas_sn.length === 6) {
      p.faixas_sn.forEach(function (v, i) { mudancas['faixa_sn_' + (i + 1) + '_ate'] = paraNumero_(v); });
    }
    if (mudancas.salario_minimo !== undefined && !(mudancas.salario_minimo > 0)) {
      throw new Error('Salário mínimo precisa ser maior que zero.');
    }
    salvarConfig(mudancas, usuarioAtual_());
    return { ok: true, config: obterConfig(true), mensagem: 'Parâmetros salvos.' };
  } catch (err) {
    return { ok: false, erro: String(err && err.message || err) };
  }
}

/** Salva limiares e pontuação da tela de regras. */
function api_salvarRegras(mudancas) {
  try {
    exigirAcesso_();
    if (!mudancas || !Object.keys(mudancas).length) throw new Error('Nada a salvar.');
    var n = salvarConfig(mudancas, usuarioAtual_());
    return { ok: true, alteradas: n, config: obterConfig(true), mensagem: n + ' regra(s) salva(s).' };
  } catch (err) {
    return { ok: false, erro: String(err && err.message || err) };
  }
}

function api_recalcular() {
  try {
    exigirAcesso_();
    return { ok: true, resultado: recalcularTudo() };
  }
  catch (err) {
    registrarLog_('api_recalcular', 'ERRO', String(err && err.stack || err), 0, 0);
    return { ok: false, erro: String(err && err.message || err) };
  }
}

/** Atualiza vários gatilhos de uma vez (ações em lote na Central de alertas). */
function api_atualizarStatusGatilhos(ids, status, responsavel) {
  try {
    exigirAcesso_();
    if (!ids || !ids.length) throw new Error('Nenhum alerta selecionado.');
    var alvo = {};
    ids.forEach(function (i) { alvo[String(i).trim()] = true; });
    var gats = lerAba_(ABAS.GATILHOS);
    var agora = new Date(), n = 0;
    gats.forEach(function (g) {
      var id = String(g['ID_Gatilho'] || '').trim();
      if (!alvo[id]) return;
      atualizarLinha_(ABAS.GATILHOS, g._linha, {
        'Status': status, 'Responsável': responsavel || usuarioAtual_(), 'Data_Tratativa': agora });
      n++;
    });
    registrarLog_('api_atualizarStatusGatilhos', 'OK', n + ' gatilho(s) → ' + status, 0, n);
    return { ok: true, atualizados: n, mensagem: n + ' alerta(s) atualizado(s).' };
  } catch (err) {
    return { ok: false, erro: String(err && err.message || err) };
  }
}

/**
 * Exporta uma tabela para .xlsx no Drive e devolve o link.
 * Escolhido em vez de download direto porque o web app roda em iframe com
 * sandbox, onde o download de blob é bloqueado em parte dos navegadores.
 */
function api_exportar(nomeArquivo, nomeAba, cabecalho, linhas) {
  try {
    exigirAcesso_();
    if (!cabecalho || !cabecalho.length) throw new Error('Nada a exportar.');
    var temp = SpreadsheetApp.create('tmp_monitor_export_' + new Date().getTime());
    try {
      var aba = temp.getSheets()[0];
      aba.setName(String(nomeAba || 'Dados').slice(0, 30));
      aba.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho])
         .setFontWeight('bold').setBackground('#107A45').setFontColor('#FFFFFF');
      if (linhas && linhas.length) {
        aba.getRange(2, 1, linhas.length, cabecalho.length).setValues(linhas);
      }
      aba.setFrozenRows(1);
      SpreadsheetApp.flush();

      var url = 'https://docs.google.com/spreadsheets/d/' + temp.getId() + '/export?format=xlsx';
      var blob = UrlFetchApp.fetch(url, {
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }
      }).getBlob().setName(nomeArquivo);

      var nomePasta = 'Monitor de Honorários — Exportações';
      var it = DriveApp.getFoldersByName(nomePasta);
      var pasta = it.hasNext() ? it.next() : DriveApp.createFolder(nomePasta);
      var arquivo = pasta.createFile(blob);
      return { ok: true, url: arquivo.getUrl(), nome: nomeArquivo, linhas: (linhas || []).length };
    } finally {
      try { DriveApp.getFileById(temp.getId()).setTrashed(true); } catch (e) { /* ignora */ }
    }
  } catch (err) {
    return { ok: false, erro: String(err && err.message || err) };
  }
}

/** Diagnóstico da base: o que existe, o que falta. */
function api_diagnosticar() {
  try {
    exigirAcesso_();
    garantirEstrutura();
    var empresas = lerAba_(ABAS.EMPRESAS);
    var historico = lerAba_(ABAS.HISTORICO);
    var series = montarSeries_(historico);

    var comFat = 0, comFunc = 0, comNotas = 0, comHonorario = 0, comDataReajuste = 0;
    empresas.forEach(function (e) {
      var s = series[limparCNPJ(e['CNPJ'])] || [];
      if (serieDe_(s, 'faturamento').length) comFat++;
      if (serieDe_(s, 'funcionarios').length) comFunc++;
      if (serieDe_(s, 'notas').length) comNotas++;
      if (paraNumero_(e['Honorário Atual']) !== null) comHonorario++;
      if (paraData_(e['Data Último Reajuste'])) comDataReajuste++;
    });

    var faltando = [];
    if (comFunc === 0) faltando.push('Qtd_Funcionários vazio em toda a base — o gatilho de folha fica sem fonte.');
    if (comNotas === 0) faltando.push('Qtd_Notas vazio em toda a base — o gatilho de notas fica sem fonte.');
    if (comHonorario === 0) faltando.push('Honorário Atual vazio — sem ele não há como medir resultado.');
    if (comDataReajuste === 0) faltando.push('Data Último Reajuste vazia em toda a base.');

    return { ok: true, planilha: obterPlanilha_().getName(),
      empresas: empresas.length, linhasHistorico: historico.length,
      comFaturamento: comFat, comFuncionarios: comFunc, comNotas: comNotas,
      comHonorario: comHonorario, comDataUltimoReajuste: comDataReajuste,
      pendencias: faltando };
  } catch (err) {
    return { ok: false, erro: String(err && err.message || err) };
  }
}

/**
 * Séries agregadas do HISTORICO em UMA passada de leitura.
 *
 * Alimenta as telas de Notas emitidas, Histórico 2024–2026 e Análise de
 * Carteira. Devolve agregados (por mês e por ano), nunca a série completa
 * de cada empresa: 1.531 empresas × 32 meses estouraria o limite de payload
 * do google.script.run. A série mês a mês de UMA empresa continua vindo
 * por api_carregarEmpresa.
 *
 * Formato compacto de propósito — arrays posicionais em vez de objetos:
 *   porEmpresa[cnpj][ano] = [faturamento, notasQtd, notasValor, funcMax, meses]
 */
function api_seriesAgregadas() {
  var t0 = new Date().getTime();
  try {
    exigirAcesso_();
    var aba = obterAba_(ABAS.HISTORICO);
    var ultLinha = aba.getLastRow();
    var vazio = { ok: true, meses: [], carteira: [], porEmpresa: {}, anos: [], meta: { linhas: 0 } };
    if (ultLinha < 2) return vazio;

    var m = mapaColunas_(aba);
    function col(nome) { return m.indice[normalizarChave_(nome)]; }
    var iCnpj  = col('CNPJ');
    var iChave = col('Competência_Chave');
    if (iChave === undefined) iChave = col('Competência');
    var iFat   = col('Faturamento');
    var iFunc  = col('Qtd_Funcionários');
    var iNqtd  = col('Qtd_Notas');
    var iNval  = col('Valor_Notas');
    if (iCnpj === undefined || iChave === undefined) return vazio;

    var n = ultLinha - 1;
    var dados = aba.getRange(2, 1, n, aba.getLastColumn()).getValues();

    var porMes = {};         // chave -> {fat, nq, nv, empresas:{}}
    var porEmpresa = {};     // cnpj -> ano -> [fat, nq, nv, funcMax, meses]
    var anosVistos = {};
    var linhas = 0;

    for (var i = 0; i < n; i++) {
      var linha = dados[i];
      var cnpj = limparCNPJ(linha[iCnpj]);
      if (cnpj.length !== 14) continue;

      var chave = String(linha[iChave] || '').trim();
      if (!/^\d{6}$/.test(chave)) chave = competenciaParaChave_(linha[iChave]);
      if (!/^\d{6}$/.test(chave)) continue;
      linhas++;

      var ano = chave.slice(0, 4);
      anosVistos[ano] = true;

      var fat  = iFat  === undefined ? null : paraNumero_(linha[iFat]);
      var func = iFunc === undefined ? null : paraNumero_(linha[iFunc]);
      var nq   = iNqtd === undefined ? null : paraNumero_(linha[iNqtd]);
      var nv   = iNval === undefined ? null : paraNumero_(linha[iNval]);

      var mes = porMes[chave];
      if (!mes) mes = porMes[chave] = { fat: 0, nq: 0, nv: 0, empresas: {} };
      if (fat !== null) { mes.fat += fat; mes.empresas[cnpj] = 1; }
      if (nq  !== null) mes.nq += nq;
      if (nv  !== null) mes.nv += nv;

      var emp = porEmpresa[cnpj];
      if (!emp) emp = porEmpresa[cnpj] = {};
      var a = emp[ano];
      if (!a) a = emp[ano] = [0, 0, 0, 0, 0];
      if (fat  !== null) a[0] += fat;
      if (nq   !== null) a[1] += nq;
      if (nv   !== null) a[2] += nv;
      if (func !== null && func > a[3]) a[3] = func;
      a[4]++;
    }

    var meses = Object.keys(porMes).sort();
    var carteira = meses.map(function (ch) {
      var x = porMes[ch];
      return {
        chave: ch, competencia: competenciaDisplay_(ch),
        faturamento: arredondar_(x.fat, 2), notasQtd: x.nq,
        notasValor: arredondar_(x.nv, 2), empresas: Object.keys(x.empresas).length
      };
    });

    // Série mês a mês por empresa, em pares [índiceDoMês, valor]. É o que
    // permite recalcular RBT12, faixa e variação para QUALQUER janela sem
    // voltar ao servidor — sem isso o seletor de período não muda nada fora
    // das telas que já somam por competência.
    var serieEmpresa = {};
    for (var i2 = 0; i2 < n; i2++) {
      var l2 = dados[i2];
      var c2 = limparCNPJ(l2[iCnpj]);
      if (c2.length !== 14) continue;
      var k2 = String(l2[iChave] || '').trim();
      if (!/^\d{6}$/.test(k2)) k2 = competenciaParaChave_(l2[iChave]);
      var idx = meses.indexOf(k2);
      if (idx < 0) continue;
      var f2 = iFat === undefined ? null : paraNumero_(l2[iFat]);
      if (f2 === null) continue;
      (serieEmpresa[c2] || (serieEmpresa[c2] = [])).push([idx, arredondar_(f2, 2)]);
    }
    Object.keys(serieEmpresa).forEach(function (c) {
      serieEmpresa[c].sort(function (a, b) { return a[0] - b[0]; });
    });

    return {
      ok: true,
      meses: meses,
      carteira: carteira,
      serieEmpresa: serieEmpresa,
      porEmpresa: porEmpresa,
      anos: Object.keys(anosVistos).sort(),
      meta: { linhas: linhas, empresas: Object.keys(porEmpresa).length,
              duracaoMs: new Date().getTime() - t0 }
    };
  } catch (err) {
    registrarLog_('api_seriesAgregadas', 'ERRO', String(err && err.stack || err), 0, 0);
    return { ok: false, erro: String(err && err.message || err) };
  }
}

/* ===========================================================================
   CONTROLE DE ACESSO
   ---------------------------------------------------------------------------
   Só os e-mails desta lista abrem o painel e chamam as funções api_*.

   Duas camadas, porque uma só não segura:
     1. doGet() barra quem não está na lista antes de entregar a tela.
     2. TODA função api_* chama exigirAcesso_() antes de tocar na planilha.
   A segunda é a que importa de verdade: quem tem a URL da implantação pode
   disparar google.script.run direto do console, sem passar pelo doGet. Um
   painel bonito bloqueado com o back-end aberto não é controle de acesso.

   Falha fechada: se Session.getActiveUser() vier vazio — usuário fora do
   domínio, acesso anônimo ou implantação configurada como "qualquer pessoa" —
   o acesso é NEGADO. Nunca liberamos por não conseguir identificar quem é.

   Para isso funcionar, a implantação precisa estar como:
     Executar como .... Eu (dono do script)
     Quem pode acessar. Qualquer pessoa da Escritório Contábil Exemplo
   Com "Qualquer pessoa", o Google não informa o e-mail do visitante e todo
   mundo cai no bloqueio — inclusive a lista abaixo.
   =========================================================================== */

/**
 * Lista fixa no código, de propósito: é o piso de segurança. Mesmo que a aba
 * CONFIG_REGRAS seja apagada ou editada por engano, estes continuam entrando
 * e ninguém a mais entra por acidente.
 * Para incluir alguém: acrescente aqui e reimplante, ou use a chave
 * 'emails_autorizados_extra' em CONFIG_REGRAS (soma, nunca substitui).
 */
var ACESSO_LIBERADO = [
  'usuario3@exemplo.com.br',
  'usuario4@exemplo.com.br',
  'usuario2@exemplo.com.br',
  'usuario5@exemplo.com.br',
  'usuario6@exemplo.com.br',
  'usuario7@exemplo.com.br',
  'victoria.pedrosa@exemplo.com.br'
];

function emailAtivo_() {
  try { return String(Session.getActiveUser().getEmail() || '').trim().toLowerCase(); }
  catch (e) { return ''; }
}

/** Lista fixa + extras do CONFIG. O CONFIG só SOMA — nunca remove ninguém. */
function listaAutorizados_() {
  var lista = ACESSO_LIBERADO.map(function (e) { return String(e).trim().toLowerCase(); });
  try {
    var extra = obterConfig().emails_autorizados_extra;
    if (extra) {
      String(extra).split(/[,;\s]+/).forEach(function (e) {
        e = String(e).trim().toLowerCase();
        if (e && e.indexOf('@') > 0 && lista.indexOf(e) < 0) lista.push(e);
      });
    }
  } catch (err) { /* CONFIG indisponível: a lista fixa basta */ }
  return lista;
}

function temAcesso_() {
  var email = emailAtivo_();
  if (!email) return false;                       // não identificou: nega
  return listaAutorizados_().indexOf(email) >= 0;
}

/** Porteiro das funções api_*. Lança erro — o front já trata e mostra o aviso. */
function exigirAcesso_() {
  if (temAcesso_()) return;
  var quem = emailAtivo_() || '(não identificado)';
  try { registrarLog_('acesso', 'NEGADO', 'Tentativa de uso por ' + quem, 0, 0); } catch (e) {}
  throw new Error('Acesso não autorizado para ' + quem +
    '. Fale com a Victória para ser incluído na lista do Monitor.');
}

/** Tela de bloqueio — sem vazar nada da carteira. */
function paginaSemAcesso_() {
  var quem = emailAtivo_();
  var html =
    '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?' +
    'family=IBM+Plex+Sans:wght@400;600;700&display=swap">' +
    '<style>body{margin:0;min-height:100vh;display:flex;align-items:center;' +
    'justify-content:center;background:#F4F7F3;font-family:"IBM Plex Sans",system-ui,sans-serif;' +
    'color:#17231D;padding:24px;}' +
    '.caixa{background:#fff;border:1px solid #DCE6DF;border-radius:12px;max-width:520px;' +
    'padding:28px 30px;box-shadow:0 18px 45px rgba(18,59,42,.10);}' +
    '.marca{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#53645A;' +
    'font-weight:700;margin-bottom:14px;}' +
    'h1{font-size:19px;margin:0 0 10px;letter-spacing:-.02em;}' +
    'p{font-size:13.5px;line-height:1.6;color:#53645A;margin:0 0 10px;}' +
    'code{background:#F1F5F2;padding:2px 7px;border-radius:4px;font-size:12.5px;' +
    'font-family:ui-monospace,monospace;color:#17231D;}' +
    '.fio{height:3px;background:#176B4D;border-radius:2px;width:44px;margin:0 0 18px;}' +
    '</style></head><body><div class="caixa"><div class="marca">Escritório Contábil Exemplo</div>' +
    '<div class="fio"></div><h1>Monitor de Honorários — acesso restrito</h1>' +
    '<p>Esta ferramenta está liberada apenas para a equipe responsável pela carteira.</p>' +
    (quem ? '<p>Você entrou como <code>' + quem + '</code>, que não está na lista.</p>'
          : '<p>Não foi possível identificar sua conta Google. Entre com o e-mail ' +
            '<code>@exemplo.com.br</code> e tente de novo.</p>') +
    '<p>Para ser incluído, fale com a Victória.</p></div></body></html>';
  return HtmlService.createHtmlOutput(html)
    .setTitle('Acesso restrito — Monitor de Honorários');
}

/** Diagnóstico de acesso: quem sou eu e se estou liberado. */
function api_verificarAcesso() {
  var email = emailAtivo_();
  return {
    ok: true, email: email || '', autorizado: temAcesso_(),
    total: listaAutorizados_().length
  };
}

/** Roda uma vez no editor para conferir a lista sem abrir o painel. */
function conferirAcesso() {
  var r = api_verificarAcesso();
  var msg = 'Você é: ' + (r.email || '(não identificado)') +
            '\nAutorizado: ' + (r.autorizado ? 'SIM' : 'NÃO') +
            '\nPessoas na lista: ' + r.total +
            '\n\n' + listaAutorizados_().join('\n');
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert('Acesso ao Monitor', msg, SpreadsheetApp.getUi().ButtonSet.OK); }
  catch (e) { /* rodando fora da planilha: o Logger basta */ }
  return msg;
}

/* ===========================================================================
   NOTAS EMITIDAS PELA EXEMPLO
   ---------------------------------------------------------------------------
   Lê a planilha "Notas Exemplo" AO VIVO, aba "base". Não é cópia: toda nota que
   a equipe lançar lá aparece aqui na próxima consulta.

   Por que ao vivo e não importada: a planilha passa de 600 KB e cresce todo
   dia. Qualquer cópia nasce velha, e a pergunta que essa tela responde —
   "emitimos quanto do faturamento dele?" — só vale com o número de agora.

   Formato da aba base: idnotas, data (dd/mm/aaaa), empresa, Socio, cnpj,
   número da nota, valor ("R$ 1.400,00"), Nota emitida pelo, observacao, email.
   =========================================================================== */

var NOTAS_PLANILHA_ID = 'ID_EXEMPLO';
var NOTAS_ABA = 'base';
var NOTAS_CACHE_MIN = 30;   // a planilha muda ao longo do dia, não a cada minuto

/** "R$ 1.400,00" -> 1400. Aqui a vírgula É o decimal (formato da planilha). */
function valorNotaParaNumero_(v) {
  if (typeof v === 'number') return v;
  var s = String(v || '').replace(/R\$/gi, '').trim();
  if (!s) return null;
  s = s.replace(/\./g, '').replace(',', '.');
  var n = parseFloat(s);
  return isNaN(n) ? null : n;
}

/** dd/mm/aaaa (ou Date) -> 'AAAAMM'. */
function dataNotaParaChave_(v) {
  if (v instanceof Date && !isNaN(v)) {
    return String(v.getFullYear()) + ('0' + (v.getMonth() + 1)).slice(-2);
  }
  var s = String(v || '').trim();
  var m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return m[3] + m[2];
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + m[2];
  return '';
}

/**
 * Lê a aba base inteira e devolve agregados por CNPJ e por competência.
 * O cache evita reler 600 KB a cada troca de filtro na tela.
 */
function lerNotasEscr_(forcar) {
  var cache = CacheService.getScriptCache();
  if (!forcar) {
    var guardado = cache.get('notas_escr');
    if (guardado) {
      try { return JSON.parse(guardado); } catch (e) {}
    }
  }

  var ss, aba;
  try {
    ss = SpreadsheetApp.openById(NOTAS_PLANILHA_ID);
    aba = ss.getSheetByName(NOTAS_ABA) || ss.getSheets()[0];
  } catch (err) {
    throw new Error('Não consegui abrir a planilha "Notas Exemplo". Confira se a conta '
      + 'que roda o Monitor tem acesso a ela. Detalhe: ' + (err && err.message || err));
  }

  var ultLinha = aba.getLastRow(), ultCol = aba.getLastColumn();
  if (ultLinha < 2) return { porCnpj: {}, porMes: {}, meses: [], linhas: 0, lidoEm: new Date().toISOString() };

  var dados = aba.getRange(1, 1, ultLinha, ultCol).getValues();
  var cab = dados[0].map(function (h) { return normalizarChave_(String(h || '')); });
  function col(nome) { return cab.indexOf(normalizarChave_(nome)); }
  var iData  = col('data');
  var iCnpj  = col('cnpj');
  var iValor = col('valor');
  var iEmp   = col('empresa');
  var iNum   = col('numero da nota');
  if (iData < 0 || iCnpj < 0 || iValor < 0) {
    throw new Error('A aba "' + NOTAS_ABA + '" não tem as colunas data, cnpj e valor.');
  }

  var porCnpj = {}, porMes = {}, linhas = 0;
  for (var i = 1; i < dados.length; i++) {
    var l = dados[i];
    var cnpj = limparCNPJ(l[iCnpj]);
    if (cnpj.length !== 14) continue;
    var chave = dataNotaParaChave_(l[iData]);
    if (!chave) continue;
    var valor = valorNotaParaNumero_(l[iValor]);
    if (valor === null) valor = 0;
    linhas++;

    var e = porCnpj[cnpj];
    if (!e) e = porCnpj[cnpj] = { qtd: 0, valor: 0, meses: {}, nome: iEmp >= 0 ? texto_(l[iEmp]) : '' };
    e.qtd++; e.valor += valor;
    e.meses[chave] = e.meses[chave] || [0, 0];
    e.meses[chave][0]++; e.meses[chave][1] += valor;

    var m = porMes[chave];
    if (!m) m = porMes[chave] = { qtd: 0, valor: 0, empresas: {} };
    m.qtd++; m.valor += valor; m.empresas[cnpj] = 1;
  }

  var meses = Object.keys(porMes).sort();
  meses.forEach(function (k) {
    porMes[k].empresas = Object.keys(porMes[k].empresas).length;
    porMes[k].valor = arredondar_(porMes[k].valor, 2);
  });
  Object.keys(porCnpj).forEach(function (c) {
    porCnpj[c].valor = arredondar_(porCnpj[c].valor, 2);
  });

  var saida = { porCnpj: porCnpj, porMes: porMes, meses: meses, linhas: linhas,
                empresas: Object.keys(porCnpj).length, lidoEm: new Date().toISOString() };
  try { cache.put('notas_escr', JSON.stringify(saida), NOTAS_CACHE_MIN * 60); }
  catch (e) { /* passou do limite do cache: segue sem guardar */ }
  return saida;
}

/**
 * Notas cruzadas com o faturamento declarado, na janela pedida.
 * `de` e `ate` são competências AAAAMM; sem elas, devolve tudo.
 * O percentual compara o que emitimos com o que o cliente declarou no MESMO
 * intervalo — é esse número que sustenta a conversa de reajuste.
 */
function api_notasEscr(de, ate, forcar) {
  try {
    exigirAcesso_();
    var n = lerNotasEscr_(forcar === true);
    var dentro = function (ch) { return (!de || ch >= de) && (!ate || ch <= ate); };

    // faturamento declarado por CNPJ no mesmo intervalo
    var fat = {};
    var aba = obterAba_(ABAS.HISTORICO);
    if (aba.getLastRow() >= 2) {
      var m = mapaColunas_(aba);
      var linhas = aba.getRange(2, 1, aba.getLastRow() - 1, aba.getLastColumn()).getValues();
      var iC = m.indice[normalizarChave_('CNPJ')];
      var iK = m.indice[normalizarChave_('Competência_Chave')];
      var iF = m.indice[normalizarChave_('Faturamento')];
      for (var i = 0; i < linhas.length; i++) {
        var c = limparCNPJ(linhas[i][iC]);
        var k = String(linhas[i][iK] || '').trim();
        if (c.length !== 14 || !dentro(k)) continue;
        fat[c] = (fat[c] || 0) + (paraNumero_(linhas[i][iF]) || 0);
      }
    }

    var empresas = lerAba_(ABAS.EMPRESAS);
    var cadastro = {};
    empresas.forEach(function (e) {
      var c = limparCNPJ(e['CNPJ']);
      if (c) cadastro[c] = { empresa: texto_(e['Empresa']),
        honorario: paraNumero_(e['Honorário Atual']),
        piso: paraNumero_(e['Piso do Plano']), plano: texto_(e['Plano Indicado']),
        faixa: texto_(e['Faixa Simples']), fiscal: texto_(e['Fiscal Responsável']) };
    });

    var lista = [];
    Object.keys(n.porCnpj).forEach(function (c) {
      var e = n.porCnpj[c], qtd = 0, valor = 0;
      Object.keys(e.meses).forEach(function (k) {
        if (!dentro(k)) return;
        qtd += e.meses[k][0]; valor += e.meses[k][1];
      });
      if (!qtd) return;
      var cad = cadastro[c] || {};
      var f = fat[c] || 0;
      lista.push({
        cnpj: c, cnpjFmt: formatarCNPJ(c),
        empresa: cad.empresa || e.nome || '(fora do Tabelão)',
        naBase: !!cadastro[c],
        notasQtd: qtd, notasValor: arredondar_(valor, 2),
        faturamento: arredondar_(f, 2),
        pctEmitido: f > 0 ? arredondar_(valor / f, 4) : null,
        honorario: cad.honorario || null, piso: cad.piso || null,
        plano: cad.plano || '', faixa: cad.faixa || '', fiscal: cad.fiscal || ''
      });
    });
    lista.sort(function (a, b) { return b.notasQtd - a.notasQtd; });

    var serie = n.meses.filter(dentro).map(function (k) {
      return { chave: k, competencia: competenciaDisplay_(k),
               qtd: n.porMes[k].qtd, valor: n.porMes[k].valor,
               empresas: n.porMes[k].empresas };
    });

    // Agregado por ano, para a coluna de notas do Histórico. Vai fora do
    // filtro de período de propósito: o Histórico compara anos inteiros.
    var porAno = [];
    Object.keys(n.porCnpj).forEach(function (c) {
      var anos = {};
      var meses = n.porCnpj[c].meses;
      Object.keys(meses).forEach(function (k) {
        var a = k.slice(0, 4);
        if (!anos[a]) anos[a] = [0, 0];
        anos[a][0] += meses[k][0];
        anos[a][1] = arredondar_(anos[a][1] + meses[k][1], 2);
      });
      porAno.push({ cnpj: c, anos: anos });
    });

    return { ok: true, lista: lista, serie: serie, porAno: porAno,
      meses: n.meses, intervalo: { de: de || (n.meses[0] || ''), ate: ate || (n.meses.slice(-1)[0] || '') },
      meta: { linhas: n.linhas, empresasNaPlanilha: n.empresas, lidoEm: n.lidoEm,
              planilha: 'Notas Exemplo', planilhaUrl: 'https://docs.google.com/spreadsheets/d/' + NOTAS_PLANILHA_ID }
    };
  } catch (err) {
    registrarLog_('api_notasEscr', 'ERRO', String(err && err.stack || err), 0, 0);
    return { ok: false, erro: String(err && err.message || err) };
  }
}

/** Força a releitura da planilha de notas (botão "Atualizar" da tela). */
function api_recarregarNotas() {
  try {
    exigirAcesso_();
    var n = lerNotasEscr_(true);
    return { ok: true, mensagem: fmtInt_(n.linhas) + ' notas lidas de ' +
             fmtInt_(n.empresas) + ' empresas.', linhas: n.linhas };
  } catch (err) {
    return { ok: false, erro: String(err && err.message || err) };
  }
}

function fmtInt_(n) { return Number(n || 0).toLocaleString('pt-BR'); }


/**
 * Títulos vencidos dentro de um intervalo de vencimento.
 *
 * A tela de Adimplência mostrava só o agregado do cadastro — uma foto, sem
 * como recortar. Com um título por linha dá para perguntar "o que venceu
 * entre março e junho", que é como a cobrança realmente trabalha.
 * `de` e `ate` são competências AAAAMM; sem elas, devolve tudo.
 */

/**
 * Movimento da carteira: quem entrou, quem saiu e quem mudou de honorário.
 *
 * Devolve os dois conjuntos crus e a lista de competências existentes; a
 * agregação por mês fica no cliente porque o recorte de período é escolhido
 * lá — mandar agregado obrigaria a ida ao servidor a cada troca de janela,
 * e são poucas centenas de linhas.
 *
 * O valor que conta é o COBRADO (a planilha traz contrato e cobrado, que
 * divergem por arredondamento comercial). Na falta dele cai para o contrato.
 */
function api_resultadoCarteira() {
  try {
    exigirAcesso_();
    garantirEstruturaSeNecessario_();
    var comps = {};

    var movimentos = [];
    var abaM = obterAba_(ABAS.MOVIMENTO);
    if (abaM.getLastRow() >= 2) {
      var mM = mapaColunas_(abaM);
      var lM = abaM.getRange(2, 1, abaM.getLastRow() - 1, abaM.getLastColumn()).getValues();
      function ixM(n) { return mM.indice[normalizarChave_(n)]; }
      var iData = ixM('Data'), iMes = ixM('Mês'), iTipo = ixM('Tipo'), iEmp = ixM('Empresa'),
          iCnpj = ixM('CNPJ'), iCob = ixM('Início Cobrança'), iVC = ixM('Valor Contrato'),
          iVB = ixM('Valor Cobrado'), iSit = ixM('Situação'), iObs = ixM('Observação');
      for (var i = 0; i < lM.length; i++) {
        var l = lM[i];
        var nome = texto_(l[iEmp]);
        if (!nome) continue;
        var mes = String(l[iMes] || '').trim();
        if (!/^\d{6}$/.test(mes)) mes = competenciaParaChave_(l[iCob] || l[iData]);
        if (/^\d{6}$/.test(mes)) comps[mes] = 1;
        var cnpj = limparCNPJ(l[iCnpj]);
        movimentos.push({
          data: iso_(l[iData]), mes: mes, tipo: texto_(l[iTipo]), empresa: nome,
          cnpj: cnpj, cnpjFmt: cnpj.length === 14 ? formatarCNPJ(cnpj) : '',
          inicioCobranca: iso_(l[iCob]),
          valorContrato: paraNumero_(l[iVC]) || 0, valorCobrado: paraNumero_(l[iVB]) || 0,
          situacao: texto_(l[iSit]), observacao: texto_(l[iObs])
        });
      }
    }

    var honorarios = [];
    var abaH = obterAba_(ABAS.MOV_HONORARIOS);
    if (abaH.getLastRow() >= 2) {
      var mH = mapaColunas_(abaH);
      var lH = abaH.getRange(2, 1, abaH.getLastRow() - 1, abaH.getLastColumn()).getValues();
      function ixH(n) { return mH.indice[normalizarChave_(n)]; }
      var hE = ixH('Empresa'), hC = ixH('CNPJ'), hT = ixH('Tipo'), hA = ixH('Honorário Anterior'),
          hN = ixH('Honorário Novo'), hD = ixH('Diferença'), hM = ixH('Mês'), hMo = ixH('Motivo');
      for (var j = 0; j < lH.length; j++) {
        var r = lH[j];
        var nomeH = texto_(r[hE]);
        if (!nomeH) continue;
        var mesH = String(r[hM] || '').trim();
        if (!/^\d{6}$/.test(mesH)) mesH = competenciaParaChave_(r[hM]);
        if (/^\d{6}$/.test(mesH)) comps[mesH] = 1;
        var ant = paraNumero_(r[hA]) || 0, nov = paraNumero_(r[hN]) || 0;
        var dif = paraNumero_(r[hD]);
        if (dif === null) dif = nov - ant;          // diferença é derivável; não exigir a coluna
        var cH = limparCNPJ(r[hC]);
        honorarios.push({
          empresa: nomeH, cnpj: cH, cnpjFmt: cH.length === 14 ? formatarCNPJ(cH) : '',
          tipo: texto_(r[hT]) || (dif >= 0 ? 'Reajuste' : 'Redução'),
          anterior: ant, novo: nov, diferenca: arredondar_(dif, 2),
          mes: mesH, motivo: texto_(r[hMo])
        });
      }
    }

    return { ok: true, movimentos: movimentos, honorarios: honorarios,
      meses: Object.keys(comps).filter(function (c) { return /^\d{6}$/.test(c); }).sort(),
      meta: { movimentos: movimentos.length, honorarios: honorarios.length } };
  } catch (err) {
    return { ok: false, erro: String(err && err.message || err) };
  }
}

function api_inadimplencia(de, ate) {
  try {
    exigirAcesso_();
    var aba = obterAba_(ABAS.INADIMPLENCIA);
    var titulos = [], porCnpj = {}, comps = {};
    if (aba.getLastRow() >= 2) {
      var m = mapaColunas_(aba);
      var linhas = aba.getRange(2, 1, aba.getLastRow() - 1, aba.getLastColumn()).getValues();
      function ix(nome) { return m.indice[normalizarChave_(nome)]; }
      var iC = ix('CNPJ'), iE = ix('Empresa'), iV = ix('Vencimento'),
          iK = ix('Competência_Chave'), iVal = ix('Valor'),
          iD = ix('Dias_Atraso'), iDs = ix('Descrição');
      for (var i = 0; i < linhas.length; i++) {
        var l = linhas[i];
        var cnpj = limparCNPJ(l[iC]);
        if (cnpj.length !== 14) continue;
        var chave = String(l[iK] || '').trim();
        if (!/^\d{6}$/.test(chave)) chave = competenciaParaChave_(l[iV]);
        comps[chave] = 1;
        if (de && chave < de) continue;
        if (ate && chave > ate) continue;
        var valor = paraNumero_(l[iVal]) || 0;
        var dias = paraNumero_(l[iD]) || 0;
        titulos.push({ cnpj: cnpj, empresa: texto_(l[iE]), vencimento: iso_(l[iV]),
          competencia: competenciaDisplay_(chave), competenciaChave: chave,
          valor: valor, diasAtraso: dias, descricao: texto_(l[iDs]) });
        var r = porCnpj[cnpj] || (porCnpj[cnpj] = { qtd: 0, valor: 0, maiorAtraso: 0 });
        r.qtd++; r.valor = arredondar_(r.valor + valor, 2);
        if (dias > r.maiorAtraso) r.maiorAtraso = dias;
      }
    }
    return { ok: true, titulos: titulos, porCnpj: porCnpj,
      competencias: Object.keys(comps).filter(function (c) { return /^\d{6}$/.test(c); }).sort(),
      meta: { titulos: titulos.length, empresas: Object.keys(porCnpj).length } };
  } catch (err) {
    return { ok: false, erro: String(err && err.message || err) };
  }
}


/** Competências que têm pendência fiscal registrada na aba EMPRESAS. */
function competenciasFiscais_() {
  try {
    var cfg = obterConfig();
    var c = texto_(cfg.competencia_diagnostico_fiscal);
    if (/^\d{6}$/.test(c)) return [c];
  } catch (e) {}
  return [competenciaParaChave_(new Date())];
}