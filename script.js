// ════════════════════════════════════════
// Constants
// ════════════════════════════════════════
const SHEET_MM  = {A4:[210,297],A3:[297,420],A2:[420,594],A1:[594,841],A0:[841,1189]};
const BASE_PPMM = 3.7795;
const UNIT_MM   = {mm:1,cm:10,m:1000,in:25.4,ft:304.8,px:null};
const ZSTEPS    = [5,8,12,17,25,33,50,67,75,90,100,110,125,150,175,200,250,300,400,500];
const PAL       = ['#E24B4A','#D85A30','#EFA827','#3D8B37','#1D9E75','#1558a8','#7F77DD','#D4537E','#666','#111','#0D47A1','#4B0082'];
const GROUPS    = {metric:['mm','cm','m'],imperial:['in','ft'],pixel:['px']};
const SH_NAMES  = {triangle:'Triangle',line:'Line',curve:'Curve',rect:'Rectangle',square:'Square',circle:'Circle',ellipse:'Ellipse',pentagon:'Pentagon',hexagon:'Hexagon',arrow:'Arrow',star:'Star'};
const LAYER_COLORS = ['#1558a8','#c0392b','#27ae60','#8e44ad','#e67e22','#16a085','#2c3e50','#d35400'];

// ════════════════════════════════════════
// DOM
// ════════════════════════════════════════
const sc    = document.getElementById('sc');
const ctx   = sc.getContext('2d');
const vp    = document.getElementById('vp');
const rhEl  = document.getElementById('rh');
const rvEl  = document.getElementById('rv');
const rhOut = document.getElementById('rh-out');
const rvOut = document.getElementById('rv-out');
const ctxH  = rhEl.getContext('2d');
const ctxV  = rvEl.getContext('2d');
const coordBadge = document.getElementById('coord-badge');

// ════════════════════════════════════════
// Layers
// ════════════════════════════════════════
let layerCounter = 0;
function makeLayer(name, color){
  return { id: ++layerCounter, name, color: color||LAYER_COLORS[(layerCounter-1)%LAYER_COLORS.length], visible:true, locked:false };
}

// ════════════════════════════════════════
// App state
// ════════════════════════════════════════
const A = {
  shape:'triangle', color:'#1558a8', fill:'filled', stroke:2,
  shapes:[],
  layers:[ makeLayer('Layer 1') ],
  activeLayerId: 1,
  sel: null,
  isDrawing:false, dragSh:null, dragX1:0, dragY1:0,
  isMoving:false, movDX:0, movDY:0,
  unit:'cm', dscale:50,
  zi:10, swBase:0, shBase:0,
  undoStack:[], redoStack:[],
  MAX_HISTORY: 50,
  // ── Grid & Snap (new) ──
  gridVisible: true,
  snapEnabled: true,
  snapDivisions: 5   // snap to 1/5th of the major grid step by default
};

// ════════════════════════════════════════
// History (Undo / Redo)
// ════════════════════════════════════════
function snapshot(){
  return {
    shapes: JSON.parse(JSON.stringify(A.shapes)),
    layers: JSON.parse(JSON.stringify(A.layers)),
    activeLayerId: A.activeLayerId
  };
}
function pushHistory(){
  A.undoStack.push(snapshot());
  if(A.undoStack.length > A.MAX_HISTORY) A.undoStack.shift();
  A.redoStack = [];
  updateUndoButtons();
}
function applySnapshot(snap){
  A.shapes = snap.shapes;
  A.layers = snap.layers;
  A.activeLayerId = snap.activeLayerId;
  A.sel = null;
  renderLayers(); renderSaved(); redraw();
}
function undo(){
  if(!A.undoStack.length) return;
  A.redoStack.push(snapshot());
  applySnapshot(A.undoStack.pop());
  updateUndoButtons();
  setStatus('Undone');
}
function redo(){
  if(!A.redoStack.length) return;
  A.undoStack.push(snapshot());
  applySnapshot(A.redoStack.pop());
  updateUndoButtons();
  setStatus('Redone');
}
function updateUndoButtons(){
  document.getElementById('btn-undo').disabled = A.undoStack.length === 0;
  document.getElementById('btn-redo').disabled = A.redoStack.length === 0;
}

