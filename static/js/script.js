'use strict';

let chartInst = null;
let currentCity = 'Chennai';
let userFavourites = [];
const DAY = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const ALL_CITIES = ['Jaipur','Lucknow','Ajmer','Hyderabad','Bangalore','Kolkata','Mumbai','Kochi','Pune','Chennai','New Delhi','Surat','Bhopal'];

/* ══ HELPERS ══ */
const iconMap = (code, isDay=1) => {
  if(code===1000) return isDay?'☀️':'🌙';
  if(code===1003) return isDay?'⛅':'🌤️';
  if([1006,1009].includes(code)) return'☁️';
  if([1030,1135,1147].includes(code)) return'🌫️';
  if([1063,1150,1153,1180,1183,1186,1189,1192,1195,1240,1243,1246].includes(code)) return'🌧️';
  if([1066,1114,1117,1210,1213,1216,1219,1222,1225,1255,1258].includes(code)) return'❄️';
  if([1087,1273,1276,1279,1282].includes(code)) return'⛈️';
  return'🌡️';
};
function fmt12(t){
  if(!t) return'--';
  const[h,m]=t.split(':');
  const hr=parseInt(h),ap=hr>=12?'PM':'AM';
  return`${hr%12||12}:${m} ${ap}`;
}
function aqiColor(v){return v<=50?'#22c55e':v<=100?'#eab308':v<=150?'#f97316':v<=200?'#ef4444':'#9333ea'}
function aqiText(v){
  if(v<=50) return{label:'Good',sub:'Air is clean and healthy'};
  if(v<=100) return{label:'Moderate',sub:'Acceptable air quality'};
  if(v<=150) return{label:'Unhealthy*',sub:'Sensitive groups affected'};
  if(v<=200) return{label:'Unhealthy',sub:'Everyone may be affected'};
  return{label:'Hazardous',sub:'Serious health effects'};
}
function dotC(v,hi){return v>hi?'#ef4444':v>hi/2?'#eab308':'#22c55e'}
function degToDir(d){
  const dirs=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(d/22.5)%16];
}

