const StorageUtil = require('../../utils/storage');

let allProducts = [];

const mockBackendProducts = [];

function validateImageUrl(url) {
  console.log('原始图片URL:', url);
  if (!url) {
    const placeholder = 'https://via.placeholder.com/200x200?text=暂无图片';
    console.log('图片URL为空，使用占位符:', placeholder);
    return placeholder;
  }
  const newUrl = url
    .replace('localhost:3001', 'lancangsuo.ltd:3001')
    .replace('localhost:3000', 'lancangsuo.ltd:3001')
    .replace('127.0.0.1:3000', 'lancangsuo.ltd:3001')
    .replace('127.0.0.1:3001', 'lancangsuo.ltd:3001')
    .replace('192.168.2.5:3000', 'lancangsuo.ltd:3001');
  console.log('处理后图片URL:', newUrl);
  return newUrl;
}

function processProducts(products) {
  return products.map(product => {
    if (product.image) {
      product.image = validateImageUrl(product.image);
    }
    if (product.stock === undefined) {
      product.stock = 100;
    }
    if (product.sales === undefined) {
      product.sales = 0;
    }
    return product;
  });
}

Page({
  data: {
    currentCategory: 0,
    products: [],
    loading: true,
    error: null
  },

  async onLoad() {
    await this.loadProducts();
  },

  async onShow() {
    await this.loadProducts();
  },

  async loadProducts() {
    const that = this;
    console.log('开始加载产品...');
    
    wx.request({
      url: 'https://lancangsuo.ltd:3001/api/products?t=' + Date.now(),
      method: 'GET',
      timeout: 5000,
      success: (res) => {
        console.log('API响应:', res);
        
        if (res.statusCode === 200 && res.data && res.data.success && res.data.data.length > 0) {
          allProducts = processProducts(res.data.data);
          StorageUtil.setProducts(allProducts);
          that.setData({ products: allProducts, loading: false });
          console.log('API加载成功:', allProducts.length);
        } else {
          console.log('API返回数据无效，使用模拟数据');
          allProducts = processProducts(mockBackendProducts);
          StorageUtil.setProducts(allProducts);
          that.setData({ products: allProducts, loading: false });
        }
      },
      fail: (err) => {
        console.log('API请求失败:', err);
        allProducts = processProducts(mockBackendProducts);
        StorageUtil.setProducts(allProducts);
        that.setData({ products: allProducts, loading: false });
      }
    });
  },

  switchCategory(e) {
    const categoryId = parseInt(e.currentTarget.dataset.id);
    let filteredProducts = categoryId === 0 
      ? allProducts 
      : allProducts.filter(item => item.category === categoryId);
    
    this.setData({ 
      currentCategory: categoryId,
      products: filteredProducts
    });
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  }
});
