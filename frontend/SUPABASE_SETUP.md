# Supabase Setup

1. Acesse https://supabase.com.
2. Crie um projeto.
3. Copie o Project URL.
4. Copie a Publishable key / anon public key.
5. Crie um `frontend/.env` local baseado em `frontend/.env.example`.
6. Cole URL e key:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

7. Abra o SQL Editor no Supabase.
8. Rode `frontend/supabase/migrations/001_initial_schema.sql`.
9. Rode `frontend/supabase/seed.sql`.
10. Crie a conta `Filhosamuel679@gmail.com` no Auth ou pelo app.
11. Rode o SQL de promoção para `super_admin` descrito em `frontend/supabase/ADMIN_SETUP.md`.
12. Rode o app no Expo Go.
13. Teste login.
14. Teste CRUD admin.
15. Teste cliente criando pedido.
16. Teste motorista aceitando pedido.

Sem `.env`, o app continua usando mock/AsyncStorage. Com `.env`, os services usam Supabase.
