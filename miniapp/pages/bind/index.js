Page({
  data: { url: "" },

  onLoad(query) {
    this.setData({ url: decodeURIComponent(query.url || "") });
  },
});
