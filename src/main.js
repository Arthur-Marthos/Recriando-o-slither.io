import { io } from 'socket.io-client';
import './style.css';

const SERVER_URL = process.env.NEXT_PUBLIC_GAME_SERVER_URL || 'http://localhost:3001';
const app = document.querySelector('#app');
app.innerHTML = `
<div class="game-shell">
  <canvas id="game"></canvas>
  <header class="hud"><div class="brand"><span class="brand-dot"></span> SLITHER <b>ARENA</b></div><div id="connection" class="connection">Conectando…</div></header>
  <div class="score-card"><small>SUA PONTUAÇÃO</small><strong id="score">0</strong><small id="length">Tamanho: 10</small></div>
  <aside class="leaderboard"><h3>🏆 MELHORES</h3><ol id="leaders"><li>Aguardando jogadores…</li></ol></aside>
  <div id="center-ui" class="center-ui">
    <div class="panel">
      <div class="eyebrow">MULTIPLAYER • ARENA ONLINE</div><h1>DOMINE<br><span>A ARENA.</span></h1>
      <p>Coma orbes, cresça e faça os outros jogadores colidirem com seu corpo. Sobreviva para chegar ao topo.</p>
      <label for="nickname">SEU NOME</label><input id="nickname" maxlength="18" placeholder="Digite seu apelido" value="Jogador"/>
      <div class="snake-preview" id="snake-preview" aria-label="Prévia animada da cobra"><canvas id="snake-preview-canvas" role="img" aria-label="Cobra se movendo na cor selecionada"></canvas></div>
      <div class="color-row"><span>SUA COR</span><div id="colors" class="colors"></div></div>
      <div class="appearance-grid" aria-label="Personalizar aparência">
        <label>CHAPÉU<select id="hat-style"><option value="none">Sem chapéu</option><option value="cap">Boné</option><option value="crown">Coroa</option></select></label>
        <label>ACESSÓRIO<select id="accessory-style"><option value="none">Nenhum</option><option value="glasses">Óculos</option><option value="scarf">Cachecol</option></select></label>
        <label>ESTILO DOS OLHOS<select id="eye-style"><option value="classic">Clássicos</option><option value="sleepy">Sonolentos</option><option value="cyber">Cibernéticos</option></select></label>
        <label>BOCA<select id="mouth-style"><option value="smile">Sorriso</option><option value="fangs">Presas</option><option value="none">Sem boca</option></select></label>
        <label class="color-finish">ACABAMENTO DA COR<select id="color-finish"><option value="normal">Normal</option><option value="bright">Muito brilhante</option><option value="ghost">Fantasma</option></select></label>
      </div>
      <button id="play">JOGAR AGORA <span>→</span></button>
      <div class="help">MOUSE / TOQUE <span>•</span> Direcione a cabeça <span>•</span> Segure para acelerar</div>
      <div id="error" class="error"></div>
    </div>
  </div>
  <div id="dead-ui" class="center-ui hidden"><div class="panel compact"><div class="eyebrow">FIM DE JOGO</div><h2>Você foi eliminado.</h2><p id="final-score"></p><button id="again">JOGAR DE NOVO ↻</button><button id="edit-character" class="secondary">EDITAR PERSONAGEM</button></div></div>
  <div class="mobile-hint">Arraste para direcionar • Segure para acelerar</div>
</div>`;

const canvas = document.querySelector('#game'), ctx = canvas.getContext('2d');
const connEl = document.querySelector('#connection');
const scoreEl = document.querySelector('#score'), lengthEl = document.querySelector('#length');
const leadersEl = document.querySelector('#leaders');
const centerUI = document.querySelector('#center-ui'), deadUI = document.querySelector('#dead-ui');
const errorEl = document.querySelector('#error');
const palette = ['#56e39f','#5cc8ff','#ff6685','#ffc857','#b18cff','#ff8b4d','#f5f7fa'];
let chosenColor = palette[0], appearance={hat:'none',accessory:'none',eyes:'classic',mouth:'smile',finish:'normal'}, socket, gameState = {players:[], food:[]}, me = null, playing = false;
let target = {x:0,y:0}, boosting = false, view = {x:0,y:0}, lastFrame = 0, dpr = 1;

