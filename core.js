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
      word: "不行",
      action: "先不要整体推翻，确认具体不行的是目标、层级、风格还是交付限制，再按优先级补救。",
      reason: "否定型反馈通常缺少可执行信息，需要先定位问题范围。",
    },
    {
      word: "重做",
      action: "把重做拆成保留项和推翻项：先确认哪些信息必须保留，再重建方向。",
      reason: "重做并不等于全部删除，先确认可复用内容能减少返工。",
    },
    {
      word: "很怪",
      action: "检查画面违和点：风格是否不统一、比例是否失衡、颜色和字体是否互相打架。",
      reason: "“怪”通常指一致性或比例问题，不一定是创意完全失败。",
    },
    {
      word: "丑",
      action: "把情绪化反馈转成设计检查：层级、对齐、间距、字体、颜色和素材质量逐项排查。",
      reason: "直接评价审美时，需要转成可修改的基础设计项。",
    },
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

  const designerQuestionRules = [
    {
      key: "brief_start",
      label: "需求拆解",
      words: ["不知道从哪开始", "从哪开始", "怎么开始", "怎么拆", "拆brief", "拆 brief", "需求不清", "先做什么"],
      judge: "先判断这张图要解决的唯一核心问题：让谁在什么场景下看懂什么。",
      steps: [
        "把需求写成一句话：给谁看、在哪里看、希望对方做什么。",
        "只保留 3 类必填信息：目标、受众、交付物；尺寸和截止时间单独确认。",
        "先做信息层级草稿，不急着找风格；层级错了，后面都会返工。",
      ],
      nextStep: "在项目小纸条补齐目标、受众、场景、交付物和截止时间，再让小画桌排工作流。",
    },
    {
      key: "reference",
      label: "参考与灵感",
      words: ["参考", "灵感", "找图", "找案例", "竞品", "情绪板", "moodboard"],
      judge: "先别只找“好看的图”，要按目标、受众、场景去找能解决同类问题的参考。",
      steps: [
        "分三组找参考：信息层级参考、视觉风格参考、同平台尺寸参考。",
        "每张参考只写一句为什么可用，例如“标题够醒目”或“色彩更年轻”。",
        "不要照搬整张图，只借一个方法：构图、字体比例、配色关系或图形语言。",
      ],
      nextStep: "先收 6 张参考：2 张层级、2 张风格、2 张平台尺寸，并删掉说不出理由的图。",
    },
    {
      key: "typography_choice",
      label: "字体选择",
      words: ["字体怎么", "字体选", "字体搭", "字重", "字体配", "用什么字体", "标题字体"],
      judge: "字体先服务信息性格：是清楚、正式、年轻、可爱，还是高级。",
      steps: [
        "先选标题字体，再选正文；正文优先清楚，不要抢标题。",
        "同一张图控制在 1-2 个字体家族，变化靠字号、字重和间距完成。",
        "标题要有主次：主标题最大，利益点次之，说明信息再降一级。",
      ],
      nextStep: "复制当前稿做一版字体收敛版：只保留 2 种字重和 3 档字号。",
    },
    {
      key: "color_choice",
      label: "配色判断",
      words: ["配色", "颜色怎么", "色彩怎么", "主色", "辅助色", "颜色搭", "色值"],
      judge: "配色先判断情绪和识别：品牌色能不能用，目标情绪是年轻、温暖、高级还是促销。",
      steps: [
        "先定主色，再定辅助色，最后只留一个强调色。",
        "检查主标题和背景的明度对比，别让颜色好看但文字读不清。",
        "如果画面已经乱，先减少颜色数量，再调饱和度和明度。",
      ],
      nextStep: "做 3 个小色板：品牌稳妥版、年轻明亮版、克制高级版，再选最贴目标的一版。",
    },
    {
      key: "layout_method",
      label: "版式方法",
      words: ["版式", "构图", "排版", "留白", "层级", "信息层级", "视觉中心"],
      judge: "版式先解决第一眼顺序：用户先看哪里，再看哪里，最后记住什么。",
      steps: [
        "把所有信息按重要性排队：必须看到、可以看到、可弱化。",
        "主视觉或主标题只选一个当第一视觉，不要两个都抢。",
        "用对齐、间距和分组建立秩序；装饰只服务视觉动线。",
      ],
      nextStep: "先做黑白线框稿，确认信息顺序成立后，再加颜色、图片和装饰。",
    },
    {
      key: "delivery_specs",
      label: "交付规格",
      words: ["尺寸", "规格", "导出", "格式", "源文件", "出血", "印刷", "转曲", "分辨率", "安全区"],
      judge: "交付问题先确认使用场景：线上看、印刷、广告位、还是多平台复用。",
      steps: [
        "线上图先确认平台尺寸、安全区、移动端可读性和导出格式。",
        "印刷物先确认出血、CMYK、图片精度、文字转曲和文件打包。",
        "交付前统一命名，源文件、导出图、字体/图片授权分开放好。",
      ],
      nextStep: "打开交付检查清单，先补尺寸和格式，再做导出。",
    },
    {
      key: "feedback_handling",
      label: "反馈处理",
      words: ["改来改去", "反馈很多", "意见很多", "客户一直改", "老板一直改", "怎么沟通", "怎么确认"],
      judge: "反馈多时不要马上全改，先把反馈分成目标问题、审美偏好、交付限制三类。",
      steps: [
        "先找冲突反馈，例如“高级”和“活泼”同时出现，要确认优先级。",
        "每轮只确认 1-2 个核心方向，避免把所有意见平均塞进画面。",
        "回复时用方案语言：我会保留什么、调整什么、为什么这样更贴目标。",
      ],
      nextStep: "把反馈原话发给小画桌，它会翻译成修改点，并生成确认话术。",
    },
    {
      key: "copyright_assets",
      label: "素材与授权",
      words: ["版权", "授权", "字体授权", "图片版权", "商用", "素材能不能用", "侵权"],
      judge: "素材先判断是否商用、是否对外发布、是否需要源文件交付。",
      steps: [
        "商用项目优先用公司素材库、可商用图库或客户提供素材。",
        "字体要确认授权范围；不确定时换成公司已授权字体或免费商用字体。",
        "交付时记录素材来源，避免后续被问到时说不清。",
      ],
      nextStep: "把不确定的字体和图片列出来，先向负责人确认能否商用。",
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

  function detectDesignerQuestion(text) {
    const matched = designerQuestionRules.filter((rule) => rule.words.some((word) => text.includes(word)));
    const looksLikeQuestion = /怎么|如何|怎么办|能不能|要不要|先做|从哪|为什么|\?$|？$/.test(text);
    if (!matched.length || !looksLikeQuestion) return null;
    return {
      keys: matched.map((rule) => rule.key),
      labels: matched.map((rule) => rule.label),
      rules: matched,
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
    if (
      /会议纪要|沟通纪要|开会|会议|电话|语音|群里|微信.*聊|刚聊完|沟通了一堆|聊了一堆|会后/.test(text) &&
      /整理|纪要|总结|记录|帮我理|帮我梳理|待办|确认|决定|说了/.test(text)
    ) {
      return "organize_meeting_notes";
    }
    if (
      /拆brief|拆 brief|拆需求|需求拆解|帮我拆|这个brief|这个 brief|brief怎么|需求不清|不知道从哪开始|从哪开始/.test(text) &&
      !/参考图|参考案例|竞品|情绪板|moodboard/i.test(text)
    ) {
      return "decompose_brief";
    }
    if (isMultiConceptPlanningRequest(text)) {
      return "plan_design_concepts";
    }
    if (isMoodboardPlanningRequest(text)) {
      return "plan_reference_research";
    }
    if (isImagePromptRequest(text)) {
      return "generate_image_prompt_brief";
    }
    if (/老板会问|客户会问|主管会问|会被问|可能被问|答辩|预演|怎么回答|怎么解释.*(为什么|方案|设计)|被问.*怎么/.test(text)) {
      return "simulate_design_defense";
    }
    if (
      /发给.*(看|过目|确认)|给.*看|发初稿|发首版|发预览|预览图|收反馈|要反馈|让.*反馈/.test(text) &&
      /老板|客户|主管|甲方|运营|产品|同事|领导|对方|他们|她|他/.test(text) &&
      !/完成了|已完成|做完了|已经做完|已经|已发|发了|发给.*了|等反馈|待反馈|汇报|提案|讲方案|设计说明|怎么讲|话术|怎么问|催|没回|没回复|修改说明|修改点|改了什么|改了哪些|版本变化|版本对比/.test(text)
    ) {
      return "prepare_feedback_request";
    }
    if (/汇报|提案|讲方案|讲这个方案|方案.*怎么讲|设计说明|解释.*(设计|方案)|说服|怎么跟.*讲|给老板看.*说|发给老板.*说/.test(text)) {
      return "prepare_design_presentation";
    }
    if (/能力档案|能力标签|成长档案|成长建议|职业成长|能力短板|短板|我该练什么|还缺什么能力|哪些能力|能力怎么样|作品集缺什么|提升方向/.test(text)) {
      return "generate_growth_profile";
    }
    if (/自检|帮我看看|提交前|检查一下|哪里有问题/.test(text)) return "ask_review";
    if (isMissingAssetRequest(text)) {
      return "request_missing_assets";
    }
    if (isVagueFeedbackClarificationRequest(text)) {
      return "clarify_vague_feedback";
    }
    if (/话术|怎么问|怎么说|帮我问|帮我整理.*确认|催一下|催.*(反馈|确认|回复)|没回.*怎么|没回复.*怎么/.test(text)) {
      return "ask_confirmation_message";
    }
    if (isStakeholderConflictRequest(text)) {
      return "align_stakeholder_feedback";
    }
    if (
      /整理.*反馈|归纳.*反馈|汇总.*反馈|反馈.*优先级|意见.*优先级|一堆反馈|多条反馈|这些反馈|多方反馈|反馈.*先改|反馈.*怎么改|先改什么/.test(text) &&
      /反馈|意见|老板|主管|客户|甲方|运营|产品/.test(text)
    ) {
      return "synthesize_feedback_batch";
    }
    if (/不行|重做|推翻|被否|否了|毙了|很怪|丑|不好看|完全不对|方向不对/.test(text) && /老板|客户|主管|甲方|说|反馈|觉得/.test(text)) {
      return "handle_negative_feedback";
    }
    if (isVisualImpactRequest(text)) {
      return "strengthen_visual_impact";
    }
    if (
      !analysisBits.createsProject &&
      /临时|突然|又要|新增|加一个|加一张|加一版|加需求|加物料|改需求|需求变|变更|换成|改成|方向变|换方向|重新来|重做/.test(text) &&
      /客户|老板|主管|甲方|运营|产品|要|说|让/.test(text) &&
      !(/适配|横版.*竖版|竖版.*横版|安全区|怎么处理|怎么做/.test(text) && !/临时|突然|又要|新增|加一个|加一张|加一版|加需求|加物料|改需求|需求变|变更|方向变|换方向|重新来|重做/.test(text))
    ) {
      return "handle_scope_change";
    }
    if (isActionPathRequest(text)) {
      return "optimize_action_path";
    }
    if (isInformationHierarchyRequest(text, analysisBits)) {
      return "organize_information_hierarchy";
    }
    if (isReadabilityRequest(text, analysisBits)) {
      return "optimize_readability";
    }
    if (isDeadlineNegotiationRequest(text)) {
      return "negotiate_deadline_scope";
    }
    if (/来不及|赶不完|太多了|任务太多|很乱|乱成|焦虑|崩溃|不知道先做哪个|老板.*催|客户.*催|马上要|今天.*交.*还没/.test(text)) {
      return "triage_overload";
    }
    if (isProgressStatusReportRequest(text)) {
      return "report_progress_status";
    }
    if (
      /多久|多长时间|几小时|几天|工时|估时|估个时间|时间预估|要多久|多久能|能不能.*(做完|出|交)|今天能.*做完|什么时候能出|多久出一版|出一版/.test(text) &&
      !/来不及|赶不完|任务太多|不知道先做哪个|催/.test(text)
    ) {
      return "estimate_design_workload";
    }
    if (/任务.*(延后|延期|推迟|改到)|延后到|延期到|推迟到/.test(text) && analysisBits.dueDate) return "snooze_task";
    if (/取消|删除|不用做|不用了|先不做|撤掉/.test(text)) return "cancel_task";
    if (/交付检查.*(完成|勾完|都好了)|检查项.*(完成|勾完|都好了)/.test(text)) return "complete_checklist";
    if (/源文件.*(整理|打包|命名)|文件.*(整理|命名|打包|太乱)|怎么.*(命名|打包|整理).*文件|交付包|命名规范|文件夹/.test(text)) {
      return "organize_delivery_files";
    }
    if (isDesignHandoffRequest(text)) {
      return "prepare_design_handoff";
    }
    if (isDesignSoftwareOperationRequest(text)) {
      return "guide_design_software_operation";
    }
    if (
      /印前|印刷|印刷前|发印厂|印厂|打样|出血|CMYK|cmyk|转曲|文字转曲|四色黑|专色|覆膜|模切|刀版|包装印刷/.test(text) &&
      /怎么|如何|要注意|检查|导出|交付|发|给|确认|清单|设置/.test(text)
    ) {
      return "guide_print_prepress";
    }
    if (/交付检查|导出检查|检查.*(出血|转曲|源文件|打包)|清单/.test(text)) return "ask_checklist";
    if (
      /(尺寸|规格|比例|像素|安全区|导出尺寸|画布|多大|做多大)/.test(text) &&
      /(多少|多大|怎么设|怎么定|用什么|应该|建议|比例|安全区)/.test(text) &&
      !/适配|横版.*竖版|竖版.*横版|裁切|改成/.test(text)
    ) {
      return "recommend_platform_specs";
    }
    if (/项目.*复盘|复盘一下|帮我复盘|总结.*经验|经验沉淀|下次.*注意|踩坑|哪里做得好|哪里没做好|做完.*学到|结束.*学到/.test(text) && !/作品集|归档|面试|案例/.test(text)) {
      return "project_retrospective";
    }
    if (isProjectClosureRecordRequest(text)) {
      return "record_project_outcome";
    }
    if (/作品集|归档|面试|案例/.test(text)) return "ask_portfolio";
    if (
      /修改说明|修改点|改了什么|改了哪些|版本变化|版本对比|整理.*版本|整理.*修改|V\s*\d+.*V\s*\d+|v\s*\d+.*v\s*\d+/i.test(text) &&
      /整理|总结|说明|对比|给.*看|发给|改了|哪些|什么/.test(text)
    ) {
      return "summarize_version_changes";
    }
    if (/(v|V)\s*\d+|第[一二三四五六七八九十\d]+版|版本/.test(text)) return "record_version";
    if (isAssetLicenseAuditRequest(text)) {
      return "audit_asset_license";
    }
    if (isReferenceSimilarityNegotiationRequest(text)) {
      return "negotiate_reference_similarity";
    }
    if (/版权|授权|字体授权|图片版权|商用|素材能不能用|侵权/.test(text)) {
      return "answer_design_question";
    }
    if (isCompositeIntegrationRequest(text, analysisBits)) {
      return "integrate_composite_assets";
    }
    if (/素材|图片|照片|图太糊|太糊|清晰度|分辨率|抠图|扣图|边缘|锯齿|水印|找不到图|没有合适的图|素材不统一|图片风格不统一/.test(text)) {
      return "fix_asset_quality";
    }
    if (
      /参考图|参考案例|参考.*图|竞品|案例|情绪板|moodboard/i.test(text) &&
      /怎么拆|拆解|分析|借鉴|不要抄|不照抄|不抄|学哪里|好在哪里|提炼|怎么用|模仿|照着做/.test(text) &&
      !/版权|授权|商用|哪里找|找图|找案例|收集/.test(text)
    ) {
      return "analyze_reference";
    }
    if (
      /系列|套图|一组|多张|三张|几张|活动物料|延展物料|整套物料/.test(text) &&
      /统一|像一套|不像一套|保持一致|视觉系统|规范|怎么做|怎么统一|风格统一|调性统一/.test(text) &&
      !/品牌规范|VI|vi|logo|Logo|品牌色|品牌字体/.test(text) &&
      !/适配|改尺寸|多尺寸|横版.*竖版|竖版.*横版|安全区|裁切/.test(text)
    ) {
      return "unify_series_visual_system";
    }
    if (
      /适配|改尺寸|多尺寸|多平台|一稿多|横版.*竖版|竖版.*横版|安全区|裁切|公众号头图|朋友圈海报|小红书封面|banner.*尺寸|Banner.*尺寸/.test(text) &&
      /怎么|如何|改|适配|生成|做|处理/.test(text) &&
      !/新项目|创建项目|客户要|最后要交|需要.*(海报|头图|封面|包装|banner|PPT)|字太多|看不清|画面乱|太乱|层级|颜色|字体/.test(text)
    ) {
      return "adapt_multi_format";
    }
    if (isBrandConsistencyRequest(text, analysisBits)) {
      return "check_brand_consistency";
    }
    if (isLogoExposureRequest(text, analysisBits)) {
      return "optimize_logo_exposure";
    }
    if (isAlignmentSpacingRequest(text, analysisBits)) {
      return "optimize_alignment_spacing";
    }
    if (isVisualDensityRequest(text)) {
      return "balance_visual_density";
    }
    if (isSubjectBackgroundSeparationRequest(text, analysisBits)) {
      return "separate_subject_background";
    }
    if (isVisualImpactRequest(text)) {
      return "strengthen_visual_impact";
    }
    if (isVisualPolishRequest(text, analysisBits)) {
      return "improve_visual_polish";
    }
    if (
      /高级质感|质感|阴影|投影|光影|毛玻璃|玻璃拟态|金属|渐变|颗粒|噪点|发光|霓虹|立体字|材质|氛围光/.test(text) &&
      /怎么|如何|想做|做出|调|加|处理|效果|教程|方法|不影响|可读性/.test(text)
    ) {
      return "guide_visual_effect";
    }
    if (
      /版式模板|排版模板|版式结构|排版结构|画面结构|构图模板|构图结构|海报怎么排|封面怎么排|Banner怎么排|banner怎么排|怎么排版|如何排版|怎么构图|如何构图/.test(text) &&
      !/画面乱|太乱|看不清|字太多|不协调|哪里怪|怎么改|优化/.test(text)
    ) {
      return "recommend_layout_structure";
    }
    if (
      /字体搭配|字体怎么搭|字体怎么选|用什么字体|标题字体|正文字体|字号层级|字号怎么|字重|字距|行距|文字间距|字体太挤|字太挤/.test(text) &&
      !/品牌字体|品牌规范|VI|vi|文案|标题文案|主标题文案|怎么写|精简/.test(text)
    ) {
      return "recommend_typography_system";
    }
    if (
      /配色怎么|颜色怎么|色彩怎么|颜色搭|配色搭|主色|辅助色|强调色|颜色太暗|颜色太灰|颜色太脏|画面太暗|画面太灰|画面太脏|不够亮|不够年轻|色值怎么|怎么调色|如何调色/.test(text) &&
      /怎么|如何|搭|配|调|建议|处理|改善|优化|不够|太暗|太灰|太脏/.test(text) &&
      !(analysisBits.feedback && /反馈|说|觉得|希望|要求|建议|客户|主管|老板|运营|产品|甲方/.test(text)) &&
      !/品牌色|品牌规范|VI|vi/.test(text)
    ) {
      return "recommend_color_system";
    }
    if (
      /高级感|高级一点|年轻感|年轻一点|科技感|未来感|国潮|国风|中国风|可爱|童趣|活泼|极简|大气|轻奢|复古|ins风|赛博|潮酷|清新|温暖|专业感/.test(text) &&
      /怎么|如何|做出|做成|表现|落地|视觉语言|调性|风格|想做|想要|要做|设计/.test(text) &&
      !(analysisBits.feedback && /反馈|说|觉得|希望|要求|建议|客户|主管|老板|运营|产品|甲方/.test(text)) &&
      !/方向|方案|关键词|配色|颜色|字体|字号|字距|行距/.test(text)
    ) {
      return "translate_style_keyword";
    }
    if (
      analysisBits.designIssue &&
      !analysisBits.feedback &&
      !/文案|标题|主标题|副标题|slogan|口号|标语|卖点|利益点|CTA|按钮文案|文字太多|精简|怎么写/.test(text) &&
      /不知道|怎么改|怎么优化|优化|卡住了|没思路|没灵感|太乱|画面乱|看不清|不协调|哪里怪|字太多|太普通|不好看|不高级|不精致/.test(text)
    ) {
      return "solve_design_issue";
    }
    if (analysisBits.designerQuestion) return "answer_design_question";
    if (/文案|标题|主标题|副标题|slogan|口号|标语|卖点|利益点|CTA|按钮文案|文字太多|精简.*文字|怎么写/.test(text)) {
      return "refine_copywriting";
    }
    if (/给.*(方向|方案|关键词)|出.*(方向|方案)|想.*(方向|方案)|视觉关键词|设计方向|风格方向|创意方向|几个方向|几个方案/.test(text)) {
      return "ask_design_directions";
    }
    if (/选哪个|哪个更好|哪个方案|方案[AB]|A.*B|两个方案|要不要|该不该/.test(text)) return "compare_design_options";
    if (/项目名|项目名称|名字.*(改成|改为|叫)|名称.*(改成|改为)/.test(text)) return "update_project_name";
    if (/项目类型|设计类型|类型.*(改成|改为|是)|类别.*(改成|改为|是)/.test(text)) return "update_project_type";
    if (/客户|老板|主管|甲方|运营|产品/.test(text) && /确认了|通过了|回复了|同意了|ok了|OK了/.test(text)) return "clear_waiting";
    if (/反馈.*(处理好了|改完了|已处理|完成)|修改.*(完成|改完)/.test(text)) return "mark_feedback_handled";
    if (/不对劲|有点怪|怪怪的|不舒服|不协调|不太对|说不上来|不知道哪里|看着不行|感觉不对/.test(text)) {
      return "diagnose_ambiguous_issue";
    }
    if (analysisBits.meta && (analysisBits.meta.name || analysisBits.meta.type)) return analysisBits.meta.name ? "update_project_name" : "update_project_type";
    if (analysisBits.meta && (analysisBits.meta.specs || analysisBits.meta.formats)) return "update_project_specs";
    if (analysisBits.createsProject) return "create_project";
    if (analysisBits.designIssue && /不知道|怎么改|怎么优化|卡住了|没思路|没灵感/.test(text)) return "solve_design_issue";
    if (/完成了|已完成|已经完成|做完了|已经做完|已提交|已发给|已交付|过稿|定稿/.test(text)) return "complete_progress";
    if (/等|等待|待确认|待反馈|还没回|没回复|没确认|已发给.*看|已经发给.*看|发给.*看了/.test(text)) return "waiting_confirmation";
    if (analysisBits.feedback) return "record_feedback";
    if (analysisBits.designIssue) return "solve_design_issue";
    if (/改到|延期|延后|提前|截止|什么时候交|交期|ddl|deadline/i.test(text) && analysisBits.dueDate) return "update_deadline";
    if (/目标|受众|人群|场景|投放|用途|解决|给.*看|出现在哪里/.test(text)) return "update_brief";
    if (analysisBits.deliverables && analysisBits.deliverables.length) return "update_deliverables";
    return "record_note";
  }

  function isInformationHierarchyRequest(text, analysisBits = {}) {
    const hasHierarchyIntent = /主次|取舍|分层|信息层级|怎么排|如何排|文字.*怎么排|内容.*怎么排|卖点.*怎么排|都想放|全部放/.test(text);
    return (
      !analysisBits.feedback &&
      /信息太多|内容太多|文字太多|字太多|卖点太多|卖点很多|重点太多|主次不清|没有主次|都想放|全部放|怎么取舍|怎么分层|信息层级怎么|文字.*怎么排|内容.*怎么排|卖点.*怎么排/.test(text) &&
      hasHierarchyIntent &&
      /怎么|如何|排|取舍|分层|层级|主次|放|删|弱化|整理|处理/.test(text) &&
      !/文案怎么写|文案.*精简|精简.*文案|标题文案|主标题文案|slogan|口号|标语|CTA|按钮文案/.test(text)
    );
  }

  function isReadabilityRequest(text, analysisBits = {}) {
    const readabilityProblem = /看不清|读不清|不清楚|字太小|字太细|字糊|文字糊|阅读困难|可读性|识别不出来|小屏.*看不|手机.*看不|缩略图.*看不|对比度不够|文字.*背景.*(融|糊|不清)|背景.*文字.*(融|糊|不清)|信息.*糊成/.test(text);
    const designContext = /海报|封面|banner|Banner|社媒|小红书|朋友圈|公众号|版面|画面|设计|视觉|文字|字体|标题|主标题|二维码|手机|小屏|缩略图/.test(text);
    const asksAction = /怎么|如何|为什么|哪里|感觉|优化|调整|处理|诊断|帮我看|应该|提升|改善/.test(text);
    const plainFeedback = analysisBits.feedback && /老板|客户|主管|甲方|运营|产品/.test(text) && !/怎么|如何|为什么|哪里|诊断|帮我看|优化|调整|处理|应该|改善|提升/.test(text);
    const typographySystem = /字体搭配|字体怎么搭|字体怎么选|用什么字体|字号层级|字距|行距/.test(text) && !readabilityProblem;
    const visualEffect = /毛玻璃|玻璃拟态|阴影|投影|光影|金属|渐变|颗粒|噪点|发光|霓虹|立体字|材质|氛围光/.test(text);
    return readabilityProblem && designContext && asksAction && !plainFeedback && !typographySystem && !visualEffect;
  }

  function isLogoExposureRequest(text, analysisBits = {}) {
    const logoMention = /Logo|logo|标志|品牌露出|品牌标识|品牌名|品牌名称|品牌存在感|品牌更明显|品牌不明显/.test(text);
    const exposureIntent = /放哪|放哪里|怎么放|摆哪|位置|多大|大小|尺寸|放大|再大|更大|太小|不明显|更明显|突出|露出|存在感|不抢|不要抢|压住|安全距离|留白/.test(text);
    const designContext = /海报|封面|banner|Banner|社媒|小红书|朋友圈|公众号|画面|版面|设计|视觉|主视觉|品牌|Logo|logo/.test(text);
    const asksAction = /怎么|如何|为什么|哪里|感觉|优化|调整|处理|诊断|帮我看|应该|建议/.test(text);
    const pureBrandSystem = /品牌规范|视觉规范|VI|vi|品牌手册|标准色|品牌字体|禁用规则|一致性检查/.test(text);
    const plainFeedback = analysisBits.feedback && /老板|客户|主管|甲方|运营|产品/.test(text) && !asksAction;
    return logoMention && exposureIntent && designContext && asksAction && !pureBrandSystem && !plainFeedback;
  }

  function isBrandConsistencyRequest(text, analysisBits = {}) {
    const brandMention = /品牌规范|视觉规范|VI|vi|品牌色|品牌字体|logo.*使用|Logo.*使用|不符合品牌|不像品牌|不像我们|品牌一致|调性统一|品牌调性|风格跑偏|品牌感/.test(text);
    const asksAction = /怎么|如何|为什么|哪里|检查|规范|要注意|建议|帮我看|诊断|统一|调整|优化|处理|修/.test(text);
    const pureKnowledge = /品牌规范|视觉规范|VI|vi|品牌色|品牌字体|logo.*使用|Logo.*使用|要注意|检查|规范/.test(text);
    const stakeholderSaid = /老板|客户|主管|甲方|运营|产品/.test(text) && /说|反馈|觉得|希望|要求|建议/.test(text);
    const plainFeedback = (analysisBits.feedback || stakeholderSaid) && !/怎么|如何|为什么|哪里|检查|诊断|帮我看|优化|调整|处理|应该|修/.test(text);
    return brandMention && (asksAction || pureKnowledge) && !plainFeedback;
  }

  function isCompositeIntegrationRequest(text, analysisBits = {}) {
    const compositeProblem = /合成.*(假|不自然|生硬|不像)|像贴上去|贴上去|不融合|融合不进去|不像一张图|不在一个画面|光源不一致|光影不统一|色温不统一|透视不对|透视怪|阴影不对|接触阴影|产品图.*(假|不自然|贴)|人物.*(假|不自然|贴)|素材.*(不融合|不像.*世界)/.test(text);
    const designContext = /海报|封面|banner|Banner|画面|设计|视觉|产品图|人物|素材|背景|主视觉|合成|修图/.test(text);
    const asksAction = /怎么|如何|为什么|哪里|感觉|优化|调整|处理|诊断|帮我看|应该|修|自然|统一/.test(text);
    const plainFeedback = analysisBits.feedback && /老板|客户|主管|甲方|运营|产品/.test(text) && !/怎么|如何|为什么|哪里|诊断|帮我看|优化|调整|处理|应该|修/.test(text);
    return compositeProblem && designContext && asksAction && !plainFeedback;
  }

  function isAlignmentSpacingRequest(text, analysisBits = {}) {
    const spacingProblem = /对不齐|没对齐|不对齐|对齐.*乱|间距不统一|间距不一致|边距不统一|边距不一致|边距怪|元素.*飘|像飘着|不整齐|不齐|参差|贴边|太贴边|网格.*乱|没有网格|秩序感不够/.test(text);
    const designContext = /海报|封面|banner|Banner|版面|画面|排版|设计|视觉|元素|文字|标题|卡片|信息|网格|边距|间距|对齐/.test(text);
    const asksAction = /怎么|如何|为什么|哪里|感觉|优化|调整|处理|诊断|帮我看|应该|统一|整理/.test(text);
    const typographyOnly = /字距|行距|文字间距|字体太挤|字太挤/.test(text);
    const stakeholderSaid = /老板|客户|主管|甲方|运营|产品/.test(text) && /说|反馈|觉得|希望|要求|建议/.test(text);
    const plainFeedback = (analysisBits.feedback || stakeholderSaid) && !/怎么|如何|为什么|哪里|诊断|帮我看|优化|调整|处理|应该/.test(text);
    return spacingProblem && designContext && asksAction && !typographyOnly && !plainFeedback;
  }

  function isStakeholderConflictRequest(text) {
    const peopleHits = ["老板", "客户", "主管", "甲方", "运营", "产品", "市场", "同事"].filter((person) => text.includes(person));
    return (
      peopleHits.length >= 2 &&
      /意见.*(不一致|不一样|冲突|打架)|反馈.*(不一致|不一样|冲突|打架)|各说各|一个说|另一个说|听谁|按谁|谁说了算|谁拍板|怎么取舍|优先听|优先级/.test(text) &&
      !/话术|怎么问|怎么说|帮我问|催|没回|没回复/.test(text)
    );
  }

  function isDeadlineNegotiationRequest(text) {
    const timePressure = /来不及|赶不完|做不完|时间不够|今天交|明天交|马上要|下班前|截止|ddl|deadline|太赶|任务太多/.test(text);
    const negotiationIntent = /延期|延后|推迟|改期|争取时间|怎么跟.*说|怎么说|话术|沟通|砍需求|砍范围|降范围|少做|先交|分批|取舍|保哪|舍哪|能不能/.test(text);
    const stakeholder = /老板|客户|主管|甲方|领导|运营|产品|对方|他们|负责人/.test(text);
    return timePressure && negotiationIntent && stakeholder;
  }

  function isProgressStatusReportRequest(text) {
    const progressIntent = /进度|做到哪|做到哪里|做到什么程度|目前情况|现在情况|阶段|状态|汇报一下|同步一下|催稿|催我|问我|什么时候能给|什么时候可以给|什么时候出|多久能给|能不能先给|先给一版/.test(text);
    const stakeholder = /老板|客户|主管|甲方|领导|运营|产品|对方|他们|负责人/.test(text);
    const wantsReply = /怎么回|怎么回复|怎么说|话术|汇报|同步|整理|告诉|问我|催/.test(text);
    return progressIntent && stakeholder && wantsReply && !/延期|延后|推迟|砍范围|降范围|来不及/.test(text);
  }

  function isVisualPolishRequest(text, analysisBits = {}) {
    const polishProblem = /廉价|显土|很土|太土|土气|低级|不精致|粗糙|像模板|模板感|网感太强|淘宝感|影楼感|塑料感|脏|乱糟糟|不高级|没质感/.test(text);
    const asksAction = /怎么|如何|为什么|哪里|看起来|感觉|优化|提升|改|修|调整|处理|诊断|帮我看/.test(text);
    const plainFeedback = analysisBits.feedback && /老板|客户|主管|甲方|运营|产品/.test(text) && !/怎么|如何|为什么|哪里|诊断|帮我看|改|优化|提升/.test(text);
    return polishProblem && asksAction && !plainFeedback;
  }

  function isVisualDensityRequest(text) {
    const densityProblem = /画面.*(太空|很空|空了|空荡|太满|很满|太挤|拥挤|挤|太散|很散|散了|不平衡|失衡|重心|压不住|头重脚轻|左重右轻)|版面.*(太空|很空|太满|很满|太挤|拥挤|太散|很散|不平衡|失衡)|留白.*(怪|多|少|不舒服)|元素.*(散|挤|太多|太少)/.test(text);
    const designContext = /海报|封面|banner|Banner|版面|画面|构图|设计|视觉|排版|留白|元素|主视觉|标题/.test(text);
    const asksAction = /怎么|如何|为什么|哪里|感觉|优化|调整|改|修|处理|诊断|帮我看|应该/.test(text);
    return densityProblem && designContext && asksAction;
  }

  function isSubjectBackgroundSeparationRequest(text, analysisBits = {}) {
    const separationProblem = /主体不突出|主视觉不突出|产品不突出|人物不突出|主体.*(融进|混进|被背景吃掉|看不出来)|主视觉.*(融进|混进|被背景吃掉|看不出来)|背景太抢|背景抢|背景太花|背景太乱|背景压住|主体和背景.*(分不开|太近|混在一起)|没有层次感|层次感不够|层次不够|前后关系不清|前景.*背景.*分不开|画面太扁|空间感不够/.test(text);
    const designContext = /海报|封面|banner|Banner|版面|画面|构图|设计|视觉|主视觉|主体|产品|人物|背景|层次|空间/.test(text);
    const asksAction = /怎么|如何|为什么|哪里|感觉|优化|调整|改|修|处理|诊断|帮我看|应该/.test(text);
    const plainFeedback = analysisBits.feedback && /老板|客户|主管|甲方|运营|产品/.test(text) && !/怎么|如何|为什么|哪里|诊断|帮我看|优化|调整|处理/.test(text);
    return separationProblem && designContext && asksAction && !plainFeedback;
  }

  function isVisualImpactRequest(text) {
    const impactProblem = /不吸睛|不抓人|抓不住|没有冲击力|没冲击力|不够冲击|太平|平平|平淡|没记忆点|记不住|太普通|没有亮点|亮点不够|第一眼不强|第一眼弱|视觉锚点|传播感不强|不够醒目/.test(text);
    const designContext = /海报|封面|banner|Banner|版面|画面|构图|设计|视觉|主视觉|标题|KV|kv/.test(text);
    const asksAction = /怎么|如何|为什么|哪里|感觉|优化|提升|调整|处理|诊断|帮我看|应该/.test(text);
    return impactProblem && designContext && asksAction;
  }

  function isActionPathRequest(text) {
    const actionElement = /二维码|扫码|按钮|CTA|行动入口|报名入口|购买入口|领取入口|预约入口|转化|点击|下单|报名|预约|领取|购买/.test(text);
    const designContext = /海报|封面|banner|Banner|社媒|小红书|朋友圈|公众号|活动页|页面|画面|版面|设计|视觉|二维码|按钮|CTA|入口/.test(text);
    const actionIntent = /放哪|放哪里|怎么放|摆哪|突出|引导|让.*(扫码|点击|报名|预约|领取|购买|下单)|怎么.*(扫码|点击|报名|预约|领取|购买|下单|转化)|不突兀|不抢|清楚|看得见|路径|动线/.test(text);
    const hierarchyOnly = /排主次|信息层级|信息太多|卖点.*时间.*二维码/.test(text);
    return actionElement && designContext && actionIntent && !hierarchyOnly;
  }

  function isMissingAssetRequest(text) {
    const assetMention = /logo|Logo|标志|品牌手册|品牌规范|主文案|文案|标题|slogan|口号|图片|照片|产品图|素材|二维码|价格|优惠|活动时间|时间地点|地址|规则|卖点|资料|信息/.test(text);
    const missingIntent = /没给|还没给|没有给|没收到|还没收到|缺|缺少|不全|没齐|没给齐|还差|要.*(给|提供|发)|索要|补齐|补充|等.*(素材|文案|图片|logo|Logo|二维码|资料|信息)/.test(text);
    const qualityOrRights = /风格不统一|图片风格|图太糊|太糊|清晰度|分辨率|抠图|扣图|水印|版权|授权|商用|侵权|找不到合适/.test(text);
    const specOnly = /尺寸|规格|交付格式|格式|出血|CMYK|转曲/.test(text) && !assetMention;
    return assetMention && missingIntent && !qualityOrRights && !specOnly;
  }

  function isAssetLicenseAuditRequest(text) {
    const rightsTerms = /版权|授权|字体授权|图片版权|商用|侵权|可商用|商用风险|授权风险|素材来源|来源不清|网上找的图|网上下载|免费字体|免费素材|图库|字体能不能用|图片能不能用/.test(text);
    const projectUse = /项目|这张图|海报|封面|物料|客户|公司|商用|对外|上线|发布|投放|交付|源文件|最终稿|用了|准备/.test(text);
    const auditIntent = /帮我|检查|审查|确认|整理|列|风险|清单|能不能|可不可以|要不要|怎么办|怎么处理/.test(text);
    const pureQuestion = /^版权|^授权/.test(text) && !/项目|这张|用了|客户|交付|商用|对外/.test(text);
    return rightsTerms && projectUse && auditIntent && !pureQuestion;
  }

  function isVagueFeedbackClarificationRequest(text) {
    const vagueFeedback = /再改改|再优化|不够好|不够有感觉|没感觉|感觉不对|不够出彩|不够高级|不够年轻|不够活泼|不够精致|太普通|不好看|有点怪|怪怪的|不对劲|说不上来|没说清楚|没讲清楚|反馈很虚|反馈太虚|只说/.test(text);
    const asksClarify = /怎么问|如何问|追问|问清楚|确认清楚|怎么确认|怎么回复|怎么说|不冒犯|委婉|礼貌|话术|问哪些|问什么/.test(text);
    const stakeholder = /老板|客户|主管|甲方|运营|产品|领导|对方|他们|她|他/.test(text);
    return vagueFeedback && asksClarify && stakeholder;
  }

  function isMoodboardPlanningRequest(text) {
    const referenceIntent = /找参考|参考怎么找|去哪找参考|灵感|情绪板|moodboard|Moodboard|关键词.*参考|参考关键词|素材方向|视觉参考|竞品参考|参考方向|收集参考|建.*参考|建.*情绪板/.test(text);
    const planningIntent = /怎么|如何|帮我|给我|列|规划|计划|方向|关键词|清单|收集|找|整理|开始/.test(text);
    const existingReference = /这张参考|这个参考|已有参考|参考图.*(怎么拆|拆解|分析|借鉴|不要抄|不抄|好在哪里)|照着做/.test(text);
    const rightsOrSourceOnly = /版权|授权|商用|侵权|网站|平台|网址|哪里下载/.test(text);
    return referenceIntent && planningIntent && !existingReference && !rightsOrSourceOnly;
  }

  function isImagePromptRequest(text) {
    const promptIntent = /AI生图|AI 生图|生图|生成图片|生成一张图|生成背景|出图提示词|提示词|prompt|Prompt|Midjourney|midjourney|MJ|mj|即梦|可灵|Stable Diffusion|stable diffusion|SD生图|豆包生图|通义万相/.test(text);
    const imageUse = /海报|封面|背景|主视觉|素材|产品图|氛围图|插画|图标|KV|kv|小红书|朋友圈|公众号|banner|Banner|包装|画面/.test(text);
    const asksHelp = /帮我|怎么写|写一组|给我|生成|整理|做|出|要/.test(text);
    const illustratorContext = /AI里|AI 里|AI怎么|AI 怎么|Adobe AI|Illustrator|illustrator|转曲|画板|导出/.test(text);
    return promptIntent && imageUse && asksHelp && !illustratorContext;
  }

  function isReferenceSimilarityNegotiationRequest(text) {
    const referenceIntent = /参考图|参考案例|竞品|案例|别人家|照这个|照着|像这个|还原|一模一样|越像越好|模仿|抄|照抄/.test(text);
    const stakeholder = /老板|客户|主管|甲方|领导|对方|他们/.test(text);
    const communicationIntent = /怎么说|怎么解释|怎么回|话术|沟通|说服|回复|婉拒|风险|版权|侵权|还原度|一模一样|越像越好|像但不抄/.test(text);
    const pureReferenceAnalysis = /拆解|分析|借鉴/.test(text) && !/怎么说|怎么解释|怎么回|话术|沟通|说服|版权|侵权|风险|越像越好|一模一样/.test(text);
    return referenceIntent && stakeholder && communicationIntent && !pureReferenceAnalysis;
  }

  function isMultiConceptPlanningRequest(text) {
    const multiConceptIntent = /两版|2版|二版|三版|3版|多版|几版|AB方案|A\/B|A B|方案A|方案B|两套|三套|多套|几个方案|几种方案|提案方向|方向区分|方案区分|不要换皮|不想只是换颜色/.test(text);
    const planningIntent = /出|做|给|规划|设计|方向|方案|提案|区分|怎么分|怎么讲|怎么汇报|怎么安排/.test(text);
    const choosingIntent = /选哪个|哪个更好|该选|要不要|方案A.*方案B.*选|A.*B.*选/.test(text);
    return multiConceptIntent && planningIntent && !choosingIntent;
  }

  function isDesignSoftwareOperationRequest(text) {
    const toolMention = /Photoshop|photoshop|PS|ps|Figma|figma|Illustrator|illustrator|AI里|AI 里|AI怎么|AI 怎么|Adobe AI|Canva|canva|稿定|创客贴/.test(text);
    const operationMention = /导出|另存|保存|转曲|文字转曲|打包|嵌入|链接|切图|画板|画布|蒙版|智能对象|分辨率|像素|颜色模式|CMYK|RGB|PDF|png|jpg|svg|切片|出图|压缩|模糊|糊了/.test(text);
    const asksHow = /怎么|如何|为什么|哪里|设置|步骤|操作|总是|应该|要不要|能不能|检查/.test(text);
    const aiProduct = /AI产品|AI工具|AI助手|人工智能|模型|千问|api|API|接口/.test(text);
    return toolMention && operationMention && asksHow && !aiProduct;
  }

  function isDesignHandoffRequest(text) {
    const handoffIntent = /交接|交给开发|给开发|给运营|给同事|给市场|给印厂|交付说明|使用说明|标注说明|设计标注|切图说明|怎么标注|怎么交接|handoff|Handoff/.test(text);
    const designArtifact = /设计稿|源文件|Figma|figma|psd|PSD|ai|AI|切图|图标|组件|物料|海报|页面|Banner|banner|运营图|模板/.test(text);
    const asksHelp = /怎么|如何|帮我|整理|写|生成|准备|要给|需要/.test(text);
    return handoffIntent && designArtifact && asksHelp;
  }

  function isProjectClosureRecordRequest(text) {
    const closureSignal = /已上线|上线了|发布了|投放了|已投放|已交付|交付完成|客户确认最终稿|客户确认了最终稿|老板确认最终稿|最终稿确认|定稿了|过稿了|收尾|归档一下|整理结果|记录结果|效果不错|数据不错|点击|曝光|转化|报名|阅读量|收藏|点赞|成交/.test(text);
    const recordIntent = /记录|整理|归档|收尾|复盘|作品集|结果|完成|已|了|一下/.test(text);
    const onlyWaiting = /等反馈|待反馈|等确认|还没确认|没确认/.test(text);
    return closureSignal && recordIntent && !onlyWaiting;
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
    const goal = text.match(/(?:目标|目的|目的是|解决|为了|希望|用来)(?:是|：|:)?(.{4,60}?)(?:。|；|，|,|$)/);
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
    const designerQuestion = detectDesignerQuestion(clean);
    const deliverables = extractDeliverables(clean);
    const createsProject = /新项目|创建项目|项目|客户要|需要.*(海报|头图|封面|包装|banner|PPT)/i.test(clean) && deliverables.length > 1;
    const brief = extractBriefFields(clean);
    const meta = extractProjectMeta(clean);
    const behavior = detectBehavior(clean, { createsProject, feedback, deliverables, dueDate, meta, designIssue, designerQuestion });
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
      designerQuestion,
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
      "organize_meeting_notes",
      "decompose_brief",
      "plan_design_concepts",
      "plan_reference_research",
      "generate_image_prompt_brief",
      "ask_review",
      "ask_checklist",
      "ask_portfolio",
      "project_retrospective",
      "record_project_outcome",
      "generate_growth_profile",
      "ask_confirmation_message",
      "request_missing_assets",
      "clarify_vague_feedback",
      "align_stakeholder_feedback",
      "synthesize_feedback_batch",
      "handle_scope_change",
      "answer_design_question",
      "audit_asset_license",
      "ask_design_directions",
      "compare_design_options",
      "triage_overload",
      "negotiate_deadline_scope",
      "report_progress_status",
      "estimate_design_workload",
      "prepare_feedback_request",
      "refine_copywriting",
      "optimize_action_path",
      "organize_information_hierarchy",
      "optimize_readability",
      "simulate_design_defense",
      "prepare_design_presentation",
      "handle_negative_feedback",
      "diagnose_ambiguous_issue",
      "integrate_composite_assets",
      "fix_asset_quality",
      "guide_design_software_operation",
      "negotiate_reference_similarity",
      "analyze_reference",
      "unify_series_visual_system",
      "organize_delivery_files",
      "prepare_design_handoff",
      "guide_print_prepress",
      "recommend_platform_specs",
      "adapt_multi_format",
      "check_brand_consistency",
      "optimize_logo_exposure",
      "optimize_alignment_spacing",
      "balance_visual_density",
      "separate_subject_background",
      "strengthen_visual_impact",
      "improve_visual_polish",
      "guide_visual_effect",
      "recommend_layout_structure",
      "recommend_typography_system",
      "recommend_color_system",
      "translate_style_keyword",
      "solve_design_issue",
      "cancel_task",
      "complete_checklist",
      "snooze_task",
      "summarize_version_changes",
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
    if (analysis.behavior === "organize_meeting_notes") return organizeMeetingNotes(state, project, analysis, now);
    if (analysis.behavior === "decompose_brief") return decomposeBrief(state, project, analysis, now);
    if (analysis.behavior === "plan_design_concepts") return planDesignConcepts(project, analysis);
    if (analysis.behavior === "plan_reference_research") return planReferenceResearch(state, project, analysis, now);
    if (analysis.behavior === "generate_image_prompt_brief") return generateImagePromptBrief(state, project, analysis, now);
    if (analysis.behavior === "ask_review") {
      return generateReview(project, state.feedback.filter((item) => item.projectId === project.id));
    }
    if (analysis.behavior === "solve_design_issue") return solveDesignIssue(project, analysis);
    if (analysis.behavior === "ask_portfolio") {
      return generatePortfolioCase(project, state.feedback.filter((item) => item.projectId === project.id));
    }
    if (analysis.behavior === "project_retrospective") return generateProjectRetrospective(state, project, analysis, now);
    if (analysis.behavior === "record_project_outcome") return recordProjectOutcome(state, project, analysis, now);
    if (analysis.behavior === "generate_growth_profile") return generateGrowthProfile(state, analysis, now);
    if (analysis.behavior === "request_missing_assets") return requestMissingAssets(state, project, analysis, now);
    if (analysis.behavior === "clarify_vague_feedback") return clarifyVagueFeedback(state, project, analysis, now);
    if (analysis.behavior === "ask_confirmation_message") return generateConfirmationMessage(state, project, analysis.text);
    if (analysis.behavior === "align_stakeholder_feedback") return alignStakeholderFeedback(state, project, analysis, now);
    if (analysis.behavior === "synthesize_feedback_batch") return synthesizeFeedbackBatch(state, project, analysis, now);
    if (analysis.behavior === "handle_scope_change") return handleScopeChange(state, project, analysis, now);
    if (analysis.behavior === "answer_design_question") return answerDesignQuestion(project, analysis);
    if (analysis.behavior === "audit_asset_license") return auditAssetLicense(state, project, analysis, now);
    if (analysis.behavior === "ask_design_directions") return generateDesignDirections(project, analysis);
    if (analysis.behavior === "compare_design_options") return compareDesignOptions(project, analysis);
    if (analysis.behavior === "triage_overload") return generateTriagePlan(state, project, analysis, now);
    if (analysis.behavior === "negotiate_deadline_scope") return negotiateDeadlineScope(state, project, analysis, now);
    if (analysis.behavior === "report_progress_status") return reportProgressStatus(state, project, analysis, now);
    if (analysis.behavior === "estimate_design_workload") return estimateDesignWorkload(state, project, analysis, now);
    if (analysis.behavior === "prepare_feedback_request") return prepareFeedbackRequest(state, project, analysis, now);
    if (analysis.behavior === "refine_copywriting") return refineCopywriting(project, analysis);
    if (analysis.behavior === "optimize_action_path") return optimizeActionPath(project, analysis);
    if (analysis.behavior === "organize_information_hierarchy") return organizeInformationHierarchy(project, analysis);
    if (analysis.behavior === "optimize_readability") return optimizeReadability(project, analysis);
    if (analysis.behavior === "simulate_design_defense") return simulateDesignDefense(state, project, analysis);
    if (analysis.behavior === "prepare_design_presentation") return generatePresentationScript(state, project, analysis);
    if (analysis.behavior === "handle_negative_feedback") return handleNegativeFeedback(state, project, analysis, now);
    if (analysis.behavior === "diagnose_ambiguous_issue") return diagnoseAmbiguousIssue(project, analysis);
    if (analysis.behavior === "integrate_composite_assets") return integrateCompositeAssets(project, analysis);
    if (analysis.behavior === "fix_asset_quality") return fixAssetQuality(project, analysis);
    if (analysis.behavior === "guide_design_software_operation") return guideDesignSoftwareOperation(project, analysis);
    if (analysis.behavior === "negotiate_reference_similarity") return negotiateReferenceSimilarity(project, analysis);
    if (analysis.behavior === "analyze_reference") return analyzeReference(project, analysis);
    if (analysis.behavior === "unify_series_visual_system") return unifySeriesVisualSystem(project, analysis);
    if (analysis.behavior === "organize_delivery_files") return organizeDeliveryFiles(project, analysis);
    if (analysis.behavior === "prepare_design_handoff") return prepareDesignHandoff(state, project, analysis, now);
    if (analysis.behavior === "guide_print_prepress") return guidePrintPrepress(project, analysis);
    if (analysis.behavior === "recommend_platform_specs") return recommendPlatformSpecs(project, analysis);
    if (analysis.behavior === "adapt_multi_format") return adaptMultiFormat(project, analysis);
    if (analysis.behavior === "check_brand_consistency") return checkBrandConsistency(project, analysis);
    if (analysis.behavior === "optimize_logo_exposure") return optimizeLogoExposure(project, analysis);
    if (analysis.behavior === "optimize_alignment_spacing") return optimizeAlignmentSpacing(project, analysis);
    if (analysis.behavior === "balance_visual_density") return balanceVisualDensity(project, analysis);
    if (analysis.behavior === "separate_subject_background") return separateSubjectBackground(project, analysis);
    if (analysis.behavior === "strengthen_visual_impact") return strengthenVisualImpact(project, analysis);
    if (analysis.behavior === "improve_visual_polish") return improveVisualPolish(project, analysis);
    if (analysis.behavior === "guide_visual_effect") return guideVisualEffect(project, analysis);
    if (analysis.behavior === "recommend_layout_structure") return recommendLayoutStructure(project, analysis);
    if (analysis.behavior === "recommend_typography_system") return recommendTypographySystem(project, analysis);
    if (analysis.behavior === "recommend_color_system") return recommendColorSystem(project, analysis);
    if (analysis.behavior === "translate_style_keyword") return translateStyleKeyword(project, analysis);
    if (analysis.behavior === "ask_checklist") return generateChecklistText(state, project);
    if (analysis.behavior === "update_project_name" || analysis.behavior === "update_project_type" || analysis.behavior === "update_project_specs") {
      applyProjectMeta(state, project, analysis.meta);
      project.risks = rebuildProjectRisks(project, analysis);
      return buildMetaUpdateReply(project, analysis);
    }
    if (analysis.behavior === "snooze_task") return snoozeTaskFromText(state, project, analysis, now);
    if (analysis.behavior === "summarize_version_changes") return summarizeVersionChanges(state, project, analysis);
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
    const contextual = buildContextualDesignAdvice(project, issue, analysis);
    if (contextual.length) {
      lines.push("结合这个项目，额外注意：");
      contextual.forEach((item) => lines.push(`- ${item}`));
    }
    lines.push(`下一步：${issue.nextStep}`);
    if (project.goal && !/待补充/.test(project.goal)) {
      lines.push(`判断标准：每一步都回到项目目标「${project.goal}」，不要只凭“好不好看”改。`);
    } else {
      lines.push("还需要补一句项目目标。目标清楚后，我才能帮你判断哪种改法更对。");
    }
    project.portfolio.process = appendSentence(project.portfolio.process, `设计卡点：${analysis.text}`);
    return lines.join("\n");
  }

  function buildContextualDesignAdvice(project, issue, analysis) {
    const text = `${project.type} ${(project.deliverables || []).join("、")} ${analysis.text}`;
    const advice = [];
    if (/小红书|朋友圈|公众号|社媒|封面|头图|Banner/i.test(text)) {
      advice.push("先用手机预览尺寸看一眼，主标题和关键利益点要在小屏上仍然清楚。");
    }
    if (/印刷|包装|画册|折页/.test(text)) {
      advice.push("如果要印刷，先确认出血、CMYK、图片精度和文字是否需要转曲，别等导出前才补。");
    }
    if (/品牌|logo|VI|视觉识别/i.test(text)) {
      advice.push("先回到品牌规范：色值、字体、图形语言要统一，别为了解决单张图破坏识别感。");
    }
    if (project.dueDate && daysUntil(project.dueDate) <= 1) {
      advice.push("时间很近，先修影响交付判断的 20%：主信息、可读性、尺寸格式，装饰细节后置。");
    }
    if (issue.keys.includes("layout_hierarchy") && project.goal && !/待补充/.test(project.goal)) {
      advice.push(`所有层级调整都服务于目标：${project.goal}`);
    }
    if (issue.keys.includes("typography") && /小红书|朋友圈|公众号|社媒|封面|头图/i.test(text)) {
      advice.push("封面类物料宁可少字，也不要把说明文字塞满；详情可以放正文或二级画面。");
    }
    return Array.from(new Set(advice)).slice(0, 4);
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

  function handleNegativeFeedback(state, project, analysis, now) {
    const feedback = analysis.feedback || detectFeedback(analysis.text);
    const item = {
      id: uid("f"),
      projectId: project.id,
      from: analysis.from || "待补充",
      raw: analysis.text,
      action: feedback ? feedback.action : "把否定型反馈拆成可执行问题：目标、层级、风格、交付限制分别确认。",
      reason: feedback ? feedback.reason : "否定型反馈需要先定位问题范围，避免盲目重做。",
      conflict: Boolean(feedback && feedback.conflict),
      handled: false,
      version: project.versions && project.versions.length ? project.versions[project.versions.length - 1].name : "",
    };
    state.feedback.push(item);
    project.status = "designing";
    project.risks = Array.from(new Set((project.risks || []).concat(["否定型反馈，需要先确认重做范围"])));
    state.tasks.push({
      id: uid("t"),
      projectId: project.id,
      title: "拆解否定型反馈并补救方案",
      priority: "high",
      dueDate: analysis.dueDate || project.dueDate || formatDate(now),
      status: "todo",
      nextAction: "先确认不满意的是目标、层级、风格还是细节，再做一版补救小稿",
      feedbackIds: [item.id],
    });
    project.portfolio.process = appendSentence(project.portfolio.process, `否定型反馈：${analysis.text}`);
    return buildNegativeFeedbackPlan(project, item, analysis);
  }

  function buildNegativeFeedbackPlan(project, feedback, analysis) {
    const lines = [`补救方案：${project.name}`];
    lines.push("先别急着全部推翻。否定型反馈要先拆成“哪里不对”，否则会越改越乱。");
    lines.push(`已记录原话：${feedback.raw}`);
    lines.push("先问清 3 件事：");
    lines.push("1. 是目标方向不对，还是画面执行不够好？");
    lines.push("2. 哪些部分必须保留：文案、主视觉、品牌色、尺寸、活动信息？");
    lines.push("3. 希望下一版更接近哪个方向：更高级、更年轻、更清楚，还是更有记忆点？");
    lines.push("马上补救：");
    lines.push("- 先做一版黑白信息层级稿，证明主信息顺序是清楚的。");
    lines.push("- 再做 1 个风格小稿，不要同时试太多装饰。");
    lines.push("- 把修改前后放一起，方便老板/客户说清楚哪版更接近。");
    lines.push("可以这样回复：我先确认一下，这版主要是不符合方向，还是画面层级/风格细节不够？我会先保留必要信息，快速调整一版更接近目标的方向给你看。");
    if (analysis.dueDate || project.dueDate) {
      lines.push(`时间提醒：当前截止是 ${analysis.dueDate || project.dueDate}，建议先确认重做范围，再投入精修。`);
    }
    return lines.join("\n");
  }

  function clarifyVagueFeedback(state, project, analysis, now = new Date()) {
    project.status = "waiting";
    const stakeholder = analysis.from || guessConfirmationRecipient(analysis.text, state.feedback.filter((item) => item.projectId === project.id));
    const vaguePoint = extractVagueFeedbackPoint(analysis.text);
    if (!project.risks.includes("模糊反馈需要追问标准")) {
      project.risks.push("模糊反馈需要追问标准");
    }
    const feedbackItem = {
      id: uid("f"),
      projectId: project.id,
      from: stakeholder || "待补充",
      raw: vaguePoint,
      action: "先追问判断标准：目标方向、信息层级、风格情绪、具体保留/调整范围。",
      reason: "反馈原话偏主观，直接改会变成猜审美，容易反复返工。",
      conflict: false,
      handled: false,
      version: project.versions && project.versions.length ? project.versions[project.versions.length - 1].name : "",
    };
    state.feedback.push(feedbackItem);
    pushUniqueTask(state, {
      projectId: project.id,
      title: `追问模糊反馈：${stakeholder || "对方"}`,
      priority: project.dueDate && daysUntil(project.dueDate, now) <= 1 ? "high" : "normal",
      dueDate: project.dueDate || "",
      status: "waiting",
      nextAction: "先用礼貌话术确认判断标准，再决定下一版改层级、风格还是细节。",
      feedbackIds: [feedbackItem.id],
    });
    project.portfolio.process = appendSentence(project.portfolio.process, `模糊反馈追问：${vaguePoint}`);

    const lines = [`模糊反馈追问：${project.name}`];
    lines.push(`对方原话：${vaguePoint}`);
    lines.push("先别这样问：");
    lines.push("- 不要问“哪里不好看？”这会让对方继续给主观评价。");
    lines.push("- 不要马上说“我再改一版”，否则修改范围会失控。");
    lines.push("建议追问 3 个判断标准：");
    buildVagueFeedbackQuestions(project, analysis.text).forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("可以直接这样发：");
    lines.push(buildVagueFeedbackMessage(project, stakeholder, vaguePoint));
    lines.push("对方回答后这样改：");
    buildVagueFeedbackDecisionMap(project).forEach((item) => lines.push(`- ${item}`));
    lines.push("小画桌已把项目切到待确认，并记录这条模糊反馈。");
    return lines.join("\n");
  }

  function extractVagueFeedbackPoint(text) {
    const quoted = text.match(/[“"「](.+?)[”"」]/);
    if (quoted) return quoted[1];
    const said = text.match(/(?:说|反馈|觉得|只说|提到)(.{4,50}?)(?:，|。|；|,|$)/);
    if (said) return said[1].trim();
    const vague = text.match(/(再改改|再优化|不够好|不够有感觉|没感觉|感觉不对|不够出彩|不够高级|不够年轻|不够活泼|太普通|不好看|有点怪|怪怪的|不对劲|说不上来)/);
    return vague ? vague[1] : "反馈还不够具体";
  }

  function buildVagueFeedbackQuestions(project, text) {
    const questions = [
      "这版主要是不符合方向，还是方向对但画面执行不够？",
      "最需要调整的是主信息层级、整体风格、颜色字体，还是某个具体元素？",
      "下一版更希望接近哪个关键词：更清楚、更高级、更年轻、更热闹，还是更有记忆点？",
    ];
    if (project.goal && !/待补充|待从/.test(project.goal)) {
      questions.unshift(`如果围绕目标「${project.goal}」看，当前最影响目标的是哪一部分？`);
    }
    if (/老板|主管|领导/.test(text)) questions.push("这版有哪些部分可以保留，避免我把已经认可的内容也推翻？");
    if (/客户|甲方/.test(text)) questions.push("有没有一张更接近预期的参考，或者一个不希望出现的方向？");
    return Array.from(new Set(questions)).slice(0, 5);
  }

  function buildVagueFeedbackMessage(project, stakeholder, vaguePoint) {
    const target = stakeholder && !/你好/.test(stakeholder) ? stakeholder : "老师";
    const goal = project.goal && !/待补充|待从/.test(project.goal) ? `，同时保证「${project.goal}」这个目标不偏` : "";
    return `${target}，我收到这版需要“${vaguePoint}”。为了下一版更准确，我想先确认一下：主要是方向不对，还是信息层级/风格细节还不够？如果方便的话，也请帮我指出最需要保留和最需要调整的 1-2 个点，我会按这个优先级快速改一版${goal}。`;
  }

  function buildVagueFeedbackDecisionMap(project) {
    const map = [
      "如果对方说“方向不对”：先停精修，回到 brief 和参考方向，做 1-2 张低精小稿。",
      "如果对方说“信息不清”：优先改主标题、利益点、阅读顺序和字号层级。",
      "如果对方说“风格不对”：先确认关键词，再调整配色、字体气质和图形语言。",
      "如果对方说“细节不够”：保留大结构，只精修对齐、间距、素材质感和导出质量。",
    ];
    if ((project.risks || []).some((risk) => /尺寸|规格|交付格式/.test(risk))) {
      map.unshift("如果对方同时提到裁切/看不清：先确认尺寸、安全区和交付格式，再改视觉。");
    }
    return map.slice(0, 5);
  }

  function diagnoseAmbiguousIssue(project, analysis) {
    const lines = [`模糊问题诊断：${project.name}`];
    lines.push("先不急着猜原因。遇到“怪怪的 / 不对劲 / 说不上来”，按这个顺序排查：");
    buildAmbiguousChecks(project, analysis.text).forEach((item, index) => {
      lines.push(`${index + 1}. ${item}`);
    });
    lines.push("关键追问：");
    lines.push("- 第一眼应该看到什么？现在第一眼实际看到了什么？");
    lines.push("- 不舒服主要来自颜色、字体、比例、素材，还是信息太多？");
    lines.push("- 这张图是要更清楚、更高级、更年轻，还是更有促销感？");
    lines.push("下一步：先复制一版，只改一个变量。先改层级或对齐，不要同时改颜色、字体和素材。");
    const risks = currentProjectRisks(project);
    if (risks.length) lines.push(`别忘了先确认：${risks.slice(0, 2).join("、")}。`);
    project.portfolio.process = appendSentence(project.portfolio.process, `模糊问题诊断：${analysis.text}`);
    return lines.join("\n");
  }

  function buildAmbiguousChecks(project, text) {
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${text}`;
    const checks = [
      "关掉颜色看黑白稿：主标题、主图、辅助信息的顺序是否清楚。",
      "检查对齐和间距：有没有某些元素像是“飘着”或贴得太近。",
      "检查字体数量和字重：是否用了太多风格，导致语气不统一。",
      "检查颜色关系：主色、辅助色、强调色是否超过 3 类。",
      "检查素材质量和比例：主体图是否被拉伸、裁切或和风格不一致。",
    ];
    if (/小红书|朋友圈|公众号|社媒|封面|头图|Banner/i.test(combined)) {
      checks.splice(1, 0, "缩到手机预览大小：3 秒内能否看清主标题和核心利益点。");
    }
    if (/印刷|包装|画册|折页/.test(combined)) {
      checks.splice(1, 0, "放到真实尺寸看：出血、边距、字号和图片精度是否靠谱。");
    }
    return checks.slice(0, 6);
  }

  function integrateCompositeAssets(project, analysis) {
    const plan = buildCompositeIntegrationPlan(project, analysis.text);
    const lines = [`合成自然度诊断：${project.name}`];
    lines.push(`先判断：${plan.judge}`);
    lines.push("优先排查：");
    plan.causes.forEach((item) => lines.push(`- ${item}`));
    lines.push("按这个顺序修：");
    plan.steps.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("不要这样做：");
    plan.donts.forEach((item) => lines.push(`- ${item}`));
    lines.push("检查标准：");
    plan.checks.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push(`下一步：${plan.nextStep}`);
    project.portfolio.process = appendSentence(project.portfolio.process, `合成自然度调整：${analysis.text}`);
    return lines.join("\n");
  }

  function buildCompositeIntegrationPlan(project, text) {
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${project.goal || ""} ${text}`;
    const lightIssue = /光源不一致|光影不统一|阴影不对|接触阴影/.test(combined);
    const colorIssue = /色温不统一|不融合|不像一张图|不在一个画面|素材.*不像.*世界/.test(combined);
    const perspectiveIssue = /透视不对|透视怪|角度不对/.test(combined);
    const pastedIssue = /像贴上去|贴上去|合成.*(假|不自然|生硬)|产品图.*(假|不自然|贴)|人物.*(假|不自然|贴)/.test(combined);
    const causes = [];
    if (lightIssue) causes.push("光源方向不统一：主体高光、阴影方向和背景光线没有按同一个来源走。");
    if (colorIssue) causes.push("色温/色调不统一：主体像来自另一张照片，冷暖、饱和度或黑白场不一致。");
    if (perspectiveIssue) causes.push("透视角度不一致：主体的拍摄角度、地平线和背景空间不匹配。");
    if (pastedIssue) causes.push("接触关系太弱：主体没有接触阴影、遮挡或边缘过渡，所以像浮在画面上。");
    if (!causes.length) causes.push("合成角色不清：主体、背景和装饰没有共用同一套光线、色调和颗粒。");
    const steps = [
      "先确定一个光源方向：例如左上来光，所有高光和阴影都按这个方向统一。",
      "补接触阴影：主体贴近地面/桌面/背景的位置加一层软阴影，让它“站住”。",
      "统一色温和黑白场：用色彩平衡/曲线把主体的冷暖、最暗处和最亮处拉近背景。",
      "处理边缘：清理抠图杂边，边缘轻微羽化 0.5-1px，避免硬切边。",
      "统一颗粒/噪点和清晰度：主体太锐就轻微降锐，背景太糊就别让主体过度清晰。",
    ];
    if (perspectiveIssue) steps.unshift("先对透视：确认主体底边、地平线和背景透视方向是否一致，不一致先变形/换图。");
    if (/包装|产品|饮品|咖啡|美妆/.test(combined)) {
      steps.push("产品图优先保持真实材质：高光别过曝，瓶身/杯身边缘要干净，投影要轻。");
    }
    const donts = [
      "不要靠套滤镜硬统一，滤镜只能最后收口，不能解决光源和透视错误。",
      "不要给所有素材加同样重的阴影；阴影强度要按距离和层级变化。",
      "不要把主体边缘修得过虚，过度羽化会显脏、显廉价。",
    ];
    const checks = [
      "关掉颜色看黑白：主体和背景的明暗关系是否像同一空间？",
      "看阴影方向：所有投影是否朝同一侧，接触点是否贴地？",
      "看边缘：主体边缘有没有白边、黑边、锯齿或抠图残留？",
      "缩小预览：主体是否自然融入画面，而不是像单独贴了一张 PNG？",
    ];
    return {
      judge: "合成不自然通常不是缺一个效果，而是光源、透视、接触阴影、色温和边缘没有同时对齐。",
      causes: Array.from(new Set(causes)).slice(0, 5),
      steps: Array.from(new Set(steps)).slice(0, 7),
      donts: Array.from(new Set(donts)).slice(0, 4),
      checks: Array.from(new Set(checks)).slice(0, 5),
      nextStep: "复制当前稿做一版“合成校准稿”：只修光源方向、接触阴影、色温和边缘，不新增装饰。",
    };
  }

  function fixAssetQuality(project, analysis) {
    const text = analysis.text;
    const lines = [`素材补救方案：${project.name}`];
    lines.push("先判断素材是不是“能救”，不要一上来就滤镜硬修。按这个顺序处理：");
    buildAssetQualitySteps(project, text).forEach((item, index) => {
      lines.push(`${index + 1}. ${item}`);
    });
    lines.push("替代方案：");
    buildAssetAlternatives(project, text).forEach((item) => lines.push(`- ${item}`));
    lines.push("交付提醒：如果是商业发布，素材来源、字体和图片授权要留记录；不确定授权时先换可商用素材。");
    lines.push("下一步：先做一版“换素材/裁切/降级为图形化”的对比小稿，选最稳的一版继续精修。");
    project.portfolio.process = appendSentence(project.portfolio.process, `素材问题处理：${analysis.text}`);
    return lines.join("\n");
  }

  function requestMissingAssets(state, project, analysis, now = new Date()) {
    const assets = detectMissingAssets(analysis.text);
    project.status = "waiting";
    const risk = `缺少素材/文案：${assets.join("、")}`;
    if (!project.risks.includes(risk)) project.risks.push(risk);
    addMissingAssetTask(state, project, assets, now);
    const lines = [`素材/文案索要清单：${project.name}`];
    lines.push(`当前缺少：${assets.join("、")}`);
    lines.push("先判断能不能先做：");
    buildMissingAssetWorkarounds(project, assets).forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("向对方索要时要说清：");
    buildMissingAssetRequirements(assets).forEach((item) => lines.push(`- ${item}`));
    lines.push("可以这样发：");
    lines.push(`- ${buildMissingAssetMessage(project, assets, analysis.text)}`);
    lines.push("收到素材后检查：");
    buildReceivedAssetChecks(assets).forEach((item) => lines.push(`- ${item}`));
    lines.push("小画桌已把项目切到等待素材，并加入素材补齐任务。");
    project.portfolio.process = appendSentence(project.portfolio.process, `素材/文案索要：${analysis.text}`);
    return lines.join("\n");
  }

  function detectMissingAssets(text) {
    const rules = [
      ["Logo/标志文件", /logo|Logo|标志/],
      ["品牌规范/标准色/字体", /品牌手册|品牌规范|品牌色|品牌字体|VI|vi/],
      ["主文案/标题/卖点", /主文案|文案|标题|slogan|口号|卖点/],
      ["产品图/人物图/素材图片", /图片|照片|产品图|素材/],
      ["二维码/链接/行动入口", /二维码|链接|报名|购买|领取|预约/],
      ["价格/优惠/活动规则", /价格|优惠|折扣|满减|规则/],
      ["时间/地点/地址", /活动时间|时间地点|时间|地点|地址/],
    ];
    const found = rules.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
    return found.length ? Array.from(new Set(found)).slice(0, 6) : ["Logo/图片/文案等关键素材"];
  }

  function addMissingAssetTask(state, project, assets, now = new Date()) {
    const title = `等待素材/文案：${assets.slice(0, 3).join("、")}`;
    const exists = state.tasks.some((task) => task.projectId === project.id && task.status !== "done" && task.title === title);
    if (exists) return;
    state.tasks.push({
      id: uid("t"),
      projectId: project.id,
      title,
      priority: project.dueDate && daysUntil(project.dueDate, now) <= 1 ? "high" : "normal",
      dueDate: project.dueDate || "",
      status: "waiting",
      nextAction: "等对方补齐素材；先用占位稿搭结构，不做最终精修。",
      feedbackIds: [],
    });
  }

  function buildMissingAssetWorkarounds(project, assets) {
    const actions = [
      "可以先做黑白线框或占位稿，把信息层级、尺寸和版式跑通。",
      "不要用网上随便找的图冒充最终素材，避免版权和风格返工。",
      "如果缺主视觉，用色块/图形/文字占位，但要标注“待替换”。",
    ];
    if (assets.some((item) => /Logo|品牌/.test(item))) actions.push("缺 Logo/品牌规范时，先不要定最终配色和品牌露出方式。");
    if (assets.some((item) => /文案|标题|卖点/.test(item))) actions.push("缺文案时，先用信息模块占位，不要花时间精修字距和标题效果。");
    if (assets.some((item) => /二维码|链接/.test(item))) actions.push("缺二维码时，先预留固定安全区，避免后面塞不下。");
    if (project.dueDate && daysUntil(project.dueDate) <= 1) actions.unshift("时间很紧，先同步缺口会影响最终交付，避免最后背锅。");
    return Array.from(new Set(actions)).slice(0, 6);
  }

  function buildMissingAssetRequirements(assets) {
    const reqs = [];
    if (assets.some((item) => /Logo|品牌/.test(item))) reqs.push("Logo 最好给 AI/SVG/PDF 或透明 PNG，并说明标准色和禁用规则。");
    if (assets.some((item) => /图片|产品图|素材/.test(item))) reqs.push("图片请给原图或高清图，尽量不要发聊天软件压缩图。");
    if (assets.some((item) => /文案|标题|卖点/.test(item))) reqs.push("文案请确认最终版，标出主标题、卖点、规则和必须出现的信息。");
    if (assets.some((item) => /二维码|链接/.test(item))) reqs.push("二维码/链接请确认是否可用，最好同时给链接文本，方便测试。");
    if (assets.some((item) => /价格|优惠|规则|时间|地点|地址/.test(item))) reqs.push("活动信息请给最终口径，避免后期反复改字。");
    if (!reqs.length) reqs.push("请尽量一次性补齐原始文件、最终文案、使用限制和截止时间。");
    return reqs.slice(0, 6);
  }

  function buildMissingAssetMessage(project, assets, text) {
    const recipient = guessFeedbackRecipient(text);
    const deadline = project.dueDate ? `目前项目截止时间是 ${project.dueDate}，` : "";
    return `${recipient}好，我这边开始整理「${project.name}」的设计稿了。${deadline}现在还缺 ${assets.join("、")}。为了避免后面返工，麻烦尽量发原始/高清文件和最终确认版文案；如果暂时没有，我会先用占位稿搭结构，但最终效果需要等素材补齐后再精修。`;
  }

  function buildReceivedAssetChecks(assets) {
    const checks = [
      "文件是否清晰、未压缩、能正常打开。",
      "文案是否是最终版，有没有错别字、价格、时间和地点问题。",
      "素材是否允许商用或对外发布。",
      "二维码/链接是否能扫码打开，是否跳到正确页面。",
    ];
    if (assets.some((item) => /Logo|品牌/.test(item))) checks.unshift("Logo 是否有透明背景、矢量版本和安全距离要求。");
    if (assets.some((item) => /图片|产品图/.test(item))) checks.unshift("产品图是否够大、主体完整、背景和画面风格是否可控。");
    return Array.from(new Set(checks)).slice(0, 6);
  }

  function auditAssetLicense(state, project, analysis, now = new Date()) {
    project.status = "waiting";
    if (!project.risks.includes("素材/字体授权未确认，商用前需要留证据")) {
      project.risks.push("素材/字体授权未确认，商用前需要留证据");
    }
    const risks = detectLicenseRisks(analysis.text);
    pushUniqueTask(state, {
      projectId: project.id,
      title: "确认素材和字体授权",
      priority: project.dueDate && daysUntil(project.dueDate, now) <= 1 ? "high" : "normal",
      dueDate: project.dueDate || "",
      status: "waiting",
      nextAction: "确认字体、图片、插画、图标和客户素材是否允许当前项目商用，并保存授权证据。",
      feedbackIds: [],
    });
    project.portfolio.process = appendSentence(project.portfolio.process, `授权风险审查：${analysis.text}`);

    const lines = [`素材授权审查：${project.name}`];
    lines.push("先按风险分级，不要只凭“网上写免费”就直接商用。");
    lines.push("高风险项：");
    risks.high.forEach((item) => lines.push(`- ${item}`));
    lines.push("中风险项：");
    risks.medium.forEach((item) => lines.push(`- ${item}`));
    lines.push("低风险/可保留：");
    risks.low.forEach((item) => lines.push(`- ${item}`));
    lines.push("处理建议：");
    buildLicenseActions(project, analysis.text).forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("可以这样确认：");
    lines.push(buildLicenseConfirmationMessage(project, analysis.text));
    lines.push("归档时要保存：");
    buildLicenseEvidenceList(analysis.text).forEach((item) => lines.push(`- ${item}`));
    lines.push("小画桌已把项目切到待确认，并新增“确认素材和字体授权”任务。");
    return lines.join("\n");
  }

  function detectLicenseRisks(text) {
    const high = [];
    const medium = [];
    const low = [];
    if (/网上找|网上下载|百度|小红书|Pinterest|花瓣|站酷|截图|水印|来源不清/.test(text)) {
      high.push("来源不清的网上图片/插画/截图：不能直接用于商业发布或客户交付。");
    }
    if (/字体|免费字体|字库|商用字体/.test(text)) {
      high.push("字体授权范围未确认：免费可下载不等于允许商用、嵌入或转交源文件。");
    }
    if (/图标|插画|素材|图库|模板/.test(text)) {
      medium.push("图库/模板素材：需要确认授权范围、署名要求、是否允许二次修改和客户商用。");
    }
    if (/客户给|甲方给|公司素材|品牌素材/.test(text)) {
      medium.push("客户/公司提供素材：仍要确认是否拥有对外发布和二次加工权限。");
    }
    if (/可商用|授权文件|购买|公司素材库|品牌手册/.test(text)) {
      low.push("已有授权或公司素材库内容：可以使用，但要保存授权截图、订单或素材库链接。");
    }
    if (!high.length) high.push("凡是来源不清、无授权记录、无法证明可商用的素材，都先按高风险处理。");
    if (!medium.length) medium.push("可商用素材也要确认使用范围：平台、地区、期限、是否可修改、是否可交付源文件。");
    if (!low.length) low.push("客户原创内容、公司已购素材、明确可商用字体，在留存证据后风险较低。");
    return {
      high: Array.from(new Set(high)).slice(0, 4),
      medium: Array.from(new Set(medium)).slice(0, 4),
      low: Array.from(new Set(low)).slice(0, 4),
    };
  }

  function buildLicenseActions(project, text) {
    const actions = [
      "把所有不确定素材列成表：名称、来源、用途、是否商用、授权证据、替代方案。",
      "高风险素材先替换：用公司素材库、已购图库、可商用字体，或改成自绘图形/色块/文字表达。",
      "如果必须使用客户提供素材，让客户明确确认拥有使用权和对外发布权限。",
      "交付源文件前检查字体和图片授权是否允许转交源文件；不允许时交转曲版/嵌图版和预览图。",
    ];
    if (/印刷|包装|画册|折页/.test(`${project.type} ${text}`)) actions.push("印刷项目额外确认图片授权是否覆盖印量、地区和物料类型。");
    return actions.slice(0, 5);
  }

  function buildLicenseConfirmationMessage(project, text) {
    const target = detectPeople(text) || "负责人";
    return `${target}好，我在整理「${project.name}」的素材授权。为了避免商用风险，我想确认一下：当前使用的字体、图片、插画/图标和客户提供素材，是否都允许用于这次对外发布/商业使用？如果有已购买链接、授权截图或公司素材库来源，也麻烦发我一下。我会把不确定素材先用可商用替代方案处理。`;
  }

  function buildLicenseEvidenceList(text) {
    const evidence = [
      "字体名称、授权范围、购买/下载来源截图。",
      "图片/插画/图标来源链接、授权截图或订单记录。",
      "客户提供素材的确认记录：允许用于本次项目和对外发布。",
      "最终交付包里的授权说明 README。",
    ];
    if (/源文件|ai|psd|figma/i.test(text)) evidence.push("源文件交付许可：确认字体、图片是否允许随源文件转交。");
    return evidence.slice(0, 5);
  }

  function buildAssetQualitySteps(project, text) {
    const steps = [];
    if (/糊|清晰度|分辨率|锯齿/.test(text)) {
      steps.push("先看真实使用尺寸：如果放大后仍糊，优先换更高清源图，不要硬锐化。");
      steps.push("如果必须用这张图，缩小使用、加遮罩或作为背景氛围，不要当主视觉大图。");
    }
    if (/抠图|扣图|边缘|锯齿/.test(text)) {
      steps.push("先处理边缘：羽化 0.5-1px、清理杂边，再检查阴影是否贴合背景光源。");
      steps.push("抠图脏时不要加复杂背景，先用干净底色或局部色块承接主体。");
    }
    if (/不统一|风格/.test(text)) {
      steps.push("把素材统一到同一种处理方式：同色调、同颗粒感、同光源方向，别让每张图像来自不同世界。");
    }
    if (/水印|找不到|没有合适/.test(text)) {
      steps.push("不要直接用带水印素材；先找可商用替代图，或改成图标/色块/文字信息主导。");
    }
    if (!steps.length) {
      steps.push("先判断素材承担什么角色：主视觉、背景氛围、说明图标，角色不同处理方式不同。");
      steps.push("主视觉素材必须清楚、风格统一；背景素材可以弱化、裁切或加色罩。");
    }
    steps.push("最后回到画面：素材处理完后，主标题和核心信息不能被素材抢走。");
    return steps.slice(0, 6);
  }

  function buildAssetAlternatives(project, text) {
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${text}`;
    const alternatives = [];
    if (/小红书|朋友圈|公众号|社媒|封面|头图|Banner/i.test(combined)) {
      alternatives.push("社媒封面可以用大标题 + 简单图形/色块替代复杂素材，先保证小屏识别。");
    }
    if (/包装|画册|折页|印刷/.test(combined)) {
      alternatives.push("印刷物宁可用高质量局部裁切，也不要铺满低清图片。");
    }
    alternatives.push("如果素材质量都不够，改用图形化表达：关键词、线条、色块、图标和材质纹理。");
    alternatives.push("如果客户必须用原图，把原图作为小尺寸信息图，主视觉交给标题和版式。");
    return alternatives.slice(0, 4);
  }

  function guideDesignSoftwareOperation(project, analysis) {
    const tool = detectDesignSoftwareTool(analysis.text);
    const operation = detectSoftwareOperation(analysis.text);
    const lines = [`软件操作小抄：${tool.label} ${operation.label}`];
    lines.push("先判断：");
    buildSoftwarePrechecks(project, tool, operation, analysis.text).forEach((item) => lines.push(`- ${item}`));
    lines.push("操作步骤：");
    buildSoftwareOperationSteps(tool, operation, analysis.text).forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("容易出错：");
    buildSoftwareOperationPitfalls(tool, operation, analysis.text).forEach((item) => lines.push(`- ${item}`));
    lines.push("交付前确认：");
    buildSoftwareDeliveryChecks(project, tool, operation).forEach((item) => lines.push(`- ${item}`));
    lines.push(`下一步：先另存一份“测试导出”文件，用实际发布尺寸打开检查，再覆盖正式导出。`);
    project.portfolio.process = appendSentence(project.portfolio.process, `${tool.label} 操作记录：${operation.label}`);
    return lines.join("\n");
  }

  function detectDesignSoftwareTool(text) {
    if (/Figma|figma/.test(text)) return { key: "figma", label: "Figma" };
    if (/Illustrator|illustrator|AI里|AI 里|AI怎么|AI 怎么|Adobe AI/.test(text)) return { key: "illustrator", label: "Illustrator" };
    if (/Canva|canva|稿定|创客贴/.test(text)) return { key: "template", label: "在线设计工具" };
    return { key: "photoshop", label: "Photoshop" };
  }

  function detectSoftwareOperation(text) {
    if (/转曲|文字转曲|轮廓化|创建轮廓/.test(text)) return { key: "outline", label: "文字转曲" };
    if (/打包|链接|嵌入|字体.*丢|图片.*丢/.test(text)) return { key: "package", label: "文件打包" };
    if (/切图|切片|svg|图标|组件|导出.*图层|导出.*元素/.test(text)) return { key: "slice", label: "切图/元素导出" };
    if (/模糊|糊了|分辨率|像素|压缩|不清楚|导出/.test(text)) return { key: "export", label: "清晰导出" };
    if (/颜色|偏色|CMYK|RGB|色差/.test(text)) return { key: "color", label: "颜色模式检查" };
    return { key: "general", label: "基础操作" };
  }

  function buildSoftwarePrechecks(project, tool, operation, text) {
    const checks = [];
    if ((project.specs || []).length) checks.push(`当前记录尺寸：${project.specs.join("、")}，导出前先确认画布/画板就是这个尺寸。`);
    else checks.push("先确认最终尺寸和平台，不要用截图或预览图当正式导出。");
    if (/小红书|朋友圈|公众号|社媒|Banner|banner/.test(`${project.type} ${(project.deliverables || []).join("、")} ${text}`)) {
      checks.push("线上图通常用 RGB；先按 1x 正式尺寸导出，再看是否需要 2x 备份。");
    }
    if (/印刷|包装|画册|折页|CMYK|出血/.test(`${project.type} ${text}`)) {
      checks.push("印刷稿不要只按屏幕效果导出，先确认 CMYK、出血、图片精度和 PDF 要求。");
    }
    if (operation.key === "outline") checks.push("转曲前先另存可编辑版本，转曲后文字不好再改。");
    if (tool.key === "figma") checks.push("Figma 要选中 Frame 导出，不要只选里面的零散图层。");
    return Array.from(new Set(checks)).slice(0, 5);
  }

  function buildSoftwareOperationSteps(tool, operation, text) {
    if (tool.key === "photoshop") return buildPhotoshopSteps(operation, text);
    if (tool.key === "illustrator") return buildIllustratorSteps(operation, text);
    if (tool.key === "figma") return buildFigmaSteps(operation, text);
    return buildTemplateToolSteps(operation, text);
  }

  function buildPhotoshopSteps(operation, text) {
    if (operation.key === "export") {
      return [
        "先看“图像大小”：画布像素要等于最终交付尺寸，插入素材不能低于画面实际显示尺寸。",
        "用“导出为”或“存储副本”导出 PNG/JPG，不要直接截屏。",
        "线上图选 RGB / sRGB；JPG 品质设高，PNG 用于透明背景或文字较多的图。",
        "导出后用 100% 缩放打开检查文字边缘，不要只看软件里的缩放预览。",
      ];
    }
    if (operation.key === "color") {
      return [
        "线上物料保持 RGB/sRGB；印刷物再按印厂要求转 CMYK。",
        "如果颜色变灰，检查是不是提前把线上图转成了 CMYK。",
        "导出后用常用设备预览一次，特别是手机端。",
      ];
    }
    return [
      "先另存一个操作副本，保留原 PSD。",
      "检查图层命名和智能对象，避免误删可编辑内容。",
      "导出前合并预览层检查一次，不直接覆盖源文件。",
    ];
  }

  function buildIllustratorSteps(operation, text) {
    if (operation.key === "outline") {
      return [
        "先另存一份“可编辑版.ai”，再复制出“转曲交付版.ai”。",
        "全选文字，执行“文字/Type -> 创建轮廓/Create Outlines”。",
        "检查有没有漏掉的文字：用选择菜单找文本对象，或尝试点选文字看是否还能编辑。",
        "链接图片要嵌入或随文件一起打包，再导出 PDF。",
      ];
    }
    if (operation.key === "package") {
      return [
        "检查 Links/链接面板，确认图片没有丢失或低清替代。",
        "用 Package/打包收集 AI、链接图片和字体；交付时再附 PDF 预览。",
        "如果字体不能外发，另存一份转曲版，同时保留可编辑源文件。",
      ];
    }
    return [
      "先确认画板尺寸和出血设置，画板外不要放正式内容。",
      "线上图按画板导出 PNG/JPG；印刷稿按印厂要求导出 PDF。",
      "导出后检查文字、图片链接、颜色模式和裁切范围。",
    ];
  }

  function buildFigmaSteps(operation, text) {
    if (operation.key === "slice") {
      return [
        "选中完整 Frame 或需要导出的组件，不要框选一堆零散图层。",
        "右侧 Export 添加 PNG/JPG/SVG/PDF；普通位图先用 PNG/JPG，图标再考虑 SVG。",
        "按需要设 1x 或 2x；社媒封面通常先确认 1x 正式尺寸是否清楚。",
        "导出后打开文件检查裁切，尤其是阴影、描边和超出 Frame 的元素。",
      ];
    }
    return [
      "先确认 Frame 尺寸就是交付尺寸，Frame 名称可直接作为导出文件名。",
      "右侧 Export 选择格式和倍率；文字多的图优先 PNG，照片多的图可用 JPG。",
      "如果导出缺内容，检查元素是否在 Frame 内、是否被 Clip content 裁掉。",
      "导出后用手机或实际展示尺寸预览可读性。",
    ];
  }

  function buildTemplateToolSteps(operation, text) {
    return [
      "先确认模板画布尺寸和平台一致，不要只改内容不改尺寸。",
      "导出时选择高清 PNG/JPG；需要印刷时优先 PDF，并确认是否支持出血。",
      "导出后检查水印、字体替换、图片压缩和边缘裁切。",
      "重要商用项目保留素材来源和授权说明。",
    ];
  }

  function buildSoftwareOperationPitfalls(tool, operation, text) {
    const pitfalls = [
      "不要用聊天软件截图当正式图，截图会压缩且尺寸不可控。",
      "不要在未确认尺寸时反复导出，先锁定画布/画板。",
      "不要覆盖源文件；测试导出、转曲版、交付版分开保存。",
    ];
    if (operation.key === "export") pitfalls.unshift("导出后模糊通常不是“清晰度按钮”问题，而是画布尺寸、素材分辨率或平台二次压缩问题。");
    if (operation.key === "outline") pitfalls.unshift("转曲后文字不可编辑，改字必须回到可编辑版。");
    if (tool.key === "figma") pitfalls.push("Figma 里超出 Frame 的阴影/装饰可能导出时被裁掉。");
    return Array.from(new Set(pitfalls)).slice(0, 5);
  }

  function buildSoftwareDeliveryChecks(project, tool, operation) {
    const checks = [
      "文件名包含项目、物料、尺寸、版本和日期。",
      "导出图和源文件分开，预览图不要和最终交付混在一起。",
      "手机/实际尺寸预览一次，确认主标题和二维码/价格/时间不糊。",
    ];
    if (/印刷|包装|画册|折页/.test(`${project.type} ${(project.deliverables || []).join("、")}`) || operation.key === "outline") {
      checks.push("印刷交付再检查出血、CMYK、图片精度、转曲版和可编辑版。");
    }
    if (tool.key === "illustrator") checks.push("检查链接图片是否嵌入或随包发送。");
    return checks.slice(0, 5);
  }

  function analyzeReference(project, analysis) {
    const lines = [`参考图拆解：${project.name}`];
    lines.push("先别照着画面复制。参考图要拆“方法”，不是抄“长相”。按这 5 个维度看：");
    buildReferenceAngles(project, analysis.text).forEach((item, index) => {
      lines.push(`${index + 1}. ${item}`);
    });
    lines.push("可以借鉴：");
    buildReferenceBorrowList(project, analysis.text).forEach((item) => lines.push(`- ${item}`));
    lines.push("不要照抄：");
    buildReferenceAvoidList(analysis.text).forEach((item) => lines.push(`- ${item}`));
    const context = buildReferenceContext(project, analysis.text);
    if (context.length) {
      lines.push("结合当前项目：");
      context.forEach((item) => lines.push(`- ${item}`));
    }
    lines.push("下一步：用 15 分钟做一个“方法迁移小稿”：只借一个方法，比如构图、配色、字体比例或视觉锚点，不要一次借完整画面。");
    project.portfolio.process = appendSentence(project.portfolio.process, `参考拆解：${analysis.text}`);
    return lines.join("\n");
  }

  function negotiateReferenceSimilarity(project, analysis) {
    const plan = buildReferenceSimilarityPlan(project, analysis.text);
    const lines = [`参考还原度沟通：${project.name}`];
    lines.push("先把“像参考”拆成可借鉴的方法，而不是复制画面长相。");
    lines.push("可以保留：");
    plan.keep.forEach((item) => lines.push(`- ${item}`));
    lines.push("必须改掉：");
    plan.change.forEach((item) => lines.push(`- ${item}`));
    lines.push("像但不抄的做法：");
    plan.actions.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("可以这样说：");
    lines.push(buildReferenceSimilarityMessage(project, plan));
    lines.push("给对方确认：");
    plan.questions.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("下一步：先做一张“方法迁移小稿”，只保留参考里的结构/情绪/节奏，替换具体素材、字体、配色和识别元素。");
    project.portfolio.process = appendSentence(project.portfolio.process, `参考还原度沟通：${analysis.text}`);
    return lines.join("\n");
  }

  function buildReferenceSimilarityPlan(project, text) {
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${project.goal || ""} ${text}`;
    const keep = [
      "信息顺序：例如先看到主题，再看到卖点/行动入口。",
      "版式逻辑：例如左右分区、居中主视觉、标题压主体或大留白结构。",
      "情绪方向：例如更年轻、更高级、更节日、更科技，但不复制具体元素。",
    ];
    const change = [
      "具体素材、插画、摄影、图标和可识别构图。",
      "字体、色值、装饰符号和品牌识别元素。",
      "竞品独有的文案结构、人物姿态、图形组合和版面比例。",
    ];
    const actions = [
      "先用一句话写出参考图可借鉴的方法，而不是描述它的长相。",
      "保留一个方法：构图、层级、配色关系或视觉节奏，只选一个作为主借鉴点。",
      "替换两到三类表达：换素材/主体、换字体气质、换配色或图形语言。",
      "回到自己的目标、受众和交付尺寸，检查是否比原参考更适合当前项目。",
    ];
    const questions = [
      "这张参考最想保留的是信息顺序、氛围情绪、版式结构，还是视觉冲击？",
      "有没有必须避开的品牌、竞品或版权元素？",
      "如果不能一模一样，优先保留“感觉像”还是“信息结构像”？",
    ];
    if (/竞品|别人家|同行/.test(text)) {
      change.unshift("竞品的识别元素和核心符号不能复制，只能借策略和信息结构。");
      questions.unshift("这张参考是竞品还是普通灵感图？如果是竞品，需要降低相似度。");
    }
    if (/客户|甲方/.test(text)) {
      questions.push("客户是否接受先看一版“参考方法迁移稿”，再确认相似度范围？");
    }
    if (/小红书|朋友圈|社媒|公众号|Banner|banner/.test(combined)) {
      actions.push("放到真实平台尺寸里预览，确认不是因为复制参考才显得完整。");
    }
    return {
      keep: Array.from(new Set(keep)).slice(0, 5),
      change: Array.from(new Set(change)).slice(0, 5),
      actions: Array.from(new Set(actions)).slice(0, 5),
      questions: Array.from(new Set(questions)).slice(0, 5),
    };
  }

  function buildReferenceSimilarityMessage(project, plan) {
    const goal = project.goal && !/待补充|待从/.test(project.goal) ? `，同时更贴合「${project.goal}」这个目标` : "";
    return `我理解这张参考想要的感觉。我建议不要直接照抄具体素材、字体和构图，这样会有版权和品牌相似风险。我们可以保留它的${plan.keep.slice(0, 2).join("、")}，但把主体、字体、配色和图形语言换成适合我们项目的表达${goal}。我先做一版“像但不抄”的方向给你看，再一起确认相似度是否合适。`;
  }

  function planReferenceResearch(state, project, analysis, now = new Date()) {
    const plan = buildReferenceResearchPlan(project, analysis.text);
    const dueDate = analysis.dueDate || project.dueDate || "";
    pushUniqueTask(state, {
      projectId: project.id,
      title: "收集参考并整理情绪板",
      priority: dueDate && daysUntil(dueDate, now) <= 1 ? "high" : "normal",
      dueDate,
      status: "todo",
      nextAction: "按层级、风格、平台/竞品三类各收 2 张，并写一句可借鉴的方法。",
      feedbackIds: [],
    });
    project.portfolio.strategy = appendSentence(project.portfolio.strategy, `参考策略：${plan.strategy}`);
    project.portfolio.process = appendSentence(project.portfolio.process, "建立参考收集计划，用于明确视觉方向和避免照抄。");

    const lines = [`参考收集计划：${project.name}`];
    lines.push("先找这 3 类：");
    plan.buckets.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("搜索关键词：");
    plan.keywords.forEach((item) => lines.push(`- ${item}`));
    lines.push("保留标准：");
    plan.keepRules.forEach((item) => lines.push(`- ${item}`));
    lines.push("淘汰标准：");
    plan.rejectRules.forEach((item) => lines.push(`- ${item}`));
    lines.push("25 分钟动作：");
    plan.steps.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("小画桌已加入任务：收集参考并整理情绪板。");
    return lines.join("\n");
  }

  function buildReferenceResearchPlan(project, text) {
    const combined = `${project.name} ${project.type} ${(project.deliverables || []).join("、")} ${project.goal || ""} ${project.audience || ""} ${project.scene || ""} ${text}`;
    const keywords = buildReferenceSearchKeywords(combined);
    const buckets = [
      "信息层级参考：找主标题、卖点、时间/价格/二维码如何排序的图，不看风格先看结构。",
      "视觉调性参考：找颜色、字体、图形、材质如何表达关键词的图，只记录方法。",
      "交付场景参考：找同平台、同尺寸、同媒介的图，检查缩略图/移动端/印刷限制。",
    ];
    if (/竞品|同类|同行/.test(combined)) buckets.push("竞品参考：只看信息策略和用户路径，不复制识别元素。");
    if (/包装|印刷|画册|折页/.test(combined)) buckets.push("工艺参考：收出血、纸张、工艺、版面留白和材质呈现方式。");
    if (/品牌|VI|logo|Logo/.test(combined)) buckets.push("品牌系统参考：收色彩比例、字体气质、图形延展规则，而不是单张好看的图。");
    return {
      strategy: buildReferenceStrategy(project, combined),
      buckets: Array.from(new Set(buckets)).slice(0, 5),
      keywords,
      keepRules: buildReferenceKeepRules(project, combined),
      rejectRules: buildReferenceRejectRules(combined),
      steps: buildReferenceResearchSteps(project, keywords),
    };
  }

  function buildReferenceStrategy(project, combined) {
    if (project.goal && !/待补充|待从/.test(project.goal)) {
      return `围绕「${project.goal}」收参考，优先找能解决同类传播问题的方法。`;
    }
    if (/新品|上市|活动|促销/.test(combined)) return "围绕信息第一眼和行动转化收参考，先保证用户知道看什么、做什么。";
    if (/品牌|VI|logo|Logo/.test(combined)) return "围绕识别一致性收参考，优先看规则如何延展。";
    return "围绕目标、受众、场景收参考，先分清结构、风格和交付限制。";
  }

  function buildReferenceSearchKeywords(text) {
    const base = [];
    if (/小红书|社媒|朋友圈|公众号|封面/.test(text)) base.push("小红书封面 信息层级", "社媒海报 年轻 配色", "朋友圈海报 手机可读性");
    if (/Banner|banner|横幅/.test(text)) base.push("banner 主视觉 构图", "电商 banner 信息层级", "广告位 安全区 版式");
    if (/包装|印刷|画册|折页/.test(text)) base.push("包装设计 版式 留白", "印刷物 出血 信息层级", "画册 排版 网格");
    if (/品牌|VI|logo|Logo/.test(text)) base.push("品牌视觉系统 色彩比例", "VI 延展 版式规范", "logo 使用规范 应用");
    if (/高级|质感/.test(text)) base.push("高级感 海报 留白", "低饱和 配色 质感", "品牌海报 克制排版");
    if (/年轻|活泼|可爱|童趣/.test(text)) base.push("年轻化 海报 跳色", "可爱 图形 版式", "活泼 社媒视觉");
    if (/咖啡|饮品|食品/.test(text)) base.push("咖啡新品海报", "饮品促销社媒图", "食品摄影 海报排版");
    if (/节日|万圣|圣诞|春节|七夕|年货/.test(text)) base.push("节日主题海报 信息层级", "节日活动主视觉", "节日促销社媒封面");
    if (!base.length) base.push("海报 信息层级 参考", "设计情绪板 视觉关键词", "社媒视觉 版式参考");
    return Array.from(new Set(base)).slice(0, 8);
  }

  function buildReferenceKeepRules(project, combined) {
    const rules = [
      "一眼能说出它解决了什么问题：突出主题、解释卖点、营造情绪或引导行动。",
      "能拆出一个可迁移方法：构图、比例、配色、字体关系、材质或视觉锚点。",
      "和当前交付场景一致：同平台、同尺寸、同观看距离优先。",
    ];
    if (project.goal && !/待补充|待从/.test(project.goal)) rules.unshift(`能服务当前目标「${project.goal}」。`);
    if (/小红书|社媒|朋友圈|公众号/.test(combined)) rules.push("缩成手机预览后主标题仍然清楚。");
    if (/品牌|VI|logo|Logo/.test(combined)) rules.push("不依赖某个单张画面好看，而是有可复用的视觉规则。");
    return Array.from(new Set(rules)).slice(0, 6);
  }

  function buildReferenceRejectRules(text) {
    const rules = [
      "只觉得好看，但说不出可借鉴方法的图先删掉。",
      "信息量、平台和当前项目不一致的图不要当主参考。",
      "过度依赖特殊摄影、插画或版权素材，自己项目无法复现的图不要重押。",
      "和竞品识别太接近的图不要用作直接方向。",
    ];
    if (/赶|今天|明天|马上/.test(text)) rules.unshift("时间紧时，淘汰需要复杂建模、精修合成或大规模找素材的方向。");
    return Array.from(new Set(rules)).slice(0, 5);
  }

  function buildReferenceResearchSteps(project, keywords) {
    const deliverable = (project.deliverables || [project.type || "当前物料"])[0];
    return [
      `用前 8 分钟搜关键词：${keywords.slice(0, 3).join(" / ")}。`,
      `每类只留 2 张：层级 2 张、风格 2 张、${deliverable} 场景 2 张。`,
      "每张参考写一句：我借它的什么方法，不写“好看”。",
      "最后选 1 个主方向和 1 个备选方向，再开始做小稿。",
    ];
  }

  function generateImagePromptBrief(state, project, analysis, now = new Date()) {
    const brief = buildImagePromptBrief(project, analysis.text);
    pushUniqueTask(state, {
      projectId: project.id,
      title: "生成并筛选 AI 素材提示词",
      priority: project.dueDate && daysUntil(project.dueDate, now) <= 1 ? "high" : "normal",
      dueDate: project.dueDate || "",
      status: "todo",
      nextAction: "先生成 3 组低风险素材方向，筛掉不能服务信息层级和版权不清的图。",
      feedbackIds: [],
    });
    project.portfolio.process = appendSentence(project.portfolio.process, `AI 素材提示词规划：${analysis.text}`);

    const lines = [`AI 生图提示词规划：${project.name}`];
    lines.push("先提醒：AI 图适合做背景、氛围、辅助素材，不要直接替代最终设计判断。");
    lines.push("生成目标：");
    lines.push(`- ${brief.goal}`);
    lines.push("可复制提示词：");
    brief.prompts.forEach((prompt, index) => lines.push(`${index + 1}. ${prompt}`));
    lines.push("负面提示词：");
    lines.push(`- ${brief.negative}`);
    lines.push("筛选标准：");
    brief.checks.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("落地到设计稿：");
    brief.usage.forEach((item) => lines.push(`- ${item}`));
    lines.push("小画桌已新增任务：生成并筛选 AI 素材提示词。");
    return lines.join("\n");
  }

  function buildImagePromptBrief(project, text) {
    const combined = `${project.name} ${project.type} ${(project.deliverables || []).join("、")} ${project.goal || ""} ${project.audience || ""} ${project.scene || ""} ${text}`;
    const subject = inferPromptSubject(combined);
    const style = inferPromptStyle(combined);
    const scene = inferPromptScene(project, combined);
    const composition = inferPromptComposition(combined);
    const goal = project.goal && !/待补充|待从/.test(project.goal)
      ? `为「${project.goal}」生成可作为${scene}的辅助视觉素材。`
      : `生成一组可用于${scene}的辅助视觉素材，先服务信息层级和画面氛围。`;
    const prompts = [
      `${subject}，${style}，${composition}，干净背景，留出标题文字区域，商业海报辅助素材，高质量细节，柔和光线，no text`,
      `${subject}，${style}，近景主体与留白空间，适合社媒封面/海报背景，色彩统一，视觉中心明确，no logo, no watermark, no text`,
      `${subject}，${style}，简洁构图，轻微景深，适合叠加中文标题和活动信息，背景不过度复杂，high quality, clean composition`,
    ];
    return {
      goal,
      prompts: prompts.map((prompt) => normalizePromptText(prompt)),
      negative: "文字、乱码、logo、水印、低清、畸形手、过度复杂背景、过曝、脏污、侵权角色、真实品牌标识、不可控人物肖像",
      checks: buildImagePromptChecks(project, combined),
      usage: buildImagePromptUsage(project, combined),
    };
  }

  function inferPromptSubject(text) {
    if (/咖啡|饮品|奶茶|茶饮/.test(text)) return "咖啡新品/饮品杯作为主体，搭配年轻轻快的生活方式氛围";
    if (/美妆|护肤|香水/.test(text)) return "产品瓶身与柔和材质背景，强调精致质感";
    if (/儿童|亲子|童趣/.test(text)) return "童趣图形元素与温暖明亮场景";
    if (/科技|数码|未来/.test(text)) return "抽象科技图形、流动光线和简洁空间";
    if (/节日|圣诞|春节|万圣|七夕|年货/.test(text)) return "节日氛围元素和礼赠场景";
    return "与项目主题相关的抽象主视觉素材";
  }

  function inferPromptStyle(text) {
    if (/高级|质感|克制|品牌/.test(text)) return "克制高级、低饱和、留白充足、材质细腻";
    if (/年轻|活泼|可爱|童趣/.test(text)) return "年轻活泼、明亮配色、轻快节奏、友好亲近";
    if (/科技|未来|赛博/.test(text)) return "科技感、干净光效、蓝绿冷色、秩序网格";
    if (/复古|国潮|国风/.test(text)) return "复古/东方视觉气质、现代排版可融合";
    return "清晰、干净、商业设计可用";
  }

  function inferPromptScene(project, text) {
    if (/小红书|朋友圈|社媒|封面/.test(text)) return "社媒封面背景";
    if (/公众号|头图|Banner|banner/.test(text)) return "横版头图或 Banner 背景";
    if (/包装|印刷|画册|折页/.test(text)) return "印刷物辅助图形或背景素材";
    return (project.deliverables || [project.type || "设计物料"])[0];
  }

  function inferPromptComposition(text) {
    if (/标题|文字|信息|卖点|活动/.test(text)) return "主体偏一侧，画面保留大面积干净留白用于排版";
    if (/产品|主视觉|主体/.test(text)) return "主体清晰居中，背景简单，便于后期叠加标题";
    return "主体明确，背景层次轻，适合后期排版";
  }

  function normalizePromptText(prompt) {
    return prompt.replace(/\s+/g, " ").trim();
  }

  function buildImagePromptChecks(project, text) {
    const checks = [
      "缩小到实际版面后，是否仍能留出主标题和核心信息的位置？",
      "生成图是否没有文字、logo、水印、真实品牌标识或不可控人物肖像？",
      "色彩和风格是否贴合项目目标，而不是只看起来好看？",
      "素材是否能被裁切、加色罩或模糊处理，不影响可读性？",
    ];
    if (project.goal && !/待补充|待从/.test(project.goal)) checks.unshift(`是否服务目标「${project.goal}」？`);
    if (/商用|客户|上线|发布|投放/.test(text)) checks.push("商用前保留生成记录，并避开可识别 IP、商标、名人肖像。");
    return Array.from(new Set(checks)).slice(0, 6);
  }

  function buildImagePromptUsage(project, text) {
    const usage = [
      "先把 AI 图当作素材，不要把生成图直接当最终设计稿。",
      "把主体、标题、卖点分层处理，生成图只服务氛围或视觉锚点。",
      "选中素材后再统一调色、裁切和颗粒，保证和字体/品牌色一致。",
      "保留生成提示词和版本截图，方便复盘和说明素材来源。",
    ];
    if ((project.deliverables || []).length >= 2) usage.push("多尺寸项目先测试主尺寸，再决定是否延展到其他平台。");
    return usage.slice(0, 5);
  }

  function buildReferenceAngles(project, text) {
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${text}`;
    const angles = [
      "信息层级：它第一眼让你先看到什么？主标题、产品、人物、价格还是氛围？",
      "版式结构：它是居中、左右分区、三段式、卡片组，还是大图压标题？",
      "字体关系：标题和正文的比例、字重、字距，是清楚、可爱、高级还是强传播？",
      "色彩关系：主色、辅助色、强调色各占多少？强调色是不是只用在关键行动点？",
      "视觉锚点：最容易被记住的是一个图形、材质、人物姿态、标题处理，还是特殊构图？",
    ];
    if (/小红书|朋友圈|社媒|封面|头图|Banner/i.test(combined)) {
      angles.unshift("平台适配：缩成手机预览后，它还剩下什么能被读到？这才是可借鉴的重点。");
    }
    return Array.from(new Set(angles)).slice(0, 6);
  }

  function buildReferenceBorrowList(project, text) {
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${text}`;
    const list = [
      "借信息顺序：比如“标题先行、主体居中、行动点在底部”。",
      "借比例关系：比如主标题占画面 30%，主体图占 50%，说明文字只做辅助。",
      "借颜色逻辑：比如低饱和底色 + 一个高对比强调色，而不是照抄具体色值。",
      "借图形语言：比如线条、贴纸、网格、纹理的使用方式，而不是直接复制素材。",
    ];
    if (/高级|质感|品牌/.test(combined)) list.push("借克制方式：留白、对齐、材质细节和颜色数量控制。");
    if (/年轻|活泼|小红书|社媒/.test(combined)) list.push("借传播节奏：大标题、跳色标签、局部动势和小屏可读性。");
    return Array.from(new Set(list)).slice(0, 6);
  }

  function buildReferenceAvoidList(text) {
    const avoid = [
      "不要复制原图的具体素材、插画、摄影、图标或可识别构图。",
      "不要把参考里的所有优点都搬过来，一次只借一个核心方法。",
      "不要忽略自己的 brief；参考好看不代表适合当前受众和交付场景。",
      "不要照抄字体、颜色和版式三件套，至少改变其中两类表达。",
    ];
    if (/竞品/.test(text)) avoid.unshift("竞品参考只能借策略和结构，不要复制识别元素，否则容易显得像同一家。");
    return Array.from(new Set(avoid)).slice(0, 5);
  }

  function buildReferenceContext(project, text) {
    const context = [];
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${text}`;
    if (project.goal && !/待补充/.test(project.goal)) {
      context.push(`当前目标是「${project.goal}」，参考里的方法必须能帮助这个目标，而不是只因为好看。`);
    }
    if (/小红书|朋友圈|社媒|封面/.test(combined)) {
      context.push("社媒参考优先看缩略图表现：标题是否够大、主体是否清楚、信息是否少。");
    }
    if (/品牌|VI|Logo|logo/.test(combined)) {
      context.push("品牌项目要避开参考图的识别元素，先回到自己的品牌色、字体和图形系统。");
    }
    if (project.dueDate && daysUntil(project.dueDate) <= 1) {
      context.push("时间紧时只借一个最稳方法，不要临时推翻整套版式。");
    }
    return Array.from(new Set(context)).slice(0, 4);
  }

  function organizeDeliveryFiles(project, analysis) {
    const date = (project.dueDate || formatDate(new Date())).replace(/-/g, "");
    const safeName = sanitizeFileName(project.name);
    const deliverables = (project.deliverables || []).length ? project.deliverables : ["交付图"];
    const lines = [`交付文件整理：${project.name}`];
    lines.push("建议用这个交付包结构，别人打开也能马上看懂：");
    lines.push(`${date}_${safeName}_交付包/`);
    lines.push("- 01_导出图/");
    lines.push("- 02_源文件/");
    lines.push("- 03_参考与素材/");
    lines.push("- 04_字体与授权说明/");
    lines.push("- README_交付说明.txt");
    lines.push("命名规范：");
    deliverables.slice(0, 4).forEach((item, index) => {
      lines.push(`- ${date}_${safeName}_${String(index + 1).padStart(2, "0")}_${sanitizeFileName(item)}_v01`);
    });
    lines.push("导出前检查：");
    buildDeliveryFileChecks(project, analysis.text).forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("README 里写清楚：项目名、交付日期、包含文件、尺寸规格、导出格式、是否含源文件、字体/图片授权情况。");
    lines.push("交付话术：我已经把导出图、源文件、参考素材和授权说明分开放好，文件名按日期/项目/物料/版本命名，方便后续查找和修改。");
    project.portfolio.process = appendSentence(project.portfolio.process, `交付文件整理：${analysis.text}`);
    return lines.join("\n");
  }

  function prepareDesignHandoff(state, project, analysis, now = new Date()) {
    const recipient = guessHandoffRecipient(analysis.text);
    pushUniqueTask(state, {
      projectId: project.id,
      title: `准备设计交接说明：${recipient}`,
      priority: project.dueDate && daysUntil(project.dueDate, now) <= 1 ? "high" : "normal",
      dueDate: project.dueDate || "",
      status: "todo",
      nextAction: "整理交接说明、可编辑范围、切图/导出规则和使用注意事项。",
      feedbackIds: [],
    });
    project.portfolio.process = appendSentence(project.portfolio.process, `设计交接说明：${analysis.text}`);

    const lines = [`设计交接说明：${project.name}`];
    lines.push(`交接对象：${recipient}`);
    lines.push("先准备这些内容：");
    buildHandoffChecklist(project, analysis.text, recipient).forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("README 模板：");
    buildHandoffReadme(project, recipient).forEach((item) => lines.push(`- ${item}`));
    lines.push("使用/修改边界：");
    buildHandoffRules(project, analysis.text, recipient).forEach((item) => lines.push(`- ${item}`));
    lines.push("可以这样发：");
    lines.push(buildHandoffMessage(project, recipient));
    lines.push("小画桌已新增“准备设计交接说明”任务。");
    return lines.join("\n");
  }

  function guessHandoffRecipient(text) {
    if (/开发|前端|程序/.test(text)) return "开发同事";
    if (/运营/.test(text)) return "运营同事";
    if (/市场/.test(text)) return "市场同事";
    if (/印厂|打印|制作/.test(text)) return "印厂/制作方";
    if (/客户|甲方/.test(text)) return "客户/甲方";
    return "接手同事";
  }

  function buildHandoffChecklist(project, text, recipient) {
    const checks = [
      "最终导出图：按平台/尺寸分开，不要把预览图和正式图混在一起。",
      "源文件：清理废稿、隐藏图层、无用画板，并给关键图层命名。",
      "尺寸规格：写清画布尺寸、安全区、出血/裁切要求和导出格式。",
      "字体与素材：标明字体、图片、图标来源和授权状态。",
    ];
    if (/开发|前端/.test(recipient)) {
      checks.unshift("标注关键尺寸：间距、字号、颜色值、圆角、按钮状态和切图倍率。");
      checks.push("交互状态：如果有 hover/点击/禁用/错误状态，要单独列出。");
    }
    if (/运营|市场/.test(recipient)) {
      checks.unshift("可替换区域：标明哪些文字/图片可以改，哪些主视觉和品牌元素不要动。");
      checks.push("复用规则：给 1-2 个示例，说明换标题、换日期、换产品图时怎么保持统一。");
    }
    if (/印厂|制作/.test(recipient)) {
      checks.unshift("印刷文件：提供可编辑版、转曲/嵌图版、印刷 PDF 和打样要求。");
      checks.push("制作要求：纸张、工艺、刀版、出血、CMYK 和专色信息要写清。");
    }
    return Array.from(new Set(checks)).slice(0, 7);
  }

  function buildHandoffReadme(project, recipient) {
    const deliverables = (project.deliverables || []).length ? project.deliverables.join("、") : "待补充";
    const specs = (project.specs || []).length ? project.specs.join("、") : "待确认";
    const formats = (project.formats || []).length ? project.formats.join("、") : "待确认";
    return [
      `项目：${project.name}`,
      `交接对象：${recipient}`,
      `交付物：${deliverables}`,
      `尺寸/规格：${specs}`,
      `格式：${formats}`,
      `版本：当前最终交接版，后续修改请另存新版本`,
      "注意：字体/图片授权、可修改范围、禁改项请看下方说明",
    ];
  }

  function buildHandoffRules(project, text, recipient) {
    const rules = [
      "不要拉伸 Logo、产品图和二维码。",
      "不要随意替换品牌色、字体和主视觉比例。",
      "修改文案后要重新检查换行、字号和移动端可读性。",
      "新增物料时先复制母版规则，再换内容，不要重新发明一套版式。",
    ];
    if (/开发|前端/.test(recipient)) rules.unshift("开发切图时优先使用导出切图，不直接截图设计稿。");
    if (/运营|市场/.test(recipient)) rules.unshift("运营复用时只改可替换区域：标题、日期、产品图和二维码。");
    if (/印厂|制作/.test(recipient)) rules.unshift("印厂输出前不要覆盖可编辑源文件，转曲版和可编辑版分开保存。");
    return Array.from(new Set(rules)).slice(0, 6);
  }

  function buildHandoffMessage(project, recipient) {
    return `${recipient}好，我把「${project.name}」的设计交接包整理好了：里面包含最终导出图、源文件/可编辑文件、尺寸与格式说明、字体素材授权说明，以及可修改范围和注意事项。后续如果需要改文案或适配新尺寸，建议先按 README 的母版规则调整，避免破坏整体视觉一致性。`;
  }

  function sanitizeFileName(value) {
    return String(value || "未命名")
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, "")
      .slice(0, 24);
  }

  function buildDeliveryFileChecks(project, text) {
    const checks = [
      "导出图和源文件分开放，避免客户误开编辑文件。",
      "版本号只递增，不用“最终版/最终最终版”。",
      "删除临时图层、隐藏废稿、无用素材和空白画板。",
      "确认文件能在另一台电脑打开，图片链接和字体没有丢失。",
    ];
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${text}`;
    if (/印刷|包装|画册|折页/.test(combined)) {
      checks.push("印刷文件另存一份转曲/嵌图版本，并标清是否含出血。");
    }
    if (/小红书|朋友圈|公众号|社媒|封面|头图|Banner/i.test(combined)) {
      checks.push("线上图按平台分别导出，不同尺寸不要混在同一个文件名里。");
    }
    return checks.slice(0, 6);
  }

  function guidePrintPrepress(project, analysis) {
    const lines = [`印前检查：${project.name}`];
    lines.push("印刷交付先按“尺寸、颜色、图片、文字、导出、打样”检查，不要只看屏幕效果。");
    lines.push("检查顺序：");
    buildPrintPrepressSteps(project, analysis.text).forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("常见坑：");
    buildPrintPitfalls(analysis.text).forEach((item) => lines.push(`- ${item}`));
    const context = buildPrintContext(project, analysis.text);
    if (context.length) {
      lines.push("结合当前项目：");
      context.forEach((item) => lines.push(`- ${item}`));
    }
    lines.push("发印厂前确认话术：成品尺寸、出血、纸张/工艺、颜色模式、是否需要转曲、是否需要刀版/模切，请帮我确认这些要求后我再出最终印刷 PDF。");
    lines.push("下一步：先另存一份印刷交付版，不要直接覆盖源文件；检查无误后再导出 PDF。");
    project.portfolio.process = appendSentence(project.portfolio.process, `印前检查：${analysis.text}`);
    return lines.join("\n");
  }

  function buildPrintPrepressSteps(project, text) {
    const steps = [
      "尺寸：确认成品尺寸，出血通常先按 3mm 设置；重要文字和 Logo 离裁切线至少 5-8mm。",
      "颜色：印刷文件按 CMYK 检查，确认黑色文字不要做成四色黑；品牌色/专色要问清印厂。",
      "图片：照片和位图按实际印刷尺寸检查精度，通常准备 300dpi；低清图不要硬撑满版。",
      "文字：确认字体授权；最终交付给印厂时准备转曲版本，另保留一份可编辑源文件。",
      "导出：导出 PDF 印刷稿，勾选出血和裁切标记；图片链接和嵌入状态要检查。",
      "打样：重要项目先要数码样或小样，尤其是大面积深色、荧光色、金色、覆膜和专色。",
    ];
    if (/包装|刀版|模切/.test(`${project.type} ${(project.deliverables || []).join("、")} ${text}`)) {
      steps.splice(1, 0, "刀版：包装/异形物料要确认刀版线、压痕线、糊口和正反面方向，设计层和刀版层分开。");
    }
    if (/画册|折页/.test(`${project.type} ${(project.deliverables || []).join("、")} ${text}`)) {
      steps.splice(1, 0, "页码与装订：画册/折页要确认页数、装订方式、跨页图片和折线位置。");
    }
    return steps.slice(0, 7);
  }

  function buildPrintPitfalls(text) {
    const pitfalls = [
      "不要把 RGB 屏幕亮色直接当成印刷效果，转 CMYK 后可能变暗变灰。",
      "不要只发 JPG 给印厂，正式印刷通常需要带出血的 PDF。",
      "不要覆盖原始可编辑文件，转曲版和可编辑版要分开保存。",
      "二维码、条形码和小字不要压在复杂纹理上，印出来会影响识别。",
    ];
    if (/出血/.test(text)) pitfalls.unshift("出血不是白边；背景、图片和色块要延伸到出血外，文字不能进出血区。");
    if (/转曲|字体/.test(text)) pitfalls.unshift("转曲前先另存副本；转曲后文字不好再改。");
    if (/四色黑/.test(text)) pitfalls.unshift("小号黑字不要用四色黑，容易套印不准导致发虚。");
    return Array.from(new Set(pitfalls)).slice(0, 6);
  }

  function buildPrintContext(project, text) {
    const context = [];
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${text}`;
    if (/包装/.test(combined)) context.push("包装类还要确认材质、表面工艺、刀版和糊口，不能只交一张平面图。");
    if (/画册|折页/.test(combined)) context.push("画册/折页要特别检查页码、跨页、折线和装订方式。");
    if (project.dueDate && daysUntil(project.dueDate) <= 1) {
      context.push("时间很紧，优先确认印厂硬性要求：尺寸、出血、颜色模式、转曲和 PDF 设置。");
    }
    const risks = currentProjectRisks(project);
    if (risks.some((risk) => /尺寸|规格/.test(risk))) context.push("当前项目还缺尺寸规格，不能直接出最终印刷文件。");
    if (risks.some((risk) => /交付格式/.test(risk))) context.push("交付格式还没确认，先问清是否需要 PDF、AI/PSD 源文件、转曲版。");
    return Array.from(new Set(context)).slice(0, 4);
  }

  function recommendPlatformSpecs(project, analysis) {
    const targets = detectSpecTargets(project, analysis.text);
    const lines = [`规格建议：${project.name}`];
    lines.push("先按这些常用起稿规格开文件；发布前或交付前，再以客户给的广告位、平台后台或印刷厂要求为准。");
    targets.forEach((target) => {
      lines.push(`${target.name}`);
      lines.push(`- 起稿：${target.size}`);
      lines.push(`- 安全区：${target.safeArea}`);
      lines.push(`- 导出：${target.export}`);
      lines.push(`- 注意：${target.note}`);
    });
    lines.push("开稿前再确认：用途、投放位置、是否要源文件、是否需要多尺寸适配。");
    const context = buildSpecContext(project, analysis.text);
    if (context.length) {
      lines.push("结合当前项目：");
      context.forEach((item) => lines.push(`- ${item}`));
    }
    lines.push("下一步：先把确认后的尺寸写进项目小纸条，小画桌会把规格检查放进今日待办和交付清单。");
    project.portfolio.process = appendSentence(project.portfolio.process, `规格确认：${analysis.text}`);
    return lines.join("\n");
  }

  function detectSpecTargets(project, text) {
    const combined = `${(project.deliverables || []).join("、")} ${project.type || ""} ${text}`;
    const specs = [];
    const add = (item) => {
      if (!specs.some((existing) => existing.name === item.name)) specs.push(item);
    };
    if (/小红书|封面/.test(combined)) {
      add({
        name: "小红书封面 / 笔记首图",
        size: "优先 3:4 竖版，常用 1080×1440px；需要更高清时可用 1242×1660px 同比例起稿。",
        safeArea: "主标题、人物脸、产品和价格信息离四边至少 80-120px，不要贴边。",
        export: "JPG/PNG，RGB；发布前用手机预览，检查缩略图里标题是否清楚。",
        note: "封面比精细小字更重要的是第一眼标题和主体，文字尽量少。",
      });
    }
    if (/朋友圈|微信海报|社群海报/.test(combined)) {
      add({
        name: "朋友圈 / 社群海报",
        size: "常用 1080×1440px 或 1080×1920px；如果客户要方图，再做 1080×1080px 版本。",
        safeArea: "二维码、CTA 和活动时间不要贴底，底部至少留 120px 呼吸空间。",
        export: "JPG/PNG，RGB；二维码区域不要被压缩或加复杂纹理。",
        note: "朋友圈里用户扫得很快，主标题和利益点要比装饰更醒目。",
      });
    }
    if (/公众号.*头图|头图|公众号封面|公众号/.test(combined)) {
      add({
        name: "公众号头图 / 封面",
        size: "常用横图 900×383px 或同等 2.35:1 比例起稿；封面缩略图也要单独预览。",
        safeArea: "重要文字放中间偏左/偏中区域，避免边缘在列表页或转发场景被裁切。",
        export: "JPG/PNG，RGB；文字不要太小，压缩后也要清楚。",
        note: "公众号头图空间横向很宽，适合主标题 + 主视觉左右分区。",
      });
    }
    if (/Banner|banner|横幅|广告位/.test(combined)) {
      add({
        name: "Banner / 横幅广告位",
        size: "先问清真实广告位；没有规格时可先用 1920×640px 或 1200×400px 做比例草稿。",
        safeArea: "主标题、按钮和产品放在中间安全区域，左右边缘预留给响应式裁切。",
        export: "JPG/PNG，RGB；网页 Banner 注意体积，避免大图加载慢。",
        note: "Banner 不适合塞长文案，只保留一句主信息和一个行动点。",
      });
    }
    if (/PPT|ppt|幻灯片|提案/.test(combined)) {
      add({
        name: "PPT / 提案页",
        size: "优先 16:9，常用 1920×1080px 或 PowerPoint 宽屏尺寸。",
        safeArea: "标题和页码离边至少 48px；投影场景字号要比屏幕稿更大。",
        export: "PPTX + PDF 预览；含特殊字体时要转 PDF 或嵌入/打包字体。",
        note: "PPT 先保证远看可读，别按海报密度排满。",
      });
    }
    if (/印刷|A4|A3|海报|折页|画册/.test(combined)) {
      add({
        name: "印刷海报 / 画册类",
        size: "按成品尺寸起稿；没有要求时可先问 A4/A3/正度/大度，图片按 300dpi 准备。",
        safeArea: "出血常用 3mm，重要文字离裁切线至少 5-8mm。",
        export: "PDF 印刷稿；常见要求包括 CMYK、出血、图片嵌入、文字转曲。",
        note: "印刷规格必须问清印厂或客户，不能只按屏幕尺寸猜。",
      });
    }
    if (!specs.length) {
      add({
        name: "当前物料",
        size: "先确认投放平台、成品尺寸和比例；线上图按像素起稿，印刷物按成品尺寸 + 出血起稿。",
        safeArea: "主标题、Logo、二维码和 CTA 都不要贴边，先预留 8%-10% 边距。",
        export: "线上通常 JPG/PNG/RGB；印刷通常 PDF/CMYK/出血/转曲。",
        note: "没有明确尺寸时，先别精修，先发确认话术拿到规格。",
      });
    }
    return specs.slice(0, 5);
  }

  function buildSpecContext(project, text) {
    const context = [];
    const risks = currentProjectRisks(project);
    if (risks.some((risk) => /尺寸|规格/.test(risk))) {
      context.push("当前项目还缺尺寸规格，先把这个确认掉，后面版式才不会返工。");
    }
    if (risks.some((risk) => /交付格式/.test(risk))) {
      context.push("交付格式也还没确认，建议一起问清 JPG/PNG/PDF/源文件是否都要。");
    }
    if (/多尺寸|适配|一稿多/.test(text) || (project.deliverables || []).length >= 2) {
      context.push("如果要一稿多尺寸，先做母版，再按每个平台重排，不要直接拉伸。");
    }
    if (project.dueDate && daysUntil(project.dueDate) <= 1) {
      context.push("时间很近，今天先锁定尺寸、主信息和导出格式，复杂视觉细节后置。");
    }
    return Array.from(new Set(context)).slice(0, 4);
  }

  function recommendLayoutStructure(project, analysis) {
    const structures = buildLayoutStructures(project, analysis.text);
    const lines = [`版式结构建议：${project.name}`];
    lines.push("先不要急着做细节。第一版先搭黑白线框，把信息顺序跑通，再加颜色、图片和风格。");
    structures.forEach((item, index) => {
      lines.push(`结构 ${index + 1}｜${item.name}`);
      lines.push(`- 画面骨架：${item.skeleton}`);
      lines.push(`- 信息顺序：${item.hierarchy}`);
      lines.push(`- 适合：${item.bestFor}`);
      lines.push(`- 注意：${item.warning}`);
    });
    lines.push("首版开稿顺序：");
    lines.push("1. 先把主标题、核心利益点、时间/地点/CTA 分成 3 个信息层级。");
    lines.push("2. 只用黑白灰排出主视觉和文字位置，不加装饰。");
    lines.push("3. 缩小到真实预览尺寸看 3 秒，能读懂再进入风格细化。");
    const context = buildLayoutContext(project, analysis.text);
    if (context.length) {
      lines.push("结合当前项目：");
      context.forEach((item) => lines.push(`- ${item}`));
    }
    lines.push("下一步：先选一个结构做 15 分钟小稿；如果卡住，就优先选“上标题 + 中主体 + 下信息”的稳妥结构。");
    project.portfolio.process = appendSentence(project.portfolio.process, `版式结构探索：${analysis.text}`);
    return lines.join("\n");
  }

  function buildLayoutStructures(project, text) {
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${text}`;
    if (/Banner|banner|横幅|公众号头图|头图/.test(combined)) {
      return [
        {
          name: "左右分区",
          skeleton: "左侧放主标题和按钮/利益点，右侧放产品、人物或主视觉。",
          hierarchy: "主标题 -> 主视觉 -> CTA/补充信息。",
          bestFor: "公众号头图、网页 Banner、横向广告位。",
          warning: "左右两边不要平均用力，一边必须成为第一视觉。",
        },
        {
          name: "中心聚焦",
          skeleton: "主视觉居中，标题叠在上方或左上，辅助信息放下方成组。",
          hierarchy: "主视觉 -> 标题 -> 时间/标签/按钮。",
          bestFor: "产品发布、活动主视觉、需要强冲击的横幅。",
          warning: "标题压图时要加遮罩或留空区，别让文字落在复杂纹理上。",
        },
        {
          name: "三段式横排",
          skeleton: "左侧主题，中间主体图，右侧 CTA 或活动信息。",
          hierarchy: "主题 -> 主体图 -> 行动信息。",
          bestFor: "信息比较多但仍要横向展示的广告位。",
          warning: "只保留一个 CTA，不要在横幅里塞完整说明文。",
        },
      ];
    }
    if (/PPT|ppt|提案|幻灯片/.test(combined)) {
      return [
        {
          name: "一句话结论页",
          skeleton: "顶部一句结论，左侧图/数据，右侧 3 个要点。",
          hierarchy: "结论 -> 证据 -> 补充说明。",
          bestFor: "向老板或客户解释方案判断。",
          warning: "PPT 不是海报，字号和留白要让远处也能读。",
        },
        {
          name: "对比页",
          skeleton: "左右两栏对比，顶部写判断标准，底部写推荐结论。",
          hierarchy: "标准 -> A/B 差异 -> 推荐理由。",
          bestFor: "展示两个方向、改稿前后、竞品对比。",
          warning: "两栏里的信息量要对齐，否则比较会失真。",
        },
        {
          name: "流程页",
          skeleton: "横向 3-5 个步骤，每步一个短标题和一句说明。",
          hierarchy: "阶段 -> 动作 -> 结果。",
          bestFor: "讲设计过程、项目计划、交付流程。",
          warning: "步骤不要超过 5 个，超过就拆页。",
        },
      ];
    }
    if (/印刷|包装|画册|折页/.test(combined)) {
      return [
        {
          name: "网格秩序",
          skeleton: "先建立 2-3 栏网格，标题、图片和正文都贴着网格走。",
          hierarchy: "标题 -> 主图 -> 正文分组 -> 注释/规格。",
          bestFor: "画册、折页、品牌物料、需要显得稳定可靠的印刷品。",
          warning: "重要文字离裁切线远一点，出血和安全边距先开好。",
        },
        {
          name: "大图封面",
          skeleton: "一张高质量主图占主要面积，标题和 Logo 放在干净区域。",
          hierarchy: "主图情绪 -> 标题 -> 品牌/说明。",
          bestFor: "封面、产品介绍页、品牌形象物料。",
          warning: "素材清晰度必须够，低清图不要硬撑满版。",
        },
        {
          name: "信息卡片组",
          skeleton: "把信息拆成 3-4 个卡片或模块，每组只讲一类内容。",
          hierarchy: "模块标题 -> 关键数字/卖点 -> 说明文字。",
          bestFor: "活动规则、产品卖点、服务流程。",
          warning: "卡片间距要统一，不要做成一堆漂浮小块。",
        },
      ];
    }
    return [
      {
        name: "上标题 + 中主体 + 下信息",
        skeleton: "顶部放主标题，中间放产品/人物/主视觉，底部放时间、地点、CTA 或二维码。",
        hierarchy: "主标题 -> 主视觉 -> 行动信息。",
        bestFor: "大多数海报、小红书封面、朋友圈活动图的首版。",
        warning: "底部信息要成组，不要零散贴在四周。",
      },
      {
        name: "左文右图 / 右文左图",
        skeleton: "一侧放标题和利益点，另一侧放主体图，二级信息靠近文字区。",
        hierarchy: "标题 -> 主体图 -> 卖点/按钮。",
        bestFor: "产品海报、课程活动、需要清楚说明的社媒图。",
        warning: "文字区要留足空白，别让主体图挤压阅读空间。",
      },
      {
        name: "中心大标题",
        skeleton: "主标题居中最大，背景用图形/纹理/照片做氛围，辅助信息绕开主标题。",
        hierarchy: "标题 -> 情绪氛围 -> 补充信息。",
        bestFor: "节日主题、品牌氛围、标题本身很有传播力的画面。",
        warning: "标题必须够短够强，长标题不适合这个结构。",
      },
    ];
  }

  function buildLayoutContext(project, text) {
    const context = [];
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${text}`;
    if (/小红书|朋友圈|社媒|封面/.test(combined)) {
      context.push("社媒图先按手机缩略图检查，主标题要比你在电脑上看到的更大一点。");
    }
    if (/印刷|包装|画册|折页/.test(combined)) {
      context.push("印刷物先开出血和安全边距，再排版；不要最后才补裁切空间。");
    }
    if (project.goal && !/待补充/.test(project.goal)) {
      context.push(`当前目标是「${project.goal}」，结构选择要服务这个目标。`);
    } else {
      context.push("项目目标还没写清楚，先用最稳结构起稿，等目标确认后再做风格化构图。");
    }
    if (project.dueDate && daysUntil(project.dueDate) <= 1) {
      context.push("时间紧时不要试太多创意结构，先用稳妥结构保证可读和交付。");
    }
    return Array.from(new Set(context)).slice(0, 4);
  }

  function recommendTypographySystem(project, analysis) {
    const systems = buildTypographySystems(project, analysis.text);
    const lines = [`字体系统建议：${project.name}`];
    lines.push("先别同时试很多字体。第一版只搭一套字体系统：标题、正文、数字/标签各自有角色。");
    systems.forEach((item, index) => {
      lines.push(`方案 ${index + 1}｜${item.name}`);
      lines.push(`- 标题：${item.title}`);
      lines.push(`- 正文：${item.body}`);
      lines.push(`- 数字/标签：${item.accent}`);
      lines.push(`- 适合：${item.bestFor}`);
      lines.push(`- 风险：${item.risk}`);
    });
    lines.push("字号层级：");
    buildTypeScale(project, analysis.text).forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("字距/行距检查：");
    buildSpacingChecks(analysis.text).forEach((item) => lines.push(`- ${item}`));
    const context = buildTypographyContext(project, analysis.text);
    if (context.length) {
      lines.push("结合当前项目：");
      context.forEach((item) => lines.push(`- ${item}`));
    }
    lines.push("下一步：先复制当前稿做一版“字体收敛稿”，只保留 1 个字体家族、2 种字重、3 档字号。");
    project.portfolio.process = appendSentence(project.portfolio.process, `字体系统整理：${analysis.text}`);
    return lines.join("\n");
  }

  function buildTypographySystems(project, text) {
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${project.goal || ""} ${text}`;
    const wantsPremium = /高级|质感|克制|品牌|正式/.test(combined);
    const wantsYoung = /年轻|活泼|可爱|小红书|社媒|封面|促销/.test(combined);
    const wantsPrint = /印刷|包装|画册|折页/.test(combined);
    const systems = [
      {
        name: wantsPremium ? "克制高级" : "清晰稳妥",
        title: wantsPremium ? "用偏几何、笔画稳定的黑体或宋黑结合，字重 700/800。" : "用清楚的黑体，字重 700/800，先保证第一眼读到。",
        body: "正文用同家族常规字重 400/500，不换风格字体。",
        accent: "数字、价格、日期可用同字体加粗，或用窄一点的数字风格增强秩序。",
        bestFor: wantsPremium ? "品牌感、会员活动、需要显得可靠和精致的画面。" : "首版、日报、活动海报、时间紧的社媒图。",
        risk: "可能不够有记忆点，需要靠版式、留白或一个视觉锚点补强。",
      },
      {
        name: wantsYoung ? "年轻传播" : "标题强化",
        title: "标题可以选更有性格的粗黑、圆体或手写感字体，但只用于主标题。",
        body: "正文仍然回到清楚字体，避免整张图都变成装饰字。",
        accent: "标签/角标用高对比字重或小色块承接，不要再加第三种字体。",
        bestFor: "小红书封面、节日活动、促销图、需要抢第一眼的传播物料。",
        risk: "标题字体太花会降低可信度；正文不要跟着一起花。",
      },
      {
        name: wantsPrint ? "印刷阅读" : "信息密集",
        title: "标题用稳定粗字重，避免太细的装饰字体。",
        body: "正文用可读性好的黑体/宋体，控制行长和行距。",
        accent: "说明、注释、规格用小一级字号，不靠颜色堆层级。",
        bestFor: wantsPrint ? "画册、折页、包装说明、线下物料。" : "规则说明多、活动信息多、需要兼顾可读性的画面。",
        risk: "信息密度高时容易闷，要用分组、间距和小标题切开。",
      },
    ];
    return systems.slice(0, 3);
  }

  function buildTypeScale(project, text) {
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${text}`;
    if (/小红书|朋友圈|社媒|封面|头图|Banner/i.test(combined)) {
      return [
        "主标题最大，至少比副标题大 1.6 倍；手机缩略图里主标题要先被读到。",
        "副标题/利益点用中等字号，负责解释价值，不要和主标题抢。",
        "时间、地点、规则、二维码说明降一级，能读清即可。",
        "同一张图控制 3 档字号：大标题、中信息、小说明。",
      ];
    }
    if (/印刷|包装|画册|折页/.test(combined)) {
      return [
        "主标题负责翻页时被看到，正文负责近距离阅读，不要用同一套比例。",
        "正文行长别太长；行距通常比字号大 30%-60% 更舒服。",
        "注释和规格可以小，但必须留足对比和边距，避免印刷后糊成一团。",
        "印刷前放到真实尺寸检查字号，不只看电脑缩放视图。",
      ];
    }
    return [
      "主标题、副标题、说明文字至少拉开 3 档层级。",
      "标题用字重和字号建立层级，正文用间距和分组建立秩序。",
      "不要用颜色替代层级；黑白稿能看懂，彩色稿才稳。",
      "如果信息很多，先删重复内容，再调字号。",
    ];
  }

  function buildSpacingChecks(text) {
    const checks = [
      "中文标题字距通常不要拉太开，除非是高级/品牌氛围；拉开后要检查识别速度。",
      "标题太挤时，先加行距或拆成两行，不要一味缩小字号。",
      "正文行距要比标题更松一点，让阅读不费力。",
      "同组信息间距小，不同组信息间距大；用间距表达关系。",
    ];
    if (/字距|文字间距/.test(text)) {
      checks.unshift("调字距前先判断是“字太挤”还是“行太长”；很多时候该换行，不是拉字距。");
    }
    if (/行距/.test(text)) {
      checks.unshift("行距先服务阅读：多行标题可以紧一点，正文和说明要松一点。");
    }
    return Array.from(new Set(checks)).slice(0, 5);
  }

  function buildTypographyContext(project, text) {
    const context = [];
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${text}`;
    if (/品牌|VI|Logo|logo/.test(combined)) {
      context.push("如果这是品牌项目，先确认品牌字体和授权；没有规范时再选气质接近的替代字体。");
    }
    if (/小红书|朋友圈|社媒|封面/.test(combined)) {
      context.push("社媒封面宁可少字大字，也不要把所有说明都塞进画面。");
    }
    if (project.goal && !/待补充/.test(project.goal)) {
      context.push(`当前目标是「${project.goal}」，字体性格要服务这个目标。`);
    }
    if (project.dueDate && daysUntil(project.dueDate) <= 1) {
      context.push("时间紧时不要大换字体系统，先收敛字重、字号和间距。");
    }
    return Array.from(new Set(context)).slice(0, 4);
  }

  function recommendColorSystem(project, analysis) {
    const systems = buildColorSystems(project, analysis.text);
    const lines = [`配色系统建议：${project.name}`];
    lines.push("先别一边看感觉一边乱调。第一版先定主色、辅助色、强调色，再检查文字和背景对比。");
    systems.forEach((item, index) => {
      lines.push(`方案 ${index + 1}｜${item.name}`);
      lines.push(`- 主色：${item.primary}`);
      lines.push(`- 辅助色：${item.secondary}`);
      lines.push(`- 强调色：${item.accent}`);
      lines.push(`- 适合：${item.bestFor}`);
      lines.push(`- 风险：${item.risk}`);
    });
    lines.push("颜色比例：");
    lines.push("1. 主色 60%：背景、大面积色块或主视觉氛围。");
    lines.push("2. 辅助色 30%：承接信息区、分组、次级模块。");
    lines.push("3. 强调色 10%：按钮、价格、关键词、必须被看到的行动点。");
    const repairSteps = buildColorRepairSteps(analysis.text);
    if (repairSteps.length) {
      lines.push("修色顺序：");
      repairSteps.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    }
    lines.push("可读性检查：");
    buildColorReadabilityChecks(project, analysis.text).forEach((item) => lines.push(`- ${item}`));
    const context = buildColorContext(project, analysis.text);
    if (context.length) {
      lines.push("结合当前项目：");
      context.forEach((item) => lines.push(`- ${item}`));
    }
    lines.push("下一步：先复制当前稿做一版“减色稿”，只保留 1 个主色、1 个辅助色、1 个强调色，再看画面是否清楚。");
    project.portfolio.process = appendSentence(project.portfolio.process, `配色系统整理：${analysis.text}`);
    return lines.join("\n");
  }

  function buildColorSystems(project, text) {
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${project.goal || ""} ${text}`;
    const wantsYoung = /年轻|活泼|可爱|小红书|社媒|促销|不够年轻|不够亮/.test(combined);
    const wantsPremium = /高级|质感|克制|品牌|正式/.test(combined);
    const wantsWarm = /咖啡|食品|亲子|温暖|节日|生活/.test(combined);
    return [
      {
        name: wantsPremium ? "克制高级" : "清晰稳妥",
        primary: wantsPremium ? "低饱和深色或中性色，控制大面积背景。" : "从品牌色或项目主题色里选一个最稳定的颜色。",
        secondary: wantsPremium ? "同色系浅灰/米白/低饱和辅助色，用来做信息承托。" : "主色的浅色版或邻近色，用来分组和承接画面。",
        accent: wantsPremium ? "少量金色、亮白或高明度小面积点缀。" : "只选一个高对比强调色，用在按钮、价格或核心利益点。",
        bestFor: wantsPremium ? "会员、品牌、质感活动、需要稳重可信的画面。" : "首版、日常活动、时间紧的设计任务。",
        risk: "可能不够抢眼，需要靠标题大小、版式和一个强调点补第一眼。",
      },
      {
        name: wantsYoung ? "年轻明亮" : "传播吸引",
        primary: "高明度主色或更干净的暖/冷色，不要一开始就用很深的底。",
        secondary: "用白色、浅色或同色系浅色拉开呼吸感。",
        accent: "选一个跳色放在关键词、价格、CTA 上，面积要小。",
        bestFor: "小红书封面、朋友圈海报、促销活动、需要更轻快的传播图。",
        risk: "跳色过多会显廉价；最多一个强调色，别把所有元素都做亮。",
      },
      {
        name: wantsWarm ? "温暖亲和" : "同色系秩序",
        primary: wantsWarm ? "暖棕、橙、米色或柔和红色，营造亲和和食欲感。" : "选一个主色后，只在同色相里调整明度和饱和度。",
        secondary: wantsWarm ? "米白、浅黄、浅棕承接背景和信息区。" : "用浅色/深色同色阶建立模块，不新增复杂色相。",
        accent: wantsWarm ? "少量深棕、红橙或亮黄强调价格/行动。" : "同色系里最高对比的一档，用来强调行动点。",
        bestFor: wantsWarm ? "咖啡、餐饮、亲子、节日和生活方式项目。" : "画面已经乱、需要快速统一气质的稿。",
        risk: "同色系容易平，要用明度对比和字体层级补强重点。",
      },
    ];
  }

  function buildColorRepairSteps(text) {
    const steps = [];
    if (/太暗|不够亮|太灰|太脏/.test(text)) {
      steps.push("先提高背景或主信息区的明度，不要先加更多颜色。");
      steps.push("降低脏灰色的饱和度差异：保留一个主色，其他灰色改成同色系浅/深阶。");
      steps.push("把最重要的标题或 CTA 放到高对比色块上，别让文字直接压在复杂背景里。");
    }
    if (/不够年轻|不年轻/.test(text)) {
      steps.push("年轻感优先从更高明度、更清楚的留白和更轻快的强调色来，不是把颜色堆满。");
      steps.push("保留一个跳色给核心信息，其他颜色收干净。");
    }
    if (/颜色乱|配色乱|颜色有点乱/.test(text)) {
      steps.push("先删颜色：只留主色、辅助色、强调色，装饰色全部暂停。");
      steps.push("把同类信息统一成同一种颜色，不同组再用间距区分。");
    }
    if (!steps.length) {
      steps.push("先做 3 个小色板：稳妥版、年轻版、克制版，每版只用 3 个颜色。");
      steps.push("把当前稿缩小看一眼，第一眼看不到的信息先提高明度对比。");
    }
    return Array.from(new Set(steps)).slice(0, 5);
  }

  function buildColorReadabilityChecks(project, text) {
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${text}`;
    const checks = [
      "关掉饱和度看黑白稿：主标题和背景的明度差是否足够。",
      "强调色只用于最重要的 1-2 个信息点，不要平均撒在装饰上。",
      "同一组信息用同一套颜色逻辑，避免每行字都不同色。",
    ];
    if (/小红书|朋友圈|社媒|封面|头图|Banner/i.test(combined)) {
      checks.unshift("缩到手机预览尺寸，3 秒内主标题和行动点必须读得清。");
    }
    if (/印刷|包装|画册|折页/.test(combined)) {
      checks.unshift("印刷物要确认 CMYK 转换和打样，屏幕上的亮色印出来可能变暗。");
    }
    return checks.slice(0, 5);
  }

  function buildColorContext(project, text) {
    const context = [];
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${text}`;
    if (/品牌|VI|Logo|logo/.test(combined)) {
      context.push("如果有品牌规范，先用品牌标准色；辅助色和强调色不能抢走品牌识别。");
    }
    if (/小红书|朋友圈|社媒|封面/.test(combined)) {
      context.push("社媒图要先保证缩略图里标题清楚，颜色好看但读不清就要降级。");
    }
    if (project.goal && !/待补充/.test(project.goal)) {
      context.push(`当前目标是「${project.goal}」，颜色要帮助用户更快完成这个判断。`);
    }
    if (project.dueDate && daysUntil(project.dueDate) <= 1) {
      context.push("时间紧时先做减色和对比修正，不要临时换一整套视觉风格。");
    }
    return Array.from(new Set(context)).slice(0, 4);
  }

  function translateStyleKeyword(project, analysis) {
    const style = pickStyleRecipe(analysis.text);
    const lines = [`风格关键词翻译：${style.name}`];
    lines.push(`先判断：${style.judge}`);
    lines.push("落地动作：");
    lines.push(`- 构图：${style.layout}`);
    lines.push(`- 字体：${style.type}`);
    lines.push(`- 色彩：${style.color}`);
    lines.push(`- 图形/材质：${style.graphic}`);
    lines.push("不要这样做：");
    style.pitfalls.forEach((item) => lines.push(`- ${item}`));
    const context = buildStyleContext(project, analysis.text, style);
    if (context.length) {
      lines.push("结合当前项目：");
      context.forEach((item) => lines.push(`- ${item}`));
    }
    lines.push(`下一步：${style.nextStep}`);
    lines.push("判断标准：别人不用听你解释，也能从画面秩序、字体性格、色彩和图形语言里感到这个调性。");
    project.portfolio.process = appendSentence(project.portfolio.process, `风格关键词翻译：${style.name} - ${analysis.text}`);
    return lines.join("\n");
  }

  function pickStyleRecipe(text) {
    const recipes = [
      {
        key: "premium",
        match: /高级感|高级一点|大气|轻奢|专业感/,
        name: "高级 / 大气 / 专业",
        judge: "高级感不是变黑变灰，而是秩序、留白、素材质量和细节克制。",
        layout: "减少元素数量，主标题和主视觉留出足够呼吸空间，信息对齐到清楚网格。",
        type: "用稳定字重的黑体/宋黑，不超过 2 种字重；标题别用太花的装饰字。",
        color: "低饱和主色 + 大面积中性色 + 小面积高光色，避免多种跳色。",
        graphic: "用轻阴影、细线、局部材质或高质量图片做质感，选一个就够。",
        pitfalls: ["不要把画面整体压暗，文字读不清会显廉价。", "不要堆金色、渐变、阴影和纹理，高级感来自收敛。"],
        nextStep: "做一版减法稿：删掉 30% 装饰，只保留主标题、主视觉和一个强调点。",
      },
      {
        key: "young",
        match: /年轻感|年轻一点|活泼|潮酷|清新/,
        name: "年轻 / 活泼 / 清新",
        judge: "年轻感来自轻快节奏和清楚传播，不是把颜色全部做亮。",
        layout: "标题节奏可以更大，局部错位、倾斜或贴纸式标签制造动势。",
        type: "标题可用圆体、粗黑或更有性格的字体，正文保持干净易读。",
        color: "提高明度，保留一个跳色给核心信息，背景用浅色或干净渐变承托。",
        graphic: "加入简单图形、贴纸、箭头、手绘线或轻量纹理，让画面更有节奏。",
        pitfalls: ["不要超过一个跳色，否则会乱。", "不要让装饰抢走标题，小屏里要先读到主信息。"],
        nextStep: "做一版传播稿：放大主标题，加一个跳色标签，再用手机缩略图看 3 秒。",
      },
      {
        key: "tech",
        match: /科技感|未来感|赛博/,
        name: "科技 / 未来 / 赛博",
        judge: "科技感来自信息秩序、冷色光感和精确图形，不只是蓝紫渐变。",
        layout: "用网格、分栏、数据模块或中心聚焦结构，让画面有系统感。",
        type: "用几何黑体、窄体或等宽感字体；数字和标签可以更硬朗。",
        color: "深色或冷灰底，搭配蓝/青/紫色光感，小面积高亮强调关键点。",
        graphic: "用细线、网格、发光边、数据框、扫描线或粒子做辅助。",
        pitfalls: ["不要到处发光，焦点会散。", "不要只套蓝紫渐变，信息结构不硬朗就不像科技。"],
        nextStep: "先搭一张黑底网格稿，只让主标题或核心主体有一处发光。",
      },
      {
        key: "chinese",
        match: /国潮|国风|中国风/,
        name: "国潮 / 国风",
        judge: "国潮不是把祥云、印章、毛笔字全塞进去，而是传统元素和现代版式的组合。",
        layout: "用现代海报结构承载传统元素，主标题或主视觉只选一个最强符号。",
        type: "标题可用宋体、书法感字体或复古标题字，正文仍用清楚字体。",
        color: "可用红、金、墨、米白或青绿，但控制在 2-3 个主色关系内。",
        graphic: "选择一种传统元素：纹样、印章、山水、窗棂、纸纹或器物轮廓。",
        pitfalls: ["不要同时用太多传统符号，会像素材拼贴。", "书法字体只适合短标题，长文会读不清。"],
        nextStep: "先选一个传统符号做视觉锚点，再用现代网格排标题和信息。",
      },
      {
        key: "cute",
        match: /可爱|童趣/,
        name: "可爱 / 童趣",
        judge: "可爱感来自圆润比例、轻松节奏和柔和颜色，不是简单加很多卡通贴纸。",
        layout: "用更圆润的图形和更松的间距，信息组块像积木一样清楚。",
        type: "标题可用圆体或手写感字体，正文保持简单，不要整张图都卡通化。",
        color: "低对比柔和色，主色偏暖或高明度，强调色只点在关键互动位置。",
        graphic: "用圆角贴纸、简单表情、手绘线、小图标或软阴影增加亲和感。",
        pitfalls: ["不要让可爱装饰影响信息阅读。", "可爱不等于幼稚，商业项目要保留清楚的品牌和行动信息。"],
        nextStep: "先把所有硬边元素改成圆角/柔和形状，再保留一个最可爱的视觉点。",
      },
    ];
    return recipes.find((item) => item.match.test(text)) || {
      key: "minimal",
      name: "极简 / 克制",
      judge: "极简不是空，而是只留下最重要的信息和最清楚的秩序。",
      layout: "一屏只保留一个第一视觉，其他信息按网格弱化排列。",
      type: "字体少、字重少、字号层级明确，靠比例和留白建立气质。",
      color: "中性色或单主色为主，强调色只用于一个行动点。",
      graphic: "装饰尽量少，用线条、留白、材质或局部图片制造细节。",
      pitfalls: ["不要删到信息不完整。", "不要用过小文字假装高级，交付时仍要可读。"],
      nextStep: "先做黑白稿，只用字号、字重和留白建立完整层级。",
    };
  }

  function buildStyleContext(project, text, style) {
    const context = [];
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${text}`;
    if (/小红书|朋友圈|社媒|封面|头图|Banner/i.test(combined)) {
      context.push("这是偏传播场景，风格必须先服务小屏第一眼，标题和核心利益点不能被氛围吃掉。");
    }
    if (/印刷|包装|画册|折页/.test(combined)) {
      context.push("如果要印刷，材质、细线、发光和低对比颜色都要提前考虑打样效果。");
    }
    if (/品牌|VI|Logo|logo/.test(combined)) {
      context.push("品牌项目先遵守品牌色、字体和 Logo 规则，再做风格化表达。");
    }
    if (project.goal && !/待补充/.test(project.goal)) {
      context.push(`当前目标是「${project.goal}」，${style.name}也要能解释这个目标。`);
    }
    if (project.dueDate && daysUntil(project.dueDate) <= 1) {
      context.push("时间紧时先做一个风格锚点，不要整张图同时大改。");
    }
    return Array.from(new Set(context)).slice(0, 4);
  }

  function adaptMultiFormat(project, analysis) {
    const targets = detectAdaptTargets(project, analysis.text);
    const lines = [`多尺寸适配方案：${project.name}`];
    lines.push("不要直接拉伸原稿。先做一张母版，再按平台重排信息层级。");
    lines.push("适配顺序：");
    lines.push("1. 锁定母版：主标题、主视觉、核心卖点和 CTA 先确定。");
    lines.push("2. 拆安全区：每个尺寸先画出不可裁切区域，再放主信息。");
    lines.push("3. 重排而不是缩放：横版改竖版时，主视觉和标题位置要重新建立第一眼顺序。");
    lines.push("4. 少字优先：小尺寸只保留主标题、一个利益点和一个行动点。");
    lines.push("平台处理：");
    targets.forEach((target) => lines.push(`- ${target.name}：${target.note}`));
    lines.push("检查标准：缩到手机预览或真实投放尺寸，3 秒内能否看清主标题和核心利益点。");
    lines.push("下一步：先导出低清预览给自己看裁切，再统一导出正式图，避免最后才发现关键信息被裁掉。");
    project.portfolio.process = appendSentence(project.portfolio.process, `多尺寸适配：${analysis.text}`);
    return lines.join("\n");
  }

  function unifySeriesVisualSystem(project, analysis) {
    const system = buildSeriesSystem(project, analysis.text);
    const lines = [`系列视觉统一：${project.name}`];
    lines.push("先做一张母版，再做延展。系列感来自“固定规则 + 少量变化”，不是每张都重新设计。");
    lines.push("固定项：");
    system.fixed.forEach((item) => lines.push(`- ${item}`));
    lines.push("可变化项：");
    system.variable.forEach((item) => lines.push(`- ${item}`));
    lines.push("母版规则：");
    system.master.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("延展顺序：");
    buildSeriesExtensionSteps(project, analysis.text).forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("统一性检查：");
    buildSeriesConsistencyChecks(project, analysis.text).forEach((item) => lines.push(`- ${item}`));
    lines.push("下一步：先把其中一张定成母版，只保留 5 条固定规则，再复制到其他物料里替换内容。");
    project.portfolio.process = appendSentence(project.portfolio.process, `系列视觉统一：${analysis.text}`);
    return lines.join("\n");
  }

  function buildSeriesSystem(project, text) {
    const combined = `${project.name} ${project.type} ${(project.deliverables || []).join("、")} ${text}`;
    const fixed = [
      "同一套标题字体和字重层级：主标题、利益点、说明文字各一档。",
      "同一套主色/辅助色/强调色比例，不要每张换一组配色。",
      "同一套网格和边距：标题区、主体区、信息区位置保持稳定。",
      "同一套图形语言：贴纸、线条、纹理、图标或装饰只能选一类作为系列符号。",
    ];
    if (/品牌|logo|Logo|VI|vi/.test(combined)) fixed.unshift("品牌色、Logo 位置和品牌字体必须固定，不作为变化项。");
    if (/社媒|小红书|朋友圈|公众号|封面|头图|Banner/i.test(combined)) fixed.push("小屏第一眼规则固定：主标题和核心利益点永远最清楚。");
    const variable = [
      "每张的主视觉图片/产品/人物可以变化，但裁切方式和色调处理要一致。",
      "主题关键词可以变化，但字数、位置和视觉重量保持一致。",
      "强调色可以在同一色系里轻微变化，用来区分不同主题或日期。",
    ];
    if (/活动|节日|系列/.test(combined)) variable.push("每张可换一个主题符号，但符号风格要同源，例如同样的线描、贴纸或材质。");
    const master = [
      "先定一个统一页边距和安全区，所有物料都从这里复制。",
      "固定主标题位置和最大字号，再给副信息留固定区域。",
      "建立统一素材处理：同色罩、同颗粒、同光源或同裁切比例，选一种即可。",
      "把装饰做成可复用组件，不要每张临时画不同装饰。",
    ];
    return {
      fixed: Array.from(new Set(fixed)).slice(0, 6),
      variable: Array.from(new Set(variable)).slice(0, 5),
      master,
    };
  }

  function buildSeriesExtensionSteps(project, text) {
    const steps = [
      "先选母版：选信息最完整、最典型的一张作为基准。",
      "复制结构：先复制网格、标题、颜色和装饰，不急着换风格。",
      "替换内容：只换主视觉、标题文案和必要说明，保留层级关系。",
      "逐张检查：把所有图缩小放在同一屏，看哪张跳出来不像一套。",
      "最后统一导出：命名、尺寸、格式和源文件分组一起整理。",
    ];
    if ((project.deliverables || []).length >= 2 || /多张|一组|套图|系列/.test(text)) {
      steps.splice(3, 0, "按使用场景微调：封面可以更强，详情图可以信息更多，但视觉规则不变。");
    }
    return steps.slice(0, 6);
  }

  function buildSeriesConsistencyChecks(project, text) {
    const checks = [
      "遮住文案只看版式，是否还能看出同一套网格？",
      "吸取主色板，是否仍然是同一组颜色关系？",
      "只看标题，字体、字重、大小和位置是否一致？",
      "只看装饰，图形语言是否同源，还是每张都像临时拼的？",
      "缩小到手机预览，主信息是否都能在 3 秒内读到？",
    ];
    if (/素材|图片|照片/.test(text)) checks.push("素材风格不一时，先用统一裁切、色罩或颗粒收住，不要直接混放。");
    if (project.dueDate && daysUntil(project.dueDate) <= 1) checks.push("时间紧时只统一 3 件事：字体、颜色、网格；复杂装饰先不重做。");
    return Array.from(new Set(checks)).slice(0, 6);
  }

  function detectAdaptTargets(project, text) {
    const combined = `${(project.deliverables || []).join("、")} ${text}`;
    const targets = [];
    if (/小红书|封面/.test(combined)) {
      targets.push({ name: "小红书封面", note: "标题要大，人物/产品不要贴边，顶部和底部留出裁切余量。" });
    }
    if (/朋友圈|海报/.test(combined)) {
      targets.push({ name: "朋友圈海报", note: "主标题和活动利益点放在上半区，长说明放弱，不要让二维码抢第一眼。" });
    }
    if (/公众号|头图/.test(combined)) {
      targets.push({ name: "公众号头图", note: "横向空间更宽，主标题和主体图左右分布，避免把字压得太小。" });
    }
    if (/Banner|banner|横幅/.test(combined)) {
      targets.push({ name: "Banner", note: "横版只保留一个主视觉和一句核心文案，按钮或利益点要靠近视觉中心。" });
    }
    if (!targets.length) {
      targets.push({ name: "当前尺寸", note: "先确认真实投放尺寸和安全区，再决定是重排、裁切还是删减信息。" });
    }
    return targets.slice(0, 5);
  }

  function checkBrandConsistency(project, analysis) {
    const text = analysis.text;
    const drift = buildBrandDriftRepair(project, text);
    const lines = [`品牌一致性检查：${project.name}`];
    lines.push("先别只看单张图好不好看，先看它有没有像同一个品牌。按这个顺序检查：");
    buildBrandChecks(project, text).forEach((item, index) => {
      lines.push(`${index + 1}. ${item}`);
    });
    if (drift.isDrift) {
      lines.push("如果对方说“不像品牌”：");
      drift.repairs.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
      lines.push(`沟通话术：${drift.talkTrack}`);
    }
    lines.push("修正顺序：");
    lines.push("- 先固定 Logo 使用方式和安全距离，再调版式。");
    lines.push("- 再收敛品牌色和辅助色，不要随手加新颜色。");
    lines.push("- 最后统一字体、图标、线条、插画或素材处理方式。");
    lines.push("需要确认：是否有品牌手册、标准色值、指定字体、Logo 禁用规则和历史模板。");
    lines.push("判断标准：遮住 Logo 后，用户仍然能从色彩、字体、图形语言感到这是同一个品牌。");
    project.portfolio.process = appendSentence(project.portfolio.process, `品牌一致性检查：${analysis.text}`);
    return lines.join("\n");
  }

  function buildBrandDriftRepair(project, text) {
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${project.goal || ""} ${text}`;
    const isDrift = /不像品牌|不像我们|不符合品牌|风格跑偏|品牌感不够|品牌感弱/.test(combined);
    const repairs = [
      "先找品牌锚点：从历史物料或品牌手册里截 3 张最像品牌的图，提取固定颜色、字体、图形和版式节奏。",
      "只改 3 个高影响项：主色回到品牌色、标题字体回到品牌气质、Logo/页边距回到固定规则。",
      "保留这版有效信息：不要整张重做，先把跑偏的颜色、字体、装饰语言收回来。",
      "做前后对比：把原稿和修正版并排，说明“我收回了哪些品牌规则”。",
    ];
    if (/年轻|活泼|节日|活动|促销/.test(combined)) {
      repairs.splice(2, 0, "如果这次要更活泼，只让辅助图形或强调色活泼，品牌主色、Logo 和标题规则不要一起变。");
    }
    if (/高端|高级|质感|轻奢/.test(combined)) {
      repairs.splice(2, 0, "如果这次要更高级，先减少杂色和装饰，不要脱离品牌色去追流行质感。");
    }
    const talkTrack = "我先不大改方向，会先对照品牌手册/历史物料，把颜色、字体、Logo 安全距离和版式节奏收回到品牌规则里，再保留这次活动需要的新鲜感。";
    return {
      isDrift,
      repairs: Array.from(new Set(repairs)).slice(0, 5),
      talkTrack,
    };
  }

  function buildBrandChecks(project, text) {
    const checks = [
      "Logo：比例、留白、安全距离和背景对比是否符合规范。",
      "色彩：主品牌色是否正确，辅助色有没有抢走品牌色。",
      "字体：标题和正文是否沿用品牌字体或同气质替代字体。",
      "图形语言：图标、线条、插画、照片调性是否像同一套系统。",
      "版式气质：间距、圆角、按钮、标签是否和历史物料一致。",
    ];
    if (/品牌色|颜色|色值/.test(text)) {
      checks.unshift("色值：先确认品牌标准色的 RGB/CMYK/HEX，不要用肉眼吸近似色。");
    }
    if (/logo|Logo/.test(text)) {
      checks.unshift("Logo 使用：不要拉伸、加描边、随意换色或压在复杂背景上。");
    }
    if (/字体/.test(text)) {
      checks.unshift("品牌字体：如果没有授权字体，先找气质接近且可商用的替代字体，并记录原因。");
    }
    return Array.from(new Set(checks)).slice(0, 7);
  }

  function optimizeLogoExposure(project, analysis) {
    const plan = buildLogoExposurePlan(project, analysis.text);
    const lines = [`Logo 露出与品牌存在感：${project.name}`];
    lines.push(`先判断：${plan.judge}`);
    lines.push("推荐放法：");
    plan.placements.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("大小与安全距离：");
    plan.sizeRules.forEach((item) => lines.push(`- ${item}`));
    lines.push("如果对方要求再大一点：");
    lines.push(plan.reply);
    lines.push("不要这样做：");
    plan.donts.forEach((item) => lines.push(`- ${item}`));
    lines.push("提交前检查：");
    plan.checks.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push(`下一步：${plan.nextStep}`);
    project.portfolio.process = appendSentence(project.portfolio.process, `Logo 露出优化：${analysis.text}`);
    return lines.join("\n");
  }

  function buildLogoExposurePlan(project, text) {
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${project.goal || ""} ${text}`;
    const wantsBigger = /放大|再大|更大|太小|不明显|更明显|突出|存在感/.test(combined);
    const wantsPlacement = /放哪|放哪里|怎么放|摆哪|位置/.test(combined);
    const social = /小红书|朋友圈|社媒|封面|公众号|Banner|banner/.test(combined);
    const print = /印刷|包装|画册|折页|海报/.test(combined);
    const placements = [
      "常规品牌露出：放在左上或右上，保持固定边距，让用户先读主题，再注意品牌。",
      "活动/促销画面：Logo 靠近主标题或活动主视觉，但不要插进标题字组里。",
      "品牌主导画面：可以把 Logo 放进品牌色块或页眉区域，用稳定位置强化识别。",
    ];
    if (social) placements.unshift("社媒封面：Logo 不要贴边，先避开头像/昵称/平台遮挡区，缩略图里能看见即可。");
    if (print) placements.push("印刷物：Logo 离裁切线和折线留足安全距离，不要靠出血边缘。");
    if (wantsPlacement) placements.push("如果画面有强主视觉，Logo 放在视觉动线末端，避免和主体争第一眼。");
    const sizeRules = [
      "先按画面宽度的约 5%-10% 试 Logo 宽度，再根据品牌等级和使用场景微调。",
      "Logo 周围至少保留一个 Logo 高度的安全距离，不要被文字、贴纸、纹理挤住。",
      "Logo 要清楚，但不一定最大；主标题/主视觉负责传播，Logo 负责识别。",
    ];
    if (wantsBigger) sizeRules.unshift("不要只无限放大 Logo：先提升对比、留白和位置稳定性，通常比单纯变大更高级。");
    const donts = [
      "不要拉伸、压扁、描边、随意换色或加复杂阴影。",
      "不要把 Logo 放在复杂图片上硬靠发光救可读性；先换干净底或加承托色块。",
      "不要让 Logo 抢走主标题和行动入口，否则画面会像内部汇报而不是面向用户。",
    ];
    const checks = [
      "遮住 Logo 后，画面是否仍然像这个品牌？如果不像，说明品牌只靠 Logo，系统感不够。",
      "缩小预览后，Logo 是否清楚但不过分抢眼？",
      "Logo 安全距离、比例、颜色是否符合品牌手册或历史物料？",
      "主标题、主视觉、Logo 三者是否有明确顺序，而不是同时抢第一眼？",
    ];
    return {
      judge: "品牌存在感不只靠 Logo 变大，而是位置稳定、对比清楚、留白安全，并和品牌色/字体一起形成识别。",
      placements: Array.from(new Set(placements)).slice(0, 6),
      sizeRules: Array.from(new Set(sizeRules)).slice(0, 5),
      reply: buildLogoExposureReply(project, wantsBigger),
      donts: Array.from(new Set(donts)).slice(0, 4),
      checks: Array.from(new Set(checks)).slice(0, 5),
      nextStep: "复制当前稿做 3 个 Logo 小方案：常规角落版、靠近标题版、品牌色块承托版，缩小预览后选最稳的一版。",
    };
  }

  function buildLogoExposureReply(project, wantsBigger) {
    const goal = project.goal && !/待补充|待从/.test(project.goal) ? `，同时不影响「${project.goal}」` : "";
    if (wantsBigger) {
      return `可以，我先做一版 Logo 更明显的方案。但我会优先通过位置、留白和底色承托提升识别，而不是只把 Logo 拉很大，这样品牌更清楚${goal}，画面也不会显得生硬。`;
    }
    return `我会先保证 Logo 清楚、比例正确、安全距离足够，再看它和主标题/主视觉的顺序。品牌露出要稳定，不一定要抢第一眼。`;
  }

  function optimizeAlignmentSpacing(project, analysis) {
    const plan = buildAlignmentSpacingPlan(project, analysis.text);
    const lines = [`对齐与间距诊断：${project.name}`];
    lines.push(`先判断：${plan.judge}`);
    lines.push("先定网格：");
    plan.grid.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("按这个顺序整理：");
    plan.steps.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("不要这样做：");
    plan.donts.forEach((item) => lines.push(`- ${item}`));
    lines.push("检查标准：");
    plan.checks.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push(`下一步：${plan.nextStep}`);
    project.portfolio.process = appendSentence(project.portfolio.process, `对齐与间距整理：${analysis.text}`);
    return lines.join("\n");
  }

  function buildAlignmentSpacingPlan(project, text) {
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${project.goal || ""} ${text}`;
    const alignmentIssue = /对不齐|没对齐|不对齐|对齐.*乱|不整齐|不齐|参差|元素.*飘|像飘着/.test(combined);
    const spacingIssue = /间距不统一|间距不一致|边距不统一|边距不一致|边距怪|贴边|太贴边/.test(combined);
    const gridIssue = /网格.*乱|没有网格|秩序感不够/.test(combined);
    const grid = [
      "先定外边距：所有重要信息离画面边缘使用同一套安全距离。",
      "再定主轴线：标题、主体、信息组至少共享一条左对齐/中轴/右对齐基准线。",
      "最后定间距刻度：只用 2-3 档间距，例如小组内近、组间远、区块间更远。",
    ];
    const steps = [];
    if (alignmentIssue) {
      steps.push("打开参考线或网格，先让同一信息组共享一条对齐线，不要凭眼睛一点点挪。");
      steps.push("处理视觉对齐：图标、圆形、斜体字可以略微超出数学对齐线，让视觉上更稳。");
    }
    if (spacingIssue) {
      steps.push("统一同类元素间距：同一组卡片/标签/文字块之间的距离必须相同。");
      steps.push("拉开不同组之间的距离：组间距要明显大于组内距，让关系一眼可读。");
    }
    if (gridIssue) {
      steps.push("先用 2 栏或 3 栏网格重排一次，把标题区、主视觉区、信息区固定下来。");
      steps.push("删掉无法贴合网格的零散装饰，避免画面看起来像临时拼贴。");
    }
    if (!steps.length) {
      steps.push("先统一外边距、主轴线和组间距，再看是否还需要调整细节。");
      steps.push("把同类信息做成组块，别让每个元素单独漂在画面上。");
    }
    steps.push("缩小预览后检查：如果元素位置还像随机摆放，说明网格没有真正建立。");
    const donts = [
      "不要每个元素都单独微调；先定规则，再让元素服从规则。",
      "不要为了填空破坏外边距，贴边会显得廉价且不安全。",
      "不要把所有间距做成一样；同组近、不同组远，才有阅读关系。",
    ];
    const checks = [
      "遮住内容只看外框：各信息组是否沿着同一套边距和轴线？",
      "看同类元素：卡片、标签、图标、文字块的间距是否一致？",
      "看组间关系：标题组、主体区、说明区之间是否有明确距离差？",
      "退后一步或缩小预览：画面是否比原来更稳、更有秩序？",
    ];
    if (/小红书|朋友圈|社媒|封面|公众号|Banner|banner/.test(combined)) {
      checks.unshift("手机预览检查：标题区、主体区、行动区是否仍然清楚分组？");
    }
    if (/印刷|包装|画册|折页/.test(combined)) {
      checks.unshift("印刷检查：外边距、页边距和裁切安全区是否统一且足够？");
    }
    const labels = [];
    if (alignmentIssue) labels.push("对齐不稳");
    if (spacingIssue) labels.push("间距不统一");
    if (gridIssue) labels.push("网格缺失");
    return {
      judge: labels.length ? `${labels.join(" + ")}，先建立规则，再做视觉微调。` : "先确认外边距、主轴线和间距刻度有没有统一。",
      grid: Array.from(new Set(grid)).slice(0, 4),
      steps: Array.from(new Set(steps)).slice(0, 7),
      donts: Array.from(new Set(donts)).slice(0, 4),
      checks: Array.from(new Set(checks)).slice(0, 5),
      nextStep: "复制当前稿做一版“网格整理稿”：只统一外边距、对齐线和 3 档间距，先别改颜色字体。",
    };
  }

  function balanceVisualDensity(project, analysis) {
    const diagnosis = buildVisualDensityDiagnosis(project, analysis.text);
    const lines = [`画面密度与平衡诊断：${project.name}`];
    lines.push(`先判断：${diagnosis.judge}`);
    lines.push("优先改这几处：");
    diagnosis.actions.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("不要这样补：");
    diagnosis.donts.forEach((item) => lines.push(`- ${item}`));
    lines.push("提交前检查：");
    diagnosis.checks.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push(`下一步：${diagnosis.nextStep}`);
    project.portfolio.process = appendSentence(project.portfolio.process, `画面密度与平衡调整：${analysis.text}`);
    return lines.join("\n");
  }

  function buildVisualDensityDiagnosis(project, text) {
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${project.goal || ""} ${text}`;
    const isEmpty = /太空|很空|空了|空荡|太少|留白.*多/.test(combined);
    const isCrowded = /太满|很满|太挤|拥挤|挤|元素.*太多|留白.*少/.test(combined);
    const isUnbalanced = /不平衡|失衡|重心|压不住|头重脚轻|左重右重|左重右轻|右重左轻|散/.test(combined);
    const actions = [];
    const donts = [
      "不要用无意义小装饰硬填空，填完通常更碎。",
      "不要同时放大标题、主体、卖点和装饰；只允许一个第一视觉变强。",
      "不要为了平衡把元素摆成平均分布，平均会变平、变无聊。",
    ];
    const checks = [
      "眯眼看黑白密度：第一眼是否能看到一个明确重心，而不是到处一样重？",
      "缩到手机预览或实际观看距离：主标题、主体和行动点是否仍然清楚？",
      "看四边留白：上、下、左、右不是必须一样，但要有能解释的节奏。",
      "删掉一个装饰后画面是否更稳？如果更稳，说明原本是在用装饰掩盖结构问题。",
    ];
    if (isEmpty) {
      actions.push("先确认空的是“信息不足”还是“重心太弱”：如果主标题/主体太小，先放大第一视觉，不急着加装饰。");
      actions.push("把相关信息合成一个组块，例如标题 + 副标题 + 行动点，避免每个字都孤零零漂着。");
      actions.push("用大色块、浅纹理或背景层次补画面气氛，但透明度要低，只服务主信息。");
    }
    if (isCrowded) {
      actions.push("先删重复信息：同一句卖点、同类标签、过多装饰只保留最能帮助理解的一项。");
      actions.push("把信息分成 3 层：第一眼主题、第二眼卖点、第三眼细节；第三层可以缩小或移到角落。");
      actions.push("统一边距和行距，让密度来自秩序，不是靠把元素挤在一起。");
    }
    if (isUnbalanced) {
      actions.push("先找视觉重心：把画面转成黑白或缩小预览，看最重的黑块/亮块落在哪里。");
      actions.push("用对角或边缘的小信息组做平衡，而不是在空处随便加图案。");
      actions.push("如果主体偏一侧，另一侧只补轻量信息或留白，不要放另一个同等重量的主体。");
    }
    if (!actions.length) {
      actions.push("先做黑白密度稿：只看大块面、标题和主体，不看颜色和细节。");
      actions.push("确定一个第一视觉，再把其他元素按重要性降级。");
      actions.push("用统一边距和信息组块重新排一次，先让画面站稳。");
    }
    if (/小红书|朋友圈|社媒|封面|Banner|banner|公众号/.test(combined)) {
      checks.unshift("手机端 3 秒检查：缩略图里是否还能看出主题和主视觉？");
    }
    if (/包装|画册|折页|印刷/.test(combined)) {
      checks.unshift("真实尺寸检查：站在实际观看距离看，留白和密度是否还舒服？");
    }
    const labels = [];
    if (isEmpty) labels.push("太空");
    if (isCrowded) labels.push("太满");
    if (isUnbalanced) labels.push("重心不稳");
    return {
      judge: labels.length ? `${labels.join(" + ")}，先处理视觉重心，再处理装饰和细节。` : "先判断视觉重心是否明确，再看留白和元素密度。",
      actions: Array.from(new Set(actions)).slice(0, 6),
      donts: Array.from(new Set(donts)).slice(0, 4),
      checks: Array.from(new Set(checks)).slice(0, 5),
      nextStep: "复制当前稿，做一版 10 分钟黑白密度小稿：只保留标题、主体、必要信息和大块面，先把重心调稳再回到颜色细节。",
    };
  }

  function separateSubjectBackground(project, analysis) {
    const plan = buildSubjectBackgroundPlan(project, analysis.text);
    const lines = [`主体与背景层次诊断：${project.name}`];
    lines.push(`先判断：${plan.judge}`);
    lines.push("先分清角色：");
    plan.roles.forEach((item) => lines.push(`- ${item}`));
    lines.push("按这个顺序改：");
    plan.steps.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("不要这样做：");
    plan.donts.forEach((item) => lines.push(`- ${item}`));
    lines.push("检查标准：");
    plan.checks.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push(`下一步：${plan.nextStep}`);
    project.portfolio.process = appendSentence(project.portfolio.process, `主体与背景层次调整：${analysis.text}`);
    return lines.join("\n");
  }

  function buildSubjectBackgroundPlan(project, text) {
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${project.goal || ""} ${text}`;
    const backgroundBusy = /背景太抢|背景抢|背景太花|背景太乱|背景压住/.test(combined);
    const subjectWeak = /主体不突出|主视觉不突出|产品不突出|人物不突出|被背景吃掉|看不出来|分不开/.test(combined);
    const flat = /没有层次感|层次感不够|层次不够|前后关系不清|画面太扁|空间感不够/.test(combined);
    const roles = [
      "主体：只负责第一眼被看到，例如产品、人物、主标题或核心图形。",
      "背景：只负责气氛和承托，不能和主体抢同样的明度、饱和度和细节。",
      "辅助元素：只负责引导视线或补充信息，面积和对比都要低于主体。",
    ];
    const steps = [];
    if (subjectWeak) {
      steps.push("先做黑白剪影测试：去掉颜色后，如果主体轮廓不清，就先放大、裁切或换更干净的主体图。");
      steps.push("拉开主体和背景的明度差：主体亮时背景压暗，主体暗时背景提亮或加浅色承托区。");
    }
    if (backgroundBusy) {
      steps.push("先降背景存在感：降低饱和度、对比和细节，必要时加一层 10%-25% 的色罩。");
      steps.push("把背景最花的区域避开标题和主体，不要让纹理正好压在信息中心后面。");
    }
    if (flat) {
      steps.push("建立前中后三层：前景可用少量遮挡/装饰，中景放主体，背景只做氛围。");
      steps.push("用虚实关系拉层次：背景轻微模糊或降细节，主体保持清晰锐利。");
    }
    if (!steps.length) {
      steps.push("先确定谁是主体，再把背景、装饰、信息都降一级。");
      steps.push("用明度、虚实、大小、遮挡四个方法里选两个拉开前后关系。");
    }
    steps.push("给主体加轻量承托：色块、投影、描边、背光或留白只选一种，不要全加。");
    steps.push("最后回到信息层级：主体突出后，标题和行动点仍然要读得清。");
    const donts = [
      "不要一上来加很重的投影，影子太重会显脏，也不一定解决主体弱。",
      "不要把背景直接模糊到没有品质；先降细节，再少量模糊。",
      "不要让主体、标题、背景都高饱和，全部抢眼等于没有主体。",
    ];
    const checks = [
      "黑白检查：去掉颜色后，主体和背景是否还能分开？",
      "眯眼检查：第一眼是不是先看到主体，而不是背景纹理？",
      "缩略图检查：缩到手机预览后，主体轮廓是否仍然清楚？",
      "边缘检查：主体边缘有没有被同色背景、复杂纹理或过重阴影吃掉？",
    ];
    if (/小红书|朋友圈|社媒|封面|Banner|banner|公众号/.test(combined)) {
      checks.unshift("小屏检查：在 25% 缩放下，主体、标题和行动点是否还能各司其职？");
    }
    if (/包装|印刷|画册|折页/.test(combined)) {
      checks.unshift("印刷检查：按真实尺寸看主体边缘和背景纹理，避免印出来糊成一团。");
    }
    const labels = [];
    if (subjectWeak) labels.push("主体弱");
    if (backgroundBusy) labels.push("背景抢");
    if (flat) labels.push("层次平");
    return {
      judge: labels.length ? `${labels.join(" + ")}，先拉开主体和背景，再补氛围细节。` : "先确认主体、背景、辅助元素各自承担什么角色。",
      roles,
      steps: Array.from(new Set(steps)).slice(0, 7),
      donts: Array.from(new Set(donts)).slice(0, 4),
      checks: Array.from(new Set(checks)).slice(0, 5),
      nextStep: "复制当前稿做一版“主体分离小稿”：只调整主体大小、背景明度和一层承托关系，先别加新装饰。",
    };
  }

  function strengthenVisualImpact(project, analysis) {
    const plan = buildVisualImpactPlan(project, analysis.text);
    const lines = [`视觉冲击力诊断：${project.name}`];
    lines.push(`先判断：${plan.judge}`);
    lines.push("先选一个视觉锚点：");
    plan.anchors.forEach((item) => lines.push(`- ${item}`));
    lines.push("按这个顺序加强：");
    plan.steps.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("不要这样做：");
    plan.donts.forEach((item) => lines.push(`- ${item}`));
    lines.push("提交前验证：");
    plan.checks.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push(`下一步：${plan.nextStep}`);
    project.portfolio.process = appendSentence(project.portfolio.process, `视觉冲击力调整：${analysis.text}`);
    return lines.join("\n");
  }

  function buildVisualImpactPlan(project, text) {
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${project.goal || ""} ${project.audience || ""} ${text}`;
    const anchors = [
      "主标题处理：用更大的字号、特殊字形、错位或局部强调，让第一眼先读到核心信息。",
      "主视觉处理：放大产品/人物/图形符号，让它承担记忆点，而不是只做背景装饰。",
      "构图处理：用夸张裁切、斜向动势、前后景层次或强留白，制造第一眼停顿。",
    ];
    const steps = [
      "先确定第一眼：主标题和主视觉只能有一个当主角，另一个做辅助。",
      "拉开对比：大小、明暗、虚实、疏密、冷暖里先选 1-2 个对比，不要全部同时加。",
      "做一个记忆点：让用户看完后能说出“那个大标题/那个图形/那个产品构图”。",
      "把不服务记忆点的装饰降级或删掉，避免画面热闹但记不住。",
    ];
    const donts = [
      "不要直接加更多颜色、阴影、描边和贴纸；复杂不等于有冲击力。",
      "不要让每个卖点都很大，全部突出等于没有重点。",
      "不要为了吸睛牺牲可读性；看不清主信息会被认为不专业。",
    ];
    const checks = [
      "3 秒测试：遮住细节，只看缩略图，能不能说出这张图在讲什么？",
      "黑白测试：去掉颜色后，第一视觉是否仍然最强？",
      "一句话测试：这张图的记忆点能不能用一句话说清楚？",
    ];
    if (/小红书|朋友圈|社媒|封面|Banner|banner|公众号/.test(combined)) {
      steps.unshift("先看投放入口：社媒/封面优先强化标题和主体轮廓，别把冲击力藏在小细节里。");
      checks.unshift("手机缩略图测试：在 25% 缩放下，标题和主视觉是否还成立？");
    }
    if (/高级|质感|品牌/.test(combined)) {
      anchors.push("质感锚点：只强化一个材质、光影或品牌符号，用克制的对比制造高级感。");
      donts.push("高级项目不要用过度炸裂的效果，冲击力可以来自留白、比例和材质细节。");
    }
    if (/促销|活动|报名|抢|优惠|转化/.test(combined)) {
      steps.push("把行动点靠近第一视觉：优惠、报名、扫码或时间信息要顺着视线路径出现。");
    }
    return {
      judge: "不吸睛通常不是“装饰不够”，而是第一视觉不明确、对比不够大、记忆点不集中。",
      anchors: Array.from(new Set(anchors)).slice(0, 5),
      steps: Array.from(new Set(steps)).slice(0, 6),
      donts: Array.from(new Set(donts)).slice(0, 5),
      checks: Array.from(new Set(checks)).slice(0, 5),
      nextStep: "复制当前稿做一版“强第一眼小稿”：只强化一个视觉锚点，并把其他信息降一级，先看缩略图是否更抓人。",
    };
  }

  function improveVisualPolish(project, analysis) {
    const diagnosis = buildVisualPolishDiagnosis(project, analysis.text);
    const lines = [`廉价感诊断与精修：${project.name}`];
    lines.push(`先判断：${diagnosis.judge}`);
    lines.push("最可能的问题：");
    diagnosis.problems.forEach((item) => lines.push(`- ${item}`));
    lines.push("按这个顺序改：");
    diagnosis.steps.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("不要这样做：");
    diagnosis.donts.forEach((item) => lines.push(`- ${item}`));
    lines.push("提交前看这 4 个标准：");
    buildVisualPolishChecks(project, analysis.text).forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push(`下一步：${diagnosis.nextStep}`);
    project.portfolio.process = appendSentence(project.portfolio.process, `视觉精修诊断：${analysis.text}`);
    return lines.join("\n");
  }

  function buildVisualPolishDiagnosis(project, text) {
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${project.goal || ""} ${text}`;
    const problems = [];
    const steps = [];
    const donts = [
      "不要先加更多阴影、渐变、发光或纹理；堆效果通常会更廉价。",
      "不要为了高级感把整体压暗，文字读不清会直接掉质感。",
      "不要同时换颜色、字体、素材和版式；一次只修一个主问题。",
    ];
    if (/颜色|配色|脏|土|廉价|淘宝感/.test(combined)) {
      problems.push("颜色数量太多、饱和度太平均，强调色没有只服务重点。");
      steps.push("先减色：保留 1 个主色、1 个辅助色、1 个强调色，其余颜色降成中性色。");
    }
    if (/字体|字|模板|粗糙|不精致/.test(combined)) {
      problems.push("字体层级和间距可能不稳，标题、正文、标签在抢同一个位置。");
      steps.push("收字体：控制 1-2 个字体家族，字号只保留 3 档，统一字重和行距。");
    }
    if (/素材|图片|抠图|塑料感|影楼感/.test(combined)) {
      problems.push("素材质量或抠图边缘可能拉低画面，主体和背景不像同一套光线。");
      steps.push("修素材：换高清图或缩小低清素材，统一光源、色温和颗粒感。");
    }
    if (/阴影|渐变|发光|质感|高级|低级|不高级/.test(combined)) {
      problems.push("效果可能太重或方向不统一，质感没有服务层级。");
      steps.push("轻效果：只给主视觉或主信息加一层轻阴影/材质，其他元素保持干净。");
    }
    if (!problems.length) {
      problems.push("整体秩序不足：颜色、字体、间距、素材风格里至少有一项没有统一。");
      steps.push("先做减法版：去掉 50% 装饰，只保留主标题、主体、必要信息和一个视觉锚点。");
    }
    steps.push("拉开主次：主标题或主体只选一个当第一视觉，辅助信息降一档。");
    steps.push("统一间距：相同层级用相同边距和对齐方式，避免元素像临时摆上去。");
    if (/小红书|朋友圈|公众号|社媒|封面|头图|Banner/i.test(combined)) {
      steps.push("缩到手机预览看 3 秒，主标题和主体还清楚，才算精修有效。");
    }
    if (/印刷|包装|画册|折页/.test(combined)) {
      steps.push("按真实尺寸看边距、字号和图片精度，别只在屏幕缩放状态判断质感。");
    }
    return {
      judge: "廉价感通常不是缺一个效果，而是颜色、字体、素材、间距和层级没有统一。",
      problems: Array.from(new Set(problems)).slice(0, 5),
      steps: Array.from(new Set(steps)).slice(0, 6),
      donts: Array.from(new Set(donts)).slice(0, 4),
      nextStep: "复制当前稿做一版“减法精修稿”：先减色、收字体、统一间距，再只保留一个质感细节。",
    };
  }

  function buildVisualPolishChecks(project, text) {
    const checks = [
      "颜色：除了图片本身，画面主色是否控制在 2-3 类以内？",
      "字体：标题、正文、标签是否各有明确层级，而不是都很抢？",
      "间距：同类信息的边距和对齐是否一致？",
      "素材：主体图、背景和装饰是否像同一套光线与风格？",
    ];
    if (project.goal && !/待补充|待从/.test(project.goal)) checks.unshift(`目标：这些精修是否帮助「${project.goal}」，而不是只让画面更复杂？`);
    if (/高级|质感|不高级|廉价/.test(text)) checks.push("高级感：是否能删掉一个效果后仍然成立？如果不能，说明结构还不稳。");
    return Array.from(new Set(checks)).slice(0, 5);
  }

  function guideVisualEffect(project, analysis) {
    const recipe = pickVisualEffectRecipe(analysis.text);
    const lines = [`视觉效果做法：${project.name}`];
    lines.push(`先判断：${recipe.judge}`);
    lines.push("具体步骤：");
    recipe.steps.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    const context = buildVisualEffectContext(project, analysis.text, recipe);
    if (context.length) {
      lines.push("结合当前项目：");
      context.forEach((item) => lines.push(`- ${item}`));
    }
    lines.push("避坑：");
    recipe.pitfalls.forEach((item) => lines.push(`- ${item}`));
    lines.push(`下一步：${recipe.nextStep}`);
    lines.push("判断标准：效果是为了强化主信息，不是为了证明技法很复杂。缩小预览后，标题和核心信息仍然清楚才算成功。");
    project.portfolio.process = appendSentence(project.portfolio.process, `视觉效果尝试：${analysis.text}`);
    return lines.join("\n");
  }

  function pickVisualEffectRecipe(text) {
    const recipes = [
      {
        key: "glass",
        match: /毛玻璃|玻璃拟态/,
        judge: "毛玻璃适合放在有层次的背景上，用来承载文字或标签；如果背景本身很花，先降噪再做。",
        steps: [
          "先选一个有明暗变化的背景，不要用纯平底色硬做毛玻璃。",
          "给信息区加半透明浅色或深色填充，透明度先从 65%-85% 试起。",
          "对底层背景做模糊，玻璃层本身保持边缘清楚。",
          "加 1px 细边框或内高光，让玻璃边缘和背景分开。",
          "文字使用高对比色，必要时加一层很轻的暗色遮罩保证可读性。",
        ],
        pitfalls: [
          "不要把正文直接放在花背景上，漂亮但读不清会被打回。",
          "模糊、透明、阴影不要同时拉满，否则会显脏。",
        ],
        nextStep: "先做一个只含标题和核心信息的毛玻璃信息块，缩到手机尺寸看可读性。",
      },
      {
        key: "metal",
        match: /金属/,
        judge: "金属感靠明暗带和反光关系，不是简单套银灰渐变。",
        steps: [
          "先确定光源方向，所有高光和暗部都按同一个方向走。",
          "用 3-5 个明暗色阶做线性或径向渐变，形成亮面、过渡和暗面。",
          "在边缘加细高光，在背光侧加窄暗边，让形体立起来。",
          "背景保持克制，避免和金属高光抢第一视觉。",
          "如果是标题字，字距略收紧，笔画细节不要被高光吃掉。",
        ],
        pitfalls: [
          "不要只用灰色，金属通常需要冷暖反光，否则会像脏灰。",
          "高光太多会廉价，留一到两个最亮点就够。",
        ],
        nextStep: "先用黑白灰做出金属明暗，再加少量冷暖色反光。",
      },
      {
        key: "glow",
        match: /发光|霓虹|氛围光/,
        judge: "发光效果适合暗背景或强氛围画面，用来强调焦点；亮底上硬加发光通常会脏。",
        steps: [
          "先压暗背景，让发光元素有对比空间。",
          "保留一个清楚的发光核心，核心要比外扩光更亮更实。",
          "外发光分两层：小半径高亮、大半径低透明度氛围光。",
          "发光颜色不要超过 1-2 个主色，避免像杂乱彩灯。",
          "文字旁边留出呼吸空间，不要让光晕盖住笔画。",
        ],
        pitfalls: [
          "不要把所有元素都发光，焦点会消失。",
          "光晕压住文字时，先降透明度或加暗底，不要继续加粗文字硬顶。",
        ],
        nextStep: "先只让主标题或主视觉发光，其他元素保持安静。",
      },
      {
        key: "grain",
        match: /颗粒|噪点/,
        judge: "颗粒适合增加质感和统一素材，不适合弥补层级混乱。",
        steps: [
          "先把版式、颜色和主信息整理清楚，再加颗粒。",
          "颗粒层放在最上方或素材组内，透明度从 5%-12% 试起。",
          "大面积背景用细颗粒，主体局部可以稍强，但不要盖住文字。",
          "如果多张素材风格不统一，可以用同一层颗粒和色罩收住它们。",
          "导出前检查压缩后颗粒是否变脏或产生摩尔纹。",
        ],
        pitfalls: [
          "颗粒不是越多越高级，过量会显旧、显脏、影响阅读。",
          "印刷物要先确认打样，细噪点可能印出来和屏幕不一样。",
        ],
        nextStep: "先复制一版，加 8% 左右细颗粒，对比文字可读性和整体统一感。",
      },
      {
        key: "shadow",
        match: /阴影|投影|光影/,
        judge: "阴影的作用是说明层级和空间，不是给每个元素都加装饰。",
        steps: [
          "先确定一个光源方向，比如左上来光，所有阴影都朝同一侧。",
          "主物体用一层接触阴影贴住地面或卡片，透明度低一点。",
          "悬浮元素再加一层更大、更软、更淡的投影，表现距离。",
          "阴影颜色不要纯黑，取背景或主色的深色版会更自然。",
          "最后关掉阴影看一眼，信息层级仍成立，再打开微调强度。",
        ],
        pitfalls: [
          "不要多个方向乱投影，会显得廉价且不真实。",
          "阴影过黑会让画面脏；高级感通常来自轻、软、克制。",
        ],
        nextStep: "先只给主视觉和最重要的信息卡加阴影，其他元素保持平面。",
      },
    ];
    return recipes.find((item) => item.match.test(text)) || {
      key: "premium",
      judge: "高级质感先来自秩序、素材质量和克制的细节，再考虑技法。",
      steps: [
        "先减少颜色：主色、辅助色、强调色控制在 3 类以内。",
        "统一光源和材质：阴影、渐变、颗粒都按同一套方向和强度处理。",
        "拉开层级：主标题最大最清楚，装饰和辅助信息不要抢焦点。",
        "增加一个低调细节：轻阴影、细颗粒、局部高光或材质纹理，选一个就够。",
        "用真实预览尺寸检查：小屏或远看时，信息是否仍然一眼清楚。",
      ],
      pitfalls: [
        "不要把高级感理解成变暗、变灰、加很多阴影。",
        "不要同时叠毛玻璃、发光、颗粒、渐变，初稿容易失控。",
      ],
      nextStep: "先做一版“减法质感稿”：少色、强层级、轻阴影，再决定是否加材质细节。",
    };
  }

  function buildVisualEffectContext(project, text, recipe) {
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${text}`;
    const context = [];
    if (/小红书|朋友圈|公众号|社媒|封面|头图|Banner/i.test(combined)) {
      context.push("线上/社媒图先保证小屏可读，效果不能盖住标题、利益点和 CTA。");
    }
    if (/印刷|包装|画册|折页/.test(combined)) {
      context.push("印刷物要注意颜色模式、图片精度和打样，发光、颗粒、细阴影印出来可能会变弱或变脏。");
    }
    if (/品牌|VI|logo|Logo/.test(combined)) {
      context.push("品牌项目要先遵守品牌色、字体和 Logo 规则，效果只做辅助，不要破坏识别感。");
    }
    if (project.dueDate && daysUntil(project.dueDate) <= 1) {
      context.push("时间很紧，优先用最稳的轻量效果，不要临交付前大面积改材质。");
    }
    if (recipe.key === "glass" || /可读性|读不清/.test(text)) {
      context.push("所有承载文字的效果层，都要先过可读性检查：缩小后仍能一眼读到主信息。");
    }
    return Array.from(new Set(context)).slice(0, 4);
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

  function summarizeVersionChanges(state, project, analysis) {
    const versions = project.versions || [];
    const feedbackItems = state.feedback.filter((item) => item.projectId === project.id);
    const latest = versions[versions.length - 1];
    const previous = versions[versions.length - 2];
    const lines = [`版本变化说明：${project.name}`];
    if (!versions.length) {
      lines.push("目前还没有版本记录。先记录类似“V2 改了标题层级和按钮颜色，老板确认了”，我就能帮你整理成修改说明。");
      lines.push("临时说明模板：这版主要围绕目标、信息层级、视觉风格和交付规格做调整；需要补充修改前后的具体变化。");
      return lines.join("\n");
    }
    lines.push(`版本范围：${previous ? `${previous.name} -> ${latest.name}` : latest.name}`);
    lines.push("核心修改：");
    buildVersionChangeBullets(project, versions, analysis.text).forEach((item) => lines.push(`- ${item}`));
    lines.push("修改依据：");
    buildVersionChangeReasons(project, feedbackItems).forEach((item) => lines.push(`- ${item}`));
    lines.push("发给老板/客户可以这样说：");
    lines.push(`- ${buildVersionChangeMessage(project, latest, feedbackItems)}`);
    lines.push("下一步确认：");
    buildVersionNextConfirmations(project, latest).forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    project.portfolio.process = appendSentence(project.portfolio.process, `版本变化说明：${analysis.text}`);
    return lines.join("\n");
  }

  function buildVersionChangeBullets(project, versions, text) {
    const selected = selectVersionsForSummary(versions, text);
    const bullets = selected.map((version) => `${version.name}：${version.changes}`);
    if (!bullets.length) bullets.push("当前版本变化还不够明确，需要补充本轮改动内容。");
    return bullets.slice(0, 5);
  }

  function selectVersionsForSummary(versions, text) {
    const matched = versions.filter((version) => text.includes(version.name));
    if (matched.length) return matched;
    return versions.slice(-3);
  }

  function buildVersionChangeReasons(project, feedbackItems) {
    const reasons = [];
    if (project.goal && !/待补充|待从/.test(project.goal)) {
      reasons.push(`围绕项目目标「${project.goal}」调整，避免只按个人审美改。`);
    }
    feedbackItems
      .slice(-3)
      .forEach((item) => reasons.push(`回应反馈：${item.from && !/待补充/.test(item.from) ? `${item.from} - ` : ""}${item.action}`));
    if (!reasons.length) reasons.push("依据当前 Brief 和提交前自检：优先保证主信息、风格方向和交付稳定。");
    return Array.from(new Set(reasons)).slice(0, 5);
  }

  function buildVersionChangeMessage(project, latest, feedbackItems) {
    const latestChange = latest ? latest.changes : "这一版做了信息层级、风格和交付细节调整";
    const feedback = feedbackItems.slice(-1)[0];
    const feedbackText = feedback ? `也回应了上一轮反馈：${feedback.action}` : "主要想先确认方向和信息层级是否成立";
    return `这版是 ${latest ? latest.name : "当前版本"}，主要调整了：${latestChange}。${feedbackText}。如果方向没问题，我会继续精修细节、适配交付尺寸并整理最终文件。`;
  }

  function buildVersionNextConfirmations(project, latest) {
    const confirmations = [
      "这版的信息层级是否比上一版更清楚？",
      "整体风格方向是否可以继续深入？",
      "还有哪些必须新增、删除或弱化的信息？",
    ];
    if ((project.risks || []).some((risk) => /尺寸|规格|交付格式/.test(risk))) confirmations.push("尺寸、平台和交付格式是否已经确认？");
    if (latest && latest.confirmedBy) confirmations.unshift(`是否按 ${latest.confirmedBy} 的确认继续推进？`);
    return confirmations.slice(0, 5);
  }

  function shouldCreateTask(analysis) {
    if (
      [
        "ask_plan",
        "ask_summary",
        "organize_meeting_notes",
        "decompose_brief",
        "plan_design_concepts",
        "plan_reference_research",
        "generate_image_prompt_brief",
        "ask_review",
        "ask_checklist",
        "ask_portfolio",
        "project_retrospective",
        "record_project_outcome",
        "generate_growth_profile",
        "ask_confirmation_message",
        "request_missing_assets",
        "clarify_vague_feedback",
        "align_stakeholder_feedback",
        "synthesize_feedback_batch",
        "handle_scope_change",
        "answer_design_question",
        "audit_asset_license",
        "ask_design_directions",
        "compare_design_options",
        "triage_overload",
        "negotiate_deadline_scope",
        "report_progress_status",
        "estimate_design_workload",
        "prepare_feedback_request",
        "refine_copywriting",
        "optimize_action_path",
        "organize_information_hierarchy",
        "optimize_readability",
        "simulate_design_defense",
        "prepare_design_presentation",
        "handle_negative_feedback",
        "diagnose_ambiguous_issue",
        "integrate_composite_assets",
        "fix_asset_quality",
        "guide_design_software_operation",
        "negotiate_reference_similarity",
        "analyze_reference",
        "unify_series_visual_system",
        "organize_delivery_files",
        "prepare_design_handoff",
        "guide_print_prepress",
        "recommend_platform_specs",
        "adapt_multi_format",
        "check_brand_consistency",
        "optimize_logo_exposure",
        "optimize_alignment_spacing",
        "balance_visual_density",
        "separate_subject_background",
        "strengthen_visual_impact",
        "improve_visual_polish",
        "guide_visual_effect",
        "recommend_layout_structure",
        "recommend_typography_system",
        "recommend_color_system",
        "translate_style_keyword",
        "solve_design_issue",
        "cancel_task",
        "complete_checklist",
        "snooze_task",
        "summarize_version_changes",
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

  function organizeMeetingNotes(state, project, analysis, now = new Date()) {
    if (analysis.deliverables && analysis.deliverables.length) {
      project.deliverables = Array.from(new Set((project.deliverables || []).concat(analysis.deliverables)));
    }
    if (analysis.dueDate) {
      project.dueDate = analysis.dueDate;
      applyDeadlineToOpenTasks(state, project, analysis.dueDate);
    }
    const notes = extractMeetingNotes(project, analysis.text);
    const dueDate = analysis.dueDate || project.dueDate || "";
    notes.actions.slice(0, 3).forEach((action) => {
      pushUniqueTask(state, {
        projectId: project.id,
        title: `会后执行：${action}`,
        priority: dueDate && daysUntil(dueDate, now) <= 1 ? "high" : "normal",
        dueDate,
        status: "todo",
        nextAction: "先按沟通纪要完成这一项，完成后记录版本变化或反馈处理结果。",
        feedbackIds: [],
      });
    });
    if (notes.confirmations.length) {
      project.status = "waiting";
      const risk = `会后待确认：${notes.confirmations[0]}`;
      if (!project.risks.includes(risk)) project.risks.push(risk);
      pushUniqueTask(state, {
        projectId: project.id,
        title: `会后确认：${notes.confirmations[0]}`,
        priority: dueDate && daysUntil(dueDate, now) <= 1 ? "high" : "normal",
        dueDate,
        status: "waiting",
        nextAction: "把待确认项发给负责人，拿到明确回复后再继续精修。",
        feedbackIds: [],
      });
    }
    project.portfolio.process = appendSentence(project.portfolio.process, `沟通纪要：${notes.summary}`);

    const lines = [`沟通纪要整理：${project.name}`];
    lines.push("已确认：");
    notes.decisions.forEach((item) => lines.push(`- ${item}`));
    lines.push("设计动作：");
    notes.actions.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("待确认：");
    notes.confirmations.forEach((item) => lines.push(`- ${item}`));
    lines.push("发给对方可以这样收口：");
    lines.push(buildMeetingConfirmationMessage(project, notes));
    lines.push(notes.confirmations.length ? "小画桌已把待确认项放进等待清单。" : "小画桌已把会后动作放进今日推进清单。");
    return lines.join("\n");
  }

  function extractMeetingNotes(project, text) {
    const sentences = splitMeetingSentences(text);
    const decisions = uniqueList(
      sentences.filter((item) => /确认|确定|决定|定了|先按|保持|采用|不需要|不用|优先/.test(item) && !/待确认|还没确认|需要确认|问一下|怎么确认/.test(item))
    );
    const confirmations = uniqueList(
      sentences.filter((item) => /待确认|还没确认|需要确认|问一下|不确定|没定|未定|谁拍板|确认一下|再确认/.test(item))
    );
    const actions = uniqueList(
      sentences.filter(
        (item) =>
          /要|需要|改|调整|补|做|出|导出|适配|检查|整理|发给|提交|加|删|弱化|突出/.test(item) &&
          !confirmations.includes(item) &&
          !/帮我整理|会议纪要|沟通纪要/.test(item)
      )
    );
    if (!decisions.length) {
      const goal = project.goal && !/待补充|待从/.test(project.goal) ? project.goal : "这次沟通的核心目标还需要补一句";
      decisions.push(`当前项目目标按「${goal}」继续推进。`);
    }
    if (!actions.length) {
      actions.push("先把会议信息转成一版执行清单：目标、主信息、交付物、截止时间。");
    }
    if (!confirmations.length) {
      const missing = currentProjectRisks(project);
      confirmations.push(missing.length ? missing[0] : "最终确认人和下一轮反馈时间。");
    }
    return {
      decisions: decisions.slice(0, 5),
      actions: actions.slice(0, 5),
      confirmations: confirmations.slice(0, 5),
      summary: sentences.slice(0, 3).join("；") || text,
    };
  }

  function splitMeetingSentences(text) {
    return String(text || "")
      .replace(/^(帮我|请帮我)?(整理|总结|记录)?(一下)?(会议纪要|沟通纪要)?[：:，,]?\s*/, "")
      .split(/[。；;\n]/)
      .map((item) => item.replace(/^(然后|另外|还有|以及|并且|今天|刚才|会上|会议里|群里|微信里)/, "").trim())
      .filter((item) => item.length >= 4);
  }

  function uniqueList(items) {
    return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
  }

  function pushUniqueTask(state, task) {
    const exists = state.tasks.some((item) => item.projectId === task.projectId && item.title === task.title && item.status === task.status);
    if (exists) return;
    state.tasks.push({
      id: uid("t"),
      ...task,
    });
  }

  function buildMeetingConfirmationMessage(project, notes) {
    const decisions = notes.decisions.slice(0, 2).join("；");
    const actions = notes.actions.slice(0, 2).join("；");
    const confirmations = notes.confirmations.slice(0, 3).join("；");
    return `我整理一下刚才沟通结果：已确认「${decisions}」。我接下来会先处理「${actions}」。还需要确认「${confirmations}」，确认后我再继续出下一版。`;
  }

  function generateProjectRetrospective(state, project, analysis, now = new Date()) {
    if (/结束|做完|完成|交付|定稿|过稿/.test(analysis.text)) {
      project.status = "done";
    }
    const feedbackItems = state.feedback.filter((item) => item.projectId === project.id);
    const projectTasks = state.tasks.filter((task) => task.projectId === project.id);
    const doneTasks = projectTasks.filter((task) => task.status === "done");
    const openTasks = projectTasks.filter((task) => task.status !== "done");
    const checklistItems = state.checklist.filter((item) => item.projectId === project.id);
    const doneChecklist = checklistItems.filter((item) => item.done);
    const risks = currentProjectRisks(project);
    const lines = [`项目复盘：${project.name}`];
    lines.push(`项目状态：${project.status === "done" ? "已完成" : "仍在推进"}；交付物：${(project.deliverables || []).length ? project.deliverables.join("、") : "未记录"}。`);
    lines.push("这次做得好的地方：");
    buildRetrospectiveWins(project, feedbackItems, doneTasks, doneChecklist).forEach((item) => lines.push(`- ${item}`));
    lines.push("这次暴露的问题：");
    buildRetrospectiveProblems(project, feedbackItems, openTasks, risks).forEach((item) => lines.push(`- ${item}`));
    lines.push("下次提前检查：");
    buildRetrospectiveChecklist(project, feedbackItems, risks).forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("能力标签：");
    lines.push(`- ${buildRetrospectiveSkillTags(project, feedbackItems).join("、")}`);
    lines.push("一句复盘结论：");
    const conclusion = buildRetrospectiveConclusion(project, feedbackItems, risks);
    lines.push(`- ${conclusion}`);
    project.portfolio.reflection = conclusion;
    project.portfolio.process = appendSentence(project.portfolio.process, `项目复盘：${analysis.text}`);
    project.portfolioScore = scorePortfolio({
      deliverables: project.deliverables,
      feedbackCount: feedbackItems.length,
      hasProcess: Boolean(project.portfolio.process),
    });
    return lines.join("\n");
  }

  function recordProjectOutcome(state, project, analysis, now = new Date()) {
    project.status = "done";
    state.tasks
      .filter((task) => task.projectId === project.id && task.status !== "done" && /交付|导出|源文件|定稿|反馈|确认|推进|设计/.test(task.title))
      .forEach((task) => {
        task.status = "done";
      });
    const outcome = extractProjectOutcomeSummary(analysis.text, project);
    project.portfolio.result = outcome.result;
    project.portfolio.reflection = project.portfolio.reflection && !/记录项目过程/.test(project.portfolio.reflection)
      ? project.portfolio.reflection
      : outcome.reflection;
    project.portfolio.process = appendSentence(project.portfolio.process, `项目收尾：${analysis.text}`);
    project.portfolioScore = scorePortfolio({
      deliverables: project.deliverables,
      feedbackCount: state.feedback.filter((item) => item.projectId === project.id).length,
      hasProcess: Boolean(project.portfolio.process),
    });
    pushUniqueTask(state, {
      projectId: project.id,
      title: "归档项目结果和交付证据",
      priority: "normal",
      dueDate: formatDate(now),
      status: "todo",
      nextAction: "保存最终图、上线截图、客户确认记录、源文件包和一句结果总结。",
      feedbackIds: [],
    });

    const lines = [`项目收尾记录：${project.name}`];
    lines.push(`最终状态：已完成。`);
    lines.push(`结果摘要：${outcome.result}`);
    lines.push("现在要补齐的证据：");
    buildOutcomeEvidenceList(project, analysis.text).forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("作品集可用表达：");
    lines.push(`- ${buildOutcomePortfolioLine(project, outcome)}`);
    lines.push("收尾检查：");
    buildOutcomeCloseoutChecks(project).forEach((item) => lines.push(`- ${item}`));
    lines.push("小画桌已把项目标记为已完成，并新增“归档项目结果和交付证据”任务。");
    return lines.join("\n");
  }

  function extractProjectOutcomeSummary(text, project) {
    const metrics = [];
    Array.from(text.matchAll(/(?:阅读量|曝光|点击|转化|报名|收藏|点赞|成交|浏览|到店)[^\d]{0,6}(\d+(?:\.\d+)?\s*(?:万|千|%|人|次)?)/g)).forEach((match) => {
      metrics.push(match[0]);
    });
    const confirmation = /客户|老板|主管|甲方/.test(text) && /确认|通过|定稿|满意|认可/.test(text) ? "客户/负责人已确认最终稿" : "";
    const published = /已上线|上线了|发布了|投放了|已投放/.test(text) ? "已上线/投放" : "";
    const delivered = /已交付|交付完成|发给|提交/.test(text) ? "交付完成" : "";
    const pieces = [published, delivered, confirmation].filter(Boolean);
    if (metrics.length) pieces.push(`结果数据：${metrics.slice(0, 3).join("、")}`);
    const result = pieces.length ? pieces.join("；") : "项目已完成，最终结果和交付证据待补充。";
    const reflection = buildOutcomeReflection(project, text, metrics);
    return { result, reflection, metrics };
  }

  function buildOutcomeReflection(project, text, metrics) {
    if (metrics.length) return "这次可以重点复盘：哪些信息和视觉策略带来了可见结果，并把数据作为作品集证据。";
    if ((project.versions || []).length || /改|反馈|确认/.test(text)) return "这次最值得沉淀的是：用反馈和版本迭代把设计推进到最终确认。";
    if ((project.deliverables || []).length >= 2) return "这次重点经验是：多物料项目要在收尾阶段统一命名、导出和归档证据。";
    return "这次项目已完成，后续要补最终图、确认记录和一句复盘，避免作品集只剩截图。";
  }

  function buildOutcomeEvidenceList(project, text) {
    const evidence = [
      "最终交付图：保留最终导出图和源文件，不要只留聊天截图。",
      "确认记录：保存客户/老板确认最终稿的聊天记录或邮件。",
      "过程证据：保留至少一张修改前后对比，说明为什么这样改。",
    ];
    if (/已上线|上线|发布|投放/.test(text)) evidence.unshift("上线证据：保存上线页面/投放位置截图，记录日期和平台。");
    if (/阅读量|曝光|点击|转化|报名|收藏|点赞|成交/.test(text)) evidence.unshift("数据证据：记录阅读、曝光、点击、报名、转化等数据来源和日期。");
    if ((project.deliverables || []).length >= 2) evidence.push("多物料证据：把不同尺寸/平台的最终图放在同一组，展示延展能力。");
    return Array.from(new Set(evidence)).slice(0, 6);
  }

  function buildOutcomePortfolioLine(project, outcome) {
    const target = project.goal && !/待补充|待从/.test(project.goal) ? `围绕「${project.goal}」` : "围绕项目传播目标";
    const deliverables = (project.deliverables || []).length ? `完成 ${project.deliverables.join("、")}` : "完成最终视觉交付";
    return `${target}，我${deliverables}，经过反馈和交付检查后完成上线/交付；最终结果为：${outcome.result}。`;
  }

  function buildOutcomeCloseoutChecks(project) {
    const checks = [
      "源文件、导出图、参考素材和授权说明分开放好。",
      "文件名补上项目名、物料、尺寸、版本和日期。",
      "把最终图、修改过程、确认记录放进项目归档。",
      "写一句复盘：这次解决了什么、下次要提前确认什么。",
    ];
    if (/印刷|包装|画册|折页/.test(`${project.type} ${(project.deliverables || []).join("、")}`)) {
      checks.unshift("印刷项目保留可编辑版、转曲版、印刷 PDF 和打样/印厂确认记录。");
    }
    return checks.slice(0, 6);
  }

  function buildRetrospectiveWins(project, feedbackItems, doneTasks, doneChecklist) {
    const wins = [];
    if ((project.deliverables || []).length) wins.push(`交付范围有记录，包含 ${(project.deliverables || []).join("、")}，后续归档时不容易漏。`);
    if (feedbackItems.length) wins.push(`保留了 ${feedbackItems.length} 条反馈记录，可以说明修改依据，而不只是说“改好看了”。`);
    if ((project.versions || []).length) wins.push(`记录了 ${project.versions.length} 个版本变化，适合做修改前后对比。`);
    if (doneTasks.length) wins.push(`完成了 ${doneTasks.length} 个任务，说明过程不是散乱推进。`);
    if (doneChecklist.length) wins.push(`完成了 ${doneChecklist.length} 个交付检查项，交付意识在变强。`);
    return wins.length ? wins.slice(0, 5) : ["至少把项目过程留了下来；下一步要补目标、反馈和交付检查，让复盘更有证据。"];
  }

  function buildRetrospectiveProblems(project, feedbackItems, openTasks, risks) {
    const problems = [];
    if (risks.length) problems.push(`还有未解决信息：${risks.slice(0, 3).join("、")}。`);
    if (openTasks.length) problems.push(`还有 ${openTasks.length} 个未完成/待确认事项，说明收尾前需要更早检查任务清单。`);
    if (feedbackItems.some((item) => item.conflict && !item.handled)) problems.push("出现过调性冲突反馈，下次要先确认优先级再动大稿。");
    if (!project.goal || /待补充|待从/.test(project.goal)) problems.push("项目目标记录不够清楚，导致后续设计判断容易靠感觉。");
    if (!(project.specs || []).length) problems.push("尺寸规格没有沉淀，下次容易在导出或适配时返工。");
    if (!(project.formats || []).length) problems.push("交付格式没有沉淀，源文件/导出文件整理会变被动。");
    return problems.length ? problems.slice(0, 5) : ["这次主要问题不明显；可以继续补充上线结果、数据反馈或老板/客户最终评价。"];
  }

  function buildRetrospectiveChecklist(project, feedbackItems, risks) {
    const checks = [
      "开工前先写一句目标：给谁看、在哪里看、希望对方做什么。",
      "第一版前确认尺寸、平台、安全区、交付格式和最终确认人。",
      "收到反馈后先分成目标问题、层级问题、风格偏好和交付限制。",
      "每次改稿都保留修改前后对比，并写一句为什么这样改。",
      "交付前检查命名、导出、源文件、字体/图片授权和移动端可读性。",
    ];
    if (feedbackItems.some((item) => item.conflict)) checks.unshift("遇到“高级但活泼”“都要突出”这类冲突反馈，先问优先级。");
    if (risks.some((risk) => /尺寸|规格/.test(risk))) checks.unshift("不要在尺寸未知时精修版式，先拿到规格再做细节。");
    if (/印刷|包装|画册|折页/.test(`${project.type} ${(project.deliverables || []).join("、")}`)) {
      checks.push("印刷项目前置检查出血、CMYK、图片精度、转曲和打样。");
    }
    return Array.from(new Set(checks)).slice(0, 6);
  }

  function buildRetrospectiveSkillTags(project, feedbackItems) {
    const source = `${project.type} ${(project.deliverables || []).join("、")} ${project.portfolio.process || ""}`;
    const tags = [];
    if (/品牌|VI|logo|Logo|规范/.test(source)) tags.push("品牌一致性");
    if (/海报|封面|Banner|banner|社媒|小红书|朋友圈|公众号/.test(source)) tags.push("社媒视觉");
    if (/包装|印刷|画册|折页|出血|CMYK|转曲/.test(source)) tags.push("印刷交付");
    if (/信息层级|版式|排版|构图/.test(source)) tags.push("信息层级与版式");
    if (/配色|颜色|色彩/.test(source)) tags.push("色彩控制");
    if (/字体|字号|字重|文案/.test(source)) tags.push("字体与文案");
    if (feedbackItems.length) tags.push("反馈转译");
    if ((project.deliverables || []).length >= 2) tags.push("多物料适配");
    return tags.length ? Array.from(new Set(tags)).slice(0, 6) : ["需求整理", "执行交付", "过程记录"];
  }

  function buildRetrospectiveConclusion(project, feedbackItems, risks) {
    if (feedbackItems.length && (project.versions || []).length) {
      return "这次最值得沉淀的是：把反馈转成具体修改动作，并用版本变化证明设计判断。";
    }
    if (risks.length) {
      return "这次提醒你：开工前的信息确认会直接决定后面返工多少，尤其是目标、尺寸和交付格式。";
    }
    if ((project.deliverables || []).length >= 2) {
      return "这次重点经验是：多物料项目要先定母版和规则，再做延展，不能每张从零开始。";
    }
    return "这次可以沉淀为一个执行型项目：把需求、反馈、版本和交付检查记录完整，下次会更稳。";
  }

  function generateGrowthProfile(state, analysis, now = new Date()) {
    const projects = state.projects || [];
    const feedbackItems = state.feedback || [];
    const tasks = state.tasks || [];
    const tags = buildGrowthSkillTags(projects, feedbackItems);
    const gaps = buildGrowthGaps(projects, feedbackItems, tasks);
    const portfolioGaps = buildPortfolioGaps(projects, feedbackItems);
    const lines = ["能力成长档案"];
    lines.push(`已记录项目：${projects.length} 个；反馈：${feedbackItems.length} 条；完成任务：${tasks.filter((task) => task.status === "done").length} 个。`);
    lines.push("当前强项：");
    buildGrowthStrengths(projects, feedbackItems, tags).forEach((item) => lines.push(`- ${item}`));
    lines.push("优先补的短板：");
    gaps.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("下一步练习：");
    buildGrowthExercises(gaps, projects, now).forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("作品集还缺：");
    portfolioGaps.forEach((item) => lines.push(`- ${item}`));
    lines.push("能力标签：");
    lines.push(`- ${tags.length ? tags.join("、") : "需求整理、执行交付、过程记录"}`);
    lines.push("建议：接下来每个项目都至少记录 1 条反馈、1 次版本变化、1 次交付检查和 1 句复盘结论，作品集会自然长出来。");
    return lines.join("\n");
  }

  function buildGrowthSkillTags(projects, feedbackItems) {
    const text = projects
      .map((project) => `${project.type} ${(project.deliverables || []).join("、")} ${project.portfolio && project.portfolio.process ? project.portfolio.process : ""}`)
      .join(" ");
    const tags = [];
    if (/海报|社媒|小红书|朋友圈|公众号|Banner|banner|封面/.test(text)) tags.push("社媒与海报设计");
    if (/品牌|VI|vi|logo|Logo|规范/.test(text)) tags.push("品牌一致性");
    if (/包装|印刷|画册|折页|出血|CMYK|转曲/.test(text)) tags.push("印刷交付");
    if (/信息层级|版式|排版|构图|主次/.test(text)) tags.push("信息层级与版式");
    if (/配色|颜色|色彩/.test(text)) tags.push("色彩控制");
    if (/字体|字号|字重|文案|标题/.test(text)) tags.push("字体与文案");
    if (/适配|多尺寸|系列|套图/.test(text)) tags.push("多物料适配");
    if (feedbackItems.length) tags.push("反馈转译");
    if (projects.some((project) => project.portfolioScore >= 80)) tags.push("案例沉淀");
    return Array.from(new Set(tags)).slice(0, 8);
  }

  function buildGrowthStrengths(projects, feedbackItems, tags) {
    const strengths = [];
    if (tags.length) strengths.push(`已经有可见能力标签：${tags.slice(0, 4).join("、")}。`);
    const processProjects = projects.filter((project) => project.portfolio && project.portfolio.process);
    if (processProjects.length) strengths.push(`${processProjects.length} 个项目有过程记录，说明不是只存最终图。`);
    if (feedbackItems.length) strengths.push(`记录过 ${feedbackItems.length} 条反馈，适合训练“把模糊意见转成设计动作”。`);
    const multiDeliverable = projects.filter((project) => (project.deliverables || []).length >= 2);
    if (multiDeliverable.length) strengths.push(`${multiDeliverable.length} 个项目涉及多物料，适合沉淀适配和系列统一能力。`);
    return strengths.length ? strengths.slice(0, 5) : ["目前记录还少，先从一个真实项目补齐 Brief、反馈、版本和交付检查。"];
  }

  function buildGrowthGaps(projects, feedbackItems, tasks) {
    const gaps = [];
    if (projects.some((project) => !project.goal || /待补充|待从/.test(project.goal))) gaps.push("Brief 目标记录不稳定：每个项目都要写清“给谁看、在哪里看、看完做什么”。");
    if (projects.some((project) => !(project.deliverables || []).length)) gaps.push("交付范围记录不足：缺交付物会让工作流和作品集都变虚。");
    if (!feedbackItems.length) gaps.push("反馈沉淀不足：缺少修改依据，作品集会像纯执行截图。");
    if (!projects.some((project) => (project.versions || []).length)) gaps.push("版本记录不足：需要记录 V1/V2 改了什么和为什么改。");
    if (!tasks.some((task) => task.status === "done")) gaps.push("完成闭环记录不足：完成、等待、交付检查要及时标记。");
    if (!projects.some((project) => project.portfolio && project.portfolio.reflection && !/记录项目过程/.test(project.portfolio.reflection))) gaps.push("复盘还不够具体：每个项目结束后写一句下次注意什么。");
    return gaps.length ? gaps.slice(0, 5) : ["当前基础记录比较完整，下一步重点提升案例表达和结果证明。"];
  }

  function buildGrowthExercises(gaps, projects, now) {
    const exercises = [];
    if (gaps.some((gap) => /Brief/.test(gap))) exercises.push("选一个当前项目，用 5 分钟补齐目标、受众、场景、交付物和截止时间。");
    if (gaps.some((gap) => /反馈/.test(gap))) exercises.push("下一次收到反馈时，记录原话、反馈人、可执行修改点和处理状态。");
    if (gaps.some((gap) => /版本/.test(gap))) exercises.push("下一版提交前写一句：V2 相比 V1 改了什么、为什么改、谁确认。");
    if (gaps.some((gap) => /闭环|交付/.test(gap))) exercises.push("今天下班前把已完成任务、等待确认和交付检查各标一遍。");
    if (gaps.some((gap) => /复盘/.test(gap))) exercises.push("完成一个项目后写 3 行复盘：做得好、踩的坑、下次检查点。");
    if (!exercises.length) exercises.push(`本周挑 1 个最高分项目，整理成作品集案例草稿；今天是 ${formatDate(now)}，先补关键过程和结果。`);
    return exercises.slice(0, 5);
  }

  function buildPortfolioGaps(projects, feedbackItems) {
    const gaps = [];
    if (!projects.some((project) => project.portfolioScore >= 80)) gaps.push("还缺一个强案例：最好有明确目标、反馈迭代、修改前后和最终结果。");
    if (!feedbackItems.length) gaps.push("还缺反馈证据：作品集里需要说明为什么改，而不是只展示最终图。");
    if (!projects.some((project) => project.portfolio && project.portfolio.result)) gaps.push("还缺结果记录：上线位置、客户确认、数据或交付结果都可以。");
    if (!projects.some((project) => (project.versions || []).length >= 2)) gaps.push("还缺版本对比：V1/V2 前后变化会让案例更有说服力。");
    if (!projects.some((project) => project.portfolio && project.portfolio.reflection && !/记录项目过程/.test(project.portfolio.reflection))) gaps.push("还缺个人反思：写清这次学到了什么，下次如何避免返工。");
    return gaps.length ? gaps.slice(0, 5) : ["作品集基础材料比较完整，可以开始整理案例页结构和面试讲述。"];
  }

  function prepareFeedbackRequest(state, project, analysis, now = new Date()) {
    project.status = "waiting";
    const recipient = guessFeedbackRecipient(analysis.text);
    const waitingTitle = `等待${recipient}反馈：${project.name}`;
    const exists = state.tasks.some((task) => task.projectId === project.id && task.status === "waiting" && task.title === waitingTitle);
    if (!exists) {
      state.tasks.push({
        id: uid("t"),
        projectId: project.id,
        title: waitingTitle,
        priority: project.dueDate && daysUntil(project.dueDate, now) <= 1 ? "high" : "normal",
        dueDate: project.dueDate || "",
        status: "waiting",
        nextAction: "等待反馈；如果超过约定时间未回复，再发确认/跟进话术。",
        feedbackIds: [],
      });
    }
    const lines = [`发稿收反馈：${project.name}`];
    lines.push(`对象：${recipient}。目标不是“求评价”，而是让对方按你需要的维度反馈。`);
    lines.push("发送前先检查：");
    buildPreviewSendChecklist(project).forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("消息结构：");
    buildPreviewMessageStructure(project).forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("可以这样发：");
    lines.push(buildPreviewMessage(project, recipient));
    lines.push("请对方重点反馈：");
    buildFeedbackFocusQuestions(project).forEach((item) => lines.push(`- ${item}`));
    lines.push("小画桌已把项目切到待反馈，并加入等待反馈任务。");
    project.portfolio.process = appendSentence(project.portfolio.process, `发稿收反馈准备：${analysis.text}`);
    return lines.join("\n");
  }

  function guessFeedbackRecipient(text) {
    if (/客户|甲方/.test(text)) return "客户";
    if (/老板|领导/.test(text)) return "老板";
    if (/主管/.test(text)) return "主管";
    if (/运营/.test(text)) return "运营同事";
    if (/产品/.test(text)) return "产品同事";
    if (/同事/.test(text)) return "同事";
    return "对方";
  }

  function buildPreviewSendChecklist(project) {
    const checks = [
      "导出一张低风险预览图，不要直接发源文件或未整理截图。",
      "确认主标题、核心利益点和 CTA 在真实预览尺寸里清楚。",
      "如果有多个方案，给每个方案标 A/B/C，不要让对方自己猜区别。",
      "附一句本轮最想确认的内容，避免收到“还行/再看看”这种无效反馈。",
    ];
    if ((project.deliverables || []).length) checks.push(`说明本轮预览覆盖哪些交付物：${project.deliverables.slice(0, 4).join("、")}。`);
    if ((project.risks || []).some((risk) => /尺寸|规格|交付格式/.test(risk))) checks.unshift("如果尺寸/格式还没确认，必须说明这是方向预览，不是最终交付。");
    if (project.dueDate) checks.push(`提醒关键时间：当前截止是 ${project.dueDate}，请对方尽量在影响排期前反馈。`);
    return Array.from(new Set(checks)).slice(0, 6);
  }

  function buildPreviewMessageStructure(project) {
    const structure = [
      "先说进度：这是首版/方向预览/修改版，不要让对方误以为已经定稿。",
      "再说设计目标：这版主要解决什么问题。",
      "然后说本轮改动或看点：层级、风格、配色、主视觉或适配。",
      "最后列反馈问题：只问 2-3 个关键问题，别让对方泛泛评价。",
    ];
    if ((project.versions || []).length) structure.splice(2, 0, `提到版本：当前可按 ${project.versions[project.versions.length - 1].name} 说明修改点。`);
    return structure;
  }

  function buildPreviewMessage(project, recipient) {
    const goal = project.goal && !/待补充|待从/.test(project.goal) ? project.goal : "确认方向和信息层级";
    const deliverables = (project.deliverables || []).length ? `，这次预览包含 ${project.deliverables.slice(0, 3).join("、")}` : "";
    const riskNote = currentProjectRisks(project).some((risk) => /尺寸|规格|交付格式/.test(risk))
      ? "尺寸/格式我还在等确认，所以这版先看方向和信息层级。"
      : "如果方向没问题，我再继续细化细节和交付文件。";
    return `${recipient}好，我先发「${project.name}」这一版给你看一下${deliverables}。这版主要想确认：${goal}。${riskNote} 想请你重点看 1）主信息是否一眼清楚；2）整体调性是否符合预期；3）有没有必须新增或删除的信息。`;
  }

  function buildFeedbackFocusQuestions(project) {
    const questions = [
      "主信息是否是你希望用户第一眼看到的内容？",
      "整体风格方向是否可以继续深入？如果不对，更希望偏哪一类？",
      "有哪些信息必须保留，哪些可以删减或弱化？",
    ];
    if ((project.deliverables || []).length >= 2) questions.push("多张物料之间是否需要同一套视觉规则，还是允许局部区分？");
    if ((project.risks || []).some((risk) => /尺寸|规格|交付格式/.test(risk))) questions.push("尺寸、平台、安全区和最终格式是否可以确认？");
    if (project.dueDate) questions.push("这轮反馈最晚什么时候给，才不会影响最终交付？");
    return questions.slice(0, 5);
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

  function generateTriagePlan(state, project, analysis, now = new Date()) {
    const dashboard = getDashboard(state, now);
    const projectTasks = state.tasks
      .filter((task) => task.projectId === project.id && task.status !== "done")
      .sort((a, b) => {
        const pa = a.status === "waiting" ? 2 : a.priority === "high" ? 0 : 1;
        const pb = b.status === "waiting" ? 2 : b.priority === "high" ? 0 : 1;
        return pa - pb || String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999"));
      });
    const actionableTasks = projectTasks.filter((task) => !/先写下这个项目要做什么/.test(task.title));
    const taskPool = actionableTasks.length ? actionableTasks : projectTasks;
    const firstTask = taskPool.find((task) => task.status !== "waiting") || dashboard.today[0];
    const waiting = projectTasks.find((task) => task.status === "waiting") || dashboard.waiting[0];
    const risks = currentProjectRisks(project);
    const due = project.dueDate || (firstTask && firstTask.dueDate) || "";
    const urgent = /来不及|赶不完|马上|今天|下班前|催/.test(analysis.text) || (due && daysUntil(due, now) <= 1);
    const lines = [`紧急推进方案：${project.name}`];
    lines.push("先稳住，我们不把所有事同时做。现在只切成 4 块：保交付、保可读、保确认、砍细节。");
    lines.push(firstTask ? `1. 先做这一件：${firstTask.title}。动作：${firstTask.nextAction}` : "1. 先做这一件：补齐项目小纸条里的目标、截止时间和交付物。");
    lines.push(`2. 交付底线：${buildDeliveryBottomLine(project, urgent)}`);
    lines.push(waiting ? `3. 立刻确认：${waiting.title}。如果 30 分钟内没回复，先按最稳方案推进，并留下确认记录。` : "3. 需要确认：如果尺寸、格式、目标不清，先发一条确认话术，不要边猜边精修。");
    lines.push(risks.length ? `4. 暂时别碰：会放大返工的部分，尤其是 ${risks.slice(0, 2).join("、")}。` : "4. 暂时别碰：复杂装饰、第二套风格、非必要动效和过细文案。");
    lines.push("时间盒：先用 25 分钟完成可读版，再用 25 分钟补视觉重点，最后 10 分钟检查尺寸、命名和导出。");
    if (urgent) lines.push("今天的标准不是做到完美，而是先交一版清楚、可解释、能继续反馈的稿。");
    project.portfolio.process = appendSentence(project.portfolio.process, `紧急推进：${analysis.text}`);
    return lines.join("\n");
  }

  function negotiateDeadlineScope(state, project, analysis, now = new Date()) {
    project.status = "waiting";
    if (!project.risks.includes("时间不足，需要确认交付范围和截止时间")) {
      project.risks.push("时间不足，需要确认交付范围和截止时间");
    }
    const recipient = guessNegotiationRecipient(analysis.text);
    const tradeoff = buildDeadlineTradeoff(project, analysis, now);
    pushUniqueTask(state, {
      projectId: project.id,
      title: `沟通延期/降范围：${recipient}`,
      priority: "high",
      dueDate: formatDate(now),
      status: "waiting",
      nextAction: "先同步风险和可交付方案，让负责人选择延期、降范围或分批交付。",
      feedbackIds: [],
    });
    project.portfolio.process = appendSentence(project.portfolio.process, `时间/范围沟通：${analysis.text}`);

    const lines = [`延期/范围沟通：${project.name}`];
    lines.push("先不要只说“我来不及”。要把问题说成“时间、范围、质量三者需要取舍”。");
    lines.push("我建议这样拆：");
    lines.push(`- 必须守住：${tradeoff.mustKeep.join("、")}`);
    lines.push(`- 可以后置：${tradeoff.canDefer.join("、")}`);
    lines.push(`- 需要对方选择：${tradeoff.needDecision.join("、")}`);
    lines.push("可以直接这样说：");
    lines.push(buildDeadlineNegotiationMessage(project, recipient, tradeoff));
    lines.push("如果对方不同意延期：");
    buildDeadlineFallbacks(project, tradeoff).forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("小画桌已把项目切到待确认，并新增“沟通延期/降范围”任务。");
    return lines.join("\n");
  }

  function guessNegotiationRecipient(text) {
    if (/客户|甲方/.test(text)) return "客户/甲方";
    if (/老板|领导|主管/.test(text)) return "老板/主管";
    if (/运营/.test(text)) return "运营同事";
    if (/产品/.test(text)) return "产品同事";
    return "负责人";
  }

  function buildDeadlineTradeoff(project, analysis, now) {
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${analysis.text}`;
    const mustKeep = ["主信息清楚可读", "尺寸和导出格式正确", "最终交付物不缺项"];
    const canDefer = ["复杂动效/材质细节", "非核心装饰元素", "第三套以上的备选方向"];
    const needDecision = ["是否允许先交可用版，再补精修版", "是否减少交付物或先交主尺寸", "是否调整截止时间"];
    if (/印刷|包装|画册|折页/.test(combined)) {
      mustKeep.push("出血、CMYK、图片精度和转曲检查");
      canDefer.push("非必要工艺效果模拟");
    }
    if (/多尺寸|小红书|朋友圈|公众号|Banner|banner|多平台/.test(combined) || (project.deliverables || []).length >= 2) {
      needDecision.unshift("多平台是否分批交付：先主渠道，后适配渠道");
      canDefer.unshift("次要平台尺寸适配");
    }
    if (project.dueDate) {
      const days = daysUntil(project.dueDate, now);
      if (days <= 0) needDecision.unshift("今天是否只验收信息和方向，细节另约时间");
      if (days === 1) needDecision.unshift("明天交付是否接受先交首版/主版");
    }
    return {
      mustKeep: Array.from(new Set(mustKeep)).slice(0, 5),
      canDefer: Array.from(new Set(canDefer)).slice(0, 5),
      needDecision: Array.from(new Set(needDecision)).slice(0, 5),
    };
  }

  function buildDeadlineNegotiationMessage(project, recipient, tradeoff) {
    const deliverables = (project.deliverables || []).length ? `目前交付物包含 ${project.deliverables.join("、")}` : "目前交付范围还需要再确认";
    const deadline = project.dueDate ? `，截止时间是 ${project.dueDate}` : "";
    return `${recipient}好，我同步一下当前风险：${deliverables}${deadline}。如果保持现在的范围和时间，精修质量会受影响。为了先保证「${tradeoff.mustKeep.slice(0, 2).join("、")}」，我建议二选一：A 先交主尺寸/可用版，其他适配和细节后补；B 截止时间延后，我把完整精修和交付检查一次性补齐。你看这版更适合按哪种方式推进？`;
  }

  function buildDeadlineFallbacks(project, tradeoff) {
    const fallbacks = [
      `先交最低可用版：只保留 ${tradeoff.mustKeep.slice(0, 3).join("、")}。`,
      `砍细节：${tradeoff.canDefer.slice(0, 3).join("、")} 暂时后置，不影响核心交付。`,
      "分批交付：先交主平台/主尺寸，次要尺寸在方向确认后补。",
      "保留证据：把这次取舍记录到项目过程里，后续复盘说明时间限制和交付策略。",
    ];
    if ((project.risks || []).some((risk) => /缺少/.test(risk))) fallbacks.unshift(`先确认缺失信息：${currentProjectRisks(project).slice(0, 2).join("、")}。`);
    return fallbacks.slice(0, 5);
  }

  function reportProgressStatus(state, project, analysis, now = new Date()) {
    const recipient = guessProgressRecipient(analysis.text);
    const progress = buildProgressSnapshot(state, project, now);
    project.portfolio.process = appendSentence(project.portfolio.process, `进度汇报：${analysis.text}`);
    const lines = [`进度汇报话术：${project.name}`];
    lines.push("先按“已完成 -> 正在做 -> 卡点 -> 下一步时间”说，不要只回复“在做了”。");
    lines.push("当前状态：");
    lines.push(`- 已完成：${progress.done}`);
    lines.push(`- 正在推进：${progress.doing}`);
    lines.push(`- 等待/卡点：${progress.blockers}`);
    lines.push(`- 下一步：${progress.next}`);
    lines.push("可以直接这样回：");
    lines.push(buildProgressStatusMessage(project, recipient, progress));
    lines.push("如果对方继续催：");
    buildProgressFollowups(project, progress).forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("小画桌已把这次进度同步写进项目过程，后续可用于日报/复盘。");
    return lines.join("\n");
  }

  function guessProgressRecipient(text) {
    if (/客户|甲方/.test(text)) return "客户/甲方";
    if (/老板|领导|主管/.test(text)) return "老板/主管";
    if (/运营/.test(text)) return "运营同事";
    if (/产品/.test(text)) return "产品同事";
    return "负责人";
  }

  function buildProgressSnapshot(state, project, now) {
    const tasks = state.tasks.filter((task) => task.projectId === project.id);
    const doneTasks = tasks.filter((task) => task.status === "done");
    const waitingTasks = tasks.filter((task) => task.status === "waiting");
    const openTasks = tasks.filter((task) => task.status !== "done" && task.status !== "waiting");
    const urgent = openTasks.find((task) => task.priority === "high") || openTasks[0];
    const risks = currentProjectRisks(project);
    const due = project.dueDate || (urgent && urgent.dueDate) || "";
    return {
      done: doneTasks.length ? doneTasks.slice(-2).map((task) => task.title).join("；") : buildProgressFallbackDone(project),
      doing: urgent ? `${urgent.title}（${urgent.nextAction || "继续推进当前稿"}）` : "当前没有未完成待办，建议检查交付包和最终确认记录",
      blockers: waitingTasks.length ? waitingTasks.slice(0, 2).map((task) => task.title).join("；") : risks.length ? risks.slice(0, 2).join("；") : "暂无明显卡点",
      next: buildProgressNextStep(project, urgent, due, now),
      due,
      waitingCount: waitingTasks.length,
      riskCount: risks.length,
    };
  }

  function buildProgressFallbackDone(project) {
    const facts = [];
    if ((project.deliverables || []).length) facts.push(`已明确交付物：${project.deliverables.join("、")}`);
    if (project.goal && !/待补充|待从/.test(project.goal)) facts.push(`已明确目标：${project.goal}`);
    if ((project.versions || []).length) facts.push(`已记录版本：${project.versions[project.versions.length - 1].name}`);
    return facts.length ? facts.slice(0, 2).join("；") : "已开始整理需求和当前项目小纸条";
  }

  function buildProgressNextStep(project, urgent, due, now) {
    if (urgent) {
      const deadline = due ? `，预计按 ${due} 前推进` : "";
      return `${urgent.nextAction || urgent.title}${deadline}`;
    }
    if (project.status === "done") return "准备归档最终结果和作品集材料";
    if (due && daysUntil(due, now) <= 1) return "先做交付前检查和低风险预览";
    return "继续补齐确认信息，并推进下一版设计";
  }

  function buildProgressStatusMessage(project, recipient, progress) {
    const due = progress.due ? `目前计划节点是 ${progress.due}。` : "";
    const blocker = progress.blockers === "暂无明显卡点" ? "" : `当前需要留意/确认的是：${progress.blockers}。`;
    return `${recipient}好，我同步一下「${project.name}」进度：已完成 ${progress.done}；现在正在处理 ${progress.doing}。${blocker}${due}下一步我会先推进 ${progress.next}，有新的确认点我会及时同步。`;
  }

  function buildProgressFollowups(project, progress) {
    const followups = [];
    if (progress.waitingCount || progress.riskCount) {
      followups.push("把卡点单独列出来，请对方确认后再承诺最终时间。");
    }
    followups.push("如果只需要先看方向，可以先发低清预览/首版，不要直接发未整理源文件。");
    followups.push("如果对方要精确时间，用“可反馈稿时间”和“定稿时间”分开说。");
    if ((project.deliverables || []).length >= 2) followups.push("多物料项目先同步主尺寸进度，再说明其他尺寸会在方向确认后适配。");
    return followups.slice(0, 5);
  }

  function estimateDesignWorkload(state, project, analysis, now = new Date()) {
    const estimate = buildWorkloadEstimate(project, analysis.text, now);
    const lines = [`工作量预估：${project.name}`];
    lines.push(`粗估：${estimate.summary}`);
    lines.push("拆分：");
    estimate.steps.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push(`建议缓冲：${estimate.buffer}`);
    const blockers = buildEstimateBlockers(project);
    if (blockers.length) {
      lines.push("估时前必须确认：");
      blockers.forEach((item) => lines.push(`- ${item}`));
    }
    lines.push("可以这样对外说：");
    lines.push(`- ${estimate.talk}`);
    const dashboard = getDashboard(state, now);
    const currentToday = dashboard.today.filter((task) => task.projectId === project.id && task.status !== "done");
    if (currentToday.length) {
      lines.push(`当前今天还在排队的事项：${currentToday.slice(0, 3).map((task) => task.title).join("；")}`);
    }
    lines.push("提醒：估时不是承诺完美成稿，而是承诺一个可反馈的版本；复杂风格、反复改稿和多尺寸适配都要加缓冲。");
    project.portfolio.process = appendSentence(project.portfolio.process, `工作量预估：${analysis.text}`);
    return lines.join("\n");
  }

  function buildWorkloadEstimate(project, text, now) {
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${text}`;
    const deliverableCount = Math.max(1, (project.deliverables || []).length);
    const isPrint = /印刷|包装|画册|折页/.test(combined);
    const isSocial = /小红书|朋友圈|公众号|社媒|封面|头图|Banner/i.test(combined);
    const isPpt = /PPT|ppt|提案|幻灯片/.test(combined);
    const urgent = project.dueDate && daysUntil(project.dueDate, now) <= 1;
    let baseHours = 2.5;
    if (isSocial) baseHours = 2;
    if (isPrint) baseHours = 4;
    if (isPpt) baseHours = 5;
    baseHours += Math.max(0, deliverableCount - 1) * (isPrint ? 1.5 : 0.75);
    if (/首版|第一版|出一版/.test(text)) baseHours *= 0.75;
    if (/精修|定稿|完整|最终/.test(text)) baseHours *= 1.35;
    const min = Math.max(1, Math.round(baseHours * 0.8));
    const max = Math.max(min + 1, Math.round(baseHours * 1.3));
    const steps = [
      "补齐 brief 和规格：15-30 分钟，确认目标、受众、尺寸、交付格式。",
      `搭首版结构：${isPrint ? "1.5-2.5 小时" : "45-90 分钟"}，先完成信息层级和主视觉位置。`,
      `视觉细化：${isPpt ? "2-3 小时" : isPrint ? "2-4 小时" : "1-2 小时"}，处理字体、颜色、素材和风格细节。`,
      `交付检查：${isPrint ? "45-90 分钟，检查出血、CMYK、转曲和 PDF" : "20-40 分钟，检查尺寸、导出、命名和小屏可读性"}`,
    ];
    if (deliverableCount > 1) steps.splice(3, 0, `多尺寸适配：约 ${Math.ceil((deliverableCount - 1) * 0.75)} 小时，不要直接拉伸母版。`);
    return {
      summary: urgent ? `先用 ${min}-${max} 小时做一版可反馈稿，精修和多轮反馈另算。` : `首版大约 ${min}-${max} 小时；如果要定稿，建议预留半天到一天缓冲。`,
      steps,
      buffer: isPrint ? "印刷/包装至少加 30%-50% 缓冲，留给打样、印厂要求和文件修正。" : "普通线上图至少加 30% 缓冲，留给反馈、改字和导出适配。",
      talk: urgent
        ? `我可以先在 ${min}-${max} 小时内出一版可反馈稿，先确认方向和信息层级；定稿需要等反馈和规格确认后再估。`
        : `如果需求和尺寸今天能确认，我预计 ${min}-${max} 小时出首版；如果需要多尺寸/精修/反复反馈，需要额外预留缓冲。`,
    };
  }

  function buildEstimateBlockers(project) {
    const blockers = [];
    if (!project.goal || /待补充/.test(project.goal)) blockers.push("项目目标不清，容易导致首版方向返工。");
    if (!(project.deliverables || []).length) blockers.push("交付物数量不清，无法准确估多尺寸和导出时间。");
    if (!project.dueDate) blockers.push("截止时间未确认，不知道是出首版还是必须定稿。");
    if ((project.risks || []).some((risk) => /尺寸|规格/.test(risk))) blockers.push("尺寸/平台规格缺失，版式可能重排。");
    if ((project.risks || []).some((risk) => /交付格式/.test(risk))) blockers.push("交付格式缺失，导出和源文件整理时间无法确定。");
    return blockers.slice(0, 5);
  }

  function buildDeliveryBottomLine(project, urgent) {
    const social = /小红书|朋友圈|公众号|社媒|封面|头图|Banner/i.test(`${project.type} ${(project.deliverables || []).join("、")}`);
    const print = /印刷|包装|画册|折页/.test(`${project.type} ${(project.deliverables || []).join("、")}`);
    if (print) return "尺寸、出血、CMYK、图片精度和文字转曲不能漏；视觉细节可以后补。";
    if (social) return "手机预览里主标题、利益点、主体图必须清楚，细碎说明先删或弱化。";
    if (urgent) return "主信息清楚、尺寸正确、可导出，比多做一个风格更重要。";
    return "先保证目标、主信息、尺寸和格式正确，再优化风格细节。";
  }

  function optimizeActionPath(project, analysis) {
    const plan = buildActionPathPlan(project, analysis.text);
    const lines = [`行动入口设计：${project.name}`];
    lines.push(`先判断：${plan.judge}`);
    lines.push("用户路径：");
    plan.path.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("版面处理：");
    plan.layout.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("CTA 写法：");
    plan.ctas.forEach((item) => lines.push(`- ${item}`));
    lines.push("不要这样做：");
    plan.donts.forEach((item) => lines.push(`- ${item}`));
    lines.push("交付前检查：");
    plan.checks.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push(`下一步：${plan.nextStep}`);
    project.portfolio.process = appendSentence(project.portfolio.process, `行动入口设计：${analysis.text}`);
    return lines.join("\n");
  }

  function buildActionPathPlan(project, text) {
    const combined = `${project.name} ${project.type} ${(project.deliverables || []).join("、")} ${project.goal || ""} ${project.scene || ""} ${text}`;
    const hasQr = /二维码|扫码/.test(combined);
    const hasButton = /按钮|CTA|点击/.test(combined);
    const wantsSignup = /报名|预约/.test(combined);
    const wantsOffer = /领取|优惠|福利|券/.test(combined);
    const wantsPurchase = /购买|下单/.test(combined);
    const path = [
      "先看到利益：用户为什么要扫/点/报名，必须在入口附近有一句理由。",
      "再看到入口：二维码、按钮或报名方式要靠近利益点，不能孤零零放角落。",
      "最后知道动作：用动词告诉用户下一步，而不是只写一个二维码或链接。",
    ];
    const layout = [
      "把行动入口放在视线路径末端：主标题/主视觉之后、规则说明之前。",
      "入口周围留干净底色和安全距离，别压在复杂图片、纹理或花字上。",
      "入口尺寸宁可稳一点，不要为了画面精致把二维码/按钮缩到需要找。",
    ];
    if (/小红书|朋友圈|社媒|封面|公众号/.test(combined)) {
      layout.unshift("手机预览优先：入口要在小屏上能被一眼找到，细规则可以放正文或评论区。");
    }
    if (/Banner|banner|横幅/.test(combined)) {
      layout.unshift("横版 Banner 只保留一个行动入口，按钮/利益点靠近主视觉中心，不要贴边。");
    }
    if (hasQr) {
      layout.push("二维码下方加 4-8 个字说明，例如“扫码报名”“扫码领取”，避免用户不知道扫完做什么。");
    }
    if (hasButton) {
      layout.push("按钮文案用动词 + 结果，例如“立即报名”“领取优惠”，不要只写“点击这里”。");
    }
    const ctas = buildActionPathCtas({ wantsSignup, wantsOffer, wantsPurchase, hasQr, hasButton });
    const donts = [
      "不要让二维码抢第一眼；第一眼应该是主题/利益，二维码是行动收口。",
      "不要把入口放在视觉最边缘或复杂背景上，用户会漏看或扫不出来。",
      "不要同时放多个同等级入口；有多个入口时，主入口最大，次入口弱化。",
    ];
    const checks = [
      "3 秒测试：用户能不能先看懂利益，再找到入口？",
      "真实设备测试：二维码能否扫码，按钮/链接是否跳到正确页面？",
      "遮挡测试：入口周围有没有被贴纸、阴影、裁切、安全区遮住？",
      "文案测试：CTA 是否包含明确动作，而不是只有名词？",
    ];
    if (/印刷|线下|门店|展架|包装|画册|折页/.test(combined)) {
      checks.unshift("印刷前测试：用实际尺寸打印或预览二维码，确认远一点也能扫。");
      layout.push("线下物料的二维码要留足白边，附近不要放太细的小字或低对比底纹。");
    }
    return {
      judge: "行动入口不是最后随手塞二维码/按钮，而是让用户按“看见利益 -> 找到入口 -> 完成动作”的路径走完。",
      path: Array.from(new Set(path)).slice(0, 4),
      layout: Array.from(new Set(layout)).slice(0, 6),
      ctas,
      donts: Array.from(new Set(donts)).slice(0, 4),
      checks: Array.from(new Set(checks)).slice(0, 5),
      nextStep: "复制当前稿做一版“行动路径小稿”：只检查主题、利益点、入口三件事，先确认用户能不能顺着视线完成扫码/点击/报名。",
    };
  }

  function buildActionPathCtas(flags) {
    if (flags.wantsSignup) return flags.hasQr ? ["扫码报名", "立即预约", "查看活动名额"] : ["立即报名", "预约体验", "查看报名方式"];
    if (flags.wantsOffer) return flags.hasQr ? ["扫码领取", "领取优惠", "查看福利"] : ["领取优惠", "立即参与", "查看专属福利"];
    if (flags.wantsPurchase) return ["立即购买", "查看新品", "现在下单"];
    if (flags.hasQr) return ["扫码了解", "扫码参与", "查看详情"];
    return ["立即了解", "查看详情", "马上参与"];
  }

  function organizeInformationHierarchy(project, analysis) {
    const hierarchy = buildInformationHierarchy(project, analysis.text);
    const lines = [`信息层级整理：${project.name}`];
    lines.push(`先定第一眼：${hierarchy.primary}`);
    lines.push("建议分层：");
    lines.push(`1. 主信息：${hierarchy.primary}`);
    lines.push(`2. 二级信息：${hierarchy.secondary}`);
    lines.push(`3. 辅助信息：${hierarchy.supporting}`);
    lines.push(`4. 弱化或移出画面：${hierarchy.deprioritized}`);
    lines.push("版式处理：");
    buildHierarchyLayoutActions(project, analysis.text).forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("删减原则：");
    buildHierarchyCutRules(project, analysis.text).forEach((item) => lines.push(`- ${item}`));
    lines.push("检查标准：缩小到手机预览或退后一步看，3 秒内只能先读到一个主信息；如果同时读到三件事，就还没分层。");
    project.portfolio.process = appendSentence(project.portfolio.process, `信息层级整理：${analysis.text}`);
    return lines.join("\n");
  }

  function buildInformationHierarchy(project, text) {
    const combined = `${project.name} ${project.type} ${(project.deliverables || []).join("、")} ${project.goal || ""} ${text}`;
    const theme = inferCopyTheme(project, text);
    let primary = project.goal && !/待补充|待从/.test(project.goal) ? project.goal : theme;
    if (/价格|优惠|折扣|满减|限时/.test(combined)) primary = "最强优惠/活动利益点";
    if (/新品|上新|新品上市/.test(combined)) primary = "新品名称 + 最大亮点";
    if (/报名|预约|领取|扫码|二维码/.test(combined)) primary = "活动主题 + 行动入口";
    const secondary = [];
    if (/时间|日期|地点|门店/.test(combined)) secondary.push("时间/地点");
    if (/优惠|折扣|满减|权益|福利/.test(combined)) secondary.push("关键利益点");
    if (/新品|口味|卖点|成分|亮点/.test(combined)) secondary.push("1-2 个产品卖点");
    if (!secondary.length) secondary.push("一句副标题解释为什么值得看");
    const supporting = [];
    if (/二维码|扫码|报名|预约|购买|领取/.test(combined)) supporting.push("CTA/二维码/行动方式");
    supporting.push("品牌露出、活动规则、补充说明");
    return {
      primary,
      secondary: Array.from(new Set(secondary)).slice(0, 3).join("、"),
      supporting: Array.from(new Set(supporting)).slice(0, 3).join("、"),
      deprioritized: "长规则、重复卖点、内部口号、无法立刻帮助用户决策的信息",
    };
  }

  function buildHierarchyLayoutActions(project, text) {
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${text}`;
    const actions = [
      "字号只用 3 档：主标题最大，利益点次之，规则说明最小。",
      "同一层级保持同样的字重、颜色和间距，不要每句话都做一个样式。",
      "把说明文字合并成短组或标签，避免出现一整段正文压住画面。",
      "主视觉和主标题只选一个做第一视觉，另一个降一级配合它。",
    ];
    if (/小红书|朋友圈|公众号|社媒|封面|头图|Banner/i.test(combined)) {
      actions.unshift("先做手机缩略图测试，主信息在小图里读不清就继续删。");
    }
    if (/印刷|包装|画册|折页/.test(combined)) {
      actions.push("印刷物可以把规则信息放到背面、内页或二级区域，不要全部挤在正面。");
    }
    return Array.from(new Set(actions)).slice(0, 6);
  }

  function buildHierarchyCutRules(project, text) {
    const rules = [
      "同一意思出现两次，只留更短、更像用户语言的一句。",
      "不能推动用户理解或行动的信息，先放到详情页、正文或备注。",
      "领导/客户都想放的内容，先按目标排序，不按提出人平均分配面积。",
      "数字、时间、地点、价格、二维码属于功能信息，要清楚，不要装饰化到读不出来。",
    ];
    if (project.goal && !/待补充|待从/.test(project.goal)) {
      rules.unshift(`每条信息都问：它是否服务目标「${project.goal}」？不服务就弱化。`);
    }
    if (/都想放|全部放/.test(text)) rules.unshift("不要把“都放上去”理解成“都突出”；可以都在，但只能一个最突出。");
    return Array.from(new Set(rules)).slice(0, 6);
  }

  function optimizeReadability(project, analysis) {
    const plan = buildReadabilityPlan(project, analysis.text);
    const lines = [`阅读体验诊断：${project.name}`];
    lines.push(`先判断：${plan.judge}`);
    lines.push("优先排查：");
    plan.causes.forEach((item) => lines.push(`- ${item}`));
    lines.push("按这个顺序改：");
    plan.steps.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("不要这样做：");
    plan.donts.forEach((item) => lines.push(`- ${item}`));
    lines.push("提交前测试：");
    plan.checks.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push(`下一步：${plan.nextStep}`);
    project.portfolio.process = appendSentence(project.portfolio.process, `阅读体验优化：${analysis.text}`);
    return lines.join("\n");
  }

  function buildReadabilityPlan(project, text) {
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${project.goal || ""} ${text}`;
    const smallText = /字太小|字号|小屏.*看不|手机.*看不|缩略图.*看不/.test(combined);
    const lowContrast = /对比度不够|文字.*背景.*(融|糊|不清)|背景.*文字.*(融|糊|不清)|太暗|太灰|看不清/.test(combined);
    const crowdedText = /字太多|文字太多|信息.*糊成|阅读困难|读不清|行距|字距/.test(combined);
    const qrIssue = /二维码|扫码/.test(combined);
    const causes = [];
    if (smallText) causes.push("字号/层级问题：主标题、利益点、说明文字没有拉开足够比例，小屏会先糊成一片。");
    if (lowContrast) causes.push("明度对比问题：文字和背景太接近，颜色好看但阅读成本高。");
    if (crowdedText) causes.push("阅读密度问题：字数、行距、分组和留白没有给眼睛停顿。");
    if (qrIssue) causes.push("功能识别问题：二维码和说明文字需要清楚、干净、可测试，不能装饰化。");
    if (!causes.length) causes.push("阅读顺序问题：用户不知道先读标题、利益点还是说明。");
    const steps = [
      "先做黑白稿检查：关掉颜色，只看主标题、二级信息、小说明是否仍然分得开。",
      "把字号收成 3 档：主标题最大，利益点中等，规则/说明最小；不要出现 5-6 档随机字号。",
      "提高文字和底色明度差：复杂背景上先加干净承托区或半透明遮罩，再放文字。",
      "把长句拆成短行或标签组，同组间距小，不同组间距大。",
    ];
    if (/小红书|朋友圈|社媒|封面|公众号|Banner|banner/.test(combined)) {
      steps.unshift("先用手机预览尺寸看，不要只在电脑大屏上判断。");
    }
    if (/印刷|包装|画册|折页/.test(combined)) {
      steps.unshift("按真实印刷尺寸预览，正文、注释、二维码说明不能只在屏幕放大时清楚。");
    }
    if (qrIssue) {
      steps.push("二维码周围留白，不压复杂纹理；下方加短说明，例如“扫码报名/扫码领取”。");
    }
    const donts = [
      "不要只把所有字加粗；加粗太多会让层级一起变吵。",
      "不要为了高级感把文字做得过小或过灰，读不清会直接显得不专业。",
      "不要用描边、发光硬救可读性；先换底、加承托区或重排信息。",
    ];
    const checks = [
      "3 秒测试：缩小预览后，能不能先读到主标题，再读到利益点？",
      "眯眼测试：文字区域是否仍然有清楚的深浅关系？",
      "距离测试：社媒用手机看，印刷物按实际观看距离看。",
      "删减测试：删掉一句说明后是否更清楚？如果更清楚，说明信息密度过高。",
    ];
    if (qrIssue) checks.push("扫码测试：用真实手机扫一次，确认能打开正确页面。");
    return {
      judge: "可读性不是单纯把字放大，而是字号层级、明度对比、行距分组和真实预览一起成立。",
      causes: Array.from(new Set(causes)).slice(0, 5),
      steps: Array.from(new Set(steps)).slice(0, 7),
      donts: Array.from(new Set(donts)).slice(0, 4),
      checks: Array.from(new Set(checks)).slice(0, 5),
      nextStep: "复制当前稿做一版“可读性修正版”：只调整字号层级、底色承托和分组间距，先别换风格。",
    };
  }

  function refineCopywriting(project, analysis) {
    const goal = project.goal && !/待补充/.test(project.goal) ? project.goal : inferCopyGoal(analysis.text);
    const audience = project.audience && !/待补充/.test(project.audience) ? project.audience : "目标用户";
    const scene = project.scene && !/待补充/.test(project.scene) ? project.scene : inferCopyScene(project, analysis.text);
    const theme = inferCopyTheme(project, analysis.text);
    const tone = inferCopyTone(analysis.text);
    const headlines = buildHeadlineOptions(theme, tone, goal);
    const lines = [`文案整理：${project.name}`];
    lines.push(`先定信息层级：主标题说「${theme}」，副标题解释价值，按钮/角标只放行动。`);
    lines.push(`受众/场景：${audience} / ${scene}。文案要先服务读懂，再服务好听。`);
    lines.push("主标题候选：");
    headlines.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("副标题写法：");
    lines.push(`- 直接版：${theme}，把重点信息一眼说清楚。`);
    lines.push(`- 情绪版：给${audience}一个更容易被记住的理由。`);
    lines.push("CTA / 小标签：");
    buildCtaOptions(analysis.text, goal).forEach((item) => lines.push(`- ${item}`));
    lines.push("需要从画面里拿掉或弱化：长解释、重复卖点、内部视角的话、无法立刻行动的信息。");
    lines.push("下一步：先只上主标题 + 1 句副标题 + 1 个行动点，剩下信息放正文、备注或二级画面。");
    if (/文字太多|太多字|精简|太长/.test(analysis.text)) {
      lines.push("精简标准：每删一句都问，它会不会影响用户理解核心利益；不会，就先删。");
    }
    project.portfolio.process = appendSentence(project.portfolio.process, `文案整理：${analysis.text}`);
    return lines.join("\n");
  }

  function inferCopyTheme(project, text) {
    const quoted = text.match(/[「《“"]([^」》”"]{2,30})[」》”"]/);
    if (quoted) return quoted[1];
    const deliverable = (project.deliverables || [])[0] || project.name;
    if (/新品|上新/.test(`${text} ${project.name}`)) return "新品上市";
    if (/活动|报名|优惠|促销/.test(`${text} ${project.goal || ""}`)) return "活动利益点";
    if (/节日|春节|中秋|圣诞|万圣/.test(`${text} ${project.name}`)) return "节日主题";
    return deliverable && !/未命名|第一个/.test(deliverable) ? deliverable : "核心卖点";
  }

  function inferCopyGoal(text) {
    if (/报名|预约|领取|购买|下单/.test(text)) return "让用户立刻知道下一步行动";
    if (/新品|上新/.test(text)) return "让用户一眼知道新品和亮点";
    if (/优惠|折扣|促销/.test(text)) return "让用户快速看到优惠利益";
    return "让用户快速看懂核心信息";
  }

  function inferCopyScene(project, text) {
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${text}`;
    if (/小红书|朋友圈|公众号|社媒|封面|头图|Banner/i.test(combined)) return "手机端快速浏览";
    if (/印刷|包装|画册|折页/.test(combined)) return "线下阅读或实物接触";
    return "当前使用场景";
  }

  function inferCopyTone(text) {
    if (/年轻|活泼|可爱|轻松/.test(text)) return "young";
    if (/高级|质感|克制|品牌/.test(text)) return "premium";
    if (/促销|优惠|抢|限时/.test(text)) return "promo";
    return "clear";
  }

  function buildHeadlineOptions(theme, tone, goal) {
    if (tone === "premium") {
      return [`${theme}，刚刚好`, `把${theme}留给重要时刻`, `${theme}的精致选择`];
    }
    if (tone === "young") {
      return [`${theme}，今天就要新鲜一点`, `把${theme}装进好心情`, `${theme}来啦，先看到先心动`];
    }
    if (tone === "promo") {
      return [`${theme}，现在正划算`, `限时开启，别错过${theme}`, `${theme}福利，一眼看懂`];
    }
    if (/行动|报名|领取|购买/.test(goal)) {
      return [`${theme}，现在开始`, `别错过${theme}`, `${theme}，一步到位`];
    }
    return [`${theme}，一眼看懂`, `这次重点是${theme}`, `${theme}，先看这里`];
  }

  function buildCtaOptions(text, goal) {
    if (/报名|预约/.test(`${text} ${goal}`)) return ["立即报名", "预约参与", "查看活动详情"];
    if (/购买|下单|新品|上新/.test(`${text} ${goal}`)) return ["立即了解", "查看新品", "现在入手"];
    if (/领取|优惠|折扣|促销/.test(`${text} ${goal}`)) return ["领取优惠", "查看福利", "限时参与"];
    return ["了解详情", "查看规则", "马上参与"];
  }

  function generatePresentationScript(state, project, analysis) {
    const feedbackItems = state.feedback.filter((item) => item.projectId === project.id);
    const latestFeedback = feedbackItems.slice().reverse()[0];
    const latestVersion = (project.versions || []).slice().reverse()[0];
    const goal = project.goal && !/待补充/.test(project.goal) ? project.goal : "让用户更快看懂核心信息";
    const audience = project.audience && !/待补充/.test(project.audience) ? project.audience : "目标用户";
    const scene = project.scene && !/待补充/.test(project.scene) ? project.scene : inferCopyScene(project, analysis.text);
    const lines = [`方案汇报稿：${project.name}`];
    lines.push("可以按这个顺序讲，别先说“我觉得好看”，先说设计判断：");
    lines.push(`1. 背景目标：这版主要是为了「${goal}」，面向「${audience}」，使用场景是「${scene}」。`);
    lines.push(`2. 设计策略：我先保证主信息能被第一眼读到，再用${presentationStyleFocus(project)}强化视觉记忆点。`);
    lines.push(`3. 画面处理：主标题/主体图作为第一视觉，次要信息降级，避免用户第一眼不知道看哪里。`);
    if (latestFeedback) {
      lines.push(`4. 对反馈的回应：上一轮反馈是「${latestFeedback.raw}」，这版对应调整为：${latestFeedback.action}`);
    } else {
      lines.push("4. 风险控制：这版先控制字体、颜色和信息层级，避免在首版里同时追太多风格。");
    }
    if (latestVersion) {
      lines.push(`5. 版本变化：${latestVersion.name} 主要调整了 ${latestVersion.changes}。`);
    }
    lines.push("结尾可以这样说：这版我建议先确认信息层级和整体调性，如果方向没问题，我再继续精修细节和适配交付尺寸。");
    lines.push("可能被问到：");
    buildPresentationQuestions(project, latestFeedback).forEach((item) => lines.push(`- ${item}`));
    project.portfolio.process = appendSentence(project.portfolio.process, `方案表达准备：${analysis.text}`);
    return lines.join("\n");
  }

  function presentationStyleFocus(project) {
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${project.goal || ""}`;
    if (/小红书|朋友圈|公众号|社媒|封面|头图|Banner/i.test(combined)) return "更强的标题对比和移动端可读性";
    if (/印刷|包装|画册|折页/.test(combined)) return "更稳定的版面秩序和交付规范";
    if (/品牌|logo|VI|视觉识别/i.test(combined)) return "统一的品牌色、字体和图形语言";
    return "清楚的层级、克制的配色和明确的视觉中心";
  }

  function buildPresentationQuestions(project, latestFeedback) {
    const questions = [
      "为什么这样排版？答：为了让用户先看到主信息，再读辅助说明。",
      "为什么不用更多装饰？答：先保证可读性和交付稳定，装饰只服务视觉中心。",
    ];
    if (!project.goal || /待补充/.test(project.goal)) {
      questions.push("如果被问目标是什么，要先反问确认：这张图最重要是点击、通知、促销，还是品牌形象？");
    }
    if (latestFeedback && latestFeedback.conflict) {
      questions.push("如果被问高级和活泼能否兼顾，要先确认优先级，再决定配色和装饰力度。");
    }
    if ((project.risks || []).some((risk) => /尺寸|规格|交付格式/.test(risk))) {
      questions.push("如果被问能否直接交付，要说明尺寸/格式还需确认，避免导出返工。");
    }
    return questions;
  }

  function simulateDesignDefense(state, project, analysis) {
    const feedbackItems = state.feedback.filter((item) => item.projectId === project.id);
    const latestFeedback = feedbackItems.slice().reverse()[0];
    const lines = [`提交前答辩预演：${project.name}`];
    lines.push("回答时不要先说“我觉得好看”，先说目标、信息顺序、场景限制和反馈回应。");
    lines.push("可能被问：");
    buildDefenseQuestions(project, latestFeedback, analysis.text).forEach((item, index) => {
      lines.push(`${index + 1}. ${item.question}`);
      lines.push(`   答：${item.answer}`);
    });
    const evidence = buildDefenseEvidence(project, latestFeedback);
    if (evidence.length) {
      lines.push("提交前补证据：");
      evidence.forEach((item) => lines.push(`- ${item}`));
    }
    lines.push("不要这样回答：");
    buildDefenseDonts().forEach((item) => lines.push(`- ${item}`));
    lines.push("最后一句可以这样收：这版我建议先确认目标和信息层级，如果方向成立，我再继续精修视觉细节和交付适配。");
    project.portfolio.process = appendSentence(project.portfolio.process, `提交前答辩预演：${analysis.text}`);
    return lines.join("\n");
  }

  function buildDefenseQuestions(project, latestFeedback, text) {
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${project.goal || ""} ${text}`;
    const goal = project.goal && !/待补充/.test(project.goal) ? project.goal : "让用户更快看懂核心信息";
    const questions = [
      {
        question: "为什么这样排版？",
        answer: `我先按目标「${goal}」确定第一眼顺序，让用户先看到主标题/主体，再看辅助信息，减少阅读成本。`,
      },
      {
        question: "为什么用这个风格？",
        answer: `这套风格不是单纯为了好看，而是为了服务使用场景和受众；我控制了字体、颜色和装饰数量，让画面更稳定。`,
      },
      {
        question: "为什么不把信息都放大？",
        answer: "如果所有信息都放大，就没有主次。现在主信息最强，次要信息降级，用户更容易先抓重点。",
      },
    ];
    if (/小红书|朋友圈|社媒|封面|头图|Banner/i.test(combined)) {
      questions.push({
        question: "手机上能看清吗？",
        answer: "我会用缩略图尺寸检查 3 秒可读性，优先保证主标题、核心利益点和行动信息清楚。",
      });
    }
    if (/印刷|包装|画册|折页/.test(combined)) {
      questions.push({
        question: "能直接交付印刷吗？",
        answer: "交付前还会检查成品尺寸、出血、CMYK、图片精度、文字转曲和印刷 PDF，避免印前返工。",
      });
    }
    if (latestFeedback) {
      questions.push({
        question: "上一轮反馈你改了什么？",
        answer: `上一轮反馈是「${latestFeedback.raw}」，我对应调整为：${latestFeedback.action}`,
      });
    }
    if ((project.risks || []).some((risk) => /缺少|待确认/.test(risk))) {
      questions.push({
        question: "还有什么不确定？",
        answer: `目前还需要确认：${currentProjectRisks(project).slice(0, 3).join("、")}。这些确认后我可以继续精修和导出。`,
      });
    }
    return questions.slice(0, 6);
  }

  function buildDefenseEvidence(project, latestFeedback) {
    const evidence = [];
    if (!project.goal || /待补充/.test(project.goal)) evidence.push("补一句项目目标：这张图要让谁在什么场景下做什么。");
    if (!project.audience || /待补充/.test(project.audience)) evidence.push("补目标受众，避免回答时只说自己的审美判断。");
    if (!(project.deliverables || []).length) evidence.push("补交付物和使用位置，解释版式和尺寸选择才有依据。");
    if ((project.risks || []).some((risk) => /尺寸|规格|交付格式/.test(risk))) evidence.push("补尺寸、平台规格和交付格式，避免被问能不能直接交付时答不上来。");
    if (latestFeedback) evidence.push("准备一张修改前后对比图，用来说明你回应了哪些反馈。");
    return evidence.slice(0, 5);
  }

  function buildDefenseDonts() {
    return [
      "不要说“我觉得这样比较好看”，要说它解决了什么信息问题。",
      "不要把所有选择都归因于参考图，要说你借的是方法，不是照抄画面。",
      "不要承诺已经能交付，除非尺寸、格式、授权和检查项都确认过。",
    ];
  }

  function answerDesignQuestion(project, analysis) {
    const question = analysis.designerQuestion || detectDesignerQuestion(analysis.text);
    const rules = question && question.rules && question.rules.length ? question.rules : [designerQuestionRules[0]];
    const lines = [`设计问题：${rules.map((rule) => rule.label).join("、")}`];
    lines.push(`针对「${project.name}」，先这样判断：`);
    rules.forEach((rule) => {
      lines.push(`- ${rule.judge}`);
    });
    lines.push("具体做法：");
    const steps = Array.from(new Set(rules.flatMap((rule) => rule.steps))).slice(0, 6);
    steps.forEach((step, index) => {
      lines.push(`${index + 1}. ${step}`);
    });
    const contextual = buildQuestionContext(project, rules, analysis.text);
    if (contextual.length) {
      lines.push("结合当前项目：");
      contextual.forEach((item) => lines.push(`- ${item}`));
    }
    lines.push(`下一步：${rules[0].nextStep}`);
    lines.push("判断标准：能不能让目标用户更快看懂，而不是只问自己好不好看。");
    project.portfolio.process = appendSentence(project.portfolio.process, `设计问题答疑：${analysis.text}`);
    return lines.join("\n");
  }

  function buildQuestionContext(project, rules, text) {
    const context = [];
    const combined = `${project.type} ${(project.deliverables || []).join("、")} ${text}`;
    const keys = rules.map((rule) => rule.key);
    if ((!project.goal || /待补充/.test(project.goal)) && (keys.includes("brief_start") || keys.includes("layout_method"))) {
      context.push("项目目标还不清楚，先别急着做风格，先补一句“这张图要让谁做什么”。");
    } else if (project.goal && !/待补充/.test(project.goal)) {
      context.push(`当前目标是「${project.goal}」，所有选择都要能解释它。`);
    }
    if (/小红书|朋友圈|公众号|社媒|封面|头图|Banner/i.test(combined)) {
      context.push("这是偏线上/社媒场景，先保证手机预览时标题、利益点和主体不被裁切。");
    }
    if (/印刷|包装|画册|折页/.test(combined)) {
      context.push("这是偏印刷/实体场景，设计前就要确认出血、CMYK、图片精度和文字转曲要求。");
    }
    if (project.dueDate && daysUntil(project.dueDate) <= 1) {
      context.push("时间很紧，先做能影响交付判断的部分：目标、尺寸、主信息、可读性。");
    }
    const risks = currentProjectRisks(project);
    if (risks.length) {
      context.push(`当前最容易返工的是：${risks.slice(0, 2).join("、")}。`);
    }
    return Array.from(new Set(context)).slice(0, 4);
  }

  function generateDesignDirections(project, analysis) {
    const text = `${project.type} ${(project.deliverables || []).join("、")} ${project.goal || ""} ${analysis.text}`;
    const goal = project.goal && !/待补充/.test(project.goal) ? project.goal : "先让用户快速看懂主信息";
    const audience = project.audience && !/待补充/.test(project.audience) ? project.audience : "当前目标用户";
    const scene = project.scene && !/待补充/.test(project.scene) ? project.scene : "实际投放场景";
    const directions = buildDirectionOptions(text);
    const lines = [`设计方向草案：${project.name}`];
    lines.push(`先按这个判断：目标是「${goal}」，受众是「${audience}」，场景是「${scene}」。`);
    directions.forEach((direction, index) => {
      lines.push(`方向 ${index + 1}｜${direction.name}`);
      lines.push(`- 视觉关键词：${direction.keywords.join("、")}`);
      lines.push(`- 版式动作：${direction.layout}`);
      lines.push(`- 色彩/字体：${direction.style}`);
      lines.push(`- 适合：${direction.bestFor}`);
      lines.push(`- 风险：${direction.risk}`);
    });
    lines.push("推荐做法：先做 2 张小稿，不要一开始精修；用主信息是否更快被看懂来选方向。");
    const risks = currentProjectRisks(project);
    if (risks.length) {
      lines.push(`动手前先确认：${risks.slice(0, 3).join("、")}。`);
    }
    project.portfolio.process = appendSentence(project.portfolio.process, `方向探索：${analysis.text}`);
    return lines.join("\n");
  }

  function planDesignConcepts(project, analysis) {
    const text = `${project.name} ${project.type} ${(project.deliverables || []).join("、")} ${project.goal || ""} ${project.audience || ""} ${project.scene || ""} ${analysis.text}`;
    const concepts = buildDesignConceptPlans(project, text);
    const lines = [`多方案提案规划：${project.name}`];
    lines.push("先把方案差异做成“策略不同”，不要只换颜色、字体或装饰。");
    lines.push("提案总逻辑：");
    buildConceptProposalLogic(project, text).forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    concepts.forEach((concept, index) => {
      lines.push(`方案 ${String.fromCharCode(65 + index)}｜${concept.name}`);
      lines.push(`- 核心假设：${concept.hypothesis}`);
      lines.push(`- 画面策略：${concept.visual}`);
      lines.push(`- 适合：${concept.bestFor}`);
      lines.push(`- 风险：${concept.risk}`);
      lines.push(`- 汇报话术：${concept.pitch}`);
    });
    lines.push("怎么分工做小稿：");
    buildConceptDraftSteps(project, concepts).forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("提交前自检：三版放在一起看，第一眼差异应该是“解决问题的方式不同”，不是同一张图换了皮肤。");
    project.portfolio.process = appendSentence(project.portfolio.process, `多方案提案规划：${analysis.text}`);
    return lines.join("\n");
  }

  function buildConceptProposalLogic(project, text) {
    const logic = [];
    if (project.goal && !/待补充|待从/.test(project.goal)) {
      logic.push(`先声明共同目标：所有方案都服务「${project.goal}」，不是纯审美对比。`);
    } else {
      logic.push("先补一句共同目标：这张图到底让谁在什么场景下做什么。");
    }
    logic.push("每个方案只强调一个核心判断：信息效率、情绪记忆点、品牌/交付稳定性。");
    logic.push("先做低精小稿给老板/客户选方向，方向确认后再精修细节。");
    if (/明天|今天|马上|赶/.test(text)) logic.push("时间紧时最多做 2 个方向，不要硬凑 3 个导致都不完整。");
    return logic.slice(0, 4);
  }

  function buildDesignConceptPlans(project, text) {
    const isSocial = /小红书|朋友圈|公众号|社媒|封面|头图|Banner|banner/.test(text);
    const isPrint = /印刷|包装|画册|折页/.test(text);
    const wantsPremium = /高级|质感|克制|品牌/.test(text);
    const wantsYoung = /年轻|活泼|可爱|童趣|节日|促销/.test(text);
    const concepts = [
      {
        name: "信息效率方案",
        hypothesis: "用户最需要先看懂主题、利益点和行动入口。",
        visual: "主标题/主图做第一视觉，次要信息按时间、价格、二维码或说明分组，装饰尽量少。",
        bestFor: "需求还不够稳、时间紧、需要先让负责人放心的首版。",
        risk: "视觉惊喜偏少，需要一个小锚点避免太普通。",
        pitch: "这一版优先保证传播效率，先让用户在 3 秒内读懂核心信息。",
      },
      {
        name: wantsYoung ? "年轻传播方案" : "记忆点方案",
        hypothesis: wantsYoung ? "项目需要更轻快、更容易被刷到时停住。" : "项目需要一个能被记住的视觉钩子。",
        visual: wantsYoung ? "放大标题节奏，用更明亮的主色和一个跳色标签，加入轻量图形动势。" : "围绕一个视觉锚点做构图，比如特殊标题、主体放大、符号或材质。",
        bestFor: isSocial ? "社媒封面、活动传播、需要抢第一眼的物料。" : "需要提案时拉开差异、避免看起来太常规的方向。",
        risk: "如果信息层级没压住，容易变花或影响可读性。",
        pitch: wantsYoung ? "这一版增强年轻感和传播节奏，让画面更容易在信息流里被注意到。" : "这一版用视觉锚点提升记忆度，让方案不只是把信息排出来。",
      },
      {
        name: isPrint || wantsPremium ? "品牌质感方案" : "交付适配方案",
        hypothesis: isPrint || wantsPremium ? "项目需要更稳定、更有品牌感或交付安全感。" : "项目后续可能需要多平台延展，规则比单张效果更重要。",
        visual: isPrint || wantsPremium ? "控制颜色和字体数量，强化留白、对齐、材质与细节克制。" : "建立母版规则：标题区、主体区、辅助信息区固定，再做不同尺寸延展。",
        bestFor: isPrint ? "印刷/包装/画册等需要稳定落地的项目。" : "品牌项目、多物料活动、后续需要延展的项目。",
        risk: isPrint || wantsPremium ? "可能显得保守，需要用材质或局部细节补质感。" : "单张视觉冲击不一定最强，但后续复用更稳。",
        pitch: isPrint || wantsPremium ? "这一版强调品牌秩序和交付稳定，减少后期返工。" : "这一版先搭规则，方便后面快速适配不同平台和物料。",
      },
    ];
    return concepts.slice(0, /两版|2版|二版|两套/.test(text) ? 2 : 3);
  }

  function buildConceptDraftSteps(project, concepts) {
    const steps = [
      `每个方案先做 30%-50% 完成度小稿，保持同一份文案和交付尺寸，方便公平比较。`,
      "每版只精修第一屏/主视觉，不要一开始把所有细节都做满。",
      "给每版写一句判断标准：它解决什么问题、适合谁、风险是什么。",
      "发给老板/客户时先讲共同目标，再讲方案差异，最后问要保留哪一个方向继续深入。",
    ];
    if ((project.risks || []).length) steps.unshift(`动手前先确认：${project.risks.slice(0, 2).join("、")}。`);
    if (concepts.length >= 3) steps.push("三版里至少有一版要稳妥可交付，避免全是实验方向。");
    return steps.slice(0, 6);
  }

  function buildDirectionOptions(text) {
    const isSocial = /小红书|朋友圈|公众号|社媒|封面|头图|Banner/i.test(text);
    const isPrint = /印刷|包装|画册|折页/.test(text);
    const wantsPremium = /高级|质感|克制|品牌/.test(text);
    const wantsYoung = /年轻|活泼|可爱|童趣|节日|促销/.test(text);
    const base = [
      {
        name: wantsPremium ? "克制质感方向" : "清晰稳妥方向",
        keywords: wantsPremium ? ["克制", "秩序", "质感"] : ["清楚", "直接", "稳妥"],
        layout: "主标题和主体图形占据第一视觉，次要信息成组放在下方或侧边。",
        style: wantsPremium ? "低饱和主色，少装饰，标题字重稳定。" : "品牌色或安全主色，标题对比明确，正文保持易读。",
        bestFor: "需要降低返工风险、让老板或客户快速理解的首版。",
        risk: "可能不够有记忆点，需要一个小的视觉锚点补强。",
      },
      {
        name: wantsYoung ? "年轻传播方向" : "记忆点方向",
        keywords: wantsYoung ? ["年轻", "轻快", "有节奏"] : ["差异化", "视觉锚点", "传播感"],
        layout: "用更大的标题节奏或局部放大元素制造视觉中心。",
        style: wantsYoung ? "明度更高的主色，搭配一个跳色强调重点。" : "控制色彩数量，把特殊图形或标题处理作为记忆点。",
        bestFor: isSocial ? "社媒封面、活动海报、需要抢第一眼的图。" : "希望方案看起来不普通、需要提案比较的图。",
        risk: "如果装饰太多，容易牺牲可读性。",
      },
      {
        name: isPrint ? "交付安全方向" : "平台适配方向",
        keywords: isPrint ? ["规范", "可靠", "可印刷"] : ["适配", "可读", "高效率"],
        layout: isPrint ? "先按真实尺寸和出血排版，重要内容远离裁切边。" : "按平台安全区放主信息，移动端预览时标题仍要清楚。",
        style: isPrint ? "提前按 CMYK 和图片精度控制素材，避免后期大改。" : "减少细碎文字，保留高对比标题和清楚按钮/利益点。",
        bestFor: isPrint ? "包装、画册、折页等需要稳定交付的物料。" : "多平台复用、时间紧、需要快速交付的项目。",
        risk: "视觉惊喜较少，但能保证交付不出错。",
      },
    ];
    return base;
  }

  function compareDesignOptions(project, analysis) {
    const text = analysis.text;
    const lines = [`方案选择建议：${project.name}`];
    lines.push("先不要用“哪个更好看”判断，按这 4 个标准选：");
    const criteria = [
      project.goal && !/待补充/.test(project.goal)
        ? `是否更直接服务目标「${project.goal}」`
        : "是否更快说清楚这张图要解决的问题",
      "第一眼是否能读到主标题或核心利益点",
      "是否更符合投放场景和尺寸限制",
      "是否更容易在截止时间前稳定交付",
    ];
    criteria.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push(`我的倾向：${buildOptionRecommendation(project, text)}`);
    lines.push("下一步：把两个方案各缩到手机预览大小或真实使用尺寸，只看 3 秒，哪个先被读懂就优先推进哪个。");
    if (!project.goal || /待补充/.test(project.goal)) {
      lines.push("还缺一个关键判断：项目目标没写清楚。目标不清时，方案选择很容易变成纯审美争论。");
    }
    return lines.join("\n");
  }

  function buildOptionRecommendation(project, text) {
    if (/时间|赶|今天|明天|马上|来不及/.test(text) || (project.dueDate && daysUntil(project.dueDate) <= 1)) {
      return "选更稳、更容易交付的方案；先保证信息清楚和格式正确，再补视觉细节。";
    }
    if (/高级|品牌|质感/.test(text)) return "选更克制、有秩序、颜色和字体更少的方案。";
    if (/年轻|活泼|传播|小红书|封面/.test(`${text} ${project.type} ${(project.deliverables || []).join("、")}`)) {
      return "选第一眼更强、标题更清楚、适合小屏传播的方案。";
    }
    const risks = currentProjectRisks(project);
    if (risks.length) return `先选能避开当前风险的方案，尤其是：${risks[0]}。`;
    return "先选信息层级更清楚的方案；如果层级差不多，再比较风格记忆点。";
  }

  function synthesizeFeedbackBatch(state, project, analysis, now = new Date()) {
    const feedbackItems = collectFeedbackForSynthesis(state, project, analysis);
    if (!feedbackItems.length) {
      return [
        `反馈优先级整理：${project.name}`,
        "我现在还缺少具体反馈原话。菁菁可以直接把聊天记录或口头反馈贴过来，不用整理，我会帮你拆成三类：先改、要确认、可后置。",
        "建议格式：谁说的 + 原话 + 截止时间。例如：老板说颜色太暗，客户说字太小，运营说要加二维码，明天下午前给。",
        "先别做：不要平均满足所有意见，也不要一收到“感觉不对”就推翻整版。",
      ].join("\n");
    }

    const priority = prioritizeFeedbackItems(project, feedbackItems, now);
    const lines = [`反馈优先级整理：${project.name}`];
    lines.push(`先改：${formatPriorityGroup(priority.mustFix, "先保证目标、可读性、规格和交付底线。")}`);
    lines.push(`需要确认：${formatPriorityGroup(priority.confirm, "目前没有明显冲突，但仍建议确认最终拍板人。")}`);
    lines.push(`可以后置：${formatPriorityGroup(priority.later, "没有必须后置的项，等核心方向确认后再做细节微调。")}`);
    lines.push("建议顺序：");
    lines.push("1. 先保目标和信息层级：主信息、受众、使用场景要先成立。");
    lines.push("2. 再调风格：颜色、字体、视觉锚点围绕同一个关键词收敛。");
    lines.push("3. 最后做交付：尺寸、安全区、导出格式和源文件命名一起检查。");
    lines.push(`回复口径：${buildFeedbackReplyTone(project, priority)}`);
    project.portfolio.process = appendSentence(project.portfolio.process, `反馈归并：${priority.summary}`);
    return lines.join("\n");
  }

  function collectFeedbackForSynthesis(state, project, analysis) {
    const stored = state.feedback
      .filter((item) => item.projectId === project.id && !item.handled)
      .map((item) => ({ ...item, source: "stored" }));
    const fromText = extractFeedbackClauses(analysis.text).map((clause) => {
      const detected = detectFeedback(clause);
      return {
        id: uid("f-temp"),
        projectId: project.id,
        from: detectPeople(clause) || "这次输入",
        raw: clause,
        action: detected ? detected.action : "先把这条反馈确认成具体修改范围。",
        reason: detected ? detected.reason : "反馈原话偏概括，需要补充判断依据。",
        conflict: detected ? detected.conflict : false,
        handled: false,
        version: "",
        source: "prompt",
      };
    });
    const seen = new Set();
    return stored.concat(fromText).filter((item) => {
      const key = `${item.from}-${item.raw}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function extractFeedbackClauses(text) {
    return String(text || "")
      .split(/[。；;\n]/)
      .map((item) => item.trim().replace(/^这些反馈[:：]?/, ""))
      .filter((item) => item.length >= 6)
      .filter((item) => /说|反馈|觉得|希望|要求|建议|客户|老板|主管|甲方|运营|产品/.test(item));
  }

  function prioritizeFeedbackItems(project, feedbackItems, now) {
    const priority = { mustFix: [], confirm: [], later: [], summary: "" };
    feedbackItems.forEach((item) => {
      const text = `${item.raw} ${item.action} ${item.reason}`;
      const entry = formatFeedbackItem(item);
      if (item.conflict || /高级.*活泼|活泼.*高级|年轻.*稳重|稳重.*年轻|全部放大|都要突出|既要.*又要/.test(text)) {
        priority.confirm.push(entry);
      } else if (/尺寸|规格|安全区|导出|格式|出血|CMYK|转曲|源文件|二维码|时间|截止|交付|看不清|读不清|字太小|信息层级|主标题|目标|受众|场景/.test(text)) {
        priority.mustFix.push(entry);
      } else if (/装饰|氛围|质感|高级|活泼|年轻|可爱|颜色|配色|字体|太暗|太普通|好看|不喜欢|精致/.test(text)) {
        priority.later.push(entry);
      } else {
        priority.confirm.push(entry);
      }
    });
    if ((project.risks || []).some((risk) => /尺寸|规格|交付格式|目标|交付物|截止/.test(risk))) {
      priority.confirm.unshift(`项目基础信息：${currentProjectRisks(project).slice(0, 3).join("、") || "确认目标、尺寸和格式"}`);
    }
    if (project.dueDate && daysUntil(project.dueDate, now) <= 1) {
      priority.mustFix.unshift("时间底线：临近截止，先交清楚可读的一版，复杂风格细节后置。");
    }
    priority.mustFix = Array.from(new Set(priority.mustFix)).slice(0, 5);
    priority.confirm = Array.from(new Set(priority.confirm)).slice(0, 5);
    priority.later = Array.from(new Set(priority.later)).slice(0, 5);
    priority.summary = priority.mustFix.concat(priority.confirm, priority.later).slice(0, 4).join("；");
    return priority;
  }

  function formatFeedbackItem(item) {
    const from = item.from && !/待补充/.test(item.from) ? `${item.from}：` : "";
    return `${from}${item.action}`;
  }

  function formatPriorityGroup(items, fallback) {
    if (!items.length) return fallback;
    return items.map((item, index) => `${index + 1}. ${item}`).join(" ");
  }

  function buildFeedbackReplyTone(project, priority) {
    const first = priority.mustFix[0] || "先处理影响信息理解和交付的部分";
    const confirm = priority.confirm[0] || "如果有主观风格偏好，我会先确认优先级";
    return `我会先按「${first}」推进，保证这版能解决「${project.goal || "核心目标"}」。同时需要确认「${confirm}」。确认后我再统一处理颜色、质感和细节，避免来回返工。`;
  }

  function alignStakeholderFeedback(state, project, analysis, now = new Date()) {
    const feedbackItems = collectStakeholderConflictItems(state, project, analysis);
    const people = extractStakeholders(analysis.text, feedbackItems);
    const conflict = summarizeStakeholderConflict(project, analysis.text, feedbackItems);
    project.status = "waiting";
    if (!project.risks.includes("多方意见不一致，需要确认拍板优先级")) {
      project.risks.push("多方意见不一致，需要确认拍板优先级");
    }
    addStakeholderAlignmentTask(state, project, people, now);
    const lines = [`多方意见对齐：${project.name}`];
    lines.push(`涉及对象：${people.length ? people.join("、") : "待确认"}`);
    lines.push(`冲突点：${conflict}`);
    lines.push("先按这个决策顺序：");
    buildStakeholderDecisionOrder(project, analysis.text).forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("需要确认：");
    buildStakeholderAlignmentQuestions(project, analysis.text, people).forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("设计取舍建议：");
    buildStakeholderTradeoffs(project, analysis.text, feedbackItems).forEach((item) => lines.push(`- ${item}`));
    lines.push("可以这样对齐：");
    lines.push(`- ${buildStakeholderAlignmentMessage(project, people, conflict)}`);
    lines.push("小画桌已把项目切到待确认，并加入“确认多方意见优先级”的任务。");
    project.portfolio.process = appendSentence(project.portfolio.process, `多方意见对齐：${analysis.text}`);
    return lines.join("\n");
  }

  function collectStakeholderConflictItems(state, project, analysis) {
    const stored = state.feedback.filter((item) => item.projectId === project.id && !item.handled);
    const promptItems = extractFeedbackClauses(analysis.text).map((clause) => {
      const detected = detectFeedback(clause);
      return {
        id: uid("f-temp"),
        projectId: project.id,
        from: detectPeople(clause) || "本次输入",
        raw: clause,
        action: detected ? detected.action : "先确认这条意见对应的目标和修改范围。",
        reason: detected ? detected.reason : "多方意见需要先拆清判断依据。",
        conflict: detected ? detected.conflict : false,
        handled: false,
      };
    });
    return stored.concat(promptItems);
  }

  function extractStakeholders(text, feedbackItems) {
    const fromText = ["老板", "客户", "主管", "甲方", "运营", "产品", "市场", "同事"].filter((person) => text.includes(person));
    const fromFeedback = feedbackItems.map((item) => item.from).filter((from) => from && !/待补充|本次输入/.test(from));
    return Array.from(new Set(fromText.concat(fromFeedback))).slice(0, 6);
  }

  function summarizeStakeholderConflict(project, text, feedbackItems) {
    if (/高级.*活泼|活泼.*高级/.test(text)) return "调性冲突：高级质感和年轻活泼需要确认哪个优先。";
    if (/放大|突出|都要|全部/.test(text)) return "信息优先级冲突：不同人都希望自己的信息更突出。";
    if (/重做|方向|风格/.test(text)) return "方向判断冲突：需要确认最终判断标准和拍板人。";
    const actions = feedbackItems.map((item) => item.action).filter(Boolean);
    if (actions.length) return actions.slice(0, 3).join("；");
    if (project.goal && !/待补充|待从/.test(project.goal)) return `多方意见需要回到项目目标「${project.goal}」判断。`;
    return "多方意见不一致，需要先确定目标、优先级和最终拍板人。";
  }

  function addStakeholderAlignmentTask(state, project, people, now = new Date()) {
    const title = `确认多方意见优先级：${people.length ? people.slice(0, 3).join("、") : project.name}`;
    const exists = state.tasks.some((task) => task.projectId === project.id && task.status !== "done" && task.title === title);
    if (exists) return;
    state.tasks.push({
      id: uid("t"),
      projectId: project.id,
      title,
      priority: project.dueDate && daysUntil(project.dueDate, now) <= 1 ? "high" : "normal",
      dueDate: project.dueDate || "",
      status: "todo",
      nextAction: "先确认最终拍板人、主目标和必须保留的信息，再继续改稿。",
      feedbackIds: [],
    });
  }

  function buildStakeholderDecisionOrder(project, text) {
    const order = [
      "先看项目目标：哪条意见更能帮助用户完成目标，就优先保留。",
      "再看使用场景：社媒先保小屏可读，印刷先保规格和交付安全。",
      "再看拍板权：客户/甲方定商业目标，内部负责人定执行取舍。",
      "最后看审美偏好：高级、活泼、精致这类词必须转成具体动作后再改。",
    ];
    if (project.goal && !/待补充|待从/.test(project.goal)) order.unshift(`当前目标是「${project.goal}」，先用它过滤意见。`);
    if (/今天|明天|马上|下班前/.test(text) || (project.dueDate && daysUntil(project.dueDate) <= 1)) {
      order.push("时间很紧时，只处理影响目标和交付的意见，主观细节先后置。");
    }
    return Array.from(new Set(order)).slice(0, 5);
  }

  function buildStakeholderAlignmentQuestions(project, text, people) {
    const target = people.length ? people.join("和") : "相关方";
    const questions = [
      `这轮最终拍板以谁为准：${target}，还是需要共同确认？`,
      "这张图最重要的目标是什么：促销转化、品牌形象、信息通知，还是报名/扫码？",
      "哪些信息是必须保留，哪些只是希望更明显？",
      "如果只能优先满足一条反馈，哪条最影响上线或交付？",
    ];
    if (/高级|活泼|年轻|稳重|大气|可爱/.test(text)) questions.push("调性优先级是什么？例如高级质感优先，还是年轻传播优先？");
    if ((project.risks || []).some((risk) => /尺寸|规格|交付格式/.test(risk))) questions.push("尺寸、平台和交付格式是否已经确定，避免按错误限制改稿？");
    return questions.slice(0, 6);
  }

  function buildStakeholderTradeoffs(project, text, feedbackItems) {
    const tradeoffs = [];
    if (/高级|质感/.test(text)) tradeoffs.push("如果优先高级质感：减少颜色和装饰，强化留白、秩序和素材质量。");
    if (/活泼|年轻|传播/.test(text)) tradeoffs.push("如果优先年轻传播：放大标题节奏，加一个跳色或视觉锚点，但要保可读性。");
    if (/放大|突出|都要|全部/.test(text)) tradeoffs.push("如果大家都要突出：只能让一个主信息最大，其余改成标签、分组或二级信息。");
    if (feedbackItems.some((item) => /尺寸|格式|规格|交付/.test(`${item.raw} ${item.action}`))) {
      tradeoffs.push("交付限制类意见优先级高于审美偏好，否则容易返工。");
    }
    if (!tradeoffs.length) tradeoffs.push("先做一版“目标优先稿”，只满足最贴目标的意见，再把其他意见标为可选优化。");
    return Array.from(new Set(tradeoffs)).slice(0, 5);
  }

  function buildStakeholderAlignmentMessage(project, people, conflict) {
    const target = people.length ? people.join("、") : "各位";
    const goal = project.goal && !/待补充|待从/.test(project.goal) ? `这张图的目标是「${project.goal}」` : "我想先确认这张图的核心目标";
    return `${target}，我整理了一下目前的反馈，主要冲突是：${conflict}。${goal}，所以我建议先确认最终优先级和拍板标准：哪些必须改、哪些可以作为风格优化后置。确认后我会按同一个方向统一调整，避免把不同意见平均塞进画面导致返工。`;
  }

  function decomposeBrief(state, project, analysis, now = new Date()) {
    if (analysis.deliverables.length) {
      project.deliverables = Array.from(new Set(project.deliverables.concat(analysis.deliverables)));
    }
    applyProjectMeta(state, project, analysis.meta);
    applyBriefFields(project, analysis.brief);
    if (analysis.dueDate) {
      project.dueDate = analysis.dueDate;
      applyDeadlineToOpenTasks(state, project, analysis.dueDate);
    }
    project.status = "designing";
    project.risks = rebuildProjectRisks(project, analysis);
    retireFirstPromptTask(state, project, analysis);
    addBriefClarificationTask(state, project, now);

    const known = buildBriefKnownFacts(project);
    const missing = getMissingProjectFields(project);
    const lines = [`Brief 拆解：${project.name}`];
    lines.push(`一句话目标：${buildBriefOneLiner(project)}`);
    lines.push("已明确：");
    known.forEach((item) => lines.push(`- ${item}`));
    lines.push("还缺：");
    (missing.length ? missing : ["关键 Brief 信息基本够用，下一步可以做信息层级草稿。"]).forEach((item) => lines.push(`- ${item}`));
    lines.push("先问清：");
    buildBriefClarifyingQuestions(project, analysis).forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("第一步动作：");
    buildBriefFirstActions(project, analysis, now).forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("判断标准：先让这张图回答“谁看、在哪看、看完要做什么”，再谈风格和好不好看。");
    project.portfolio.problem = project.portfolio.problem || "需求信息零散，需要先拆清目标、受众、场景和交付限制。";
    project.portfolio.strategy = project.portfolio.strategy || "先整理 Brief，再建立信息层级和视觉方向。";
    project.portfolio.process = appendSentence(project.portfolio.process, `Brief 拆解：${analysis.text}`);
    project.portfolioScore = scorePortfolio({
      deliverables: project.deliverables,
      feedbackCount: state.feedback.filter((item) => item.projectId === project.id).length,
      hasProcess: Boolean(project.portfolio.process),
    });
    return lines.join("\n");
  }

  function buildBriefKnownFacts(project) {
    const facts = [];
    facts.push(`项目类型：${project.type || "设计项目"}`);
    if (project.goal && !/待补充|待从/.test(project.goal)) facts.push(`目标：${project.goal}`);
    if (project.audience && !/待补充/.test(project.audience)) facts.push(`受众：${project.audience}`);
    if (project.scene && !/待补充/.test(project.scene)) facts.push(`使用场景：${project.scene}`);
    if ((project.deliverables || []).length) facts.push(`交付物：${project.deliverables.join("、")}`);
    if (project.dueDate) facts.push(`截止时间：${project.dueDate}`);
    if ((project.specs || []).length) facts.push(`尺寸规格：${project.specs.join("、")}`);
    if ((project.formats || []).length) facts.push(`交付格式：${project.formats.join("、")}`);
    return facts.slice(0, 8);
  }

  function buildBriefOneLiner(project) {
    const audience = project.audience && !/待补充/.test(project.audience) ? project.audience : "目标受众";
    const scene = project.scene && !/待补充/.test(project.scene) ? project.scene : "使用场景";
    const goal = project.goal && !/待补充|待从/.test(project.goal) ? project.goal : "看懂核心信息并产生下一步动作";
    const deliverable = (project.deliverables || [])[0] || project.type || "这张图";
    return `给${audience}在${scene}看到的${deliverable}，目标是${goal}。`;
  }

  function buildBriefClarifyingQuestions(project, analysis) {
    const questions = [];
    if (!project.goal || /待补充|待从/.test(project.goal)) questions.push("这张图最重要要解决什么：通知、促销、拉新、报名，还是品牌形象？");
    if (!project.audience || /待补充/.test(project.audience)) questions.push("主要给谁看？年龄/身份/熟悉品牌程度是什么？");
    if (!project.scene || /待补充/.test(project.scene)) questions.push("它会出现在哪里：小红书、公众号、朋友圈、门店、展架，还是印刷物？");
    if (!(project.deliverables || []).length) questions.push("最后要交哪些图？每张图的用途是否一样？");
    if (!(project.specs || []).length) questions.push("尺寸、平台安全区和是否需要出血是什么？");
    if (!(project.formats || []).length) questions.push("最终交付格式要 JPG/PNG/PDF，还是还要源文件？");
    if (!project.dueDate) questions.push("什么时候要给第一版，什么时候最终交付？");
    if (/年轻|高级|活泼|大气|可爱|科技|质感/.test(analysis.text)) questions.push("这些风格词里哪个最优先？如果冲突，谁拍板？");
    return questions.slice(0, 6);
  }

  function buildBriefFirstActions(project, analysis, now) {
    const actions = [];
    const missing = getMissingProjectFields(project);
    if (missing.length) actions.push(`先补齐 ${missing.slice(0, 3).join("、")}，不要直接开始精修。`);
    actions.push("把信息按重要性排队：必须第一眼看到、第二眼看到、可弱化。");
    actions.push("先做黑白线框或低保真草稿，确认信息顺序，再找参考和定风格。");
    if ((project.deliverables || []).length >= 2) actions.push("多交付物先定主尺寸，再把结构适配到其他尺寸，不要每张都从零排。");
    if (project.dueDate && daysUntil(project.dueDate, now) <= 1) actions.push("时间紧时先交一版清楚可读稿，复杂质感和第二方向后置。");
    return Array.from(new Set(actions)).slice(0, 5);
  }

  function addBriefClarificationTask(state, project, now = new Date()) {
    const missing = getMissingProjectFields(project);
    if (!missing.length) return;
    const title = `补齐 Brief：${missing.slice(0, 3).join("、")}`;
    const exists = state.tasks.some((task) => task.projectId === project.id && task.status !== "done" && task.title === title);
    if (exists) return;
    state.tasks.push({
      id: uid("t"),
      projectId: project.id,
      title,
      priority: project.dueDate && daysUntil(project.dueDate, now) <= 1 ? "high" : "normal",
      dueDate: project.dueDate || "",
      status: "todo",
      nextAction: "把目标、受众、使用场景、交付物、尺寸和格式问清楚，再开始精修。",
      feedbackIds: [],
    });
  }

  function handleScopeChange(state, project, analysis, now = new Date()) {
    const previousDeliverables = project.deliverables.slice();
    const addedDeliverables = analysis.deliverables.filter((item) => !previousDeliverables.includes(item));
    if (addedDeliverables.length) {
      project.deliverables = Array.from(new Set(project.deliverables.concat(addedDeliverables)));
    }
    applyProjectMeta(state, project, analysis.meta);
    if (analysis.dueDate) {
      project.dueDate = analysis.dueDate;
      applyDeadlineToOpenTasks(state, project, analysis.dueDate);
    }
    project.status = "designing";
    const risk = buildScopeChangeRisk(analysis, addedDeliverables);
    if (risk && !project.risks.includes(risk)) project.risks.push(risk);
    addScopeChangeTask(state, project, analysis, addedDeliverables, now);

    const lines = [`需求变更评估：${project.name}`];
    lines.push(`变更内容：${describeScopeChange(analysis, addedDeliverables)}`);
    lines.push("对工作流的影响：");
    buildScopeChangeImpacts(project, analysis, addedDeliverables, now).forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("先确认：");
    buildScopeChangeQuestions(project, analysis, addedDeliverables).forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("调整后的推进顺序：");
    buildScopeChangeNextSteps(project, analysis, addedDeliverables).forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("可以对外这样说：");
    lines.push(`- ${buildScopeChangeReply(project, analysis, addedDeliverables)}`);
    lines.push("小画桌已把这次变更写进项目记录，并放进今天要处理的任务里。");
    project.portfolio.process = appendSentence(project.portfolio.process, `需求变更：${analysis.text}`);
    project.portfolioScore = scorePortfolio({
      deliverables: project.deliverables,
      feedbackCount: state.feedback.filter((item) => item.projectId === project.id).length,
      hasProcess: Boolean(project.portfolio.process),
    });
    return lines.join("\n");
  }

  function buildScopeChangeRisk(analysis, addedDeliverables) {
    if (/重做|重新来|推翻|方向变|换方向/.test(analysis.text)) return "需求方向发生变更，需要重新确认目标和验收标准";
    if (addedDeliverables.length) return "新增交付物会影响排期，需要确认是否压缩精修范围";
    if (analysis.dueDate) return "截止时间发生变化，需要重新评估交付范围";
    return "需求有变更，需要确认范围、优先级和截止时间";
  }

  function addScopeChangeTask(state, project, analysis, addedDeliverables, now) {
    const title = `处理需求变更：${addedDeliverables.length ? addedDeliverables.join("、") : "确认范围和优先级"}`;
    const exists = state.tasks.some((task) => task.projectId === project.id && task.status !== "done" && task.title === title);
    if (exists) return;
    const dueDate = analysis.dueDate || project.dueDate || "";
    state.tasks.push({
      id: uid("t"),
      projectId: project.id,
      title,
      priority: /今天|马上|立刻|下班前|来不及|赶/.test(analysis.text) || (dueDate && daysUntil(dueDate, now) <= 1) ? "high" : "normal",
      dueDate,
      status: "todo",
      nextAction: "先确认变更范围、截止时间和交付格式，再决定保留什么、压缩什么。",
      feedbackIds: [],
    });
  }

  function describeScopeChange(analysis, addedDeliverables) {
    const parts = [];
    if (addedDeliverables.length) parts.push(`新增交付物：${addedDeliverables.join("、")}`);
    if (/重做|重新来|推翻/.test(analysis.text)) parts.push("原方向可能被推翻，需要重新定方向");
    else if (/方向变|换方向|换成|改成/.test(analysis.text)) parts.push("设计方向或要求发生调整");
    if (analysis.dueDate) parts.push(`截止时间调整为 ${analysis.dueDate}`);
    if (!parts.length) parts.push("需求范围发生变化，需要先拆清楚");
    return parts.join("；");
  }

  function buildScopeChangeImpacts(project, analysis, addedDeliverables, now) {
    const impacts = [];
    if (addedDeliverables.length) {
      impacts.push(`交付物从 ${Math.max(1, project.deliverables.length - addedDeliverables.length)} 项变为 ${project.deliverables.length} 项，导出、适配和检查时间都会增加。`);
    }
    if (/重做|重新来|推翻|方向变|换方向/.test(analysis.text)) {
      impacts.push("如果方向变了，旧稿不应直接精修，要先判断哪些结构、素材和信息还能复用。");
    }
    if (project.dueDate) {
      const days = daysUntil(project.dueDate, now);
      impacts.push(days <= 1 ? "时间已经很紧，优先交可读、可解释的一版，复杂质感和第二方案后置。" : `距离截止还有 ${days} 天，可以先排范围确认，再排首版和适配。`);
    }
    if ((project.risks || []).some((risk) => /尺寸|规格|交付格式/.test(risk))) {
      impacts.push("当前尺寸或交付格式还没完全确认，直接开做会放大返工。");
    }
    return impacts.length ? impacts.slice(0, 4) : ["这次变更会影响范围、时间和验收标准，先确认再动大稿。"];
  }

  function buildScopeChangeQuestions(project, analysis, addedDeliverables) {
    const questions = [];
    if (addedDeliverables.length) questions.push(`新增的 ${addedDeliverables.join("、")} 是否和原稿共用同一套主视觉？`);
    questions.push("这次变更是必须今天完成，还是可以先给一版确认方向？");
    questions.push("原来的目标、受众和主文案是否保持不变？");
    if (!(project.specs || []).length && addedDeliverables.length) questions.push("每个新增物料的尺寸、安全区和导出格式是什么？");
    if (/重做|重新来|方向变|换方向|改成|换成/.test(analysis.text)) questions.push("新方向的判断标准是什么：更年轻、更高级、更促销，还是更像品牌？");
    return Array.from(new Set(questions)).slice(0, 5);
  }

  function buildScopeChangeNextSteps(project, analysis, addedDeliverables) {
    const steps = [
      "先锁范围：写清新增/改动的内容，不把它和原需求混在一起。",
      "再保主线：复用已经成立的信息层级、主视觉或素材，避免从零开始。",
      "然后做最小可交付版：先完成主尺寸，再适配新增物料。",
      "最后补交付检查：尺寸、安全区、命名、导出格式和源文件分层一起看。",
    ];
    if (/重做|重新来|方向变|换方向/.test(analysis.text)) {
      steps.splice(1, 0, "先做 1 张方向确认稿，不要直接把所有物料都重做。");
    }
    if (addedDeliverables.length >= 2) {
      steps.push("多个新增物料先按使用场景排序：曝光主图优先，次要延展后置。");
    }
    return steps.slice(0, 5);
  }

  function buildScopeChangeReply(project, analysis, addedDeliverables) {
    const deadline = project.dueDate ? `，目前截止时间是 ${project.dueDate}` : "";
    const added = addedDeliverables.length ? `新增 ${addedDeliverables.join("、")}` : "这次需求调整";
    const uncertain = currentProjectRisks(project).filter((risk) => /尺寸|规格|交付格式|目标|截止/.test(risk));
    const confirm = uncertain.length ? `我还需要确认 ${uncertain.slice(0, 2).join("、")}，` : "";
    return `收到，${added}会影响适配和检查时间${deadline}。${confirm}我建议先确认变更范围和优先级；如果时间不变，我会优先保证主信息清楚和主尺寸交付，细节精修放到方向确认后继续补。`;
  }

  function currentProjectRisks(project) {
    return (project.risks || []).filter((risk) => {
      if (/设计目标/.test(risk) && project.goal && !/待补充|待从/.test(project.goal)) return false;
      if (/交付物/.test(risk) && (project.deliverables || []).length) return false;
      if (/截止时间/.test(risk) && project.dueDate) return false;
      if (/尺寸|规格/.test(risk) && (project.specs || []).length) return false;
      if (/交付格式/.test(risk) && (project.formats || []).length) return false;
      return true;
    });
  }

  function generateConfirmationMessage(state, project, promptText = "") {
    const waitingTasks = state.tasks.filter((task) => task.projectId === project.id && task.status === "waiting");
    const projectFeedback = state.feedback.filter((item) => item.projectId === project.id);
    const conflictFeedback = projectFeedback.filter((item) => item.conflict && !item.handled);
    const missingQuestions = buildMissingConfirmationQuestions(project);
    const waitingQuestions = waitingTasks.map((task) => task.nextAction || task.title).filter(Boolean);
    const conflictQuestions = buildConflictConfirmationQuestions(project, conflictFeedback);
    const promptQuestions = buildPromptConfirmationQuestions(promptText);
    const questions = Array.from(new Set(promptQuestions.concat(waitingQuestions, conflictQuestions, missingQuestions))).slice(0, 5);
    const recipient = guessConfirmationRecipient(promptText, projectFeedback);
    const greeting = recipient === "你好" ? "你好" : `${recipient}好`;
    const opener = waitingTasks.length || /催/.test(promptText)
      ? `${greeting}，我这边想轻轻跟进一下「${project.name}」的确认信息，避免影响后面的设计和交付。`
      : `${greeting}，我这边想先确认一下「${project.name}」的几个信息，避免后面返工。`;
    const fallback = "这次最优先解决的问题是什么：拉新、促销、品牌形象，还是通知信息？";
    const lines = [`确认话术：${project.name}`, opener];
    (questions.length ? questions : [fallback]).forEach((question, index) => {
      lines.push(`${index + 1}. ${question}`);
    });
    lines.push("确认后我会先按这个方向推进首版，有不确定的地方会再同步给你。");
    if (conflictFeedback.length) {
      lines.push("我建议先确认调性优先级，再开始大改，这样更省时间。");
    }
    return lines.join("\n");
  }

  function buildMissingConfirmationQuestions(project) {
    const questions = [];
    const risks = project.risks.join("、");
    if (!project.goal || /待补充|待从/.test(project.goal) || /设计目标/.test(risks)) {
      questions.push("这次设计最重要的目标是什么？是提升点击、传达活动信息、还是强化品牌感？");
    }
    if (!project.audience || /待补充/.test(project.audience)) {
      questions.push("主要给谁看？比如新客、老客、年轻用户、儿童家庭，还是内部同事？");
    }
    if (!project.scene || /待补充/.test(project.scene)) {
      questions.push("主要投放在哪里？不同平台会影响尺寸、安全区和文字大小。");
    }
    if (!(project.deliverables || []).length || /交付物/.test(risks)) {
      questions.push("最后需要交哪些图？例如海报、公众号头图、小红书封面、朋友圈图或源文件。");
    }
    if (!project.dueDate || /截止时间/.test(risks)) {
      questions.push("最晚什么时候需要确认或交付？如果有内部审核时间，也请一起告诉我。");
    }
    if (!(project.specs || []).length || /尺寸|规格/.test(risks)) {
      questions.push("每个交付物的尺寸、平台规格和安全区是否有固定要求？");
    }
    if (!(project.formats || []).length || /交付格式/.test(risks)) {
      questions.push("导出格式需要哪些？例如 jpg、png、pdf、ai/psd 源文件。");
    }
    return questions;
  }

  function buildConflictConfirmationQuestions(project, conflictFeedback) {
    const questions = [];
    const hasConflictRisk = project.risks.some((risk) => /冲突|优先级/.test(risk));
    if (hasConflictRisk || conflictFeedback.length) {
      questions.push("目前反馈里有不同调性方向，我想确认优先级：更重视高级质感，还是更重视年轻活泼和传播感？");
    }
    return questions;
  }

  function buildPromptConfirmationQuestions(text) {
    const questions = [];
    if (/尺寸|规格/.test(text)) questions.push("尺寸和平台规格能否发我一下？我会按对应安全区来做，避免裁切。");
    if (/格式|源文件|导出/.test(text)) questions.push("交付格式需要哪些？只要图片，还是也需要源文件一起打包？");
    if (/反馈|意见/.test(text)) questions.push("方便的话能否给我一个明确反馈方向：哪里需要保留，哪里需要调整？");
    if (/优先级|冲突|高级|活泼/.test(text)) questions.push("如果两个方向不能同时兼顾，这一版更优先哪一个：品牌质感，还是活泼传播？");
    if (/催|没回|没回复/.test(text)) questions.push("这边需要继续推进下一步，想确认是否按当前方向先做首版？");
    return questions;
  }

  function guessConfirmationRecipient(text, feedbackItems) {
    if (/客户|甲方/.test(text)) return "客户";
    if (/老板/.test(text)) return "老板";
    if (/主管/.test(text)) return "主管";
    if (/运营/.test(text)) return "运营同事";
    if (/产品/.test(text)) return "产品同事";
    const latestFeedbackPerson = feedbackItems.slice().reverse().find((item) => item.from && !/待补充/.test(item.from));
    return latestFeedbackPerson ? latestFeedbackPerson.from : "你好";
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
    decomposeBrief,
    planDesignConcepts,
    generateImagePromptBrief,
    generateProjectRetrospective,
    recordProjectOutcome,
    generateGrowthProfile,
    generateProjectWorkflow,
    generateConfirmationMessage,
    clarifyVagueFeedback,
    alignStakeholderFeedback,
    synthesizeFeedbackBatch,
    summarizeVersionChanges,
    handleScopeChange,
    answerDesignQuestion,
    auditAssetLicense,
    generateTriagePlan,
    negotiateDeadlineScope,
    reportProgressStatus,
    estimateDesignWorkload,
    prepareFeedbackRequest,
    refineCopywriting,
    optimizeActionPath,
    organizeInformationHierarchy,
    optimizeReadability,
    simulateDesignDefense,
    generatePresentationScript,
    handleNegativeFeedback,
    diagnoseAmbiguousIssue,
    integrateCompositeAssets,
    fixAssetQuality,
    guideDesignSoftwareOperation,
    requestMissingAssets,
    negotiateReferenceSimilarity,
    analyzeReference,
    unifySeriesVisualSystem,
    organizeDeliveryFiles,
    prepareDesignHandoff,
    guidePrintPrepress,
    recommendPlatformSpecs,
    adaptMultiFormat,
    checkBrandConsistency,
    optimizeLogoExposure,
    optimizeAlignmentSpacing,
    balanceVisualDensity,
    separateSubjectBackground,
    strengthenVisualImpact,
    improveVisualPolish,
    guideVisualEffect,
    recommendLayoutStructure,
    recommendTypographySystem,
    recommendColorSystem,
    translateStyleKeyword,
    generateDesignDirections,
    compareDesignOptions,
    generateReview,
    generatePortfolioCase,
    daysUntil,
  };
});
