export function buildPongHtml(targetScore = 7) {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#0a0a0a;overflow:hidden;touch-action:none}
canvas{display:block}
#overlay{
  position:fixed;inset:0;background:rgba(10,10,10,0.82);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;
  pointer-events:none;
}
#overlayInner{text-align:center}
</style>
</head>
<body>
<canvas id="c"></canvas>
<div id="overlay"><div id="overlayInner"></div></div>
<script>
var c=document.getElementById('c'),ctx=c.getContext('2d');
c.width=window.innerWidth; c.height=window.innerHeight;
var W=c.width, H=c.height;

// Court vertical bounds — 18% margins top & bottom so
// the paddle only travels ~64% of screen height (more proportional to width)
var MARGIN = Math.round(H*0.18);
var TOP = MARGIN, BOT = H - MARGIN, ACTIVE = BOT - TOP;

// Paddle dims
var PW=14, PH=Math.round(ACTIVE*0.22), BR=8;
var P1X=28, P2X=W-28-PW;

var WIN=${targetScore};
var s1=0, s2=0;
var isHost=false, gameActive=false;
var myY=TOP+ACTIVE/2, oppY=TOP+ACTIVE/2;
var myX=P1X, oppX=P2X;
var bx=W/2, by=TOP+ACTIVE/2, bvx=0, bvy=0;
var lastPaddle=0, lastBall=0;
var raf=null;

var START_SPEED=3, MAX_SPEED=12, ACCEL=1.10;

function post(obj){
  if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(obj));
}
function setWin(n){ WIN=n; }

function showMsg(html){
  document.getElementById('overlay').style.display='flex';
  document.getElementById('overlayInner').innerHTML=html;
}
function hideOverlay(){ document.getElementById('overlay').style.display='none'; }

function countDown(cb){
  var steps=[['3','rgba(255,255,255,0.9)'],['2','rgba(255,255,255,0.9)'],['1','rgba(255,255,255,0.9)'],['GO!','#C4922A']];
  var i=0;
  function step(){
    showMsg('<span style="font-family:-apple-system,sans-serif;font-size:96px;font-weight:700;letter-spacing:4px;color:'+steps[i][1]+'">'+steps[i][0]+'</span>');
    i++;
    if(i<steps.length) setTimeout(step,700);
    else setTimeout(function(){ hideOverlay(); cb(); }, 450);
  }
  step();
}

function launch(towardLeft){
  // Ball starts centre of the active court, shallow angle
  bx=W/2;
  by=TOP + ACTIVE*(0.28 + Math.random()*0.44);
  var dirX = (towardLeft===undefined) ? (Math.random()>0.5?1:-1) : (towardLeft?-1:1);
  var angle=(Math.random()*0.3+0.2); // 11-26 deg from horizontal
  bvx=Math.cos(angle)*START_SPEED*dirX;
  bvy=(Math.random()>0.5?1:-1)*Math.sin(angle)*START_SPEED;
}

function resetAll(){
  s1=0; s2=0;
  myY=TOP+ACTIVE/2; oppY=TOP+ACTIVE/2;
}

var f='font-family:-apple-system,sans-serif;';
function doStart(cb){
  showMsg(
    '<div style="text-align:center;padding:0 20px">'+
    '<div style="'+f+'font-size:11px;font-weight:700;letter-spacing:5px;color:rgba(255,255,255,0.45);margin-bottom:10px">FIRST TO</div>'+
    '<div style="'+f+'font-size:96px;font-weight:800;letter-spacing:2px;color:#fff;line-height:1">'+WIN+'</div>'+
    '<div style="'+f+'font-size:10px;letter-spacing:3px;color:rgba(255,255,255,0.3);margin-top:10px">POINTS WINS</div>'+
    '</div>'
  );
  setTimeout(function(){ countDown(cb); }, 1200);
}

function startAsHost(){
  isHost=true; myX=P1X; oppX=P2X;
  resetAll();
  doStart(function(){ launch(); gameActive=true; loop(); });
}

