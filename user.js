Page({
  data: {
    orderCount: {
      pending: 0,
      shipped: 0,
      completed: 0
    },
    queryOrders: [],
    showQueryModal: false,
    queryPhone: ''
  },

  onShow() {
    this.loadOrderCount();
  },

  loadOrderCount() {
    const orders = wx.getStorageSync('orders') || [];
    const count = {
      pending: orders.filter(o => o.status === 'pending').length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      completed: orders.filter(o => o.status === 'completed').length
    };
    this.setData({ orderCount: count });
  },

  queryOrder() {
    const that = this;
    wx.showModal({
      title: '查询订单',
      placeholderText: '请输入下单时的手机号',
      editable: true,
      success: (res) => {
        if (res.confirm && res.content) {
          const phone = res.content.trim();
          if (phone.length < 11) {
            wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
            return;
          }
          that.searchOrdersByPhone(phone);
        }
      }
    });
  },

  searchOrdersByPhone(phone) {
    wx.showLoading({ title: '查询中...' });
    
    wx.request({
      url: 'https://lancangsuo.ltd:3001/api/orders/phone/' + phone,
      method: 'GET',
      timeout: 5000,
      success: (res) => {
        wx.hideLoading();
        console.log('订单查询结果:', res);
        
        if (res.statusCode === 200 && res.data && res.data.success && res.data.data) {
          this.setData({
            queryOrders: res.data.data,
            queryPhone: phone,
            showQueryModal: true
          });
        } else {
          wx.showToast({ title: '未找到该手机号的订单', icon: 'none' });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.log('查询失败:', err);
        
        const localOrders = wx.getStorageSync('orders') || [];
        const filteredOrders = localOrders.filter(o => o.phone === phone);
        
        if (filteredOrders.length > 0) {
          this.setData({
            queryOrders: filteredOrders,
            queryPhone: phone,
            showQueryModal: true
          });
        } else {
          wx.showToast({ title: '未找到该手机号的订单', icon: 'none' });
        }
      }
    });
  },

  closeQueryModal() {
    this.setData({ showQueryModal: false, queryOrders: [] });
  },

  goToHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    });
  },

  goToOrderList(e) {
    const status = e.currentTarget.dataset.status || 'all';
    wx.navigateTo({
      url: `/pages/orderList/orderList?status=${status}`
    });
  },

  goToServiceOrders() {
    wx.navigateTo({
      url: '/pages/serviceList/serviceList'
    });
  },

  goToProducts() {
    wx.switchTab({
      url: '/pages/products/products'
    });
  },

  goToAddress() {
    wx.navigateTo({
      url: '/pages/address/address'
    });
  },

  goToContact() {
    wx.navigateTo({
      url: '/pages/contact/contact'
    });
  },

  goToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  }
});
