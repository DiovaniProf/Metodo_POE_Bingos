# BINGO INTELIGENTE — versão web 3.0

Aplicação educacional com **HTML, CSS e JavaScript**, sem necessidade de Python, banco de dados ou internet para executar. A biblioteca **JSZip** (incluída em `vendor/`) lê arquivos Excel `.xlsx` diretamente no navegador.

## Novidade da versão 3.0 — aviso automático de cartela completa

Sempre que o sorteio atual completar uma ou mais cartelas de participantes, o Bingo apresenta imediatamente um aviso **BINGO!**, sem necessidade de o professor verificar os resultados manualmente.

- Mostra **nome**, **colocação** e **acertos** de cada participante que concluiu naquele sorteio.
- Se dois ou mais terminarem **na mesma pedra**, todos aparecem juntos com a mesma colocação (por exemplo: Ana 1º; Pedro 2º; João 2º).
- Exibe qual pedra provocou a conclusão e o número do sorteio.
- Inclui botões **CONTINUAR SORTEIO** e **VER CLASSIFICAÇÃO**.
- Funciona tanto no painel normal quanto **dentro da própria tela cheia**, preservando o modo de projeção.
- O aviso não aparece novamente para quem já ganhou; só ocorre diante de uma **nova conclusão**.
- O professor pode fechar o aviso e prosseguir; as colocações e as cartelas completas permanecem na classificação.

**Teste rápido:** importe `modelos/matriz_demo_vitoria.csv` como matriz, depois `modelos/cartelas_demo_vitoria.csv` como participantes. Ao sortear Barroco, Maria completa primeiro. Ao sortear Caravaggio, Ana, Pedro e João completam no mesmo sorteio, ficando todos em 2º. O terceiro sorteio não gera novo aviso.

**Como atualizar da V2:** substitua pelo conteúdo completo do novo ZIP; o arquivo adicional `winners.css` precisa ficar na mesma pasta que `index.html`, `app.js`, `logic.js`, `styles.css` e `fullscreen.css`. O armazenamento local e os arquivos JSON da V2 continuam compatíveis com a V3.

## Novidade da versão 2.0 — projeção em tela cheia

Na tela normal, configure a matriz, importe as cartelas dos estudantes e escolha a regra de sorteio. Em seguida, clique em **⛶ Tela cheia** no canto superior direito.

Durante a projeção, aparecem **apenas**:

- O botão **✦ SORTEAR**;
- A **cartela matriz** (com as cores azul/verde/amarelo);
- O botão **PARTICIPANTES E HISTÓRICO**.

O botão de acompanhamento abre um painel sobre a própria tela cheia, mostrando **barras de progresso, posições, acertos e histórico de pedras sorteadas**, sem sair da projeção. Clique no nome do estudante para visualizar a cartela individual; use **Voltar à classificação** e **Fechar** para retornar à matriz. Pressione **Esc** para sair da tela cheia e acessar configurações, exportação e reinício.

A matriz permanece com as dimensões escolhidas na tela normal. Se forem configuradas muitas linhas para a resolução da tela, a matriz terá rolagem interna em vez de ocultar pedras. O layout de projeção foi testado em Chromium em tela 1366×768.

A pasta `modelos/` inclui também `matriz_estados_e_capitais.xlsx` e `.csv`, com 15 pares de estados brasileiros e capitais.

## 1. Como iniciar

1. Descompacte TODO o arquivo ZIP em uma pasta (não abra o HTML dentro do ZIP).
2. Abra o arquivo **index.html** no Chrome, Edge ou Firefox atualizado.
3. A matriz inicial já contém os **30 termos de História da Arte**, em 10 trios.
4. Utilize **SORTEAR PEDRA** para começar; escolha uma planilha diferente para trocar de tema.
5. Para compartilhar como site, publique **os mesmos arquivos e pastas** em um site estático, como GitHub Pages.

**Importante:** o aplicativo é feito em **JavaScript**, linguagem de programação para navegadores (e não Java).

## 2. Formatos de matriz

Importe arquivos `.xlsx` ou `.csv` (codificação UTF-8, de preferência).

### A. Matriz com grupos (trios)

| Movimento | Representante 1 | Representante 2 |
|---|---|---|
| Barroco | Caravaggio | Rembrandt |
| Cubismo | Picasso | Braque |

Selecione a regra **Vinculado: 1º item + demais da linha**. A primeira pedra do grupo sai aleatoriamente dentre os grupos disponíveis; as pedras restantes seguem na sequência definida na linha. O sorteio do próximo grupo só começa depois do fim do grupo atual. Funciona também com pares ou com linhas de mais de três itens.

### B. Matriz de números ou palavras independentes

| Pedra |
|---|
| 2 |
| 3 |
| 5 |
| 7 |

Selecione **Individual: todas as pedras aleatórias**. Funciona também com arquivos numéricos organizados em várias colunas, como uma matriz 5×5. A aplicação detecta automaticamente matrizes formadas só por números como independentes.

### C. Digitação manual

Clique em **Inserir pedras manualmente**. Digite uma linha por pedra ou uma linha por grupo, separando os membros do grupo por ponto e vírgula (`;`).

## 3. Linhas, colunas e ajuste de tamanho

- A matriz central possui **Linhas** e **Colunas** configuráveis.
- Com **Ajustar linhas ao total de pedras** ativo, a quantidade de linhas é recalculada automaticamente.
- O tamanho do texto diminui quando necessário e a altura da célula aumenta para frases longas. O texto completo também aparece ao passar o cursor sobre a célula.
- As dimensões da matriz e **das cartelas individuais** são independentes. Na lateral direita, configure as linhas e colunas das cartelas dos estudantes. Clique no nome de um aluno para abrir sua cartela.
- O programa evita ocultar pedras quando a quantidade configurada de posições é menor que o número de itens.

