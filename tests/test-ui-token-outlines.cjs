const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('outputs/shard-ui.user.js', 'utf8');
const adapter = source.slice(source.indexOf('  let tokenOutlinesInstalled'), source.indexOf('  function scan(root)'));
const stage = {container: () => ({closest: () => true}), find: () => [existing], batchDraw() { this.drawn = true; }};
class Group {
  constructor(type = 'nametoken', mapStage = stage) { this.cInfo = {tokenType:type}; this.children = []; this.stage = mapStage; }
  getStage() { return this.stage; }
  getChildren() { return this.children; }
  add(...nodes) { this.children.push(...nodes); return this; }
}
function rect(extra = {}) {
  return {attrs:{width:78,height:88,offsetX:39,offsetY:39,stroke:'cyan',strokeWidth:5,...extra},
    getClassName: () => 'Rect', cornerRadius(n) { this.attrs.cornerRadius = n; }};
}
const existing = new Group(), old = rect({stroke:'yellow'});
existing.add(old);
const K = {Group, stages:[stage]};
const context = vm.createContext({window:{Konva:K}});
vm.runInContext(adapter + 'installTokenOutlines();', context);
assert.equal(old.attrs.cornerRadius, 17.16);
assert.equal(stage.drawn, true);
const patched = Group.prototype.add;
vm.runInContext('installTokenOutlines();', context);
assert.equal(Group.prototype.add, patched, 'No stacked patches');
const fresh = new Group(), hover = rect({stroke:'red'}), backing = rect({stroke:'rgba(64,64,64,0.2)',strokeWidth:10});
assert.equal(fresh.add(hover, backing), fresh, 'Native add return value preserved');
assert.equal(hover.attrs.cornerRadius,17.16);
assert.equal(backing.attrs.cornerRadius,17.16);
assert.equal(hover.attrs.strokeWidth,5);
for (const group of [new Group('rectangle'), new Group('imagetoken'), new Group('nametoken', {container:()=>({closest:()=>null})})]) {
  const node = rect(); group.add(node); assert.equal(node.attrs.cornerRadius, undefined);
}
for (const extra of [{fill:'gray'}, {height:78}, {offsetX:0}, {cornerRadius:4}]) {
  const node = rect(extra); fresh.add(node); assert.equal(node.attrs.cornerRadius,extra.cornerRadius);
}
vm.runInNewContext(adapter + 'installTokenOutlines();', {window:{}});
const badge = rect({fill:'gray',height:22,cornerRadius:4,opacity:0.65});
badge.fill = value => { badge.attrs.fill = value; };
badge.opacity = value => { badge.attrs.opacity = value; };
fresh.add(badge);
assert.equal(badge.attrs.fill, 'gray');
assert.equal(badge.attrs.opacity, 0.65);
const name = {attrs:{fontFamily:'Arial, sans-serif',fontSize:18,fill:'yellow',text:'Personnage',x:12},
  getClassName:()=> 'Text', fill(value) { this.attrs.fill=value; }};
fresh.add(name);
assert.equal(name.attrs.fill, 'yellow');
assert.equal(name.attrs.text, 'Personnage');
assert.equal(name.attrs.x, 12);
assert.equal(name.attrs.fontSize, 18);
console.log('PASS token outlines: existing/new contours, hover, idempotence, unchanged map shapes and labels');
