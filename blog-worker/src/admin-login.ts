/**
 * 独立登录页：/admin/login
 * 博客后台独立管理员体系（与 Waline 评论账号解耦）：
 * - GET  /api/admin/init  是否需要创建管理员（bl_Admin 空表）
 * - POST /api/admin/init  创建首个管理员（服务端直接 Set-Cookie bl_token）
 * - POST /api/admin/login 登录（服务端 Set-Cookie）
 * - GET  /api/admin/me    校验当前登录态
 * 深色模式：与后台一致，读取 localStorage(admin_theme_mode)，前置脚本设置 data-theme 防闪色。
 * 已有管理员时彻底隐藏「创建管理员」入口，避免误注册访客账号。
 */

const LOGIN_STYLE = `
:root{color-scheme:light dark;--accent:#f97316;--accent-h:#ea580c;
--bg:#f7f7f8;--card:#fff;--fg:#1f2328;--muted:#6b7280;--border:#e3e3e4;--input-bg:#fff;--input-fg:#1f2328}
:root[data-theme="dark"]{color-scheme:dark;
--bg:#0f1115;--card:#181b20;--fg:#e8e8e8;--muted:#9ca3af;--border:#2b2f36;--input-bg:#14161a;--input-fg:#e8e8e8}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]):not([data-theme="dark"]){
--bg:#0f1115;--card:#181b20;--fg:#e8e8e8;--muted:#9ca3af;--border:#2b2f36;--input-bg:#14161a;--input-fg:#e8e8e8}}
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;font:13px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'PingFang SC','Microsoft YaHei',Helvetica,Arial,sans-serif;
background:var(--bg);color:var(--fg);display:flex;align-items:center;justify-content:center;padding:16px}
.card{width:100%;max-width:340px;background:var(--card);border:1px solid var(--border);border-radius:4px;padding:28px}
.brand{margin-bottom:4px}
h1{font-size:16px;margin:0;font-weight:600}
.sub{color:var(--muted);font-size:12px;margin:4px 0 20px}
label{font-size:12px;color:var(--muted);display:block;margin:12px 0 4px}
input{width:100%;padding:7px 10px;font:inherit;border:1px solid var(--border);border-radius:4px;background:var(--input-bg);color:var(--input-fg);outline:none}
input:focus{border-color:var(--accent);box-shadow:0 0 0 2px rgba(249,115,22,.12)}
button{width:100%;margin-top:18px;padding:8px;font:inherit;font-weight:500;background:var(--accent);border:none;border-radius:4px;color:#fff;cursor:pointer}
button:hover{background:var(--accent-h)}
button:disabled{opacity:.5}
.msg{font-size:12px;color:#dc2626;min-height:18px;margin-top:10px;white-space:pre-wrap}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]) .msg{color:#f87171}}
:root[data-theme="dark"] .msg{color:#f87171}
.hid{display:none}
.link{font-size:11px;color:var(--muted);text-align:right;margin-top:8px}
.link a{color:var(--muted)}
.link a:hover{color:var(--accent)}
`;

// 前置脚本：先按本地设置设好 data-theme 再渲染，避免深色下闪白
const THEME_BOOT = `
try{
  var m=localStorage.getItem('admin_theme_mode')||'auto';
  if(m==='dark')document.documentElement.setAttribute('data-theme','dark');
  else if(m==='light')document.documentElement.setAttribute('data-theme','light');
}catch(e){}
`;

