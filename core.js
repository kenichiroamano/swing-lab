/* ════════════════════════════════════════════════════════════════
   Golflev core.js v1 — 共通計測エンジン
   2026-06-11 技術検証B合格（単体テスト25件・iPhone実機確認済み）
   含むもの: QuatUtils / スイングプレーン / SwingTracker / 音 / 保存
   ════════════════════════════════════════════════════════════════ */

const QuatUtils = {
  // W3C DeviceOrientation（ZXY内因性）→ クォータニオン。d2r=π/360 は度→ラジアン+半角の合成
  fromEuler: (alphaDeg, betaDeg, gammaDeg) => {
    const d2r = Math.PI / 360;
    const a=(alphaDeg||0)*d2r, b=(betaDeg||0)*d2r, g=(gammaDeg||0)*d2r;
    const ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b),cg=Math.cos(g),sg=Math.sin(g);
    return { w: ca*cb*cg - sa*sb*sg, x: ca*sb*cg - sa*cb*sg, y: ca*cb*sg + sa*sb*cg, z: ca*sb*sg + sa*cb*cg };
  },
  conj: q => ({ w:q.w, x:-q.x, y:-q.y, z:-q.z }),
  mul: (a,b) => ({
    w: a.w*b.w - a.x*b.x - a.y*b.y - a.z*b.z,
    x: a.w*b.x + a.x*b.w + a.y*b.z - a.z*b.y,
    y: a.w*b.y - a.x*b.z + a.y*b.w + a.z*b.x,
    z: a.w*b.z + a.x*b.y - a.y*b.x + a.z*b.w
  }),
  rotVec: (q,v) => {
    const tx=2*(q.y*v.z-q.z*v.y), ty=2*(q.z*v.x-q.x*v.z), tz=2*(q.x*v.y-q.y*v.x);
    return { x: v.x+q.w*tx+(q.y*tz-q.z*ty), y: v.y+q.w*ty+(q.z*tx-q.x*tz), z: v.z+q.w*tz+(q.x*ty-q.y*tx) };
  },
  angle: q => 2*Math.acos(Math.abs(Math.min(1,Math.max(-1,q.w))))*180/Math.PI,
  // 近接サンプルの平均（Euler角の0/360°ラップ問題を回避）
  average: quats => {
    const ref=quats[0]; let w=0,x=0,y=0,z=0;
    for (const q of quats){
      const s=(q.w*ref.w+q.x*ref.x+q.y*ref.y+q.z*ref.z)<0?-1:1;
      w+=s*q.w; x+=s*q.x; y+=s*q.y; z+=s*q.z;
    }
    const len=Math.sqrt(w*w+x*x+y*y+z*z);
    return len<1e-9?ref:{w:w/len,x:x/len,y:y/len,z:z/len};
  },
  // swing-twist分解（シャフト軸=Yまわりのロール角）
  twistY: q => {
    const len=Math.sqrt(q.w*q.w+q.y*q.y);
    if(len<1e-6) return 0;
    return 2*Math.atan2(q.y/len, q.w/len)*180/Math.PI;
  }
};

const GLMath = {
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
  norm3:v=>{const l=Math.sqrt(v.x*v.x+v.y*v.y+v.z*v.z);return{x:v.x/l,y:v.y/l,z:v.z/l};},
  cross3:(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x}),
  dot3:(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z,
  avg:a=>a.reduce((s,v)=>s+v,0)/a.length,
  std:a=>{const m=GLMath.avg(a);return Math.sqrt(GLMath.avg(a.map(v=>(v-m)*(v-m))));}
};

// スイングプレーン座標系（法線=シャフト×重力。世界座標はZ-up: X=東,Y=北,Z=上）
function makePlaneFrame(qB){
  const shaftBl=QuatUtils.rotVec(qB,{x:0,y:1,z:0});
  const pn=GLMath.cross3(shaftBl,{x:0,y:0,z:-1});
  const pnLen=Math.sqrt(GLMath.dot3(pn,pn));
  if(pnLen<0.15) return null; // シャフトが鉛直すぎ→構え直し要求
  const n={x:pn.x/pnLen,y:pn.y/pnLen,z:pn.z/pnLen};
  const u=GLMath.norm3(GLMath.cross3(n,shaftBl));
  return { qB, shaftBl, n, u };
}

