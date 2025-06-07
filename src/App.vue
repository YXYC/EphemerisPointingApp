<template>
  <div class="app-container">
    <!-- 顶部标题栏 -->
    <div class="custom-titlebar">
      <div class="titlebar-left">
        <el-icon><svg viewBox="0 0 1024 1024"><circle cx="512" cy="512" r="512" fill="#409EFF"/></svg></el-icon>
        <span class="title-text">星历数据管理</span>
        <!-- 自定义导航菜单 -->
        <div class="titlebar-menu">
          <div 
            v-for="item in menuItems" 
            :key="item.path"
            class="menu-item"
            :class="{ 'is-active': activeMenu === item.path }"
            @click="handleSelect(item.path)"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.title }}</span>
          </div>
        </div>
      </div>
      <div class="titlebar-actions">
        <el-button class="window-btn" icon="Minus" circle @click="minimize" />
        <el-button class="window-btn" icon="FullScreen" circle @click="maximize" />
        <el-button class="window-btn" icon="Close" circle type="danger" @click="close" />
      </div>
    </div>
    <!-- 下方主区域：只保留内容区域 -->
    <div class="main-area">
      <div class="main-content">
        <router-view v-slot="{ Component }">
          <component :is="Component" />
        </router-view>
      </div>
      <div class="tips-toggle-btn" @click="showTips = !showTips">
        <el-icon><InfoFilled /></el-icon>
      </div>
      <div class="tips-panel" :class="{ 'tips-hidden': !showTips }">
        <div class="tips-header">
          <el-icon><InfoFilled /></el-icon>
          <span>使用提示</span>
        </div>
        <div class="tips-content">
          <p v-for="(tip, idx) in tipsContent" :key="idx">{{ tip }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { InfoFilled, Document, Operation, QuestionFilled } from '@element-plus/icons-vue'

// 菜单项配置
const menuItems = [
  {
    path: '/browse',
    title: '数据管理',
    icon: 'Document'
  },
  {
    path: '/ephemeris/single',
    title: '星历计算',
    icon: 'Operation'
  },
  {
    path: '/help',
    title: '帮助文档',
    icon: 'QuestionFilled'
  }
]

// 使用路由获取当前路径
const route = useRoute()
const router = useRouter()
const activeMenu = computed(() => {
  const path = route.path
  if (path.startsWith('/ephemeris')) {
    return '/ephemeris/single'
  }
  return path
})

// 菜单选择处理
const handleSelect = (path: string) => {
  router.push(path)
}

// 声明 windowControl 类型
declare global {
  interface Window {
    windowControl: {
      minimize: () => void
      maximize: () => void
      close: () => void
    }
  }
}

// 窗口控制方法
const minimize = () => window.windowControl.minimize()
const maximize = () => window.windowControl.maximize()
const close = () => window.windowControl.close()

// 提示面板状态
const showTips = ref(true)
const tipsContent = [
  '欢迎使用星历数据管理系统！',
  '点击左侧菜单可以切换不同的功能模块。',
  '您可以通过右上角的按钮最小化、最大化或关闭窗口。',
  '提示面板可以随时展开或收起，为您提供操作指引。'
]
</script>

<style>
/* 重置默认样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f5f6fa;
  color: #2c3e50;
  line-height: 1.6;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
}

.custom-titlebar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  width: 100vw;
  -webkit-app-region: drag;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  background: linear-gradient(90deg, #e0e7ff 0%, #f0fdfa 100%);
  border-bottom: 1px solid #dbeafe;
  user-select: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.titlebar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.titlebar-left svg {
  width: 24px;
  height: 24px;
  filter: drop-shadow(0 2px 4px rgba(64, 158, 255, 0.2));
}

.title-text {
  font-size: 18px;
  font-weight: 600;
  color: #409EFF;
  letter-spacing: 1.5px;
  text-shadow: 0 1px 2px rgba(64, 158, 255, 0.1);
}

.titlebar-menu {
  margin-left: 24px;
  -webkit-app-region: no-drag;
  display: flex;
  align-items: center;
  gap: 8px;
}

.titlebar-menu .menu-item {
  height: 36px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #2c3e50;
  text-decoration: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.titlebar-menu .menu-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, rgba(64, 158, 255, 0.1) 0%, rgba(64, 158, 255, 0) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.titlebar-menu .menu-item:hover {
  background: rgba(64, 158, 255, 0.08);
  color: #337ecc;
  transform: translateY(-1px);
}

.titlebar-menu .menu-item:hover::before {
  opacity: 1;
}

.titlebar-menu .menu-item:active {
  transform: scale(0.98) translateY(-1px);
  background: rgba(64, 158, 255, 0.12);
}

.titlebar-menu .menu-item.is-active {
  background: #409eff;
  color: #fff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.titlebar-menu .menu-item.is-active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 3px;
  background: #fff;
  border-radius: 2px;
  box-shadow: 0 2px 4px rgba(255, 255, 255, 0.5);
}

.titlebar-menu .menu-item .el-icon {
  font-size: 16px;
  transition: all 0.3s ease;
}

.titlebar-menu .menu-item:not(.is-active) .el-icon {
  color: #409EFF;
  opacity: 0.8;
}

.titlebar-menu .menu-item.is-active .el-icon {
  color: #fff;
  transform: scale(1.1);
}

.titlebar-menu .menu-item:hover .el-icon {
  transform: scale(1.1);
}

.titlebar-actions {
  display: flex;
  align-items: center;
  -webkit-app-region: no-drag;
  gap: 8px;
}

.window-btn {
  width: 32px;
  height: 32px;
  margin-left: 4px;
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
  color: #606266;
  transition: all 0.3s ease;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.window-btn:hover {
  background: rgba(64, 158, 255, 0.1) !important;
  color: #409EFF !important;
  transform: translateY(-1px);
}

.window-btn.el-button--danger {
  color: #f56c6c !important;
}

.window-btn.el-button--danger:hover {
  background: rgba(245, 108, 108, 0.1) !important;
  color: #f56c6c !important;
}

.page-title {
  font-size: 22px;
  font-weight: bold;
  color: #222;
  margin: 32px 0 0 32px;
  letter-spacing: 2px;
}

.main-area {
  padding-top: 48px;
  display: flex;
  flex: 1;
  height: calc(100vh - 48px);
  min-width: 0;
  overflow: hidden;
  background: #f5f7fa;
  position: relative;
}

.main-content {
  flex: 1;
  padding: 24px;
  overflow: auto;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
  transition: all 0.3s ease;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
  cursor: pointer;
}

.tips-toggle-btn {
  position: fixed;
  right: 44px;
  top: 80px;
  width: 32px;
  height: 32px;
  background: #fff9c4;
  border: 2px solid #ffe082;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 20;
  transition: background 0.2s, box-shadow 0.2s;
}
.tips-toggle-btn:hover {
  background: #ffe082;
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
}
.tips-toggle-btn .el-icon {
  color: #ff9800;
  font-size: 20px;
}

/* 隐藏按钮时小贴士隐藏 */
.tips-panel.tips-hidden + .tips-toggle-btn {
  display: flex;
}

.tips-panel {
  position: fixed;
  right: 16px;
  top: 100px;
  width: 220px;
  background: #fff9c4;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 16px;
  transition: all 0.3s ease;
  z-index: 10;
  transform: rotate(1deg);
  border-radius: 2px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.tips-panel::before {
  content: '';
  position: absolute;
  top: -12px;
  right: 40px;
  width: 24px;
  height: 24px;
  background: #fff9c4;
  transform: rotate(45deg);
  border-left: 1px solid rgba(0, 0, 0, 0.1);
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  z-index: -1;
}

.tips-panel.tips-hidden {
  transform: translateX(120%) rotate(1deg);
}

.tips-panel.tips-hidden + .main-content {
  margin-right: 0;
}

.tips-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px dashed rgba(0, 0, 0, 0.2);
}

.tips-header .el-icon {
  color: #ff9800;
  font-size: 16px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

.tips-header span {
  font-size: 14px;
  font-weight: 600;
  color: #795548;
  text-shadow: 0 1px 1px rgba(255, 255, 255, 0.8);
}

.tips-content {
  color: #5d4037;
  font-size: 13px;
  line-height: 1.6;
  font-family: 'Comic Sans MS', 'Marker Felt', cursive, sans-serif;
}

.tips-content p {
  margin-bottom: 8px;
  padding-left: 10px;
  position: relative;
  text-shadow: 0 1px 1px rgba(255, 255, 255, 0.8);
}

.tips-content p::before {
  content: '•';
  position: absolute;
  left: 0;
  color: #ff9800;
  font-size: 16px;
}

.tips-content p:last-child {
  margin-bottom: 0;
}

/* 添加纸张纹理效果 */
.tips-panel::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px) 0 0 / 20px 20px,
    linear-gradient(0deg, rgba(255,255,255,0.1) 1px, transparent 1px) 0 0 / 20px 20px;
  pointer-events: none;
  opacity: 0.5;
}

/* 添加阴影效果 */
.tips-panel {
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.1),
    0 1px 3px rgba(0, 0, 0, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

/* 响应式调整 */
@media (max-width: 1400px) {
  .main-content {
    margin-right: 0;
  }
  
  .tips-panel {
    right: 8px;
    top: 80px;
    width: 200px;
  }

  .tips-toggle-btn {
    right: 32px;
    top: 60px;
    width: 28px;
    height: 28px;
  }
}

/* 添加悬停效果 */
.tips-panel:hover {
  transform: rotate(0deg) translateY(-2px);
  box-shadow: 
    0 6px 16px rgba(0, 0, 0, 0.12),
    0 1px 3px rgba(0, 0, 0, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.tips-panel.tips-hidden:hover {
  transform: translateX(120%) rotate(0deg) translateY(-2px);
}

/* 添加路由切换动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