document.addEventListener('keydown', e=>{
  const tag = document.activeElement.tagName;
  if(tag==='INPUT'||tag==='SELECT'||tag==='TEXTAREA') return;
  if((e.ctrlKey||e.metaKey) && e.key==='z'){ e.preventDefault(); undo(); }
  if((e.ctrlKey||e.metaKey) && (e.key==='y'||(e.shiftKey&&e.key==='Z'))){ e.preventDefault(); redo(); }
  if(e.key==='Delete'||e.key==='Backspace'){ deleteSel(); }
  // Quick snap toggle: hold nothing, just press S
  if(e.key==='s'||e.key==='S'){ toggleSnap(); }
});

// ════════════════════════════════════════
// Layer management
// ════════════════════════════════════════
function addLayer(){
  pushHistory();
  const l = makeLayer('Layer '+(A.layers.length+1));
  A.layers.push(l);
  A.activeLayerId = l.id;
  renderLayers();
  setStatus('Layer "'+l.name+'" added');
}
function deleteLayer(id){
  if(A.layers.length===1){ setStatus("Can't delete the only layer"); return; }
  pushHistory();
  A.shapes = A.shapes.filter(s=>s.layerId!==id);
  A.layers = A.layers.filter(l=>l.id!==id);
  if(A.activeLayerId===id) A.activeLayerId = A.layers[0].id;
  A.sel=null;
  renderLayers(); renderSaved(); redraw();
}
function toggleLayerVisible(id){
  pushHistory();
  const l=A.layers.find(x=>x.id===id);
  if(l){ l.visible=!l.visible; renderLayers(); redraw(); }
}
function toggleLayerLock(id){
  pushHistory();
  const l=A.layers.find(x=>x.id===id);
  if(l){ l.locked=!l.locked; renderLayers(); }
}
function setActiveLayer(id){
  A.activeLayerId=id;
  const l=A.layers.find(x=>x.id===id);
  if(l){ A.color=l.color; document.getElementById('cc').value=l.color; }
  renderLayers();
}
function startRenameLayer(id, el){
  const row=el.closest('.layer-row');
  const nameEl=row.querySelector('.layer-name');
  const inp=document.createElement('input');
  inp.className='layer-name-input';
  inp.value=nameEl.textContent;
  nameEl.replaceWith(inp);
  inp.focus(); inp.select();
  const commit=()=>{
    pushHistory();
    const l=A.layers.find(x=>x.id===id);
    if(l) l.name=inp.value.trim()||l.name;
    renderLayers();
  };
  inp.addEventListener('blur',commit);
  inp.addEventListener('keydown',e=>{ if(e.key==='Enter') inp.blur(); if(e.key==='Escape'){inp.value='';inp.blur();} });
}
function activeLayer(){ return A.layers.find(l=>l.id===A.activeLayerId) || A.layers[0]; }
function layerById(id){ return A.layers.find(l=>l.id===id); }

function renderLayers(){
  const el=document.getElementById('layer-list');
  el.innerHTML='';
  [...A.layers].reverse().forEach(l=>{
    const row=document.createElement('div');
    row.className='layer-row'+(l.id===A.activeLayerId?' active-layer':'');
    row.title='Click to make active';
    row.onclick=(e)=>{ if(e.target.tagName==='BUTTON') return; setActiveLayer(l.id); };

    const dot=document.createElement('div');
    dot.className='layer-dot'; dot.style.background=l.color;

    const name=document.createElement('span');
    name.className='layer-name'; name.textContent=l.name;
    name.ondblclick=(e)=>{ e.stopPropagation(); startRenameLayer(l.id,name); };

    const vis=document.createElement('button');
    vis.className='layer-vis'; vis.title=l.visible?'Hide layer':'Show layer';
    vis.textContent=l.visible?'👁':'🚫';
    vis.onclick=(e)=>{ e.stopPropagation(); toggleLayerVisible(l.id); };

    const lock=document.createElement('button');
    lock.className='layer-lock'; lock.title=l.locked?'Unlock layer':'Lock layer';
    lock.textContent=l.locked?'🔒':'🔓';
    lock.onclick=(e)=>{ e.stopPropagation(); toggleLayerLock(l.id); };

    const del=document.createElement('button');
    del.className='layer-del'; del.title='Delete layer'; del.textContent='×';
    del.onclick=(e)=>{ e.stopPropagation(); deleteLayer(l.id); };

    row.append(dot,name,vis,lock,del);
    el.appendChild(row);
  });
}

