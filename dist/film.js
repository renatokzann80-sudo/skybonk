/* A deterministic 18-second, 2.5D comic film. All artwork is local;
   the camera, particles, sweep deformation and impact run at display refresh. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('film'), ctx = canvas.getContext('2d', {alpha:false});
  const cinema=$('cinema'), hero=$('hero'), blackout=$('blackout');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const duration=18, assets={}, sprites={};
  let width=0,height=0,dpr=1,elapsed=0,last=0,raf=0,playing=false,paused=false,ready=false,muted=true,audio=null,hit=false,whooshed=false,revealing=false;
  const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
  const mix=(a,b,t)=>a+(b-a)*t;
  const ease=t=>t*t*(3-2*t);
  const stars=Array.from({length:180},(_,i)=>({x:((i*127.13)%997)/997,y:((i*233.37)%991)/991,z:.2+(i%19)/19}));
  function resize(){width=innerWidth;height=innerHeight;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);if(ready&&playing)draw(elapsed)}
  addEventListener('resize',resize);resize();
  const load=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src});
  // Two alpha-preserving sprites share one horizontal atlas.
  function sprite(col){const im=assets.sprites,s=im.width/2,sh=im.height,c=document.createElement('canvas');c.width=s;c.height=sh;c.getContext('2d').drawImage(im,col*s,0,s,sh,0,0,s,sh);return c}
  function imageCover(im,zoom=1,fx=.5,fy=.5){const s=Math.max(width/im.width,height/im.height)*zoom;const x=width*.5-im.width*s*fx,y=height*.5-im.height*s*fy;ctx.drawImage(im,x,y,im.width*s,im.height*s);return {x,y,s}}
  function object(im,x,y,size,angle=0,stretch=1){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(stretch,1);ctx.drawImage(im,-size/2,-size/2,size,size);ctx.restore()}
  function space(t,speed=1){ctx.fillStyle='#02050d';ctx.fillRect(0,0,width,height);const glow=ctx.createRadialGradient(width*.62,height*.55,1,width*.62,height*.55,width*.7);glow.addColorStop(0,'#14253e');glow.addColorStop(.55,'#080b20');glow.addColorStop(1,'#02040b');ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);for(const s of stars){const k=1+(t*.045*speed*s.z)%1.9;const x=width/2+(s.x-.5)*width*k,y=height/2+(s.y-.5)*height*k;ctx.globalAlpha=.25+s.z*.7;ctx.fillStyle='#dceeff';ctx.beginPath();ctx.arc(x,y,.6+s.z,0,Math.PI*2);ctx.fill();if(speed>2){ctx.strokeStyle='#ceddff';ctx.lineWidth=s.z;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(x-width/2)*.035*speed,y+(y-height/2)*.035*speed);ctx.stroke()}}ctx.globalAlpha=1}
  function streaks(t,intensity){ctx.save();for(let i=0;i<34;i++){let q=((i*.173+t*.75)%1);let x=((i*83.7)%100)/100*width,y=q*height;ctx.strokeStyle=i%3?'#fff5bc66':'#fff';ctx.lineWidth=1+(i%3);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-width*.12*intensity,y-height*.27*intensity);ctx.stroke()}ctx.restore()}
  function coin(x,y,size,angle,trail=0){if(trail){ctx.save();ctx.translate(x,y);ctx.rotate(angle);let g=ctx.createLinearGradient(-size*1.8,-size*1.8,0,0);g.addColorStop(0,'#ff6d0000');g.addColorStop(.65,'#ff6d0030');g.addColorStop(1,'#ffcf4699');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-size*.3,size*.25);ctx.lineTo(-size*2,-size*2.4);ctx.lineTo(size*.2,-size*.25);ctx.closePath();ctx.fill();ctx.restore()}object(sprites.coin,x,y,size,angle)}
  function street(t){ctx.save();const isMobile=width<650;const zoom=1.035+Math.max(0,t-11)*.009;const tr=imageCover(assets.street,zoom,isMobile?.67:.5,.49);if(t<14.55){ // A subtle scanline puppet deformation moves the sweeping pose.
      const amplitude=Math.sin((t-11)*4.5)*6;
      for(let sy=370;sy<870;sy+=4){const bend=Math.sin((sy-370)/500*Math.PI);const sx=775,sw=477;ctx.drawImage(assets.street,sx,sy,sw,4,tr.x+sx*tr.s+amplitude*bend*tr.s,tr.y+sy*tr.s,sw*tr.s,4*tr.s+.5)}
      const sweep=Math.sin((t-11)*4.5);ctx.fillStyle='#e8d0a177';for(let i=0;i<13;i++){const px=816+Math.sin(i*2.3)*20+sweep*12,py=850-Math.abs(Math.sin(i*1.7+t*3))*25;ctx.beginPath();ctx.arc(tr.x+px*tr.s,tr.y+py*tr.s,(1+i%3)*tr.s,0,7);ctx.fill()}}
    const head={x:tr.x+1040*tr.s,y:tr.y+385*tr.s};
    if(t>=13.55&&t<14.9){const p=clamp((t-13.55)/1.1),drop=p*p*p;const size=Math.min(width*.67,height*.72);const cy=mix(-size*.85,head.y-size*.28,drop);coin(head.x,cy,size,-.18+p*.35);if(p>.58)streaks(t,.5);if(p>=1){ctx.fillStyle='#ffe74955';ctx.beginPath();ctx.ellipse(head.x,head.y+height*.15,width*.25,height*.07,0,0,7);ctx.fill()}}
    ctx.restore();
  }
  function sound(freq,seconds,type='sine',volume=.09,endFreq=freq){if(muted||!audio)return;const osc=audio.createOscillator(),gain=audio.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq,20),audio.currentTime+seconds);gain.gain.setValueAtTime(0,audio.currentTime);gain.gain.linearRampToValueAtTime(volume,audio.currentTime+.02);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+seconds);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+seconds)}
  function draw(t){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);let black=0,caption='',chapter='01 / SPACE';
    if(t<5.4){space(t);const p=ease(clamp((t-1)/4.4));object(sprites.earth,width*.55,height*.52,mix(height*.08,Math.min(width*.75,height*.73),p),-.08+p*.08);black=1-ease(clamp((t-.8)/1.7));if(t>2.3)caption='meanwhile, in the group chat…'}
    else if(t<9){const p=clamp((t-5.4)/3.6);space(t,1+p*3);const sz=Math.min(width*.75,height*.73);object(sprites.earth,mix(width*.55,width*.25,p),mix(height*.52,height*.88,p),sz*(1+p*1.9),-.02-p*.12);const cp=ease(p);coin(mix(width*1.13,width*.56,cp),mix(-height*.22,height*.48,cp),mix(height*.17,height*.65,cp),-.55+cp*.75,1);caption='bro missed the moon.';chapter='02 / YEET'}
    else if(t<11){const p=(t-9)/2;const g=ctx.createLinearGradient(0,0,width,height);g.addColorStop(0,'#08142d');g.addColorStop(.4,'#12507a');g.addColorStop(1,'#ffb952');ctx.fillStyle=g;ctx.fillRect(0,0,width,height);ctx.save();ctx.translate(width/2,height/2);ctx.rotate(-.15);ctx.translate(-width/2,-height/2);object(sprites.earth,width*.5,height*2.1-p*height*.55,height*2.8,0);streaks(t,1.4);coin(width*.53+Math.sin(t*23)*3,height*.48+Math.cos(t*17)*3,height*.72,-.12+Math.sin(t*2)*.12,1);ctx.restore();chapter='02 / YEET';caption='incoming skill issue.';black=clamp((t-10.7)/.3)}
    else if(t<15){const j=t>=14.65?(1-(t-14.65)/.35)*13:0;ctx.save();ctx.translate(Math.sin(t*100)*j,Math.cos(t*87)*j);street(t);ctx.restore();chapter='03 / BONK';caption=t<13.55?'not a single thought.':'';black=t<11.35?1-(t-11)/.35:0;black=Math.max(black,clamp((t-14.86)/.14));}
    else if(t<16.3){ctx.fillStyle='#000';ctx.fillRect(0,0,width,height);black=1;chapter='04 / STONKS';}
    else{if(!revealing){revealing=true;document.body.classList.add('revealed');hero.inert=false;}ctx.fillStyle='#000';ctx.fillRect(0,0,width,height);cinema.style.background='transparent';canvas.style.opacity='0';black=1-ease(clamp((t-16.3)/1.3));chapter='04 / STONKS';}
    if(t>=9&&!whooshed){whooshed=true;sound(100,1.8,'sawtooth',.035,900)}if(t>=14.65&&!hit){hit=true;sound(160,.3,'triangle',.24,38);sound(560,.14,'square',.045,100)}
    blackout.style.opacity=black;$('impact-word').style.display=t>=14.65&&t<14.94?'block':'none';$('cinema-ui').classList.toggle('visible',t>1.7&&t<14.86);$('caption').textContent=caption;$('chapter').textContent=chapter;$('progress').style.width=clamp(t/duration)*100+'%';$('timecode').textContent='00:'+String(Math.floor(t)).padStart(2,'0')+' / 00:18';
  }
  function frame(now){if(!playing)return;if(!paused){elapsed+=Math.min((now-last)/1000,.1);draw(elapsed);if(elapsed>=duration){finish(false);return}}last=now;raf=requestAnimationFrame(frame)}
  function finish(focus=true){document.dispatchEvent(new Event('skybonk:hero'));playing=false;cancelAnimationFrame(raf);cinema.hidden=true;hero.inert=false;document.body.classList.remove('watching');document.body.classList.add('revealed');if(focus)document.querySelector('.main-replay').focus({preventScroll:true})}
  function start(){if(!ready)return;cancelAnimationFrame(raf);elapsed=0;paused=false;hit=false;whooshed=false;revealing=false;playing=true;hero.inert=true;cinema.hidden=false;cinema.style.background='#000';canvas.style.opacity='1';document.body.classList.remove('revealed');document.body.classList.add('watching');$('pause').innerHTML='<svg class="ui-icon icon-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7v10M15 7v10"/></svg>';$('pause').setAttribute('aria-label','Pause animation');scrollTo({top:0,left:0,behavior:'instant'});draw(0);last=performance.now();raf=requestAnimationFrame(frame)}
  function togglePause(){if(!playing)return;paused=!paused;$('pause').innerHTML=paused?'<svg class="ui-icon icon-play" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 7 8 5-8 5Z"/></svg>':'<svg class="ui-icon icon-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7v10M15 7v10"/></svg>';$('pause').setAttribute('aria-label',paused?'Resume animation':'Pause animation');if(audio){if(paused)audio.suspend();else if(!muted)audio.resume()}}
  $('pause').addEventListener('click',togglePause);$('skip').addEventListener('click',()=>finish());$('go-hero').addEventListener('click',()=>finish());
  $('sound').addEventListener('click',async()=>{muted=!muted;if(!muted){try{audio ||= new (window.AudioContext||window.webkitAudioContext)();await audio.resume();sound(320,.16,'sine',.06,640)}catch{muted=true}}else if(audio)await audio.suspend();$('sound').textContent=muted?'Sound: off':'Sound: on';$('sound').setAttribute('aria-pressed',String(!muted))});
  document.querySelectorAll('.replay').forEach(b=>b.addEventListener('click',()=>{if(!ready){boot();return}start();$('skip').focus({preventScroll:true})}));
  document.addEventListener('keydown',e=>{if(playing&&e.code==='Escape'){finish()}else if(playing&&e.code==='Space'&&!['BUTTON','A'].includes(document.activeElement.tagName)){e.preventDefault();togglePause()}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing&&!paused)togglePause()});
  async function boot(){ $('load-error').hidden=true;try{const loaded=await Promise.all(['hero','street','sprites'].map(async name=>[name,await load('assets/'+name+'.png')]));for(const [name,im] of loaded)assets[name]=im;sprites.earth=sprite(0);sprites.coin=sprite(1);ready=true;if(reduced.matches)finish(false);else start()}catch(e){$('load-error').hidden=false;console.error('A scene could not be loaded.',e)}}
  $('retry').addEventListener('click',boot);boot();
})();

