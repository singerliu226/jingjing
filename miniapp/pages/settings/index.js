const api = require("../../utils/api");

Page({
  data: {
    serviceAccountBound: false,
    preferences: {
      dueSoon: true,
      waiting: true,
      dailyPlan: false,
      dailyHour: 9,
    },
    hours: Array.from({ length: 24 }, (_, index) => index),
    testing: false,
  },

  async onShow() {
    try {
      await getApp().login();
      const status = await api.request("/api/wechat/notifications/status");
      this.setData({
        serviceAccountBound: status.serviceAccountBound,
        preferences: status.preferences,
      });
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    }
  },

  async toggle(event) {
    const field = event.currentTarget.dataset.field;
    const preferences = { ...this.data.preferences, [field]: event.detail.value };
    this.setData({ preferences });
    await this.save(preferences);
  },

  async changeHour(event) {
    const preferences = {
      ...this.data.preferences,
      dailyHour: Number(event.detail.value),
    };
    this.setData({ preferences });
    await this.save(preferences);
  },

  async save(preferences) {
    try {
      await api.request("/api/wechat/notifications/preferences", {
        method: "PUT",
        data: { preferences },
      });
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    }
  },

  async bindServiceAccount() {
    try {
      const payload = await api.request("/api/wechat/notifications/bind-ticket", {
        method: "POST",
      });
      wx.navigateTo({
        url: `/pages/bind/index?url=${encodeURIComponent(payload.url)}`,
      });
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    }
  },

  async sendTest() {
    this.setData({ testing: true });
    try {
      await api.request("/api/wechat/notifications/test", { method: "POST" });
      wx.showToast({ title: "测试提醒已发送", icon: "success" });
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    } finally {
      this.setData({ testing: false });
    }
  },
});
