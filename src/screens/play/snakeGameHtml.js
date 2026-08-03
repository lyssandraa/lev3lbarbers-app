export function buildSnakeHtml(isDark, T, personalBest = 0, promos = []) {
  const bg       = isDark ? '#0e0e0e' : '#f0ede6';
  const canvasBg = isDark ? '#111111' : '#faf9f7';
  const gridLine = isDark ? '#1a1a1a' : '#e8e4dc';
  const snakeHd  = '#a855f7';
  const snakeBd  = '#7c3aed';
  const foodCol  = T.gold || '#C4922A';
  const textCol  = isDark ? '#e8e3da' : '#1a1a1a';
  const dimCol   = isDark ? '#666'    : '#888';
  const borderC  = isDark ? '#2a2a2a' : '#d4cfc5';
  const surfaceC = isDark ? '#1a1a1a' : '#edeae3';
  const redCol       = T.red  || '#c0392b';
  const bannerAccent = isDark ? '#42a5f5' : redCol;
  const instTextCol  = isDark ? '#c8c2b8' : '#3a3632';

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{
  width:100%;height:100%;background:${bg};
  display:flex;flex-direction:column;align-items:center;
  overflow:hidden;touch-action:none;
  font-family:-apple-system,Helvetica,sans-serif;
  user-select:none;-webkit-user-select:none;
}
#bar{
  width:100%;padding:10px 20px 6px;
  display:flex;align-items:center;justify-content:space-between;
  border-bottom:1px solid ${borderC};
}
.bar-col{display:flex;flex-direction:column;align-items:center;}
.bar-lbl{font-size:9px;letter-spacing:3px;font-weight:700;color:${dimCol};text-transform:uppercase;margin-bottom:2px;}
.bar-val{font-size:28px;font-weight:800;letter-spacing:1px;line-height:1;color:${textCol};}
#bestVal{color:${foodCol};}
#wrap{
  flex:1;display:flex;align-items:center;justify-content:center;
  width:100%;padding:0 6px 10px;
}
canvas{display:block;border:1px solid ${borderC};}

