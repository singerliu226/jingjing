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
    if (/汇报|提案|讲方案|讲这个方案|方案.*怎么讲|设计说明|解释.*(设计|方案)|说服|怎么跟.*讲|给老板看.*说|发给老板.*说/.test(text)) {
      return "prepare_design_presentation";
    }
    if (/自检|帮我看看|提交前|会被问|检查一下|哪里有问题/.test(text)) return "ask_review";
    if (/话术|怎么问|怎么说|帮我问|帮我整理.*确认|催一下|催.*(反馈|确认|回复)|没回.*怎么|没回复.*怎么/.test(text)) {
      return "ask_confirmation_message";
    }
    if (/来不及|赶不完|太多了|任务太多|很乱|乱成|焦虑|崩溃|不知道先做哪个|老板.*催|客户.*催|马上要|今天.*交.*还没/.test(text)) {
      return "triage_overload";
    }
    if (/任务.*(延后|延期|推迟|改到)|延后到|延期到|推迟到/.test(text) && analysisBits.dueDate) return "snooze_task";
    if (/取消|删除|不用做|不用了|先不做|撤掉/.test(text)) return "cancel_task";
    if (/交付检查.*(完成|勾完|都好了)|检查项.*(完成|勾完|都好了)/.test(text)) return "complete_checklist";
    if (/源文件.*(整理|打包|命名)|文件.*(整理|命名|打包|太乱)|怎么.*(命名|打包|整理).*文件|交付包|命名规范|文件夹/.test(text)) {
      return "organize_delivery_files";
    }
    if (/交付检查|导出检查|检查.*(出血|转曲|源文件|打包)|清单/.test(text)) return "ask_checklist";
    if (
      /(尺寸|规格|比例|像素|安全区|导出尺寸|画布|多大|做多大)/.test(text) &&
      /(多少|多大|怎么设|怎么定|用什么|应该|建议|比例|安全区)/.test(text) &&
      !/适配|横版.*竖版|竖版.*横版|裁切|改成/.test(text)
    ) {
      return "recommend_platform_specs";
    }
    if (/作品集|归档|面试|复盘|案例/.test(text)) return "ask_portfolio";
    if (/(v|V)\s*\d+|第[一二三四五六七八九十\d]+版|版本/.test(text)) return "record_version";
    if (/素材|图片|照片|图太糊|太糊|清晰度|分辨率|抠图|扣图|边缘|锯齿|水印|找不到图|没有合适的图|素材不统一|图片风格不统一/.test(text)) {
      return "fix_asset_quality";
    }
    if (
      /适配|改尺寸|多尺寸|多平台|一稿多|横版.*竖版|竖版.*横版|安全区|裁切|公众号头图|朋友圈海报|小红书封面|banner.*尺寸|Banner.*尺寸/.test(text) &&
      /怎么|如何|改|适配|生成|做|处理/.test(text) &&
      !/新项目|创建项目|客户要|最后要交|需要.*(海报|头图|封面|包装|banner|PPT)|字太多|看不清|画面乱|太乱|层级|颜色|字体/.test(text)
    ) {
      return "adapt_multi_format";
    }
    if (/品牌规范|视觉规范|VI|vi|品牌色|品牌字体|logo.*使用|Logo.*使用|不符合品牌|不像品牌|品牌一致|调性统一|品牌调性/.test(text)) {
      return "check_brand_consistency";
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
    if (/不行|重做|推翻|被否|否了|毙了|很怪|丑|不好看|完全不对|方向不对/.test(text) && /老板|客户|主管|甲方|说|反馈|觉得/.test(text)) {
      return "handle_negative_feedback";
    }
    if (/不对劲|有点怪|怪怪的|不舒服|不协调|不太对|说不上来|不知道哪里|看着不行|感觉不对/.test(text)) {
      return "diagnose_ambiguous_issue";
    }
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
      "ask_review",
      "ask_checklist",
      "ask_portfolio",
      "ask_confirmation_message",
      "answer_design_question",
      "ask_design_directions",
      "compare_design_options",
      "triage_overload",
      "refine_copywriting",
      "prepare_design_presentation",
      "handle_negative_feedback",
      "diagnose_ambiguous_issue",
      "fix_asset_quality",
      "organize_delivery_files",
      "recommend_platform_specs",
      "adapt_multi_format",
      "check_brand_consistency",
      "guide_visual_effect",
      "recommend_layout_structure",
      "recommend_typography_system",
      "recommend_color_system",
      "translate_style_keyword",
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
    if (analysis.behavior === "ask_confirmation_message") return generateConfirmationMessage(state, project, analysis.text);
    if (analysis.behavior === "answer_design_question") return answerDesignQuestion(project, analysis);
    if (analysis.behavior === "ask_design_directions") return generateDesignDirections(project, analysis);
    if (analysis.behavior === "compare_design_options") return compareDesignOptions(project, analysis);
    if (analysis.behavior === "triage_overload") return generateTriagePlan(state, project, analysis, now);
    if (analysis.behavior === "refine_copywriting") return refineCopywriting(project, analysis);
    if (analysis.behavior === "prepare_design_presentation") return generatePresentationScript(state, project, analysis);
    if (analysis.behavior === "handle_negative_feedback") return handleNegativeFeedback(state, project, analysis, now);
    if (analysis.behavior === "diagnose_ambiguous_issue") return diagnoseAmbiguousIssue(project, analysis);
    if (analysis.behavior === "fix_asset_quality") return fixAssetQuality(project, analysis);
    if (analysis.behavior === "organize_delivery_files") return organizeDeliveryFiles(project, analysis);
    if (analysis.behavior === "recommend_platform_specs") return recommendPlatformSpecs(project, analysis);
    if (analysis.behavior === "adapt_multi_format") return adaptMultiFormat(project, analysis);
    if (analysis.behavior === "check_brand_consistency") return checkBrandConsistency(project, analysis);
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
    const lines = [`品牌一致性检查：${project.name}`];
    lines.push("先别只看单张图好不好看，先看它有没有像同一个品牌。按这个顺序检查：");
    buildBrandChecks(project, text).forEach((item, index) => {
      lines.push(`${index + 1}. ${item}`);
    });
    lines.push("修正顺序：");
    lines.push("- 先固定 Logo 使用方式和安全距离，再调版式。");
    lines.push("- 再收敛品牌色和辅助色，不要随手加新颜色。");
    lines.push("- 最后统一字体、图标、线条、插画或素材处理方式。");
    lines.push("需要确认：是否有品牌手册、标准色值、指定字体、Logo 禁用规则和历史模板。");
    lines.push("判断标准：遮住 Logo 后，用户仍然能从色彩、字体、图形语言感到这是同一个品牌。");
    project.portfolio.process = appendSentence(project.portfolio.process, `品牌一致性检查：${analysis.text}`);
    return lines.join("\n");
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

  function shouldCreateTask(analysis) {
    if (
      [
        "ask_plan",
        "ask_summary",
        "ask_review",
        "ask_checklist",
        "ask_portfolio",
        "ask_confirmation_message",
        "answer_design_question",
        "ask_design_directions",
        "compare_design_options",
        "triage_overload",
        "refine_copywriting",
        "prepare_design_presentation",
        "handle_negative_feedback",
        "diagnose_ambiguous_issue",
        "fix_asset_quality",
        "organize_delivery_files",
        "recommend_platform_specs",
        "adapt_multi_format",
        "check_brand_consistency",
        "guide_visual_effect",
        "recommend_layout_structure",
        "recommend_typography_system",
        "recommend_color_system",
        "translate_style_keyword",
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

  function buildDeliveryBottomLine(project, urgent) {
    const social = /小红书|朋友圈|公众号|社媒|封面|头图|Banner/i.test(`${project.type} ${(project.deliverables || []).join("、")}`);
    const print = /印刷|包装|画册|折页/.test(`${project.type} ${(project.deliverables || []).join("、")}`);
    if (print) return "尺寸、出血、CMYK、图片精度和文字转曲不能漏；视觉细节可以后补。";
    if (social) return "手机预览里主标题、利益点、主体图必须清楚，细碎说明先删或弱化。";
    if (urgent) return "主信息清楚、尺寸正确、可导出，比多做一个风格更重要。";
    return "先保证目标、主信息、尺寸和格式正确，再优化风格细节。";
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
    generateProjectWorkflow,
    generateConfirmationMessage,
    answerDesignQuestion,
    generateTriagePlan,
    refineCopywriting,
    generatePresentationScript,
    handleNegativeFeedback,
    diagnoseAmbiguousIssue,
    fixAssetQuality,
    organizeDeliveryFiles,
    recommendPlatformSpecs,
    adaptMultiFormat,
    checkBrandConsistency,
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
