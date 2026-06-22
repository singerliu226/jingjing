const assert = require("node:assert/strict");
const Core = require("./core.js");

const fixedNow = new Date("2026-06-12T09:00:00+08:00");

function freshState() {
  return Core.createSeedState(fixedNow);
}

{
  const state = freshState();
  const analysis = Core.analyzeInput("主管说海报颜色太暗，要更年轻一点，明天下午前改。", state, fixedNow);
  assert.equal(analysis.feedback.conflict, false);
  assert.equal(analysis.from, "主管");
  assert.equal(analysis.dueDate, "2026-06-13");
  assert.equal(analysis.behavior, "record_feedback");
  assert.ok(analysis.feedback.action.includes("提高整体明度"));
}

{
  const state = freshState();
  const before = state.projects.length;
  Core.applyInput(state, "新项目「秋季新品」客户要公众号头图、朋友圈海报和小红书封面，明天交。", fixedNow);
  assert.equal(state.projects.length, before + 1);
  assert.equal(state.projects[0].name, "秋季新品");
  assert.ok(state.projects[0].deliverables.includes("公众号头图"));
  assert.ok(state.checklist.some((item) => item.projectId === state.projects[0].id));
  assert.equal(state.messages.at(-2).projectId, state.projects[0].id);
}

{
  const state = freshState();
  Core.applyInput(state, "老板希望画面更高级也更活泼，今天下班前改。", fixedNow);
  const active = Core.getProject(state, state.activeProjectId);
  assert.ok(active.risks.includes("反馈调性可能冲突，需要确认优先级"));
  assert.ok(state.feedback.at(-1).conflict);
}

{
  const state = freshState();
  Core.applyInput(state, "主管说海报颜色太暗，要更年轻一点，明天下午前改。", fixedNow);
  const active = Core.getProject(state, state.activeProjectId);
  assert.ok(!active.risks.includes("缺少交付物清单"));
  assert.ok(!active.risks.includes("缺少截止时间"));
  assert.equal(state.tasks.find((task) => task.id === "t-first").status, "done");
  assert.ok(Core.getDashboard(state, fixedNow).today.some((task) => task.title.startsWith("处理反馈")));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.dueDate = "2026-06-14";
  project.goal = "让用户一眼知道活动优惠和报名入口。";
  project.deliverables = ["朋友圈海报"];
  project.risks = [];
  Core.applyInput(state, "反馈：画面太普通，希望更高级一点。", fixedNow);
  assert.ok(!project.risks.includes("缺少截止时间"));
  assert.equal(state.tasks.at(-1).dueDate, "2026-06-14");
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "春季活动海报";
  project.type = "海报";
  project.dueDate = "2026-06-14";
  project.goal = "让用户一眼知道活动优惠和报名入口。";
  project.deliverables = ["朋友圈海报", "公众号头图"];
  project.risks = [];
  const workflow = Core.generateProjectWorkflow(project, fixedNow);
  assert.equal(workflow.ready, true);
  assert.ok(workflow.summary.includes("春季活动海报"));
  assert.ok(workflow.tasks.some((task) => task.key === "draft" && task.title.includes("朋友圈海报")));
  assert.ok(workflow.tasks.every((task) => task.dueDate === "2026-06-14"));
}

