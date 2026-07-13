// ============================
// 1. 导航高亮（根据当前页面）
// ============================
document.addEventListener('DOMContentLoaded', () => {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const links = document.querySelectorAll('.nav-links a');
  links.forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
    }
  });
});

// ============================
// 2. 设计器核心逻辑（仅在designer.html生效）
// ============================
if (document.getElementById('designerCanvas')) {
  // ---------- 全局状态 ----------
  const canvas = document.getElementById('designerCanvas');
  const ctx = canvas.getContext('2d');
  let beads = [];                // 珠子数组 [{color, size, material}]
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = 120;            // 手串环形半径
  let draggingIndex = -1;        // 拖拽中的珠子索引
  let dragOffset = {x:0, y:0};

  // 预设珠子选项
  const colorOptions = ['#E6A8D7', '#A8D8EA', '#F4C2C2', '#C9B1FF', '#FFDAC1', '#B5EAD7', '#FF9AA2', '#E2F0CB'];
  const sizeOptions = [12, 16, 20, 24];
  const materialOptions = ['天然水晶', '玻璃', '树脂'];

  // ---------- 渲染画布 ----------
  function drawBeads() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (beads.length === 0) {
      ctx.font = '18px Quicksand';
      ctx.fillStyle = '#aaa';
      ctx.textAlign = 'center';
      ctx.fillText('点击左侧珠子开始设计', centerX, centerY);
      return;
    }

    const total = beads.length;
    beads.forEach((bead, index) => {
      const angle = (index / total) * 2 * Math.PI - Math.PI/2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      const size = bead.size || 16;

      // 绘制珠子（带光泽效果）
      const grad = ctx.createRadialGradient(x-4, y-4, 2, x, y, size);
      grad.addColorStop(0, lightenColor(bead.color, 40));
      grad.addColorStop(0.7, bead.color);
      grad.addColorStop(1, darkenColor(bead.color, 30));
      ctx.beginPath();
      ctx.arc(x, y, size/2, 0, 2*Math.PI);
      ctx.fillStyle = grad;
      ctx.shadowColor = 'rgba(0,0,0,0.15)';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      // 高光
      ctx.beginPath();
      ctx.arc(x-3, y-4, size/6, 0, 2*Math.PI);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fill();

      // 序号（小字）
      ctx.font = '10px Quicksand';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(index+1, x, y-2);
    });
  }

  // 辅助函数：颜色变亮/变暗
  function lightenColor(hex, amt) {
    let r = parseInt(hex.slice(1,3),16), g=..., b=...; // 简化，下面用简单方式
    return hex; // 为了演示，直接返回原色，实际可完善
  }
  function darkenColor(hex, amt) { return hex; }

  // 简化版：直接使用原色（可后续增强）
  // 这里仅作示意，完整项目可引入color库

  // ---------- 添加珠子 ----------
  window.addBead = function(color, size, material) {
    beads.push({ color: color || '#E6A8D7', size: size || 16, material: material || '天然水晶' });
    drawBeads();
  };

  // 从左侧面板添加（绑定在HTML中）
  document.querySelectorAll('.bead-option').forEach(btn => {
    btn.addEventListener('click', function() {
      const color = this.dataset.color;
      const size = parseInt(this.dataset.size) || 16;
      const material = this.dataset.material || '天然水晶';
      addBead(color, size, material);
    });
  });

  // ---------- 删除珠子（双击） ----------
  canvas.addEventListener('dblclick', function(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    // 检测点击位置是否在某个珠子上
    const total = beads.length;
    for (let i = total-1; i >= 0; i--) {
      const angle = (i / total) * 2 * Math.PI - Math.PI/2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      const dist = Math.hypot(mouseX - x, mouseY - y);
      if (dist < (beads[i].size/2 + 8)) {
        beads.splice(i, 1);
        drawBeads();
        break;
      }
    }
  });

  // ---------- 拖拽排序（mousedown/mousemove/mouseup） ----------
  let isDragging = false;
  canvas.addEventListener('mousedown', function(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const total = beads.length;
    for (let i = 0; i < total; i++) {
      const angle = (i / total) * 2 * Math.PI - Math.PI/2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      const dist = Math.hypot(mouseX - x, mouseY - y);
      if (dist < (beads[i].size/2 + 10)) {
        draggingIndex = i;
        isDragging = true;
        dragOffset.x = mouseX - x;
        dragOffset.y = mouseY - y;
        canvas.style.cursor = 'grabbing';
        break;
      }
    }
  });

  document.addEventListener('mousemove', function(e) {
    if (!isDragging || draggingIndex === -1) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    // 计算最近的目标位置（以角度划分）
    const total = beads.length;
    let minDist = Infinity;
    let targetIndex = -1;
    for (let i = 0; i < total; i++) {
      if (i === draggingIndex) continue;
      const angle = (i / total) * 2 * Math.PI - Math.PI/2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      const dist = Math.hypot(mouseX - x, mouseY - y);
      if (dist < minDist) {
        minDist = dist;
        targetIndex = i;
      }
    }
    if (targetIndex !== -1 && targetIndex !== draggingIndex) {
      // 交换
      const temp = beads[draggingIndex];
      beads.splice(draggingIndex, 1);
      beads.splice(targetIndex, 0, temp);
      draggingIndex = targetIndex;
      drawBeads();
    }
  });

  document.addEventListener('mouseup', function() {
    if (isDragging) {
      isDragging = false;
      draggingIndex = -1;
      canvas.style.cursor = 'default';
    }
  });

  // ---------- 清空 ----------
  window.clearDesign = function() {
    beads = [];
    drawBeads();
  };

  // ---------- 随机生成 ----------
  window.randomDesign = function() {
    const count = Math.floor(Math.random() * 8) + 4; // 4~12颗
    beads = [];
    for (let i = 0; i < count; i++) {
      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];
      const size = sizeOptions[Math.floor(Math.random() * sizeOptions.length)];
      const material = materialOptions[Math.floor(Math.random() * materialOptions.length)];
      beads.push({ color, size, material });
    }
    drawBeads();
  };

  // ---------- 保存到本地 ----------
  window.saveDesign = function() {
    if (beads.length === 0) {
      alert('请先设计手串！');
      return;
    }
    const name = prompt('为这个设计起个名字：', '我的水晶手串');
    if (name === null) return;
    const designs = JSON.parse(localStorage.getItem('crystalDesigns') || '[]');
    // 将canvas转为图片缩略图
    const thumbnail = canvas.toDataURL('image/png');
    designs.push({
      id: Date.now(),
      name: name || '未命名',
      beads: beads,
      thumbnail: thumbnail,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem('crystalDesigns', JSON.stringify(designs));
    alert('设计已保存！可在“我的设计”中查看。');
  };

  // ---------- 加载指定设计（通过URL参数或全局） ----------
  window.loadDesign = function(designData) {
    beads = designData.beads || [];
    drawBeads();
  };

  // 如果URL有参数 ?load=id，自动加载
  const params = new URLSearchParams(window.location.search);
  const loadId = params.get('load');
  if (loadId) {
    const designs = JSON.parse(localStorage.getItem('crystalDesigns') || '[]');
    const found = designs.find(d => d.id == loadId);
    if (found) {
      beads = found.beads;
      drawBeads();
    }
  }

  // 初始绘制
  drawBeads();

  // ---------- 导出函数供其他页面使用 ----------
  window.getBeads = () => beads;
}