// ════════════════════════════════════════
// Zoom
// ════════════════════════════════════════
const zf  = () => ZSTEPS[A.zi]/100;
const scW = () => Math.round(A.swBase * zf());
const scH = () => Math.round(A.shBase * zf());

function applyZoom(){
  sc.width=scW(); sc.height=scH();
  document.getElementById('zlbl').textContent=ZSTEPS[A.zi]+'%';
  drawRulers(); redraw();
}
function doZoom(dir){
  const ni=A.zi+dir; if(ni<0||ni>=ZSTEPS.length) return;
  const cx=vp.scrollLeft+vp.clientWidth/2, cy=vp.scrollTop+vp.clientHeight/2;
  const ratio=ZSTEPS[ni]/ZSTEPS[A.zi];
  A.zi=ni; applyZoom();
  vp.scrollLeft=cx*ratio-vp.clientWidth/2;
  vp.scrollTop=cy*ratio-vp.clientHeight/2;
}
function zoomFit(){
  const fw=(vp.clientWidth-80)/A.swBase, fh=(vp.clientHeight-80)/A.shBase;
  const pct=Math.floor(Math.min(fw,fh)*100);
  let best=0,bd=9999;
  ZSTEPS.forEach((s,i)=>{const d=Math.abs(s-pct);if(d<bd){bd=d;best=i;}});
  A.zi=best; applyZoom();
  vp.scrollLeft=(scW()-vp.clientWidth)/2; vp.scrollTop=0;
}

// ════════════════════════════════════════
// Sheet
// ════════════════════════════════════════
function initSheet(key){
  const[wMM,hMM]=SHEET_MM[key];
  A.swBase=Math.round(wMM*BASE_PPMM);
  A.shBase=Math.round(hMM*BASE_PPMM);
  applyZoom();
}

// ════════════════════════════════════════
// Coords & units
// ════════════════════════════════════════
function mxy(e){ const r=sc.getBoundingClientRect(); return[e.clientX-r.left, e.clientY-r.top]; }
function pxToUnit(px){ if(A.unit==='px') return px; return (px/zf()/BASE_PPMM*A.dscale)/UNIT_MM[A.unit]; }
function unitToPx(u){ if(A.unit==='px') return u*zf(); return (u*UNIT_MM[A.unit]/A.dscale)*BASE_PPMM*zf(); }

// ════════════════════════════════════════
// Grid step calculation (shared by rulers, grid drawing, and snap)
// ════════════════════════════════════════
function pickStep(){
  const ppu=unitToPx(1);
  for(const n of [0.001,0.002,0.005,0.01,0.02,0.05,0.1,0.2,0.5,1,2,5,10,20,50,100,200,500,1000,2000,5000])
    if(n*ppu>=45) return n;
  return 5000;
}

// ════════════════════════════════════════
// SNAP TO GRID (new in v6)
// Snaps a raw canvas-px coordinate to the nearest grid intersection,
// where the grid spacing = major step / snapDivisions.
// ════════════════════════════════════════
function snapPoint(px, py){
  if(!A.snapEnabled) return [px, py];
  const majorStepUnits = pickStep();
  const minorStepUnits = majorStepUnits / A.snapDivisions;
  const minorStepPx = unitToPx(minorStepUnits);
  const sx = Math.round(px / minorStepPx) * minorStepPx;
  const sy = Math.round(py / minorStepPx) * minorStepPx;
  return [sx, sy];
}

function toggleSnap(){
  A.snapEnabled = !A.snapEnabled;
  const btn = document.getElementById('btn-snap');
  btn.textContent = A.snapEnabled ? '🧲 Snap: On' : '🧲 Snap: Off';
  btn.classList.toggle('snap-off', !A.snapEnabled);
  setStatus(A.snapEnabled ? 'Snap to grid enabled' : 'Snap to grid disabled');
}

