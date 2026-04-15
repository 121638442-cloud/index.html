const StorageUtil = require('../../utils/storage');

const mockProducts = [];

const defaultBanners = [];

function validateImageUrl(url) {
  if (!url) return 'https://via.placeholder.com/200x200?text=暂无图片';
  return url
    .replace('localhost:3001', 'lancangsuo.ltd:3001')
    .replace('localhost:3000', 'lancangsuo.ltd:3001')
    .replace('127.0.0.1:3000', 'lancangsuo.ltd:3001')
    .replace('127.0.0.1:3001', 'lancangsuo.ltd:3001')
    .replace('192.168.2.5:3000', 'lancangsuo.ltd:3001');
}

Page({
  data: {
    banners: [],
    notice: { text: '', enabled: false },
    hotProducts: [],
    recommendProducts: [],
    loading: true
  },

  onLoad() {
    this.loadBanners();
    this.loadNotice();
    this.loadProducts();
  },

  onShow() {
    this.loadProducts();
    this.loadNotice();
  },

  loadNotice() {
    console.log('开始加载公告...');
    wx.request({
      url: 'https://lancangsuo.ltd:3001/api/notice?t=' + Date.now(),
      method: 'GET',
      timeout: 10000,
      success: (res) => {
        console.log('公告API响应:', res);
        if (res.statusCode === 200 && res.data && res.data.success && res.data.data) {
          const noticeData = res.data.data;
          if (noticeData.text) {
            this.setData({ notice: noticeData });
            console.log('公告已更新:', noticeData);
          }
        }
      },
      fail: (err) => {
        console.log('公告加载失败:', err);
      }
    });
  },

  loadBanners() {
    console.log('开始加载轮播图...');
    wx.request({
      url: 'https://lancangsuo.ltd:3001/api/banners?t=' + Date.now(),
      method: 'GET',
      timeout: 10000,
      success: (res) => {
        console.log('轮播图API响应:', res);
        if (res.statusCode === 200 && res.data && res.data.success && res.data.data) {
          const banners = res.data.data.map(b => ({
            id: b.id,
            image: validateImageUrl(b.image)
          }));
          this.setData({ banners });
          console.log('轮播图加载成功:', banners);
        }
      },
      fail: (err) => {
        console.log('轮播图加载失败:', err);
        this.setData({ banners: [] });
      }
    });
  },

  loadProducts() {
    const that = this;
    console.log('开始请求API产品...');
    
    wx.request({
      url: 'https://lancangsuo.ltd:3001/api/products?t=' + Date.now(),
      method: 'GET',
      timeout: 10000,
      success: (res) => {
        console.log('产品API响应:', res);
        
        if (res.statusCode === 200 && res.data && res.data.success && res.data.data) {
          let products = res.data.data;
          console.log('API返回的产品数量:', products.length);
          
          products = products.map(p => ({
            ...p,
            image: validateImageUrl(p.image),
            sales: p.sales || 0
          }));
          
          StorageUtil.setProducts(products);

          const hotProducts = [...products].sort((a, b) => b.sales - a.sales).slice(0, 4)
            .map(p => ({ id: p.id, name: p.name, desc: p.desc, price: p.price, sales: p.sales, image: p.image }));
          const recommendProducts = [...products].sort((a, b) => b.price - a.price).slice(0, 2)
            .map(p => ({ id: p.id, name: p.name, price: p.price, tags: p.tags, image: p.image }));

          that.setData({
            hotProducts,
            recommendProducts,
            loading: false
          });
          
          console.log('首页数据设置完成, hotProducts:', hotProducts);
        }
      },
      fail: (err) => {
        console.log('产品API请求失败:', err);
        that.setData({ loading: false });
      }
    });
  },

  goToService(e) {
    wx.navigateTo({ url: `/pages/service/service?type=${e.currentTarget.dataset.type}` });
  },

  goToProducts() {
    wx.switchTab({ url: '/pages/products/products' });
  },

  goToCart() {
    wx.switchTab({ url: '/pages/cart/cart' });
  },

  goToDetail(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` });
  },

  onShareAppMessage() {
    return {
      title: '澜沧安欣智能锁 - 专业开锁换锁服务',
      path: '/pages/index/index',
      imageUrl: '/images/share.png'
    };
  },

  onShareTimeline() {
    return {
      title: '澜沧安欣智能锁 - 专业开锁换锁服务',
      query: '',
      imageUrl: '/images/share.png'
    };
  }


});
