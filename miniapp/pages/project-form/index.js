const api = require("../../utils/api");
const workflow = require("../../utils/workflow");

const STATUSES = ["todo", "designing", "waiting", "done"];

Page({
  data: {
    step: 0,
    titles: ["要做什么，想让谁行动？", "要交什么，什么时候要？", "有什么限制，现在卡在哪？"],
    hints: [
      "不用写正式 brief，一句话说明项目和目标就够。",
      "截止时间还没定也能先开始，交付物至少写一个。",
      "没有限制或卡点也可以直接完成。",
    ],
    form: {},
    statusLabels: ["未开始", "设计中", "待确认", "已完成"],
    statusIndex: 0,
    saving: false,
  },

  async onLoad(query) {
    try {
      const state = await getApp().loadState();
      const project =
        (state.projects || []).find((item) => item.id === query.projectId) ||
        workflow.activeProject(state);
      if (!project) throw new Error("没有找到这个项目");
      this.projectId = project.id;
      this.state = state;
      this.setData({
        form: {
          name: project.name === "未命名设计项目" ? "" : project.name,
          type: project.type === "设计项目" ? "" : project.type,
          goal: project.goal || "",
          deliverablesText: (project.deliverables || []).join("、"),
          dueDate: project.dueDate || "",
          requirements: project.requirements || "",
          progressNote: project.progressNote || "",
        },
        statusIndex: Math.max(0, STATUSES.indexOf(project.status || "todo")),
      });
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    }
  },

  onField(event) {
    this.setData({ [`form.${event.currentTarget.dataset.field}`]: event.detail.value });
  },

  onDueDate(event) {
    this.setData({ "form.dueDate": event.detail.value });
  },

  onStatus(event) {
    this.setData({ statusIndex: Number(event.detail.value) });
  },

  previous() {
    if (this.data.step > 0) this.setData({ step: this.data.step - 1 });
  },

  async next() {
    const { step, form } = this.data;
    if (step === 0 && (!form.name.trim() || !form.goal.trim())) {
      wx.showToast({ title: "先补项目名和核心目标", icon: "none" });
      return;
    }
    if (step === 1 && !form.deliverablesText.trim()) {
      wx.showToast({ title: "至少写一个交付物", icon: "none" });
      return;
    }
    if (step < 2) {
      this.setData({ step: step + 1 });
      return;
    }
    await this.finish();
  },

  async finish() {
    if (this.data.saving) return;
    this.setData({ saving: true });
    try {
      const project = (this.state.projects || []).find((item) => item.id === this.projectId);
      const form = this.data.form;
      Object.assign(project, {
        name: form.name.trim(),
        type: form.type.trim() || "设计项目",
        goal: form.goal.trim(),
        deliverables: form.deliverablesText
          .split(/[、,，\n]/)
          .map((item) => item.trim())
          .filter(Boolean),
        dueDate: form.dueDate,
        requirements: form.requirements.trim(),
        progressNote: form.progressNote.trim(),
        status: STATUSES[this.data.statusIndex],
      });
      const result = await api.request("/api/wechat/workflow", {
        method: "POST",
        data: { project },
      });
      this.state = workflow.applyWorkflow(this.state, project, result.workflow);
      if (result.workflow.summary) {
        this.state.messages.push({
          id: workflow.uid("m"),
          role: "agent",
          projectId: project.id,
          createdAt: new Date().toISOString(),
          text: result.workflow.summary,
        });
      }
      await getApp().saveState(this.state);
      wx.navigateBack();
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    } finally {
      this.setData({ saving: false });
    }
  },
});
