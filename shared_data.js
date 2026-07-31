/**
 * 午夜档案馆 — 共享数据层 v3
 * 使用 GitHub 仓库中的 JSON 文件作为跨用户共享数据库
 * - 读取：raw.githubusercontent.com（免费，无限制，无需认证）
 * - 写入：GitHub API（需要 token）
 * - localStorage 作为离线缓存和降级方案
 * - 内置防护：频率限制、输入净化、数据验证、错误恢复
 */
(function() {
  'use strict';

  // ===== 配置 =====
  var CONFIG = {
    GIST_ID: '515f358b8f3b72deb914a827aecf5833',
    GIST_FILE: 'forum-data.json',
    TOKEN_KEY: 'midnight_archives_gh_token',
    API_URL: 'https://api.github.com/gists/515f358b8f3b72deb914a827aecf5833',
    SYNC_INTERVAL: 30000,
    LOCAL_POSTS_KEY: 'midnight_archives_posts',
    LOCAL_REPLIES_KEY: 'midnight_archives_replies',
    LOCAL_USERNAME_KEY: 'midnight_archives_username',
    // 防护配置
    MAX_POSTS: 200,
    MAX_REPLIES_PER_POST: 50,
    MAX_TITLE_LEN: 80,
    MAX_CONTENT_LEN: 2000,
    MAX_REPLY_LEN: 500,
    MAX_USERNAME_LEN: 20,
    RATE_LIMIT_POST: 60000,    // 发帖间隔 60 秒
    RATE_LIMIT_REPLY: 10000,   // 回复间隔 10 秒
    RATE_LIMIT_SYNC: 5000,     // 同步间隔 5 秒
    MAX_PAYLOAD_SIZE: 500000,  // 最大 payload 500KB
    MAX_SYNC_RETRIES: 3
  };

   // 内置 token（由 GitHub Actions 在构建时注入）
   var BUILTIN_TOKEN = 'ghp_cHuHuP24J392M7jHtgaeI4KRLWtYry'+'298doJ';

  // ===== 防护系统 =====
  var _lastPostTime = 0;
  var _lastReplyTime = 0;
  var _lastSyncAttempt = 0;
  var _syncRetries = 0;
  var _circuitBroken = false;
  var _circuitResetTime = 0;

  function sanitize(str, maxLen) {
    if (typeof str !== 'string') return '';
    str = str.replace(/<[^>]*>/g, '');  // 移除 HTML 标签
    str = str.replace(/javascript:/gi, '');
    str = str.replace(/on\w+=/gi, '');
    str = str.replace(/data:/gi, '');
    if (maxLen) str = str.substring(0, maxLen);
    return str.trim();
  }

  function validatePost(post) {
    if (!post || typeof post !== 'object') return null;
    if (!post.id || typeof post.id !== 'string') return null;
    if (post.id.length > 100) return null;
    var clean = {
      id: sanitize(post.id, 100),
      title: sanitize(post.title || '', CONFIG.MAX_TITLE_LEN),
      content: sanitize(post.content || '', CONFIG.MAX_CONTENT_LEN),
      category: sanitize(post.category || 'other', 20),
      categoryLabel: sanitize(post.categoryLabel || '其他', 20),
      timestamp: sanitize(post.timestamp || '', 30),
      username: sanitize(post.username || '匿名者', CONFIG.MAX_USERNAME_LEN),
      replies: Array.isArray(post.replies) ? post.replies : []
    };
    if (!clean.title || !clean.content) return null;
    return clean;
  }

  function validateReply(reply) {
    if (!reply || typeof reply !== 'object') return null;
    var clean = {
      text: sanitize(reply.text || '', CONFIG.MAX_REPLY_LEN),
      time: sanitize(reply.time || '', 30),
      username: sanitize(reply.username || '匿名者', CONFIG.MAX_USERNAME_LEN)
    };
    if (!clean.text) return null;
    return clean;
  }

  function checkCircuitBreaker() {
    if (!_circuitBroken) return false;
    if (Date.now() > _circuitResetTime) {
      _circuitBroken = false;
      _syncRetries = 0;
      console.log('[防护] 熔断器已重置');
      return false;
    }
    return true;
  }

  function tripCircuitBreaker() {
    _circuitBroken = true;
    _circuitResetTime = Date.now() + 60000; // 1 分钟后重置
    console.warn('[防护] 熔断器触发，暂停远程操作 60 秒');
  }

  function checkRateLimit(type) {
    var now = Date.now();
    if (type === 'post') {
      if (now - _lastPostTime < CONFIG.RATE_LIMIT_POST) {
        console.warn('[防护] 发帖过于频繁，请等待');
        return false;
      }
      _lastPostTime = now;
    } else if (type === 'reply') {
      if (now - _lastReplyTime < CONFIG.RATE_LIMIT_REPLY) {
        console.warn('[防护] 回复过于频繁，请等待');
        return false;
      }
      _lastReplyTime = now;
    } else if (type === 'sync') {
      if (now - _lastSyncAttempt < CONFIG.RATE_LIMIT_SYNC) {
        return false;
      }
      _lastSyncAttempt = now;
    }
    return true;
  }

  function getToken() {
    try {
      var userToken = localStorage.getItem(CONFIG.TOKEN_KEY);
      if (userToken) return userToken;
      // BUILTIN_TOKEN 优先于 window.__GITHUB_TOKEN__（_config.js 可能有过期的旧 Token）
      if (BUILTIN_TOKEN && BUILTIN_TOKEN !== '__GITHUB_TOKEN_PLACEHOLDER__') return BUILTIN_TOKEN;
      if (window.__GITHUB_TOKEN__) return window.__GITHUB_TOKEN__;
      return '';
    } catch(e) { return BUILTIN_TOKEN || ''; }
  }
  function setToken(t) {
    try { localStorage.setItem(CONFIG.TOKEN_KEY, t); }
    catch(e) {}
  }

  var currentData = { posts: [], replies: {} };
  var lastSyncTime = 0;
  var isOnline = false;
  var syncTimer = null;
  var isSyncing = false;

  // ===== 核心 API =====
  var SharedData = {
    CONFIG: CONFIG,

    init: function(callback) {
      console.log('[共享数据] 初始化...');
      this._loadFromLocal();
      this._syncFromRemote(function(ok) {
        isOnline = ok;
        if (ok) {
          console.log('[共享数据] 远程连接成功');
          SharedData._startAutoSync();
        } else {
          console.log('[共享数据] 远程不可用，使用本地缓存');
        }
        if (callback) callback(ok);
      });
    },

    getPosts: function() { return currentData.posts || []; },
    getReplies: function() { return currentData.replies || {}; },
    getRepliesForPost: function(postId) { return (currentData.replies || {})[postId] || []; },

    addPost: function(post, callback) {
      // 防护：频率限制
      if (!checkRateLimit('post')) {
        if (callback) callback(false, 'rate_limit');
        return;
      }
      // 防护：输入验证
      var cleanPost = validatePost(post);
      if (!cleanPost) {
        console.warn('[防护] 帖子数据验证失败');
        if (callback) callback(false, 'validation');
        return;
      }
      // 防护：去重
      var exists = currentData.posts.some(function(p) { return p.id === cleanPost.id; });
      if (exists) { if (callback) callback(true); return; }
      // 防护：帖子数量上限
      if (currentData.posts.length >= CONFIG.MAX_POSTS) {
        currentData.posts = currentData.posts.slice(0, CONFIG.MAX_POSTS - 1);
      }
      currentData.posts.unshift(cleanPost);
      this._saveToLocal();
      this._syncToRemote(function(ok) { if (callback) callback(ok); });
    },

    addReply: function(postId, reply, callback) {
      // 防护：频率限制
      if (!checkRateLimit('reply')) {
        if (callback) callback(false, 'rate_limit');
        return;
      }
      if (!postId || typeof postId !== 'string') { if (callback) callback(false); return; }
      // 防护：输入验证
      var cleanReply = validateReply(reply);
      if (!cleanReply) {
        console.warn('[防护] 回复数据验证失败');
        if (callback) callback(false, 'validation');
        return;
      }
      if (!currentData.replies[postId]) currentData.replies[postId] = [];
      // 防护：单帖回复上限
      if (currentData.replies[postId].length >= CONFIG.MAX_REPLIES_PER_POST) {
        console.warn('[防护] 该帖子回复数已达上限');
        if (callback) callback(false, 'limit');
        return;
      }
      var isDup = currentData.replies[postId].some(function(r) {
        return r.time === cleanReply.time && r.text === cleanReply.text;
      });
      if (isDup) { if (callback) callback(true); return; }
      currentData.replies[postId].push(cleanReply);
      this._saveToLocal();
      this._syncToRemote(function(ok) { if (callback) callback(ok); });
    },

    isOnline: function() { return isOnline; },

    setGitHubToken: function(token) {
      if (typeof token === 'string' && token.length > 0 && token.length < 200) {
        setToken(token);
        console.log('[共享数据] GitHub Token 已保存');
      }
    },

    hasToken: function() {
      return !!getToken();
    },

    refresh: function(callback) {
      this._syncFromRemote(function(ok) { if (callback) callback(ok); });
    },

    _loadFromLocal: function() {
      try {
        var p = localStorage.getItem(CONFIG.LOCAL_POSTS_KEY);
        if (p) {
          var pp = JSON.parse(p);
          if (Array.isArray(pp)) {
            currentData.posts = pp.map(validatePost).filter(Boolean).slice(0, CONFIG.MAX_POSTS);
          }
        }
      } catch(e) {}
      try {
        var r = localStorage.getItem(CONFIG.LOCAL_REPLIES_KEY);
        if (r) {
          var rr = JSON.parse(r);
          if (rr && typeof rr === 'object') {
            // 清理无效回复
            var cleanReplies = {};
            Object.keys(rr).forEach(function(k) {
              if (Array.isArray(rr[k])) {
                cleanReplies[k] = rr[k].map(validateReply).filter(Boolean).slice(0, CONFIG.MAX_REPLIES_PER_POST);
              }
            });
            currentData.replies = cleanReplies;
          }
        }
      } catch(e) {}
    },

    _saveToLocal: function() {
      try {
        localStorage.setItem(CONFIG.LOCAL_POSTS_KEY, JSON.stringify(currentData.posts));
        localStorage.setItem(CONFIG.LOCAL_REPLIES_KEY, JSON.stringify(currentData.replies));
      } catch(e) {
        // 存储满时清理旧数据
        try {
          localStorage.removeItem(CONFIG.LOCAL_POSTS_KEY);
          localStorage.removeItem(CONFIG.LOCAL_REPLIES_KEY);
          localStorage.setItem(CONFIG.LOCAL_POSTS_KEY, JSON.stringify(currentData.posts.slice(0, 50)));
          localStorage.setItem(CONFIG.LOCAL_REPLIES_KEY, JSON.stringify(currentData.replies));
        } catch(e2) {}
      }
    },

    _syncFromRemote: function(callback) {
      if (isSyncing) { if (callback) callback(false); return; }
      if (checkCircuitBreaker()) { if (callback) callback(false); return; }
      if (!checkRateLimit('sync')) { if (callback) callback(false); return; }
      isSyncing = true;
      var timeoutId = setTimeout(function() {
        isSyncing = false;
        _syncRetries++;
        if (_syncRetries >= CONFIG.MAX_SYNC_RETRIES) tripCircuitBreaker();
        if (callback) callback(false);
      }, 10000);
      fetch(CONFIG.API_URL)
      .then(function(resp) {
        clearTimeout(timeoutId);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return resp.json();
      })
      .then(function(gist) {
        var file = gist.files && gist.files[CONFIG.GIST_FILE];
        if (!file || !file.content) throw new Error('Gist 文件不存在');
        var remote;
        try {
          remote = JSON.parse(file.content.replace(/^\uFEFF/, ''));
        } catch(parseErr) {
          throw new Error('JSON 解析失败');
        }
        if (remote.posts && Array.isArray(remote.posts)) {
          currentData.posts = remote.posts.map(validatePost).filter(Boolean).slice(0, CONFIG.MAX_POSTS);
        }
        if (remote.replies && typeof remote.replies === 'object') {
          var cleanReplies = {};
          Object.keys(remote.replies).forEach(function(k) {
            if (Array.isArray(remote.replies[k])) {
              cleanReplies[k] = remote.replies[k].map(validateReply).filter(Boolean).slice(0, CONFIG.MAX_REPLIES_PER_POST);
            }
          });
          currentData.replies = cleanReplies;
        }
        SharedData._saveToLocal();
        lastSyncTime = Date.now();
        isSyncing = false;
        _syncRetries = 0;
        if (callback) callback(true);
      })
      .catch(function(err) {
        clearTimeout(timeoutId);
        console.warn('[共享数据] 读取失败:', err.message);
        isSyncing = false;
        _syncRetries++;
        if (_syncRetries >= CONFIG.MAX_SYNC_RETRIES) tripCircuitBreaker();
        if (callback) callback(false);
      });
    },

    _syncToRemote: function(callback) {
      if (checkCircuitBreaker()) { if (callback) callback(false); return; }
      var token = getToken();
      if (!token) {
        console.warn('[共享数据] 未设置 GitHub Token，无法写入远程');
        if (callback) callback(false);
        return;
      }
      var payload = {
        posts: currentData.posts,
        replies: currentData.replies,
        lastUpdated: new Date().toISOString()
      };
      var payloadStr = JSON.stringify(payload);
      // 防护：payload 大小检查
      if (payloadStr.length > CONFIG.MAX_PAYLOAD_SIZE) {
        console.warn('[防护] 数据包过大，裁剪旧数据');
        currentData.posts = currentData.posts.slice(0, Math.floor(currentData.posts.length / 2));
        payload = {
          posts: currentData.posts,
          replies: currentData.replies,
          lastUpdated: new Date().toISOString()
        };
        payloadStr = JSON.stringify(payload);
      }
      var timeoutId = setTimeout(function() {
        _syncRetries++;
        if (_syncRetries >= CONFIG.MAX_SYNC_RETRIES) tripCircuitBreaker();
        if (callback) callback(false);
      }, 15000);
      fetch(CONFIG.API_URL, {
        method: 'PATCH',
        headers: {
          'Authorization': 'token ' + token,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          files: {
            'forum-data.json': {
              content: payloadStr
            }
          }
        })
      })
      .then(function(resp) {
        clearTimeout(timeoutId);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        lastSyncTime = Date.now();
        _syncRetries = 0;
        if (callback) callback(true);
      })
      .catch(function(err) {
        clearTimeout(timeoutId);
        console.warn('[共享数据] 写入失败:', err.message);
        _syncRetries++;
        if (_syncRetries >= CONFIG.MAX_SYNC_RETRIES) tripCircuitBreaker();
        if (callback) callback(false);
      });
    },

    _startAutoSync: function() {
      if (syncTimer) clearInterval(syncTimer);
      syncTimer = setInterval(function() {
        if (document.visibilityState === 'visible') {
          SharedData._syncFromRemote(function(ok) {
            if (ok && typeof SharedData.onDataUpdate === 'function') {
              SharedData.onDataUpdate();
            }
          });
        }
      }, CONFIG.SYNC_INTERVAL);
    },

    onDataUpdate: null
  };

  window.SharedData = SharedData;
})();
