export function buildEditorHtml(initialContent, isDark, T) {
  const bg      = isDark ? '#111'    : '#ffffff';
  const surface = isDark ? '#1c1c1e' : '#f5f4f0';
  const border  = isDark ? '#2a2a2a' : '#d4cfc5';
  const text    = isDark ? '#e8e3da' : '#1a1a1a';
  const gold    = '#C4922A';
  const btnBg   = isDark ? '#2a2a2a' : '#e8e4dd';
  const btnText = isDark ? '#e8e3da' : '#1a1a1a';

  const safeContent = (initialContent || '').replace(/`/g, '\\`').replace(/\\/g, '\\\\');

  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
html,body{height:100%;background:${bg};}
#toolbar{
  display:flex;flex-wrap:wrap;gap:6px;
  padding:10px 12px;
  background:${surface};
  border-bottom:1px solid ${border};
  position:sticky;top:0;z-index:10;
}
.btn{
  padding:5px 11px;min-width:36px;text-align:center;
  background:${btnBg};border:1px solid ${border};color:${btnText};
  font-size:13px;border-radius:3px;cursor:pointer;
  -webkit-tap-highlight-color:transparent;user-select:none;
}
.btn:active{opacity:0.55;}
.sep{width:1px;background:${border};margin:0 2px;align-self:stretch;}
#editor{
  padding:16px 16px 48px;
  min-height:320px;
  color:${text};
  font-family:-apple-system,Helvetica,sans-serif;
  font-size:15px;line-height:1.65;
  outline:none;
}
#editor h3{
  font-size:11px;letter-spacing:2px;text-transform:uppercase;
  color:${gold};margin:22px 0 8px;font-weight:700;
}
#editor p{margin-bottom:10px;}
#editor ul,#editor ol{padding-left:26px;margin-bottom:10px;}
#editor li{margin-bottom:6px;}
#editor li>p{margin-bottom:0;}
#editor strong{font-weight:700;}
#editor em{font-style:italic;}
</style>
</head><body>
<div id="toolbar">
  <button class="btn" onmousedown="e(event,'bold')"><b>B</b></button>
  <button class="btn" onmousedown="e(event,'italic')"><i>I</i></button>
  <div class="sep"></div>
  <button class="btn" onmousedown="eb(event,'h3')">H3</button>
  <button class="btn" onmousedown="eb(event,'p')">¶ P</button>
  <div class="sep"></div>
  <button class="btn" onmousedown="e(event,'insertUnorderedList')">• List</button>
  <button class="btn" onmousedown="e(event,'insertOrderedList')">1. List</button>
  <div class="sep"></div>
  <button class="btn" onmousedown="e(event,'removeFormat')">✕ Clear</button>
</div>
<div id="editor" contenteditable="true"></div>
<script>
var ed = document.getElementById('editor');
ed.innerHTML = \`${safeContent}\`;

function e(ev, cmd) {
  ev.preventDefault();
  document.execCommand(cmd, false, null);
  notify();
}
function eb(ev, tag) {
  ev.preventDefault();
  document.execCommand('formatBlock', false, tag);
  notify();
}
ed.addEventListener('input', notify);

function notify() {
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(ed.innerHTML);
  }
}
</script>
</body></html>`;
}
