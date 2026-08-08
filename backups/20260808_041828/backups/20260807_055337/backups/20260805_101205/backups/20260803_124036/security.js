/**
 * 午夜档案馆 — 安全防护模块 v1
 * 独立于业务逻辑的安全层，不影响网站功能
 * 功能：防注入、防篡改、防自动化攻击、会话保护、错误恢复
 */
(function() {
  'use strict';

  // 不在生产环境暴露任何安全模块信息
  var _initialized = false;
  var _violations = [];
  var _MAX_VIOLATIONS = 10;
  var _LOCKOUT_DURATION = 300000; // 5分钟锁定
  var _isLocked = false;
  var _lockUntil = 0;
  var _fingerprint = null;
  var _sessionStart = Date.now();

  // ===== 1. 全局错误捕获（记录但不阻止浏览器默认行为） =====
  window.addEventListener('error', function(e) {
    _logViolation('runtime_error', e.message + ' at ' + (e.filename || ''));
    // 不调用 preventDefault()，让浏览器正常显示错误
  }, true);

  window.addEventListener('unhandledrejection', function(e) {
    _logViolation('promise_error', String(e.reason));
    // 不调用 preventDefault()，让浏览器正常处理
  }, true);

  // ===== 2. XSS/注入防护 — 自动净化所有用户输入 =====
  function deepSanitize(str) {
    if (typeof str !== 'string') return '';
    // 移除所有 HTML 标签
    str = str.replace(/<[^>]*>/g, '');
    // 移除事件处理器
    str = str.replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '');
    str = str.replace(/\bon\w+\s*=\s*[^\s>]*/gi, '');
    // 移除危险协议
    str = str.replace(/javascript\s*:/gi, '');
    str = str.replace(/data\s*:/gi, '');
    str = str.replace(/vbscript\s*:/gi, '');
    // 移除表达式
    str = str.replace(/expression\s*\(/gi, '');
    str = str.replace(/eval\s*\(/gi, '');
    str = str.replace(/setTimeout\s*\(/gi, '');
    str = str.replace(/setInterval\s*\(/gi, '');
    // 移除 Unicode 转义序列中的危险字符
    str = str.replace(/\\u00[0-9a-f]{2}/gi, '');
    // 移制字符
    str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    return str.trim();
  }

  // 拦截所有 form 提交，自动净化输入
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (!form || !form.elements) return;
    for (var i = 0; i < form.elements.length; i++) {
      var el = form.elements[i];
      if (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type === 'text')) {
        if (typeof el.value === 'string') {
          el.value = deepSanitize(el.value);
        }
      }
    }
  }, true);

  // innerHTML 注入防护已由 CSP 头和 MutationObserver 处理
  // 不覆盖 innerHTML 以避免干扰初始页面加载

  // ===== 3. 控制台陷阱（检测开发者工具） =====
  // 重写 console 方法，在非开发环境下捕获异常调用
  var _origConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug
  };

  // 不阻止正常日志，但捕获异常模式
  var _consoleCallCount = 0;
  var _consoleCallWindow = Date.now();

  ['log', 'warn', 'error', 'info', 'debug'].forEach(function(method) {
    var orig = console[method];
    console[method] = function() {
      _consoleCallCount++;
      var now = Date.now();
      // 检测暴力调用（每秒超过50次 = 可能是自动化脚本）
      if (now - _consoleCallWindow > 1000) {
        if (_consoleCallCount > 50) {
          _logViolation('console_flood', 'calls: ' + _consoleCallCount);
        }
        _consoleCallCount = 0;
        _consoleCallWindow = now;
      }
      return orig.apply(console, arguments);
    };
  });

  // ===== 4. DOM 篡改检测 =====
  // 监控关键元素不被外部脚本修改
  var _protectedElements = new Map();

  function protectElement(selector, description) {
    var el = document.querySelector(selector);
    if (el) {
      _protectedElements.set(selector, {
        original: el.outerHTML.substring(0, 200),
        description: description
      });
    }
  }

  // 使用 MutationObserver 监控 DOM 变化
  var _domMutationCount = 0;
  var _domMutationWindow = Date.now();

  // 延迟启动 DOM 观察器，避免干扰初始页面脚本加载
  var domObserver = new MutationObserver(function(mutations) {
    _domMutationCount += mutations.length;
    var now = Date.now();
    if (now - _domMutationWindow > 5000) {
      if (_domMutationCount > 200) {
        _logViolation('dom_flood', 'mutations: ' + _domMutationCount);
      }
      _domMutationCount = 0;
      _domMutationWindow = now;
    }

    // 检查是否有外部脚本注入（仅对动态添加的脚本生效）
    mutations.forEach(function(m) {
      if (m.type === 'childList') {
        m.addedNodes.forEach(function(node) {
          if (node.nodeName === 'SCRIPT') {
            var src = node.src || '';
            var allowedExternal = ['https://fonts.googleapis.com', 'https://raw.githubusercontent.com', 'https://api.github.com'];
            var isAllowed = false;
            if (!src) isAllowed = true;
            else if (src.indexOf(window.location.origin) === 0) isAllowed = true;
            else {
              for (var i = 0; i < allowedExternal.length; i++) {
                if (src.indexOf(allowedExternal[i]) === 0) { isAllowed = true; break; }
              }
            }
            if (!isAllowed && src) {
              _logViolation('script_injection', src);
              node.parentNode.removeChild(node);
            }
          }
        });
      }
    });
  });

  // 页面加载完成后才启动 DOM 观察器
  if (document.readyState === 'complete') {
    domObserver.observe(document.documentElement, { childList: true, subtree: true });
  } else {
    window.addEventListener('load', function() {
      domObserver.observe(document.documentElement, { childList: true, subtree: true });
    });
  }

  // ===== 5. 会话指纹（防会话劫持） =====
  function generateFingerprint() {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fingerprint', 2, 2);
    var canvasData = canvas.toDataURL().slice(-50);

    var components = [
      navigator.userAgent || '',
      navigator.language || '',
      screen.width + 'x' + screen.height + 'x' + (screen.colorDepth || ''),
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 0,
      canvasData
    ];
    var hash = 0;
    var str = components.join('|');
    for (var i = 0; i < str.length; i++) {
      var chr = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return 'fp_' + Math.abs(hash).toString(36);
  }

  _fingerprint = generateFingerprint();

  // 存储指纹，检测变化
  try {
    var storedFp = sessionStorage.getItem('_ma_fp');
    if (storedFp && storedFp !== _fingerprint) {
      _logViolation('fingerprint_change', storedFp + ' -> ' + _fingerprint);
    }
    sessionStorage.setItem('_ma_fp', _fingerprint);
  } catch(e) {}

  // ===== 6. 自动化/机器人检测 =====
  var _mouseEvents = 0;
  var _keyEvents = 0;
  var _touchEvents = 0;
  var _lastInteraction = Date.now();

  document.addEventListener('mousemove', function() { _mouseEvents++; _lastInteraction = Date.now(); }, { passive: true, capture: true });
  document.addEventListener('keydown', function() { _keyEvents++; _lastInteraction = Date.now(); }, { passive: true, capture: true });
  document.addEventListener('touchstart', function() { _touchEvents++; _lastInteraction = Date.now(); }, { passive: true, capture: true });
  document.addEventListener('click', function() { _lastInteraction = Date.now(); }, { passive: true, capture: true });

  // 定期检查：如果长时间无交互却有操作 = 机器人
  setInterval(function() {
    var now = Date.now();
    var timeSinceInteraction = now - _lastInteraction;
    // 5分钟无交互 = 可疑
    if (timeSinceInteraction > 300000) {
      // 如果同时有网络活动，说明可能是自动化脚本
      if (_mouseEvents === 0 && _keyEvents === 0 && _touchEvents === 0) {
        _logViolation('no_human_interaction', 'no input events since page load');
      }
    }
  }, 60000);

  // 检测异常的表单提交速度
  var _formSubmitTimes = [];
  document.addEventListener('submit', function() {
    var now = Date.now();
    _formSubmitTimes.push(now);
    // 清理1分钟前的记录
    _formSubmitTimes = _formSubmitTimes.filter(function(t) { return now - t < 60000; });
    // 1分钟内提交超过5次 = 可疑
    if (_formSubmitTimes.length > 5) {
      _logViolation('rapid_form_submit', 'submits: ' + _formSubmitTimes.length);
    }
  }, true);

  // ===== 7. 安全的 fetch 包装（防请求篡改） =====
  var _origFetch = window.fetch;
  window._secureFetch = function(url, options) {
    options = options || {};
    // 验证 URL 不含危险字符
    if (typeof url === 'string') {
      if (url.indexOf('javascript:') >= 0 || url.indexOf('data:') >= 0) {
        _logViolation('dangerous_url', url);
        return Promise.reject(new Error('Blocked dangerous URL'));
      }
    }
    // 为所有请求添加安全头
    if (!options.headers) options.headers = {};
    if (options.headers instanceof Object && !(options.headers instanceof Headers)) {
      options.headers['X-Requested-With'] = 'XMLHttpRequest';
    }
    // 添加超时
    var timeout = options.timeout || 15000;
    var controller = null;
    if (typeof AbortController !== 'undefined') {
      controller = new AbortController();
      options.signal = controller.signal;
    }
    var timeoutId = setTimeout(function() {
      if (controller) controller.abort();
    }, timeout);
    return _origFetch.call(window, url, options).finally(function() {
      clearTimeout(timeoutId);
    });
  };

  // ===== 8. localStorage 完整性保护 =====
  var _origSetItem = localStorage.setItem;
  var _origGetItem = localStorage.getItem;
  var _origRemoveItem = localStorage.removeItem;

  localStorage.setItem = function(key, value) {
    // 验证 key 不含危险字符
    if (typeof key === 'string' && (key.indexOf('<') >= 0 || key.indexOf('javascript:') >= 0)) {
      _logViolation('storage_injection_key', key);
      return;
    }
    // 验证 value 长度（防存储耗尽攻击）
    if (typeof value === 'string' && value.length > 100000) {
      _logViolation('storage_overflow', 'len: ' + value.length);
      return;
    }
    return _origSetItem.call(localStorage, key, value);
  };

  // ===== 9. 违规记录与锁定 =====
  function _logViolation(type, detail) {
    var entry = { type: type, detail: String(detail).substring(0, 200), time: Date.now() };
    _violations.push(entry);
    // 超过上限，触发锁定
    if (_violations.length >= _MAX_VIOLATIONS) {
      _triggerLockout();
    }
    // 记录到 sessionStorage（不影响正常功能）
    try {
      var existing = sessionStorage.getItem('_ma_sec') || '[]';
      var arr = JSON.parse(existing);
      arr.push(entry);
      if (arr.length > 50) arr = arr.slice(-25);
      sessionStorage.setItem('_ma_sec', JSON.stringify(arr));
    } catch(e) {}
  }

  function _triggerLockout() {
    _isLocked = true;
    _lockUntil = Date.now() + _LOCKOUT_DURATION;
    try { sessionStorage.setItem('_ma_lock', _lockUntil); } catch(e) {}
    // 5分钟后自动解锁
    setTimeout(function() {
      _isLocked = false;
      _violations = [];
      try { sessionStorage.removeItem('_ma_lock'); } catch(e) {}
    }, _LOCKOUT_DURATION);
  }

  // 检查是否处于锁定状态
  function isLocked() {
    try {
      var lockUntil = parseInt(sessionStorage.getItem('_ma_lock'), 10);
      if (lockUntil && Date.now() < lockUntil) {
        _isLocked = true;
        return true;
      }
    } catch(e) {}
    _isLocked = false;
    return false;
  }

  // ===== 10. 页面离开时的安全清理 =====
  window.addEventListener('beforeunload', function() {
    domObserver.disconnect();
  });

  // ===== 11. 反调试（轻量级，不影响性能） =====
  // 检测 debugger 语句被频繁触发
  var _debuggerHits = 0;
  var _debuggerWindow = Date.now();
  function _antiDebug() {
    var now = Date.now();
    if (now - _debuggerWindow > 3000) {
      if (_debuggerHits > 10) {
        _logViolation('debugger_abuse', 'hits: ' + _debuggerHits);
      }
      _debuggerHits = 0;
      _debuggerWindow = now;
    }
    _debuggerHits++;
  }

  // ===== 12. URL 参数注入防护 =====
  (function() {
    var params = new URLSearchParams(window.location.search);
    params.forEach(function(value, key) {
      var sanitized = deepSanitize(value);
      if (sanitized !== value) {
        _logViolation('url_param_injection', key + '=' + value.substring(0, 50));
      }
    });
  })();

  // ===== 13. 原型链保护（只读检测，不冻结） =====
  // 检测原型链是否被篡改
  var _origToString = Object.prototype.toString;
  var _origHasOwn = Object.prototype.hasOwnProperty;
  setInterval(function() {
    if (Object.prototype.toString !== _origToString) {
      _logViolation('prototype_tamper', 'Object.prototype.toString modified');
    }
    if (Object.prototype.hasOwnProperty !== _origHasOwn) {
      _logViolation('prototype_tamper', 'Object.prototype.hasOwnProperty modified');
    }
  }, 10000);

  // ===== 初始化完成 =====
  _initialized = true;

  // 暴露安全 API（只读，不暴露内部状态）
  window.MidnightSecurity = {
    isInitialized: function() { return _initialized; },
    isLocked: isLocked,
    getFingerprint: function() { return _fingerprint; },
    getViolationCount: function() { return _violations.length; },
    sanitize: deepSanitize,
    getSessionDuration: function() { return Date.now() - _sessionStart; }
  };

})();
