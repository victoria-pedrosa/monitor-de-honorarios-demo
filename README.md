# Demonstração — Monitoramento de reajuste de honorários

> Projeto de portfólio de **Victória Pedrosa**. **Demonstração** de monitoramento de reajuste de honorários — versão com dados fictícios (nomes, CNPJs, e-mails e IDs internos substituídos).

## Problema de negócio
Reajustes e defasagem de honorários não eram acompanhados de forma sistemática; clientes ficavam anos sem revisão.

## Antes x depois
| | Antes | Depois |
|---|---|---|
| Como é feito | Análise de honorário por cliente feita manualmente no Tabelão. | Web app monitora a carteira, aplica regras de score e gatilhos de reajuste, publica a base da calculadora e sincroniza o Tabelão com a base do AppSheet. |

## Ganho
- Carteira revisada com critério único e alerta de clientes defasados.

## Tecnologias
APIs REST, E-mail automático, Gatilhos agendados, Google Apps Script, Google Drive, Google Sheets, HTML/JavaScript, Web App (HtmlService)

## Arquivos
- `Calculadora.gs`
- `Codigo.gs`
- `Index.html`
- `PublicarBaseCalculadora.gs`
- `SincronizacaoTabelaoBase.gs`

## Como usar
Crie um projeto no Google Apps Script, copie os arquivos `.gs`/`.html` e configure as Propriedades do script indicadas no código.

## Autora
Victória Pedrosa — Product Owner do Time de IA, automação de processos contábeis e fiscais.
