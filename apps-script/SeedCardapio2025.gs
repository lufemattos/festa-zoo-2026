/**
 * Pré-carga do cardápio de REFERÊNCIA (festa de 2025). Valores antigos, só ponto de partida.
 * Como usar: no Apps Script, selecione seedCardapio2025 e clique em Executar (uma única vez).
 * Os itens entram com status "ref. 2025" e NÃO entram nos totais do site.
 */
function seedCardapio2025() {
  const jaTem = readAll_('Cardapio').some(function (r) { return r.status === 'ref. 2025'; });
  if (jaTem) { Logger.log('Já carregado. Nada feito.'); return; }
  const itens = [
 [
  "3 Picanhas",
  594.4,
  "Churrasco"
 ],
 [
  "4 Acem Prime",
  297.28,
  "Churrasco"
 ],
 [
  "2 Maminhas",
  269.32,
  "Churrasco"
 ],
 [
  "2 Fraldinhas",
  263.68,
  "Churrasco"
 ],
 [
  "Sal Grosso 1kg",
  2.8,
  "Churrasco"
 ],
 [
  "Linguiça 3,0kg",
  101.15,
  "Churrasco"
 ],
 [
  "Ostrinha de Frango 2kg",
  46.9,
  "Churrasco"
 ],
 [
  "Coração de Frango 2kg",
  50.67,
  "Churrasco"
 ],
 [
  "3 Pães de Alho",
  48.6,
  "Churrasco"
 ],
 [
  "4 Queijos Qualho",
  79.58,
  "Churrasco"
 ],
 [
  "Isopor Carnes",
  37.99,
  "Churrasco"
 ],
 [
  "Espetinhos de Madeira",
  7.12,
  "Churrasco"
 ],
 [
  "Carvão 8kg",
  70.0,
  "Churrasco"
 ],
 [
  "Batata Bolinha 3kg",
  20.21,
  "Batata ao Molho"
 ],
 [
  "Mostarda 1kg",
  17.98,
  "Batata ao Molho"
 ],
 [
  "Mel de Abelha 200g",
  14.98,
  "Batata ao Molho"
 ],
 [
  "4 Limões Sicilianos",
  12.7,
  "Batata ao Molho"
 ],
 [
  "Arroz 1kg",
  3.84,
  "Acompanhamento e Decoração"
 ],
 [
  "Sal Fino 500g",
  4.98,
  "Acompanhamento e Decoração"
 ],
 [
  "Tomate Cereja 100g",
  5.98,
  "Acompanhamento e Decoração"
 ],
 [
  "Tomilho 50g",
  7.98,
  "Acompanhamento e Decoração"
 ],
 [
  "Manjericão 50g",
  7.98,
  "Acompanhamento e Decoração"
 ],
 [
  "1 Maço de Cheiro Verde",
  4.98,
  "Acompanhamento e Decoração"
 ],
 [
  "2 Pepinos (médio e fino)",
  2.27,
  "Acompanhamento e Decoração"
 ],
 [
  "3 Cenouras (médias)",
  3.26,
  "Acompanhamento e Decoração"
 ],
 [
  "Alho",
  2.2,
  "Acompanhamento e Decoração"
 ],
 [
  "Feijão Fradinho 1kg",
  14.09,
  "Feijão Tropeiro"
 ],
 [
  "Bacon 400g",
  23.2,
  "Feijão Tropeiro"
 ],
 [
  "Linguição Calabresa 300g",
  15.2,
  "Feijão Tropeiro"
 ],
 [
  "Farinha de Mandioca Crua 1kg",
  16.01,
  "Feijão Tropeiro"
 ],
 [
  "1 Pimentão Verde",
  1.6,
  "Feijão Tropeiro"
 ],
 [
  "1 Pimentão Vermelho",
  7.24,
  "Feijão Tropeiro"
 ],
 [
  "1 Pimentão Amarelo",
  8.24,
  "Feijão Tropeiro"
 ],
 [
  "1 Couve",
  3.98,
  "Feijão Tropeiro"
 ],
 [
  "Margarina 1kg (sem sal)",
  24.8,
  "Feijão Tropeiro"
 ],
 [
  "Peito de Frango 1kg",
  28.81,
  "Salpicão de Frango"
 ],
 [
  "Presunto 200g",
  10.76,
  "Salpicão de Frango"
 ],
 [
  "Maionese 1kg",
  25.96,
  "Salpicão de Frango"
 ],
 [
  "3 Maçãs",
  5.39,
  "Salpicão de Frango"
 ],
 [
  "Batata Palha 100g",
  7.98,
  "Salpicão de Frango"
 ],
 [
  "Páprica Defumada 100g",
  25.96,
  "Salpicão de Frango"
 ],
 [
  "Folha de Louro 50g",
  7.98,
  "Salpicão de Frango"
 ],
 [
  "Tomate 2kg",
  17.73,
  "Vinagrete"
 ],
 [
  "Cebola 1kg",
  11.84,
  "Vinagrete"
 ],
 [
  "Azeite",
  28.0,
  "Vinagrete"
 ],
 [
  "6 Limões",
  6.77,
  "Vinagrete"
 ],
 [
  "Chope (ref. 25 pessoas que bebem)",
  1950.0,
  "Bebida alcoólica"
 ],
 [
  "Vinho (20 garrafas)",
  679.4,
  "Bebida alcoólica"
 ],
 [
  "Refrigerante + água + suco",
  210.09,
  "Bebida sem álcool"
 ],
 [
  "Descartáveis",
  170.0,
  "Descartáveis"
 ],
 [
  "Banoffe (sobremesa)",
  150.0,
  "Sobremesa"
 ]
];
  itens.forEach(function (i) {
    appendRow_('Cardapio', { id: id_(), categoria: 'Ref. 2025 – ' + i[2], item: i[0], quantidade: '',
      custo_estimado: i[1], status: 'ref. 2025', responsavel: '' });
  });
  Logger.log(itens.length + ' itens de referência carregados.');
}
