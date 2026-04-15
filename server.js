const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const https = require('https');

const app = express();
const PORT = 3000;
const HTTPS_PORT = 3001;

// 读取SSL证书
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, 'ssl', 'lancangsuo.ltd.key')),
  cert: fs.readFileSync(path.join(__dirname, 'ssl', 'lancangsuo.ltd.pem'))
};

// 静态文件服务 - 放在最前面
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// 根路径重定向
app.get('/', (req, res) => {
  res.redirect('/admin');
});

// 后台管理首页
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// 其他中间件
app.use(cors());
app.use(express.json());

// 禁用缓存
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// 简单的速率限制中间件
const rateLimit = {
  windowMs: 15 * 60 * 1000,
  max: 1000,
  requests: new Map()
};

app.use((req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  
  if (!rateLimit.requests.has(ip)) {
    rateLimit.requests.set(ip, []);
  }
  
  const requests = rateLimit.requests.get(ip);
  const recentRequests = requests.filter(timestamp => now - timestamp < rateLimit.windowMs);
  rateLimit.requests.set(ip, recentRequests);
  
  if (recentRequests.length >= rateLimit.max) {
    return res.status(429).json({ success: false, message: '请求过于频繁，请稍后再试' });
  }
  
  recentRequests.push(now);
  next();
});

// API 权限控制中间件
function apiAuthMiddleware(req, res, next) {
  const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://lancangsuo.ltd:3000', 'https://lancangsuo.ltd:3001'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    return next();
  }
  
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  if (apiKey === 'admin123456') {
    return next();
  }
  
  const ip = req.ip;
  if (ip === '::1' || ip === '127.0.0.1') {
    return next();
  }
  
  res.status(401).json({ 
    success: false, 
    message: '未授权访问，请通过后台管理系统访问' 
  });
}

// 固定的服务器IP（公网访问用）
const SERVER_IP = '39.106.21.24';

// 根据请求来源获取正确的图片URL
function getImageUrl(req, imagePath) {
  if (!imagePath) return imagePath;
  
  const origin = req.headers.origin || req.headers.referer || '';
  const ip = req.ip || req.connection.remoteAddress || '';
  let baseUrl = 'http://localhost:3000';
  
  if (origin.includes('lancangsuo.ltd') || origin.includes('39.106.21.24')) {
    if (origin.includes('https')) {
      baseUrl = 'https://lancangsuo.ltd:3001';
    } else {
      baseUrl = 'http://lancangsuo.ltd:3000';
    }
  }
  else if (!ip.includes('127.0.0.1') && !ip.includes('::1') && !ip.includes('localhost')) {
    baseUrl = 'https://lancangsuo.ltd:3001';
  }
  
  const fileName = imagePath.split('/').pop();
  return `${baseUrl}/uploads/${fileName}`;
}

// 数据文件路径
const dataDir = path.join(__dirname, 'data');
const productsFile = path.join(dataDir, 'products.json');
const bannersFile = path.join(dataDir, 'banners.json');
const ordersFile = path.join(dataDir, 'orders.json');
const servicesFile = path.join(dataDir, 'services.json');
const noticeFile = path.join(dataDir, 'notice.json');
const configFile = path.join(dataDir, 'config.json');

// 确保数据文件存在
function ensureDataFile(filePath, defaultData) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
  }
}

// 读取JSON文件
function readJson(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`读取文件失败: ${filePath}`, error);
    return [];
  }
}

// 写入JSON文件
function writeJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`写入文件失败: ${filePath}`, error);
    return false;
  }
}

// 初始化数据文件
ensureDataFile(productsFile, []);
ensureDataFile(bannersFile, []);
ensureDataFile(ordersFile, []);
ensureDataFile(servicesFile, []);
ensureDataFile(noticeFile, { text: '🔒 澜沧安欣智能锁 | 24小时上门服务', enabled: true });
ensureDataFile(configFile, { appName: '澜沧安欣智能锁', apiUrl: 'http://lancangsuo.ltd:3000' });

// 服务状态检查
app.get('/api/status', (req, res) => {
  res.json({ 
    success: true, 
    message: '后端服务运行正常',
    data: {
      version: '1.0.0',
      time: new Date().toISOString()
    }
  });
});

// 获取轮播图列表（公开接口）
app.get('/api/banners', (req, res) => {
  try {
    const banners = readJson(bannersFile);
    const bannersWithFixedUrl = banners.map(b => {
      const newImage = getImageUrl(req, b.image);
      return { ...b, image: newImage };
    });
    res.json({ success: true, data: bannersWithFixedUrl });
  } catch (error) {
    console.error('获取轮播图列表失败:', error);
    res.status(500).json({ success: false, message: '获取轮播图列表失败' });
  }
});

// 添加轮播图
app.post('/api/banners', apiAuthMiddleware, (req, res) => {
  try {
    const banners = readJson(bannersFile);
    const newBanner = {
      id: Date.now(),
      ...req.body,
      createTime: new Date().toLocaleString()
    };
    banners.push(newBanner);
    writeJson(bannersFile, banners);
    res.json({ success: true, data: newBanner });
  } catch (error) {
    console.error('添加轮播图失败:', error);
    res.status(500).json({ success: false, message: '添加轮播图失败' });
  }
});

