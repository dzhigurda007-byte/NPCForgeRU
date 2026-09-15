
function runSuite(sources) {
 var emitGraphics=false;var objects=[],events={},chat=[],logs=[],seq=0,die=1;
 function assert(ok,label){if(!ok)throw Error(label);}
 function createObj(type,p){p=Object.assign({},p);if(p.characterid)p._characterid=p.characterid;if(p.pageid)p._pageid=p.pageid;p._type=type;if(type==='graphic')p._subtype=p._subtype||'token';var o={id:p._id||'o'+(++seq),get:function(k,cb){var v=p[k];if(cb)cb(v);return v;},set:function(k,v){var prev=Object.assign({},p);if(typeof k==='string')p[k]=v;else Object.assign(p,k);if(emitGraphics&&type==='graphic'&&JSON.stringify(prev)!==JSON.stringify(p))(events['change:graphic']||[]).forEach(function(f){f(o,prev);});},remove:function(){objects=objects.filter(function(x){return x!==o;});}};objects.push(o);return o;}
 function findObjs(q){return objects.filter(function(o){return Object.keys(q).every(function(k){return (k==='_id'?o.id:o.get(k))===q[k];});});}
 function getObj(t,id){return objects.find(function(o){return o.id===id&&o.get('_type')===t;});}
 function on(e,f){(events[e]||(events[e]=[])).push(f);}
 function inline(n,d){return {results:{total:n,rolls:d==null?[]:[{type:'R',sides:20,results:[{v:d}]}]}};}
 var callbacks=[];
 function sendChat(w,c,cb){chat.push(c);if(cb)callbacks.push(function(){cb([{inlinerolls:[inline(die,die)]}]);});}
 var instrumented=sources.AutoDamage.replace('return {version:VERSION,parseDistanceSpec:parseDistanceSpec,conditions:', 'return {_test:{failureConditions:failureConditions,successEffect:successEffect,saveSpec:saveSpec,finish:finish,historyChange:historyChange,processMessage:processMessage,requests:saveRequests,history:history,multiStart:multiStart,fields:fields,parseResistances:parseResistances,typedDamage:typedDamage,fullDamage:fullDamage,config:CONFIG},version:VERSION,parseDistanceSpec:parseDistanceSpec,conditions:');
 var api=new Function('on','findObjs','getObj','createObj','sendChat','playerIsGM','Campaign','getAttrByName','randomInteger','log','state','setTimeout','setDefaultTokenForCharacter',instrumented+'\n'+sources.NPCForge+'\n'+sources.AD5Areas+'\nreturn {AD5:AD5,Forge:NPCForge,Health:AD5HealthView,Areas:AD5Areas,Wounds:AD5Wounds};')(on,findObjs,getObj,createObj,sendChat,function(id){return id==='gm';},function(){return {get:function(k){return k==='playerpageid'?'page':{};}};},function(cid,n){var a=findObjs({_type:'attribute',_characterid:cid,name:n})[0];return a&&a.get('current');},function(){return die;},function(x){logs.push(x);},{},function(){},function(){});
 var a=api.AD5._test;
 createObj('player',{_id:'gm',_displayname:'GM'});createObj('player',{_id:'p',_displayname:'Player'});
 function attr(cid,n,v,max){return createObj('attribute',{characterid:cid,name:n,current:v,max:max});}
 function character(id,npc,owner){createObj('character',{_id:id,name:id,controlledby:owner||''});attr(id,'npc',npc?'1':'0');attr(id,'hp',100,100);attr(id,'wisdom_save_bonus',0);attr(id,'npc_wis_save',0);return createObj('graphic',{_id:id+'t',represents:id,name:id,_pageid:'page',layer:'objects',bar1_value:100,bar1_max:100,bar1_link:'',statusmarkers:'aura'});}
 var npc=character('npc',true),pc=character('pc',false,'p');character('caster',true);
 var expected={100:'',76:'',75:'half-heart',51:'half-heart',50:'half-heart,yellow',26:'half-heart,yellow',25:'half-heart,red',1:'half-heart,red',0:'skull'};
 Object.keys(expected).forEach(function(h){npc.set('bar1_value',Number(h));api.Health.update(npc);assert(npc.get('statusmarkers').split(',').sort().join(',')===('aura'+(expected[h]?','+expected[h]:'')).split(',').sort().join(','),'HP '+h);});
 npc.set('bar1_value',100);api.Health.update(npc);
 assert(a.successEffect('')==='none','empty success');
 assert(a.successEffect('При провале: полный урон, оглушён. При успехе: нет эффекта.')==='none','no effect');
 assert(a.successEffect('При успехе: половина урона')==='half','half');
 assert(a.failureConditions({savedesc:'При провале: полный урон, оглушён, опутан. При успехе: половина урона.'}).join(',')==='stunned,restrained','conditions parser');
 assert(a.failureConditions({savedesc:'При успехе: оглушён'}).length===0,'success not failure');
 function cast(target,stateOnly,successText,player){
  var f='&{template:npcaction} {{name=caster}} {{rname=Тест}} {{charid=caster}} {{ad5target='+target.id+'}} {{save=1}} {{saveattr=wisdom}} {{savedc=15}} {{savedesc='+successText+'}} {{description=При провале: оглушён, опутан.}}';
  if(!stateOnly)f+=' {{dmg1flag=1}} {{dmg1=10}} {{dmg1type=огонь}}';
  a.processMessage({playerid:player||'gm',type:'general',rolltemplate:'npcaction',content:f},null);
 }
 cast(pc,false,'');assert(Object.keys(a.requests).length===1,'PC request');
 var id=Object.keys(a.requests)[0];
 a.processMessage({playerid:'p',type:'general',rolltemplate:'simple',content:'{{rname=Wisdom Save}} {{charname=pc}} {{r1=$[[0]]}}',inlinerolls:[inline(1,1)]},null);
 assert(pc.get('bar1_value')===90,'sheet fail damage '+JSON.stringify(chat.slice(-2)));
 assert(pc.get('statusmarkers').includes('lightning-helix')&&pc.get('statusmarkers').includes('fishing-net'),'sheet fail states');
 assert(!a.requests[id],'request consumed');
 a.historyChange('last','gm',false);assert(pc.get('bar1_value')===100&&pc.get('statusmarkers')==='aura','undo HP states');
 a.historyChange('last','gm',true);assert(pc.get('bar1_value')===90&&pc.get('statusmarkers').includes('fishing-net'),'redo');
 a.historyChange('last','gm',false);
 cast(pc,true,'');id=Object.keys(a.requests)[0];
 a.processMessage({playerid:'p',type:'api',content:'!ad5 save '+id+' normal'},null);
 assert(callbacks.length===1,'chat callback requested');var cb=callbacks.shift();cb();cb();
 assert(pc.get('bar1_value')===100&&pc.get('statusmarkers').includes('fishing-net'),'chat state only');
 a.historyChange('last','gm',false);
 die=20;cast(pc,false,'');id=Object.keys(a.requests)[0];a.processMessage({playerid:'p',type:'api',content:'!ad5 save '+id+' normal'},null);callbacks.shift()();
 assert(pc.get('bar1_value')===100&&pc.get('statusmarkers')==='aura','empty success no effects');
 die=1;cast(npc,false,'При успехе: нет урона');
 assert(npc.get('bar1_value')===90&&npc.get('statusmarkers').includes('fishing-net'),'auto NPC fail '+JSON.stringify(chat.slice(-2)));
 assert(findObjs({_type:'attribute',_characterid:'npc',name:'hp'})[0].get('current')===100,'NPC sheet HP unchanged');
 npc.set('statusmarkers',npc.get('statusmarkers')+',sleepy');
 a.historyChange('last','gm',false);assert(npc.get('statusmarkers').includes('sleepy')&&!npc.get('statusmarkers').includes('fishing-net'),'preserve unrelated');
 
 die=20;cast(npc,false,'При успехе: половина урона');
 assert(npc.get('bar1_value')===95&&!npc.get('statusmarkers').includes('fishing-net'),'NPC success half');
 a.historyChange('last','gm',false);
 npc.set('statusmarkers','aura,fishing-net');die=1;cast(npc,false,'нет эффекта');a.historyChange('last','gm',false);
 assert(npc.get('statusmarkers')==='aura,fishing-net','pre-existing condition preserved');
 assert(a.successEffect('При провале: полный урон, оглушён.')==='none','missing success after failure');
 var prefix='repeating_npcaction_test_', values={attack_flag:'0',damage_flag:'0',save_flag:'on',save_attr:'wisdom',save_dc:'15',save_effect:'При провале: опутан. При успехе: нет эффекта.',name:'Путы',description:'Путы',attack_range:'20 фт круг'};
 Object.keys(values).forEach(function(k){attr('caster',prefix+k,values[k]);});
 api.Forge._test.fixCharacter('caster');
 var base=findObjs({_type:'attribute',_characterid:'caster',name:prefix+'rollbase'})[0].get('current');
 assert(base.includes('{{save=1}}')&&base.includes('опутан')&&base.includes('ad5area='),'Forge state-only area metadata');
 var parse=api.AD5.parseDistanceSpec('20 фт круг');assert(parse.area,'AD5 area parser');
 
 var path={get:function(k){return k==='rotation'?0:100;}};
 npc.set({left:100,top:100});assert(api.Areas._test.contains({shape:'circle',w:140,h:140},path,npc),'circle inside');
 npc.set({left:180,top:100});assert(!api.Areas._test.contains({shape:'circle',w:140,h:140},path,npc),'circle outside');
 npc.set({left:100,top:100});assert(api.Areas._test.contains({shape:'cone',w:140,h:140},path,npc),'cone inside');
 
 var n2=character('npc2',true);getObj('character','caster').set('controlledby','p');
 die=1;var multiMsg={playerid:'p',type:'general',rolltemplate:'npcaction',content:'{{charid=caster}} {{name=caster}} {{rname=Массовые путы}} {{ad5targets=2}} {{save=1}} {{saveattr=wisdom}} {{savedc=15}} {{savedesc=При провале: опутан. При успехе: нет эффекта.}}'};
 var mid=a.multiStart(multiMsg,a.fields(multiMsg.content));
 api.AD5.multi.setTargets(mid,'p',[npc.id,n2.id],true);api.AD5.multi.apply(mid,'p');
 assert(n2.get('statusmarkers').includes('fishing-net')&&n2.get('bar1_value')===100,'player controlled caster multiple NPC state only');
 assert(!Object.keys(a.requests).length,'multi uncontrolled NPC automatic');

 var initial=findObjs({_type:'character'}).length;
 api.Forge._test.handle({type:'api',playerid:'p',who:'Player',content:'!npc-json --json|{"name":"Denied"}'});
 assert(findObjs({_type:'character'}).length===initial,'GM authorization');
 api.Forge._test.handle({type:'api',playerid:'gm',who:'GM',content:'!npc-json --json|{bad}'});
 assert(findObjs({_type:'character'}).length===initial,'invalid JSON');
 api.Forge._test.handle({type:'api',playerid:'gm',who:'GM',content:'!npc-json --json|[]'});
 assert(findObjs({_type:'character'}).length===initial,'empty array');
 var direct={name:'Прямой JSON <тест> --token',cr:'1',role:'soldier',actions:[],traits:[],reactions:[]};
 api.Forge._test.handle({type:'api',playerid:'gm',who:'GM',content:'!npc-json --token --encoded|'+encodeURIComponent(JSON.stringify(direct))});
 assert(findObjs({_type:'character',name:direct.name}).length===1,'encoded import '+JSON.stringify(chat.slice(-1)));
 var created=findObjs({_type:'character',name:direct.name})[0];
 assert(findObjs({_type:'graphic',represents:created.id}).length===1,'direct token');
 api.Forge._test.handle({type:'api',playerid:'gm',who:'GM',content:'!npc-json --json|{"name":"Raw JSON","cr":"1","actions":[],"reactions":[]}'});
 assert(findObjs({_type:'character',name:'Raw JSON'}).length===1,'raw import');

 var w=api.Wounds,wt=character('wounds',true);
 var blankToken=createObj('graphic',{name:'Unlinked'});api.Health.update(blankToken);
 assert(blankToken.get('tooltip')==='Легкая рана - 0, Средняя рана - 0, Тяжелая рана - 0'&&blankToken.get('show_tooltip')===true,'default tooltip on unlinked token');
 function hit(target,damage,type){a.processMessage({playerid:'gm',type:'general',rolltemplate:'npcaction',content:'{{charid=caster}} {{name=caster}} {{rname=Wound test}} {{ad5target='+target.id+'}} {{attack=0}} {{dmg1flag=1}} {{dmg1='+damage+'}} {{dmg1type='+(type||'огонь')+'}}'},null);}
 [[25,null],[25.1,'light'],[26,'light'],[50,'light'],[50.1,'medium'],[51,'medium'],[75,'medium'],[75.1,'heavy'],[76,'heavy']].forEach(function(x){assert(w.severity(100,x[0])===x[1],'exact threshold '+x[0]);});
 [[25,null],[26,'light'],[50,'light'],[51,'medium'],[75,'medium'],[76,'heavy'],[200,'heavy']].forEach(function(x){wt.set('bar1_value',100);w.set(wt,{light:0,medium:0,heavy:0});hit(wt,x[0]);var c=w.counts(wt.id);assert(x[1]?c[x[1]]===1:c.light+c.medium+c.heavy===0,'damage wound '+x[0]);a.historyChange('last','gm',false);assert(wt.get('bar1_value')===100&&w.counts(wt.id).light+w.counts(wt.id).medium+w.counts(wt.id).heavy===0,'wound undo');a.historyChange('last','gm',true);assert(x[1]?w.counts(wt.id)[x[1]]===1:true,'wound redo');});
 wt.set('bar1_value',40);w.set(wt,{light:0,medium:0,heavy:0});hit(wt,20);assert(w.counts(wt.id).light===1,'current HP denominator');hit(wt,10);assert(w.counts(wt.id).light===2,'accumulate');hit(wt,30,'лечение');assert(w.counts(wt.id).light===2,'healing keeps wounds');
 wt.set('bar1_value',100);w.set(wt,{light:0,medium:0,heavy:0});a.config.tempBar=3;wt.set({bar3_value:40,bar3_link:''});hit(wt,60);assert(wt.get('bar1_value')===80&&w.counts(wt.id).light===0,'absorbed temp HP excluded');a.config.tempBar=0;
 var pct=character('woundPC',false,'p');hit(pct,60);assert(pct.get('bar1_value')===40&&w.counts(pct.id).medium===1,'PC wound');
 a.processMessage({type:'api',playerid:'gm',content:'!ad5 wounds reset',selected:[{_id:pct.id}]},null);assert(w.counts(pct.id).medium===0,'reset');
 var stopped=false;try{a.historyChange('last','gm',false);}catch(e){stopped=true;}assert(stopped&&pct.get('bar1_value')===40,'wound conflict protects HP');
 wt.set('bar1_value',0);w.set(wt,{light:0,medium:0,heavy:0});hit(wt,50);assert(w.counts(wt.id).heavy===0,'zero HP no wound');


 var ext=character('external',true);w.observe(ext);ext.set('bar1_value',70);w.changed(ext,{bar1_value:100});assert(w.counts(ext.id).light===1&&ext.get('tooltip').includes('Легкая рана - 1'),'external damage tooltip');
 w.changed(ext,{bar1_value:100});assert(w.counts(ext.id).light===1,'duplicate event');
 ext.set('bar1_value',30);w.changed(ext,{bar1_value:70});assert(w.counts(ext.id).medium===1&&ext.get('tooltip').includes('Средняя рана - 1'),'second external damage tooltip');
 ext.set('bar1_value',100);w.changed(ext,{bar1_value:30});assert(w.counts(ext.id).medium===1,'external healing');
 hit(ext,30);w.changed(ext,{bar1_value:100});assert(w.counts(ext.id).light===2,'AD5 plus event exactly once');
 a.historyChange('last','gm',false);w.changed(ext,{bar1_value:70});assert(w.counts(ext.id).light===1,'undo event no wound');
 a.historyChange('last','gm',true);w.changed(ext,{bar1_value:100});assert(w.counts(ext.id).light===2,'redo event once');
var ev=character('syncEvents',true);w.observe(ev);emitGraphics=true;hit(ev,30);assert(w.counts(ev.id).light===1,'synchronous event no double');ev.set('bar1_value',30);assert(w.counts(ev.id).medium===1,'live event tooltip');emitGraphics=false;

 var rr=a.parseResistances('<p>огонь: 25, звук:50</p><p>кислота: -50</p>');assert(rr['огонь']===25&&rr['звук']===50&&rr['кислота']===-50,'HTML percentage parsing');
 var calc=a.typedDamage({components:[{type:'огонь',amount:20},{type:'звук',amount:10}]},1,0.5,rr);assert(calc.full===15&&calc.amount===9,'save then typed resistance rounding');
 assert(a.typedDamage({components:[{type:'кислота',amount:20}]},1,1,rr).amount===30,'vulnerability');
 var rnpc=character('resistNPC',true);getObj('character','resistNPC').set('gmnotes','огонь: 50');hit(rnpc,60);assert(rnpc.get('bar1_value')===70&&w.counts(rnpc.id).light===1,'NPC GM notes reduce');
 var key=Object.keys(a.history).slice(-1)[0];a.fullDamage(key,'gm');assert(rnpc.get('bar1_value')===40&&w.counts(rnpc.id).medium===1&&w.counts(rnpc.id).light===0,'full replaces wounds');
 var repeated=false;try{a.fullDamage(key,'gm');}catch(e){repeated=true;}assert(repeated&&rnpc.get('bar1_value')===40,'full idempotency');a.historyChange(key,'gm',false);assert(rnpc.get('bar1_value')===100,'override undo');a.historyChange(key,'gm',true);assert(rnpc.get('bar1_value')===40,'override redo');
 var rpc=character('resistPC',false,'p');attr('resistPC','flaws','огонь: 25, кислота: -50');hit(rpc,20);assert(rpc.get('bar1_value')===85,'PC flaws');
 a.historyChange('last','gm',false);hit(rpc,20,'кислота');assert(rpc.get('bar1_value')===70,'PC vulnerability');key=Object.keys(a.history).slice(-1)[0];a.fullDamage(key,'gm');assert(rpc.get('bar1_value')===80,'full refunds vulnerability excess');
 getObj('character','resistNPC').set('gmnotes','огонь: 100');rnpc.set('bar1_value',100);hit(rnpc,20);assert(rnpc.get('bar1_value')===100,'immunity');
 getObj('character','resistNPC').set('gmnotes','огонь: 50');die=20;cast(rnpc,false,'При успехе: половина урона');assert(rnpc.get('bar1_value')===98,'save half then resistance');key=Object.keys(a.history).slice(-1)[0];a.fullDamage(key,'gm');assert(rnpc.get('bar1_value')===95,'full preserves save half');
 rnpc.set('bar1_value',100);cast(rnpc,false,'При успехе: нет урона');assert(rnpc.get('bar1_value')===100,'successful zero');
 var current=rnpc.get('bar1_value');hit(rnpc,10,'лечение');assert(rnpc.get('bar1_value')===100,'healing unaffected');


 var asyncToken=character('asyncNPC',true),asyncChar=getObj('character','asyncNPC'),oldGet=asyncChar.get,notesCallbacks=[];
 asyncChar.get=function(k,cb){if(k==='gmnotes'&&cb){notesCallbacks.push(cb);return;}return oldGet(k,cb);};
 hit(asyncToken,40);assert(asyncToken.get('bar1_value')===100&&notesCallbacks.length===1,'wait for NPC notes before damage');
 var nc=notesCallbacks.shift();nc('огонь: 50');nc('огонь: 50');assert(asyncToken.get('bar1_value')===80,'async callback once');
 hit(asyncToken,40);asyncToken.set('bar1_value',70);notesCallbacks.shift()('огонь: 50');assert(asyncToken.get('bar1_value')===70,'concurrent HP change blocked');
 var blockedPC=character('waitingPC',false,'p');attr('waitingPC','flaws','огонь: 50');die=1;cast(blockedPC,false,'');assert(blockedPC.get('bar1_value')===100,'save waits before resistance damage');
 var req=Object.keys(a.requests)[0];a.processMessage({playerid:'p',type:'api',content:'!ad5 save '+req+' normal'},null);callbacks.shift()();assert(blockedPC.get('bar1_value')===95,'PC failed save then resistance');
 var bad=false;try{a.parseResistances('огонь: 120');}catch(e){bad=true;}assert(bad,'invalid resistance rejected');


 var encodedNPC=character('encodedNPC',true);getObj('character','encodedNPC').set('gmnotes',escape('<p>огонь: 50, звук: 25</p>'));hit(encodedNPC,100);assert(encodedNPC.get('bar1_value')===50,'legacy unicode GM notes');
 var tokenNPC=character('tokenNotesNPC',true);tokenNPC.set('gmnotes','огонь: 50');hit(tokenNPC,100);assert(tokenNPC.get('bar1_value')===50,'token notes');
 var fieldNPC=character('fieldNotesNPC',true);attr('fieldNotesNPC','npc_notes','огонь: 25');hit(fieldNPC,100);assert(fieldNPC.get('bar1_value')===25,'sheet notes');
 var quoted=a.parseResistances('Сопротивления: «огонь: 25, звук:50»');assert(quoted['огонь']===25&&quoted['звук']===50,'quoted labelled notes');
 var conflictNPC=character('conflictNPC',true);conflictNPC.set('gmnotes','огонь: 25');getObj('character','conflictNPC').set('gmnotes','огонь: 50');hit(conflictNPC,100);assert(conflictNPC.get('bar1_value')===100,'conflicting notes reject before HP');
 a.processMessage({type:'api',playerid:'gm',content:'!ad5 resistances',selected:[{_id:encodedNPC.id}]},null);assert(chat[chat.length-1].includes('огонь: 50%'),'diagnostics source');

 return {passed:true,checks:'HP boundaries; parser; sheet/chat saves; state-only; NPC auto saves; PC/NPC HP; undo/redo; duplicate callback; unrelated markers',logs:logs};
}

const fs=require('node:fs'),path=require('node:path');
const sources={};
for(const name of ['AutoDamage','NPCForge','AD5Areas'])sources[name]=fs.readFileSync(path.join(__dirname,'..',name),'utf8');
console.log(runSuite(sources));

