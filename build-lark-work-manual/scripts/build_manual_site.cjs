const fs = require('fs');
const path = require('path');

let marked;
let lucide;
try {
  ({ marked } = require('marked'));
  lucide = require('lucide');
} catch (error) {
  throw new Error('Build dependencies missing. Load the workspace Node dependencies and set NODE_PATH before running.');
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith('--')) continue;
    args[key.slice(2)] = argv[index + 1];
    index += 1;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.source || !args.output) {
  throw new Error('Usage: node build_manual_site.cjs --source manual.md --output site/index.html [--config manual-site.json]');
}

const sourcePath = path.resolve(args.source);
const outputPath = path.resolve(args.output);
const configPath = args.config ? path.resolve(args.config) : null;
const supplied = configPath ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
const today = new Date().toISOString().slice(0, 10);
const config = {
  title: '工作说明书',
  owner: 'Role Owner',
  subtitle: 'Operating Manual',
  lead: '把职责、流程、数据、协同与风险连接成可追踪、可决策、可复盘的工作闭环。',
  version: 'V1.0',
  date: today,
  roles: [],
  flow: { inputs: ['业务目标', '数据与需求'], center: '工作控制塔', outputs: ['明确责任', '可验证交付'] },
  ...supplied,
};
config.flow = {
  inputs: ['业务目标', '数据与需求'],
  center: '工作控制塔',
  outputs: ['明确责任', '可验证交付'],
  ...(supplied.flow || {}),
};

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const toKebab = (value) => value.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);

