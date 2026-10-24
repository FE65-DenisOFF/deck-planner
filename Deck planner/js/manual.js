// MANUAL: ручные контейнеры + личная база размеров (файл js/container-base.js).
var MANUAL_KEY = 'manualContainers';
function g(id){ return document.getElementById(id); }
var manualModal=g('manualModal'),mTitle=g('mTitle'),mSubmit=g('mSubmit'),mCancel=g('mCancel'),
mSize=g('mSize'),mLen=g('mLen'),mWid=g('mWid'),mLenWrap=g('mLenWrap'),mWidWrap=g('mWidWrap'),
mHeight=g('mHeight'),mWeight=g('mWeight'),mDest=g('mDest'),mImdg=g('mImdg'),mReefer=g('mReefer'),
mTemp=g('mTemp'),mId=g('mId'),mStrict=g('mStrict'),mPlanned=g('mPlanned'),
legendGrid=g('legendGrid'),legendHint=g('legendHint');
var editingContainer=null,modalStartPos=null,chosenColor=null,colorAuto=true;
if(typeof window.CONTAINER_BASE==='undefined') window.CONTAINER_BASE=[];

// ---- подгрузка файла базы (js/container-base.js) ----
(function loadBase(){
  var s=document.createElement('script');
  s.src='js/container-base.js';
  s.onload=function(){ if(typeof window.CONTAINER_BASE==='undefined')window.CONTAINER_BASE=[]; buildSizeOptions(); };
  s.onerror=function(){ window.CONTAINER_BASE=window.CONTAINER_BASE||[]; buildSizeOptions(); };
  document.head.appendChild(s);
})();

// ---- вставить поле "Высота" после "Ширина", если его нет ----
(function injectHeight(){
  var wrap=g('mWidWrap');
  if(!wrap||g('mHeightWrap')){ mHeight=g('mHeight'); return; }
  var f=document.createElement('div'); f.className='modal-field'; f.id='mHeightWrap';
  f.innerHTML='<label>Высота, м</label><input id="mHeight" type="number" step="0.01" min="0.1" value="2.59">';
  wrap.parentNode.insertBefore(f, wrap.nextSibling);
  mHeight=g('mHeight');
})();

