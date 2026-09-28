/**
 * =============================================================================
 * MÓDULO 7: SINCRONIZAÇÃO BASE DE MONITORAMENTO DE HONORÁRIOS (TABELÃO → BASE)
 * Projeto: Base de Monitoramento de Honorários (backend do AppSheet da Colaborador 2)
 * Script bound à NOVA planilha "Base de Monitoramento de Honorários".
 * Fonte: Tabelao_Exemplo_Master (somente leitura, nada é alterado na origem).
 * =============================================================================
 */

var TABELAO_ID = "ID_EXEMPLO";
var TABELAO_ABA_EMPRESAS = "Empresas";       // confirmado no arquivo real
var TABELAO_ABA_FATURAMENTO = "Faturamento_DB"; // confirmado: Row_ID, Competencia, Codigo, Empresa, Saidas_RS, Servicos_RS, Outros_RS, Total_RS, Data_Comp
var ABA_DESTINO = "EMPRESAS";
var ABA_HISTORICO = "HISTORICO_MENSAL"; // só a série mensal fica aqui; EMPRESAS mostra a foto mais recente

// Planilha "Notas Exemplo" (banco de notas emitidas), aba "base".
// Colunas confirmadas: idnotas, data, empresa, Socio, cnpj, numero da nota, valor,
// Nota emitida pelo, observacao, email.
var NOTAS_EXEMPLO_ID = "ID_EXEMPLO";
var NOTAS_EXEMPLO_ABA = "base";

// Alerta vai por DM direto pro Slack ID da Colaborador 2 (chat.postMessage).
var SLACK_CHANNEL_ID = "ID_SLACK_EXEMPLO";
// Token do Slack Bot (xoxb-...) NÃO fica hardcoded aqui: configure em
// Extensões > Apps Script > Configurações do projeto > Propriedades do script
// com a chave SLACK_BOT_TOKEN. getSlackToken() lê de lá.
function getSlackToken() {
  return PropertiesService.getScriptProperties().getProperty('SLACK_BOT_TOKEN');
}
// E-mails que recebem o alerta semanal (separados por vírgula).
var ALERTA_EMAIL_DESTINATARIOS = "usuario7@exemplo.com.br";

// EMPRESAS agora concentra TUDO sobre a empresa — cadastro, honorário, e a FOTO
// mais recente de faturamento/funcionários/nota/score. Só o histórico mês a mês
// fica de fora (isso continua só em HISTORICO_MENSAL).
var CABECALHO_DESTINO = [
  "CNPJ", "Código Dominio", "Empresa", "Matriz/Filial", "Tributação", "Folha",
  "Situação Tabelão", "Honorário Atual", "Data Último Reajuste",
  "Motivo Última Alteração", "Honorário Sugerido", "Última Sincronização Cadastral",
  "Competência Referência", "Faturamento (mês)", "Var_Faturamento_%",
  "Qtd_Funcionários", "Var_Funcionários_Qtd", "Nota_Emitida",
  "Score", "Critérios Disparados", "Status Prioridade", "Última Atualização Painel"
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⚙️ Base de Honorários')
    .addItem('🔄 1. Sincronizar Empresas (Tabelão)', 'sincronizarEmpresasTabelao')
    .addItem('💰 2. Sincronizar Faturamento (Faturamento_DB)', 'sincronizarFaturamentoMensal')
    .addItem('👥 3. Importar Funcionários (PDF Domínio)', 'importarFuncionariosPDF')
    .addItem('🧾 4. Sincronizar Notas Exemplo', 'sincronizarNotasEscr')
    .addItem('🎯 5. Atualizar Painel (Score) em Empresas', 'calcularPontuacaoHonorarios')
    .addItem('📣 6. Enviar Alertas (Slack + Gmail)', 'enviarAlertasGatilhos')
    .addToUi();
}

function limparCNPJ(valor) {
  return String(valor || "").replace(/[^\d]/g, "");
}

function abrirAbaTabelao(nomeAba) {
  var ss = SpreadsheetApp.openById(TABELAO_ID);
  var aba = ss.getSheetByName(nomeAba);
  if (!aba) throw new Error("Aba '" + nomeAba + "' não encontrada no Tabelão.");
  return aba;
}

