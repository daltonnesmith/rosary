const tones = { luminous: [65,134,154], joyful: [171,103,120], sorrowful: [109,87,145], glorious: [186,146,69] };
const gold = [207,169,98], tau = Math.PI * 2;
// Original miniature silhouettes, kept broad enough to read on a fingertip-sized bead.
const cameos = Object.fromEntries(Object.entries({
  mary:'M-11 12 Q-8 6 -8 0 Q-7 -13 0 -13 Q8 -13 9 1 L12 12 Q5 8 0 12 Q-4 8 -11 12Z M-4 -4 Q-4 2 0 4 Q4 1 4 -5 Q0 -7 -4 -4Z',
  lily:'M-1 13 L-1 4 Q-10 0 -11 -7 Q-5 -6 -2 -2 Q-4 -9 0 -14 Q5 -8 3 -2 Q7 -8 12 -8 Q11 -1 2 4 L1 9 Q5 4 10 5 Q8 10 1 11 L1 13Z',
  dove:'M-13 -7 Q-7 -5 -1 -1 Q-4 -10 -2 -13 Q5 -8 7 -2 Q9 -5 11 -4 L14 -2 L10 0 Q8 6 2 7 L-6 12 L-4 6 L-10 7 L-6 3 Q-11 1 -13 -7Z',
  crucifix:'M-2 -13 H2 V-6 H11 V-2 H2 V14 H-2 V-2 H-11 V-6 H-2Z',
  crown:'M-13 -6 L-7 -2 L-5 -10 L0 -3 L5 -10 L7 -2 L13 -6 L9 6 H-9Z M-9 8 H9 V11 H-9Z',
  heart:'M0 12 C-17 1 -9 -9 0 -3 C9 -10 16 0 0 12Z M-2 -6 Q-5 -9 -1 -13 Q-1 -10 1 -9 L3 -13 Q6 -8 2 -6Z',
}).map(([name,path])=>[name,new Path2D(path)]));
const windowMotif = { luminous:'dove', joyful:'lily', sorrowful:'crucifix', glorious:'crown' };
function crest(c,r,mark) {
  c.scale(r/22,r/22);
  const rim=c.createLinearGradient(-12,-15,12,15);
  rim.addColorStop(0,'#fff5cf');rim.addColorStop(.48,'#efd198');rim.addColorStop(1,'#c18a49');
  c.lineWidth=.65;c.strokeStyle=rim;
  for(let i=0;i<20;i++){
    const a=i*tau/20;c.beginPath();c.arc(19*Math.cos(a),19*Math.sin(a),.8,0,tau);c.stroke();
  }
  c.beginPath();c.arc(0,0,15.7,0,tau);c.stroke();
  const carving=cameos[mark];
  c.translate(.55,1.25);c.fillStyle='#37231c';c.fill(carving,'evenodd');
  c.translate(-.55,-1.25);c.fillStyle=rim;c.fill(carving,'evenodd');
  if(mark==='mary'){c.beginPath();c.arc(0,-6,8.5,Math.PI*1.05,Math.PI*1.95);c.stroke();}
}
function surface(canvas) {
  const w = canvas.clientWidth, h = canvas.clientHeight, scale = Math.min(2, devicePixelRatio);
  if (canvas.width !== Math.round(w * scale) || canvas.height !== Math.round(h * scale)) {
    canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
  }
  const c = canvas.getContext('2d');
  c.setTransform(scale,0,0,scale,0,0); c.clearRect(0,0,w,h);
  return { c,w,h };
}
// Lathed enamel cabochon, raised metal bezel and an engraving projected on the front face.
function medal(c,x,y,r,yaw,tone,mark) {
  const cos = Math.cos(yaw), sin = Math.sin(yaw);
  const project = ([a,b,z]) => [x+r*(a*cos+z*sin), y+r*(b*1.08-z*.12)];
  const rings = [[.78,-.31],[.99,-.19],[1,.12],[.93,.23],[.83,.27],[.79,.23],[.64,.33],[.35,.40],[.001,.43]];
  const faces = [];
  for (let j=1;j<rings.length;j++) for (let i=0;i<32;i++) {
    const vertex = (ring,n) => [ring[0]*Math.cos(n*tau/32),ring[0]*Math.sin(n*tau/32),ring[1]];
    const quad = [vertex(rings[j-1],i),vertex(rings[j-1],i+1),vertex(rings[j],i+1),vertex(rings[j],i)];
    const [a,b,z] = quad[0], light = .86-.28*a-.32*b+.15*z;
    const base = j<6 ? gold : tone;
    faces.push({ depth:z*cos-a*sin, pts:quad.map(project), color:`rgb(${base.map(n=>Math.min(255,n*light)).join(' ')})` });
  }
  for (const f of faces.sort((a,b)=>a.depth-b.depth)) {
    c.beginPath(); f.pts.forEach(([a,b],i)=>i?c.lineTo(a,b):c.moveTo(a,b)); c.closePath();
    c.fillStyle=c.strokeStyle=f.color; c.lineWidth=.6; c.fill(); c.stroke();
  }
  if (cos>.1) {
    c.save(); const [ax,ay]=project([0,0,.44]); c.translate(ax,ay); c.scale(cos,1);
    crest(c,r,mark); c.restore();
  }
}
export const finishColors = {wood:[145,93,52],pearl:[228,216,202],MAT:[161,92,60],MAR:[77,135,96],LUK:[122,90,158],JOH:[63,103,162],jerusalem:[222,165,58],rose:[178,101,109],fish:[74,149,157],harp:[192,145,89],anchor:[90,113,138],vine:[118,134,79],chalice:[203,174,98],olive:[136,147,90],dove:[190,196,185],star:[96,107,157]};
function currentRing(c,x,y,r) {
  c.beginPath();c.arc(x,y,r,0,tau);
  c.lineWidth=5;c.strokeStyle='#40301f';c.stroke();
  c.lineWidth=2.8;c.strokeStyle='#fff0a8';c.stroke();
}
export function drawStrand(canvas,index,set,offset,steps,previewFinish,showTap=!previewFinish) {
  const {c,w,h}=surface(canvas), r=Math.min(34,h*.33);
  const link=c.createLinearGradient(0,h*.47-4,0,h*.47+4);
  link.addColorStop(0,'#644329');link.addColorStop(.3,'#ffdf94');link.addColorStop(.65,'#a07644');link.addColorStop(1,'#463229');
  c.strokeStyle=link; c.lineWidth=2;
  for(let i=-6;i<w/11+6;i++){
    const x=i*11+(offset*w*.24)%22;c.beginPath();c.ellipse(x,h*.47,7,i%2?1.8:4,i%2?-.15:.15,0,tau);c.stroke();
  }
  for(let i=-3;i<=3;i++) {
    const x=w*(.5+(i+offset)*.24), next=i===1;
    const s=steps[index+i];if(!s)continue;
    const motif=s.stage==='mystery'?windowMotif[set]:({mary:'mary',queen:'mary',glory:'dove',fatima:'heart'})[s.prayer]||'crucifix';
    const current=i===0 && showTap;
    if(current){
      const glow=c.createRadialGradient(x,h*.47,0,x,h*.47,r*1.55);
      glow.addColorStop(0,'#ffdf7280');glow.addColorStop(1,'#ffdf7200');
      c.fillStyle=glow;c.fillRect(x-r*1.55,h*.47-r*1.55,r*3.1,r*3.1);
    }
    const tone = finishColors[previewFinish] ?? tones[set];
    medal(c,x,h*.47,r*(current?1.08:.88),Math.sin((index+i)*1.7)*.32+offset*.6,tone,motif);
    if(current)currentRing(c,x,h*.47,r*1.22);
    if(next && showTap){c.fillStyle='#fff2d3';c.font='bold 10px system-ui';c.textAlign='center';c.fillText('TAP',x,h-1);}
  }
}
export function drawLoop(canvas,angle,s,set) {
  const {c,w,h}=surface(canvas), a=angle*Math.PI/180, k=Math.min(w/2.6,h/3.6);
  const proj=(x,y,z=0)=>{const depth=z*Math.cos(a)-x*Math.sin(a), p=3.8/(3.8-depth);return [w/2+k*(x*Math.cos(a)+z*Math.sin(a))*p,h*.31+k*y*p,depth,p];};
  const points=[];
  for(let i=0;i<55;i++){
    const t=i*tau/55, x=-.91*Math.sin(t), y=.89*Math.cos(t);
    const separator=i%11===0;
    points.push({pos:proj(x,y,.06*Math.sin(2*t)),large:separator,active:s.decade && (s.bead ? i===(s.decade-1)*11+s.bead : i===(s.decade-1)*11)});
  }
  c.strokeStyle='#b99b69'; c.lineWidth=1.8;c.beginPath();
  points.forEach(({pos:[x,y]},i)=>i?c.lineTo(x,y):c.moveTo(x,y)); c.closePath(); c.stroke();
  const [cx,cy]=proj(0,.89); c.beginPath();c.moveTo(cx,cy);c.lineTo(cx,cy+k*1.24);c.stroke();
  const tailGap=!s.decade && (s.prayer==='father'?.91:s.prayer==='mary'?[.70,.56,.42][s.bead-1]:s.prayer==='glory'?.22:null);
  for(const gap of [.22,.42,.56,.70,.91]) points.push({pos:proj(0,.89+gap),large:gap===.22||gap===.91,active:gap===tailGap});
  for(const {pos:[x,y,,p],large,active} of points.sort((a,b)=>a.pos[2]-b.pos[2])){
    if(x===cx && y===cy){medal(c,x,y,k*.08,a,tones[set],windowMotif[set]);continue;}
    const r=k*(large?.049:.037)*p, grad=c.createRadialGradient(x-r*.35,y-r*.4,0,x,y,r);
    grad.addColorStop(0,'#fff1cf');grad.addColorStop(.45,active?'#fff09a':large?'#b69354':`rgb(${tones[set].join(' ')})`);grad.addColorStop(1,'#352d29');c.fillStyle=grad;c.beginPath();c.arc(x,y,r,0,tau);c.fill();
    if(active){c.strokeStyle='#ffdf87';c.lineWidth=2;c.stroke();}
  }
  c.fillStyle='#e5bd71'; c.fillRect(cx-2,cy+k*1.06,4,k*.26);c.fillRect(cx-k*.08,cy+k*1.14,k*.16,4);
  const spot=points.find(p=>p.active);
  if(spot){
    const [x,y,,p]=spot.pos;
    currentRing(c,x,y,Math.max(7,k*(spot.large?.085:.067)*p+2));
  }else if(!s.decade){
    const cross=s.prayer==='cross'||s.prayer==='creed';
    currentRing(c,cx,cross?cy+k*1.19:cy,cross?k*.17:k*.105);
  }
}