#startOverlay{
  position:fixed;inset:0;background:${bg};
  display:flex;flex-direction:column;align-items:center;
  padding:0;z-index:100;overflow-y:auto;
}
#promoArea{
  flex:1;width:100%;
  display:flex;flex-direction:column;justify-content:flex-end;
  padding:0 32px 20px;
}
#mainContent{
  flex:2;width:100%;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:0 32px 24px;
}
.ov-title{font-size:52px;font-weight:800;letter-spacing:8px;color:${textCol};line-height:1;margin-bottom:6px;}
.ov-sub{font-size:10px;letter-spacing:4px;color:${dimCol};text-transform:uppercase;margin-bottom:28px;}
.inst-card{width:100%;background:${surfaceC};padding:16px 20px;margin-bottom:20px;border:1px solid ${borderC};}
.inst-row{display:flex;align-items:flex-start;gap:12px;padding:7px 0;border-bottom:1px solid ${borderC};font-size:14px;font-weight:600;line-height:1.5;color:${instTextCol};}
.inst-row:last-child{border-bottom:none;}
.inst-icon{color:${foodCol};font-size:15px;min-width:18px;text-align:center;flex-shrink:0;margin-top:1px;}
.best-row{width:100%;display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:${surfaceC};border:1px solid ${borderC};margin-bottom:24px;}
.best-lbl{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${dimCol};}
.best-val{font-size:22px;font-weight:800;letter-spacing:1px;color:${foodCol};}
.best-pts{font-size:10px;letter-spacing:2px;color:${dimCol};text-transform:uppercase;margin-left:4px;}
#startBtn{width:100%;padding:16px;background:${redCol};border:none;font-size:16px;font-weight:800;letter-spacing:4px;text-transform:uppercase;color:#fff;cursor:pointer;-webkit-tap-highlight-color:transparent;}
#startBtn:active{opacity:0.8;}
.promo-card{width:100%;border:1.5px solid ${bannerAccent};overflow:hidden;}
.promo-hd{background:${bannerAccent};padding:12px 20px;display:flex;align-items:center;gap:8px;}
.promo-hd-txt{font-size:10px;font-weight:700;letter-spacing:3px;color:#fff;text-transform:uppercase;}
.promo-body{padding:16px 20px;background:${surfaceC};border-top:none;}
.promo-msg{font-size:14px;font-weight:500;color:${textCol};line-height:1.5;}
</style>
</head>
<body>
<div id="bar">
  <div class="bar-col">
    <span class="bar-lbl">SCORE</span>
    <span class="bar-val" id="scoreVal">0</span>
  </div>
  <div class="bar-col">
    <span class="bar-lbl">BEST</span>
    <span class="bar-val" id="bestVal">${personalBest}</span>
  </div>
</div>
<div id="wrap"><canvas id="c"></canvas></div>

<div id="startOverlay">
  ${promos.length > 0 ? `
  <div id="promoArea">
    ${promos.map(p => `
    <div class="promo-card">
      <div class="promo-hd">
        <span class="promo-hd-txt">📢 DID YOU KNOW?</span>
      </div>
      <div class="promo-body">
        <span class="promo-msg">${p.message.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span>
      </div>
    </div>`).join('')}
  </div>` : ''}
  <div id="mainContent">
  <div class="ov-title">SNAKE</div>
  <div class="ov-sub">LEV3L BARBERS</div>
  <div class="inst-card">
    <div class="inst-row"><span class="inst-icon">◆</span><span>Swipe to steer the snake</span></div>
    <div class="inst-row"><span class="inst-icon">◆</span><span>Collect gold diamonds to score +10</span></div>
    <div class="inst-row"><span class="inst-icon">✕</span><span>Avoid walls and your own tail</span></div>
    <div class="inst-row"><span class="inst-icon">⚡</span><span>Speed increases every 50 points</span></div>
  </div>
  <div class="best-row">
    <span class="best-lbl">Personal Best</span>
    <span><span class="best-val">${personalBest}</span><span class="best-pts"> pts</span></span>
  </div>
  <button id="startBtn" onclick="beginGame()">TAP TO START</button>
  </div>
</div>

<script>
const GRID=20;
const BG='${canvasBg}', GL='${gridLine}', SH='${snakeHd}', SB='${snakeBd}', FC='${foodCol}';

var cs, c, ctx;
var snake, prevSnake, dir, nd, food, score;
var running = false;
var TICK_MS = 150;
var lastTickTime = 0;
var raf = null;

function initCanvas(){
  var w = document.getElementById('wrap');
  var av = Math.min(w.clientWidth - 12, w.clientHeight - 12);
  cs = Math.max(Math.floor(av / GRID), 10);
  c = document.getElementById('c');
  c.width = c.height = GRID * cs;
  ctx = c.getContext('2d');
}

function beginGame(){
  document.getElementById('startOverlay').style.display = 'none';
  start();
}

function start(){
  snake = [{x:10,y:10},{x:9,y:10},{x:8,y:10}];
  prevSnake = snake.map(function(s){ return {x:s.x, y:s.y}; });
  dir = {x:1, y:0};
  nd  = {x:1, y:0};
  score = 0;
  running = true;
  TICK_MS = 150;
  document.getElementById('scoreVal').textContent = '0';
  placeFood();
  if(raf) cancelAnimationFrame(raf);
  lastTickTime = performance.now();
  raf = requestAnimationFrame(gameLoop);
}

function gameLoop(now){
  if(!running){ raf = null; return; }
  raf = requestAnimationFrame(gameLoop);

  var elapsed = now - lastTickTime;
  if(elapsed >= TICK_MS){
    tick();
    if(!running) return; // tick may end game
    lastTickTime = now;
    elapsed = 0;
  }

  draw(Math.min(elapsed / TICK_MS, 1));
}

function tick(){
  // snapshot positions before move (used for interpolation)
  prevSnake = snake.map(function(s){ return {x:s.x, y:s.y}; });

  dir = nd;
  var h = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};

  // Wall or self collision → game over
  if(h.x < 0 || h.x >= GRID || h.y < 0 || h.y >= GRID ||
     snake.some(function(s){ return s.x === h.x && s.y === h.y; })){
    endGame(); return;
  }

  snake.unshift(h);

  if(h.x === food.x && h.y === food.y){
    score += 10;
    document.getElementById('scoreVal').textContent = score;
    var bv = document.getElementById('bestVal');
    if(score > parseInt(bv.textContent || '0', 10)) bv.textContent = score;
    placeFood();
    // Speed up every 50 pts
    if(score % 50 === 0) TICK_MS = Math.max(55, 150 - score * 0.5);
  } else {
    snake.pop();
    // prevSnake already same length as new snake (both lost one from tail)
  }
}

function placeFood(){
  var p;
  do{
    p = {x: Math.floor(Math.random()*GRID), y: Math.floor(Math.random()*GRID)};
  } while(snake.some(function(s){ return s.x === p.x && s.y === p.y; }));
  food = p;
}

// Interpolated pixel centre for segment i at progress t (0→1 between ticks)
function pt(i, t){
  var cur = snake[i];
  var prv = prevSnake[i] || cur; // new segments (from eating) have no prev
  var half = cs / 2;
  return {
    x: (prv.x + (cur.x - prv.x) * t) * cs + half,
    y: (prv.y + (cur.y - prv.y) * t) * cs + half,
  };
}

function draw(t){
  // Background + subtle grid
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = GL;
  ctx.lineWidth = 0.5;
  for(var i = 0; i <= GRID; i++){
    ctx.beginPath(); ctx.moveTo(i*cs, 0); ctx.lineTo(i*cs, c.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i*cs); ctx.lineTo(c.width, i*cs); ctx.stroke();
  }

  // Food — glowing diamond
  var fx = food.x*cs + cs/2, fy = food.y*cs + cs/2, fr = cs*0.3;
  ctx.shadowColor = FC;
  ctx.shadowBlur  = 8;
  ctx.fillStyle   = FC;
  ctx.beginPath();
  ctx.moveTo(fx, fy-fr); ctx.lineTo(fx+fr, fy);
  ctx.lineTo(fx, fy+fr); ctx.lineTo(fx-fr, fy);
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;

  if(snake.length < 2) return;

  var p0 = pt(0, t);

  // ── Circles per segment, tail → head so head sits on top ──
  for(var i = snake.length - 1; i >= 0; i--){
    var p = pt(i, t);
    ctx.fillStyle = (i === 0) ? SH : SB;
    ctx.beginPath();
    ctx.arc(p.x, p.y, cs * 0.44, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Eyes ──
  var dx = dir.x, dy = dir.y;
  var px = -dy, py = dx;
  var fwd  = cs * 0.22;
  var side = cs * 0.17;
  var eyeR = Math.max(cs * 0.10, 2);

  [-1, 1].forEach(function(s){
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.arc(p0.x + dx*fwd + px*side*s, p0.y + dy*fwd + py*side*s, eyeR, 0, Math.PI*2);
    ctx.fill();
  });
}

function restart(){
  var ov = document.getElementById('startOverlay');
  if(ov) ov.style.display = 'none';
  start();
}

function endGame(){
  running = false;
  if(raf){ cancelAnimationFrame(raf); raf = null; }
  if(window.ReactNativeWebView){
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'gameOver', score:score}));
  }
}

// Swipe detection — fires on touchmove once 8px of clear direction is established,
// so direction changes register without waiting for the finger to lift.
var t0 = null, swipeLocked = false;
document.addEventListener('touchstart', function(e){
  t0 = {x: e.touches[0].clientX, y: e.touches[0].clientY};
  swipeLocked = false;
}, {passive:true});
document.addEventListener('touchmove', function(e){
  if(!t0 || swipeLocked) return;
  var dx = e.touches[0].clientX - t0.x;
  var dy = e.touches[0].clientY - t0.y;
  var adx = Math.abs(dx), ady = Math.abs(dy);
  if(Math.max(adx, ady) < 8) return;
  swipeLocked = true; // consume this swipe — one direction change per gesture
  if(adx > ady){
    if(dir.x === 0) nd = dx > 0 ? {x:1,y:0} : {x:-1,y:0};
  } else {
    if(dir.y === 0) nd = dy > 0 ? {x:0,y:1} : {x:0,y:-1};
  }
}, {passive:true});
document.addEventListener('touchend', function(){ t0 = null; swipeLocked = false; }, {passive:true});

window.addEventListener('load', function(){ initCanvas(); });
</script>
</body>
</html>`;
}