// シャフト角度の分解。
// mag     = 総シャフト角（回転不変。振り幅の「大きさ」はこれを使う）
// azimuth = 水平方位角（バック/フォローの「左右」はこの符号を使う。体の回転主体の動きでも確実に出る）
// inPlane/outPlane = 鉛直プレーン基準の分解（参考値。左右判定には使わない — 2026-06-11精査で
//   体の回転だけの動きでは inPlane の符号が左右を区別できないことが判明）
function signedAngles(qC, frame){
  const s=QuatUtils.rotVec(qC,{x:0,y:1,z:0});
  const inPlane=Math.atan2(GLMath.dot3(s,frame.u), GLMath.dot3(s,frame.shaftBl))*180/Math.PI;
  const outPlane=Math.asin(GLMath.clamp(GLMath.dot3(s,frame.n),-1,1))*180/Math.PI;
  const mag=Math.acos(GLMath.clamp(GLMath.dot3(s,frame.shaftBl),-1,1))*180/Math.PI;
  let azimuth=0;
  const lb=Math.hypot(frame.shaftBl.x,frame.shaftBl.y), lh=Math.hypot(s.x,s.y);
  if(lb>0.1 && lh>0.1){
    azimuth=Math.atan2(frame.shaftBl.x*s.y-frame.shaftBl.y*s.x, frame.shaftBl.x*s.x+frame.shaftBl.y*s.y)*180/Math.PI;
  }
  return { inPlane, outPlane, mag, azimuth };
}

// 求心加速度モデル用：シャフト軸（Y）まわりの手首ロールを除外した角速度 [rad/s]
function magRotPerpRad(r){
  return Math.sqrt(r.alpha*r.alpha + r.beta*r.beta) * Math.PI / 180;
}

/* 角度の連続化（±180°ラップ除去）。フルフィニッシュ（+176°→+200°）でも符号が反転しない */
class AngleUnwrapper {
  constructor(){ this.acc=null; this.prev=null; }
  reset(){ this.acc=null; this.prev=null; }
  feed(a){
    if(this.prev===null){ this.prev=a; this.acc=a; return a; }
    let d=a-this.prev;
    d=((d+540)%360)-180;
    this.acc+=d; this.prev=a;
    return this.acc;
  }
}

/* スイング状態機械（v6: 最下点判定を緩和）
   idle → back（トップ検出: 30°以上＋8°戻り。フォワードプレス対策）
        → down（最下点通過・速度記録）→ 静止0.4sで確定
   緩み判定 = 最下点通過速度がピークの75%未満（時刻方式はセンサー遅延に弱いため不採用） */
