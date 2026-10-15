# Slither Arena — jogo multiplayer para VS Code

Projeto de jogo .io inspirado na mecânica de cobras multiplayer: arena contínua, coleta de orbes, crescimento, aceleração, colisões, pontuação, ranking ao vivo, nomes e cores. É uma implementação original, não usa assets nem código proprietário do Slither.io.

## Importante sobre publicar online

O Vercel hospeda muito bem o **frontend**, mas não mantém um servidor Node com conexão WebSocket persistente para multiplayer em tempo real. Por isso, este projeto separa:
- `./` — interface do jogo (Vite), para publicar no **Vercel**;
- `./server` — servidor multiplayer Socket.IO, para publicar em um host que mantenha processos Node, como **Render** ou Railway.

Você publica os dois uma vez e configura a URL pública do servidor no Vercel. Jogadores que abrirem o link do Vercel entram na mesma arena enquanto o servidor estiver ativo.

## 1. Requisitos

- Node.js 20 ou superior
- VS Code
- Contas no GitHub, Vercel e Render (ou hospedagem Node equivalente)

## 2. Rodar localmente

Abra a pasta `slither-arena` no VS Code. Em um terminal:

```bash
npm install
cp .env.example .env
npm run dev
```

Em outro terminal, inicie o servidor:

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

Abra o endereço local mostrado pelo Vite, normalmente `http://localhost:5173`. Para testar multiplayer local, abra duas abas do navegador. A variável `VITE_SERVER_URL` padrão é `http://localhost:3001`.

No Windows PowerShell, se `cp` não funcionar, copie manualmente `.env.example` para `.env`.

## 3. Publicar o servidor multiplayer no Render

1. Envie o projeto completo para um repositório GitHub.
2. No Render, crie um **Web Service** conectado ao repositório.
3. Configure **Root Directory** como `server`.
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Crie a variável `CLIENT_ORIGIN` temporariamente como `*` para o primeiro teste. Depois de publicar o frontend, troque para a URL do Vercel, por exemplo `https://seu-jogo.vercel.app`.
7. Publique e copie a URL HTTPS do serviço, por exemplo `https://slither-arena-server.onrender.com`.
8. Teste `https://SUA-URL/health`. Deve retornar JSON com `ok: true`.

Observação: instâncias gratuitas de alguns hosts podem dormir quando ficam inativas, causando atraso na primeira conexão. Para uma experiência contínua, escolha uma instância que permaneça ativa.

## 4. Publicar o frontend no Vercel

1. No Vercel, importe o mesmo repositório.
2. Framework Preset: **Vite** (ou Other, se necessário).
3. Root Directory: raiz do repositório, não `server`.
4. Build Command: `npm run build`.
5. Output Directory: `dist`.
6. Em **Environment Variables**, adicione:
   - Name: `VITE_SERVER_URL`
   - Value: URL HTTPS do servidor Render, sem barra final.
7. Faça deploy. Se mudar essa variável depois, faça um novo deploy.
8. Volte ao Render e configure `CLIENT_ORIGIN` para a URL exata do frontend, por exemplo `https://seu-jogo.vercel.app`, e faça redeploy/restart do serviço.

## 5. Estrutura

```text
slither-arena/
├── src/
│   ├── main.js       # canvas, controles, HUD, ranking e conexão Socket.IO
│   └── style.css     # interface responsiva
├── server/
│   ├── server.js     # estado do mundo, movimento, comida, colisões e Socket.IO
│   └── package.json
├── index.html
├── package.json
├── .env.example
└── vercel.json
```

## Controles

- Mouse ou toque: direciona a cabeça.
- Clique/pressionamento ou barra de espaço: acelera.
- O jogo é responsivo e pode ser aberto em computador ou celular.

## Configurações principais

No `server/server.js`:
- `WORLD`: tamanho do mundo.
- `FOOD_TARGET`: quantidade de orbes mantida na arena.
- `TICK`: atualizações do servidor por segundo.
- `BASE_SPEED` e `BOOST_SPEED`: velocidades.
- Limite de 120 jogadores simultâneos por processo; ajuste conforme a capacidade do host.

## Limitações e próximos passos

Esta é uma base jogável e multiplayer, mas não pretende reproduzir exatamente o produto original. Para produção pública, recomenda-se adicionar autenticação/limite de conexões, validação de frequência dos eventos, interpolação preditiva, reconexão de sessão, salas regionais, persistência de recordes, telemetria e testes de carga. O estado é mantido em memória: reiniciar o servidor reinicia a arena e desconecta os jogadores. O servidor atual é uma única instância; escalar horizontalmente exige um adaptador Socket.IO e estado compartilhado.