// 删除轮播图
app.delete('/api/banners/:id', apiAuthMiddleware, (req, res) => {
  try {
    const banners = readJson(bannersFile);
    const newBanners = banners.filter(b => b.id !== parseInt(req.params.id));
    writeJson(bannersFile, newBanners);
    res.json({ success: true });
  } catch (error) {
    console.error('删除轮播图失败:', error);
    res.status(500).json({ success: false, message: '删除轮播图失败' });
  }
});

// 更新轮播图
app.put('/api/banners/:id', apiAuthMiddleware, (req, res) => {
  try {
    const banners = readJson(bannersFile);
    const index = banners.findIndex(b => b.id === parseInt(req.params.id));
    if (index !== -1) {
      banners[index] = { ...banners[index], ...req.body };
      writeJson(bannersFile, banners);
      res.json({ success: true, data: banners[index] });
    } else {
      res.status(404).json({ success: false, message: '轮播图不存在' });
    }
  } catch (error) {
    console.error('更新轮播图失败:', error);
    res.status(500).json({ success: false, message: '更新轮播图失败' });
  }
});

// 获取产品列表（公开接口）
app.get('/api/products', (req, res) => {
  try {
    const products = readJson(productsFile);
    const productsWithFixedUrl = products.map(p => {
      const newImage = getImageUrl(req, p.image);
      return { ...p, image: newImage };
    });
    res.json({ success: true, data: productsWithFixedUrl });
  } catch (error) {
    console.error('获取产品列表失败:', error);
    res.status(500).json({ success: false, message: '获取产品列表失败' });
  }
});

// 获取单个产品（公开接口）
app.get('/api/products/:id', (req, res) => {
  try {
    const products = readJson(productsFile);
    const product = products.find(p => p.id === parseInt(req.params.id));
    if (product) {
      const newImage = getImageUrl(req, product.image);
      res.json({ success: true, data: { ...product, image: newImage } });
    } else {
      res.status(404).json({ success: false, message: '产品不存在' });
    }
  } catch (error) {
    console.error('获取产品失败:', error);
    res.status(500).json({ success: false, message: '获取产品失败' });
  }
});

// 添加产品
app.post('/api/products', apiAuthMiddleware, (req, res) => {
  try {
    const products = readJson(productsFile);
    const newProduct = {
      id: Date.now(),
      ...req.body,
      createTime: new Date().toLocaleString()
    };
    products.push(newProduct);
    writeJson(productsFile, products);
    res.json({ success: true, data: newProduct });
  } catch (error) {
    console.error('添加产品失败:', error);
    res.status(500).json({ success: false, message: '添加产品失败' });
  }
});

// 更新产品
app.put('/api/products/:id', apiAuthMiddleware, (req, res) => {
  try {
    const products = readJson(productsFile);
    const index = products.findIndex(p => p.id === parseInt(req.params.id));
    if (index !== -1) {
      products[index] = { ...products[index], ...req.body };
      writeJson(productsFile, products);
      res.json({ success: true, data: products[index] });
    } else {
      res.status(404).json({ success: false, message: '产品不存在' });
    }
  } catch (error) {
    console.error('更新产品失败:', error);
    res.status(500).json({ success: false, message: '更新产品失败' });
  }
});

// 删除产品
app.delete('/api/products/:id', apiAuthMiddleware, (req, res) => {
  try {
    const products = readJson(productsFile);
    const newProducts = products.filter(p => p.id !== parseInt(req.params.id));
    writeJson(productsFile, newProducts);
    res.json({ success: true });
  } catch (error) {
    console.error('删除产品失败:', error);
    res.status(500).json({ success: false, message: '删除产品失败' });
  }
});

// 获取订单列表
app.get('/api/orders', apiAuthMiddleware, (req, res) => {
  try {
    const orders = readJson(ordersFile);
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({ success: false, message: '获取订单列表失败' });
  }
});

// 创建订单
app.post('/api/orders', (req, res) => {
  try {
    const orders = readJson(ordersFile);
    const newOrder = {
      id: Date.now(),
      ...req.body,
      status: 'pending',
      createTime: new Date().toLocaleString()
    };
    orders.push(newOrder);
    writeJson(ordersFile, orders);
    res.json({ success: true, data: newOrder });
  } catch (error) {
    console.error('创建订单失败:', error);
    res.status(500).json({ success: false, message: '创建订单失败' });
  }
});

// 更新订单状态
app.put('/api/orders/:id', apiAuthMiddleware, (req, res) => {
  try {
    const orders = readJson(ordersFile);
    const index = orders.findIndex(o => o.id === parseInt(req.params.id));
    if (index !== -1) {
      orders[index] = { ...orders[index], ...req.body };
      writeJson(ordersFile, orders);
      res.json({ success: true, data: orders[index] });
    } else {
      res.status(404).json({ success: false, message: '订单不存在' });
    }
  } catch (error) {
    console.error('更新订单失败:', error);
    res.status(500).json({ success: false, message: '更新订单失败' });
  }
});

