window.__ModuleLoader__.load({
  id: 'dsh-monitor',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useMemo, useRef, useState } = React

    const CSS = `
.dsh-systeme{--b1:rgba(255,190,140,.08);--b2:rgba(255,190,140,.12);--b3:rgba(255,190,140,.16);--brand:#f5893a;--brand-text:#ffb377;--link:#ffa258;--on:#1c1005;--tx:#f8f9fa;--tx2:#cac9ca;--tx3:#9c9c9c;--green:#4ade80;--red:#f87171;--amber:#e6b566;position:relative;height:100%;overflow-y:auto;padding:18px 28px 32px;color:var(--tx);font:13px/1.45 inherit;box-sizing:border-box}
.dsh-systeme *{box-sizing:border-box}
.dsh-systeme h2,.dsh-systeme h3,.dsh-systeme h4,.dsh-systeme p{margin:0}
.dsh-systeme button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
.dsh-systeme a{color:inherit;text-decoration:none}
.dsh-systeme .dot{width:7px;height:7px;border-radius:50%;display:inline-block;margin-right:0;flex:none}
.dsh-systeme .d-green{background:var(--green)}
.dsh-systeme .d-red{background:var(--red)}
.dsh-systeme .d-amber{background:var(--amber)}
.dsh-systeme .d-grey{background:#8a8a8a}
.dsh-systeme .d-purple{background:#8a6bd8}
.dsh-systeme .mono{font-family:ui-monospace,"SF Mono",Menlo,monospace}
.dsh-systeme .phead{display:flex;align-items:flex-start;gap:16px;padding:0 2px 4px}
.dsh-systeme .phead h2{margin:0;font-size:17px;font-weight:600;display:flex;align-items:center;gap:9px}
.dsh-systeme .phead .sub{margin-top:5px;font-size:12px;color:var(--tx3)}
.dsh-systeme .phead .pactions{margin-left:auto;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dsh-systeme .live-pill{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 9px;border:1px solid rgba(74,222,128,.3);border-radius:13px;font-size:11px;color:#8fe3a8;background:rgba(74,222,128,.08)}
.dsh-systeme .live-pill.off{border-color:rgba(248,113,113,.34);color:#ff9b9b;background:rgba(248,113,113,.07)}
.dsh-systeme .state-pill{display:inline-flex;align-items:center;gap:5px;height:20px;padding:0 7px;border-radius:10px;font-size:10px;border:1px solid rgba(255,190,140,.14);color:var(--tx2);margin-left:8px;white-space:nowrap}
.dsh-systeme .state-pill.ok{border-color:rgba(74,222,128,.28);color:#8fe3a8;background:rgba(74,222,128,.06)}
.dsh-systeme .state-pill.warn{border-color:rgba(230,181,102,.3);color:#e6b566;background:rgba(230,181,102,.06)}
.dsh-systeme .state-pill.bad{border-color:rgba(248,113,113,.34);color:#ff9b9b;background:rgba(248,113,113,.07)}
.dsh-systeme .btn-o{height:28px;border-radius:4px;border:1px solid var(--b3);padding:0 10px;font-size:12px;display:inline-flex;align-items:center;gap:6px;color:var(--tx2);white-space:nowrap}
.dsh-systeme .btn-o:hover{background:var(--b2)}
.dsh-systeme .btn-o:disabled{opacity:.5;cursor:default}
.dsh-systeme .btn-o svg{width:13px;height:13px}
.dsh-systeme .btn-sm{height:24px;padding:0 8px;font-size:11px}
.dsh-systeme .btn-brand{height:28px;border-radius:4px;background:var(--brand);color:var(--on);padding:0 12px;font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--brand);white-space:nowrap}
.dsh-systeme .btn-brand:disabled{opacity:.45;cursor:default}
.dsh-systeme .btn-danger{background:#e2543f;color:#fff;border:1px solid #e2543f}
.dsh-systeme .btn-o.btn-danger{background:transparent;color:#ff9b9b}
.dsh-systeme .btn-brand svg,.dsh-systeme .btn-o svg{width:13px;height:13px}
.dsh-systeme .iconbtn{width:28px;height:28px;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;color:var(--tx2)}
.dsh-systeme .iconbtn:hover{background:var(--b2)}
.dsh-systeme .iconbtn svg{width:16px;height:16px}
.dsh-systeme .errbar{display:flex;align-items:center;gap:10px;margin-top:10px;padding:9px 12px;border:1px solid rgba(248,113,113,.3);background:rgba(80,30,30,.28);border-radius:7px;font-size:11.5px;color:#ff9b9b}
.dsh-systeme .errbar .grow{flex:1;min-width:0}
.dsh-systeme .sysgrid{display:flex;flex-direction:column;gap:12px;margin-top:12px}
.dsh-systeme .sysstats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.dsh-systeme .sysrow3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.dsh-systeme .sysrow2{display:grid;grid-template-columns:1.35fr 1fr;gap:12px}
.dsh-systeme .syscard{border:1px solid rgba(255,190,140,.14);border-radius:10px;background:rgba(24,16,11,.72);padding:13px 15px;display:flex;flex-direction:column;overflow:hidden;min-width:0}
.dsh-systeme .schead{display:flex;align-items:center;gap:8px;flex:none;min-width:0}
.dsh-systeme .schead h3{margin:0;font-size:13px;font-weight:600;display:flex;align-items:center;gap:7px;white-space:nowrap;min-width:0}
.dsh-systeme .schead h3 .mono{font-size:10.5px;color:var(--tx3);font-weight:400}
.dsh-systeme .schead .more{margin-left:auto;font-size:11px;color:var(--link);display:inline-flex;align-items:center;gap:4px;white-space:nowrap;flex:none}
.dsh-systeme .schead .more svg{width:12px;height:12px}
.dsh-systeme .cap{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--tx3);font-weight:500}
.dsh-systeme .syskpi{border:1px solid rgba(255,190,140,.14);border-radius:10px;background:rgba(24,16,11,.72);padding:11px 14px;display:flex;flex-direction:column;gap:3px;position:relative;overflow:hidden}
.dsh-systeme .syskpi .big{font-size:22px;font-weight:600;letter-spacing:-.01em;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsh-systeme .syskpi .big small{font-size:11px;font-weight:400;color:var(--tx2);margin-left:5px;letter-spacing:0}
.dsh-systeme .syskpi .mini{font-size:10.5px;color:var(--tx3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsh-systeme .syskpi .bar{height:5px;border-radius:3px;background:rgba(255,255,255,.08);margin-top:4px;overflow:hidden;flex:none}
.dsh-systeme .syskpi .bar i{display:block;height:100%;border-radius:3px;background:var(--green)}
.dsh-systeme .syskpi.bad{border-color:rgba(248,113,113,.35);background:linear-gradient(180deg,rgba(74,26,26,.95),rgba(28,14,12,.95))}
.dsh-systeme .syskpi.bad .cap{color:#ffb3b3}
.dsh-systeme .syskpi.bad .big{color:#ff9b9b}
.dsh-systeme .syskpi.bad .bar i{background:var(--red)}
.dsh-systeme .syskpi.warn{border-color:rgba(230,181,102,.32)}
.dsh-systeme .srows{display:flex;flex-direction:column;gap:1px;margin-top:7px;flex:none}
.dsh-systeme .srow{display:grid;grid-template-columns:112px minmax(0,1fr) minmax(64px,auto) 14px;gap:10px;align-items:center;height:31px;font-size:11.5px;color:var(--tx2);min-width:0}
.dsh-systeme .srow .lb{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsh-systeme .srow .track{height:5px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden}
.dsh-systeme .srow .track i{display:block;height:100%;border-radius:3px;background:var(--green)}
.dsh-systeme .srow .num{text-align:right;color:var(--tx);font-weight:600;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsh-systeme .srow .dot{justify-self:center}
.dsh-systeme .srow.bad .num{color:#ff9b9b}
.dsh-systeme .srow.bad .track i{background:var(--red)}
.dsh-systeme .srow.bad .dot{background:var(--red)}
.dsh-systeme .srow.warn .track i{background:var(--amber)}
.dsh-systeme .srow.warn .dot{background:var(--amber)}
.dsh-systeme .srow.warn .num{color:var(--amber)}
.dsh-systeme .srow.grey .track i{background:#8a8a8a}
.dsh-systeme .srow.grey .dot{background:#8a8a8a}
.dsh-systeme .srow.grey .num{color:var(--tx3)}
.dsh-systeme .spark{display:flex;align-items:flex-end;gap:3px;height:34px;margin-top:7px;flex:none}
.dsh-systeme .spark i{width:5px;border-radius:2px;background:rgba(245,137,58,.55);min-height:3px}
.dsh-systeme .proc{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--tx2);padding:3px 0;border-top:1px solid rgba(255,190,140,.05);min-width:0}
.dsh-systeme .proc .grow{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-systeme .proc b{color:var(--tx);font-weight:500;white-space:nowrap}
.dsh-systeme .proc .kill{font-size:10.5px;color:#ff9b9b;white-space:nowrap}
.dsh-systeme .proc .kill:hover{text-decoration:underline}
.dsh-systeme .note{font-size:10.5px;color:var(--tx3);line-height:1.45;margin-top:auto;padding-top:8px}
.dsh-systeme .note a{color:var(--link)}
.dsh-systeme .footlinks{display:flex;gap:14px;font-size:11px;color:var(--link);margin-top:8px;flex:none;flex-wrap:wrap}
.dsh-systeme .danger-link{color:#ff9b9b}
.dsh-systeme .job{display:flex;align-items:center;gap:8px;border:1px solid rgba(255,190,140,.12);border-radius:6px;padding:6px 8px;background:rgba(255,190,140,.04);font-size:11px;margin-top:8px;flex:none}
.dsh-systeme .job .grow{flex:1;min-width:0}
.dsh-systeme .slist{display:flex;flex-direction:column;gap:1px;margin-top:6px;flex:none}
.dsh-systeme .slist .sl{display:flex;align-items:center;gap:7px;height:23px;font-size:11px;color:var(--tx2);min-width:0}
.dsh-systeme .slist .sl b{color:var(--tx);font-weight:500;max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-systeme .slist .sl .tm{margin-left:auto;color:var(--tx3);font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsh-systeme .wstats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:9px;flex:none}
.dsh-systeme .wstats>div{border:1px solid rgba(255,190,140,.1);border-radius:6px;padding:7px 9px;background:rgba(255,190,140,.03);min-width:0}
.dsh-systeme .wstats b{display:block;font-size:18px;font-weight:600;line-height:1.1}
.dsh-systeme .wstats span{font-size:10px;color:var(--tx3)}
.dsh-systeme .wstats .bad{border-color:rgba(248,113,113,.3)}
.dsh-systeme .wstats .bad b{color:#ff9b9b}
.dsh-systeme .wline{display:flex;align-items:center;gap:7px;height:26px;font-size:11px;color:var(--tx2);border-top:1px solid rgba(255,190,140,.05);min-width:0}
.dsh-systeme .wline b{color:var(--tx);font-weight:600;font-size:10.5px;white-space:nowrap}
.dsh-systeme .wline .grow{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-systeme .wline .pill{margin-left:auto;flex:none}
.dsh-systeme .pill{display:inline-flex;align-items:center;gap:5px;border:1px solid rgba(255,190,140,.14);border-radius:4px;padding:1px 6px;font-size:10px;color:var(--tx2);white-space:nowrap}
.dsh-systeme .pill.warn{border-color:rgba(230,181,102,.34);color:#e6b566}
.dsh-systeme .check{display:flex;align-items:center;gap:7px;height:24px;font-size:11px;color:var(--tx2)}
.dsh-systeme .check .ck{width:6px;height:6px;border-radius:50%;background:var(--green);flex:none}
.dsh-systeme .check.bad .ck{background:var(--red)}
.dsh-systeme .check.warn .ck{background:var(--amber)}
.dsh-systeme .check .v{margin-left:auto;color:var(--tx3);font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:55%}
.dsh-systeme .dtab{width:100%;border-collapse:collapse;font-size:11px;margin-top:6px;flex:none;table-layout:fixed}
.dsh-systeme .dtab th{text-align:left;font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--tx3);font-weight:500;padding:0 0 5px;border-bottom:1px solid rgba(255,190,140,.1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-systeme .dtab th:nth-child(1){width:36%}
.dsh-systeme .dtab th:nth-child(2){width:14%}
.dsh-systeme .dtab th:nth-child(3){width:32%}
.dsh-systeme .dtab th:nth-child(4){width:18%}
.dsh-systeme .dtab td{padding:7px 0;border-bottom:1px solid rgba(255,190,140,.05);color:var(--tx2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsh-systeme .dtab td b{color:var(--tx);font-weight:500}
.dsh-systeme .dtab .st{display:inline-flex;align-items:center;gap:5px;max-width:100%;overflow:hidden;text-overflow:ellipsis}
.dsh-systeme .dtab .st.warn{color:#e6b566}
.dsh-systeme .dtab .st.ok{color:#8fe3a8}
.dsh-systeme .branch{display:flex;align-items:center;gap:7px;height:25px;font-size:11px;color:var(--tx2);border-top:1px solid rgba(255,190,140,.05);min-width:0}
.dsh-systeme .branch b{color:var(--tx);font-weight:600;font-size:10.5px;white-space:nowrap}
.dsh-systeme .branch .name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-systeme .branch .pill{margin-left:auto;flex:none}
.dsh-systeme .kstate{display:flex;align-items:center;gap:12px;margin-top:10px;flex:none}
.dsh-systeme .kstate .kic{width:38px;height:38px;border-radius:8px;border:1px solid rgba(248,113,113,.3);background:rgba(80,30,30,.3);display:flex;align-items:center;justify-content:center;flex:none;color:#ff9b9b}
.dsh-systeme .kstate .kic.ok{border-color:rgba(74,222,128,.3);background:rgba(30,80,50,.25);color:#8fe3a8}
.dsh-systeme .kstate .kic.warn{border-color:rgba(230,181,102,.3);background:rgba(80,60,30,.25);color:#e6b566}
.dsh-systeme .kstate h4{margin:0;font-size:15px;font-weight:600}
.dsh-systeme .kstate .sub{font-size:11px;color:var(--tx3);margin-top:3px;line-height:1.4}
.dsh-systeme .kacts{display:flex;gap:8px;margin-top:11px;flex:none;flex-wrap:wrap}
.dsh-systeme .kacts .btn-o{height:28px}
.dsh-systeme .overlay{position:fixed;inset:0;background:rgba(4,2,1,.6);display:flex;align-items:center;justify-content:center;z-index:100;padding:24px}
.dsh-systeme .cmodal{width:560px;max-width:100%;max-height:calc(100vh - 48px);border-radius:9px;border:1px solid var(--b3);background:#17120e;box-shadow:0 24px 60px rgba(0,0,0,.55);overflow:hidden;display:flex;flex-direction:column}
.dsh-systeme .smodal{width:640px}
.dsh-systeme .wmodal{width:820px}
.dsh-systeme .chead{height:46px;display:flex;align-items:center;gap:10px;padding:0 16px;border-bottom:1px solid var(--b1);flex:none}
.dsh-systeme .chead b{font-size:13.5px;font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-systeme .chead .iconbtn{margin-left:auto;flex:none}
.dsh-systeme .cbody{padding:14px 18px 8px;overflow-y:auto;min-height:0}
.dsh-systeme .crow{display:grid;grid-template-columns:86px 1fr;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,190,140,.06);font-size:12px;line-height:1.5}
.dsh-systeme .crow:first-child{border-top:0}
.dsh-systeme .crow span:first-child{color:var(--tx3);font-size:11px}
.dsh-systeme .crow b{color:var(--tx);font-weight:500}
.dsh-systeme .cnote{margin-top:11px;font-size:10.5px;color:var(--tx3);line-height:1.5}
.dsh-systeme .cnote b{color:var(--amber);font-weight:500}
.dsh-systeme .cfoot{display:flex;justify-content:flex-end;gap:8px;padding:12px 18px;border-top:1px solid var(--b1);flex:none}
.dsh-systeme .thr{display:grid;grid-template-columns:1fr 110px 110px;gap:10px;align-items:center;height:36px;border-bottom:1px solid rgba(255,190,140,.05);font-size:11.5px;color:var(--tx2)}
.dsh-systeme .thr.head{height:24px;border-bottom:1px solid rgba(255,190,140,.1);font-size:9.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3)}
.dsh-systeme .thr b{font-weight:500;color:var(--tx);font-size:11.5px}
.dsh-systeme .thr small{color:var(--tx3);font-size:10px;margin-left:3px}
.dsh-systeme .thr input{width:100%;height:26px;border:1px solid var(--b3);border-radius:4px;background:rgba(255,255,255,.04);color:var(--tx);padding:0 8px;font-size:11.5px;font-family:inherit}
.dsh-systeme .thr input:focus{outline:none;border-color:var(--brand)}
.dsh-systeme .disk-item{border-bottom:1px solid rgba(255,190,140,.08);padding:9px 0}
.dsh-systeme .disk-item:last-child{border-bottom:0}
.dsh-systeme .di-head{display:flex;align-items:center;gap:10px}
.dsh-systeme .di-head b{font-size:12px;font-weight:500;color:var(--tx)}
.dsh-systeme .di-head .di-size{margin-left:auto;font-size:11px;color:var(--tx3);white-space:nowrap}
.dsh-systeme .di-detail{font-size:10.5px;color:var(--tx3);margin-top:2px}
.dsh-systeme .dlist{display:flex;flex-direction:column;margin-top:6px;max-height:180px;overflow-y:auto;border:1px solid rgba(255,190,140,.08);border-radius:5px;padding:2px 8px}
.dsh-systeme .drow{display:flex;align-items:center;gap:8px;height:26px;font-size:11px;color:var(--tx2);border-bottom:1px solid rgba(255,190,140,.05);cursor:pointer}
.dsh-systeme .drow:last-child{border-bottom:0}
.dsh-systeme .drow input{accent-color:var(--brand);margin:0;flex:none}
.dsh-systeme .drow .grow{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-systeme .drow .di-size{color:var(--tx3);font-size:10.5px;white-space:nowrap}
.dsh-systeme .dacts{display:flex;align-items:center;gap:10px;margin-top:8px;flex-wrap:wrap}
.dsh-systeme .dacts .grow{flex:1;min-width:0;font-size:10.5px;color:var(--tx3)}
.dsh-systeme .res-group{margin-top:10px}
.dsh-systeme .res-group h4{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--tx3);font-weight:500}
.dsh-systeme .res-row{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;min-height:32px;border-bottom:1px solid rgba(255,190,140,.05);font-size:11.5px}
.dsh-systeme .res-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--tx)}
.dsh-systeme .res-meta{font-size:10.5px;color:var(--tx3);margin-left:8px}
.dsh-systeme .res-actions{display:flex;gap:6px}
.dsh-systeme .empty{padding:14px 0;font-size:11px;color:var(--tx3)}
.dsh-systeme .loading{display:flex;align-items:center;justify-content:center;gap:10px;height:240px;color:var(--tx3);font-size:12px}
.dsh-systeme .toast{position:fixed;left:50%;bottom:72px;transform:translateX(-50%) translateY(8px);z-index:120;background:#17120e;border:1px solid var(--b3);border-radius:6px;padding:9px 14px;font-size:12px;color:var(--tx);opacity:0;pointer-events:none;transition:opacity .15s,transform .15s;box-shadow:0 12px 30px rgba(0,0,0,.45);max-width:calc(100vw - 48px)}
.dsh-systeme .toast.on{opacity:1;transform:translateX(-50%) translateY(0)}
@media (max-width:1100px){
  .dsh-systeme .sysstats{grid-template-columns:repeat(2,1fr)}
  .dsh-systeme .sysrow3{grid-template-columns:1fr}
  .dsh-systeme .sysrow2{grid-template-columns:1fr}
}
@media (max-width:720px){
  .dsh-systeme{padding:12px 14px 24px}
  .dsh-systeme .sysstats{grid-template-columns:1fr}
  .dsh-systeme .wstats{grid-template-columns:repeat(2,1fr)}
  .dsh-systeme .srow{grid-template-columns:92px minmax(0,1fr) minmax(64px,auto) 14px}
  .dsh-systeme .phead{flex-wrap:wrap}
  .dsh-systeme .phead .pactions{margin-left:0}
  .dsh-systeme .dtab th:nth-child(2),.dsh-systeme .dtab td:nth-child(2){display:none}
  .dsh-systeme .thr{grid-template-columns:1fr 80px 80px}
}
`
    const PATHS = {
      pulse: [['path', { d: 'M3 12h4l2.5-7 5 14 2.5-7H21' }]],
      alert: [['path', { d: 'M12 4l9 16H3z' }], ['path', { d: 'M12 10v4M12 17h.01' }]],
      refresh: [['path', { d: 'M20 11a8 8 0 1 0-2.3 5.7' }], ['path', { d: 'M20 5v6h-6' }]],
      list: [['path', { d: 'M8 6h13M8 12h13M8 18h13' }], ['path', { d: 'M3 6h.01M3 12h.01M3 18h.01' }]],
      gear: [['circle', { cx: 12, cy: 12, r: 3 }], ['path', { d: 'M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z' }]],
      chevron: [['path', { d: 'M9 18l6-6-6-6' }]],
      up: [['path', { d: 'M12 19V5' }], ['path', { d: 'M5 12l7-7 7 7' }]],
      down: [['path', { d: 'M12 5v14' }], ['path', { d: 'M19 12l-7 7-7-7' }]],
      hex: [['path', { d: 'M12 2l8 4.5v9L12 20l-8-4.5v-9z' }], ['path', { d: 'M12 7l4.5 2.5v5L12 17l-4.5-2.5v-5z' }]],
      x: [['path', { d: 'M6 6l12 12M18 6L6 18' }]],
      check: [['path', { d: 'M20 6L9 17l-5-5' }]],
      disk: [['path', { d: 'M4 6h16v12H4z' }], ['path', { d: 'M4 10h16' }], ['path', { d: 'M8 14h2' }]],
      terminal: [['path', { d: 'M4 7l5 5-5 5' }], ['path', { d: 'M12 17h8' }]],
      external: [['path', { d: 'M14 4h6v6' }], ['path', { d: 'M20 4l-9 9' }], ['path', { d: 'M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5' }]],
      trash: [['path', { d: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14' }]],
    }

    function Icon({ name, size = 14 }) {
      const shapes = PATHS[name] ?? PATHS.pulse
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }, shapes.map(([tag, attrs], index) => h(tag, { ...attrs, key: index })))
    }

    function SystemeGlyph() {
      return h('svg', { viewBox: '0 0 24 24', width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }, h('path', { d: 'M3 12h4l2.5-7 5 14 2.5-7H21' }))
    }

    const fmt = (value) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(Number(value) || 0)
    const pct = (value) => (Number(value) || 0).toFixed(1).replace('.', ',')
    const money = (value) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) || 0)

    function formatBytes(bytes) {
      const value = Number(bytes) || 0
      if (value < 1024) return `${Math.round(value)} o`
      if (value < 1024 ** 2) return `${Math.round(value / 1024)} Ko`
      if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1).replace('.', ',')} Mo`
      return `${(value / 1024 ** 3).toFixed(1).replace('.', ',')} Go`
    }

    function ageText(seconds) {
      if (!Number.isFinite(seconds) || seconds < 0) return '—'
      if (seconds < 1) return 'à l’instant'
      if (seconds < 60) return `il y a ${Math.round(seconds)} s`
      const minutes = Math.floor(seconds / 60)
      if (minutes < 60) return `il y a ${minutes} min`
      const hours = Math.floor(minutes / 60)
      return `il y a ${hours} h`
    }

    function shortBranch(branch) {
      const match = String(branch).match(/^(SLV-\d+)(?:-(.+))?$/)
      return match ? { id: match[1], rest: (match[2] ?? '').replace(/-/g, ' ') } : { id: String(branch), rest: '' }
    }

    async function api(path, options) {
      const response = await fetch(path, { headers: { 'content-type': 'application/json' }, ...options })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
      return data
    }

    function Dot({ state }) {
      return h('i', { className: `dot d-${state || 'grey'}` })
    }

    function StatePill({ state, label }) {
      const tone = state === 'bad' || state === 'down' ? 'bad' : state === 'warn' ? 'warn' : 'ok'
      return h('span', { className: `state-pill ${tone}` }, h(Dot, { state: tone }), label)
    }

    function Row({ row }) {
      const percent = Math.max(0, Math.min(100, Number(row?.percent) || 0))
      return h('div', { className: `srow ${row?.state || ''}`, title: row?.detail || '' },
        h('span', { className: 'lb' }, row?.label ?? ''),
        h('span', { className: 'track' }, h('i', { style: { width: `${percent}%` } })),
        h('span', { className: 'num' }, row?.value ?? '—'),
        h(Dot, { state: row?.state || 'ok' }))
    }

    function Card({ title, mono, state, label, more, note, className, children }) {
      return h('section', { className: `syscard ${className || ''}` },
        h('div', { className: 'schead' },
          h('h3', {}, title, mono ? h('span', { className: 'mono' }, mono) : null),
          state ? h(StatePill, { state, label }) : null,
          more ? h('a', { href: '#', className: 'more', onClick: (event) => { event.preventDefault(); more.onClick() } }, more.label, h(Icon, { name: 'chevron' })) : null),
        children,
        note ? h('div', { className: 'note' }, note) : null)
    }

    function Modal({ title, wide, onClose, children, footer }) {
      return h('div', { className: 'overlay', onClick: (event) => { if (event.target === event.currentTarget) onClose() } },
        h('div', { className: `cmodal ${wide ? 'wmodal' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
          h('div', { className: 'chead' }, h('b', {}, title), h('button', { className: 'iconbtn', onClick: onClose, 'aria-label': 'Fermer' }, h(Icon, { name: 'x' }))),
          h('div', { className: 'cbody' }, children),
          footer ? h('div', { className: 'cfoot' }, footer) : null))
    }

    function ConfirmModal({ confirm, busy, onClose, onConfirm }) {
      const tone = confirm.tone === 'danger' ? 'btn-danger' : 'btn-brand'
      return h(Modal, { title: confirm.title, onClose },
        h('div', { className: 'crow' }, h('span', {}, 'Cible'), h('b', {}, confirm.target)),
        h('div', { className: 'crow' }, h('span', {}, 'Impact'), h('span', {}, confirm.impact)),
        h('div', { className: 'cnote' }, confirm.note),
        h('div', { className: 'cfoot', style: { borderTop: 0, padding: '8px 18px 14px' } },
          h('button', { className: 'btn-o', onClick: onClose, disabled: busy }, 'Annuler'),
          h('button', { className: `btn-brand ${tone}`, onClick: onConfirm, disabled: busy }, busy ? 'En cours…' : confirm.okLabel)))
    }

    function SettingsModal({ form, saving, onChange, onSave, onClose }) {
      const rows = [
        ['disk', 'Disque libre', '%', 'attention', 'alerte'],
        ['memoire', 'Mémoire utilisée', '%', 'attention', 'alerte'],
        ['charge', 'Charge', '× cœurs', 'coefAttention', 'coefAlerte'],
        ['batterie', 'Batterie', '%', 'attention', 'alerte'],
        ['depots', 'Dépôts sales', 'jours', 'attentionJours', 'alerteJours'],
        ['pods', 'Redémarrages de pods', '', 'attentionRedemarrages', 'alerteRedemarrages'],
      ]
      return h(Modal, { title: 'Seuils du panneau', onClose },
        h('div', { className: 'thr head' }, h('span', {}, 'Seuil'), h('span', {}, 'Attention'), h('span', {}, 'Alerte')),
        rows.map(([key, label, unit, warnKey, badKey]) => h('div', { className: 'thr', key },
          h('b', {}, label, unit ? h('small', {}, unit) : null),
          h('input', { type: 'number', min: 0, step: 1, value: form[key][warnKey], onChange: (event) => onChange(key, warnKey, Number(event.target.value)) }),
          h('input', { type: 'number', min: 0, step: 1, value: form[key][badKey], onChange: (event) => onChange(key, badKey, Number(event.target.value)) }))),
        h('div', { className: 'cnote' }, `Enregistré dans ~/.dsh/storages/dsh-monitor/config.json. Les valeurs sont relues à chaque mesure.`),
        h('div', { className: 'cfoot', style: { borderTop: 0, padding: '8px 18px 14px' } },
          h('button', { className: 'btn-o', onClick: onClose, disabled: saving }, 'Annuler'),
          h('button', { className: 'btn-brand', onClick: onSave, disabled: saving }, saving ? 'Enregistrement…' : 'Enregistrer')))
    }

    function DiskModal({ disk, loading, error, selected, onToggle, onDocker, onCache, onTargets, onClose }) {
      const items = disk?.items ?? []
      const targets = items.flatMap((item) => (item.targets ?? []).map((target) => ({ ...target, id: item.id })))
      const chosen = targets.filter((target) => selected[`${target.repo}/${target.path}`])
      const body = loading
        ? h('div', { className: 'empty' }, 'Analyse des cibles…')
        : error
          ? h('div', { className: 'errbar' }, h('span', { className: 'grow' }, error))
          : h('div', {},
              items.map((item) => h('div', { className: 'disk-item', key: item.id },
                h('div', { className: 'di-head' }, h('b', {}, item.label), h('span', { className: 'di-size' }, item.bytes ? formatBytes(item.bytes) : '—')),
                h('div', { className: 'di-detail' }, item.detail),
                item.id === 'docker' ? h('div', { className: 'dacts' }, h('span', { className: 'grow' }, 'Images et cache, sans volumes'), h('button', { className: 'btn-o btn-danger btn-sm', onClick: onDocker }, 'Purger')) : null,
                item.id === 'cache-dsh' ? h('div', { className: 'dacts' }, h('span', { className: 'grow' }, 'Fichiers temporaires du runtime'), h('button', { className: 'btn-o btn-danger btn-sm', onClick: onCache }, 'Vider')) : null,
                (item.targets ?? []).length ? h('div', { className: 'dlist' }, item.targets.map((target) => {
                  const key = `${target.repo}/${target.path}`
                  return h('label', { className: 'drow', key }, h('input', { type: 'checkbox', checked: Boolean(selected[key]), onChange: () => onToggle(key) }), h('span', { className: 'grow' }, key), h('span', { className: 'di-size' }, target.label))
                })) : item.targets ? h('div', { className: 'empty' }, 'Aucune cible inactive.') : null,
                (item.targets ?? []).length ? h('div', { className: 'dacts' },
                  h('span', { className: 'grow' }, `${chosen.filter((target) => target.id === item.id).length} cible(s) · ${formatBytes(chosen.filter((target) => target.id === item.id).reduce((sum, target) => sum + Number(target.bytes ?? 0), 0))}`),
                  h('button', { className: 'btn-o btn-sm', onClick: () => onTargets(item.id) }, 'Sélectionner tout'),
                  h('button', { className: 'btn-o btn-danger btn-sm', onClick: () => onTargets(item.id, true) }, 'Nettoyer la sélection')) : null)),
              h('div', { className: 'cnote' }, `Total repéré : ${formatBytes(disk?.total)}. Chaque cible est nommée ; rien n’est supprimé sans confirmation.`))
      return h(Modal, { title: 'Libérer de l’espace', wide: true, onClose },
        body,
        h('div', { className: 'cfoot' }, h('button', { className: 'btn-o', onClick: onClose }, 'Fermer')))
    }

    function ReposModal({ repos, age, onClose }) {
      return h(Modal, { title: `Dépôts · ${repos?.total ?? 0}`, wide: true, onClose },
        h('table', { className: 'dtab' },
          h('thead', {}, h('tr', {}, h('th', {}, 'Dépôt'), h('th', {}, 'Branche'), h('th', {}, 'État'), h('th', {}, 'Sync'))),
          h('tbody', {}, (repos?.items ?? []).map((item) => h('tr', { key: item.name },
            h('td', {}, h('b', {}, item.name)), h('td', {}, item.branch),
            h('td', {}, h('span', { className: `st ${item.state === 'ok' ? 'ok' : 'warn'}` }, h(Dot, { state: item.state }), item.dirty ? `${item.dirty} modifié${item.dirty > 1 ? 's' : ''}` : 'propre')),
            h('td', {}, item.sync))))),
        h('div', { className: 'cnote' }, `${repos?.dirtyCount ?? 0} sales · ${repos?.behindCount ?? 0} en retard · dernier scan ${age}`),
        h('div', { className: 'cfoot' }, h('button', { className: 'btn-o', onClick: onClose }, 'Fermer')))
    }

    function K8sResourcesModal({ k8s, onRestart, onDelete, onPurge, onClose }) {
      const group = (title, items, meta, action, run) => h('div', { className: 'res-group' },
        h('h4', {}, title),
        (items ?? []).length ? items.map((item) => h('div', { className: 'res-row', key: item.name },
          h('span', { className: 'res-name' }, item.name, h('span', { className: 'res-meta' }, meta(item))),
          h('span', { className: 'res-actions' }, h('button', { className: 'btn-o btn-sm', onClick: () => run(item) }, action)))) : h('div', { className: 'empty' }, 'Aucune ressource.'))
      return h(Modal, { title: 'Ressources kind-devspace', wide: true, onClose },
        group('Deployments', k8s?.deployments, (item) => `${item.available}/${item.desired} prêts`, 'Redémarrer', onRestart),
        group('Pods', k8s?.pods, (item) => `${item.phase}${item.restarts ? ` · ${item.restarts} restart(s)` : ''}`, 'Supprimer', onDelete),
        group('Jobs', k8s?.jobs, (item) => `${item.succeeded} réussi(s)${item.failed ? ` · ${item.failed} échec(s)` : ''}`, 'Purger', onPurge),
        h('div', { className: 'cnote' }, 'Les actions sont confirmées et journalisées. Le déploiement devspace reste au terminal.'),
        h('div', { className: 'cfoot' }, h('button', { className: 'btn-o', onClick: onClose }, 'Fermer')))
    }

    function Toast({ message }) {
      return h('div', { className: `toast ${message ? 'on' : ''}` }, message)
    }

    const CACHE_KEY = 'dsh-monitor:state:v1'

    function cachedState() {
      try {
        const raw = window.localStorage.getItem(CACHE_KEY)
        if (!raw) return null
        const value = JSON.parse(raw)
        if (!value || !value.data || !value.at) return null
        if (!value.data.machine || !value.data.dsh || !value.data.konoha || !value.data.repos || !value.data.k8s) return null
        return value
      } catch {
        return null
      }
    }

    function SystemePanel(props) {
      const [state, setState] = useState(() => cachedState()?.data ?? null)
      const [error, setError] = useState('')
      const [loading, setLoading] = useState(true)
      const [loadedAt, setLoadedAt] = useState(() => cachedState()?.at ?? 0)
      const [now, setNow] = useState(Date.now())
      const [confirm, setConfirm] = useState(null)
      const [busy, setBusy] = useState(false)
      const [toast, setToast] = useState('')
      const [settingsOpen, setSettingsOpen] = useState(false)
      const [settingsForm, setSettingsForm] = useState(null)
      const [saving, setSaving] = useState(false)
      const [diskOpen, setDiskOpen] = useState(false)
      const [disk, setDisk] = useState(null)
      const [diskLoading, setDiskLoading] = useState(false)
      const [diskError, setDiskError] = useState('')
      const [selected, setSelected] = useState({})
      const [reposOpen, setReposOpen] = useState(false)
      const [resourcesOpen, setResourcesOpen] = useState(false)
      const [jobRows, setJobRows] = useState([])
      const toastTimer = useRef(null)
      const staleTimer = useRef(null)
      const staleStreak = useRef(0)
      const sessionId = props.session?.sessionId ?? props.session?.id ?? props.sessionId ?? ''
      const jobs = props.jobs ?? props.services?.getService?.('jobs')

      const showToast = useCallback((message) => {
        setToast(message)
        if (toastTimer.current) clearTimeout(toastTimer.current)
        toastTimer.current = setTimeout(() => setToast(''), 3200)
      }, [])

      useEffect(() => () => {
        if (toastTimer.current) clearTimeout(toastTimer.current)
        if (staleTimer.current) clearTimeout(staleTimer.current)
      }, [])

      const load = useCallback(async (force = false) => {
        setLoading(true)
        try {
          const data = await api(force ? '/systeme/api/etat?refresh=1' : '/systeme/api/etat')
          const at = Date.parse(data?.at) || Date.now()
          setState(data)
          setError('')
          setLoadedAt(at)
          try {
            window.localStorage.setItem(CACHE_KEY, JSON.stringify({ data, at }))
          } catch {}
          if (data?.stale && staleStreak.current < 4) {
            staleStreak.current += 1
            if (staleTimer.current) clearTimeout(staleTimer.current)
            staleTimer.current = setTimeout(() => { staleTimer.current = null; load() }, 3000)
          } else if (!data?.stale) {
            staleStreak.current = 0
            if (staleTimer.current) { clearTimeout(staleTimer.current); staleTimer.current = null }
          }
        } catch (fetchError) {
          setError(fetchError.message)
        } finally {
          setLoading(false)
        }
      }, [])

      useEffect(() => { load() }, [load])

      useEffect(() => {
        const timer = setInterval(() => { if (document.visibilityState === 'visible') load() }, 60000)
        const focus = () => { if (document.visibilityState === 'visible') load() }
        window.addEventListener('focus', focus)
        return () => { clearInterval(timer); window.removeEventListener('focus', focus) }
      }, [load])

      useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 5000)
        return () => clearInterval(timer)
      }, [])

      useEffect(() => {
        if (!jobs || !sessionId) return undefined
        const sync = () => {
          try {
            const snapshot = jobs.state?.getSnapshot?.()
            const rows = snapshot?.rows?.[sessionId]
            setJobRows(Array.isArray(rows) ? rows : [])
          } catch {
            setJobRows([])
          }
        }
        sync()
        const off = jobs.state?.subscribe?.(sync)
        const stop = jobs.watchRows?.(sessionId)
        return () => {
          if (typeof off === 'function') off()
          if (typeof stop === 'function') stop()
        }
      }, [jobs, sessionId])

      const runningJobs = useMemo(() => jobRows.filter((job) => job.status === 'running' || job.status === 'queued'), [jobRows])
      const job = runningJobs[0] ?? null
      const jobAge = job?.startedAt ? Math.max(0, Math.round((now - new Date(job.startedAt).getTime()) / 60000)) : 0
      const age = loadedAt ? ageText((now - loadedAt) / 1000) : '—'
      const config = state?.config

      const runAction = (body) => async () => {
        const entry = await api('/systeme/api/action', { method: 'POST', body: JSON.stringify({ ...body, confirm: true }) })
        showToast(entry.result || 'Action effectuée')
      }

      const ask = (options) => setConfirm({
        title: 'Confirmer l’action',
        target: '—',
        impact: '—',
        note: 'L’action est journalisée. Rien n’est exécuté avant confirmation.',
        okLabel: 'Confirmer',
        tone: 'brand',
        ...options,
      })

      const runConfirm = async () => {
        if (!confirm || busy) return
        setBusy(true)
        try {
          await confirm.run()
          setConfirm(null)
          await load(true)
        } catch (actionError) {
          setConfirm(null)
          showToast(actionError.message)
          await load(true)
        } finally {
          setBusy(false)
        }
      }

      const askKillJob = () => {
        if (!job || !jobs) return
        ask({
          title: `Arrêter le job ${job.id} ?`,
          target: `${job.id}${job.kind ? ` · ${job.kind}` : ''} · ${jobAge} min`,
          impact: 'Le job est interrompu. Son état et sa sortie restent dans Tasks.',
          okLabel: 'Arrêter le job',
          tone: 'danger',
          run: async () => {
            await jobs.kill(sessionId, job.id)
            await api('/systeme/api/journal', { method: 'POST', body: JSON.stringify({ famille: 'dsh', action: 'job', cible: job.id, impact: 'job arrêté', result: 'job arrêté', ok: true }) })
            showToast(`Job ${job.id} arrêté`)
          },
        })
      }

      const askCache = () => ask({
        title: 'Vider le cache DSH ?',
        target: '~/.dsh/cache',
        impact: 'Supprime les fichiers temporaires du runtime. Les sessions, le profil et les dépôts ne sont pas touchés.',
        okLabel: 'Vider le cache',
        tone: 'danger',
        run: runAction({ famille: 'dsh', action: 'cache' }),
      })

      const askDocker = () => ask({
        title: 'Purger les images et le cache Docker ?',
        target: 'images et cache Docker',
        impact: 'Supprime les images non utilisées et le cache de build. Les volumes Docker sont conservés.',
        okLabel: 'Purger',
        tone: 'danger',
        run: runAction({ famille: 'disque', action: 'docker' }),
      })

      const askCluster = () => {
        const down = state?.k8s?.down
        ask({
          title: down ? 'Démarrer le cluster kind-devspace ?' : 'Arrêter le cluster kind-devspace ?',
          target: down ? 'colima, puis le cluster kind-devspace' : 'Docker/colima, cluster kind-devspace conservé',
          impact: down
            ? 'Démarre colima, crée le cluster s’il manque, relance les conteneurs kind et attend les nœuds prêts. 30–90 s. Aucun déploiement devspace n’est lancé.'
            : 'Arrête Docker/colima. Le cluster kind et ses volumes sont conservés ; aucun `kind delete`.',
          okLabel: down ? 'Démarrer le cluster' : 'Arrêter le cluster',
          tone: down ? 'brand' : 'danger',
          run: runAction({ famille: 'devspace', action: down ? 'start' : 'stop' }),
        })
      }

      const askKill = (processInfo) => ask({
        title: `Arrêter ${processInfo.name} ?`,
        target: `PID ${processInfo.pid} · ${fmt(processInfo.cpu)} % CPU · ${formatBytes(processInfo.rss)}`,
        impact: 'SIGTERM, puis SIGKILL après 5 s si le processus résiste. Le processus doit rester non protégé.',
        okLabel: 'Arrêter le processus',
        tone: 'danger',
        run: runAction({ famille: 'processus', action: 'kill', pid: processInfo.pid }),
      })

      const openDisk = async () => {
        setDiskOpen(true)
        setDiskLoading(true)
        setDiskError('')
        setSelected({})
        try {
          setDisk(await api('/systeme/api/disque'))
        } catch (diskFetchError) {
          setDiskError(diskFetchError.message)
        } finally {
          setDiskLoading(false)
        }
      }

      const toggleTarget = (key) => setSelected((current) => ({ ...current, [key]: !current[key] }))

      const selectAll = (itemId, clean = false) => {
        const targets = (disk?.items ?? []).filter((item) => item.id === itemId).flatMap((item) => item.targets ?? [])
        if (clean) {
          const chosen = targets.filter((target) => selected[`${target.repo}/${target.path}`])
          if (!chosen.length) { showToast('Aucune cible sélectionnée'); return }
          const bytes = chosen.reduce((sum, target) => sum + Number(target.bytes ?? 0), 0)
          ask({
            title: 'Nettoyer les cibles sélectionnées ?',
            target: chosen.map((target) => `${target.repo}/${target.path}`).slice(0, 4).join(', ') + (chosen.length > 4 ? '…' : ''),
            impact: `${formatBytes(bytes)} libérés. ${chosen.length} cible(s) supprimée(s). Aucun fichier suivi par git n’est touché.`,
            okLabel: 'Nettoyer',
            tone: 'danger',
            run: runAction({ famille: 'disque', action: itemId, targets: chosen }),
          })
          return
        }
        setSelected((current) => {
          const next = { ...current }
          for (const target of targets) next[`${target.repo}/${target.path}`] = true
          return next
        })
      }

      const openSettings = () => {
        if (!state) return
        setSettingsForm(JSON.parse(JSON.stringify(state.config)))
        setSettingsOpen(true)
      }

      const updateSetting = (key, field, value) => setSettingsForm((current) => ({ ...current, [key]: { ...current[key], [field]: value } }))

      const saveSettings = async () => {
        if (!settingsForm) return
        setSaving(true)
        try {
          const data = await api('/systeme/api/reglages', { method: 'POST', body: JSON.stringify(settingsForm) })
          setState((current) => (current ? { ...current, config: data.config } : current))
          setSettingsOpen(false)
          showToast('Seuils enregistrés')
          await load(true)
        } catch (settingsError) {
          showToast(settingsError.message)
        } finally {
          setSaving(false)
        }
      }

      const hint = (label) => showToast(`${label} : ouvrir depuis la barre latérale`)

      if (!state) {
        return h('div', { className: 'dsh-systeme' },
          h('div', { className: 'phead' }, h('div', {}, h('h2', {}, 'Système'), h('div', { className: 'sub' }, 'Machine, DSH, workspace konoha, dépôts, cluster'))),
          error ? h('div', { className: 'errbar' }, h('span', { className: 'grow' }, `Le serveur ne répond pas : ${error}`), h('button', { className: 'btn-o', onClick: load }, 'Réessayer')) : h('div', { className: 'loading' }, 'Chargement de l’état…'),
          h(Toast, { message: toast }))
      }

      const machine = state.machine
      const dsh = state.dsh
      const konoha = state.konoha
      const repos = state.repos
      const k8s = state.k8s
      const diskRow = machine.rows.find((row) => row.id === 'disque')
      const memoryRow = machine.rows.find((row) => row.id === 'memoire')
      const loadRow = machine.rows.find((row) => row.id === 'charge')
      const maxCpu = Math.max(1, ...(machine.cpuHistory ?? [0]))
      const clusterTone = k8s.down ? 'bad' : k8s.state

      return h('div', { className: 'dsh-systeme' },
        h('div', { className: 'phead' },
          h('div', {}, h('h2', {}, 'Système'), h('div', { className: 'sub' }, `Machine, DSH, workspace konoha, dépôts, cluster · rafraîchi ${age}`)),
          h('div', { className: 'pactions' },
            h('span', { className: `live-pill ${error ? 'off' : ''}` }, h(Dot, { state: error ? 'bad' : 'ok' }), error ? 'Hors ligne' : 'En direct'),
            h('button', { className: 'btn-o', onClick: load, disabled: loading }, h(Icon, { name: 'refresh' }), loading ? 'Rafraîchissement…' : 'Rafraîchir'),
            h('button', { className: 'btn-o', onClick: openSettings }, h(Icon, { name: 'gear' }), 'Réglages'))),
        error ? h('div', { className: 'errbar' }, h('span', { className: 'grow' }, `Le serveur ne répond pas : ${error}. Les dernières mesures restent affichées.`), h('button', { className: 'btn-o', onClick: load }, 'Réessayer')) : null,
        h('div', { className: 'sysgrid' },
          h('div', { className: 'sysstats' },
            h('div', { className: `syskpi ${diskRow?.state === 'bad' ? 'bad' : diskRow?.state === 'warn' ? 'warn' : ''}` },
              h('div', { className: 'cap' }, 'Disque libre'),
              h('div', { className: 'big' }, `${pct(machine.disk.freePct)} %`, h('small', {}, `${formatBytes(machine.disk.free)} / ${formatBytes(machine.disk.total)}`)),
              h('div', { className: 'mini' }, `Alerte sous ${config.disk.alerte} % · attention sous ${config.disk.attention} %`),
              h('div', { className: 'bar' }, h('i', { style: { width: `${Math.min(100, Number(machine.disk.freePct) || 0)}%` } }))),
            h('div', { className: `syskpi ${memoryRow?.state === 'bad' ? 'bad' : memoryRow?.state === 'warn' ? 'warn' : ''}` },
              h('div', { className: 'cap' }, 'Mémoire'),
              h('div', { className: 'big' }, `${Math.round(machine.memory.percent)} %`, h('small', {}, `${formatBytes(machine.memory.used)} / ${formatBytes(machine.memory.total)}`)),
              h('div', { className: 'mini' }, `Actif ${formatBytes((Number(machine.memory.active) || 0) + (Number(machine.memory.wired) || 0))} · compressé ${formatBytes(Number(machine.memory.compressed) || 0)}`),
              h('div', { className: 'mini' }, `Alerte au-dessus de ${config.memoire.alerte} % · attention ${config.memoire.attention} %`),
              h('div', { className: 'bar' }, h('i', { style: { width: `${Math.min(100, Number(machine.memory.percent) || 0)}%` } }))),
            h('div', { className: `syskpi ${loadRow?.state === 'bad' ? 'bad' : loadRow?.state === 'warn' ? 'warn' : ''}` },
              h('div', { className: 'cap' }, 'Charge'),
              h('div', { className: 'big' }, pct(machine.load.one), h('small', {}, `${machine.cpuCount} cœurs`)),
              h('div', { className: 'mini' }, `Alerte au-dessus de ${fmt(config.charge.coefAlerte * machine.cpuCount)} · attention ${fmt(config.charge.coefAttention * machine.cpuCount)}`),
              h('div', { className: 'bar' }, h('i', { style: { width: `${Math.min(100, (Number(machine.load.ratio) || 0) * 100)}%` } }))),
            h('div', { className: `syskpi ${clusterTone === 'bad' ? 'bad' : clusterTone === 'warn' ? 'warn' : ''}` },
              h('div', { className: 'cap' }, 'Cluster'),
              h('div', { className: 'big', style: { fontSize: '19px' } }, k8s.alert),
              h('div', { className: 'mini' }, `${k8s.devspace?.cluster ?? 'kind-devspace'} · ${k8s.reason ?? ''}`),
              h('div', { className: 'bar' }, h('i', { style: { width: k8s.down ? '0%' : '100%' } })))),
          h('div', { className: 'sysrow3' },
            h(Card, { title: 'Machine', state: machine.state, label: machine.alert, more: { label: 'Libérer de l’espace', onClick: openDisk }, note: h('span', {}, `Seuils : disque ${config.disk.attention} %, RAM ${config.memoire.attention} %, charge ${config.charge.coefAttention}× cœurs. `, h('a', { href: '#', onClick: (event) => { event.preventDefault(); openSettings() } }, 'Réglages')) },
              h('div', { className: 'srows' }, machine.rows.map((row) => h(Row, { key: row.id, row }))),
              h('div', { className: 'cap', style: { marginTop: '9px' } }, 'Processeur · 24 dernières minutes'),
              h('div', { className: 'spark' }, (machine.cpuHistory?.length ? machine.cpuHistory : [0]).map((value, index) => h('i', { key: index, style: { height: `${Math.max(3, Math.round(((Number(value) || 0) / maxCpu) * 24))}px` } }))),
              h('div', { className: 'cap', style: { marginTop: '8px' } }, 'Top processus'),
              (machine.top ?? []).map((processInfo) => h('div', { className: 'proc', key: processInfo.pid },
                h('span', { className: 'grow' }, processInfo.name),
                h('b', {}, `${fmt(processInfo.cpu)} %`),
                processInfo.canKill ? h('button', { className: 'kill', onClick: () => askKill(processInfo), title: 'Arrêter ce processus' }, 'Tuer') : null))),
            h(Card, { title: 'DSH', state: dsh.state, label: dsh.alert, more: { label: 'Context Insights', onClick: () => hint('Context Insights') }, note: 'Le détail des sessions et du coût reste dans Context Insights et Tasks.' },
              h('div', { className: 'srows' },
                h(Row, { row: { label: 'Sessions actives', value: String(dsh.sessions.count), percent: Math.min(100, dsh.sessions.count * 6), state: 'ok', detail: dsh.sessions.detail } }),
                h(Row, { row: { label: 'Coût du jour', value: `${dsh.cost.symbol}${money(dsh.cost.amount)}`, percent: Math.min(100, dsh.cost.amount * 2), state: 'ok', detail: dsh.cost.detail } }),
                h(Row, { row: { label: 'Jobs en cours', value: String(runningJobs.length), percent: runningJobs.length ? 8 : 0, state: runningJobs.length ? 'warn' : 'ok', detail: 'jobs de la session' } }),
                h(Row, { row: { label: 'Erreurs · 24 h', value: String(dsh.errors.count), percent: 0, state: dsh.errors.state, detail: dsh.errors.detail } }),
                h(Row, { row: { label: 'Cache', value: dsh.cache.label, percent: Math.min(100, (dsh.cache.bytes / (1024 ** 3)) * 100), state: 'ok', detail: dsh.cache.detail } })),
              job ? h('div', { className: 'job' }, h(Dot, { state: 'warn' }), h('b', { className: 'mono' }, job.id), h('span', { style: { color: 'var(--tx3)' } }, `${jobAge} min`), h('span', { className: 'grow' }), h('button', { className: 'btn-o btn-sm btn-danger', onClick: askKillJob }, 'Arrêter')) : null,
              h('div', { className: 'cap', style: { marginTop: '9px' } }, 'Sessions actives'),
              h('div', { className: 'slist' }, (dsh.sessions.items ?? []).slice(0, 4).map((item) => h('div', { className: 'sl', key: item.id }, h(Dot, { state: item.active ? 'ok' : 'grey' }), h('b', {}, item.label), h('span', { className: 'tm' }, item.detail)))),
              h('div', { className: 'footlinks' }, h('a', { href: '#', onClick: (event) => { event.preventDefault(); hint('Tasks') } }, 'Ouvrir Tasks'), h('a', { href: '#', onClick: (event) => { event.preventDefault(); hint('Context Insights') } }, 'Ouvrir Context Insights'), h('a', { href: '#', className: 'danger-link', onClick: (event) => { event.preventDefault(); askCache() } }, 'Vider le cache'))),
            h(Card, { title: 'Workspace konoha', state: konoha.state, label: konoha.alert, more: { label: 'Missions', onClick: () => hint('Missions') }, note: konoha.note },
              h('div', { className: 'srows' },
                h(Row, { row: { label: `Git · ${konoha.git.branch}`, value: `${konoha.git.dirty} modifié${konoha.git.dirty > 1 ? 's' : ''}`, percent: 0, state: konoha.git.state, detail: konoha.git.detail } }),
                konoha.next ? h(Row, { row: { label: 'Prochaine action', value: konoha.next.id, percent: 0, state: 'ok', detail: konoha.next.title } }) : null),
              h('div', { className: 'wstats' },
                h('div', {}, h('b', {}, String(konoha.missions.open)), h('span', {}, 'ouvertes')),
                h('div', {}, h('b', {}, String(konoha.missions.awaiting)), h('span', {}, 'à valider')),
                h('div', {}, h('b', {}, String(konoha.missions.queued)), h('span', {}, 'en file')),
                h('div', { className: konoha.missions.anomalies ? 'bad' : '' }, h('b', {}, String(konoha.missions.anomalies)), h('span', {}, 'anomalies'))),
              (konoha.items ?? []).map((item) => h('div', { className: 'wline', key: item.id },
                h('b', {}, item.id),
                h('span', { className: 'grow' }, `${item.title} · ${item.status}`),
                item.queue ? h('span', { className: 'pill warn' }, `file ${item.queue}`) : item.id === 'SLV-77' ? h('span', { className: 'pill' }, 'cette mission') : null)),
              h('div', { className: 'cap', style: { marginTop: '8px' } }, 'Contrôles'),
              (konoha.checks ?? []).map((check) => h('div', { className: `check ${check.state}`, key: check.id }, h('span', { className: 'ck' }), h('span', {}, check.label), h('span', { className: 'v' }, check.value))))),
          h('div', { className: 'sysrow2' },
            repos.hidden ? null : h(Card, { title: 'Dépôts', state: repos.state, label: repos.alert, more: { label: `Voir les ${repos.total}`, onClick: () => setReposOpen(true) }, note: `${repos.dirtyCount} sales · ${repos.behindCount} en retard · dernier scan ${age}` },
              h('table', { className: 'dtab' },
                h('thead', {}, h('tr', {}, h('th', {}, 'Dépôt'), h('th', {}, 'Branche'), h('th', {}, 'État'), h('th', {}, 'Sync'))),
                h('tbody', {}, (repos.items ?? []).slice(0, 6).map((item) => h('tr', { key: item.name },
                  h('td', {}, h('b', {}, item.name)), h('td', {}, item.branch),
                  h('td', {}, h('span', { className: `st ${item.state === 'ok' ? 'ok' : 'warn'}` }, h(Dot, { state: item.state }), item.dirty ? `${item.dirty} modifié${item.dirty > 1 ? 's' : ''}` : 'propre')),
                  h('td', {}, item.sync))))),
              (repos.missionBranches ?? []).length ? h('div', { className: 'cap', style: { marginTop: '8px' } }, 'Branches de mission') : null,
              (repos.missionBranches ?? []).slice(0, 2).map((entry) => {
                const branch = shortBranch(entry.branch)
                return h('div', { className: 'branch', key: `${entry.repo}/${entry.branch}` }, h('b', {}, branch.id), h('span', { className: 'name' }, branch.rest), h('span', { className: 'pill' }, entry.repo))
              })),
            k8s.hidden ? null : h(Card, { title: 'Kubernetes', mono: 'kind-devspace', state: k8s.down ? 'bad' : k8s.state, label: k8s.alert, note: `Démarrage : ${k8s.devspace?.startHint ?? 'colima + kind'}. Le déploiement devspace reste au terminal.` },
              h('div', { className: 'kstate' }, h('div', { className: `kic ${k8s.down ? '' : k8s.state === 'ok' ? 'ok' : 'warn'}` }, h(Icon, { name: 'hex', size: 19 })), h('div', {}, h('h4', {}, k8s.alert), h('div', { className: 'sub' }, k8s.reason))),
              h('div', { className: 'srows' },
                h(Row, { row: { label: 'Contexte', value: k8s.context || '—', percent: 0, state: k8s.context === 'kind-devspace' ? 'ok' : k8s.context ? 'warn' : 'bad', detail: 'kubectl' } }),
                h(Row, { row: { label: 'Dernier état', value: k8s.lastDetail, percent: 0, state: k8s.down ? 'grey' : 'ok', detail: 'mesure précédente' } })),
              h('div', { className: 'cap', style: { marginTop: '8px' } }, 'Vérifications'),
              (k8s.checks ?? []).slice(0, 4).map((check) => h('div', { className: `check ${check.state}`, key: check.id }, h('span', { className: 'ck' }), h('span', {}, check.label), h('span', { className: 'v' }, check.value))),
              h('div', { className: 'kacts' },
                k8s.down
                  ? h('button', { className: 'btn-brand', onClick: askCluster, disabled: !k8s.devspace?.canStart, title: k8s.devspace?.canStart ? '' : 'Prérequis manquants' }, h(Icon, { name: 'up' }), 'Démarrer le cluster')
                  : h('button', { className: 'btn-o btn-danger', onClick: askCluster }, h(Icon, { name: 'down' }), 'Arrêter le cluster'),
                !k8s.down ? h('button', { className: 'btn-o', onClick: () => setResourcesOpen(true) }, h(Icon, { name: 'terminal' }), 'Ressources') : null,
                h('button', { className: 'btn-o', onClick: load }, h(Icon, { name: 'refresh' }), 'Vérifier'))))),
        settingsOpen && settingsForm ? h(SettingsModal, { form: settingsForm, saving, onChange: updateSetting, onSave: saveSettings, onClose: () => setSettingsOpen(false) }) : null,
        diskOpen ? h(DiskModal, { disk, loading: diskLoading, error: diskError, selected, onToggle: toggleTarget, onDocker: askDocker, onCache: askCache, onTargets: selectAll, onClose: () => setDiskOpen(false) }) : null,
        reposOpen && !repos.hidden ? h(ReposModal, { repos, age, onClose: () => setReposOpen(false) }) : null,
        resourcesOpen ? h(K8sResourcesModal, {
          k8s,
          onRestart: (item) => ask({ title: `Redémarrer deployment/${item.name} ?`, target: `deployment/${item.name}`, impact: 'Redémarrage progressif, le service reste disponible.', okLabel: 'Redémarrer', run: runAction({ famille: 'k8s', action: 'restart', name: item.name }) }),
          onDelete: (item) => ask({ title: `Supprimer pod/${item.name} ?`, target: `pod/${item.name}`, impact: 'Le pod est supprimé puis recréé par son deployment.', okLabel: 'Supprimer', tone: 'danger', run: runAction({ famille: 'k8s', action: 'delete', name: item.name }) }),
          onPurge: (item) => ask({ title: `Purger job/${item.name} ?`, target: `job/${item.name}`, impact: 'Le job terminé est supprimé ; ses pods sont nettoyés.', okLabel: 'Purger', tone: 'danger', run: runAction({ famille: 'k8s', action: 'purge', name: item.name }) }),
          onClose: () => setResourcesOpen(false),
        }) : null,
        confirm ? h(ConfirmModal, { confirm, busy, onClose: () => setConfirm(null), onConfirm: runConfirm }) : null,
        h(Toast, { message: toast }))
    }

    const module = { exports: {} }
    const exports = module.exports

    exports.apply = function apply(ctx) {
      ctx.effect(() => {
        const style = document.createElement('style')
        style.dataset.plugin = 'dsh-monitor'
        style.textContent = CSS
        document.head.append(style)
        return () => style.remove()
      }, 'dsh-monitor: styles')

      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist',
        id: 'systeme',
        order: -100,
        label: 'Système',
      }, SystemeGlyph))

      ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main',
        key: 'systeme',
        inject: () => ({ services: { getService: (name) => ctx.get(name) }, jobs: ctx.get('jobs') }),
      }, SystemePanel))
    }

    exports.inject = ['slots']

    return module.exports
  },
})