{
  const state = freshState();
  Core.applyInput(state, "我已经完成最终交付。", fixedNow);
  assert.equal(Core.getProject(state, state.activeProjectId).status, "done");
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  Core.applyInput(state, "这个项目目标是让用户知道优惠，受众是年轻女性，投放在小红书和朋友圈。", fixedNow);
  assert.equal(project.goal, "用户知道优惠");
  assert.equal(project.audience, "年轻女性");
  assert.equal(project.scene, "小红书和朋友圈");
  assert.ok(!project.risks.includes("缺少设计目标"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.goal = "让用户一眼看懂活动优惠。";
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "画面太乱信息太多，我不知道怎么改。", fixedNow);
  assert.equal(result.analysis.behavior, "solve_design_issue");
  assert.ok(result.reply.includes("设计卡点"));
  assert.ok(result.reply.includes("主标题"));
  assert.ok(result.reply.includes("下一步"));
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(project.portfolio.process.includes("设计卡点"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "颜色有点乱，也不够年轻，怎么优化？", fixedNow);
  assert.equal(result.analysis.behavior, "recommend_color_system");
  assert.ok(result.reply.includes("配色系统建议"));
  assert.ok(result.reply.includes("主色"));
  assert.ok(result.reply.includes("明度"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.type = "社媒图";
  project.deliverables = ["小红书封面"];
  project.dueDate = "2026-06-13";
  const result = Core.applyInput(state, "小红书封面字太多，看不清，怎么改？", fixedNow);
  assert.equal(result.analysis.behavior, "optimize_readability");
  assert.ok(result.reply.includes("阅读体验诊断"));
  assert.ok(result.reply.includes("手机预览"));
  assert.ok(result.reply.includes("阅读密度问题"));
  assert.ok(result.reply.includes("可读性修正版"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.type = "包装";
  project.deliverables = ["包装"];
  const result = Core.applyInput(state, "包装画面有点乱，信息太多。", fixedNow);
  assert.equal(result.analysis.behavior, "solve_design_issue");
  assert.ok(result.reply.includes("出血"));
  assert.ok(result.reply.includes("CMYK"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "活动海报";
  project.status = "designing";
  state.tasks.push({
    id: "t-draft",
    projectId: project.id,
    title: "完成首版设计：一张海报",
    priority: "high",
    dueDate: "2026-06-13",
    status: "todo",
    nextAction: "先搭主视觉和信息层级",
    feedbackIds: [],
  });
  Core.applyInput(state, "我完成了首版设计，准备发给老板看。", fixedNow);
  assert.equal(state.tasks.find((task) => task.id === "t-draft").status, "done");
  assert.equal(project.status, "designing");
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  Core.applyInput(state, "已经发给老板看了，等反馈。", fixedNow);
  assert.equal(project.status, "waiting");
  assert.ok(state.tasks.some((task) => task.projectId === project.id && task.status === "waiting"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  const analysis = Core.analyzeInput("截止时间改到2026/06/19。", state, fixedNow);
  assert.equal(analysis.dueDate, "2026-06-19");
  assert.equal(analysis.behavior, "update_deadline");
  Core.applyInput(state, "截止时间改到2026/06/19。", fixedNow);
  assert.equal(project.dueDate, "2026-06-19");
}

{
  const state = freshState();
  const summary = Core.generateDailySummary(state, fixedNow);
  assert.ok(summary.includes("今日工作总结"));
  assert.ok(summary.includes("等待确认"));
  const plan = Core.generateDailyPlan(state, fixedNow);
  assert.ok(plan.includes("今日安排"));
  assert.ok(plan.includes("先做"));
}

{
  const state = freshState();
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "今天先做什么？", fixedNow);
  assert.equal(result.analysis.behavior, "ask_plan");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("今日安排"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  state.tasks.push({
    id: "t-cancel",
    projectId: project.id,
    title: "确认尺寸、参考和交付格式",
    priority: "high",
    dueDate: "2026-06-13",
    status: "todo",
    nextAction: "确认尺寸",
    feedbackIds: [],
  });
  const result = Core.applyInput(state, "确认尺寸这个任务先不用做了。", fixedNow);
  assert.equal(result.analysis.behavior, "cancel_task");
  assert.equal(state.tasks.find((task) => task.id === "t-cancel").status, "done");
  assert.ok(!Core.getDashboard(state, fixedNow).today.some((task) => task.id === "t-cancel"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  const result = Core.applyInput(state, "交付检查都完成了。", fixedNow);
  assert.equal(result.analysis.behavior, "complete_checklist");
  assert.ok(state.checklist.filter((item) => item.projectId === project.id).every((item) => item.done));
  assert.ok(result.reply.includes("已完成交付检查"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  const result = Core.applyInput(state, "V2 改了标题层级和按钮颜色，老板确认了。", fixedNow);
  assert.equal(result.analysis.behavior, "record_version");
  assert.equal(project.versions.at(-1).name, "V2");
  assert.ok(project.portfolio.process.includes("版本记录"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  state.tasks.push({
    id: "t-date",
    projectId: project.id,
    title: "完成首版设计",
    priority: "high",
    dueDate: "2026-06-13",
    status: "todo",
    nextAction: "做首版",
    feedbackIds: [],
  });
  Core.applyInput(state, "截止时间改到2026/06/19。", fixedNow);
  assert.equal(state.tasks.find((task) => task.id === "t-date").dueDate, "2026-06-19");
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.risks = ["缺少尺寸 / 平台规格", "缺少交付格式"];
  const result = Core.applyInput(state, "尺寸是1080x1920px，导出 png 和源文件。", fixedNow);
  assert.equal(result.analysis.behavior, "update_project_specs");
  assert.ok(project.specs.includes("1080x1920px"));
  assert.ok(project.formats.includes("png"));
  assert.ok(project.formats.includes("源文件"));
  assert.ok(!project.risks.some((risk) => /尺寸|规格|交付格式/.test(risk)));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  const result = Core.applyInput(state, "项目名改成「六一活动海报」。", fixedNow);
  assert.equal(result.analysis.behavior, "update_project_name");
  assert.equal(project.name, "六一活动海报");
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  const beforeChecklist = state.checklist.length;
  const result = Core.applyInput(state, "项目类型改成包装。", fixedNow);
  assert.equal(result.analysis.behavior, "update_project_type");
  assert.equal(project.type, "包装");
  assert.ok(state.checklist.length > beforeChecklist);
  assert.ok(state.checklist.some((item) => item.projectId === project.id && item.label.includes("CMYK")));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.status = "waiting";
  project.risks.push("等待老板确认方向");
  state.tasks.push({
    id: "t-confirm",
    projectId: project.id,
    title: "等待老板确认方向",
    priority: "high",
    dueDate: "2026-06-13",
    status: "waiting",
    nextAction: "等老板回复",
    feedbackIds: [],
  });
  const result = Core.applyInput(state, "老板确认了方向，通过了。", fixedNow);
  assert.equal(result.analysis.behavior, "clear_waiting");
  assert.equal(project.status, "designing");
  assert.equal(state.tasks.find((task) => task.id === "t-confirm").status, "done");
  assert.ok(!project.risks.some((risk) => /等待|确认/.test(risk)));
}

{
  const state = freshState();
  Core.applyInput(state, "主管说画面太暗，明天改。", fixedNow);
  const project = Core.getProject(state, state.activeProjectId);
  const feedbackTask = state.tasks.find((task) => task.projectId === project.id && /反馈|处理/.test(task.title));
  const result = Core.applyInput(state, "反馈改完了。", fixedNow);
  assert.equal(result.analysis.behavior, "mark_feedback_handled");
  assert.ok(state.feedback.filter((item) => item.projectId === project.id).every((item) => item.handled));
  assert.equal(feedbackTask.status, "done");
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  state.tasks.push({
    id: "t-snooze",
    projectId: project.id,
    title: "完成首版设计",
    priority: "high",
    dueDate: "2026-06-12",
    status: "todo",
    nextAction: "做首版",
    feedbackIds: [],
  });
  const result = Core.applyInput(state, "完成首版这个任务延后到明天。", fixedNow);
  assert.equal(result.analysis.behavior, "snooze_task");
  assert.equal(state.tasks.find((task) => task.id === "t-snooze").dueDate, "2026-06-13");
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  const portfolio = Core.generatePortfolioCase(project, state.feedback.filter((item) => item.projectId === project.id));
  assert.ok(portfolio.includes("项目归档草稿"));
  assert.ok(portfolio.includes("设计策略"));
  assert.ok(portfolio.includes("面试表达"));
}

{
  const state = freshState();
  const insights = Core.getProjectInsights(state, state.activeProjectId, fixedNow);
  assert.ok(insights.briefScore < 50);
  assert.ok(insights.nextStep.length > 0);
  assert.equal(insights.deadline, "今天截止");
  assert.ok(insights.missing.includes("设计目标"));
}

{
  const state = freshState();
  state.tasks.push({
    id: "t-note",
    projectId: state.activeProjectId,
    title: "补齐项目小纸条",
    priority: "high",
    dueDate: "",
    status: "todo",
    nextAction: "先补齐目标、截止时间和交付物",
    feedbackIds: [],
  });
  state.tasks.push({
    id: "t-wait",
    projectId: state.activeProjectId,
    title: "等待老板确认方向",
    priority: "high",
    dueDate: "",
    status: "waiting",
    nextAction: "等待确认",
    feedbackIds: [],
  });
  const dashboard = Core.getDashboard(state, fixedNow);
  assert.ok(dashboard.today.some((task) => task.id === "t-note"));
  assert.ok(!dashboard.today.some((task) => task.id === "t-wait"));
  assert.ok(dashboard.waiting.some((task) => task.id === "t-wait"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "万圣节海报";
  project.risks = ["缺少尺寸 / 平台规格", "缺少交付格式"];
  project.deliverables = ["小红书封面"];
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "帮我整理问客户确认尺寸和格式的话术。", fixedNow);
  assert.equal(result.analysis.behavior, "ask_confirmation_message");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("确认话术"));
  assert.ok(result.reply.includes("尺寸"));
  assert.ok(result.reply.includes("交付格式"));
  assert.ok(result.reply.includes("避免后面返工"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "活动主视觉";
  state.tasks.push({
    id: "t-wait-message",
    projectId: project.id,
    title: "等待老板确认方向",
    priority: "high",
    dueDate: "2026-06-13",
    status: "waiting",
    nextAction: "确认是走高级质感还是年轻活泼",
    feedbackIds: [],
  });
  const result = Core.applyInput(state, "老板还没回，帮我催一下。", fixedNow);
  assert.equal(result.analysis.behavior, "ask_confirmation_message");
  assert.ok(result.reply.includes("轻轻跟进"));
  assert.ok(result.reply.includes("高级质感"));
  assert.ok(result.reply.includes("避免影响"));
}

{
  const state = freshState();
  Core.applyInput(state, "老板希望画面更高级也更活泼，今天下班前改。", fixedNow);
  const result = Core.applyInput(state, "帮我整理确认优先级的话术。", fixedNow);
  assert.equal(result.analysis.behavior, "ask_confirmation_message");
  assert.ok(result.reply.includes("高级"));
  assert.ok(result.reply.includes("活泼"));
  assert.ok(result.reply.includes("优先级"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "新品小红书封面";
  project.type = "社媒图";
  project.deliverables = ["小红书封面"];
  project.goal = "让用户一眼知道新品上市";
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "参考图应该怎么找？", fixedNow);
  assert.equal(result.analysis.behavior, "answer_design_question");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("设计问题：参考与灵感"));
  assert.ok(result.reply.includes("信息层级参考"));
  assert.ok(result.reply.includes("手机预览"));
}

{
  const state = freshState();
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "标题字体怎么配比较好？", fixedNow);
  assert.equal(result.analysis.behavior, "recommend_typography_system");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("字体系统建议"));
  assert.ok(result.reply.includes("标题"));
  assert.ok(result.reply.includes("字号层级"));
  assert.ok(result.reply.includes("下一步"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.type = "包装";
  project.deliverables = ["包装"];
  const result = Core.applyInput(state, "印刷尺寸和导出格式要注意什么？", fixedNow);
  assert.equal(result.analysis.behavior, "guide_print_prepress");
  assert.ok(result.reply.includes("印前检查"));
  assert.ok(result.reply.includes("出血"));
  assert.ok(result.reply.includes("CMYK"));
  assert.ok(result.reply.includes("转曲"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "客户一直改来改去怎么办？", fixedNow);
  assert.equal(result.analysis.behavior, "answer_design_question");
  assert.ok(result.reply.includes("反馈处理"));
  assert.ok(result.reply.includes("冲突反馈"));
  assert.ok(result.reply.includes("确认话术"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "咖啡新品海报";
  project.type = "社媒图";
  project.goal = "让用户一眼知道新品上市";
  project.audience = "年轻上班族";
  project.scene = "小红书封面";
  project.deliverables = ["小红书封面"];
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "帮我出三个年轻一点的设计方向。", fixedNow);
  assert.equal(result.analysis.behavior, "ask_design_directions");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("设计方向草案"));
  assert.ok(result.reply.includes("方向 1"));
  assert.ok(result.reply.includes("视觉关键词"));
  assert.ok(result.reply.includes("移动端预览"));
  assert.ok(!result.reply.includes("缺少设计目标"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "咖啡新品提案";
  project.type = "社媒图";
  project.goal = "让用户知道新品上市并愿意进店";
  project.audience = "年轻上班族";
  project.scene = "小红书和朋友圈";
  project.deliverables = ["小红书封面", "朋友圈海报"];
  const result = Core.applyInput(state, "老板让我出三版提案方向，但不要只是换颜色换字体，怎么区分？", fixedNow);
  assert.equal(result.analysis.behavior, "plan_design_concepts");
  assert.ok(result.reply.includes("多方案提案规划"));
  assert.ok(result.reply.includes("核心假设"));
  assert.ok(result.reply.includes("方案 A"));
  assert.ok(result.reply.includes("方案 B"));
  assert.ok(result.reply.includes("方案 C"));
  assert.ok(result.reply.includes("汇报话术"));
  assert.ok(result.reply.includes("不要只换颜色"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "活动海报";
  project.goal = "让用户快速看到报名入口";
  project.dueDate = "2026-06-13";
  const result = Core.applyInput(state, "方案A更高级，方案B更活泼，选哪个？明天要交。", fixedNow);
  assert.equal(result.analysis.behavior, "compare_design_options");
  assert.ok(result.reply.includes("方案选择建议"));
  assert.ok(result.reply.includes("4 个标准"));
  assert.ok(result.reply.includes("更容易交付"));
  assert.ok(result.reply.includes("3 秒"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "小红书新品封面";
  project.type = "社媒图";
  project.deliverables = ["小红书封面"];
  project.dueDate = "2026-06-12";
  state.tasks.push({
    id: "t-urgent",
    projectId: project.id,
    title: "完成首版设计：小红书封面",
    priority: "high",
    dueDate: "2026-06-12",
    status: "todo",
    nextAction: "先搭主标题和主体图",
    feedbackIds: [],
  });
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "今天要交但我来不及了，怎么办？", fixedNow);
  assert.equal(result.analysis.behavior, "triage_overload");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("紧急推进方案"));
  assert.ok(result.reply.includes("先做这一件"));
  assert.ok(result.reply.includes("手机预览"));
  assert.ok(result.reply.includes("25 分钟"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "小红书新品封面";
  project.type = "社媒图";
  project.deliverables = ["小红书封面", "朋友圈海报", "公众号头图"];
  project.dueDate = "2026-06-12";
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "今天要交但我来不及了，怎么跟老板说延期或者砍范围？", fixedNow);
  assert.equal(result.analysis.behavior, "negotiate_deadline_scope");
  assert.equal(project.status, "waiting");
  assert.equal(state.tasks.length, beforeTasks + 1);
  assert.ok(state.tasks.at(-1).title.includes("沟通延期"));
  assert.ok(result.reply.includes("延期/范围沟通"));
  assert.ok(result.reply.includes("必须守住"));
  assert.ok(result.reply.includes("可以后置"));
  assert.ok(result.reply.includes("可以直接这样说"));
  assert.ok(result.reply.includes("如果对方不同意延期"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "品牌活动物料";
  state.tasks.push({
    id: "t-many-1",
    projectId: project.id,
    title: "确认尺寸、参考和交付格式",
    priority: "high",
    dueDate: "2026-06-12",
    status: "todo",
    nextAction: "先确认尺寸和交付格式",
    feedbackIds: [],
  });
  state.tasks.push({
    id: "t-many-2",
    projectId: project.id,
    title: "等待老板确认方向",
    priority: "high",
    dueDate: "2026-06-12",
    status: "waiting",
    nextAction: "确认高级还是活泼",
    feedbackIds: [],
  });
  const result = Core.applyInput(state, "任务太多了，我很乱，不知道先做哪个。", fixedNow);
  assert.equal(result.analysis.behavior, "triage_overload");
  assert.ok(result.reply.includes("确认尺寸、参考和交付格式"));
  assert.ok(result.reply.includes("立刻确认"));
  assert.ok(result.reply.includes("砍细节"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "咖啡新品海报";
  project.goal = "让用户一眼知道新品上市";
  project.audience = "年轻上班族";
  project.scene = "小红书封面";
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "帮我想几个年轻一点的主标题文案。", fixedNow);
  assert.equal(result.analysis.behavior, "refine_copywriting");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("文案整理"));
  assert.ok(result.reply.includes("主标题候选"));
  assert.ok(result.reply.includes("CTA"));
  assert.ok(result.reply.includes("年轻上班族"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "促销海报";
  project.goal = "让用户快速看到优惠利益";
  const result = Core.applyInput(state, "画面文字太多，文案怎么精简？", fixedNow);
  assert.equal(result.analysis.behavior, "refine_copywriting");
  assert.ok(result.reply.includes("需要从画面里拿掉或弱化"));
  assert.ok(result.reply.includes("主标题 + 1 句副标题 + 1 个行动点"));
  assert.ok(result.reply.includes("精简标准"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "会员活动海报";
  project.type = "社媒图";
  project.goal = "让用户快速看到报名入口";
  project.audience = "会员用户";
  project.scene = "朋友圈";
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "明天给老板看，我该怎么讲这个方案？", fixedNow);
  assert.equal(result.analysis.behavior, "prepare_design_presentation");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("方案汇报稿"));
  assert.ok(result.reply.includes("背景目标"));
  assert.ok(result.reply.includes("设计策略"));
  assert.ok(result.reply.includes("可能被问到"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "新品主视觉";
  Core.applyInput(state, "老板说画面太普通，希望更高级一点，明天改。", fixedNow);
  Core.applyInput(state, "V2 改了标题层级和按钮颜色，老板确认了。", fixedNow);
  const result = Core.applyInput(state, "帮我写一段设计说明，用来解释这版为什么这样做。", fixedNow);
  assert.equal(result.analysis.behavior, "prepare_design_presentation");
  assert.ok(result.reply.includes("对反馈的回应"));
  assert.ok(result.reply.includes("增强视觉记忆点"));
  assert.ok(result.reply.includes("版本变化"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "开业海报";
  project.dueDate = "2026-06-13";
  const beforeFeedback = state.feedback.length;
  const result = Core.applyInput(state, "老板说这版不行，要重做。", fixedNow);
  assert.equal(result.analysis.behavior, "handle_negative_feedback");
  assert.equal(state.feedback.length, beforeFeedback + 1);
  assert.ok(state.tasks.some((task) => task.projectId === project.id && task.title.includes("否定型反馈")));
  assert.ok(result.reply.includes("补救方案"));
  assert.ok(result.reply.includes("先问清 3 件事"));
  assert.ok(result.reply.includes("可以这样回复"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "会员主视觉";
  const result = Core.applyInput(state, "客户觉得画面很怪，但没说哪里怪。", fixedNow);
  assert.equal(result.analysis.behavior, "handle_negative_feedback");
  assert.ok(project.risks.includes("否定型反馈，需要先确认重做范围"));
  assert.ok(result.reply.includes("风格细节"));
  assert.ok(result.reply.includes("黑白信息层级稿"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "活动海报";
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "这个画面有点不对劲，但我说不上来。", fixedNow);
  assert.equal(result.analysis.behavior, "diagnose_ambiguous_issue");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("模糊问题诊断"));
  assert.ok(result.reply.includes("按这个顺序排查"));
  assert.ok(result.reply.includes("关键追问"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "小红书封面";
  project.type = "社媒图";
  project.deliverables = ["小红书封面"];
  const result = Core.applyInput(state, "封面看着不协调，不知道哪里怪。", fixedNow);
  assert.equal(result.analysis.behavior, "diagnose_ambiguous_issue");
  assert.ok(result.reply.includes("手机预览"));
  assert.ok(result.reply.includes("3 秒"));
  assert.ok(result.reply.includes("只改一个变量"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "新品海报";
  project.type = "社媒图";
  project.deliverables = ["小红书封面"];
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "主图太糊了，分辨率不够怎么办？", fixedNow);
  assert.equal(result.analysis.behavior, "fix_asset_quality");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("素材补救方案"));
  assert.ok(result.reply.includes("高清源图"));
  assert.ok(result.reply.includes("小屏识别"));
  assert.ok(result.reply.includes("商业发布"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "活动长图";
  const result = Core.applyInput(state, "素材风格不统一，也找不到合适的图。", fixedNow);
  assert.equal(result.analysis.behavior, "fix_asset_quality");
  assert.ok(result.reply.includes("同色调"));
  assert.ok(result.reply.includes("图形化表达"));
  assert.ok(result.reply.includes("可商用"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "咖啡新品海报";
  project.type = "社媒图";
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "产品图像贴上去的，和背景不融合，光源也不一致，怎么修得自然？", fixedNow);
  assert.equal(result.analysis.behavior, "integrate_composite_assets");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("合成自然度诊断"));
  assert.ok(result.reply.includes("光源方向"));
  assert.ok(result.reply.includes("接触阴影"));
  assert.ok(result.reply.includes("色温"));
  assert.ok(result.reply.includes("合成校准稿"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "人物活动海报";
  project.type = "海报";
  const result = Core.applyInput(state, "人物合成到海报里不自然，透视和阴影不对，应该怎么处理？", fixedNow);
  assert.equal(result.analysis.behavior, "integrate_composite_assets");
  assert.ok(result.reply.includes("透视"));
  assert.ok(result.reply.includes("阴影方向"));
  assert.ok(result.reply.includes("边缘"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "主管说产品图像贴上去的，明天改。", fixedNow);
  assert.equal(result.analysis.behavior, "record_feedback");
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "咖啡新品海报";
  project.dueDate = "2026-06-20";
  project.deliverables = ["小红书封面", "朋友圈海报"];
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "源文件怎么整理打包给老板？", fixedNow);
  assert.equal(result.analysis.behavior, "organize_delivery_files");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("交付文件整理"));
  assert.ok(result.reply.includes("01_导出图"));
  assert.ok(result.reply.includes("02_源文件"));
  assert.ok(result.reply.includes("README"));
  assert.ok(result.reply.includes("命名规范"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "会员活动页面";
  project.type = "Banner";
  project.deliverables = ["活动页头图", "按钮图标"];
  project.specs = ["1440x520px"];
  project.formats = ["png", "figma"];
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "这个 Figma 设计稿要交给开发，帮我整理交接说明和标注注意事项。", fixedNow);
  assert.equal(result.analysis.behavior, "prepare_design_handoff");
  assert.equal(state.tasks.length, beforeTasks + 1);
  assert.ok(state.tasks.at(-1).title.includes("准备设计交接说明"));
  assert.ok(result.reply.includes("设计交接说明"));
  assert.ok(result.reply.includes("开发同事"));
  assert.ok(result.reply.includes("README 模板"));
  assert.ok(result.reply.includes("使用/修改边界"));
  assert.ok(result.reply.includes("可以这样发"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "文件命名规范怎么写？不要最终最终版那种。", fixedNow);
  assert.equal(result.analysis.behavior, "organize_delivery_files");
  assert.ok(result.reply.includes("版本号只递增"));
  assert.ok(result.reply.includes("交付话术"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "交付检查清单给我看一下。", fixedNow);
  assert.equal(result.analysis.behavior, "ask_checklist");
  assert.ok(result.reply.includes("交付检查"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "新品活动海报";
  project.deliverables = ["小红书封面", "朋友圈海报", "公众号头图"];
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "这张海报要适配小红书封面、朋友圈海报和公众号头图，怎么做？", fixedNow);
  assert.equal(result.analysis.behavior, "adapt_multi_format");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("多尺寸适配方案"));
  assert.ok(result.reply.includes("不要直接拉伸"));
  assert.ok(result.reply.includes("小红书封面"));
  assert.ok(result.reply.includes("公众号头图"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "横版 Banner 要改成竖版，安全区怎么处理？", fixedNow);
  assert.equal(result.analysis.behavior, "adapt_multi_format");
  assert.ok(result.reply.includes("重排而不是缩放"));
  assert.ok(result.reply.includes("安全区"));
  assert.ok(result.reply.includes("3 秒"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "最后要交小红书封面和朋友圈海报。", fixedNow);
  assert.equal(result.analysis.behavior, "update_deliverables");
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "品牌活动海报";
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "老板说这版不像品牌，怎么检查品牌规范？", fixedNow);
  assert.equal(result.analysis.behavior, "check_brand_consistency");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("品牌一致性检查"));
  assert.ok(result.reply.includes("Logo"));
  assert.ok(result.reply.includes("品牌色"));
  assert.ok(result.reply.includes("如果对方说“不像品牌”"));
  assert.ok(result.reply.includes("先找品牌锚点"));
  assert.ok(result.reply.includes("判断标准"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "品牌色和 Logo 使用要注意什么？", fixedNow);
  assert.equal(result.analysis.behavior, "check_brand_consistency");
  assert.ok(result.reply.includes("色值"));
  assert.ok(result.reply.includes("不要拉伸"));
  assert.ok(result.reply.includes("品牌手册"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "主管说这版不像品牌，明天改。", fixedNow);
  assert.equal(result.analysis.behavior, "record_feedback");
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "会员活动海报";
  project.type = "社媒图";
  project.goal = "让用户先看懂活动并记住品牌";
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "客户觉得 Logo 太小，品牌不明显，怎么放大才不抢主视觉？", fixedNow);
  assert.equal(result.analysis.behavior, "optimize_logo_exposure");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("Logo 露出与品牌存在感"));
  assert.ok(result.reply.includes("大小与安全距离"));
  assert.ok(result.reply.includes("如果对方要求再大一点"));
  assert.ok(result.reply.includes("不要拉伸"));
  assert.ok(result.reply.includes("3 个 Logo 小方案"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "Logo 放哪里比较稳？品牌露出要明显一点。", fixedNow);
  assert.equal(result.analysis.behavior, "optimize_logo_exposure");
  assert.ok(result.reply.includes("推荐放法"));
  assert.ok(result.reply.includes("常规角落版"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "主管说 Logo 太小，明天改。", fixedNow);
  assert.equal(result.analysis.behavior, "record_feedback");
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "活动海报";
  project.type = "海报";
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "这张海报元素有点飘，边距不一致，怎么整理对齐和间距？", fixedNow);
  assert.equal(result.analysis.behavior, "optimize_alignment_spacing");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("对齐与间距诊断"));
  assert.ok(result.reply.includes("先定网格"));
  assert.ok(result.reply.includes("主轴线"));
  assert.ok(result.reply.includes("网格整理稿"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "主管说文字和卡片间距不统一，明天改。", fixedNow);
  assert.equal(result.analysis.behavior, "record_feedback");
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  const beforeChecklist = state.checklist.length;
  const result = Core.applyInput(state, "项目类型改成品牌。", fixedNow);
  assert.equal(result.analysis.behavior, "update_project_type");
  assert.equal(project.type, "品牌");
  assert.ok(state.checklist.length > beforeChecklist);
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "会员活动海报";
  project.type = "社媒图";
  project.deliverables = ["小红书封面"];
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "想做高级一点的质感和阴影怎么做？", fixedNow);
  assert.equal(result.analysis.behavior, "guide_visual_effect");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("视觉效果做法"));
  assert.ok(result.reply.includes("光源"));
  assert.ok(result.reply.includes("阴影"));
  assert.ok(result.reply.includes("下一步"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "会员活动海报";
  project.type = "社媒图";
  project.goal = "让用户快速看到报名入口";
  project.deliverables = ["小红书封面"];
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "主管说海报画面太空、重心有点不平衡，我应该怎么调整？", fixedNow);
  assert.equal(result.analysis.behavior, "balance_visual_density");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("画面密度与平衡诊断"));
  assert.ok(result.reply.includes("太空"));
  assert.ok(result.reply.includes("重心"));
  assert.ok(result.reply.includes("不要这样补"));
  assert.ok(result.reply.includes("黑白密度小稿"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "促销海报";
  project.type = "海报";
  const result = Core.applyInput(state, "这个版面太满太挤了，元素很多但又不知道怎么删，应该怎么处理？", fixedNow);
  assert.equal(result.analysis.behavior, "balance_visual_density");
  assert.ok(result.reply.includes("太满"));
  assert.ok(result.reply.includes("先删重复信息"));
  assert.ok(result.reply.includes("提交前检查"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "咖啡新品封面";
  project.type = "社媒图";
  project.deliverables = ["小红书封面"];
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "产品主体融进背景里了，主视觉不突出，怎么调整层次感？", fixedNow);
  assert.equal(result.analysis.behavior, "separate_subject_background");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("主体与背景层次诊断"));
  assert.ok(result.reply.includes("先分清角色"));
  assert.ok(result.reply.includes("黑白剪影测试"));
  assert.ok(result.reply.includes("主体分离小稿"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "新品活动海报";
  project.type = "海报";
  const result = Core.applyInput(state, "背景太抢、画面没有层次感，应该怎么处理？", fixedNow);
  assert.equal(result.analysis.behavior, "separate_subject_background");
  assert.ok(result.reply.includes("背景抢"));
  assert.ok(result.reply.includes("层次平"));
  assert.ok(result.reply.includes("色罩"));
  assert.ok(result.reply.includes("检查标准"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "主管说主体不突出，明天改。", fixedNow);
  assert.equal(result.analysis.behavior, "record_feedback");
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "新品小红书封面";
  project.type = "社媒图";
  project.goal = "让用户一眼记住新品并点击了解";
  project.deliverables = ["小红书封面"];
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "主管说这张封面不吸睛、没记忆点，视觉冲击力不够，怎么改？", fixedNow);
  assert.equal(result.analysis.behavior, "strengthen_visual_impact");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("视觉冲击力诊断"));
  assert.ok(result.reply.includes("视觉锚点"));
  assert.ok(result.reply.includes("按这个顺序加强"));
  assert.ok(result.reply.includes("不要这样做"));
  assert.ok(result.reply.includes("强第一眼小稿"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "品牌发布海报";
  project.type = "海报";
  project.goal = "传达高级、可信的品牌印象";
  const result = Core.applyInput(state, "客户觉得主视觉太平、第一眼不强，但又要高级质感，应该怎么优化？", fixedNow);
  assert.equal(result.analysis.behavior, "strengthen_visual_impact");
  assert.ok(result.reply.includes("质感锚点"));
  assert.ok(result.reply.includes("高级项目不要"));
  assert.ok(result.reply.includes("缩略图"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "会员活动海报";
  project.type = "社媒图";
  project.goal = "让用户快速看到报名入口";
  project.deliverables = ["小红书封面"];
  const result = Core.applyInput(state, "这张封面看起来很廉价、像模板，怎么改得更精致？", fixedNow);
  assert.equal(result.analysis.behavior, "improve_visual_polish");
  assert.ok(result.reply.includes("廉价感诊断与精修"));
  assert.ok(result.reply.includes("最可能的问题"));
  assert.ok(result.reply.includes("按这个顺序改"));
  assert.ok(result.reply.includes("不要这样做"));
  assert.ok(result.reply.includes("提交前看这 4 个标准"));
  assert.ok(result.reply.includes("减法精修稿"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "咖啡新品封面";
  project.type = "社媒图";
  const result = Core.applyInput(state, "毛玻璃效果怎么做才不影响文字可读性？", fixedNow);
  assert.equal(result.analysis.behavior, "guide_visual_effect");
  assert.ok(result.reply.includes("半透明"));
  assert.ok(result.reply.includes("模糊"));
  assert.ok(result.reply.includes("可读性"));
  assert.ok(result.reply.includes("小屏"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "品牌质感不统一，怎么检查品牌规范？", fixedNow);
  assert.equal(result.analysis.behavior, "check_brand_consistency");
  assert.ok(result.reply.includes("品牌一致性检查"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "咖啡新品首图";
  project.deliverables = ["小红书封面"];
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "小红书封面尺寸应该做多大？安全区怎么留？", fixedNow);
  assert.equal(result.analysis.behavior, "recommend_platform_specs");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("规格建议"));
  assert.ok(result.reply.includes("1080×1440"));
  assert.ok(result.reply.includes("安全区"));
  assert.ok(result.reply.includes("平台后台"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "公众号头图比例是多少？", fixedNow);
  assert.equal(result.analysis.behavior, "recommend_platform_specs");
  assert.ok(result.reply.includes("900×383"));
  assert.ok(result.reply.includes("2.35:1"));
  assert.ok(result.reply.includes("发布前"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  const result = Core.applyInput(state, "尺寸是1080x1440px，导出 jpg。", fixedNow);
  assert.equal(result.analysis.behavior, "update_project_specs");
  assert.ok(project.specs.includes("1080x1440px"));
  assert.ok(project.formats.includes("jpg"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "咖啡新品海报";
  project.type = "社媒图";
  project.deliverables = ["小红书封面"];
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "小红书海报怎么排版？有没有版式结构？", fixedNow);
  assert.equal(result.analysis.behavior, "recommend_layout_structure");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("版式结构建议"));
  assert.ok(result.reply.includes("上标题 + 中主体 + 下信息"));
  assert.ok(result.reply.includes("黑白线框"));
  assert.ok(result.reply.includes("手机缩略图"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "Banner怎么排版比较稳？", fixedNow);
  assert.equal(result.analysis.behavior, "recommend_layout_structure");
  assert.ok(result.reply.includes("左右分区"));
  assert.ok(result.reply.includes("公众号头图"));
  assert.ok(result.reply.includes("第一视觉"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "画面太乱了，怎么排版优化？", fixedNow);
  assert.equal(result.analysis.behavior, "solve_design_issue");
  assert.ok(result.reply.includes("设计卡点"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "会员活动海报";
  project.type = "社媒图";
  project.goal = "让用户快速看到报名入口";
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "标题字体和正文字体怎么搭配？字号层级怎么做？", fixedNow);
  assert.equal(result.analysis.behavior, "recommend_typography_system");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("字体系统建议"));
  assert.ok(result.reply.includes("字号层级"));
  assert.ok(result.reply.includes("字距/行距检查"));
  assert.ok(result.reply.includes("1 个字体家族、2 种字重、3 档字号"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "字体太挤了，字距和行距怎么调？", fixedNow);
  assert.equal(result.analysis.behavior, "recommend_typography_system");
  assert.ok(result.reply.includes("调字距前"));
  assert.ok(result.reply.includes("行距先服务阅读"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "品牌字体和 Logo 使用要注意什么？", fixedNow);
  assert.equal(result.analysis.behavior, "check_brand_consistency");
  assert.ok(result.reply.includes("品牌一致性检查"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "标题文案怎么写得更年轻？", fixedNow);
  assert.equal(result.analysis.behavior, "refine_copywriting");
  assert.ok(result.reply.includes("文案整理"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "咖啡新品封面";
  project.type = "社媒图";
  project.goal = "让用户一眼知道新品上市";
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "配色怎么搭？主色辅助色和强调色怎么分？", fixedNow);
  assert.equal(result.analysis.behavior, "recommend_color_system");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("配色系统建议"));
  assert.ok(result.reply.includes("主色 60%"));
  assert.ok(result.reply.includes("辅助色 30%"));
  assert.ok(result.reply.includes("强调色 10%"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "画面颜色太暗太灰，怎么调色更年轻？", fixedNow);
  assert.equal(result.analysis.behavior, "recommend_color_system");
  assert.ok(result.reply.includes("修色顺序"));
  assert.ok(result.reply.includes("明度"));
  assert.ok(result.reply.includes("跳色"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "主管说海报颜色太暗，要更年轻一点，明天改。", fixedNow);
  assert.equal(result.analysis.behavior, "record_feedback");
  assert.ok(result.reply.includes("已记录到"));
  assert.ok(result.reply.includes("反馈已翻译为"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "品牌色怎么用才符合规范？", fixedNow);
  assert.equal(result.analysis.behavior, "check_brand_consistency");
  assert.ok(result.reply.includes("品牌一致性检查"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "包装盒";
  project.type = "包装";
  project.deliverables = ["包装"];
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "发印厂前出血、CMYK、文字转曲怎么检查？", fixedNow);
  assert.equal(result.analysis.behavior, "guide_print_prepress");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("印前检查"));
  assert.ok(result.reply.includes("刀版"));
  assert.ok(result.reply.includes("发印厂前确认话术"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "交付检查清单给我看一下。", fixedNow);
  assert.equal(result.analysis.behavior, "ask_checklist");
  assert.ok(result.reply.includes("交付检查"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "会员招募海报";
  project.type = "社媒图";
  project.goal = "让用户觉得会员活动更有品质";
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "高级感怎么做出来？", fixedNow);
  assert.equal(result.analysis.behavior, "translate_style_keyword");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("风格关键词翻译"));
  assert.ok(result.reply.includes("构图"));
  assert.ok(result.reply.includes("字体"));
  assert.ok(result.reply.includes("不要这样做"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "科技感视觉语言怎么落地？", fixedNow);
  assert.equal(result.analysis.behavior, "translate_style_keyword");
  assert.ok(result.reply.includes("科技 / 未来 / 赛博"));
  assert.ok(result.reply.includes("网格"));
  assert.ok(result.reply.includes("发光"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "给我三个高级感设计方向。", fixedNow);
  assert.equal(result.analysis.behavior, "ask_design_directions");
  assert.ok(result.reply.includes("设计方向草案"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "主管说要高级一点，明天改。", fixedNow);
  assert.equal(result.analysis.behavior, "record_feedback");
  assert.ok(result.reply.includes("反馈已翻译为"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "新品小红书封面";
  project.type = "社媒图";
  project.goal = "让用户一眼知道新品上市";
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "老板给的参考图怎么拆解，怎么借鉴但不要照抄？", fixedNow);
  assert.equal(result.analysis.behavior, "analyze_reference");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("参考图拆解"));
  assert.ok(result.reply.includes("可以借鉴"));
  assert.ok(result.reply.includes("不要照抄"));
  assert.ok(result.reply.includes("方法迁移小稿"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "参考图应该怎么找？", fixedNow);
  assert.equal(result.analysis.behavior, "answer_design_question");
  assert.ok(result.reply.includes("参考与灵感"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "新品活动海报";
  project.dueDate = "2026-06-13";
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "这张海报用了网上找的参考图素材和免费字体，客户要商用，帮我检查版权风险。", fixedNow);
  assert.equal(result.analysis.behavior, "audit_asset_license");
  assert.equal(project.status, "waiting");
  assert.equal(state.tasks.length, beforeTasks + 1);
  assert.ok(state.tasks.at(-1).title.includes("确认素材和字体授权"));
  assert.ok(result.reply.includes("素材授权审查"));
  assert.ok(result.reply.includes("高风险项"));
  assert.ok(result.reply.includes("处理建议"));
  assert.ok(result.reply.includes("可以这样确认"));
  assert.ok(result.reply.includes("归档时要保存"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "字体授权和图片版权要注意什么？", fixedNow);
  assert.equal(result.analysis.behavior, "answer_design_question");
  assert.ok(result.reply.includes("素材与授权"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "新品活动海报";
  project.type = "社媒图";
  project.goal = "让用户快速看到报名入口";
  project.deliverables = ["朋友圈海报"];
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "提交前老板会问什么？我怎么回答？", fixedNow);
  assert.equal(result.analysis.behavior, "simulate_design_defense");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("提交前答辩预演"));
  assert.ok(result.reply.includes("可能被问"));
  assert.ok(result.reply.includes("不要这样回答"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "这个方案怎么讲给老板听？", fixedNow);
  assert.equal(result.analysis.behavior, "prepare_design_presentation");
  assert.ok(result.reply.includes("方案汇报稿"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "提交前检查一下哪里有问题。", fixedNow);
  assert.equal(result.analysis.behavior, "ask_review");
  assert.ok(result.reply.includes("提交前自检"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "咖啡新品海报";
  project.type = "社媒图";
  project.goal = "让用户一眼知道新品上市";
  project.deliverables = ["小红书封面", "朋友圈海报"];
  project.dueDate = "2026-06-14";
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "这个项目多久能出一版？帮我估个工时。", fixedNow);
  assert.equal(result.analysis.behavior, "estimate_design_workload");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("工作量预估"));
  assert.ok(result.reply.includes("粗估"));
  assert.ok(result.reply.includes("可以这样对外说"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "咖啡新品海报";
  project.type = "社媒图";
  project.goal = "让用户一眼知道新品上市";
  project.deliverables = ["小红书封面"];
  project.dueDate = "2026-06-14";
  state.tasks.push({
    id: "t-progress-done",
    projectId: project.id,
    title: "确认尺寸和主文案",
    priority: "normal",
    dueDate: "2026-06-13",
    status: "done",
    nextAction: "已确认",
    feedbackIds: [],
  });
  state.tasks.push({
    id: "t-progress-open",
    projectId: project.id,
    title: "完成首版设计",
    priority: "high",
    dueDate: "2026-06-14",
    status: "todo",
    nextAction: "先搭主标题和产品图层级",
    feedbackIds: [],
  });
  const result = Core.applyInput(state, "老板问我现在进度做到哪了，什么时候能给，我怎么回复？", fixedNow);
  assert.equal(result.analysis.behavior, "report_progress_status");
  assert.ok(result.reply.includes("进度汇报话术"));
  assert.ok(result.reply.includes("已完成"));
  assert.ok(result.reply.includes("正在推进"));
  assert.ok(result.reply.includes("可以直接这样回"));
  assert.ok(result.reply.includes("如果对方继续催"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "今天来不及了，任务太多怎么办？", fixedNow);
  assert.equal(result.analysis.behavior, "triage_overload");
  assert.ok(result.reply.includes("紧急推进方案"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "今天要做什么？", fixedNow);
  assert.equal(result.analysis.behavior, "ask_plan");
  assert.ok(result.reply.includes("今日安排"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "万圣节主题海报";
  project.goal = "让用户一眼看懂活动主题并扫码参与";
  project.deliverables = ["朋友圈海报"];
  project.dueDate = "2026-06-13";
  Core.applyInput(state, "主管说颜色太暗，要更年轻一点，明天改。", fixedNow);
  Core.applyInput(state, "客户说字太小，二维码和活动时间都要清楚。", fixedNow);
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "帮我整理这些反馈优先级，先改什么？", fixedNow);
  assert.equal(result.analysis.behavior, "synthesize_feedback_batch");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("反馈优先级整理"));
  assert.ok(result.reply.includes("先改"));
  assert.ok(result.reply.includes("需要确认"));
  assert.ok(result.reply.includes("回复口径"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "主管说海报颜色太暗，要更年轻一点，明天改。", fixedNow);
  assert.equal(result.analysis.behavior, "record_feedback");
  assert.ok(result.reply.includes("反馈已翻译为"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "帮我整理确认话术，问老板尺寸和交付格式。", fixedNow);
  assert.equal(result.analysis.behavior, "ask_confirmation_message");
  assert.ok(result.reply.includes("确认话术"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "客户一直改来改去怎么办？", fixedNow);
  assert.equal(result.analysis.behavior, "answer_design_question");
  assert.ok(result.reply.includes("反馈处理"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "咖啡新品海报";
  project.goal = "让用户一眼知道新品上市";
  project.deliverables = ["小红书封面"];
  project.dueDate = "2026-06-14";
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "客户临时又加一个朋友圈海报，今天还要交，怎么办？", fixedNow);
  assert.equal(result.analysis.behavior, "handle_scope_change");
  assert.ok(project.deliverables.includes("朋友圈海报"));
  assert.equal(state.tasks.length, beforeTasks + 1);
  assert.equal(state.tasks.at(-1).priority, "high");
  assert.ok(result.reply.includes("需求变更评估"));
  assert.ok(result.reply.includes("新增交付物"));
  assert.ok(result.reply.includes("先确认"));
  assert.ok(result.reply.includes("可以对外这样说"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.deliverables = ["小红书封面"];
  const result = Core.applyInput(state, "客户还要公众号头图。", fixedNow);
  assert.equal(result.analysis.behavior, "update_deliverables");
  assert.ok(project.deliverables.includes("公众号头图"));
}

{
  const state = freshState();
  const before = state.projects.length;
  const result = Core.applyInput(state, "新项目「夏日活动」客户要公众号头图和朋友圈海报，明天交。", fixedNow);
  assert.equal(result.analysis.behavior, "create_project");
  assert.equal(state.projects.length, before + 1);
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "咖啡新品封面";
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(
    state,
    "帮我拆一下这个 brief：给年轻上班族看的小红书封面，用来推广新品拿铁，明天交，最后要小红书封面和朋友圈海报。",
    fixedNow
  );
  assert.equal(result.analysis.behavior, "decompose_brief");
  assert.ok(project.deliverables.includes("小红书封面"));
  assert.ok(project.deliverables.includes("朋友圈海报"));
  assert.equal(project.dueDate, "2026-06-13");
  assert.ok(state.tasks.length >= beforeTasks);
  assert.ok(result.reply.includes("Brief 拆解"));
  assert.ok(result.reply.includes("一句话目标"));
  assert.ok(result.reply.includes("还缺"));
  assert.ok(result.reply.includes("第一步动作"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "今天要做什么？", fixedNow);
  assert.equal(result.analysis.behavior, "ask_plan");
}

{
  const state = freshState();
  const result = Core.applyInput(state, "参考图怎么拆解，怎么借鉴但不要照抄？", fixedNow);
  assert.equal(result.analysis.behavior, "analyze_reference");
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "新品活动海报";
  project.type = "社媒图";
  project.goal = "让用户扫码报名活动";
  project.deliverables = ["朋友圈海报"];
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "信息太多了，卖点、时间、二维码都想放，怎么排主次？", fixedNow);
  assert.equal(result.analysis.behavior, "organize_information_hierarchy");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("信息层级整理"));
  assert.ok(result.reply.includes("主信息"));
  assert.ok(result.reply.includes("弱化或移出画面"));
  assert.ok(result.reply.includes("删减原则"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "会员报名海报";
  project.type = "社媒图";
  project.goal = "让用户扫码报名活动";
  project.deliverables = ["朋友圈海报"];
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "二维码放哪里才不突兀，又能引导用户扫码报名？", fixedNow);
  assert.equal(result.analysis.behavior, "optimize_action_path");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("行动入口设计"));
  assert.ok(result.reply.includes("看见利益 -> 找到入口 -> 完成动作"));
  assert.ok(result.reply.includes("扫码报名"));
  assert.ok(result.reply.includes("交付前检查"));
  assert.ok(result.reply.includes("行动路径小稿"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "新品 Banner";
  project.type = "Banner";
  project.goal = "让用户点击了解新品";
  const result = Core.applyInput(state, "Banner 上按钮和购买入口怎么突出，但不要抢主视觉？", fixedNow);
  assert.equal(result.analysis.behavior, "optimize_action_path");
  assert.ok(result.reply.includes("横版 Banner"));
  assert.ok(result.reply.includes("立即购买"));
  assert.ok(result.reply.includes("不要让二维码抢第一眼"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "会员活动封面";
  project.type = "社媒图";
  project.deliverables = ["小红书封面"];
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "这张小红书封面手机上看不清，字太小，对比度也不够，应该怎么优化？", fixedNow);
  assert.equal(result.analysis.behavior, "optimize_readability");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("阅读体验诊断"));
  assert.ok(result.reply.includes("字号/层级问题"));
  assert.ok(result.reply.includes("明度对比"));
  assert.ok(result.reply.includes("手机预览"));
  assert.ok(result.reply.includes("可读性修正版"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "线下活动海报";
  project.type = "印刷海报";
  const result = Core.applyInput(state, "二维码说明和活动规则读不清，印刷前应该怎么检查？", fixedNow);
  assert.equal(result.analysis.behavior, "optimize_readability");
  assert.ok(result.reply.includes("按真实印刷尺寸预览"));
  assert.ok(result.reply.includes("扫码测试"));
  assert.ok(result.reply.includes("提交前测试"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "标题文案怎么写得更年轻？", fixedNow);
  assert.equal(result.analysis.behavior, "refine_copywriting");
}

{
  const state = freshState();
  const result = Core.applyInput(state, "海报怎么排版？给我几个版式结构。", fixedNow);
  assert.equal(result.analysis.behavior, "recommend_layout_structure");
}

{
  const state = freshState();
  const result = Core.applyInput(state, "主管说信息太多，二维码看不清，明天改。", fixedNow);
  assert.equal(result.analysis.behavior, "record_feedback");
}

{
  const state = freshState();
  const result = Core.applyInput(state, "标题字体和正文字体怎么搭配？字号层级怎么做？", fixedNow);
  assert.equal(result.analysis.behavior, "recommend_typography_system");
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "开业活动套图";
  project.type = "社媒图";
  project.deliverables = ["小红书封面", "朋友圈海报", "公众号头图"];
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "这一组活动物料看起来不像一套，怎么统一系列视觉？", fixedNow);
  assert.equal(result.analysis.behavior, "unify_series_visual_system");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("系列视觉统一"));
  assert.ok(result.reply.includes("固定项"));
  assert.ok(result.reply.includes("可变化项"));
  assert.ok(result.reply.includes("统一性检查"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "品牌质感不统一，怎么检查品牌规范？", fixedNow);
  assert.equal(result.analysis.behavior, "check_brand_consistency");
}

{
  const state = freshState();
  const result = Core.applyInput(state, "横版 Banner 要改成竖版，安全区怎么处理？", fixedNow);
  assert.equal(result.analysis.behavior, "adapt_multi_format");
}

{
  const state = freshState();
  const result = Core.applyInput(state, "素材风格不统一，也找不到合适的图。", fixedNow);
  assert.equal(result.analysis.behavior, "fix_asset_quality");
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "咖啡新品小红书封面";
  project.type = "社媒图";
  project.specs = ["1080x1440px"];
  project.deliverables = ["小红书封面"];
  const result = Core.applyInput(state, "PS 导出小红书封面总是模糊，应该怎么设置？", fixedNow);
  assert.equal(result.analysis.behavior, "guide_design_software_operation");
  assert.ok(result.reply.includes("软件操作小抄"));
  assert.ok(result.reply.includes("Photoshop"));
  assert.ok(result.reply.includes("清晰导出"));
  assert.ok(result.reply.includes("操作步骤"));
  assert.ok(result.reply.includes("交付前确认"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "AI 里文字怎么转曲，交付前怕字体丢。", fixedNow);
  assert.equal(result.analysis.behavior, "guide_design_software_operation");
  assert.ok(result.reply.includes("Illustrator"));
  assert.ok(result.reply.includes("文字转曲"));
  assert.ok(result.reply.includes("可编辑版"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "发印厂前出血、CMYK、文字转曲怎么检查？", fixedNow);
  assert.equal(result.analysis.behavior, "guide_print_prepress");
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "咖啡新品海报";
  project.type = "社媒图";
  project.goal = "让用户一眼知道新品上市";
  project.deliverables = ["小红书封面", "朋友圈海报"];
  Core.applyInput(state, "主管说颜色太暗，要更年轻一点，明天改。", fixedNow);
  Core.applyInput(state, "V2 改了标题层级和配色，主管确认了。", fixedNow);
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "这个项目做完了，帮我复盘一下，下次注意什么？", fixedNow);
  assert.equal(result.analysis.behavior, "project_retrospective");
  assert.equal(project.status, "done");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("项目复盘"));
  assert.ok(result.reply.includes("这次做得好的地方"));
  assert.ok(result.reply.includes("这次暴露的问题"));
  assert.ok(result.reply.includes("下次提前检查"));
  assert.ok(project.portfolio.reflection);
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "咖啡新品海报";
  project.type = "社媒图";
  project.goal = "让用户知道新品上市并愿意进店";
  project.deliverables = ["小红书封面", "朋友圈海报"];
  state.tasks.push({
    id: "t-closeout-test",
    projectId: project.id,
    title: "交付前自检与导出文件",
    priority: "normal",
    dueDate: "2026-06-13",
    status: "todo",
    nextAction: "检查命名和导出",
    feedbackIds: [],
  });
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "客户确认最终稿了，今天已上线，阅读量 2.3 万，帮我记录结果。", fixedNow);
  assert.equal(result.analysis.behavior, "record_project_outcome");
  assert.equal(project.status, "done");
  assert.ok(project.portfolio.result.includes("已上线"));
  assert.ok(project.portfolio.result.includes("阅读量 2.3 万"));
  assert.ok(state.tasks.some((task) => task.id === "t-closeout-test" && task.status === "done"));
  assert.equal(state.tasks.length, beforeTasks + 1);
  assert.ok(state.tasks.at(-1).title.includes("归档项目结果"));
  assert.ok(result.reply.includes("项目收尾记录"));
  assert.ok(result.reply.includes("结果摘要"));
  assert.ok(result.reply.includes("作品集可用表达"));
  assert.ok(result.reply.includes("收尾检查"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "帮我把这个项目整理成作品集案例。", fixedNow);
  assert.equal(result.analysis.behavior, "ask_portfolio");
  assert.ok(result.reply.includes("项目归档草稿"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "今天总结一下。", fixedNow);
  assert.equal(result.analysis.behavior, "ask_summary");
  assert.ok(result.reply.includes("今日工作总结"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "面试时这个项目怎么讲？", fixedNow);
  assert.equal(result.analysis.behavior, "ask_portfolio");
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "咖啡新品海报";
  project.goal = "让用户一眼知道新品上市";
  project.deliverables = ["小红书封面"];
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "首版准备发给老板看，怎么收反馈？", fixedNow);
  assert.equal(result.analysis.behavior, "prepare_feedback_request");
  assert.equal(project.status, "waiting");
  assert.equal(state.tasks.length, beforeTasks + 1);
  assert.equal(state.tasks.at(-1).status, "waiting");
  assert.ok(result.reply.includes("发稿收反馈"));
  assert.ok(result.reply.includes("发送前先检查"));
  assert.ok(result.reply.includes("可以这样发"));
  assert.ok(result.reply.includes("重点反馈"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "已经发给老板看了，等反馈。", fixedNow);
  assert.equal(result.analysis.behavior, "waiting_confirmation");
}

{
  const state = freshState();
  const result = Core.applyInput(state, "明天给老板看，我该怎么讲这个方案？", fixedNow);
  assert.equal(result.analysis.behavior, "prepare_design_presentation");
}

{
  const state = freshState();
  const result = Core.applyInput(state, "帮我整理确认话术，问客户尺寸和交付格式。", fixedNow);
  assert.equal(result.analysis.behavior, "ask_confirmation_message");
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "会员活动海报";
  project.goal = "让用户扫码报名活动";
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "老板说要高级，客户说要更活泼，意见不一致我该听谁的？", fixedNow);
  assert.equal(result.analysis.behavior, "align_stakeholder_feedback");
  assert.equal(project.status, "waiting");
  assert.equal(state.tasks.length, beforeTasks + 1);
  assert.ok(result.reply.includes("多方意见对齐"));
  assert.ok(result.reply.includes("冲突点"));
  assert.ok(result.reply.includes("决策顺序"));
  assert.ok(result.reply.includes("可以这样对齐"));
}

{
  const state = freshState();
  Core.applyInput(state, "主管说颜色太暗，要更年轻一点，明天改。", fixedNow);
  Core.applyInput(state, "客户说字太小，二维码和活动时间都要清楚。", fixedNow);
  const result = Core.applyInput(state, "帮我整理这些反馈优先级，先改什么？", fixedNow);
  assert.equal(result.analysis.behavior, "synthesize_feedback_batch");
}

{
  const state = freshState();
  const result = Core.applyInput(state, "老板说要高级一点，明天改。", fixedNow);
  assert.equal(result.analysis.behavior, "record_feedback");
}

{
  const state = freshState();
  const result = Core.applyInput(state, "帮我问老板和客户确认尺寸和交付格式。", fixedNow);
  assert.equal(result.analysis.behavior, "ask_confirmation_message");
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "新品主视觉";
  Core.applyInput(state, "V1 做了主标题和产品图布局。", fixedNow);
  Core.applyInput(state, "V2 改了标题层级和按钮颜色，老板确认了。", fixedNow);
  const beforeVersions = project.versions.length;
  const result = Core.applyInput(state, "帮我整理 V1 到 V2 改了哪些，给老板看。", fixedNow);
  assert.equal(result.analysis.behavior, "summarize_version_changes");
  assert.equal(project.versions.length, beforeVersions);
  assert.ok(result.reply.includes("版本变化说明"));
  assert.ok(result.reply.includes("核心修改"));
  assert.ok(result.reply.includes("修改依据"));
  assert.ok(result.reply.includes("发给老板/客户可以这样说"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  const result = Core.applyInput(state, "V3 改了背景色和二维码位置，客户确认了。", fixedNow);
  assert.equal(result.analysis.behavior, "record_version");
  assert.equal(project.versions.at(-1).name, "V3");
}

{
  const state = freshState();
  const result = Core.applyInput(state, "这个方案怎么讲给老板听？", fixedNow);
  assert.equal(result.analysis.behavior, "prepare_design_presentation");
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "新品活动海报";
  project.dueDate = "2026-06-13";
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "客户还没给 Logo、主文案和二维码，我该怎么办？", fixedNow);
  assert.equal(result.analysis.behavior, "request_missing_assets");
  assert.equal(project.status, "waiting");
  assert.equal(state.tasks.length, beforeTasks + 1);
  assert.equal(state.tasks.at(-1).status, "waiting");
  assert.ok(result.reply.includes("素材/文案索要清单"));
  assert.ok(result.reply.includes("当前缺少"));
  assert.ok(result.reply.includes("可以这样发"));
  assert.ok(result.reply.includes("收到素材后检查"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "素材风格不统一，也找不到合适的图。", fixedNow);
  assert.equal(result.analysis.behavior, "fix_asset_quality");
}

{
  const state = freshState();
  const result = Core.applyInput(state, "帮我整理确认话术，问客户尺寸和交付格式。", fixedNow);
  assert.equal(result.analysis.behavior, "ask_confirmation_message");
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "会员活动海报";
  project.goal = "让用户快速看到报名入口";
  const beforeFeedback = state.feedback.length;
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "老板只说这版不够有感觉，我怎么追问才不冒犯？", fixedNow);
  assert.equal(result.analysis.behavior, "clarify_vague_feedback");
  assert.equal(project.status, "waiting");
  assert.equal(state.feedback.length, beforeFeedback + 1);
  assert.equal(state.tasks.length, beforeTasks + 1);
  assert.ok(state.tasks.at(-1).title.includes("追问模糊反馈"));
  assert.ok(result.reply.includes("模糊反馈追问"));
  assert.ok(result.reply.includes("建议追问 3 个判断标准"));
  assert.ok(result.reply.includes("可以直接这样发"));
  assert.ok(result.reply.includes("对方回答后这样改"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "帮我问客户和老板确认尺寸和交付格式。", fixedNow);
  assert.equal(result.analysis.behavior, "ask_confirmation_message");
}

{
  const state = freshState();
  const result = Core.applyInput(state, "已经发给老板看了，等反馈。", fixedNow);
  assert.equal(result.analysis.behavior, "waiting_confirmation");
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "咖啡新品海报";
  project.type = "社媒图";
  project.goal = "让用户一眼知道新品上市";
  project.deliverables = ["小红书封面", "朋友圈海报"];
  Core.applyInput(state, "主管说颜色太暗，要更年轻一点，明天改。", fixedNow);
  Core.applyInput(state, "V2 改了标题层级和配色，主管确认了。", fixedNow);
  const result = Core.applyInput(state, "帮我看看我的能力短板，我该练什么？", fixedNow);
  assert.equal(result.analysis.behavior, "generate_growth_profile");
  assert.ok(result.reply.includes("能力成长档案"));
  assert.ok(result.reply.includes("当前强项"));
  assert.ok(result.reply.includes("优先补的短板"));
  assert.ok(result.reply.includes("下一步练习"));
  assert.ok(result.reply.includes("能力标签"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "帮我把这个项目整理成作品集案例。", fixedNow);
  assert.equal(result.analysis.behavior, "ask_portfolio");
}

{
  const state = freshState();
  const result = Core.applyInput(state, "这个项目做完了，帮我复盘一下。", fixedNow);
  assert.equal(result.analysis.behavior, "project_retrospective");
}

{
  const state = freshState();
  const result = Core.applyInput(state, "今天总结一下。", fixedNow);
  assert.equal(result.analysis.behavior, "ask_summary");
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "咖啡新品小红书封面";
  project.type = "社媒图";
  project.goal = "让用户一眼知道新品上市并想进店";
  project.deliverables = ["小红书封面"];
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "我还没灵感，帮我规划一下情绪板和参考关键词，咖啡新品要年轻一点。", fixedNow);
  assert.equal(result.analysis.behavior, "plan_reference_research");
  assert.equal(state.tasks.length, beforeTasks + 1);
  assert.ok(state.tasks.at(-1).title.includes("收集参考"));
  assert.ok(result.reply.includes("参考收集计划"));
  assert.ok(result.reply.includes("搜索关键词"));
  assert.ok(result.reply.includes("保留标准"));
  assert.ok(result.reply.includes("淘汰标准"));
  assert.ok(result.reply.includes("25 分钟动作"));
  assert.ok(project.portfolio.strategy.includes("参考策略"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "咖啡新品小红书封面";
  project.type = "社媒图";
  project.goal = "让用户一眼知道新品上市并想进店";
  project.deliverables = ["小红书封面"];
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "帮我写一组 AI 生图提示词，做咖啡新品小红书封面的年轻背景图。", fixedNow);
  assert.equal(result.analysis.behavior, "generate_image_prompt_brief");
  assert.equal(state.tasks.length, beforeTasks + 1);
  assert.ok(state.tasks.at(-1).title.includes("AI 素材提示词"));
  assert.ok(result.reply.includes("AI 生图提示词规划"));
  assert.ok(result.reply.includes("可复制提示词"));
  assert.ok(result.reply.includes("负面提示词"));
  assert.ok(result.reply.includes("筛选标准"));
  assert.ok(result.reply.includes("落地到设计稿"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "这张参考图怎么拆解，哪些地方可以借鉴但不要照抄？", fixedNow);
  assert.equal(result.analysis.behavior, "analyze_reference");
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "会员活动海报";
  project.goal = "让用户理解活动并扫码报名";
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(state, "客户让参考图还原得越像越好，但我怕照抄侵权，怎么跟客户解释？", fixedNow);
  assert.equal(result.analysis.behavior, "negotiate_reference_similarity");
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("参考还原度沟通"));
  assert.ok(result.reply.includes("可以保留"));
  assert.ok(result.reply.includes("必须改掉"));
  assert.ok(result.reply.includes("可以这样说"));
  assert.ok(result.reply.includes("像但不抄"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "这张参考图怎么拆解，哪些地方可以借鉴但不要照抄？", fixedNow);
  assert.equal(result.analysis.behavior, "analyze_reference");
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "新品活动海报";
  project.goal = "让用户扫码报名活动";
  const beforeTasks = state.tasks.length;
  const result = Core.applyInput(
    state,
    "帮我整理会议纪要：客户确认先做小红书封面和朋友圈海报；老板说主标题要更突出，二维码不要太小；尺寸还没确认，需要问运营；明天下午前给下一版。",
    fixedNow
  );
  assert.equal(result.analysis.behavior, "organize_meeting_notes");
  assert.equal(project.status, "waiting");
  assert.equal(project.dueDate, "2026-06-13");
  assert.ok(project.deliverables.includes("小红书封面"));
  assert.ok(project.deliverables.includes("朋友圈海报"));
  assert.ok(state.tasks.length >= beforeTasks + 2);
  assert.ok(state.tasks.some((task) => task.title.includes("会后执行")));
  assert.ok(state.tasks.some((task) => task.status === "waiting" && task.title.includes("会后确认")));
  assert.ok(result.reply.includes("沟通纪要整理"));
  assert.ok(result.reply.includes("已确认"));
  assert.ok(result.reply.includes("设计动作"));
  assert.ok(result.reply.includes("待确认"));
  assert.ok(result.reply.includes("发给对方可以这样收口"));
}

{
  const state = freshState();
  const result = Core.applyInput(state, "帮我整理这些反馈优先级，先改什么？", fixedNow);
  assert.equal(result.analysis.behavior, "synthesize_feedback_batch");
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "品牌活动海报";
  const result = Core.applyInput(
    state,
    "这版不太像她们家的风格，帮我判断怎么收回来。",
    fixedNow,
    { intent: { behavior: "check_brand_consistency", confidence: 0.82, reason: "用户在请求品牌一致性诊断。" } }
  );
  assert.equal(result.analysis.behavior, "check_brand_consistency");
  assert.equal(result.analysis.modelIntent.source, "model");
  assert.ok(result.reply.includes("品牌一致性检查"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "万圣节海报";
  const result = Core.applyInput(
    state,
    "主管刚说这一版太暗，不够年轻，明天下午前要改。",
    fixedNow,
    {
      intent: {
        intent: "record_feedback",
        confidence: 0.9,
        summary: "主管反馈海报太暗，需要更年轻，明天前修改。",
        entities: {
          source: "主管",
          dueDate: "2026-06-13",
          deliverables: ["海报"],
          feedback: {
            raw: "太暗，不够年轻",
            action: "提高画面明度，加入更年轻的配色和图形节奏。",
            reason: "当前视觉情绪偏沉，和年轻传播目标不匹配。",
            conflict: false,
          },
        },
        missing: ["尺寸"],
        nextAction: "先确认海报尺寸，再做一版更明亮的配色调整。",
        reason: "用户在转述主管反馈并给出截止时间。",
      },
    }
  );
  assert.equal(result.analysis.behavior, "record_feedback");
  assert.equal(result.analysis.modelIntent.source, "model");
  assert.equal(result.analysis.from, "主管");
  assert.equal(result.analysis.dueDate, "2026-06-13");
  assert.ok(result.analysis.deliverables.includes("海报"));
  assert.ok(state.feedback.at(-1).action.includes("提高画面明度"));
  assert.equal(state.tasks.at(-1).nextAction, "先确认海报尺寸，再做一版更明亮的配色调整。");
  assert.ok(result.reply.includes("尺寸"));
}

{
  const state = freshState();
  const before = state.projects.length;
  const result = Core.applyInput(
    state,
    "新项目，咖啡新品要做小红书封面和朋友圈海报，下周一交。",
    fixedNow,
    {
      intent: {
        intent: "create_project",
        confidence: 0.88,
        summary: "创建咖啡新品设计项目。",
        entities: {
          projectName: "咖啡新品",
          projectType: "社媒图",
          dueDate: "2026-06-15",
          deliverables: ["小红书封面", "朋友圈海报"],
          goal: "让用户知道新品上市并想进店",
          audience: "年轻咖啡消费者",
          scene: "小红书和朋友圈",
        },
        missing: ["尺寸", "交付格式"],
        nextAction: "先确认两个平台尺寸和导出格式。",
      },
    }
  );
  assert.equal(result.analysis.behavior, "create_project");
  assert.equal(state.projects.length, before + 1);
  assert.equal(state.projects[0].name, "咖啡新品");
  assert.equal(state.projects[0].type, "社媒图");
  assert.equal(state.projects[0].goal, "让用户知道新品上市并想进店");
  assert.ok(state.projects[0].deliverables.includes("小红书封面"));
  assert.ok(result.reply.includes("尺寸"));
}

{
  const state = freshState();
  const result = Core.applyInput(
    state,
    "今天要做什么？",
    fixedNow,
    { intent: { behavior: "unknown_behavior", confidence: 0.95, reason: "坏结果。" } }
  );
  assert.equal(result.analysis.behavior, "ask_plan");
}

{
  const state = freshState();
  const result = Core.applyInput(
    state,
    "今天要做什么？",
    fixedNow,
    { intent: { behavior: "record_note", confidence: 0.2, reason: "模型不确定。" } }
  );
  assert.equal(result.analysis.behavior, "ask_plan");
}

console.log("All Design Desk Agent tests passed.");