/* ══ DYNAMIC BACKGROUND ══ */
function setBackground(code,isDay){
  ['stars','cloudsWrap','rainWrap','sunWrap','moonWrap'].forEach(id=>{
    document.getElementById(id).innerHTML='';
  });
  document.body.style.removeProperty('--scene-bg');

  const isRain=[1063,1150,1153,1180,1183,1186,1189,1192,1195,1240,1243,1246].includes(code);
  const isSnow=[1066,1114,1117,1210,1213,1216,1219,1222,1225,1255,1258].includes(code);
  const isThunder=[1087,1273,1276,1279,1282].includes(code);
  const isCloudy=[1006,1009].includes(code)||isRain||isSnow||isThunder;
  const isMist=[1030,1135,1147].includes(code);
  const isPartly=code===1003;

  const starsEl=document.getElementById('stars');
  const cloudsEl=document.getElementById('cloudsWrap');
  const rainEl=document.getElementById('rainWrap');
  const sunEl=document.getElementById('sunWrap');
  const moonEl=document.getElementById('moonWrap');

  if(!isDay){
    document.body.style.setProperty('--scene-bg',
      isRain||isThunder?'linear-gradient(180deg,#050810 0%,#080d1a 60%,#0a1020 100%)'
      :isCloudy?'linear-gradient(180deg,#07090f 0%,#0c1120 60%,#0d1220 100%)'
      :'linear-gradient(180deg,#020408 0%,#060c18 50%,#08102a 100%)');
    if(!isCloudy||isPartly){
      for(let i=0;i<120;i++){
        const s=document.createElement('div');s.className='star';
        const sz=Math.random()*2.5+0.5;
        s.style.cssText=`left:${Math.random()*100}%;top:${Math.random()*70}%;width:${sz}px;height:${sz}px;opacity:${Math.random()*.8+.2};--d:${(Math.random()*3+2).toFixed(1)}s;animation-delay:${Math.random()*4}s`;
        starsEl.appendChild(s);
      }
    }
    const mOrb=document.createElement('div');mOrb.className='moon-orb';
    mOrb.style.cssText='width:70px;height:70px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#e8e8d0,#c8c8a0)';
    const mWrap=document.createElement('div');mWrap.className='moon-wrap';
    mWrap.style.cssText='top:80px;right:140px;z-index:0;pointer-events:none';
    mWrap.appendChild(mOrb);moonEl.appendChild(mWrap);
    if(isRain||isThunder){makeClouds(cloudsEl,5,0.5,'rgba(40,50,70,1)');makeRain(rainEl,isThunder?160:100);}
    if(isThunder) makeThunderFlash(cloudsEl);
  } else {
    if(code===1000){
      document.body.style.setProperty('--scene-bg','linear-gradient(180deg,#0a2044 0%,#1e4080 30%,#3b6fa0 60%,#5b8fc0 100%)');
      makeSun(sunEl,'top:50px;left:100px',100,'rgba(251,191,36,.5)');
    } else if(isPartly){
      document.body.style.setProperty('--scene-bg','linear-gradient(180deg,#0e2a50 0%,#1a4070 40%,#3a6898 100%)');
      makeSun(sunEl,'top:60px;left:110px',85,'rgba(251,191,36,.35)');
      makeClouds(cloudsEl,3,0.22,'rgba(220,230,250,1)');
    } else if(isMist){
      document.body.style.setProperty('--scene-bg','linear-gradient(180deg,#1a2030 0%,#2a3040 50%,#3a4050 100%)');
      makeClouds(cloudsEl,5,0.35,'rgba(180,190,210,1)');
    } else if(isRain||isThunder){
      document.body.style.setProperty('--scene-bg',isThunder
        ?'linear-gradient(180deg,#070c14 0%,#0d1420 50%,#121820 100%)'
        :'linear-gradient(180deg,#0c1420 0%,#14202e 50%,#1a2636 100%)');
      makeClouds(cloudsEl,7,0.55,'rgba(80,90,110,1)');
      makeRain(rainEl,isThunder?200:130);
      if(isThunder) makeThunderFlash(cloudsEl);
    } else if(isSnow){
      document.body.style.setProperty('--scene-bg','linear-gradient(180deg,#c8d8e8 0%,#dde8f0 60%,#e8f0f5 100%)');
      makeClouds(cloudsEl,5,0.45,'rgba(230,235,245,1)');
      makeSnow(rainEl);
    } else if(isCloudy){
      document.body.style.setProperty('--scene-bg','linear-gradient(180deg,#111622 0%,#1a2030 50%,#222838 100%)');
      makeClouds(cloudsEl,6,0.4,'rgba(130,140,160,1)');
    }
  }
}
function makeSun(c,pos,sz,glow){
  const w=document.createElement('div');w.style.cssText=`position:fixed;${pos};z-index:0;pointer-events:none`;
  const o=document.createElement('div');o.className='sun-orb';
  o.style.cssText=`width:${sz}px;height:${sz}px;background:radial-gradient(circle at 40% 35%,#fff8c0,#fde68a,#fbbf24);box-shadow:0 0 80px 30px ${glow}`;
  w.appendChild(o);c.appendChild(w);
}
function makeClouds(c,count,op,color){
  for(let i=0;i<count;i++){
    const el=document.createElement('div');el.className='cloud';
    const w=Math.random()*180+100,h=Math.random()*60+40,top=Math.random()*45+2;
    const spd=Math.random()*50+30,delay=-(Math.random()*spd);
    el.style.cssText=`width:${w}px;height:${h}px;top:${top}%;background:${color};--spd:${spd}s;--op:${op};animation-delay:${delay}s;filter:blur(${Math.random()*8+4}px)`;
    c.appendChild(el);
  }
}
function makeRain(c,count){
  for(let i=0;i<count;i++){
    const r=document.createElement('div');r.className='raindrop';
    const h=Math.random()*60+30,spd=(Math.random()*.6+.5).toFixed(2);
    r.style.cssText=`left:${Math.random()*100}%;height:${h}px;--spd:${spd}s;animation-delay:${-(Math.random()*2)}s;opacity:${Math.random()*.5+.3}`;
    c.appendChild(r);
  }
}
function makeSnow(c){
  for(let i=0;i<80;i++){
    const s=document.createElement('div');s.className='raindrop';
    const sz=Math.random()*4+2;
    s.style.cssText=`left:${Math.random()*100}%;width:${sz}px;height:${sz}px;border-radius:50%;background:rgba(255,255,255,.8);--spd:${(Math.random()*2+1.5).toFixed(2)}s;animation-delay:${-(Math.random()*3)}s;opacity:${Math.random()*.6+.4}`;
    c.appendChild(s);
  }
}
function makeThunderFlash(c){
  const fl=document.createElement('div');
  fl.style.cssText='position:fixed;inset:0;background:#fff;z-index:0;pointer-events:none;animation:thunder-flash 6s 2s infinite';
  c.appendChild(fl);
}