const colors = document.querySelector('#colors');
palette.forEach((c,i)=>{const b=document.createElement('button');b.className='swatch'+(!i?' selected':'');b.style.background=c;b.title=c;b.onclick=()=>{chosenColor=c;document.querySelectorAll('.swatch').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');document.querySelector('#snake-preview').style.setProperty('--snake-color',c)};colors.append(b)});
const appearanceControls={hat:'hat-style',accessory:'accessory-style',eyes:'eye-style',mouth:'mouth-style',finish:'color-finish'};
Object.entries(appearanceControls).forEach(([key,id])=>document.querySelector('#'+id).addEventListener('change',e=>appearance[key]=e.target.value));
const previewCanvas=document.querySelector('#snake-preview-canvas'),previewCtx=previewCanvas.getContext('2d');
let previewPoints=[],previewHead={x:0,y:0},previewWaypoint=null,previewAngle=0,previewLast=0,previewTime=0,previewSize='';
function animatePreview(now=0){requestAnimationFrame(animatePreview);const box=previewCanvas.getBoundingClientRect();if(!box.width||!box.height)return;const ratio=Math.min(devicePixelRatio||1,2);const width=Math.round(box.width*ratio),height=Math.round(box.height*ratio);const size=`${width}x${height}`;if(previewCanvas.width!==width||previewCanvas.height!==height){previewCanvas.width=width;previewCanvas.height=height}if(size!==previewSize){previewSize=size;previewHead={x:box.width/2,y:box.height/2};previewWaypoint=null;previewAngle=0;previewPoints=Array.from({length:32},(_,i)=>({x:Math.max(14,previewHead.x-i*2.5),y:previewHead.y}))}previewCtx.setTransform(ratio,0,0,ratio,0,0);const w=box.width,h=box.height,dt=Math.min((now-previewLast)/1000||0,.04);previewLast=now;previewTime+=dt;
 const margin=Math.min(30,Math.max(20,Math.min(w,h)*.32));if(!previewWaypoint||Math.hypot(previewWaypoint.x-previewHead.x,previewWaypoint.y-previewHead.y)<28){previewWaypoint={x:margin+Math.random()*Math.max(1,w-margin*2),y:margin+Math.random()*Math.max(1,h-margin*2)}}
 const targetAngle=Math.atan2(previewWaypoint.y-previewHead.y,previewWaypoint.x-previewHead.x);let angleDelta=Math.atan2(Math.sin(targetAngle-previewAngle),Math.cos(targetAngle-previewAngle));previewAngle+=Math.max(-2.2*dt,Math.min(2.2*dt,angleDelta));const speed=32;previewHead.x+=Math.cos(previewAngle)*speed*dt;previewHead.y+=Math.sin(previewAngle)*speed*dt;
 const edge=18;if(previewHead.x<edge||previewHead.x>w-edge||previewHead.y<edge||previewHead.y>h-edge){previewHead.x=Math.max(edge,Math.min(w-edge,previewHead.x));previewHead.y=Math.max(edge,Math.min(h-edge,previewHead.y));previewWaypoint={x:w/2,y:h/2}}
 if(Math.hypot(previewHead.x-previewPoints[0].x,previewHead.y-previewPoints[0].y)>2.5)previewPoints.unshift({x:previewHead.x,y:previewHead.y});previewPoints=previewPoints.slice(0,32);
 previewCtx.clearRect(0,0,w,h);previewCtx.save();previewCtx.beginPath();previewCtx.rect(0,0,w,h);previewCtx.clip();previewCtx.globalAlpha=appearance.finish==='ghost'?.45:1;previewCtx.shadowBlur=appearance.finish==='bright'?14:0;previewCtx.shadowColor=getComputedStyle(document.querySelector('#snake-preview')).getPropertyValue('--snake-color').trim()||'#56e39f';previewCtx.lineCap='round';previewCtx.lineJoin='round';previewCtx.beginPath();previewPoints.forEach((p,i)=>i?previewCtx.lineTo(p.x,p.y):previewCtx.moveTo(p.x,p.y));previewCtx.strokeStyle='rgba(0,0,0,.32)';previewCtx.lineWidth=24;previewCtx.stroke();previewCtx.strokeStyle=previewCtx.shadowColor;previewCtx.lineWidth=20;previewCtx.stroke();previewCtx.beginPath();previewCtx.arc(previewHead.x,previewHead.y,11,0,Math.PI*2);previewCtx.fillStyle=previewCtx.strokeStyle;previewCtx.fill();previewCtx.translate(previewHead.x,previewHead.y);previewCtx.rotate(previewAngle);
 if(appearance.accessory==='scarf'){previewCtx.fillStyle='#ff8b4d';previewCtx.beginPath();previewCtx.moveTo(-7,-7);previewCtx.quadraticCurveTo(-11,0,-7,7);previewCtx.lineTo(-3,6);previewCtx.lineTo(-4,-6);previewCtx.closePath();previewCtx.fill();previewCtx.beginPath();previewCtx.moveTo(-7,1);previewCtx.lineTo(-15,7);previewCtx.lineTo(-8,6);previewCtx.closePath();previewCtx.fill();previewCtx.strokeStyle='#ffe0b2';previewCtx.lineWidth=1;previewCtx.beginPath();previewCtx.moveTo(-8,-3);previewCtx.lineTo(-4,-3);previewCtx.stroke()}else if(appearance.accessory==='glasses'){previewCtx.fillStyle='#9fe8ff99';previewCtx.strokeStyle='#152433';previewCtx.lineWidth=1.5;for(const side of [-1,1]){previewCtx.beginPath();previewCtx.arc(3,side*4,3,0,Math.PI*2);previewCtx.fill();previewCtx.stroke()}}
 if(appearance.hat==='cap'){previewCtx.fillStyle='#172b3a';previewCtx.beginPath();previewCtx.moveTo(-8,-8);previewCtx.quadraticCurveTo(-7,-17,1,-17);previewCtx.quadraticCurveTo(8,-16,8,-7);previewCtx.closePath();previewCtx.fill();previewCtx.fillStyle='#56e39f';previewCtx.fillRect(-6,-9,12,1.5);previewCtx.fillStyle='#172b3a';previewCtx.beginPath();previewCtx.moveTo(2,-7);previewCtx.quadraticCurveTo(10,-8,13,-4);previewCtx.quadraticCurveTo(8,-3,3,-5);previewCtx.closePath();previewCtx.fill()}else if(appearance.hat==='crown'){previewCtx.fillStyle='#ffc857';previewCtx.beginPath();previewCtx.moveTo(-8,-7);previewCtx.lineTo(-7,-16);previewCtx.lineTo(-2,-10);previewCtx.lineTo(1,-17);previewCtx.lineTo(4,-10);previewCtx.lineTo(8,-15);previewCtx.lineTo(8,-6);previewCtx.closePath();previewCtx.fill()}
 for(const side of [-1,1]){const ey=side*4;previewCtx.beginPath();previewCtx.fillStyle=appearance.eyes==='cyber'?'#56e39f':'#fff';if(appearance.eyes==='sleepy'){previewCtx.ellipse(4,ey,2.5,1,0,0,Math.PI*2)}else previewCtx.arc(4,ey,appearance.eyes==='cyber'?2.6:2.2,0,Math.PI*2);previewCtx.fill()}
 if(appearance.mouth!=='none'){previewCtx.strokeStyle='#10202c';previewCtx.fillStyle='#fff';previewCtx.lineWidth=1.5;previewCtx.beginPath();if(appearance.mouth==='smile')previewCtx.arc(7,0,2.5,.15,1.45);else{previewCtx.moveTo(5,-2);previewCtx.lineTo(7,0);previewCtx.lineTo(5,2)}previewCtx.stroke();if(appearance.mouth==='fangs'){previewCtx.beginPath();previewCtx.moveTo(5,-2);previewCtx.lineTo(7,0);previewCtx.lineTo(8,-2);previewCtx.fill()}}previewCtx.restore()}
requestAnimationFrame(animatePreview);
function resize(){dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.floor(innerWidth*dpr);canvas.height=Math.floor(innerHeight*dpr);canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';ctx.setTransform(dpr,0,0,dpr,0,0)}
window.addEventListener('resize',resize);resize();

function connect(){
 socket=io(SERVER_URL,{transports:['websocket','polling'],timeout:8000,reconnection:true});
 socket.on('connect',()=>{connEl.textContent='● ONLINE';connEl.classList.add('online');errorEl.textContent=''});
 socket.on('disconnect',()=>{connEl.textContent='○ Reconectando…';connEl.classList.remove('online')});
 socket.on('connect_error',()=>{connEl.textContent='Servidor indisponível';errorEl.textContent='Não foi possível conectar ao servidor. Confira a URL do backend e tente novamente.'});
 socket.on('state',s=>{gameState=s;if(me){const p=s.players.find(x=>x.id===me);if(p){scoreEl.textContent=Math.floor(p.score);lengthEl.textContent='Tamanho: '+p.body.length}else if(playing){playing=false;document.querySelector('#final-score').textContent='Pontuação: '+scoreEl.textContent;deadUI.classList.remove('hidden')}}renderLeaders()});
 socket.on('spawned',p=>{me=p.id;playing=true;centerUI.classList.add('hidden');deadUI.classList.add('hidden')});
 socket.on('spawn_error',m=>errorEl.textContent=m||'Não foi possível entrar na arena.');
}
connect();
function start(){if(!socket?.connected){errorEl.textContent='Aguardando conexão com o servidor…';return}socket.emit('join',{name:document.querySelector('#nickname').value.trim()||'Jogador',color:chosenColor,appearance})}
document.querySelector('#play').onclick=start;document.querySelector('#again').onclick=()=>{deadUI.classList.add('hidden');centerUI.classList.remove('hidden');start()};document.querySelector('#edit-character').onclick=()=>{deadUI.classList.add('hidden');centerUI.classList.remove('hidden');errorEl.textContent=''};
document.querySelector('#nickname').addEventListener('keydown',e=>{if(e.key==='Enter')start()});
function renderLeaders(){const top=[...gameState.players].sort((a,b)=>b.score-a.score).slice(0,8);leadersEl.innerHTML=top.length?top.map((p,i)=>`<li class="${p.id===me?'mine':''}"><span class="rank">${i+1}</span><span class="leader-dot" style="background:${safeColor(p.color)}"></span><span class="leader-name">${escapeHtml(p.name)}</span><b>${Math.floor(p.score)}</b></li>`).join(''):'<li>Aguardando jogadores…</li>'}
function safeColor(c){return /^#[0-9a-f]{6}$/i.test(c)?c:'#56e39f'}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function pointer(e){const r=canvas.getBoundingClientRect();target.x=e.clientX-r.left;target.y=e.clientY-r.top}
canvas.addEventListener('pointermove',pointer);canvas.addEventListener('pointerdown',e=>{pointer(e);if(e.pointerType==='mouse'&&e.button!==0)return;boosting=true;canvas.setPointerCapture?.(e.pointerId)});canvas.addEventListener('pointerup',()=>boosting=false);canvas.addEventListener('pointercancel',()=>boosting=false);window.addEventListener('blur',()=>boosting=false);
window.addEventListener('keydown',e=>{if(e.code==='Space'){boosting=true;e.preventDefault()}});window.addEventListener('keyup',e=>{if(e.code==='Space')boosting=false});
function drawGrid(w,h){ctx.fillStyle='#07111b';ctx.fillRect(0,0,w,h);const grid=48;ctx.strokeStyle='rgba(120,170,200,.075)';ctx.lineWidth=1;const ox=((view.x%grid)+grid)%grid,oy=((view.y%grid)+grid)%grid;ctx.beginPath();for(let x=-ox;x<w;x+=grid){ctx.moveTo(x,0);ctx.lineTo(x,h)}for(let y=-oy;y<h;y+=grid){ctx.moveTo(0,y);ctx.lineTo(w,y)}ctx.stroke()}
function worldToScreen(x,y,w,h){return {x:x-view.x+w/2,y:y-view.y+h/2}}
function render(now=0){requestAnimationFrame(render);const dt=Math.min((now-lastFrame)/1000||0,.05);lastFrame=now;const w=innerWidth,h=innerHeight;const player=gameState.players.find(p=>p.id===me);
 if(player){view.x+=(player.x-view.x)*Math.min(1,dt*5);view.y+=(player.y-view.y)*Math.min(1,dt*5)}
 drawGrid(w,h);
 // Food orbs
 for(const f of gameState.food||[]){const p=worldToScreen(f.x,f.y,w,h);if(p.x < -12||p.x>w+12||p.y < -12||p.y>h+12)continue;ctx.beginPath();ctx.fillStyle=f.color||'#56e39f';ctx.shadowBlur=10;ctx.shadowColor=ctx.fillStyle;ctx.arc(p.x,p.y,f.r||3,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0}
 // Snakes are drawn tail first to keep heads visible.
 for(const snake of gameState.players||[]){if(!snake.body?.length)continue;const body=snake.body;ctx.lineCap='round';ctx.lineJoin='round';
   ctx.beginPath();for(let i=body.length-1;i>=0;i--){const p=worldToScreen(body[i].x,body[i].y,w,h);if(i===body.length-1)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y)}
   const look=snake.appearance||{};ctx.globalAlpha=look.finish==='ghost'?.45:1;ctx.shadowBlur=look.finish==='bright'?18:0;ctx.shadowColor=safeColor(snake.color);ctx.strokeStyle='rgba(0,0,0,.32)';ctx.lineWidth=snake.radius*2+4;ctx.stroke();
   ctx.beginPath();for(let i=body.length-1;i>=0;i--){const p=worldToScreen(body[i].x,body[i].y,w,h);if(i===body.length-1)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y)}
   ctx.strokeStyle=safeColor(snake.color);ctx.lineWidth=snake.radius*2;ctx.stroke();ctx.shadowBlur=0;
   const head=worldToScreen(snake.x,snake.y,w,h),angle=snake.angle||0,r=snake.radius;ctx.beginPath();ctx.fillStyle=safeColor(snake.color);ctx.arc(head.x,head.y,r+1,0,Math.PI*2);ctx.fill();ctx.save();ctx.translate(head.x,head.y);ctx.rotate(angle);
   if(look.accessory==='scarf'){ctx.fillStyle='#ff8b4d';ctx.beginPath();ctx.moveTo(-r*.68,-r*.72);ctx.quadraticCurveTo(-r*1.08,0,-r*.68,r*.72);ctx.lineTo(-r*.25,r*.62);ctx.lineTo(-r*.38,-r*.62);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(-r*.72,r*.1);ctx.lineTo(-r*1.55,r*.72);ctx.lineTo(-r*.78,r*.56);ctx.closePath();ctx.fill();ctx.strokeStyle='#ffe0b2';ctx.lineWidth=Math.max(1,r*.09);ctx.beginPath();ctx.moveTo(-r*.85,-r*.3);ctx.lineTo(-r*.4,-r*.3);ctx.stroke()}
   if(look.hat==='cap'){ctx.fillStyle='#172b3a';ctx.beginPath();ctx.moveTo(-r*.72,-r*.62);ctx.quadraticCurveTo(-r*.68,-r*1.55,r*.08,-r*1.58);ctx.quadraticCurveTo(r*.78,-r*1.48,r*.76,-r*.56);ctx.closePath();ctx.fill();ctx.fillStyle='#56e39f';ctx.fillRect(-r*.52,-r*.8,r*1.15,r*.13);ctx.fillStyle='#172b3a';ctx.beginPath();ctx.moveTo(r*.22,-r*.58);ctx.quadraticCurveTo(r*1.02,-r*.72,r*1.3,-r*.35);ctx.quadraticCurveTo(r*.82,-r*.23,r*.26,-r*.38);ctx.closePath();ctx.fill()}else if(look.hat==='crown'){ctx.fillStyle='#ffc857';ctx.beginPath();ctx.moveTo(-r*.65,-r*.65);ctx.lineTo(-r*.55,-r*1.5);ctx.lineTo(-r*.15,-r*.95);ctx.lineTo(r*.1,-r*1.55);ctx.lineTo(r*.4,-r*.92);ctx.lineTo(r*.65,-r*1.3);ctx.lineTo(r*.7,-r*.55);ctx.closePath();ctx.fill()}
   if(look.accessory==='glasses'){ctx.strokeStyle='#152433';ctx.lineWidth=2;ctx.fillStyle='#9fe8ff99';for(const side of [-1,1]){ctx.beginPath();ctx.arc(r*.25,side*r*.48,r*.3,0,Math.PI*2);ctx.fill();ctx.stroke()}}
   for(const side of [-1,1]){const ey=side*r*.48;ctx.beginPath();ctx.fillStyle=look.eyes==='cyber'?'#56e39f':'#fff';if(look.eyes==='sleepy'){ctx.ellipse(r*.32,ey,r*.22,r*.1,0,0,Math.PI*2);ctx.fill()}else{ctx.arc(r*.32,ey,look.eyes==='cyber'?r*.24:r*.22,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.fillStyle='#10202c';ctx.arc(r*.39,ey,r*.1,0,Math.PI*2);ctx.fill()}}
   if(look.mouth!=='none'){ctx.strokeStyle='#10202c';ctx.fillStyle='#fff';ctx.lineWidth=1.5;ctx.beginPath();if(look.mouth==='smile'){ctx.arc(r*.58,0,r*.25,.15,1.45)}else{ctx.moveTo(r*.42,-r*.18);ctx.lineTo(r*.55,0);ctx.lineTo(r*.42,r*.18)}ctx.stroke();if(look.mouth==='fangs'){ctx.beginPath();ctx.moveTo(r*.45,-r*.12);ctx.lineTo(r*.55,0);ctx.lineTo(r*.64,-r*.12);ctx.fill()}}
   ctx.restore();ctx.globalAlpha=1;ctx.shadowBlur=0;
   if(Math.hypot(head.x-w/2,head.y-h/2)<Math.max(w,h)*.8){ctx.font='600 12px Inter,system-ui';ctx.textAlign='center';ctx.fillStyle='rgba(235,246,255,.9)';ctx.fillText(snake.name,head.x,head.y-snake.radius-13)}
 }
 if(playing&&socket?.connected){const a=player?Math.atan2((target.y-h/2),(target.x-w/2)):0;socket.emit('input',{angle:a,boost:boosting})}
}
requestAnimationFrame(render);