function icon(name, size = 18) {
  const nodes = lucide[name] || lucide.Circle;
  const body = nodes.map(([tag, attrs]) => {
    const properties = Object.entries(attrs)
      .map(([key, value]) => `${toKebab(key)}="${escapeHtml(value)}"`)
      .join(' ');
    return `<${tag} ${properties}></${tag}>`;
  }).join('');
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

let markdown = fs.readFileSync(sourcePath, 'utf8').replace(/^---\s*[\s\S]*?\n---\s*/u, '');
const firstSection = markdown.search(/^##\s+/mu);
if (firstSection >= 0) markdown = markdown.slice(firstSection);

const tokens = marked.lexer(markdown, { gfm: true });
const headings = tokens.filter((token) => token.type === 'heading' && token.depth === 2);
if (!headings.length) throw new Error('The manual needs at least one level-two Markdown heading.');

let h2Index = 0;
let h3Index = 0;
const renderer = new marked.Renderer();
renderer.heading = (token) => {
  const content = marked.parseInline(token.text);
  if (token.depth === 2) return `<h2 id="section-${h2Index++}">${content}</h2>`;
  if (token.depth === 3) return `<h3 id="subsection-${h3Index++}">${content}</h3>`;
  return `<h${token.depth}>${content}</h${token.depth}>`;
};

let article = marked.parse(markdown, { gfm: true, renderer });
article = article
  .replaceAll('<table>', '<div class="table-wrap"><table>')
  .replaceAll('</table>', '</table></div>')
  .replace(/<a href="(https?:\/\/[^\"]+)"/g, '<a href="$1" target="_blank" rel="noopener noreferrer"');

const toc = headings.map((heading, index) => (
  `<a class="toc-link" href="#section-${index}" data-section="section-${index}"><span>${String(index + 1).padStart(2, '0')}</span>${escapeHtml(heading.text)}</a>`
)).join('');

const roles = (config.roles || []).map((role) => `
  <div class="role-item">
    <span class="role-icon">${icon(role.icon || 'CircleCheck', 20)}</span>
    <span><strong>${escapeHtml(role.title)}</strong><small>${escapeHtml(role.detail)}</small></span>
  </div>`).join('');

const flowLines = (items, leadingIcon) => (items || []).map((item) => (
  `<div class="flow-line">${leadingIcon ? icon('CircleCheck', 16) : ''}<span>${escapeHtml(item)}</span>${leadingIcon ? '' : icon('ArrowRight', 15)}</div>`
)).join('');

const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f4f6f3">
  <meta name="description" content="${escapeHtml(config.lead)}">
  <title>${escapeHtml(config.title)}</title>
  <style>
    :root{--page:#f4f6f3;--surface:#fff;--surface2:#eef1ed;--ink:#1b1d1b;--muted:#667069;--line:#d7ddd7;--red:#c94f47;--green:#2f7b50;--blue:#35687a;--shadow:0 10px 30px rgba(30,38,32,.08);--top:64px;--side:286px}
    [data-theme="dark"]{--page:#161816;--surface:#202320;--surface2:#292d29;--ink:#f1f4f0;--muted:#aab3ac;--line:#3a403b;--red:#ee746b;--green:#67b484;--blue:#72a9bd;--shadow:0 12px 34px rgba(0,0,0,.25)}
    *{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:84px}body{margin:0;color:var(--ink);background:var(--page);font:15px/1.75 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;letter-spacing:0}a{color:var(--blue);text-underline-offset:3px}button,input{font:inherit;letter-spacing:0}.icon{display:block;flex:none}
    .skip{position:fixed;left:12px;top:-60px;z-index:100;padding:8px 12px;background:var(--ink);color:var(--surface)}.skip:focus{top:10px}.progress{position:fixed;inset:0 0 auto;height:3px;z-index:90}.progress i{display:block;width:0;height:100%;background:var(--red)}
    .topbar{position:fixed;inset:3px 0 auto;height:var(--top);z-index:70;display:flex;align-items:center;justify-content:space-between;padding:0 20px;background:color-mix(in srgb,var(--surface) 94%,transparent);border-bottom:1px solid var(--line);backdrop-filter:blur(14px)}.brand{display:flex;align-items:center;gap:10px;color:var(--ink);text-decoration:none}.brand-mark{display:grid;place-items:center;width:34px;height:34px;background:var(--red);color:#fff;border-radius:5px;font-weight:800}.brand-text{display:grid;line-height:1.2}.brand-text small{color:var(--muted);font-size:11px}.toolbar{display:flex;gap:6px}.icon-button{display:grid;place-items:center;width:38px;height:38px;padding:0;border:1px solid var(--line);border-radius:5px;background:var(--surface);color:var(--ink);cursor:pointer}.icon-button:hover{background:var(--surface2)}.menu,.close{display:none}
    .sidebar{position:fixed;inset:calc(var(--top) + 3px) auto 0 0;width:var(--side);z-index:60;padding:20px 16px;background:var(--surface);border-right:1px solid var(--line);overflow:auto}.side-head{display:flex;justify-content:space-between;align-items:center}.search{display:flex;align-items:center;gap:8px;margin:14px 0 6px;padding:0 11px;border:1px solid var(--line);border-radius:5px}.search input{width:100%;height:40px;border:0;outline:0;color:var(--ink);background:transparent}.status{min-height:22px;color:var(--muted);font-size:12px}.toc{display:grid;gap:2px}.toc-link{display:grid;grid-template-columns:30px 1fr;gap:6px;padding:7px 8px;color:var(--muted);text-decoration:none;border-left:2px solid transparent;font-size:12px}.toc-link span{font-variant-numeric:tabular-nums}.toc-link:hover,.toc-link.active{color:var(--ink);background:var(--surface2);border-left-color:var(--red)}.hidden{display:none!important}.overlay{display:none}
    .main,.footer{margin-left:var(--side)}.masthead{padding-top:var(--top);background:var(--surface);border-bottom:1px solid var(--line)}.mast-inner,.roles-inner,.flow,.manual{width:min(1080px,calc(100% - 64px));margin:auto}.mast-inner{padding:64px 0 54px}.eyebrow{display:flex;align-items:center;gap:7px;color:var(--green);font-size:12px;font-weight:700;text-transform:uppercase}.masthead h1{margin:16px 0 8px;font-size:clamp(34px,5vw,62px);line-height:1.05;letter-spacing:0}.lead{max-width:820px;margin:0;color:var(--muted);font-size:17px}.stats{display:flex;flex-wrap:wrap;gap:28px;margin-top:30px}.stat{display:grid}.stat strong{font-size:20px}.stat span{color:var(--muted);font-size:12px}
    .roles-band{background:var(--surface);border-bottom:1px solid var(--line)}.roles-inner{padding:30px 0}.role-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px}.role-item{display:flex;gap:10px;min-height:62px;padding:10px;border:1px solid var(--line);border-radius:6px}.role-icon{display:grid;place-items:center;width:36px;height:36px;background:var(--surface2);color:var(--green);border-radius:4px}.role-item span:last-child{display:grid}.role-item small{color:var(--muted)}
    .flow-band{padding:30px 0;background:var(--surface2);border-bottom:1px solid var(--line)}.flow{display:grid;grid-template-columns:1fr 210px 1fr;gap:18px;align-items:stretch}.flow-col,.tower{padding:18px;background:var(--surface);border:1px solid var(--line);border-radius:6px}.flow-label{margin-bottom:8px;color:var(--muted);font-size:12px;font-weight:700}.flow-line{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 0;border-bottom:1px solid var(--line)}.flow-line:last-child{border-bottom:0}.tower{display:grid;place-items:center;align-content:center;gap:6px;text-align:center;color:var(--red)}.tower strong{color:var(--ink);font-size:18px}.tower span{color:var(--muted);font-size:11px}
    .article-shell{padding:40px 0 80px}.manual{display:grid;gap:16px}.manual-section{background:var(--surface);border:1px solid var(--line);border-radius:7px;box-shadow:var(--shadow);overflow:hidden}.section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:24px 28px;border-bottom:1px solid var(--line)}.section-head h2{margin:0;font-size:22px;line-height:1.35}.section-actions{display:flex;gap:5px}.section-actions .icon-button{width:34px;height:34px}.section-body{padding:8px 28px 28px}.section-body h3{margin:30px 0 8px;font-size:17px}.section-body h4{margin:22px 0 6px;font-size:15px}.section-body p,.section-body li{color:color-mix(in srgb,var(--ink) 88%,var(--muted))}.section-body blockquote{margin:16px 0;padding:10px 15px;border-left:3px solid var(--green);background:var(--surface2)}.section-body code{padding:2px 5px;background:var(--surface2);border-radius:3px}.table-wrap{max-width:100%;overflow:auto;border:1px solid var(--line);border-radius:5px}table{width:100%;min-width:650px;border-collapse:collapse;font-size:13px}th,td{padding:9px 11px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{background:var(--surface2)}.collapsed .section-head{border-bottom:0}.collapse svg{transition:transform .15s}.collapsed .collapse svg{transform:rotate(-90deg)}
    .footer{padding:22px;text-align:center;color:var(--muted);border-top:1px solid var(--line)}.back{position:fixed;right:18px;bottom:18px;z-index:50;opacity:0;pointer-events:none}.back.visible{opacity:1;pointer-events:auto}
    @media(max-width:820px){:root{--side:0px}.menu,.close{display:grid}.sidebar{inset:0 auto 0 0;width:min(340px,87vw);z-index:80;padding-top:20px;transform:translateX(-105%);transition:transform .18s;box-shadow:var(--shadow)}.drawer-open .sidebar{transform:none}.drawer-open .overlay{display:block;position:fixed;inset:0;z-index:75;background:rgba(0,0,0,.35)}.mast-inner,.roles-inner,.flow,.manual{width:min(100% - 28px,1080px)}.mast-inner{padding:48px 0 38px}.masthead h1{font-size:38px}.flow{grid-template-columns:1fr}.tower{min-height:130px}.section-head{padding:20px}.section-body{padding:4px 20px 22px}.brand-text small{display:none}}
    @media(max-width:480px){.topbar{padding:0 12px}.stats{display:grid;grid-template-columns:1fr 1fr;gap:18px}.role-grid{grid-template-columns:1fr}.section-head h2{font-size:18px}.section-actions{flex-direction:column}.article-shell{padding-top:20px}}
    @media print{:root{--page:#fff;--surface:#fff;--surface2:#f4f4f4;--ink:#111;--muted:#555;--line:#ccc}.topbar,.sidebar,.progress,.overlay,.back,.section-actions{display:none!important}.main,.footer{margin-left:0}.mast-inner,.roles-inner,.flow,.manual{width:100%}.masthead{padding-top:0}.manual-section{break-inside:avoid;box-shadow:none}.section-body[hidden]{display:block!important}.table-wrap{overflow:visible}table{min-width:0}a{color:#111;text-decoration:none}}
    @media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important}}
  </style>
</head>
<body>
  <a class="skip" href="#manual">跳到正文</a><div class="progress"><i id="progress"></i></div>
  <header class="topbar"><a class="brand" href="#top"><span class="brand-mark">${escapeHtml(config.owner).slice(0, 1).toUpperCase()}</span><span class="brand-text"><strong>${escapeHtml(config.title)}</strong><small>${escapeHtml(config.subtitle)}</small></span></a><div class="toolbar"><button class="icon-button menu" id="menu" title="打开目录" aria-label="打开目录">${icon('Menu')}</button><button class="icon-button" id="theme" title="切换明暗模式" aria-label="切换明暗模式">${icon('Moon')}</button><button class="icon-button" id="print" title="打印或导出 PDF" aria-label="打印或导出 PDF">${icon('Printer')}</button></div></header>
  <aside class="sidebar" id="sidebar"><div class="side-head"><strong>目录</strong><button class="icon-button close" id="close" title="关闭目录" aria-label="关闭目录">${icon('X')}</button></div><label class="search">${icon('Search')}<input id="search" type="search" placeholder="搜索说明书" aria-label="搜索说明书"></label><div class="status" id="status" aria-live="polite"></div><nav class="toc">${toc}</nav></aside><div class="overlay" id="overlay"></div>
  <main class="main" id="top"><section class="masthead"><div class="mast-inner"><div class="eyebrow">${icon('CircleCheck', 16)} ${escapeHtml(config.version)} OPERATING MANUAL</div><h1>${escapeHtml(config.title)}</h1><p class="lead">${escapeHtml(config.lead)}</p><div class="stats"><div class="stat"><strong>${headings.length}</strong><span>完整章节</span></div><div class="stat"><strong>${(config.roles || []).length}</strong><span>职责模块</span></div><div class="stat"><strong>${escapeHtml(config.version)}</strong><span>当前版本</span></div><div class="stat"><strong>${escapeHtml(config.date)}</strong><span>信息基准日</span></div></div></div></section>
  ${roles ? `<section class="roles-band"><div class="roles-inner"><div class="role-grid">${roles}</div></div></section>` : ''}
  <section class="flow-band"><div class="flow"><div class="flow-col"><div class="flow-label">业务输入</div>${flowLines(config.flow.inputs, false)}</div><div class="tower">${icon('Layers3', 32)}<strong>${escapeHtml(config.owner)}</strong><span>${escapeHtml(config.flow.center)}</span></div><div class="flow-col"><div class="flow-label">可验证输出</div>${flowLines(config.flow.outputs, true)}</div></div></section>
  <div class="article-shell"><article class="manual" id="manual">${article}</article></div></main>
  <footer class="footer">${escapeHtml(config.title)} · ${escapeHtml(config.version)} · ${escapeHtml(config.date)}</footer><button class="icon-button back" id="back" title="返回顶部" aria-label="返回顶部">${icon('ArrowUp')}</button>
  <script>(()=>{const body=document.body,manual=document.getElementById('manual'),headings=[...manual.querySelectorAll(':scope > h2')],down=${JSON.stringify(icon('ChevronDown', 17))},linkIcon=${JSON.stringify(icon('Link', 16))};headings.forEach(heading=>{const parent=heading.parentNode,section=document.createElement('section'),id=heading.id;section.className='manual-section';section.id=id;section.dataset.title=heading.textContent.trim();heading.removeAttribute('id');parent.insertBefore(section,heading);const header=document.createElement('div'),actions=document.createElement('div'),link=document.createElement('button'),collapse=document.createElement('button'),content=document.createElement('div');header.className='section-head';actions.className='section-actions';link.className='icon-button';link.title='复制本节链接';link.setAttribute('aria-label','复制本节链接');link.innerHTML=linkIcon;collapse.className='icon-button collapse';collapse.title='折叠或展开本节';collapse.setAttribute('aria-label','折叠或展开本节');collapse.setAttribute('aria-expanded','true');collapse.innerHTML=down;content.className='section-body';header.append(heading,actions);actions.append(link,collapse);section.append(header,content);while(section.nextSibling&&!(section.nextSibling.matches&&section.nextSibling.matches('h2')))content.append(section.nextSibling);collapse.onclick=()=>{const state=section.classList.toggle('collapsed');content.hidden=state;collapse.setAttribute('aria-expanded',String(!state))};link.onclick=async()=>{const url=location.href.split('#')[0]+'#'+id;history.replaceState(null,'','#'+id);try{await navigator.clipboard.writeText(url);link.title='已复制';setTimeout(()=>link.title='复制本节链接',1200)}catch{location.hash=id}}});const sections=[...manual.querySelectorAll('.manual-section')],toc=[...document.querySelectorAll('.toc-link')],search=document.getElementById('search'),status=document.getElementById('status');search.oninput=()=>{const query=search.value.trim().toLocaleLowerCase('zh-CN');let visible=0;sections.forEach((section,index)=>{const match=!query||section.textContent.toLocaleLowerCase('zh-CN').includes(query);section.classList.toggle('hidden',!match);toc[index]?.classList.toggle('hidden',!match);if(match)visible+=1});status.textContent=query?'匹配 '+visible+' 个章节':''};const observer=new IntersectionObserver(entries=>{const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);if(visible[0])toc.forEach(link=>link.classList.toggle('active',link.dataset.section===visible[0].target.id))},{rootMargin:'-80px 0px -72% 0px'});sections.forEach(section=>observer.observe(section));const progress=document.getElementById('progress'),back=document.getElementById('back'),update=()=>{const total=document.documentElement.scrollHeight-innerHeight;progress.style.width=(total>0?Math.min(100,scrollY/total*100):0)+'%';back.classList.toggle('visible',scrollY>700)};addEventListener('scroll',update,{passive:true});update();const close=()=>body.classList.remove('drawer-open');document.getElementById('menu').onclick=()=>body.classList.add('drawer-open');document.getElementById('close').onclick=close;document.getElementById('overlay').onclick=close;toc.forEach(link=>link.onclick=close);document.getElementById('print').onclick=()=>print();back.onclick=()=>scrollTo({top:0,behavior:'smooth'});const theme=document.getElementById('theme'),sun=${JSON.stringify(icon('Sun'))},moon=${JSON.stringify(icon('Moon'))},key='work-manual-theme',setTheme=value=>{document.documentElement.dataset.theme=value;theme.innerHTML=value==='dark'?sun:moon;localStorage.setItem(key,value)};setTheme(localStorage.getItem(key)||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));theme.onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');if(location.hash)requestAnimationFrame(()=>document.querySelector(location.hash)?.scrollIntoView())})();</script>
</body></html>`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, html, 'utf8');
console.log(`Built ${outputPath} (${Buffer.byteLength(html)} bytes)`);
