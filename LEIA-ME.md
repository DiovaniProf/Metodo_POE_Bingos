# Bingo Inteligente V7.0 — Importação XLSX e XLSM

## Novidade

O aplicativo reconhece e importa arquivos Excel nos formatos **.xlsx** e **.xlsm**, além de **.csv**.

- A importação verifica a assinatura de um arquivo Excel OOXML, os XMLs internos, o tipo real de pasta de trabalho e a extensão; trocar apenas o nome de `.xlsx` para `.xlsm` **não** transforma o arquivo.
- Arquivos sem estrutura válida ou com extensão incompatível são recusados **sem apagar a sessão atual**.
- O aplicativo lê as abas **Dicionario** e **Digitacao** do mesmo Excel, mantendo a conversão dos códigos (01–09) em uma, duas ou três pedras.
- No formato XLSM, o código JavaScript lê apenas as planilhas. **Macros VBA não são executadas nem aproveitadas**.
- O antigo formato **.xls** não é aceito.

## Arquivos incluídos

- `index.html`, `app.js`, `logic.js` e os arquivos CSS da aplicação, além da biblioteca JSZip local.
- `modelos/Modelo_Bingo_Flexivel_V7.xlsx`: modelo vazio para preencher (15 pares de estados/capitais).
- `modelos/Exemplo_Bingo_V7_Preenchido.xlsx`: exemplo com 2 participantes e 10 códigos por cartela.
- `modelos/Exemplo_Bingo_V7_Sem_Macros.xlsm`: **exemplo verdadeiro de pacote XLSM** sem código VBA, para testar a importação desse formato.
- Os modelos anteriores de trios, palavras, números e jogos variados, preservados para compatibilidade.

## Como importar

1. Edite a planilha e digite os códigos nas colunas da aba **Digitacao**, sempre com zero à esquerda quando necessário: `01` até `09`.
2. Salve como **.xlsx** ou, no Microsoft Excel, como **.xlsm** se precisar desse tipo de arquivo.
3. Abra `index.html` no navegador.
4. Em **Carregar matriz**, escolha o arquivo preenchido. O sistema lê a matriz e as cartelas conjuntamente.
5. O painel mostra o formato validado e a quantidade de pedras/participantes importados.

## Sobre o aviso “Converter para tabela” do Google Planilhas

O aviso flutuante é uma **sugestão da interface do Google Planilhas**, não um objeto da pasta de trabalho. Não pode ser removido permanentemente mediante a edição do arquivo `.xlsx` ou `.xlsm`. Para desativar a sugestão no Google Planilhas, acesse:

**Ferramentas → Controles de sugestão → desmarque “Ativar sugestões de tabela”.**

Não é preciso transformar as áreas de dados em tabela para o Bingo funcionar. A aba **Orientacoes** do modelo V7 contém essas orientações.

## Recursos preservados

- Organização visual de pares e trios juntos, parcialmente juntos ou embaralhados, sem alterar a ordem de sorteio.
- Sorteio aleatório de grupos e ordem vinculada dos elementos de cada grupo.
- Conferência automática de cartelas, classificação e barras de progresso, empates e avisos de vitória.
- Tela cheia com SORTEAR, matriz e botão de participantes/histórico.
- Exportação da sessão em JSON e relatórios em CSV.

## Limites e cuidados

- Importação local no navegador, sem conexão com banco de dados e sem execução de macros.
- Arquivos Excel de até 25 MB.
- O exemplo `.xlsm` foi preparado sem VBA: ele demonstra a leitura de um pacote macro-habilitado, mas não testa a execução de macros, que não é uma função do Bingo.