/* ══ SUN ARC ══ */
function updateSunArc(srStr,ssStr){
  function parseTime(s){
    if(!s||s==='--') return null;
    const m=s.match(/(\d+):(\d+)\s*(AM|PM)/i);if(!m) return null;
    let h=parseInt(m[1]),mn=parseInt(m[2]);
    if(m[3].toUpperCase()==='PM'&&h!==12) h+=12;
    if(m[3].toUpperCase()==='AM'&&h===12) h=0;
    return h*60+mn;
  }
  const now=new Date(),nowMin=now.getHours()*60+now.getMinutes();
  const sr=parseTime(srStr),ss=parseTime(ssStr);
  if(!sr||!ss) return;
  const t=Math.max(0,Math.min(1,(nowMin-sr)/(ss-sr)));
  const P0={x:10,y:45},P1={x:100,y:-10},P2={x:190,y:45};
  const x=(1-t)*(1-t)*P0.x+2*t*(1-t)*P1.x+t*t*P2.x;
  const y=(1-t)*(1-t)*P0.y+2*t*(1-t)*P1.y+t*t*P2.y;
  const el=document.getElementById('sunPos');
  if(el){el.setAttribute('cx',x.toFixed(1));el.setAttribute('cy',y.toFixed(1));}
}

/* ══ FAVOURITES ══ */
async function loadFavourites(){
  try{
    const r=await fetch('/api/user/favourites');
    const d=await r.json();
    userFavourites=d.favourites||[];
    updateFavBtn();
    updateFavList();
  }catch{}
}
function updateFavBtn(){
  const btn=document.getElementById('favBtn');
  if(!btn) return;
  const isFav=userFavourites.includes(currentCity);
  btn.textContent=isFav?'★':'☆';
  btn.classList.toggle('active',isFav);
}
function updateFavList(){
  const list=document.getElementById('favList');
  if(!list) return;
  list.innerHTML=userFavourites.length
    ?userFavourites.map(c=>`<div class="dropdown-city" onclick="fetchWeather('${c}')">${c}</div>`).join('')
    :`<div class="dropdown-empty">No favourites yet</div>`;
}
async function toggleFavourite(){
  try{
    const r=await fetch('/api/user/favourites/toggle',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({city:currentCity})
    });
    const d=await r.json();
    if(d.status==='added') userFavourites.push(currentCity);
    else userFavourites=userFavourites.filter(c=>c!==currentCity);
    updateFavBtn();updateFavList();
  }catch{}
}

/* ══ USER DROPDOWN ══ */
document.getElementById('userAvatarBtn').addEventListener('click',(e)=>{
  e.stopPropagation();
  document.getElementById('userDropdown').classList.toggle('open');
});
document.addEventListener('click',()=>{
  document.getElementById('userDropdown').classList.remove('open');
});

/* ══ AUTO LOCATION ══ */
document.getElementById('locBtn').addEventListener('click',()=>{
  if(!navigator.geolocation){alert('Geolocation not supported.');return;}
  const btn=document.getElementById('locBtn');
  btn.textContent='⏳';
  navigator.geolocation.getCurrentPosition(
    pos=>{
      const q=`${pos.coords.latitude},${pos.coords.longitude}`;
      btn.textContent='📍';
      fetchWeather(q);
    },
    ()=>{btn.textContent='📍';alert('Could not get location.');}
  );
});

/* ══ SEARCH SUGGESTIONS ══ */
const cityInput=document.getElementById('cityInput');
const suggestionsEl=document.getElementById('searchSuggestions');
const SUGGEST_CITIES=['Jaipur','Lucknow','Ajmer','Hyderabad','Bangalore','Kolkata','Mumbai','Kochi','Pune','Chennai','New Delhi','Surat','Bhopal','Delhi','Ahmedabad','Nagpur','Indore','Thane','Patna','Bhubaneswar'];

