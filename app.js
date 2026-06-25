(function () {
  "use strict";

  const Core = window.DesignDeskCore;
  const storage = window.localStorage;
  let state = Core.loadState(storage);
  let projectFilter = state.activeFilter || "all";
  let currentView = "workbench";
  let projectAnalysisTimer = 0;
  let projectAnalysisRun = 0;
  let pendingAttachments = [];
  const transientAttachmentPreviews = new Map();
  const MODEL_REQUEST_TIMEOUT_MS = 30_000;

  const nodes = {
    workbenchView: document.querySelector("#workbench-view"),
    serviceGate: document.querySelector("#service-gate"),
    projectList: document.querySelector("#project-list"),
    chatStream: document.querySelector("#chat-stream"),
    composer: document.querySelector("#composer"),
    messageInput: document.querySelector("#message-input"),
    attachmentInput: document.querySelector("#attachment-input"),
    attachButton: document.querySelector("#attach-button"),
    attachmentDock: document.querySelector("#attachment-dock"),
    activeProjectName: document.querySelector("#active-project-name"),
    activeProjectType: document.querySelector("#active-project-type"),
    projectTaskList: document.querySelector("#project-task-list"),
    waitingList: document.querySelector("#waiting-list"),
    nextList: document.querySelector("#next-list"),
    riskList: document.querySelector("#risk-list"),
    todayCount: document.querySelector("#today-count"),
    waitingCount: document.querySelector("#waiting-count"),
    saveProjectBtn: document.querySelector("#save-project-btn"),
    newProjectBtn: document.querySelector("#new-project-btn"),
    sortProjectsBtn: document.querySelector("#sort-projects-btn"),
    addTaskBtn: document.querySelector("#add-task-btn"),
    deleteProjectBtn: document.querySelector("#delete-project-btn"),
    detailToggle: document.querySelector("#detail-toggle"),
    detailFab: document.querySelector("#detail-fab"),
    railBackdrop: document.querySelector("#rail-backdrop"),
    projectForm: document.querySelector("#project-form"),
    projectNameInput: document.querySelector("#project-name-input"),
    projectTypeInput: document.querySelector("#project-type-input"),
    projectDueInput: document.querySelector("#project-due-input"),
    projectStatusInput: document.querySelector("#project-status-input"),
    projectGoalInput: document.querySelector("#project-goal-input"),
    projectRequirementsInput: document.querySelector("#project-requirements-input"),
    projectDeliverablesInput: document.querySelector("#project-deliverables-input"),
    projectProgressInput: document.querySelector("#project-progress-input"),
  };

  function persist() {
    Core.saveState(storage, state);
  }

  function render() {
    const active = Core.getProject(state, state.activeProjectId);
    if (!active) return;
    renderProjectHeader(active);
    renderProjectForm(active);
    renderProjects();
    renderMessages();
    renderDashboard();
  }

  function commitAndRender() {
    persist();
    render();
  }

  function renderProjectHeader(project) {
    nodes.activeProjectName.textContent = project.name;
    nodes.activeProjectType.textContent = `${project.type} · ${statusLabel(project.status)}`;
  }

  function guardServiceEntry() {
    if (window.location.protocol !== "file:") return;
    document.body.classList.add("service-entry-required");
    if (nodes.serviceGate) nodes.serviceGate.hidden = false;
    const shell = document.querySelector(".app-shell");
    if (shell) {
      shell.inert = true;
      shell.setAttribute("aria-hidden", "true");
    }
  }

  function openProjectDetail() {
    document.body.classList.add("detail-open");
  }

  function closeProjectDetail() {
    document.body.classList.remove("detail-open");
  }

  function renderProjectForm(project) {
    nodes.projectNameInput.value = project.name || "";
    nodes.projectTypeInput.value = project.type || "";
    nodes.projectDueInput.value = project.dueDate || "";
    nodes.projectStatusInput.value = project.status || "todo";
    nodes.projectGoalInput.value = project.goal || "";
    nodes.projectRequirementsInput.value = project.requirements || "";
    nodes.projectDeliverablesInput.value = (project.deliverables || []).join("、");
    nodes.projectProgressInput.value = project.progressNote || "";
  }

  function renderProjects() {
    const projects = state.projects
      .filter((project) => filterProject(project, projectFilter))
      .slice();
    nodes.projectList.replaceChildren(
      ...projects.map((project) => {
        const button = el("button", {
          className: `project-card ${project.id === state.activeProjectId ? "is-active" : ""}`,
          type: "button",
          onclick: () => {
            state.activeProjectId = project.id;
            commitAndRender();
          },
        });
        button.append(
          el("span", { className: `status-dot status-${project.status}` }),
          el("span", { className: "project-card-main" }, [
            el("strong", { textContent: project.name }),
            el("small", { textContent: `${project.type} · ${project.dueDate || "未设截止"}` }),
          ])
        );
        return button;
      })
    );
  }

  function renderMessages() {
    const activeId = state.activeProjectId;
    const visible = state.messages.filter((message) => message.projectId === activeId);
    nodes.chatStream.replaceChildren(
      ...visible.map((message) => {
        const wrapper = el("article", { className: `message message-${message.role}` });
        wrapper.append(
          el("div", { className: "avatar", textContent: message.role === "agent" ? "D" : "你" }),
          el("div", { className: "message-body" }, [
            el("div", {
              className: "message-meta",
              textContent: `${message.role === "agent" ? "小画桌" : "菁菁"} · ${formatTime(message.createdAt)}`,
            }),
            renderMessageBubble(message),
            renderMessageAttachments(message),
          ])
        );
        return wrapper;
      })
    );
    nodes.chatStream.scrollTop = nodes.chatStream.scrollHeight;
  }

  function renderDashboard() {
    const dashboard = Core.getDashboard(state);
    const activeTasks = state.tasks.filter((task) => task.projectId === state.activeProjectId);
    nodes.todayCount.textContent = activeTasks.length;
    nodes.waitingCount.textContent = dashboard.waiting.length;
    nodes.projectTaskList.replaceChildren(...withEmpty(activeTasks.map(renderProjectTaskEditor), "还没有任务。点“新增任务”，或者直接在中间告诉小画桌要做什么。"));
    nodes.waitingList.replaceChildren(...withEmpty(dashboard.waiting.slice(0, 3).map(renderPlanTask), "没有等待确认，菁菁可以专心推进设计"));
    nodes.nextList.replaceChildren();
    const activeRisks = dashboard.risks.filter((risk) => risk.projectId === state.activeProjectId);
    nodes.riskList.replaceChildren(...withEmpty(activeRisks.slice(0, 4).map(renderRisk), "这个项目暂时没有需要确认的风险"));
  }

  function renderProjectTaskEditor(task) {
    const item = el("article", { className: `detail-task priority-${task.priority}` });
    item.append(
      el("div", { className: "detail-task-grid" }, [
        el("label", {}, [
          document.createTextNode("任务"),
          taskInput(task, "title", task.title, "例如：完成首版包装主视觉"),
        ]),
        el("label", {}, [
          document.createTextNode("截止"),
          taskInput(task, "dueDate", task.dueDate || "", "", "date"),
        ]),
        el("label", {}, [
          document.createTextNode("状态"),
          taskSelect(task, "status", task.status),
        ]),
        el("label", {}, [
          document.createTextNode("优先级"),
          taskSelect(task, "priority", task.priority || "normal", [
            ["high", "高"],
            ["normal", "普通"],
          ]),
        ]),
      ]),
      el("label", { className: "task-detail-label" }, [
        document.createTextNode("细节 / 下一步"),
        taskTextarea(task, "nextAction", task.nextAction || "", "写清楚要改哪里、等谁确认、交付时注意什么"),
      ]),
      el("div", { className: "detail-task-actions" }, [
        el("button", {
          className: "mini-action is-done",
          type: "button",
          textContent: task.status === "done" ? "已完成" : "完成",
          onclick: () => completeTask(task.id),
        }),
        el("button", {
          className: "mini-action",
          type: "button",
          textContent: "删除",
          onclick: () => deleteTask(task.id),
        }),
      ])
    );
    return item;
  }

  function taskInput(task, field, value, placeholder = "", type = "text") {
    return el("input", {
      type,
      value,
      placeholder,
      oninput: (event) => updateTaskField(task.id, field, event.target.value),
    });
  }

  function taskTextarea(task, field, value, placeholder = "") {
    return el("textarea", {
      rows: 2,
      value,
      placeholder,
      oninput: (event) => updateTaskField(task.id, field, event.target.value),
    });
  }

  function taskSelect(task, field, value, options) {
    const choices =
      options ||
      [
        ["todo", "未开始"],
        ["designing", "设计中"],
        ["waiting", "待确认"],
        ["done", "已完成"],
      ];
    const select = el("select", {
      onchange: (event) => updateTaskField(task.id, field, event.target.value),
    });
    choices.forEach(([optionValue, label]) => {
      const option = el("option", { value: optionValue, textContent: label });
      option.selected = optionValue === value;
      select.append(option);
    });
    return select;
  }

  function renderPlanTask(task) {
    const project = Core.getProject(state, task.projectId);
    const statusText = task.status === "waiting" ? "等确认" : task.priority === "high" ? "先做" : "可推进";
    const item = el("article", {
      className: `task-row plan-task priority-${task.priority}`,
    });
    item.append(
      el("span", { className: "task-check", textContent: task.status === "done" ? "✓" : "" }),
      el("span", { className: "task-text" }, [
        el("strong", { textContent: task.title }),
        el("small", { textContent: `${statusText} · ${project.name} · ${task.dueDate || "未设截止"} · ${task.nextAction}` }),
      ]),
      el("span", { className: "task-actions" }, [
        el("button", {
          className: "mini-action is-done",
          type: "button",
          textContent: "完成",
          onclick: () => completeTask(task.id),
        })
      ])
    );
    return item;
  }

  function renderTask(task) {
    const project = Core.getProject(state, task.projectId);
    const item = el("button", {
      className: `task-row priority-${task.priority}`,
      type: "button",
      onclick: () => {
        state.activeProjectId = task.projectId;
        commitAndRender();
      },
    });
    item.append(
      el("span", { className: "task-check", textContent: task.status === "done" ? "✓" : "" }),
      el("span", { className: "task-text" }, [
        el("strong", { textContent: task.title }),
        el("small", { textContent: `${project.name} · ${task.dueDate || "待定"} · ${task.nextAction}` }),
      ])
    );
    return item;
  }

  function withEmpty(items, text) {
    if (items.length) return items;
    return [el("div", { className: "empty-state", textContent: text })];
  }

  function renderMessageAttachments(message) {
    const attachments = Array.isArray(message.attachments) ? message.attachments : [];
    if (!attachments.length) return el("div", { className: "message-attachments is-empty" });
    const previews = transientAttachmentPreviews.get(message.id) || [];
    return el(
      "div",
      { className: "message-attachments" },
      attachments.map((attachment) => {
        const preview = previews.find((item) => item.id === attachment.id);
        if (attachment.kind === "image" && preview && preview.dataUrl) {
          return el("figure", { className: "message-attachment image-attachment" }, [
            el("img", { src: preview.dataUrl, alt: attachment.name }),
            el("figcaption", { textContent: attachment.name }),
          ]);
        }
        return el("span", { className: "message-attachment file-attachment", textContent: attachment.name });
      })
    );
  }

  function renderAttachmentDock() {
    if (!pendingAttachments.length) {
      nodes.attachmentDock.replaceChildren();
      nodes.attachmentDock.classList.remove("is-active");
      return;
    }
    nodes.attachmentDock.classList.add("is-active");
    nodes.attachmentDock.replaceChildren(
      ...pendingAttachments.map((attachment) => {
        const item = el("div", { className: `draft-attachment ${attachment.kind}` });
        if (attachment.kind === "image") item.append(el("img", { src: attachment.dataUrl, alt: attachment.name }));
        item.append(
          el("span", { textContent: attachment.name }),
          el("button", {
            type: "button",
            title: "移除附件",
            textContent: "×",
            onclick: () => {
              pendingAttachments = pendingAttachments.filter((itemAttachment) => itemAttachment.id !== attachment.id);
              renderAttachmentDock();
            },
          })
        );
        return item;
      })
    );
  }

  function uniqueTasks(tasks) {
    const seen = new Set();
    return tasks.filter((task) => {
      if (seen.has(task.id)) return false;
      seen.add(task.id);
      return true;
    });
  }

  function completeTask(taskId) {
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task) return;
    state.activeProjectId = task.projectId;
    task.status = "done";
    commitAndRender();
  }

  function updateTaskField(taskId, field, value) {
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task) return;
    task[field] = value;
    persist();
    renderProjects();
  }

  function addProjectTask() {
    const project = Core.getProject(state, state.activeProjectId);
    state.tasks.push({
      id: uid("t"),
      projectId: project.id,
      title: "新任务",
      priority: "normal",
      dueDate: project.dueDate || "",
      status: "todo",
      nextAction: "写清楚下一步要做什么",
      feedbackIds: [],
    });
    commitAndRender();
  }

  function deleteTask(taskId) {
    state.tasks = state.tasks.filter((task) => task.id !== taskId);
    commitAndRender();
  }

  function deleteActiveProject() {
    const project = Core.getProject(state, state.activeProjectId);
    if (!project) return;
    const confirmed = window.confirm(`确定删除「${project.name}」吗？这个项目的对话、任务和反馈都会一起删除。`);
    if (!confirmed) return;
    state.projects = state.projects.filter((item) => item.id !== project.id);
    state.tasks = state.tasks.filter((item) => item.projectId !== project.id);
    state.messages = state.messages.filter((item) => item.projectId !== project.id);
    state.feedback = state.feedback.filter((item) => item.projectId !== project.id);
    state.checklist = state.checklist.filter((item) => item.projectId !== project.id);
    if (!state.projects.length) {
      createNewProject({ silent: true });
      return;
    }
    state.activeProjectId = state.projects[0].id;
    commitAndRender();
  }

  function snoozeTask(taskId) {
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task) return;
    state.activeProjectId = task.projectId;
    const base = task.dueDate ? new Date(task.dueDate) : new Date();
    base.setDate(base.getDate() + 1);
    task.dueDate = base.toISOString().slice(0, 10);
    task.priority = "normal";
    addAgentMessage(`已延后：${task.title}\n新的截止日期是 ${task.dueDate}。如果这是对外承诺事项，建议同步告知确认人。`);
  }

  function renderRisk(risk) {
    const item = el("button", {
      className: "risk-row",
      type: "button",
      onclick: () => {
        state.activeProjectId = risk.projectId;
        commitAndRender();
      },
    });
    item.append(el("strong", { textContent: risk.projectName }), el("span", { textContent: risk.text }));
    return item;
  }

  function renderPortfolioPage() {
    nodes.portfolioPageList.replaceChildren(
      ...state.projects.map((project) => {
        const feedbackItems = state.feedback.filter((item) => item.projectId === project.id);
        const card = el("article", { className: "portfolio-page-card" });
        card.append(
          el("div", { className: "portfolio-score", textContent: `${project.portfolioScore}/100` }),
          el("div", { className: "portfolio-page-body" }, [
            el("h4", { textContent: project.name }),
            el("p", { textContent: project.portfolio.problem || project.goal || "还需要补充设计问题和目标。" }),
            el("small", { textContent: `反馈 ${feedbackItems.length} 条 · 交付物 ${project.deliverables.length} 项` }),
          ]),
          el("button", {
            className: "mini-action is-done",
            type: "button",
            textContent: "整理",
            onclick: () => {
              state.activeProjectId = project.id;
              showView("workbench");
              addAgentMessage(Core.generatePortfolioCase(project, feedbackItems));
            },
          })
        );
        return card;
      })
    );
  }

  function renderLibraryPage() {
    const items = [
      ["太普通", "增强视觉记忆点，提高主标题对比，加入明确视觉锚点。"],
      ["太暗", "提高整体明度和关键元素对比，检查背景是否压住信息。"],
      ["更年轻", "使用更轻快配色、更大留白和更灵动的图形节奏。"],
      ["更高级", "减少装饰，统一字体和色彩数量，强化留白与细节克制。"],
      ["看不清", "检查字号、行距、对比度和移动端安全区。"],
      ["不够突出", "重新建立信息层级，放大主标题或主视觉。"],
    ];
    nodes.libraryPageList.replaceChildren(
      ...items.map(([term, action]) => {
        const card = el("button", {
          className: "library-card",
          type: "button",
          onclick: () => {
            showView("workbench");
            nodes.messageInput.value = `反馈：画面${term}。`;
            nodes.messageInput.focus();
          },
        });
        card.append(el("strong", { textContent: term }), el("span", { textContent: action }));
        return card;
      })
    );
  }

  async function submitMessage(text) {
    const attachmentsToSend = pendingAttachments.slice();
    const clean = normalize(text) || (attachmentsToSend.length ? "请帮我分析这张设计图，指出主要问题和下一步怎么改。" : "");
    if (!clean) return;
    const modelIntent = await askQwenIntent(clean);
    const previousMessageCount = state.messages.length;
    const result = Core.applyInput(state, clean, new Date(), { intent: modelIntent, localMode: "guardrail" });
    attachFilesToUserMessage(previousMessageCount, attachmentsToSend);
    applyProjectAutofill(clean, modelIntent, result ? result.analysis : null);
    nodes.messageInput.value = "";
    pendingAttachments = [];
    renderAttachmentDock();
    commitAndRender();
    if (result && shouldKeepLocalReply(result.analysis)) return;
    await askQwen(clean, previousMessageCount, result ? result.analysis : null, attachmentsToSend);
  }

  function attachFilesToUserMessage(messageIndex, attachments) {
    if (!attachments.length) return;
    const message = state.messages[messageIndex];
    if (!message) return;
    message.attachments = attachments.map(({ id, kind, name, mimeType, size, text }) => ({
      id,
      kind,
      name,
      mimeType,
      size,
      text: kind === "text" ? text : "",
    }));
    transientAttachmentPreviews.set(
      message.id,
      attachments
        .filter((attachment) => attachment.kind === "image")
        .map((attachment) => ({ id: attachment.id, dataUrl: attachment.dataUrl }))
    );
  }

  function applyProjectAutofill(message, modelIntent, analysis) {
    const project = Core.getProject(state, state.activeProjectId);
    if (!project) return false;
    const fill = buildProjectAutofill(message, modelIntent, analysis);
    let changed = false;
    const isStarterName = !project.name || ["未命名设计项目", "第一个设计项目"].includes(project.name);
    if (fill.name && isStarterName) {
      project.name = fill.name;
      changed = true;
    }
    if (fill.type && (!project.type || project.type === "设计项目")) {
      project.type = fill.type;
      changed = true;
    }
    if (fill.dueDate && project.dueDate !== fill.dueDate) {
      project.dueDate = fill.dueDate;
      state.tasks
        .filter((task) => task.projectId === project.id && !task.dueDate)
        .forEach((task) => {
          task.dueDate = fill.dueDate;
        });
      changed = true;
    }
    if (fill.status && project.status !== fill.status && fill.status !== "todo") {
      project.status = fill.status;
      changed = true;
    }
    if (fill.deliverables.length) {
      const merged = Array.from(new Set((project.deliverables || []).concat(fill.deliverables)));
      if (merged.length !== (project.deliverables || []).length) {
        project.deliverables = merged;
        changed = true;
      }
    }
    if (fill.goal && shouldReplaceField(project.goal)) {
      project.goal = fill.goal;
      changed = true;
    }
    if (fill.requirements && appendUniqueField(project, "requirements", fill.requirements)) changed = true;
    if (fill.progressNote && appendUniqueField(project, "progressNote", fill.progressNote)) changed = true;
    fill.tasks.forEach((task) => {
      if (hasSimilarTask(project.id, task.title)) return;
      state.tasks.push({
        id: uid("t"),
        projectId: project.id,
        title: task.title,
        priority: task.priority || "normal",
        dueDate: task.dueDate || project.dueDate || "",
        status: task.status || "todo",
        nextAction: task.nextAction || "继续补齐这一步的具体要求",
        feedbackIds: [],
      });
      changed = true;
    });
    if (!changed) return false;
    project.risks = Array.from(new Set(buildProjectRisks(project).concat(project.risks.filter((risk) => !risk.startsWith("缺少")))));
    syncProjectWork(project);
    persist();
    scheduleProjectAnalysis(project.id);
    nodes.saveProjectBtn.textContent = "已从对话补齐";
    return true;
  }

  function buildProjectAutofill(message, modelIntent, analysis) {
    const entities = (modelIntent && modelIntent.entities) || {};
    const deliverables = compactStrings(entities.deliverables || analysis?.deliverables || inferDeliverables(message));
    const name = cleanProjectName(entities.projectName || inferProjectName(message, deliverables));
    const type = normalize(entities.projectType || entities.type || inferProjectType(message, deliverables));
    const dueDate = normalize(entities.dueDate || analysis?.dueDate || "");
    const status = normalize(entities.status || analysis?.status || "");
    const goal = normalize(entities.goal || entities.brief?.goal || "");
    const requirements = normalize(
      entities.requirements ||
        entities.brief?.requirements ||
        buildFallbackRequirement(message, { name, type, deliverables, goal })
    );
    const progressNote = normalize(entities.progressNote || entities.progress || "");
    const tasks = normalizeAutofillTasks(entities.tasks);
    return { name, type, dueDate, status, goal, requirements, progressNote, deliverables, tasks };
  }

  function inferDeliverables(text) {
    const patterns = ["公众号头图", "朋友圈海报", "小红书封面", "社群长图", "海报", "包装", "Banner", "banner", "PPT", "画册", "折页"];
    return patterns.filter((item) => text.includes(item));
  }

  function inferProjectType(text, deliverables) {
    const combined = `${text} ${deliverables.join(" ")}`;
    if (/包装/.test(combined)) return "包装";
    if (/海报|封面|头图|社群长图/.test(combined)) return "海报";
    if (/Banner|banner/.test(combined)) return "Banner";
    if (/PPT/.test(combined)) return "PPT";
    if (/画册|折页/.test(combined)) return "印刷物";
    return "";
  }

  function inferProjectName(text, deliverables) {
    const quoted = text.match(/[「《](.+?)[」》]/);
    if (quoted) return quoted[1];
    const direct = text.match(/([\u4e00-\u9fa5A-Za-z0-9·]{1,14}(?:海报|包装|Banner|banner|封面|头图|PPT|画册|折页))/);
    if (direct) return direct[1];
    if (deliverables.length === 1) return `${deliverables[0]}项目`;
    return "";
  }

  function cleanProjectName(value) {
    return normalize(value)
      .replace(/^(怎么做|如何做|怎么设计|如何设计|做|设计|帮我|我想做|想做|要做|给我做)/, "")
      .replace(/[？?。,.，；;：:]$/g, "")
      .slice(0, 22);
  }

  function buildFallbackRequirement(message, fill) {
    const facts = [];
    const target = fill.name || (fill.deliverables.length ? `${fill.deliverables[0]}项目` : "");
    if (target) facts.push(`菁菁想做「${target}」`);
    if (fill.deliverables.length) facts.push(`交付物先按 ${fill.deliverables.join("、")} 记录`);
    if (fill.goal) facts.push(`核心目标是 ${fill.goal}`);
    if (!facts.length) return "";
    const needs = inferMissingQuestions(message, fill);
    return `${facts.join("；")}。${needs}`;
  }

  function inferMissingQuestions(message, fill) {
    const questions = [];
    if (!/(投放|发布|门口|店内|朋友圈|小红书|公众号|线下|线上|场景|用途)/.test(message)) questions.push("投放位置");
    if (!/(主题|活动|优惠|新品|开业|乐队|DJ|时间|地点|标题|主信息)/i.test(message)) questions.push("主信息");
    if (!/(高级|年轻|复古|霓虹|工业|可爱|国潮|极简|暗黑|活泼|风格|调性)/.test(message)) questions.push("视觉调性");
    if (!fill.deliverables.length) questions.push("交付物");
    if (!questions.length) return "基础方向已记录，下一步可以让小画桌拆成今天能做的任务。";
    return `还需要确认：${questions.slice(0, 4).join("、")}。`;
  }

  function normalizeAutofillTasks(tasks) {
    if (!Array.isArray(tasks)) return [];
    return tasks
      .map((task) => ({
        title: normalize(task.title).slice(0, 40),
        dueDate: normalize(task.dueDate),
        status: ["todo", "designing", "waiting", "done"].includes(task.status) ? task.status : "todo",
        priority: task.priority === "high" ? "high" : "normal",
        nextAction: normalize(task.nextAction).slice(0, 120),
      }))
      .filter((task) => task.title)
      .slice(0, 4);
  }

  function appendUniqueField(project, field, value) {
    const current = normalize(project[field]);
    if (!value || current.includes(value)) return false;
    project[field] = current ? `${current}\n${value}` : value;
    return true;
  }

  function shouldReplaceField(value) {
    const clean = normalize(value);
    return !clean || clean === "待从需求里补充目标。";
  }

  function hasSimilarTask(projectId, title) {
    return state.tasks.some((task) => task.projectId === projectId && normalize(task.title) === normalize(title));
  }

  function compactStrings(items) {
    return (Array.isArray(items) ? items : [items]).map(normalize).filter(Boolean);
  }

  async function askQwenIntent(message) {
    try {
      const project = getProjectContext(state.activeProjectId);
      const dashboard = Core.getDashboard(state);
      const { response, payload } = await fetchJsonWithTimeout(`${getApiBase()}/api/intent`, {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({
          message,
          currentDate: getLocalDateString(),
          project,
          dashboard: {
            todayCount: dashboard.today.length,
            waitingCount: dashboard.waiting.length,
            riskCount: dashboard.risks.length,
          },
          recentMessages: state.messages
            .filter((item) => item.projectId === state.activeProjectId)
            .slice(Math.max(0, state.messages.length - 8)),
        }),
      }, 2500);
      if (!response.ok || payload.error) return null;
      return payload.intent || null;
    } catch (error) {
      return null;
    }
  }

  function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function shouldKeepLocalReply(analysis) {
    if (!analysis) return false;
    const localOnlyBehaviors = [
      "cancel_task",
      "complete_checklist",
      "explain_sanitized_error",
      "snooze_task",
      "clear_waiting",
      "mark_feedback_handled",
      "record_version",
      "update_deadline",
      "update_project_name",
      "update_project_type",
      "update_project_specs",
    ];
    return localOnlyBehaviors.includes(analysis.behavior);
  }

  async function askQwen(message, previousMessageCount, analysis, attachments = []) {
    const agentMessage = state.messages[previousMessageCount + 1];
    if (!agentMessage || agentMessage.role !== "agent") return;
    const fallbackReply = agentMessage.text;
    const visibleLocalReply = getVisibleLocalReply(fallbackReply, analysis);
    agentMessage.text = composePendingModelReply(visibleLocalReply);
    commitAndRender();
    try {
      const project = getProjectContext(state.activeProjectId);
      const dashboard = Core.getDashboard(state);
      const { response, payload } = await fetchJsonWithTimeout(`${getApiBase()}/api/chat`, {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({
          message,
          localReply: fallbackReply,
          analysis: analysis
            ? {
                behavior: analysis.behavior,
                summary: analysis.summary,
                missing: analysis.missing,
              }
            : null,
          attachments: attachments.map((attachment) => ({
            kind: attachment.kind,
            name: attachment.name,
            mimeType: attachment.mimeType,
            size: attachment.size,
            dataUrl: attachment.kind === "image" ? attachment.dataUrl : "",
            text: attachment.kind === "text" ? attachment.text : "",
          })),
          project,
          dashboard: {
            todayCount: dashboard.today.length,
            waitingCount: dashboard.waiting.length,
            riskCount: dashboard.risks.length,
          },
          recentMessages: state.messages
            .filter((item) => item.projectId === state.activeProjectId)
            .slice(Math.max(0, state.messages.length - 8)),
        }),
      });
      if (!response.ok || payload.error) throw new Error(payload.error || "千问请求失败");
      agentMessage.text = composeModelReply(visibleLocalReply, payload.reply);
    } catch (error) {
      agentMessage.text = composeModelErrorReply(visibleLocalReply, error, fallbackReply, analysis);
    }
    commitAndRender();
  }

  function getVisibleLocalReply(localReply, analysis) {
    if (!shouldShowLocalUpdateWithModelReply(analysis)) return "";
    return localReply;
  }

  function shouldShowLocalUpdateWithModelReply(analysis) {
    if (!analysis) return false;
    return [
      "record_feedback",
      "create_project",
      "record_note",
      "update_deliverables",
      "complete_progress",
      "waiting_confirmation",
      "record_project_outcome",
      "update_brief",
    ].includes(analysis.behavior);
  }

  function composePendingModelReply(localReply) {
    if (!localReply) return "正在请千问生成更贴合上下文的下一步建议...";
    return `已先整理：\n${localReply}\n\n正在请千问生成更贴合上下文的下一步建议...`;
  }

  function composeModelReply(localReply, modelReply) {
    const cleanModelReply = normalize(modelReply);
    if (!cleanModelReply) return localReply;
    if (!localReply) return cleanModelReply;
    return `已先整理：\n${localReply}\n\n千问建议：\n${cleanModelReply}`;
  }

  function composeModelErrorReply(localReply, error, fallbackReply = "", analysis = null) {
    const hint = buildModelErrorHint(error);
    if (!localReply && shouldKeepFallbackOnModelError(analysis, fallbackReply)) {
      return `${fallbackReply}\n\n${hint} 模型暂时没接上，我先保留这版本地设计判断。`;
    }
    if (!localReply) return `${hint} 可以先继续记录下一条；我不会把设计咨询误写进项目。`;
    return `已先整理：\n${localReply}\n\n${hint} 本地整理结果已保留，可以继续记录下一条。`;
  }

  function shouldKeepFallbackOnModelError(analysis, fallbackReply) {
    if (!analysis || !fallbackReply) return false;
    if (/核心判断[:：]/.test(fallbackReply) && /验收标准[:：]/.test(fallbackReply)) return true;
    return [
      "answer_design_question",
      "ask_design_directions",
      "solve_design_issue",
      "optimize_readability",
      "recommend_typography_system",
      "recommend_color_system",
    ].includes(analysis.behavior);
  }

  function buildModelErrorHint(error) {
    const message = normalize(error && error.message);
    if (/Load failed|Failed to fetch|NetworkError|abort/i.test(message)) {
      return "本地千问服务没有连上：请确认 localhost:4174 服务正在运行，并且页面是从 http://localhost:4174 打开的。";
    }
    if (/DASHSCOPE_API_KEY|API Key|401|403|Unauthorized|Forbidden/i.test(message)) {
      return "千问访问密钥还没配置好：请检查本地服务的启动配置。";
    }
    return `千问暂时没有连上：${message || "请求失败"}。`;
  }

  function getApiBase() {
    if (window.location.protocol === "http:" || window.location.protocol === "https:") return "";
    return window.localStorage.getItem("design-desk-api-base") || "http://localhost:4174";
  }

  function getApiHeaders() {
    const headers = { "Content-Type": "application/json" };
    const token = window.localStorage.getItem("design-desk-api-token");
    if (token) headers["X-Design-Desk-Token"] = token;
    return headers;
  }

  async function fetchJsonWithTimeout(url, options = {}, timeoutMs = MODEL_REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      let payload = {};
      try {
        payload = await response.json();
      } catch (error) {
        if (!response.ok) throw new Error("本地服务返回格式异常。");
        throw error;
      }
      return { response, payload };
    } finally {
      window.clearTimeout(timer);
    }
  }

  function handleAttachmentFiles(files) {
    const nextFiles = Array.from(files || []).slice(0, Math.max(0, 4 - pendingAttachments.length));
    if (!nextFiles.length) return;
    Promise.all(nextFiles.map(readAttachmentFile))
      .then((attachments) => {
        pendingAttachments = pendingAttachments.concat(attachments.filter(Boolean)).slice(0, 4);
        renderAttachmentDock();
      })
      .catch((error) => {
        addAgentMessage(`这个文件暂时没读进去：${error.message || "请换成 PNG、JPG、TXT 或 MD 再试。"}`);
      })
      .finally(() => {
        nodes.attachmentInput.value = "";
      });
  }

  function readAttachmentFile(file) {
    const isImage = file.type.startsWith("image/");
    const isText = /^text\/|json|csv|markdown/.test(file.type) || /\.(txt|md|csv|json)$/i.test(file.name);
    const maxSize = isImage ? 6 * 1024 * 1024 : 300 * 1024;
    if (!isImage && !isText) return Promise.reject(new Error("这一版先支持图片、TXT、MD、CSV、JSON。"));
    if (file.size > maxSize) return Promise.reject(new Error(isImage ? "图片不要超过 6MB。" : "文本文件不要超过 300KB。"));
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("文件读取失败。"));
      reader.onload = () => {
        const base = {
          id: uid("att"),
          kind: isImage ? "image" : "text",
          name: file.name,
          mimeType: file.type || (isImage ? "image/png" : "text/plain"),
          size: file.size,
        };
        if (isImage) resolve({ ...base, dataUrl: String(reader.result || "") });
        else resolve({ ...base, text: String(reader.result || "").slice(0, 12000) });
      };
      if (isImage) reader.readAsDataURL(file);
      else reader.readAsText(file);
    });
  }

  function fillQuickTemplate(template) {
    const active = Core.getProject(state, state.activeProjectId);
    const examples = {
      "主管反馈：": `主管反馈：${active.name} 画面`,
      "新需求：": `新需求：${active.name} 需要`,
      "我完成了：": `我完成了：${active.name} 的`,
      "等待确认：": `等待确认：${active.name} 的`,
    };
    nodes.messageInput.value = examples[template] || template;
    nodes.messageInput.focus();
  }

  function addAgentMessage(text) {
    state.messages.push({
      id: uid("m"),
      role: "agent",
      projectId: state.activeProjectId,
      createdAt: new Date().toISOString(),
      text,
    });
    commitAndRender();
  }

  function createNewProject(options = {}) {
    const projectId = uid("p");
    const project = {
      id: projectId,
      name: "未命名设计项目",
      type: "设计项目",
      source: "菁菁",
      goal: "",
      audience: "",
      scene: "",
      requirements: "",
      progressNote: "",
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
    };
    state.projects.unshift(project);
    state.tasks.push({
      id: uid("t"),
      projectId,
      title: "补齐项目详情",
      priority: "high",
      dueDate: "",
      status: "todo",
      nextAction: "先写清楚要求、DDL、交付物和当前进度",
      feedbackIds: [],
    });
    state.checklist.push(
      { id: uid("c"), projectId, label: "确认尺寸、用途和交付格式", done: false, group: "规格" },
      { id: uid("c"), projectId, label: "检查主信息层级和移动端可读性", done: false, group: "可读性" },
      { id: uid("c"), projectId, label: "整理源文件、导出文件和命名", done: false, group: "交付" }
    );
    state.activeProjectId = projectId;
    showView("workbench");
    if (options.silent) {
      commitAndRender();
      return;
    }
    addAgentMessage("新项目已创建。菁菁先在右侧填一点项目详情：要求、DDL、交付物和当前进度。填完以后，中间直接问我怎么做就好。");
  }

  function sortProjects() {
    state.projects.sort((a, b) => {
      const riskDiff = b.risks.length - a.risks.length;
      if (riskDiff) return riskDiff;
      return String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999"));
    });
    commitAndRender();
  }

  function auditRisks() {
    state.projects.forEach((project) => {
      if (!project.dueDate && !project.risks.includes("缺少截止时间")) project.risks.push("缺少截止时间");
      if (!project.deliverables.length && !project.risks.includes("缺少交付物清单")) project.risks.push("缺少交付物清单");
      if (!project.goal && !project.risks.includes("缺少设计目标")) project.risks.push("缺少设计目标");
    });
    addAgentMessage("已完成风险扫描：我重点检查了设计目标、截止时间、交付物、反馈冲突和等待确认事项。右侧风险提醒已更新。");
  }

  function showChecklist() {
    const project = Core.getProject(state, state.activeProjectId);
    const items = state.checklist.filter((item) => item.projectId === project.id);
    addAgentMessage(`交付检查：${project.name}\n${items.map((item) => `${item.done ? "✓" : "□"} ${item.label}`).join("\n")}`);
  }

  function markWaitingSummary() {
    const project = Core.getProject(state, state.activeProjectId);
    const dashboard = Core.getDashboard(state);
    if (!dashboard.waiting.length && !project.risks.length) {
      addAgentMessage("现在没有明显等待确认事项。");
      return;
    }
    addAgentMessage(Core.generateConfirmationMessage(state, project, "帮我整理等待确认的话术"));
  }

  function showAllTasks() {
    const project = Core.getProject(state, state.activeProjectId);
    const tasks = state.tasks.filter((task) => task.projectId === project.id);
    if (!tasks.length) {
      addAgentMessage("这个项目还没有任务。你可以先输入一条需求或反馈，我会帮你整理出待办。");
      return;
    }
    addAgentMessage(`项目任务清单：${project.name}\n${tasks.map((task) => `- ${statusLabel(task.status)}｜${task.title}｜${task.dueDate || "待定"}`).join("\n")}`);
  }

  function updateActiveProjectFromForm() {
    const project = Core.getProject(state, state.activeProjectId);
    const preservedRisks = project.risks.filter((risk) => !risk.startsWith("缺少"));
    project.name = nodes.projectNameInput.value.trim() || "未命名设计项目";
    project.type = nodes.projectTypeInput.value.trim() || "设计项目";
    project.dueDate = nodes.projectDueInput.value;
    project.status = nodes.projectStatusInput.value || "todo";
    project.goal = nodes.projectGoalInput.value.trim();
    project.requirements = nodes.projectRequirementsInput.value.trim();
    project.deliverables = splitList(nodes.projectDeliverablesInput.value);
    project.progressNote = nodes.projectProgressInput.value.trim();
    project.risks = Array.from(new Set(buildProjectRisks(project).concat(preservedRisks)));
    syncProjectWork(project);
    renderProjectHeader(project);
    renderProjects();
    renderDashboard();
    persist();
    scheduleProjectAnalysis(project.id);
  }

  function splitList(value) {
    return String(value || "")
      .split(/[、,，\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function buildProjectRisks(project) {
    const risks = [];
    if (!project.goal) risks.push("缺少设计目标");
    if (!project.deliverables.length) risks.push("缺少交付物清单");
    if (!project.dueDate) risks.push("缺少截止时间");
    return risks;
  }

  function updateProjectBriefTask(project) {
    const task = state.tasks.find((item) => item.projectId === project.id && (item.title.startsWith("补齐项目小纸条") || item.title.startsWith("补齐项目详情")));
    project.risks = project.risks.filter((risk) => {
      if (risk === "缺少设计目标" && project.goal) return false;
      if (risk === "缺少交付物清单" && project.deliverables.length) return false;
      if (risk === "缺少截止时间" && project.dueDate) return false;
      return true;
    });
    if (!task) return;
    const hasBaseInfo = project.goal && project.deliverables.length && project.dueDate;
    task.status = hasBaseInfo ? "done" : "todo";
    task.nextAction = hasBaseInfo ? "可以开始设计或记录下一条反馈" : "先在右侧写清楚要求、DDL、交付物和当前进度";
  }

  function syncProjectWork(project) {
    updateProjectBriefTask(project);
    state.tasks
      .filter((task) => task.projectId === project.id && task.status !== "done" && task.status !== "waiting")
      .forEach((task) => {
        if (!task.dueDate && project.dueDate) task.dueDate = project.dueDate;
        if (project.dueDate && task.nextAction.includes("截止时间")) {
          task.nextAction = task.nextAction
            .replace("、截止时间", "")
            .replace("截止时间、", "")
            .replace("截止时间", "")
            .replace(/：、/g, "：")
            .replace(/：$/, "：继续确认反馈人和交付细节");
        }
      });
  }

  function scheduleProjectAnalysis(projectId) {
    window.clearTimeout(projectAnalysisTimer);
    const project = Core.getProject(state, projectId);
    nodes.saveProjectBtn.textContent = isProjectReadyForWorkflow(project) ? "已保存，准备整理" : "已自动保存";
    if (!isProjectReadyForWorkflow(project)) return;
    projectAnalysisTimer = window.setTimeout(() => analyzeProjectFromCard(projectId), 900);
  }

  function isProjectReadyForWorkflow(project) {
    return Boolean(project && project.name && project.type && (project.goal || project.requirements) && project.dueDate && project.deliverables.length);
  }

  function projectWorkflowFingerprint(project) {
    const taskFingerprint = state.tasks
      .filter((task) => task.projectId === project.id)
      .map((task) => [task.title, task.status, task.priority, task.dueDate, task.nextAction].join("|"))
      .join("::");
    return [
      project.id,
      project.name,
      project.type,
      project.dueDate,
      project.goal,
      project.requirements,
      project.progressNote,
      project.deliverables.join("|"),
      taskFingerprint,
    ].join("::");
  }

  async function analyzeProjectFromCard(projectId) {
    const project = Core.getProject(state, projectId);
    if (!project || !isProjectReadyForWorkflow(project)) return;
    const fingerprint = projectWorkflowFingerprint(project);
    if (project.workflowFingerprint === fingerprint) {
      nodes.saveProjectBtn.textContent = "已整理工作流";
      return;
    }
    const runId = ++projectAnalysisRun;
    project.workflowFingerprint = fingerprint;
    nodes.saveProjectBtn.textContent = "正在整理";
    const workflow = Core.generateProjectWorkflow(project, new Date());
    applyWorkflowTasks(project, workflow);
    const messageId = uid("m-workflow");
    state.messages.push({
      id: messageId,
      role: "agent",
      projectId: project.id,
      createdAt: new Date().toISOString(),
      text: `${workflow.summary}\n\n正在请千问根据项目详情补充更细的安排...`,
    });
    commitAndRender();
    await askQwenForProjectWorkflow(project.id, messageId, workflow.summary, runId);
  }

  function applyWorkflowTasks(project, workflow) {
    workflow.tasks.forEach((item) => {
      const taskId = `${project.id}-workflow-${item.key}`;
      const existing = state.tasks.find((task) => task.id === taskId);
      if (existing) {
        existing.title = item.title;
        existing.dueDate = item.dueDate;
        existing.priority = item.priority;
        existing.nextAction = item.nextAction;
        if (existing.status === "done" && !workflow.ready) existing.status = "todo";
      } else {
        state.tasks.push({
          id: taskId,
          projectId: project.id,
          title: item.title,
          priority: item.priority,
          dueDate: item.dueDate,
          status: item.status,
          nextAction: item.nextAction,
          feedbackIds: [],
        });
      }
    });
    if (workflow.ready && project.status !== "done") project.status = "designing";
    syncProjectWork(project);
  }

  async function askQwenForProjectWorkflow(projectId, messageId, fallbackReply, runId) {
    try {
      const project = getProjectContext(projectId);
      const dashboard = Core.getDashboard(state);
      const { response, payload } = await fetchJsonWithTimeout(`${getApiBase()}/api/chat`, {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({
          intent: "project_workflow",
          message: [
            "请根据我刚填写的项目详情，分析这个设计项目，并安排一个可执行工作流。",
            "请重点说明：项目判断、今日先做、后续步骤、需要确认、交付风险。",
            "不要假设已经完成的结果，不要编造客户反馈。",
          ].join("\n"),
          project,
          dashboard: {
            todayCount: dashboard.today.length,
            waitingCount: dashboard.waiting.length,
            riskCount: dashboard.risks.length,
          },
          recentMessages: state.messages
            .filter((item) => item.projectId === projectId)
            .slice(Math.max(0, state.messages.length - 8)),
        }),
      });
      if (!response.ok || payload.error) throw new Error(payload.error || "千问请求失败");
      if (runId !== projectAnalysisRun) return;
      const message = state.messages.find((item) => item.id === messageId);
      if (message) message.text = payload.reply || fallbackReply;
      nodes.saveProjectBtn.textContent = "已整理工作流";
    } catch (error) {
      const message = state.messages.find((item) => item.id === messageId);
      if (message) message.text = `${fallbackReply}\n\n千问暂时没有连上：${error.message}。本地工作流已先更新。`;
      nodes.saveProjectBtn.textContent = "已本地整理";
    }
    commitAndRender();
  }

  function getProjectContext(projectId) {
    const project = Core.getProject(state, projectId);
    return {
      ...project,
      tasks: state.tasks
        .filter((task) => task.projectId === project.id)
        .map((task) => ({
          title: task.title,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate,
          nextAction: task.nextAction,
        })),
      feedback: state.feedback
        .filter((item) => item.projectId === project.id)
        .slice(-5)
        .map((item) => ({
          from: item.from,
          raw: item.raw,
          action: item.action,
          handled: item.handled,
        })),
    };
  }

  function showView(view) {
    currentView = view;
    nodes.workbenchView.classList.toggle("is-active", view === "workbench");
  }

  function filterProject(project, filter) {
    if (filter === "active") return project.status === "designing" || project.status === "todo";
    if (filter === "waiting") return project.status === "waiting";
    if (filter === "done") return project.status === "done";
    return true;
  }

  function statusLabel(status) {
    return {
      todo: "未开始",
      designing: "设计中",
      waiting: "待确认",
      done: "已完成",
    }[status] || "进行中";
  }

  function formatTime(value) {
    const date = new Date(value);
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  function renderMessageBubble(message) {
    if (message.role !== "agent") return el("div", { className: "bubble", innerHTML: formatBubble(message.text) });
    const blocks = buildAnswerBlocks(message.text);
    const stack = el("div", { className: "answer-stack" });
    blocks.forEach((block, index) => {
      stack.append(renderAnswerBlock(block, index));
    });
    return stack;
  }

  function buildAnswerBlocks(text) {
    const lines = String(text || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) return [{ type: "note", title: "我在整理", lines: ["先把重点捞出来，再给你下一步。"] }];

    const hasModelAdvice = lines.some((line) => /^千问建议[:：]?$/.test(line));
    const blocks = [];
    let current = null;
    let statusShown = false;

    const pushCurrent = () => {
      if (current && current.lines.length) blocks.push(current);
      current = null;
    };

    const pushStatus = (textValue) => {
      if (statusShown || !textValue) return;
      blocks.push({ type: "status", title: textValue, lines: [] });
      statusShown = true;
    };

    lines.forEach((line) => {
      if (/^已先整理[:：]?$/.test(line) || /^千问建议[:：]?$/.test(line)) {
        if (/^已先整理/.test(line)) pushStatus("已更新项目信息");
        pushCurrent();
        return;
      }
      if (/正在请千问|本地工作流已先更新|本地整理结果已保留|已从对话补齐|已本地整理/.test(line)) {
        pushStatus("正在提炼重点");
        return;
      }
      if (/^(已记录到|反馈已翻译为|我已经同步更新|已完成风险扫描|交付检查[:：])/.test(line)) {
        pushStatus("已更新项目信息");
        return;
      }
      if (/^(还需要补充|需要确认|交付风险|风险)[:：]/.test(line)) {
        pushCurrent();
        blocks.push({ type: "alert", title: line.replace(/[:：].*$/, ""), lines: [line.replace(/^.*?[:：]\s*/, "")].filter(Boolean) });
        return;
      }
      if (/^(核心判断|最大问题|第一眼看到什么|项目判断|设计判断|上轮目标对照)[:：]/.test(line)) {
        pushCurrent();
        blocks.push({ type: "focus", title: line.replace(/[:：].*$/, ""), lines: [line.replace(/^.*?[:：]\s*/, "")].filter(Boolean) });
        return;
      }
      if (/^(为什么|判断依据|设计理由)[:：]/.test(line)) {
        pushCurrent();
        blocks.push({ type: "note", title: line.replace(/[:：].*$/, ""), lines: [line.replace(/^.*?[:：]\s*/, "")].filter(Boolean) });
        return;
      }
      if (/^(验收标准|自查标准|改完看什么)[:：]/.test(line)) {
        pushCurrent();
        blocks.push({ type: "check", title: line.replace(/[:：].*$/, ""), lines: [line.replace(/^.*?[:：]\s*/, "")].filter(Boolean) });
        return;
      }
      if (/^(先做|下一步|优先动作|优先改|优先做|建议|可以这样做|千问建议).*[：:]?$/.test(line)) {
        pushCurrent();
        current = { type: "focus", title: line.replace(/[:：]$/, ""), lines: [] };
        return;
      }
      if (/^\d+[.、]\s*/.test(line)) {
        if (!current || current.type !== "steps") {
          pushCurrent();
          current = { type: "steps", title: "先做这几步", lines: [] };
        }
        current.lines.push(line.replace(/^\d+[.、]\s*/, ""));
        return;
      }
      if (/^[-•□✓]\s*/.test(line)) {
        if (!current) current = { type: "steps", title: "重点动作", lines: [] };
        current.lines.push(line.replace(/^[-•□✓]\s*/, ""));
        return;
      }
      if (/^(需要我|要不要|是否|可以先|如果只剩|做完|发我|把|先把)/.test(line) && line.length <= 80) {
        pushCurrent();
        blocks.push({ type: "ask", title: "接下来", lines: [line] });
        return;
      }
      if (!current) current = { type: "note", title: blocks.length ? "补充判断" : "先看重点", lines: [] };
      current.lines.push(line);
    });
    pushCurrent();

    const readable = blocks.filter((block) => {
      if (block.type !== "status") return true;
      if (hasModelAdvice) return false;
      return blocks.length === 1 || block.title !== "正在提炼重点";
    });
    return readable.length ? readable.slice(0, 6) : [{ type: "note", title: "先看重点", lines: lines.slice(0, 5) }];
  }

  function renderAnswerBlock(block, index) {
    const article = el("article", {
      className: `answer-card answer-${block.type}`,
    });
    article.style.setProperty("--answer-delay", `${Math.min(index * 90, 450)}ms`);
    if (block.type === "status") {
      article.append(el("span", { className: "answer-status-dot" }), el("span", { textContent: block.title }));
      return article;
    }
    article.append(el("h4", { textContent: block.title }));
    const list = block.type === "steps" ? el("ol", { className: "answer-list" }) : el("div", { className: "answer-lines" });
    block.lines.forEach((line) => {
      list.append(block.type === "steps" ? el("li", { textContent: line }) : el("p", { textContent: line }));
    });
    article.append(list);
    return article;
  }

  function formatBubble(text) {
    return escapeHtml(text)
      .split("\n")
      .map((line) => (line.startsWith("- ") ? `<p class="bullet-line">${line}</p>` : `<p>${line}</p>`))
      .join("");
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalize(value) {
    return String(value || "").trim();
  }

  function uid(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return `${prefix}-${window.crypto.randomUUID()}`;
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(props).forEach(([key, value]) => {
      if (key === "className") node.className = value;
      else if (key === "textContent") node.textContent = value;
      else if (key === "innerHTML") node.innerHTML = value;
      else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
      else if (value !== undefined && value !== null) node[key] = value;
    });
    const list = Array.isArray(children) ? children : [children];
    list.filter(Boolean).forEach((child) => node.append(child));
    return node;
  }

  nodes.composer.addEventListener("submit", (event) => {
    event.preventDefault();
    submitMessage(nodes.messageInput.value);
  });

  nodes.messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitMessage(nodes.messageInput.value);
    }
  });

  document.querySelectorAll(".filter-tab").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".filter-tab").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      projectFilter = button.dataset.filter;
      state.activeFilter = projectFilter;
      renderProjects();
    });
  });

  document.querySelectorAll(".prompt-chip").forEach((button) => {
    button.addEventListener("click", () => fillQuickTemplate(button.dataset.template));
  });

  nodes.newProjectBtn.addEventListener("click", createNewProject);
  nodes.sortProjectsBtn.addEventListener("click", sortProjects);
  nodes.addTaskBtn.addEventListener("click", addProjectTask);
  nodes.deleteProjectBtn.addEventListener("click", deleteActiveProject);
  nodes.projectForm.addEventListener("input", updateActiveProjectFromForm);
  nodes.attachButton.addEventListener("click", () => nodes.attachmentInput.click());
  nodes.attachmentInput.addEventListener("change", (event) => handleAttachmentFiles(event.target.files));
  nodes.detailToggle.addEventListener("click", openProjectDetail);
  nodes.detailFab.addEventListener("click", openProjectDetail);
  nodes.railBackdrop.addEventListener("click", closeProjectDetail);

  guardServiceEntry();
  render();
  renderAttachmentDock();
})();
