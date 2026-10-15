import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.PORT || 3001);
const ORIGIN = process.env.CLIENT_ORIGIN || '*';
const app = express();
app.use(cors({ origin: ORIGIN === '*' ? true : ORIGIN.split(',').map(x=>x.trim()) }));
app.get('/', (_req,res)=>res.json({name:'Slither Arena Server',status:'online',players:players.size}));
app.get('/health', (_req,res)=>res.json({ok:true,players:players.size}));
const httpServer = http.createServer(app);
const io = new Server(httpServer,{cors:{origin:ORIGIN==='*'?'*':ORIGIN.split(',').map(x=>x.trim()),methods:['GET','POST']}, transports:['websocket','polling']});

const WORLD = 3600, FOOD_TARGET = 900, TICK = 30, BASE_SPEED = 145, BOOST_SPEED = 225;
const players = new Map(), food = [];
const palette = ['#56e39f','#5cc8ff','#ff6685','#ffc857','#b18cff','#ff8b4d','#f5f7fa'];
const rand=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function makeFood(x=rand(0,WORLD),y=rand(0,WORLD),value=null){const r=rand(3.2,6.2);const foodValue=value??Number((r/3.2).toFixed(2));food.push({id:randomUUID(),x,y,r,value:foodValue,color:palette[Math.floor(Math.random()*palette.length)]})}
for(let i=0;i<FOOD_TARGET;i++)makeFood();
function normalizeAppearance(value={}){const allow=(key,options,fallback)=>options.includes(value?.[key])?value[key]:fallback;return {hat:allow('hat',['none','cap','crown'],'none'),accessory:allow('accessory',['none','glasses','scarf'],'none'),eyes:allow('eyes',['classic','sleepy','cyber'],'classic'),mouth:allow('mouth',['smile','fangs','none'],'smile'),finish:allow('finish',['normal','bright','ghost'],'normal')}}
function spawn(socketId,name,color,appearance){
 const x=rand(350,WORLD-350),y=rand(350,WORLD-350),body=[];
 for(let i=0;i<10;i++)body.push({x:x-i*9,y});
 return {id:socketId,name:String(name||'Jogador').replace(/[<>]/g,'').slice(0,18)||'Jogador',color:/^#[0-9a-f]{6}$/i.test(color)?color:palette[0],appearance:normalizeAppearance(appearance),x,y,angle:rand(0,Math.PI*2),body,radius:9,score:10,boost:false,alive:true,lastInput:0};
}
io.on('connection',socket=>{
 socket.on('join',data=>{
  if(players.has(socket.id))return;
  if(players.size>=120){socket.emit('spawn_error','A arena está cheia. Tente novamente em instantes.');return}
  const p=spawn(socket.id,data?.name,data?.color,data?.appearance);players.set(socket.id,p);socket.emit('spawned',{id:p.id});
 });
 socket.on('input',input=>{
  const p=players.get(socket.id);if(!p||!input)return;
  if(Number.isFinite(input.angle))p.angle=Math.atan2(Math.sin(input.angle),Math.cos(input.angle));
  p.boost=Boolean(input.boost)&&p.score>10;p.lastInput=Date.now();
 });
 socket.on('disconnect',()=>players.delete(socket.id));
});
function dropTrail(p){const tail=p.body[p.body.length-1];if(tail)for(let i=0;i<3;i++)makeFood(tail.x+rand(-9,9),tail.y+rand(-9,9),1)}
function kill(p){dropTrail(p);players.delete(p.id)}
function distance2(a,b){const x=a.x-b.x,y=a.y-b.y;return x*x+y*y}
function step(){
 const dt=1/TICK;
 for(const p of players.values()){
  const sizeSpeed=Math.max(.78,1-Math.max(0,p.score-10)*.0003);
  const speed=(p.boost?BOOST_SPEED:BASE_SPEED)*sizeSpeed;
  p.x=clamp(p.x+Math.cos(p.angle)*speed*dt,8,WORLD-8);p.y=clamp(p.y+Math.sin(p.angle)*speed*dt,8,WORLD-8);
  if(p.boost){p.score=Math.max(10,p.score-.5)}
  const spacing=5.6+Math.min(2,p.score/100);
  p.body.unshift({x:p.x,y:p.y});
  const wanted=Math.min(500,Math.floor(10+p.score*1.35));
  if(p.body.length>wanted)p.body.length=wanted;
  p.radius=clamp(7+p.score*.045,7,15);
 }
 // Food eaten by heads
 for(const p of players.values()){
  for(let i=food.length-1;i>=0;i--){const f=food[i];if(distance2(p,f)<(p.radius+f.r+2)**2){p.score+=f.value;food.splice(i,1);makeFood();}}
 }
 // Head-to-body collision. Short grace distance avoids colliding with own neck.
 const list=[...players.values()], dead=new Set();
 for(const p of list){
  for(const q of list){
   if(dead.has(p.id))continue;
   const start=q.id===p.id?18:3;
   for(let i=start;i<q.body.length;i+=2){const b=q.body[i];if(distance2(p,b)<(p.radius+q.radius*.65)**2){dead.add(p.id);break}}
  }
  if(p.x<12||p.y<12||p.x>WORLD-12||p.y>WORLD-12)dead.add(p.id);
 }
 for(const id of dead){const p=players.get(id);if(p)kill(p)}
 while(food.length<FOOD_TARGET)makeFood();
}
setInterval(()=>{step();io.emit('state',{players:[...players.values()].map(p=>({id:p.id,name:p.name,color:p.color,appearance:p.appearance,x:p.x,y:p.y,angle:p.angle,body:p.body,radius:p.radius,score:p.score})),food})},1000/TICK);
httpServer.listen(PORT,'0.0.0.0',()=>console.log(`Slither Arena server listening on ${PORT}`));