function startAsGuest(){
  isHost=false; myX=P2X; oppX=P1X;
  resetAll();
  doStart(function(){ gameActive=true; loop(); });
}

function updateOpponentPaddle(y){ oppY=parseFloat(y); }
function updateBall(x,y){ if(!isHost){ bx=parseFloat(x); by=parseFloat(y); } }
function updateScore(a,b){ s1=a; s2=b; }

function clamp(v,lo,hi){ return v<lo?lo:v>hi?hi:v; }

// Called by host when a miss happens
function onMiss(scorer){
  gameActive=false;
  if(raf){ cancelAnimationFrame(raf); raf=null; }
  if(scorer===1) s1++; else s2++;

  // Notify guest of new score immediately
  post({type:'scoreUpdate', s1:s1, s2:s2});

  var gameOver=(s1>=WIN||s2>=WIN);
  var f='font-family:-apple-system,sans-serif;';
  if(gameOver){
    var winnerIs=(s1>=WIN)?1:2;
    var youWin=(isHost&&winnerIs===1)||(!isHost&&winnerIs===2);
    showMsg(
      '<div style="text-align:center;padding:0 16px">' +
      '<div style="'+f+'font-size:28px;font-weight:700;letter-spacing:4px;color:#e53935;margin-bottom:12px">MISSED!</div>' +
      '<div style="'+f+'font-size:52px;font-weight:800;letter-spacing:3px;color:#fff;line-height:1">'+(youWin?'YOU WIN!':'YOU LOSE')+'</div>' +
      '<div style="'+f+'font-size:22px;color:rgba(255,255,255,0.45);letter-spacing:4px;margin-top:14px">'+s1+' — '+s2+'</div>' +
      '</div>'
    );
    setTimeout(function(){
      post({type:'gameOver', winner:winnerIs, s1:s1, s2:s2});
    }, 2000);
  } else {
    var hostScored=(scorer===1);
    var youScored=(isHost&&hostScored)||(!isHost&&!hostScored);
    showMsg(
      '<div style="text-align:center">' +
      '<div style="'+f+'font-size:24px;font-weight:700;letter-spacing:4px;color:#e53935;margin-bottom:8px">MISSED!</div>' +
      '<div style="'+f+'font-size:16px;letter-spacing:3px;color:#C4922A;margin-bottom:10px">'+(youScored?'YOU SCORE':'OPPONENT SCORES')+'</div>' +
      '<div style="'+f+'font-size:44px;font-weight:800;color:#fff;letter-spacing:4px">'+s1+' — '+s2+'</div>' +
      '</div>'
    );
    setTimeout(function(){
      hideOverlay();
      launch(scorer===2);
      gameActive=true;
      loop();
    }, 1100);
  }
}

function loop(){
  if(!gameActive) return;
  raf=requestAnimationFrame(loop);
  var now=Date.now();

  if(isHost){
    bx+=bvx; by+=bvy;

    // Court top / bottom wall bounce (within active area only)
    if(by-BR<TOP)  { by=TOP+BR;   bvy=Math.abs(bvy); }
    if(by+BR>BOT)  { by=BOT-BR;   bvy=-Math.abs(bvy); }

    // P1 (host / left paddle) collision
    if(bvx<0 && bx-BR<=P1X+PW && bx>=P1X-2){
      if(by>=myY-PH/2-BR && by<=myY+PH/2+BR){
        var spd1=Math.min(Math.abs(bvx)*ACCEL, MAX_SPEED);
        bvx=spd1;
        bvy=((by-myY)/(PH/2))*5;
        bx=P1X+PW+BR+1;
      }
    }
    // P2 (guest / right paddle) collision
    if(bvx>0 && bx+BR>=P2X && bx<=P2X+PW+2){
      if(by>=oppY-PH/2-BR && by<=oppY+PH/2+BR){
        var spd2=Math.min(Math.abs(bvx)*ACCEL, MAX_SPEED);
        bvx=-spd2;
        bvy=((by-oppY)/(PH/2))*5;
        bx=P2X-BR-1;
      }
    }

    // Miss detection
    if(bx+BR<-20){
      onMiss(2); // host missed, guest scores
      return;
    }
    if(bx-BR>W+20){
      onMiss(1); // guest missed, host scores
      return;
    }

    if(now-lastBall>14){
      post({type:'ballUpdate', x:bx, y:by});
      lastBall=now;
    }
  }

  if(now-lastPaddle>14){
    post({type:'paddleMove', y:myY});
    lastPaddle=now;
  }

  draw();
}