class SwingTracker {
  constructor(o={}){
    this.startThresh=o.startThresh??30;
    this.endThresh=o.endThresh??25;
    this.endHoldMs=o.endHoldMs??400;
    this.minTopAngle=o.minTopAngle??30;
    this.topDropDeg=o.topDropDeg??8;
    this.reset();
  }
  reset(){ this.state='idle'; this.swing=null; this.stillSince=null; }
  feed(t, angle, omega){
    if(this.state==='idle'){
      if(omega>this.startThresh){
        this.state='back';
        this.swing={t0:t,ext:0,extT:t,top:null,bottom:null,peakW:0,peakWT:null,finish:0,side:0,maxPre:0,wBottom:0,lastT:t};
      }
      return null;
    }
    const s=this.swing;
    s.lastT=t;
    if(this.state==='back'){
      if(Math.abs(angle)>Math.abs(s.ext)){ s.ext=angle; s.extT=t; }
      if(Math.abs(s.ext)>=this.minTopAngle
         && Math.sign(angle)===Math.sign(s.ext)
         && Math.abs(s.ext)-Math.abs(angle)>=this.topDropDeg){
        s.top={t:s.extT,angle:s.ext};
        s.side=Math.sign(s.ext);
        this.state='down';
      }
      if(omega<this.endThresh && Math.abs(s.ext)>=10){
        if(this.stillSince===null) this.stillSince=t;
        else if(t-this.stillSince>=this.endHoldMs){
          const r=this.finalize(); this.reset(); return r;
        }
      } else this.stillSince=null;
    } else if(this.state==='down'){
      if((!s.bottom || t-s.bottom.t<=250) && omega>s.peakW){ s.peakW=omega; s.peakWT=t; }
      if(!s.bottom && omega>s.maxPre) s.maxPre=omega;
      // 最下点 = アドレス±5°に入った時点（v6: 符号反転を待たない。アドレス付近で止める癖でも計測が成立する）
      if(s.bottom===null && angle*s.side<=5){ s.bottom={t}; s.wBottom=omega; }
      if(s.bottom && angle*s.side<0 && Math.abs(angle)>Math.abs(s.finish)) s.finish=angle;
      if(omega<this.endThresh){
        if(this.stillSince===null) this.stillSince=t;
        else if(t-this.stillSince>=this.endHoldMs){
          const r=this.finalize(); this.reset(); return r;
        }
      } else this.stillSince=null;
    }
    return null;
  }
  finalize(){
    const s=this.swing;
    const backMs=s.top?s.top.t-s.t0:null;
    const downMs=(s.top&&s.bottom)?s.bottom.t-s.top.t:null;
    return {
      backAngle:s.top?s.top.angle:s.ext,
      followAngle:s.finish,
      complete:!!(s.top&&s.bottom),
      slowSwing:s.maxPre<50,
      tempoRatio:(backMs&&downMs&&downMs>0)?backMs/downMs:null,
      decel:s.bottom?(s.wBottom < 0.75*s.maxPre):null,
      wBottom:s.wBottom, maxPre:s.maxPre,
      t0:s.t0, topT:s.top?s.top.t:null, bottomT:s.bottom?s.bottom.t:null, endT:s.lastT
    };
  }
}

/* 音（Web Audio。iOSはユーザー操作後に ensure() を呼ぶこと） */
const GLAudio = (function(){
  let ctx=null;
  function ensure(){
    try{
      ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();
      if(ctx.state==='suspended') ctx.resume();
    }catch(e){}
  }
  function beep(freq,dur,delay){
    if(!ctx) return;
    try{
      const o=ctx.createOscillator(), g=ctx.createGain();
      o.frequency.value=freq; o.connect(g); g.connect(ctx.destination);
      const t0=ctx.currentTime+(delay||0);
      g.gain.setValueAtTime(0.0001,t0);
      g.gain.exponentialRampToValueAtTime(0.22,t0+0.01);
      g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
      o.start(t0); o.stop(t0+dur+0.05);
    }catch(e){}
  }
  return {
    ensure,
    click:()=>beep(1200,0.04),
    start:()=>beep(880,0.10),
    end:()=>{beep(660,0.09);beep(990,0.12,0.12);},
    good:()=>{beep(784,0.09);beep(988,0.12,0.10);},
    success:()=>{beep(784,0.09);beep(988,0.09,0.10);beep(1319,0.18,0.20);},
    warn:()=>beep(220,0.22),
    calibDone:()=>{beep(660,0.08);beep(880,0.14,0.09);},
    armReady:()=>{beep(523,0.06);beep(784,0.10,0.06);}
  };
})();

/* 保存（バージョン付き統一スキーマの入口。キーは golflev: 名前空間） */
const GLStore = {
  get(key,def){
    try{ const v=localStorage.getItem('golflev:'+key); return v===null?def:JSON.parse(v); }
    catch(e){ return def; }
  },
  set(key,val){
    try{ localStorage.setItem('golflev:'+key, JSON.stringify(val)); }catch(e){}
  },
  push(key,item,cap){
    const arr=GLStore.get(key,[]);
    arr.push(item);
    while(cap && arr.length>cap) arr.shift();
    GLStore.set(key,arr);
  }
};

/* ════════════════════════════════════════════════════════════════
   GLProfile — 統一データスキーマ v1（2026-06-13）
   全画面（オンボーディング/ホーム/各ドリル/結果/設定）が読み書きする土台。
   単一ルートオブジェクト localStorage['golflev:v1'] に集約。
   旧キー（form-check独自・GLStore直）から自動マイグレーション。
   設計: docs/2026-06-12_統一データスキーマ設計.md
   ════════════════════════════════════════════════════════════════ */
