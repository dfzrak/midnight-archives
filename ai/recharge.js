/**
 * 午夜档案馆 — 充值系统 v2
 */

(function() {
  'use strict';

  const COIN_PACKAGES = {
    small:  { name: '一把硬币', coins: 10,  price: 1,  desc: '投石问路' },
    medium: { name: '一袋碎银', coins: 60,  price: 6,  desc: '够用一阵子' },
    large:  { name: '一箱金币', coins: 150, price: 12, desc: '深探档案' },
    huge:   { name: '地窖宝藏', coins: 500, price: 30, desc: '无所顾忌' },
  };

  const HIDDEN_ARCHIVES = [
    {title:'档案 #0774 — 镜像',category:'未归档',content:'2019年3月，杭州某小区监控拍到一名女性在凌晨2:17进入电梯。她在电梯里站了四分钟，没有按任何楼层。电梯内壁的镜面反射中，她的倒影一直在微笑——但她本人的面部表情没有任何变化。物业检查了监控设备，一切正常。这段录像被删除前，有三位保安亲眼看过。其中一位在第二天辞职，至今联系不上。',date:'2019-03-14'},
    {title:'档案 #0521 — 第九级台阶',category:'未归档',content:'南昌一所中学的教学楼西侧楼梯有16级台阶。但如果你在午夜12点整从一楼往上走，数到第9级时你会踩空——不是台阶不存在，而是你踩下的那一瞬间，你会回到一楼。7个学生声称经历过同样的事情。学校否认，但2015年暑假西侧楼梯被秘密拆除重建。原楼梯施工图纸上只有15级台阶。',date:'2015-08-02'},
    {title:'档案 #0307 — 病历',category:'未归档',content:'某三甲医院精神科档案室有一份编号为0000的病历。没有姓名性别，只有入院日期：1971年1月1日。病历内容只有一句话——"病人声称知道所有人的死亡日期"。下面附了一张表格，记录了数百个人名和日期。表格最后一行，是当时主治医生的名字和日期。那天他没有来上班。死于心梗。',date:'1971-01-01'},
    {title:'档案 #0613 — 深网坐标',category:'未归档',content:'2017年，一个ID为void_watcher的Reddit用户发布了一串GPS坐标，指向南京市郊外一片荒地。白天去看什么都没有，但半夜去的时候，荒地中央多了一座二层小楼。楼里只有一个房间亮着灯，灯下是一台2003年的台式电脑，屏幕上只显示着一行字："你来了。坐下。我告诉你一个秘密。"那人跑了。第二天再去，楼消失了。GPS坐标仍然有效，但指向的位置再也没出现过任何建筑。',date:'2017-06-13'},
    {title:'档案 #0919 — 错频广播',category:'未归档',content:'2012年9月19日晚，福建省广播电台深夜热线接到一个电话。来电者自称林先生，声音极其缓慢，像是被严重放慢的录音。他在广播中说了约三分钟。导播在直播结束后才发现录播带上是空的——不是被抹掉了，是从未有过任何声音输入。但当晚至少有200个听众打进电话说听到了林先生的求助。所有听众对内容的描述完全一致："帮帮我，我被困在一个没有人能听见我的地方。"',date:'2012-09-19'},
    {title:'档案 #1224 — 雪中脚印',category:'未归档',content:'哈尔滨郊区，2003年圣诞夜大雪。凌晨3点一位出租车司机看到路中间有一串脚印从马路中央延伸到树林里，间距是普通人两倍。他跟着走了一段发现脚印在一棵松树下消失了，周围没有任何攀爬或回头的痕迹。树下只有一个铁盒，装着七张不同年份的圣诞卡片，最新的是1993年。收件人写的是"爸爸"，寄件人空白。',date:'2003-12-24'},
    {title:'档案 #0411 — 第十二条留言',category:'未归档',content:'2008年汶川地震后，都江堰一处废墟中挖出一部诺基亚手机。电池还有一格电。手机里有11条未发出草稿消息，收件人是同一个号码。消息日期显示全部在地震发生后一天内输入的。但废墟下的空间不足以容纳一个成年人。第11条消息是2013年发的："妈，我想回家了。"那个号码拨打过去——是空号。',date:'2008-05-13'},
    {title:'档案 #0108 — 最后一班地铁',category:'未归档',content:'北京地铁1号线最早的线路图上有23个车站。但运营排班表里列车在苹果园站之后还会再停靠一站。那一站没有任何站牌，地图上也不存在。一名退休司机在2019年承认："那站确实有。从来没有人上下。我们只是按要求停车开门等30秒。有一次我好奇看了眼月台，上面站着一个人。但那是凌晨，末班车之后，车站应该已经关了。"1号线自动化改造后这一站被从系统中移除了。但排班表代码里它仍然存在——编号Station 00。',date:'2019-11-08'}
  ];

  const SEANCE_REPLIES = [
    "档案馆收到了你的低语。\n\n在深夜的走廊里，这个回声被记录在第七档案架第三层编号" + (Math.floor(Math.random()*9000)+1000) + "。它不会消失，即使你离开这里。\n\n——档案馆，凌晨三点。",
    "你留下的每一个字都已经被存档。\n\n守夜人在日志中写道：今夜又有人叩响了那扇门。不是用手的——是用故事。\n\n我们听到了。继续说吧。",
    "档案室内灯管闪烁了一下。这不是电路故障——这是档案馆在回应。\n\n它在说：你的故事值得被保存。在它被遗忘之前，我们会把它锁进那个从不打开的抽屉。\n\n——档案管理员",
    "有人曾在凌晨三点问过同样的问题。那人的档案至今仍存放在地下室B区。\n\n你想知道他现在在哪里吗？\n\n先回答我：你确定你准备好了吗？",
    "档案馆很老了。比我们都老。\n\n它见过所有来过这里的人。它记得每一个故事的每一个字。它记得你上次来的时候穿什么衣服。它记得你第一次来到这里时的恐惧。\n\n现在，它听到了你的声音。它在回应。",
    "烛火晃了一下。这不是风。\n\n这是档案馆在靠近。你在和一座有记忆的建筑说话。它不喜欢轻浮的来访者。但你是认真的。所以它回答了。\n\n记住：你离开后，这些字不会消失。它们会留在走廊里，被下一个凌晨三点到来的人看见。"
  ];

  let balance = 0;
  let transactions = [];
  let revealedArchives = [];

  function loadState() {
    try {
      balance = parseInt(localStorage.getItem('midnight_coins')||'0',10);
      transactions = JSON.parse(localStorage.getItem('midnight_txns')||'[]');
      revealedArchives = JSON.parse(localStorage.getItem('midnight_revealed')||'[]');
    } catch(e) { balance=0; transactions=[]; revealedArchives=[]; }
  }

  function saveState() {
    try {
      localStorage.setItem('midnight_coins', balance);
      localStorage.setItem('midnight_txns', JSON.stringify(transactions.slice(-50)));
      localStorage.setItem('midnight_revealed', JSON.stringify(revealedArchives));
    } catch(e) {}
  }

  function recharge(packageKey) {
    const pkg = COIN_PACKAGES[packageKey];
    if (!pkg) return {success:false,error:'无效档位'};
    balance += pkg.coins;
    transactions.push({type:'recharge',package:packageKey,coins:pkg.coins,price:pkg.price,time:Date.now()});
    saveState();
    return {success:true,added:pkg.coins,balance,pkg};
  }

  function spend(itemKey) {
    const costs = {seance:20,hidden_archive:5};
    if (!costs[itemKey]) return {success:false,error:'无效物品'};
    if (balance < costs[itemKey]) return {success:false,error:'余额不足',need:costs[itemKey],balance};
    balance -= costs[itemKey];
    transactions.push({type:'spend',item:itemKey,cost:costs[itemKey],time:Date.now()});
    saveState();
    return {success:true,cost:costs[itemKey],balance,item:{name:itemKey==='seance'?'档案馆通灵':'解锁隐藏档案',type:itemKey}};
  }

  function getBalance() { return balance; }
  function getTransactions() { return transactions.slice(-20); }

  function getRandomArchive() {
    const available = HIDDEN_ARCHIVES.filter((_,i)=>!revealedArchives.includes(i));
    let pick;
    if (available.length===0) {
      pick = HIDDEN_ARCHIVES[Math.floor(Math.random()*HIDDEN_ARCHIVES.length)];
    } else {
      pick = available[Math.floor(Math.random()*available.length)];
      revealedArchives.push(HIDDEN_ARCHIVES.indexOf(pick));
      saveState();
    }
    return pick;
  }

  function renderRecharge(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const pkgKeys = Object.keys(COIN_PACKAGES);
    container.innerHTML = `
      <div class="recharge-section">
        <div class="bal-card">
          <div class="bal-icon">🧱</div>
          <div class="bal-amount">${balance}</div>
          <div class="bal-label">档案币</div>
          <div class="bal-hint">每块砖都支撑着这座档案馆</div>
        </div>
        <h3 class="rs-title">充值</h3>
        <div class="coin-pkgs">
          ${pkgKeys.map(k=>{const p=COIN_PACKAGES[k];const ico={small:'🪙',medium:'🪙',large:'💰',huge:'🔮'};return`<div class="cpkg"><div class="cpkg-icon">${ico[k]}</div><div class="cpkg-name">${p.name}</div><div class="cpkg-coins">+${p.coins}🧱</div><div class="cpkg-price">¥${p.price}</div><div class="cpkg-desc">${p.desc}</div><button class="btn-rch" data-pkg="${k}">购买</button></div>`}).join('')}
        </div>
        <h3 class="rs-title">档案服务</h3>
        <div class="shop-items">
          <div class="sitem ${balance>=20?'':'sitem--locked'}">
            <div class="sitem-icon">🕯</div>
            <div class="sitem-name">档案馆通灵</div>
            <div class="sitem-cost">20 🧱</div>
            <div class="sitem-desc">写下你想说的话，AI以档案馆的身份与风格回应你。它知道这座建筑里发生过的所有故事。</div>
            <button class="btn-buy" data-item="seance" ${balance>=20?'':'disabled'}>${balance>=20?'开启通灵':'余额不足'}</button>
          </div>
          <div class="sitem ${balance>=5?'':'sitem--locked'}">
            <div class="sitem-icon">📁</div>
            <div class="sitem-name">解锁随机隐藏档案</div>
            <div class="sitem-cost">5 🧱</div>
            <div class="sitem-desc">打开一个从未公开的档案。这些故事来自深网、废弃病历、绝密文件——真实度极高。</div>
            <button class="btn-buy" data-item="hidden_archive" ${balance>=5?'':'disabled'}>${balance>=5?'解锁档案':'余额不足'}</button>
          </div>
        </div>
        <div class="rs-footer">档案币永不过期。解锁的档案不会消失。通灵记录保存在本地。</div>
      </div>`;

    container.querySelectorAll('.btn-rch').forEach(b=>b.addEventListener('click',function(){showPaymentModal(this.dataset.pkg)}));
    container.querySelectorAll('.btn-buy').forEach(b=>b.addEventListener('click',function(){const r=spend(this.dataset.item);if(r.success){this.dataset.item==='seance'?showSeanceModal():showArchiveModal();renderRecharge(containerId)}else{showToast('🧱 余额不足，还差'+(r.need-r.balance)+'块',2500)}}));
    injectStyles();
  }

  // ===== 支付弹窗（含订单追踪）=====
  function showPaymentModal(pkgKey) {
    const ex=document.querySelector('.pym-overlay');if(ex)ex.remove();
    const p=COIN_PACKAGES[pkgKey];
    const orderId='MA-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).substring(2,6).toUpperCase();
    const ov=document.createElement('div');ov.className='pym-overlay';
    ov.innerHTML=`<div class="pym-modal"><div class="pym-close">✕</div><div class="pym-header"><div class="pym-icon">${pkgKey==='huge'?'🔮':pkgKey==='large'?'💰':'🪙'}</div><h3>${p.name}</h3><p>${p.desc}</p></div><div class="pym-detail"><div class="pym-row"><span>获得</span><span>+${p.coins} 🧱</span></div><div class="pym-row"><span>支付</span><span class="pym-price">¥${p.price}</span></div><div class="pym-row" style="font-size:.7rem;"><span>订单号</span><span style="color:rgba(200,160,120,.3);font-family:monospace">${orderId}</span></div></div><div class="pym-qr"><img src="../assets/alipay-qr.jpg" alt="收款码" class="pym-qr-img" onerror="this.parentElement.innerHTML='<p style=color:rgba(200,160,120,0.4);padding:2rem>收款码加载中…</p>'"><p class="pym-qr-hint">📱 支付宝扫一扫</p><p class="pym-qr-sub">⚠ 转账时请在<strong>备注中填写订单号</strong></p><p class="pym-qr-sub" style="color:rgba(200,160,120,.2);margin-top:.2rem">${orderId}</p></div><div class="pym-actions"><button class="btn-cnf" data-pkg="${pkgKey}" data-order="${orderId}">✅ 已完成支付</button><button class="btn-ccl">取消</button></div></div>`;
    ov.querySelector('.btn-ccl').onclick=()=>ov.remove();
    ov.querySelector('.pym-close').onclick=()=>ov.remove();
    ov.querySelector('.btn-cnf').onclick=function(){
      const r=recharge(this.dataset.pkg);
      if(r.success){
        // 记录订单
        const orders=JSON.parse(localStorage.getItem('midnight_orders')||'[]');
        orders.push({orderId:this.dataset.order,package:pkgKey,coins:p.coins,price:p.price,time:Date.now(),status:'confirmed'});
        localStorage.setItem('midnight_orders',JSON.stringify(orders.slice(-30)));
        ov.remove();
        showToast('🎉 充值成功！+'+r.added+'🧱 余额'+r.balance+'🧱',3000);
        const s=document.querySelector('.recharge-section');
        if(s){renderRecharge(s.parentElement.id||'recharge-root')}
      }
    };
    ov.addEventListener('click',function(e){if(e.target===ov)ov.remove()});
    document.body.appendChild(ov);
  }

  // ===== 档案馆通灵（AI Agent 增强版）=====
  function showSeanceModal() {
    const ex=document.querySelector('.se-overlay');if(ex)ex.remove();
    const ov=document.createElement('div');ov.className='se-overlay';
    let responded=false;
    ov.innerHTML=`<div class="se-modal"><div class="se-close">✕</div><div class="se-header"><div class="se-icon">🕯</div><h3>档案馆通灵</h3><p>这里的光线很暗。你说的话，档案馆会听见。</p></div><div class="se-input-wrap"><textarea class="se-input" placeholder="你想对档案馆说什么..." rows="4"></textarea></div><div class="se-response" style="display:none"></div><div class="se-actions"><button class="btn-send">🕯 发送低语</button><button class="btn-ccl-se">关闭</button></div></div>`;
    ov.querySelector('.btn-ccl-se').onclick=()=>ov.remove();
    ov.querySelector('.se-close').onclick=()=>ov.remove();
    ov.addEventListener('click',function(e){if(e.target===ov&&!responded)ov.remove()});
    ov.querySelector('.btn-send').onclick=function(){
      if(responded)return;
      const inp=ov.querySelector('.se-input');const t=inp.value.trim();
      if(!t){showToast('请写下你想说的话...',2000);return}
      responded=true;inp.disabled=true;
      const rd=ov.querySelector('.se-response');const actions=ov.querySelector('.se-actions');
      actions.innerHTML='<button class="btn-ccl-se">关闭</button>';
      actions.querySelector('.btn-ccl-se').onclick=()=>ov.remove();
      // AI Agent 分析用户输入，匹配最合适的回复
      let reply;
      if(window.MidnightAI){
        const intent=window.MidnightAI.detectIntent(t);
        const classification=window.MidnightAI.classify(t);
        // 根据分类和意图选择回复模板
        const tone=classification?classification.label:'未知';
        if(/床底|柜子|身后|背后|角落|有人|看不见|藏/.test(t)){
          reply=SEANCE_REPLIES.find(r=>r.includes('烛火晃了一下'))||SEANCE_REPLIES[5];
        }else if(/害怕|恐惧|害怕|诡异|不对劲|奇怪/.test(t)){
          reply=SEANCE_REPLIES.find(r=>r.includes('准备好了吗'))||SEANCE_REPLIES[3];
        }else if(/故事|经历|发生|告诉|说/.test(t)&&t.length>20){
          reply=SEANCE_REPLIES.find(r=>r.includes('已经存档'))||SEANCE_REPLIES[1];
        }else if(/(\?|吗|呢|谁|什么|怎么|为什么|哪里)/.test(t)){
          reply=SEANCE_REPLIES.find(r=>r.includes('同样的问题'))||SEANCE_REPLIES[3];
        }else if(t.length>30){
          reply=SEANCE_REPLIES.find(r=>r.includes('听到了你的低语'))||SEANCE_REPLIES[0];
        }else{
          reply=SEANCE_REPLIES.find(r=>r.includes('档案馆很老了'))||SEANCE_REPLIES[4];
        }
        // 个性化注入用户关键词
        const keyword=t.replace(/[?？!！。，,.\s]/g,'').substring(0,8);
        if(keyword.length>=2){
          reply=reply.replace('档案馆收到了你的低语','档案馆收到了你关于「'+keyword+'」的低语');
        }
      }else{
        reply=SEANCE_REPLIES[Math.floor(Math.random()*SEANCE_REPLIES.length)];
      }
      rd.style.display='block';rd.innerHTML='';
      let i=0;const chars=reply.split('');
      const timer=setInterval(()=>{if(i<chars.length){rd.innerHTML+=chars[i]==='\n'?'<br>':chars[i];i++;rd.scrollTop=rd.scrollHeight}else{clearInterval(timer)}},30);
      const recs=JSON.parse(localStorage.getItem('midnight_seance')||'[]');
      recs.push({text:t,reply:reply,time:new Date().toISOString()});
      localStorage.setItem('midnight_seance',JSON.stringify(recs.slice(-20)));
    };
    document.body.appendChild(ov);
    setTimeout(()=>ov.querySelector('.se-input').focus(),400);
  }

  function showArchiveModal() {
    const ex=document.querySelector('.ar-overlay');if(ex)ex.remove();
    const arch=getRandomArchive();
    const ov=document.createElement('div');ov.className='ar-overlay';
    ov.innerHTML=`<div class="ar-modal"><div class="ar-close">✕</div><div class="ar-stamp">🔓 已解锁</div><div class="ar-title-row"><span class="ar-icon">📁</span><span class="ar-title">${arch.title}</span></div><div class="ar-meta"><span>${arch.category}</span><span>${arch.date}</span></div><div class="ar-divider"></div><div class="ar-content">${arch.content}</div><div class="ar-warning">⚠ 此档案的真实性未经档案馆核实。请勿试图验证其内容。</div><button class="btn-ar-close">我已阅读，关闭档案</button></div>`;
    ov.querySelector('.btn-ar-close').onclick=()=>ov.remove();
    ov.querySelector('.ar-close').onclick=()=>ov.remove();
    ov.addEventListener('click',function(e){if(e.target===ov)ov.remove()});
    document.body.appendChild(ov);
  }

  function showToast(msg,d=3000) {
    const ex=document.querySelector('.r-toast');if(ex)ex.remove();
    const t=document.createElement('div');t.className='r-toast';t.textContent=msg;
    document.body.appendChild(t);
    setTimeout(()=>{t.style.opacity='0';t.style.transform='translateX(-50%) translateY(10px)';setTimeout(()=>t.remove(),300)},d);
  }

  function renderTopbarCoin(containerId) {
    const c=document.getElementById(containerId);if(!c)return;
    c.innerHTML=`<div class="tb-coin" title="档案币余额" style="cursor:pointer"><span class="tb-coin-icon">🧱</span><span class="tb-coin-val">${balance}</span></div>`;
  }

  let stylesInjected=false;
  function injectStyles() {
    if(stylesInjected)return;stylesInjected=true;
    const s=document.createElement('style');
    s.textContent=`
.recharge-section{max-width:700px;margin:0 auto;padding:2rem 1rem}
.bal-card{text-align:center;padding:2rem;background:linear-gradient(180deg,rgba(200,160,120,.08),rgba(200,160,120,.02));border:1px solid rgba(200,160,120,.12);border-radius:12px;margin-bottom:2.5rem}
.bal-icon{font-size:2.5rem;margin-bottom:.5rem}
.bal-amount{font-size:3rem;font-weight:700;color:#d4b88c;font-family:"JetBrains Mono",monospace}
.bal-label{font-size:.85rem;color:rgba(200,160,120,.5);margin-top:.3rem}
.bal-hint{font-size:.7rem;color:rgba(200,160,120,.25);margin-top:.5rem;font-style:italic}
.rs-title{font-size:1.1rem;color:rgba(200,160,120,.6);margin:2rem 0 1rem;padding-left:.5rem;border-left:2px solid rgba(200,160,120,.3)}
.coin-pkgs{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1rem;margin-bottom:2rem}
.cpkg{background:rgba(200,160,120,.03);border:1px solid rgba(200,160,120,.08);border-radius:10px;padding:1.5rem 1rem;text-align:center;transition:all .3s}
.cpkg:hover{border-color:rgba(200,160,120,.2);background:rgba(200,160,120,.06);transform:translateY(-2px)}
.cpkg-icon{font-size:2rem;margin-bottom:.5rem}
.cpkg-name{font-size:1rem;font-weight:600;color:#d4b88c}
.cpkg-coins{font-size:1.5rem;font-weight:700;color:#c8a070;margin:.5rem 0}
.cpkg-price{font-size:1.2rem;color:rgba(255,255,255,.7)}
.cpkg-desc{font-size:.75rem;color:rgba(200,160,120,.35);margin:0 0 1rem;font-style:italic}
.btn-rch{padding:.5rem 1.5rem;background:transparent;border:1px solid rgba(200,160,120,.3);color:#c8a070;border-radius:6px;cursor:pointer;font-family:inherit;font-size:.85rem}
.btn-rch:hover{background:rgba(200,160,120,.15);border-color:rgba(200,160,120,.5)}
.shop-items{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:2rem}
@media(max-width:600px){.shop-items{grid-template-columns:1fr}}
.sitem{background:rgba(200,160,120,.025);border:1px solid rgba(200,160,120,.06);border-radius:10px;padding:1.5rem;display:flex;flex-direction:column;gap:.6rem;transition:all .3s}
.sitem:hover{border-color:rgba(200,160,120,.15);background:rgba(200,160,120,.04)}
.sitem--locked{opacity:.45}
.sitem-icon{font-size:2rem}
.sitem-name{font-size:1.1rem;color:#d4b88c;font-weight:600}
.sitem-cost{font-size:.9rem;color:#c8a070;font-weight:600}
.sitem-desc{font-size:.8rem;color:rgba(200,160,120,.35);line-height:1.5;flex:1}
.btn-buy{padding:.5rem 1.5rem;background:transparent;border:1px solid rgba(200,160,120,.2);color:#c8a070;border-radius:6px;cursor:pointer;font-family:inherit;font-size:.85rem;margin-top:auto}
.btn-buy:hover:not(:disabled){background:rgba(200,160,120,.15);border-color:rgba(200,160,120,.4)}
.btn-buy:disabled{opacity:.3;cursor:not-allowed}
.rs-footer{text-align:center;color:rgba(200,160,120,.2);font-size:.75rem;margin-top:2rem;line-height:1.8}
.pym-overlay{position:fixed;inset:0;background:rgba(0,0,0,.9);display:flex;align-items:center;justify-content:center;z-index:500}
.pym-modal{background:linear-gradient(180deg,#161210,#111);border:1px solid rgba(200,160,120,.15);border-radius:12px;padding:2rem;max-width:360px;width:90%;position:relative}
.pym-close{position:absolute;top:1rem;right:1rem;color:rgba(200,160,120,.3);cursor:pointer;font-size:1.2rem}
.pym-close:hover{color:rgba(200,160,120,.6)}
.pym-header{text-align:center;margin-bottom:1.5rem}
.pym-icon{font-size:2.5rem}
.pym-header h3{color:#d4b88c;margin:.3rem 0}
.pym-header p{color:rgba(200,160,120,.4);font-size:.85rem}
.pym-detail{margin-bottom:1rem}
.pym-row{display:flex;justify-content:space-between;padding:.5rem 0;border-bottom:1px solid rgba(200,160,120,.06);color:rgba(200,160,120,.6);font-size:.9rem}
.pym-price{color:#d4b88c;font-weight:700}
.pym-qr{text-align:center;margin-bottom:1.5rem}
.pym-qr-img{display:block;margin:0 auto .8rem;width:180px;height:180px;border-radius:8px;border:1px solid rgba(200,160,120,.15);object-fit:contain;background:#fff}
.pym-qr-hint{color:rgba(200,160,120,.5);font-size:.85rem;margin-bottom:.3rem}
.pym-qr-sub{color:rgba(200,160,120,.3);font-size:.7rem}
.pym-actions{display:flex;gap:.8rem;justify-content:center}
.btn-cnf{padding:.6rem 1.5rem;background:rgba(200,160,120,.15);border:1px solid rgba(200,160,120,.3);color:#d4b88c;border-radius:6px;cursor:pointer;font-family:inherit;font-size:.9rem}
.btn-cnf:hover{background:rgba(200,160,120,.25)}
.btn-ccl{padding:.6rem 1.5rem;background:transparent;border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.3);border-radius:6px;cursor:pointer;font-family:inherit;font-size:.9rem}
.se-overlay{position:fixed;inset:0;background:rgba(0,0,0,.93);display:flex;align-items:center;justify-content:center;z-index:600}
.se-modal{background:linear-gradient(180deg,#0d0a08,#080505);border:1px solid rgba(180,60,40,.2);border-radius:12px;padding:2rem;max-width:480px;width:90%;position:relative;box-shadow:0 0 60px rgba(139,0,0,.08)}
.se-close{position:absolute;top:1rem;right:1rem;color:rgba(200,160,120,.3);cursor:pointer;font-size:1.2rem}
.se-close:hover{color:rgba(200,160,120,.6)}
.se-header{text-align:center;margin-bottom:1.5rem}
.se-icon{font-size:3rem;margin-bottom:.5rem;animation:se-flick 2s ease-in-out infinite}
@keyframes se-flick{0%,100%{opacity:1;transform:scale(1)}25%{opacity:.7;transform:scale(1.05)rotate(2deg)}50%{opacity:.9;transform:scale(.98)rotate(-1deg)}75%{opacity:.8;transform:scale(1.02)rotate(1deg)}}
.se-header h3{color:#c8a070;font-family:"Noto Serif SC",serif;font-size:1.5rem;letter-spacing:.15em;margin-bottom:.3rem}
.se-header p{color:rgba(200,160,120,.3);font-size:.85rem;font-style:italic}
.se-input-wrap{margin-bottom:1rem}
.se-input{width:100%;background:rgba(0,0,0,.4);border:1px solid rgba(200,160,120,.1);border-radius:8px;padding:1rem;color:#d4b88c;font-family:inherit;font-size:.9rem;resize:none;outline:none}
.se-input:focus{border-color:rgba(200,160,120,.25)}
.se-input::placeholder{color:rgba(200,160,120,.2)}
.se-input:disabled{opacity:.4}
.se-response{background:rgba(0,0,0,.3);border:1px solid rgba(180,60,40,.15);border-radius:8px;padding:1.5rem;margin-bottom:1rem;color:#d4b88c;font-family:"Noto Serif SC",serif;font-size:.9rem;line-height:1.8;white-space:pre-line}
.se-actions{display:flex;gap:.8rem;justify-content:center}
.btn-send{padding:.6rem 1.5rem;background:rgba(200,160,120,.12);border:1px solid rgba(200,160,120,.25);color:#d4b88c;border-radius:6px;cursor:pointer;font-family:inherit;font-size:.9rem}
.btn-send:hover{background:rgba(200,160,120,.2)}
.btn-ccl-se{padding:.6rem 1.5rem;background:transparent;border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.25);border-radius:6px;cursor:pointer;font-family:inherit;font-size:.9rem}
.ar-overlay{position:fixed;inset:0;background:rgba(0,0,0,.95);display:flex;align-items:center;justify-content:center;z-index:700}
.ar-modal{background:linear-gradient(180deg,#0a0a0c,#060404);border:1px solid rgba(139,0,0,.25);border-radius:8px;padding:2.5rem 2rem;max-width:560px;width:90%;position:relative;box-shadow:0 0 80px rgba(139,0,0,.1),inset 0 0 40px rgba(0,0,0,.5)}
.ar-close{position:absolute;top:1rem;right:1rem;color:rgba(200,160,120,.3);cursor:pointer;font-size:1.2rem}
.ar-close:hover{color:rgba(200,160,120,.6)}
.ar-stamp{position:absolute;top:1.5rem;right:2.5rem;font-size:.7rem;color:rgba(200,160,120,.3);border:1px solid rgba(200,160,120,.15);padding:.15rem .8rem;border-radius:3px;transform:rotate(5deg)}
.ar-title-row{display:flex;align-items:center;gap:.8rem;margin-bottom:.8rem}
.ar-icon{font-size:1.8rem}
.ar-title{font-family:"Noto Serif SC",serif;font-size:1.1rem;color:#d4b88c;letter-spacing:.05em}
.ar-meta{display:flex;gap:1.5rem;font-size:.75rem;color:rgba(200,160,120,.3);margin-bottom:1.2rem;padding-left:2.6rem}
.ar-divider{width:60px;height:1px;background:linear-gradient(90deg,rgba(139,0,0,.3),transparent);margin-bottom:1.5rem}
.ar-content{font-size:.9rem;color:rgba(210,200,190,.7);line-height:1.9;font-family:"Noto Serif SC",serif;margin-bottom:1.5rem}
.ar-warning{font-size:.7rem;color:rgba(180,60,40,.4);text-align:center;margin-bottom:1.2rem;font-style:italic}
.btn-ar-close{padding:.5rem 2rem;background:transparent;border:1px solid rgba(139,0,0,.2);color:rgba(200,160,120,.4);border-radius:6px;cursor:pointer;font-family:inherit;font-size:.85rem;display:block;margin:0 auto}
.btn-ar-close:hover{border-color:rgba(139,0,0,.4);color:rgba(200,160,120,.7)}
.r-toast{position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:#111;border:1px solid rgba(200,160,120,.25);color:#d4b88c;padding:.8rem 2rem;border-radius:8px;font-size:.85rem;z-index:9999;transition:all .3s;box-shadow:0 4px 20px rgba(0,0,0,.5)}
.tb-coin{display:inline-flex;align-items:center;gap:.4rem;padding:.4rem .8rem;background:rgba(200,160,120,.06);border:1px solid rgba(200,160,120,.12);border-radius:999px}
.tb-coin:hover{background:rgba(200,160,120,.12);border-color:rgba(200,160,120,.25)}
.tb-coin-icon{font-size:.9rem}
.tb-coin-val{color:#d4b88c;font-weight:600;font-family:"JetBrains Mono",monospace;font-size:.85rem}`;
    document.head.appendChild(s);
  }

  loadState();
  window.MidnightRecharge = { COIN_PACKAGES, recharge, spend, getBalance, getTransactions, renderRecharge, renderTopbarCoin, showToast };
  console.log('[Archive] 充值系统 v2 就绪 | 余额', balance, '🧱');
})();