/**
 * Sincroniza dados cadastrais do Tabelão para a aba EMPRESAS.
 * Upsert por CNPJ: atualiza apenas campos cadastrais (colunas 1-7).
 * NUNCA sobrescreve Honorário Atual / Data Último Reajuste / Motivo / Sugerido
 * (colunas 8-11) — esses campos são de uso exclusivo da Colaborador 2.
 */
function sincronizarEmpresasTabelao() {
  var ui = SpreadsheetApp.getUi();
  var ssDestino = SpreadsheetApp.getActiveSpreadsheet();
  var abaDestino = ssDestino.getSheetByName(ABA_DESTINO);
  if (!abaDestino) {
    abaDestino = ssDestino.insertSheet(ABA_DESTINO);
    abaDestino.getRange(1, 1, 1, CABECALHO_DESTINO.length).setValues([CABECALHO_DESTINO])
      .setFontWeight("bold").setBackground("#274e13").setFontColor("#ffffff");
  }

  var abaFonte = abrirAbaTabelao(TABELAO_ABA_EMPRESAS);
  var dadosFonte = abaFonte.getDataRange().getValues();
  var headersFonte = dadosFonte[0];

  var idx = {
    codigo: buscarIndiceColuna(headersFonte, "Código Dominio"),
    situacao: buscarIndiceColuna(headersFonte, "Situacao"),
    empresa: buscarIndiceColuna(headersFonte, "Empresa"),
    cnpj: buscarIndiceColuna(headersFonte, "CNPJ"),
    matrizFilial: buscarIndiceColuna(headersFonte, "Matriz / Filial"),
    tributacao: buscarIndiceColuna(headersFonte, "Tributacao"),
    folha: buscarIndiceColuna(headersFonte, "Tem Folha de Pagamento?")
  };
  if (idx.cnpj === -1 || idx.empresa === -1) {
    ui.alert("❌ Erro: colunas 'CNPJ' ou 'Empresa' não localizadas no Tabelão.");
    return;
  }

  var dadosDestino = abaDestino.getDataRange().getValues();
  var mapaExistente = {}; // cnpjLimpo -> nº da linha (1-based)
  for (var r = 1; r < dadosDestino.length; r++) {
    var cnpjLinha = limparCNPJ(dadosDestino[r][0]);
    if (cnpjLinha) mapaExistente[cnpjLinha] = r + 1;
  }

  var agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
  var novos = 0, atualizados = 0;
  var linhasNovas = [];

  for (var i = 1; i < dadosFonte.length; i++) {
    var linha = dadosFonte[i];
    var cnpjBruto = linha[idx.cnpj];
    var cnpjLimpo = limparCNPJ(cnpjBruto);
    if (!cnpjLimpo) continue;

    var situacao = idx.situacao !== -1 ? String(linha[idx.situacao]).trim() : "Ativas";
    var empresa = linha[idx.empresa];
    var codigo = idx.codigo !== -1 ? linha[idx.codigo] : "";
    var matrizFilial = idx.matrizFilial !== -1 ? linha[idx.matrizFilial] : "";
    var tributacao = idx.tributacao !== -1 ? linha[idx.tributacao] : "";
    var folha = idx.folha !== -1 ? linha[idx.folha] : "";

    if (mapaExistente[cnpjLimpo]) {
      var linhaDestino = mapaExistente[cnpjLimpo];
      abaDestino.getRange(linhaDestino, 1, 1, 7).setValues([[
        cnpjBruto, codigo, empresa, matrizFilial, tributacao, folha, situacao
      ]]);
      abaDestino.getRange(linhaDestino, 12).setValue(agora); // Última Sincronização
      atualizados++;
    } else {
      linhasNovas.push([
        cnpjBruto, codigo, empresa, matrizFilial, tributacao, folha, situacao,
        "", "", "", "", agora,
        "", "", "", "", "", "", "", "", "", "" // colunas 13-22, preenchidas pela opção 5
      ]);
      novos++;
    }
  }

  if (linhasNovas.length > 0) {
    abaDestino.getRange(abaDestino.getLastRow() + 1, 1, linhasNovas.length, CABECALHO_DESTINO.length)
      .setValues(linhasNovas);
  }

  ui.alert("✅ Sincronização concluída.\nNovas empresas: " + novos + "\nAtualizadas: " + atualizados);
}

