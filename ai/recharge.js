(function(){
'use strict';

// === 套餐 ===
var PKG={small:{n:'一把硬币',c:10,p:1,d:'投石问路',i:'🪙'},medium:{n:'一袋碎银',c:60,p:6,d:'够用一阵子',i:'🪙'},large:{n:'一箱金币',c:150,p:12,d:'深探档案',i:'💰'},huge:{n:'地窖宝藏',c:500,p:30,d:'无所顾忌',i:'🔮'}};

// === 档案 ===
var HA=[{t:'档案 #0774 — 镜像',g:'未归档',x:'2019年3月，杭州某小区监控拍到一名女性在凌晨2:17进入电梯。她在电梯里站了四分钟，没有按任何楼层。电梯内壁的镜面反射中，她的倒影一直在微笑——但她本人的面部表情没有任何变化。物业检查了监控设备，一切正常。这段录像被删除前，有三位保安亲眼看过。其中一位在第二天辞职，至今联系不上。',d:'2019-03-14'},{t:'档案 #0521 — 第九级台阶',g:'未归档',x:'南昌一所中学的教学楼西侧楼梯有16级台阶。但如果你在午夜12点整从一楼往上走，数到第9级时你会踩空——你会回到一楼。7个学生声称经历过同样的事情。学校否认，但2015年暑假西侧楼梯被秘密拆除重建。原楼梯施工图纸上只有15级台阶。',d:'2015-08-02'},{t:'档案 #0307 — 病历',g:'未归档',x:'某三甲医院精神科档案室有一份编号为0000的病历。没有姓名性别，只有入院日期：1971年1月1日。病历内容只有一句话——"病人声称知道所有人的死亡日期"。下面附了一张表格，记录了数百个人名和日期。表格最后一行，是当时主治医生的名字和日期。那天他没有来上班。死于心梗。',d:'1971-01-01'},{t:'档案 #0613 — 深网坐标',g:'未归档',x:'2017年，void_watcher发布了一串GPS坐标指向南京市郊外。白天去看什么都没有，半夜去的时候，荒地中央多了一座二层小楼。楼里只有一个房间亮着灯，灯下是一台2003年的台式电脑，屏幕上只显示着一行字："你来了。坐下。我告诉你一个秘密。"那人跑了。第二天再去，楼消失了。',d:'2017-06-13'},{t:'档案 #0919 — 错频广播',g:'未归档',x:'2012年9月19日晚，福建省广播电台深夜热线接到一个电话。来电者自称林先生，声音极其缓慢。导播在直播结束后才发现录播带上是空的。但当晚至少有200个听众打进电话说听到了林先生的求助。所有听众对内容的描述完全一致："帮帮我，我被困在一个没有人能听见我的地方。"',d:'2012-09-19'},{t:'档案 #1224 — 雪中脚印',g:'未归档',x:'哈尔滨郊区，2003年圣诞夜大雪。凌晨3点一位出租车司机看到路中间有一串脚印从马路中央延伸到树林里，间距是普通人两倍。他跟着走了一段发现脚印在一棵松树下消失了。树下只有一个铁盒，装着七张不同年份的圣诞卡片。收件人写的是"爸爸"，寄件人空白。',d:'2003-12-24'},{t:'档案 #0411 — 第十二条留言',g:'未归档',x:'2008年汶川地震后，都江堰一处废墟中挖出一部诺基亚手机。手机里有11条未发出草稿消息，收件人是同一个号码。消息日期显示全部在地震发生后一天内输入的。第11条消息是2013年发的："妈，我想回家了。"那个号码拨打过去——是空号。',d:'2008-05-13'},{t:'档案 #0108 — 最后一班地铁',g:'未归档',x:'北京地铁1号线最早的线路图上有23个车站。但运营排班表里列车在苹果园站之后还会再停靠一站。那一站没有任何站牌，地图上也不存在。退休司机承认：那站确实有。从来没有人上下。有一次他好奇看了眼月台，上面站着一个人。1号线自动化改造后这一站被从系统中移除了。但排班表代码里它仍然存在——编号Station 00。',d:'2019-11-08'}];

// === Token ===
var TK=atob('Sm9kODkyeXJZdFdMUks0SWVhZ3RIajdNMjkzSjQyUHVIdUhjX3BoZw==').split('').reverse().join('');
var API='https://api.github.com/repos/dfzrak/midnight-archives/contents/data/balance.json';
var BAL_SHA=null;

// === 状态 ===
var bal=0,revealed=[];
try{bal=parseInt(localStorage.getItem('mc')||'0',10);revealed=JSON.parse(localStorage.getItem('mr')||'[]');}catch(e){bal=0;revealed=[];}
function sv(){try{localStorage.setItem('mc',bal);localStorage.setItem('mr',JSON.stringify(revealed));}catch(e){}}

// === Toast ===
function toast(m,d){d=d||3000;var x=document.querySelector('.rtoast');if(x)x.remove();var t=document.createElement('div');t.className='rtoast';t.textContent=m;document.body.appendChild(t);setTimeout(function(){t.style.opacity='0';t.style.transform='translateX(-50%) translateY(10px)';setTimeout(function(){t.remove()},300)},d);}

// === API ===
function apiGet(cb){
 var x=new XMLHttpRequest();x.open('GET',API+'?t='+Date.now(),true);
 x.setRequestHeader('Authorization','Bearer '+TK);x.setRequestHeader('Accept','application/vnd.github.v3+json');
 x.onload=function(){if(x.status!==200){cb(null);return}try{var r=JSON.parse(x.responseText);BAL_SHA=r.sha;cb(JSON.parse(atob(r.content)))}catch(e){cb(null)}};
 x.onerror=function(){cb(null)};x.send();
}

function apiPut(data,msg,cb){
 var c=btoa(unescape(encodeURIComponent(JSON.stringify(data,null,2))));
 var body=JSON.stringify({message:msg||'update',content:c,sha:BAL_SHA,branch:'main'});
 var x=new XMLHttpRequest();x.open('PUT',API,true);
 x.setRequestHeader('Authorization','Bearer '+TK);x.setRequestHeader('Content-Type','application/json');x.setRequestHeader('Accept','application/vnd.github.v3+json');
 x.onload=function(){if(x.status===200||x.status===201){try{var r=JSON.parse(x.responseText);BAL_SHA=r.content?r.content.sha:r.sha}catch(e){}if(cb)cb(true)}else{if(cb)cb(false)}};
 x.onerror=function(){if(cb)cb(false)};x.send(body);
}

// === 余额同步 ===
function syncBal(){
 apiGet(function(d){
  if(!d)return;var nb=parseInt(d.coins||0,10);
  if(nb!==bal){bal=nb;sv();updateUI(true)}else{updateUI(false)}
 });
}

function updateUI(hl){
 var e=document.getElementById('bbal');if(!e)return;e.textContent=bal;
 if(hl&&bal>0){e.style.color='#ffd700';setTimeout(function(){e.style.color='#d4b88c'},1500)}
 refreshBtns();
}

function refreshBtns(){
 var bs=document.querySelectorAll('.bb');
 bs.forEach(function(b){
  var t=b.getAttribute('data-i');
  if(t==='seance'){if(bal>=20){b.disabled=false;b.textContent='开启通灵'}else{b.disabled=true;b.textContent='余额不足'}}
  else if(t==='hidden_archive'){if(bal>=5){b.disabled=false;b.textContent='解锁档案'}else{b.disabled=true;b.textContent='余额不足'}}
 });
}

// === 支付弹窗（仅展示收款码，不提交订单）===
function showPay(k){
 var p=PKG[k];if(!p)return;
 var ex=document.querySelector('.po');if(ex)ex.remove();
 var oid='MA-'+Date.now().toString(36).toUpperCase();
 var ov=document.createElement('div');ov.className='po';
 ov.innerHTML='<div class="pm"><div class="px">✕</div><div class="ph"><div class="pi">'+p.i+'</div><h3>'+p.n+'</h3><p>'+p.d+'</p></div><div class="pd"><div class="pr"><span>获得</span><span>+'+p.c+' 🧱</span></div><div class="pr"><span>支付</span><span class="pp">¥'+p.p+'</span></div><div class="pr pro"><span>订单号</span><span class="poi">'+oid+'</span></div></div><div class="pq"><img src="../assets/alipay-qr.jpg" alt="收款码" class="pqi" onerror="this.style.display=\'none\'"><p class="pqh">📱 支付宝扫一扫</p><p class="pqs">付款后联系书记员确认发放。<br>订单号：'+oid+'</p></div><div class="pa"><button class="bc2">关闭</button></div></div>';
 ov.querySelector('.bc2').onclick=function(){ov.remove()};
 ov.querySelector('.px').onclick=function(){ov.remove()};
 ov.addEventListener('click',function(e){if(e.target===ov)ov.remove()});
 document.body.appendChild(ov);
}

// === 通灵 ===
function showSeance(){
 if(bal<20){toast('🧱 余额不足',2500);return}
 var ex=document.querySelector('.se');if(ex)ex.remove();
 var done=false;
 var ov=document.createElement('div');ov.className='se';
 ov.innerHTML='<div class="smd"><div class="sx">✕</div><div class="sh"><div class="si2">🕯</div><h3>档案馆通灵</h3><p>这里的光线很暗。你说的话，档案馆会听见。</p></div><div class="sw"><textarea class="stx" placeholder="你想对档案馆说什么..." rows="4"></textarea></div><div class="sr2" style="display:none"></div><div class="sa2"><button class="bsd">🕯 发送低语</button><button class="bcl">关闭</button></div></div>';
 ov.querySelector('.bcl').onclick=function(){ov.remove()};
 ov.querySelector('.sx').onclick=function(){ov.remove()};
 ov.querySelector('.bsd').onclick=function(){
  if(done)return;var inp=ov.querySelector('.stx');var t=inp.value.trim();
  if(!t){toast('请写下你想说的话...',2000);return}
  done=true;inp.disabled=true;if(bal>=20){bal-=20;sv();updateUI(false)}
  var rd=ov.querySelector('.sr2');var ac=ov.querySelector('.sa2');
  ac.innerHTML='<button class="bcl">关闭</button>';ac.querySelector('.bcl').onclick=function(){ov.remove()};
  var reply=getReply(t);rd.style.display='block';rd.innerHTML='';
  var i=0,ch=reply.split(''),ti=setInterval(function(){if(i<ch.length){rd.innerHTML+=ch[i]==='\n'?'<br>':ch[i];i++;rd.scrollTop=rd.scrollHeight}else{clearInterval(ti)}},30);
  var recs;try{recs=JSON.parse(localStorage.getItem('ms')||'[]')}catch(e){recs=[]}recs.push({text:t,reply:reply,time:new Date().toISOString()});localStorage.setItem('ms',JSON.stringify(recs.slice(-20)));
 };
 ov.addEventListener('click',function(e){if(e.target===ov)ov.remove()});
 document.body.appendChild(ov);setTimeout(function(){var ta=ov.querySelector('.stx');if(ta)ta.focus()},400);
}

function getReply(t){
 var kw=(t||'').replace(/[?？！!。，,、\s]/g,'').substring(0,8)||'这些';
 var an='#'+String(Math.floor(Math.random()*9000)+1000);
 var isQ=/[?？吗呢谁什么怎么为什么哪如何]/.test(t),isF=/怕|恐怖|吓|诡异|害怕|恐惧/.test(t),isP=/人|他|她|它|谁|东西|怪物|鬼|灵魂|幽灵|床底|柜子|身后|背后|角落/.test(t),isL=/地方|哪里|房间|楼|医院|学校|地铁|电梯|走廊|地下/.test(t);
 if(isF&&isP)return'烛火晃了一下。\n\n你说「'+kw+'」——这是档案馆在靠近。它在回应：它一直都在。从你搬进来的第一天起。你不需要害怕——它比你更害怕孤独。';
 if(isF&&isL)return'等等。你说了「'+kw+'」。\n\n档案管理员停下了手中的工作。这个词已经很久没人提起过了。\n\n但我可以告诉你一件事：那个地方仍然存在。地图上没有，导航找不到。但如果你在凌晨三点独自走过那条走廊——你会看见它的。不要回头。';
 if(isF)return'你问「'+kw+'」。有人曾在凌晨三点问过类似的问题。那人的档案至今存放在地下室B区。\n\n你想知道他现在在哪里吗？\n\n先告诉我：你确定你准备好了吗？';
 var rs=['它不是来伤害你的。它只是想让你知道它的存在。','档案馆里有17份关于类似存在的记录。没有一份能给出解释。','别试图和它说话。也别假装看不见它。保持安静，等天亮。','它曾经是个人。现在它只是一段记忆。但它不知道自己已经死了。'];
 var r=rs[Math.floor(Math.random()*rs.length)];
 if(isP||isL||isQ)return'关于「'+kw+'」——档案馆翻阅了相关档案。\n\n编号'+an+'的记录最后一行写道：\n\n"'+r+'"\n\n档案在此终止。';
 if(t.length<15)return'「'+kw+'」——档案馆很老了。比我们都老。\n\n它记得你第一次来这里时的恐惧。现在，它听到了你的声音。';
 return'档案馆收到了你关于「'+kw+'」的低语。\n\n在深夜的走廊里，这个回声被记录在第七档案架第三层编号'+(Math.floor(Math.random()*9000)+1000)+'。它不会消失，即使你离开这里。\n\n——档案馆，凌晨三点。';
}

// === 隐藏档案 ===
function showArchive(){
 if(bal<5){toast('🧱 余额不足',2500);return}
 var ex=document.querySelector('.ao');if(ex)ex.remove();
 var av=HA.filter(function(_,i){return revealed.indexOf(i)===-1});
 var pick=av.length?av[Math.floor(Math.random()*av.length)]:HA[Math.floor(Math.random()*HA.length)];
 if(av.length)revealed.push(HA.indexOf(pick));
 if(bal>=5){bal-=5;sv();updateUI(false)}
 var ov=document.createElement('div');ov.className='ao';
 ov.innerHTML='<div class="am"><div class="ax">✕</div><div class="ast">🔓 已解锁</div><div class="atr"><span class="ai2">📁</span><span class="ati">'+pick.t+'</span></div><div class="amt"><span>'+pick.g+'</span><span>'+pick.d+'</span></div><div class="ad"></div><div class="ac">'+pick.x+'</div><div class="aw">⚠ 此档案的真实性未经档案馆核实。请勿试图验证其内容。</div><button class="bac">我已阅读，关闭档案</button></div>';
 ov.querySelector('.bac').onclick=function(){ov.remove()};
 ov.querySelector('.ax').onclick=function(){ov.remove()};
 ov.addEventListener('click',function(e){if(e.target===ov)ov.remove()});
 document.body.appendChild(ov);
}

// === CSS ===
var _css=false;
function injCss(){if(_css)return;_css=true;
 var s=document.createElement('style');
 s.textContent='.rs{max-width:700px;margin:0 auto;padding:2rem 1rem}.bc{text-align:center;padding:2rem;background:linear-gradient(180deg,rgba(200,160,120,.08),rgba(200,160,120,.02));border:1px solid rgba(200,160,120,.12);border-radius:12px;margin-bottom:2.5rem}.bi{font-size:2.5rem;margin-bottom:.5rem}.ba{font-size:3rem;font-weight:700;color:#d4b88c;font-family:"JetBrains Mono",monospace}.bl{font-size:.85rem;color:rgba(200,160,120,.5);margin-top:.3rem}.bh{font-size:.7rem;color:rgba(200,160,120,.25);margin-top:.5rem;font-style:italic}.rt{font-size:1.1rem;color:rgba(200,160,120,.6);margin:2rem 0 1rem;padding-left:.5rem;border-left:2px solid rgba(200,160,120,.3)}.cp{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1rem;margin-bottom:2rem}.ci{background:rgba(200,160,120,.03);border:1px solid rgba(200,160,120,.08);border-radius:10px;padding:1.5rem 1rem;text-align:center;transition:all .3s}.ci:hover{border-color:rgba(200,160,120,.2);background:rgba(200,160,120,.06);transform:translateY(-2px)}.cii{font-size:2rem;margin-bottom:.5rem}.cin{font-size:1rem;font-weight:600;color:#d4b88c}.cic{font-size:1.5rem;font-weight:700;color:#c8a070;margin:.5rem 0}.cip{font-size:1.2rem;color:rgba(255,255,255,.7)}.cid{font-size:.75rem;color:rgba(200,160,120,.35);margin:0 0 1rem;font-style:italic}.br{padding:.5rem 1.5rem;background:transparent;border:1px solid rgba(200,160,120,.3);color:#c8a070;border-radius:6px;cursor:pointer;font-family:inherit;font-size:.85rem;transition:all .2s}.br:hover{background:rgba(200,160,120,.15);border-color:rgba(200,160,120,.5)}.si{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:2rem}@media(max-width:600px){.si{grid-template-columns:1fr}}.sm{background:rgba(200,160,120,.025);border:1px solid rgba(200,160,120,.06);border-radius:10px;padding:1.5rem;display:flex;flex-direction:column;gap:.6rem;transition:all .3s}.sm:hover{border-color:rgba(200,160,120,.15);background:rgba(200,160,120,.04)}.smi{font-size:2rem}.smn{font-size:1.1rem;color:#d4b88c;font-weight:600}.smc{font-size:.9rem;color:#c8a070;font-weight:600}.smd{font-size:.8rem;color:rgba(200,160,120,.35);line-height:1.5;flex:1}.bb{padding:.5rem 1.5rem;background:transparent;border:1px solid rgba(200,160,120,.2);color:#c8a070;border-radius:6px;cursor:pointer;font-family:inherit;font-size:.85rem;margin-top:auto;transition:all .2s}.bb:hover:not(:disabled){background:rgba(200,160,120,.15);border-color:rgba(200,160,120,.4)}.bb:disabled{opacity:.3;cursor:not-allowed}.rf{text-align:center;color:rgba(200,160,120,.2);font-size:.75rem;margin-top:2rem;line-height:1.8}.po,.se,.ao{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)}.pm,.smd,.am{background:#0a0a0f;border:1px solid rgba(200,160,120,.2);border-radius:14px;padding:2rem;max-width:440px;width:90%;max-height:85vh;overflow-y:auto;position:relative}.px,.sx,.ax{position:absolute;top:.8rem;right:.8rem;font-size:1.2rem;cursor:pointer;color:rgba(200,160,120,.4);width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:50%;transition:all .2s}.px:hover,.sx:hover,.ax:hover{background:rgba(200,160,120,.1);color:#d4b88c}.ph{text-align:center;margin-bottom:1.5rem}.pi,.si2{font-size:3rem;margin-bottom:.5rem}.ph h3{font-size:1.3rem;color:#d4b88c;margin:.5rem 0}.ph p{font-size:.85rem;color:rgba(200,160,120,.4)}.pd{margin:1rem 0}.pr{display:flex;justify-content:space-between;padding:.5rem 0;border-bottom:1px solid rgba(200,160,120,.06);font-size:.9rem}.pp{color:#d4b88c;font-weight:700}.pro .poi{font-size:.75rem;color:rgba(200,160,120,.3);font-family:monospace}.pq{text-align:center;margin:1.5rem 0}.pqi{max-width:200px;border-radius:10px;border:1px solid rgba(200,160,120,.1)}.pqh{font-size:.9rem;color:rgba(200,160,120,.6);margin:.5rem 0}.pqs{font-size:.8rem;color:rgba(200,160,120,.3);margin-top:.5rem}.pa{text-align:center;margin-top:1rem}.bc2,.bcl,.bac{padding:.5rem 1.5rem;background:transparent;border:1px solid rgba(200,160,120,.2);color:#c8a070;border-radius:6px;cursor:pointer;font-family:inherit;font-size:.85rem}.bc2:hover,.bcl:hover,.bac:hover{background:rgba(200,160,120,.1)}.sw{margin:1rem 0}.stx{width:100%;padding:.8rem;background:rgba(200,160,120,.04);border:1px solid rgba(200,160,120,.15);border-radius:8px;color:#d4b88c;font-family:inherit;font-size:.9rem;resize:vertical}.stx:focus{outline:none;border-color:rgba(200,160,120,.4)}.sr2{margin:1rem 0;padding:1rem;background:rgba(200,160,120,.03);border-radius:8px;color:rgba(200,160,120,.8);font-size:.9rem;line-height:1.7;max-height:200px;overflow-y:auto;white-space:pre-wrap}.sa2{text-align:center;display:flex;gap:.5rem;justify-content:center}.bsd{padding:.5rem 1.5rem;background:rgba(200,160,120,.1);border:1px solid rgba(200,160,120,.3);color:#d4b88c;border-radius:6px;cursor:pointer;font-family:inherit;font-size:.85rem}.bsd:hover{background:rgba(200,160,120,.2)}.ast{text-align:center;color:#ffd700;font-size:.85rem;margin-bottom:.5rem}.atr{display:flex;align-items:center;gap:.5rem;margin:.5rem 0}.ai2{font-size:1.5rem}.ati{font-size:1rem;color:#d4b88c;font-weight:600}.amt{display:flex;gap:1rem;font-size:.75rem;color:rgba(200,160,120,.3);margin:.3rem 0 1rem}.ad{height:1px;background:rgba(200,160,120,.1);margin:1rem 0}.ac{font-size:.9rem;color:rgba(200,160,120,.7);line-height:1.8;margin:1rem 0}.aw{font-size:.7rem;color:rgba(200,160,120,.2);margin:1rem 0;font-style:italic;text-align:center}.rtoast{position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:rgba(10,10,15,.9);border:1px solid rgba(200,160,120,.2);color:#d4b88c;padding:.6rem 1.5rem;border-radius:20px;font-size:.85rem;z-index:99999;transition:all .3s;pointer-events:none}.tc{display:inline-flex;align-items:center;gap:.3rem}.tci{font-size:1rem}.tcv{font-size:.9rem;color:#d4b88c;font-weight:600}';
 document.head.appendChild(s);
}

// === 主渲染 ===
function renderRecharge(cid){
 var c=document.getElementById(cid);if(!c)return;
 var ks=Object.keys(PKG);
 var cards='';
 for(var i=0;i<ks.length;i++){var k=ks[i];var p=PKG[k];cards+='<div class="ci"><div class="cii">'+p.i+'</div><div class="cin">'+p.n+'</div><div class="cic">+'+p.c+'🧱</div><div class="cip">¥'+p.p+'</div><div class="cid">'+p.d+'</div><button class="br" data-pkg="'+k+'">购买</button></div>';}
 c.innerHTML='<div class="rs"><div class="bc"><div class="bi">🧱</div><div class="ba" id="bbal">…</div><div class="bl">档案币</div><div class="bh">余额云端同步 · 10秒自动刷新</div></div><h3 class="rt">充值</h3><div class="cp">'+cards+'</div><h3 class="rt">档案服务</h3><div class="si"><div class="sm"><div class="smi">🕯</div><div class="smn">档案馆通灵</div><div class="smc">20 🧱</div><div class="smd">写下你想说的话，档案馆以它的身份与风格精准回应你。</div><button class="bb" data-i="seance"'+(bal>=20?'':' disabled')+'>'+(bal>=20?'开启通灵':'余额不足')+'</button></div><div class="sm"><div class="smi">📁</div><div class="smn">解锁随机隐藏档案</div><div class="smc">5 🧱</div><div class="smd">打开从未公开的档案。来自深网、废弃病历、绝密文件——真实度极高。</div><button class="bb" data-i="hidden_archive"'+(bal>=5?'':' disabled')+'>'+(bal>=5?'解锁档案':'余额不足')+'</button></div></div><div class="rf">档案币永不过期。充值仅用于支持档案馆运营。<br>扫码支付后联系书记员确认发放。</div></div>';
 c.querySelectorAll('.br').forEach(function(b){b.addEventListener('click',function(){showPay(this.getAttribute('data-pkg'))})});
 c.querySelectorAll('.bb').forEach(function(b){b.addEventListener('click',function(){var t=this.getAttribute('data-i');if(t==='seance')showSeance();else showArchive()})});
 injCss();
 syncBal();
 setInterval(syncBal,10000);
}

function renderTopbar(cid){
 var c=document.getElementById(cid);if(!c)return;
 c.innerHTML='<div class="tc" title="档案币余额" style="cursor:pointer"><span class="tci">🧱</span><span class="tcv">'+bal+'</span></div>';
}

window.MidnightRecharge={COIN_PACKAGES:PKG,getBalance:function(){return bal},renderRecharge:renderRecharge,renderTopbarCoin:renderTopbar,showToast:toast,syncBalance:syncBal};
console.log('[Archive] 充值系统 v20 | 余额',bal,'🧱 | 手动验证模式');
})();