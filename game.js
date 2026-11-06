const canvas=document.getElementById('city'),ctx=canvas.getContext('2d'),game=document.getElementById('game'),menu=document.getElementById('menu');
let W=0,H=0,S=1,B=1,last=0,time=0,active=null,muted=false,audio,asphalt,musicBus,musicTimer,nextBeat=0,beat=0,musicStyle='off',musicLevel=.35,menuOpen=false;
let settings={size:100,count:3,speed:100,models:['car']};try{const saved=JSON.parse(localStorage.getItem('bemrapido-settings')||'{}');settings.size=Math.max(40,Math.min(100,Number(saved.size)||100));settings.count=Math.max(1,Math.min(8,Math.round(Number(saved.count)||3)));}catch(e){}
try{const saved=JSON.parse(localStorage.getItem('bemrapido-settings')||'{}');settings.speed=Math.max(25,Math.min(175,Number(saved.speed)||100));if(Array.isArray(saved.models)){const valid=saved.models.filter(x=>['car','pickup','bus','truck'].includes(x));if(valid.length)settings.models=valid;}}catch(e){}
function saveSettings(){try{localStorage.setItem('bemrapido-settings',JSON.stringify(settings))}catch(e){}}
const drags=new Map(), sweeps=new Map();let lastModel='car';
const cars=[],trails=[],sparks=[],voices=[],impactTimes=new Map(),trackSamples=new Map();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const specs=[{name:'Foguinho',color:'#ff6d28',light:'#ffc265',dark:'#b72b18',type:0,auto:true},{name:'Raio azul',color:'#168bff',light:'#7ed9ff',dark:'#143a9b',type:1,auto:true},{name:'Veneno verde',color:'#95d92e',light:'#e2ff8a',dark:'#3b771d',type:2,auto:true}];
const vehicleTypes={car:{w:36,l:60,mass:1,rpm:46,rev:105,wave:'sawtooth',secondary:'triangle',ratio:.5,filter:330,horn:[440,554]},pickup:{w:36,l:69,mass:1.3,rpm:34,rev:76,wave:'triangle',secondary:'sawtooth',ratio:.51,filter:280,horn:[370,466]},bus:{w:36,l:86,mass:1.7,rpm:24,rev:48,wave:'sawtooth',secondary:'square',ratio:.5,filter:200,horn:[294,370]},truck:{w:39,l:90,mass:2,rpm:21,rev:44,wave:'square',secondary:'sawtooth',ratio:.49,filter:180,horn:[196,247]}};
function dimensions(c){return vehicleTypes[c?.model||'car'];}
// Rotated footprint: wheels and bumpers can touch the exact map edge.
function bounds(c){const angle=c?.angle||0,cos=Math.abs(Math.cos(angle)),sin=Math.abs(Math.sin(angle));const d=dimensions(c),ex=(d.w*cos+d.l*sin)*S,ey=(d.w*sin+d.l*cos)*S;return{left:ex,right:W-ex,top:ey,bottom:H-ey}}
function resize(){trackSamples.clear();let ow=W,oh=H;W=innerWidth;H=innerHeight;B=.8*Math.min(1.45,Math.max(.62,Math.min(W/430,H/530)));S=B*settings.size/100;let d=Math.min(devicePixelRatio||1,2);canvas.width=W*d;canvas.height=H*d;ctx.setTransform(d,0,0,d,0,0);for(const c of cars){const b=bounds(c);c.x=clamp(c.x/(ow||W)*W,b.left,b.right);c.y=clamp(c.y/(oh||H)*H,b.top,b.bottom);c.tx=c.x;c.ty=c.y}const tile=document.createElement('canvas');tile.width=tile.height=128;const tc=tile.getContext('2d');tc.fillStyle='#2c323c';tc.fillRect(0,0,128,128);let seed=93;for(let i=0;i<2200;i++){seed=seed*16807%2147483647;let x=seed%128;seed=seed*16807%2147483647;tc.fillStyle=i%2?'#ffffff08':'#00000012';tc.fillRect(x,seed%128,1,1)}asphalt=ctx.createPattern(tile,'repeat')}
addEventListener('resize',resize);resize();
function buildCars(count){release(undefined,true);cars.length=0;trails.length=0;sparks.length=0;for(let i=0;i<count;i++){const spec=specs[i%specs.length],lane=i%2?-118:-38,p=trackPoint((i/count+.07)%1,lane*B);cars.push({...spec,id:i,model:settings.models[i%settings.models.length],auto:true,x:p.x,y:p.y,tx:p.x,ty:p.y,vx:0,vy:0,angle:p.angle,mode:'auto',resume:0,sounding:false,grab:0,lane});}for(let i=0;i<5;i++){collide();cars.forEach(wall)}}
buildCars(settings.count);
function rr(x,y,w,h,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function poly(p,c){ctx.fillStyle=c;ctx.beginPath();p.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill()}
function oval(x,y,rx,ry,c){ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill()}
function drawCar(c){if(c.model!=='car'){drawUtility(c);return;}ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.angle);ctx.scale(S,S);ctx.shadowColor='#0009';ctx.shadowBlur=12;ctx.shadowOffsetY=6;
 if(c.mode==='held'){ctx.shadowColor=c.light;ctx.shadowBlur=22;rr(-37,-64,74,128,22,'#ffffff15');ctx.shadowColor='#0008'}
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
 ctx.fillStyle=c.type===2?'#213824':'#ffffffdd';ctx.font='italic 900 17px system-ui';ctx.textAlign='center';ctx.fillText(String(c.id+1).padStart(2,'0'),7,17);ctx.restore()}