// =============================================================================
// MÓDULO 8: SINCRONIZAÇÃO DE FATURAMENTO MENSAL (Faturamento_DB → HISTORICO_MENSAL)
// =============================================================================
/**
 * Lê Faturamento_DB (Row_ID, Competencia, Codigo, Empresa, Saidas_RS, Servicos_RS,
 * Outros_RS, Total_RS, Data_Comp), casa por "Código Dominio" com a aba EMPRESAS
 * (para obter o CNPJ) e grava/atualiza uma linha por CNPJ+Competência em
 * HISTORICO_MENSAL, calculando a variação de faturamento vs. o mês anterior.
 */
function sincronizarFaturamentoMensal() {
  var ui = SpreadsheetApp.getUi();
  var ssDestino = SpreadsheetApp.getActiveSpreadsheet();
  var abaEmpresas = ssDestino.getSheetByName(ABA_DESTINO);
  if (!abaEmpresas) {
    ui.alert("❌ Rode antes a Sincronização de Empresas (opção 1 do menu).");
    return;
  }

  // Código Dominio -> CNPJ, a partir da própria base já sincronizada.
  var dadosEmpresas = abaEmpresas.getDataRange().getValues();
  var codigoParaCnpj = {};
  for (var e = 1; e < dadosEmpresas.length; e++) {
    var codigoEmp = String(dadosEmpresas[e][1]).trim(); // coluna 2 = Código Dominio
    if (codigoEmp) codigoParaCnpj[codigoEmp] = dadosEmpresas[e][0]; // coluna 1 = CNPJ
  }

  var abaFat = abrirAbaTabelao(TABELAO_ABA_FATURAMENTO);
  var dadosFat = abaFat.getDataRange().getValues();
  var headersFat = dadosFat[0];
  var idxCodigo = buscarIndiceColuna(headersFat, "Codigo");
  var idxComp = buscarIndiceColuna(headersFat, "Competencia");
  var idxTotal = buscarIndiceColuna(headersFat, "Total_RS");
  if (idxCodigo === -1 || idxComp === -1 || idxTotal === -1) {
    ui.alert("❌ Erro: colunas Codigo/Competencia/Total_RS não localizadas em Faturamento_DB.");
    return;
  }

  var abaHist = ssDestino.getSheetByName(ABA_HISTORICO);
  var cabecalhoHist = ["CNPJ", "Competência", "Faturamento", "Var_Faturamento_%", "Qtd_Funcionários", "Nota_Emitida", "Última Sincronização"];
  if (!abaHist) {
    abaHist = ssDestino.insertSheet(ABA_HISTORICO);
    abaHist.getRange(1, 1, 1, cabecalhoHist.length).setValues([cabecalhoHist])
      .setFontWeight("bold").setBackground("#274e13").setFontColor("#ffffff");
  }

  var dadosHist = abaHist.getDataRange().getValues();
  var mapaHist = {}; // "CNPJ|Competência" -> nº da linha
  var faturamentoPorCnpj = {}; // CNPJ -> { competencia: total } para calcular variação
  for (var h = 1; h < dadosHist.length; h++) {
    var chaveHist = limparCNPJ(dadosHist[h][0]) + "|" + String(dadosHist[h][1]).trim();
    mapaHist[chaveHist] = h + 1;
    var cnpjH = limparCNPJ(dadosHist[h][0]);
    if (!faturamentoPorCnpj[cnpjH]) faturamentoPorCnpj[cnpjH] = {};
    faturamentoPorCnpj[cnpjH][String(dadosHist[h][1]).trim()] = dadosHist[h][2];
  }

  var agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
  var novos = 0, atualizados = 0, semCorrespondencia = 0;
  var linhasNovas = [];

  for (var i = 1; i < dadosFat.length; i++) {
    var linha = dadosFat[i];
    var codigo = String(linha[idxCodigo]).replace(/\.0$/, "").trim();
    var competencia = String(linha[idxComp]).trim();
    var total = Number(linha[idxTotal]) || 0;
    if (!codigo || !competencia) continue;

    var cnpj = codigoParaCnpj[codigo];
    if (!cnpj) { semCorrespondencia++; continue; }
    var cnpjLimpo = limparCNPJ(cnpj);

    var mesAnterior = competenciaAnterior(competencia);
    var totalAnterior = (faturamentoPorCnpj[cnpjLimpo] && faturamentoPorCnpj[cnpjLimpo][mesAnterior]) || null;
    var variacao = (totalAnterior && totalAnterior > 0) ? ((total - totalAnterior) / totalAnterior) : "";

    var chave = cnpjLimpo + "|" + competencia;
    if (mapaHist[chave]) {
      var linhaDestino = mapaHist[chave];
      abaHist.getRange(linhaDestino, 3).setValue(total);
      abaHist.getRange(linhaDestino, 4).setValue(variacao);
      abaHist.getRange(linhaDestino, 7).setValue(agora);
      atualizados++;
    } else {
      linhasNovas.push([cnpj, competencia, total, variacao, "", "", agora]);
      novos++;
    }

    if (!faturamentoPorCnpj[cnpjLimpo]) faturamentoPorCnpj[cnpjLimpo] = {};
    faturamentoPorCnpj[cnpjLimpo][competencia] = total;
  }

  if (linhasNovas.length > 0) {
    abaHist.getRange(abaHist.getLastRow() + 1, 1, linhasNovas.length, cabecalhoHist.length).setValues(linhasNovas);
  }

  ui.alert("✅ Faturamento sincronizado.\nNovos registros: " + novos + "\nAtualizados: " + atualizados +
    "\nSem correspondência de CNPJ: " + semCorrespondencia);
}

