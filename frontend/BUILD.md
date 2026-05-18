# Build

## Expo Go

```bash
cd frontend
npm install
npx expo start
```

Abra o QR Code no Expo Go.

## EAS

Campos para preencher manualmente:

- Conta Expo:
- Projeto Expo:
- Apple Team:
- Google Play Console:
- Bundle identifier:
- Android package:

Comandos previstos:

```bash
cd frontend
npx eas login
npx eas build:configure
npx eas build --platform android
npx eas build --platform ios
```

Não coloque credenciais, senhas ou tokens neste repositório.
