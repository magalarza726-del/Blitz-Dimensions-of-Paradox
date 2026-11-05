
(function(){
'use strict';

var TYPE_BY_ID=function(id){return TYPES.find(function(t){return t[0]===id})};
var cloneCard=function(x){return JSON.parse(JSON.stringify(x))};
var uid=function(){return 'card_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8)};
var preV3Base=base;

base=function(id){
  var c=preV3Base(id);
  if(id==='skillPassive'||id==='skillActive')c.accent='#00ffff';
  if(id==='weapon'){
    var gray='#dddddd';
    if(c.weapon.palette.indexOf(gray)<0)c.weapon.palette.unshift(gray);
    c.weapon.paint=gray;
  }
  if(id==='map'){
    c.map.border='#12aee8';
    Object.keys(c.map.arrows).forEach(function(k){
      if(c.map.arrows[k].length<3)c.map.arrows[k].push(1);
    });
  }
  return c;
};

function normalizeCard(c,type){
  if(!c)return base(type);
  c.type=type||c.type;
  if(c.type==='skillPassive'||c.type==='skillActive')c.accent='#00ffff';
  if(c.type==='weapon'){
    c.weapon=c.weapon||base('weapon').weapon;
    c.weapon.palette=c.weapon.palette||[];
    if(c.weapon.palette.indexOf('#dddddd')<0)c.weapon.palette.unshift('#dddddd');
  }
  if(c.type==='map'){
    c.map=c.map||base('map').map;
    if(!c.map.border||String(c.map.border).toLowerCase()==='#07304d')c.map.border='#12aee8';
    c.map.arrows=c.map.arrows||base('map').map.arrows;
    Object.keys(base('map').map.arrows).forEach(function(k){
      var v=c.map.arrows[k]||[1,0,1];
      if(v.length<3)v[2]=1;
      if(v[2]===undefined||v[2]===null||v[2]==='')v[2]=1;
      c.map.arrows[k]=v;
    });
  }
  return c;
}
function migrateV3(){
  state=state||{type:'skillPassive',side:'both',cards:{}};
  state.cards=state.cards||{};
  TYPES.forEach(function(t){state.cards[t[0]]=normalizeCard(state.cards[t[0]]||base(t[0]),t[0])});
  state.library=Array.isArray(state.library)?state.library:[];
  state.library=state.library.map(function(it){
    if(it.data)it.data=normalizeCard(it.data,it.type);
    return it;
  });
  state.editingId=state.editingId||null;
}
function persist(){
  try{localStorage.setItem('blitzDOP',JSON.stringify(state))}catch(e){
    alert('El navegador no pudo guardar todo localmente. Exporta el proyecto JSON; las imágenes grandes pueden llenar el almacenamiento local.');
  }
}
function typeLabel(id){var t=TYPE_BY_ID(id);return t?t[1]:id}
function typeAccent(id){var t=TYPE_BY_ID(id);return t?t[2]:'#fff'}

var ORIGINAL_ICONS={
  skill:'assets/icons/skill.png',
  weapon:'assets/icons/weapon.png',
  elemental:'assets/icons/elemental.png',
  object:'assets/icons/object.png',
  character:'assets/icons/character.png',
  map:'assets/icons/map.png'
};
function typeIconSVG(type,label){
  var key=(type==='skillPassive'||type==='skillActive')?'skill':type;
  if(ORIGINAL_ICONS[key])return '<img class="original-icon-img" src="'+ORIGINAL_ICONS[key]+'" alt="">';
  if(type==='ai')return '<span class="original-text-icon">IA</span>';
  if(type&&type.indexOf('enemy')===0)return '<span class="original-text-icon">'+esc(label||type.replace('enemy',''))+'</span>';
  return '';
}
badgeHTML=function(symbol,extra){
  var raw=String(symbol);
  var html=(raw.indexOf('<svg')>=0||raw.indexOf('<img')>=0||raw.indexOf('<span')>=0)?raw:'<b style="font:900 16px Arial">'+esc(symbol)+'</b>';
  return '<div class="card-badge '+(extra||'')+'"><span class="icon-wrap">'+html+'</span></div>';
};
front=function(c,t){
  var type=t[0];
  return '<div class="card '+(type==='ai'?'ai-front ':'')+'" style="--c:'+c.accent+'"><div class="inner"><div class="ct">'+esc(c.name)+'</div><div class="front-art">'+(c.art?'<img src="'+c.art+'">':'Arte')+badgeHTML(typeIconSVG(type))+'</div></div></div>';
};

function skillBackV3(c,type){
  var cls=type==='skillActive'?' skill-active-card':'';
  var body=stats(c.stats,'skill-stats');
  if(type==='skillActive'){
    body=body.replace(/<i style="--v:/g,'<i style="background:#00ffff!important;--v:');
  }
  return '<div class="card back'+cls+'" style="--c:#00ffff"><div class="inner"><div class="ct">'+esc(c.name)+'</div><div class="title">Técnica especial</div><div class="box skill-tech">'+esc(c.technique)+'</div><div class="title">Estadísticas mejoradas</div>'+body+'</div></div>';
}
function renderFace(card,type,face){
  card=normalizeCard(card,type);
  var old=state.type;
  state.type=type;
  var h='';
  if(face==='front'){
    if(type.indexOf('enemy')===0)h=enemyFront(card,+type.replace('enemy',''));
    else if(type==='character')h=characterFront(card);
    else if(type==='map')h=mapFront(card);
    else h=front(card,TYPE_BY_ID(type));
  }else{
    if(type.indexOf('skill')===0)h=skillBackV3(card,type);
    else if(type==='weapon')h=weaponBack(card);
    else if(type==='elemental')h=elementalBack(card);
    else if(type==='object')h=objectBack(card);
    else if(type.indexOf('enemy')===0)h=enemyBack(card);
    else if(type==='ai')h=aiBack(card);
    else if(type==='character')h=characterBack(card);
    else if(type==='map')h=mapBack(card);
  }
  state.type=old;
  return h;
}
function previewV3(){
  var c=C(),type=state.type;
  var f=renderFace(c,type,'front'),b=renderFace(c,type,'back');
  $('#stage').innerHTML=state.side==='front'?f:state.side==='back'?b:f+b;
}
window.preview=previewV3;

function arrowPolygon(dir,inverted){
  var actual=dir;
  if(inverted){
    var opp={N:'S',NE:'SW',E:'W',SE:'NW',S:'N',SW:'NE',W:'E',NW:'SE'};
    actual=opp[dir];
  }
  var p={
    N:'4,12 9,12 9,25 19,25 19,12 24,12 14,2',
    S:'9,3 19,3 19,16 24,16 14,26 4,16 9,16',
    E:'3,9 16,9 16,4 26,14 16,24 16,19 3,19',
    W:'25,9 12,9 12,4 2,14 12,24 12,19 25,19',
    NE:'5,4 25,4 25,24 18,17 18,11 12,11',
    NW:'3,4 23,4 16,11 10,11 10,17 3,24',
    SE:'25,4 25,24 5,24 12,17 18,17 18,11',
    SW:'3,4 3,24 23,24 16,17 10,17 10,11'
  };
  return p[actual];
}
function gateTextPos(dir){
  var p={N:[14,13],S:[14,15],E:[15,14],W:[13,14],NE:[19,8],NW:[9,8],SE:[19,20],SW:[9,20]};
  return p[dir]||[14,14];
}
function gateSvg(k,v){
  var tp=gateTextPos(k),num=esc(v[2]);
  return '<span class="map-gate '+k+'"><svg viewBox="0 0 28 28" aria-label="Acceso '+k+' número '+num+'"><polygon class="gate-body" points="'+arrowPolygon(k,!!v[1])+'"></polygon><text x="'+tp[0]+'" y="'+tp[1]+'">'+num+'</text></svg></span>';
}
mapBack=function(c){
  var m=normalizeCard(c,'map').map;
  var cells=Array.from({length:289},function(){return '<div class="mapc"></div>'}).join('');
  var gates=Object.keys(m.arrows).map(function(k){var v=m.arrows[k];return v[0]?gateSvg(k,v):''}).join('');
  var cols='ABCDEFGHIJKLMNOPQ'.split('').map(function(x){return '<span>'+x+'</span>'}).join('');
  var rows=Array.from({length:17},function(_,i){return '<span>'+(i+1)+'</span>'}).join('');
  var cr='<table class="crit">'+m.critical.map(function(r){return '<tr><td style="width:52px">'+esc(r[0])+'</td><td>'+esc(r[1])+'</td></tr>'}).join('')+'</table>';
  return '<div class="card back map-card" style="--c:'+c.accent+'"><div class="inner"><div class="ct">'+esc(c.name)+'</div><div class="map-board-wrap" style="--mf:'+m.border+';--ma:'+m.arrow+';--ml:'+m.label+'"><span class="map-label map-N">N</span><span class="map-label map-E">E</span><div class="map-label map-cols">'+cols+'</div><div class="map-label map-rows">'+rows+'</div><div class="mapg">'+(m.image?'<img class="mimg" src="'+m.image+'">':'')+cells+'</div>'+gates+'</div><div class="map-crits"><div class="title">Casillas críticas</div>'+cr+'</div></div></div>';
};

var preV3Editor=editor;
editor=function(){
  preV3Editor();
  var c=C();
  if(state.type==='weapon'){
    var secNode=document.querySelector('#ed .sec:nth-of-type(2)');
    if(secNode){
      var note=document.createElement('div');
      note.className='weapon-gray-note';
      note.textContent='El gris (#dddddd) coincide con las casillas vacías y funciona como borrador visual.';
      secNode.appendChild(note);
    }
  }
  if(state.type==='map'){
    var borderInput=document.querySelector('[data-k="map.border"]');
    if(borderInput){
      var borderLabel=borderInput.closest('.f');
      if(borderLabel&&borderLabel.querySelector('span'))borderLabel.querySelector('span').textContent='Contorno celeste';
      var appearance=borderInput.closest('.sec');
      if(appearance&&!appearance.querySelector('.map-frame-note')){
        var note=document.createElement('div');note.className='map-frame-note';note.textContent='Este color modifica todo el marco celeste alrededor de la cuadrícula.';
        appearance.appendChild(note);
      }
    }
    Object.keys(c.map.arrows).forEach(function(k){
      var first=document.querySelector('[data-ar="'+k+'"]');
      if(!first)return;
      var row=first.closest('.row3');
      if(!row||row.querySelector('[data-anum="'+k+'"]'))return;
      row.style.gridTemplateColumns='34px 1fr 1fr 72px';
      var lab=document.createElement('label');
      lab.className='f';
      lab.style.margin='0';
      lab.innerHTML='<span>Número</span><input class="miniinput" data-anum="'+k+'" type="number" min="0" max="99" value="'+esc(c.map.arrows[k][2])+'">';
      row.appendChild(lab);
      var inp=lab.querySelector('input');
      inp.oninput=function(){
        var v=Math.max(0,Math.min(99,parseInt(inp.value||'0',10)));
        c.map.arrows[k][2]=v;
        window.preview();
      };
    });
  }
};

var preV3Menu=menu;
menu=function(){
  var m=$('#menu');
  m.innerHTML=TYPES.map(function(t){return '<button class="type '+(t[0]===state.type?'active':'')+'" data-t="'+t[0]+'"><span class="dot" style="background:'+t[2]+'"></span>'+t[1]+'</button>'}).join('');
  m.querySelectorAll('[data-t]').forEach(function(b){
    b.onclick=function(){
      state.type=b.dataset.t;
      state.editingId=null;
      state.cards[state.type]=normalizeCard(state.cards[state.type]||base(state.type),state.type);
      render();
    };
  });
};

function cardDims(type){
  if(type.indexOf('enemy')===0||type==='character')return [270,508];
  if(type==='map')return [360,492];
  return [270,365];
}
function frontForThumb(c,type){return renderFace(c,type,'front')}

function injectHome(){
  if(document.getElementById('homeView'))return;
  var home=document.createElement('main');
  home.id='homeView';home.className='home-view';
  document.querySelector('.top').insertAdjacentElement('afterend',home);
}

function applyTheme(theme){
  theme=theme==='light'?'light':'dark';
  document.documentElement.setAttribute('data-theme',theme);
  try{localStorage.setItem('blitzTheme',theme)}catch(e){}
  var b=document.getElementById('themeToggle');
  if(b)b.textContent=theme==='light'?'Modo oscuro':'Modo claro';
}
function toggleTheme(){
  applyTheme(document.documentElement.getAttribute('data-theme')==='light'?'dark':'light');
}
function injectTopButtons(){
  var a=document.querySelector('.top .actions');
  if(!a||document.getElementById('goHome'))return;
  a.insertAdjacentHTML('afterbegin','<button class="btn" id="goHome">Biblioteca</button><button class="btn v3-save-card" id="saveCard">Guardar carta</button><button class="btn" id="openPdf">Exportar lote PDF</button><button class="btn theme-toggle" id="themeToggle">Modo claro</button>');
  document.getElementById('goHome').onclick=showHome;
  document.getElementById('saveCard').onclick=saveCurrentCard;
  document.getElementById('openPdf').onclick=openPdf;
  document.getElementById('themeToggle').onclick=toggleTheme;
  if(document.getElementById('save')){
    document.getElementById('save').textContent='Guardar borrador';
    document.getElementById('save').onclick=function(){persist();alert('Borrador y biblioteca guardados en este navegador.')};
  }
}
function showHome(){
  persist();
  document.querySelector('.app').classList.add('v3-hidden');
  var h=document.getElementById('homeView');h.classList.add('on');
  renderLibrary();
}
function showEditor(){
  document.getElementById('homeView').classList.remove('on');
  document.querySelector('.app').classList.remove('v3-hidden');
  render();
}
function newFromTemplate(type){
  state.type=type;
  state.cards[type]=base(type);
  state.editingId=null;
  showEditor();
}
function saveCurrentCard(){
  var c=cloneCard(C()),now=new Date().toISOString();
  var found=state.library.find(function(x){return x.id===state.editingId});
  if(found){
    found.type=state.type;found.name=c.name;found.data=c;found.updatedAt=now;
  }else{
    var item={id:uid(),type:state.type,name:c.name,data:c,createdAt:now,updatedAt:now};
    state.library.push(item);state.editingId=item.id;
  }
  persist();
  updateSaveCardText();
  alert('Carta guardada en la biblioteca.');
}
function updateSaveCardText(){
  var b=document.getElementById('saveCard');
  if(b)b.textContent=state.editingId?'Actualizar carta':'Guardar carta';
}
function editSaved(id){
  var it=state.library.find(function(x){return x.id===id});if(!it)return;
  state.type=it.type;state.cards[it.type]=cloneCard(it.data);state.editingId=id;showEditor();updateSaveCardText();
}
function duplicateSaved(id){
  var it=state.library.find(function(x){return x.id===id});if(!it)return;
  var cp=cloneCard(it);cp.id=uid();cp.name=(cp.name||'Carta')+' — copia';cp.data.name=cp.name;cp.createdAt=new Date().toISOString();cp.updatedAt=cp.createdAt;
  state.library.push(cp);persist();renderLibrary();
}
function deleteSaved(id){
  if(!confirm('¿Eliminar esta carta de la biblioteca?'))return;
  state.library=state.library.filter(function(x){return x.id!==id});
  if(state.editingId===id)state.editingId=null;
  persist();renderLibrary();updateSaveCardText();
}
function thumbClass(type){return type==='map'?'mapthumb':(type.indexOf('enemy')===0||type==='character')?'tall':''}
function renderLibrary(){
  var home=document.getElementById('homeView');
  var total=state.library.length;
  var usedTypes=new Set(state.library.map(function(x){return x.type})).size;
  var templates=TYPES.map(function(t){
    return '<button class="template-card" data-new="'+t[0]+'" style="--tc:'+t[2]+'"><span class="template-icon">'+typeIconSVG(t[0],t[0].replace('enemy',''))+'</span><div class="template-title">'+esc(t[1])+'</div><div class="template-new">Crear nueva carta →</div></button>';
  }).join('');
  var options='<option value="">Todos los tipos</option>'+TYPES.map(function(t){return '<option value="'+t[0]+'">'+esc(t[1])+'</option>'}).join('');
  var folders='';
  TYPES.forEach(function(t){
    var items=state.library.filter(function(x){return x.type===t[0]});
    folders+='<details class="folder" data-folder-type="'+t[0]+'" '+(items.length?'open':'')+'><summary><span class="folder-type-icon" style="background:'+t[2]+'">'+typeIconSVG(t[0],t[0].replace('enemy',''))+'</span><span>'+esc(t[1])+'</span><span class="folder-count">'+items.length+' carta'+(items.length===1?'':'s')+'</span></summary><div class="folder-body">';
    if(items.length){
      folders+='<div class="card-library-grid">'+items.map(function(it){
        return '<article class="library-item" data-lib-type="'+it.type+'" data-lib-name="'+esc((it.name||'').toLowerCase())+'" style="--itemc:'+typeAccent(it.type)+'"><div class="library-thumb" data-face="Frente"><div class="library-thumb-inner '+thumbClass(it.type)+'">'+frontForThumb(it.data,it.type)+'</div></div><div class="library-info"><div class="library-name">'+esc(it.name||'Sin nombre')+'</div><div class="library-meta"><span class="dot" style="background:'+typeAccent(it.type)+'"></span>'+esc(typeLabel(it.type))+'</div><div class="library-buttons"><button class="btn" data-edit="'+it.id+'">Editar</button><button class="btn" data-dup="'+it.id+'">Duplicar</button><button class="btn danger" data-del="'+it.id+'">Eliminar</button></div></div></article>';
      }).join('')+'</div>';
    }else folders+='<div class="empty-folder">No hay cartas guardadas aquí todavía. Usa una plantilla de arriba para crear la primera.</div>';
    folders+='</div></details>';
  });
  home.innerHTML='<section class="library-hero"><div><div class="library-kicker">BLITZ · DIMENSIONS OF PARADOX</div><h2>Biblioteca de cartas</h2><p>Crea cartas desde plantillas, ordénalas automáticamente por tipo y vuelve a editarlas cuando quieras.</p></div><div class="library-stat"><span class="stat-pill"><b>'+total+'</b> cartas</span><span class="stat-pill"><b>'+usedTypes+'</b> tipos usados</span></div></section>'+
  '<section class="template-section"><div class="section-head"><div><h3>Crear una carta</h3><p>Elige una plantilla visual.</p></div><div class="home-actions"><button class="btn" id="libPdf">Exportar lote PDF</button><button class="btn" id="libJson">Exportar proyecto JSON</button></div></div><div class="template-gallery">'+templates+'</div></section>'+
  '<section class="saved-section"><div class="section-head"><div><h3>Tus cartas</h3><p>Busca, filtra, edita o duplica cartas ya creadas.</p></div></div><div class="library-toolbar"><input id="libSearch" type="search" placeholder="Buscar por nombre…"><select id="libTypeFilter">'+options+'</select><button class="btn" id="clearLibFilter">Limpiar filtros</button></div><div id="libraryFolders">'+folders+'</div></section>';
  home.querySelectorAll('[data-new]').forEach(function(b){b.onclick=function(){newFromTemplate(b.dataset.new)}});
  home.querySelectorAll('[data-edit]').forEach(function(b){b.onclick=function(){editSaved(b.dataset.edit)}});
  home.querySelectorAll('[data-dup]').forEach(function(b){b.onclick=function(){duplicateSaved(b.dataset.dup)}});
  home.querySelectorAll('[data-del]').forEach(function(b){b.onclick=function(){deleteSaved(b.dataset.del)}});
  document.getElementById('libPdf').onclick=openPdf;
  document.getElementById('libJson').onclick=function(){document.getElementById('exp').click()};
  function filter(){
    var q=(document.getElementById('libSearch').value||'').trim().toLowerCase();
    var ty=document.getElementById('libTypeFilter').value;
    document.querySelectorAll('[data-folder-type]').forEach(function(folder){
      var folderType=folder.dataset.folderType;
      if(ty&&folderType!==ty){folder.style.display='none';return}
      var any=false;
      folder.querySelectorAll('.library-item').forEach(function(item){
        var ok=!q||item.dataset.libName.indexOf(q)>=0;
        item.style.display=ok?'':'none';if(ok)any=true;
      });
      var hasItems=folder.querySelectorAll('.library-item').length>0;
      folder.style.display=(!q||any||!hasItems)?'':'none';
      if(q&&any)folder.open=true;
    });
  }
  document.getElementById('libSearch').oninput=filter;
  document.getElementById('libTypeFilter').onchange=filter;
  document.getElementById('clearLibFilter').onclick=function(){document.getElementById('libSearch').value='';document.getElementById('libTypeFilter').value='';filter()};
}
function injectPdf(){
  if(document.getElementById('pdfModal'))return;
  document.body.insertAdjacentHTML('beforeend',
    '<div class="pdf-modal" id="pdfModal"><div class="pdf-dialog"><div class="pdf-head"><div><h2>Exportar lote de cartas</h2><div class="small">Selecciona cartas, cara y distribución. La vista previa muestra la primera hoja.</div></div><button class="btn" id="closePdf">Cerrar</button></div><div class="pdf-layout"><div class="pdf-controls"><label class="f"><span>Cartas por hoja</span><select id="pdfPerPage">'+[1,2,3,4,5,6].map(function(n){return '<option value="'+n+'" '+(n===4?'selected':'')+'>'+n+'</option>'}).join('')+'</select></label><label class="f"><span>Caras</span><select id="pdfFaces"><option value="front">Frente</option><option value="back">Reverso</option><option value="both" selected>Frente y reverso</option></select></label><div style="display:flex;gap:6px"><button class="btn" id="pdfAll">Seleccionar todo</button><button class="btn" id="pdfNone">Quitar selección</button></div><div class="pdf-list" id="pdfList"></div><button class="btn v3-save-card" id="makePdf" style="width:100%">Descargar PDF</button></div><div class="pdf-preview-wrap"><div class="pdf-preview-title">Vista previa — hoja 1</div><div id="pdfPreview"></div><div class="pdf-pages-note" id="pdfPagesNote"></div></div></div></div></div><div class="pdf-export-host" id="pdfExportHost"></div>'
  );
  document.getElementById('closePdf').onclick=closePdf;
  document.getElementById('pdfModal').onclick=function(e){if(e.target.id==='pdfModal')closePdf()};
  document.getElementById('pdfAll').onclick=function(){document.querySelectorAll('#pdfList input').forEach(function(x){x.checked=true});refreshPdfPreview()};
  document.getElementById('pdfNone').onclick=function(){document.querySelectorAll('#pdfList input').forEach(function(x){x.checked=false});refreshPdfPreview()};
  document.getElementById('pdfPerPage').onchange=refreshPdfPreview;
  document.getElementById('pdfFaces').onchange=refreshPdfPreview;
  document.getElementById('makePdf').onclick=exportPdf;
}
function openPdf(){
  if(!state.library.length){alert('Primero guarda al menos una carta en la biblioteca.');return}
  injectPdf();
  var list=document.getElementById('pdfList');
  list.innerHTML=state.library.map(function(it){return '<label class="pdf-check"><input type="checkbox" value="'+it.id+'" checked><span><b>'+esc(it.name)+'</b><br><span class="small">'+esc(typeLabel(it.type))+'</span></span></label>'}).join('');
  list.querySelectorAll('input').forEach(function(x){x.onchange=refreshPdfPreview});
  document.getElementById('pdfModal').classList.add('on');
  refreshPdfPreview();
}
function closePdf(){var m=document.getElementById('pdfModal');if(m)m.classList.remove('on')}
function selectedPdfItems(){
  var ids=Array.from(document.querySelectorAll('#pdfList input:checked')).map(function(x){return x.value});
  return state.library.filter(function(it){return ids.indexOf(it.id)>=0});
}
function pdfFaces(){
  var mode=document.getElementById('pdfFaces').value,arr=[];
  selectedPdfItems().forEach(function(it){
    if(mode==='front'||mode==='both')arr.push({item:it,face:'front'});
    if(mode==='back'||mode==='both')arr.push({item:it,face:'back'});
  });
  return arr;
}
function layoutFor(n){
  if(n<=1)return [1,1];
  if(n===2)return [2,1];
  if(n<=4)return [2,2];
  return [2,3];
}
function scaleForSlot(type,slotW,slotH){
  var d=cardDims(type);
  return Math.min(slotW/d[0],slotH/d[1])*.94;
}
function cardWrapper(face,slotW,slotH,exportMode){
  var d=cardDims(face.item.type),s=scaleForSlot(face.item.type,slotW,slotH);
  var outerClass=exportMode?'pdf-card-export':'pdf-card-wrap';
  return '<div class="'+outerClass+'" style="width:'+(d[0]*s)+'px;height:'+(d[1]*s)+'px;position:relative"><div style="width:'+d[0]+'px;height:'+d[1]+'px;transform:scale('+s+');transform-origin:top left">'+renderFace(face.item.data,face.item.type,face.face)+'</div></div>';
}
function sheetHtml(faces,n,previewMode){
  var lr=layoutFor(n),cols=lr[0],rows=lr[1];
  var W=previewMode?397:794,H=previewMode?561.5:1123,pad=previewMode?16:30,gap=previewMode?10:18;
  var slotW=(W-pad*2-gap*(cols-1))/cols,slotH=(H-pad*2-gap*(rows-1))/rows;
  var cls=previewMode?'pdf-preview-sheet':'pdf-sheet-export',slotCls=previewMode?'pdf-slot':'pdf-slot-export';
  var slots=faces.map(function(f){return '<div class="'+slotCls+'">'+cardWrapper(f,slotW,slotH,!previewMode)+'</div>'}).join('');
  while(faces.length<cols*rows){slots+='<div class="'+slotCls+'"></div>';faces.push(null)}
  return '<div class="'+cls+'" style="grid-template-columns:repeat('+cols+',1fr);grid-template-rows:repeat('+rows+',1fr)">'+slots+'</div>';
}
function refreshPdfPreview(){
  if(!document.getElementById('pdfPreview'))return;
  var faces=pdfFaces(),n=+document.getElementById('pdfPerPage').value;
  var first=faces.slice(0,n);
  document.getElementById('pdfPreview').innerHTML=sheetHtml(first,n,true);
  document.getElementById('pdfPagesNote').textContent=faces.length?Math.ceil(faces.length/n)+' hoja(s) · '+faces.length+' cara(s) a exportar':'Selecciona al menos una carta.';
}
async function exportPdf(){
  var faces=pdfFaces(),n=+document.getElementById('pdfPerPage').value;
  if(!faces.length){alert('Selecciona al menos una carta.');return}
  if(!window.html2canvas||!window.jspdf){alert('No se pudieron cargar las librerías PDF. Recarga la página con conexión a internet.');return}
  var btn=document.getElementById('makePdf'),old=btn.textContent;btn.disabled=true;btn.textContent='Generando PDF…';
  try{
    var host=document.getElementById('pdfExportHost');host.innerHTML='';
    var chunks=[];for(var i=0;i<faces.length;i+=n)chunks.push(faces.slice(i,i+n));
    chunks.forEach(function(ch){var d=document.createElement('div');d.innerHTML=sheetHtml(ch.slice(),n,false);host.appendChild(d.firstChild)});
    var PDF=window.jspdf.jsPDF,pdf=new PDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
    var sheets=Array.from(host.querySelectorAll('.pdf-sheet-export'));
    for(var s=0;s<sheets.length;s++){
      if(s>0)pdf.addPage('a4','portrait');
      var canvas=await window.html2canvas(sheets[s],{scale:2,backgroundColor:'#ffffff',useCORS:true,logging:false});
      var img=canvas.toDataURL('image/jpeg',0.95);
      pdf.addImage(img,'JPEG',0,0,210,297,undefined,'FAST');
    }
    pdf.save('blitz-dimensions-of-paradox-cartas.pdf');
    host.innerHTML='';
  }catch(e){console.error(e);alert('No se pudo generar el PDF: '+e.message)}
  btn.disabled=false;btn.textContent=old;
}

var oldRender=render;
render=function(){
  oldRender();
  updateSaveCardText();
};

function bootV3(){
  migrateV3();
  injectHome();injectTopButtons();injectPdf();
  applyTheme(localStorage.getItem('blitzTheme')||'dark');
  document.getElementById('reset').onclick=function(){
    if(!confirm('¿Reiniciar el borrador actual? Las cartas guardadas en la biblioteca se conservarán.'))return;
    var lib=state.library||[];
    state={type:'skillPassive',side:'both',cards:{},library:lib,editingId:null};
    TYPES.forEach(function(t){state.cards[t[0]]=base(t[0])});
    persist();render();showEditor();
  };
  document.getElementById('imp').onchange=function(){
    var f=this.files[0];if(!f)return;var r=new FileReader();
    r.onload=function(){try{state=JSON.parse(r.result);migrateV3();persist();render();showHome()}catch(e){alert('JSON no válido')}};
    r.readAsText(f);
  };
  persist();render();showHome();
}
bootV3();
})();