cityInput.addEventListener('input',()=>{
  const val=cityInput.value.trim().toLowerCase();
  if(val.length<2){suggestionsEl.classList.remove('show');return;}
  const matches=SUGGEST_CITIES.filter(c=>c.toLowerCase().includes(val)).slice(0,5);
  if(!matches.length){suggestionsEl.classList.remove('show');return;}
  suggestionsEl.innerHTML=matches.map(c=>`<div class="suggestion-item" onclick="selectSuggestion('${c}')"><span class="s-icon">📍</span>${c}</div>`).join('');
  suggestionsEl.classList.add('show');
});
cityInput.addEventListener('blur',()=>setTimeout(()=>suggestionsEl.classList.remove('show'),200));

function selectSuggestion(city){
  cityInput.value=city;
  suggestionsEl.classList.remove('show');
  fetchWeather(city);
}

/* ══ FETCH ══ */
async function fetchWeather(city){
  const loading=document.getElementById('loading');
  const errEl=document.getElementById('errorMsg');
  loading.classList.add('show');errEl.classList.remove('show');
  try{
    const encoded=encodeURIComponent(city);
    const[curRes,foreRes]=await Promise.all([
      fetch(`/api/weather?city=${encoded}`),
      fetch(`/api/forecast?city=${encoded}&days=10`)
    ]);
    if(!curRes.ok){const e=await curRes.json();throw new Error(e.error||'City not found');}
    if(!foreRes.ok){const e=await foreRes.json();throw new Error(e.error||'Forecast unavailable');}
    const cur=await curRes.json(),fore=await foreRes.json();
    cityInput.value=cur.location.name+', '+cur.location.country;
    currentCity=cur.location.name;
    updateFavBtn();

    // Update recent history in dropdown
    fetch('/api/user/history').then(r=>r.json()).then(d=>{
      const list=document.getElementById('recentList');
      if(list) list.innerHTML=d.history.length
        ?d.history.map(c=>`<div class="dropdown-city" onclick="fetchWeather('${c}')">${c}</div>`).join('')
        :`<div class="dropdown-empty">No recent searches</div>`;
    }).catch(()=>{});

    render(cur,fore);
  }catch(e){
    errEl.textContent=e.message||'Something went wrong.';errEl.classList.add('show');
  }finally{loading.classList.remove('show');}
}

