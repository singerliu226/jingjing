const workflow = require("../../utils/workflow");

Page({
  data: {
    projects: [],
    activeProjectId: "",
    filter: "all",
    filters: [
      { value: "all", label: "全部" },
      { value: "active", label: "进行中" },
      { value: "waiting", label: "待确认" },
      { value: "done", label: "已完成" },
    ],
  },

  async onShow() {
    try {
      this.state = await getApp().loadState(true);
      this.renderProjects();
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    }
  },

  renderProjects() {
    const now = new Date();
    const projects = (this.state.projects || [])
      .filter((project) => {
        if (this.data.filter === "active") return ["todo", "designing"].includes(project.status);
        if (this.data.filter === "waiting") return project.status === "waiting";
        if (this.data.filter === "done") return project.status === "done";
        return true;
      })
      .map((project) => ({
        ...project,
        dueLabel: project.dueDate
          ? new Date(project.dueDate).getTime() < now.getTime()
            ? "已到截止时间"
            : project.dueDate
          : "未设截止",
      }));
    this.setData({ projects, activeProjectId: this.state.activeProjectId });
  },

  setFilter(event) {
    this.setData({ filter: event.currentTarget.dataset.value }, () => this.renderProjects());
  },

  async selectProject(event) {
    this.state.activeProjectId = event.currentTarget.dataset.id;
    await getApp().saveState(this.state);
    wx.switchTab({ url: "/pages/workbench/index" });
  },

  async createProject() {
    const project = workflow.createProject();
    this.state.projects.unshift(project);
    this.state.activeProjectId = project.id;
    await getApp().saveState(this.state);
    wx.navigateTo({ url: `/pages/project-form/index?projectId=${project.id}` });
  },

  openSettings() {
    wx.navigateTo({ url: "/pages/settings/index" });
  },
});
