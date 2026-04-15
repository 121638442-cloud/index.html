const API_BASE = 'https://lancangsuo.ltd:3001/api';
const StorageUtil = require('../../utils/storage');

Page({
  data: {
    serviceType: 'unlock',
    servicePrice: 50,
    formData: {
      name: '',
      phone: '',
      address: '',
      date: '',
      time: '',
      remark: ''
    }
  },

  onLoad(options) {
    if (options.type) {
      this.setData({
        serviceType: options.type
      });
      this.updatePrice(options.type);
    }
  },

  updatePrice(type) {
    const prices = {
      unlock: 50,
      change: 100,
      repair: 80,
      install: 120
    };
    this.setData({
      servicePrice: prices[type] || 50
    });
  },

  selectType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      serviceType: type
    });
    this.updatePrice(type);
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

  bindDateChange(e) {
    this.setData({
      'formData.date': e.detail.value
    });
  },

  bindTimeChange(e) {
    this.setData({
      'formData.time': e.detail.value
    });
  },

  inputRemark(e) {
    this.setData({
      'formData.remark': e.detail.value
    });
  },

  async submitOrder() {
    const { formData, serviceType, servicePrice } = this.data;
    
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
    
    if (!formData.date || !formData.time) {
      wx.showToast({
        title: '请选择服务时间',
        icon: 'none'
      });
      return;
    }

    const typeNames = {
      unlock: '开锁',
      change: '换锁',
      repair: '维修',
      install: '安装'
    };

    const newOrder = {
      id: Date.now(),
      type: serviceType,
      typeName: typeNames[serviceType],
      price: servicePrice,
      ...formData,
      status: 'pending'
    };

    try {
      const response = await wx.request({
        url: `${API_BASE}/services`,
        method: 'POST',
        data: newOrder
      });
      if (response.data.success) {
        console.log('预约已发送到服务器 - service.js:141');
      }
    } catch (e) {
      console.log('服务器未启动，使用本地存储 - service.js:144');
      let services = StorageUtil.getServices() || [];
      services.unshift({ ...newOrder, createTime: new Date().toLocaleString() });
      StorageUtil.setServices(services);
    }
    
    wx.showToast({
      title: '预约成功',
      icon: 'success',
      duration: 2000
    });
    
    setTimeout(() => {
      wx.switchTab({
        url: '/pages/user/user'
      });
    }, 2000);
  }
});