function drawUtility(c){
 const d=dimensions(c);ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.angle);ctx.scale(S,S);
 ctx.shadowColor=c.mode==='held'?c.light:'#0009';ctx.shadowBlur=c.mode==='held'?22:12;ctx.shadowOffsetY=5;
 rr(-d.w+5,-d.l+4,(d.w-5)*2,d.l*2-8,10,'#141b23');ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 const front=-d.l+20,rear=d.l-31;for(const y of [front,rear])for(const x of [-d.w,d.w-12]){rr(x,y,12,24,4,'#10151b');rr(x+2,y+3,8,18,2,'#5f6c76');}
 const paint=ctx.createLinearGradient(-30,0,30,0);paint.addColorStop(0,c.dark);paint.addColorStop(.38,c.light);paint.addColorStop(.7,c.color);paint.addColorStop(1,c.dark);
 if(c.model==='pickup'){
 rr(-29,-68,58,130,12,paint);rr(-26,7,52,50,5,'#293744');for(let x=-18;x<22;x+=8)rr(x,11,2,41,1,'#56636b');rr(-25,-42,50,23,5,'#18394c');rr(-21,-39,42,15,3,'#9ed7e1');rr(-25,-15,50,21,5,paint);rr(-23,-12,3,15,1,'#fff8');rr(-25,-58,50,8,2,'#e9e4c5');
 }else if(c.model==='bus'){
 rr(-30,-85,60,168,13,paint);rr(-26,-73,52,22,6,'#173749');rr(-22,-70,44,14,3,'#a7e1e8');rr(-23,-46,46,113,6,'#e2e3d8');for(let y=-39;y<62;y+=29){rr(-17,y,34,17,3,'#a8b3b8');rr(-13,y+3,26,4,1,'#eaf1ed');}for(let y=-44;y<70;y+=20){rr(-31,y,5,14,1,'#173749');rr(26,y,5,14,1,'#173749');}rr(-24,73,48,5,2,'#718c9b');
 }else{
 rr(-32,-89,64,48,8,paint);rr(-27,-78,54,17,4,'#193a4b');rr(-23,-75,46,10,2,'#9cdae3');rr(-26,-57,52,10,3,paint);rr(-33,-36,66,120,6,'#d6dde0');rr(-29,-31,58,108,3,'#eceddf');for(let y=-22;y<76;y+=12)rr(-25,y,50,2,1,'#b7c2c7');rr(-34,-36,3,120,1,c.color);rr(31,-36,3,120,1,c.dark);for(const x of [-d.w,d.w-12])rr(x,43,12,22,4,'#10151b');
 }
 for(const x of [-23,13]){rr(x,-d.l+4,10,5,2,'#fff5c4');rr(x,d.l-8,10,4,1,'#ff5252');}rr(-25,d.l-3,50,3,1,'#cad3d5');ctx.restore();
}
function initAudio(){if(audio){audio.resume();return}try{audio=new(window.AudioContext||window.webkitAudioContext)();for(let i=0;i<8;i++){let o=audio.createOscillator(),o2=audio.createOscillator(),g=audio.createGain(),f=audio.createBiquadFilter();o.type='sawtooth';o2.type='triangle';f.type='lowpass';f.frequency.value=450;g.gain.value=0;o.connect(f);o2.connect(f);f.connect(g);g.connect(audio.destination);o.start();o2.start();voices.push({o,o2,g,f})}musicBus=audio.createGain();musicBus.gain.value=musicLevel;musicBus.connect(audio.destination);musicTimer=setInterval(scheduleMusic,80)}catch(e){}}
function tone(freq,start,duration,level,type='sine',destination){if(!audio)return;let o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,start);g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(level,start+.012);g.gain.exponentialRampToValueAtTime(.0001,start+duration);o.connect(g);g.connect(destination||audio.destination);o.start(start);o.stop(start+duration+.02)}
function beep(){initAudio();if(!audio||muted)return;for(const offset of [0,.23])for(const f of vehicleTypes[lastModel].horn){let t=audio.currentTime+offset,o=audio.createOscillator(),g=audio.createGain(),filter=audio.createBiquadFilter();o.type='sawtooth';o.frequency.setValueAtTime(f,t);o.frequency.linearRampToValueAtTime(f*.985,t+.16);filter.type='lowpass';filter.frequency.value=1500;o.connect(filter);filter.connect(g);g.connect(audio.destination);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.042,t+.015);g.gain.setValueAtTime(.034,t+.12);g.gain.exponentialRampToValueAtTime(.0001,t+.18);o.start(t);o.stop(t+.2)}}
// A rounded "poft": a low falling punch plus a short, filtered air burst.
function thump(v){
 if(!audio||muted||v<45*S)return;
 const t=audio.currentTime,strength=clamp(v/(700*S),0,1),level=.11+strength*.075;
 const punch=audio.createOscillator(),body=audio.createGain();
 punch.type='sine';punch.frequency.setValueAtTime(185+strength*35,t);punch.frequency.exponentialRampToValueAtTime(48,t+.11);
 body.gain.setValueAtTime(.0001,t);body.gain.exponentialRampToValueAtTime(level,t+.006);body.gain.exponentialRampToValueAtTime(level*.35,t+.065);body.gain.exponentialRampToValueAtTime(.0001,t+.2);
 punch.connect(body);body.connect(audio.destination);punch.start(t);punch.stop(t+.22);
 const buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*.16),audio.sampleRate),data=buffer.getChannelData(0);
 for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1);
 const air=audio.createBufferSource(),filter=audio.createBiquadFilter(),envelope=audio.createGain();
 air.buffer=buffer;filter.type='lowpass';filter.frequency.setValueAtTime(2100,t);filter.frequency.exponentialRampToValueAtTime(380,t+.13);filter.Q.value=.6;
 envelope.gain.setValueAtTime(.0001,t);envelope.gain.exponentialRampToValueAtTime(level*.9,t+.004);envelope.gain.exponentialRampToValueAtTime(.0001,t+.145);
 air.connect(filter);filter.connect(envelope);envelope.connect(audio.destination);air.start(t);air.stop(t+.17);
}
function scheduleMusic(){if(!audio||audio.state!=='running'||musicStyle==='off')return;if(nextBeat<audio.currentTime)nextBeat=audio.currentTime+.03;const step=60/(musicStyle==='rock'?122:128)/4;while(nextBeat<audio.currentTime+.18){let t=nextBeat,n=beat%16,root=[110,87.307,130.813,97.999][Math.floor(beat/16)%4];if(n%4===0){let o=audio.createOscillator(),g=audio.createGain();o.frequency.setValueAtTime(125,t);o.frequency.exponentialRampToValueAtTime(40,t+.13);g.gain.setValueAtTime(.2,t);g.gain.exponentialRampToValueAtTime(.0001,t+.18);o.connect(g);g.connect(musicBus);o.start(t);o.stop(t+.2)}if(n%4===2)tone(6200,t,.035,.025,'square',musicBus);if(n===4||n===12){tone(180,t,.12,.055,'triangle',musicBus);tone(1900,t,.06,.018,'sawtooth',musicBus)}if(n%2===0){if(musicStyle==='rock'){tone(root,t,.17,.065,'sawtooth',musicBus);tone(root*1.5,t,.15,.038,'square',musicBus);tone(root*2,t,.14,.025,'sawtooth',musicBus)}else{tone(root*.5,t,.18,.1,'triangle',musicBus);tone(root*[2,3,4,3,2,3,4,6][n/2],t,.13,.04,'triangle',musicBus)}}nextBeat+=step;beat++}}
function begin(e){
 if(menuOpen||drags.has(e.pointerId)||drags.size>=2)return;
 const matches=cars.filter(c=>c.mode!=='held'&&Math.hypot(c.x-e.clientX,c.y-e.clientY)<Math.max(56,dimensions(c).l*S+27)).sort((a,b)=>Math.hypot(a.x-e.clientX,a.y-e.clientY)-Math.hypot(b.x-e.clientX,b.y-e.clientY));if(!matches.length)return;
 e.preventDefault();initAudio();const c=matches[0],drag={id:e.pointerId,car:c,ox:c.x-e.clientX,oy:c.y-e.clientY,history:[{x:c.x,y:c.y,t:e.timeStamp}]};drags.set(e.pointerId,drag);active=drag;lastModel=c.model;c.mode='held';c.reverseUntil=0;c.stuck=0;c.checkTime=undefined;c.aiNext=0;c.vx=c.vy=0;c.tx=c.x;c.ty=c.y;c.sounding=true;c.grab=.22;canvas.setPointerCapture(e.pointerId);game.classList.add('playing');
}
function move(e){const drag=drags.get(e.pointerId);if(!drag)return;e.preventDefault();const c=drag.car;c.tx=clamp(e.clientX+drag.ox,0,W);c.ty=clamp(e.clientY+drag.oy,0,H);drag.history.push({x:c.tx,y:c.ty,t:e.timeStamp});drag.history=drag.history.filter(p=>e.timeStamp-p.t<=110);}
function release(e,cancel=false){
 const released=e?.pointerId!==undefined?[drags.get(e.pointerId)].filter(Boolean):[...drags.values()];
 for(const drag of released){const c=drag.car,h=drag.history,end=h[h.length-1],start=h[0],age=(e?.timeStamp??end.t)-end.t,dt=(end.t-start.t)/1000;c.vx=c.vy=0;if(!cancel&&age<100&&dt>.008){c.vx=(end.x-start.x)/dt;c.vy=(end.y-start.y)/dt;const v=Math.hypot(c.vx,c.vy),limit=1300*S;if(v>limit){c.vx*=limit/v;c.vy*=limit/v}}c.mode='coast';c.resume=.8;drags.delete(drag.id);}active=[...drags.values()].at(-1)||null;
}
// A swipe starting on empty asphalt can bump every car it crosses.
function sweep(e){
 const gesture=sweeps.get(e.pointerId);if(!gesture)return;
 const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y,length=Math.hypot(dx,dy);
 if(length<4)return;
 const ux=dx/length,uy=dy/length;
 const speed=clamp(length/Math.max(.012,(e.timeStamp-gesture.t)/1000),120,950);
 for(const car of cars){
  if(car.mode==='held'||e.timeStamp-(gesture.hits.get(car.id)??-Infinity)<180)continue;
  const along=clamp((car.x-gesture.x)*ux+(car.y-gesture.y)*uy,0,length);
  const awayX=car.x-gesture.x-along*ux,awayY=car.y-gesture.y-along*uy;
  const radius=Math.max(35,dimensions(car).l*S+9),distance=Math.hypot(awayX,awayY);
  if(distance>radius)continue;
  const side=clamp((awayX*-uy+awayY*ux)/radius,-1,1),impulse=speed*.66/Math.sqrt(dimensions(car).mass);
  car.vx=ux*impulse-uy*side*impulse*.9;
  car.vy=uy*impulse+ux*side*impulse*.9;
  car.mode='coast';car.resume=.55;car.sounding=true;car.reverseUntil=0;car.aiNext=0;car.checkTime=undefined;
  gesture.hits.set(car.id,e.timeStamp);
 }
 gesture.x=e.clientX;gesture.y=e.clientY;gesture.t=e.timeStamp;
}
// A canvas gesture opens settings only on empty asphalt. Cars always win hit testing.
let holdTimer,holdOrigin;
function clearHold(){clearTimeout(holdTimer);holdOrigin=null;}
canvas.addEventListener('pointerdown',e=>{e.preventDefault();begin(e);if(drags.has(e.pointerId)||menuOpen)return;sweeps.set(e.pointerId,{x:e.clientX,y:e.clientY,t:e.timeStamp,hits:new Map()});canvas.setPointerCapture(e.pointerId);if(drags.size)return;if(e.clientX>W-76&&e.clientY<76){holdOrigin={x:e.clientX,y:e.clientY,id:e.pointerId};canvas.setPointerCapture(e.pointerId);holdTimer=setTimeout(()=>{clearHold();sweeps.clear();menuOpen=true;menu.showModal();},1400);}});
canvas.addEventListener('pointermove',e=>{if(holdOrigin&&Math.hypot(e.clientX-holdOrigin.x,e.clientY-holdOrigin.y)>12)clearHold();move(e);sweep(e)});
addEventListener('pointerup',e=>{clearHold();sweeps.delete(e.pointerId);release(e)});addEventListener('pointercancel',e=>{clearHold();sweeps.delete(e.pointerId);release(e,true)});addEventListener('blur',()=>{clearHold();sweeps.clear();release(undefined,true)});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearHold();sweeps.clear();release(undefined,true);audio?.suspend();last=0}else audio?.resume()});document.getElementById('honk').onclick=beep;
function closeMenu(){menu.close();menuOpen=false;last=0}document.getElementById('close').onclick=closeMenu;document.getElementById('back').onclick=closeMenu;menu.addEventListener('close',()=>{menuOpen=false;last=0});
function setMusic(style){musicStyle=style;initAudio();beat=0;nextBeat=audio?audio.currentTime+.03:0;if(musicBus)musicBus.gain.setTargetAtTime(style==='off'?0:musicLevel,audio.currentTime,.08);document.getElementById('music').value=style;const button=document.getElementById('music-toggle');button.dataset.mode=style;const labels={off:'OFF',electronic:'ELETRO',rock:'ROCK'};document.getElementById('music-state').textContent=labels[style];button.setAttribute('aria-label',style==='off'?'Música desligada. Ativar eletrônica':style==='electronic'?'Música eletrônica. Mudar para rock':'Música rock. Desligar música');scheduleMusic();}
document.getElementById('music-toggle').onclick=()=>setMusic({off:'electronic',electronic:'rock',rock:'off'}[musicStyle]);
document.getElementById('effects').onchange=e=>{muted=!e.target.checked;initAudio()};document.getElementById('music').onchange=e=>setMusic(e.target.value);document.getElementById('music-volume').oninput=e=>{musicLevel=Number(e.target.value)/100;if(musicBus)musicBus.gain.setTargetAtTime(musicStyle==='off'?0:musicLevel,audio.currentTime,.05)};
const sizeInput=document.getElementById('car-size'),countInput=document.getElementById('car-count');sizeInput.value=settings.size;countInput.value=settings.count;document.getElementById('size-value').textContent=settings.size+'%';
sizeInput.oninput=e=>{settings.size=Number(e.target.value);S=B*settings.size/100;document.getElementById('size-value').textContent=settings.size+'%';for(let i=0;i<8;i++){collide();cars.forEach(wall)}saveSettings();};countInput.onchange=e=>{settings.count=Number(e.target.value);buildCars(settings.count);saveSettings();};
// Oriented boxes cover the whole miniature, including bumpers and wheels.
function axes(c){return[{x:Math.cos(c.angle),y:Math.sin(c.angle)},{x:-Math.sin(c.angle),y:Math.cos(c.angle)}]}
function contact(a,b){const aa=axes(a),bb=axes(b),dx=b.x-a.x,dy=b.y-a.y;let depth=Infinity,normal;for(const axis of [...aa,...bb]){const radius=(axes,c)=>dimensions(c).w*S*Math.abs(axis.x*axes[0].x+axis.y*axes[0].y)+dimensions(c).l*S*Math.abs(axis.x*axes[1].x+axis.y*axes[1].y);const dot=dx*axis.x+dy*axis.y,over=radius(aa,a)+radius(bb,b)-Math.abs(dot);if(over<=0)return null;if(over<depth){depth=over;normal={x:axis.x*(dot<0?-1:1),y:axis.y*(dot<0?-1:1)}}}return{depth,...normal}}

