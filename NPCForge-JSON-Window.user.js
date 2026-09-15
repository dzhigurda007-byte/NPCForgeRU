// ==UserScript==
// @name         NPC Forge JSON Window
// @namespace    NPCForgeRU
// @version      1.0.0
// @description  Многострочный импорт JSON NPC в Roll20 без Handout
// @match        https://app.roll20.net/editor*
// @grant        none
// ==/UserScript==
(function () {
    'use strict';
    function openWindow() {
        if (document.getElementById('npcforge-json-dialog')) return;
        const dialog = document.createElement('dialog');
        dialog.id = 'npcforge-json-dialog';
        dialog.style.cssText = 'width:min(760px,90vw);max-height:90vh;padding:24px;border:1px solid #777;border-radius:12px;z-index:2147483647;color:#eee;background:#242630;';
        const heading = document.createElement('h2');
        heading.textContent = 'Создать NPC из JSON';
        const hint = document.createElement('p');
        hint.textContent = 'Вставьте JSON NPC. Требуется NPC Forge 2.5.1 и права мастера.';
        const input = document.createElement('textarea');
        input.setAttribute('aria-label','JSON NPC');
        input.placeholder = '{"name":"Тестовый NPC","cr":"1","role":"soldier"}';
        input.style.cssText = 'box-sizing:border-box;width:100%;height:45vh;font:14px monospace;padding:12px;color:#eee;background:#161820;';
        const label = document.createElement('label'), token = document.createElement('input');
        token.type = 'checkbox'; token.checked = true;
        label.append(token, document.createTextNode(' Создать токен первого NPC'));
        const error = document.createElement('p'); error.setAttribute('role','status');
        const buttons = document.createElement('div');
        const create = document.createElement('button'), cancel = document.createElement('button');
        create.textContent = 'Создать'; cancel.textContent = 'Отмена';
        create.style.cssText = cancel.style.cssText = 'padding:8px 20px;margin:12px 12px 0 0;';
        buttons.append(create,cancel);
        dialog.append(heading,hint,input,label,error,buttons); document.body.append(dialog);
        function close(){dialog.close();dialog.remove();}
        cancel.addEventListener('click',close);
        dialog.addEventListener('cancel',function(e){e.preventDefault();close();});
        create.addEventListener('click',function(){
            try {
                let raw=input.value.trim().replace(/^\uFEFF/,'').replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
                const data=JSON.parse(raw), list=Array.isArray(data)?data:[data];
                if(!list.length||list.length>50||list.some(x=>!x||typeof x!=='object'||Array.isArray(x)||!String(x.name||'').trim()))
                    throw new Error('Нужен объект NPC с name или массив из 1–50 NPC.');
                const encoded=encodeURIComponent(JSON.stringify(data));
                if(encoded.length>250000)throw new Error('JSON слишком большой. Разделите NPC на несколько импортов.');
                const chat=document.querySelector('#textchat-input textarea');
                const send=document.querySelector('#textchat-input button');
                if(!chat||!send||send.disabled)throw new Error('Поле отправки Roll20 не найдено. Откройте вкладку чата.');
                if(chat.value.trim())throw new Error('В поле чата есть неотправленный текст. Сначала отправьте или уберите его.');
                chat.value='!npc-json '+(token.checked?'--token ':'')+'--encoded|'+encoded;
                chat.dispatchEvent(new Event('input',{bubbles:true}));
                chat.dispatchEvent(new Event('change',{bubbles:true}));
                create.disabled=true;
                // Send through the existing Roll20 chat control. Server-side
                // NPC Forge enforces GM authorization and validates the NPC.
                send.click();
                error.textContent='Команда передана в чат. Результат импорта появится в личном сообщении мастеру.';
                cancel.textContent='Закрыть';
            } catch(e){error.textContent=e.message;}
        });
        dialog.showModal();input.focus();
    }
    const launch=document.createElement('button');
    launch.textContent='NPC JSON';
    launch.title='Создать NPC из JSON';
    launch.style.cssText='position:fixed;bottom:14px;left:65px;z-index:100000;padding:9px 14px;border-radius:7px;background:#583789;color:white;border:1px solid #b39acb;';
    launch.addEventListener('click',openWindow);
    document.body.append(launch);
}());
