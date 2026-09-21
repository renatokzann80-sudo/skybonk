/* SKYBONK's cursor-driven universe. Native WebGL; no scene libraries.
 * The fragment shader bends a grid and star field around the pointer.
 * Clicks emit a shockwave; GO DEGEN increases speed and gravitational pull.
 */
(() => {
  'use strict';
  const root=document.documentElement, canvas=document.getElementById('space-canvas');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const menu=document.getElementById('mobile-nav'), toggle=document.getElementById('menu-toggle');
  function closeMenu(){menu.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open navigation')}
  toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';menu.hidden=!open;toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close navigation':'Open navigation')});
  menu.addEventListener('click',e=>{if(e.target.closest('a,button'))closeMenu()});
  document.addEventListener('click',e=>{if(!menu.hidden&&!e.target.closest('.masthead'))closeMenu()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){closeMenu();toggle.focus()}});
  document.querySelector('.back-top').addEventListener('click',()=>{document.getElementById('home').scrollIntoView({behavior:motion.matches?'instant':'smooth'});document.querySelector('.masthead .wordmark').focus({preventScroll:true})});
  const links=[...document.querySelectorAll('.nav-link')];
  function updateNav(){const lore=document.getElementById('lore').getBoundingClientRect().top<innerHeight*.5;links.forEach(a=>{const active=a.hash===(lore?'#lore':'#home');a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')})}
  addEventListener('scroll',updateNav,{passive:true});updateNav();
  document.querySelectorAll('.lore-card').forEach(card=>{
    card.addEventListener('pointermove',event=>{if(motion.matches||innerWidth<801)return;const box=card.getBoundingClientRect();card.style.setProperty('--card-x',((event.clientX-box.left)/box.width-.5)*4);card.style.setProperty('--card-y',((event.clientY-box.top)/box.height-.5)*4)});
    card.addEventListener('pointerleave',()=>{card.style.removeProperty('--card-x');card.style.removeProperty('--card-y')});
  });
  let chaos=false,gl=null,program=null,uniforms={},frameId=0,lost=false;
  const mouse={x:.64,y:.5,tx:.64,ty:.5,clickX:.64,clickY:.5,clicked:-100};
  const chaosButton=document.querySelector('.chaos-toggle');
  chaosButton.addEventListener('click',()=>{chaos=!chaos;chaosButton.setAttribute('aria-pressed',String(chaos));chaosButton.innerHTML=chaos?'<span aria-hidden="true">✳</span> TOO DEGEN':'<span aria-hidden="true">✳</span> GO DEGEN';document.body.classList.toggle('degen',chaos);mouse.clicked=performance.now()/1000;mouse.clickX=mouse.tx;mouse.clickY=mouse.ty});
  addEventListener('pointermove',e=>{mouse.tx=e.clientX/innerWidth;mouse.ty=1-e.clientY/innerHeight;if(!motion.matches){root.style.setProperty('--pointer-x',(mouse.tx-.5)*2);root.style.setProperty('--pointer-y',(mouse.ty-.5)*2)}},{passive:true});
  addEventListener('pointerdown',e=>{if(document.body.classList.contains('watching'))return;mouse.clicked=performance.now()/1000;mouse.clickX=e.clientX/innerWidth;mouse.clickY=1-e.clientY/innerHeight},{passive:true});
  const vertex=`attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}`;
  const fragment=`precision mediump float;
uniform vec2 resolution;uniform vec2 mouse;uniform vec2 clickPos;uniform float time;uniform float power;uniform float clickAge;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float line(float d,float size){return 1.-smoothstep(size,size+.002,d);}
void main(){
 vec2 uv=gl_FragCoord.xy/resolution;
 vec2 p=(2.*gl_FragCoord.xy-resolution)/resolution.y;
 vec2 m=(mouse*2.-1.)*vec2(resolution.x/resolution.y,1.);
 vec2 delta=p-m;float force=exp(-dot(delta,delta)*1.35);
 vec2 q=p-delta*force*(.38+power*.35);
 q+=vec2(sin(p.y*2.+time*.22),cos(p.x*1.4+time*.15))*.017;
 vec2 center=vec2(.55,.05);
 vec3 color=vec3(.067,.055,.095);
 float haze=exp(-length((p-center)*vec2(.7,1.))*1.4);
 color+=vec3(.135,.067,.20)*haze;
 color+=vec3(.055,.07,.012)*force;
 vec2 grid=q;grid.y+=.07*sin(q.x*2.+time*.18);grid*=7.;
 vec2 cell=abs(fract(grid-.5)-.5);float g=1.-smoothstep(.006,.025,min(cell.x,cell.y));
 color+=vec3(.10,.072,.16)*g*(.3+.4*haze);
 float ring=length((q-center)*vec2(.70,1.));
 for(int j=0;j<4;j++){float r=.5+float(j)*.32;float dash=.45+.55*step(.2,sin(atan(q.y-center.y,q.x-center.x)*19.+time*.2));color+=vec3(.14,.09,.21)*line(abs(ring-r),.001)*dash;}
 for(int layer=0;layer<3;layer++){
  float l=float(layer);vec2 s=q*(7.+l*6.)+vec2(time*(.018+power*.07)*(l+1.),time*.016*(l+1.));
  vec2 id=floor(s),f=fract(s)-.5;float h=hash(id+l*31.);
  f-=vec2(hash(id+4.),hash(id+11.))*.6-.3;
  float d=length(f);float star=(1.-smoothstep(.015,.048,d))*step(.86,h);
  float twinkle=.65+.35*sin(time*(.5+h)+h*100.);
  vec3 tint=mix(vec3(.68,.54,.95),vec3(.81,1.,.32),step(.95,h));
  color+=tint*star*twinkle*(.5+l*.15);
  float cross=(1.-smoothstep(.005,.012,abs(f.x)))*(1.-smoothstep(.02,.10,abs(f.y)))+(1.-smoothstep(.005,.012,abs(f.y)))*(1.-smoothstep(.02,.10,abs(f.x)));
  color+=tint*cross*step(.988,h)*.55;
 }
 vec2 click=(clickPos*2.-1.)*vec2(resolution.x/resolution.y,1.);
 float radius=clickAge*.8;float wave=(1.-smoothstep(.005,.024,abs(length(p-click)-radius)))*max(0.,1.-clickAge*.6)*step(0.,clickAge);
 color+=vec3(.5,.3,.85)*wave;
 color*=1.-.25*pow(length(uv-.5),1.5);
 gl_FragColor=vec4(color,1.);
}`;
  function compile(type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw new Error(message)}return shader}
  function size(){if(!gl||lost)return;const ratio=Math.min(devicePixelRatio||1,1.5,Math.sqrt(1600000/(innerWidth*innerHeight)));canvas.width=Math.round(innerWidth*ratio);canvas.height=Math.round(innerHeight*ratio);gl.viewport(0,0,canvas.width,canvas.height)}
  function initialize(){try{gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,powerPreference:'low-power'});if(!gl)throw new Error('WebGL unavailable');const v=compile(gl.VERTEX_SHADER,vertex),f=compile(gl.FRAGMENT_SHADER,fragment);program=gl.createProgram();gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.deleteShader(v);gl.deleteShader(f);gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);const pos=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);for(const key of ['resolution','mouse','clickPos','time','power','clickAge'])uniforms[key]=gl.getUniformLocation(program,key);canvas.dataset.renderer='webgl';size();frameId=requestAnimationFrame(render)}catch(error){canvas.dataset.renderer='fallback';canvas.style.background='radial-gradient(ellipse at 70% 40%,#392252,#15121e 70%)';chaosButton.disabled=true;chaosButton.textContent='STAYING CHILL';chaosButton.title='The interactive universe is unavailable in this browser';console.warn('The universe is using its quiet fallback.',error.message)}}
  let previous=0;
  function render(now){if(lost)return;frameId=requestAnimationFrame(render);if(document.hidden||document.body.classList.contains('watching')||now-previous<30)return;previous=now;mouse.x+=(mouse.tx-mouse.x)*.1;mouse.y+=(mouse.ty-mouse.y)*.1;gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);gl.uniform2f(uniforms.mouse,mouse.x,mouse.y);gl.uniform2f(uniforms.clickPos,mouse.clickX,mouse.clickY);gl.uniform1f(uniforms.time,motion.matches?0:now/1000);gl.uniform1f(uniforms.power,chaos?1:0);gl.uniform1f(uniforms.clickAge,motion.matches?100:now/1000-mouse.clicked);gl.drawArrays(gl.TRIANGLES,0,3)}
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;cancelAnimationFrame(frameId);canvas.dataset.renderer='lost'});
  canvas.addEventListener('webglcontextrestored',()=>{lost=false;initialize()});
  addEventListener('resize',()=>{size();if(innerWidth>800)closeMenu()});
  initialize();
})();
