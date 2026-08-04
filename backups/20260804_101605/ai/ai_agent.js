/**
 * 午夜档案馆 — AI Agent 核心 v1
 * 
 * 智能路由器：接收用户意图 → 分发到对应 AI 模块 → 返回结果
 * 
 * 三大核心能力：
 * 1. 故事润色 — 优化投稿文风，自动生成标题
 * 2. 内容审核 — 敏感词检测，质量评分
 * 3. 视频生成调度 — 文字 → 视频脚本 → 素材匹配
 */

(function() {
  'use strict';

  // ===== 配置 =====
  const AGENT_CONFIG = {
    // 免费用户每日 AI 使用次数
    FREE_DAILY_LIMIT: 3,
    // 会员每日 AI 使用次数
    MEMBER_DAILY_LIMIT: 50,
    // 敏感词列表（基础版）
    BLOCKED_WORDS: [],
    // 内容质量阈值（1-10分，低于此分需人工审核）
    QUALITY_THRESHOLD: 4,
  };

  // ===== 意图识别 =====
  function detectIntent(input) {
    const text = (input || '').toLowerCase();
    
    const patterns = {
      polish: /润色|优化|改写|改一下|帮我写|润文|美化|文笔|帮我改/,
      moderate: /审核|检查|审查|敏感|违禁|合不合规|能不能发/,
      title: /标题|起名|起个名字|帮我想个|标题怎么写|取标题/,
      video: /短视频|做视频|生成视频|发布|抖音|剪映|素材/,
      analyze: /分析|数据|统计|多少阅读|多少赞|趋势/,
      classify: /分类|归类|属于什么|哪一类/,
      summarize: /总结|概括|摘要|缩写|缩短/,
      expand: /展开|扩写|加长|写长|丰富|润色扩展/,
      reply: /回复|回帖|评论|怎么回|帮我想个回复/,
    };

    for (const [intent, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) return intent;
    }

    // 默认：如果输入较长，可能是投稿内容需要综合处理
    if (text.length > 50) return 'comprehensive';
    return 'unknown';
  }

  // ===== 核心：故事润色引擎 =====
  function polishStory(content, options = {}) {
    const result = {
      original: content,
      polished: content,
      title: '',
      improvements: [],
      readabilityScore: 0,
    };

    if (!content || content.length < 10) {
      result.improvements.push('内容过短，无法润色');
      return result;
    }

    let text = content;

    // 1. 段落优化 — 长段落拆分
    const paragraphs = text.split(/\n+/).filter(p => p.trim());
    const improvedParagraphs = paragraphs.map(p => {
      // 超过300字的段落拆分
      if (p.length > 300) {
        const sentences = p.match(/[^。！？\n]+[。！？]?/g) || [p];
        let result = '';
        let current = '';
        for (const s of sentences) {
          if ((current + s).length > 150) {
            result += current.trim() + '\n\n';
            current = s;
          } else {
            current += s;
          }
        }
        if (current) result += current.trim();
        return result;
      }
      return p;
    });

    text = improvedParagraphs.join('\n\n');
    if (text !== content) {
      result.improvements.push('长段落已拆分，提升可读性');
    }

    // 2. 标点规范化
    const punctuationFixes = [];
    let fixed = text
      // 中英文标点混用 → 统一中文标点
      .replace(/([^a-zA-Z\d]),\s*/g, '$1，')
      .replace(/([^a-zA-Z\d])\.\s*/g, '$1。')
      // 多余空格
      .replace(/[ ]{2,}/g, ' ')
      // 连续标点
      .replace(/[。！？]{3,}/g, m => m[0] + m[0] + m[0])
      // 缺失句号
      .replace(/([^。！？\n])\n/g, (m, c) => c + '。\n');

    if (fixed !== text) {
      punctuationFixes.push('标点符号已规范化');
    }
    text = fixed;

    // 3. 常见网络用语 → 书面化
    const slangMap = {
      'u1s1': '有一说一',
      'yyds': '永远的神',
      'awsl': '啊我死了',
      'xswl': '笑死我了',
      'srds': '虽然但是',
      'nsdd': '你说得对',
      'bdjw': '不懂就问',
      'zqsg': '真情实感',
      'dbq': '对不起',
      'pyq': '朋友圈',
    };

    for (const [slang, formal] of Object.entries(slangMap)) {
      const regex = new RegExp(slang, 'gi');
      if (regex.test(text)) {
        text = text.replace(regex, formal);
        punctuationFixes.push(`"${slang}" → "${formal}"`);
      }
    }

    result.improvements = [...result.improvements, ...punctuationFixes];

    // 4. 阅读质量评分（基于规则）
    let score = 5; // 基准分
    if (text.length > 500) score += 1;
    if (text.length > 1000) score += 1;
    if (text.includes('\n\n')) score += 1; // 有段落分隔
    if (/[「」『』《》]/.test(text)) score += 0.5; // 使用了中文书名号
    if (text.length < 50) score -= 3;
    if (/[,.]/.test(text.replace(/[^,.]/g, '')) && text.match(/[,.]/g).length > text.match(/[，。]/g).length) score -= 1;
    result.readabilityScore = Math.min(10, Math.max(1, score));

    // 5. 自动生成标题
    result.title = generateTitle(text);

    result.polished = text;
    return result;
  }

  function generateTitle(content) {
    if (!content || content.length < 10) return '';

    // 取前200字做标题生成
    const snippet = content.substring(0, 200);

    // 策略1：提取含有「是」「在」「有」「被」「让」等关键词的句子
    const keySentences = snippet.match(/[^。！？\n]+[。！？]?/g) || [];

    for (const s of keySentences) {
      if (s.length >= 8 && s.length <= 30 && /[是在有被让把从因与和跟].*[了过到]/.test(s)) {
        return s.replace(/[。！？]$/, '').trim();
      }
    }

    // 策略2：找最长的中间句子
    const mid = keySentences[Math.floor(keySentences.length / 2)];
    if (mid && mid.length >= 10 && mid.length <= 35) {
      return mid.replace(/[。！？]$/, '').trim();
    }

    // 策略3：截取
    return snippet.substring(0, 25).replace(/[。！？]$/, '').trim() + '…';
  }

  // ===== 内容审核引擎 =====
  function moderateContent(content) {
    const result = {
      passed: true,
      score: 10,
      flags: [],
      suggestions: [],
    };

    if (!content || content.length < 5) {
      result.passed = false;
      result.score = 1;
      result.flags.push('内容过短');
      result.suggestions.push('请至少输入5个字');
      return result;
    }

    // 敏感词检测
    const lower = content.toLowerCase();
    for (const word of AGENT_CONFIG.BLOCKED_WORDS) {
      if (lower.includes(word.toLowerCase())) {
        result.flags.push(`包含敏感词: "${word}"`);
        result.passed = false;
        result.score -= 3;
      }
    }

    // 纯数字/符号检测
    const meaningfulChars = content.replace(/[0-9\s\p{P}]/gu, '').length;
    const ratio = meaningfulChars / content.length;
    if (ratio < 0.3) {
      result.flags.push('有效文字占比过低');
      result.score -= 4;
    }

    // 重复内容检测
    const deduped = new Set(content.substring(0, 50).split(''));
    if (deduped.size < 5 && content.length > 20) {
      result.flags.push('疑似重复/无意义内容');
      result.score -= 3;
    }

    // 全大写/全英文检测（中文社区）
    if (/^[A-Z\s!?,.]+$/.test(content.trim()) && content.length > 20) {
      result.flags.push('全英文/全大写内容，建议添加中文');
      result.score -= 1;
    }

    // URL 检测
    const urls = content.match(/https?:\/\/[^\s]+/g);
    if (urls && urls.length > 2) {
      result.flags.push('包含多个链接，疑似广告');
      result.score -= 2;
    }

    result.passed = result.score >= AGENT_CONFIG.QUALITY_THRESHOLD;

    // 生成建议
    if (result.score < 6) {
      result.suggestions.push('内容质量偏低，建议丰富细节后再提交');
    }
    if (content.length < 50) {
      result.suggestions.push('故事较短，试试补充更多情节');
    }
    if (!content.includes('。')) {
      result.suggestions.push('建议添加标点符号，提升可读性');
    }

    return result;
  }

  // ===== 视频脚本生成 =====
  function generateVideoScript(story) {
    if (!story || story.length < 20) {
      return { error: '内容过短，无法生成视频脚本' };
    }

    const script = {
      title: generateTitle(story),
      scenes: [],
      musicStyle: 'dark_ambient',
      totalDuration: 0,
    };

    // 将故事按段落拆分为场景
    const paragraphs = story.split(/\n+/).filter(p => p.trim());
    
    paragraphs.forEach((para, i) => {
      // 每段生成一个场景
      const scene = {
        index: i + 1,
        text: para.trim(),
        duration: Math.max(2, Math.min(8, Math.ceil(para.length / 15))), // 每15字约1秒
        visualStyle: i % 3 === 0 ? 'door_open' : i % 3 === 1 ? 'archive_shelf' : 'typewriter',
        transition: i < paragraphs.length - 1 ? 'fade' : null,
      };
      script.scenes.push(scene);
      script.totalDuration += scene.duration;
    });

    // 限制总时长在15-60秒
    if (script.totalDuration > 60) {
      script.scenes = script.scenes.slice(0, 5);
      script.totalDuration = script.scenes.reduce((sum, s) => sum + s.duration, 0);
    }

    return script;
  }

  // ===== 内容分类 =====
  function classifyStory(content) {
    const text = (content || '').toLowerCase();
    const categories = {
      supernatural: { label: '超自然', keywords: ['鬼', '灵魂', '超自然', '灵异', '幽灵', '怪', '不可思议', '神秘消失'] },
      thriller: { label: '悬疑惊悚', keywords: ['杀', '死', '恐', '吓', '血', '失踪', '密室', '凶手', '追踪', '逃'] },
      romance: { label: '情感故事', keywords: ['爱', '恋', '分手', '想念', '暗恋', '表白', '初恋', '婚礼', '前任'] },
      mystery: { label: '未解之谜', keywords: ['秘密', '谜', '密码', '暗号', '发现', '隐藏', '日记', '档案', '真相'] },
      urban: { label: '都市传说', keywords: ['都市', '城市', '地铁', '公寓', '楼', '电梯', '深夜', '值班', '监控'] },
      dream: { label: '梦境', keywords: ['梦', '梦见', '醒来', '失眠', '噩梦', '清醒梦', '幻觉'] },
      other: { label: '其他', keywords: [] },
    };

    const scores = {};
    for (const [key, cat] of Object.entries(categories)) {
      scores[key] = cat.keywords.reduce((s, kw) => s + (text.includes(kw) ? 1 : 0), 0);
    }

    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    return {
      category: best[0],
      label: categories[best[0]].label,
      confidence: Math.min(1, best[1] / 3),
    };
  }

  // ===== 智能回复建议 =====
  function suggestReply(postContent, tone = 'neutral') {
    if (!postContent) return [];
    
    const suggestions = [];
    const len = postContent.length;

    if (len > 500) {
      suggestions.push('写得真好，一口气读完了。期待更多故事！');
    }
    if (/超自然|灵异|鬼|怪|神秘/.test(postContent)) {
      suggestions.push('这也太诡异了……后来呢？');
    }
    if (/爱|恋|分手|想念/.test(postContent)) {
      suggestions.push('感同身受，有些故事注定没有结局。');
    }
    if (/秘密|真相|档案/.test(postContent)) {
      suggestions.push('这背后的秘密，恐怕还没完全揭开……');
    }
    
    // 通用备选
    suggestions.push('深夜刷到这条，好像打开了不该看的东西 👁');
    suggestions.push('收藏了。凌晨三点的档案馆里又多了一份档案 📂');

    // 去重并返回前3个
    return [...new Set(suggestions)].slice(0, 3);
  }

  // ===== 主处理管道 =====
  function processStory(content, options = {}) {
    const intent = options.intent || detectIntent(content);

    const result = {
      intent: intent,
      timestamp: new Date().toISOString(),
    };

    switch (intent) {
      case 'comprehensive':
      case 'polish':
        result.polish = polishStory(content, options);
        result.classification = classifyStory(content);
        result.moderation = moderateContent(content);
        // 如果质量通过，同时生成视频脚本
        if (result.moderation.passed) {
          result.videoScript = generateVideoScript(result.polish.polished);
        }
        break;

      case 'moderate':
        result.moderation = moderateContent(content);
        break;

      case 'title':
        result.title = generateTitle(content);
        break;

      case 'video':
        result.videoScript = generateVideoScript(content);
        break;

      case 'classify':
        result.classification = classifyStory(content);
        break;

      case 'expand':
        result.polish = polishStory(content, { ...options, expand: true });
        break;

      case 'summarize':
        result.summary = content.length > 100 
          ? content.substring(0, 100).replace(/[^。！？]*$/, '') + '…'
          : content;
        break;

      case 'reply':
        result.replySuggestions = suggestReply(
          options.postContent || content,
          options.tone
        );
        break;

      default:
        // 未知意图，进行全面分析
        result.polish = polishStory(content, options);
        result.classification = classifyStory(content);
        result.moderation = moderateContent(content);
        break;
    }

    return result;
  }

  // ===== 使用配额管理 =====
  let dailyUsage = 0;
  let dailyResetDate = new Date().toDateString();

  function checkQuota(isMember) {
    const today = new Date().toDateString();
    if (today !== dailyResetDate) {
      dailyUsage = 0;
      dailyResetDate = today;
    }

    const limit = isMember ? AGENT_CONFIG.MEMBER_DAILY_LIMIT : AGENT_CONFIG.FREE_DAILY_LIMIT;
    if (dailyUsage >= limit) {
      return { allowed: false, used: dailyUsage, limit, message: '今日 AI 使用次数已用完，明天再来吧 🌙' };
    }

    dailyUsage++;
    return { allowed: true, used: dailyUsage, limit };
  }

  // ===== 公开 API =====
  const AIAgent = {
    CONFIG: AGENT_CONFIG,

    /**
     * 处理用户输入
     * @param {string} content - 用户输入内容
     * @param {object} options - 选项 { intent, postContent, tone, isMember }
     * @returns {object} AI 处理结果
     */
    process: function(content, options = {}) {
      // 配额检查
      const quota = checkQuota(options.isMember || false);
      if (!quota.allowed) {
        return { error: quota.message, quota };
      }

      const result = processStory(content, options);
      result.quota = quota;
      return result;
    },

    /**
     * 润色故事
     */
    polish: function(content) {
      return polishStory(content);
    },

    /**
     * 审核内容
     */
    moderate: function(content) {
      return moderateContent(content);
    },

    /**
     * 生成标题
     */
    generateTitle: function(content) {
      return generateTitle(content);
    },

    /**
     * 生成视频脚本
     */
    generateVideoScript: function(story) {
      return generateVideoScript(story);
    },

    /**
     * 内容分类
     */
    classify: function(content) {
      return classifyStory(content);
    },

    /**
     * 智能回复建议
     */
    suggestReply: function(postContent, tone) {
      return suggestReply(postContent, tone);
    },

    /**
     * 意图识别
     */
    detectIntent: function(input) {
      return detectIntent(input);
    },

    /**
     * 获取配额信息
     */
    getQuota: function(isMember) {
      const today = new Date().toDateString();
      if (today !== dailyResetDate) {
        dailyUsage = 0;
        dailyResetDate = today;
      }
      return {
        used: dailyUsage,
        limit: isMember ? AGENT_CONFIG.MEMBER_DAILY_LIMIT : AGENT_CONFIG.FREE_DAILY_LIMIT,
        resetDate: dailyResetDate,
      };
    },
  };

  // 暴露到全局
  window.MidnightAI = AIAgent;
  console.log('[AI Agent] 午夜档案馆 AI 核心已就绪');
})();
