const canvas=document.getElementById('city'),ctx=canvas.getContext('2d'),game=document.getElementById('game');
let W=0,H=0,S=1,last=0,time=0,active=null,muted=false,audio,osc,gain,asphalt;
const cars=[],trails=[],sparks=[];
const specs=[{name:'Foguinho',color:'#ff6d28',light:'#ffc265',dark:'#b72b18',type:0,auto:false},{name:'Raio azul',color:'#168bff',light:'#7ed9ff',dark:'#143a9b',type:1,auto:true},{name:'Veneno verde',color:'#95d92e',light:'#e2ff8a',dark:'#3b771d',type:2,auto:true},{name:'Fúria rosa',color:'#f64b88',light:'#ffacd1',dark:'#971c59',type:1,auto:true},{name:'Relâmpago',color:'#ffd33c',light:'#fff5a0',dark:'#b57c12',type:0,auto:true}];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function bounds(){return{left:16+59*S,right:W-16-59*S,top:90+59*S,bottom:H-87-59*S}}
function resize(){const oldW=W,oldH=H;W=innerWidth;H=innerHeight;S=Math.min(1.45,Math.max(.64,Math.min(W/430,(H-170)/480)));
 const d=Math.min(devicePixelRatio||1,2);canvas.width=W*d;canvas.height=H*d;ctx.setTransform(d,0,0,d,0,0);
 const b=bounds();cars.forEach(c=>{c.x=clamp(c.x/(oldW||W)*W,b.left,b.right);c.y=clamp(c.y/(oldH||H)*H,b.top,b.bottom)});
 const tile=document.createElement('canvas');tile.width=128;tile.height=128;const tc=tile.getContext('2d');tc.fillStyle='#2c323c';tc.fillRect(0,0,128,128);let seed=93;for(let i=0;i<2200;i++){seed=(seed*16807)%2147483647;const x=seed%128;seed=(seed*16807)%2147483647;tc.fillStyle=i%2?'#ffffff08':'#00000012';tc.fillRect(x,seed%128,1,1)}asphalt=ctx.createPattern(tile,'repeat');
}addEventListener('resize',resize);resize();
const positions=[[.5,.67],[.25,.3],[.76,.38],[.25,.54],[.75,.77]];
for(let i=0;i<specs.length;i++){let b=bounds();cars.push({...specs[i],id:i,x:clamp(W*positions[i][0],b.left,b.right),y:clamp(H*positions[i][1],b.top,b.bottom),vx:0,vy:0,angle:[-.4,.6,-.6,2.2,-2][i],mode:i?'auto':'idle',resume:0,turn:i*1.8,trail:0})}
function rr(x,y,w,h,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function poly(p,c){ctx.fillStyle=c;ctx.beginPath();p.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill()}
function oval(x,y,rx,ry,c){ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill()}
function drawCar(c){ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.angle);ctx.scale(S,S);ctx.shadowColor='#0009';ctx.shadowBlur=12;ctx.shadowOffsetY=6;
 if(active?.car===c){ctx.shadowColor=c.light;ctx.shadowBlur=22;rr(-37,-64,74,128,22,'#ffffff15');ctx.shadowColor='#0008'}
 rr(-29,-54,58,111,17,'#161b23');ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 for(const x of [-36,23])for(const y of [-38,26]){rr(x,y,13,23,4,'#10141b');rr(x+2,y+3,9,17,2,'#292f39');rr(x+(x<0?0:9),y+5,3,13,1,'#9ba6ac')}
 rr(-29,-53,58,108,16,'#b9c4c6');rr(-29,-57,58,105,16,c.dark);
 const paint=ctx.createLinearGradient(-29,0,29,0);paint.addColorStop(0,c.dark);paint.addColorStop(.17,c.color);paint.addColorStop(.42,c.light);paint.addColorStop(.66,c.color);paint.addColorStop(1,c.dark);
 rr(-28,-60,56,106,c.type===2?10:17,paint);
 poly([[-26,-40],[-20,-54],[-16,-54],[-20,-24]],'#ffffff55');poly([[25,-36],[22,32],[18,39],[19,-34]],'#0002');
 // Racing stripes and flame decals painted into the metal body.
 if(c.type===0){for(let side of [-1,1]){ctx.save();ctx.scale(side,1);poly([[9,-21],[11,-45],[17,-33],[15,-53],[24,-40],[23,-13],[18,-23],[17,-6]],'#ffe57c');poly([[15,-22],[18,-38],[20,-26],[22,-34],[21,-8]],'#ffefe1');ctx.restore()}}
 else{rr(-8,-57,5,99,1,c.type===1?'#eefaff':'#182b2c');rr(3,-57,5,99,1,c.type===1?'#eefaff':'#182b2c')}
 // Curved glass, roof and rear window: a true overhead miniature.
 poly([[-23,-17],[-18,-29],[18,-29],[23,-17],[19,-2],[-19,-2]],'#152c40');poly([[-17,-25],[15,-25],[19,-18],[-19,-9]],'#8ed1df');poly([[-15,-24],[3,-24],[-17,-14]],'#e0f7f788');
 rr(-19,-4,38,29,7,paint);rr(-17,-2,3,22,1,'#ffffff55');
 poly([[-19,27],[19,27],[22,37],[-22,37]],'#183446');poly([[-16,29],[16,29],[18,34],[-18,34]],'#67a6b8');
 for(const side of [-1,1]){rr(side<0?-33:25,-11,8,11,3,c.color);rr(side<0?-25:13,-55,12,5,2,'#f8fbda');rr(side<0?-24:13,42,11,4,2,'#ff4744')}
 rr(-22,-60,44,3,1,'#dce1c9');rr(-20,48,40,4,1,'#d8dedb');
 if(c.type===1||c.type===2){rr(-32,38,64,7,2,'#15222c');rr(-28,38,56,3,1,c.light)}
 ctx.fillStyle=c.type===2?'#213824':'#ffffffdd';ctx.font='italic 900 17px system-ui';ctx.textAlign='center';ctx.fillText(['01','07','23','88','05'][c.id],7,17);ctx.restore()}