// Recebe "MM / AAAA" (formato do Faturamento_DB) e devolve a competência do mês anterior no mesmo formato.
function competenciaAnterior(competencia) {
  var partes = competencia.split("/").map(function(p) { return p.trim(); });
  if (partes.length !== 2) return "";
  var mes = parseInt(partes[0], 10), ano = parseInt(partes[1], 10);
  mes -= 1;
  if (mes < 1) { mes = 12; ano -= 1; }
  return ("0" + mes).slice(-2) + " / " + ano;
}

// =============================================================================
// MÓDULO 10: IMPORTAÇÃO DE FUNCIONÁRIOS (PDF "Movimentação de Empregados" — Domínio)
// =============================================================================
/**
 * Pede o link do PDF (Google Drive), lê o texto e casa cada linha
 * "CNPJ  Saldo Ant.  Admitidos  Demitidos  Saldo" para gravar o Saldo (funcionários
 * atuais) em HISTORICO_MENSAL, na competência informada no cabeçalho do relatório
 * ("Período: MM/AAAA a MM/AAAA"). Calcula também a variação vs. o mês anterior.
 */
function importarFuncionariosPDF() {
  var ui = SpreadsheetApp.getUi();
  var prompt = ui.prompt(
    '📄 Importar Movimentação de Empregados',
    'Cole o link do Google Drive do PDF "Movimentação de Empregados" (relatório do Domínio):',
    ui.ButtonSet.OK_CANCEL
  );
  if (prompt.getSelectedButton() !== ui.Button.OK) return;
  var url = prompt.getResponseText().trim();
  var fileIdMatch = url.match(/[-\w]{25,}/);
  if (!fileIdMatch) { ui.alert('❌ Link inválido.'); return; }

  var tempFileId = null;
  try {
    var tempFile = Drive.Files.copy(
      { title: "Temp_MovimentacaoEmpregados", mimeType: MimeType.GOOGLE_DOCS },
      fileIdMatch[0],
      { convert: true, supportsAllDrives: true }
    );
    tempFileId = tempFile.id;
    var doc = DocumentApp.openById(tempFileId);
    var texto = doc.getBody().getText();

    var competencia = extrairCompetenciaRelatorio(texto);
    if (!competencia) {
      ui.alert('❌ Não consegui identificar a competência ("Período:") no PDF.');
      return;
    }

    // Linha do relatório: CNPJ  Saldo Ant.  Admitidos  Demitidos  Saldo
    var regexLinha = /(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/g;
    var funcionariosPorCnpj = {};
    var match;
    while ((match = regexLinha.exec(texto)) !== null) {
      funcionariosPorCnpj[limparCNPJ(match[1])] = parseInt(match[5], 10);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var abaHist = ss.getSheetByName(ABA_HISTORICO);
    if (!abaHist) { ui.alert('❌ Rode antes a Sincronização de Faturamento (opção 2).'); return; }

    var idxVarFunc = garantirColunaGenerica(abaHist, "Var_Funcionários_Qtd");
    var dadosHist = abaHist.getDataRange().getValues();
    var idxCnpjH = 0, idxCompH = 1, idxFuncH = 4; // posições fixas do cabeçalho original

    var mapaLinha = {}; // cnpjLimpo -> { competencia: nº da linha }
    for (var h = 1; h < dadosHist.length; h++) {
      var c = limparCNPJ(dadosHist[h][idxCnpjH]);
      if (!mapaLinha[c]) mapaLinha[c] = {};
      mapaLinha[c][String(dadosHist[h][idxCompH]).trim()] = h + 1;
    }

    var mesAnteriorComp = competenciaAnterior(competencia);
    var agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
    var atualizados = 0, semLinhaHistorico = 0;

    for (var cnpjLimpo in funcionariosPorCnpj) {
      var saldoAtual = funcionariosPorCnpj[cnpjLimpo];
      var linhas = mapaLinha[cnpjLimpo];
      if (!linhas || !linhas[competencia]) { semLinhaHistorico++; continue; }
      var linhaDestino = linhas[competencia];

      var varFunc = "";
      if (linhas[mesAnteriorComp]) {
        var saldoAnterior = abaHist.getRange(linhas[mesAnteriorComp], idxFuncH + 1).getValue();
        if (saldoAnterior !== "" && saldoAnterior !== null) varFunc = saldoAtual - Number(saldoAnterior);
      }

      abaHist.getRange(linhaDestino, idxFuncH + 1).setValue(saldoAtual);
      abaHist.getRange(linhaDestino, idxVarFunc + 1).setValue(varFunc);
      abaHist.getRange(linhaDestino, 7).setValue(agora); // Última Sincronização
      atualizados++;
    }

    ui.alert("✅ Funcionários importados (competência " + competencia + ").\n" +
      "Empresas atualizadas: " + atualizados +
      "\nSem linha correspondente em HISTORICO_MENSAL: " + semLinhaHistorico +
      " (rode a Sincronização de Faturamento dessa competência antes, se faltou).");
  } catch (e) {
    ui.alert("❌ Erro ao processar o PDF: " + e.message);
  } finally {
    if (tempFileId) { try { DriveApp.getFileById(tempFileId).setTrashed(true); } catch (e2) {} }
  }
}

// Lê "Período: 07/2026 a 07/2026" no cabeçalho do relatório e devolve "07 / 2026"
// (mesmo formato de competência usado em Faturamento_DB / HISTORICO_MENSAL).
function extrairCompetenciaRelatorio(texto) {
  var m = texto.match(/Per[ií]odo:\s*(\d{2})\/(\d{4})/i);
  if (!m) return "";
  return m[1] + " / " + m[2];
}

// Garante que a coluna exista na aba (cria no fim se faltar). Devolve índice 0-based.
function garantirColunaGenerica(sheet, nomeColuna) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var idx = buscarIndiceColuna(headers, nomeColuna);
  if (idx !== -1) return idx;
  var lastCol = sheet.getLastColumn();
  sheet.getRange(1, lastCol + 1).setValue(nomeColuna)
    .setFontWeight("bold").setBackground("#274e13").setFontColor("#ffffff");
  return lastCol;
}

// =============================================================================
// MÓDULO 11: SINCRONIZAÇÃO DE NOTAS EXEMPLO ("emitimos a nota?")
// =============================================================================
/**
 * Lê a planilha "Notas Exemplo" (aba "base") e marca, em HISTORICO_MENSAL, se existe
 * nota emitida para aquele CNPJ na competência (mês/ano da coluna "data"). Não
 * consulta nenhum banco externo — usa a planilha que a Vicky já tem.
 */
function sincronizarNotasEscr() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var abaHist = ss.getSheetByName(ABA_HISTORICO);
  if (!abaHist) { ui.alert("❌ Rode antes a Sincronização de Faturamento (opção 2)."); return; }

  var ssNotas = SpreadsheetApp.openById(NOTAS_EXEMPLO_ID);
  var abaNotas = ssNotas.getSheetByName(NOTAS_EXEMPLO_ABA);
  if (!abaNotas) { ui.alert("❌ Aba '" + NOTAS_EXEMPLO_ABA + "' não encontrada em Notas Exemplo."); return; }

  var dadosNotas = abaNotas.getDataRange().getValues();
  var headersNotas = dadosNotas[0];
  var idxCnpjN = buscarIndiceColuna(headersNotas, "cnpj");
  var idxDataN = buscarIndiceColuna(headersNotas, "data");
  if (idxCnpjN === -1 || idxDataN === -1) {
    ui.alert("❌ Colunas 'cnpj'/'data' não localizadas em Notas Exemplo.");
    return;
  }

  // "cnpjLimpo|MM / AAAA" -> true (existe pelo menos 1 nota emitida naquele mês)
  var notasPorCnpjMes = {};
  for (var n = 1; n < dadosNotas.length; n++) {
    var cnpjN = limparCNPJ(dadosNotas[n][idxCnpjN]);
    if (!cnpjN) continue;
    var dataVal = dadosNotas[n][idxDataN];
    var mm, aaaa;
    if (dataVal instanceof Date) {
      mm = ("0" + (dataVal.getMonth() + 1)).slice(-2);
      aaaa = dataVal.getFullYear();
    } else {
      var m = String(dataVal).match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (!m) continue;
      mm = m[2]; aaaa = m[3];
    }
    notasPorCnpjMes[cnpjN + "|" + mm + " / " + aaaa] = true;
  }

  var dadosHist = abaHist.getDataRange().getValues();
  var agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
  var marcados = 0;
  for (var h = 1; h < dadosHist.length; h++) {
    var cnpjH = limparCNPJ(dadosHist[h][0]);
    var competencia = String(dadosHist[h][1]).trim();
    var status = notasPorCnpjMes[cnpjH + "|" + competencia] ? "Sim" : "Não";
    abaHist.getRange(h + 1, 6).setValue(status); // Nota_Emitida
    abaHist.getRange(h + 1, 7).setValue(agora);
    marcados++;
  }

  ui.alert("✅ Notas Exemplo sincronizadas.\nLinhas atualizadas: " + marcados);
}