// ════════════════════════════════════════
// Rulers
// ════════════════════════════════════════
function drawRulers(){
  const sx=vp.scrollLeft,sy=vp.scrollTop,OX=40,OY=40;
  const step=pickStep(),spx=unitToPx(step);
  const dp=step<0.01?3:step<0.1?2:step<1?1:0;
  // horizontal
  const RW=rhOut.clientWidth; rhEl.width=RW;
  ctxH.fillStyle='#e4e4e4'; ctxH.fillRect(0,0,RW,24);
  ctxH.strokeStyle='#999'; ctxH.lineWidth=0.5;
  ctxH.beginPath(); ctxH.moveTo(0,23.5); ctxH.lineTo(RW,23.5); ctxH.stroke();
  const su=Math.floor((sx-OX)/spx)*step;
  for(let u=su;;u+=step){
    const x=OX+unitToPx(u)-sx; if(x>RW+spx) break; if(x<-spx) continue;
    ctxH.strokeStyle='#aaa'; ctxH.beginPath(); ctxH.moveTo(x,15); ctxH.lineTo(x,24); ctxH.stroke();
    for(let m=1;m<5;m++){const xm=x+m*spx/5;if(xm>RW)break;ctxH.beginPath();ctxH.moveTo(xm,19);ctxH.lineTo(xm,24);ctxH.stroke();}
    if(x>8&&x<RW-8){ctxH.fillStyle='#555';ctxH.font='9px sans-serif';ctxH.textAlign='center';ctxH.fillText(u.toFixed(dp),x,12);}
  }
  ctxH.textAlign='right';ctxH.fillStyle='#378ADD';ctxH.font='bold 9px sans-serif';ctxH.fillText(A.unit,RW-3,12);
  // vertical
  const VH=rvOut.clientHeight; rvEl.height=VH;
  ctxV.fillStyle='#e4e4e4'; ctxV.fillRect(0,0,24,VH);
  ctxV.strokeStyle='#999'; ctxV.lineWidth=0.5;
  ctxV.beginPath(); ctxV.moveTo(23.5,0); ctxV.lineTo(23.5,VH); ctxV.stroke();
  const sv=Math.floor((sy-OY)/spx)*step;
  for(let u=sv;;u+=step){
    const y=OY+unitToPx(u)-sy; if(y>VH+spx) break; if(y<-spx) continue;
    ctxV.strokeStyle='#aaa'; ctxV.beginPath(); ctxV.moveTo(15,y); ctxV.lineTo(24,y); ctxV.stroke();
    for(let m=1;m<5;m++){const ym=y+m*spx/5;if(ym>VH)break;ctxV.beginPath();ctxV.moveTo(19,ym);ctxV.lineTo(24,ym);ctxV.stroke();}
    if(y>8&&y<VH-8){ctxV.save();ctxV.translate(11,y);ctxV.rotate(-Math.PI/2);ctxV.fillStyle='#555';ctxV.font='9px sans-serif';ctxV.textAlign='center';ctxV.fillText(u.toFixed(dp),0,0);ctxV.restore();}
  }
  ctxV.save();ctxV.translate(11,VH-6);ctxV.rotate(-Math.PI/2);ctxV.fillStyle='#378ADD';ctxV.font='bold 9px sans-serif';ctxV.textAlign='center';ctxV.fillText(A.unit,0,0);ctxV.restore();
}
vp.addEventListener('scroll',drawRulers);
new ResizeObserver(drawRulers).observe(vp);

