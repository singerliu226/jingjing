(function () {
  "use strict";

  const Core = window.DesignDeskCore;
  const storage = window.localStorage;
  let state = Core.loadState(storage);
  let projectFilter = state.activeFilter || "all";
  let currentView = "workbench";
  let activeDetailStep = 0;
  let projectAnalysisTimer = 0;
  let projectAnalysisRun = 0;
  let pendingAttachments = [];
  let activeAnnotationTarget = "";
  let activeComparisonId = "";
  let imagePreviewDbPromise = null;
  let bridgeDirectoryHandle = null;
  let bridgeScanTimer = 0;
  let bridgeScanning = false;
  let bridgeCandidates = [];
  let bridgeKnownFiles = new Map();
  let bridgeLastError = "";
  let bridgeQueuedCount = 0;
  const transientAttachmentPreviews = new Map();
  const MODEL_REQUEST_TIMEOUT_MS = 30_000;
  const IMAGE_PREVIEW_DB_NAME = "jingjing-design-context-v1";
  const IMAGE_PREVIEW_STORE = "imagePreviews";
  const CONTEXT_SETTINGS_STORE = "contextSettings";
  const CONTEXT_QUEUE_STORE = "contextBridgeQueue";
  const CONTEXT_DIRECTORY_KEY = "authorizedDirectory";
  const CONTEXT_FILE_INDEX_KEY = "authorizedDirectoryIndex";
  const CONTEXT_SCAN_INTERVAL_MS = 5_000;
  const CONTEXT_MAX_FILES = 300;
  const CONTEXT_MAX_DEPTH = 3;
  const CONTEXT_HASH_LIMIT_BYTES = 64 * 1024 * 1024;
  const CONTEXT_FILE_PATTERN = /\.(png|jpe?g|webp|psd|ai|pdf)$/i;

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
    contextBridge: document.querySelector("#context-bridge"),
    contextBridgeDot: document.querySelector("#context-bridge-dot"),
    contextBridgeTitle: document.querySelector("#context-bridge-title"),
    contextBridgeCopy: document.querySelector("#context-bridge-copy"),
    contextBridgeConnect: document.querySelector("#context-bridge-connect"),
    contextBridgePause: document.querySelector("#context-bridge-pause"),
    contextBridgeSync: document.querySelector("#context-bridge-sync"),
    contextBridgeClear: document.querySelector("#context-bridge-clear"),
    contextCandidateList: document.querySelector("#context-candidate-list"),
    promptStrip: document.querySelector("#prompt-strip"),
    mobileProjectName: document.querySelector("#mobile-project-name"),
    mobileProjectMeta: document.querySelector("#mobile-project-meta"),
    mobileProjectSwitch: document.querySelector("#mobile-project-switch"),
    mobileDetailButton: document.querySelector("#mobile-detail-button"),
    mobileChatNav: document.querySelector("#mobile-chat-nav"),
    mobileProjectsNav: document.querySelector("#mobile-projects-nav"),
    mobileProjectSheet: document.querySelector("#mobile-project-sheet"),
    mobileProjectSheetClose: document.querySelector("#mobile-project-sheet-close"),
    mobileNewProject: document.querySelector("#mobile-new-project"),
    mobileProjectList: document.querySelector("#mobile-project-list"),
    mobileStageGuide: document.querySelector("#mobile-stage-guide"),
    mobileStageLabel: document.querySelector("#mobile-stage-label"),
    mobileStageTitle: document.querySelector("#mobile-stage-title"),
    mobileStageCopy: document.querySelector("#mobile-stage-copy"),
    mobileStageAction: document.querySelector("#mobile-stage-action"),
    mobileReviewActions: document.querySelector(".mobile-review-actions"),
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
    detailCloseButton: document.querySelector("#detail-close-button"),
    detailFab: document.querySelector("#detail-fab"),
    railBackdrop: document.querySelector("#rail-backdrop"),
    guideBtn: document.querySelector("#guide-btn"),
    changelogBtn: document.querySelector("#changelog-btn"),
    infoModal: document.querySelector("#info-modal"),
    infoBackdrop: document.querySelector("#info-backdrop"),
    infoClose: document.querySelector("#info-close"),
    infoEyebrow: document.querySelector("#info-eyebrow"),
    infoTitle: document.querySelector("#info-title"),
    infoContent: document.querySelector("#info-content"),
    projectForm: document.querySelector("#project-form"),
    projectNameInput: document.querySelector("#project-name-input"),
    projectTypeInput: document.querySelector("#project-type-input"),
    projectDueInput: document.querySelector("#project-due-input"),
    projectStatusInput: document.querySelector("#project-status-input"),
    projectGoalInput: document.querySelector("#project-goal-input"),
    projectRequirementsInput: document.querySelector("#project-requirements-input"),
    projectDeliverablesInput: document.querySelector("#project-deliverables-input"),
    projectProgressInput: document.querySelector("#project-progress-input"),
    progressView: document.querySelector("#progress-view"),
    progressSummary: document.querySelector("#progress-summary"),
    editProjectDetailBtn: document.querySelector("#edit-project-detail-btn"),
    detailTaskSection: document.querySelector("#detail-task-section"),
    detailSummaryName: document.querySelector("#detail-summary-name"),
    detailSummaryMeta: document.querySelector("#detail-summary-meta"),
    wizardStepLabel: document.querySelector("#wizard-step-label"),
    wizardProgressBar: document.querySelector("#wizard-progress-bar"),
    wizardPrevBtn: document.querySelector("#wizard-prev-btn"),
    wizardSkipBtn: document.querySelector("#wizard-skip-btn"),
    wizardNextBtn: document.querySelector("#wizard-next-btn"),
  };

  const detailSteps = [
    {
      isComplete: (project) =>
        Boolean(normalize(project.name) && project.name !== "未命名设计项目" && normalize(project.goal)),
      focus: (project) =>
        !normalize(project.name) || project.name === "未命名设计项目" ? nodes.projectNameInput : nodes.projectGoalInput,
    },
    {
      isComplete: (project) => Boolean((project.deliverables || []).length),
      focus: () => nodes.projectDeliverablesInput,
    },
    {
      isComplete: (project) => Boolean(normalize(project.requirements) || normalize(project.progressNote)),
      focus: () => nodes.projectRequirementsInput,
    },
  ];

  const infoPanels = {
    guide: {
      eyebrow: "给菁菁的小小指南",
      title: "小画桌怎么陪你画",
      sections: [
        {
          title: "1. 先给事情起个名字",
          body: "点“新建项目”，把每件设计活分开记。小画桌会自动带你进入项目需求，不用自己找入口。",
        },
        {
          title: "2. 用三步说清需求",
          body: "只回答三件事：做什么、交什么、有什么限制。截止时间还没定也能先开始，以后想到再补。",
        },
        {
          title: "3. 每次只看当前一步",
          body: "首页只保留现在最该做的动作。做到首版时上传图片，修改后对照复评，最后再做交付检查。",
        },
        {
          title: "4. 完成后留一个判断",
          body: "不用写长复盘。说说最满意和最卡的地方，小画桌会帮你留下一个做对的判断和一个下次练习。",
        },
      ],
    },
    changelog: {
      eyebrow: "小画桌的成长记录",
      title: "最近变新了什么",
      sections: [
        {
          title: "2026-06-30 · 手机上也能舒服地用了",
          body: "项目切换、聊天和项目详情重新排过了。手机打开时只看眼前这件事，不会被一整桌表单挤住。",
        },
        {
          title: "2026-06-30 · 小画桌开始记得每一版",
          body: "上传或粘贴设计图后会自动留下版本。你可以圈出想聊的地方、并排比较两版，也能用“保留”“更接近”“方向不对”快速告诉我你的判断。",
        },
        {
          title: "2026-06-29 · 完整工作流更简单了",
          body: "项目需求从五步收成三步；首页只显示当前任务，首版、复评、交付和复盘会按顺序出现。",
        },
        {
          title: "2026-06-26 · 聊天更懂当前项目",
          body: "你在项目详情里写过的目标、DDL、交付物，都会成为小画桌回答时的小抄。",
        },
        {
          title: "2026-06-25 · 可以把图发给小画桌看",
          body: "设计图、参考图、简单文件都可以上传。小画桌会试着帮你看画面问题、信息层级和修改方向。",
        },
        {
          title: "2026-06-24 · 接上真正的大模型",
          body: "小画桌不再只靠固定规则回答，会用千问来陪你拆需求、看反馈、想下一步。",
        },
      ],
    },
  };

  function persist() {
    Core.saveState(storage, state);
  }

  function render() {
    const active = Core.getProject(state, state.activeProjectId);
    if (!active) return;
    renderProjectHeader(active);
    renderMobileHeader(active);
    renderProjectForm(active);
    renderProjects();
    renderMobileProjects();
    renderMessages();
    renderQuickPrompts(active);
    renderDashboard();
    renderMobileStageGuide(active);
    renderContextBridge();
  }

  function commitAndRender() {
    persist();
    render();
  }

  function renderProjectHeader(project) {
    nodes.activeProjectName.textContent = project.name;
    nodes.activeProjectType.textContent = `${project.type} · ${statusLabel(project.status)}`;
  }

  function renderMobileHeader(project) {
    if (!nodes.mobileProjectName || !nodes.mobileProjectMeta) return;
    nodes.mobileProjectName.textContent = project.name;
    nodes.mobileProjectMeta.textContent = [
      project.type,
      project.dueDate ? formatMobileDueDate(project.dueDate) : statusLabel(project.status),
    ].join(" · ");
  }

  function renderMobileStageGuide(project) {
    if (!nodes.mobileStageGuide) return;
    const projectMessages = state.messages.filter((message) => message.projectId === project.id);
    const hasImageRound = projectMessages.some((message) =>
      (message.attachments || []).some((attachment) => attachment.kind === "image")
    );
    const hasHandoffCheck = projectMessages.some((message) =>
      /交付检查|能不能发给客户|能否交付/.test(message.text || "")
    );
    const workflowTasks = state.tasks.filter(
      (task) => task.projectId === project.id && !/^补齐项目(详情|小纸条)/.test(task.title)
    );
    const activeTask = workflowTasks.find((task) => task.status !== "done");
    const doneCount = workflowTasks.filter((task) => task.status === "done").length;
    const isDone = project.status === "done" || (project.workflowReady && workflowTasks.length && !activeTask);

    let stage = {
      label: "开始前",
      title: "先把需求说清楚",
      copy: "只要三步：做什么、交什么、有什么限制。",
      action: "补项目需求",
      actionType: "setup",
      reviewActions: [],
    };

    if (isDone) {
      stage = {
        label: "项目完成",
        title: "趁记得，留下一个判断",
        copy: "不用写长复盘，只记这次做对了什么、下次先注意什么。",
        action: "做个小复盘",
        actionType: "reflect",
        reviewActions: [],
      };
    } else if (project.workflowReady && activeTask && /^(交付前|自检与导出)/.test(activeTask.title)) {
      stage = {
        label: `当前一步 · ${doneCount + 1}/${workflowTasks.length}`,
        title: "交付前最后确认",
        copy: hasHandoffCheck
          ? "确认问题都处理完，再把最终文件发出去。"
          : "先判断现在能不能发，再检查格式、命名和源文件。",
        action: hasHandoffCheck ? "已经交付" : "开始交付检查",
        actionType: hasHandoffCheck ? "complete-task" : "handoff",
        taskId: activeTask.id,
        reviewActions: [],
      };
    } else if (project.workflowReady && activeTask && /首版|设计/.test(activeTask.title)) {
      stage = {
        label: hasImageRound ? "修改与复评" : `当前一步 · ${doneCount + 1}/${workflowTasks.length}`,
        title: hasImageRound ? "先确认这轮有没有变好" : activeTask.title,
        copy: hasImageRound
          ? "对照上轮目标判断；确认方向对了，再进入交付。"
          : activeTask.nextAction || "先完成首版，再让我帮你看最大问题。",
        action: hasImageRound ? "这一轮改好了" : "上传首版",
        actionType: hasImageRound ? "complete-task" : "first-review",
        taskId: activeTask.id,
        reviewActions: hasImageRound ? ["revision"] : [],
      };
    } else if (project.workflowReady && activeTask) {
      stage = {
        label: `当前一步${workflowTasks.length ? ` · ${doneCount + 1}/${workflowTasks.length}` : ""}`,
        title: activeTask.title,
        copy: activeTask.nextAction || "先完成这一小步，再继续往下。",
        action: "这一步做完了",
        actionType: "complete-task",
        taskId: activeTask.id,
        reviewActions: [],
      };
    }

    nodes.mobileStageLabel.textContent = stage.label;
    nodes.mobileStageTitle.textContent = stage.title;
    nodes.mobileStageCopy.textContent = stage.copy;
    nodes.mobileStageAction.textContent = stage.action;
    nodes.mobileStageAction.dataset.action = stage.actionType;
    nodes.mobileStageAction.dataset.taskId = stage.taskId || "";
    const reviewActions = stage.reviewActions || [];
    document.querySelectorAll("[data-mobile-action]").forEach((button) => {
      button.hidden = !reviewActions.includes(button.dataset.mobileAction);
    });
    nodes.mobileReviewActions.style.gridTemplateColumns = `repeat(${Math.max(reviewActions.length, 1)}, minmax(0, 1fr))`;
    nodes.mobileReviewActions.hidden = !reviewActions.length;
  }

  function handleMobileStageAction() {
    const action = nodes.mobileStageAction.dataset.action;
    if (action === "setup") {
      const project = Core.getProject(state, state.activeProjectId);
      if (project && !project.workflowReady) {
        project.detailMode = "collect";
        persist();
        renderProjectForm(project);
      }
      openProjectDetail();
      focusCurrentDetailStep();
      return;
    }
    if (action === "complete-task") {
      completeTask(nodes.mobileStageAction.dataset.taskId);
      return;
    }
    if (action === "revision") {
      runMobileReviewAction("revision");
      return;
    }
    if (action === "first-review") {
      runMobileReviewAction("first-review");
      return;
    }
    if (action === "handoff") {
      runMobileReviewAction("handoff");
      return;
    }
    if (action === "reflect") {
      nodes.messageInput.value =
        "帮我做一次很短的项目复盘：先问我这次最满意和最卡的各是什么，再帮我总结一个做对的判断和一个下次练习。";
      nodes.messageInput.focus();
    }
  }

  function formatMobileDueDate(value) {
    const due = new Date(`${value}T23:59:59`);
    if (Number.isNaN(due.getTime())) return statusLabel("designing");
    const days = Math.ceil((due.getTime() - Date.now()) / 86_400_000);
    if (days < 0) return `已逾期 ${Math.abs(days)} 天`;
    if (days === 0) return "今天截止";
    if (days === 1) return "明天截止";
    return `${days} 天后截止`;
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

  function openInfoPanel(type) {
    const panel = infoPanels[type];
    if (!panel) return;
    nodes.infoEyebrow.textContent = panel.eyebrow;
    nodes.infoTitle.textContent = panel.title;
    nodes.infoContent.replaceChildren(
      ...panel.sections.map((section) =>
        el("article", { className: "info-section" }, [
          el("h3", { textContent: section.title }),
          el("p", { textContent: section.body }),
        ])
      )
    );
    nodes.infoModal.hidden = false;
    document.body.classList.add("info-open");
    window.setTimeout(() => nodes.infoClose.focus(), 0);
  }

  function closeInfoPanel() {
    nodes.infoModal.hidden = true;
    document.body.classList.remove("info-open");
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
    renderDetailWizard(project);
  }

  function renderDetailWizard(project) {
    const completed = detailSteps.filter((step) => step.isComplete(project)).length;
    const total = detailSteps.length;
    const showProgress = shouldShowProgressView(project);
    const savedStep = Number.isInteger(project.detailStep) ? project.detailStep : findFirstIncompleteDetailStep(project);
    activeDetailStep = clamp(savedStep, 0, total - 1);

    nodes.projectForm.hidden = showProgress;
    nodes.progressView.hidden = !showProgress;

    document.querySelectorAll(".wizard-step").forEach((step) => {
      const isActive = Number(step.dataset.step) === activeDetailStep;
      step.hidden = !isActive;
      step.classList.toggle("is-active", isActive);
    });

    nodes.detailSummaryName.textContent = project.name || "未命名设计项目";
    nodes.detailSummaryMeta.textContent = [
      project.dueDate ? `DDL ${project.dueDate}` : "未设截止",
      `${(project.deliverables || []).length} 个交付物`,
      statusLabel(project.status),
    ].join(" · ");
    nodes.wizardStepLabel.textContent = `${activeDetailStep + 1}/${total}`;
    nodes.wizardProgressBar.style.width = `${Math.max(8, (completed / total) * 100)}%`;
    nodes.wizardPrevBtn.disabled = activeDetailStep === 0;
    nodes.wizardNextBtn.textContent = activeDetailStep === total - 1 ? "完成" : "下一步";
    nodes.wizardSkipBtn.textContent = activeDetailStep === total - 1 ? "暂时没有" : "先跳过";
    nodes.wizardSkipBtn.hidden =
      activeDetailStep < total - 1 || detailSteps[activeDetailStep].isComplete(project);
    nodes.saveProjectBtn.textContent = project.workflowReady ? "已整理" : completed === total ? "信息够用了" : `已填 ${completed}/${total}`;
    nodes.progressSummary.textContent = buildProgressSummary(project);
  }

  function shouldShowProgressView(project) {
    if (!project) return false;
    if (project.detailMode === "collect") return false;
    return Boolean(project.workflowReady || project.detailMode === "progress");
  }

  function buildProgressSummary(project) {
    const taskCount = state.tasks.filter(
      (task) =>
        task.projectId === project.id &&
        task.status !== "done" &&
        !/^补齐项目(详情|小纸条)/.test(task.title)
    ).length;
    const deliverables = (project.deliverables || []).join("、") || "交付物";
    const due = project.dueDate ? `DDL ${project.dueDate}` : "还没设截止";
    if (!taskCount) return `${due}。现在没有未完成任务，可以新增下一步或回到对话里继续拆。`;
    return `${due}，围绕 ${deliverables} 先推进 ${taskCount} 条关键任务。`;
  }

  function findFirstIncompleteDetailStep(project) {
    const index = detailSteps.findIndex((step) => !step.isComplete(project));
    return index === -1 ? detailSteps.length - 1 : index;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function moveDetailStep(delta) {
    const project = Core.getProject(state, state.activeProjectId);
    if (!project) return;
    project.detailStep = clamp(activeDetailStep + delta, 0, detailSteps.length - 1);
    persist();
    renderProjectForm(project);
    focusCurrentDetailStep();
  }

  function focusCurrentDetailStep() {
    const project = Core.getProject(state, state.activeProjectId);
    const input = detailSteps[activeDetailStep]?.focus(project);
    if (input && typeof input.focus === "function") window.setTimeout(() => input.focus(), 0);
  }

  function nextDetailStep() {
    const project = Core.getProject(state, state.activeProjectId);
    if (!project) return;
    if (activeDetailStep < detailSteps.length - 1) {
      if (!detailSteps[activeDetailStep].isComplete(project)) {
        nodes.saveProjectBtn.textContent =
          activeDetailStep === 0 ? "先补项目名和目标" : "至少写一个交付物";
        focusCurrentDetailStep();
        return;
      }
      moveDetailStep(1);
      return;
    }
    finishProjectDetails(project);
  }

  function skipDetailStep() {
    if (activeDetailStep < detailSteps.length - 1) {
      moveDetailStep(1);
      return;
    }
    const project = Core.getProject(state, state.activeProjectId);
    if (project) finishProjectDetails(project);
  }

  function finishProjectDetails(project) {
    if (!isProjectReadyForWorkflow(project)) {
      project.detailStep = findFirstIncompleteDetailStep(project);
      nodes.saveProjectBtn.textContent = "还差目标和交付物";
      persist();
      renderProjectForm(project);
      focusCurrentDetailStep();
      return;
    }
    project.detailMode = "progress";
    project.detailStep = detailSteps.length - 1;
    persist();
    closeProjectDetail();
    analyzeProjectFromCard(project.id);
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

  function renderMobileProjects() {
    if (!nodes.mobileProjectList) return;
    const projects = state.projects.filter((project) => filterProject(project, projectFilter));
    nodes.mobileProjectList.replaceChildren(
      ...withEmpty(
        projects.map((project) => {
          const isActive = project.id === state.activeProjectId;
          const button = el("button", {
            className: `mobile-project-row ${isActive ? "is-active" : ""}`,
            type: "button",
            onclick: () => {
              state.activeProjectId = project.id;
              closeMobileProjectSheet();
              commitAndRender();
            },
          });
          button.append(
            el("span", { className: `status-dot status-${project.status}` }),
            el("span", { className: "mobile-project-row-copy" }, [
              el("strong", { textContent: project.name }),
              el("small", {
                textContent: `${project.type} · ${project.dueDate ? formatMobileDueDate(project.dueDate) : statusLabel(project.status)}`,
              }),
            ]),
            el("span", {
              className: "mobile-project-selected",
              textContent: isActive ? "✓" : "",
              "aria-hidden": "true",
            })
          );
          return button;
        }),
        "这个筛选里还没有项目。"
      )
    );
    document.querySelectorAll("[data-mobile-filter]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.mobileFilter === projectFilter);
    });
  }

  function openMobileProjectSheet() {
    nodes.mobileProjectSheet.hidden = false;
    document.body.classList.add("mobile-projects-open");
    nodes.mobileChatNav.classList.remove("is-active");
    nodes.mobileProjectsNav.classList.add("is-active");
    renderMobileProjects();
  }

  function closeMobileProjectSheet() {
    nodes.mobileProjectSheet.hidden = true;
    document.body.classList.remove("mobile-projects-open");
    nodes.mobileProjectsNav.classList.remove("is-active");
    nodes.mobileChatNav.classList.add("is-active");
  }

  function runMobileReviewAction(action) {
    if (action === "first-review") {
      nodes.messageInput.value = buildFirstReviewPrompt();
      nodes.attachmentInput.click();
    } else if (action === "revision") {
      nodes.messageInput.value = buildRevisionPrompt();
      nodes.attachmentInput.click();
    } else if (action === "handoff") {
      nodes.messageInput.value = "交付检查：请先明确判断这个版本现在能不能发给客户，再给不超过 3 项最关键的检查。";
      nodes.messageInput.focus();
    }
  }

  function renderMessages() {
    const activeId = state.activeProjectId;
    const visible = state.messages.filter((message) => message.projectId === activeId);
    const rendered = visible.map((message) => {
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
            renderAttachmentPreferenceActions(message),
          ])
        );
        return wrapper;
      });
    const comparison = renderActiveVersionComparison(activeId);
    if (comparison) rendered.push(comparison);
    nodes.chatStream.replaceChildren(...rendered);
    nodes.chatStream.scrollTop = nodes.chatStream.scrollHeight;
  }

  function renderQuickPrompts(project) {
    const messages = state.messages.filter((message) => message.projectId === project.id);
    const hasDesignRound = messages.some(
      (message) =>
        (message.attachments || []).some((attachment) => attachment.kind === "image") ||
        /上轮目标对照|核心判断|第一眼看到什么/.test(message.text || "")
    );
    const prompts = hasDesignRound
      ? [
          ["对照上版复评", buildRevisionPrompt()],
          ["只看最大问题", "先别给我很多建议，只判断现在画面最大的一个问题，并告诉我为什么。"],
          ["交付前能发吗", "请先明确判断这个版本现在能不能发给客户，再给不超过 3 项交付前检查。"],
          ["给我一个练习", "结合这个项目，只给我一个本周练习，说明为什么练，以及怎样算练到位。"],
        ]
      : [
          ["先从哪里开始", "结合右侧项目详情，告诉我现在最该先做哪一步，以及为什么。"],
          ["帮我看第一版", buildFirstReviewPrompt()],
          ["拆成今天任务", "帮我把这个项目拆成今天能完成的任务，先保留最关键的 3 项。"],
          ["给我一个练习", "结合这个项目，只给我一个本周练习，说明为什么练，以及怎样算练到位。"],
        ];

    nodes.promptStrip.replaceChildren(
      ...prompts.map(([label, template]) =>
        el("button", {
          className: "prompt-chip",
          type: "button",
          textContent: label,
          onclick: () => fillQuickTemplate(template),
        })
      )
    );
  }

  function renderDashboard() {
    const dashboard = Core.getDashboard(state);
    const project = Core.getProject(state, state.activeProjectId);
    const canShowProjectTasks = shouldShowProgressView(project);
    const activeTasks = state.tasks.filter(
      (task) =>
        task.projectId === state.activeProjectId &&
        task.status !== "done" &&
        !/^补齐项目(详情|小纸条)/.test(task.title)
    );
    nodes.detailTaskSection.hidden = !canShowProjectTasks;
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
      el("div", { className: "detail-task-top" }, [
        taskInput(task, "title", task.title, "例如：完成首版包装主视觉"),
        el("button", {
          className: "mini-action is-done",
          type: "button",
          textContent: task.status === "done" ? "已完成" : "完成",
          onclick: () => completeTask(task.id),
        }),
      ]),
      el("div", { className: "detail-task-meta" }, [
        taskInput(task, "dueDate", task.dueDate || "", "", "date"),
        taskSelect(task, "status", task.status),
        taskSelect(task, "priority", task.priority || "normal", [
          ["high", "高"],
          ["normal", "普通"],
        ]),
      ]),
      el("label", { className: "task-detail-label" }, [
        taskTextarea(task, "nextAction", task.nextAction || "", "写清楚要改哪里、等谁确认、交付时注意什么"),
      ]),
      el("div", { className: "detail-task-actions" }, [
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
          return renderImageAttachment(message, attachment, preview);
        }
        return el("span", { className: "message-attachment file-attachment", textContent: attachment.name });
      })
    );
  }

  function renderImageAttachment(message, attachment, preview) {
    const versionId = attachment.designVersionId || "";
    const targetKey = `${message.id}:${attachment.id}`;
    const regions = (state.designRegions || []).filter(
      (region) => region.projectId === message.projectId && region.versionId === versionId
    );
    const stage = el("div", { className: "image-annotation-stage" }, [
      el("img", { src: preview.dataUrl, alt: attachment.name }),
    ]);
    regions.forEach((region, index) => {
      const marker = el("div", {
        className: "image-region-marker",
        title: region.label || `区域 ${index + 1}`,
      });
      marker.style.left = `${region.x * 100}%`;
      marker.style.top = `${region.y * 100}%`;
      marker.style.width = `${region.width * 100}%`;
      marker.style.height = `${region.height * 100}%`;
      marker.append(el("span", { textContent: String(index + 1) }));
      stage.append(marker);
    });
    if (versionId && activeAnnotationTarget === targetKey) {
      stage.append(createRegionCaptureLayer(message, attachment, targetKey));
    }

    const toolbar = el("div", { className: "image-annotation-toolbar" }, [
      el("button", {
        type: "button",
        className: activeAnnotationTarget === targetKey ? "is-active" : "",
        textContent: activeAnnotationTarget === targetKey ? "拖动圈出区域" : "圈一下这里",
        onclick: () => {
          activeAnnotationTarget = activeAnnotationTarget === targetKey ? "" : targetKey;
          renderMessages();
        },
      }),
    ]);
    if (regions.length) {
      toolbar.append(
        el("span", { textContent: `已圈 ${regions.length} 处` }),
        el("button", {
          type: "button",
          textContent: "清除",
          onclick: () => {
            const removed = Core.clearDesignRegions(
              state,
              {
                projectId: message.projectId,
                versionId,
                source: "manual_action",
              },
              new Date()
            );
            if (!removed) return;
            activeAnnotationTarget = "";
            commitAndRender();
          },
        })
      );
    }
    const previousVersion = findPreviousImageVersion(message.projectId, versionId);
    if (previousVersion) {
      toolbar.append(
        el("button", {
          type: "button",
          textContent: "对比上一版",
          onclick: () => {
            const comparison = Core.createVersionComparison(
              state,
              {
                projectId: message.projectId,
                versionIds: [previousVersion.id, versionId],
                relation: "revision",
              },
              new Date()
            );
            if (!comparison) return;
            activeComparisonId = comparison.id;
            commitAndRender();
          },
        })
      );
    }

    return el("figure", { className: "message-attachment image-attachment" }, [
      stage,
      el("figcaption", {
        textContent: attachment.versionName
          ? `${attachment.versionName} · ${attachment.name}`
          : attachment.name,
      }),
      versionId ? toolbar : null,
    ]);
  }

  function findPreviousImageVersion(projectId, versionId) {
    const project = Core.getProject(state, projectId);
    const imageVersions = (project.versions || []).filter(
      (version) => version && version.artifact && version.artifact.attachmentId
    );
    const index = imageVersions.findIndex((version) => version.id === versionId);
    if (index <= 0) return null;
    return getVersionPreviewContext(projectId, imageVersions[index - 1].id)
      ? imageVersions[index - 1]
      : null;
  }

  function getVersionPreviewContext(projectId, versionId) {
    const message = state.messages.find(
      (item) =>
        item.projectId === projectId &&
        (item.attachments || []).some(
          (attachment) => attachment.kind === "image" && attachment.designVersionId === versionId
        )
    );
    if (!message) return null;
    const attachment = (message.attachments || []).find(
      (item) => item.kind === "image" && item.designVersionId === versionId
    );
    const preview = (transientAttachmentPreviews.get(message.id) || []).find(
      (item) => item.id === attachment?.id
    );
    if (!attachment || !preview || !preview.dataUrl) return null;
    return { message, attachment, preview };
  }

  function getActiveVersionComparison(projectId) {
    const comparisons = (state.versionComparisons || []).filter(
      (comparison) => comparison && comparison.projectId === projectId
    );
    if (!comparisons.length) return null;
    return comparisons.find((comparison) => comparison.id === activeComparisonId) || comparisons[comparisons.length - 1];
  }

  function renderActiveVersionComparison(projectId) {
    const comparison = getActiveVersionComparison(projectId);
    if (!comparison) return null;
    const contexts = comparison.versionIds.map((versionId) =>
      getVersionPreviewContext(projectId, versionId)
    );
    if (contexts.some((context) => !context)) return null;
    const isAlternatives = comparison.relation === "alternatives";
    const project = Core.getProject(state, projectId);
    const versions = comparison.versionIds.map((versionId) =>
      (project.versions || []).find((version) => version.id === versionId)
    );
    const labels = isAlternatives
      ? ["方案 A", "方案 B"]
      : versions.map((version, index) => (version && version.name) || `版本 ${index + 1}`);
    const card = el("article", { className: "version-comparison-card", ariaLabel: "版本对比" });
    const relationControls = el("div", { className: "comparison-relation-controls" }, [
      el("button", {
        type: "button",
        className: isAlternatives ? "" : "is-active",
        textContent: "连续修改",
        onclick: () => updateComparisonRelation(comparison, "revision"),
      }),
      el("button", {
        type: "button",
        className: isAlternatives ? "is-active" : "",
        textContent: "A/B 方案",
        onclick: () => updateComparisonRelation(comparison, "alternatives"),
      }),
    ]);
    const grid = el(
      "div",
      { className: "version-comparison-grid" },
      contexts.map((context, index) => {
        const selected = comparison.selectedVersionId === comparison.versionIds[index];
        return el("figure", { className: selected ? "is-selected" : "" }, [
          el("div", { className: "comparison-label", textContent: labels[index] }),
          el("img", { src: context.preview.dataUrl, alt: `${labels[index]} · ${context.attachment.name}` }),
          el("figcaption", { textContent: context.attachment.name }),
          el("button", {
            type: "button",
            className: selected ? "is-selected" : "",
            textContent: selected ? "已选择" : `选择${isAlternatives ? index === 0 ? " A" : " B" : ` ${labels[index]}`}`,
            onclick: () => {
              const updated = Core.recordComparisonChoice(
                state,
                {
                  comparisonId: comparison.id,
                  versionId: comparison.versionIds[index],
                },
                new Date()
              );
              if (updated) commitAndRender();
            },
          }),
        ]);
      })
    );
    const askButton = el("button", {
      type: "button",
      className: "comparison-ask-button",
      textContent: "让小画桌比较",
      onclick: () => {
        activeComparisonId = comparison.id;
        nodes.messageInput.value = isAlternatives
          ? "请比较 A/B 两个方案。先只描述可见差异，再分别说明更适合的目标，最后给出选择建议。"
          : "请对比这两个版本。先只描述可见变化，再判断哪些改善、哪些退步，最后给一个最值得继续调整的方向。";
        nodes.messageInput.focus();
      },
    });
    card.append(
      el("div", { className: "version-comparison-head" }, [
        el("div", {}, [
          el("strong", { textContent: isAlternatives ? "A/B 方案比较" : "版本前后对比" }),
          el("span", {
            textContent: isAlternatives
              ? "两个方向并列，不代表先后修改。"
              : "左边是上版，右边是新版。",
          }),
        ]),
        relationControls,
      ]),
      grid,
      askButton
    );
    return card;
  }

  function updateComparisonRelation(comparison, relation) {
    const updated = Core.createVersionComparison(
      state,
      {
        projectId: comparison.projectId,
        versionIds: comparison.versionIds,
        relation,
      },
      new Date()
    );
    if (!updated) return;
    activeComparisonId = updated.id;
    commitAndRender();
  }

  function createRegionCaptureLayer(message, attachment, targetKey) {
    const layer = el("div", {
      className: "image-region-capture",
      ariaLabel: "在图片上拖动以圈选区域",
    });
    let drag = null;
    const updateDraft = (event) => {
      if (!drag) return;
      const rect = layer.getBoundingClientRect();
      const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
      const left = Math.min(drag.startX, x);
      const top = Math.min(drag.startY, y);
      drag.draft.style.left = `${left * 100}%`;
      drag.draft.style.top = `${top * 100}%`;
      drag.draft.style.width = `${Math.abs(x - drag.startX) * 100}%`;
      drag.draft.style.height = `${Math.abs(y - drag.startY) * 100}%`;
      drag.endX = x;
      drag.endY = y;
    };
    layer.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      const rect = layer.getBoundingClientRect();
      const draft = el("div", { className: "image-region-draft" });
      drag = {
        startX: clamp((event.clientX - rect.left) / rect.width, 0, 1),
        startY: clamp((event.clientY - rect.top) / rect.height, 0, 1),
        endX: 0,
        endY: 0,
        draft,
      };
      drag.endX = drag.startX;
      drag.endY = drag.startY;
      layer.append(draft);
      layer.setPointerCapture(event.pointerId);
      updateDraft(event);
    });
    layer.addEventListener("pointermove", updateDraft);
    layer.addEventListener("pointerup", (event) => {
      if (!drag) return;
      updateDraft(event);
      const x = Math.min(drag.startX, drag.endX);
      const y = Math.min(drag.startY, drag.endY);
      const width = Math.abs(drag.endX - drag.startX);
      const height = Math.abs(drag.endY - drag.startY);
      const region = Core.recordDesignRegion(
        state,
        {
          projectId: message.projectId,
          versionId: attachment.designVersionId,
          x,
          y,
          width,
          height,
          source: "manual_drag",
        },
        new Date()
      );
      drag = null;
      activeAnnotationTarget = "";
      if (!region) {
        renderMessages();
        return;
      }
      if (!normalize(nodes.messageInput.value)) {
        nodes.messageInput.value = `请只看我圈出的${region.label}，告诉我这里最大的问题、为什么，以及应该怎么改。`;
      }
      commitAndRender();
      nodes.messageInput.focus();
    });
    layer.addEventListener("pointercancel", () => {
      drag = null;
      activeAnnotationTarget = targetKey;
      renderMessages();
    });
    return layer;
  }

  function renderAttachmentPreferenceActions(message) {
    if (!message || message.role !== "user") return el("div", { className: "version-feedback is-empty" });
    const imageAttachments = (message.attachments || []).filter(
      (attachment) => attachment.kind === "image" && attachment.designVersionId
    );
    if (!imageAttachments.length) return el("div", { className: "version-feedback is-empty" });
    const labels = [
      ["keep", "保留这个"],
      ["closer", "更接近了"],
      ["reject", "方向不对"],
    ];
    return el(
      "div",
      { className: "version-feedback", "aria-label": "记录这个版本的感觉" },
      imageAttachments.map((attachment) =>
        el("div", { className: "version-feedback-row" }, [
          el("span", { textContent: `${attachment.versionName || "这版"}的感觉` }),
          ...labels.map(([signal, label]) =>
            el("button", {
              type: "button",
              className: attachment.preferenceSignal === signal ? "is-active" : "",
              textContent: label,
              onclick: () => {
                const preference = Core.recordPreferenceSignal(
                  state,
                  {
                    projectId: message.projectId,
                    versionId: attachment.designVersionId,
                    signal,
                    source: "explicit_quick_action",
                  },
                  new Date()
                );
                if (!preference) return;
                attachment.preferenceSignal = signal;
                commitAndRender();
              },
            })
          ),
        ])
      )
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

  function openImagePreviewDb() {
    if (!window.indexedDB) return Promise.resolve(null);
    if (imagePreviewDbPromise) return imagePreviewDbPromise;
    imagePreviewDbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(IMAGE_PREVIEW_DB_NAME, 2);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IMAGE_PREVIEW_STORE)) {
          db.createObjectStore(IMAGE_PREVIEW_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(CONTEXT_SETTINGS_STORE)) {
          db.createObjectStore(CONTEXT_SETTINGS_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(CONTEXT_QUEUE_STORE)) {
          db.createObjectStore(CONTEXT_QUEUE_STORE, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("本地图片预览库打开失败。"));
    });
    return imagePreviewDbPromise;
  }

  async function persistImagePreviews(attachments) {
    const images = attachments.filter(
      (attachment) => attachment.kind === "image" && attachment.id && attachment.dataUrl
    );
    if (!images.length) return;
    try {
      const db = await openImagePreviewDb();
      if (!db) return;
      await Promise.all(
        images.map(
          (attachment) =>
            new Promise((resolve, reject) => {
              const transaction = db.transaction(IMAGE_PREVIEW_STORE, "readwrite");
              transaction.objectStore(IMAGE_PREVIEW_STORE).put({
                id: attachment.id,
                dataUrl: attachment.dataUrl,
                mimeType: attachment.mimeType,
                name: attachment.name,
                updatedAt: new Date().toISOString(),
              });
              transaction.oncomplete = () => resolve();
              transaction.onerror = () => reject(transaction.error || new Error("图片预览保存失败。"));
            })
        )
      );
    } catch (error) {
      // 图片仍保留在当前会话；本地预览库不可用不应阻塞设计工作。
    }
  }

  async function readPersistedImagePreview(attachmentId) {
    try {
      const db = await openImagePreviewDb();
      if (!db) return null;
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction(IMAGE_PREVIEW_STORE, "readonly");
        const request = transaction.objectStore(IMAGE_PREVIEW_STORE).get(attachmentId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error || new Error("图片预览读取失败。"));
      });
    } catch (error) {
      return null;
    }
  }

  async function readContextStore(storeName, id) {
    const db = await openImagePreviewDb();
    if (!db) return null;
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const request = transaction.objectStore(storeName).get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("本地上下文读取失败。"));
    });
  }

  async function writeContextStore(storeName, value) {
    const db = await openImagePreviewDb();
    if (!db) return;
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).put(value);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("本地上下文保存失败。"));
    });
  }

  async function deleteContextStore(storeName, id) {
    const db = await openImagePreviewDb();
    if (!db) return;
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("本地上下文删除失败。"));
    });
  }

  async function hydratePersistedImagePreviews() {
    const imageMessages = state.messages
      .map((message) => ({
        message,
        attachments: (message.attachments || []).filter(
          (attachment) => attachment.kind === "image" && attachment.id
        ),
      }))
      .filter((item) => item.attachments.length);
    let hydrated = 0;
    for (const item of imageMessages) {
      const current = transientAttachmentPreviews.get(item.message.id) || [];
      const next = current.slice();
      for (const attachment of item.attachments) {
        if (next.some((preview) => preview.id === attachment.id)) continue;
        const stored = await readPersistedImagePreview(attachment.id);
        if (!stored || !stored.dataUrl) continue;
        next.push({ id: attachment.id, dataUrl: stored.dataUrl });
        hydrated += 1;
      }
      if (next.length) transientAttachmentPreviews.set(item.message.id, next);
    }
    if (hydrated) renderMessages();
    return hydrated;
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
    const project = Core.getProject(state, task.projectId);
    const remaining = state.tasks.filter(
      (item) =>
        item.projectId === task.projectId &&
        item.status !== "done" &&
        !/^补齐项目(详情|小纸条)/.test(item.title)
    );
    if (project && project.workflowReady && !remaining.length) {
      project.status = "done";
      state.messages.push({
        id: uid("m"),
        role: "agent",
        projectId: project.id,
        createdAt: new Date().toISOString(),
        text: "项目完成了。\n核心判断：先别急着写长复盘，趁现在记住一个做对的判断。\n下一步：告诉我这次最满意和最卡的地方，我会帮你收成一个下次还能用的方法。",
      });
      closeProjectDetail();
    }
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
    const newAttachments = pendingAttachments.slice();
    const clean = normalize(text) || (newAttachments.length ? "请帮我分析这张设计图，指出主要问题和下一步怎么改。" : "");
    if (!clean) return;
    const comparisonContextAttachments = newAttachments.some((attachment) => attachment.kind === "image")
      ? []
      : buildComparisonContextAttachments(clean);
    const regionContextAttachments =
      newAttachments.some((attachment) => attachment.kind === "image") ||
      comparisonContextAttachments.length
        ? []
        : buildRegionContextAttachments();
    const attachmentsToSend = newAttachments
      .concat(comparisonContextAttachments)
      .concat(regionContextAttachments);
    const modelIntent = await askQwenIntent(clean);
    const isGuidedImageReview =
      newAttachments.some((attachment) => attachment.kind === "image") &&
      [buildFirstReviewPrompt(), buildRevisionPrompt()].includes(clean);
    const isGuidedRegionReview =
      regionContextAttachments.length && /^请只看我圈出的/.test(clean);
    const isGuidedComparison =
      comparisonContextAttachments.length === 2 &&
      /^(请对比这两个版本|请比较 A\/B 两个方案)/.test(clean);
    const effectiveIntent = isGuidedComparison
      ? {
          schemaVersion: "llm-intent-v1",
          intent: "compare_design_options",
          confidence: 1,
          summary: "用户请求比较两个设计版本或方案。",
          entities: {},
          missing: [],
          nextAction: "先描述可见差异，再判断目标适配与取舍。",
        }
      : isGuidedImageReview || isGuidedRegionReview
        ? {
            schemaVersion: "llm-intent-v1",
            intent: "solve_design_issue",
            confidence: 1,
            summary: isGuidedRegionReview
              ? "用户请求分析刚刚圈选的设计区域。"
              : "用户请求评审刚刚上传的设计版本。",
            entities: {},
            missing: [],
            nextAction: isGuidedRegionReview
              ? "先判断圈选区域的最大问题，再给一个优先修改动作。"
              : "先判断当前版本的最大问题，再给一个优先修改动作。",
          }
        : modelIntent;
    const previousMessageCount = state.messages.length;
    const result = Core.applyInput(state, clean, new Date(), { intent: effectiveIntent, localMode: "guardrail" });
    attachFilesToUserMessage(previousMessageCount, newAttachments);
    attachRegionContextToUserMessage(previousMessageCount, regionContextAttachments);
    attachComparisonContextToUserMessage(previousMessageCount, comparisonContextAttachments);
    applyProjectAutofill(clean, effectiveIntent, result ? result.analysis : null);
    nodes.messageInput.value = "";
    pendingAttachments = [];
    renderAttachmentDock();
    commitAndRender();
    if (result && shouldKeepLocalReply(result.analysis)) return;
    await askQwen(clean, previousMessageCount, result ? result.analysis : null, attachmentsToSend);
  }

  function buildComparisonContextAttachments(message) {
    if (!/^(请对比这两个版本|请比较 A\/B 两个方案)/.test(message)) return [];
    const comparison = getActiveVersionComparison(state.activeProjectId);
    if (!comparison) return [];
    const contexts = comparison.versionIds.map((versionId) =>
      getVersionPreviewContext(state.activeProjectId, versionId)
    );
    if (contexts.some((context) => !context)) return [];
    const isAlternatives = comparison.relation === "alternatives";
    return contexts.map((context, index) => ({
      id: `comparison-${context.attachment.id}`,
      kind: "image",
      name: context.attachment.name,
      mimeType: context.attachment.mimeType,
      size: context.attachment.size,
      dataUrl: context.preview.dataUrl,
      contextOnly: true,
      versionId: comparison.versionIds[index],
      comparisonId: comparison.id,
      comparisonLabel: isAlternatives ? (index === 0 ? "A" : "B") : context.attachment.versionName,
      comparisonRelation: comparison.relation,
      regions: [],
    }));
  }

  function buildRegionContextAttachments() {
    const regions = (state.designRegions || []).filter((region) => region.projectId === state.activeProjectId);
    const latest = regions[regions.length - 1];
    if (!latest) return [];
    const message = state.messages.find(
      (item) =>
        item.projectId === state.activeProjectId &&
        (item.attachments || []).some((attachment) => attachment.designVersionId === latest.versionId)
    );
    if (!message) return [];
    const attachment = (message.attachments || []).find(
      (item) => item.kind === "image" && item.designVersionId === latest.versionId
    );
    const preview = (transientAttachmentPreviews.get(message.id) || []).find(
      (item) => item.id === attachment?.id
    );
    if (!attachment || !preview || !preview.dataUrl) return [];
    return [
      {
        id: `context-${attachment.id}`,
        kind: "image",
        name: attachment.name,
        mimeType: attachment.mimeType,
        size: attachment.size,
        dataUrl: preview.dataUrl,
        contextOnly: true,
        regions: regions.filter((region) => region.versionId === latest.versionId).slice(-6),
      },
    ];
  }

  function attachRegionContextToUserMessage(messageIndex, attachments) {
    const regionIds = attachments.flatMap((attachment) =>
      (attachment.regions || []).map((region) => region.id).filter(Boolean)
    );
    if (!regionIds.length) return;
    const message = state.messages[messageIndex];
    if (message) message.contextRegionIds = regionIds;
  }

  function attachComparisonContextToUserMessage(messageIndex, attachments) {
    const comparisonIds = Array.from(
      new Set(attachments.map((attachment) => attachment.comparisonId).filter(Boolean))
    );
    if (!comparisonIds.length) return;
    const message = state.messages[messageIndex];
    if (message) message.contextComparisonIds = comparisonIds;
  }

  function attachFilesToUserMessage(messageIndex, attachments) {
    if (!attachments.length) return;
    const message = state.messages[messageIndex];
    if (!message) return;
    message.attachments = attachments.map(
      ({ id, kind, name, mimeType, size, text, width, height, fingerprint, contextSource }) => {
      const version =
        kind === "image"
          ? Core.recordDesignVersion(
              state,
              message.projectId,
              {
                attachmentId: id,
                fileName: name,
                mimeType,
                size,
                width,
                height,
                fingerprint,
              },
              new Date(message.createdAt),
              { source: contextSource || "manual_upload" }
            )
          : null;
      return {
        id,
        kind,
        name,
        mimeType,
        size,
        text: kind === "text" ? text : "",
        designVersionId: version ? version.id : "",
        versionName: version ? version.name : "",
        preferenceSignal: "",
      };
      }
    );
    transientAttachmentPreviews.set(
      message.id,
      attachments
        .filter((attachment) => attachment.kind === "image")
        .map((attachment) => ({ id: attachment.id, dataUrl: attachment.dataUrl }))
    );
    persistImagePreviews(attachments);
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
            regions: attachment.kind === "image" ? attachment.regions || [] : [],
            versionId: attachment.kind === "image" ? attachment.versionId || "" : "",
            comparisonId: attachment.kind === "image" ? attachment.comparisonId || "" : "",
            comparisonLabel: attachment.kind === "image" ? attachment.comparisonLabel || "" : "",
            comparisonRelation: attachment.kind === "image" ? attachment.comparisonRelation || "" : "",
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
        suggestImageReviewPrompt(attachments);
        renderAttachmentDock();
      })
      .catch((error) => {
        addAgentMessage(`这个文件暂时没读进去：${error.message || "请换成 PNG、JPG、TXT 或 MD 再试。"}`);
      })
      .finally(() => {
        nodes.attachmentInput.value = "";
      });
  }

  function suggestImageReviewPrompt(attachments) {
    if (normalize(nodes.messageInput.value)) return;
    if (!attachments.some((attachment) => attachment && attachment.kind === "image")) return;
    nodes.messageInput.value = hasPreviousImageRound() ? buildRevisionPrompt() : buildFirstReviewPrompt();
  }

  function hasPreviousImageRound() {
    return state.messages
      .filter((message) => message.projectId === state.activeProjectId)
      .some((message) => (message.attachments || []).some((attachment) => attachment.kind === "image"));
  }

  function buildFirstReviewPrompt() {
    return "这是第一版。请先说第一眼看到什么，再指出一个最大问题、一个优先动作和验收标准。";
  }

  function buildRevisionPrompt() {
    return "这是按上轮建议修改的新版。请先做上轮目标对照，逐项判断是否改善，再给一个最值得继续打磨的方向。";
  }

  function getFolderBridgeSettings() {
    if (!state.contextSettings || typeof state.contextSettings !== "object") state.contextSettings = {};
    if (!state.contextSettings.folderBridge || typeof state.contextSettings.folderBridge !== "object") {
      state.contextSettings.folderBridge = {
        connected: false,
        directoryName: "",
        paused: false,
        lastScanAt: "",
      };
    }
    return state.contextSettings.folderBridge;
  }

  function bridgeEventLabel(type) {
    return {
      file_created: "发现新文件",
      file_saved: "检测到新保存",
      file_renamed: "检测到重命名",
      file_exported: "检测到新导出",
      document_opened: "Photoshop 打开了文档",
      document_saved: "Photoshop 保存了文档",
      document_closed: "Photoshop 关闭了文档",
      selection_changed: "Photoshop 切换了选区",
      active_document_changed: "Photoshop 切换了文档",
    }[type] || "检测到工作现场变化";
  }

  function bridgeSourceLabel(source) {
    return {
      browser_folder: "授权文件夹",
      photoshop: "Photoshop",
      illustrator: "Illustrator",
      figma: "Figma",
      generated_tool: "生成工具",
    }[source] || "外部工具";
  }

  function renderContextBridge() {
    if (!nodes.contextBridge) return;
    const settings = getFolderBridgeSettings();
    const supported = typeof window.showDirectoryPicker === "function";
    const connected = Boolean(bridgeDirectoryHandle && settings.connected);
    nodes.contextBridge.classList.toggle("is-connected", connected);
    nodes.contextBridge.classList.toggle("is-paused", connected && settings.paused);
    nodes.contextBridge.classList.toggle("has-error", Boolean(bridgeLastError));
    nodes.contextBridgeConnect.hidden = connected;
    nodes.contextBridgePause.hidden = !connected;
    nodes.contextBridgeClear.hidden = !connected;
    nodes.contextBridgeSync.hidden = bridgeQueuedCount === 0;
    nodes.contextBridgeSync.textContent = bridgeQueuedCount ? `同步 ${bridgeQueuedCount} 条` : "同步离线记录";
    nodes.contextBridgePause.textContent = settings.paused ? "继续" : "暂停";
    if (!supported) {
      nodes.contextBridgeTitle.textContent = "当前浏览器不支持文件夹监听";
      nodes.contextBridgeCopy.textContent = "仍可直接粘贴截图或点回形针上传，不影响版本评审。";
      nodes.contextBridgeConnect.disabled = true;
    } else if (bridgeLastError) {
      nodes.contextBridgeTitle.textContent = "工作现场连接需要处理";
      nodes.contextBridgeCopy.textContent = bridgeLastError;
      nodes.contextBridgeConnect.disabled = false;
    } else if (!connected) {
      nodes.contextBridgeTitle.textContent = "工作现场未连接";
      nodes.contextBridgeCopy.textContent = "授权一个项目文件夹，保存新稿时我会先提醒你确认。";
      nodes.contextBridgeConnect.disabled = false;
    } else if (settings.paused) {
      nodes.contextBridgeTitle.textContent = `${settings.directoryName || "项目文件夹"} · 已暂停`;
      nodes.contextBridgeCopy.textContent = "暂停期间不会读取目录，也不会产生新候选。";
    } else {
      nodes.contextBridgeTitle.textContent = `${settings.directoryName || "项目文件夹"} · 正在留意新版本`;
      nodes.contextBridgeCopy.textContent = settings.lastScanAt
        ? `最近检查 ${formatBridgeTime(settings.lastScanAt)}；只读，发现后等你确认。`
        : "已获得只读权限，正在建立文件基线。";
    }
    renderContextCandidates();
  }

  function formatBridgeTime(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "刚刚";
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  }

  function renderContextCandidates() {
    if (!nodes.contextCandidateList) return;
    const pending = bridgeCandidates.filter((candidate) => candidate && candidate.event?.status !== "dismissed");
    nodes.contextCandidateList.replaceChildren(
      ...pending.slice(0, 8).map((candidate) => {
        const event = candidate.event;
        const artifact = event.artifact || {};
        const documentContext = event.document || {};
        const name = artifact.name || documentContext.name || "未命名文档";
        const card = el("article", { className: "context-candidate" });
        if (artifact.previewDataUrl) {
          card.append(el("img", { className: "context-candidate-preview", src: artifact.previewDataUrl, alt: name }));
        } else {
          card.append(el("div", { className: "context-candidate-file", textContent: extensionBadge(name) }));
        }
        card.append(
          el("div", { className: "context-candidate-copy" }, [
            el("span", { textContent: `${bridgeSourceLabel(event.source)} · ${bridgeEventLabel(event.type)}` }),
            el("strong", { textContent: name }),
            el("small", {
              textContent: documentContext.activeLayerNames?.length
                ? `当前图层：${documentContext.activeLayerNames.slice(0, 2).join("、")}`
                : artifact.relativePath || "等待你决定是否收进当前项目",
            }),
          ]),
          el("div", { className: "context-candidate-actions" }, [
            el("button", {
              type: "button",
              className: "is-primary",
              textContent: "收进当前项目",
              onclick: () => importContextCandidate(candidate),
            }),
            el("button", {
              type: "button",
              textContent: "忽略",
              onclick: () => dismissContextCandidate(candidate),
            }),
          ])
        );
        return card;
      })
    );
  }

  function extensionBadge(name) {
    const match = String(name || "").match(/\.([a-z0-9]+)$/i);
    return match ? match[1].toUpperCase().slice(0, 4) : "DOC";
  }

  async function chooseContextDirectory() {
    if (typeof window.showDirectoryPicker !== "function") return;
    try {
      const handle = await window.showDirectoryPicker({ id: "jingjing-project-folder", mode: "read" });
      bridgeDirectoryHandle = handle;
      bridgeKnownFiles = new Map();
      bridgeCandidates = bridgeCandidates.filter((candidate) => candidate.event?.source !== "browser_folder");
      bridgeLastError = "";
      const settings = getFolderBridgeSettings();
      settings.connected = true;
      settings.directoryName = handle.name || "项目文件夹";
      settings.paused = false;
      settings.lastScanAt = "";
      persist();
      await writeContextStore(CONTEXT_SETTINGS_STORE, { id: CONTEXT_DIRECTORY_KEY, handle });
      await deleteContextStore(CONTEXT_SETTINGS_STORE, CONTEXT_FILE_INDEX_KEY);
      renderContextBridge();
      await scanContextDirectory({ establishBaseline: true });
      startContextBridgeTimer();
    } catch (error) {
      if (error?.name === "AbortError") return;
      bridgeLastError = error?.name === "NotAllowedError" ? "文件夹权限没有开启；重新连接时选择“允许”。" : "文件夹暂时连接不上。";
      renderContextBridge();
    }
  }

  async function restoreContextDirectory() {
    if (typeof window.showDirectoryPicker !== "function") {
      renderContextBridge();
      return;
    }
    try {
      const stored = await readContextStore(CONTEXT_SETTINGS_STORE, CONTEXT_DIRECTORY_KEY);
      const index = await readContextStore(CONTEXT_SETTINGS_STORE, CONTEXT_FILE_INDEX_KEY);
      if (!stored?.handle) {
        renderContextBridge();
        return;
      }
      const permission = await stored.handle.queryPermission({ mode: "read" });
      bridgeDirectoryHandle = stored.handle;
      const settings = getFolderBridgeSettings();
      settings.directoryName = stored.handle.name || settings.directoryName || "项目文件夹";
      settings.connected = permission === "granted";
      bridgeKnownFiles = new Map(
        Array.isArray(index?.files) ? index.files.map((item) => [item.relativePath, item]) : []
      );
      if (permission === "granted") {
        bridgeLastError = "";
        if (!settings.paused) {
          await scanContextDirectory({ establishBaseline: bridgeKnownFiles.size === 0 });
          startContextBridgeTimer();
        }
      } else {
        bridgeLastError = "浏览器重启后需要你再次确认文件夹权限。";
      }
      persist();
      renderContextBridge();
    } catch (error) {
      bridgeLastError = "上次授权的文件夹已经不可用，可以重新连接。";
      renderContextBridge();
    }
  }

  function startContextBridgeTimer() {
    window.clearInterval(bridgeScanTimer);
    if (getFolderBridgeSettings().paused) return;
    bridgeScanTimer = window.setInterval(() => {
      if (!document.hidden) {
        if (bridgeDirectoryHandle) scanContextDirectory();
        pollRemoteBridgeEvents();
      }
    }, CONTEXT_SCAN_INTERVAL_MS);
  }

  async function collectContextFiles(directoryHandle, prefix = "", depth = 0, output = []) {
    if (depth > CONTEXT_MAX_DEPTH || output.length >= CONTEXT_MAX_FILES) return output;
    for await (const [name, handle] of directoryHandle.entries()) {
      if (output.length >= CONTEXT_MAX_FILES) break;
      if (name.startsWith(".") || name === "node_modules") continue;
      const relativePath = prefix ? `${prefix}/${name}` : name;
      if (handle.kind === "directory") {
        await collectContextFiles(handle, relativePath, depth + 1, output);
      } else if (CONTEXT_FILE_PATTERN.test(name)) {
        const file = await handle.getFile();
        output.push({
          file,
          name: file.name,
          relativePath,
          size: file.size,
          lastModified: file.lastModified,
          mimeType: file.type || mimeTypeFromName(file.name),
        });
      }
    }
    return output;
  }

  function mimeTypeFromName(name) {
    const extension = String(name || "").split(".").pop().toLowerCase();
    return {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
      psd: "image/vnd.adobe.photoshop",
      ai: "application/postscript",
      pdf: "application/pdf",
    }[extension] || "application/octet-stream";
  }

  async function fingerprintContextFile(file) {
    if (window.crypto?.subtle && file.size <= CONTEXT_HASH_LIMIT_BYTES) {
      const digest = await window.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
      return { fingerprint: `sha256:${hex}`, fingerprintMode: "sha256" };
    }
    return { fingerprint: `metadata:${file.size}:${file.lastModified}`, fingerprintMode: "metadata" };
  }

  async function createLowResolutionPreview(file) {
    if (!/^image\/(?:png|jpeg|webp)$/i.test(file.type || mimeTypeFromName(file.name))) return null;
    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error("预览生成失败。"));
        element.src = objectUrl;
      });
      const scale = Math.min(1, 960 / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(image, 0, 0, width, height);
      return {
        dataUrl: canvas.toDataURL("image/jpeg", 0.82),
        width: image.naturalWidth,
        height: image.naturalHeight,
      };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  function inferNewFileEventType(item, previousFiles, deletedFiles) {
    const renamedFrom = deletedFiles.find(
      (candidate) => candidate.size === item.size && candidate.lastModified === item.lastModified
    );
    if (renamedFrom) return { type: "file_renamed", renamedFrom: renamedFrom.relativePath };
    const baseName = item.name.replace(/\.[^.]+$/, "").toLowerCase();
    const hasSource = Array.from(previousFiles.values()).some((candidate) => {
      const candidateBase = candidate.name.replace(/\.[^.]+$/, "").toLowerCase();
      return candidateBase === baseName && /\.(psd|ai)$/i.test(candidate.name);
    });
    if (hasSource && /\.(png|jpe?g|webp|pdf)$/i.test(item.name)) return { type: "file_exported", renamedFrom: "" };
    return { type: "file_created", renamedFrom: "" };
  }

  async function scanContextDirectory(options = {}) {
    if (!bridgeDirectoryHandle || bridgeScanning || getFolderBridgeSettings().paused) return;
    bridgeScanning = true;
    try {
      const permission = await bridgeDirectoryHandle.queryPermission({ mode: "read" });
      if (permission !== "granted") {
        getFolderBridgeSettings().connected = false;
        bridgeLastError = "文件夹读取权限已失效，重新连接后才会继续。";
        return;
      }
      const files = await collectContextFiles(bridgeDirectoryHandle);
      const nextMap = new Map(files.map((item) => [item.relativePath, item]));
      if (options.establishBaseline || bridgeKnownFiles.size === 0) {
        bridgeKnownFiles = nextMap;
      } else {
        const deletedFiles = Array.from(bridgeKnownFiles.values()).filter(
          (item) => !nextMap.has(item.relativePath)
        );
        for (const item of files) {
          const previous = bridgeKnownFiles.get(item.relativePath);
          if (previous && previous.size === item.size && previous.lastModified === item.lastModified) continue;
          const inferred = previous
            ? { type: "file_saved", renamedFrom: "" }
            : inferNewFileEventType(item, bridgeKnownFiles, deletedFiles);
          const fingerprint = await fingerprintContextFile(item.file);
          if (previous?.fingerprint && previous.fingerprint === fingerprint.fingerprint) continue;
          const preview = await createLowResolutionPreview(item.file).catch(() => null);
          const event = {
            id: uid("bridge"),
            schemaVersion: "context-event-v1",
            source: "browser_folder",
            type: inferred.type,
            projectId: state.activeProjectId,
            createdAt: new Date().toISOString(),
            status: "pending",
            dedupeKey: ["browser_folder", state.activeProjectId, inferred.type, item.relativePath, fingerprint.fingerprint].join(":"),
            artifact: {
              id: uid("artifact"),
              name: item.name,
              relativePath: item.relativePath,
              mimeType: item.mimeType,
              size: item.size,
              lastModified: item.lastModified,
              ...fingerprint,
              width: preview?.width || 0,
              height: preview?.height || 0,
              previewDataUrl: preview?.dataUrl || "",
              renamedFrom: inferred.renamedFrom,
            },
            document: {},
          };
          bridgeCandidates.unshift({ event, file: item.file });
          await postBridgeEvent(event);
        }
        bridgeKnownFiles = nextMap;
      }
      await writeContextStore(CONTEXT_SETTINGS_STORE, {
        id: CONTEXT_FILE_INDEX_KEY,
        files: Array.from(bridgeKnownFiles.values()).map(
          ({ name, relativePath, size, lastModified, mimeType, fingerprint = "", fingerprintMode = "" }) => ({
            name,
            relativePath,
            size,
            lastModified,
            mimeType,
            fingerprint,
            fingerprintMode,
          })
        ),
        updatedAt: new Date().toISOString(),
      });
      const settings = getFolderBridgeSettings();
      settings.connected = true;
      settings.lastScanAt = new Date().toISOString();
      bridgeLastError = "";
      persist();
    } catch (error) {
      bridgeLastError =
        error?.name === "NotAllowedError"
          ? "文件夹读取权限已失效，重新授权后才会继续。"
          : "这次没有读完文件夹，稍后会自动重试。";
    } finally {
      bridgeScanning = false;
      renderContextBridge();
    }
  }

  async function postBridgeEvent(event) {
    try {
      const { response, payload } = await fetchJsonWithTimeout(
        `${getApiBase()}/api/context-bridge/events`,
        { method: "POST", headers: getApiHeaders(), body: JSON.stringify(event) },
        8_000
      );
      if (!response.ok) throw new Error(payload.error || "Bridge 暂时不可用。");
      await deleteContextStore(CONTEXT_QUEUE_STORE, event.id);
      await refreshBridgeQueueStatus();
      return payload.event || event;
    } catch (error) {
      await writeContextStore(CONTEXT_QUEUE_STORE, { id: event.id, event, queuedAt: new Date().toISOString() });
      await refreshBridgeQueueStatus();
      return null;
    }
  }

  async function readAllContextStore(storeName) {
    const db = await openImagePreviewDb();
    if (!db) return [];
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const request = transaction.objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error || new Error("本地队列读取失败。"));
    });
  }

  async function flushBridgeQueue() {
    if (!navigator.onLine) return;
    const queued = await readAllContextStore(CONTEXT_QUEUE_STORE).catch(() => []);
    for (const item of queued.slice(0, 20)) {
      try {
        const { response } = await fetchJsonWithTimeout(
          `${getApiBase()}/api/context-bridge/events`,
          { method: "POST", headers: getApiHeaders(), body: JSON.stringify(item.event) },
          8_000
        );
        if (response.ok) await deleteContextStore(CONTEXT_QUEUE_STORE, item.id);
      } catch (error) {
        break;
      }
    }
    await refreshBridgeQueueStatus();
  }

  async function refreshBridgeQueueStatus() {
    const queued = await readAllContextStore(CONTEXT_QUEUE_STORE).catch(() => []);
    bridgeQueuedCount = queued.length;
    renderContextBridge();
  }

  async function pollRemoteBridgeEvents() {
    try {
      const query = new URLSearchParams({ status: "pending", limit: "20" });
      const { response, payload } = await fetchJsonWithTimeout(
        `${getApiBase()}/api/context-bridge/events?${query}`,
        { headers: getApiHeaders() },
        8_000
      );
      if (!response.ok || !Array.isArray(payload.events)) return;
      const existingIds = new Set(bridgeCandidates.map((candidate) => candidate.event?.id));
      payload.events
        .filter((event) => !event.projectId || event.projectId === state.activeProjectId)
        .forEach((event) => {
        if (!existingIds.has(event.id)) bridgeCandidates.push({ event, file: null });
        });
      renderContextCandidates();
    } catch (error) {
      // Bridge 轮询失败时保留本地候选，下一轮自动重试。
    }
  }

  async function setBridgeEventAction(eventId, action) {
    try {
      await fetchJsonWithTimeout(
        `${getApiBase()}/api/context-bridge/events/${encodeURIComponent(eventId)}/action`,
        { method: "POST", headers: getApiHeaders(), body: JSON.stringify({ action }) },
        8_000
      );
    } catch (error) {
      // 本地状态优先；服务恢复后旧候选仍可再次处理。
    }
  }

  async function importContextCandidate(candidate) {
    const event = candidate.event;
    const artifact = event.artifact || {};
    if (artifact.previewDataUrl) {
      const attachment = {
        id: artifact.id || uid("att"),
        kind: "image",
        name: artifact.name || "工作现场预览.jpg",
        mimeType: artifact.mimeType || "image/jpeg",
        size: artifact.size || 0,
        dataUrl: artifact.previewDataUrl,
        width: artifact.width || 0,
        height: artifact.height || 0,
        fingerprint: artifact.fingerprint || "",
        contextSource: event.source,
      };
      const messageIndex = state.messages.length;
      state.messages.push({
        id: uid("m"),
        role: "user",
        projectId: state.activeProjectId,
        createdAt: new Date().toISOString(),
        text: `已从${bridgeSourceLabel(event.source)}收进候选版本：${attachment.name}`,
      });
      attachFilesToUserMessage(messageIndex, [attachment]);
    } else {
      const version = Core.recordDesignVersion(
        state,
        state.activeProjectId,
        {
          attachmentId: artifact.id || uid("artifact"),
          fileName: artifact.name || event.document?.name || "外部工具文档",
          mimeType: artifact.mimeType || "",
          size: artifact.size || 0,
          width: artifact.width || event.document?.width || 0,
          height: artifact.height || event.document?.height || 0,
          fingerprint: artifact.fingerprint || "",
        },
        new Date(event.createdAt || Date.now()),
        { source: event.source }
      );
      state.messages.push({
        id: uid("m"),
        role: "agent",
        projectId: state.activeProjectId,
        createdAt: new Date().toISOString(),
        text: version
          ? `已把 ${artifact.name || event.document?.name || "这个文档"} 记为 ${version.name}。目前只有文档和图层上下文，没有上传原图。`
          : "这个工作现场事件已经记录过了。",
      });
    }
    event.status = "imported";
    bridgeCandidates = bridgeCandidates.filter((item) => item.event?.id !== event.id);
    await setBridgeEventAction(event.id, "import");
    commitAndRender();
  }

  async function dismissContextCandidate(candidate) {
    candidate.event.status = "dismissed";
    bridgeCandidates = bridgeCandidates.filter((item) => item.event?.id !== candidate.event.id);
    await setBridgeEventAction(candidate.event.id, "dismiss");
    renderContextBridge();
  }

  async function toggleContextBridgePause() {
    const settings = getFolderBridgeSettings();
    settings.paused = !settings.paused;
    window.clearInterval(bridgeScanTimer);
    persist();
    renderContextBridge();
    try {
      await fetchJsonWithTimeout(
        `${getApiBase()}/api/context-bridge/control`,
        {
          method: "POST",
          headers: getApiHeaders(),
          body: JSON.stringify({ action: settings.paused ? "pause" : "resume" }),
        },
        8_000
      );
    } catch (error) {
      // 浏览器端暂停仍然生效。
    }
    if (!settings.paused) {
      await scanContextDirectory();
      startContextBridgeTimer();
    }
  }

  async function disconnectContextBridge() {
    const confirmed = window.confirm("断开后会清除小画桌保存的文件夹句柄、指纹和离线队列，不会删除你的设计文件。继续吗？");
    if (!confirmed) return;
    window.clearInterval(bridgeScanTimer);
    bridgeDirectoryHandle = null;
    bridgeKnownFiles = new Map();
    bridgeCandidates = bridgeCandidates.filter((candidate) => candidate.event?.source !== "browser_folder");
    bridgeQueuedCount = 0;
    bridgeLastError = "";
    const settings = getFolderBridgeSettings();
    settings.connected = false;
    settings.directoryName = "";
    settings.paused = false;
    settings.lastScanAt = "";
    await Promise.all([
      deleteContextStore(CONTEXT_SETTINGS_STORE, CONTEXT_DIRECTORY_KEY),
      deleteContextStore(CONTEXT_SETTINGS_STORE, CONTEXT_FILE_INDEX_KEY),
    ]);
    const queued = await readAllContextStore(CONTEXT_QUEUE_STORE).catch(() => []);
    await Promise.all(queued.map((item) => deleteContextStore(CONTEXT_QUEUE_STORE, item.id)));
    persist();
    renderContextBridge();
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
        if (isImage) {
          const dataUrl = String(reader.result || "");
          const image = new Image();
          image.onload = () =>
            resolve({
              ...base,
              dataUrl,
              width: Number(image.naturalWidth) || 0,
              height: Number(image.naturalHeight) || 0,
            });
          image.onerror = () => resolve({ ...base, dataUrl, width: 0, height: 0 });
          image.src = dataUrl;
        }
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
      workflowReady: false,
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
      detailStep: 0,
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
    addAgentMessage("新项目建好了。先用三步把需求理清：做什么、交什么、有什么限制。填完后，我只告诉你当前最该做的一步。");
    openProjectDetail();
    focusCurrentDetailStep();
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
    project.workflowReady = false;
    project.detailMode = "collect";
    project.risks = Array.from(new Set(buildProjectRisks(project).concat(preservedRisks)));
    syncProjectWork(project);
    renderDetailWizard(project);
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
    const hasBaseInfo = project.goal && project.deliverables.length;
    task.status = hasBaseInfo ? "done" : "todo";
    task.nextAction = hasBaseInfo ? "可以开始设计或记录下一条反馈" : "先补项目目标和交付物";
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
    nodes.saveProjectBtn.textContent = "已自动保存";
    if (!project || project.detailMode === "collect") return;
    if (!isProjectReadyForWorkflow(project)) return;
    projectAnalysisTimer = window.setTimeout(() => analyzeProjectFromCard(projectId), 900);
  }

  function isProjectReadyForWorkflow(project) {
    return Boolean(
      project &&
        project.name &&
        project.name !== "未命名设计项目" &&
        project.type &&
        (project.goal || project.requirements) &&
        project.deliverables.length
    );
  }

  function isDetailCollectionComplete(project) {
    return Boolean(project && detailSteps.every((step) => step.isComplete(project)));
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
    if (project.workflowFingerprint === fingerprint && project.workflowReady) {
      nodes.saveProjectBtn.textContent = "已整理工作流";
      return;
    }
    const runId = ++projectAnalysisRun;
    project.workflowFingerprint = fingerprint;
    project.detailMode = "progress";
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
    if (workflow.ready) {
      state.tasks
        .filter(
          (task) =>
            task.projectId === project.id &&
            (task.title.startsWith("补齐项目小纸条") || task.title.startsWith("补齐项目详情"))
        )
        .forEach((task) => {
          task.status = "done";
        });
    }
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
    project.workflowReady = workflow.ready;
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
      regions: (state.designRegions || [])
        .filter((region) => region.projectId === project.id)
        .slice(-8)
        .map((region) => {
          const version = (project.versions || []).find((item) => item.id === region.versionId);
          return {
            id: region.id,
            versionId: region.versionId,
            versionName: version ? version.name : "",
            label: region.label,
            x: region.x,
            y: region.y,
            width: region.width,
            height: region.height,
            note: region.note,
          };
        }),
      comparisons: (state.versionComparisons || [])
        .filter((comparison) => comparison.projectId === project.id)
        .slice(-5)
        .map((comparison) => ({
          id: comparison.id,
          versionIds: comparison.versionIds,
          relation: comparison.relation,
          selectedVersionId: comparison.selectedVersionId,
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
      if (/^(交付判断|能否交付|能不能发|是否可以发)[:：]/.test(line) || /^(可以发客户|暂不建议发客户|不建议发客户)[。！!]?$/.test(line)) {
        pushCurrent();
        blocks.push({
          type: /暂不建议|不建议/.test(line) ? "alert" : "verdict",
          title: "交付判断",
          lines: [line.replace(/^.*?[:：]\s*/, "")].filter(Boolean),
        });
        return;
      }
      if (/^(本周练习|下一次练习|这次练习|最小练习)[:：]/.test(line)) {
        pushCurrent();
        blocks.push({ type: "practice", title: line.replace(/[:：].*$/, ""), lines: [line.replace(/^.*?[:：]\s*/, "")].filter(Boolean) });
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

  nodes.messageInput.addEventListener("paste", (event) => {
    const imageFiles = Array.from(event.clipboardData?.items || [])
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter(Boolean);
    if (!imageFiles.length) return;
    event.preventDefault();
    handleAttachmentFiles(imageFiles);
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

  nodes.newProjectBtn.addEventListener("click", createNewProject);
  nodes.sortProjectsBtn.addEventListener("click", sortProjects);
  nodes.addTaskBtn.addEventListener("click", addProjectTask);
  nodes.deleteProjectBtn.addEventListener("click", deleteActiveProject);
  nodes.projectForm.addEventListener("input", updateActiveProjectFromForm);
  nodes.projectForm.addEventListener("change", updateActiveProjectFromForm);
  nodes.editProjectDetailBtn.addEventListener("click", () => {
    const project = Core.getProject(state, state.activeProjectId);
    if (!project) return;
    project.detailMode = "collect";
    persist();
    renderProjectForm(project);
    renderDashboard();
    focusCurrentDetailStep();
  });
  nodes.wizardPrevBtn.addEventListener("click", () => moveDetailStep(-1));
  nodes.wizardSkipBtn.addEventListener("click", skipDetailStep);
  nodes.wizardNextBtn.addEventListener("click", nextDetailStep);
  nodes.attachButton.addEventListener("click", () => nodes.attachmentInput.click());
  nodes.attachmentInput.addEventListener("change", (event) => handleAttachmentFiles(event.target.files));
  nodes.contextBridgeConnect.addEventListener("click", () => {
    if (bridgeDirectoryHandle) {
      bridgeDirectoryHandle
        .requestPermission({ mode: "read" })
        .then((permission) => {
          if (permission !== "granted") return;
          const settings = getFolderBridgeSettings();
          settings.connected = true;
          bridgeLastError = "";
          persist();
          scanContextDirectory({ establishBaseline: bridgeKnownFiles.size === 0 });
          startContextBridgeTimer();
          renderContextBridge();
        })
        .catch(() => {
          bridgeLastError = "文件夹权限没有开启；也可以重新选择文件夹。";
          renderContextBridge();
        });
      return;
    }
    chooseContextDirectory();
  });
  nodes.contextBridgePause.addEventListener("click", toggleContextBridgePause);
  nodes.contextBridgeSync.addEventListener("click", flushBridgeQueue);
  nodes.contextBridgeClear.addEventListener("click", disconnectContextBridge);
  nodes.detailToggle.addEventListener("click", openProjectDetail);
  nodes.detailCloseButton.addEventListener("click", closeProjectDetail);
  nodes.detailFab.addEventListener("click", openProjectDetail);
  nodes.mobileDetailButton.addEventListener("click", openProjectDetail);
  nodes.mobileProjectSwitch.addEventListener("click", openMobileProjectSheet);
  nodes.mobileProjectsNav.addEventListener("click", openMobileProjectSheet);
  nodes.mobileChatNav.addEventListener("click", closeMobileProjectSheet);
  nodes.mobileProjectSheetClose.addEventListener("click", closeMobileProjectSheet);
  nodes.mobileNewProject.addEventListener("click", () => {
    closeMobileProjectSheet();
    createNewProject();
  });
  document.querySelectorAll("[data-mobile-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      projectFilter = button.dataset.mobileFilter;
      state.activeFilter = projectFilter;
      persist();
      renderMobileProjects();
    });
  });
  document.querySelectorAll("[data-mobile-action]").forEach((button) => {
    button.addEventListener("click", () => runMobileReviewAction(button.dataset.mobileAction));
  });
  nodes.mobileStageAction.addEventListener("click", handleMobileStageAction);
  nodes.railBackdrop.addEventListener("click", closeProjectDetail);
  nodes.guideBtn.addEventListener("click", () => openInfoPanel("guide"));
  nodes.changelogBtn.addEventListener("click", () => openInfoPanel("changelog"));
  nodes.infoClose.addEventListener("click", closeInfoPanel);
  nodes.infoBackdrop.addEventListener("click", closeInfoPanel);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !nodes.infoModal.hidden) closeInfoPanel();
  });
  window.addEventListener("online", () => {
    refreshBridgeQueueStatus();
    pollRemoteBridgeEvents();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !getFolderBridgeSettings().paused) {
      if (bridgeDirectoryHandle) scanContextDirectory();
      pollRemoteBridgeEvents();
    }
  });

  guardServiceEntry();
  render();
  renderAttachmentDock();
  hydratePersistedImagePreviews();
  restoreContextDirectory();
  pollRemoteBridgeEvents();
  refreshBridgeQueueStatus();
  startContextBridgeTimer();
})();
