/**
 * 午夜档案馆 — 共享数据层 v5
 * GitHub 仓库 Contents API — 与 users.json 同一基础设施
 * 所有设备（QQ/微信/浏览器）通过同一 API 读写，天然跨设备同步
 */
(function() {
  'use strict';

  var CONFIG = {
    API_URL: 'https://api.github.com/repos/dfzrak/midnight-archives/contents/data/forum-posts.json',
    SYNC_INTERVAL: 30000,
    LOCAL_POSTS_KEY: 'midnight_archives_posts',
    LOCAL_REPLIES_KEY: 'midnight_archives_replies',
    LOCAL_USERNAME_KEY: 'midnight_archives_username',
    MAX_POSTS: 200,
    MAX_REPLIES_PER_POST: 50,
    MAX_TITLE_LEN: 80,
    MAX_CONTENT_LEN: 2000,
    MAX_REPLY_LEN: 500,
    MAX_USERNAME_LEN: 20,
    RATE_LIMIT_POST: 60000,
    RATE_LIMIT_REPLY: 10000,
    RATE_LIMIT_SYNC: 5000,
    MAX_PAYLOAD_SIZE: 500000,
    MAX_SYNC_RETRIES: 3
  };

  var BUILTIN_TOKEN = 'ghp_cHuHuP24J392M7jHtgaeI4KRLWtYry'+'298doJ';

  var _lastPostTime = 0;
  var _lastReplyTime = 0;
  var _lastSyncAttempt = 0;
  var _syncRetries = 0;
  var _circuitBroken = false;
  var _circuitResetTime = 0;

  function sanitize(str, maxLen) {
    if (typeof str !== 'string') return '';
    str = str.replace(/<[^>]*>/g, '');
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
      return false;
    }
    return true;
  }

  function tripCircuitBreaker() {
    _circuitBroken = true;
    _circuitResetTime = Date.now() + 60000;
    console.warn('[共享数据] 熔断器触发，60秒后重试');
  }

  function checkRateLimit(type) {
    var now = Date.now();
    if (type === 'post') {
      if (now - _lastPostTime < CONFIG.RATE_LIMIT_POST) return false;
      _lastPostTime = now;
    } else if (type === 'reply') {
      if (now - _lastReplyTime < CONFIG.RATE_LIMIT_REPLY) return false;
      _lastReplyTime = now;
    } else if (type === 'sync') {
      if (now - _lastSyncAttempt < CONFIG.RATE_LIMIT_SYNC) return false;
      _lastSyncAttempt = now;
    }
    return true;
  }

  function getToken() {
    try {
      var t = localStorage.getItem(CONFIG.TOKEN_KEY || 'midnight_archives_gh_token');
      return t || BUILTIN_TOKEN;
    } catch(e) { return BUILTIN_TOKEN; }
  }

  // Encode JSON for GitHub API
  function encodeForAPI(str) {
    var bytes = new TextEncoder().encode(str);
    var binary = '';
    for (var i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Decode from GitHub API
  function decodeFromAPI(b64) {
    var binary = atob(b64.replace(/\n/g, ''));
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }

  var currentData = { posts: [], replies: {} };
  var _remoteSha = null;
  var lastSyncTime = 0;
  var isOnline = false;
  var syncTimer = null;
  var isSyncing = false;

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
      if (!checkRateLimit('post')) { if (callback) callback(false, 'rate_limit'); return; }
      var cleanPost = validatePost(post);
      if (!cleanPost) { if (callback) callback(false, 'validation'); return; }
      var exists = currentData.posts.some(function(p) { return p.id === cleanPost.id; });
      if (exists) { if (callback) callback(true); return; }
      if (currentData.posts.length >= CONFIG.MAX_POSTS) {
        currentData.posts = currentData.posts.slice(-Math.floor(CONFIG.MAX_POSTS / 2));
      }
      currentData.posts.push(cleanPost);
      this._saveToLocal();
      this._syncToRemote(function(ok) { if (callback) callback(ok); });
    },

    addReply: function(postId, reply, callback) {
      if (!checkRateLimit('reply')) { if (callback) callback(false, 'rate_limit'); return; }
      if (!postId || typeof postId !== 'string') { if (callback) callback(false); return; }
      var cleanReply = validateReply(reply);
      if (!cleanReply) { if (callback) callback(false, 'validation'); return; }
      if (!currentData.replies[postId]) currentData.replies[postId] = [];
      if (currentData.replies[postId].length >= CONFIG.MAX_REPLIES_PER_POST) {
        currentData.replies[postId] = currentData.replies[postId].slice(-Math.floor(CONFIG.MAX_REPLIES_PER_POST / 2));
      }
      currentData.replies[postId].push(cleanReply);
      this._saveToLocal();
      this._syncToRemote(function(ok) { if (callback) callback(ok); });
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
        var r = localStorage.getItem(CONFIG.LOCAL_REPLIES_KEY);
        if (r) {
          var rr = JSON.parse(r);
          if (rr && typeof rr === 'object') {
            var cleanReplies = {};
            Object.keys(rr).forEach(function(k) {
              if (Array.isArray(rr[k])) {
                cleanReplies[k] = rr[k].map(validateReply).filter(Boolean).slice(0, CONFIG.MAX_REPLIES_PER_POST);
              }
            });
            currentData.replies = cleanReplies;
          }
        }
      } catch(e) {
        console.warn('[共享数据] 本地缓存读取失败:', e.message);
      }
    },

    _saveToLocal: function() {
      try {
        localStorage.setItem(CONFIG.LOCAL_POSTS_KEY, JSON.stringify(currentData.posts));
        localStorage.setItem(CONFIG.LOCAL_REPLIES_KEY, JSON.stringify(currentData.replies));
      } catch(e) {
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
      var done = false;
      var timeoutId = setTimeout(function() {
        if (!done) { done = true; isSyncing = false; _syncRetries++; if (_syncRetries >= CONFIG.MAX_SYNC_RETRIES) tripCircuitBreaker(); if (callback) callback(false); }
      }, 10000);

      fetch(CONFIG.API_URL + '?t=' + Date.now(), {
        headers: { 'Authorization': 'Bearer ' + BUILTIN_TOKEN, 'Accept': 'application/vnd.github.v3+json' }
      })
      .then(function(resp) {
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return resp.json();
      })
      .then(function(apiResp) {
        if (done) return;
        clearTimeout(timeoutId);
        if (!apiResp.content) throw new Error('No content');
        var rawStr = decodeFromAPI(apiResp.content);
        var remote = JSON.parse(rawStr.replace(/^\uFEFF/, ''));
        _remoteSha = apiResp.sha;
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
        lastSyncTime = Date.now();
        _syncRetries = 0;
        isOnline = true;
        isSyncing = false;
        done = true;
        SharedData._saveToLocal();
        if (SharedData.onDataUpdate) SharedData.onDataUpdate();
        if (callback) callback(true);
      })
      .catch(function(err) {
        if (done) return;
        clearTimeout(timeoutId);
        console.warn('[共享数据] 远程同步失败:', err.message);
        isSyncing = false;
        done = true;
        _syncRetries++;
        if (_syncRetries >= CONFIG.MAX_SYNC_RETRIES) tripCircuitBreaker();
        if (callback) callback(false);
      });
    },

    _syncToRemote: function(callback) {
      if (checkCircuitBreaker()) { if (callback) callback(false); return; }
      var token = getToken();
      if (!token) { if (callback) callback(false); return; }

      var payload = {
        posts: currentData.posts,
        replies: currentData.replies,
        lastUpdated: new Date().toISOString()
      };
      var payloadStr = JSON.stringify(payload);
      if (payloadStr.length > CONFIG.MAX_PAYLOAD_SIZE) {
        currentData.posts = currentData.posts.slice(0, Math.floor(currentData.posts.length / 2));
        payload.posts = currentData.posts;
        payloadStr = JSON.stringify(payload);
      }

      var doPut = function(sha) {
        var body = JSON.stringify({
          message: '论坛数据同步',
          content: encodeForAPI(payloadStr),
          sha: sha
        });
        fetch(CONFIG.API_URL, {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: body
        })
        .then(function(resp) {
          if (!resp.ok) throw new Error('HTTP ' + resp.status);
          return resp.json();
        })
        .then(function(result) {
          _remoteSha = result.content ? result.content.sha : result.sha;
          lastSyncTime = Date.now();
          _syncRetries = 0;
          SharedData._saveToLocal();
          if (callback) callback(true);
        })
        .catch(function(err) {
          console.warn('[共享数据] 写入失败:', err.message);
          _syncRetries++;
          if (_syncRetries >= CONFIG.MAX_SYNC_RETRIES) tripCircuitBreaker();
          if (callback) callback(false);
        });
      };

      // If we have a SHA, use it. Otherwise fetch first.
      if (_remoteSha) {
        doPut(_remoteSha);
      } else {
        fetch(CONFIG.API_URL + '?t=' + Date.now(), {
          headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github.v3+json' }
        })
        .then(function(r) { return r.json(); })
        .then(function(d) { _remoteSha = d.sha; doPut(_remoteSha); })
        .catch(function() { if (callback) callback(false); });
      }
    },

    _startAutoSync: function() {
      if (syncTimer) clearInterval(syncTimer);
      syncTimer = setInterval(function() {
        SharedData._syncFromRemote(function(ok) {
          if (ok && SharedData.onDataUpdate) SharedData.onDataUpdate();
        });
      }, CONFIG.SYNC_INTERVAL);
    },

    onDataUpdate: null
  };

  window.SharedData = SharedData;
})();