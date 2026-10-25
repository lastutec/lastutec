/* Lastutec: päivämäärien ja hoitoaikojen poiminta tekstistä (suomi). Puhtaat funktiot, ei DOM-riippuvuuksia. */
(function(root){
const pad=n=>String(n).padStart(2,"0");
const toD=s=>{const [y,m,d]=s.split("-").map(Number);return new Date(Date.UTC(y,m-1,d))};
const toS=d=>d.toISOString().slice(0,10);
const addDays=(s,n)=>{const d=toD(s);d.setUTCDate(d.getUTCDate()+n);return toS(d)};
const dow=s=>(toD(s).getUTCDay()+6)%7;
function isoWeek(s){const d=toD(s);d.setUTCDate(d.getUTCDate()-dow(s)+3);const fy=new Date(Date.UTC(d.getUTCFullYear(),0,4));return 1+Math.round(((d-fy)/864e5-3+((fy.getUTCDay()+6)%7))/7)}
function weekMonday(y,w){const jan4=toS(new Date(Date.UTC(y,0,4)));return addDays(addDays(jan4,-dow(jan4)),(w-1)*7)}
function ymd(y,m,d){
  if(!(m>=1&&m<=12&&d>=1&&d<=31))return null;
  const dt=new Date(Date.UTC(y,m-1,d));
  if(dt.getUTCMonth()!==m-1)return null;
  return toS(dt);
}
function fullYear(y){if(!y)return null;y=+y;return y<100?2000+y:y}
function withYear(m,d,y,today){
  if(y)return ymd(y,m,d);
  const ty=+today.slice(0,4);
  let s=ymd(ty,m,d);if(!s)return null;
  if(s<addDays(today,-60))s=ymd(ty+1,m,d);
  return s;
}
const norm=t=>String(t||"").replace(/[‐-―−]/g,"-").replace(/ /g," ").replace(/[ \t]+/g," ").replace(/\r/g,"");
const MONTHS={tammi:1,helmi:2,maalis:3,huhti:4,touko:5,"kesä":6,"heinä":7,elo:8,syys:9,loka:10,marras:11,joulu:12};
const okH=h=>h>=0&&h<=23, okM=m=>m>=0&&m<=59;
const hm=(h,m)=>pad(h)+":"+pad(m||0);

/* Kellonajat: palauttaa {start,end,idx,len}. bare=true hyväksyy myös "8-16" (hoitoajat). */
function findTimes(text,bare){
  const out=[];
  const res=[
    /(?:klo\.?\s*)?(\d{1,2})[.:](\d{2})\s*-\s*(\d{1,2})[.:](\d{2})/gi,
    /klo\.?\s*(\d{1,2})(?:[.:](\d{2}))?(?:\s*-\s*(\d{1,2})(?:[.:](\d{2}))?)?/gi,
    /(?<![\d.:])(\d{1,2}):(\d{2})(?![\d])/g
  ];
  if(bare)res.push(/(?<![\d.:])(\d{1,2})\s*-\s*(\d{1,2})(?![\d.:])/g);
  res.forEach((re,ri)=>{let m;while((m=re.exec(text))){
    let s=null,e=null;
    if(ri===0){if(okH(+m[1])&&okM(+m[2])&&okH(+m[3])&&okM(+m[4])){s=hm(+m[1],+m[2]);e=hm(+m[3],+m[4])}}
    else if(ri===1){if(okH(+m[1])&&(!m[2]||okM(+m[2]))){s=hm(+m[1],+m[2]);if(m[3]&&okH(+m[3])&&(!m[4]||okM(+m[4])))e=hm(+m[3],+m[4])}}
    else if(ri===2){if(okH(+m[1])&&okM(+m[2]))s=hm(+m[1],+m[2])}
    else{if(okH(+m[1])&&okH(+m[2])&&+m[2]>+m[1]){s=hm(+m[1],0);e=hm(+m[2],0)}}
    if(s&&!out.some(o=>m.index<o.idx+o.len&&o.idx<m.index+m[0].length))out.push({start:s,end:e,idx:m.index,len:m[0].length});
  }});
  // pelkät alkuajat peräkkäin: "8:00 16:00" → väli
  out.sort((a,b)=>a.idx-b.idx);
  for(let i=0;i<out.length-1;i++){const a=out[i],b=out[i+1];
    if(!a.end&&!b.end&&/^\s*(-|–|to|\s)?\s*$/.test(text.slice(a.idx+a.len,b.idx))&&b.start>a.start){a.end=b.start;a.len=b.idx+b.len-a.idx;out.splice(i+1,1)}}
  return out;
}

/* Päivämäärät: palauttaa {date,endDate,idx,len} */
function findDates(text,today){
  const out=[];
  const add=(idx,len,date,endDate)=>{if(!date)return;if(out.some(o=>idx<o.idx+o.len&&o.idx<idx+len))return;out.push({idx,len,date,endDate:endDate&&endDate>date?endDate:""})};
  let m;
  const r1=/(?<![\d.])(\d{1,2})\.(\d{1,2})\.?(\d{4}|\d{2}(?![\d.]))?\s*-\s*(\d{1,2})\.(\d{1,2})\.?(\d{4}|\d{2}(?![\d.]))?/g;
  while((m=r1.exec(text))){const y2=fullYear(m[6]),y1=fullYear(m[3])||y2;const a=withYear(+m[2],+m[1],y1,today);let b=a&&withYear(+m[5],+m[4],y2||(+a.slice(0,4)),today);if(a&&b&&b<a)b=ymd(+a.slice(0,4)+1,+m[5],+m[4]);if(a&&b)add(m.index,m[0].length,a,b)}
  const r2=/(?<![\d.])(\d{1,2})\.?\s*-\s*(\d{1,2})\.(\d{1,2})\.?(\d{4}|\d{2}(?![\d.]))?/g;
  while((m=r2.exec(text))){const y=fullYear(m[4]);const b=withYear(+m[3],+m[2],y,today);const a=b&&ymd(+b.slice(0,4),+m[3],+m[1]);if(a&&b&&a<b)add(m.index,m[0].length,a,b)}
  const r3=/(\d{1,2})\.?\s*(tammi|helmi|maalis|huhti|touko|kesä|heinä|elo|syys|loka|marras|joulu)kuu(?:ta)?(?:\s+(\d{4}))?/gi;
  while((m=r3.exec(text)))add(m.index,m[0].length,withYear(MONTHS[m[2].toLowerCase()],+m[1],fullYear(m[3]),today));
  const r4=/(?<![\d.:])(\d{1,2})\.(\d{1,2})\.?(\d{4}|\d{2}(?![\d.:]))?(?![\d:])/g;
  while((m=r4.exec(text)))add(m.index,m[0].length,withYear(+m[2],+m[1],fullYear(m[3]),today));
  const r5=/\b(?:vko|viikko|viikolla|viikon|viikoilla)\.?\s*(\d{1,2})(?:\s*-\s*(\d{1,2}))?\b/gi;
  while((m=r5.exec(text))){const w=+m[1],w2=m[2]?+m[2]:w;if(w<1||w>53||w2<w)continue;
    let y=+today.slice(0,4);if(w<isoWeek(today)-8)y++;
    const a=weekMonday(y,w);add(m.index,m[0].length,a,addDays(weekMonday(y,w2),6))}
  return out.sort((a,b)=>a.idx-b.idx);
}

const WD=/(?:^|\s)(?:ma|ti|ke|to|pe|la|su|maanantai|tiistai|keskiviikko|torstai|perjantai|lauantai|sunnuntai)(?:na|sin)?\.?(?=\s*\u0001|\s*$)/gi;
function cleanTitle(s){
  let t=s.replace(WD," ").replace(/\u0001/g," ").replace(/\bklo\.?\b/gi," ")
    .replace(/\s+(ja|sekä|tai)\s*(?=[,.;:]|$)/gi," ").replace(/\s+/g," ")
    .replace(/^[\s,.;:\-–()•*·|>]+|[\s,.;:\-–(•*·|]+$/g,"").trim();
  if(t.length>70)t=t.slice(0,70).replace(/\s+\S*$/,"")+"…";
  return t?t[0].toUpperCase()+t.slice(1):"";
}

/* Viestin tapahtumat */
function parseEvents(raw,today){
  const lines=norm(raw).split(/\n+/).map(l=>l.trim()).filter(Boolean);
  const ev=[];let heading="";
  lines.forEach(line=>{
    const times=findTimes(line,false);
    let stripped=line;
    times.slice().reverse().forEach(t=>{stripped=stripped.slice(0,t.idx)+" ".repeat(t.len)+stripped.slice(t.idx+t.len)});
    const dates=findDates(stripped,today);
    if(!dates.length){if(/[a-zåäö]{3}/i.test(line)&&line.length<80)heading=line;return}
    let rest=stripped;
    dates.slice().reverse().forEach(d=>{rest=rest.slice(0,d.idx)+"\u0001"+rest.slice(d.idx+d.len)});
    // jos rivillä on monta päivää ja aihe niiden välissä ("3.11. uinti, 10.11. metsäretki"), jaa osiin
    const parts=rest.split("\u0001");
    const own=parts.slice(1).map(cleanTitle);
    const common=cleanTitle(rest)||cleanTitle(heading)||"Tapahtuma";
    const split=dates.length>1&&own.filter(Boolean).length===dates.length&&!cleanTitle(parts[0]);
    const t=times[0]||null;
    dates.forEach((d,i)=>{
      const title=split?own[i]:common;
      const tt=split?(times.find(x=>x.idx>d.idx&&(i===dates.length-1||x.idx<dates[i+1].idx))||null):t;
      ev.push({title,date:d.date,endDate:d.endDate,start:tt&&!d.endDate?tt.start:"",end:tt&&!d.endDate?(tt.end||""):"",details:line});
    });
  });
  const seen=new Set();
  return ev.filter(e=>{const k=e.date+e.start+e.title;if(seen.has(k))return false;seen.add(k);return true})
           .sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));
}

/* Hoitoajat: päivämäärä ja sitä seuraava aikaväli */
function parseCare(raw,today){
  const text=norm(raw);
  const times=findTimes(text,true).filter(t=>t.end);
  let masked=text;
  times.forEach(t=>{masked=masked.slice(0,t.idx)+" ".repeat(t.len)+masked.slice(t.idx+t.len)});
  const dates=findDates(masked,today).filter(d=>!d.endDate);
  const res=[];
  dates.forEach((d,i)=>{
    const nextIdx=i<dates.length-1?dates[i+1].idx:text.length;
    const seg=text.slice(d.idx+d.len,nextIdx);
    const t=times.find(x=>x.idx>=d.idx+d.len&&x.idx<nextIdx);
    if(!t)return;
    if(/poissa|ei hoito|sairas|loma(?!t)/i.test(seg.slice(0,t.idx-(d.idx+d.len))))return;
    if(!res.some(r=>r.date===d.date))res.push({date:d.date,start:t.start,end:t.end});
  });
  return res.sort((a,b)=>a.date.localeCompare(b.date));
}

root.LTParse={parseEvents,parseCare,findDates,findTimes,isoWeek,addDays,dow,weekMonday};
})(typeof window!=="undefined"?window:globalThis);