function initAudio(){if(audio){audio.resume();return}try{audio=new(window.AudioContext||window.webkitAudioContext)();osc=audio.createOscillator();gain=audio.createGain();let f=audio.createBiquadFilter();f.type='lowpass';f.frequency.value=290;osc.type='sawtooth';gain.gain.value=0;osc.connect(f);f.connect(gain);gain.connect(audio.destination);osc.start()}catch(e){}}
function beep(){initAudio();if(!audio||muted)return;[392,494].forEach(f=>{let o=audio.createOscillator(),g=audio.createGain();o.frequency.value=f;o.connect(g);g.connect(audio.destination);g.gain.setValueAtTime(.0001,audio.currentTime);g.gain.exponentialRampToValueAtTime(.055,audio.currentTime+.02);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+.25);o.start();o.stop(audio.currentTime+.28)})}
function begin(e){if(active)return;const matches=cars.filter(c=>Math.hypot(c.x-e.clientX,c.y-e.clientY)<76*S).sort((a,b)=>Math.hypot(a.x-e.clientX,a.y-e.clientY)-Math.hypot(b.x-e.clientX,b.y-e.clientY));if(!matches.length)return;e.preventDefault();initAudio();const c=matches[0];active={id:e.pointerId,car:c,ox:c.x-e.clientX,oy:c.y-e.clientY,history:[{x:c.x,y:c.y,t:e.timeStamp}]};c.mode='held';c.vx=c.vy=0;canvas.setPointerCapture(e.pointerId);game.classList.add('playing','holding');document.getElementById('selected').textContent=c.name.toUpperCase()}
function move(e){if(!active||e.pointerId!==active.id)return;e.preventDefault();let c=active.car,b=bounds(),x=clamp(e.clientX+active.ox,b.left,b.right),y=clamp(e.clientY+active.oy,b.top,b.bottom),dx=x-c.x,dy=y-c.y;if(Math.hypot(dx,dy)>2){c.angle=Math.atan2(dy,dx)+Math.PI/2}c.x=x;c.y=y;active.history.push({x,y,t:e.timeStamp});active.history=active.history.filter(p=>e.timeStamp-p.t<=110)}
function release(e,cancel=false){if(!active||e?.pointerId!==undefined&&e.pointerId!==active.id)return;let c=active.car,h=active.history,end=h[h.length-1],start=h[0],age=(e?.timeStamp??end.t)-end.t,dt=(end.t-start.t)/1000;c.vx=c.vy=0;if(!cancel&&age<100&&dt>.008){c.vx=(end.x-start.x)/dt;c.vy=(end.y-start.y)/dt;let v=Math.hypot(c.vx,c.vy),limit=1450*S;if(v>limit){c.vx*=limit/v;c.vy*=limit/v}}c.mode='coast';c.resume=.7;active=null;game.classList.remove('holding')}
canvas.addEventListener('pointerdown',begin);canvas.addEventListener('pointermove',move);addEventListener('pointerup',e=>release(e));addEventListener('pointercancel',e=>release(e,true));addEventListener('blur',()=>release(undefined,true));document.addEventListener('visibilitychange',()=>{if(document.hidden){release(undefined,true);audio?.suspend();last=0}else if(audio&&!muted)audio.resume()});
 document.getElementById('sound').onclick=()=>{muted=!muted;let b=document.getElementById('sound');b.textContent=muted?'♪̸':'♫';b.setAttribute('aria-label',muted?'Ligar som':'Desligar som');if(!muted)initAudio()};document.getElementById('honk').onclick=beep;