// ---- строка "Моя база" в модалке ----
(function injectBaseRow(){
  var grid=document.querySelector('#manualModal .modal-grid');
  if(!grid||g('baseRow')) return;
  var row=document.createElement('div'); row.className='modal-field full'; row.id='baseRow';
  row.innerHTML='<label>Моя база</label><div style="display:flex; gap:6px;">'+
    '<input id="baseName" placeholder="Название (напр. 10\' контейнер)">'+
    '<button type="button" id="btnToBase" class="btn-ghost" title="Добавить текущий размер в базу">💾 В базу</button>'+
    '<button type="button" id="btnBaseFile" class="btn-ghost" title="Скачать файл базы">⬇ Файл базы</button></div>';
  grid.appendChild(row);
  var tb=g('btnToBase'), fb=g('btnBaseFile'), bn=g('baseName');
  if(tb) tb.onclick=function(){
    var l=parseFloat(mLen&&mLen.value),w=parseFloat(mWid&&mWid.value),h=parseFloat(mHeight&&mHeight.value);
    if(!l||!w||!h||l<=0||w<=0||h<=0){ if(typeof showToast==='function')showToast('Заполните длину, ширину и высоту','err'); return; }
    var name=(bn&&bn.value.trim())||(l+'\u00d7'+w+'\u00d7'+h);
    window.CONTAINER_BASE.push({name:name,l:l,w:w,h:h});
    buildSizeOptions(); if(mSize)mSize.value='b|'+(window.CONTAINER_BASE.length-1);
    if(bn)bn.value='';
    if(typeof showToast==='function')showToast('Добавлено в базу. Не забудьте скачать файл базы (⬇)','warn');
  };
  if(fb) fb.onclick=downloadBaseFile;
})();
function downloadBaseFile(){
  var B=window.CONTAINER_BASE||[];
  var lines=B.map(function(b){ return '  { name: '+JSON.stringify(b.name)+', l: '+b.l+', w: '+b.w+', h: '+b.h+' }'; });
  var txt='// Моя база контейнеров. Можно править руками.\nvar CONTAINER_BASE = [\n'+lines.join(',\n')+'\n];\n';
  var blob=new Blob([txt],{type:'text/javascript'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a'); a.href=url; a.download='container-base.js';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function(){URL.revokeObjectURL(url);},5000);
  if(typeof showToast==='function')showToast('Файл базы скачан. Положите его в папку js/ вместо старого container-base.js','warn');
}

// ---- список размеров из базы ----
function buildSizeOptions(){
  if(!mSize) return;
  mSize.innerHTML='';
  var B=window.CONTAINER_BASE||[];
  if(B.length){
    var g1=document.createElement('optgroup'); g1.label='Моя база ('+B.length+')';
    B.forEach(function(b,i){ var o=document.createElement('option'); o.value='b|'+i; o.textContent=b.name+'  ('+b.l+'\u00d7'+b.w+'\u00d7'+b.h+')'; g1.appendChild(o); });
    mSize.appendChild(g1);
  }
  var oc=document.createElement('option'); oc.value='custom'; oc.textContent='Свой размер\u2026'; mSize.appendChild(oc);
}
function showDims(on){
  [mLenWrap,mWidWrap,g('mHeightWrap')].forEach(function(w){ if(!w)return; on?w.classList.remove('hidden'):w.classList.add('hidden'); });
}
function onSizeChange(){
  if(!mSize) return;
  showDims(true);
  var v=mSize.value;
  if(v.indexOf('b|')===0){
    var i=parseInt(v.split('|')[1],10); var b=(window.CONTAINER_BASE||[])[i];
    if(b){ if(mLen)mLen.value=b.l; if(mWid)mWid.value=b.w; if(mHeight)mHeight.value=b.h; }
  }
}
function readSize(){
  var h=(mHeight?parseFloat(mHeight.value)||2.59:2.59);
  return { l:parseFloat(mLen&&mLen.value)||2.99, w:parseFloat(mWid&&mWid.value)||2.44, h:h };
}
function buildLegend(){
  if(!legendGrid) return;
  legendGrid.innerHTML='';
  var auto=document.createElement('button');auto.type='button';auto.className='legend-auto';auto.textContent='Авто по назначению';
  auto.onclick=function(){colorAuto=true;chosenColor=null;refreshLegend();};
  legendGrid.appendChild(auto);
  (typeof DEST_PALETTE!=='undefined'?DEST_PALETTE:[]).forEach(function(p){
    var s=document.createElement('span');s.className='legend-chip';
    var sw=document.createElement('span');sw.className='lc-color';sw.style.background=p.color;
    var lb=document.createElement('span');lb.className='lc-label';lb.textContent=p.label;
    s.appendChild(sw);s.appendChild(lb);
    s.onclick=function(){ if(mDest)mDest.value=p.label; colorAuto=true; chosenColor=null; refreshLegend(); };
    legendGrid.appendChild(s); });
  var cust=document.createElement('label');cust.className='legend-custom';
  var cl=document.createElement('span');cl.textContent='Свой';
  var ci=document.createElement('input');ci.type='color';ci.value='#22c55e';
  ci.oninput=function(){colorAuto=false;chosenColor=ci.value;refreshLegend();};
  cust.appendChild(cl);cust.appendChild(ci);legendGrid.appendChild(cust);
}
function refreshLegend(){
  if(legendHint)legendHint.textContent=colorAuto?'Авто: цвет подберётся по назначению':'Выбран свой цвет';
}
function buildImdgOptions(){
  if(!mImdg)return; mImdg.innerHTML='';
  var o0=document.createElement('option');o0.value='';o0.textContent='нет (обычный груз)';mImdg.appendChild(o0);
  (typeof IMDG_CLASSES!=='undefined'?IMDG_CLASSES:[]).forEach(function(c){var o=document.createElement('option');o.value=c;o.textContent=c;mImdg.appendChild(o);});
}
function nextManualId(){
  var max=0; placedContainers.forEach(function(c){ if(c.isManual){var m=/^M-(\d+)$/.exec(c.id||'');if(m){var n=parseInt(m[1]);if(n>max)max=n;}}});
  return 'M-'+(max+1);
}
function openCreateModal(startPos){
  if(!state.calibrated){ if(typeof showToast==='function')showToast('Сначала загрузите схему и откалибруйте палубу','info'); return; }
  if(placementMode)exitPlacement();
  editingContainer=null;
  if(mTitle)mTitle.textContent='➕ Новый контейнер';
  if(mSubmit)mSubmit.textContent='Создать и разместить';
  buildSizeOptions();
  var B=window.CONTAINER_BASE||[];
  if(mSize){ mSize.value=B.length?'b|0':'custom'; }
  onSizeChange();
  if(mWeight)mWeight.value=0; if(mDest)mDest.value='';
  colorAuto=true;chosenColor=null;buildLegend();refreshLegend();
  buildImdgOptions(); if(mImdg)mImdg.value='';
  if(mReefer)mReefer.checked=false; if(mTemp){mTemp.classList.add('hidden');mTemp.value='';}
  if(mId)mId.value=nextManualId(); if(mStrict)mStrict.checked=false; if(mPlanned)mPlanned.checked=false;
  modalStartPos=startPos||null;
  if(manualModal)manualModal.classList.add('visible');
}
function openEditModal(c){
  if(placementMode)exitPlacement();
  editingContainer=c;
  if(mTitle)mTitle.textContent='✏️ Редактировать контейнер';
  if(mSubmit)mSubmit.textContent='Сохранить';
  buildSizeOptions(); if(mSize)mSize.value='custom'; showDims(true);
  if(mLen)mLen.value=c.length; if(mWid)mWid.value=c.width; if(mHeight)mHeight.value=c.height||2.59;
  if(mWeight)mWeight.value=c.weight; if(mDest)mDest.value=c.destination||'';
  if(c.customColor){colorAuto=false;chosenColor=c.customColor;}else{colorAuto=true;chosenColor=null;}
  buildLegend();refreshLegend();buildImdgOptions(); if(mImdg)mImdg.value=c.imdgClass||'';
  if(mReefer)mReefer.checked=!!c.isReefer; if(mTemp){mTemp.classList.toggle('hidden',!c.isReefer);mTemp.value=c.temp||'';}
  if(mId)mId.value=c.id||''; if(mStrict)mStrict.checked=false; if(mPlanned)mPlanned.checked=!!c.isPlanned;
  modalStartPos=null;
  if(manualModal)manualModal.classList.add('visible');
}
function closeManualModal(){ if(manualModal)manualModal.classList.remove('visible'); }
function isManualModalOpen(){ return manualModal?manualModal.classList.contains('visible'):false; }
function readTemplate(){
  var sz=readSize();
  if(!sz.l||!sz.w||!sz.h||sz.l<=0||sz.w<=0||sz.h<=0){ if(typeof showToast==='function')showToast('Заполните длину, ширину и высоту','err'); return null; }
  var imdg=mImdg?mImdg.value:''; var reefer=mReefer?mReefer.checked:false; var planned=mPlanned?mPlanned.checked:false;
  return { length:sz.l,width:sz.w,height:sz.h,
  weight:mWeight?parseFloat(mWeight.value)||0:0,
  destination:mDest?mDest.value.trim():'',
  customColor:(planned||colorAuto)?null:chosenColor,
  imdgClass:imdg||null,isHazardous:!!imdg,
  isReefer:reefer,temp:reefer?(mTemp?mTemp.value.trim()||null:null):null,
  id:(mId?mId.value.trim():'')||nextManualId(),
  strictIMDG:mStrict?mStrict.checked:false,isPlanned:planned };
}
function onSubmit(){
  var t=readTemplate(); if(!t)return;
  if(editingContainer){applyEdit(editingContainer,t);closeManualModal();}
  else{closeManualModal();enterPlacement(t,modalStartPos);}
}
function applyEdit(c,t){
  var oL=c.length,oW=c.width;
  c.length=t.length;c.width=t.width;c.height=t.height;c.weight=t.weight;
  c.destination=t.destination;c.customColor=t.customColor;
  c.imdgClass=t.imdgClass;c.isHazardous=t.isHazardous;c.isReefer=t.isReefer;c.temp=t.temp;c.id=t.id;c.isPlanned=t.isPlanned;
  if(!fitsAt(c,c.x,c.y)){c.length=oL;c.width=oW;if(typeof showToast==='function')showToast('Новый размер не помещается на этом месте','err');return;}
  checkAllSegregationViolations();updateStats();renderList();draw();saveManualToStorage();
  if(typeof autosaveDeck==='function')autosaveDeck();
  if(typeof showToast==='function')showToast('Контейнер обновлён','ok');
}
function enterPlacement(t,start){
  placementTemplate=t;placementMode=true;
  placementGhost={length:t.length,width:t.width,x:0,y:0};
  if(start){placementGhost.x=start.x-t.length/2;placementGhost.y=start.y-t.width/2;}
  else{var c=toDeck(canvas.width/2,canvas.height/2);placementGhost.x=c.x-t.length/2;placementGhost.y=c.y-t.width/2;}
  canvas.classList.add('calibrating');draw();
  if(typeof showToast==='function')showToast('Кликните по палубе, чтобы поставить (Esc — отмена)','info');
}
function exitPlacement(){placementMode=false;placementGhost=null;placementTemplate=null;canvas.classList.remove('calibrating');draw();}
function fitsAt(c,x,y){
  var b={minX:DECK_COORDS.minX-5,maxX:DECK_COORDS.maxX+5,minY:DECK_COORDS.minY-5,maxY:DECK_COORDS.maxY+5};
  if(x<b.minX||y<b.minY||x+c.length>b.maxX||y+c.width>b.maxY)return false;
  for(var i=0;i<placedContainers.length;i++){var o=placedContainers[i];if(o===c)continue;
  if(x<o.x+o.length&&x+c.length>o.x&&y<o.y+o.width&&y+c.width>o.y)return false;}
  return true;
}
function hasImdgConflictAt(imdgClass,x,y,L,W){
  if(!imdgClass)return false;
  var cx=x+L/2,cy=y+W/2;
  for(var i=0;i<placedContainers.length;i++){var o=placedContainers[i];if(!o.isHazardous||!o.imdgClass)continue;
  var req=getSegregationDistance(imdgClass,o.imdgClass);if(!req)continue;
  var ox=o.x+o.length/2,oy=o.y+o.width/2;
  var d=Math.sqrt((cx-ox)*(cx-ox)+(cy-oy)*(cy-oy));
  if(d<req)return true;}
  return false;
}
function evaluateGhostAt(x,y){
  var b={minX:DECK_COORDS.minX-5,maxX:DECK_COORDS.maxX+5,minY:DECK_COORDS.minY-5,maxY:DECK_COORDS.maxY+5};
  var t=placementTemplate;
  var L=t?t.length:(placementGhost?placementGhost.length:0);
  var W=t?t.width:(placementGhost?placementGhost.width:0);
  if(x<b.minX||y<b.minY||x+L>b.maxX||y+W>b.maxY)return{ok:false,reason:'За пределами палубы'};
  for(var i=0;i<placedContainers.length;i++){var o=placedContainers[i];
  if(x<o.x+o.length&&x+L>o.x&&y<o.y+o.width&&y+W>o.y)return{ok:false,reason:'Пересечение с контейнером'};}
  if(t&&t.strictIMDG&&t.isHazardous&&hasImdgConflictAt(t.imdgClass,x,y,L,W))return{ok:false,reason:'Нарушение сегрегации IMDG'};
  return{ok:true};
}
function makeContainerFromTemplate(t,x,y){
  return {seq:0,id:t.id,rawId:t.id,type:'MANUAL',description:'',
  length:t.length,width:t.width,height:t.height,weight:t.weight,
  destination:t.destination,priority:'L',
  isHazardous:t.isHazardous,imdgClass:t.imdgClass,isReefer:t.isReefer,temp:t.temp,
  rotated:false,x:x,y:y,customFontSize:null,isDuplicate:false,
  isManual:true,customColor:t.customColor,isPlanned:!!t.isPlanned};
}
function doPlacementClick(e){
  var r=canvas.getBoundingClientRect();
  var d=toDeck(e.clientX-r.left,e.clientY-r.top);
  var t=placementTemplate;
  var gx=d.x-t.length/2,gy=d.y-t.width/2;
  var ev=evaluateGhostAt(gx,gy);
  if(!ev.ok){if(typeof showToast==='function')showToast(ev.reason,'warn');return;}
  var c=makeContainerFromTemplate(t,gx,gy);
  placedContainers.push(c);
  checkAllSegregationViolations();updateStats();renderList();draw();saveManualToStorage();
  if(typeof autosaveDeck==='function')autosaveDeck();
  if(typeof showToast==='function')showToast(t.isPlanned?'Плановый контейнер размещён':'Контейнер размещён','ok');
  exitPlacement();
}
function showEmptyMenu(e,deckPos){
  var m=g('emptyContextMenu'); if(!m) return;
  m.__pos=deckPos||null;
  m.style.left=e.clientX+'px'; m.style.top=e.clientY+'px';
  m.classList.add('active');
  setTimeout(function(){ var r=m.getBoundingClientRect();
  if(r.right>window.innerWidth)m.style.left=(e.clientX-r.width)+'px';
  if(r.bottom>window.innerHeight)m.style.top=(e.clientY-r.height)+'px'; },0);
}
function closeEmptyMenu(){ var m=g('emptyContextMenu'); if(m) m.classList.remove('active'); }
function editManualFromContext(){ if(contextTarget&&contextTarget.isManual){var c=contextTarget;closeContextMenu();openEditModal(c);} }
function saveManualToStorage(){
  try{
    var arr=placedContainers.filter(function(c){return c.isManual;}).map(function(c){
      return {id:c.id,isManual:true,isPlanned:!!c.isPlanned,length:c.length,width:c.width,height:c.height,weight:c.weight,destination:c.destination,customColor:c.customColor,imdgClass:c.imdgClass,isHazardous:c.isHazardous,isReefer:c.isReefer,temp:c.temp,rotated:c.rotated,x:c.x,y:c.y,customFontSize:c.customFontSize,display:c.display||null};});
    localStorage.setItem(MANUAL_KEY,JSON.stringify(arr));
  }catch(e){}
}
function loadManualFromStorage(){
  try{
    var raw=localStorage.getItem(MANUAL_KEY);if(!raw)return;
    var arr=JSON.parse(raw);if(!Array.isArray(arr))return;
    arr.forEach(function(o){o.isManual=true;if(o.customColor===undefined)o.customColor=null;if(o.isPlanned===undefined)o.isPlanned=false;placedContainers.push(o);});
  }catch(e){}
}
buildSizeOptions();buildImdgOptions();buildLegend();refreshLegend();
if(mSize)mSize.onchange=onSizeChange;
if(mReefer)mReefer.onchange=function(){if(mTemp)mTemp.classList.toggle('hidden',!mReefer.checked);};
if(mSubmit)mSubmit.onclick=onSubmit;
if(mCancel)mCancel.onclick=closeManualModal;
if(manualModal)manualModal.addEventListener('mousedown',function(e){if(e.target===manualModal)closeManualModal();});
var emptyAdd=g('emptyAdd');
if(emptyAdd)emptyAdd.onclick=function(){var m=g('emptyContextMenu');var p=m?m.__pos:null;closeEmptyMenu();openCreateModal(p);};
var ctxEdit=g('ctxEdit');
if(ctxEdit)ctxEdit.onclick=editManualFromContext;