'use strict';
// CoalTrack: edit data/plants.csv, then publish. No build step required.
const CATEGORIES = [
 {id:'operating',label:'Operating',color:'#10b981'},
 {id:'conversion',label:'Operating with conversions',color:'#3b82f6'},
 {id:'retirement',label:'Operating with retirements',color:'#f59e0b'},
 {id:'mixed',label:'Operating with mixed changes',color:'#a78bfa'},
 {id:'retired',label:'Retired',color:'#f43f5e'},
 {id:'review',label:'Needs review',color:'#94a3b8'}
];
const BASEMAPS = {
 osm:{url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',attr:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',subdomains:'abc',maxZoom:19},
 esri:{url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',attr:'Tiles &copy; Esri',maxZoom:19},
 topo:{url:'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',attr:'&copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA) &amp; OpenStreetMap contributors',subdomains:'abc',maxZoom:17}
};
let basemapOpacity=0.7;
let plants=[],filtered=[],map,markers,tiles,currentSort={key:'name',direction:1},hasSetBounds=false;
const $=id=>document.getElementById(id);
const nf=n=>Math.round(n).toLocaleString('en-US');
function classify(status){
 const s=String(status||'').trim().toLowerCase().replace(/\s+/g,' ');
 if(s==='retired')return 'retired';
 if(!s.startsWith('operating')&&!s.startsWith('operting'))return 'review';
 const retirement=/retirement|retirements/.test(s);
 const conversion=/conversion|conversions/.test(s);
 const gasConstruction=/construction\s*\(natural gas\)/.test(s);
 if(retirement&&(conversion||gasConstruction))return 'mixed';
 if(retirement)return 'retirement';
 if(conversion)return 'conversion';
 if(s==='operating')return 'operating';
 return 'review';
}
// Self-contained CSV parser: honors quoted commas and multi-line source notes.
function csvParse(src){
 const output=[];let row=[],cell='',inside=false;
 for(let i=0;i<src.length;i++){
  const c=src[i];
  if(c==='"'){if(inside&&src[i+1]==='"'){cell+='"';i++;}else inside=!inside;}
  else if(c===','&&!inside){row.push(cell);cell='';}
  else if((c==='\r'||c==='\n')&&!inside){if(c==='\r'&&src[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x!==''))output.push(row);row=[];cell='';}
  else cell+=c;
 }
 row.push(cell);if(row.some(x=>x!==''))output.push(row);
 const cols=output.shift().map(x=>x.replace(/^\ufeff/,''));
 return output.map(values=>Object.fromEntries(cols.map((key,i)=>[key,values[i]||''])));
}
function getData(row,i){
 const latitude=Number(row.Latitude),longitude=Number(row.Longitude);
 return {id:i,name:row.Name,state:row.State.trim().toUpperCase(),city:row.City,county:row.County,parent:row.Parent,lat:latitude,lng:longitude,units:row.Units,acres:row.Acres,capacity:Number(String(row.Capacity_MW).replace(/,/g,''))||0,status:row.Status.trim(),category:classify(row.Status),meta:row};
}
function safe(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function cat(id){return CATEGORIES.find(c=>c.id===id)||CATEGORIES[5];}
function pill(id){const c=cat(id);return `<span class="pill" style="border-color:${c.color}88;background:${c.color}20;color:${c.color}">${safe(c.label)}</span>`;}
function setTiles(id){if(!map)return;if(tiles)map.removeLayer(tiles);const b=BASEMAPS[id]||BASEMAPS.osm;tiles=L.tileLayer(b.url,{attribution:b.attr,maxZoom:b.maxZoom,subdomains:b.subdomains||'',crossOrigin:true,pane:'coaltrackBasemap',opacity:1});tiles.on('tileerror',()=>{$('map-status').hidden=false;$('map-status').textContent='Some background tiles could not load. Try a different basemap from the menu.';});tiles.on('load',()=>{$('map-status').hidden=true;});tiles.addTo(map);applyBasemapOpacity();}
function applyBasemapOpacity(){if(!map)return;const pane=map.getPane('coaltrackBasemap');if(pane)pane.style.opacity=String(basemapOpacity);}
function initMap(){
 if(typeof L==='undefined')throw Error('Leaflet could not load. Check your internet connection.');
 map=L.map('map',{center:[42.5,-91],zoom:5,minZoom:3,maxZoom:18,zoomControl:false,preferCanvas:true});
 L.control.zoom({position:'bottomright'}).addTo(map);
 map.createPane('coaltrackBasemap');map.getPane('coaltrackBasemap').style.zIndex='200';markers=L.layerGroup().addTo(map);setTiles('osm');
 map.on('moveend',()=>{if($('workspace').classList.contains('table'))return;updateTable();});
 $('basemap').addEventListener('change',e=>setTiles(e.target.value));
 $('basemap-opacity').addEventListener('input',e=>{basemapOpacity=Number(e.target.value)/100;const text=`${e.target.value}%`;$('opacity-label').textContent=text;$('opacity-value').textContent=text;applyBasemapOpacity();});
 $('fit').addEventListener('click',fitToFiltered);
}
function markerRadius(capacity){return Math.min(20,Math.max(4,Math.sqrt(Math.max(0,capacity))*0.15+4));}
function paintMap(){if(!map)return;markers.clearLayers();const canvas=L.canvas({padding:.5});
 for(const p of filtered){if(!Number.isFinite(p.lat)||!Number.isFinite(p.lng)||p.lat===0||p.lng===0)continue;
  const c=cat(p.category),marker=L.circleMarker([p.lat,p.lng],{renderer:canvas,radius:markerRadius(p.capacity),color:c.color,fillColor:c.color,weight:1.8,opacity:.9,fillOpacity:.62});
  marker.bindPopup(`<div><strong>${safe(p.name)}</strong><br><small>${safe(p.city)}, ${safe(p.state)}</small><br>${nf(p.capacity)} MW · ${safe(p.units)} units<br>${pill(p.category)}<br><small>Source: ${safe(p.status)}</small><br><button class="popup-action" data-open-id="${p.id}">More details</button></div>`);
  marker.on('click',()=>{});marker.addTo(markers);
 }
}
function fitToFiltered(){if(!map)return;const valid=filtered.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&p.lat!==0&&p.lng!==0);if(valid.length){map.fitBounds(L.latLngBounds(valid.map(p=>[p.lat,p.lng])),{padding:[30,30],maxZoom:9});}}
function apply(){const state=$('state').value,status=$('status').value,minimum=Number($('capacity-min').value),term=$('search').value.trim().toLowerCase();
 filtered=plants.filter(p=>(state==='all'||p.state===state)&&(status==='all'||p.category===status)&&p.capacity>=minimum&&(!term||[p.name,p.city,p.parent,p.county].some(t=>String(t).toLowerCase().includes(term))));
 $('capacity-display').textContent=nf(minimum)+' MW';
 $('count').textContent=nf(filtered.length);$('operating-count').textContent=nf(filtered.filter(p=>p.category!=='retired'&&p.category!=='review').length);$('retired-count').textContent=nf(filtered.filter(p=>p.category==='retired').length);
 paintMap();updateTable();updateBars();
}
function updateBars(){const agg={};for(const p of filtered)agg[p.state]=(agg[p.state]||0)+p.capacity;const sorted=Object.entries(agg).sort((a,b)=>b[1]-a[1]),max=Math.max(...sorted.map(x=>x[1]),1);$('state-bars').innerHTML=sorted.map(([s,n])=>`<div class="bar-row"><span>${safe(s)}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(0,n/max*100)}%"></div></div><span>${(n/1000).toFixed(1)}k MW</span></div>`).join('')||'<small>No matching plants</small>';}
function updateTable(){let list=[...filtered];if(map&&!$('workspace').classList.contains('table')){const b=map.getBounds();list=list.filter(p=>b.contains([p.lat,p.lng]));}
 const k=currentSort.key,d=currentSort.direction;list.sort((a,b)=>typeof a[k]==='number'?(a[k]-b[k])*d:String(a[k]).localeCompare(String(b[k]))*d);
 // The prominent counter shows plants inside the current map viewport, not just sidebar matches.
 // Table-only mode has no visible map, so show all records matching the sidebar filters.
 const tableOnly=$('workspace').classList.contains('table');
 $('record-count').textContent=tableOnly
  ? `${filtered.length} of ${plants.length} plants`
  : `${list.length} visible · ${filtered.length} match filters`;
 $('table-count').textContent=`${list.length} in ${tableOnly?'selection':'map view'}`;
 $('plant-rows').innerHTML=list.map(p=>`<tr data-id="${p.id}"><td><div class="plant-name">${safe(p.name)}</div><div class="plant-city">${safe(p.city)}</div></td><td>${safe(p.state)}</td><td>${nf(p.capacity)}</td><td>${pill(p.category)}</td></tr>`).join('')||'<tr><td colspan="4">No plants match this view.</td></tr>';
}
function section(title,value){if(!value||String(value).trim().toLowerCase()==='na')return '';return `<section class="detail-section"><h3>${safe(title)}</h3><p>${safe(value)}</p></section>`;}
function showDetails(id){const p=plants.find(p=>p.id===Number(id));if(!p)return;const m=p.meta;const sources=String(m.Sources||'').split(/\s+/).filter(x=>/^https?:\/\//.test(x));$('detail-body').innerHTML=`<h2 class="detail-heading">${safe(p.name)}</h2><p class="detail-subtitle">${safe(p.city)}, ${safe(p.state)} · ${safe(p.county)} County</p>${pill(p.category)}<div class="detail-grid"><div class="detail-cell"><small>Original status (preserved)</small><strong>${safe(p.status)}</strong></div><div class="detail-cell"><small>Reported capacity</small><strong>${nf(p.capacity)} MW · ${safe(p.units)} units</strong></div><div class="detail-cell"><small>Parent / owner</small><strong>${safe(p.parent)}</strong></div><div class="detail-cell"><small>Plant coordinates</small><strong>${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}</strong></div></div>${section('Generator status',m.Generator_Status)}${section('Fuel breakdown',m.Fuel_Breakdown)}${section('Changes in operation',m.Operations_Changes)}${section('Notes',m.Notes)}${section('Environmental concerns',m.Environmental_Concerns)}${section('Community feedback',m.Community_Feedback)}${sources.length?`<section class="detail-section sources"><h3>Source links</h3>${sources.slice(0,12).map((s,i)=>`<a href="${safe(s)}" rel="noopener noreferrer" target="_blank">Reference ${i+1} ↗</a>`).join('')}</section>`:''}<p class="disclaimer">Original research dataset: May 2025. Details may no longer reflect current operations.</p>`;$('details').showModal();}
function bindControls(){for(const id of ['state','status','capacity-min','search'])$(id).addEventListener(id==='search'||id==='capacity-min'?'input':'change',apply);
 $('reset').onclick=()=>{$('state').value='all';$('status').value='all';$('capacity-min').value=0;$('search').value='';apply();fitToFiltered();};
 $('close-details').onclick=()=>$('details').close();document.addEventListener('click',e=>{const el=e.target.closest('[data-open-id],tr[data-id]');if(el)showDetails(el.dataset.openId??el.dataset.id);});
 
 document.querySelectorAll('[data-view]').forEach(btn=>btn.onclick=()=>{const view=btn.dataset.view;$('workspace').className='workspace '+view;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b===btn));setTimeout(()=>{if(map){map.invalidateSize();}updateTable();},120);});
 document.querySelectorAll('[data-sort]').forEach(el=>el.onclick=()=>{const key=el.dataset.sort;currentSort={key,direction:currentSort.key===key?-currentSort.direction:1};updateTable();});
 $('toggle-sidebar').onclick=()=>$('sidebar').classList.toggle('open');
}
async function start(){try{
 const response=await fetch('data/plants.csv',{cache:'no-cache'});if(!response.ok)throw Error('Could not load data/plants.csv (HTTP '+response.status+').');
 plants=csvParse(await response.text()).map(getData);
 if(!plants.length)throw Error('Plant CSV appears to be empty.');
 const invalid=plants.filter(p=>!Number.isFinite(p.lat)||!Number.isFinite(p.lng)||!p.name),review=plants.filter(p=>p.category==='review');
 if(invalid.length||review.length)console.warn('Review source rows:',{invalid,review});
 for(const state of [...new Set(plants.map(p=>p.state))].sort())$('state').add(new Option(state,state));
 for(const c of CATEGORIES.filter(c=>plants.some(p=>p.category===c.id)))$('status').add(new Option(c.label,c.id));
 $('legend').innerHTML=CATEGORIES.filter(c=>plants.some(p=>p.category===c.id)).map(c=>`<div class="legend-item"><span class="dot" style="background:${c.color}"></span>${safe(c.label)}</div>`).join('');
 bindControls();initMap();apply();fitToFiltered();
}catch(err){console.error(err);$('record-count').textContent='Could not start map';$('map-status').hidden=false;$('map-status').textContent=err.message+(location.protocol==='file:'?' Open this site through a web server, not directly from your Downloads folder.':'');}}
document.addEventListener('DOMContentLoaded',start);
