/**
 * 午夜档案馆 — 充值系统 v1
 * 
 * 核心理念：档案馆币是这里的通行货币。
 * 充值获得「档案币」🧱 ，用币解锁深度体验。
 * 不做强制付费墙，不弹窗拦截——你需要的时候自然会来。
 */

(function() {
  'use strict';

  // ===== 代币体系 =====
  const COIN_PACKAGES = {
    small:  { name: '一把硬币',   coins: 10,   price: 1,    desc: '投石问路' },
    medium: { name: '一袋碎银',   coins: 60,   price: 6,    desc: '够用一阵子' },
    large:  { name: '一箱金币',   coins: 150,  price: 12,   desc: '深探档案' },
    huge:   { name: '地窖宝藏',   coins: 500,  price: 30,   desc: '无所顾忌' },
  };

  const ITEMS = {
    ai_polish:      { name: 'AI 深度润色',      cost: 1,  desc: '让故事更抓人' },
    ai_title:       { name: 'AI 生成标题',       cost: 1,  desc: '自动拟题' },
    video_script:   { name: '视频脚本生成',       cost: 3,  desc: '生成抖音脚本 + 分镜' },
    spotlight:      { name: '首页聚光灯',        cost: 10, desc: '你的故事在首页置顶24小时' },
    seance:         { name: '档案馆通灵',        cost: 20, desc: 'AI 以档案馆身份回复你的故事' },
    unlock_archive: { name: '解锁隐藏档案',       cost: 5,  desc: '打开一个被封存的秘密档案' },
  };

  // ===== 状态管理 =====
  let balance = 0;
  let transactions = [];

  function loadState() {
    try {
      balance = parseInt(localStorage.getItem('midnight_coins') || '0', 10);
      transactions = JSON.parse(localStorage.getItem('midnight_txns') || '[]');
    } catch(e) {
      balance = 0;
      transactions = [];
    }
  }

  function saveState() {
    try {
      localStorage.setItem('midnight_coins', balance);
      localStorage.setItem('midnight_txns', JSON.stringify(transactions.slice(-50)));
    } catch(e) {}
  }

  // ===== 充值 =====
  function recharge(packageKey) {
    const pkg = COIN_PACKAGES[packageKey];
    if (!pkg) return { success: false, error: '无效档位' };

    balance += pkg.coins;
    transactions.push({
      type: 'recharge',
      package: packageKey,
      coins: pkg.coins,
      price: pkg.price,
      time: Date.now(),
    });
    saveState();

    return {
      success: true,
      added: pkg.coins,
      balance,
      package: pkg,
    };
  }

  // ===== 消费 =====
  function spend(itemKey) {
    const item = ITEMS[itemKey];
    if (!item) return { success: false, error: '无效物品' };
    if (balance < item.cost) return { success: false, error: '余额不足', need: item.cost, balance };

    balance -= item.cost;
    transactions.push({
      type: 'spend',
      item: itemKey,
      cost: item.cost,
      time: Date.now(),
    });
    saveState();

    return {
      success: true,
      cost: item.cost,
      balance,
      item,
    };
  }

  // ===== 查询 =====
  function getBalance() { return balance; }
  function canAfford(itemKey) { return ITEMS[itemKey] && balance >= ITEMS[itemKey].cost; }
  function getTransactions() { return transactions.slice(-20); }

  // ===== 渲染充值页面（独立页风格） =====
  function renderRecharge(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const pkgKeys = Object.keys(COIN_PACKAGES);
    const itemKeys = Object.keys(ITEMS);

    container.innerHTML = `
      <div class="recharge-section">
        <!-- 余额卡片 -->
        <div class="balance-card">
          <div class="balance-icon">🧱</div>
          <div class="balance-amount">${balance}</div>
          <div class="balance-label">档案币</div>
          <div class="balance-hint">每块砖都支撑着这座档案馆</div>
        </div>

        <!-- 充值 -->
        <h3 class="recharge-subtitle">充值</h3>
        <div class="coin-packages">
          ${pkgKeys.map(k => {
            const pkg = COIN_PACKAGES[k];
            return `
              <div class="coin-pkg" data-pkg="${k}">
                <div class="coin-pkg__icon">${k === 'huge' ? '🔮' : k === 'large' ? '💰' : k === 'medium' ? '🪙' : '🪙'}</div>
                <div class="coin-pkg__name">${pkg.name}</div>
                <div class="coin-pkg__coins">+${pkg.coins} 🧱</div>
                <div class="coin-pkg__price">¥${pkg.price}</div>
                <div class="coin-pkg__desc">${pkg.desc}</div>
                <button class="btn-recharge" data-pkg="${k}">购买</button>
              </div>
            `;
          }).join('')}
        </div>

        <!-- 商店 -->
        <h3 class="recharge-subtitle">档案商店</h3>
        <div class="shop-items">
          ${itemKeys.map(k => {
            const item = ITEMS[k];
            const afford = balance >= item.cost;
            return `
              <div class="shop-item ${afford ? '' : 'shop-item--locked'}">
                <div class="shop-item__name">${item.name}</div>
                <div class="shop-item__cost">${item.cost} 🧱</div>
                <div class="shop-item__desc">${item.desc}</div>
                <button class="btn-buy" data-item="${k}" ${afford ? '' : 'disabled'}>
                  ${afford ? '使用' : '余额不足'}
                </button>
              </div>
            `;
          }).join('')}
        </div>

        <div class="recharge-footer">
          档案币永不过期。充值仅用于支持档案馆运营。<br>
          付费不是门槛，是选择。
        </div>
      </div>
    `;

    // 绑定充值事件
    container.querySelectorAll('.btn-recharge').forEach(btn => {
      btn.addEventListener('click', function() {
        const pkgKey = this.dataset.pkg;
        const pkg = COIN_PACKAGES[pkgKey];
        // 显示支付确认
        showPaymentModal(pkgKey, pkg);
      });
    });

    // 绑定购买事件
    container.querySelectorAll('.btn-buy').forEach(btn => {
      btn.addEventListener('click', function() {
        const itemKey = this.dataset.item;
        const result = spend(itemKey);
        if (result.success) {
          showToast(`✅ 已使用「${result.item.name}」· 余额 ${result.balance} 🧱`, 2500);
          renderRecharge(containerId); // 刷新
        } else {
          showToast(`🧱 余额不足 · 还差 ${result.need - result.balance} 块`, 2500);
        }
      });
    });

    injectStyles();
  }

  // ===== 支付确认弹窗 =====
  function showPaymentModal(pkgKey, pkg) {
    const existing = document.querySelector('.payment-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'payment-overlay';
    overlay.innerHTML = `
      <div class="payment-modal">
        <div class="payment-header">
          <div class="payment-icon">${pkgKey === 'huge' ? '🔮' : pkgKey === 'large' ? '💰' : '🪙'}</div>
          <h3>${pkg.name}</h3>
          <p>${pkg.desc}</p>
        </div>
        <div class="payment-detail">
          <div class="payment-row"><span>获得档案币</span><span>${pkg.coins} 🧱</span></div>
          <div class="payment-row"><span>支付金额</span><span class="payment-price">¥${pkg.price}</span></div>
        </div>
        <div class="payment-qr-hint">
          <div class="qr-placeholder">
            <pre>
┌─────────────────┐
│                 │
│    📱 扫码支付    │
│                 │
│  微信 / 支付宝   │
│                 │
│   ¥${String(pkg.price).padStart(4, ' ')}         │
│                 │
└─────────────────┘
            </pre>
          </div>
          <p class="payment-qr-sub">支付完成后点击下方按钮确认</p>
        </div>
        <div class="payment-actions">
          <button class="btn-confirm-pay" data-pkg="${pkgKey}">✅ 已完成支付</button>
          <button class="btn-cancel-pay">取消</button>
        </div>
      </div>
    `;

    overlay.querySelector('.btn-cancel-pay').onclick = () => overlay.remove();
    overlay.querySelector('.btn-confirm-pay').onclick = function() {
      const result = recharge(this.dataset.pkg);
      if (result.success) {
        overlay.remove();
        showToast(`🎉 充值成功！+${result.added} 🧱 · 余额 ${result.balance} 🧱`, 3000);
        // 刷新充值页面
        const section = document.querySelector('.recharge-section');
        if (section) {
          const parent = section.parentElement;
          if (parent) renderRecharge(parent.id || 'recharge-root');
        }
      }
    };
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);
  }

  // ===== Toast 轻提示 =====
  function showToast(msg, duration = 3000) {
    const existing = document.querySelector('.recharge-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'recharge-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ===== 顶部余额显示（供 forum 导航栏用） =====
  function renderTopbarCoin(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="topbar-coin-display" id="topbar-coin" title="档案币余额">
        <span class="coin-icon">🧱</span>
        <span class="coin-balance">${balance}</span>
      </div>
    `;
  }

  function refreshTopbarCoin() {
    const display = document.getElementById('topbar-coin');
    if (display) {
      const balSpan = display.querySelector('.coin-balance');
      if (balSpan) balSpan.textContent = balance;
    }
  }

  // ===== 样式注入 =====
  let stylesInjected = false;
  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;

    const style = document.createElement('style');
    style.textContent = `
      .recharge-section {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem 1rem;
      }

      /* 余额卡片 */
      .balance-card {
        text-align: center;
        padding: 2rem;
        background: linear-gradient(180deg, rgba(200,160,120,0.08), rgba(200,160,120,0.02));
        border: 1px solid rgba(200,160,120,0.12);
        border-radius: 12px;
        margin-bottom: 2.5rem;
      }
      .balance-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
      .balance-amount {
        font-size: 3rem;
        font-weight: 700;
        color: #d4b88c;
        font-family: "JetBrains Mono", monospace;
        letter-spacing: 0.05em;
      }
      .balance-label {
        font-size: 0.85rem;
        color: rgba(200,160,120,0.5);
        margin-top: 0.3rem;
      }
      .balance-hint {
        font-size: 0.7rem;
        color: rgba(200,160,120,0.25);
        margin-top: 0.5rem;
        font-style: italic;
      }

      .recharge-subtitle {
        font-size: 1.1rem;
        color: rgba(200,160,120,0.6);
        margin: 2rem 0 1rem;
        padding-left: 0.5rem;
        border-left: 2px solid rgba(200,160,120,0.3);
      }

      /* 充值包 */
      .coin-packages {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
        gap: 1rem;
        margin-bottom: 2rem;
      }
      .coin-pkg {
        background: rgba(200,160,120,0.03);
        border: 1px solid rgba(200,160,120,0.08);
        border-radius: 10px;
        padding: 1.5rem 1rem;
        text-align: center;
        transition: all 0.3s;
        cursor: default;
      }
      .coin-pkg:hover {
        border-color: rgba(200,160,120,0.2);
        background: rgba(200,160,120,0.06);
        transform: translateY(-2px);
      }
      .coin-pkg__icon { font-size: 2rem; margin-bottom: 0.5rem; }
      .coin-pkg__name {
        font-size: 1rem;
        font-weight: 600;
        color: #d4b88c;
        margin-bottom: 0.3rem;
      }
      .coin-pkg__coins {
        font-size: 1.5rem;
        font-weight: 700;
        color: #c8a070;
        margin: 0.5rem 0;
      }
      .coin-pkg__price {
        font-size: 1.2rem;
        color: rgba(255,255,255,0.7);
        margin-bottom: 0.3rem;
      }
      .coin-pkg__desc {
        font-size: 0.75rem;
        color: rgba(200,160,120,0.35);
        margin-bottom: 1rem;
        font-style: italic;
      }
      .btn-recharge {
        display: inline-block;
        padding: 0.5rem 1.5rem;
        background: transparent;
        border: 1px solid rgba(200,160,120,0.3);
        color: #c8a070;
        border-radius: 6px;
        cursor: pointer;
        font-family: inherit;
        font-size: 0.85rem;
        transition: all 0.2s;
      }
      .btn-recharge:hover {
        background: rgba(200,160,120,0.15);
        border-color: rgba(200,160,120,0.5);
      }

      /* 商店物品 */
      .shop-items {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 0.8rem;
        margin-bottom: 2rem;
      }
      .shop-item {
        background: rgba(200,160,120,0.025);
        border: 1px solid rgba(200,160,120,0.06);
        border-radius: 8px;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }
      .shop-item--locked {
        opacity: 0.5;
      }
      .shop-item__name {
        font-size: 0.9rem;
        color: #d4b88c;
        font-weight: 500;
      }
      .shop-item__cost {
        font-size: 0.85rem;
        color: #c8a070;
        font-weight: 600;
      }
      .shop-item__desc {
        font-size: 0.75rem;
        color: rgba(200,160,120,0.35);
        flex: 1;
      }
      .btn-buy {
        padding: 0.3rem 1rem;
        background: transparent;
        border: 1px solid rgba(200,160,120,0.2);
        color: #c8a070;
        border-radius: 4px;
        cursor: pointer;
        font-family: inherit;
        font-size: 0.75rem;
        margin-top: 0.3rem;
        transition: all 0.2s;
      }
      .btn-buy:hover:not(:disabled) {
        background: rgba(200,160,120,0.15);
        border-color: rgba(200,160,120,0.4);
      }
      .btn-buy:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      .recharge-footer {
        text-align: center;
        color: rgba(200,160,120,0.2);
        font-size: 0.75rem;
        margin-top: 2rem;
        line-height: 1.8;
      }

      /* 支付弹窗 */
      .payment-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 500;
      }
      .payment-modal {
        background: linear-gradient(180deg, #161210, #111);
        border: 1px solid rgba(200,160,120,0.15);
        border-radius: 12px;
        padding: 2rem;
        max-width: 400px;
        width: 90%;
      }
      .payment-header { text-align: center; margin-bottom: 1.5rem; }
      .payment-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
      .payment-header h3 { color: #d4b88c; margin: 0.3rem 0; }
      .payment-header p { color: rgba(200,160,120,0.4); font-size: 0.85rem; }
      .payment-detail { margin-bottom: 1.5rem; }
      .payment-row {
        display: flex;
        justify-content: space-between;
        padding: 0.5rem 0;
        border-bottom: 1px solid rgba(200,160,120,0.06);
        color: rgba(200,160,120,0.6);
        font-size: 0.9rem;
      }
      .payment-price { color: #d4b88c; font-weight: 700; }
      .payment-qr-hint { text-align: center; margin-bottom: 1.5rem; }
      .qr-placeholder pre {
        display: inline-block;
        font-size: 0.55rem;
        color: rgba(200,160,120,0.3);
        background: rgba(200,160,120,0.03);
        border: 1px solid rgba(200,160,120,0.08);
        padding: 1rem;
        border-radius: 8px;
        line-height: 1.3;
        font-family: "Courier New", monospace;
      }
      .payment-qr-sub { color: rgba(200,160,120,0.25); font-size: 0.7rem; margin-top: 0.5rem; }
      .payment-actions {
        display: flex;
        gap: 0.8rem;
        justify-content: center;
      }
      .btn-confirm-pay {
        padding: 0.6rem 1.5rem;
        background: rgba(200,160,120,0.15);
        border: 1px solid rgba(200,160,120,0.3);
        color: #d4b88c;
        border-radius: 6px;
        cursor: pointer;
        font-family: inherit;
        font-size: 0.9rem;
        transition: all 0.2s;
      }
      .btn-confirm-pay:hover { background: rgba(200,160,120,0.25); }
      .btn-cancel-pay {
        padding: 0.6rem 1.5rem;
        background: transparent;
        border: 1px solid rgba(255,255,255,0.1);
        color: rgba(255,255,255,0.3);
        border-radius: 6px;
        cursor: pointer;
        font-family: inherit;
        font-size: 0.9rem;
      }
      .btn-cancel-pay:hover { color: rgba(255,255,255,0.5); border-color: rgba(255,255,255,0.2); }

      /* Toast */
      .recharge-toast {
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%);
        background: #111;
        border: 1px solid rgba(200,160,120,0.25);
        color: #d4b88c;
        padding: 0.8rem 2rem;
        border-radius: 8px;
        font-size: 0.85rem;
        z-index: 9999;
        transition: all 0.3s;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      }

      /* 顶部余额 */
      .topbar-coin-display {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.4rem 0.8rem;
        background: rgba(200,160,120,0.06);
        border: 1px solid rgba(200,160,120,0.12);
        border-radius: 999px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .topbar-coin-display:hover {
        background: rgba(200,160,120,0.12);
        border-color: rgba(200,160,120,0.25);
      }
      .coin-icon { font-size: 0.9rem; }
      .coin-balance {
        color: #d4b88c;
        font-weight: 600;
        font-family: "JetBrains Mono", monospace;
        font-size: 0.85rem;
      }
    `;
    document.head.appendChild(style);
  }

  // ===== 初始化 =====
  loadState();

  window.MidnightRecharge = {
    COIN_PACKAGES,
    ITEMS,
    recharge,
    spend,
    getBalance,
    canAfford,
    getTransactions,
    renderRecharge,
    renderTopbarCoin,
    refreshTopbarCoin,
    showToast,
  };

  console.log('[Archive] 充值系统已就绪 | 余额', balance, '🧱');
})();
