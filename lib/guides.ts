export type GuideSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type Guide = {
  slug: string;
  title: string;
  description: string;
  category: string;
  categoryLabel: string;
  readingTime: string;
  intro: string;
  sections: GuideSection[];
  related: string[];
};

export const guideCategories = [
  {
    slug: "lucro-e-faturamento",
    label: "Lucro e faturamento",
    description: "Entenda o que realmente sobra depois de taxas, combustível, manutenção e outras despesas.",
  },
  {
    slug: "custos-e-combustivel",
    label: "Custos e combustível",
    description: "Aprenda a medir os custos que mais reduzem o resultado do seu dia de trabalho.",
  },
  {
    slug: "produtividade-e-rotina",
    label: "Produtividade e rotina",
    description: "Compare horários, dias, distância percorrida e esforço para trabalhar com mais clareza.",
  },
  {
    slug: "relatorios-e-organizacao",
    label: "Relatórios e organização",
    description: "Organize lançamentos e use históricos para enxergar tendências sem depender da memória.",
  },
] as const;

export const guides: Guide[] = [
  {
    slug: "lucro-real-motorista-app",
    title: "Como calcular o lucro real de um motorista de aplicativo",
    description: "Veja a diferença entre faturamento e lucro e aprenda uma conta simples para descobrir quanto realmente sobrou no dia.",
    category: "lucro-e-faturamento",
    categoryLabel: "Lucro e faturamento",
    readingTime: "6 min",
    intro: "Faturamento é o dinheiro que entra. Lucro real é o que permanece depois de descontar todos os custos necessários para trabalhar. Confundir os dois pode fazer um dia movimentado parecer melhor do que realmente foi.",
    sections: [
      {
        heading: "Comece pela receita do período",
        paragraphs: [
          "Defina primeiro qual período você quer analisar: um turno, um dia, uma semana ou um mês. Some os valores efetivamente recebidos das plataformas e de outras corridas ou entregas realizadas no mesmo período.",
          "Se houver taxas descontadas antes do repasse, trabalhe com valores consistentes. Você pode registrar a receita bruta e a taxa separadamente ou usar a receita já líquida das plataformas, desde que não desconte a mesma taxa duas vezes.",
        ],
      },
      {
        heading: "Liste todos os custos do trabalho",
        paragraphs: [
          "Combustível costuma ser o custo mais visível, mas não é o único. Manutenção, estacionamento, pedágio, lavagem, alimentação ligada ao turno e outros gastos também podem reduzir o resultado.",
        ],
        bullets: [
          "Combustível consumido no percurso",
          "Taxas cobradas pelos aplicativos",
          "Manutenção e desgaste do veículo",
          "Pedágios, estacionamento e despesas extras",
        ],
      },
      {
        heading: "Use a fórmula do lucro real",
        paragraphs: [
          "A estrutura é simples: lucro real = receita do período − custos do período. O valor final deve ser analisado junto com o tempo trabalhado e a quilometragem, porque dois dias com o mesmo lucro podem exigir esforços muito diferentes.",
          "No FaturApp, a proposta é reunir essas informações no mesmo lançamento para que o motorista veja o resultado por dia, por hora e por quilômetro.",
        ],
      },
      {
        heading: "Transforme o número em decisão",
        paragraphs: [
          "Um resultado isolado ajuda, mas uma sequência de resultados ajuda ainda mais. Compare dias semelhantes, horários e tipos de operação. O objetivo não é adivinhar qual turno será melhor, mas entender quais combinações têm entregado melhores resultados para você.",
        ],
      },
    ],
    related: ["calcular-lucro-por-hora", "calcular-lucro-por-km", "comparar-dias-de-trabalho"],
  },
  {
    slug: "calcular-lucro-por-hora",
    title: "Como calcular lucro por hora trabalhando com Uber, 99 e outros apps",
    description: "Aprenda a dividir o lucro pelo tempo trabalhado e compare turnos com durações diferentes sem olhar apenas para o faturamento.",
    category: "lucro-e-faturamento",
    categoryLabel: "Lucro e faturamento",
    readingTime: "5 min",
    intro: "Faturar mais em um turno longo não significa necessariamente ganhar mais por hora. O lucro por hora ajuda a comparar jornadas de durações diferentes usando uma mesma referência.",
    sections: [
      {
        heading: "Calcule primeiro o lucro, não a receita",
        paragraphs: [
          "Antes de dividir qualquer valor pelas horas, desconte os custos do período. Usar o faturamento bruto por hora pode esconder combustível, taxas e outras despesas que aconteceram durante o turno.",
        ],
      },
      {
        heading: "Fórmula do lucro por hora",
        paragraphs: [
          "Depois de encontrar o lucro real, divida esse valor pelas horas efetivamente dedicadas ao trabalho. Exemplo: se sobraram R$ 120 em 10 horas, o resultado foi de R$ 12 por hora.",
          "Se você contabiliza tempo de espera, deslocamento para iniciar o turno ou intervalos, mantenha o mesmo critério em todos os dias para que a comparação seja justa.",
        ],
      },
      {
        heading: "Compare turnos parecidos",
        paragraphs: [
          "Compare dias da semana e faixas de horário semelhantes. Um sábado à noite não precisa ser comparado diretamente com uma terça de manhã. A utilidade do indicador aumenta quando o contexto também é parecido.",
        ],
      },
      {
        heading: "Use junto com lucro por km",
        paragraphs: [
          "Lucro por hora mede a eficiência do tempo. Lucro por quilômetro mede a eficiência do deslocamento. Usar os dois indicadores evita otimizar um lado e piorar o outro.",
        ],
      },
    ],
    related: ["lucro-real-motorista-app", "calcular-lucro-por-km", "quanto-precisa-faturar-para-compensar"],
  },
  {
    slug: "calcular-lucro-por-km",
    title: "Como calcular lucro por quilômetro no trabalho de motorista",
    description: "Descubra quanto sobra a cada quilômetro rodado e por que esse indicador ajuda a enxergar o impacto da distância no resultado.",
    category: "lucro-e-faturamento",
    categoryLabel: "Lucro e faturamento",
    readingTime: "5 min",
    intro: "Rodar muito pode aumentar a receita e, ao mesmo tempo, elevar combustível e desgaste. O lucro por quilômetro coloca o resultado em relação à distância percorrida.",
    sections: [
      {
        heading: "Registre a quilometragem do período",
        paragraphs: [
          "Use a diferença entre o hodômetro inicial e final ou outra medição confiável. O ideal é considerar todos os quilômetros ligados ao trabalho, inclusive deslocamentos sem passageiro quando fizerem parte da operação.",
        ],
      },
      {
        heading: "Fórmula do lucro por km",
        paragraphs: [
          "Depois de calcular o lucro real do período, divida pelo total de quilômetros. Se sobraram R$ 150 após 100 km, o lucro foi de R$ 1,50 por km.",
        ],
      },
      {
        heading: "Não confunda ganho por km com lucro por km",
        paragraphs: [
          "Ganho por km pode considerar apenas receita dividida pela distância. Lucro por km já incorpora os custos registrados. Para avaliar o que realmente ficou, o segundo indicador é mais completo.",
        ],
      },
      {
        heading: "Observe a tendência, não um único número",
        paragraphs: [
          "Compare uma sequência de dias. Um percurso atípico pode distorcer um turno específico; o histórico mostra com mais clareza quando a quilometragem está consumindo uma parte maior do resultado.",
        ],
      },
    ],
    related: ["custo-combustivel-por-km", "manutencao-no-custo-do-dia", "comparar-dias-de-trabalho"],
  },
  {
    slug: "custo-combustivel-por-km",
    title: "Como calcular o custo de combustível por quilômetro",
    description: "Use consumo médio, preço do litro e distância para estimar quanto do seu faturamento foi gasto apenas com combustível.",
    category: "custos-e-combustivel",
    categoryLabel: "Custos e combustível",
    readingTime: "6 min",
    intro: "Combustível é um dos custos mais frequentes da rotina. Medir o custo por quilômetro ajuda a entender quanto cada deslocamento consome antes mesmo de considerar outras despesas.",
    sections: [
      {
        heading: "Descubra o consumo do veículo",
        paragraphs: [
          "Use uma média em km/L compatível com a forma como você realmente dirige. Trânsito urbano, ar-condicionado, carga e estilo de condução podem alterar o consumo em relação ao valor de catálogo.",
        ],
      },
      {
        heading: "Calcule litros usados no percurso",
        paragraphs: [
          "Divida os quilômetros rodados pelo consumo médio. Se um veículo faz 10 km/L e percorre 100 km, a estimativa é de 10 litros consumidos.",
        ],
      },
      {
        heading: "Converta em custo financeiro",
        paragraphs: [
          "Multiplique os litros pelo preço do combustível. Se foram 10 litros a R$ 6,00, o custo estimado foi de R$ 60,00. Dividindo esse valor por 100 km, você encontra R$ 0,60 de combustível por km.",
        ],
      },
      {
        heading: "Atualize quando o preço ou consumo mudar",
        paragraphs: [
          "Uma média antiga perde utilidade quando o preço do litro ou o consumo do veículo muda. Atualize os parâmetros periodicamente e mantenha o mesmo critério nos dias que serão comparados.",
        ],
      },
    ],
    related: ["calcular-lucro-por-km", "manutencao-no-custo-do-dia", "organizar-despesas-motorista"],
  },
  {
    slug: "taxa-dos-aplicativos-impacto",
    title: "Como as taxas dos aplicativos afetam o lucro do motorista",
    description: "Entenda por que a taxa da plataforma deve aparecer separada da receita e como evitar descontá-la duas vezes nos seus cálculos.",
    category: "custos-e-combustivel",
    categoryLabel: "Custos e combustível",
    readingTime: "5 min",
    intro: "A taxa do aplicativo reduz o valor que chega ao motorista e precisa ser tratada de forma consistente. O principal cuidado é saber se você está registrando receita bruta ou valor já recebido após o desconto.",
    sections: [
      {
        heading: "Escolha um padrão de registro",
        paragraphs: [
          "Se você registra a receita bruta, registre também a taxa separadamente. Se registra apenas o valor líquido repassado, não desconte novamente a mesma taxa. Misturar os dois métodos gera resultado incorreto.",
        ],
      },
      {
        heading: "Compare plataformas pelo resultado final",
        paragraphs: [
          "A taxa isolada não conta toda a história. Tempo, distância, demanda e outros custos também mudam. Compare o lucro final por hora e por km em períodos semelhantes.",
        ],
      },
      {
        heading: "Evite usar uma taxa fixa quando ela varia",
        paragraphs: [
          "Se a plataforma apresenta descontos diferentes por corrida ou categoria, uma porcentagem genérica pode servir apenas como estimativa. Para análise real do seu histórico, prefira os valores efetivamente registrados.",
        ],
      },
      {
        heading: "Use o histórico para identificar padrões",
        paragraphs: [
          "Ao separar taxa e receita, você consegue observar como a relação entre os dois componentes muda ao longo do tempo sem perder de vista combustível e demais custos.",
        ],
      },
    ],
    related: ["lucro-real-motorista-app", "comparar-dias-de-trabalho", "relatorio-mensal-motorista-app"],
  },
  {
    slug: "manutencao-no-custo-do-dia",
    title: "Como considerar manutenção e desgaste no custo do dia",
    description: "Veja formas simples de não esquecer pneus, óleo, revisão e desgaste quando analisar o resultado do trabalho com o veículo.",
    category: "custos-e-combustivel",
    categoryLabel: "Custos e combustível",
    readingTime: "6 min",
    intro: "Manutenção não acontece todos os dias, mas o desgaste acontece enquanto o veículo roda. Por isso, olhar apenas para combustível pode superestimar o que realmente sobra.",
    sections: [
      {
        heading: "Separe despesas imediatas e desgaste",
        paragraphs: [
          "Uma troca de óleo paga hoje é uma despesa imediata. Já pneus, revisão e componentes têm vida útil maior. Você pode registrar o gasto quando ele acontece e, se quiser uma análise mais refinada, também trabalhar com uma reserva média por quilômetro.",
        ],
      },
      {
        heading: "Não invente um valor universal",
        paragraphs: [
          "Veículo, idade, uso, peças e região mudam muito o custo. Use seu próprio histórico de manutenção para chegar a uma estimativa que faça sentido para sua realidade.",
        ],
      },
      {
        heading: "Relacione manutenção com quilometragem",
        paragraphs: [
          "Quando uma despesa ocorre em função do uso, acompanhar o custo em relação aos quilômetros ajuda a visualizar como dias mais longos também aceleram o desgaste.",
        ],
      },
      {
        heading: "Reavalie sua média periodicamente",
        paragraphs: [
          "Depois de alguns meses, compare o que você reservou com o que realmente gastou. Ajuste a média para que o cálculo continue útil em vez de virar apenas um número fixo sem relação com a realidade.",
        ],
      },
    ],
    related: ["custo-combustivel-por-km", "organizar-despesas-motorista", "calcular-lucro-por-km"],
  },
  {
    slug: "organizar-despesas-motorista",
    title: "Como organizar despesas de motorista de aplicativo sem planilha complicada",
    description: "Crie uma rotina simples de registro para combustível, manutenção, taxas e extras sem depender da memória no fim do mês.",
    category: "relatorios-e-organizacao",
    categoryLabel: "Relatórios e organização",
    readingTime: "6 min",
    intro: "A organização precisa caber na rotina. Um sistema perfeito que demora demais para preencher costuma ser abandonado; um registro simples e consistente tende a gerar dados mais úteis.",
    sections: [
      {
        heading: "Registre no mesmo dia",
        paragraphs: [
          "Quanto mais tempo passa, maior a chance de esquecer pequenos gastos. Reserve um momento no fim do turno para lançar ganhos, quilômetros, horas e despesas que realmente aconteceram.",
        ],
      },
      {
        heading: "Use poucas categorias claras",
        paragraphs: [
          "Combustível, manutenção, taxas e extras já cobrem grande parte da rotina. Você pode detalhar quando necessário, mas evite criar tantas categorias que o registro vire uma tarefa pesada.",
        ],
      },
      {
        heading: "Mantenha critérios consistentes",
        paragraphs: [
          "Se alimentação entra como custo do turno em um dia e não entra no outro, a comparação perde qualidade. Defina seus critérios e aplique-os da mesma forma sempre que possível.",
        ],
      },
      {
        heading: "Revise o acumulado por período",
        paragraphs: [
          "O valor de um único dia responde o que aconteceu naquele turno. Um relatório semanal ou mensal mostra tendências, recorrência de gastos e períodos em que o resultado ficou mais apertado.",
        ],
      },
    ],
    related: ["relatorio-mensal-motorista-app", "comparar-dias-de-trabalho", "lucro-real-motorista-app"],
  },
  {
    slug: "comparar-dias-de-trabalho",
    title: "Como comparar dias de trabalho e descobrir quais renderam melhor",
    description: "Compare lucro, horas e quilômetros para entender quais turnos foram realmente mais eficientes para você.",
    category: "produtividade-e-rotina",
    categoryLabel: "Produtividade e rotina",
    readingTime: "5 min",
    intro: "Comparar apenas o faturamento favorece dias longos e movimentados. Para saber quais turnos renderam melhor, coloque lucro, tempo e distância na mesma análise.",
    sections: [
      {
        heading: "Compare lucro líquido",
        paragraphs: [
          "Comece pelo que sobrou depois dos custos. Dois dias podem ter a mesma receita e resultados muito diferentes se um deles consumiu mais combustível ou exigiu mais despesas.",
        ],
      },
      {
        heading: "Olhe lucro por hora",
        paragraphs: [
          "Esse indicador normaliza turnos de durações diferentes. Ele ajuda a responder se o tempo adicional realmente trouxe retorno proporcional.",
        ],
      },
      {
        heading: "Olhe lucro por km",
        paragraphs: [
          "Esse indicador mostra como a distância impactou o resultado. Um dia pode ser bom por hora e ruim por km, ou o contrário; por isso os dois devem ser vistos juntos.",
        ],
      },
      {
        heading: "Agrupe contextos parecidos",
        paragraphs: [
          "Compare segunda com segunda, manhã com manhã ou eventos semelhantes quando houver dados suficientes. Isso reduz conclusões precipitadas baseadas em situações muito diferentes.",
        ],
      },
    ],
    related: ["calcular-lucro-por-hora", "calcular-lucro-por-km", "relatorio-mensal-motorista-app"],
  },
  {
    slug: "quanto-precisa-faturar-para-compensar",
    title: "Quanto um motorista precisa faturar para o dia compensar?",
    description: "Monte uma meta baseada em custos e lucro desejado, em vez de escolher um faturamento bruto aleatório.",
    category: "produtividade-e-rotina",
    categoryLabel: "Produtividade e rotina",
    readingTime: "6 min",
    intro: "Não existe um valor único que faça um dia compensar para todos os motoristas. O ponto de referência depende dos seus custos, do veículo, das horas e do lucro que você considera adequado.",
    sections: [
      {
        heading: "Comece pelo custo esperado",
        paragraphs: [
          "Estime combustível, taxas e demais despesas do turno usando seu próprio histórico. Quanto mais realistas os custos, mais útil será a meta.",
        ],
      },
      {
        heading: "Defina o lucro que você quer preservar",
        paragraphs: [
          "Em vez de pensar apenas em faturar um valor, pense em quanto precisa sobrar. A meta de faturamento deve cobrir os custos e ainda entregar o lucro desejado.",
        ],
      },
      {
        heading: "Converta em meta por hora",
        paragraphs: [
          "Dividir a meta pelo número de horas previstas ajuda a acompanhar o ritmo do turno. Ainda assim, evite tomar decisões com base em poucos minutos ou uma única corrida; observe o período como um todo.",
        ],
      },
      {
        heading: "Recalcule quando seus custos mudarem",
        paragraphs: [
          "Preço do combustível, manutenção e condições de trabalho mudam. Uma meta baseada em custos antigos pode deixar de representar o resultado que você espera.",
        ],
      },
    ],
    related: ["lucro-real-motorista-app", "calcular-lucro-por-hora", "custo-combustivel-por-km"],
  },
  {
    slug: "relatorio-mensal-motorista-app",
    title: "Como montar um relatório mensal do trabalho como motorista de app",
    description: "Saiba quais números acompanhar no mês para enxergar receita, custos, lucro, horas e quilômetros com mais clareza.",
    category: "relatorios-e-organizacao",
    categoryLabel: "Relatórios e organização",
    readingTime: "7 min",
    intro: "O relatório mensal transforma dezenas de dias isolados em uma visão de conjunto. Ele ajuda a perceber tendências que não aparecem quando você olha apenas para o último turno.",
    sections: [
      {
        heading: "Consolide receita, custos e lucro",
        paragraphs: [
          "Some os lançamentos do período e mantenha receita, taxas, combustível, manutenção e extras separados. O lucro mensal vem da diferença entre o que entrou e o que foi gasto.",
        ],
      },
      {
        heading: "Inclua horas e quilômetros",
        paragraphs: [
          "O total mensal é importante, mas os indicadores por hora e por km mostram se o resultado cresceu porque você trabalhou de forma mais eficiente ou simplesmente porque trabalhou mais.",
        ],
      },
      {
        heading: "Compare semanas e dias",
        paragraphs: [
          "Divida o mês em períodos menores para localizar mudanças. Uma semana pode ter puxado o resultado para cima ou para baixo e merece ser analisada separadamente.",
        ],
      },
      {
        heading: "Use o relatório para ajustar a rotina",
        paragraphs: [
          "Procure padrões recorrentes em vez de reagir a um único dia. O histórico não garante o futuro, mas oferece uma base melhor para decidir onde vale a pena testar mudanças na sua rotina.",
        ],
      },
    ],
    related: ["organizar-despesas-motorista", "comparar-dias-de-trabalho", "lucro-real-motorista-app"],
  },
];

export function getGuide(slug: string) {
  return guides.find((guide) => guide.slug === slug);
}

export function getCategory(slug: string) {
  return guideCategories.find((category) => category.slug === slug);
}

export function getGuidesByCategory(category: string) {
  return guides.filter((guide) => guide.category === category);
}