const GLProfile = (function(){
  const KEY='golflev:v1';
  const SCHEMA=1;

  function blank(){
    return {
      schemaVersion:SCHEMA, updatedAt:new Date().toISOString(),
      profile:{ onboarded:false, height:null, dominant:'R', rCal:0.65, rollBand:{lo:15,hi:75}, body:null },
      goals:{ bestScore:null, targetScore:100, bestUpdatedAt:null },
      progress:{ currentLevel:1, levels:{ "0":{status:"active"}, "1":{status:"locked"}, "2":{status:"locked"}, "3":{status:"locked"} } },
      streak:{ days:0, lastPlayed:null },
      history:{ sessions:[] },
      settings:{ dialFlip:false, lang:'ja' }
    };
  }

  // 旧キー → v1 への一度きりの移行
  function migrate(root){
    let touched=false;
    const old=(k,def)=>{ try{ const v=localStorage.getItem('golflev:'+k); return v===null?def:v; }catch(e){ return def; } };
    if(localStorage.getItem('golflev:onboarded')==='1'){ root.profile.onboarded=true; touched=true; }
    const h=old('height',null); if(h!=null && root.profile.height==null){ root.profile.height=parseInt(h,10)||null; touched=true; }
    const rc=old('rCal',null); if(rc!=null){ root.profile.rCal=parseFloat(rc)||0.65; touched=true; }
    const df=old('dialFlip',null); if(df!=null){ try{ root.settings.dialFlip=JSON.parse(df); }catch(e){} touched=true; }
    try{
      const ses=localStorage.getItem('golflev:sessions');
      if(ses && root.history.sessions.length===0){
        const arr=JSON.parse(ses);
        if(Array.isArray(arr)){ root.history.sessions=arr.slice(-200); touched=true; }
      }
    }catch(e){}
    const st=old('streak',null); if(st!=null){ root.streak.days=parseInt(st,10)||0; touched=true; }
    const ld=old('lastDate',null); if(ld!=null){ root.streak.lastPlayed=ld; touched=true; }
    return touched;
  }

  function load(){
    let root;
    try{ const raw=localStorage.getItem(KEY); root=raw?JSON.parse(raw):null; }catch(e){ root=null; }
    if(!root || root.schemaVersion!==SCHEMA){
      const fresh=blank();
      if(!root) migrate(fresh);              // 旧キーがあれば吸収
      // 将来: root.schemaVersion<SCHEMA のときバージョン別マイグレーション
      root=Object.assign(fresh, root&&root.schemaVersion===SCHEMA?root:{});
      if(!root.schemaVersion) root.schemaVersion=SCHEMA;
      save(root);
    }
    return root;
  }
  function save(root){
    root.updatedAt=new Date().toISOString();
    try{ localStorage.setItem(KEY, JSON.stringify(root)); }catch(e){}
    return root;
  }
  // ドット記法アクセス: get('goals.targetScore')
  function get(path, def){
    const r=load(); if(!path) return r;
    const v=path.split('.').reduce((o,k)=>(o==null?undefined:o[k]), r);
    return v===undefined?def:v;
  }
  function set(path, val){
    const r=load(); const ks=path.split('.'); let o=r;
    for(let i=0;i<ks.length-1;i++){ if(o[ks[i]]==null||typeof o[ks[i]]!=='object') o[ks[i]]={}; o=o[ks[i]]; }
    o[ks[ks.length-1]]=val;
    return save(r);
  }
  function addSession(s, cap){
    const r=load(); r.history.sessions.push(s);
    const c=cap||200; while(r.history.sessions.length>c) r.history.sessions.shift();
    return save(r);
  }
  function exportJSON(){ return JSON.stringify(load()); }
  function importJSON(str){
    try{ const o=JSON.parse(str); if(o&&o.schemaVersion){ save(o); return true; } }catch(e){}
    return false;
  }
  return { KEY, SCHEMA, load, save, get, set, addSession, exportJSON, importJSON };
})();