## 4. Planilha dos alunos

Aceita `.xlsx` ou `.csv`, nos seguintes layouts:

**Formato amplo (uma linha por participante):**

| Participante | Pedra 1 | Pedra 2 | Pedra 3 |
|---|---|---|---|
| Ana | Barroco | Picasso | Monet |
| João | Cubismo | Caravaggio | Dalí |

**Formato longo (uma linha por pedra):**

| Participante | Pedra |
|---|---|
| Ana | Barroco |
| Ana | Picasso |
| João | Cubismo |
| João | Dalí |

Também aceita uma planilha `.xlsx` com **uma aba por aluno**: o nome da aba passa a ser o nome do aluno e todas as células preenchidas são interpretadas como pedras, exceto abas denominadas Matriz, Modelo ou Instruções.

A planilha `modelos/modelo_cartelas_alunos.xlsx` contém 10 alunos fictícios, com 20 pedras por cartela.

**Comparação das cartelas:** ignora diferenças entre maiúsculas e minúsculas, acentos e espaços extras. Por exemplo, “Cezanne” corresponde a “Cézanne”. Alguns nomes artísticos completos usuais também são reconhecidos. Termos que não existem na matriz são exibidos em vermelho na cartela detalhada e listados como inconsistências no relatório.

## 5. Sorteio, cores e classificação

- **Azul:** pedra não sorteada.
- **Verde:** pedra já sorteada.
- **Amarelo:** última pedra sorteada.
- O histórico é exibido do mais recente para o mais antigo.
- O progresso dos alunos é atualizado a cada sorteio, por exemplo `13/20`.
- Os participantes com mais acertos aparecem primeiro, enquanto quem completou a cartela aparece no topo.
- **Critério de classificação final:** a colocação de quem completou é definida pelo sorteio em que completou a cartela, não pelo nome. Participantes que concluem no **mesmo sorteio** recebem a mesma classificação. Exemplo: 1º Ana, 2º Pedro, 2º João.
- Clique em um participante para abrir sua cartela, organizada nas dimensões escolhidas, com a situação de cada pedra.
- **REINICIAR** apaga apenas o histórico de sorteios; conserva a matriz e as cartelas importadas.

## 6. Salvar, exportar e importar

O programa tenta salvar o andamento automaticamente no armazenamento local do navegador. Este armazenamento pode estar indisponível em janelas privadas ou em algumas configurações de abertura por arquivo local. Para não depender dele, utilize:

- **Exportar sessão:** arquivo `.json` com matriz, sorteios, participantes e configurações.
- **Importar sessão:** restaura esse arquivo para continuar a atividade, inclusive em outro computador.
- **Baixar relatório de resultados CSV:** classificação e progresso de cada aluno, incluindo pedras não reconhecidas.
- **Exportar matriz CSV** e **Baixar modelo de cartelas CSV**.

Não há sincronização automática entre aparelhos nem uma área com login de alunos; o monitoramento e a conferência são feitos no navegador em que a atividade está sendo executada. Os dados carregados não são enviados pela aplicação a terceiros.

## 7. Arquivos do projeto

```
bingo_web_arte/
├── index.html                Página principal
├── styles.css                Estilo, cores e responsividade
├── app.js                    Interface, importações, classificação e aviso de vitória
├── logic.js                  Sorteios e conferência das cartelas
├── fullscreen.css            Projeção em tela cheia
├── winners.css               Pop-up de vencedores e empates
├── vendor/
│   ├── jszip.min.js          Leitura de XLSX sem internet
│   └── LICENCA_JSZIP.md
└── modelos/
    ├── matriz_movimentos_artisticos.xlsx
    ├── matriz_movimentos_artisticos.csv
    ├── matriz_numeros_primos.xlsx
    ├── matriz_numeros_primos.csv
    ├── modelo_cartelas_alunos.xlsx
    ├── modelo_cartelas_alunos.csv
    ├── matriz_demo_vitoria.csv
    └── cartelas_demo_vitoria.csv
```

## 8. Publicação no GitHub Pages

1. Crie um repositório e envie `index.html`, `styles.css`, `fullscreen.css`, `winners.css`, `app.js`, `logic.js`, a pasta `vendor/` e, se desejar, a pasta `modelos/`.
2. Em **Settings → Pages**, escolha publicar a partir da branch principal e da pasta raiz.
3. Abra o endereço gerado após a publicação. O site funciona em celulares, notebooks e computadores.

**Observação:** para usar o site nos computadores dos alunos, cada um terá sua própria sessão local. A opção de exportar/importar JSON permite transferir o andamento manualmente.

## 9. Limites e cuidados

- Até **1.000 pedras** por matriz, **3.000 participantes** e **1.000 pedras** por cartela, com limite de arquivo de 12 MB. Configurações muito grandes podem afetar o desempenho de aparelhos modestos.
- Importa `.xlsx` e `.csv`, **não** `.xls`, `.ods` ou arquivos Excel protegidos por senha.
- Em planilhas complexas, utilize dados efetivos (não fórmulas sem valor calculado armazenado).
- Evite identificações pessoais sensíveis em planilhas de demonstração e não compartilhe exportações de sessões contendo dados de estudantes em locais públicos.

A interface foi testada com importações reais de XLSX e CSV e com a execução de 30 sorteios vinculados até o preenchimento de 10 cartelas de demonstração.