const LOGIN_SCRIPT = `
const $=s=>document.querySelector(s);
function setMsg(t){ const el=$('#msg'); if(el) el.textContent=t||''; }
function showPane(reg){
  $('#loginWrap').classList.toggle('hid', reg);
  $('#regWrap').classList.toggle('hid', !reg);
  $('#sub').textContent = reg ? '首次使用，请创建管理员账号' : '使用管理员账号登录';
  setMsg('');
}
async function goIn(){
  location.replace('/admin');
}
async function doLogin(){
  const user=$('#user').value.trim(), pass=$('#pass').value;
  if(!user||!pass){ setMsg('请输入用户名和密码'); return; }
  const btn=$('#btn'); btn.disabled=true; btn.textContent='登录中...'; setMsg('');
  try{
    const r=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:user,password:pass})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok){ btn.disabled=false; btn.textContent='登录'; setMsg(d.error||'登录失败'); return; }
    await goIn();
  }catch(e){ btn.disabled=false; btn.textContent='登录'; setMsg('网络错误，请重试'); }
}
async function doRegister(){
  const user=$('#ruser').value.trim();
  const p1=$('#rpass').value, p2=$('#rpass2').value;
  if(!user||!p1){ setMsg('请输入用户名和密码'); return; }
  if(p1!==p2){ setMsg('两次输入的密码不一致'); return; }
  const btn=$('#rbtn'); btn.disabled=true; btn.textContent='创建中...'; setMsg('');
  try{
    const r=await fetch('/api/admin/init',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:user,password:p1})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok){ btn.disabled=false; btn.textContent='创建管理员账号'; setMsg(d.error||'创建失败'); return; }
    setMsg('创建成功，跳转中...');
    await goIn();
  }catch(e){ btn.disabled=false; btn.textContent='创建管理员账号'; setMsg('网络错误，请重试'); }
}
document.addEventListener('DOMContentLoaded',()=>{
  $('#btn').onclick=doLogin;
  $('#rbtn').onclick=doRegister;
  $('#toReg').onclick=()=>showPane(true);
  ['user','pass'].forEach(id=>{
    const el=$('#'+id);
    if(el) el.addEventListener('keydown',e=>{ if(e.key==='Enter') doLogin(); });
  });
  ['ruser','rpass','rpass2'].forEach(id=>{
    const el=$('#'+id);
    if(el) el.addEventListener('keydown',e=>{ if(e.key==='Enter') doRegister(); });
  });
  // 站点已有管理员：彻底隐藏「创建管理员」入口
  fetch('/api/admin/init').then(r=>r.json()).then(d=>{
    if(d&&d.ok&&d.needInit===false){
      const t=$('#toReg'); if(t) t.classList.add('hid');
    }
  }).catch(()=>{});
});
(async function(){
  // 已登录直接进后台
  try{
    const r=await fetch('/api/admin/me');
    if(r.ok){ location.replace('/admin'); return; }
  }catch(e){}
  // 首次使用（还没有任何管理员）：直接显示「创建管理员」
  try{
    const r=await fetch('/api/admin/init');
    const d=await r.json();
    if(d&&d.ok&&d.needInit) showPane(true);
  }catch(e){}
})();
`;

export function renderAdminLoginPage(siteUrl: string): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>登录 - 博客后台</title>
<script>${THEME_BOOT}</script>
<style>${LOGIN_STYLE}</style>
</head>
<body>
<div class="card">
  <div class="brand">
    <h1>博客管理后台</h1>
  </div>
  <div class="sub" id="sub">使用管理员账号登录</div>

  <div id="loginWrap">
    <label for="user">用户名</label>
    <input id="user" autocomplete="username" placeholder="admin">
    <label for="pass">密码</label>
    <input id="pass" type="password" autocomplete="current-password" placeholder="••••••••">
    <button id="btn">登录</button>
    <div class="link"><a id="toReg" style="cursor:pointer">还没有账号？创建管理员</a></div>
  </div>

  <div id="regWrap" class="hid">
    <label for="ruser">用户名</label>
    <input id="ruser" autocomplete="username" placeholder="admin">
    <label for="rpass">密码</label>
    <input id="rpass" type="password" autocomplete="new-password" placeholder="至少 6 位">
    <label for="rpass2">确认密码</label>
    <input id="rpass2" type="password" autocomplete="new-password" placeholder="••••••••">
    <button id="rbtn">创建管理员账号</button>
  </div>

  <div class="msg" id="msg"></div>
  ${siteUrl ? '<div class="link"><a href="' + siteUrl + '">← 返回站点</a></div>' : ''}
</div>
<script>${LOGIN_SCRIPT}</script>
</body>
</html>`;
}
