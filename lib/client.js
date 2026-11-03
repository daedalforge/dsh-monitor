window.__ModuleLoader__.load({
  id: '@daedalforge/dsh-monitor',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } = React

    const CSS = `.dsh-systeme.dsh-scope{position:fixed;inset:0;padding:0;height:auto;overflow:visible;pointer-events:none;z-index:90}
.dsh-systeme.dsh-scope>*{pointer-events:auto}

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
.dsh-systeme .dsh-tabs,.dsh-kube .dsh-tabs{display:inline-flex;gap:2px;padding:2px;border-radius:9px;background:var(--b1);border:1px solid var(--b2)}
.dsh-systeme .dsh-tabs button,.dsh-kube .dsh-tabs button{appearance:none;border:0;background:transparent;color:var(--tx3);font:inherit;font-size:12.5px;font-weight:600;padding:5px 13px;border-radius:7px;cursor:pointer;display:inline-flex;align-items:center;gap:5px}
.dsh-systeme .dsh-tabs button:hover,.dsh-kube .dsh-tabs button:hover{color:var(--tx)}
.dsh-systeme .dsh-tabs button.on,.dsh-kube .dsh-tabs button.on{background:rgba(245,137,58,.18);color:var(--brand-text)}
.dsh-systeme .phead .dsh-tabs{margin-bottom:7px}
.dsh-kube .kv-head .dsh-tabs{margin-bottom:2px}
.dsh-kube .kv-pick{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;color:var(--tx3)}
.dsh-kube .kv-pick select{background:var(--b1);border:1px solid var(--b2);border-radius:7px;color:var(--tx);font:inherit;font-size:12px;padding:4px 8px;max-width:220px}
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
.dsh-systeme .sysstats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}
.dsh-systeme .sysrow2{display:grid;grid-template-columns:1.35fr 1fr;gap:12px}
  .dsh-systeme .sysrow2.solo{grid-template-columns:1fr}
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
.dsh-systeme .kpick{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:8px;font-size:12px;color:var(--tx3)}
.dsh-systeme .kpick select{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:var(--tx1);border-radius:5px;padding:4px 7px;font:inherit;font-size:12px;max-width:60%}
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
.dsh-systeme .pill{display:inline-flex;align-items:center;gap:5px;border:1px solid rgba(255,190,140,.14);border-radius:4px;padding:1px 6px;font-size:10px;color:var(--tx2);white-space:nowrap}
.dsh-systeme .pill.warn{border-color:rgba(230,181,102,.34);color:#e6b566}
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
.dsh-systeme .filters{display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap}
.dsh-systeme .filters select{height:26px;border:1px solid var(--b3);border-radius:4px;background:#241a12;color:var(--tx);font:inherit;font-size:11px;padding:0 6px;max-width:280px}
.dsh-systeme .filters .sum{margin-left:auto;font-size:10.5px;color:var(--tx3);white-space:nowrap}
.dsh-systeme .kgrid{display:grid;grid-template-columns:1fr 1fr;gap:4px 14px;margin-top:9px;flex:none}
.dsh-systeme .kcell{display:flex;align-items:baseline;gap:6px;min-width:0;font-size:10.5px;color:var(--tx3);white-space:nowrap;overflow:hidden}
.dsh-systeme .kcell b{font-size:15px;font-weight:600;color:var(--tx);font-variant-numeric:tabular-nums;line-height:1.15}
.dsh-systeme .kcell b.warn{color:var(--amber)}
.dsh-systeme .kcell b.bad{color:var(--red)}
.dsh-systeme .kcell span{overflow:hidden;text-overflow:ellipsis}
.dsh-systeme .cgauge{display:grid;grid-template-columns:52px 1fr auto;gap:2px 8px;align-items:center;font-size:10.5px;color:var(--tx3);margin-top:4px}
.dsh-systeme .cgauge .track{height:4px;border-radius:2px;background:rgba(255,190,140,.1);overflow:hidden}
.dsh-systeme .cgauge .track i{display:block;height:100%;border-radius:2px;background:var(--brand)}
.dsh-systeme .cgauge .track i.warn{background:var(--amber)}
.dsh-systeme .cgauge .track i.bad{background:var(--red)}
.dsh-systeme .sig{display:flex;align-items:center;gap:7px;height:22px;font-size:11px;color:var(--tx2);min-width:0}
.dsh-systeme .sig .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--tx3);font-size:10px}
.dsh-systeme .sig .cnt{font-size:10.5px;color:var(--tx);font-variant-numeric:tabular-nums}
.dsh-systeme .evt{display:grid;grid-template-columns:auto 1fr auto;gap:7px;align-items:center;min-height:22px;font-size:10.5px;color:var(--tx3);min-width:0}
.dsh-systeme .evt b{font-size:10.5px;font-weight:500;color:var(--tx2);white-space:nowrap}
.dsh-systeme .evt .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-systeme .evt .cnt{color:var(--amber);white-space:nowrap}
.dsh-systeme .kchecks{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:8px;font-size:10.5px;color:var(--tx3);flex:none}
.dsh-systeme .kchecks .k{padding:1px 7px 1px 0;white-space:nowrap}
.dsh-systeme .kchecks .k b{font-weight:500;color:var(--tx2)}
.dsh-systeme .vmbox{border:1px solid rgba(255,190,140,.1);border-radius:6px;padding:9px 11px;margin-bottom:10px;background:rgba(255,255,255,.02)}
.dsh-systeme .vmhead{display:flex;align-items:baseline;gap:8px;font-size:11.5px;color:var(--tx2)}
.dsh-systeme .vmhead b{font-size:12px;color:var(--tx)}
.dsh-systeme .vmhead .di-size{margin-left:auto;color:var(--tx3);font-size:11px;white-space:nowrap}
.dsh-systeme .vmbar{height:5px;border-radius:3px;background:rgba(255,190,140,.1);margin-top:7px;overflow:hidden}
.dsh-systeme .vmbar i{display:block;height:100%;border-radius:3px;background:var(--brand)}
.dsh-systeme .cat{display:grid;grid-template-columns:1fr 92px 128px;gap:10px;align-items:center;height:26px;font-size:11px;color:var(--tx2);border-bottom:1px solid rgba(255,190,140,.05)}
.dsh-systeme .cat b{font-weight:500;color:var(--tx)}
.dsh-systeme .cat span{text-align:right;color:var(--tx3);white-space:nowrap}
.dsh-systeme .cat span.rec{color:var(--amber)}
.dsh-systeme .empty{padding:14px 0;font-size:11px;color:var(--tx3)}
.dsh-systeme .loading{display:flex;align-items:center;justify-content:center;gap:10px;height:240px;color:var(--tx3);font-size:12px}
.dsh-systeme .toast{position:fixed;left:50%;bottom:72px;transform:translateX(-50%) translateY(8px);z-index:120;background:#17120e;border:1px solid var(--b3);border-radius:6px;padding:9px 14px;font-size:12px;color:var(--tx);opacity:0;pointer-events:none;transition:opacity .15s,transform .15s;box-shadow:0 12px 30px rgba(0,0,0,.45);max-width:calc(100vw - 48px)}
.dsh-systeme .toast.on{opacity:1;transform:translateX(-50%) translateY(0)}
@media (max-width:1100px){
  .dsh-systeme .sysstats{grid-template-columns:repeat(2,1fr)}
  .dsh-systeme .sysrow2{grid-template-columns:1fr}
}
@media (max-width:720px){
  .dsh-systeme{padding:12px 14px 24px}
  .dsh-systeme .sysstats{grid-template-columns:1fr}
  .dsh-systeme .srow{grid-template-columns:92px minmax(0,1fr) minmax(64px,auto) 14px}
  .dsh-systeme .phead{flex-wrap:wrap}
  .dsh-systeme .phead .pactions{margin-left:0}
  .dsh-systeme .dtab th:nth-child(2),.dsh-systeme .dtab td:nth-child(2){display:none}
  .dsh-systeme .thr{grid-template-columns:1fr 80px 80px}
}
.syscfg{display:flex;flex-direction:column;gap:14px;max-width:560px;font:13px/1.45 inherit}
.syscfg-intro,.syscfg-note{margin:0;font-size:12px;color:#8a8a8a}
.syscfg-section{display:flex;flex-direction:column;gap:10px;margin:0;padding:12px 14px;border:1px solid rgba(255,190,140,.16);border-radius:6px}
.syscfg-title{padding:0 6px;font-size:12px;font-weight:600;letter-spacing:.02em;color:#f5b98a}
.syscfg-field{display:flex;flex-direction:column;gap:4px}
.syscfg-toggle{display:flex;align-items:center;gap:10px;padding:0;border:0;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer}
.syscfg-toggle:disabled{cursor:default;opacity:.55}
.syscfg-switch{position:relative;flex:0 0 auto;width:34px;height:18px;border-radius:9px;background:rgba(255,190,140,.2);transition:background .15s}
.syscfg-switch.on{background:#f5893a}
.syscfg-switch-thumb{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#f7ece2;transition:transform .15s}
.syscfg-switch.on .syscfg-switch-thumb{transform:translateX(16px)}
.syscfg-toggle-text{display:flex;flex-direction:column;gap:2px}
.syscfg-label{font-size:12px;font-weight:600}
.syscfg-input{height:30px;padding:0 9px;border-radius:4px;border:1px solid rgba(255,190,140,.2);background:rgba(255,190,140,.05);color:inherit;font:inherit}
.syscfg-input:focus{outline:none;border-color:#f5893a}
.syscfg-hint{font-size:11px;color:#8a8a8a}
.syscfg-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.syscfg-btn{height:28px;padding:0 12px;border-radius:4px;border:1px solid #f5893a;background:#f5893a;color:#1c1005;font:600 12px/1 inherit;cursor:pointer}
.syscfg-btn:disabled{opacity:.45;cursor:default}
.syscfg-btn.ghost{background:transparent;color:inherit;border-color:rgba(255,190,140,.24);font-weight:400}
.syscfg-msg{font-size:11px;color:#8a8a8a}
.syscfg-summary{font-size:12px}
.dsh-kube{--b1:rgba(255,190,140,.08);--b2:rgba(255,190,140,.12);--b3:rgba(255,190,140,.16);--k1:rgba(255,190,140,.14);--brand:#f5893a;--brand-text:#ffb377;--link:#ffa258;--on:#1c1005;--tx:#f8f9fa;--tx2:#cac9ca;--tx3:#9c9c9c;--green:#4ade80;--red:#f87171;--warn:#e6b566;position:relative;height:100%;overflow-y:auto;padding:16px 26px 28px;color:var(--tx);font:13px/1.45 inherit;box-sizing:border-box}
.dsh-kube *{box-sizing:border-box}
.dsh-kube h2,.dsh-kube h3,.dsh-kube h4,.dsh-kube p{margin:0}
.dsh-kube button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
.dsh-kube .dot{width:7px;height:7px;border-radius:50%;display:inline-block;flex:none}
.dsh-kube .d-green{background:var(--green)}.dsh-kube .d-red{background:var(--red)}.dsh-kube .d-amber{background:var(--warn)}.dsh-kube .d-grey{background:#8a8a8a}.dsh-kube .d-purple{background:#8a6bd8}
.dsh-kube .mono{font-family:ui-monospace,"SF Mono",Menlo,monospace}
.dsh-kube .live-pill{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 8px;border:1px solid rgba(74,222,128,.3);border-radius:12px;font-size:10.5px;color:#8fe3a8;background:rgba(74,222,128,.08);white-space:nowrap}
.dsh-kube .live-pill.off{border-color:rgba(248,113,113,.34);color:#ff9b9b;background:rgba(248,113,113,.07)}
.dsh-kube .state-pill{display:inline-flex;align-items:center;gap:5px;height:20px;padding:0 7px;border-radius:10px;font-size:10px;border:1px solid var(--k1);color:var(--tx2);white-space:nowrap}
.dsh-kube .state-pill.ok{border-color:rgba(74,222,128,.28);color:#8fe3a8;background:rgba(74,222,128,.06)}
.dsh-kube .state-pill.warn{border-color:rgba(230,181,102,.3);color:var(--warn);background:rgba(230,181,102,.06)}
.dsh-kube .state-pill.bad{border-color:rgba(248,113,113,.3);color:#ff9b9b;background:rgba(248,113,113,.06)}
.dsh-kube .iconbtn{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:5px;color:var(--tx3)}
.dsh-kube .iconbtn:hover{background:rgba(255,190,140,.08);color:var(--tx)}
.dsh-kube .errbar{display:flex;align-items:center;gap:10px;margin-top:8px;padding:8px 11px;border:1px solid rgba(248,113,113,.28);background:rgba(248,113,113,.06);border-radius:6px;font-size:11.5px;color:#ff9b9b}
.dsh-kube .loading{display:flex;align-items:center;justify-content:center;height:240px;color:var(--tx3);font-size:12px}
.dsh-kube .grow{flex:1}
.dsh-kube .kv-btn{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 9px;border:1px solid var(--k1);border-radius:5px;font-size:10.8px;color:var(--tx2);white-space:nowrap;background:rgba(255,190,140,.03)}
.dsh-kube .kv-btn:hover{border-color:var(--b3);color:var(--tx)}
.dsh-kube .kv-btn:disabled{opacity:.55;cursor:default}
.dsh-kube .kv-btn.primary{border-color:rgba(255,162,88,.30);background:rgba(245,137,58,.10);color:var(--brand-text)}
.dsh-kube .kv-btn.primary:hover{background:rgba(245,137,58,.16)}
.dsh-kube .kv-head{display:flex;align-items:flex-start;gap:14px}
.dsh-kube .kv-title{font-size:17px;font-weight:600;display:flex;align-items:center;gap:9px}
.dsh-kube .kv-sub{font-size:11.5px;color:var(--tx3);margin-top:4px}
.dsh-kube .kv-actions{margin-left:auto;display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.dsh-kube .kv-banner{margin-top:11px;border:1px solid rgba(230,181,102,.30);background:linear-gradient(90deg,rgba(230,181,102,.10),rgba(230,181,102,.03));border-radius:8px;padding:9px 11px;display:flex;gap:10px;align-items:flex-start}
.dsh-kube .kv-banner.bad{border-color:rgba(248,113,113,.32);background:linear-gradient(90deg,rgba(248,113,113,.11),rgba(248,113,113,.03))}
.dsh-kube .kv-banner.ok{border-color:rgba(74,222,128,.26);background:linear-gradient(90deg,rgba(74,222,128,.09),rgba(74,222,128,.02))}
.dsh-kube .kv-bicon{width:26px;height:26px;border-radius:7px;display:flex;align-items:center;justify-content:center;flex:none;background:rgba(230,181,102,.14);color:var(--warn)}
.dsh-kube .kv-banner.bad .kv-bicon{background:rgba(248,113,113,.13);color:#ff9b9b}
.dsh-kube .kv-banner.ok .kv-bicon{background:rgba(74,222,128,.12);color:#8fe3a8}
.dsh-kube .kv-btitle{font-size:12.6px;font-weight:600}
.dsh-kube .kv-btext{font-size:11.4px;color:var(--tx2);margin-top:2px;line-height:1.45}
.dsh-kube .kv-bactions{margin-left:auto;display:flex;gap:6px;align-items:center;flex:none}
.dsh-kube .kv-kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px;margin-top:9px}
.dsh-kube .kv-kpi{border:1px solid var(--k1);border-radius:8px;background:rgba(24,16,11,.72);padding:7px 9px 9px;display:flex;flex-direction:column;min-width:0}
.dsh-kube .kv-kpi .l{font-size:9.2px;letter-spacing:.08em;text-transform:uppercase;color:var(--tx3);display:flex;align-items:center;gap:5px;white-space:nowrap;overflow:hidden}
.dsh-kube .kv-kpi .v{font-size:21px;font-weight:600;margin-top:3px;display:flex;align-items:baseline;gap:5px;font-variant-numeric:tabular-nums;line-height:1.15}
.dsh-kube .kv-kpi .v small{font-size:10.5px;color:var(--tx3);font-weight:400;white-space:nowrap}
.dsh-kube .kv-kpi.bad .v{color:#ff9b9b}
.dsh-kube .kv-kpi .d{font-size:9.8px;color:var(--tx3);margin-top:2px;line-height:1.35;min-height:26px}
.dsh-kube .kv-kpi .bar{margin-top:5px;height:3px;border-radius:2px;background:rgba(255,255,255,.07);display:flex;overflow:hidden;gap:2px}
.dsh-kube .kv-kpi .bar i{height:100%;border-radius:2px;background:var(--green)}
.dsh-kube .kv-kpi .bar i.warn{background:var(--warn)}.dsh-kube .kv-kpi .bar i.bad{background:var(--red)}.dsh-kube .kv-kpi .bar i.off{background:#6d6d6d}
.dsh-kube .kv-body{display:grid;grid-template-columns:minmax(0,1.57fr) minmax(0,1fr);gap:9px;margin-top:9px;align-items:start}
.dsh-kube .kv-col{display:flex;flex-direction:column;gap:9px;min-width:0}
.dsh-kube .kv-card{border:1px solid var(--k1);border-radius:10px;background:rgba(24,16,11,.72);padding:9px 11px 10px;min-width:0}
.dsh-kube .kv-chead{display:flex;align-items:center;gap:7px;margin-bottom:7px}
.dsh-kube .kv-chead .ic{width:21px;height:21px;border-radius:6px;background:rgba(245,137,58,.10);border:1px solid rgba(245,137,58,.16);display:flex;align-items:center;justify-content:center;color:var(--brand-text);flex:none}
.dsh-kube .kv-chead h3{font-size:12.4px;font-weight:600;display:flex;align-items:center;gap:7px}
.dsh-kube .kv-chead .n{font-size:9.2px;color:var(--tx3);border:1px solid var(--k1);border-radius:9px;padding:1px 6px;font-weight:400}
.dsh-kube .kv-chead .r{margin-left:auto;font-size:10px;color:var(--tx3);display:flex;gap:6px;align-items:center;white-space:nowrap}
.dsh-kube .kv-cause{display:grid;grid-template-columns:24px 1fr auto;gap:8px;padding:8px 0;border-top:1px solid rgba(255,190,140,.08);align-items:start}
.dsh-kube .kv-cause:first-of-type{border-top:0;padding-top:0}
.dsh-kube .kv-cause .ci{width:23px;height:23px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.26);color:#ff9b9b;flex:none}
.dsh-kube .kv-cause.warn .ci{background:rgba(230,181,102,.07);border-color:rgba(230,181,102,.26);color:var(--warn)}
.dsh-kube .kv-cause .t{font-size:11.8px;font-weight:600;line-height:1.3}
.dsh-kube .kv-cause .d{font-size:10.4px;color:var(--tx3);line-height:1.42;margin-top:2px}
.dsh-kube .kv-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.dsh-kube .kv-chip{font-size:9.2px;border:1px solid var(--k1);border-radius:4px;padding:1px 5px;color:var(--tx2);white-space:nowrap}
.dsh-kube .kv-chip.bad{color:#ff9b9b;border-color:rgba(248,113,113,.28);background:rgba(248,113,113,.06)}
.dsh-kube .kv-chip.ok{color:#8fe3a8;border-color:rgba(74,222,128,.24);background:rgba(74,222,128,.05)}
.dsh-kube .kv-view{height:23px;padding:0 8px;border:1px solid rgba(255,162,88,.26);border-radius:5px;background:rgba(245,137,58,.06);color:var(--link);font-size:10.2px;white-space:nowrap;align-self:start}
.dsh-kube .kv-view:hover{background:rgba(245,137,58,.12)}
.dsh-kube .kv-topo{display:flex;gap:7px;align-items:stretch}
.dsh-kube .kv-machine{width:158px;flex:none}
.dsh-kube .kv-cluster{flex:1;min-width:0;overflow:hidden}
.dsh-kube .kv-ingress{width:180px;flex:none;min-width:0;overflow:hidden}
.dsh-kube .kv-box{border:1px solid var(--k1);border-radius:7px;background:rgba(20,14,9,.5);padding:6px 7px;display:flex;flex-direction:column;gap:3px;min-width:0}
.dsh-kube .kv-box .h{display:flex;align-items:center;gap:5px;font-size:10.6px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsh-kube .kv-box .s{font-size:9.2px;color:var(--tx3);line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsh-kube .kv-arrow{display:flex;align-items:center;color:var(--tx3);width:9px;flex:none;justify-content:center;font-size:13px}
.dsh-kube .kv-node{display:flex;align-items:center;gap:6px;border:1px solid rgba(255,190,140,.16);border-radius:6px;padding:4px 6px;background:rgba(255,190,140,.05);font-size:10px;white-space:nowrap;overflow:hidden}
.dsh-kube .kv-node b{font-weight:600;font-size:10.2px;overflow:hidden;text-overflow:ellipsis}
.dsh-kube .kv-groups{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:4px}
.dsh-kube .kv-group{border:1px solid rgba(255,190,140,.12);border-radius:6px;padding:4px 6px;background:rgba(20,14,9,.45);min-width:0;overflow:hidden}
.dsh-kube .kv-group.bad{border-color:rgba(248,113,113,.24)}
.dsh-kube .kv-group .g{display:flex;align-items:center;gap:4px;font-size:9.8px;font-weight:600;white-space:nowrap}
.dsh-kube .kv-group .g .n{margin-left:auto;font-size:8.8px;color:var(--tx3);font-weight:400}
.dsh-kube .kv-group .s{font-size:8.8px;color:var(--tx3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsh-kube .kv-dots{display:flex;flex-wrap:wrap;gap:2px;margin-top:3px;max-height:20px;overflow:hidden}
.dsh-kube .kv-dots i{width:5px;height:5px;border-radius:50%;background:rgba(74,222,128,.78)}
.dsh-kube .kv-dots i.warn{background:var(--warn)}.dsh-kube .kv-dots i.bad{background:var(--red)}.dsh-kube .kv-dots i.done{background:#6d6d6d}
.dsh-kube .kv-url{display:flex;align-items:center;gap:5px;font-size:9.2px;color:var(--tx2);font-family:ui-monospace,"SF Mono",Menlo,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-top:1px solid rgba(255,190,140,.06);padding-top:3px;margin-top:2px}
.dsh-kube .kv-url .dot{width:4px;height:4px;background:var(--green);margin:0;border-radius:50%}
.dsh-kube .kv-legend{display:flex;align-items:center;gap:10px;font-size:9.4px;color:var(--tx3);margin-top:6px;flex-wrap:wrap}
.dsh-kube .kv-legend span{display:inline-flex;align-items:center;gap:4px}
.dsh-kube .kv-dot{width:5px;height:5px;border-radius:50%;background:var(--green);display:inline-block}
.dsh-kube .kv-dot.warn{background:var(--warn)}.dsh-kube .kv-dot.bad{background:var(--red)}.dsh-kube .kv-dot.done{background:#6d6d6d}
.dsh-kube .kv-tools{display:flex;gap:5px;align-items:center;margin-bottom:6px;flex-wrap:wrap}
.dsh-kube .kv-filter{height:21px;border:1px solid var(--k1);border-radius:5px;padding:0 7px;font-size:10px;color:var(--tx2);display:inline-flex;align-items:center;gap:5px}
.dsh-kube .kv-filter.on{color:var(--tx);border-color:var(--b3);background:rgba(255,190,140,.06)}
.dsh-kube .kv-filter .n{font-size:8.8px;color:var(--tx3)}
.dsh-kube .kv-search{margin-left:auto;height:21px;width:150px;border:1px solid var(--k1);border-radius:5px;background:rgba(31,20,13,.55);color:var(--tx2);font:inherit;font-size:10px;padding:0 8px}
.dsh-kube .kv-search:focus{outline:none;border-color:var(--b3)}
.dsh-kube .kv-table{width:100%;border-collapse:collapse;font-size:11.2px;table-layout:fixed}
.dsh-kube .kv-table th{font-size:9px;letter-spacing:.07em;text-transform:uppercase;color:var(--tx3);font-weight:500;text-align:left;padding:0 5px 4px;border-bottom:1px solid rgba(255,190,140,.10);white-space:nowrap}
.dsh-kube .kv-table td{padding:0 5px;height:28px;border-bottom:1px solid rgba(255,190,140,.05);vertical-align:middle;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsh-kube .kv-table tbody tr{cursor:pointer}
.dsh-kube .kv-table tbody tr:hover td{background:rgba(245,137,58,.045)}
.dsh-kube .kv-ns{display:flex;align-items:center;gap:5px;font-weight:600;font-size:11.4px;overflow:hidden}
.dsh-kube .kv-ns .sub{font-size:8.8px;color:var(--tx3);font-weight:400;white-space:nowrap}
.dsh-kube .kv-dom{font-size:8.8px;border:1px solid var(--k1);border-radius:4px;padding:1px 5px;color:var(--tx2);white-space:nowrap}
.dsh-kube .kv-dom.app{color:#ffc79b;border-color:rgba(245,137,58,.28);background:rgba(245,137,58,.06)}
.dsh-kube .kv-dom.data{color:#a9c8ff;border-color:rgba(91,127,214,.32);background:rgba(91,127,214,.07)}
.dsh-kube .kv-dom.obs{color:#8fe3a8;border-color:rgba(74,222,128,.24);background:rgba(74,222,128,.05)}
.dsh-kube .kv-dom.platform{color:#b9a6ef;border-color:rgba(138,107,216,.30);background:rgba(138,107,216,.07)}
.dsh-kube .kv-num{font-variant-numeric:tabular-nums;display:inline-flex;align-items:baseline;gap:4px;max-width:100%;overflow:hidden}
.dsh-kube .kv-num b{font-weight:600}
.dsh-kube .kv-num .s{font-size:9px;color:var(--tx3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsh-kube .kv-bad{color:#ff9b9b}.dsh-kube .kv-warn{color:var(--warn)}.dsh-kube .kv-ok{color:#8fe3a8}.dsh-kube .kv-dim{color:var(--tx3)}
.dsh-kube .kv-empty{font-size:9.4px;color:var(--tx3);padding:4px 0;line-height:1.45}
.dsh-kube .kv-empty a{color:var(--link);text-decoration:none}
.dsh-kube .kv-cap{display:flex;flex-direction:column;gap:6px}
.dsh-kube .kv-caprow .l{display:flex;justify-content:space-between;gap:8px;font-size:10.4px;color:var(--tx2);margin-bottom:2px}
.dsh-kube .kv-caprow .l b{color:var(--tx);font-weight:600;font-size:10.4px}
.dsh-kube .kv-bar2{height:4px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden}
.dsh-kube .kv-bar2 i{display:block;height:100%;background:var(--green);border-radius:3px}
.dsh-kube .kv-bar2 i.warn{background:var(--warn)}.dsh-kube .kv-bar2 i.bad{background:var(--red)}
.dsh-kube .kv-note{font-size:9.8px;color:var(--tx3);line-height:1.42;display:flex;gap:6px;margin-top:7px;border-top:1px solid rgba(255,190,140,.06);padding-top:6px}
.dsh-kube .kv-note svg{flex:none;margin-top:1px}
.dsh-kube .kv-comp{display:flex;align-items:center;gap:6px;height:22px;font-size:10.6px;color:var(--tx2);border-top:1px solid rgba(255,190,140,.05);min-width:0}
.dsh-kube .kv-comp:first-of-type{border-top:0}
.dsh-kube .kv-comp span:not(.v){white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsh-kube .kv-comp .v{margin-left:auto;font-size:9.6px;color:var(--tx3);display:flex;align-items:center;gap:5px;white-space:nowrap}
.dsh-kube .kv-act{display:grid;grid-template-columns:19px 1fr auto;gap:7px;padding:5px 0;border-top:1px solid rgba(255,190,140,.05);align-items:center}
.dsh-kube .kv-act:first-of-type{border-top:0;padding-top:0}
.dsh-kube .kv-act .ai{width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.035);border:1px solid rgba(255,190,140,.12)}
.dsh-kube .kv-act .t{font-size:10.6px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-kube .kv-act .m{font-size:9.2px;color:var(--tx3);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-kube .kv-act .tm{font-size:9.2px;color:var(--tx3);white-space:nowrap;text-align:right}
.dsh-kube .kv-act.red .ai{color:#ff9b9b;border-color:rgba(248,113,113,.30);background:rgba(248,113,113,.08)}
.dsh-kube .kv-act.warn .ai{color:var(--warn);border-color:rgba(230,181,102,.28);background:rgba(230,181,102,.07)}
.dsh-kube .kv-act.ok .ai{color:#8fe3a8;border-color:rgba(74,222,128,.26);background:rgba(74,222,128,.06)}
.dsh-kube .kv-act.purple .ai{color:#b9a6ef;border-color:rgba(138,107,216,.30);background:rgba(138,107,216,.08)}
.dsh-kube .kv-callout{display:flex;gap:7px;border:1px solid rgba(245,137,58,.18);background:rgba(245,137,58,.05);border-radius:7px;padding:7px 9px;font-size:10.2px;line-height:1.45;color:var(--tx2)}
.dsh-kube .kv-callout svg{flex:none;margin-top:1px;color:var(--brand-text)}
.dsh-kube .kv-callout b{color:var(--tx);font-weight:600}
.dsh-kube .kv-glossbtn{margin-top:7px;display:flex;align-items:center;gap:6px;height:26px;border:1px solid rgba(255,162,88,.26);border-radius:5px;background:rgba(245,137,58,.06);padding:0 8px;font-size:10.4px;color:var(--link);width:100%}
.dsh-kube .kv-glossbtn .n{margin-left:auto;font-size:8.8px;color:var(--tx3)}
.dsh-kube .kv-foot{display:flex;align-items:center;gap:9px;font-size:9.8px;color:var(--tx3);padding-top:8px;flex-wrap:wrap}
.dsh-kube .kv-foot .r{margin-left:auto;display:flex;gap:12px;flex-wrap:wrap}
.dsh-kube .kv-overlay{position:fixed;inset:0;z-index:90;background:rgba(4,2,1,.6);backdrop-filter:blur(2px);display:flex}
.dsh-kube .kv-overlay.right{justify-content:flex-end}
.dsh-kube .kv-overlay.center{align-items:center;justify-content:center;padding:24px}
.dsh-kube .kv-sheet{width:min(860px,94vw);height:100%;background:#0d0906;border-left:1px solid var(--b3);box-shadow:-30px 0 80px rgba(0,0,0,.5);padding:13px 18px 11px;display:flex;flex-direction:column;overflow:hidden}
.dsh-kube .kv-sheet-head{display:flex;align-items:center;gap:5px;font-size:9.8px;color:var(--tx3);flex:none}
.dsh-kube .kv-sheet-head .x{margin-left:auto}
.dsh-kube .kv-sheet-title{display:flex;align-items:center;gap:8px;margin-top:7px;flex:none}
.dsh-kube .kv-sheet-title h2{margin:0;font-size:18px;font-weight:600}
.dsh-kube .kv-sheet-sub{font-size:10.2px;color:var(--tx3);margin-top:3px;flex:none}
.dsh-kube .kv-sheet-body{overflow-y:auto;margin-top:5px;min-height:0;flex:1;padding-right:2px}
.dsh-kube .kv-sec{margin-top:9px}
.dsh-kube .kv-sec h4{margin:0 0 4px;font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);font-weight:500;display:flex;align-items:center;gap:6px}
.dsh-kube .kv-sec h4 .n{text-transform:none;letter-spacing:0;color:var(--tx3);font-size:9px}
.dsh-kube .kv-sec h4 .r{margin-left:auto;text-transform:none;letter-spacing:0;font-size:9.6px;color:var(--link)}
.dsh-kube .kv-dtab{width:100%;border-collapse:collapse;font-size:10.6px;table-layout:fixed}
.dsh-kube .kv-dtab th{font-size:8.8px;letter-spacing:.07em;text-transform:uppercase;color:var(--tx3);font-weight:500;text-align:left;padding:0 5px 3px;border-bottom:1px solid rgba(255,190,140,.10)}
.dsh-kube .kv-dtab td{padding:0 5px;height:25px;border-bottom:1px solid rgba(255,190,140,.05);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsh-kube .kv-dtab .wrk{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:9.8px;color:var(--tx2)}
.dsh-kube .kv-watch{display:flex;align-items:center;gap:7px;border:1px solid rgba(248,113,113,.20);background:rgba(248,113,113,.05);border-radius:6px;padding:5px 8px;margin-top:4px;font-size:10.2px;min-width:0}
.dsh-kube .kv-watch .g{margin-left:auto;height:21px}
.dsh-kube .kv-kmodal{width:min(700px,94vw);max-height:86vh;border-radius:10px;border:1px solid var(--b3);background:#17120e;box-shadow:0 30px 80px rgba(0,0,0,.62);display:flex;flex-direction:column;overflow:hidden}
.dsh-kube .kv-kmodal.gloss{width:min(920px,94vw)}
.dsh-kube .kv-kmodal .head{height:44px;display:flex;align-items:center;gap:9px;padding:0 14px;border-bottom:1px solid var(--b1);flex:none}
.dsh-kube .kv-kmodal .head b{font-size:12.4px}
.dsh-kube .kv-kmodal .head .sub{font-size:9.4px;color:var(--tx3)}
.dsh-kube .kv-kmodal .head .x{margin-left:auto}
.dsh-kube .kv-kmodal .body{padding:12px 14px;overflow-y:auto}
.dsh-kube .kv-kmodal .foot{padding:8px 14px;border-top:1px solid var(--b1);display:flex;align-items:center;gap:6px;flex:none}
.dsh-kube .kv-kmodal .foot .l{font-size:9.2px;color:var(--tx3);margin-right:auto}
.dsh-kube .kv-mrow{display:grid;grid-template-columns:104px 1fr;gap:8px;padding:5px 0;border-top:1px solid rgba(255,190,140,.06);font-size:10.4px;line-height:1.45}
.dsh-kube .kv-mrow:first-child{border-top:0}
.dsh-kube .kv-mrow .l{color:var(--tx3);font-size:9.2px}
.dsh-kube .kv-warnbox{border:1px solid rgba(230,181,102,.28);background:rgba(230,181,102,.06);border-radius:7px;padding:8px 10px;font-size:10.4px;line-height:1.5;color:var(--tx2);display:flex;gap:8px}
.dsh-kube .kv-warnbox svg{flex:none;margin-top:1px;color:var(--warn)}
.dsh-kube .kv-terms{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}
.dsh-kube .kv-term{border:1px solid rgba(255,190,140,.12);border-radius:8px;background:rgba(255,190,140,.028);padding:7px 9px;display:grid;grid-template-columns:21px 1fr;gap:7px}
.dsh-kube .kv-term .ti{width:19px;height:19px;border-radius:5px;background:rgba(245,137,58,.09);border:1px solid rgba(245,137,58,.16);display:flex;align-items:center;justify-content:center;color:var(--brand-text)}
.dsh-kube .kv-term b{font-size:10.6px;font-weight:600;display:block}
.dsh-kube .kv-term p{margin:1px 0 0;font-size:9.6px;line-height:1.45;color:var(--tx3)}
.dsh-kube .kv-intro{font-size:10.4px;color:var(--tx3);line-height:1.5}
.dsh-kube .kv-intro b{color:var(--tx2);font-weight:500}
@media (max-width:1240px){.dsh-kube .kv-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:980px){.dsh-kube .kv-body{grid-template-columns:1fr}.dsh-kube .kv-topo{flex-wrap:wrap}.dsh-kube .kv-machine,.dsh-kube .kv-ingress{width:100%}.dsh-kube{padding:12px 14px 22px}}
`
    const GIT_CSS = `.dsh-systeme .git-banner{display:flex;align-items:flex-start;gap:11px;margin-top:12px;padding:12px 14px;border:1px solid rgba(255,190,140,.14);border-radius:10px;background:linear-gradient(180deg,rgba(245,137,58,.06),rgba(24,16,11,.72));flex-wrap:wrap}
.dsh-systeme .git-banner .bi{width:26px;height:26px;border-radius:7px;border:1px solid rgba(245,137,58,.2);background:rgba(245,137,58,.08);display:flex;align-items:center;justify-content:center;color:var(--brand-text);flex:none}
.dsh-systeme .git-banner .bt{font-size:12.5px;color:var(--tx)}
.dsh-systeme .git-banner .bs{font-size:11.5px;color:var(--tx3);margin-top:2px;line-height:1.5}
.dsh-systeme .git-banner .ba{margin-left:auto;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.dsh-systeme .git-kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin-top:12px}
.dsh-systeme .git-kpi{border:1px solid rgba(255,190,140,.14);border-radius:10px;background:rgba(24,16,11,.72);padding:11px 13px;display:flex;flex-direction:column;gap:3px;min-width:0;position:relative}
.dsh-systeme .git-kpi .l{display:flex;align-items:center;gap:5px;font-size:9.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--tx3);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsh-systeme .git-kpi .l svg{flex:none;opacity:.8}
.dsh-systeme .git-kpi .v{font-size:23px;font-weight:600;line-height:1.1;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsh-systeme .git-kpi .v small{font-size:11px;font-weight:400;color:var(--tx3);margin-left:5px;letter-spacing:0}
.dsh-systeme .git-kpi .d{font-size:10.5px;color:var(--tx3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsh-systeme .git-kpi .bar{height:4px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden;display:flex;margin-top:4px}
.dsh-systeme .git-kpi .bar i{display:block;height:100%}
.dsh-systeme .git-kpi.bad{border-color:rgba(248,113,113,.34);background:linear-gradient(180deg,rgba(74,26,26,.9),rgba(28,14,12,.95))}
.dsh-systeme .git-kpi.bad .v{color:#ff9b9b}
.dsh-systeme .git-kpi.warn{border-color:rgba(230,181,102,.26)}
.dsh-systeme .git-body{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:12px;margin-top:12px;align-items:start}
.dsh-systeme .git-col{display:flex;flex-direction:column;gap:12px;min-width:0}
.dsh-systeme .git-card{border:1px solid rgba(255,190,140,.14);border-radius:10px;background:rgba(24,16,11,.72);padding:13px 15px;display:flex;flex-direction:column;min-width:0}
.dsh-systeme .git-card>.schead{margin-bottom:2px}
.dsh-systeme .git-causes{display:flex;flex-direction:column;gap:0}
.dsh-systeme .git-cause{display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-top:1px solid rgba(255,190,140,.06)}
.dsh-systeme .git-cause:first-child{border-top:0;padding-top:4px}
.dsh-systeme .git-ci{width:25px;height:25px;border-radius:7px;border:1px solid rgba(248,113,113,.24);background:rgba(248,113,113,.07);color:#ffb3b3;display:flex;align-items:center;justify-content:center;flex:none}
.dsh-systeme .git-cause.warn .git-ci{border-color:rgba(230,181,102,.26);background:rgba(230,181,102,.07);color:var(--amber)}
.dsh-systeme .git-cause .ct{font-size:12px;font-weight:600;color:var(--tx);line-height:1.35}
.dsh-systeme .git-cause .cd{font-size:11px;color:var(--tx3);margin-top:2px;line-height:1.5}
.dsh-systeme .git-cause .ce{display:inline-block;margin-top:5px;font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:9.5px;color:var(--tx3);background:rgba(255,255,255,.04);border:1px solid rgba(255,190,140,.1);border-radius:4px;padding:2px 6px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-systeme .git-cause .ca{margin-left:auto;flex:none;font-size:11px;color:var(--link);padding-top:2px}
.dsh-systeme .git-cause .ca:hover{color:var(--brand-text)}
.dsh-systeme .git-filters{display:flex;align-items:center;gap:6px;margin:6px 0 4px;flex-wrap:wrap}
.dsh-systeme .git-chip{height:22px;padding:0 8px;border-radius:5px;border:1px solid rgba(255,190,140,.12);font-size:10.5px;color:var(--tx3);display:inline-flex;align-items:center;gap:5px}
.dsh-systeme .git-chip b{font-weight:500;color:var(--tx2)}
.dsh-systeme .git-chip.on{background:rgba(245,137,58,.15);border-color:rgba(245,137,58,.3);color:var(--brand-text)}
.dsh-systeme .git-chip.on b{color:var(--brand-text)}
.dsh-systeme .git-tablewrap{overflow:auto;max-height:560px;margin-top:2px}
.dsh-systeme .git-table{width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed}
.dsh-systeme .git-table th{position:sticky;top:0;z-index:1;background:#1a130f;text-align:left;font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--tx3);font-weight:500;padding:5px 6px;border-bottom:1px solid rgba(255,190,140,.12);white-space:nowrap}
.dsh-systeme .git-table th:nth-child(1){width:21%}.dsh-systeme .git-table th:nth-child(2){width:19%}.dsh-systeme .git-table th:nth-child(3){width:20%}.dsh-systeme .git-table th:nth-child(4){width:9%}.dsh-systeme .git-table th:nth-child(5){width:16%}.dsh-systeme .git-table th:nth-child(6){width:8%}.dsh-systeme .git-table th:nth-child(7){width:7%}
.dsh-systeme .git-table td{padding:6px;border-bottom:1px solid rgba(255,190,140,.045);color:var(--tx2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsh-systeme .git-table tbody tr{cursor:pointer}
.dsh-systeme .git-table tbody tr:hover td{background:rgba(255,190,140,.035)}
.dsh-systeme .git-table td b{color:var(--tx);font-weight:500}
.dsh-systeme .git-table .mono{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:10px;color:var(--tx3)}
.dsh-systeme .git-table .st{display:inline-flex;align-items:center;gap:5px;max-width:100%;overflow:hidden;text-overflow:ellipsis}
.dsh-systeme .git-table .st.warn{color:var(--amber)}
.dsh-systeme .git-table .st.bad{color:#ff9b9b}
.dsh-systeme .git-table .st.ok{color:var(--tx2)}
.dsh-systeme .git-wt .git-wtrow{display:flex;align-items:center;gap:7px;padding:5px 0;border-top:1px solid rgba(255,190,140,.05);font-size:10.8px;min-width:0}
.dsh-systeme .git-wt .git-wtrow:first-child{border-top:0}
.dsh-systeme .git-wtrow .p{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:10px;color:var(--tx2);overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0}
.dsh-systeme .git-wtrow .b{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:10px;color:var(--tx3);flex:none}
.dsh-systeme .git-wtrow .r{flex:none;font-size:9.8px;color:var(--tx3)}
.dsh-systeme .git-else{margin-top:7px;padding-top:7px;border-top:1px solid rgba(255,190,140,.08);font-size:10.3px;color:var(--tx3);line-height:1.6}
.dsh-systeme .git-else b{color:var(--tx2);font-weight:500}
.dsh-systeme .git-mrow{display:flex;align-items:center;gap:7px;padding:4px 0;border-top:1px solid rgba(255,190,140,.05);font-size:10.8px;min-width:0}
.dsh-systeme .git-mrow:first-child{border-top:0}
.dsh-systeme .git-mid{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:9.5px;color:var(--brand-text);background:rgba(245,137,58,.08);border:1px solid rgba(245,137,58,.16);border-radius:4px;padding:1px 5px;flex:none}
.dsh-systeme .git-mrow .n{color:var(--tx);font-weight:500}
.dsh-systeme .git-mrow .b{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:9.8px;color:var(--tx3);overflow:hidden;text-overflow:ellipsis;min-width:0}
.dsh-systeme .git-mrow .r{margin-left:auto;flex:none;font-size:9.8px;color:var(--tx3)}
.dsh-systeme .git-act .big{display:flex;align-items:baseline;gap:8px;margin-top:6px}
.dsh-systeme .git-act .big b{font-size:25px;font-weight:600;line-height:1}
.dsh-systeme .git-act .big span{font-size:10.5px;color:var(--tx3)}
.dsh-systeme .git-act .arow{display:flex;align-items:center;gap:7px;padding:4px 0;border-top:1px solid rgba(255,190,140,.05);min-width:0}
.dsh-systeme .git-act .arow:first-of-type{border-top:0}
.dsh-systeme .git-act .arow .n{font-size:10.8px;color:var(--tx);white-space:nowrap}
.dsh-systeme .git-act .arow .b{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:9.6px;color:var(--tx3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.dsh-systeme .git-act .arow .t{margin-left:auto;font-size:9.5px;color:var(--tx3);flex:none}
.dsh-systeme .git-quiet{margin-top:7px;padding-top:7px;border-top:1px solid rgba(255,190,140,.07);font-size:10.2px;color:var(--tx3);line-height:1.5}
.dsh-systeme .git-gloss{font-size:10.4px;color:var(--tx3);line-height:1.55}
.dsh-systeme .git-gloss b{color:var(--tx2);font-weight:500}
.dsh-systeme .git-foot{display:flex;align-items:center;gap:14px;margin-top:12px;padding:10px 2px 0;border-top:1px solid rgba(255,190,140,.07);font-size:9.8px;color:var(--tx3);flex-wrap:wrap}
.dsh-systeme .git-foot .r{margin-left:auto;display:flex;gap:14px;flex-wrap:wrap}
.dsh-systeme .git-sheetveil{position:fixed;inset:0;background:rgba(4,2,1,.55);backdrop-filter:blur(2px);z-index:105}
.dsh-systeme .git-sheet{position:fixed;top:0;right:0;bottom:0;width:720px;max-width:94vw;background:#120d0a;border-left:1px solid var(--b3);z-index:106;display:flex;flex-direction:column;box-shadow:-20px 0 60px rgba(0,0,0,.5)}
.dsh-systeme .git-shead{display:flex;align-items:flex-start;gap:10px;padding:16px 20px 12px;border-bottom:1px solid var(--b1);flex:none}
.dsh-systeme .git-shead .hc{min-width:0;flex:1}
.dsh-systeme .git-shead h2{font-size:18px;font-weight:600;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dsh-systeme .git-shead .sub{font-size:10.5px;color:var(--tx3);margin-top:4px;line-height:1.5}
.dsh-systeme .git-sbody{flex:1;overflow-y:auto;padding:12px 20px 20px}
.dsh-systeme .git-sec{margin-top:14px}
.dsh-systeme .git-sec:first-child{margin-top:0}
.dsh-systeme .git-sec-h{display:flex;align-items:center;gap:6px;font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--tx3);font-weight:500;margin-bottom:5px}
.dsh-systeme .git-sec-h .n{font-size:9px;color:var(--tx3);background:rgba(255,255,255,.05);border-radius:8px;padding:1px 6px;letter-spacing:0;text-transform:none}
.dsh-systeme .git-kv{display:grid;grid-template-columns:150px 1fr;gap:8px;padding:3px 0;font-size:10.6px;line-height:1.45}
.dsh-systeme .git-kv span{color:var(--tx3)}
.dsh-systeme .git-kv b{font-weight:500;color:var(--tx2);min-width:0;overflow-wrap:anywhere}
.dsh-systeme .git-kv b.mono{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:10px}
.dsh-systeme .git-kv b.hot{color:#ff9b9b}
.dsh-systeme .git-call{display:flex;gap:8px;padding:8px 10px;border:1px solid rgba(255,190,140,.14);border-radius:7px;background:rgba(245,137,58,.04);font-size:10.6px;line-height:1.5;color:var(--tx2);margin-top:10px}
.dsh-systeme .git-call svg{flex:none;margin-top:1px;color:var(--brand-text)}
.dsh-systeme .git-file{display:flex;align-items:center;gap:7px;padding:3px 0;font-size:10.3px;min-width:0}
.dsh-systeme .git-file .c{width:20px;text-align:center;font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:9px;color:var(--amber);border:1px solid rgba(230,181,102,.25);border-radius:3px;flex:none}
.dsh-systeme .git-file .p{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:9.8px;color:var(--tx2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-systeme .git-commit{display:flex;align-items:center;gap:8px;padding:3px 0;font-size:10.4px;min-width:0}
.dsh-systeme .git-commit .h{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:9.2px;color:var(--brand-text);background:rgba(245,137,58,.08);border:1px solid rgba(245,137,58,.18);border-radius:4px;padding:1px 5px;flex:none}
.dsh-systeme .git-commit .s{color:var(--tx2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1}
.dsh-systeme .git-commit .t{color:var(--tx3);font-size:9.3px;flex:none}
.dsh-systeme .git-code{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:9.6px;line-height:1.6;color:var(--tx2);background:rgba(255,255,255,.035);border:1px solid rgba(255,190,140,.1);border-radius:6px;padding:8px 10px;white-space:pre-wrap;overflow-wrap:anywhere}
.dsh-systeme .git-sfoot{display:flex;align-items:center;gap:8px;padding:10px 20px;border-top:1px solid var(--b1);flex:none;font-size:10px;color:var(--tx3);flex-wrap:wrap}
.dsh-systeme .git-sfoot .r{margin-left:auto;display:flex;gap:7px;flex-wrap:wrap}
.dsh-systeme .git-allgrid{display:grid;grid-template-columns:1fr 1fr;gap:0 26px}
.dsh-systeme .git-allrow{display:flex;align-items:center;gap:7px;width:100%;text-align:left;padding:5px 3px;border-bottom:1px solid rgba(255,190,140,.045);font-size:10.8px;min-width:0}
.dsh-systeme .git-allrow:hover{background:rgba(255,190,140,.035)}
.dsh-systeme .git-allrow .n{font-weight:500;color:var(--tx);white-space:nowrap}
.dsh-systeme .git-allrow .b{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:9.6px;color:var(--tx3);overflow:hidden;text-overflow:ellipsis;min-width:0;flex:1}
.dsh-systeme .git-allrow .s{font-size:9.5px;color:var(--tx3);flex:none}
.dsh-systeme .git-cblock{border:1px solid rgba(255,190,140,.12);border-radius:8px;background:rgba(255,190,140,.02);padding:11px 13px;margin-top:9px}
.dsh-systeme .git-cblock:first-of-type{margin-top:0}
.dsh-systeme .git-cblock .ch{display:flex;align-items:center;gap:7px;font-size:11.6px;font-weight:600}
.dsh-systeme .git-cblock .ch svg{color:var(--brand-text)}
.dsh-systeme .git-cblock p{margin:4px 0 7px;font-size:10.6px;line-height:1.55;color:var(--tx3)}
.dsh-systeme .git-cblock pre{margin:0;font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:9.6px;line-height:1.55;color:var(--tx2);background:rgba(255,255,255,.035);border:1px solid rgba(255,190,140,.1);border-radius:5px;padding:7px 9px;white-space:pre-wrap;overflow-wrap:anywhere}
.dsh-systeme .git-cblock .cp{margin-top:6px;font-size:9.8px;color:var(--tx3)}
.dsh-systeme .git-cblock .cp b{color:var(--tx2);font-weight:500}
.dsh-systeme .git-terms{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
.dsh-systeme .git-term{border:1px solid rgba(255,190,140,.12);border-radius:8px;background:rgba(255,190,140,.025);padding:8px 10px;display:grid;grid-template-columns:22px 1fr;gap:8px}
.dsh-systeme .git-term .ti{width:20px;height:20px;border-radius:5px;background:rgba(245,137,58,.09);border:1px solid rgba(245,137,58,.16);display:flex;align-items:center;justify-content:center;color:var(--brand-text)}
.dsh-systeme .git-term b{font-size:10.6px;font-weight:600;display:block}
.dsh-systeme .git-term p{margin:1px 0 0;font-size:9.7px;line-height:1.45;color:var(--tx3)}
.dsh-systeme .cmodal.xmodal{width:1180px}
@media (max-width:1400px){.dsh-systeme .git-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:1150px){.dsh-systeme .git-body{grid-template-columns:1fr}.dsh-systeme .git-table th:nth-child(6),.dsh-systeme .git-table td:nth-child(6){display:none}}
@media (max-width:760px){.dsh-systeme .git-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.dsh-systeme .git-table th:nth-child(5),.dsh-systeme .git-table td:nth-child(5){display:none}.dsh-systeme .git-banner .ba{margin-left:0}.dsh-systeme .git-sheet{width:100%}}
`
    const PATHS = {
      git: [['circle', { cx: 18, cy: 6, r: 3 }], ['circle', { cx: 6, cy: 18, r: 3 }], ['path', { d: 'M6 3v12M18 9a9 9 0 0 1-9 9' }]],
      layers: [['path', { d: 'M12 2l9 5-9 5-9-5z' }], ['path', { d: 'M3 12l9 5 9-5' }], ['path', { d: 'M3 17l9 5 9-5' }]],
      file: [['path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }], ['path', { d: 'M14 2v6h6' }]],
      folder: [['path', { d: 'M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }]],
      book: [['path', { d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20' }], ['path', { d: 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' }]],
      copy: [['path', { d: 'M8 8h12v12H8z' }], ['path', { d: 'M4 16V4h12' }]],
      lock: [['path', { d: 'M5 11h14v10H5z' }], ['path', { d: 'M8 11V7a4 4 0 0 1 8 0v4' }]],
      info: [['circle', { cx: 12, cy: 12, r: 9 }], ['path', { d: 'M12 11v5M12 8h.01' }]],
      arrow: [['path', { d: 'M5 12h14' }], ['path', { d: 'M13 6l6 6-6 6' }]],
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
      machine: [['path', { d: 'M3 5h18v11H3z' }], ['path', { d: 'M9 20h6M12 16v4' }]],
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

    function Modal({ title, wide, xwide, onClose, children, footer }) {
      return h('div', { className: 'overlay', onClick: (event) => { if (event.target === event.currentTarget) onClose() } },
        h('div', { className: `cmodal ${wide ? 'wmodal' : ''} ${xwide ? 'xmodal' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
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
      const categories = disk?.categories ?? []
      const colima = disk?.colima
      const mount = colima?.docker ?? colima?.root ?? null
      const vmBlock = colima && colima.available !== false
        ? h('div', { className: 'vmbox' },
            h('div', { className: 'vmhead' },
              h('b', {}, 'Disque de Colima'),
              h('span', { className: 'di-size' }, mount ? `${formatBytes(mount.used)} utilisés · ${formatBytes(mount.free)} libres · ${formatBytes(mount.total)}` : colima?.stopped ? 'VM arrêtée' : 'mesure indisponible')),
            mount ? h('div', { className: 'vmbar' }, h('i', { style: { width: `${Math.min(100, Number(mount.percent) || 0)}%` } })) : null,
            h('div', { className: 'di-detail' }, mount ? `${mount.mount} · ${mount.percent} % occupés` : colima?.stopped ? 'La VM est arrêtée : démarrez-la pour mesurer ses systèmes de fichiers' : colima?.error ?? colima?.reason ?? 'colima injoignable'))
        : null
      const categoriesBlock = categories.length
        ? h('div', { className: 'cblock' },
            h('div', { className: 'cap' }, 'Répartition du moteur'),
            categories.map((category) => h('div', { className: 'cat', key: category.id },
              h('b', {}, category.label),
              h('span', {}, formatBytes(category.bytes)),
              h('span', { className: category.reclaimable ? 'rec' : '' }, category.reclaimable ? `${formatBytes(category.reclaimable)} récupérables` : '—'))),
            h('div', { className: 'cnote' }, 'La purge retire images et cache de construction ; les volumes sont conservés.'))
        : disk?.categoriesError
          ? h('div', { className: 'cblock' }, h('div', { className: 'cap' }, 'Répartition Docker'), h('div', { className: 'cnote' }, disk.categoriesError))
          : null
      const body = loading
        ? h('div', { className: 'empty' }, 'Analyse des cibles…')
        : error
          ? h('div', { className: 'errbar' }, h('span', { className: 'grow' }, error))
          : h('div', {}, vmBlock, categoriesBlock,
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

    function K8sResourcesModal({ k8s, onRestart, onDelete, onPurge, onClose }) {
      const [namespace, setNamespace] = useState('')
      const namespaces = k8s?.namespaces ?? []
      const counts = k8s?.counts ?? {}
      const pick = (items) => (items ?? []).filter((item) => !namespace || item.namespace === namespace)
      const row = (item, meta, action, run) => h('div', { className: 'res-row', key: `${item.namespace}/${item.name}` },
        h('span', { className: 'res-name' }, item.name, h('span', { className: 'res-meta' }, `${item.namespace} · ${meta}`)),
        action ? h('span', { className: 'res-actions' }, h('button', { className: 'btn-o btn-sm', onClick: () => run(item) }, action)) : null)
      const group = (title, items, meta, action, run) => h('div', { className: 'res-group' },
        h('h4', {}, `${title} · ${(items ?? []).length}`),
        (items ?? []).length ? items.map((item) => row(item, meta(item), action, run)) : h('div', { className: 'empty' }, 'Aucune ressource.'))
      const pvcs = pick(k8s?.pvcs).filter((claim) => claim.state !== 'ok')
      return h(Modal, { title: k8s?.context ? `Ressources · ${k8s.context}` : 'Ressources', wide: true, onClose },
        h('div', { className: 'filters' },
          h('select', { value: namespace, onChange: (event) => setNamespace(event.target.value) },
            h('option', { value: '' }, `Tous les namespaces (${namespaces.length})`),
            namespaces.map((name) => h('option', { key: name, value: name }, name))),
          h('span', { className: 'sum' }, `${counts.pods?.total ?? 0} pods · ${counts.deployments?.total ?? 0} deployments · ${counts.jobs?.total ?? 0} jobs`)),
        group('Deployments', pick(k8s?.deployments), (item) => `${item.available}/${item.desired} disponibles${item.zero ? ' · vide' : ''}`, 'Redémarrer', onRestart),
        group('Pods', pick(k8s?.pods), (item) => `${item.phase}${item.restarts ? ` · ${item.restarts} restart(s)` : ''}${item.oom ? ' · OOM' : ''}`, 'Supprimer', onDelete),
        group('Jobs', pick(k8s?.jobs), (item) => `${item.succeeded} réussi(s)${item.failed ? ` · ${item.failed} échec(s)` : ''}${item.active ? ` · ${item.active} actif(s)` : ''}`, 'Purger', onPurge),
        group('StatefulSets', pick(k8s?.statefulsets), (item) => `${item.ready}/${item.desired} prêts`),
        group('DaemonSets', pick(k8s?.daemonsets), (item) => `${item.ready}/${item.desired} prêts`),
        group('CronJobs', pick(k8s?.cronjobs), (item) => `${item.schedule}${item.suspended ? ' · suspendu' : ''}`),
        pvcs.length ? group('Volumes non liés', pvcs, (item) => item.phase) : null,
        h('div', { className: 'cnote' }, 'Chaque action est confirmée et journalisée.'),
        h('div', { className: 'cfoot' }, h('button', { className: 'btn-o', onClick: onClose }, 'Fermer')))
    }

    function Toast({ message }) {
      return h('div', { className: `toast ${message ? 'on' : ''}` }, message)
    }

    const CACHE_KEY = 'dsh-monitor:state:v3'
    const REFRESH_FALLBACK_SECONDS = 60
    const REFRESH_MIN_SECONDS = 15
    const REFRESH_MAX_SECONDS = 900

    function refreshMsOf(data) {
      const value = Number(data?.reglages?.refreshSeconds)
      if (!Number.isFinite(value)) return REFRESH_FALLBACK_SECONDS * 1000
      const seconds = Math.min(REFRESH_MAX_SECONDS, Math.max(REFRESH_MIN_SECONDS, Math.round(value)))
      return seconds * 1000
    }

    function cachedState() {
      try {
        const raw = window.localStorage.getItem(CACHE_KEY)
        if (!raw) return null
        const value = JSON.parse(raw)
        if (!value || !value.data || !value.at) return null
        if (!value.data.machine || !value.data.dsh || !value.data.repos || !value.data.k8s) return null
        if (!value.data.k8s.counts || !value.data.k8s.capacity) return null
        return value
      } catch {
        return null
      }
    }

    function MachinePanel(props) {
      const { tab, onTab } = props
      const { state, setState, error, loading, load, loadedAt, now } = useEtat()
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
      const [jobRows, setJobRows] = useState([])
      const toastTimer = useRef(null)
      const sessionId = props.session?.sessionId ?? props.session?.id ?? props.sessionId ?? ''
      const jobs = props.jobs ?? props.services?.getService?.('jobs')

      const showToast = useCallback((message) => {
        setToast(message)
        if (toastTimer.current) clearTimeout(toastTimer.current)
        toastTimer.current = setTimeout(() => setToast(''), 3200)
      }, [])

      useEffect(() => () => {
        if (toastTimer.current) clearTimeout(toastTimer.current)
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
          impact: 'Le job est interrompu. Son état et sa sortie restent dans le journal de la session.',
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
          h('div', { className: 'phead' }, h('div', {}, h(PanelTabs, { tab, onTab, showKubernetes: !state?.k8s?.hidden, showRepos: !state?.repos?.hidden }), h('div', { className: 'sub' }, 'Machine, DSH'))),
          error ? h('div', { className: 'errbar' }, h('span', { className: 'grow' }, `Le serveur ne répond pas : ${error}`), h('button', { className: 'btn-o', onClick: load }, 'Réessayer')) : h('div', { className: 'loading' }, 'Chargement de l’état…'),
          h(Toast, { message: toast }))
      }

      const machine = state.machine
      const dsh = state.dsh
      const diskRow = machine.rows.find((row) => row.id === 'disque')
      const memoryRow = machine.rows.find((row) => row.id === 'memoire')
      const loadRow = machine.rows.find((row) => row.id === 'charge')
      const maxCpu = Math.max(1, ...(machine.cpuHistory ?? [0]))
      const subtitle = 'Machine, DSH'
      const running = state?.version ? ` · v${state.version}` : ''

      return h('div', { className: 'dsh-systeme' },
        h('div', { className: 'phead' },
          h('div', {}, h(PanelTabs, { tab, onTab, showKubernetes: !state?.k8s?.hidden, showRepos: !state?.repos?.hidden }), h('div', { className: 'sub' }, `${subtitle}${running} · rafraîchi ${age}`)),
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
              h('div', { className: 'bar' }, h('i', { style: { width: `${Math.min(100, (Number(machine.load.ratio) || 0) * 100)}%` } })))),
          h('div', { className: 'sysrow2' },
            h(Card, { title: 'Machine', state: machine.state, label: machine.alert, more: { label: 'Libérer de l’espace', onClick: openDisk }, note: h('span', {}, `Seuils : disque ${config.disk.attention} %, RAM ${config.memoire.attention} %, charge ${config.charge.coefAttention}× cœurs. `, h('a', { href: '#', onClick: (event) => { event.preventDefault(); openSettings() } }, 'Réglages')) },
              h('div', { className: 'srows' }, machine.rows.map((row) => h(Row, { key: row.id, row }))),
              h('div', { className: 'cap', style: { marginTop: '9px' } }, 'Processeur · 24 dernières minutes'),
              h('div', { className: 'spark' }, (machine.cpuHistory?.length ? machine.cpuHistory : [0]).map((value, index) => h('i', { key: index, style: { height: `${Math.max(3, Math.round(((Number(value) || 0) / maxCpu) * 24))}px` } }))),
              h('div', { className: 'cap', style: { marginTop: '8px' } }, 'Top processus'),
              (machine.top ?? []).map((processInfo) => h('div', { className: 'proc', key: processInfo.pid },
                h('span', { className: 'grow' }, processInfo.name),
                h('b', {}, `${fmt(processInfo.cpu)} %`),
                processInfo.canKill ? h('button', { className: 'kill', onClick: () => askKill(processInfo), title: 'Arrêter ce processus' }, 'Tuer') : null))),
            h(Card, { title: 'DSH', state: dsh.state, label: dsh.alert, note: 'Sessions, jobs et cache du runtime.' },
              h('div', { className: 'srows' },
                h(Row, { row: { label: 'Sessions actives', value: String(dsh.sessions.count), percent: Math.min(100, dsh.sessions.count * 6), state: 'ok', detail: dsh.sessions.detail } }),
                dsh.cost ? h(Row, { row: { label: 'Coût du jour', value: `${dsh.cost.symbol}${money(dsh.cost.amount)}`, percent: Math.min(100, dsh.cost.amount * 2), state: 'ok', detail: dsh.cost.detail } }) : null,
                h(Row, { row: { label: 'Jobs en cours', value: String(runningJobs.length), percent: runningJobs.length ? 8 : 0, state: runningJobs.length ? 'warn' : 'ok', detail: 'jobs de la session' } }),
                h(Row, { row: { label: 'Erreurs · 24 h', value: String(dsh.errors.count), percent: 0, state: dsh.errors.state, detail: dsh.errors.detail } }),
                h(Row, { row: { label: 'Cache', value: dsh.cache.label, percent: Math.min(100, (dsh.cache.bytes / (1024 ** 3)) * 100), state: 'ok', detail: dsh.cache.detail } })),
              job ? h('div', { className: 'job' }, h(Dot, { state: 'warn' }), h('b', { className: 'mono' }, job.id), h('span', { style: { color: 'var(--tx3)' } }, `${jobAge} min`), h('span', { className: 'grow' }), h('button', { className: 'btn-o btn-sm btn-danger', onClick: askKillJob }, 'Arrêter')) : null,
              h('div', { className: 'cap', style: { marginTop: '9px' } }, 'Sessions actives'),
              h('div', { className: 'slist' }, (dsh.sessions.items ?? []).slice(0, 4).map((item) => h('div', { className: 'sl', key: item.id }, h(Dot, { state: item.active ? 'ok' : 'grey' }), h('b', {}, item.label), h('span', { className: 'tm' }, item.detail)))),
              h('div', { className: 'footlinks' }, h('a', { href: '#', className: 'danger-link', onClick: (event) => { event.preventDefault(); askCache() } }, 'Vider le cache'))))),
        settingsOpen && settingsForm ? h(SettingsModal, { form: settingsForm, saving, onChange: updateSetting, onSave: saveSettings, onClose: () => setSettingsOpen(false) }) : null,
        diskOpen ? h(DiskModal, { disk, loading: diskLoading, error: diskError, selected, onToggle: toggleTarget, onDocker: askDocker, onCache: askCache, onTargets: selectAll, onClose: () => setDiskOpen(false) }) : null,
        confirm ? h(ConfirmModal, { confirm, busy, onClose: () => setConfirm(null), onConfirm: runConfirm }) : null,
        h(Toast, { message: toast }))
    }

    const glossaryFor = (k8s) => {
      const counts = k8s?.counts ?? {}
      const pods = counts.pods ?? {}
      const namespaces = counts.namespaces ?? {}
      const pvcs = counts.pvcs ?? {}
      const routes = counts.routes ?? {}
      const secrets = counts.secrets ?? {}
      const capacity = k8s?.capacity ?? {}
      const stateful = (k8s?.statefulsets ?? []).map((item) => item.name).slice(0, 4).join(', ')
      const daemons = (k8s?.daemonsets ?? []).map((item) => item.name).slice(0, 3).join(', ')
      return [
      { icon: 'box', term: 'Pod', text: `La plus petite unité exécutable : un ou plusieurs conteneurs qui partagent le réseau. ${pods.running ?? 0} pods actifs = autant d’instances en cours d’exécution.` },
      { icon: 'layers', term: 'Deployment', text: 'Décrit combien de pods identiques doivent tourner. 1/1 = un demandé, un prêt. 0/0 = désactivé volontairement, pas une erreur.' },
      { icon: 'layers', term: 'StatefulSet', text: `Comme un Deployment, mais avec une identité et un volume stables.${stateful ? ` C’est le cas de ${stateful}.` : ''}` },
      { icon: 'server', term: 'DaemonSet', text: `Un pod sur chaque nœud.${daemons ? ` Ici : ${daemons}.` : ''}` },
      { icon: 'grid', term: 'Namespace', text: `Cloison logique. ${namespaces.total ?? 0} namespaces, ${namespaces.busy ?? 0} portent des pods, ${Math.max(0, (namespaces.total ?? 0) - (namespaces.busy ?? 0))} sont vides. Un namespace vide n’est pas un namespace en panne.` },
      { icon: 'check', term: 'Prêt (Ready)', text: 'Le pod répond à ses sondes à cet instant. Ce n’est pas une preuve de stabilité : un pod qui redémarre en boucle peut rester prêt entre deux crashes.' },
      { icon: 'loop', term: 'Redémarrage · CrashLoop', text: `Le conteneur s’arrête, Kubernetes le relance avec un délai croissant. ${Math.max(0, ...(k8s?.pods ?? []).map((pod) => pod.restarts))} redémarrages = autant d’arrêts du conteneur, pas autant de pods.` },
      { icon: 'gauge', term: 'Requests · Allocatable', text: `Requests : ce que chaque conteneur réserve. Allocatable : ce que le nœud offre. ${Math.round(capacity.cpu?.percent ?? 0)} % de requests CPU ne veut pas dire ${Math.round(capacity.cpu?.percent ?? 0)} % de CPU utilisés.` },
      { icon: 'disk', term: 'PVC', text: `Une demande de volume persistant. ${pvcs.bound ?? 0}/${pvcs.total ?? 0} liés = chaque demande a trouvé son stockage${(pvcs.bound ?? 0) === (pvcs.total ?? 0) ? ' ; aucun volume orphelin' : ''}.` },
      { icon: 'external', term: 'Service · Ingress', text: `Service : adresse interne stable. Ingress : route HTTP depuis l’extérieur. ${routes.hosts ?? 0} domaines et ${routes.total ?? 0} routes passent par ingress-nginx.` },
      { icon: 'key', term: 'ExternalSecret', text: `Un secret synchronisé depuis Azure Key Vault. ${secrets.failed ?? 0} en erreur sur ${secrets.total ?? 0} : le jeton Azure est refusé ; les valeurs déjà chargées restent, les renouvellements échouent.` },
      { icon: 'list', term: 'Job · CronJob', text: 'Job : tâche unique, terminée = succès. CronJob : tâche planifiée. Suspendu est un état voulu, pas une panne.' },
      ]
    }

    const KUBE_LEGEND = [
      { tone: 'ok', label: 'pod sain' },
      { tone: 'warn', label: 'redémarrages' },
      { tone: 'bad', label: 'instable' },
      { tone: 'done', label: 'job terminé' },
    ]

    function useEtat() {
      const [state, setState] = useState(() => cachedState()?.data ?? null)
      const [error, setError] = useState('')
      const [loading, setLoading] = useState(true)
      const [loadedAt, setLoadedAt] = useState(() => cachedState()?.at ?? 0)
      const [now, setNow] = useState(Date.now())
      const staleTimer = useRef(null)
      const staleStreak = useRef(0)

      useEffect(() => () => { if (staleTimer.current) clearTimeout(staleTimer.current) }, [])

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
        const timer = setInterval(() => { if (document.visibilityState === 'visible') load() }, refreshMsOf(state))
        const focus = () => { if (document.visibilityState === 'visible') load() }
        window.addEventListener('focus', focus)
        return () => { clearInterval(timer); window.removeEventListener('focus', focus) }
      }, [load, state])

      useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 5000)
        return () => clearInterval(timer)
      }, [])

      return { state, setState, error, loading, load, loadedAt, now }
    }

    function PanelTabs({ tab, onTab, showKubernetes = true, showRepos = true }) {
      const items = [
        { id: 'machine', label: 'Machine', icon: 'machine' },
        showKubernetes ? { id: 'kubernetes', label: 'Kubernetes' } : null,
        showRepos ? { id: 'depots', label: 'Dépôts', icon: 'git' } : null,
      ].filter(Boolean)
      return h('div', { className: 'dsh-tabs', role: 'tablist' },
        items.map((item) => h('button', {
          key: item.id,
          type: 'button',
          role: 'tab',
          'aria-selected': tab === item.id ? 'true' : 'false',
          className: tab === item.id ? 'on' : '',
          onClick: () => onTab(item.id),
        }, item.id === 'kubernetes' ? h(KubeGlyph) : h(Icon, { name: item.icon, size: 13 }), item.label)))
    }

    function KubeGlyph() {
      return h('svg', { viewBox: '0 0 24 24', width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' },
        h('path', { d: 'M12 2l8 4.5v9L12 20l-8-4.5v-9z' }),
        h('path', { d: 'M12 7.5l4 2.3v4.4L12 16.5l-4-2.3V9.8z' }))
    }

    function KubeButton({ onClick, disabled, primary, children, title }) {
      return h('button', { className: `kv-btn${primary ? ' primary' : ''}`, onClick, disabled, title }, children)
    }

    function Kpi({ k }) {
      return h('div', { className: `kv-kpi ${k.state === 'bad' ? 'bad' : k.state === 'warn' ? 'warn' : ''}` },
        h('div', { className: 'l' }, h(Icon, { name: k.icon === 'loop' ? 'refresh' : k.icon === 'server' ? 'hex' : k.icon === 'layers' ? 'list' : k.icon === 'key' ? 'hex' : k.icon === 'disk' ? 'disk' : 'pulse', size: 11 }), k.label),
        h('div', { className: 'v' }, k.value, h('small', {}, k.unit)),
        h('div', { className: 'd' }, k.detail),
        (k.bar ?? []).length ? h('div', { className: 'bar' }, (k.bar ?? []).map((segment, index) => h('i', {
          key: index,
          className: segment.tone === 'ok' ? '' : segment.tone,
          style: { width: `${Math.max(0, Math.min(100, Number(segment.share) || 0))}%` },
        }))) : null)
    }

    function KubeBanner({ k8s, onGloss, onCause }) {
      const tone = k8s.down ? 'bad' : k8s.state === 'bad' ? 'bad' : k8s.state === 'warn' ? 'warn' : 'ok'
      const icon = tone === 'ok' ? 'check' : 'alert'
      return h('div', { className: `kv-banner ${tone}` },
        h('div', { className: 'kv-bicon' }, h(Icon, { name: icon, size: 15 })),
        h('div', { style: { minWidth: 0 } },
          h('div', { className: 'kv-btitle' }, k8s.alert),
          h('div', { className: 'kv-btext' }, k8s.down ? (k8s.reason || 'Le cluster ne répond pas.') : k8s.summary || k8s.reason)),
        h('div', { className: 'kv-bactions' },
          h(KubeButton, { onClick: onGloss }, 'Comment lire ?'),
          k8s.causes?.length ? h(KubeButton, { primary: true, onClick: () => onCause(k8s.causes[0]) }, 'Voir la cause') : null))
    }

    function CausesCard({ k8s, onCause }) {
      const causes = k8s.causes ?? []
      return h('section', { className: 'kv-card' },
        h('div', { className: 'kv-chead' },
          h('span', { className: 'ic' }, h(Icon, { name: 'alert', size: 13 })),
          h('h3', {}, 'À traiter', h('span', { className: 'n' }, `${causes.length} point${causes.length > 1 ? 's' : ''}`)),
          h('span', { className: 'r' }, 'par ordre d’impact')),
        causes.length ? causes.map((cause) => h('div', { className: `kv-cause ${cause.severity}`, key: cause.id },
          h('div', { className: 'ci' }, h(Icon, { name: cause.severity === 'bad' ? 'alert' : 'pulse', size: 12 })),
          h('div', { style: { minWidth: 0 } },
            h('div', { className: 't' }, cause.title),
            h('div', { className: 'd' }, cause.detail),
            h('div', { className: 'kv-chips' }, (cause.chips ?? []).map((chip, index) => h('span', { className: `kv-chip ${chip.tone || ''}`, key: index }, chip.text)))),
          h('button', { className: 'kv-view', onClick: () => onCause(cause) }, cause.id === 'secrets' ? 'Voir la cause' : cause.id.startsWith('restarts') ? 'Voir le pod' : 'Voir')))
          : h('div', { className: 'kv-empty' }, 'Aucun point à traiter : le cluster répond et rien ne se dégrade.'))
    }

    function KubeDots({ dots }) {
      const groups = [
        ['ok', '', dots?.ok ?? 0],
        ['warn', 'warn', dots?.warn ?? 0],
        ['bad', 'bad', dots?.bad ?? 0],
        ['done', 'done', dots?.done ?? 0],
      ]
      const cells = []
      for (const [tone, className, count] of groups) {
        for (let index = 0; index < Math.min(count, 40); index += 1) cells.push(h('i', { key: `${tone}${index}`, className }))
      }
      return h('div', { className: 'kv-dots' }, cells)
    }

    function TopologyCard({ k8s, onNamespaces }) {
      const topology = k8s.topology ?? {}
      const machine = topology.machine ?? {}
      const colima = machine.colima ?? null
      const node = topology.node ?? null
      const ingress = topology.ingress ?? {}
      const runtime = machine.runtime ?? null
      const machineLines = colima
        ? [`colima · ${runtime || 'docker'}`, `VM allouée ${colima.cpus} cœurs · ${Math.round((colima.memory || 0) / 1024 ** 3)} Gio`, colima.running ? 'En marche' : 'Arrêtée']
        : runtime
          ? [runtime, machine.runtimeUp ? 'En marche' : 'Arrêté']
          : ['Aucun moteur de conteneurs']
      return h('section', { className: 'kv-card' },
        h('div', { className: 'kv-chead' },
          h('span', { className: 'ic' }, h(Icon, { name: 'grid', size: 13 })),
          h('h3', {}, 'Où tourne quoi'),
          h('span', { className: 'r' }, 'machine → cluster → domaines → accès HTTP')),
        h('div', { className: 'kv-topo' },
          h('div', { className: 'kv-machine' },
            h('div', { className: 'kv-box' },
              h('div', { className: 'h' }, h(Icon, { name: 'disk', size: 11 }), machine.host || 'Machine'),
              machineLines.map((line) => h('div', { className: 's', key: line }, line)),
              machine.note ? h('div', { className: 's' }, machine.note) : null)),
          h('div', { className: 'kv-arrow' }, '›'),
          h('div', { className: 'kv-cluster' },
            h('div', { className: 'kv-box' },
              h('div', { className: 'h' }, h(Icon, { name: 'hex', size: 11 }), `cluster · ${k8s.context || 'cluster'}`, h('span', { className: 's', style: { marginLeft: 'auto' } }, node?.ready ? 'Joignable' : 'Injoignable')),
              node ? h('div', { className: 'kv-node' },
                h(Icon, { name: 'server', size: 12 }),
                h('b', {}, node.name),
                h('span', { className: 'kv-dim', style: { fontSize: '9.6px' } }, node.version),
                h('span', { className: 'kv-dim', style: { marginLeft: 'auto', fontSize: '9.4px' } }, node.ready ? `prêt ${ageText(node.age * 60).replace('il y a ', '')}` : 'non prêt')) : null,
              h('div', { className: 'kv-groups' }, (topology.groups ?? []).map((group) => h('div', { className: 'kv-group', key: group.key },
                h('div', { className: 'g' }, h(Icon, { name: 'grid', size: 10 }), group.label, h('span', { className: 'n' }, `${group.pods} pods`)),
                h('div', { className: 's' }, group.note),
                h(KubeDots, { dots: group.dots })))))),
          h('div', { className: 'kv-ingress' },
            h('div', { className: 'kv-box', style: { height: '100%' } },
              h('div', { className: 'h' }, h(Icon, { name: 'external', size: 11 }), ingress.label || 'Entrées HTTP'),
              h('div', { className: 's' }, ingress.detail || ''),
              (ingress.hosts ?? []).map((host) => h('div', { className: 'kv-url', key: host }, h('i', { className: 'dot' }), host)),
              ingress.otherHosts ? h('div', { className: 'kv-url', style: { borderTop: 0, color: 'var(--tx3)' } }, `+ ${ingress.otherHosts} autres routes`) : null,
              h('div', { className: 's', style: { marginTop: 'auto', color: 'var(--tx3)' } }, ingress.chain || '')))),
        h('div', { className: 'kv-legend' },
          KUBE_LEGEND.map((entry) => h('span', { key: entry.tone }, h('i', { className: `kv-dot ${entry.tone}` }), entry.label)),
          h('span', { style: { marginLeft: 'auto' } }, topology.caption || 'chaque point = 1 pod'),
          onNamespaces ? h('button', { className: 'kv-view', style: { height: '20px' }, onClick: onNamespaces }, 'Tout voir') : null))
    }

    function NamespacesCard({ k8s, filter, setFilter, query, setQuery, showEmpty, setShowEmpty, onOpen }) {
      const rows = k8s.namespaceRows ?? []
      const total = rows.length
      const busy = rows.filter((row) => !row.empty)
      const empty = rows.filter((row) => row.empty)
      const warnCount = rows.filter((row) => row.state !== 'ok').length
      const needle = query.trim().toLowerCase()
      const visible = rows
        .filter((row) => (showEmpty || !row.empty))
        .filter((row) => (filter === 'warn' ? row.state !== 'ok' : true))
        .filter((row) => (needle ? row.name.includes(needle) : true))
        .sort((a, b) => (a.state === b.state ? 0 : a.state === 'bad' ? -1 : b.state === 'bad' ? 1 : a.state === 'warn' ? -1 : 1) || b.pods - a.pods)
      return h('section', { className: 'kv-card' },
        h('div', { className: 'kv-chead' },
          h('span', { className: 'ic' }, h(Icon, { name: 'grid', size: 13 })),
          h('h3', {}, 'Namespaces', h('span', { className: 'n' }, total)),
          h('span', { className: 'r' }, `${busy.length} avec des pods · ${empty.length} vide${empty.length > 1 ? 's' : ''}`)),
        h('div', { className: 'kv-tools' },
          h('button', { className: `kv-filter${filter === 'all' ? ' on' : ''}`, onClick: () => setFilter('all') }, 'Tous', h('span', { className: 'n' }, total)),
          h('button', { className: `kv-filter${filter === 'warn' ? ' on' : ''}`, onClick: () => setFilter('warn') }, 'À surveiller', h('span', { className: 'n' }, warnCount)),
          h('input', { className: 'kv-search', placeholder: 'filtrer un namespace', value: query, onChange: (event) => setQuery(event.target.value) })),
        h('table', { className: 'kv-table' },
          h('colgroup', {}, h('col', { style: { width: '24%' } }), h('col', { style: { width: '12%' } }), h('col', { style: { width: '18%' } }), h('col', { style: { width: '12%' } }), h('col', { style: { width: '14%' } }), h('col', { style: { width: '10%' } }), h('col', { style: { width: '10%' } })),
          h('thead', {}, h('tr', {}, h('th', {}, 'Namespace'), h('th', {}, 'Domaine'), h('th', {}, 'Workloads'), h('th', {}, 'Pods'), h('th', {}, 'Redémarrages'), h('th', {}, 'Secrets'), h('th', {}, 'État'))),
          h('tbody', {}, visible.map((row) => h('tr', { key: row.name, onClick: () => onOpen(row) },
            h('td', {}, h('div', { className: 'kv-ns' }, row.name, row.statefulsets ? h('span', { className: 'sub' }, 'StatefulSet') : null)),
            h('td', {}, h('span', { className: `kv-dom ${row.domain}` }, row.domainLabel)),
            h('td', {}, h('span', { className: 'kv-num' }, h('b', {}, row.workloads), h('span', { className: 's' }, row.activeWorkloads ? `dont ${row.activeWorkloads} actifs` : 'inactifs'))),
            h('td', {}, h('span', { className: 'kv-num' }, h('b', {}, row.pods), row.unstable ? h('span', { className: 's kv-bad' }, `${row.unstable} instables`) : null)),
            h('td', {}, row.restarts ? h('span', { className: 'kv-num' }, h('b', {}, row.restarts)) : h('span', { className: 'kv-dim' }, '—')),
            h('td', {}, row.secrets ? h('span', { className: `kv-num ${row.secretErrors ? 'kv-bad' : ''}` }, h('b', {}, row.secretErrors ? `${row.secretErrors} en erreur` : 'moteur sain')) : h('span', { className: 'kv-dim' }, '—')),
            h('td', {}, h('span', { className: row.state === 'bad' ? 'kv-bad' : row.state === 'warn' ? 'kv-warn' : 'kv-ok' }, row.state === 'bad' ? 'Critique' : row.state === 'warn' ? 'Attention' : 'Sain')))))),
        h('div', { className: 'kv-empty' },
          `${empty.length} namespace${empty.length > 1 ? 's' : ''} sans charge — ${empty.map((row) => row.name).join(', ')}. `,
          empty.length ? h('a', { href: '#', onClick: (event) => { event.preventDefault(); setShowEmpty(!showEmpty) } }, showEmpty ? 'masquer' : 'afficher') : null),
        h('div', { className: 'kv-empty', style: { borderTop: '1px solid rgba(255,190,140,.06)', paddingTop: '5px', marginTop: '1px' } },
          `kube-system : ${k8s.counts?.pods?.total ? '5 redémarrages par pod = le dernier démarrage du cluster, pas une anomalie.' : ''}`))
    }

    function CapacityCard({ k8s }) {
      const capacity = k8s.capacity ?? {}
      const rows = [
        { key: 'cpu', label: 'Processeurs demandés', value: `${fmt(capacity.cpu?.requested)} / ${fmt(capacity.cpu?.allocatable)} cœurs`, percent: capacity.cpu?.percent },
        { key: 'memory', label: 'Mémoire demandée', value: `${formatBytes(capacity.memory?.requested)} / ${formatBytes(capacity.memory?.allocatable)}`, percent: capacity.memory?.percent },
        { key: 'pods', label: 'Pods demandés', value: `${fmt(capacity.pods?.requested)} / ${fmt(capacity.pods?.allocatable)}`, percent: capacity.pods?.percent },
      ]
      return h('section', { className: 'kv-card' },
        h('div', { className: 'kv-chead' },
          h('span', { className: 'ic' }, h(Icon, { name: 'pulse', size: 13 })),
          h('h3', {}, 'Capacité du nœud')),
        h('div', { className: 'kv-cap' }, rows.map((row) => h('div', { className: 'kv-caprow', key: row.key },
          h('div', { className: 'l' }, h('span', {}, row.label), h('b', {}, `${pct(row.percent)} %`)),
          h('div', { className: 'kv-bar2' }, h('i', { className: percentClass(row.percent), style: { width: `${Math.max(0, Math.min(100, Number(row.percent) || 0))}%` } })),
          h('div', { className: 'l', style: { marginTop: '2px', color: 'var(--tx3)', fontSize: '9.6px' } }, h('span', {}, row.value))))),
        h('div', { className: 'kv-note' }, h(Icon, { name: 'alert', size: 11 }), h('span', {}, 'Requests, pas consommation réelle : c’est ce que les conteneurs réservent. ', k8s.checks?.find((check) => check.id === 'metrics')?.value === 'absent' ? 'Sans metrics-server, l’usage effectif n’est pas mesuré.' : '')))
    }

    function ComponentsCard({ k8s }) {
      const checks = k8s.checks ?? []
      const summary = k8s.checksSummary ?? { ok: 0, warn: 0, bad: 0 }
      const tone = (check) => (check.state === 'bad' ? 'bad' : check.state === 'warn' ? 'warn' : 'ok')
      return h('section', { className: 'kv-card' },
        h('div', { className: 'kv-chead' },
          h('span', { className: 'ic' }, h(Icon, { name: 'hex', size: 13 })),
          h('h3', {}, 'Composants'),
          h('span', { className: 'r' }, `${summary.ok} sain${summary.ok > 1 ? 's' : ''} · ${summary.warn} absent${summary.warn > 1 ? 's' : ''} · ${summary.bad} en erreur`)),
        checks.map((check) => h('div', { className: 'kv-comp', key: check.id },
          h(Dot, { state: tone(check) }),
          h('span', {}, check.label),
          h('span', { className: 'v' }, check.value))))
    }

    function ActivityCard({ k8s }) {
      const activity = k8s.activity ?? []
      return h('section', { className: 'kv-card' },
        h('div', { className: 'kv-chead' },
          h('span', { className: 'ic' }, h(Icon, { name: 'list', size: 13 })),
          h('h3', {}, 'Activité récente'),
          h('span', { className: 'r' }, '24 h')),
        activity.length ? activity.map((entry, index) => h('div', { className: `kv-act ${entry.tone || 'ok'}`, key: `${entry.title}-${index}` },
          h('div', { className: 'ai' }, h(Icon, { name: entry.tone === 'red' ? 'alert' : entry.tone === 'ok' ? 'check' : entry.tone === 'purple' ? 'list' : 'refresh', size: 10 })),
          h('div', { style: { minWidth: 0 } }, h('div', { className: 't' }, entry.title), h('div', { className: 'm' }, entry.meta)),
          h('div', { className: 'tm' }, entry.minutes === 0 ? 'à l’instant' : `il y a ${ageText(entry.minutes * 60).replace('il y a ', '')}`)))
          : h('div', { className: 'kv-empty' }, 'Aucune activité sur la fenêtre.'))
    }

    function UnderstandCard({ k8s, onGloss }) {
      return h('section', { className: 'kv-card' },
        h('div', { className: 'kv-chead' },
          h('span', { className: 'ic' }, h(Icon, { name: 'pulse', size: 13 })),
          h('h3', {}, 'Comprendre les chiffres')),
        h('div', { className: 'kv-callout' },
          h(Icon, { name: 'alert', size: 12 }),
          h('span', {}, 'Un pod peut être « prêt » et redémarrer. Être prêt mesure l’instant, pas la stabilité. C’est pourquoi ', h('b', {}, `${k8s.counts?.pods?.unstable ?? 0} arrêts`), ' restent invisibles dans « ', h('b', {}, `${k8s.counts?.pods?.running ?? 0} actifs`), ' ».')),
        h('button', { className: 'kv-glossbtn', onClick: onGloss }, h(Icon, { name: 'external', size: 11 }), 'Ouvrir le glossaire', h('span', { className: 'n' }, `${glossaryFor(k8s).length} termes`)))
    }

    function NamespaceSheet({ k8s, row, onClose, onRestart, onToast }) {
      const pods = (k8s.pods ?? []).filter((pod) => pod.namespace === row.name)
      const workloads = (k8s.workloads ?? []).filter((item) => item.namespace === row.name)
      const secrets = (k8s.externalSecrets ?? []).filter((secret) => secret.namespace === row.name)
      const routes = (k8s.routes ?? []).filter((route) => route.namespace === row.name)
      const unstable = pods.filter((pod) => pod.restarts >= 5 || pod.blocked).sort((a, b) => b.restarts - a.restarts)
      const failing = secrets.filter((secret) => secret.state === 'bad')
      const summary = `${row.pods} pod${row.pods > 1 ? 's' : ''} · ${row.workloads} workload${row.workloads > 1 ? 's' : ''} · ${row.services} service${row.services > 1 ? 's' : ''} · ${row.routes} route${row.routes > 1 ? 's' : ''} · ${row.secrets} secret${row.secrets > 1 ? 's' : ''}`

      const callout = failing.length
        ? `${failing.length} secret${failing.length > 1 ? 's' : ''} Azure en échec dans ce namespace. Les applications tournent ; ce sont les renouvellements qui sont bloqués.`
        : unstable.length
          ? `${unstable.length} pod${unstable.length > 1 ? 's' : ''} redémarre${unstable.length > 1 ? 'nt' : ''} en boucle. « Prêt » entre deux crashes ne veut pas dire stable.`
          : 'Rien à traiter dans ce namespace : les pods tournent et les secrets se synchronisent.'

      const watchRows = unstable.slice(0, 4).map((pod) => h('div', { className: 'kv-watch', key: pod.name },
        h(Dot, { state: 'warn' }),
        h('span', { className: 'mono', style: { fontSize: '9.8px', overflow: 'hidden', textOverflow: 'ellipsis' } }, pod.name),
        h('span', { className: 'kv-dim', style: { fontSize: '9.4px', whiteSpace: 'nowrap' } }, `${pod.restarts} redémarrages · ${pod.phase} · ${ageText(pod.age * 60).replace('il y a ', '')}`),
        h('button', { className: 'kv-view g', onClick: () => onRestart({ kind: 'pod', namespace: pod.namespace, name: pod.name, restarts: pod.restarts }) }, 'Redémarrer')))

      const podRows = pods.slice(0, 10).map((pod) => h('tr', { key: pod.name },
        h('td', { className: 'wrk' }, pod.name),
        h('td', { className: pod.state === 'bad' ? 'kv-bad' : pod.state === 'warn' ? 'kv-warn' : '' }, pod.phase),
        h('td', { className: pod.restarts >= 5 ? 'kv-bad' : '' }, String(pod.restarts)),
        h('td', { className: 'kv-dim' }, ageText(pod.age * 60).replace('il y a ', ''))))

      const workloadRows = workloads.slice(0, 12).map((item) => h('tr', { key: `${item.kind}/${item.name}` },
        h('td', { className: 'wrk' }, h('b', {}, item.name), h('span', { className: 'kv-dim', style: { fontSize: '9.2px' } }, ` ${item.kindLabel}`)),
        h('td', {}, `${item.available} / ${item.desired}`),
        h('td', { className: item.restarts >= 5 ? 'kv-bad' : '' }, item.restarts ? String(item.restarts) : '—'),
        h('td', { className: item.state === 'bad' ? 'kv-bad' : item.state === 'warn' ? 'kv-warn' : 'kv-ok' }, item.state === 'bad' ? 'Indisponible' : item.state === 'warn' ? 'Instable' : item.zero ? 'Désactivé' : 'Sain')))

      const secretRows = secrets.slice(0, 8).map((secret) => h('tr', { key: secret.name },
        h('td', { className: 'wrk' }, secret.name),
        h('td', { className: secret.state === 'bad' ? 'kv-bad' : 'kv-ok' }, secret.state === 'bad' ? 'SecretSyncedError' : 'SecretSynced'),
        h('td', { className: 'kv-dim' }, secret.state === 'bad' ? (secret.code?.startsWith('AADSTS') ? 'Azure 401' : secret.reason) : '—')))

      const routeRows = routes.slice(0, 6).map((route) => h('div', { className: 'kv-url', key: `${route.host}${route.path}` }, h('i', { className: 'dot' }), `${route.host}${route.path === '/' ? '' : route.path}`))

      return h('div', { className: 'kv-overlay right', onClick: (event) => { if (event.target === event.currentTarget) onClose() } },
        h('div', { className: 'kv-sheet' },
          h('div', { className: 'kv-sheet-head' },
            h('span', {}, 'Kubernetes'),
            h(Icon, { name: 'chevron', size: 10 }),
            h('span', {}, row.name),
            h('button', { className: 'iconbtn x', onClick: onClose }, h(Icon, { name: 'x', size: 14 }))),
          h('div', { className: 'kv-sheet-title' },
            h('h2', {}, row.name),
            h('span', { className: `kv-dom ${row.domain}` }, row.domainLabel),
            h(StatePill, { state: row.state, label: row.state === 'bad' ? 'Critique' : row.state === 'warn' ? 'Attention' : 'Sain' })),
          h('div', { className: 'kv-sheet-sub' }, summary),
          h('div', { className: 'kv-sheet-body' },
            h('div', { className: 'kv-callout', style: { marginTop: '9px' } }, h(Icon, { name: 'alert', size: 12 }), h('span', {}, callout)),
            unstable.length ? h('div', { className: 'kv-sec' },
              h('h4', {}, 'À surveiller', h('span', { className: 'n' }, String(unstable.length))),
              watchRows) : null,
            h('div', { className: 'kv-sec' },
              h('h4', {}, 'Pods', h('span', { className: 'n' }, `${pods.length}${row.unstable ? ` · ${row.unstable} instable${row.unstable > 1 ? 's' : ''}` : ''}`)),
              h('table', { className: 'kv-dtab' },
                h('thead', {}, h('tr', {}, h('th', {}, 'Pod'), h('th', {}, 'Statut'), h('th', {}, 'Redémarrages'), h('th', {}, 'Âge'))),
                h('tbody', {}, podRows)),
              pods.length > 10 ? h('div', { className: 'kv-empty' }, `${pods.length - 10} autres pods`) : null),
            h('div', { className: 'kv-sec' },
              h('h4', {}, 'Workloads', h('span', { className: 'n' }, String(workloads.length))),
              h('table', { className: 'kv-dtab' },
                h('thead', {}, h('tr', {}, h('th', {}, 'Workload'), h('th', {}, 'Replicas'), h('th', {}, 'Redémarrages'), h('th', {}, 'État'))),
                h('tbody', {}, workloadRows))),
            secrets.length ? h('div', { className: 'kv-sec' },
              h('h4', {}, 'Secrets Azure', h('span', { className: 'n' }, `${failing.length} en erreur`), h('span', { className: 'r' }, failing.length ? 'Voir la cause' : '')),
              h('table', { className: 'kv-dtab' },
                h('thead', {}, h('tr', {}, h('th', {}, 'ExternalSecret'), h('th', {}, 'Dernier état'), h('th', {}, 'Cause'))),
                h('tbody', {}, secretRows)),
              secrets.length > 8 ? h('div', { className: 'kv-empty' }, `${secrets.length - 8} autres secrets dans ce namespace.`) : null) : null,
            routes.length ? h('div', { className: 'kv-sec' },
              h('h4', {}, 'Réseau', h('span', { className: 'n' }, `${row.services} service${row.services > 1 ? 's' : ''} · ${routes.length} route${routes.length > 1 ? 's' : ''}`)),
              routeRows) : null),
          h('div', { className: 'kv-foot' },
            h('span', {}, 'Lecture seule · aucune correction depuis le panneau'),
            h('span', { className: 'r' },
              unstable.length ? h(KubeButton, { onClick: () => onRestart({ kind: 'deployment', namespace: row.name, name: unstable[0].owner || unstable[0].name }) }, 'Redémarrer le workload') : null,
              h(KubeButton, { onClick: () => onToast('La ressource s’ouvre dans k9s depuis un terminal.') }, 'Ouvrir la ressource'),
              h(KubeButton, { onClick: onClose }, 'Fermer')))))
    }

    function CauseModal({ cause, onClose, onToast }) {
      if (!cause) return null
      const pairs = cause.id === 'secrets'
        ? [
          ['Ce qui échoue', 'Le renouvellement des secrets et des certificats TLS de ce namespace.'],
          ['Ce qui continue', 'Les secrets déjà synchronisés restent dans le cluster et les applications tournent. Aucun pod n’est arrêté pour cette raison.'],
          ['Ce qui s’arrête', 'Les nouveaux certificats et les rotations de mots de passe. À la prochaine expiration, les routes HTTPS cesseront de fonctionner.'],
        ]
        : [
          ['Portée', (cause.scope ?? []).map((item) => `${item.label}${item.count > 1 ? ` (${item.count})` : ''}`).join(' · ') || '—'],
          ['Trace', cause.trace || '—'],
          ['Ressources', (cause.names ?? []).join(' · ') || '—'],
        ]
      const rows = pairs.map(([label, text]) => h('div', { className: 'kv-mrow', key: label }, h('div', { className: 'l' }, label), h('div', {}, text)))
      const scopeRows = (cause.scope ?? []).map((item) => h('tr', { key: item.label }, h('td', { className: 'wrk' }, item.label), h('td', { className: 'kv-bad' }, `${item.count} / ${item.count}`)))
      return h('div', { className: 'kv-overlay center', onClick: (event) => { if (event.target === event.currentTarget) onClose() } },
        h('div', { className: 'kv-kmodal' },
          h('div', { className: 'head' },
            h('span', { className: 'kv-bicon' }, h(Icon, { name: 'alert', size: 13 })),
            h('div', {}, h('b', {}, cause.title), h('div', { className: 'sub' }, 'Une cause, plusieurs namespaces')),
            h('button', { className: 'iconbtn x', onClick: onClose }, h(Icon, { name: 'x', size: 14 }))),
          h('div', { className: 'body' },
            h('div', { className: 'kv-intro', style: { marginBottom: '8px' } }, cause.detail),
            rows,
            (cause.scope ?? []).length ? h('div', { className: 'kv-sec' },
              h('h4', {}, 'Répartition'),
              h('table', { className: 'kv-dtab' },
                h('thead', {}, h('tr', {}, h('th', {}, 'Namespace'), h('th', {}, 'En erreur'))),
                h('tbody', {}, scopeRows))) : null,
            h('div', { className: 'kv-warnbox', style: { marginTop: '9px' } },
              h(Icon, { name: 'alert', size: 12 }),
              h('span', {}, 'Ce que le panneau peut faire : montrer la cause et la portée. Corriger demanderait d’agir hors du cluster, hors de ce panneau.'))),
          h('div', { className: 'foot' },
            h('span', { className: 'l' }, 'Lecture seule · aucune correction depuis le panneau'),
            h(KubeButton, { onClick: () => onToast('La ressource s’ouvre dans k9s depuis un terminal.') }, 'Ouvrir la ressource'),
            h(KubeButton, { primary: true, onClick: onClose }, 'Fermer'))))
    }

    function GlossaryModal({ k8s, onClose }) {
      const glossary = glossaryFor(k8s)
      const terms = glossary.map((term) => h('div', { className: 'kv-term', key: term.term },
        h('div', { className: 'ti' }, h(Icon, { name: term.icon, size: 11 })),
        h('div', {}, h('b', {}, term.term), h('p', {}, term.text))))
      return h('div', { className: 'kv-overlay center', onClick: (event) => { if (event.target === event.currentTarget) onClose() } },
        h('div', { className: 'kv-kmodal gloss' },
          h('div', { className: 'head' },
            h('span', { className: 'kv-bicon' }, h(Icon, { name: 'pulse', size: 13 })),
            h('div', {}, h('b', {}, 'Comprendre les chiffres'), h('div', { className: 'sub' }, 'Ce que le panneau compte, et ce que chaque mot veut dire')),
            h('button', { className: 'iconbtn x', onClick: onClose }, h(Icon, { name: 'x', size: 14 }))),
          h('div', { className: 'body' },
            h('div', { className: 'kv-intro' }, 'Le panneau lit le cluster avec kubectl et n’invente aucun chiffre. Chaque valeur est un état déclaré par Kubernetes au moment de la mesure. Un chiffre vert ne veut pas dire « rien à faire » ; un chiffre « 0 » ne veut pas dire « cassé ».'),
            h('div', { className: 'kv-terms' }, terms)),
          h('div', { className: 'foot' },
            h('span', { className: 'l' }, 'Les termes sont ceux de Kubernetes ; les phrases sont celles du panneau'),
            h(KubeButton, { primary: true, onClick: onClose }, 'Fermer'))))
    }

    function KubernetesPanel({ tab, onTab }) {
      const { state, error, loading, load, loadedAt, now } = useEtat()
      const [resourcesOpen, setResourcesOpen] = useState(false)
      const [picking, setPicking] = useState(false)
      const [cause, setCause] = useState(null)
      const [sheet, setSheet] = useState(null)
      const [gloss, setGloss] = useState(false)
      const [confirm, setConfirm] = useState(null)
      const [busy, setBusy] = useState(false)
      const [toast, setToast] = useState('')
      const [filter, setFilter] = useState('all')
      const [query, setQuery] = useState('')
      const [showEmpty, setShowEmpty] = useState(false)
      const toastTimer = useRef(null)

      useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

      const showToast = useCallback((message) => {
        setToast(message)
        if (toastTimer.current) clearTimeout(toastTimer.current)
        toastTimer.current = setTimeout(() => setToast(''), 3200)
      }, [])

      const runRestart = async () => {
        if (!confirm || busy) return
        setBusy(true)
        try {
          const entry = await api('/systeme/api/action', { method: 'POST', body: JSON.stringify({ famille: 'k8s', action: confirm.action, namespace: confirm.namespace, name: confirm.name, confirm: true }) })
          showToast(entry.result || 'Action effectuée')
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

      const askRestart = ({ kind, namespace, name, restarts }) => {
        const isPod = kind === 'pod'
        setConfirm({
          title: isPod ? `Supprimer le pod ${name} ?` : `Redémarrer ${name} ?`,
          target: `${kind}/${namespace}/${name}`,
          impact: isPod
            ? 'Le pod est supprimé et recréé par son deployment, avec la même image et la même configuration. Si la cause n’est pas corrigée, il recommencera.'
            : 'Le pod est supprimé et recréé immédiatement par le deployment, avec la même image et la même configuration. Si la cause n’est pas corrigée, le nouveau pod recommencera.',
          note: `Action journalisée · réversible${restarts ? ` · ${restarts} redémarrages observés` : ''}`,
          okLabel: isPod ? 'Supprimer le pod' : 'Redémarrer',
          tone: 'danger',
          action: isPod ? 'delete' : 'restart',
          namespace,
          name,
        })
      }

      const refresh = () => { load(true) }
      const openGloss = () => setGloss(true)

      useEffect(() => {
        if (state?.k8s?.hidden) onTab('machine')
      }, [state?.k8s?.hidden])

      const watchedContext = String(state?.reglages?.k8sContext ?? '')
      const knownContexts = Array.isArray(state?.k8s?.contexts) ? state.k8s.contexts : []
      const contextChoices = [
        { value: '', label: 'Automatique — contexte courant' },
        ...knownContexts.map((name) => ({ value: name, label: name })),
        ...(watchedContext && !knownContexts.includes(watchedContext) ? [{ value: watchedContext, label: `${watchedContext} (absent)` }] : []),
      ]
      const pickContext = async (value) => {
        const form = formFrom(props)
        if (!form) { showToast('Réglages indisponibles.'); return }
        setPicking(true)
        try {
          const ok = await form.mutate([value ? { op: 'set', path: ['k8sContext'], value } : { op: 'unset', path: ['k8sContext'] }])
          if (!ok) { showToast('Écriture refusée ; rechargez la page.'); return }
          await load()
        } catch (pickError) {
          showToast(pickError?.message ?? 'Écriture impossible.')
        } finally {
          setPicking(false)
        }
      }
      const askResource = (item, action) => {
        if (action === 'delete') {
          askRestart({ kind: 'pod', namespace: item.namespace, name: item.name })
          return
        }
        if (action === 'restart') {
          askRestart({ kind: 'deployment', namespace: item.namespace, name: item.name })
          return
        }
        setConfirm({
          title: `Purger job/${item.name} ?`,
          target: `job/${item.namespace}/${item.name}`,
          impact: 'Le job terminé est supprimé et ses pods sont nettoyés.',
          note: `Action journalisée · réversible${item.age ? ` · terminé il y a ${item.age}` : ''}`,
          okLabel: 'Purger',
          tone: 'danger',
          action: 'purge',
          namespace: item.namespace,
          name: item.name,
        })
      }
      const header = h('div', { className: 'kv-head' },
        h('div', {},
          h(PanelTabs, { tab, onTab, showKubernetes: !state?.k8s?.hidden, showRepos: !state?.repos?.hidden }),
          h('div', { className: 'kv-sub' }, state ? [state.k8s?.context, state.k8s?.version ? `Kubernetes ${state.k8s.version}` : null, `mesuré ${ageText((now - loadedAt) / 1000)}`].filter(Boolean).join(' · ') : 'Cluster, workloads et secrets')),
        h('div', { className: 'kv-actions' },
          h('label', { className: 'kv-pick' },
            h('span', {}, 'Contexte'),
            h('select', {
              value: watchedContext,
              disabled: picking,
              onChange: (event) => pickContext(event.target.value),
            }, contextChoices.map((choice) => h('option', { key: choice.value, value: choice.value }, choice.label)))),
          h('span', { className: `live-pill${error || state?.k8s?.down ? ' off' : ''}` }, h(Dot, { state: error || state?.k8s?.down ? 'bad' : 'ok' }), error || state?.k8s?.down ? 'Hors ligne' : 'En direct'),
          h(KubeButton, { onClick: () => setResourcesOpen(true) }, h(Icon, { name: 'terminal' }), 'Ressources'),
          h(KubeButton, { onClick: () => showToast('k9s s’ouvre dans un terminal : kubectl sur le contexte courant.') }, h(Icon, { name: 'terminal' }), 'k9s'),
          h(KubeButton, { onClick: refresh, disabled: loading }, h(Icon, { name: 'refresh' }), loading ? 'Rafraîchissement…' : 'Rafraîchir'),
          h(KubeButton, { onClick: openGloss }, h(Icon, { name: 'pulse' }), 'Comprendre')))

      if (!state) {
        return h('div', { className: 'dsh-kube' },
          header,
          error
            ? h('div', { className: 'errbar' }, h('span', { className: 'grow' }, `Le serveur ne répond pas : ${error}`), h('button', { className: 'btn-o', onClick: refresh }, 'Réessayer'))
            : h('div', { className: 'loading' }, 'Lecture du cluster…'),
          h(Toast, { message: toast }))
      }

      const k8s = state.k8s ?? {}
      const row = sheet ? (k8s.namespaceRows ?? []).find((item) => item.name === sheet.name) ?? sheet : null
      const overlay = h(Toast, { message: toast })

      return h('div', { className: 'dsh-kube' },
        header,
        error ? h('div', { className: 'errbar', style: { marginTop: '8px' } }, h('span', { className: 'grow' }, `Le serveur ne répond pas : ${error}. Les dernières mesures restent affichées.`), h('button', { className: 'btn-o', onClick: refresh }, 'Réessayer')) : null,
        h(KubeBanner, { k8s, onGloss: openGloss, onCause: setCause }),
        h('div', { className: 'kv-kpis' }, (k8s.kpis ?? []).map((kpi) => h(Kpi, { key: kpi.id, k: kpi }))),
        h('div', { className: 'kv-body' },
          h('div', { className: 'kv-col' },
            h(CausesCard, { k8s, onCause: setCause }),
            h(TopologyCard, { k8s, onNamespaces: () => { setFilter('all'); setShowEmpty(true) } }),
            h(NamespacesCard, { k8s, filter, setFilter, query, setQuery, showEmpty, setShowEmpty, onOpen: (target) => setSheet(target) })),
          h('div', { className: 'kv-col' },
            h(CapacityCard, { k8s }),
            h(ComponentsCard, { k8s }),
            h(ActivityCard, { k8s }),
            h(UnderstandCard, { k8s, onGloss: openGloss }))),
        h('div', { className: 'kv-foot' },
          h('span', {}, 'Lecture seule sur le cluster · aucune action sans confirmation'),
          h('span', { className: 'r' },
            h('span', {}, 'Collecte locale via kubectl'),
            h('span', {}, `Rafraîchi toutes les ${Math.round(refreshMsOf(state) / 1000)} s`),
            h('span', {}, `DSH ${state.version ?? ''}${k8s.version ? ` · Kubernetes ${String(k8s.version).replace('v', '')}` : ''}`))),
        resourcesOpen ? h('div', { className: 'dsh-systeme dsh-scope' },
          h(K8sResourcesModal, {
            k8s,
            onRestart: (item) => askResource(item, 'restart'),
            onDelete: (item) => askResource(item, 'delete'),
            onPurge: (item) => askResource(item, 'purge'),
            onClose: () => setResourcesOpen(false),
          })) : null,
        cause ? h(CauseModal, { cause, onClose: () => setCause(null), onToast: showToast }) : null,
        row ? h(NamespaceSheet, {
          k8s,
          row,
          onClose: () => setSheet(null),
          onRestart: (target) => { setSheet(null); askRestart(target) },
          onToast: showToast,
        }) : null,
        gloss ? h(GlossaryModal, { k8s, onClose: () => setGloss(false) }) : null,
        confirm ? h('div', { className: 'dsh-systeme dsh-scope' },
          h(ConfirmModal, { confirm, busy, onClose: () => setConfirm(null), onConfirm: runRestart })) : null,
        h('div', { className: 'dsh-systeme dsh-scope' }, overlay))
    }

    function shortPath(path) {
      return String(path || '').replace(/^.*\/(projects\/)/, '~/$1')
    }

    function plural(n, word) {
      return `${n} ${word}${Number(n) > 1 ? 's' : ''}`
    }

    function missionId(branch) {
      for (const segment of String(branch || '').split('/')) {
        if (/^[A-Za-z][A-Za-z0-9]*-\d+$/.test(segment)) return segment.toUpperCase()
      }
      return ''
    }

    function relTime(at) {
      if (!at) return '—'
      const seconds = Math.max(0, Date.now() / 1000 - at)
      if (seconds < 90) return `${Math.round(seconds)} s`
      if (seconds < 3600) return `${Math.round(seconds / 60)} min`
      if (seconds < 86400) return `${Math.round(seconds / 3600)} h`
      return `${Math.round(seconds / 86400)} j`
    }

    function fetchText(hours) {
      if (hours == null || Number.isNaN(Number(hours))) return 'inconnu'
      const value = Number(hours)
      if (value < 1) return '< 1 h'
      if (value < 48) return `${Math.round(value)} h`
      return `${Math.round(value / 24)} j`
    }

    function prLabel(pr) {
      if (!pr) return '—'
      if (pr.checks === 'failure') return `#${pr.number} échec`
      if (pr.reviewDecision === 'CHANGES_REQUESTED') return `#${pr.number} à corriger`
      if (pr.isDraft) return `#${pr.number} draft`
      if (pr.reviewDecision === 'APPROVED') return `#${pr.number} approuvée`
      return `#${pr.number} ouverte`
    }

    function gitStateText(item) {
      const bits = []
      if (item.dirty) bits.push(`${plural(item.dirty, 'fichier')}`)
      if (item.worktreeCount) bits.push(`${plural(item.worktreeCount, 'checkout')}`)
      if (item.upstreamMissing) bits.push('sans upstream')
      if (item.goneCount) bits.push(`${item.goneCount} éteinte${item.goneCount > 1 ? 's' : ''}`)
      if (item.detached) bits.push('détaché')
      if (!bits.length) bits.push('propre')
      return bits.join(' · ')
    }

    function syncText(item) {
      if (item.behind > 0) return `↓ ${item.behind}`
      if (item.ahead > 0) return `↑ ${item.ahead}`
      return 'à jour'
    }

    function fileCode(code) {
      const value = String(code || '')
      if (value.includes('?')) return '??'
      const letters = value.replace(/\./g, '')
      return letters || 'M'
    }

    function GitBanner({ repos, age, onGloss, onCauses, onRepos }) {
      const items = repos?.items ?? []
      const causes = repos?.causes ?? []
      const attention = repos?.attentionCount ?? items.filter((item) => item.state !== 'ok').length
      const detached = items.filter((item) => item.detached).length
      const stashes = items.reduce((sum, item) => sum + (item.stashCount ?? 0), 0)
      const quiet = [detached ? `${detached} HEAD détaché${detached > 1 ? 's' : ''}` : 'aucun HEAD détaché', stashes ? `${plural(stashes, 'stash')}` : 'aucun stash'].join(', ')
      const titre = attention
        ? `${plural(causes.length, 'cause')} ${causes.length > 1 ? 'expliquent' : 'explique'} ${plural(attention, 'dépôt')} à surveiller.`
        : 'Le workspace git est lisible : aucun dépôt à surveiller.'
      const detail = attention ? `${causes.map((cause) => cause.title).join(' · ')}. ${quiet.charAt(0).toUpperCase()}${quiet.slice(1)}.` : `${plural(items.length, 'dépôt')} propre${items.length > 1 ? 's' : ''}, ${quiet}.`
      return h('div', { className: 'git-banner' },
        h('span', { className: 'bi' }, h(Icon, { name: attention ? 'alert' : 'check', size: 14 })),
        h('div', { style: { minWidth: 0 } },
          h('div', { className: 'bt' }, titre),
          h('div', { className: 'bs' }, detail)),
        h('div', { className: 'ba' },
          h('button', { className: 'btn-o', onClick: onGloss }, h(Icon, { name: 'info' }), 'Comment lire ?'),
          h('button', { className: 'btn-brand', onClick: onCauses, disabled: !causes.length }, h(Icon, { name: 'alert' }), 'Voir les causes')))
    }

    function GitKpis({ repos }) {
      const items = repos?.items ?? []
      const total = repos?.total ?? items.length
      const watch = items.filter((item) => item.state !== 'ok')
      const bad = watch.filter((item) => item.state === 'bad').length
      const warn = watch.length - bad
      const dirtyItems = items.filter((item) => item.dirty > 0)
      const files = dirtyItems.reduce((sum, item) => sum + item.dirty, 0)
      const tracked = dirtyItems.reduce((sum, item) => sum + (item.tracked ?? 0), 0)
      const behindItems = items.filter((item) => item.behind > 0)
      const behindTotal = behindItems.reduce((sum, item) => sum + item.behind, 0)
      const topBehind = behindItems.slice().sort((a, b) => b.behind - a.behind)[0]
      const worktreeCount = repos?.worktreeCount ?? items.reduce((sum, item) => sum + (item.worktreeCount ?? 0), 0)
      const topWt = items.slice().sort((a, b) => (b.worktreeCount ?? 0) - (a.worktreeCount ?? 0))[0]
      const prs = []
      for (const item of items) for (const pr of item.prs ?? []) if (!prs.some((entry) => entry.number === pr.number)) prs.push(pr)
      const drafts = prs.filter((pr) => pr.isDraft).length
      const failing = prs.filter((pr) => pr.checks === 'failure').length
      const card = (key, label, icon, value, small, detail, tone, segments) => h('div', { className: `git-kpi ${tone || ''}`, key },
        h('div', { className: 'l' }, h(Icon, { name: icon, size: 11 }), label),
        h('div', { className: 'v' }, String(value), small ? h('small', {}, small) : null),
        h('div', { className: 'd' }, detail),
        h('div', { className: 'bar' }, (segments ?? []).map((segment, index) => h('i', { key: index, style: { width: `${Math.max(0, Math.min(100, segment.value))}%`, background: segment.color } }))))
      const pct = (n) => (total ? (n / total) * 100 : 0)
      return h('div', { className: 'git-kpis' },
        card('total', 'Dépôts', 'git', total, 'sous ~/projects', `${items.filter((item) => item.branch !== 'main').length} sur une branche de travail`, '', [{ value: 100, color: 'var(--green)' }]),
        card('watch', 'À surveiller', 'alert', repos?.attentionCount ?? watch.length, `/ ${total}`, `${bad} rouge${bad > 1 ? 's' : ''} · ${warn} ambre`, bad ? 'bad' : warn ? 'warn' : '', [{ value: pct(bad), color: 'var(--red)' }, { value: pct(warn), color: 'var(--amber)' }]),
        card('dirty', 'Sales', 'file', repos?.dirtyCount ?? dirtyItems.length, `/ ${total}`, `${plural(files, 'fichier')} · ${tracked} suivi${tracked > 1 ? 's' : ''}`, dirtyItems.length ? 'warn' : '', [{ value: pct(dirtyItems.length), color: 'var(--amber)' }]),
        card('behind', 'En retard', 'down', repos?.behindCount ?? behindItems.length, `/ ${total}`, `${plural(behindTotal, 'commit')} · ${topBehind?.name ?? '—'}`, behindItems.length ? 'warn' : '', [{ value: pct(behindItems.length), color: 'var(--amber)' }]),
        card('wt', 'Worktrees', 'layers', worktreeCount, topWt?.worktreeCount ? `sur ${topWt.name}` : 'aucun', `${plural(worktreeCount, 'checkout')} lié${worktreeCount > 1 ? 's' : ''}`, '', [{ value: pct(worktreeCount), color: 'var(--green)' }]),
        card('pr', 'PR de mission', 'check', repos?.prCount ?? prs.length, `${drafts} draft · ${failing} échec`, repos?.prAvailable === false ? 'gh indisponible' : `${plural(prs.length, 'PR')} ouverte${prs.length > 1 ? 's' : ''}`, failing ? 'warn' : '', [{ value: pct(prs.length), color: failing ? 'var(--amber)' : 'var(--green)' }]))
    }

    function GitCauseRow({ cause, onOpen, onAll }) {
      const icon = cause.id === 'behind' ? 'down' : cause.id === 'dirty' ? 'file' : 'git'
      return h('div', { className: `git-cause ${cause.tone === 'warn' ? 'warn' : ''}` },
        h('span', { className: 'git-ci' }, h(Icon, { name: icon, size: 13 })),
        h('div', { style: { minWidth: 0, flex: 1 } },
          h('div', { className: 'ct' }, cause.title),
          h('div', { className: 'cd' }, cause.desc),
          cause.evidence ? h('span', { className: 'ce', title: cause.evidence }, cause.evidence) : null),
        h('button', { className: 'ca', onClick: () => (cause.repo ? onOpen(cause.repo) : onAll()) }, cause.repo ? 'Ouvrir' : 'Cause'))
    }

    function GitCauses({ repos, onOpen, onAll }) {
      const causes = repos?.causes ?? []
      const items = repos?.items ?? []
      const gone = items.reduce((sum, item) => sum + (item.goneCount ?? 0), 0)
      return h('section', { className: 'git-card' },
        h('div', { className: 'schead' },
          h('h3', {}, h(Icon, { name: 'alert', size: 13 }), 'À traiter', h('span', { className: 'mono' }, `${causes.length} cause${causes.length > 1 ? 's' : ''}`)),
          h('button', { className: 'more', onClick: onAll }, 'Tout voir', h(Icon, { name: 'chevron' }))),
        causes.length
          ? h('div', { className: 'git-causes' }, causes.map((cause) => h(GitCauseRow, { key: cause.id, cause, onOpen, onAll })))
          : h('div', { className: 'git-quiet' }, 'Rien à traiter : aucun retard, aucun fichier non commité, aucune PR en échec.'),
        gone ? h('div', { className: 'git-quiet' }, `Aussi : ${plural(gone, 'branche')} à upstream éteint, à nettoyer.`) : null)
    }

    function GitTable({ repos, filter, setFilter, onOpen, onAll }) {
      const items = repos?.items ?? []
      const counts = {
        all: items.length,
        watch: items.filter((item) => item.state !== 'ok').length,
        worktrees: items.filter((item) => (item.worktreeCount ?? 0) > 0).length,
      }
      const rows = items.filter((item) => filter === 'all' || (filter === 'watch' ? item.state !== 'ok' : (item.worktreeCount ?? 0) > 0))
      const chip = (id, label) => h('button', { key: id, className: `git-chip ${filter === id ? 'on' : ''}`, onClick: () => setFilter(id) }, label, ' ', h('b', {}, String(counts[id])))
      return h('section', { className: 'git-card' },
        h('div', { className: 'schead' },
          h('h3', {}, h(Icon, { name: 'git', size: 13 }), 'Dépôts', h('span', { className: 'mono' }, String(items.length))),
          h('button', { className: 'more', onClick: onAll }, `Voir les ${items.length}`, h(Icon, { name: 'chevron' }))),
        h('div', { className: 'git-filters' }, chip('all', 'Tous'), chip('watch', 'À surveiller'), chip('worktrees', 'Worktrees')),
        h('div', { className: 'git-tablewrap' },
          h('table', { className: 'git-table' },
            h('thead', {}, h('tr', {},
              h('th', {}, 'Dépôt'), h('th', {}, 'Branche'), h('th', {}, 'État'), h('th', {}, 'Sync'), h('th', {}, 'Upstream'), h('th', {}, 'Dernier'), h('th', {}, 'PR'))),
            h('tbody', {}, rows.map((item) => h('tr', { key: item.name, onClick: () => onOpen(item) },
              h('td', {}, h('b', {}, item.name)),
              h('td', {}, h('span', { className: 'mono' }, item.branch)),
              h('td', {}, h('span', { className: `st ${item.state}` }, h(Dot, { state: item.state }), gitStateText(item))),
              h('td', {}, syncText(item)),
              h('td', {}, h('span', { className: 'mono', style: item.upstreamMissing ? { color: '#ff9b9b' } : null }, item.upstreamMissing ? 'aucun' : item.upstream || '—')),
              h('td', {}, item.last || '—'),
              h('td', {}, item.pr ? h('span', { className: 'mono', style: item.pr.checks === 'failure' ? { color: '#ff9b9b' } : item.pr.isDraft ? { color: 'var(--amber)' } : null }, prLabel(item.pr)) : '—')))))),
        h('div', { className: 'git-quiet' }, 'Lecture seule : le panneau lit git, il ne l’écrit jamais.'))
    }

    function GitWorktrees({ items, onOpen, onAll }) {
      const withWt = items.filter((item) => (item.worktreeCount ?? 0) > 0).sort((a, b) => b.worktreeCount - a.worktreeCount)
      const primary = withWt[0]
      const ailleurs = items.filter((item) => item.name !== primary?.name && (item.branch !== 'main' || item.worktreeCount)).slice(0, 3)
      const total = items.reduce((sum, item) => sum + (item.worktreeCount ?? 0), 0)
      return h('section', { className: 'git-card git-wt' },
        h('div', { className: 'schead' },
          h('h3', {}, h(Icon, { name: 'layers', size: 13 }), 'Où vit le travail', h('span', { className: 'mono' }, `${total} checkout${total > 1 ? 's' : ''}`)),
          h('button', { className: 'more', onClick: onAll }, `${items.length} dépôts`, h(Icon, { name: 'chevron' }))),
        primary
          ? h('div', {},
            h('div', { className: 'git-wtrow' },
              h('span', { className: 'p' }, h(Icon, { name: 'folder', size: 11 }), ' ', shortPath(primary.path)),
              h('span', { className: 'b' }, primary.branch),
              h('span', { className: 'r' }, primary.pr ? prLabel(primary.pr) : gitStateText(primary))),
            (primary.worktrees ?? []).map((worktree) => h('div', { className: 'git-wtrow', key: worktree.path },
              h('span', { className: 'p' }, '  ', shortPath(worktree.path)),
              h('span', { className: 'b' }, worktree.branch),
              h('span', { className: 'r', style: worktree.upstreamMissing ? { color: '#ff9b9b' } : null }, worktree.pr ? prLabel(worktree.pr) : worktree.upstreamMissing ? 'non poussée' : 'propre'))))
          : h('div', { className: 'git-quiet' }, 'Aucun worktree lié.'),
        ailleurs.length ? h('div', { className: 'git-else' },
          h('b', {}, 'Ailleurs'), ' : ',
          ailleurs.map((item, index) => h('span', { key: item.name }, index ? ' · ' : '', h('b', {}, item.name), ' ', item.branch, item.worktreeCount ? ` (${item.worktreeCount})` : ''))) : null,
        h('div', { className: 'git-quiet' }, 'Un même dépôt, une branche par worktree.'))
    }

    function GitMissions({ items, onOpen }) {
      const seen = new Set()
      const rows = []
      for (const item of items) {
        const add = (branch, repo, pr, missing) => {
          const id = missionId(branch)
          const key = `${id}::${branch}`
          if (!id || seen.has(key)) return
          seen.add(key)
          rows.push({ id, repo, branch, pr, missing })
        }
        if (missionId(item.branch) && item.branch !== 'main') add(item.branch, item.name, item.pr, item.upstreamMissing)
        for (const worktree of item.worktrees ?? []) if (missionId(worktree.branch)) add(worktree.branch, item.name, worktree.pr, worktree.upstreamMissing)
      }
      rows.sort((a, b) => a.id.localeCompare(b.id))
      return h('section', { className: 'git-card' },
        h('div', { className: 'schead' },
          h('h3', {}, h(Icon, { name: 'list', size: 13 }), 'Branches de mission', h('span', { className: 'mono' }, String(rows.length)))),
        rows.slice(0, 6).map((row) => h('div', { className: 'git-mrow', key: `${row.id}-${row.branch}` },
          h('span', { className: 'git-mid' }, row.id),
          h('span', { className: 'n' }, row.repo),
          h('span', { className: 'b' }, row.branch),
          h('span', { className: 'r', style: row.missing ? { color: '#ff9b9b' } : null }, row.pr ? prLabel(row.pr) : row.missing ? 'non poussée' : '—'))),
        h('div', { className: 'git-quiet' }, 'Dérivé des branches locales ; dsh-missions reste la source des fiches.'))
    }

    function GitActivity({ items }) {
      const entries = []
      for (const item of items) {
        if (item.commits24h > 0) entries.push({ label: item.name, branch: item.branch, sha: item.lastSha, subject: item.lastSubject, at: item.lastAt, count: item.commits24h })
        for (const worktree of item.worktrees ?? []) {
          if (worktree.commits24h > 0) entries.push({ label: worktree.label, branch: worktree.branch, sha: worktree.lastSha, subject: worktree.lastSubject, at: worktree.lastAt, count: worktree.commits24h })
        }
      }
      entries.sort((a, b) => (b.at ?? 0) - (a.at ?? 0))
      const total = entries.reduce((sum, entry) => sum + entry.count, 0)
      return h('section', { className: 'git-card git-act' },
        h('div', { className: 'schead' },
          h('h3', {}, h(Icon, { name: 'pulse', size: 13 }), 'Activité récente', h('span', { className: 'mono' }, '24 h'))),
        h('div', { className: 'big' }, h('b', {}, String(total)), h('span', {}, `commits sur 24 h, dans ${plural(entries.length, 'checkout')}`)),
        entries.slice(0, 4).map((entry) => h('div', { className: 'arow', key: `${entry.label}-${entry.branch}` },
          h('span', { className: 'n' }, entry.label),
          h('span', { className: 'b' }, entry.branch),
          h('span', { className: 't' }, relTime(entry.at)))),
        h('div', { className: 'git-quiet' }, 'Aucun stash, aucun HEAD détaché sur les dépôts suivis.'))
    }

    function GitGloss({ onGloss }) {
      return h('section', { className: 'git-card' },
        h('div', { className: 'schead' }, h('h3', {}, h(Icon, { name: 'book', size: 13 }), 'Comprendre les chiffres')),
        h('div', { className: 'git-gloss' }, h('b', {}, 'Upstream, ahead/behind, fichier suivi, worktree, HEAD détaché'), ' : douze termes, lus sur les mêmes commandes que le panneau.'),
        h('button', { className: 'btn-o', style: { marginTop: '7px', justifyContent: 'space-between', width: '100%' }, onClick: onGloss }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px' } }, h(Icon, { name: 'book' }), 'Ouvrir le lexique'), h('span', { style: { color: 'var(--tx3)' } }, '12 termes')))
    }

    function GitSheet({ item, onClose, onToast }) {
      const [detail, setDetail] = useState(null)
      const [detailError, setDetailError] = useState('')
      useEffect(() => {
        let alive = true
        setDetail(null)
        setDetailError('')
        api(`/systeme/api/depot?name=${encodeURIComponent(item.name)}`)
          .then((data) => { if (alive) setDetail(data) })
          .catch((readError) => { if (alive) setDetailError(readError.message) })
        return () => { alive = false }
      }, [item.name])

      const worktrees = item.worktrees ?? []
      const files = item.dirtyFiles ?? []
      const prRows = []
      if (item.pr) prRows.push({ pr: item.pr, branch: item.branch })
      for (const worktree of worktrees) if (worktree.pr) prRows.push({ pr: worktree.pr, branch: worktree.branch })
      const copy = (text, label) => {
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(text).then(() => onToast(`${label} copié`)).catch(() => onToast('Copie impossible'))
        } else {
          onToast('Copie indisponible')
        }
      }
      const sec = (title, extra, children) => h('div', { className: 'git-sec' },
        h('div', { className: 'git-sec-h' }, h('span', {}, title), extra ? h('span', { className: 'n' }, String(extra)) : null),
        children)
      const kv = (label, value, tone) => h('div', { className: 'git-kv', key: label }, h('span', {}, label), h('b', { className: tone || '' }, value))

      const calls = []
      if (item.detached) calls.push('HEAD détaché : les commits créés ne sont rattachés à aucune branche.')
      if (item.upstreamMissing) calls.push(`La branche ${item.branch} n’existe pas sur origin : ce travail ne vit que sur ce poste.`)
      if (item.worktreeCount) calls.push(`${plural(item.worktreeCount, 'checkout')} du même dépôt ; une branche ne peut être extraite que dans un seul worktree à la fois.`)
      if (item.dirty) calls.push(`${plural(item.dirty, 'fichier')} non commité${item.dirty > 1 ? 's' : ''}, dont le plus ancien depuis ${item.oldestDirtyDays} j.`)

      return h('div', {},
        h('div', { className: 'git-sheetveil', onClick: onClose }),
        h('aside', { className: 'git-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': `Dépôt ${item.name}` },
          h('div', { className: 'git-shead' },
            h('div', { className: 'hc' },
              h('h2', {}, item.name, h(StatePill, { state: item.state, label: item.state === 'ok' ? 'Propre' : item.state === 'bad' ? 'À traiter' : 'À surveiller' })),
              h('div', { className: 'sub' }, `${shortPath(item.path)} · ${plural(item.worktreeCount, 'checkout')} · branche ${item.branch}${missionId(item.branch) ? ` · mission ${missionId(item.branch)}` : ''}`)),
            h('button', { className: 'iconbtn', onClick: onClose, 'aria-label': 'Fermer' }, h(Icon, { name: 'x' }))),
          h('div', { className: 'git-sbody' },
            calls.length ? h('div', { className: 'git-call' }, h(Icon, { name: 'info', size: 14 }), h('span', {}, calls.slice(0, 2).join(' '))) : null,
            sec('Branche & upstream', null, h('div', {},
              kv('Branche', item.branch, 'mono'),
              kv('Upstream', item.upstream || 'aucun', item.upstream ? 'mono' : 'hot'),
              kv('Avance / retard', item.behind || item.ahead ? `${syncText(item)} vs ${item.upstream || 'origin/main'}` : 'à jour'),
              kv('Avance sur main', item.aheadMain > 0 ? `+${item.aheadMain} commits` : '—'),
              kv('Dernier commit', item.lastAt ? `${relTime(item.lastAt)} · ${item.lastSha}` : '—'),
              kv('PR', prLabel(item.pr)),
              kv('Mission', missionId(item.branch) || '—'))),
            worktrees.length ? sec('Checkouts du dépôt', worktrees.length, h('div', {}, worktrees.map((worktree) => h('div', { className: 'git-wtrow', key: worktree.path },
              h('span', { className: 'p' }, shortPath(worktree.path)),
              h('span', { className: 'b' }, worktree.branch),
              h('span', { className: 'r', style: worktree.upstreamMissing ? { color: '#ff9b9b' } : null }, worktree.pr ? prLabel(worktree.pr) : worktree.upstreamMissing ? 'non poussée' : 'propre'))))) : null,
            prRows.length ? sec('Pull requests', prRows.length, h('div', {}, prRows.map((row) => h('div', { className: 'git-commit', key: row.pr.number },
              h('span', { className: 'h' }, `#${row.pr.number}`),
              h('span', { className: 's' }, row.branch),
              h('span', { className: 't', style: row.pr.checks === 'failure' ? { color: '#ff9b9b' } : null }, row.pr.checks === 'failure' ? 'échec' : row.pr.reviewDecision === 'CHANGES_REQUESTED' ? 'à corriger' : row.pr.isDraft ? 'draft' : 'ouverte'))))) : null,
            files.length ? sec('Fichiers modifiés', files.length, h('div', {}, files.slice(0, 10).map((file) => h('div', { className: 'git-file', key: file.path },
              h('span', { className: 'c' }, fileCode(file.code)),
              h('span', { className: 'p' }, file.path))))) : null,
            sec('Derniers commits', detail?.commits?.length ?? 0, detail
              ? (detail.commits.length
                ? h('div', {}, detail.commits.map((commit) => h('div', { className: 'git-commit', key: commit.sha },
                  h('span', { className: 'h' }, commit.sha),
                  h('span', { className: 's' }, commit.subject),
                  h('span', { className: 't' }, relTime(commit.at)))))
                : h('div', { className: 'git-quiet' }, 'Aucun commit lisible.'))
              : h('div', { className: 'git-quiet' }, detailError || 'Lecture des commits…')),
            sec('État de travail', null, h('div', {},
              kv('Working tree', item.dirty ? `${plural(item.dirty, 'fichier')} · ${item.tracked} suivi${item.tracked > 1 ? 's' : ''}, ${item.untracked} non suivi${item.untracked > 1 ? 's' : ''}` : 'propre', item.dirty ? 'hot' : ''),
              kv('Stash', String(item.stashCount ?? 0)),
              kv('HEAD', `${item.detached ? 'détaché' : item.branch} · ${item.detached ? 'aucune branche' : 'attaché'}`),
              kv('Fetch', fetchText(item.fetchHours)),
              kv('Branches locales', String(item.branchCount ?? 0)))),
            sec('Dernière lecture', null, detail?.status
              ? h('div', { className: 'git-code' }, String(detail.status).split('\n').filter((line) => line.startsWith('# branch')).slice(0, 5).join('\n') || '# aucun détail')
              : h('div', { className: 'git-quiet' }, detailError || 'Lecture…')),
            sec('Ce que le panneau lit', null, h('div', { className: 'git-code' }, 'git status --porcelain=v2 --branch\ngit worktree list --porcelain\ngit for-each-ref # branches, upstream, dates\ngh pr list --json # PR, checks (cache 60 s)'))),
          h('div', { className: 'git-sfoot' },
            h('span', {}, `Dernier fetch : ${fetchText(item.fetchHours)} · lecture seule`),
            h('span', { className: 'r' },
              h('button', { className: 'btn-o btn-sm', onClick: () => copy(item.path, 'Chemin') }, h(Icon, { name: 'copy' }), 'Copier le chemin'),
              h('button', { className: 'btn-o btn-sm', onClick: () => copy(`git -C ${item.path} status --porcelain=v2 --branch`, 'Commande') }, h(Icon, { name: 'terminal' }), 'Copier git status'),
              h('button', { className: 'btn-brand btn-sm', onClick: onClose }, 'Fermer')))))
    }

    function GitAllModal({ items, onPick, onClose }) {
      return h(Modal, { title: `Les ${items.length} dépôts`, xwide: true, onClose },
        h('div', { className: 'git-allgrid' }, items.map((item) => h('button', { className: 'git-allrow', key: item.name, onClick: () => onPick(item) },
          h(Dot, { state: item.state }),
          h('span', { className: 'n' }, item.name),
          h('span', { className: 'b' }, item.branch),
          h('span', { className: 's' }, item.pr ? prLabel(item.pr) : item.state === 'ok' ? 'propre' : gitStateText(item))))),
        h('div', { className: 'cnote' }, 'Les worktrees liés sont comptés dans leur dépôt ; chaque ligne ouvre le tiroir du dépôt.'),
        h('div', { className: 'cfoot' }, h('button', { className: 'btn-o', onClick: onClose }, 'Fermer')))
    }

    function GitCausesModal({ repos, onOpen, onClose }) {
      const causes = repos?.causes ?? []
      return h(Modal, { title: `${plural(causes.length, 'cause')}, ${plural(repos?.attentionCount ?? 0, 'dépôt')}`, xwide: true, onClose },
        h('div', { className: 'cnote' }, `relevé du ${new Date().toLocaleDateString('fr-FR')} · ${causes.length} causes pour ${repos?.attentionCount ?? 0} dépôts à surveiller.`),
        causes.map((cause) => h('div', { className: 'git-cblock', key: cause.id },
          h('div', { className: 'ch' }, h(Icon, { name: cause.id === 'behind' ? 'down' : cause.id === 'dirty' ? 'file' : 'git', size: 13 }), cause.title),
          h('p', {}, cause.desc),
          h('pre', {}, cause.evidence || ''),
          h('div', { className: 'cp' }, 'Portée : ', h('b', {}, cause.scope || '—'), cause.repo ? h('button', { className: 'ca', style: { marginLeft: '10px', color: 'var(--link)' }, onClick: () => onOpen(cause.repo) }, 'Ouvrir le dépôt') : null))),
        h('div', { className: 'cnote' }, 'Le panneau ne corrige rien : il nomme la cause, la preuve et la portée, et laisse la commande à l’opérateur.'),
        h('div', { className: 'cfoot' }, h('button', { className: 'btn-o', onClick: onClose }, 'Compris')))
    }

    const GIT_TERMS = [
      { icon: 'git', term: 'Dépôt / clone', text: 'Un dossier qui porte une histoire et une branche courante. Le panneau compte les dépôts sous ~/projects.' },
      { icon: 'layers', term: 'Worktree', text: 'Deuxième dossier attaché au même dépôt. Une branche ne peut être extraite que dans un seul worktree à la fois.' },
      { icon: 'git', term: 'Branche', text: 'Une ligne de commits. La branche courante est celle que le checkout a extraite.' },
      { icon: 'arrow', term: 'Upstream', text: 'La branche distante que la branche locale suit, par exemple origin/main. Sans upstream, ahead/behind ne veut rien dire.' },
      { icon: 'down', term: 'Ahead / behind', text: 'Commits d’avance et de retard sur l’upstream. ↑ 2 ↓ 3 : la branche a divergé, il faudra rebaser ou fusionner.' },
      { icon: 'check', term: 'Fichier suivi modifié', text: 'Un fichier connu de git, changé dans l’index ou le dossier de travail. Le panneau le compte, ne le lit pas.' },
      { icon: 'file', term: 'Non suivi', text: 'Un fichier que git ne connaît pas encore : nouveau fichier, dossier de build, artefact généré.' },
      { icon: 'alert', term: 'HEAD détaché', text: 'Le checkout ne suit plus aucune branche. Les commits créés là ne sont rattachés à rien : le panneau le signale en rouge.' },
      { icon: 'lock', term: 'Stash', text: 'Des modifications rangées de côté. Un stash ancien est un travail oublié ; le panneau montre son âge et son message.' },
      { icon: 'refresh', term: 'Fetch', text: 'Lit les nouveautés distantes sans toucher au travail. La fraîcheur du fetch date la valeur de « behind ».' },
      { icon: 'layers', term: 'Machete', text: 'L’ordre déclaré des branches d’une pile de PR, dans .git/machete. Une branche hors layout est une branche que la clôture ne verra pas.' },
      { icon: 'check', term: 'PR / checks', text: 'Une demande de fusion GitHub : draft ou prête, revue demandée ou approuvée, checks verts ou en échec. Lu par gh, jamais par git seul.' },
    ]

    function GitGlossModal({ onClose }) {
      return h(Modal, { title: 'Comprendre les chiffres', xwide: true, onClose },
        h('div', { className: 'cnote' }, 'Chaque colonne vient d’une commande git locale ; les PR viennent de gh, avec un cache de 60 s.'),
        h('div', { className: 'git-terms' }, GIT_TERMS.map((term) => h('div', { className: 'git-term', key: term.term },
          h('span', { className: 'ti' }, h(Icon, { name: term.icon, size: 11 })),
          h('div', {}, h('b', {}, term.term), h('p', {}, term.text))))),
        h('div', { className: 'cnote' }, 'Les seuils de couleur sont expliqués dans le README du plugin.'),
        h('div', { className: 'cfoot' }, h('button', { className: 'btn-o', onClick: onClose }, 'Fermer')))
    }

    function DepotsPanel({ tab, onTab }) {
      const { state, error, loading, load, loadedAt, now } = useEtat()
      const [filter, setFilter] = useState('all')
      const [sheet, setSheet] = useState(null)
      const [allOpen, setAllOpen] = useState(false)
      const [causesOpen, setCausesOpen] = useState(false)
      const [glossOpen, setGlossOpen] = useState(false)
      const [toast, setToast] = useState('')
      const toastTimer = useRef(null)

      useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])
      useEffect(() => { if (state?.repos?.hidden) onTab('machine') }, [state?.repos?.hidden, onTab])

      const showToast = useCallback((message) => {
        setToast(message)
        if (toastTimer.current) clearTimeout(toastTimer.current)
        toastTimer.current = setTimeout(() => setToast(''), 3200)
      }, [])

      const openRepo = (target) => {
        const item = typeof target === 'string' ? (state?.repos?.items ?? []).find((entry) => entry.name === target) : target
        if (item) setSheet(item)
      }

      if (!state) {
        return h('div', { className: 'dsh-systeme' },
          h('div', { className: 'phead' }, h('div', {}, h(PanelTabs, { tab, onTab, showKubernetes: false, showRepos: true }), h('div', { className: 'sub' }, 'Dépôts · lecture seule'))),
          error ? h('div', { className: 'errbar' }, h('span', { className: 'grow' }, `Le serveur ne répond pas : ${error}`), h('button', { className: 'btn-o', onClick: load }, 'Réessayer')) : h('div', { className: 'loading' }, 'Chargement des dépôts…'),
          h(Toast, { message: toast }))
      }

      const repos = state.repos
      const items = repos?.items ?? []
      const causes = repos?.causes ?? []
      const age = loadedAt ? ageText((now - loadedAt) / 1000) : '—'
      const total = repos?.total ?? items.length
      const worktreeCount = repos?.worktreeCount ?? items.reduce((sum, item) => sum + (item.worktreeCount ?? 0), 0)
      const branchCount = repos?.branchCountAll ?? items.reduce((sum, item) => sum + (item.branchCount ?? 0), 0)
      const prs = repos?.prCount ?? 0
      const attention = repos?.attentionCount ?? items.filter((item) => item.state !== 'ok').length

      return h('div', { className: 'dsh-systeme' },
        h('div', { className: 'phead' },
          h('div', {}, h(PanelTabs, { tab, onTab, showKubernetes: !state.k8s?.hidden, showRepos: !repos.hidden }), h('div', { className: 'sub' }, `${plural(total, 'dépôt')} · ${plural(worktreeCount, 'worktree')} · ${plural(branchCount, 'branche locale').replace('branche locales', 'branches locales')} · lecture seule · mesuré ${age}`)),
          h('div', { className: 'pactions' },
            h('span', { className: `live-pill ${error ? 'off' : ''}` }, h(Dot, { state: error ? 'bad' : 'ok' }), error ? 'Hors ligne' : 'En direct'),
            h('button', { className: 'btn-o', onClick: load, disabled: loading }, h(Icon, { name: 'refresh' }), loading ? 'Rafraîchissement…' : 'Rafraîchir'),
            h('button', { className: 'btn-o', onClick: () => setGlossOpen(true) }, h(Icon, { name: 'book' }), 'Comprendre'),
            h('button', { className: 'iconbtn', title: 'Réglages (onglet Machine)', onClick: () => { onTab('machine'); showToast('Les réglages sont dans l’onglet Machine') } }, h(Icon, { name: 'gear' })))),
        error ? h('div', { className: 'errbar' }, h('span', { className: 'grow' }, `Le serveur ne répond pas : ${error}. Les dernières mesures restent affichées.`), h('button', { className: 'btn-o', onClick: load }, 'Réessayer')) : null,
        h(GitBanner, { repos, age, onGloss: () => setGlossOpen(true), onCauses: () => setCausesOpen(true) }),
        h(GitKpis, { repos }),
        h('div', { className: 'git-body' },
          h('div', { className: 'git-col' },
            h(GitCauses, { repos, onOpen: openRepo, onAll: () => setCausesOpen(true) }),
            h(GitTable, { repos, filter, setFilter, onOpen: openRepo, onAll: () => setAllOpen(true) })),
          h('div', { className: 'git-col' },
            h(GitWorktrees, { items, onOpen: openRepo, onAll: () => setAllOpen(true) }),
            h(GitMissions, { items, onOpen: openRepo }),
            h(GitActivity, { items }),
            h(GitGloss, { onGloss: () => setGlossOpen(true) }))),
        h('div', { className: 'git-foot' },
          h('span', {}, `Sources : git status --porcelain=v2 · worktree list · for-each-ref · stash list · gh pr list (cache 60 s)`),
          h('span', { className: 'r' },
            h('span', {}, `Plugin dsh-monitor ${state.version ?? ''}`),
            h('span', {}, 'onglet Dépôts'),
            h('span', {}, `${attention} à surveiller`))),
        sheet ? h(GitSheet, { item: sheet, onClose: () => setSheet(null), onToast: showToast }) : null,
        allOpen ? h(GitAllModal, { items, onPick: (item) => { setAllOpen(false); setSheet(item) }, onClose: () => setAllOpen(false) }) : null,
        causesOpen ? h(GitCausesModal, { repos, onOpen: (name) => { setCausesOpen(false); openRepo(name) }, onClose: () => setCausesOpen(false) }) : null,
        glossOpen ? h(GitGlossModal, { onClose: () => setGlossOpen(false) }) : null,
        h(Toast, { message: toast }))
    }

    function percentClass(value) {
      const number = Number(value) || 0
      return number >= 90 ? 'bad' : number >= 75 ? 'warn' : ''
    }

    function SystemePanel(props) {
      const [tab, setTab] = useState(() => {
        try {
          const stored = window.localStorage.getItem('dsh-monitor:tab')
          return stored === 'kubernetes' || stored === 'depots' ? stored : 'machine'
        } catch (readError) {
          return 'machine'
        }
      })
      const onTab = (next) => {
        setTab(next)
        try { window.localStorage.setItem('dsh-monitor:tab', next) } catch (writeError) { setTab(next) }
      }
      if (tab === 'kubernetes') return h(KubernetesPanel, { ...props, tab, onTab })
      if (tab === 'depots') return h(DepotsPanel, { ...props, tab, onTab })
      return h(MachinePanel, { ...props, tab, onTab })
    }

    const PKG = '@daedalforge/dsh-monitor'
    const ENTRY_ID = 'systeme'
    const SECTIONS = [
      {
        title: 'Général',
        fields: [
          { key: 'refreshSeconds', label: 'Rafraîchissement (secondes)', hint: 'Cadence du panneau, entre 15 et 900 secondes.', placeholder: '60', number: true },
        ],
      },
      {
        title: 'Dépôts git',
        fields: [
          { key: 'showRepos', label: 'Afficher l’onglet Dépôts', hint: 'Masque l’onglet ; la collecte continue en arrière-plan.', toggle: true },
          { key: 'projectsRoot', label: 'Dossier des dépôts', hint: 'Racine des dépôts git surveillés ; par défaut ~/projects.', placeholder: '~/projects' },
        ],
      },
      {
        title: 'Kubernetes',
        fields: [
          { key: 'showK8s', label: 'Afficher la carte Kubernetes', hint: 'Masque la carte et son détail ; la lecture du cluster continue.', toggle: true },
        ],
      },
    ]
    const FIELDS = SECTIONS.flatMap((section) => section.fields)

    function formFrom(props) {
      let forms = null
      try { forms = props?.ctx?.get?.('configForms') ?? forms } catch {}
      if (!forms) {
        try { forms = props?.services?.getService?.('configForms') ?? forms } catch {}
      }
      return forms?.get?.(ENTRY_ID) ?? null
    }

    function formFor(ctx) {
      try {
        const forms = ctx?.get?.('configForms')
        const form = forms?.get?.(ENTRY_ID)
        return form && typeof form.getSnapshot === 'function' ? form : null
      } catch {
        return null
      }
    }

    function fieldText(field, value) {
      if (value === undefined || value === null) return ''
      return String(value)
    }

    function fieldDraft(field, value) {
      if (field.toggle) return value === undefined || value === null ? true : Boolean(value)
      if (value === false) return ''
      return fieldText(field, value)
    }

    function ReglagesPanel(props) {
      const form = useMemo(() => formFor(props.ctx), [props.ctx])
      const subscribe = useCallback((listener) => (form ? form.subscribe(listener) : () => {}), [form])
      const snapshotOf = useCallback(() => (form ? form.getSnapshot() : null), [form])
      const snapshot = useSyncExternalStore(subscribe, snapshotOf, snapshotOf)
      const [draft, setDraft] = useState(null)
      const [busy, setBusy] = useState(false)
      const [message, setMessage] = useState('')

      useEffect(() => {
        if (!snapshot || snapshot.status === 'loading') return
        setDraft((current) => current ?? Object.fromEntries(FIELDS.map((field) => [field.key, fieldDraft(field, snapshot.value?.[field.key])])))
      }, [snapshot])

      const setField = (key, value) => setDraft((current) => ({ ...(current ?? {}), [key]: value }))

      const operations = () => {
        const ops = []
        for (const field of FIELDS) {
          if (field.toggle) {
            const current = snapshot?.value?.[field.key] === undefined || snapshot?.value?.[field.key] === null ? true : Boolean(snapshot.value[field.key])
            if (Boolean(draft?.[field.key]) !== current) ops.push({ op: 'set', path: [field.key], value: Boolean(draft?.[field.key]) })
            continue
          }
          const raw = String(draft?.[field.key] ?? '').trim()
          const current = fieldText(field, snapshot?.value?.[field.key])
          if (field.number) {
            if (raw === '') {
              if (current !== '') ops.push({ op: 'unset', path: [field.key] })
              continue
            }
            const value = Number(raw)
            if (!Number.isFinite(value) || value < REFRESH_MIN_SECONDS || value > REFRESH_MAX_SECONDS) throw new Error(`Cadence invalide : entre ${REFRESH_MIN_SECONDS} et ${REFRESH_MAX_SECONDS} secondes.`)
            if (String(value) !== current) ops.push({ op: 'set', path: [field.key], value })
            continue
          }
          if (raw === current) continue
          if (raw === '') ops.push({ op: 'unset', path: [field.key] })
          else ops.push({ op: 'set', path: [field.key], value: raw })
        }
        return ops
      }

      const save = async () => {
        if (!form) return
        let ops
        try { ops = operations() } catch (error) { setMessage(error.message); return }
        if (ops.length === 0) { setMessage('Aucun changement.'); return }
        setBusy(true); setMessage('')
        try {
          const ok = await form.mutate(ops)
          setMessage(ok ? 'Réglages enregistrés.' : 'Écriture refusée ; rechargez la page.')
        } catch (error) {
          setMessage(error?.message ?? 'Écriture impossible.')
        } finally {
          setBusy(false)
        }
      }

      const reset = async () => {
        if (!form) return
        setBusy(true); setMessage('')
        try {
          const ok = await form.mutate(FIELDS.map((field) => ({ op: 'unset', path: [field.key] })))
          if (ok) setDraft(null)
          setMessage(ok ? 'Défauts rétablis.' : 'Écriture refusée ; rechargez la page.')
        } catch (error) {
          setMessage(error?.message ?? 'Écriture impossible.')
        } finally {
          setBusy(false)
        }
      }

      if (props.view === 'summary') return h('span', { className: 'syscfg-summary' }, 'Réglages du panneau Système : dépôts git, Kubernetes, coûts et cadence, et l’affichage de chaque carte.')

      const disabled = busy || !form || snapshot?.writable === false

      return h('div', { className: 'syscfg' },
        h('p', { className: 'syscfg-intro' }, 'Enregistrés dans le patch du profil, sous l’entrée « systeme ».'),
        form ? null : h('p', { className: 'syscfg-note' }, 'Les formulaires de configuration ne sont pas disponibles dans cette installation.'),
        SECTIONS.map((section) => h('fieldset', { key: section.title, className: 'syscfg-section' },
          h('legend', { className: 'syscfg-title' }, section.title),
          section.fields.map((field) => (field.toggle
            ? h('button', {
              key: field.key,
              type: 'button',
              role: 'switch',
              'aria-checked': Boolean(draft?.[field.key]),
              className: 'syscfg-toggle',
              disabled,
              onClick: () => setField(field.key, !draft?.[field.key]),
            },
              h('span', { className: `syscfg-switch${draft?.[field.key] ? ' on' : ''}` },
                h('span', { className: 'syscfg-switch-thumb' })),
              h('span', { className: 'syscfg-toggle-text' },
                h('span', { className: 'syscfg-label' }, field.label),
                h('span', { className: 'syscfg-hint' }, field.hint)))
            : h('label', { key: field.key, className: 'syscfg-field' },
              h('span', { className: 'syscfg-label' }, field.label),
              h('input', {
                className: 'syscfg-input',
                type: field.number ? 'number' : 'text',
                min: field.number ? REFRESH_MIN_SECONDS : undefined,
                max: field.number ? REFRESH_MAX_SECONDS : undefined,
                step: field.number ? 5 : undefined,
                placeholder: field.placeholder,
                disabled,
                value: draft?.[field.key] ?? '',
                onChange: (event) => setField(field.key, event.target.value),
              }),
              h('span', { className: 'syscfg-hint' }, field.hint)))))),
        h('div', { className: 'syscfg-actions' },
          h('button', { className: 'syscfg-btn', disabled, onClick: save }, busy ? 'Enregistrement…' : 'Enregistrer'),
          h('button', { className: 'syscfg-btn ghost', disabled, onClick: reset }, 'Rétablir les défauts'),
          message ? h('span', { className: 'syscfg-msg' }, message) : null))
    }

    const module = { exports: {} }
    const exports = module.exports

    exports.apply = function apply(ctx) {
      ctx.effect(() => {
        const style = document.createElement('style')
        style.dataset.plugin = 'dsh-monitor'
        style.textContent = CSS + GIT_CSS
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
        inject: () => ({ services: { getService: (name) => ctx.get(name) }, jobs: ctx.get('jobs'), ctx }),
      }, SystemePanel))

      for (const seat of [
        { name: 'plugins.bundle.config', key: PKG },
        { name: 'plugins.row.config', key: `${PKG}#${ENTRY_ID}` },
      ]) {
        ctx.slots.inject(seat.name, () => ctx.slots.register({ ...seat, inject: () => ({ ctx }) }, ReglagesPanel))
      }
    }

    exports.inject = ['slots']
    exports.missionId = missionId

    return module.exports
  },
})
