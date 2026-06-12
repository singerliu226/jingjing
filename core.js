(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.DesignDeskCore = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  const STORAGE_KEY = "jingjing-workbench-state-v2";

  const projectTypes = [
    { key: "poster", label: "海报", words: ["海报", "主视觉", "kv", "key visual"] },
    { key: "social", label: "社媒图", words: ["小红书", "公众号", "朋友圈", "微博", "社媒", "封面", "头图"] },
    { key: "brand", label: "品牌", words: ["品牌", "logo", "标志", "vi", "视觉识别"] },
    { key: "print", label: "印刷物", words: ["印刷", "折页", "画册", "包装", "出血", "cmyk"] },
    { key: "ppt", label: "PPT", words: ["ppt", "演示", "提案", "汇报"] },
    { key: "banner", label: "Banner", words: ["banner", "横幅", "广告位", "开屏"] },
  ];

  const fuzzyFeedback = [
    {
      word: "太普通",
      action: "增强视觉记忆点：提高主标题对比，加入更明确的视觉锚点或风格化图形。",
      reason: "反馈指向差异化不足，需要让画面被快速记住。",
    },
    {
      word: "太暗",
      action: "提高整体明度和关键元素对比，检查背景色与主体色是否压住信息层级。",
      reason: "画面情绪偏沉，可能影响年轻感和传播效率。",
    },
    {
      word: "年轻",
      action: "尝试更轻快的配色、更大的留白、更鲜明的标题节奏或更灵动的图形语言。",
      reason: "目标调性从稳重转向更有活力。",
    },
    {
      word: "高级",
      action: "减少装饰，统一字体和色彩数量，强化留白、材质质感与细节克制。",
      reason: "高级感通常来自秩序、克制和材质细节。",
    },
    {
      word: "活泼",
      action: "增加节奏变化、辅助图形、跳色或更轻松的排版动势。",
      reason: "活泼感来自视觉节奏和情绪张力。",
    },
    {
      word: "不够突出",
      action: "重新建立信息层级：放大主标题或主图，降低次要信息的视觉重量。",
      reason: "用户可能无法第一眼抓到核心信息。",
    },
    {
      word: "看不清",
      action: "检查字号、行距、对比度和移动端安全区，优先保证主信息可读。",
      reason: "可读性问题会直接影响交付质量。",
    },
  ];

  const conflictPairs = [
    ["高级", "活泼"],
    ["极简", "热闹"],
    ["年轻", "稳重"],
    ["信息多", "留白"],
  ];

  const designIssueRules = [
    {
      key: "layout_hierarchy",
      label: "版式层级不清",
      words: ["画面乱", "太乱", "层级不清", "没层级", "重点不突出", "信息太多", "太挤"],
      actions: [
        "先只保留一个第一视觉：主标题或主图二选一放大，其他信息降一级。",
        "把信息分成主标题、利益点、时间地点/说明三层，字号和字重只用 2-3 档。",
        "删除或合并重复装饰，让留白围绕主信息，而不是平均撒在四周。",
      ],
      nextStep: "先做一版黑白稿检查层级，确认第一眼能读到什么，再加颜色和装饰。",
    },
    {
      key: "color",
      label: "色彩不舒服",
      words: ["颜色怪", "颜色乱", "颜色有点乱", "不统一", "太暗", "太灰", "不年轻", "不够年轻", "不够亮"],
      actions: [
        "先定一个主色、一个辅助色、一个强调色，其他颜色暂时收掉。",
        "检查背景和文字对比，主信息区域优先提高明度差。",
        "如果要更年轻，优先调整明度和饱和度，不要同时增加太多跳色。",
      ],
      nextStep: "先复制一版，只改色彩数量和明度对比，暂时不动版式。",
    },
    {
      key: "typography",
      label: "字体和可读性问题",
      words: ["字体乱", "字太多", "看不清", "可读性", "字号", "字距", "标题弱"],
      actions: [
        "限制字体到 1-2 个家族，用字重和字号建立变化。",
        "移动端物料先用手机尺寸预览，保证主标题和关键信息能在 3 秒内读完。",
        "正文信息减少长句，改成短行或分组，不要让文字块贴边。",
      ],
      nextStep: "先把所有文字按重要性排序，再决定哪些必须上画面，哪些可以弱化。",
    },
    {
      key: "style",
      label: "风格不够明确",
      words: ["太普通", "不好看", "没感觉", "没记忆点", "不高级", "不精致", "没创意"],
      actions: [
        "先提炼 2-3 个视觉关键词，避免同时追求很多风格。",
        "给画面增加一个可记住的视觉锚点：特殊构图、图形符号、材质或标题处理。",
        "高级感优先来自秩序和克制：减少颜色、统一间距、提高素材质量。",
      ],
      nextStep: "先做 2 个方向小稿：一个更克制，一个更有视觉记忆点，再对比哪个更贴 brief。",
    },
  ];

  function createSeedState(now = new Date()) {
    const today = formatDate(now);
    return {
      activeProjectId: "p-first",
      activeFilter: "all",
      activeMode: "brief",
      messages: [
        {
          id: uid("m"),
          role: "agent",
          projectId: "p-first",
          createdAt: now.toISOString(),
          text:
            "菁菁，先从一个真实项目开始。右侧写下这次要做什么、什么时候交、最后要交哪些图；或者直接在下面输入一句需求，我会帮你整理成今天要做的事。",
        },
      ],
      projects: [
        {
          id: "p-first",
          name: "第一个设计项目",
          type: "设计项目",
          source: "菁菁",
          goal: "",
          audience: "",
          scene: "",
          keywords: [],
          deliverables: [],
          dueDate: "",
          status: "todo",
          portfolioScore: 35,
          risks: ["缺少设计目标", "缺少交付物清单", "缺少截止时间"],
          versions: [],
          portfolio: {
            background: "",
            problem: "",
            strategy: "",
            process: "",
            result: "",
            reflection: "",
            interviewScript: "",
          },
        },
      ],
      tasks: [
        {
          id: "t-first",
          projectId: "p-first",
          title: "先写下这个项目要做什么",
          priority: "high",
          dueDate: today,
          status: "todo",
          nextAction: "在右侧小纸条里写几句就行",
          feedbackIds: [],
        },
      ],
      feedback: [],
      checklist: [
        { id: "c-first-1", projectId: "p-first", label: "确认尺寸、用途和交付格式", done: false, group: "规格" },
        { id: "c-first-2", projectId: "p-first", label: "检查主信息层级和移动端可读性", done: false, group: "可读性" },
        { id: "c-first-3", projectId: "p-first", label: "整理源文件、导出文件和命名", done: false, group: "交付" },
      ],
    };
  }

  function uid(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function formatDate(date) {
    return new Date(date).toISOString().slice(0, 10);
  }

  function addDays(date, amount) {
    const next = new Date(date);
    next.setDate(next.getDate() + amount);
    return next;
  }

  function normalize(text) {
    return String(text || "").trim();
  }

  function detectProjectType(text) {
    const lower = text.toLowerCase();
    const matched = projectTypes.filter((type) => type.words.some((word) => lower.includes(word)));
    if (!matched.length) return { label: "设计项目", deliverables: [] };
    const deliverables = matched.map((item) => item.label);
    return { label: deliverables.join(" / "), deliverables };
  }

  function detectStatus(text) {
    if (/等|等待|待确认|待反馈|没给|还没给|已发给.*看|已经发给.*看|发给.*看了/.test(text)) return "waiting";
    if (/完成了|已完成|已经完成|做完了|已经做完|交付完成|已交付|已提交|过稿|定稿/.test(text)) return "done";
    if (/修改|调整|改|优化|设计中|出/.test(text)) return "designing";
    return "todo";
  }

  function detectDueDate(text, now = new Date()) {
    const fullDate = text.match(/(20\d{2})[年/.-](\d{1,2})[月/.-](\d{1,2})[日号]?/);
    if (fullDate) {
      return `${fullDate[1]}-${String(fullDate[2]).padStart(2, "0")}-${String(fullDate[3]).padStart(2, "0")}`;
    }
    if (/今天|今晚|下班前/.test(text)) return formatDate(now);
    if (/明天|明早|明晚/.test(text)) return formatDate(addDays(now, 1));
    if (/后天/.test(text)) return formatDate(addDays(now, 2));
    const relativeDays = text.match(/(\d{1,2})\s*天后/);
    if (relativeDays) return formatDate(addDays(now, Number(relativeDays[1])));
    const monthDay = text.match(/(\d{1,2})[月/.-](\d{1,2})[日号]?/);
    if (monthDay) {
      const year = now.getFullYear();
      return `${year}-${String(monthDay[1]).padStart(2, "0")}-${String(monthDay[2]).padStart(2, "0")}`;
    }
    const weekday = text.match(/(?:这周|本周|下周|周)([一二三四五六日天])/);
    if (weekday) {
      const map = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 };
      const target = map[weekday[1]];
      const current = now.getDay();
      let offset = (target - current + 7) % 7 || 7;
      if (/下周/.test(text)) offset += 7;
      return formatDate(addDays(now, offset));
    }
    return "";
  }

  function detectPeople(text) {
    const people = ["主管", "老板", "客户", "运营", "产品", "市场", "同事", "甲方"];
    return people.find((person) => text.includes(person)) || "";
  }

  function detectFeedback(text) {
    const hits = fuzzyFeedback.filter((item) => text.includes(item.word));
    const conflict = conflictPairs.some(([a, b]) => text.includes(a) && text.includes(b));
    if (!hits.length && !/说|反馈|觉得|希望|要求|建议/.test(text)) return null;
    return {
      raw: text,
      action: hits.length
        ? hits.map((hit) => hit.action).join(" ")
        : "把反馈拆成可执行项：确认目标、优先级和具体修改范围后再动手。",
      reason: hits.length ? hits.map((hit) => hit.reason).join(" ") : "原始反馈偏模糊，需要先转译成设计动作。",
      conflict,
    };
  }

  function detectDesignIssue(text) {
    const matched = designIssueRules.filter((rule) => rule.words.some((word) => text.includes(word)));
    if (!matched.length && !/不知道怎么改|怎么改|怎么优化|卡住了|没思路|没灵感/.test(text)) return null;
    const rules = matched.length ? matched : [designIssueRules[0]];
    return {
      keys: rules.map((rule) => rule.key),
      labels: rules.map((rule) => rule.label),
      actions: Array.from(new Set(rules.flatMap((rule) => rule.actions))).slice(0, 5),
      nextStep: rules[0].nextStep,
    };
  }

  function extractDeliverables(text) {
    const deliverables = [];
    const patterns = [
      "公众号头图",
      "朋友圈海报",
      "小红书封面",
      "社群长图",
      "开业海报",
      "海报",
      "Banner",
      "banner",
      "PPT",
      "包装",
      "画册",
      "折页",
      "源文件",
    ];
    patterns.forEach((item) => {
      if (text.includes(item) && !deliverables.includes(item)) deliverables.push(item);
    });
    return deliverables;
  }

  function guessProjectName(text, fallbackProject) {
    const quoted = text.match(/[「《](.+?)[」》]/);
    if (quoted) return quoted[1];
    const named = text.match(/(?:项目|做|关于|给|为)([\u4e00-\u9fa5A-Za-z0-9·\s]{2,16})(?:的|要|需要|客户|主管|老板|$)/);
    if (named) return named[1].trim();
    return fallbackProject ? fallbackProject.name : "未命名设计项目";
  }

  function detectBehavior(text, analysisBits = {}) {
    if (!text) return "empty";
    if (/今天.*(做什么|安排)|今日.*安排|先做什么|排一下|计划一下/.test(text)) return "ask_plan";
    if (/日报|今天总结|工作总结|周报/.test(text)) return "ask_summary";
    if (/自检|帮我看看|提交前|会被问|检查一下|哪里有问题/.test(text)) return "ask_review";
    if (/任务.*(延后|延期|推迟|改到)|延后到|延期到|推迟到/.test(text) && analysisBits.dueDate) return "snooze_task";
    if (/取消|删除|不用做|不用了|先不做|撤掉/.test(text)) return "cancel_task";
    if (/交付检查.*(完成|勾完|都好了)|检查项.*(完成|勾完|都好了)/.test(text)) return "complete_checklist";
    if (/交付检查|导出检查|检查.*(出血|转曲|源文件|打包)|清单/.test(text)) return "ask_checklist";
    if (/作品集|归档|面试|复盘|案例/.test(text)) return "ask_portfolio";
    if (/(v|V)\s*\d+|第[一二三四五六七八九十\d]+版|版本/.test(text)) return "record_version";
    if (/项目名|项目名称|名字.*(改成|改为|叫)|名称.*(改成|改为)/.test(text)) return "update_project_name";
    if (/项目类型|设计类型|类型.*(改成|改为|是)|类别.*(改成|改为|是)/.test(text)) return "update_project_type";
    if (/客户|老板|主管|甲方|运营|产品/.test(text) && /确认了|通过了|回复了|同意了|ok了|OK了/.test(text)) return "clear_waiting";
    if (/反馈.*(处理好了|改完了|已处理|完成)|修改.*(完成|改完)/.test(text)) return "mark_feedback_handled";
    if (analysisBits.meta && (analysisBits.meta.name || analysisBits.meta.type)) return analysisBits.meta.name ? "update_project_name" : "update_project_type";
    if (analysisBits.meta && (analysisBits.meta.specs || analysisBits.meta.formats)) return "update_project_specs";
    if (analysisBits.createsProject) return "create_project";
    if (analysisBits.designIssue && /不知道|怎么改|怎么优化|卡住了|没思路|没灵感/.test(text)) return "solve_design_issue";
    if (analysisBits.feedback) return "record_feedback";
    if (analysisBits.designIssue) return "solve_design_issue";
    if (/完成了|已完成|已经完成|做完了|已经做完|已提交|已发给|已交付|过稿|定稿/.test(text)) return "complete_progress";
    if (/等|等待|待确认|待反馈|还没回|没回复|没确认|已发给.*看|已经发给.*看|发给.*看了/.test(text)) return "waiting_confirmation";
    if (/改到|延期|延后|提前|截止|什么时候交|交期|ddl|deadline/i.test(text) && analysisBits.dueDate) return "update_deadline";
    if (/目标|受众|人群|场景|投放|用途|解决|给.*看|出现在哪里/.test(text)) return "update_brief";
    if (analysisBits.deliverables && analysisBits.deliverables.length) return "update_deliverables";
    return "record_note";
  }

  function extractProjectMeta(text) {
    const meta = {};
    const name = text.match(/(?:项目名|项目名称|名字|名称)(?:改成|改为|叫|是|：|:)?[「《“"]?([^」》”。"，,]{2,30})/);
    if (name) meta.name = name[1].trim();
    const type = text.match(/(?:项目类型|设计类型|类型|类别)(?:改成|改为|是|：|:)?(海报|品牌|社媒图|包装|活动物料|PPT|Banner|画册|折页|设计项目)/i);
    if (type) meta.type = type[1];
    const specs = Array.from(text.matchAll(/\d{2,5}\s*[xX*×]\s*\d{2,5}\s*(?:px|mm|cm)?/g)).map((item) => item[0].replace(/\s+/g, ""));
    if (specs.length) meta.specs = specs;
    const formats = Array.from(text.matchAll(/\b(jpg|jpeg|png|pdf|ai|psd|figma|sketch)\b/gi)).map((item) => item[1].toLowerCase());
    if (/源文件/.test(text)) formats.push("源文件");
    if (formats.length) meta.formats = Array.from(new Set(formats));
    return meta;
  }

  function extractBriefFields(text) {
    const brief = {};
    const goal = text.match(/(?:目标|目的|解决|为了|希望)(?:是|：|:)?(.{4,60}?)(?:。|；|，|,|$)/);
    if (goal) brief.goal = trimBrief(goal[1]);
    const audience = text.match(/(?:目标受众|受众|人群|主要给|给)(?:是|：|:)?(.{2,40}?)(?:看|使用|。|；|，|,|$)/);
    if (audience) brief.audience = trimBrief(audience[1]);
    const scene = text.match(/(?:场景|投放|使用场景|出现在哪里|用于|用在|发在)(?:是|：|:)?(.{2,50}?)(?:。|；|，|,|$)/);
    if (scene) brief.scene = trimBrief(scene[1]);
    return brief;
  }

  function trimBrief(value) {
    return String(value || "")
      .replace(/^(是|让|给|在|用来|要)/, "")
      .trim();
  }

  function makeChecklist(projectId, typeLabel) {
    const base = [
      ["确认尺寸、用途和交付格式", "规格"],
      ["检查主信息层级和移动端可读性", "可读性"],
      ["整理源文件、导出文件和命名", "交付"],
    ];
    const print = [
      ["检查出血、CMYK 和图片精度", "印刷"],
      ["文字转曲或打包字体", "印刷"],
    ];
    const social = [
      ["检查平台安全区和封面裁切", "平台"],
      ["确认标题在手机预览中清楚", "平台"],
    ];
    const brand = [
      ["检查字体、色彩和图形风格一致性", "品牌"],
      ["整理 logo / 标识使用规范", "品牌"],
    ];
    let items = base;
    if (/印刷|包装|画册|折页/.test(typeLabel)) items = items.concat(print);
    if (/社媒|小红书|公众号|朋友圈|Banner/.test(typeLabel)) items = items.concat(social);
    if (/品牌|logo|VI/.test(typeLabel)) items = items.concat(brand);
    return items.map(([label, group]) => ({ id: uid("c"), projectId, label, group, done: false }));
  }

  function loadState(storage) {
    if (!storage) return createSeedState();
    try {
      const raw = storage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : createSeedState();
    } catch (error) {
      return createSeedState();
    }
  }

  function saveState(storage, state) {
    if (!storage) return;
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getProject(state, id) {
    return state.projects.find((project) => project.id === id) || state.projects[0];
  }

  function analyzeInput(text, state, now = new Date()) {
    const clean = normalize(text);
    const activeProject = getProject(state, state.activeProjectId);
    const type = detectProjectType(clean);
    const dueDate = detectDueDate(clean, now);
    const status = detectStatus(clean);
    const from = detectPeople(clean);
    const feedback = detectFeedback(clean);
    const designIssue = detectDesignIssue(clean);
    const deliverables = extractDeliverables(clean);
    const createsProject = /新项目|创建项目|项目|客户要|需要.*(海报|头图|封面|包装|banner|PPT)/i.test(clean) && deliverables.length > 1;
    const brief = extractBriefFields(clean);
    const meta = extractProjectMeta(clean);
    const behavior = detectBehavior(clean, { createsProject, feedback, deliverables, dueDate, meta, designIssue });
    const projectName = createsProject ? guessProjectName(clean, activeProject) : activeProject.name;
    const missing = [];
    if ((createsProject || type.deliverables.length) && !/尺寸|规格|px|mm|cm|出血/.test(clean)) missing.push("尺寸 / 平台规格");
    if ((createsProject || feedback) && !dueDate && !(activeProject && activeProject.dueDate)) missing.push("截止时间");
    if ((createsProject || deliverables.length) && !/jpg|png|pdf|源文件|ai|psd|figma/i.test(clean)) missing.push("交付格式");
    if (feedback && !from) missing.push("反馈人");

    return {
      text: clean,
      createsProject,
      projectName,
      typeLabel: type.label,
      deliverables,
      dueDate,
      status,
      behavior,
      from,
      feedback,
      designIssue,
      brief,
      meta,
      missing,
    };
  }

  function applyInput(state, text, now = new Date()) {
    const analysis = analyzeInput(text, state, now);
    if (!analysis.text) return { state, reply: "先告诉我一条需求、反馈或完成进度，我会帮你整理。" };

    const userMessage = {
      id: uid("m"),
      role: "user",
      projectId: state.activeProjectId,
      createdAt: now.toISOString(),
      text: analysis.text,
    };
    state.messages.push(userMessage);

    let project = getProject(state, state.activeProjectId);
    if (isCommandBehavior(analysis.behavior) && project) {
      const reply = applyCommandBehavior(state, project, analysis, now);
      state.messages.push({
        id: uid("m"),
        role: "agent",
        projectId: project.id,
        createdAt: now.toISOString(),
        text: reply,
      });
      return { state, reply, analysis };
    }

    if (analysis.createsProject) {
      project = {
        id: uid("p"),
        name: analysis.projectName,
        type: analysis.typeLabel,
        source: analysis.from || "待补充",
        goal: analysis.brief.goal || "待从需求里补充目标。",
        audience: analysis.brief.audience || "待补充",
        scene: analysis.brief.scene || "待补充",
        specs: analysis.meta.specs || [],
        formats: analysis.meta.formats || [],
        keywords: [],
        deliverables: analysis.deliverables,
        dueDate: analysis.dueDate,
        status: analysis.status === "done" ? "done" : "designing",
        portfolioScore: scorePortfolio({ deliverables: analysis.deliverables, feedbackCount: 0, hasProcess: false }),
        risks: [],
        versions: [],
        portfolio: createPortfolioSeed(analysis),
      };
      state.projects.unshift(project);
      state.activeProjectId = project.id;
      userMessage.projectId = project.id;
      state.checklist = state.checklist.concat(makeChecklist(project.id, project.type));
    } else if (project) {
      if (analysis.deliverables.length) {
        project.deliverables = Array.from(new Set(project.deliverables.concat(analysis.deliverables)));
      }
      applyProjectMeta(state, project, analysis.meta);
      if (analysis.dueDate) {
        project.dueDate = analysis.dueDate;
        applyDeadlineToOpenTasks(state, project, analysis.dueDate);
      }
      applyBriefFields(project, analysis.brief);
      if (analysis.status === "done") {
        markRelatedTaskDone(state, project, analysis);
        project.status = isWholeProjectCompletion(analysis.text) ? "done" : "designing";
      }
      if (analysis.status === "waiting") project.status = "waiting";
      if (analysis.status === "designing") project.status = "designing";
    }

    if (analysis.behavior === "record_version" && project) {
      recordVersion(project, analysis, now);
    }

    retireFirstPromptTask(state, project, analysis);

    let feedbackId = "";
    if (analysis.feedback && project) {
      const latestVersion = project.versions[project.versions.length - 1];
      const item = {
        id: uid("f"),
        projectId: project.id,
        from: analysis.from || "待补充",
        raw: analysis.feedback.raw,
        action: analysis.feedback.action,
        reason: analysis.feedback.reason,
        conflict: analysis.feedback.conflict,
        handled: false,
        version: latestVersion ? latestVersion.name : "",
      };
      feedbackId = item.id;
      state.feedback.push(item);
      if (item.conflict && !project.risks.includes("反馈调性可能冲突，需要确认优先级")) {
        project.risks.push("反馈调性可能冲突，需要确认优先级");
      }
      project.portfolio.process = appendSentence(project.portfolio.process, `收到反馈：${item.raw}`);
    }

    const shouldMakeTask = shouldCreateTask(analysis);
    if (project && shouldMakeTask) {
      const title = buildTaskTitle(analysis);
      const effectiveDueDate = analysis.dueDate || project.dueDate || "";
      state.tasks.push({
        id: uid("t"),
        projectId: project.id,
        title,
        priority: effectiveDueDate && daysUntil(effectiveDueDate, now) <= 1 ? "high" : "normal",
        dueDate: effectiveDueDate,
        status: analysis.status === "waiting" ? "waiting" : analysis.status === "done" ? "done" : "todo",
        nextAction: buildNextAction(analysis),
        feedbackIds: feedbackId ? [feedbackId] : [],
      });
    }

    if (project) {
      project.risks = rebuildProjectRisks(project, analysis);
      project.portfolioScore = scorePortfolio({
        deliverables: project.deliverables,
        feedbackCount: state.feedback.filter((item) => item.projectId === project.id).length,
        hasProcess: Boolean(project.portfolio.process),
      });
    }

    const reply = buildReply(analysis, project);
    state.messages.push({
      id: uid("m"),
      role: "agent",
      projectId: project ? project.id : state.activeProjectId,
      createdAt: now.toISOString(),
      text: reply,
    });

    return { state, reply, analysis };
  }

  function isCommandBehavior(behavior) {
    return [
      "ask_plan",
      "ask_summary",
      "ask_review",
      "ask_checklist",
      "ask_portfolio",
      "solve_design_issue",
      "cancel_task",
      "complete_checklist",
      "snooze_task",
      "clear_waiting",
      "mark_feedback_handled",
      "update_project_name",
      "update_project_type",
      "update_project_specs",
    ].includes(behavior);
  }

  function applyCommandBehavior(state, project, analysis, now) {
    if (analysis.behavior === "ask_plan") return generateDailyPlan(state, now);
    if (analysis.behavior === "ask_summary") return generateDailySummary(state, now);
    if (analysis.behavior === "ask_review") {
      return generateReview(project, state.feedback.filter((item) => item.projectId === project.id));
    }
    if (analysis.behavior === "solve_design_issue") return solveDesignIssue(project, analysis);
    if (analysis.behavior === "ask_portfolio") {
      return generatePortfolioCase(project, state.feedback.filter((item) => item.projectId === project.id));
    }
    if (analysis.behavior === "ask_checklist") return generateChecklistText(state, project);
    if (analysis.behavior === "update_project_name" || analysis.behavior === "update_project_type" || analysis.behavior === "update_project_specs") {
      applyProjectMeta(state, project, analysis.meta);
      project.risks = rebuildProjectRisks(project, analysis);
      return buildMetaUpdateReply(project, analysis);
    }
    if (analysis.behavior === "snooze_task") return snoozeTaskFromText(state, project, analysis, now);
    if (analysis.behavior === "clear_waiting") return clearWaitingFromText(state, project, analysis, now);
    if (analysis.behavior === "mark_feedback_handled") return markFeedbackHandled(state, project, analysis);
    if (analysis.behavior === "complete_checklist") {
      const items = state.checklist.filter((item) => item.projectId === project.id);
      items.forEach((item) => {
        item.done = true;
      });
      return `已完成交付检查：${project.name}\n${items.length ? items.map((item) => `✓ ${item.label}`).join("\n") : "这个项目暂时没有检查项。"}`;
    }
    if (analysis.behavior === "cancel_task") return cancelTaskFromText(state, project, analysis.text);
    return buildReply(analysis, project);
  }

  function buildMetaUpdateReply(project, analysis) {
    const lines = [`已更新项目小纸条：${project.name}`];
    if (analysis.meta.name) lines.push(`项目名：${project.name}`);
    if (analysis.meta.type) lines.push(`项目类型：${project.type}`);
    if (analysis.meta.specs && analysis.meta.specs.length) lines.push(`尺寸规格：${project.specs.join("、")}`);
    if (analysis.meta.formats && analysis.meta.formats.length) lines.push(`交付格式：${project.formats.join("、")}`);
    const remaining = project.risks.filter((risk) => /缺少/.test(risk));
    lines.push(remaining.length ? `仍需确认：${remaining.join("、")}` : "关键交付信息更清楚了，我会据此更新风险提醒。");
    return lines.join("\n");
  }

  function solveDesignIssue(project, analysis) {
    const issue = analysis.designIssue || detectDesignIssue(analysis.text);
    const lines = [`设计卡点：${issue.labels.join("、")}`];
    lines.push(`先别整体推倒重来，按这个顺序处理「${project.name}」：`);
    issue.actions.forEach((action, index) => {
      lines.push(`${index + 1}. ${action}`);
    });
    lines.push(`下一步：${issue.nextStep}`);
    if (project.goal && !/待补充/.test(project.goal)) {
      lines.push(`判断标准：每一步都回到项目目标「${project.goal}」，不要只凭“好不好看”改。`);
    } else {
      lines.push("还需要补一句项目目标。目标清楚后，我才能帮你判断哪种改法更对。");
    }
    project.portfolio.process = appendSentence(project.portfolio.process, `设计卡点：${analysis.text}`);
    return lines.join("\n");
  }

  function generateChecklistText(state, project) {
    const items = state.checklist.filter((item) => item.projectId === project.id);
    if (!items.length) return `交付检查：${project.name}\n这个项目暂时没有检查项。`;
    return `交付检查：${project.name}\n${items.map((item) => `${item.done ? "✓" : "□"} ${item.label}`).join("\n")}`;
  }

  function applyProjectMeta(state, project, meta = {}) {
    if (!project || !meta) return;
    if (meta.name) project.name = meta.name;
    if (meta.type) {
      project.type = meta.type;
      ensureChecklistForType(state, project);
    }
    if (meta.specs && meta.specs.length) {
      project.specs = Array.from(new Set([...(project.specs || []), ...meta.specs]));
    }
    if (meta.formats && meta.formats.length) {
      project.formats = Array.from(new Set([...(project.formats || []), ...meta.formats]));
    }
  }

  function ensureChecklistForType(state, project) {
    const existingLabels = new Set(state.checklist.filter((item) => item.projectId === project.id).map((item) => item.label));
    makeChecklist(project.id, project.type).forEach((item) => {
      if (!existingLabels.has(item.label)) state.checklist.push(item);
    });
  }

  function snoozeTaskFromText(state, project, analysis, now) {
    const openTasks = state.tasks.filter((task) => task.projectId === project.id && task.status !== "done");
    if (!openTasks.length) return "当前项目没有可延后的待办。";
    const target = bestMatchingTask(openTasks, analysis.text) || openTasks[0];
    target.dueDate = analysis.dueDate;
    target.priority = daysUntil(analysis.dueDate, now) <= 1 ? "high" : "normal";
    return `已延后：${target.title}\n新的时间是 ${analysis.dueDate}。如果这件事会影响对外承诺，建议同步告诉确认人。`;
  }

  function clearWaitingFromText(state, project, analysis, now) {
    const waitingTasks = state.tasks.filter((task) => task.projectId === project.id && task.status === "waiting");
    waitingTasks.forEach((task) => {
      task.status = "done";
      task.nextAction = "已确认";
    });
    if (project.status === "waiting") project.status = "designing";
    project.risks = project.risks.filter((risk) => !/等待|确认/.test(risk));
    const versionHint = /(方向|方案|稿|版本|视觉)/.test(analysis.text);
    if (versionHint) recordVersion(project, analysis, now);
    return waitingTasks.length
      ? `确认已收到：${waitingTasks.map((task) => task.title).join("、")}\n我已把等待事项标记完成，项目回到设计推进状态。`
      : "确认已收到。我已记录这次确认，当前项目没有待确认任务。";
  }

  function markFeedbackHandled(state, project, analysis) {
    const feedbackItems = state.feedback.filter((item) => item.projectId === project.id && !item.handled);
    feedbackItems.forEach((item) => {
      item.handled = true;
    });
    state.tasks
      .filter((task) => task.projectId === project.id && task.status !== "done" && /反馈|修改|处理/.test(task.title))
      .forEach((task) => {
        task.status = "done";
      });
    project.risks = project.risks.filter((risk) => !/反馈调性可能冲突/.test(risk));
    project.portfolio.process = appendSentence(project.portfolio.process, `反馈处理完成：${analysis.text}`);
    return feedbackItems.length
      ? `已标记 ${feedbackItems.length} 条反馈为已处理。\n我也把相关修改任务从今日待办里移除了，后面可以记录修改前后对比。`
      : "已记录反馈处理完成。当前没有未处理的反馈条目。";
  }

  function cancelTaskFromText(state, project, text) {
    const openTasks = state.tasks.filter((task) => task.projectId === project.id && task.status !== "done");
    if (!openTasks.length) return "当前项目没有可取消的待办。";
    const target =
      openTasks.find((task) => text.includes(task.title)) ||
      openTasks.find((task) => task.title.split(/[：:]/).some((part) => part.length >= 3 && text.includes(part))) ||
      bestMatchingTask(openTasks, text) ||
      openTasks[0];
    target.status = "done";
    target.nextAction = "已取消";
    return `已取消：${target.title}\n它不会继续出现在今天要做里。`;
  }

  function bestMatchingTask(tasks, text) {
    const scored = tasks
      .map((task) => ({
        task,
        score: taskKeywords(task.title)
          .concat(taskKeywords(task.nextAction))
          .filter((word) => text.includes(word)).length,
      }))
      .sort((a, b) => b.score - a.score);
    return scored[0] && scored[0].score > 0 ? scored[0].task : null;
  }

  function taskKeywords(value) {
    const text = String(value || "");
    const base = text
      .replace(/^(完成|处理|推进|补齐|确认|整理)/, "")
      .split(/[、，,：:\s和与及]/)
      .map((item) => item.trim())
      .filter((item) => item.length >= 2);
    ["首版", "初稿", "尺寸", "规格", "交付", "导出", "源文件", "反馈", "修改", "小纸条", "目标", "受众", "格式"].forEach((word) => {
      if (text.includes(word) && !base.includes(word)) base.push(word);
    });
    return base;
  }

  function recordVersion(project, analysis, now) {
    const versionName = extractVersionName(analysis.text, project);
    project.versions.push({
      name: versionName,
      createdAt: now.toISOString(),
      changes: analysis.text,
      confirmedBy: analysis.from || "",
    });
    project.portfolio.process = appendSentence(project.portfolio.process, `版本记录：${versionName} - ${analysis.text}`);
  }

  function extractVersionName(text, project) {
    const explicit = text.match(/((?:v|V)\s*\d+(?:\.\d+)?|第[一二三四五六七八九十\d]+版)/);
    if (explicit) return explicit[1].replace(/\s+/g, "").toUpperCase();
    return `V${(project.versions || []).length + 1}`;
  }

  function shouldCreateTask(analysis) {
    if (
      [
        "ask_plan",
        "ask_summary",
        "ask_review",
        "ask_checklist",
        "ask_portfolio",
        "solve_design_issue",
        "cancel_task",
        "complete_checklist",
        "snooze_task",
        "clear_waiting",
        "mark_feedback_handled",
        "update_brief",
        "update_deadline",
        "update_project_name",
        "update_project_type",
        "update_project_specs",
        "record_version",
      ].includes(analysis.behavior)
    ) {
      return false;
    }
    return analysis.status !== "done" || analysis.feedback || analysis.deliverables.length;
  }

  function appendSentence(original, sentence) {
    if (!original) return sentence;
    return `${original} ${sentence}`;
  }

  function applyBriefFields(project, brief) {
    if (!project || !brief) return;
    if (brief.goal) project.goal = brief.goal;
    if (brief.audience) project.audience = brief.audience;
    if (brief.scene) project.scene = brief.scene;
  }

  function applyDeadlineToOpenTasks(state, project, dueDate) {
    state.tasks
      .filter((task) => task.projectId === project.id && task.status !== "done")
      .forEach((task) => {
        task.dueDate = dueDate;
      });
  }

  function isWholeProjectCompletion(text) {
    return /最终|全部|整个项目|项目.*完成|交付完成|已交付|定稿|过稿/.test(text);
  }

  function markRelatedTaskDone(state, project, analysis) {
    if (!project) return;
    const openTasks = state.tasks.filter((task) => task.projectId === project.id && task.status !== "done");
    if (!openTasks.length) return;
    const text = analysis.text;
    const exact = openTasks.find((task) => task.title && text.includes(task.title.replace(/^完成|处理|推进|补齐|确认/, "").slice(0, 6)));
    const byDraft = /首版|初稿|第一版|v1/i.test(text) && openTasks.find((task) => /首版|初稿|设计|draft/i.test(task.title));
    const byDelivery = /交付|导出|源文件|定稿/.test(text) && openTasks.find((task) => /交付|导出|自检|源文件/.test(task.title));
    const byFeedback = /反馈|修改|改完/.test(text) && openTasks.find((task) => /反馈|修改|处理/.test(task.title));
    const target = exact || byDraft || byDelivery || byFeedback || openTasks[0];
    if (target) target.status = "done";
  }

  function retireFirstPromptTask(state, project, analysis) {
    if (!project || project.id !== "p-first") return;
    if (!analysis.feedback && !analysis.deliverables.length && !analysis.dueDate && analysis.status === "todo") return;
    state.tasks.forEach((task) => {
      if (task.projectId === project.id && task.title === "先写下这个项目要做什么") {
        task.status = "done";
      }
    });
  }

  function rebuildProjectRisks(project, analysis) {
    const preserved = project.risks.filter((risk) => !risk.startsWith("缺少"));
    const unresolvedExtraMissing = project.risks.filter((risk) => {
      if (!risk.startsWith("缺少")) return false;
      if (/设计目标|交付物清单|截止时间/.test(risk)) return false;
      if (/尺寸|规格/.test(risk) && /尺寸|规格|px|mm|cm|出血/.test(analysis.text)) return false;
      if (/交付格式/.test(risk) && /jpg|png|pdf|源文件|ai|psd|figma/i.test(analysis.text)) return false;
      if (/反馈人/.test(risk) && analysis.from) return false;
      return true;
    });
    const next = [];
    if (!project.goal || /待补充|待从/.test(project.goal)) next.push("缺少设计目标");
    if (!project.deliverables.length) next.push("缺少交付物清单");
    if (!project.dueDate) next.push("缺少截止时间");
    analysis.missing.forEach((item) => next.push(`缺少${item}`));
    return Array.from(new Set(preserved.concat(unresolvedExtraMissing, next)));
  }

  function buildTaskTitle(analysis) {
    if (analysis.feedback) return `处理反馈：${analysis.feedback.action.split("。")[0]}`;
    if (analysis.deliverables.length) return `推进交付物：${analysis.deliverables.join("、")}`;
    if (analysis.status === "waiting") return "跟进确认事项";
    return "整理并推进设计任务";
  }

  function buildNextAction(analysis) {
    if (analysis.missing.length) return `先补齐：${analysis.missing.join("、")}`;
    if (analysis.feedback) return "按反馈拆出 1-2 个视觉修改方向，并保留修改前后对比。";
    if (analysis.deliverables.length) return "确认尺寸后按平台导出对应文件。";
    return "继续记录下一步和确认人。";
  }

  function buildReply(analysis, project) {
    const lines = [];
    if (analysis.createsProject) {
      lines.push(`已创建项目「${project.name}」，并准备好交付检查清单。`);
    } else {
      lines.push(`已记录到「${project.name}」。`);
    }
    if (analysis.feedback) {
      lines.push(`反馈已翻译为：${analysis.feedback.action}`);
      if (analysis.feedback.conflict) lines.push("我发现反馈里可能有调性冲突，建议先确认哪一个方向优先。");
    }
    if (analysis.deliverables.length) lines.push(`交付物：${analysis.deliverables.join("、")}。`);
    if (analysis.dueDate) lines.push(`截止时间：${analysis.dueDate}。`);
    if (analysis.missing.length) lines.push(`还需要补充：${analysis.missing.join("、")}。`);
    lines.push("我已经同步更新今日待办、风险提醒和项目归档线索。");
    return lines.join("\n");
  }

  function createPortfolioSeed(analysis) {
    return {
      background: "待补充项目背景。",
      problem: analysis.feedback ? analysis.feedback.reason : "待补充设计问题。",
      strategy: analysis.feedback ? analysis.feedback.action : "待补充设计策略。",
      process: analysis.text,
      result: "",
      reflection: "记录项目过程，后续可整理成作品集里的项目故事。",
      interviewScript: "",
    };
  }

  function scorePortfolio({ deliverables, feedbackCount, hasProcess }) {
    let score = 35;
    score += Math.min(deliverables.length * 8, 24);
    score += Math.min(feedbackCount * 12, 24);
    if (hasProcess) score += 17;
    return Math.min(score, 100);
  }

  function daysUntil(dateString, now = new Date()) {
    if (!dateString) return 99;
    const start = new Date(formatDate(now));
    const end = new Date(dateString);
    return Math.ceil((end - start) / 86400000);
  }

  function getDashboard(state, now = new Date()) {
    const tasks = state.tasks.slice().sort((a, b) => {
      const pa = a.priority === "high" ? 0 : 1;
      const pb = b.priority === "high" ? 0 : 1;
      return pa - pb || String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999"));
    });
    const today = tasks.filter((task) => task.status !== "done" && task.status !== "waiting" && (task.priority === "high" || daysUntil(task.dueDate, now) <= 1));
    const waiting = tasks.filter((task) => task.status === "waiting");
    const risks = state.projects.flatMap((project) =>
      project.risks.map((risk) => ({ id: `${project.id}-${risk}`, projectId: project.id, projectName: project.name, text: risk }))
    );
    const activeChecklist = state.checklist.filter((item) => item.projectId === state.activeProjectId);
    const doneChecklist = activeChecklist.filter((item) => item.done);
    const portfolio = state.projects
      .slice()
      .sort((a, b) => b.portfolioScore - a.portfolioScore)
      .slice(0, 3);
    return { today, waiting, risks, activeChecklist, doneChecklist, portfolio };
  }

  function getProjectInsights(state, projectId = state.activeProjectId, now = new Date()) {
    const project = getProject(state, projectId);
    const projectTasks = state.tasks.filter((task) => task.projectId === project.id && task.status !== "done");
    const projectFeedback = state.feedback.filter((item) => item.projectId === project.id);
    const missing = getMissingProjectFields(project);
    const briefScore = getBriefScore(project);
    const urgentTask = projectTasks
      .slice()
      .sort((a, b) => daysUntil(a.dueDate, now) - daysUntil(b.dueDate, now))[0];
    const nextStep = buildProjectNextStep(project, projectTasks, missing);
    return {
      projectId: project.id,
      nextStep,
      briefScore,
      missing,
      deadline: buildDeadlineInsight(project, urgentTask, now),
      portfolio: buildPortfolioInsight(project, projectFeedback),
    };
  }

  function generateProjectWorkflow(project, now = new Date()) {
    const missing = getMissingProjectFields(project);
    if (missing.length) {
      return {
        ready: false,
        summary: [
          `项目小纸条还差：${missing.join("、")}。`,
          "先补齐这些信息，小画桌再帮菁菁排完整工作流。",
        ].join("\n"),
        tasks: [
          {
            key: "note",
            title: "补齐项目小纸条",
            dueDate: project.dueDate || formatDate(now),
            priority: "high",
            status: "todo",
            nextAction: `先补齐：${missing.slice(0, 3).join("、")}`,
          },
        ],
      };
    }

    const dueDate = project.dueDate || "";
    const days = daysUntil(dueDate, now);
    const deliverables = project.deliverables.join("、");
    const urgent = days <= 2;
    const firstStep = /海报|社媒|小红书|公众号|朋友圈|Banner/i.test(`${project.type} ${deliverables}`)
      ? "先确认尺寸、安全区、主标题和移动端可读性。"
      : "先确认尺寸、使用场景、主信息和交付格式。";
    const deadlineNote = days < 0 ? "当前截止时间已过，先确认是否需要改期。" : `距离截止还有 ${days} 天。`;

    return {
      ready: true,
      summary: [
        `已根据「${project.name}」整理工作流。`,
        `项目判断：${project.type}，交付物是 ${deliverables}。${deadlineNote}`,
        `今日先做：${firstStep}`,
        "工作流：确认规格与参考 -> 完成首版设计 -> 交付前自检与导出。",
        "需要确认：尺寸 / 平台规格、交付格式、确认人。",
      ].join("\n"),
      tasks: [
        {
          key: "spec",
          title: "确认尺寸、参考和交付格式",
          dueDate,
          priority: urgent ? "high" : "normal",
          status: "todo",
          nextAction: "确认每个交付物的尺寸、平台、安全区和导出格式",
        },
        {
          key: "draft",
          title: `完成首版设计：${deliverables}`,
          dueDate,
          priority: urgent ? "high" : "normal",
          status: "todo",
          nextAction: "先搭主视觉和信息层级，再做不同物料适配",
        },
        {
          key: "delivery",
          title: "交付前自检与导出文件",
          dueDate,
          priority: urgent ? "high" : "normal",
          status: "todo",
          nextAction: "检查可读性、格式、命名、源文件和导出文件",
        },
      ],
    };
  }

  function getMissingProjectFields(project) {
    const missing = [];
    if (!project.goal || /待补充/.test(project.goal)) missing.push("设计目标");
    if (!project.deliverables.length) missing.push("交付物");
    if (!project.dueDate) missing.push("截止时间");
    if (project.risks.some((risk) => /尺寸|规格/.test(risk))) missing.push("尺寸规格");
    if (project.risks.some((risk) => /交付格式/.test(risk))) missing.push("交付格式");
    return Array.from(new Set(missing));
  }

  function getBriefScore(project) {
    const checks = [
      Boolean(project.goal && !/待补充/.test(project.goal)),
      Boolean(project.deliverables.length),
      Boolean(project.dueDate),
      Boolean(project.keywords && project.keywords.length),
      !project.risks.some((risk) => /缺少/.test(risk)),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }

  function buildProjectNextStep(project, tasks, missing) {
    if (missing.length) return `先补齐：${missing.slice(0, 2).join("、")}`;
    const waiting = tasks.find((task) => task.status === "waiting");
    if (waiting) return `跟进确认：${waiting.title}`;
    const urgent = tasks.find((task) => task.priority === "high");
    if (urgent) return urgent.nextAction || urgent.title;
    if (project.risks.length) return `处理风险：${project.risks[0]}`;
    return "记录本轮版本变化，并准备项目复盘";
  }

  function buildDeadlineInsight(project, task, now) {
    const date = task && task.dueDate ? task.dueDate : project.dueDate;
    if (!date) return "未设截止";
    const days = daysUntil(date, now);
    if (days < 0) return "已逾期";
    if (days === 0) return "今天截止";
    if (days === 1) return "明天截止";
    return `${days} 天后截止`;
  }

  function buildPortfolioInsight(project, feedbackItems) {
    if (project.portfolioScore >= 80) return "强案例";
    if (feedbackItems.length && project.portfolio.process) return "可沉淀";
    if (project.deliverables.length >= 3) return "补过程";
    return "先记录";
  }

  function generateDailySummary(state, now = new Date()) {
    const dashboard = getDashboard(state, now);
    const done = state.tasks.filter((task) => task.status === "done");
    return [
      "今日工作总结",
      `完成：${done.length ? done.map((task) => task.title).join("；") : "暂无已完成记录"}`,
      `进行中：${dashboard.today.length ? dashboard.today.map((task) => task.title).join("；") : "今天没有临期任务"}`,
      `等待确认：${dashboard.waiting.length ? dashboard.waiting.map((task) => task.title).join("；") : "暂无等待确认"}`,
      `风险：${dashboard.risks.length ? dashboard.risks.map((risk) => `${risk.projectName} - ${risk.text}`).join("；") : "暂无明显风险"}`,
    ].join("\n");
  }

  function generateDailyPlan(state, now = new Date()) {
    const dashboard = getDashboard(state, now);
    const firstTask = dashboard.today[0];
    const waiting = dashboard.waiting[0];
    const risk = dashboard.risks[0];
    const lines = ["今日安排"];
    lines.push(firstTask ? `先做：${firstTask.title}。下一步：${firstTask.nextAction}` : "先做：今天没有临期任务，先补齐当前项目小纸条。");
    lines.push(waiting ? `等确认：${waiting.title}。` : "等确认：暂无等待确认事项。");
    lines.push(risk ? `需要留意：${risk.projectName} - ${risk.text}。` : "需要留意：当前没有明显卡点。");
    lines.push("建议：只处理列表最上面一件事，完成后点「完成」，小画桌会重新排序。");
    return lines.join("\n");
  }

  function generateReview(project, feedbackItems) {
    const feedbackText = feedbackItems.length
      ? feedbackItems.map((item) => `- ${item.action}`).join("\n")
      : "- 目前没有反馈记录，先按当前需求检查信息层级、风格一致性和交付规格。";
    return [
      `提交前自检：${project.name}`,
      "1. 第一眼是否能看懂主信息？主标题、利益点或活动主题应在 3 秒内清楚。",
      "2. 视觉调性是否贴合关键词？避免同时追求太多情绪。",
      "3. 平台尺寸、导出格式、字体和图片授权是否已经确认。",
      "4. 修改依据：",
      feedbackText,
    ].join("\n");
  }

  function generatePortfolioCase(project, feedbackItems) {
    const actions = feedbackItems.map((item) => item.action).join(" ");
    return [
      `项目归档草稿：${project.name}`,
      `项目背景：${project.portfolio.background || project.goal}`,
      `设计问题：${project.portfolio.problem || "需求较零散，需要从反馈中提炼清晰目标。"}`,
      `设计策略：${project.portfolio.strategy || actions || "围绕核心信息、使用位置和画面第一眼建立视觉策略。"}`,
      `关键过程：${project.portfolio.process || "记录需求、版本变化和反馈处理过程。"}`,
      `最终结果：${project.portfolio.result || "待项目完成后补充上线效果或交付结果。"}`,
      `复盘收获：${project.portfolio.reflection || "把模糊反馈转成具体设计动作，是初级设计师很重要的能力。"}`,
      `面试表达：我在这个项目中负责从需求整理、视觉方向到交付检查的完整执行，并通过反馈迭代让设计更贴近目标场景。`,
    ].join("\n");
  }

  return {
    STORAGE_KEY,
    createSeedState,
    loadState,
    saveState,
    analyzeInput,
    applyInput,
    getDashboard,
    getProjectInsights,
    getProject,
    generateDailySummary,
    generateDailyPlan,
    generateProjectWorkflow,
    generateReview,
    generatePortfolioCase,
    daysUntil,
  };
});
