# Supabase Env

Crie um arquivo local `frontend/.env` baseado em `frontend/.env.example`.

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Use apenas a Project URL e a Publishable key / anon public key no app.

Nunca coloque no app:

- `service_role` key
- senha real
- Mercado Pago Access Token
- qualquer secret de backend

Sem essas variáveis, o app mantém o fallback local com AsyncStorage/mock.