function draw(){
  ctx.fillStyle='#0a0a0a';
  ctx.fillRect(0,0,W,H);

  // Court boundary lines
  ctx.save();
  ctx.strokeStyle='rgba(255,255,255,0.55)';
  ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(0,TOP);   ctx.lineTo(W,TOP);   ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0,BOT);   ctx.lineTo(W,BOT);   ctx.stroke();
  ctx.restore();

  // Centre dashed line (within court only)
  ctx.save();
  ctx.setLineDash([8,8]);
  ctx.strokeStyle='rgba(255,255,255,0.25)';
  ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(W/2,TOP); ctx.lineTo(W/2,BOT); ctx.stroke();
  ctx.restore();

  ctx.textAlign='center';

  // YOU / OPP labels — well below iPhone camera/notch
  ctx.font='bold 10px -apple-system,sans-serif';
  ctx.fillStyle='rgba(255,255,255,0.55)';
  ctx.fillText(isHost?'YOU':'OPP', W/4,   Math.round(TOP*0.46));
  ctx.fillText(isHost?'OPP':'YOU', W*3/4, Math.round(TOP*0.46));

  // "FIRST TO X" — centre of top margin, subtle reminder
  ctx.font='bold 9px -apple-system,sans-serif';
  ctx.fillStyle='rgba(255,255,255,0.20)';
  ctx.fillText('FIRST TO '+WIN, W/2, Math.round(TOP*0.66));

  // Scores — lower in top margin, safe from camera
  var scoreY = Math.round(TOP*0.88);
  ctx.fillStyle='#fff';
  ctx.font='bold '+(Math.round(MARGIN*0.48))+'px -apple-system,sans-serif';
  ctx.fillText(isHost?s1:s2, W/4,   scoreY);
  ctx.fillText(isHost?s2:s1, W*3/4, scoreY);

  // My paddle
  ctx.fillStyle=isHost?'#e53935':'#42a5f5';
  rr(myX, myY-PH/2, PW, PH, 6);

  // Opponent paddle
  ctx.fillStyle=isHost?'#42a5f5':'#e53935';
  rr(oppX, oppY-PH/2, PW, PH, 6);

  // Ball with glow
  ctx.shadowColor='rgba(255,255,255,0.55)';
  ctx.shadowBlur=12;
  ctx.fillStyle='#fff';
  ctx.beginPath();
  ctx.arc(bx, by, BR, 0, Math.PI*2);
  ctx.fill();
  ctx.shadowBlur=0;
}

function rr(x,y,w,h,r){
  ctx.beginPath();
  if(ctx.roundRect){ ctx.roundRect(x,y,w,h,r); }
  else{
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
    ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
    ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
    ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
    ctx.closePath();
  }
  ctx.fill();
}

// Touch — constrained to active court area
document.addEventListener('touchstart',function(e){
  e.preventDefault();
  myY=clamp(e.touches[0].clientY, TOP+PH/2, BOT-PH/2);
},{passive:false});
document.addEventListener('touchmove',function(e){
  e.preventDefault();
  if(e.touches.length>0) myY=clamp(e.touches[0].clientY, TOP+PH/2, BOT-PH/2);
},{passive:false});
</script>
</body>
</html>`;
}
