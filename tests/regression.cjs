
function runSuite(sources) {
 var objects=[],events={},chat=[],logs=[],seq=0,die=1;
 function assert(ok,label){if(!ok)throw Error(label);}
 function createObj(type,p){p=Object.assign({},p);if(p.characterid)p._characterid=p.characterid;if(p.pageid)p._pageid=p.pageid;p._type=type;if(type==='graphic')p._subtype=p._subtype||'token';var o={id:p._id||'o'+(++seq),get:function(k,cb){var v=p[k];if(cb)cb(v);return v;},set:function(k,v){if(typeof k==='string')p[k]=v;else Object.assign(p,k);},remove:function(){objects=objects.filter(function(x){return x!==o;});}};objects.push(o);return o;}
 function findObjs(q){return objects.filter(function(o){return Object.keys(q).every(function(k){return (k==='_id'?o.id:o.get(k))===q[k];});});}
 function getObj(t,id){return objects.find(function(o){return o.id===id&&o.get('_type')===t;});}
 function on(e,f){(events[e]||(events[e]=[])).push(f);}
 function inline(n,d){return {results:{total:n,rolls:d==null?[]:[{type:'R',sides:20,results:[{v:d}]}]}};}
 var callbacks=[];
 function sendChat(w,c,cb){chat.push(c);if(cb)callbacks.push(function(){cb([{inlinerolls:[inline(die,die)]}]);});}
 var instrumented=sources.AutoDamage.replace('return {version:VERSION,parseDistanceSpec:parseDistanceSpec,conditions:', 'return {_test:{failureConditions:failureConditions,successEffect:successEffect,saveSpec:saveSpec,finish:finish,historyChange:historyChange,processMessage:processMessage,requests:saveRequests,history:history,multiStart:multiStart,fields:fields},version:VERSION,parseDistanceSpec:parseDistanceSpec,conditions:');
 var api=new Function('on','findObjs','getObj','createObj','sendChat','playerIsGM','Campaign','getAttrByName','randomInteger','log','state','setTimeout','setDefaultTokenForCharacter',instrumented+'\n'+sources.NPCForge+'\n'+sources.AD5Areas+'\nreturn {AD5:AD5,Forge:NPCForge,Health:AD5HealthView,Areas:AD5Areas};')(on,findObjs,getObj,createObj,sendChat,function(id){return id==='gm';},function(){return {get:function(k){return k==='playerpageid'?'page':{};}};},function(cid,n){var a=findObjs({_type:'attribute',_characterid:cid,name:n})[0];return a&&a.get('current');},function(){return die;},function(x){logs.push(x);},{},function(){},function(){});
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
 return {passed:true,checks:'HP boundaries; parser; sheet/chat saves; state-only; NPC auto saves; PC/NPC HP; undo/redo; duplicate callback; unrelated markers',logs:logs};
}

const fs=require('node:fs'),path=require('node:path');
const sources={};
for(const name of ['AutoDamage','NPCForge','AD5Areas'])sources[name]=fs.readFileSync(path.join(__dirname,'..',name),'utf8');
console.log(runSuite(sources));
