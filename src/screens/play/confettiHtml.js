export function buildConfettiHtml(isDark) {
  const bg = isDark ? '#0a0a0a' : '#111111';
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;}
html,body{width:100%;height:100%;background:${bg};overflow:hidden;}
canvas{display:block;}
</style>
</head>
<body>
<canvas id="c"></canvas>
<script>
var c=document.getElementById('c');
var ctx=c.getContext('2d');
c.width=window.innerWidth; c.height=window.innerHeight;

var COLORS=['#C4922A','#e53935','#ffffff','#FFD700','#ff8f00','#f9a825','#ef9a9a'];
var N=90;

var parts=[];
for(var i=0;i<N;i++){
  parts.push({
    x: Math.random()*c.width,
    y: -Math.random()*c.height*0.6,
    w: 5+Math.random()*9,
    h: 4+Math.random()*6,
    col: COLORS[Math.floor(Math.random()*COLORS.length)],
    vx: (Math.random()-0.5)*2.5,
    vy: 1.5+Math.random()*3,
    rot: Math.random()*Math.PI*2,
    vrot: (Math.random()-0.5)*0.12,
    alpha: 0.9+Math.random()*0.1,
  });
}

var frame=0;
function draw(){
  ctx.clearRect(0,0,c.width,c.height);
  var alive=false;
  for(var i=0;i<parts.length;i++){
    var p=parts[i];
    p.x+=p.vx; p.y+=p.vy; p.rot+=p.vrot;
    if(frame>100) p.alpha=Math.max(0,p.alpha-0.006);
    if(p.alpha>0) alive=true;
    if(p.y>c.height+20){ p.y=-20; p.x=Math.random()*c.width; if(frame>100) p.alpha=0; }
    ctx.save();
    ctx.globalAlpha=p.alpha;
    ctx.translate(p.x,p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle=p.col;
    ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
    ctx.restore();
  }
  frame++;
  if(alive) requestAnimationFrame(draw);
}
draw();
</script>
</body>
</html>`;
}
