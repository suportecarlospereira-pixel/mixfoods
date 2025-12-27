
import { Product } from './types';

export const INITIAL_TABLE_COUNT = 15;

export const CATEGORIES = [
  { id: 'tradicionais', name: 'Lanches Tradicionais', icon: '🍔' },
  { id: 'gourmet', name: 'Lanches Gourmet', icon: '✨' },
  { id: 'hotdogs', name: 'Hot Dogs', icon: '🌭' },
  { id: 'combos', name: 'Combos Mix', icon: '🍟' },
  { id: 'portions', name: 'Porções de Batata', icon: '🍟' },
  { id: 'drinks', name: 'Refrigerantes', icon: '🥤' },
  { id: 'water', name: 'Água', icon: '💧' },
  { id: 'beer', name: 'Cervejas', icon: '🍺' },
  { id: 'acai', name: 'Açaí', icon: '🍇' },
  { id: 'acai_extras', name: 'Adicionais Açaí', icon: '➕' },
  { id: 'icecream', name: 'Sorvetes', icon: '🍦' },
];

export const PRODUCTS: Product[] = [
  // Lanches Tradicionais
  { id: 'tr1', name: 'Mix Burguer (Pão, hamb, queijo cheddar)', price: 14.99, category: 'tradicionais', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400' },
  { id: 'tr2', name: 'Mix Salada (Pão, hamb, queijo, presunto, milho, ervilha, pepino, palha, alface, tomate)', price: 17.99, category: 'tradicionais', image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400' },
  { id: 'tr3', name: 'Mix Egg (Pão, hamb, queijo, presunto, ovo, milho, ervilha, pepino, alface, tomate)', price: 19.99, category: 'tradicionais', image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400' },
  { id: 'tr4', name: 'Mix Frango (Pão, frango, queijo, milho, ervilha, pepino, palha, alface, tomate)', price: 22.00, category: 'tradicionais', image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400' },
  { id: 'tr5', name: 'Mix Coração (Coração, queijo, milho, ervilha, palha, pepino, alface, tomate)', price: 23.00, category: 'tradicionais', image: 'https://images.unsplash.com/photo-1560684352-8497838a2229?w=400' },
  { id: 'tr6', name: 'Mix Tudão (Hamb, ovo, frango, coração, bacon, calabresa, queijo, milho, ervilha, pepino, alface, tomate)', price: 29.99, category: 'tradicionais', image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400' },

  // Lanches Gourmet
  { id: 'gm1', name: 'Mix Tasty (Hamb duplo, cheddar, molho especial, alface, tomate, pepino)', price: 23.00, category: 'gourmet', image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400' },
  { id: 'gm2', name: 'Mix Bacon (INDISPONÍVEL)', price: 0, category: 'gourmet', image: 'https://images.unsplash.com/photo-1547584370-2cc98b8b8dc8?w=400' },
  { id: 'gm3', name: 'Mix Costela (INDISPONÍVEL)', price: 0, category: 'gourmet', image: 'https://images.unsplash.com/photo-1521305916504-4a1121188589?w=400' },

  // Hot Dogs
  { id: 'hd1', name: 'Mix Dog (Salsicha dupla, molho, milho, ervilha, vinagrete, palha)', price: 13.00, category: 'hotdogs', image: 'https://images.unsplash.com/photo-1612392062631-94dd858cba88?w=400' },
  { id: 'hd2', name: 'Mix Dog Bacon (Salsicha dupla, molho, milho, ervilha, vinagrete, palha, queijo cheddar/catupiry)', price: 15.00, category: 'hotdogs', image: 'https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?w=400' },

  // Combos
  { id: 'cb1', name: 'Combo Mix Kids (Hamb queijo + Fritas 250g + Coca Mini)', price: 16.00, category: 'combos', image: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=400' },
  { id: 'cb2', name: 'Combo Mix (Hamb queijo, molho, alface, tomate + Fritas 250g + Coca Mini)', price: 19.99, category: 'combos', image: 'https://images.unsplash.com/photo-1534790566855-4cb788d389ec?w=400' },

  // Porções
  { id: 'pt1', name: 'Batata Frita 500g', price: 19.99, category: 'portions', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400' },
  { id: 'pt2', name: 'Batata Frita 1kg', price: 29.99, category: 'portions', image: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=400' },
  { id: 'pt_ad1', name: 'Adicional Cebolinha (Porção)', price: 3.00, category: 'portions', image: 'https://images.unsplash.com/photo-1584270354949-c26b0d5b4a0c?w=400' },
  { id: 'pt_ad2', name: 'Adicional Queijo (Porção)', price: 4.00, category: 'portions', image: 'https://images.unsplash.com/photo-1485962391905-13a0bb3a4691?w=400' },
  { id: 'pt_ad3', name: 'Adicional Bacon (Porção)', price: 5.00, category: 'portions', image: 'https://images.unsplash.com/photo-1606851682841-a88072c18f51?w=400' },
  { id: 'pt_ad4', name: 'Adicional Cheddar (Porção)', price: 5.00, category: 'portions', image: 'https://images.unsplash.com/photo-1518331647614-7a1f04cd34cf?w=400' },

  // Bebidas
  { id: 'dr1', name: 'Coca Cola 2L', price: 18.00, category: 'drinks', image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400' },
  { id: 'dr2', name: 'Garrafa KS 1L', price: 9.00, category: 'drinks', image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400' },
  { id: 'dr3', name: 'Garrafa KS 350ml (INDISPONÍVEL)', price: 0, category: 'drinks', image: 'https://images.unsplash.com/photo-1629203851020-9dd23b658118?w=400' },
  { id: 'dr4', name: 'Lata 350ml', price: 6.00, category: 'drinks', image: 'https://images.unsplash.com/photo-1567103473067-adc58139c47c?w=400' },
  { id: 'dr5', name: 'Mini 200ml', price: 3.00, category: 'drinks', image: 'https://images.unsplash.com/photo-1594498653385-d5172c532c00?w=400' },

  // Água
  { id: 'wt1', name: 'Água com gás 500ml', price: 3.00, category: 'water', image: 'https://images.unsplash.com/photo-1559839914-17aae19cea9e?w=400' },
  { id: 'wt2', name: 'Água sem gás 500ml', price: 3.00, category: 'water', image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400' },

  // Cervejas
  { id: 'br1', name: 'Brahma 600ml', price: 12.00, category: 'beer', image: 'https://images.unsplash.com/photo-1618885472179-5e474019f2a9?w=400' },
  { id: 'br2', name: 'Heineken 600ml', price: 12.00, category: 'beer', image: 'https://images.unsplash.com/photo-1618885472179-5e474019f2a9?w=400' },
  { id: 'br3', name: 'Amstel 600ml', price: 12.00, category: 'beer', image: 'https://images.unsplash.com/photo-1618885472179-5e474019f2a9?w=400' },
  { id: 'br4', name: 'Heineken Long Neck (INDISPONÍVEL)', price: 0, category: 'beer', image: 'https://images.unsplash.com/photo-1532634733-cae13c494a95?w=400' },
  { id: 'br5', name: 'Corona Long Neck (INDISPONÍVEL)', price: 0, category: 'beer', image: 'https://images.unsplash.com/photo-1584225065152-4a1454aa3d4e?w=400' },

  // Açaí
  { id: 'ac1', name: 'Açaí 300ml (Granola, Morango ou Banana)', price: 9.99, category: 'acai', image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400' },
  { id: 'ac2', name: 'Açaí 500ml (Granola, Morango ou Banana)', price: 15.99, category: 'acai', image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400' },

  // Adicionais Açaí
  { id: 'acad1', name: 'Adicional Leite em Pó', price: 4.00, category: 'acai_extras', image: 'https://images.unsplash.com/photo-1629115916087-7e8c114a24ed?w=400' },
  { id: 'acad2', name: 'Adicional Leite Condensado', price: 4.00, category: 'acai_extras', image: 'https://images.unsplash.com/photo-1517524001402-601e33be32c5?w=400' },
  { id: 'acad3', name: 'Adicional Creme de Avelã', price: 4.00, category: 'acai_extras', image: 'https://images.unsplash.com/photo-1591291621164-2c63ae028918?w=400' },
  { id: 'acad4', name: 'Adicional Confete', price: 4.00, category: 'acai_extras', image: 'https://images.unsplash.com/photo-1581798459219-318e76aecc7b?w=400' },
  { id: 'acad5', name: 'Adicional Paçoca', price: 4.00, category: 'acai_extras', image: 'https://images.unsplash.com/photo-1534346589587-9b4b2c14072b?w=400' },
  { id: 'acad6', name: 'Adicional Kiwi', price: 4.00, category: 'acai_extras', image: 'https://images.unsplash.com/photo-1585059895524-72359e061381?w=400' },

  // Sorvetes
  { id: 'ic1', name: 'Sorvete Casquinha', price: 4.99, category: 'icecream', image: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=400' },
  { id: 'ic2', name: 'Sorvete Cascão', price: 7.99, category: 'icecream', image: 'https://images.unsplash.com/photo-1549395156-e0c1fe6fc7a5?w=400' },
];