// 根据手机号查询订单（无需认证）
app.get('/api/orders/phone/:phone', (req, res) => {
  try {
    const phone = req.params.phone;
    const orders = readJson(ordersFile);
    const filteredOrders = orders.filter(o => o.phone === phone);
    res.json({ success: true, data: filteredOrders });
  } catch (error) {
    console.error('查询订单失败:', error);
    res.status(500).json({ success: false, message: '查询订单失败' });
  }
});

// 获取服务预约列表
app.get('/api/services', apiAuthMiddleware, (req, res) => {
  try {
    const services = readJson(servicesFile);
    res.json({ success: true, data: services });
  } catch (error) {
    console.error('获取服务预约列表失败:', error);
    res.status(500).json({ success: false, message: '获取服务预约列表失败' });
  }
});

// 创建服务预约
app.post('/api/services', (req, res) => {
  try {
    const services = readJson(servicesFile);
    const newService = {
      id: Date.now(),
      ...req.body,
      status: 'pending',
      createTime: new Date().toLocaleString()
    };
    services.push(newService);
    writeJson(servicesFile, services);
    res.json({ success: true, data: newService });
  } catch (error) {
    console.error('创建服务预约失败:', error);
    res.status(500).json({ success: false, message: '创建服务预约失败' });
  }
});

// 更新服务预约状态
app.put('/api/services/:id', apiAuthMiddleware, (req, res) => {
  try {
    const services = readJson(servicesFile);
    const index = services.findIndex(s => s.id === parseInt(req.params.id));
    if (index !== -1) {
      services[index] = { ...services[index], ...req.body };
      writeJson(servicesFile, services);
      res.json({ success: true, data: services[index] });
    } else {
      res.status(404).json({ success: false, message: '服务预约不存在' });
    }
  } catch (error) {
    console.error('更新服务预约失败:', error);
    res.status(500).json({ success: false, message: '更新服务预约失败' });
  }
});

// 获取通知
app.get('/api/notice', apiAuthMiddleware, (req, res) => {
  try {
    const notice = readJson(noticeFile);
    res.json({ success: true, data: notice });
  } catch (error) {
    console.error('获取通知失败:', error);
    res.status(500).json({ success: false, message: '获取通知失败' });
  }
});

// 更新通知
app.post('/api/notice', apiAuthMiddleware, (req, res) => {
  try {
    writeJson(noticeFile, req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('更新通知失败:', error);
    res.status(500).json({ success: false, message: '更新通知失败' });
  }
});

// 获取统计
app.get('/api/stats', apiAuthMiddleware, (req, res) => {
  try {
    const orders = readJson(ordersFile);
    const services = readJson(servicesFile);
    const products = readJson(productsFile);
    
    const stats = {
      totalOrders: orders.length,
      pendingOrders: orders.filter(o => o.status === 'pending').length,
      totalServices: services.length,
      pendingServices: services.filter(s => s.status === 'pending').length,
      totalProducts: products.length
    };
    
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('获取统计失败:', error);
    res.status(500).json({ success: false, message: '获取统计失败' });
  }
});

// 文件上传
const multer = require('multer');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('只能上传图片文件'));
    }
  }
});

app.post('/api/upload', apiAuthMiddleware, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '没有上传文件' });
    }
    
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ 
      success: true, 
      data: {
        filename: req.file.filename,
        url: fileUrl,
        path: req.file.path
      }
    });
  } catch (error) {
    console.error('上传文件失败:', error);
    res.status(500).json({ success: false, message: '上传文件失败' });
  }
});

// 获取素材列表
// 获取素材列表（公开接口）
app.get('/api/materials', (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      return res.json({ success: true, data: [] });
    }
    
    const files = fs.readdirSync(uploadsDir);
    const images = files
      .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
      .map(file => ({
        filename: file,
        url: `/uploads/${file}`
      }));
    
    res.json({ success: true, data: images });
  } catch (error) {
    console.error('获取素材列表失败:', error);
    res.status(500).json({ success: false, message: '获取素材列表失败' });
  }
});

// 删除素材
app.delete('/api/materials/:filename', apiAuthMiddleware, (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true, message: '删除成功' });
    } else {
      res.status(404).json({ success: false, message: '文件不存在' });
    }
  } catch (error) {
    console.error('删除素材失败:', error);
    res.status(500).json({ success: false, message: '删除素材失败' });
  }
});

// 统一错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ 
    success: false, 
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`后端服务已启动: http://0.0.0.0:${PORT}`);
  console.log(`后台管理系统: http://0.0.0.0:${PORT}/admin`);
});

// 启动HTTPS服务
https.createServer(sslOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
  console.log(`HTTPS服务已启动: https://0.0.0.0:${HTTPS_PORT}`);
  console.log(`后台管理系统(HTTPS): https://0.0.0.0:${HTTPS_PORT}/admin`);
});