// =============================================================================
// MÓDULO 12: PONTUAÇÃO COMBINADA DE HONORÁRIOS (grava direto em EMPRESAS)
// =============================================================================
/**
 * Não existe mais uma aba separada de score: a "foto" mais recente de cada
 * empresa (competência, faturamento, funcionários, nota, score, status) é
 * gravada nas colunas 13-22 da própria aba EMPRESAS. O histórico mês a mês
 * continua só em HISTORICO_MENSAL — é a única coisa que fica de fora daqui.
 *
 * CRITÉRIOS (provisórios — combinamos e ajustamos depois):
 *   Faturamento cresceu ≥40% no mês ......................... +3
 *   Faturamento cresceu entre 20% e 39% no mês .............. +2
 *   Funcionários aumentaram ≥5 no mês ....................... +3
 *   Funcionários aumentaram entre 2 e 4 no mês .............. +2
 *   Faturamento em alta nos últimos 3 meses seguidos ........ +3
 *   +12 meses sem reajuste (Data Último Reajuste em EMPRESAS) +2
 *   Nota NÃO emitida com faturamento > 0 no mês .............. marca ⚠️ à parte
 *                                                                (não soma pontos —
 *                                                                 é alerta de
 *                                                                 compliance, não
 *                                                                 de oportunidade)
 * STATUS:  Score ≥8 🔴 Alta prioridade | 4–7 🟠 Observação | 1–3 🟡 Monitorar | 0 🟢 Normal
 */
