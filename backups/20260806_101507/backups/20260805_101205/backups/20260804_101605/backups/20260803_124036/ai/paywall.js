/**
 * 午夜档案馆 — 付费体系 v2
 * 
 * 核心理念：免费用户也是档案馆的一部分，不弹窗、不拦截、不恶心人。
 * 会员不是「解锁更多」，而是「更深度的参与感」。
 * 
 * 免费用户：完整的阅读和投稿体验，AI 基础功能可用
 * 付费用户：身份认同 + 深度工具 + 先看优先
 */

(function() {
  'use strict';

  const PLANS = {
    free: {
      name: '访客',
      subtitle: '在午夜档案馆留下足迹',
      price: 0,
      tagline: '每个人都有一个故事',
      features: [
        '阅读所有公开故事',
        '提交你的故事投稿',
        'AI 基础润色（每日3次）',
        '参与讨论和回复',
      ],
      aiLimit: 3,
      badge: null,
      badgeClass: '',
    },
    archivist: {
      name: '档案员',
      subtitle: '守护每一个故事',
      price: 19.9,
      period: '月',
      tagline: '你和档案馆之间，不只是读者',
      features: [
        '档案员专属徽章（头像旁展示）',
        'AI 深度润色与标题生成（每日50次）',
        '投稿自动配图 + 短视频脚本',
        '新故事上线时邮件通知',
        '每年收到一份「午夜年鉴」',
      ],
      aiLimit: 50,
      badge: '📂',
      badgeClass: 'badge-archivist',
    },
    keeper: {
      name: '守夜人',
      subtitle: '档案馆的秩序维护者',
      price: 49.9,
      period: '月',
      tagline: '你决定了哪些故事值得被记住',
      features: [
        '档案员全部权益',
        '守夜人专属徽章（金色）',
        '你的投稿在首页优先展示',
        '每周精选故事投票权',
        'AI 无限制使用',
        '数据看板（你的故事阅读/互动统计）',
        '参与产品功能内测与决策',
      ],
      aiLimit: 999,
      badge: '🗝️',
      badgeClass: 'badge-keeper',
    },
  };

  let currentPlan = 'free';
  let memberSince = null;
  let subscriptionExpires = null;

  // ===== 状态持久化 =====
  function loadState() {
    try {
      currentPlan = localStorage.getItem('midnight_plan') || 'free';
      memberSince = localStorage.getItem('midnight_member_since');
      subscriptionExpires = localStorage.getItem('midnight_sub_expires');
    } catch(e) { currentPlan = 'free'; }
  }

  function saveState() {
    try {
      localStorage.setItem('midnight_plan', currentPlan);
      if (memberSince) localStorage.setItem('midnight_member_since', memberSince);
      if (subscriptionExpires) localStorage.setItem('midnight_sub_expires', subscriptionExpires);
    } catch(e) {}
  }

  // ===== 订阅管理 =====
  function subscribe(plan) {
    if (!PLANS[plan] || plan === 'free') return { success: false, error: '无效计划' };
    
    currentPlan = plan;
    memberSince = new Date().toISOString();
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    subscriptionExpires = expires.toISOString();
    saveState();

    return {
      success: true,
      plan: PLANS[plan],
      memberSince,
      expires: subscriptionExpires,
    };
  }

  function checkStatus() {
    if (currentPlan === 'free') return { active: true, plan: 'free' };
    if (subscriptionExpires && new Date(subscriptionExpires) < new Date()) {
      currentPlan = 'free';
      subscriptionExpires = null;
      saveState();
      return { active: false, plan: 'free', reason: 'expired' };
    }
    return { active: true, plan: currentPlan, expires: subscriptionExpires };
  }

  function isMember() {
    return checkStatus().active && currentPlan !== 'free';
  }

  function isKeeper() {
    return checkStatus().active && currentPlan === 'keeper';
  }

  // ===== AI 配额 =====
  function getAIQuota() {
    return {
      dailyLimit: PLANS[currentPlan].aiLimit,
      plan: currentPlan,
    };
  }

  // ===== 渲染定价页（非弹窗，是独立页面风格） =====
  function renderPricing(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const plansToShow = ['free', 'archivist', 'keeper'];
    const status = checkStatus();

    container.innerHTML = `
      <div class="pricing-section">
        <div class="pricing-header-area">
          <h2>支持档案馆</h2>
          <p class="pricing-subtitle">免费永远是档案馆的底色。付费，是你主动选择在这里待得更深一点。</p>
        </div>
        <div class="pricing-cards">
          ${plansToShow.map(planId => {
            const plan = PLANS[planId];
            const isCurrent = currentPlan === planId && status.active;
            const wasMember = currentPlan !== 'free' && planId === 'free' && !status.active;

            return `
              <div class="pricing-card ${isCurrent ? 'active' : ''} ${planId}">
                ${plan.badge ? `<div class="plan-badge">${plan.badge}</div>` : ''}
                <div class="plan-name">${plan.name}</div>
                <div class="plan-subtitle">${plan.subtitle}</div>
                <div class="plan-price">
                  ${plan.price === 0 ? 
                    '<span class="price-free">免费</span>' : 
                    `<span class="price-number">¥${plan.price}</span><span class="price-period">/ ${plan.period}</span>`
                  }
                </div>
                <div class="plan-tagline">${plan.tagline}</div>
                <ul class="plan-features">
                  ${plan.features.map(f => `<li>${f}</li>`).join('')}
                </ul>
                <div class="plan-action">
                  ${isCurrent ?
                    '<span class="current-label">当前身份</span>' :
                    plan.price === 0 ?
                      '<span class="current-label">默认身份</span>' :
                      `<button class="btn-subscribe" data-plan="${planId}">
                        ${wasMember ? '重新加入' : '成为' + plan.name}
                      </button>`
                  }
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <p class="pricing-footer">
          所有收入用于服务器、域名和档案馆的日常维护。<br>
          订阅后可随时在设置中取消。
        </p>
      </div>
    `;

    // 绑定事件
    container.querySelectorAll('.btn-subscribe').forEach(btn => {
      btn.addEventListener('click', function() {
        const planId = this.dataset.plan;
        const result = subscribe(planId);
        if (result.success) {
          onSubscriptionSuccess(result);
        }
      });
    });

    // 注入样式（仅一次）
    injectStyles();
  }

  let stylesInjected = false;
  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;

    const style = document.createElement('style');
    style.textContent = `
      .pricing-section {
        max-width: 900px;
        margin: 0 auto;
        padding: 3rem 1rem;
      }
      .pricing-header-area {
        text-align: center;
        margin-bottom: 3rem;
      }
      .pricing-header-area h2 {
        font-size: 2rem;
        color: var(--brand-primary-light);
        margin-bottom: 0.75rem;
      }
      .pricing-subtitle {
        color: var(--neutral-400);
        font-size: 1rem;
        max-width: 500px;
        margin: 0 auto;
        line-height: 1.6;
      }
      .pricing-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 1.5rem;
      }
      .pricing-card {
        background: var(--surface-dark, #111);
        border: 1px solid var(--border-subtle, #222);
        border-radius: 12px;
        padding: 2rem 1.5rem;
        text-align: center;
        position: relative;
        transition: border-color 0.3s, transform 0.2s;
      }
      .pricing-card:hover {
        transform: translateY(-2px);
      }
      .pricing-card.active {
        border-color: var(--brand-primary, #b49678);
      }
      .pricing-card.keeper {
        border-color: #8b7355;
      }
      .plan-badge {
        font-size: 2rem;
        margin-bottom: 0.5rem;
      }
      .plan-name {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--brand-primary-light);
        margin-bottom: 0.25rem;
      }
      .plan-subtitle {
        font-size: 0.8rem;
        color: var(--neutral-500);
        margin-bottom: 1rem;
      }
      .plan-price {
        margin: 1rem 0;
      }
      .price-number { font-size: 2.5rem; font-weight: 700; color: var(--brand-primary); }
      .price-period { color: var(--neutral-500); font-size: 0.9rem; }
      .price-free { font-size: 1.5rem; color: var(--neutral-400); }
      .plan-tagline {
        font-size: 0.85rem;
        color: var(--neutral-300);
        font-style: italic;
        margin-bottom: 1.5rem;
        line-height: 1.4;
      }
      .plan-features {
        list-style: none;
        padding: 0;
        margin: 0 0 1.5rem;
        text-align: left;
      }
      .plan-features li {
        padding: 0.4rem 0;
        color: var(--neutral-300);
        font-size: 0.85rem;
        border-bottom: 1px solid rgba(255,255,255,0.03);
      }
      .plan-features li::before {
        content: '';
        display: inline-block;
        width: 4px; height: 4px;
        background: var(--brand-primary);
        border-radius: 50%;
        margin-right: 0.5rem;
        vertical-align: middle;
      }
      .btn-subscribe {
        display: inline-block;
        width: 100%;
        padding: 0.7rem 1.5rem;
        background: transparent;
        border: 1px solid var(--brand-primary);
        color: var(--brand-primary);
        border-radius: 6px;
        font-size: 0.95rem;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
      }
      .btn-subscribe:hover {
        background: var(--brand-primary);
        color: var(--bg-primary);
      }
      .current-label {
        display: inline-block;
        width: 100%;
        padding: 0.7rem;
        color: var(--neutral-500);
        font-size: 0.85rem;
      }
      .pricing-footer {
        text-align: center;
        color: var(--neutral-600);
        font-size: 0.8rem;
        margin-top: 2.5rem;
        line-height: 1.8;
      }
      .member-badge-inline {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.75rem;
        padding: 0.15rem 0.6rem;
        border-radius: 999px;
        vertical-align: middle;
        margin-left: 0.4rem;
      }
      .badge-archivist {
        background: rgba(180,150,120,0.15);
        color: var(--brand-primary);
        border: 1px solid rgba(180,150,120,0.3);
      }
      .badge-keeper {
        background: rgba(200,160,80,0.2);
        color: #d4a843;
        border: 1px solid rgba(200,160,80,0.4);
      }
      .toast {
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%);
        background: var(--surface-dark, #111);
        border: 1px solid var(--brand-primary);
        color: var(--brand-primary-light);
        padding: 1rem 2rem;
        border-radius: 8px;
        font-size: 0.9rem;
        z-index: 9999;
        animation: toast-in 0.3s ease-out;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      }
      @keyframes toast-in {
        from { opacity: 0; transform: translateX(-50%) translateY(10px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  function onSubscriptionSuccess(result) {
    // 显示 toast 而非 alert
    showToast(`🎉 欢迎成为 ${result.plan.name}！`);
    
    // 刷新定价卡片
    const container = document.querySelector('.pricing-cards');
    if (container) {
      const wrapper = container.closest('.pricing-section');
      if (wrapper) {
        renderPricing(wrapper.parentElement.id || 'pricing-root');
      }
    }

    // 通知其他模块
    if (typeof window !== 'undefined' && window.MidnightAI) {
      // AI Agent 配额自动更新
    }
  }

  function showToast(message, duration = 3000) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), duration);
  }

  function getBadge() {
    const plan = PLANS[currentPlan];
    if (!plan.badge) return '';
    return `<span class="member-badge-inline ${plan.badgeClass}">${plan.badge} ${plan.name}</span>`;
  }

  // ===== 初始化和导出 =====
  loadState();

  window.MidnightPaywall = {
    PLANS,
    subscribe,
    checkStatus,
    isMember,
    isKeeper,
    getAIQuota,
    renderPricing,
    getBadge,
    getCurrentPlan: () => currentPlan,
    getMemberSince: () => memberSince,
    showToast,
  };

  console.log('[Archive] 付费体系已就绪 |', currentPlan === 'free' ? '访客' : PLANS[currentPlan].name);
})();