const config = require("../config");

function request(path, options = {}) {
  const app = getApp();
  const token = app?.globalData?.token || wx.getStorageSync("wechat-session-token") || "";
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${config.apiBaseUrl}${path}`,
      method: options.method || "GET",
      data: options.data,
      timeout: 30000,
      header: {
        "content-type": "application/json",
        ...(options.skipAuth || !token ? {} : { Authorization: `Bearer ${token}` }),
      },
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data);
          return;
        }
        reject(new Error(response.data?.error || `请求失败（${response.statusCode}）`));
      },
      fail(error) {
        reject(new Error(error.errMsg || "网络连接失败"));
      },
    });
  });
}

module.exports = { request };