function calcularPontuacaoHonorarios() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var abaEmpresas = ss.getSheetByName(ABA_DESTINO);
  var abaHist = ss.getSheetByName(ABA_HISTORICO);
  if (!abaEmpresas || !abaHist) {
    ui.alert("❌ Rode antes as sincronizações de Empresas e Faturamento (opções 1 e 2).");
    return;
  }

  var dadosHist = abaHist.getDataRange().getValues();
  var histPorCnpj = {}; // cnpjLimpo -> [{competencia, faturamento, varFat, qtdFunc, varFunc, notaEmitida}]
  for (var h = 1; h < dadosHist.length; h++) {
    var cnpjH = limparCNPJ(dadosHist[h][0]);
    if (!cnpjH) continue;
    if (!histPorCnpj[cnpjH]) histPorCnpj[cnpjH] = [];
    histPorCnpj[cnpjH].push({
      competencia: String(dadosHist[h][1]).trim(),
      faturamento: dadosHist[h][2],
      varFat: dadosHist[h][3],
      qtdFunc: dadosHist[h][4],
      notaEmitida: dadosHist[h][5],
      varFunc: dadosHist[h][7] // coluna 8 = Var_Funcionários_Qtd (criada pelo Módulo 10, pode não existir ainda)
    });
  }

  function chaveCompetencia(c) {
    var p = String(c).split("/").map(function(x) { return x.trim(); });
    return p.length === 2 ? (parseInt(p[1], 10) * 12 + parseInt(p[0], 10)) : 0;
  }

  var dadosEmpresas = abaEmpresas.getDataRange().getValues();
  var agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
  var atualizados = 0;

  for (var e = 1; e < dadosEmpresas.length; e++) {
    var cnpjLimpo = limparCNPJ(dadosEmpresas[e][0]);
    if (!cnpjLimpo) continue;
    var linhaPlanilha = e + 1;
    var registros = histPorCnpj[cnpjLimpo];

    if (!registros || registros.length === 0) {
      abaEmpresas.getRange(linhaPlanilha, 13, 1, 9).setValues([["", "", "", "", "", "", "", "", ""]]);
      abaEmpresas.getRange(linhaPlanilha, 22).setValue(agora);
      continue;
    }

    registros.sort(function(a, b) { return chaveCompetencia(a.competencia) - chaveCompetencia(b.competencia); });
    var ultimo = registros[registros.length - 1];

    var score = 0;
    var criterios = [];

    var varFat = ultimo.varFat === "" ? null : Number(ultimo.varFat);
    if (varFat !== null && varFat >= 0.40) { score += 3; criterios.push("Faturamento +" + (varFat * 100).toFixed(0) + "%"); }
    else if (varFat !== null && varFat >= 0.20) { score += 2; criterios.push("Faturamento +" + (varFat * 100).toFixed(0) + "%"); }

    var varFunc = (ultimo.varFunc === "" || ultimo.varFunc === undefined) ? null : Number(ultimo.varFunc);
    if (varFunc !== null && varFunc >= 5) { score += 3; criterios.push("Funcionários +" + varFunc); }
    else if (varFunc !== null && varFunc >= 2) { score += 2; criterios.push("Funcionários +" + varFunc); }

    var ultimas3 = registros.slice(-3);
    var recorrente = ultimas3.length === 3 && ultimas3.every(function(r) { return Number(r.varFat) > 0; });
    if (recorrente) { score += 3; criterios.push("Alta recorrente (3 meses)"); }

    var dataReajusteVal = dadosEmpresas[e][8]; // coluna 9 = Data Último Reajuste
    if (dataReajusteVal) {
      var dataReaj = dataReajusteVal instanceof Date ? dataReajusteVal : new Date(dataReajusteVal);
      if (!isNaN(dataReaj.getTime())) {
        var hoje = new Date();
        var mesesDesde = (hoje.getFullYear() - dataReaj.getFullYear()) * 12 + (hoje.getMonth() - dataReaj.getMonth());
        if (mesesDesde >= 12) { score += 2; criterios.push("Sem reajuste há " + mesesDesde + " meses"); }
      }
    }

    if (ultimo.notaEmitida === "Não" && Number(ultimo.faturamento) > 0) {
      criterios.push("⚠️ Nota não emitida");
    }

    var status = score >= 8 ? "🔴 Alta prioridade" : score >= 4 ? "🟠 Observação" : score >= 1 ? "🟡 Monitorar" : "🟢 Normal";

    abaEmpresas.getRange(linhaPlanilha, 13, 1, 9).setValues([[
      ultimo.competencia, ultimo.faturamento, ultimo.varFat, ultimo.qtdFunc, ultimo.varFunc,
      ultimo.notaEmitida, score, criterios.join("; "), status
    ]]);
    abaEmpresas.getRange(linhaPlanilha, 22).setValue(agora);
    atualizados++;
  }

  ui.alert("✅ Painel atualizado em EMPRESAS.\nEmpresas com dados de faturamento/funcionários: " +
    atualizados + " de " + (dadosEmpresas.length - 1) +
    "\nCritérios de pontuação estão no comentário do código — combinem e ajustem os pesos quando quiserem.");
}

