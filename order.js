const API_BASE = 'https://lancangsuo.ltd:3001/api';
const StorageUtil = require('../../utils/storage');

Page({
  data: {
    orderItems: [],
    formData: {
      name: '',
      phone: '',
      address: '',
      remark: ''
    },
    paymentMethod: 'contact',
    subtotal: 0,
    installFee: 100,
    total: 0
  },

  onLoad() {
    this.loadOrderItems();
  },

  loadOrderItems() {
    const cart = wx.getStorageSync('cart') || [];
    const orderItems = cart.filter(item => item.checked);
    
    let subtotal = 0;
    orderItems.forEach(item => {
      subtotal += item.price * item.quantity;
    });
    
    const total = subtotal + this.data.installFee;
    
    this.setData({
      orderItems,
      subtotal: subtotal.toFixed(2),
      total: total.toFixed(2)
    });
  },

  inputName(e) {
    this.setData({
      'formData.name': e.detail.value
    });
  },

  inputPhone(e) {
    this.setData({
      'formData.phone': e.detail.value
    });
  },

  inputAddress(e) {
    this.setData({
      'formData.address': e.detail.value
    });
  },

  inputRemark(e) {
    this.setData({
      'formData.remark': e.detail.value
    });
  },

  selectPayment(e) {
    const method = e.currentTarget.dataset.method;
    this.setData({
      paymentMethod: method
    });
  },

  async submitOrder() {
    const { orderItems, formData, total } = this.data;
    
    if (orderItems.length === 0) {
      wx.showToast({
        title: '请选择商品',
        icon: 'none'
      });
      return;
    }
    
    if (!formData.name) {
      wx.showToast({
        title: '请输入姓名',
        icon: 'none'
      });
      return;
    }
    
    if (!formData.phone) {
      wx.showToast({
        title: '请输入电话',
        icon: 'none'
      });
      return;
    }
    
    if (!formData.address) {
      wx.showToast({
        title: '请输入地址',
        icon: 'none'
      });
      return;
    }

    const newOrder = {
      id: Date.now(),
      items: orderItems,
      total: parseFloat(total),
      paymentMethod: this.data.paymentMethod,
      paymentMethodName: this.data.paymentMethod === 'contact' ? '联系客服付款' : '货到付款',
      ...formData,
      status: 'pending'
    };

    try {
      const response = await wx.request({
        url: `${API_BASE}/orders`,
        method: 'POST',
        data: newOrder
      });
      if (response.data.success) {
        console.log('订单已发送到服务器 - order.js:124');
      }
    } catch (e) {
      console.log('服务器未启动，使用本地存储 - order.js:127');
      let orders = StorageUtil.getOrders() || [];
      orders.unshift({ ...newOrder, createTime: new Date().toLocaleString() });
      StorageUtil.setOrders(orders);
    }
    
    const cart = wx.getStorageSync('cart') || [];
    const newCart = cart.filter(item => !item.checked);
    wx.setStorageSync('cart', newCart);
    
    if (this.data.paymentMethod === 'contact') {
      wx.showModal({
        title: '订单提交成功',
        content: '请联系客服进行付款\n\n客服电话：15394957338',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/user/user'
          });
        }
      });
    } else {
      wx.showToast({
        title: '订单提交成功',
        icon: 'success',
        duration: 2000
      });
      
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/user/user'
        });
      }, 2000);
    }
  }
});
