const fs = require('node:fs');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const source = fs.readFileSync('outputs/shard-ui.user.js','utf8');
const adapter = source.slice(source.indexOf('  function installCanvasSelection()'),source.indexOf('  function scan(root)'));
const w = new JSDOM(`<main><aside class="tourAdventureTracker"><table class="encountertable"><tbody>
<tr><td>1 <span class="fa-check-square"></span></td><td><span class="draginfo">A</span></td></tr>
<tr><td>2 <span class="fa-square"></span></td><td><span class="draginfo">B</span></td></tr>
<tr><td>3 <span class="fa-square"></span></td><td><span class="draginfo">C</span></td></tr>
</tbody></table></aside><div><section class="tourAdventureMap"><div class="maptool"><span class="toolselect"><i class="fa-arrows-alt"></i></span></div><div class="konvajs-content"><canvas></canvas></div></section></div></main>`,{runScripts:'outside-only',pretendToBeVisual:true}).window;
const d=w.document, surface=d.querySelector('.konvajs-content'), canvas=d.querySelector('canvas');
surface.getBoundingClientRect=()=>({left:100,top:100,right:500,bottom:500,width:400,height:400});
const boxes=[...d.querySelectorAll('td > span[class^=fa-]')];
let clicks=0;
for (const box of boxes) box.onclick=()=>{clicks++;box.className=box.classList.contains('fa-check-square')?'fa-square':'fa-check-square';};
const groups=['A','B','C'].map((name,i)=>({cInfo:{tokenType:'nametoken',number:i+1,displayName:name},isVisible:()=>true,getAbsolutePosition:()=>({x:25+i*50,y:50})}));
const stage={container:()=>surface,width:()=>200,height:()=>200,find:()=>groups,getIntersection:p=>groups.find(g=>Math.abs(g.getAbsolutePosition().x-p.x)<10&&Math.abs(50-p.y)<10)};
w.Konva={stages:[stage]};w.hideMapHint=()=>{};
w.eval(adapter+'installCanvasSelection();');
const emit=(type,x,y,extra={})=>{const e=new w.MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,shiftKey:true,...extra});Object.defineProperties(e,{pointerId:{value:1},pointerType:{value:'mouse'}});canvas.dispatchEvent(e);return e;};
const selected=()=>boxes.map(b=>b.classList.contains('fa-check-square'));
assert.equal(emit('pointerdown',250,200,{shiftKey:false}).defaultPrevented,false,'Plain clicks untouched');
emit('pointerdown',250,200);emit('pointermove',252,201);emit('pointerup',252,201);
assert.deepEqual(selected(),[true,true,false],'Modified click adds despite small hand movement');
emit('pointerdown',250,200);emit('pointerup',250,200);
assert.deepEqual(selected(),[true,false,false],'Modified click toggles off');
emit('pointerdown',210,150);emit('pointermove',380,250);emit('pointerup',380,250);
assert.deepEqual(selected(),[true,true,true],'Rectangle adds and preserves outside selection; scaled coordinates');
const before=clicks;
emit('pointerdown',250,200);emit('pointermove',400,400);d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));emit('pointerup',400,400);
assert.equal(clicks,before,'Escape performs no selection changes');
d.querySelector('.fa-arrows-alt').className='fa-pen';
assert.equal(emit('pointerdown',250,200).defaultPrevented,false,'Drawing retains its native shortcuts');
d.querySelector('.fa-pen').className='fa-arrows-alt';
assert.equal(emit('pointerdown',250,200,{altKey:true}).defaultPrevented,false,'Alt gestures remain native');
emit('pointerdown',250,200);w.dispatchEvent(new w.Event('blur'));emit('pointerup',250,200);
assert.equal(clicks,before,'Lost focus cancels the gesture');
assert.deepEqual(groups.map(g=>g.getAbsolutePosition()),[{x:25,y:50},{x:75,y:50},{x:125,y:50}]);
w.close();console.log('PASS canvas selection: additive rectangle, toggle, jitter, zoom coordinates, cancel, native tools preserved');
