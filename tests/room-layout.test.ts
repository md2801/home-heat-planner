import test from "node:test";
import assert from "node:assert/strict";
import { roomLayout, visibleWalls, wallWidths } from "../src/features/room-scene/room-layout.ts";
import { emptyScene, type RoomScene } from "../src/contracts/room-scene.ts";
const window = {direction:"north" as const,covering:"curtains" as const,shade:"none" as const};
test("windows follow reported directions with their coverings and zero/unknown windows are not invented", () => {
 const s:RoomScene={...emptyScene(), windows:[{...window},{...window,direction:"west",covering:"blinds"}]};
 const a=roomLayout(s);assert.deepEqual(a.windows.map(w=>[w.wall,w.covering]),[["north","curtains"],["west","blinds"]]);
 s.windows![0]!.direction="east";const b=roomLayout(s);assert.equal(b.windows[0]?.wall,"east");assert.equal(b.windows[0]?.covering,"curtains");
 assert.deepEqual(roomLayout({...s,windows:[]}).windows,[]);assert.deepEqual(roomLayout(emptyScene()).windows,[]);
 assert.equal(roomLayout({...s,windows:[{...window,direction:"unknown"}]}).windows.length,0);
 assert.match(roomLayout({...s,windows:[{...window,direction:"north-east"}]}).notes.join(" "),/approximately/);
});
test("four same-wall windows fit without overlapping even with curtain widths", () => {
 for(const direction of ["north","east","south","west"] as const){
 const layout=roomLayout({...emptyScene(),windows:Array.from({length:4},()=>({...window,direction}))});
 const width=wallWidths[direction];let edge=-width/2;
 for(const w of layout.windows){assert.ok(w.offset-.83*w.scale>=edge);assert.ok(w.offset+.83*w.scale<=width/2);edge=w.offset+.83*w.scale;}
 }
});
test("fan and AC answer changes alter placement without inventing unknown types or walls", () => {
 const s:RoomScene={...emptyScene(),windows:[window],equipment:["portable-fan","split-ac"]};
 const beside=roomLayout(s,{fanPosition:"beside-bed",acWall:"east",acType:"wall-mounted"});
 const foot=roomLayout(s,{fanPosition:"foot-of-bed",acWall:"west",acType:"wall-mounted"});
 assert.notDeepEqual(beside.equipment[0]?.position,foot.equipment[0]?.position);
 assert.equal(beside.equipment[1]?.wall,"east");assert.equal(foot.equipment[1]?.wall,"west");
 assert.equal(roomLayout(s).equipment.length,0);
 assert.equal(roomLayout({...s,equipment:["fan-unspecified","ac-unspecified"]}).equipment.length,0);
 const near=roomLayout(s,{fanPosition:"near-window"});assert.ok(Math.abs(near.equipment[0]!.position[2] + 1.45) < .001);
 assert.equal(roomLayout({...s,windows:[]},{fanPosition:"near-window"}).equipment.length,0);
 assert.equal(roomLayout({...s,equipment:[]},{fanPosition:"foot-of-bed",acWall:"east"}).equipment.length,0);
});
test("camera quadrants retain only the two far walls",()=>{
 assert.deepEqual(visibleWalls(2,2),["west","north"]);assert.deepEqual(visibleWalls(-2,-2),["east","south"]);
 assert.deepEqual(visibleWalls(-2,2),["east","north"]);assert.deepEqual(visibleWalls(2,-2),["west","south"]);
});