/* ══ RENDER ══ */
function render(cur,fore){
  const c=cur.current,loc=cur.location;
  const today=fore.forecast.forecastday[0];

  setBackground(c.condition.code,c.is_day);

  // Hero
  document.getElementById('heroCity').textContent=loc.name;
  document.getElementById('heroUpdated').textContent='Updated '+new Date(loc.localtime).toLocaleDateString('en-GB',{day:'numeric',month:'short'});
  document.getElementById('heroIcon').textContent=iconMap(c.condition.code,c.is_day);
  document.getElementById('heroTemp').textContent=c.temp_c.toFixed(1);
  document.getElementById('heroCond').textContent=c.condition.text;

  // Stats
  document.getElementById('humidVal').textContent=c.humidity;
  document.getElementById('windVal').textContent=c.wind_kph.toFixed(1);
  document.getElementById('visVal').textContent=c.vis_km.toFixed(0);
  document.getElementById('pressVal').textContent=c.pressure_mb;
  document.getElementById('uvVal').textContent=c.uv;
  document.getElementById('precipVal').textContent=c.precip_mm;

  // Sun
  const sr=fmt12(today.astro.sunrise),ss=fmt12(today.astro.sunset);
  document.getElementById('sunriseTime').textContent=sr;
  document.getElementById('sunsetTime').textContent=ss;
  setTimeout(()=>updateSunArc(sr,ss),300);

  // Compass
  document.getElementById('compassNeedleWrap').style.transform=`rotate(${c.wind_degree}deg)`;
  document.getElementById('compassDeg').textContent=c.wind_degree;
  document.getElementById('compassDir').textContent=degToDir(c.wind_degree);
  document.getElementById('compassSpd').textContent=c.wind_kph.toFixed(1);
  document.getElementById('compassGust').textContent=c.gust_kph.toFixed(1);

  // 10-Day
  const strip=document.getElementById('weeklyStrip');
  strip.innerHTML=`<div class="card-title" style="flex-shrink:0;margin-bottom:0;margin-right:4px">📅</div>`+
    fore.forecast.forecastday.map((d,i)=>{
      const dt=new Date(d.date),name=i===0?'Today':DAY[dt.getDay()];
      return`<div class="week-card ${i===0?'active':''}">
        <div class="week-day">${name}</div>
        <div class="week-icon">${iconMap(d.day.condition.code,1)}</div>
        <div class="week-hi">${d.day.maxtemp_c.toFixed(0)}°</div>
        <div class="week-lo">${d.day.mintemp_c.toFixed(0)}°</div>
      </div>`;
    }).join('');

  // Hourly
  const hourlyEl=document.getElementById('hourlyStrip');
  const nowDate=new Date();
  const allH=[...today.hour,...(fore.forecast.forecastday[1]?.hour||[])].filter(h=>new Date(h.time)>=nowDate).slice(0,16);
  hourlyEl.innerHTML=`<div class="card-title" style="flex-shrink:0;margin-bottom:0;margin-right:4px">🕐</div>`+
    allH.map((h,i)=>{
      const hd=new Date(h.time),label=i===0?'Now':hd.getHours().toString().padStart(2,'0')+':00';
      return`<div class="hour-card ${i===0?'now':''}">
        <div class="hour-time">${label}</div>
        <div class="hour-icon">${iconMap(h.condition.code,h.is_day)}</div>
        <div class="hour-temp">${Math.round(h.temp_c)}°</div>
        <div class="hour-rain">${h.chance_of_rain||0}%</div>
      </div>`;
    }).join('');

  // Chart
  const chartH=allH.slice(0,24);
  const clabels=chartH.map(h=>new Date(h.time).getHours().toString().padStart(2,'0')+':00');
  const ctemps=chartH.map(h=>h.temp_c);
  if(chartInst) chartInst.destroy();
  const ctx=document.getElementById('forecastChart').getContext('2d');
  const grad=ctx.createLinearGradient(0,0,0,130);
  grad.addColorStop(0,'rgba(249,115,22,.35)');grad.addColorStop(1,'rgba(249,115,22,0)');
  chartInst=new Chart(ctx,{
    type:'line',
    data:{labels:clabels,datasets:[{data:ctemps,borderColor:'#f97316',backgroundColor:grad,borderWidth:2.5,pointRadius:3,pointBackgroundColor:'#f97316',fill:true,tension:0.4}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:x=>`${x.parsed.y.toFixed(1)} °C`},backgroundColor:'rgba(14,20,32,.95)',titleColor:'#e8edf5',bodyColor:'#f97316',borderColor:'rgba(249,115,22,.3)',borderWidth:1}},
      scales:{x:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'#7a8499',font:{size:9},maxTicksLimit:12}},y:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'#7a8499',font:{size:9},callback:v=>v+'°'}}}}
  });

  // Rain
  document.getElementById('rainRows').innerHTML=fore.forecast.forecastday.map((d,i)=>{
    const dt=new Date(d.date),name=i===0?'Today':DAY[dt.getDay()];
    const pct=d.day.daily_chance_of_rain||0;
    return`<div class="rain-row"><div class="rain-day">${name}</div><div class="rain-bar-bg"><div class="rain-bar-fill" style="width:${pct}%"></div></div><div class="rain-pct">${pct}%</div></div>`;
  }).join('');

  // AQI
  const aqi=c.air_quality;
  if(aqi){
    const pm25=Math.round(aqi.pm2_5||0),pm10=Math.round(aqi.pm10||0);
    const o3=Math.round(aqi.o3||0),so2=Math.round(aqi.so2||0);
    const co=Math.round(aqi.co||0),no2=Math.round(aqi.no2||0);
    const aqiVal=Math.min(500,Math.round(Math.max(pm25*2,pm10*.6,o3*.5,co*.002,no2*2)));
    const col=aqiColor(aqiVal);const{label,sub}=aqiText(aqiVal);
    document.getElementById('aqiNum').textContent=aqiVal;document.getElementById('aqiNum').style.color=col;
    document.getElementById('aqiLabel').textContent=label;document.getElementById('aqiLabel').style.color=col;
    document.getElementById('aqiSub').textContent=sub;
    const offset=314-(Math.min(aqiVal,500)/500)*260;
    document.getElementById('aqiRing').style.stroke=col;
    document.getElementById('aqiRing').setAttribute('stroke-dashoffset',offset.toFixed(1));
    document.getElementById('aqiGrid').innerHTML=`
      <div class="aqi-item"><div class="aqi-dot" style="background:${dotC(pm10,50)}"></div><div><div class="aqi-item-val">${pm10}</div><div class="aqi-item-name">PM10</div></div></div>
      <div class="aqi-item"><div class="aqi-dot" style="background:${dotC(o3,100)}"></div><div><div class="aqi-item-val">${o3}</div><div class="aqi-item-name">O3</div></div></div>
      <div class="aqi-item"><div class="aqi-dot" style="background:${dotC(so2,20)}"></div><div><div class="aqi-item-val">${so2}</div><div class="aqi-item-name">SO2</div></div></div>
      <div class="aqi-item"><div class="aqi-dot" style="background:${dotC(pm25,35)}"></div><div><div class="aqi-item-val">${pm25}</div><div class="aqi-item-name">PM2.5</div></div></div>
      <div class="aqi-item"><div class="aqi-dot" style="background:${dotC(co,400)}"></div><div><div class="aqi-item-val">${co}</div><div class="aqi-item-name">CO</div></div></div>
      <div class="aqi-item"><div class="aqi-dot" style="background:${dotC(no2,40)}"></div><div><div class="aqi-item-val">${no2}</div><div class="aqi-item-name">NO2</div></div></div>`;
  }
}

