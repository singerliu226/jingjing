const api = require("../../utils/api");
const workflow = require("../../utils/workflow");

Page({
  data: {
    state: null,
    project: {},
    stage: null,
    messages: [],
    projectStatus: "未开始",
    input: "",
    sending: false,
    scrollIntoView: "",
  },

  onLoad(query) {
    this.projectIdFromLink = query.projectId || "";
  },

  async onShow() {
    await this.refresh();
  },

  async onPullDownRefresh() {
    await this.refresh(true);
    wx.stopPullDownRefresh();
  },

  async refresh(force = false) {
    try {
      const app = getApp();
      const state = await app.loadState(force);
      if (this.projectIdFromLink && (state.projects || []).some((item) => item.id === this.projectIdFromLink)) {
        state.activeProjectId = this.projectIdFromLink;
        this.projectIdFromLink = "";
      }
      this.renderState(state);
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    }
  },

  renderState(state) {
    const project = workflow.activeProject(state) || {};
    const messages = (state.messages || [])
      .filter((message) => message.projectId === project.id)
      .slice(-30);
    this.setData({
      state,
      project,
      stage: workflow.deriveStage(state, project),
      messages,
      projectStatus: {
        todo: "未开始",
        designing: "设计中",
        waiting: "待确认",
        done: "已完成",
      }[project.status] || "进行中",
      scrollIntoView: messages.length ? `message-${messages[messages.length - 1].id}` : "",
    });
  },

  openProjects() {
    wx.switchTab({ url: "/pages/projects/index" });
  },

  openSettings() {
    wx.navigateTo({ url: "/pages/settings/index" });
  },

  onInput(event) {
    this.setData({ input: event.detail.value });
  },

  async handleStageAction() {
    const stage = this.data.stage;
    if (!stage) return;
    if (stage.action === "setup") {
      wx.navigateTo({ url: `/pages/project-form/index?projectId=${this.data.project.id}` });
      return;
    }
    if (stage.action === "complete-task") {
      await this.completeTask(stage.taskId);
      return;
    }
    if (stage.action === "first-review") {
      await this.chooseAndReview(
        "这是第一版。请先说第一眼看到什么，再指出一个最大问题、一个优先动作和验收标准。"
      );
      return;
    }
    if (stage.action === "handoff") {
      await this.sendMessage(
        "交付检查：请先明确判断这个版本现在能不能发给客户，再给不超过 3 项最关键的检查。"
      );
      return;
    }
    if (stage.action === "reflect") {
      this.setData({
        input:
          "帮我做一次很短的项目复盘：先问我这次最满意和最卡的各是什么，再总结一个做对的判断和一个下次练习。",
      });
    }
  },

  async handleSecondaryAction() {
    if (this.data.stage?.secondaryAction === "revision") {
      await this.chooseAndReview(
        "这是按上轮建议修改的新版。请先做上轮目标对照，逐项判断是否改善，再给一个最值得继续打磨的方向。"
      );
    }
  },

  async completeTask(taskId) {
    const state = this.data.state;
    const task = (state.tasks || []).find((item) => item.id === taskId);
    if (!task) return;
    task.status = "done";
    const project = this.data.project;
    const remaining = workflow
      .projectTasks(state, project.id)
      .filter((item) => item.status !== "done");
    if (!remaining.length) {
      project.status = "done";
      state.messages.push({
        id: workflow.uid("m"),
        role: "agent",
        projectId: project.id,
        createdAt: new Date().toISOString(),
        text: "项目完成了。趁现在记下一个做对的判断，下次会更稳。",
      });
    }
    await getApp().saveState(state);
    this.renderState(state);
  },

  chooseGeneralImage() {
    this.chooseAndReview("请看这张设计图，先指出最大的一个问题，再告诉我下一步怎么改。");
  },

  async chooseAndReview(prompt) {
    try {
      const media = await new Promise((resolve, reject) => {
        wx.chooseMedia({
          count: 1,
          mediaType: ["image"],
          sizeType: ["compressed"],
          sourceType: ["album", "camera"],
          success: resolve,
          fail: reject,
        });
      });
      const file = media.tempFiles[0];
      if (!file || file.size > 6 * 1024 * 1024) {
        throw new Error("图片请控制在 6MB 以内。");
      }
      const base64 = await new Promise((resolve, reject) => {
        wx.getFileSystemManager().readFile({
          filePath: file.tempFilePath,
          encoding: "base64",
          success: ({ data }) => resolve(data),
          fail: reject,
        });
      });
      await this.sendMessage(prompt, [
        {
          kind: "image",
          name: "design.jpg",
          mimeType: file.fileType ? `image/${file.fileType}` : "image/jpeg",
          dataUrl: `data:image/jpeg;base64,${base64}`,
          localPath: file.tempFilePath,
        },
      ]);
    } catch (error) {
      if (!/cancel/i.test(error.errMsg || error.message || "")) {
        wx.showToast({ title: error.message || "图片没有选好", icon: "none" });
      }
    }
  },

  sendText() {
    this.sendMessage(this.data.input.trim());
  },

  async sendMessage(text, attachments = []) {
    if (!text || this.data.sending) return;
    const state = this.data.state;
    const project = this.data.project;
    const userMessage = {
      id: workflow.uid("m"),
      role: "user",
      projectId: project.id,
      createdAt: new Date().toISOString(),
      text,
      attachments: attachments.map(({ kind, name, mimeType }) => ({ kind, name, mimeType })),
      imagePath: attachments[0]?.localPath || "",
    };
    state.messages.push(userMessage);
    this.setData({ input: "", sending: true });
    this.renderState(state);
    try {
      const projectContext = {
        ...project,
        tasks: workflow.projectTasks(state, project.id),
      };
      const result = await api.request("/api/wechat/chat", {
        method: "POST",
        data: {
          message: text,
          project: projectContext,
          recentMessages: state.messages
            .filter((message) => message.projectId === project.id)
            .slice(-8),
          attachments: attachments.map(({ localPath, ...attachment }) => attachment),
        },
      });
      state.messages.push({
        id: workflow.uid("m"),
        role: "agent",
        projectId: project.id,
        createdAt: new Date().toISOString(),
        text: result.reply,
      });
      await getApp().saveState(state);
      this.renderState(state);
    } catch (error) {
      state.messages.push({
        id: workflow.uid("m"),
        role: "agent",
        projectId: project.id,
        createdAt: new Date().toISOString(),
        text: `这次没有连上设计导师：${error.message}`,
      });
      this.renderState(state);
    } finally {
      this.setData({ sending: false });
    }
  },
});
