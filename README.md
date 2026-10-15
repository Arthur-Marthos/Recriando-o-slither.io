# Slither Arena — jogo multiplayer em Next.js

Jogo multiplayer inspirado em arenas de cobras: colete orbes, cresça, evite colisões e dispute o ranking. O frontend usa Next.js App Router; o servidor multiplayer Socket.IO roda como um serviço Node separado.

## Requisitos

- Node.js 20.9 ou superior
- npm

## Rodar localmente

Na raiz do projeto, em um terminal PowerShell:

```powershell
npm install
npm run dev
```

Em outro terminal:

```powershell
cd server
npm install
npm run dev
```

Abra `http://localhost:3000`. A URL padrão do backend é `http://localhost:3001`; se precisar alterá-la, adicione `NEXT_PUBLIC_GAME_SERVER_URL` ao `.env` do frontend. Para jogar com outras pessoas, publique o frontend e o servidor em serviços que suportem Next.js e conexões Socket.IO persistentes.

## Publicar

### Frontend no Vercel

1. Importe o repositório no Vercel e mantenha a raiz do projeto como Root Directory.
2. Selecione Next.js ou deixe o Vercel detectar o framework.
3. Defina `NEXT_PUBLIC_GAME_SERVER_URL` com a URL HTTPS pública do servidor multiplayer.
4. Publique o projeto. O Next.js fornece os comandos de build e diretório de saída padrão.

### Servidor multiplayer no Render

O arquivo `render.yaml` já configura o servidor Node usando a pasta `server`, `npm install`, `npm start` e a verificação `/health`. O serviço precisa aceitar WebSockets; o Render Web Service oferece esse suporte.

1. Envie este repositório ao GitHub.
2. No Render, escolha **New → Blueprint**, conecte o repositório e confirme a criação do serviço `slither-arena-server`.
3. Quando o deploy terminar, copie o domínio público do serviço, por exemplo `https://slither-arena-server.onrender.com`.
4. Abra `https://SEU-DOMINIO/health`. A resposta deve conter `"ok":true`.

### Ligar a Vercel ao servidor

1. No projeto da Vercel, abra **Settings → Environment Variables**.
2. Crie `NEXT_PUBLIC_GAME_SERVER_URL` com o domínio HTTPS do Render, sem `/health` e sem barra final. Selecione **Production** e também **Preview** se usar previews.
3. Faça um novo deploy da Vercel. O Next.js incorpora variáveis `NEXT_PUBLIC_` no bundle durante o build.
4. Depois que o site publicar, copie o domínio de produção da Vercel.
5. No Render, abra o serviço e adicione `CLIENT_ORIGIN` com esse domínio exato, por exemplo `https://seu-jogo.vercel.app`. Salve e aguarde o serviço reiniciar.
6. Abra o jogo em duas abas ou dispositivos. Ambos devem entrar na mesma arena.

O servidor usa `*` como origem padrão para permitir o primeiro deploy. Depois configure `CLIENT_ORIGIN` para o domínio da Vercel. O estado do jogo fica na memória de uma instância do servidor; mantenha apenas uma instância para todos os jogadores compartilharem a mesma arena. Serviços gratuitos podem dormir quando ficam sem tráfego e demorar para responder à primeira conexão.

## Controles e responsividade

- Mouse ou toque: direcione a cobra.
- Clique/pressionamento ou barra de espaço: acelere.
- A interface ajusta o canvas, HUD, ranking e painel de personagem a telas pequenas e baixas; o painel pode rolar quando não couber na altura disponível.

## Estrutura

```text
slither-arena/
├── app/
│   ├── layout.js       # layout e metadados do Next.js
│   └── page.js         # página cliente do jogo
├── src/
│   ├── main.js         # canvas, controles, HUD e conexão Socket.IO
│   └── style.css       # interface responsiva
├── server/
│   └── server.js       # simulação da arena e servidor Socket.IO
├── next.config.mjs
└── package.json
```

O mundo da arena fica em memória no processo do servidor. Reiniciar o serviço encerra as partidas em andamento.