/* ══ CITIES SLIDER ══ */
const track=document.getElementById('citiesTrack');
document.getElementById('sliderLeft').addEventListener('click',()=>track.scrollBy({left:-150,behavior:'smooth'}));
document.getElementById('sliderRight').addEventListener('click',()=>track.scrollBy({left:150,behavior:'smooth'}));

/* ══ PILL TEMPS ══ */
async function loadPill(name){
  try{
    const r=await fetch(`/api/weather?city=${encodeURIComponent(name)}`);
    if(!r.ok) return;
    const d=await r.json();
    const el=document.getElementById('pill-'+name);
    if(el) el.textContent=d.current.temp_c.toFixed(1)+'°C';
  }catch{}
}

/* ══ ML MODAL ══ */
function openMlModal(){
  document.getElementById('mlModalOverlay').classList.add('open');
  document.getElementById('mlResult').style.display='none';
  document.getElementById('mlError').style.display='none';
  document.getElementById('mlLoading').style.display='none';
  document.querySelectorAll('.ml-city-btn').forEach(b=>b.classList.remove('active'));
}
function closeMlModal(){document.getElementById('mlModalOverlay').classList.remove('open');}
document.getElementById('mlModalClose').addEventListener('click',closeMlModal);
document.getElementById('mlModalOverlay').addEventListener('click',e=>{
  if(e.target===document.getElementById('mlModalOverlay')) closeMlModal();
});
document.querySelectorAll('.ml-city-btn').forEach(btn=>{
  btn.addEventListener('click',async()=>{
    const city=btn.dataset.city;
    document.querySelectorAll('.ml-city-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('mlResult').style.display='none';
    document.getElementById('mlError').style.display='none';
    document.getElementById('mlLoading').style.display='flex';
    try{
      const r=await fetch(`/api/predict?city=${encodeURIComponent(city)}`);
      const data=await r.json();
      document.getElementById('mlLoading').style.display='none';
      if(data.error){
        const e=document.getElementById('mlError');e.textContent='⚠️ '+data.error;e.style.display='block';return;
      }
      if(!data.supported){
        const e=document.getElementById('mlError');e.textContent='ℹ️ '+data.message;e.style.display='block';return;
      }
      document.getElementById('mlResultCity').textContent=data.city;
      document.getElementById('mlResultTemp').textContent=data.predicted_temp;
      document.getElementById('mlResultRain').textContent=data.predicted_rain;
      document.getElementById('mlRainBar').style.width=Math.min(data.predicted_rain,100)+'%';
      document.getElementById('mlResult').style.display='block';
    }catch{
      document.getElementById('mlLoading').style.display='none';
      const e=document.getElementById('mlError');e.textContent='⚠️ Something went wrong.';e.style.display='block';
    }
  });
});

/* ══ SEARCH + INIT ══ */
document.getElementById('searchBtn').addEventListener('click',()=>{
  const city=cityInput.value.trim();if(city) fetchWeather(city);
});
cityInput.addEventListener('keydown',e=>{
  if(e.key==='Enter'){const city=e.target.value.trim();if(city) fetchWeather(city);}
});

// Init
loadFavourites();
fetchWeather('Chennai');
setTimeout(()=>ALL_CITIES.forEach(loadPill),1500);