// ════════════════════════════════════════
// Grid drawing on the sheet (toggleable, with snap-resolution sub-grid)
// ════════════════════════════════════════
function drawGrid(){
  if(!A.gridVisible){
    // still draw the sheet border even with grid hidden
    ctx.save(); ctx.strokeStyle='#999'; ctx.lineWidth=1.2;
    ctx.strokeRect(0,0,sc.width,sc.height); ctx.restore();
    return;
  }
  const majorStep = pickStep();
  const majorPx   = unitToPx(majorStep);
  const minorPx   = majorPx / A.snapDivisions;
  const W=sc.width, H=sc.height;
  ctx.save();
  // fine sub-grid (matches snap resolution)
  ctx.strokeStyle='#eef0f8'; ctx.lineWidth=0.5;
  for(let x=0;x<W;x+=minorPx){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for(let y=0;y<H;y+=minorPx){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  // major grid
  ctx.strokeStyle='#d0d8ee'; ctx.lineWidth=0.8;
  for(let x=0;x<W;x+=majorPx){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for(let y=0;y<H;y+=majorPx){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  // border
  ctx.strokeStyle='#999'; ctx.lineWidth=1.2;
  ctx.strokeRect(0,0,W,H);
  ctx.restore();
}

// ════════════════════════════════════════
// Shape renderer
// ════════════════════════════════════════
function renderShape(sh, alpha){
  alpha=alpha||1;
  const{type,x1,y1,x2,y2,color,fill,stroke}=sh;
  const dx=x2-x1,dy=y2-y1,cx=(x1+x2)/2,cy=(y1+y2)/2;
  const w=Math.abs(dx),h=Math.abs(dy),r=Math.sqrt(dx*dx+dy*dy),side=Math.min(w,h);
  ctx.save(); ctx.globalAlpha=alpha;
  ctx.strokeStyle=color; ctx.lineWidth=stroke;
  ctx.fillStyle=fill==='filled'?color:'transparent';
  const poly=pts=>{ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.closePath();if(fill==='filled')ctx.fill();ctx.stroke();};
  const polyR=(px,py,R,n,off)=>{const p=[];for(let i=0;i<n;i++){const a=(off||0)+(2*Math.PI*i/n)-Math.PI/2;p.push([px+R*Math.cos(a),py+R*Math.sin(a)]);}return p;};
  switch(type){
    case 'line': ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke(); break;
    case 'curve': ctx.beginPath();ctx.moveTo(x1,y1);ctx.quadraticCurveTo(cx,cy-r*.4,x2,y2);ctx.stroke(); break;
    case 'arrow':{const ang=Math.atan2(dy,dx),hw=stroke*4+8;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x2-hw*Math.cos(ang-.4),y2-hw*Math.sin(ang-.4));ctx.lineTo(x2-hw*Math.cos(ang+.4),y2-hw*Math.sin(ang+.4));ctx.closePath();ctx.fillStyle=color;ctx.fill();break;}
    case 'rect': ctx.beginPath();ctx.rect(Math.min(x1,x2),Math.min(y1,y2),w,h);if(fill==='filled')ctx.fill();ctx.stroke(); break;
    case 'square': ctx.beginPath();ctx.rect(cx-side/2,cy-side/2,side,side);if(fill==='filled')ctx.fill();ctx.stroke(); break;
    case 'circle': ctx.beginPath();ctx.arc(x1,y1,r,0,Math.PI*2);if(fill==='filled')ctx.fill();ctx.stroke(); break;
    case 'ellipse': if(w>0&&h>0){ctx.beginPath();ctx.ellipse(cx,cy,w/2,h/2,0,0,Math.PI*2);if(fill==='filled')ctx.fill();ctx.stroke();} break;
    case 'triangle': poly([[cx,y1],[x1,y2],[x2,y2]]); break;
    case 'pentagon': poly(polyR(cx,cy,r*.8,5)); break;
    case 'hexagon':  poly(polyR(cx,cy,r*.8,6,Math.PI/6)); break;
    case 'star':{const pts=[];for(let i=0;i<10;i++){const a=(Math.PI*i/5)-Math.PI/2;const ri=i%2?r*.35:r*.8;pts.push([cx+ri*Math.cos(a),cy+ri*Math.sin(a)]);}poly(pts);break;}
  }
  ctx.restore();
}

function renderSel(sh){
  const{x1,y1,x2,y2}=sh;
  const bx=Math.min(x1,x2)-6,by=Math.min(y1,y2)-6,bw=Math.abs(x2-x1)+12,bh=Math.abs(y2-y1)+12;
  ctx.save();ctx.strokeStyle='#378ADD';ctx.lineWidth=1.5;ctx.setLineDash([5,3]);
  ctx.strokeRect(bx,by,bw,bh);ctx.setLineDash([]);ctx.restore();
}

// ════════════════════════════════════════
// Snap indicator — small circle drawn at the active snap point (new)
// ════════════════════════════════════════
function renderSnapMarker(px,py){
  if(!A.snapEnabled) return;
  ctx.save();
  ctx.strokeStyle='#ff6b35'; ctx.lineWidth=1.3;
  ctx.beginPath(); ctx.arc(px,py,5,0,Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(px-8,py); ctx.lineTo(px+8,py); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(px,py-8); ctx.lineTo(px,py+8); ctx.stroke();
  ctx.restore();
}

// ════════════════════════════════════════
// Redraw
// ════════════════════════════════════════
function redraw(){
  ctx.clearRect(0,0,sc.width,sc.height);
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,sc.width,sc.height);
  drawGrid();
  A.layers.forEach(l=>{
    if(!l.visible) return;
    A.shapes.forEach((sh,i)=>{
      if(sh.layerId!==l.id) return;
      renderShape(sh);
      if(i===A.sel) renderSel(sh);
    });
  });
  if(A.isDrawing && A.dragSh){
    renderShape(A.dragSh, 0.45);
    renderSnapMarker(A.dragSh.x2, A.dragSh.y2);
  } else if(A.lastSnapX !== undefined && A.snapEnabled && !A.isMoving){
    renderSnapMarker(A.lastSnapX, A.lastSnapY);
  }
}

// ════════════════════════════════════════
// Hit test
// ════════════════════════════════════════
function hitTest(mx,my,sh){
  const pad=8;
  const bx=Math.min(sh.x1,sh.x2)-pad,by=Math.min(sh.y1,sh.y2)-pad;
  const bw=Math.abs(sh.x2-sh.x1)+pad*2,bh=Math.abs(sh.y2-sh.y1)+pad*2;
  return mx>=bx&&mx<=bx+bw&&my>=by&&my<=by+bh;
}

// ════════════════════════════════════════
// Mouse events — click-and-drag to draw, with snap
// ════════════════════════════════════════
sc.addEventListener('mousedown', e=>{
  const[rawX,rawY]=mxy(e);
  const[mx,my]=snapPoint(rawX,rawY);

  // clicking existing shapes
  for(let i=A.shapes.length-1;i>=0;i--){
    const sh=A.shapes[i];
    const l=layerById(sh.layerId);
    if(!l||!l.visible||l.locked) continue;
    if(hitTest(rawX,rawY,sh)){
      A.sel=i; A.isMoving=true;
      A.movDX=rawX-sh.x1; A.movDY=rawY-sh.y1;
      syncSide(); redraw(); return;
    }
  }

  const al=activeLayer();
  if(al.locked){ setStatus('Layer "'+al.name+'" is locked — unlock it to draw'); return; }

  A.sel=null; A.isDrawing=true;
  A.dragX1=mx; A.dragY1=my;
  A.dragSh={
    type:A.shape, x1:mx,y1:my, x2:mx,y2:my,
    color:A.color, fill:A.fill, stroke:A.stroke,
    layerId:A.activeLayerId, saved:false
  };
  sc.style.cursor='crosshair';
  setStatus('Drag to size — release to place'+(A.snapEnabled?' (snapping to grid)':''));
  redraw();
});

sc.addEventListener('mousemove', e=>{
  const[rawX,rawY]=mxy(e);
  const[sx,sy]=snapPoint(rawX,rawY);
  A.lastSnapX=sx; A.lastSnapY=sy;

  // live coordinate readout in sidebar — always shows the SNAPPED position
  // when snap is on, since that's where a click would actually land
  const dispX = A.snapEnabled ? sx : rawX;
  const dispY = A.snapEnabled ? sy : rawY;
  document.getElementById('ix').textContent=pxToUnit(dispX).toFixed(2)+' '+A.unit;
  document.getElementById('iy').textContent=pxToUnit(dispY).toFixed(2)+' '+A.unit;

  // floating coordinate badge that follows the mouse cursor
  coordBadge.style.display='block';
  coordBadge.style.left=e.clientX+'px';
  coordBadge.style.top=e.clientY+'px';
  coordBadge.textContent=pxToUnit(dispX).toFixed(2)+', '+pxToUnit(dispY).toFixed(2)+' '+A.unit;

  if(A.isMoving&&A.sel!==null){
    const sh=A.shapes[A.sel];
    const dw=sh.x2-sh.x1,dh=sh.y2-sh.y1;
    let nx1=rawX-A.movDX, ny1=rawY-A.movDY;
    if(A.snapEnabled){ const[snx,sny]=snapPoint(nx1,ny1); nx1=snx; ny1=sny; }
    sh.x1=nx1; sh.y1=ny1;
    sh.x2=sh.x1+dw;   sh.y2=sh.y1+dh;
    redraw(); return;
  }
  if(A.isDrawing&&A.dragSh){
    A.dragSh.x2=sx; A.dragSh.y2=sy;
    const wu=pxToUnit(Math.abs(sx-A.dragX1)).toFixed(2);
    const hu=pxToUnit(Math.abs(sy-A.dragY1)).toFixed(2);
    document.getElementById('iw').textContent=wu+' '+A.unit;
    document.getElementById('ih').textContent=hu+' '+A.unit;
    redraw(); return;
  }
  let hov=false;
  for(let i=A.shapes.length-1;i>=0;i--){
    const l=layerById(A.shapes[i].layerId);
    if(!l||!l.visible||l.locked) continue;
    if(hitTest(rawX,rawY,A.shapes[i])){sc.style.cursor='move';hov=true;break;}
  }
  if(!hov) sc.style.cursor='crosshair';
  redraw();
});

sc.addEventListener('mouseleave', ()=>{
  coordBadge.style.display='none';
  A.lastSnapX=undefined; A.lastSnapY=undefined;
  if(!A.isDrawing) redraw();
});

sc.addEventListener('mouseup', e=>{
  if(A.isMoving){
    A.isMoving=false;
    pushHistory();
    return;
  }
  if(!A.isDrawing) return;
  A.isDrawing=false;
  const sh=A.dragSh; A.dragSh=null;
  const w=Math.abs(sh.x2-sh.x1),h=Math.abs(sh.y2-sh.y1);
  if(w>5||h>5){
    pushHistory();
    A.shapes.push(sh);
    A.sel=A.shapes.length-1;
    setStatus('Shape placed — Save to keep it');
    syncSide();
  } else {
    setStatus('Too small — drag further');
  }
  document.getElementById('iw').textContent='—';
  document.getElementById('ih').textContent='—';
  redraw();
});

vp.addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();doZoom(e.deltaY<0?1:-1);},{passive:false});

// ════════════════════════════════════════
// Sidebar sync
// ════════════════════════════════════════
function syncSide(){
  if(A.sel===null) return;
  const sh=A.shapes[A.sel];
  document.getElementById('skr').value=sh.stroke; document.getElementById('skv').textContent=sh.stroke;
  A.color=sh.color; A.fill=sh.fill; A.stroke=sh.stroke; A.shape=sh.type;
  document.querySelectorAll('#fseg button').forEach(b=>b.classList.toggle('active',b.dataset.v===sh.fill));
  document.getElementById('cc').value=sh.color;
  document.querySelectorAll('.sbtn').forEach(b=>b.classList.toggle('active',b.dataset.shape===sh.type));
}
function applyToSel(){
  if(A.sel===null) return;
  pushHistory();
  A.shapes[A.sel].color=A.color; A.shapes[A.sel].fill=A.fill; redraw();
}

// ════════════════════════════════════════
// Controls
// ════════════════════════════════════════
function setGroup(g,btn){
  document.querySelectorAll('.ugb').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
  const sel=document.getElementById('usel');sel.innerHTML='';
  GROUPS[g].forEach(u=>{const o=document.createElement('option');o.value=u;o.textContent=u;sel.appendChild(o);});
  A.unit=GROUPS[g][g==='metric'?1:0];sel.value=A.unit;drawRulers();redraw();
}
function setFill(v,btn){A.fill=v;document.querySelectorAll('#fseg button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');applyToSel();}
document.getElementById('skr').addEventListener('input',e=>{
  A.stroke=+e.target.value; document.getElementById('skv').textContent=A.stroke;
  if(A.sel!==null){pushHistory();A.shapes[A.sel].stroke=A.stroke;redraw();}
});
document.getElementById('sbtns').addEventListener('click',e=>{
  const b=e.target.closest('.sbtn');if(!b)return;
  A.shape=b.dataset.shape;
  document.querySelectorAll('.sbtn').forEach(x=>x.classList.remove('active'));b.classList.add('active');
});

function initPalette(){
  const g=document.getElementById('cgrid');g.innerHTML='';
  PAL.forEach(c=>{
    const sw=document.createElement('div');sw.className='sw'+(c===A.color?' active':'');sw.style.background=c;
    sw.onclick=()=>{A.color=c;document.getElementById('cc').value=c;document.querySelectorAll('.sw').forEach(s=>s.classList.remove('active'));sw.classList.add('active');applyToSel();};
    g.appendChild(sw);
  });
}
initPalette();
document.getElementById('cc').addEventListener('input',e=>{A.color=e.target.value;document.querySelectorAll('.sw').forEach(s=>s.classList.remove('active'));applyToSel();});

// ════════════════════════════════════════
// Toolbar
// ════════════════════════════════════════
function saveShape(){
  if(A.sel===null){setStatus('Select a shape first');return;}
  pushHistory(); A.shapes[A.sel].saved=true; renderSaved(); setStatus('Saved!');
}
function deleteSel(){
  if(A.sel===null){setStatus('Nothing selected');return;}
  const l=layerById(A.shapes[A.sel].layerId);
  if(l&&l.locked){setStatus('Layer "'+l.name+'" is locked');return;}
  pushHistory(); A.shapes.splice(A.sel,1); A.sel=null; renderSaved(); setStatus('Deleted'); redraw();
}
function clearAll(){
  pushHistory(); A.shapes=[];A.sel=null;A.isDrawing=false;A.dragSh=null;
  renderSaved(); setStatus('Canvas cleared'); redraw();
}

// ════════════════════════════════════════
// Saved list
// ════════════════════════════════════════
function renderSaved(){
  const el=document.getElementById('slist');
  if(!A.shapes.some(s=>s.saved)){el.innerHTML='<p class="emp">Nothing saved yet.</p>';return;}
  el.innerHTML='';
  A.shapes.forEach((sh,i)=>{
    if(!sh.saved) return;
    const l=layerById(sh.layerId);
    const row=document.createElement('div');row.className='si';
    const dot=document.createElement('div');
    dot.style.cssText='width:8px;height:8px;border-radius:50%;background:'+(l?l.color:'#999')+';flex-shrink:0';
    const tc=document.createElement('canvas');tc.width=20;tc.height=20;tc.style.flexShrink='0';
    const tx=tc.getContext('2d');tx.strokeStyle=sh.color;tx.lineWidth=1.5;
    tx.fillStyle=sh.fill==='filled'?sh.color:'transparent';
    tx.beginPath();
    if(sh.type==='circle')tx.arc(10,10,7,0,Math.PI*2);
    else if(sh.type==='triangle'){tx.moveTo(10,2);tx.lineTo(1,18);tx.lineTo(19,18);tx.closePath();}
    else tx.rect(2,4,16,12);
    if(sh.fill==='filled')tx.fill();tx.stroke();
    const lbl=document.createElement('span');lbl.className='si-l';
    lbl.textContent=(SH_NAMES[sh.type]||sh.type)+' '+(i+1)+(l?' ['+l.name+']':'');
    const del=document.createElement('button');del.className='si-d';del.textContent='×';
    del.onclick=ev=>{ev.stopPropagation();pushHistory();A.shapes.splice(i,1);if(A.sel===i)A.sel=null;else if(A.sel>i)A.sel--;renderSaved();redraw();};
    row.onclick=()=>{A.sel=i;syncSide();redraw();};
    row.append(dot,tc,lbl,del);el.appendChild(row);
  });
}
function setStatus(m){document.getElementById('status').textContent=m;}

// ════════════════════════════════════════
// Boot
// ════════════════════════════════════════
renderLayers();
initSheet('A3');
setTimeout(()=>{zoomFit();drawRulers();},100);
