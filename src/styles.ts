export const APP_CSS = String.raw`
      *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

      /* Tokens live on :root, not .root — the sign-in and invite screens
         render outside the dashboard shell and still need them. */
      :root {
        --ink:#1C1712; --soft:#5b5348; --paper:#FAF7F1; --card:#FFF;
        --line:#E5DAC8; --gold:#B8860B; --gold-lt:#EFE0B0; --gold-pale:#FAF3DE;
        --burg:#8A2E2E; --grn:#2F6B4F;
        --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif;
        --serif:Georgia,"Times New Roman",serif;
      }

      body { font-family:var(--sans); background:var(--paper); color:var(--ink); }

      .root {
        font-family:var(--sans);
        background:var(--paper); color:var(--ink);
        min-height:100%; max-width:760px; margin:0 auto; padding-bottom:60px;
      }

      .loading { display:flex; flex-direction:column; align-items:center; justify-content:center;
                 min-height:60vh; gap:12px; color:var(--soft); font-family:var(--sans);
                 text-align:center; padding:24px 16px; }
      .spinner { width:24px; height:24px; border-radius:50%; border:3px solid var(--line);
                 border-top-color:var(--gold); animation:spin .8s linear infinite; }
      @keyframes spin { to { transform:rotate(360deg); } }

      .hdr      { display:flex; justify-content:space-between; align-items:flex-end;
                  padding:18px 16px 12px; border-bottom:1px solid var(--line); }
      .eyebrow  { font-size:11px; letter-spacing:.05em; color:var(--gold); font-weight:700; margin-bottom:2px; }
      .hdr-name { font-family:Georgia,"Times New Roman",serif; font-size:20px; font-weight:600; }
      .save-dot { font-size:11px; color:var(--soft); }
      .save-dot.saving { color:var(--gold); }

      .nav      { display:flex; gap:4px; padding:8px 10px; border-bottom:1px solid var(--line);
                  background:var(--paper); position:sticky; top:0; z-index:5; }
      .nav-btn  { flex:1; padding:9px 10px; border-radius:999px; border:1px solid transparent;
                  background:transparent; color:var(--soft); font-size:13px; font-weight:600;
                  cursor:pointer; white-space:nowrap; }
      .nav-active { background:var(--ink); color:var(--gold-lt); }

      .main     { padding:14px 12px 20px; }
      .tab-body { display:flex; flex-direction:column; gap:12px; }
      .tab-body h2 { font-family:Georgia,"Times New Roman",serif; font-size:18px; }
      .row-between { display:flex; justify-content:space-between; align-items:center; gap:10px; }

      /* ── period selector ── */
      .periodbar { display:flex; flex-direction:column; gap:8px; }
      .seg      { display:flex; gap:3px; background:var(--card); border:1px solid var(--line);
                  border-radius:999px; padding:3px; }
      .seg-btn  { flex:1; padding:8px 4px; border:none; background:transparent; border-radius:999px;
                  font-size:12px; font-weight:700; color:var(--soft); cursor:pointer;
                  letter-spacing:.02em; }
      .seg-on   { background:var(--ink); color:var(--gold-lt); }
      .navline  { display:flex; align-items:center; justify-content:space-between; gap:8px; }
      .navbtn   { width:34px; height:34px; border-radius:50%; border:1px solid var(--line);
                  background:var(--card); color:var(--ink); display:flex; align-items:center;
                  justify-content:center; cursor:pointer; flex-shrink:0; }
      .navbtn:disabled { opacity:.35; cursor:default; }
      .navlabel { flex:1; text-align:center; font-size:13px; font-weight:700;
                  display:flex; align-items:center; justify-content:center; gap:7px; flex-wrap:wrap; }
      .live-dot { background:var(--grn); color:#fff; border-radius:999px; padding:1px 8px;
                  font-size:9.5px; font-weight:800; letter-spacing:.04em; }

      /* ── executive scorecard (dark) ── */
      .exec     { background:var(--ink); border-radius:16px; padding:16px; color:#fff; }
      .exec-hd  { display:flex; justify-content:space-between; align-items:baseline; gap:8px;
                  font-size:10.5px; font-weight:800; letter-spacing:.09em;
                  color:var(--gold); text-transform:uppercase; margin-bottom:13px; flex-wrap:wrap; }
      .exec-period { color:#9c9384; letter-spacing:.02em; font-size:10px; text-transform:none; }
      .exec-hero{ display:flex; justify-content:space-between; align-items:flex-end; gap:14px; flex-wrap:wrap; }
      .eh-val   { font-family:Georgia,"Times New Roman",serif; font-size:33px; font-weight:600;
                  color:var(--gold-lt); line-height:1; font-variant-numeric:tabular-nums; }
      .eh-lbl   { font-size:10px; color:#9c9384; font-weight:700; text-transform:uppercase;
                  letter-spacing:.05em; margin-top:5px; }
      .eh-side  { display:flex; flex-direction:column; gap:3px; min-width:150px; flex:1; }
      .eh-row   { display:flex; justify-content:space-between; gap:12px; font-size:12px; color:#9c9384; }
      .eh-row b { color:#fff; font-variant-numeric:tabular-nums; }
      .exec-bar { height:6px; background:#332c24; border-radius:4px; overflow:hidden; margin:13px 0 0; }
      .exec-bar-fill { height:100%; background:var(--gold); }
      .exec-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:7px; margin-top:14px; }
      .eg       { background:#ffffff0d; border-radius:9px; padding:8px 4px; text-align:center; }
      .eg-v     { font-size:14.5px; font-weight:700; color:#fff; font-variant-numeric:tabular-nums;
                  line-height:1.2; }
      .eg-l     { font-size:8.5px; color:#9c9384; font-weight:700; margin-top:3px;
                  text-transform:uppercase; letter-spacing:.02em; }
      .exec-foot{ font-size:11px; color:#9c9384; margin-top:11px; text-align:center;
                  border-top:1px solid #332c24; padding-top:10px; }

      /* ── attention ── */
      .attn     { background:var(--card); border:1px solid var(--line); border-radius:13px; padding:13px 14px; }
      .attn-hd  { display:flex; align-items:center; gap:6px; font-size:10.5px; font-weight:800;
                  color:var(--burg); text-transform:uppercase; letter-spacing:.05em; margin-bottom:9px; }
      .attn-row { display:flex; gap:8px; font-size:12.5px; line-height:1.55; padding:5px 0;
                  border-top:1px solid var(--line); }
      .attn-row:first-of-type { border-top:none; }
      .sev      { flex-shrink:0; font-size:11px; line-height:1.5; }

      /* ── panels ── */
      .panel    { background:var(--card); border:1px solid var(--line); border-radius:13px; padding:13px 14px; }
      .panel-hd { font-family:Georgia,"Times New Roman",serif; font-size:14.5px;
                  font-weight:600; margin-bottom:10px; }

      /* comparison */
      .cmp-head { display:grid; grid-template-columns:1.15fr .85fr .85fr .7fr; gap:6px;
                  font-size:9.5px; font-weight:800; color:var(--soft); text-transform:uppercase;
                  letter-spacing:.02em; padding-bottom:6px; border-bottom:1px solid var(--line); }
      .cmp-cur  { color:var(--gold); }
      .cmp-row  { display:grid; grid-template-columns:1.15fr .85fr .85fr .7fr; gap:6px;
                  align-items:center; padding:7px 0; border-bottom:1px solid var(--line); font-size:12.5px; }
      .cmp-row:last-child { border-bottom:none; }
      .cmp-lbl  { color:var(--soft); font-weight:600; font-size:11.5px; }
      .cmp-a    { font-weight:700; font-variant-numeric:tabular-nums; }
      .cmp-b    { color:var(--soft); font-variant-numeric:tabular-nums; }
      .delta    { font-size:11px; font-weight:800; border-radius:999px; padding:1px 7px;
                  border:1px solid; text-align:center; white-space:nowrap; }
      .delta-up   { background:#2F6B4F14; color:var(--grn);  border-color:#2F6B4F44; }
      .delta-down { background:#8A2E2E12; color:var(--burg); border-color:#8A2E2E40; }
      .delta-flat { background:var(--paper); color:var(--soft); border-color:var(--line); }
      .delta-none { background:transparent; color:var(--soft); border-color:transparent; }
      .partial-note { font-size:11px; color:#7a5c09; background:var(--gold-pale);
                      border:1px solid var(--gold-lt); border-radius:8px; padding:8px 10px;
                      margin-top:9px; line-height:1.5; }

      /* division rollup */
      .divrow   { padding:9px 0; border-bottom:1px solid var(--line); }
      .divrow:last-child { border-bottom:none; }
      .divtop   { display:flex; justify-content:space-between; align-items:center; gap:8px; }
      .divname  { font-size:12.5px; font-weight:600; display:flex; align-items:center; gap:7px;
                  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .divdot   { width:8px; height:8px; border-radius:2px; flex-shrink:0; display:inline-block; }
      .divrev   { font-size:13.5px; font-weight:700; font-variant-numeric:tabular-nums; }
      .divbar   { height:5px; background:var(--line); border-radius:3px; overflow:hidden; margin:6px 0 5px; }
      .divbar-fill { height:100%; border-radius:3px; }
      .divmeta  { display:flex; gap:12px; font-size:10.5px; color:var(--soft); flex-wrap:wrap; }

      /* stream / person performance rows */
      .sp-row   { padding:8px 0; border-bottom:1px solid var(--line); }
      .sp-row:last-child { border-bottom:none; }
      .sp-top   { display:flex; justify-content:space-between; gap:8px; align-items:baseline; }
      .sp-nm    { font-size:12.5px; font-weight:600; overflow:hidden;
                  text-overflow:ellipsis; white-space:nowrap; }
      .sp-rv    { font-size:13px; font-weight:700; color:var(--gold);
                  font-variant-numeric:tabular-nums; white-space:nowrap; }
      .sp-meta  { display:flex; gap:11px; font-size:10.5px; color:var(--soft); margin-top:3px; flex-wrap:wrap; }

      /* recurring */
      .rec-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; }
      .rec      { background:var(--paper); border:1px solid var(--line); border-radius:10px;
                  padding:9px 11px; text-align:center; }
      .rec-v    { font-size:16px; font-weight:700; font-variant-numeric:tabular-nums; }
      .rec-l    { font-size:9.5px; color:var(--soft); font-weight:700; margin-top:3px;
                  text-transform:uppercase; letter-spacing:.02em; }

      /* goal allocation */
      .alloc    { border-radius:10px; padding:11px 13px; margin-top:10px; border:1px solid; }
      .alloc-ok    { background:#2F6B4F0D; border-color:#2F6B4F33; }
      .alloc-under { background:var(--gold-pale); border-color:var(--gold-lt); }
      .alloc-over  { background:#8A2E2E0D; border-color:#8A2E2E33; }
      .alloc-row   { display:flex; justify-content:space-between; gap:10px; font-size:12px;
                     color:var(--soft); padding:2px 0; }
      .alloc-row b { color:var(--ink); font-variant-numeric:tabular-nums; }
      .alloc-hi    { border-top:1px solid var(--line); margin-top:5px; padding-top:6px; font-weight:700; }
      .alloc-hi b  { color:var(--gold); }
      .alloc-note  { font-size:11px; color:var(--soft); margin-top:6px; line-height:1.5; }

      /* pulse */
      .pulse      { background:var(--ink); border-radius:14px; padding:14px 16px; }
      .pulse-hd   { display:flex; justify-content:space-between; align-items:baseline; gap:8px;
                    font-size:11px; font-weight:800; letter-spacing:.09em;
                    color:var(--gold); text-transform:uppercase; margin-bottom:11px; flex-wrap:wrap; }
      .pulse-week { font-size:9.5px; color:#9c9384; letter-spacing:.02em; text-transform:none; }
      .pulse-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; }
      .pl         { text-align:center; }
      .pl-v       { font-size:19px; font-weight:700; color:#FFF; font-variant-numeric:tabular-nums; line-height:1.15; }
      .pl-v.gold  { color:var(--gold-lt); }
      .pl-l       { font-size:9.5px; color:#a99f8e; font-weight:600; margin-top:3px;
                    text-transform:uppercase; letter-spacing:.03em; }

      .company-block { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:14px; }

      .g2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:8px 0; }

      .field     { display:flex; flex-direction:column; gap:5px; }
      .field-lbl { font-size:11px; font-weight:700; color:var(--soft); }
      .input     { border:1px solid var(--line); border-radius:9px; padding:9px 11px;
                   font-size:15px; background:#fff; color:var(--ink); width:100%; }
      .input:focus { outline:2px solid var(--gold); outline-offset:1px; }

      .calc-disp { background:var(--gold-pale); border:1px solid var(--gold-lt); border-radius:9px;
                   padding:9px 11px; font-size:16px; font-weight:700; color:var(--gold); }

      .sect-lbl { font-size:10.5px; font-weight:800; color:var(--soft); letter-spacing:.04em;
                  text-transform:uppercase; padding:10px 0 2px;
                  border-top:1px solid var(--line); margin-top:4px; }

      .cg     { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:6px 0; }
      .ci     { background:var(--paper); border:1px solid var(--line); border-radius:10px; padding:9px 11px; }
      .ci-hero { background:#B8860B0D; border-color:#B8860B44; }
      .ci-lbl { font-size:10.5px; font-weight:700; color:var(--soft); }
      .ci-val { font-size:16px; font-weight:700; margin-top:2px; font-variant-numeric:tabular-nums; }

      .card       { background:var(--card); border:1px solid var(--line); border-radius:13px; overflow:hidden; }
      .card-head  { display:flex; align-items:flex-start; justify-content:space-between;
                    gap:10px; padding:12px 14px; cursor:pointer; user-select:none; }
      .card-head:active { background:var(--paper); }
      .card-head-left { flex:1; min-width:0; }
      .card-name  { font-size:14.5px; font-weight:700; }
      .card-name-row { display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
      .div-chip   { border-radius:999px; padding:1px 8px; font-size:9.5px; font-weight:800;
                    border:1px solid; letter-spacing:.02em; }
      .type-tag   { background:#6B4FA815; color:#6B4FA8; border:1px solid #6B4FA840;
                    border-radius:999px; padding:1px 7px; font-size:9.5px; font-weight:800; }
      .role-tag   { background:var(--gold-pale); color:var(--gold); border:1px solid var(--gold-lt);
                    border-radius:999px; padding:1px 9px; font-size:10.5px; font-weight:700; }
      .card-meta  { font-size:12.5px; color:var(--soft); margin-top:4px;
                    display:flex; flex-wrap:wrap; gap:5px; align-items:center; }
      .tag-pill   { background:var(--gold-pale); color:var(--gold); border:1px solid var(--gold-lt);
                    border-radius:999px; padding:1px 8px; font-size:11px; font-weight:700; }
      .chevron    { color:var(--soft); flex-shrink:0; margin-top:2px; }
      .tap-hint   { font-size:11px; color:var(--gold); margin-top:5px; font-weight:600; }
      .card-body  { padding:4px 14px 14px; border-top:1px solid var(--line);
                    display:flex; flex-direction:column; gap:8px; }
      .gold    { color:var(--gold); }
      .dim     { color:var(--soft); font-style:italic; }
      .fw7     { font-weight:700; }
      .sep     { opacity:.4; }

      .progbar      { height:5px; background:var(--line); border-radius:4px; overflow:hidden; margin-top:6px; }
      .progbar-fill { height:100%; background:var(--gold); transition:width .3s; }

      .score-line { display:flex; flex-wrap:wrap; gap:4px 9px; margin-top:6px; align-items:center; }
      .sl         { font-size:11.5px; color:var(--soft); white-space:nowrap; }
      .sl b       { color:var(--ink); font-weight:700; font-variant-numeric:tabular-nums; }
      .sl-rev b   { color:var(--gold); }
      .sl-pct     { font-size:11px; font-weight:800; border-radius:999px;
                    padding:1px 9px; border:1px solid; white-space:nowrap; }
      .sl-pct.ok  { background:#2F6B4F14; color:var(--grn);  border-color:#2F6B4F44; }
      .sl-pct.mid { background:var(--gold-pale); color:#7a5c09; border-color:var(--gold-lt); }
      .sl-pct.low { background:#8A2E2E12; color:var(--burg); border-color:#8A2E2E40; }

      .funnel-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
      .fn-cell     { display:flex; flex-direction:column; gap:4px; }
      .fn-lbl      { font-size:10.5px; font-weight:700; color:var(--soft); }

      .rate-strip { display:grid; grid-template-columns:repeat(2,1fr); gap:6px; margin-top:4px; }
      .rt         { background:var(--paper); border:1px solid var(--line); border-radius:8px;
                    padding:7px 9px; display:flex; justify-content:space-between; align-items:center; }
      .rt span    { font-size:10.5px; color:var(--soft); font-weight:600; }
      .rt b       { font-size:13px; font-weight:700; font-variant-numeric:tabular-nums; }

      .rep-list { display:flex; flex-direction:column; gap:4px; }
      .rep-row  { display:grid; grid-template-columns:1fr auto auto; gap:10px;
                  font-size:12.5px; padding:6px 9px; background:var(--paper);
                  border:1px solid var(--line); border-radius:8px; align-items:center; }
      .rep-nm { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .rep-q  { color:var(--soft); white-space:nowrap; }
      .rep-rv { font-weight:700; color:var(--gold); white-space:nowrap; }

      .matrix { display:flex; flex-direction:column; gap:5px; }
      .mx-row { display:grid; grid-template-columns:1.6fr .8fr .9fr; gap:8px; align-items:center; }
      .mx-name { font-size:12.5px; font-weight:600; line-height:1.25;
                 display:flex; flex-direction:column; overflow:hidden; }
      .mx-px  { font-size:10px; color:var(--soft); font-weight:500; }
      .mx-in  { padding:7px 8px; font-size:14px; }
      .mx-in-static { padding:7px 8px; font-size:13px; font-weight:700; text-align:center; }
      .mx-rev { font-size:13px; font-weight:700; color:var(--gold); text-align:right; }
      .mx-total { background:var(--gold-pale); border:1px solid var(--gold-lt);
                  border-radius:9px; padding:8px 7px; margin-top:3px; }

      .btn-primary   { display:flex; align-items:center; gap:6px; padding:9px 14px;
                       background:var(--ink); color:var(--gold-lt); border:none; border-radius:999px;
                       font-size:13px; font-weight:700; cursor:pointer; white-space:nowrap; }
      .btn-secondary { display:flex; align-items:center; gap:6px; padding:8px 14px; background:#fff;
                       border:1px solid var(--line); border-radius:999px; font-size:13px;
                       font-weight:600; cursor:pointer; color:var(--soft); }
      .btn-action    { display:flex; align-items:center; gap:6px; padding:9px 14px; background:#fff;
                       border:1px solid var(--line); border-radius:9px; font-size:13px;
                       font-weight:600; cursor:pointer; color:var(--ink); }
      .btn-danger    { color:var(--burg); border-color:#e6c9c9; }
      .btn-close-week{ display:flex; align-items:center; justify-content:center; gap:7px;
                       width:100%; padding:13px; margin-top:6px; background:var(--ink);
                       color:var(--gold-lt); border:none; border-radius:12px;
                       font-size:14px; font-weight:700; cursor:pointer; }
      .remove-btn    { display:flex; align-items:center; gap:6px; margin-top:4px; background:transparent;
                       border:1px solid #e6c9c9; border-radius:8px; color:var(--burg);
                       font-size:12.5px; font-weight:600; padding:7px 12px; cursor:pointer; }
      .icon-btn      { background:transparent; border:none; cursor:pointer; color:var(--soft); padding:4px; }

      .total-bar { display:flex; justify-content:space-between; align-items:center;
                   background:var(--gold-pale); border:1px solid var(--gold-lt);
                   border-radius:10px; padding:11px 14px; font-size:13.5px; color:var(--soft); }
      .readonly-note { font-size:11.5px; color:var(--soft); text-align:center; font-style:italic;
                       background:var(--gold-pale); border:1px solid var(--gold-lt);
                       border-radius:9px; padding:9px 12px; line-height:1.5; }

      .empty-state { text-align:center; padding:28px 16px; display:flex; flex-direction:column;
                     align-items:center; gap:8px; }
      .e-icon { font-size:36px; }
      .e-h    { font-size:15px; font-weight:700; }
      .e-sub  { font-size:13px; color:var(--soft); max-width:310px; }
      .hint-sm { font-size:12px; color:var(--soft); line-height:1.5; }
      .hint-xs { font-size:11px; color:var(--soft); line-height:1.5; font-style:italic; }
      .center  { text-align:center; }

      /* settings */
      .settings-row { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; }
      .setlist { display:flex; flex-direction:column; gap:9px; }
      .setrow  { background:var(--card); border:1px solid var(--line); border-radius:11px; padding:10px 12px; }
      .setname { font-size:13px; font-weight:700; margin-bottom:7px; }
      .setgrid { display:grid; grid-template-columns:1fr 1fr; gap:7px; }
      .sf      { display:flex; flex-direction:column; gap:3px; }
      .sf span { font-size:10px; font-weight:700; color:var(--soft); }
      .sf .input { padding:7px 9px; font-size:13.5px; }

      .histlist { display:flex; flex-direction:column; gap:7px; }
      .histrow  { display:flex; align-items:center; gap:10px; background:var(--card);
                  border:1px solid var(--line); border-radius:10px; padding:9px 11px; }
      .histmain { flex:1; min-width:0; }
      .histwk   { font-size:12.5px; font-weight:700; }
      .histdates{ font-size:10.5px; color:var(--soft); margin-top:2px; }
      .histrev  { font-size:13.5px; font-weight:700; color:var(--gold);
                  font-variant-numeric:tabular-nums; white-space:nowrap; }
      .histdel  { background:transparent; border:none; color:var(--burg); cursor:pointer;
                  padding:4px; flex-shrink:0; }

      .storage-note { background:var(--gold-pale); border:1px solid var(--gold-lt); border-radius:10px;
                      padding:12px 14px; font-size:12.5px; line-height:1.65; margin-bottom:8px; }
      .storage-note code { background:#fff; border:1px solid var(--line); border-radius:4px;
                           padding:1px 5px; font-size:11.5px; }

      /* charts */
      .chart-card  { background:var(--card); border:1px solid var(--line); border-radius:13px; overflow:hidden; }
      .chart-head  { display:flex; justify-content:space-between; align-items:center; gap:10px;
                     padding:12px 14px; cursor:pointer; user-select:none; }
      .chart-head:active { background:var(--paper); }
      .chart-title { font-size:13.5px; font-weight:700; }
      .chart-sub   { font-size:10.5px; color:var(--soft); margin-top:2px; }
      .chart-body  { padding:0 8px 12px 0; border-top:1px solid var(--line); padding-top:12px; }

      /* modal */
      .overlay { position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:100;
                 display:flex; align-items:flex-end; justify-content:center; }
      .modal   { background:var(--card); border-radius:20px 20px 0 0; width:100%; max-width:760px;
                 max-height:88vh; display:flex; flex-direction:column; overflow:hidden; }
      .modal-top { display:flex; justify-content:space-between; align-items:center;
                   padding:16px 16px 10px; border-bottom:1px solid var(--line); flex-shrink:0; }
      .modal-title { font-size:16px; font-weight:700; }
      .modal-search { margin:10px 12px 4px; width:calc(100% - 24px); flex-shrink:0; }
      .modal-body { overflow-y:auto; padding:4px 12px 32px; }
      .cat-div  { font-size:11px; font-weight:800; letter-spacing:.04em; padding:12px 4px 4px; }
      .cat-row  { width:100%; background:transparent; border:none; border-radius:10px; padding:10px 12px;
                  text-align:left; cursor:pointer; display:flex; justify-content:space-between;
                  align-items:center; gap:12px; }
      .cat-row:hover { background:var(--gold-pale); }
      .cat-name { font-size:14px; font-weight:600; display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
      .cat-px   { font-size:12px; color:var(--soft); white-space:nowrap; }
      .added-tag { background:var(--grn); color:#fff; border-radius:999px; padding:1px 6px;
                   font-size:9.5px; font-weight:800; }

      /* responsive */
      @media (min-width:540px) {
        .funnel-grid { grid-template-columns:repeat(4,1fr); }
        .rate-strip  { grid-template-columns:repeat(4,1fr); }
        .rec-grid    { grid-template-columns:repeat(4,1fr); }
        .exec-grid   { grid-template-columns:repeat(8,1fr); }
        .eg-l        { font-size:9px; }
        .setgrid     { grid-template-columns:repeat(4,1fr); }
      }
      @media (max-width:360px) {
        .exec-grid { grid-template-columns:repeat(2,1fr); }
        .eh-val    { font-size:28px; }
      }

      @media print {
        .nav, .periodbar, .btn-primary, .btn-secondary, .btn-action, .btn-close-week,
        .remove-btn, .save-dot, .tap-hint, .histdel { display:none !important; }
        .root { max-width:100%; }
        .card-body, .chart-body { display:block !important; }
      }
    

      .nav { overflow-x:auto; scrollbar-width:none; }
      .nav::-webkit-scrollbar { display:none; }
      .nav-btn { flex:1 0 auto; white-space:nowrap; }

      .ops-hero  { background:var(--ink); color:#fff; border-radius:16px; padding:16px; }
      .ops-eyebrow { font-size:10px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; color:#9c9384; }
      .ops-hero-row { display:flex; justify-content:space-between; align-items:flex-end; gap:12px; flex-wrap:wrap; margin-top:6px; }
      .ops-big   { font-family:Georgia,"Times New Roman",serif; font-size:32px; font-weight:600; color:var(--gold-lt);
                   font-variant-numeric:tabular-nums; line-height:1.05; }
      .ops-big-lbl { font-size:10px; color:#9c9384; font-weight:700; text-transform:uppercase; letter-spacing:.06em; margin-top:3px; }
      .ops-kpis  { display:grid; grid-template-columns:repeat(2,1fr); gap:7px; margin-top:14px; }
      .ops-kpi   { background:#ffffff0d; border-radius:10px; padding:9px 10px; }
      .ops-kpi b { display:block; font-size:16px; color:#fff; font-variant-numeric:tabular-nums; }
      .ops-kpi span { font-size:9.5px; color:#9c9384; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
      @media (min-width:540px) { .ops-kpis { grid-template-columns:repeat(4,1fr); } }

      .ops-warn { display:flex; gap:8px; align-items:flex-start; background:#FBEFEF; border:1px solid #E9C6C6;
                  color:#6d2424; border-radius:10px; padding:9px 11px; font-size:12px; line-height:1.45; }
      .ops-toolbar { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
      .ops-toolbar .input { flex:1; min-width:140px; }
      .ops-monthnav { display:flex; align-items:center; gap:6px; }
      .ops-monthnav b { min-width:88px; text-align:center; font-size:13px; }

      .yn { display:inline-flex; border:1px solid var(--line); border-radius:999px; overflow:hidden; }
      .yn button { border:none; background:#fff; padding:7px 14px; font-weight:800; font-size:12px; cursor:pointer; color:var(--soft); }
      .yn .yn-yes { background:var(--grn); color:#fff; }
      .yn .yn-no  { background:var(--ink); color:var(--gold-lt); }

      .chip { display:inline-flex; align-items:center; gap:4px; border-radius:999px; padding:2px 8px;
              font-size:10.5px; font-weight:800; border:1px solid var(--line); background:var(--paper); color:var(--soft); white-space:nowrap; }
      .chip-yes { background:#E9F3EE; border-color:#BFDCCB; color:var(--grn); }
      .chip-gold{ background:var(--gold-pale); border-color:var(--gold-lt); color:var(--gold); }
      .chip-red { background:#FBEFEF; border-color:#E9C6C6; color:var(--burg); }
      .chip-ink { background:var(--ink); border-color:var(--ink); color:var(--gold-lt); }
      .chip-btn { cursor:pointer; }

      .sale-row  { display:flex; justify-content:space-between; gap:10px; padding:12px 14px; cursor:pointer; }
      .sale-main { min-width:0; }
      .sale-title{ font-weight:700; font-size:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .sale-sub  { font-size:11.5px; color:var(--soft); margin-top:3px; display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
      .sale-amt  { text-align:right; font-variant-numeric:tabular-nums; }
      .sale-amt b{ display:block; font-size:15px; }
      .sale-amt span { font-size:11px; color:var(--soft); }

      .mini-table { width:100%; border-collapse:collapse; font-size:12.5px; }
      .mini-table td, .mini-table th { padding:6px 4px; border-bottom:1px solid var(--line); text-align:left; }
      .mini-table th { font-size:10px; text-transform:uppercase; letter-spacing:.05em; color:var(--soft); }
      .mini-table .r { text-align:right; font-variant-numeric:tabular-nums; }

      .tier-card .tier-now { font-family:Georgia,"Times New Roman",serif; font-size:26px; font-weight:600; color:var(--gold); }
      .tier-track { height:9px; background:var(--line); border-radius:6px; overflow:hidden; margin:8px 0 4px; }
      .tier-fill  { height:100%; background:linear-gradient(90deg,var(--gold),#d9ad3c); border-radius:6px; }
      .tier-legend{ display:flex; justify-content:space-between; font-size:11px; color:var(--soft); }
      .next-callout { background:var(--gold-pale); border:1px solid var(--gold-lt); border-radius:10px; padding:9px 11px;
                      font-size:12.5px; line-height:1.45; margin-top:8px; }

      .example-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
      .example { background:var(--paper); border:1px solid var(--line); border-radius:10px; padding:10px; text-align:center; }
      .example b { display:block; font-size:18px; color:var(--gold); font-variant-numeric:tabular-nums; }
      .example span { font-size:11px; color:var(--soft); }

      .checks { display:flex; flex-wrap:wrap; gap:6px; }
      .inline-form { display:grid; grid-template-columns:1fr 1fr; gap:8px; align-items:end; margin-top:8px; }
      .btn-sm { padding:7px 11px; border-radius:999px; border:1px solid var(--line); background:#fff; font-weight:700;
                font-size:12px; cursor:pointer; display:inline-flex; align-items:center; gap:5px; }
      .btn-sm:disabled { opacity:.45; cursor:default; }
      .btn-sm-dark { background:var(--ink); color:var(--gold-lt); border-color:var(--ink); }
      .btn-row { display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; }
      .neg { color:var(--burg); }
      .pos { color:var(--grn); }
      @media (max-width:420px) { .g2, .inline-form { grid-template-columns:1fr; } .example b { font-size:15px; } }

      /* ── sign in / invite redemption ── */
      .auth-wrap  { min-height:100vh; display:flex; align-items:center; justify-content:center;
                    padding:24px 16px; background:var(--paper); font-family:var(--sans); }
      .auth-card  { width:100%; max-width:380px; background:var(--card); border:1px solid var(--line);
                    border-radius:14px; padding:26px 22px; display:flex; flex-direction:column; }
      .auth-title { font-family:var(--serif); font-size:22px; font-weight:600;
                    margin-top:2px; }
      .auth-sub   { font-size:13px; color:var(--soft); margin:6px 0 18px; line-height:1.5; }
      .auth-label { font-size:11px; font-weight:700; letter-spacing:.04em; color:var(--soft);
                    text-transform:uppercase; margin-bottom:5px; }
      .auth-input { padding:10px 12px; border:1px solid var(--line); border-radius:8px;
                    font-size:15px; background:var(--paper); color:var(--ink); margin-bottom:14px; }
      .auth-input:focus { outline:2px solid var(--gold); outline-offset:1px;
                          border-color:var(--gold); background:var(--card); }
      .auth-code  { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; letter-spacing:.12em;
                    text-align:center; font-size:17px; }
      .auth-btn   { padding:11px; border:none; border-radius:999px; background:var(--ink);
                    color:var(--gold-lt); font-size:14px; font-weight:600; cursor:pointer; }
      .auth-btn:disabled { opacity:.55; cursor:default; }
      .auth-link  { background:none; border:none; color:var(--soft); font-size:12.5px;
                    cursor:pointer; margin-top:14px; text-decoration:underline; }
      .auth-error { color:var(--burg); font-size:12.5px; margin:0 0 12px; line-height:1.45; }

      /* ── password strength ── */
      .pw-meter { display:flex; align-items:center; gap:8px; margin:-6px 0 6px; }
      .pw-track { flex:1; height:4px; border-radius:999px; background:var(--line); overflow:hidden; }
      .pw-fill  { height:100%; border-radius:999px; transition:width .18s ease, background .18s ease; }
      .pw-word  { font-size:10.5px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; }
      .pw-hint  { font-size:11.5px; color:var(--soft); margin:0 0 12px; line-height:1.45; }

      .pw-fill.pw-weak   { background:var(--burg); }
      .pw-fill.pw-ok     { background:var(--gold); }
      .pw-fill.pw-good   { background:var(--gold); }
      .pw-fill.pw-strong { background:var(--grn); }
      .pw-word.pw-weak   { color:var(--burg); }
      .pw-word.pw-ok,
      .pw-word.pw-good   { color:var(--gold); }
      .pw-word.pw-strong { color:var(--grn); }
      .pw-hint.pw-weak   { color:var(--burg); }

      /* ── read-only lock ──
         Cosmetic only. A member without edit permission is refused by
         row level security regardless of what the browser allows. */
      .ro-body input, .ro-body select, .ro-body textarea,
      .ro-body button:not(.nav-btn):not(.chart-toggle) {
        pointer-events:none; opacity:.72;
      }
      .ro-banner { display:flex; align-items:center; gap:8px; padding:8px 12px; margin-bottom:10px;
                   border:1px solid var(--gold-lt); background:var(--gold-pale);
                   border-radius:8px; font-size:12.5px; color:var(--soft); }

      /* ── account strip ── */
      .who      { display:flex; align-items:center; gap:8px; font-size:11px; color:var(--soft); }
      .who-mail { max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .who-out  { background:none; border:none; color:var(--gold); font-size:11px;
                  cursor:pointer; text-decoration:underline; padding:0; }
      .who-role { font-size:10px; font-weight:700; letter-spacing:.04em; text-transform:uppercase;
                  color:var(--gold); }
    `;
