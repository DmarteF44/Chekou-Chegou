insert into public.establishments (name, category, type, address, neighborhood, delivery_time, base_fee, active, image_url, notes)
values
  ('Supermercado Tosta 2', 'Mercado', 'mais_pedido', 'Jataí-GO', 'Jataí', '30-45 min', 8, true, 'https://images.unsplash.com/photo-1578916171728-46686eac8d58', 'Hortifruti, mercearia e bebidas com preço justo.'),
  ('Mercadão da Economia', 'Mercado', 'mais_pedido', 'Jataí-GO', 'Jataí', '35-50 min', 8, true, 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a', 'Tudo para a sua casa, sempre em promoção.'),
  ('Farmácia Parceira', 'Farmácia', 'teste', 'Jataí-GO', 'Jataí', '20-30 min', 8, true, 'https://images.unsplash.com/photo-1576602976047-174e57a47881', 'Medicamentos, perfumaria e cuidados pessoais.')
on conflict do nothing;

insert into public.products (establishment_id, name, category, price, active, confirm_in_store, notes)
select e.id, p.name, p.category, p.price, true, true, p.notes
from public.establishments e
join (
  values
    ('Supermercado Tosta 2', 'Arroz tipo 1 5kg', 'Mercearia', 28.90::numeric, null::text),
    ('Supermercado Tosta 2', 'Feijão carioca 1kg', 'Mercearia', 8.50::numeric, null::text),
    ('Mercadão da Economia', 'Leite integral 1L', 'Laticínios', 5.20::numeric, null::text),
    ('Mercadão da Economia', 'Coca-Cola 2L', 'Bebidas', 10.99::numeric, null::text),
    ('Supermercado Tosta 2', 'Detergente', 'Limpeza', 2.99::numeric, null::text),
    ('Mercadão da Economia', 'Pão francês kg', 'Padaria', 15.90::numeric, null::text),
    ('Farmácia Parceira', 'Dipirona 500mg', 'Medicamentos', 7.90::numeric, 'Apenas itens sem retenção de receita'),
    ('Farmácia Parceira', 'Álcool 70% 500ml', 'Higiene', 6.90::numeric, null::text)
) as p(store_name, name, category, price, notes) on p.store_name = e.name
on conflict do nothing;

insert into public.coupons (code, description, discount, type, active)
values
  ('PRIMEIRA10', 'R$10 off no primeiro pedido', 10, 'order', true),
  ('CHEKOU5', 'R$5 off em qualquer pedido', 5, 'order', true),
  ('ENTREGAOFF', 'Entrega grátis', 8, 'delivery', true),
  ('JATAI10', '10% em campanha local', 10, 'percentage', true)
on conflict (code) do nothing;

insert into public.promotions (establishment_id, title, description, discount_label, active, image_url)
select e.id, p.title, p.description, p.discount_label, true, p.image_url
from public.establishments e
join (
  values
    ('Supermercado Tosta 2', 'Hortifruti em oferta', 'Frutas e verduras com descontos fictícios para teste.', '-30%', 'https://images.unsplash.com/photo-1542838132-92c53300491e'),
    ('Mercadão da Economia', 'Bebidas geladas', 'Compre bebidas selecionadas no preço promocional.', '6x5', 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a'),
    ('Supermercado Tosta 2', 'Arroz em promoção', 'Arroz tipo 1 com preço promocional fictício.', 'Oferta', 'https://images.unsplash.com/photo-1578916171728-46686eac8d58'),
    ('Mercadão da Economia', 'Feijão em promoção', 'Feijão carioca com preço promocional fictício.', 'Oferta', 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a')
) as p(store_name, title, description, discount_label, image_url) on p.store_name = e.name
on conflict do nothing;
