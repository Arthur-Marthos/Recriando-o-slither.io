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

### Servidor multiplayer

Publique a pasta `server` como um Web Service Node que suporte conexões WebSocket, por exemplo no Render ou Railway. Use `npm install` como build e `npm start` como comando de início. Configure `CLIENT_ORIGIN` com a URL do frontend publicado e `PORT` conforme fornecido pelo host. A rota `/health` retorna o estado do serviço.

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
