/**
 * 午夜档案馆 — 共享数据层 v2
 * 使用 GitHub 仓库中的 JSON 文件作为跨用户共享数据库
 * - 读取：raw.githubusercontent.com（免费，无限制，无需认证）
 * - 写入：GitHub API（需要 token）
 * - localStorage 作为离线缓存和降级方案
 */
(function() {
  'use strict';

  // ===== 配置 =====
  var CONFIG = {
    GIST_ID: '515f358b8f3b72deb914a827aecf5833',
    GIST_FILE: 'forum-data.json',
    TOKEN_KEY: 'midnight_archives_gh_token',
    RAW_URL: 'https://api.github.com/gists/515f358b8f3b72deb914a827aecf5833',
    API_URL: 'https://api.github.com/gists/515f358b8f3b72deb914a827aecf5833',
    SYNC_INTERVAL: 30000,
    LOCAL_POSTS_KEY: 'midnight_archives_posts',
    LOCAL_REPLIES_KEY: 'midnight_archives_replies',
    LOCAL_USERNAME_KEY: 'midnight_archives_username'
  };

  // Token 从 localStorage 读取（用户首次使用时设置）
  function getToken() {
    try { return localStorage.getItem(CONFIG.TOKEN_KEY) || ''; }
    catch(e) { return ''; }
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
      if (!post || !post.id) { if (callback) callback(false); return; }
      var exists = currentData.posts.some(function(p) { return p.id === post.id; });
      if (exists) { if (callback) callback(true); return; }
      currentData.posts.unshift(post);
      this._saveToLocal();
      this._syncToRemote(function(ok) { if (callback) callback(ok); });
    },

    addReply: function(postId, reply, callback) {
      if (!postId || !reply) { if (callback) callback(false); return; }
      if (!currentData.replies[postId]) currentData.replies[postId] = [];
      var isDup = currentData.replies[postId].some(function(r) {
        return r.time === reply.time && r.text === reply.text;
      });
      if (isDup) { if (callback) callback(true); return; }
      currentData.replies[postId].push(reply);
      this._saveToLocal();
      this._syncToRemote(function(ok) { if (callback) callback(ok); });
    },

    isOnline: function() { return isOnline; },

    setGitHubToken: function(token) {
      setToken(token);
      console.log('[共享数据] GitHub Token 已保存');
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
        if (p) { var pp = JSON.parse(p); if (Array.isArray(pp)) currentData.posts = pp; }
      } catch(e) {}
      try {
        var r = localStorage.getItem(CONFIG.LOCAL_REPLIES_KEY);
        if (r) { var rr = JSON.parse(r); if (rr && typeof rr === 'object') currentData.replies = rr; }
      } catch(e) {}
    },

    _saveToLocal: function() {
      try {
        localStorage.setItem(CONFIG.LOCAL_POSTS_KEY, JSON.stringify(currentData.posts));
        localStorage.setItem(CONFIG.LOCAL_REPLIES_KEY, JSON.stringify(currentData.replies));
      } catch(e) {}
    },

    _syncFromRemote: function(callback) {
      if (isSyncing) { if (callback) callback(false); return; }
      isSyncing = true;
      fetch(CONFIG.RAW_URL)
      .then(function(resp) {
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return resp.json();
      })
      .then(function(gist) {
        var file = gist.files && gist.files[CONFIG.GIST_FILE];
        if (!file || !file.content) throw new Error('Gist 文件不存在');
        var remote = JSON.parse(file.content.replace(/^\uFEFF/, ''));
        if (remote.posts && Array.isArray(remote.posts)) {
          currentData.posts = remote.posts;
        }
        if (remote.replies && typeof remote.replies === 'object') {
          currentData.replies = remote.replies;
        }
        SharedData._saveToLocal();
        lastSyncTime = Date.now();
        isSyncing = false;
        if (callback) callback(true);
      })
      .catch(function(err) {
        console.warn('[共享数据] 读取失败:', err.message);
        isSyncing = false;
        if (callback) callback(false);
      });
    },

    _syncToRemote: function(callback) {
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
              content: JSON.stringify(payload)
            }
          }
        })
      })
      .then(function(resp) {
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        lastSyncTime = Date.now();
        if (callback) callback(true);
      })
      .catch(function(err) {
        console.warn('[共享数据] 写入失败:', err.message);
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