// =============================================================================
// MÓDULO 9: ALERTAS DE GATILHO (SLACK + GMAIL)
// =============================================================================
/**
 * Lê MONITORAMENTO_HONORARIOS (já calculada pelo Módulo 12) e manda a lista de
 * "ataques da semana" — empresas com Score ≥ 4 (🟠 Observação ou 🔴 Alta
 * prioridade) — por Slack e e-mail. Rode semanalmente (ver criarGatilhosAutomaticos).
 */
var LIMIAR_ALERTA_SCORE = 4;

function enviarAlertasGatilhos() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var abaEmpresas = ss.getSheetByName(ABA_DESTINO);
  if (!abaEmpresas) {
    SpreadsheetApp.getUi().alert("❌ Rode antes a Sincronização de Empresas (opção 1).");
    return;
  }

  var dadosEmpresas = abaEmpresas.getDataRange().getValues();
  var alertas = [];
  for (var i = 1; i < dadosEmpresas.length; i++) {
    var linha = dadosEmpresas[i];
    var score = Number(linha[18]) || 0; // coluna 19 = Score
    if (score >= LIMIAR_ALERTA_SCORE) {
      alertas.push({
        empresa: linha[2] || linha[0], // coluna 3 = Empresa
        cnpj: linha[0],
        score: score,
        criterios: linha[19], // coluna 20 = Critérios Disparados
        status: linha[20]     // coluna 21 = Status Prioridade
      });
    }
  }

  if (alertas.length === 0) {
    return; // nada a alertar nesta rodada
  }

  var linhasTexto = alertas.map(function(a, idx) {
    return (idx + 1) + ". " + a.status + " " + a.empresa + " (" + a.cnpj + ") — Score " + a.score +
      "\n   " + a.criterios;
  });
  var corpo = "🎯 Ataques da semana — " + alertas.length + " empresa(s) para revisar honorários:\n\n" +
    linhasTexto.join("\n\n");

  var slackToken = getSlackToken();
  if (slackToken) {
    UrlFetchApp.fetch("https://slack.com/api/chat.postMessage", {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + slackToken },
      payload: JSON.stringify({ channel: SLACK_CHANNEL_ID, text: corpo })
    });
  }

  if (ALERTA_EMAIL_DESTINATARIOS) {
    MailApp.sendEmail({
      to: ALERTA_EMAIL_DESTINATARIOS,
      subject: "🎯 Ataques da semana — " + alertas.length + " empresa(s) com aumento de faturamento",
      body: corpo
    });
  }
}

