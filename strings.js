/* Golflev strings.js v1 — 文言キー管理（D6: 直書き禁止）
   使い方: STR.t('pitch.intro.body')。言語は golflev:lang（既定 ja） */
const STR = {
  lang: (function(){ try{ return localStorage.getItem('golflev:lang')||'ja'; }catch(e){ return 'ja'; } })(),
  d: {
    'pitch.eyebrow':        { ja:'Level 2 — Drill',            en:'Level 2 — Drill' },
    'pitch.title.jp':       { ja:'ピッチ',                       en:'The Pitch' },
    'pitch.intro.body':     { ja:'8時から、4時へ。<br>アプローチの距離感は、<br>この振り幅から生まれる。', en:'From 8 to 4.<br>Distance control begins<br>with this swing width.' },
    'pitch.intro.note':     { ja:'両側60°のゾーンに、5回そろえて振る。それが今日の課題です。', en:'Five swings, both sides inside the 60° zone. That is today’s work.' },
    'pitch.btn.begin':      { ja:'はじめる',                     en:'Begin' },

    'sensor.title.jp':      { ja:'センサー',                     en:'The Sensor' },
    'sensor.body':          { ja:'計測にはセンサーの許可が必要です。<br>スマホを縦に、画面を上に向けて握ります。', en:'Sensor access is required.<br>Hold the phone upright, screen facing up.' },
    'sensor.btn':           { ja:'センサーを有効にする',           en:'Enable Sensors' },
    'sensor.denied':        { ja:'許可されませんでした。設定からやり直してください。', en:'Permission denied. Please try again from Settings.' },

    'address.title.jp':     { ja:'アドレス',                     en:'The Address' },
    'address.body':         { ja:'アドレスの構えで、動かずに。',     en:'Take your address. Hold still.' },
    'address.btn':          { ja:'キャリブレーション開始',         en:'Calibrate' },
    'address.hold':         { ja:'そのまま動かない',               en:'Hold still' },
    'address.done':         { ja:'記録完了',                     en:'Recorded' },
    'address.vertical':     { ja:'シャフトが鉛直に近すぎます。通常のアドレスの角度で構え直してください。', en:'Shaft too vertical. Please address at a normal angle.' },

    'live.ready':           { ja:'振り始めると自動で計測',         en:'Swing to begin' },
    'live.back':            { ja:'バック計測中',                  en:'Backswing' },
    'live.through':         { ja:'フォロー計測中',                en:'Through' },
    'live.swing':           { ja:'スイング',                     en:'Swing' },
    'live.tooSmall':        { ja:'小さすぎます — もう一度',        en:'Too small — again' },
    'live.chip.ok':         { ja:'良い振り幅',                    en:'Good width' },
    'live.chip.broken':     { ja:'三角形が崩れました',             en:'Triangle broke' },
    'live.chip.decel':      { ja:'緩みました',                    en:'Decelerated' },
    'live.chip.shallow':    { ja:'浅い — もう少し上まで',          en:'Shallow' },
    'live.chip.deep':       { ja:'深い — 8時で止める',            en:'Too deep' },
    'live.chip.noFollow':   { ja:'フォローまで振り切る',           en:'Swing through' },

    'result.title.jp':      { ja:'結果',                        en:'The Result' },
    'result.rank.perfect':  { ja:'5球がそろっています',            en:'Five matching swings.' },
    'result.rank.good':     { ja:'よい再現性です',                en:'Good consistency.' },
    'result.rank.almost':   { ja:'も う 少 し',                  en:'Almost.' },
    'result.rank.tryagain': { ja:'も う 一 度',                  en:'Once more.' },
    'result.stat.mean':     { ja:'平均振り幅',                    en:'Avg width' },
    'result.stat.sd':       { ja:'ばらつき',                      en:'Spread' },
    'result.stat.zone':     { ja:'ゾーン内',                      en:'In zone' },
    'result.issues':        { ja:'今日の課題',                    en:'Today’s work' },
    'result.noIssues':      { ja:'指摘はありません。この感覚を繰り返しましょう。', en:'Nothing to fix. Repeat this feeling.' },
    'result.recommend':     { ja:'コーチのおすすめ',               en:'Coach’s pick' },
    'result.issue.elbow':   { ja:'右肘の曲がり',                  en:'Trail elbow bend' },
    'result.issue.decel':   { ja:'インパクトの緩み',               en:'Deceleration' },
    'result.issue.spread':  { ja:'振り幅のばらつき',               en:'Width spread' },
    'result.issue.shallow': { ja:'振り幅が浅い',                  en:'Too shallow' },
    'result.issue.deep':    { ja:'振り幅が深い',                  en:'Too deep' },
    'result.issue.follow':  { ja:'フォロー不足',                  en:'Short follow' },
    'result.focusNote':     { ja:'次のセットで、これだけを意識しましょう。', en:'Focus on this one thing next set.' },
    'result.partial.elbow': { ja:'今回は肘の判定ができませんでした（加速度データ不足）', en:'Elbow check unavailable this set.' },
    'result.btn.again':     { ja:'もう1セット',                  en:'Another set' },
    'result.btn.recal':     { ja:'構え直す',                     en:'Re-address' }
  },
  t(key){
    const e=this.d[key];
    if(!e) return key;
    return e[this.lang]||e.ja;
  }
};
