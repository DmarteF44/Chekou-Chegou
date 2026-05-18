# Build

## Seguranca

Nao coloque credenciais, senhas, tokens Expo, `service_role`, Mercado Pago Access Token ou `.env` real no GitHub.

Preencha manualmente no terminal, no painel do Expo/EAS ou em um `.env` local ignorado pelo Git:

- Expo login:
- Expo senha:
- Supabase URL:
- Supabase publishable key:

## APK de teste

```bash
npm install -g eas-cli
eas login
cd frontend
yarn install
eas build:configure
eas build -p android --profile preview
```

O perfil `preview` gera APK interno para teste em celular.

## Expo Go

```bash
cd frontend
yarn install
npx expo start -c
```

Abra o QR Code no Expo Go quando o ambiente permitir.

## AAB de producao

```bash
cd frontend
yarn build:aab
```