// Paint-only circuit. No track edge is a physics boundary.
function trackGeometry(offset=0){const base=Math.min(W,H)*.37,inset=base+offset,left=inset,right=W-inset,top=inset,bottom=H-inset,radius=Math.max(4,Math.min(Math.min(W,H)*.12-offset,(right-left)/2,(bottom-top)/2));return{left,right,top,bottom,radius,width:right-left,height:bottom-top}}
function trackPoint(progress,offset=0){const g=trackGeometry(offset),{left:l,right:r,top:t,bottom:b,radius:q}=g,horizontal=Math.max(0,r-l-2*q),vertical=Math.max(0,b-t-2*q),arc=Math.PI*q/2,lengths=[horizontal,arc,vertical,arc,horizontal,arc,vertical,arc],total=lengths.reduce((a,b)=>a+b,0);let distance=((progress%1)+1)%1*total,index=0;while(index<7&&distance>lengths[index])distance-=lengths[index++];const u=lengths[index]?distance/lengths[index]:0;let x,y,heading;if(index===0){x=l+q+horizontal*u;y=t;heading=0}else if(index===2){x=r;y=t+q+vertical*u;heading=Math.PI/2}else if(index===4){x=r-q-horizontal*u;y=b;heading=Math.PI}else if(index===6){x=l;y=b-q-vertical*u;heading=-Math.PI/2}else{const k=(index-1)/2,centers=[[r-q,t+q],[r-q,b-q],[l+q,b-q],[l+q,t+q]],a=-Math.PI/2+k*Math.PI/2+u*Math.PI/2;x=centers[k][0]+Math.cos(a)*q;y=centers[k][1]+Math.sin(a)*q;heading=a+Math.PI/2}return{x,y,angle:heading+Math.PI/2,length:total}}
function nearestTrack(c,offset){const key=[W,H,offset].join(':');let points=trackSamples.get(key);if(!points){points=Array.from({length:120},(_,i)=>trackPoint(i/120,offset));trackSamples.set(key,points);}let best=Infinity,progress=0;for(let i=0;i<points.length;i++){const p=points[i],d=(p.x-c.x)**2+(p.y-c.y)**2;if(d<best){best=d;progress=i/120}}return progress;}
// Predict oriented-body clearance instead of steering blindly at the next waypoint.
function predictedGap(a,b,ax,ay,bx,by,angle){
 const aa=axes({angle}),bb=axes(b),ad=dimensions(a),bd=dimensions(b),dx=bx-ax,dy=by-ay;
 let gap=-Infinity;
 for(const n of [...aa,...bb]){const ar=(ad.w*Math.abs(n.x*aa[0].x+n.y*aa[0].y)+ad.l*Math.abs(n.x*aa[1].x+n.y*aa[1].y))*S;
 const br=(bd.w*Math.abs(n.x*bb[0].x+n.y*bb[0].y)+bd.l*Math.abs(n.x*bb[1].x+n.y*bb[1].y))*S;
 gap=Math.max(gap,Math.abs(dx*n.x+dy*n.y)-ar-br);}
 return gap;
}
function chooseVelocity(c,desiredX,desiredY,speed,reversing=false){
 const neighbors=cars.filter(other=>other!==c&&Math.hypot(other.x-c.x,other.y-c.y)<(dimensions(c).l+dimensions(other).l+30)*S+(speed+Math.hypot(other.vx,other.vy))*.85);
 const base=Math.atan2(desiredY,desiredX);let bestScore=-Infinity,best={x:0,y:0};
 const turns=reversing?[0,.45,-.45,.85,-.85]:[0,.3,-.3,.65,-.65,1.05,-1.05,1.4,-1.4];
 for(const turn of turns)for(const fraction of [1,.55,0]){
  const heading=base+turn,vx=Math.cos(heading)*speed*fraction,vy=Math.sin(heading)*speed*fraction;
  const angle=reversing?c.angle:heading+Math.PI/2,bound=bounds({...c,angle});
  let score=100*fraction*Math.cos(turn)-turn*turn*7+(turn>0?.2:0);
  // Avoid rapid left/right oscillation while passing another vehicle.
  if(c.aiVX!==undefined)score-=Math.hypot(vx-c.aiVX,vy-c.aiVY)/Math.max(1,speed)*7;
  for(const ahead of [.18,.45,.85]){
   const px=c.x+vx*ahead,py=c.y+vy*ahead,edge=Math.min(px-bound.left,bound.right-px,py-bound.top,bound.bottom-py);
   if(edge<0)score-=500+Math.abs(edge)/S*9;else if(edge<6*S)score-=(6*S-edge)/S*4;
   for(const other of neighbors){
    const gap=predictedGap(c,other,px,py,other.x+other.vx*ahead,other.y+other.vy*ahead,angle);
    if(gap<5*S)score-=250+(5*S-gap)/S*8;else if(gap<23*S)score-=(23*S-gap)/S*2;
   }
  }
  if(score>bestScore){bestScore=score;best={x:vx,y:vy};}
 }
 return best;
}
function guide(c,h){
 if(c.checkTime===undefined){c.checkTime=time;c.checkX=c.x;c.checkY=c.y;c.stuck=0;}
 if(time-c.checkTime>.8){const moved=Math.hypot(c.x-c.checkX,c.y-c.checkY);c.stuck=moved<13*B?(c.stuck||0)+.8:0;c.checkTime=time;c.checkX=c.x;c.checkY=c.y;}
 if(c.stuck>1.5&&!(c.reverseUntil>time)){c.reverseUntil=time+.65;c.aiNext=0;c.stuck=0;c.checkTime=time;}
 const reversing=c.reverseUntil>time;
 if(!c.aiNext||time>=c.aiNext){
  let dx,dy,speed;
  if(reversing){dx=-Math.sin(c.angle);dy=Math.cos(c.angle);speed=65*B;}
  else{const offset=c.lane*B,phase=nearestTrack(c,offset),path=trackPoint(phase,offset),target=trackPoint(phase+42*B/path.length,offset);dx=target.x-c.x;dy=target.y-c.y;speed=(76+(c.id%3)*15)*B*settings.speed/100;}
  const selected=chooseVelocity(c,dx,dy,speed,reversing);c.aiVX=selected.x;c.aiVY=selected.y;c.aiNext=time+.11;
 }
 const response=Math.min(1,h*7);c.vx+=((c.aiVX||0)-c.vx)*response;c.vy+=((c.aiVY||0)-c.vy)*response;
}
function collisionFeedback(key,x,y,speed,held=false){const threshold=(held?8:20)*S;if(speed<threshold)return;const previous=impactTimes.get(key)??-10;if(time-previous<.14)return;impactTimes.set(key,time);sparks.push({x,y,life:.2});thump(Math.max(speed,60*S));}
function wall(c){const b=bounds(c);let nx=0,ny=0;if(c.x<b.left){c.x=b.left;nx=1}else if(c.x>b.right){c.x=b.right;nx=-1}if(c.y<b.top){c.y=b.top;ny=1}else if(c.y>b.bottom){c.y=b.bottom;ny=-1}const impact=-(c.vx*nx+c.vy*ny);if(impact>0){const held=c.mode==='held';const side=nx?'x':'y';const edgeX=nx?(nx>0?0:W):c.x,edgeY=ny?(ny>0?0:H):c.y;collisionFeedback('wall'+c.id+side,edgeX,edgeY,impact,held);if(nx)c.vx=0;if(ny)c.vy=0}}
function collide(){for(let i=0;i<cars.length;i++)for(let j=i+1;j<cars.length;j++){const a=cars[i],b=cars[j],n=contact(a,b);if(!n)continue;const wa=(a.mode==='held'?.22:1)/dimensions(a).mass,wb=(b.mode==='held'?.22:1)/dimensions(b).mass,total=wa+wb;a.x-=n.x*(n.depth+.08)*wa/total;a.y-=n.y*(n.depth+.08)*wa/total;b.x+=n.x*(n.depth+.08)*wb/total;b.y+=n.y*(n.depth+.08)*wb/total;const closing=(a.vx-b.vx)*n.x+(a.vy-b.vy)*n.y;if(closing>0){const bothAuto=a.mode==='auto'&&b.mode==='auto',impulse=(bothAuto?1.03:1.25)*closing/total;a.vx-=n.x*impulse*wa;a.vy-=n.y*impulse*wa;b.vx+=n.x*impulse*wb;b.vy+=n.y*impulse*wb;collisionFeedback(a.id+':'+b.id,(a.x+b.x)/2,(a.y+b.y)/2,closing,a.mode==='held'||b.mode==='held');for(const c of [a,b])if(c.mode!=='held'&&c.mode!=='auto'&&(closing>35*S||c.mode==='idle')||c.mode==='auto'&&(a.mode==='held'||b.mode==='held'||closing>200*S)){c.mode='coast';c.resume=.6;c.sounding=true}}}}
// If two toys are pinned against an outer wall, let one slide sideways out.
function unjam(){for(let i=0;i<cars.length;i++)for(let j=i+1;j<cars.length;j++){const a=cars[i],b=cars[j],n=contact(a,b);if(!n||n.depth<.5*S)continue;const c=a.mode==='held'?b:b.mode==='held'?a:(a.id>b.id?a:b),lim=bounds(c);if(Math.abs(n.x)>.7&&(c.x<lim.left+2||c.x>lim.right-2)){const dir=c.y<H/2?1:-1;c.y=clamp(c.y+dir*4*S,lim.top,lim.bottom);c.vy+=dir*12*S;}else if(Math.abs(n.y)>.7&&(c.y<lim.top+2||c.y>lim.bottom-2)){const dir=c.x<W/2?1:-1;c.x=clamp(c.x+dir*4*S,lim.left,lim.right);c.vx+=dir*12*S;}}}
// The miniature always travels nose-first, including after a throw or impact.
function faceVelocity(c){if(c.mode==='auto'&&c.reverseUntil>time)return;if(Math.hypot(c.vx,c.vy)>1*S)c.angle=Math.atan2(c.vy,c.vx)+Math.PI/2;}
function update(dt){if(menuOpen)return;time+=dt;const count=Math.max(1,Math.ceil(dt/(1/240))),h=dt/count;for(let step=0;step<count;step++){for(const c of cars){c.grab=Math.max(0,c.grab-h);if(c.mode==='held'){const dx=c.tx-c.x,dy=c.ty-c.y,d=Math.hypot(dx,dy),speed=Math.min(1050*S,d*25);c.vx=d>.1?dx/d*speed:0;c.vy=d>.1?dy/d*speed:0;if(d>8*S){const desired=Math.atan2(dy,dx)+Math.PI/2;c.angle+=clamp(Math.atan2(Math.sin(desired-c.angle),Math.cos(desired-c.angle)),-h*8,h*8)}}else if(c.mode==='auto')guide(c,h);else if(c.mode==='coast'){const f=Math.exp(-1.4*h);c.vx*=f;c.vy*=f;if(Math.hypot(c.vx,c.vy)<18*S){c.resume-=h;if(c.resume<=0){c.mode=c.auto?'auto':'idle';if(!c.auto)c.vx=c.vy=0;c.sounding=false}}}faceVelocity(c);c.x+=c.vx*h;c.y+=c.vy*h;wall(c)}for(let pass=0;pass<8;pass++){collide();cars.forEach(wall)}unjam();for(let edgePass=0;edgePass<3;edgePass++){cars.forEach(faceVelocity);cars.forEach(wall);}}for(const c of cars)if(Math.hypot(c.vx,c.vy)>170*S)trails.push({x:c.x,y:c.y,angle:c.angle,life:.45});for(const list of [trails,sparks])for(let i=list.length-1;i>=0;i--){list[i].life-=dt;if(list[i].life<=0)list.splice(i,1)}}
function traceTrack(offset){const g=trackGeometry(offset);ctx.beginPath();ctx.roundRect(g.left,g.top,g.width,g.height,g.radius)}
// One light guide loop on continuous asphalt, with no island or outer curb.
function drawTrack(){ctx.save();traceTrack(0);ctx.setLineDash([15*S,27*S]);ctx.strokeStyle='#e9e3c32b';ctx.lineWidth=2*S;ctx.stroke();ctx.restore();const g=trackGeometry(),startY=H*.68;for(let row=0;row<2;row++)for(let col=0;col<8;col++)rr(g.left-38*S+col*9.5*S,startY+row*6*S,9.5*S,6*S,0,(row+col)%2?'#ece7d980':'#1e252c80');for(const phase of [.02,.27,.52,.77]){const p=trackPoint(phase);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);poly([[-5*S,5*S],[0,-5*S],[5*S,5*S],[0,2*S]],'#f4e8c840');ctx.restore()}}
function render(){ctx.fillStyle=asphalt||'#2c323c';ctx.fillRect(0,0,W,H);const glow=ctx.createRadialGradient(W*.45,H*.4,0,W*.5,H*.5,Math.max(W,H)*.8);glow.addColorStop(0,'#71869a12');glow.addColorStop(1,'#00000035');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);drawTrack();for(const p of trails){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.globalAlpha=p.life*.2;rr(-25*S,28*S,5*S,12*S,2,'#000');rr(20*S,28*S,5*S,12*S,2,'#000');ctx.restore()}for(const c of cars.filter(c=>c.mode!=='held'))drawCar(c);for(const c of cars.filter(c=>c.mode==='held'))drawCar(c);for(const p of sparks){ctx.globalAlpha=p.life/.2;ctx.strokeStyle='#ffd483';ctx.lineWidth=2;for(let i=0;i<6;i++){let a=i*Math.PI/3,r=(.2-p.life)*90;ctx.beginPath();ctx.moveTo(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r);ctx.lineTo(p.x+Math.cos(a)*(r+5),p.y+Math.sin(a)*(r+5));ctx.stroke()}ctx.globalAlpha=1}}
function audioFrame(){
 if(!audio||audio.state!=='running')return;
 for(let i=0;i<voices.length;i++){const v=voices[i],c=cars[i];if(!c){v.g.gain.setTargetAtTime(0,audio.currentTime,.05);continue;}
 const d=dimensions(c),speed=Math.hypot(c.vx,c.vy),power=Math.min(1,speed/(650*S)),held=c.mode==='held',enabled=!muted&&!menuOpen&&(held||c.sounding&&speed>2||c.grab>0);
 if(v.model!==c.model){v.o.type=d.wave;v.o2.type=d.secondary;v.model=c.model;}
 const pulse=c.model==='car'?1:.85+Math.sin(time*(c.model==='pickup'?32:21))*.15;
 const level=enabled?((held?.011:.007)+power*.03)*pulse:0;v.g.gain.setTargetAtTime(level,audio.currentTime,.045);
 const rpm=d.rpm+power*d.rev+(c.grab>0?c.grab*d.rev:0)+Math.sin(time*27)*power*2;
 v.o.frequency.setTargetAtTime(rpm,audio.currentTime,.06);v.o2.frequency.setTargetAtTime(rpm*d.ratio,audio.currentTime,.06);v.f.frequency.setTargetAtTime(d.filter+power*(c.model==='car'?950:470),audio.currentTime,.08);
 }
}
function frame(now){const dt=last?Math.min((now-last)/1000,.033):.016;last=now;update(dt);render();audioFrame();requestAnimationFrame(frame)}requestAnimationFrame(frame);

// Installable PWA: same-origin shell and offline support.
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
let installEvent;addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;document.getElementById('install').hidden=false;});document.getElementById('install').onclick=async()=>{if(!installEvent)return;await installEvent.prompt();installEvent=null;document.getElementById('install').hidden=true;};addEventListener('appinstalled',()=>{document.getElementById('install').hidden=true;});

// Keep long presses inside the toy, without browser selection, dragging or callouts.
for(const eventName of ['selectstart','dragstart','contextmenu'])game.addEventListener(eventName,e=>e.preventDefault());

const speedInput=document.getElementById('traffic-speed');speedInput.value=settings.speed;document.getElementById('speed-value').textContent=settings.speed+'%';speedInput.oninput=e=>{settings.speed=Number(e.target.value);document.getElementById('speed-value').textContent=settings.speed+'%';saveSettings();};
for(const model of Object.keys(vehicleTypes)){const checkbox=document.getElementById('model-'+model);checkbox.checked=settings.models.includes(model);checkbox.onchange=()=>{const chosen=Object.keys(vehicleTypes).filter(name=>document.getElementById('model-'+name).checked);if(!chosen.length){checkbox.checked=true;return;}settings.models=chosen;buildCars(settings.count);saveSettings();};}
