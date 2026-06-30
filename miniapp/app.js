const api = require("./utils/api");

App({
  globalData: {
    token: "",
    user: null,
    state: null,
  },

  onLaunch() {
    this.login();
  },

  login() {
    if (this._loginPromise) return this._loginPromise;
    this._loginPromise = new Promise((resolve, reject) => {
      wx.login({
        success: async ({ code }) => {
          try {
            const payload = await api.request("/api/wechat/mini/login", {
              method: "POST",
              data: { code },
              skipAuth: true,
            });
            this.globalData.token = payload.token;
            this.globalData.user = payload.user;
            wx.setStorageSync("wechat-session-token", payload.token);
            resolve(payload);
          } catch (error) {
            reject(error);
          }
        },
        fail: reject,
      });
    }).finally(() => {
      this._loginPromise = null;
    });
    return this._loginPromise;
  },

  async loadState(force = false) {
    if (this.globalData.state && !force) return this.globalData.state;
    await this.login();
    const payload = await api.request("/api/wechat/state");
    this.globalData.state = payload.state;
    return payload.state;
  },

  async saveState(state) {
    this.globalData.state = state;
    await api.request("/api/wechat/state", {
      method: "PUT",
      data: { state },
    });
  },
});