// Mesma lógica de normalização de cabeçalho usada no Sistema Fiscal Integrado.
function buscarIndiceColuna(headers, nomeDesejado) {
  function normalizar(txt) {
    if (!txt) return "";
    return String(txt).toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  }
  var nNome = normalizar(nomeDesejado);
  var idx = headers.findIndex(function(h) { return normalizar(h) === nNome; });
  if (idx !== -1) return idx;
  return headers.findIndex(function(h) {
    var hNorm = normalizar(h);
    if (!hNorm) return false;
    return hNorm.includes(nNome) || nNome.includes(hNorm);
  });
}

// Execute uma vez manualmente para agendar as rotinas diárias (06h, em cascata) e
// o alerta semanal (segunda-feira, 08h) — "gatilhos semanais de quem atacar".
// A importação de funcionários (opção 3) fica de fora: precisa do link do PDF
// novo a cada rodada, então continua manual pelo menu.
function criarGatilhosAutomaticos() {
  ScriptApp.newTrigger('sincronizarEmpresasTabelao').timeBased().everyDays(1).atHour(6).nearMinute(0).create();
  ScriptApp.newTrigger('sincronizarFaturamentoMensal').timeBased().everyDays(1).atHour(6).nearMinute(15).create();
  ScriptApp.newTrigger('sincronizarNotasEscr').timeBased().everyDays(1).atHour(6).nearMinute(30).create();
  ScriptApp.newTrigger('calcularPontuacaoHonorarios').timeBased().everyDays(1).atHour(6).nearMinute(45).create();
  ScriptApp.newTrigger('enviarAlertasGatilhos').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(8).create();
}