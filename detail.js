const StorageUtil = require('../../utils/storage');

Page({
  data: {
    product: {},
    params: [
      { name: '品牌', value: '德施曼' },
      { name: '型号', value: 'Q5P' },
      { name: '开锁方式', value: '指纹/密码/卡片/钥匙/APP' },
      { name: '锁芯等级', value: 'C级' },
      { name: '电源', value: '锂电池' },
      { name: '适用门厚', value: '40-120mm' },
      { name: '应急供电', value: 'USB接口' },
      { name: '安装方式', value: '免费上门安装' }
    ]
  },

  onLoad(options) {
    const id = parseInt(options.id);
    this.loadProduct(id);
    this.saveBrowseHistory(id);
  },

  saveBrowseHistory(productId) {
    let history = wx.getStorageSync('browseHistory') || [];
    const products = wx.getStorageSync('products') || [];
    const product = products.find(p => p.id === productId);
    
    if (product) {
      history = history.filter(item => item.id !== productId);
      history.unshift(product);
      if (history.length > 20) {
        history = history.slice(0, 20);
      }
      wx.setStorageSync('browseHistory', history);
    }
  },

  loadProduct(id) {
    console.log('开始加载产品详情, id:', id);
    
    wx.request({
      url: 'https://lancangsuo.ltd:3001/api/products/' + id + '?t=' + Date.now(),
      method: 'GET',
      timeout: 3000,
      success: (res) => {
        console.log('产品详情API响应:', res);
        
        if (res.statusCode === 200 && res.data && res.data.success) {
          let product = res.data.data;
          if (product && product.image) {
            product.image = this.validateImageUrl(product.image);
            this.setData({ product: product });
            console.log('详情页产品数据:', product);
          }
        }
      },
      fail: (err) => {
        console.log('获取产品详情失败:', err);
        
        // 如果获取失败，尝试从本地存储获取
        const products = StorageUtil.getProducts() || [];
        const localProduct = products.find(p => p.id == id);
        if (localProduct) {
          if (localProduct.image) {
            localProduct.image = this.validateImageUrl(localProduct.image);
          }
          this.setData({ product: localProduct });
        }
      }
    });
  },

  validateImageUrl(url) {
    console.log('detail.js validateImageUrl 原始URL:', url);
    if (!url) {
      return 'https://via.placeholder.com/300x300?text=暂无图片';
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return 'https://via.placeholder.com/300x300?text=无效图片';
    }
    
    let newUrl = url
      .replace('localhost:3001', 'lancangsuo.ltd:3001')
    .replace('localhost:3000', 'lancangsuo.ltd:3001')
    .replace('127.0.0.1:3000', 'lancangsuo.ltd:3001')
    .replace('127.0.0.1:3001', 'lancangsuo.ltd:3001')
    .replace('192.168.2.5:3000', 'lancangsuo.ltd:3001');
    
    console.log('detail.js validateImageUrl 处理后URL:', newUrl);
    return newUrl;
  },

  goToService() {
    wx.navigateTo({
      url: '/pages/service/service'
    });
  },

  addToCart() {
    const app = getApp();
    const product = this.data.product;
    
    let cart = wx.getStorageSync('cart') || [];
    const existingIndex = cart.findIndex(item => item.id === product.id);
    
    if (existingIndex > -1) {
      cart[existingIndex].quantity += 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1,
        checked: true
      });
    }
    
    wx.setStorageSync('cart', cart);
    
    wx.showToast({
      title: '已加入购物车',
      icon: 'success'
    });
  },

  buyNow() {
    this.addToCart();
    wx.switchTab({
      url: '/pages/cart/cart'
    });
  }
});
