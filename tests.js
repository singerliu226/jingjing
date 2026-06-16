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
  assert.equal(result.analysis.behavior, "solve_design_issue");
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
  assert.equal(result.analysis.behavior, "solve_design_issue");
  assert.ok(result.reply.includes("手机预览"));
  assert.ok(result.reply.includes("少字"));
  assert.ok(result.reply.includes("时间很近"));
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
  const result = Core.applyInput(state, "标题字体怎么配比较好？", fixedNow);
  assert.equal(result.analysis.behavior, "answer_design_question");
  assert.ok(result.reply.includes("字体选择"));
  assert.ok(result.reply.includes("1-2 个字体家族"));
  assert.ok(result.reply.includes("下一步"));
}

{
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.type = "包装";
  project.deliverables = ["包装"];
  const result = Core.applyInput(state, "印刷尺寸和导出格式要注意什么？", fixedNow);
  assert.equal(result.analysis.behavior, "answer_design_question");
  assert.ok(result.reply.includes("交付规格"));
  assert.ok(result.reply.includes("出血"));
  assert.ok(result.reply.includes("CMYK"));
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

console.log("All Design Desk Agent tests passed.");
