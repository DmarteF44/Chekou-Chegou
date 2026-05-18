# Segurança

O app mobile não é fonte de verdade. Um APK pode ser modificado, chamadas de rede podem ser inspecionadas e dados locais como AsyncStorage podem ser alterados.

Regras do projeto:

- RLS no Supabase é obrigatório para todas as tabelas.
- `service_role` key nunca vai no app.
- Mercado Pago Access Token nunca vai no app.
- Senhas e secrets não devem ser commitados.
- O app usa apenas `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Admin, pagamentos, carteira de entregador e mudanças sensíveis precisam ser validados no servidor.
- Pagamentos reais exigirão webhooks.
- Edge Functions serão usadas futuramente para operações sensíveis.

As funções em `src/services/securityService.ts` ajudam a UX, mas as validações reais devem existir também no banco/backend.