function hit(c){const b=bounds();let touched=false;if(c.x<b.left||c.x>b.right){c.x=clamp(c.x,b.left,b.right);touched=true}if(c.y<b.top||c.y>b.bottom){c.y=clamp(c.y,b.top,b.bottom);touched=true}if(touched){sparks.push({x:c.x,y:c.y,life:.3});c.vx=c.vy=0;if(c.mode==='auto'){c.angle+=Math.PI*.8;c.turn=time+1}else{c.mode='coast';c.resume=.7}}}
function update(dt){time+=dt;for(const c of cars){if(c.mode==='held')continue;if(c.mode==='auto'){if(time>c.turn){c.angle+=(Math.sin(time*1.7+c.id)*.8);c.turn=time+1.4+c.id*.17}let speed=(39+c.id*5)*S;c.vx+=(Math.sin(c.angle)*speed-c.vx)*Math.min(1,dt*2);c.vy+=(-Math.cos(c.angle)*speed-c.vy)*Math.min(1,dt*2)}else if(c.mode==='coast'){const f=Math.exp(-2.35*dt);c.vx*=f;c.vy*=f;if(Math.hypot(c.vx,c.vy)<12*S){c.vx=c.vy=0;c.resume-=dt;if(c.resume<=0)c.mode=c.auto?'auto':'idle'}}c.x+=c.vx*dt;c.y+=c.vy*dt;hit(c);const speed=Math.hypot(c.vx,c.vy);if(speed>120*S){c.trail+=dt;if(c.trail>.035){trails.push({x:c.x,y:c.y,angle:c.angle,life:.6});c.trail=0}}}
 for(let i=0;i<cars.length;i++)for(let j=i+1;j<cars.length;j++){const a=cars[i],b=cars[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=49*S;if(d<min&&d>.01){const nx=dx/d,ny=dy/d,over=min-d,ah=a.mode==='held',bh=b.mode==='held';if(!ah){a.x-=nx*over*(bh?1:.5);a.y-=ny*over*(bh?1:.5)}if(!bh){b.x+=nx*over*(ah?1:.5);b.y+=ny*over*(ah?1:.5)}const v=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;if(v>0){if(!ah){a.vx-=nx*v*.65;a.vy-=ny*v*.65}if(!bh){b.vx+=nx*v*.65;b.vy+=ny*v*.65}}if(ah&&!bh){b.vx+=nx*90*S;b.vy+=ny*90*S;b.mode='coast';b.resume=.7}if(bh&&!ah){a.vx-=nx*90*S;a.vy-=ny*90*S;a.mode='coast';a.resume=.7}}}
 for(const c of cars)if(c.mode!=='held')hit(c);for(const list of [trails,sparks])for(let i=list.length-1;i>=0;i--){list[i].life-=dt;if(list[i].life<=0)list.splice(i,1)}}
function render(){ctx.fillStyle=asphalt||'#2c323c';ctx.fillRect(0,0,W,H);const glow=ctx.createRadialGradient(W*.45,H*.4,0,W*.5,H*.5,Math.max(W,H)*.8);glow.addColorStop(0,'#71869a12');glow.addColorStop(1,'#00000035');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
 // Only asphalt inside the play area; the orange rim marks the toy mat limits.
 ctx.strokeStyle='#f28b27';ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(13,87,W-26,H-170,22);ctx.stroke();ctx.strokeStyle='#ffffff16';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(21,95,W-42,H-186,16);ctx.stroke();
 ctx.save();ctx.translate(W*.5,H*.5);ctx.rotate(-Math.PI/2);ctx.fillStyle='#ffffff04';ctx.textAlign='center';ctx.font=`italic 950 ${Math.min(90,W*.17)}px system-ui`;ctx.fillText('BEMRÁPIDO',0,0);ctx.restore();
 for(const p of trails){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.globalAlpha=p.life*.24;rr(-25*S,28*S,5*S,12*S,2,'#000');rr(20*S,28*S,5*S,12*S,2,'#000');ctx.restore()}
 for(const c of cars.filter(c=>active?.car!==c))drawCar(c);if(active)drawCar(active.car);
 for(const p of sparks){ctx.globalAlpha=p.life/.3;ctx.strokeStyle='#ffd483';ctx.lineWidth=2;for(let i=0;i<6;i++){let a=i*Math.PI/3,r=(.3-p.life)*90;ctx.beginPath();ctx.moveTo(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r);ctx.lineTo(p.x+Math.cos(a)*(r+5),p.y+Math.sin(a)*(r+5));ctx.stroke()}ctx.globalAlpha=1}
 if(!game.classList.contains('playing')){let c=cars[0];ctx.strokeStyle=`rgba(255,188,95,${.3+Math.sin(time*3)*.15})`;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(c.x,c.y,48*S,77*S,c.angle,0,Math.PI*2);ctx.stroke()}}
function frame(now){const dt=last?Math.min((now-last)/1000,.033):.016;last=now;update(dt);render();if(gain&&audio.state==='running'){let max=Math.max(...cars.map(c=>Math.hypot(c.vx,c.vy))),power=Math.min(1,max/(650*S));gain.gain.setTargetAtTime(muted?0:power*.035,audio.currentTime,.09);osc.frequency.setTargetAtTime(35+power*85,audio.currentTime,.1)}requestAnimationFrame(frame)}requestAnimationFrame(frame);
