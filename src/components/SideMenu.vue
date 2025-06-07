<template>
  <el-menu
    class="side-menu"
    :default-active="activeMenu"
    @select="$emit('select', $event)"
    background-color="#f5f6fa"
    text-color="#2c3e50"
    active-text-color="#409EFF"
    router
  >
    <el-menu-item index="/browse">
      <el-icon><Document /></el-icon>
      <span>数据管理</span>
    </el-menu-item>
    <el-menu-item index="/ephemeris/single">
      <el-icon><Operation /></el-icon>
      <span>星历计算</span>
    </el-menu-item>
  </el-menu>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { Document, Operation } from '@element-plus/icons-vue'

export default defineComponent({
  name: 'SideMenu',
  components: { Document, Operation },
  props: {
    activeMenu: {
      type: String,
      required: true
    }
  },
  emits: ['select']
})
</script>

<style scoped>
.side-menu {
  width: 200px;
  min-width: 160px;
  height: 100%;
  background: linear-gradient(180deg, #e3f0ff 0%, #f0fdfa 100%);
  box-shadow: 2px 0 16px rgba(64, 158, 255, 0.08);
  border-right: none;
  border-radius: 0 16px 16px 0;
  padding-top: 280px;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  z-index: 1;
}

.side-menu::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%);
  pointer-events: none;
}

.el-menu {
  background: transparent !important;
  border-right: none !important;
  padding: 0 12px;
}

.el-menu-item {
  margin: 8px 0;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  color: #409EFF;
  display: flex;
  align-items: center;
  gap: 12px;
  height: 44px;
  line-height: 44px;
  padding: 0 16px;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  user-select: none;
  transition: all 0.3s ease;
}

.el-menu-item::before {
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

.el-menu-item:hover::before {
  opacity: 1;
}

.el-menu-item:hover {
  background: rgba(64, 158, 255, 0.08) !important;
  color: #337ecc !important;
  transform: translateX(4px);
}

.el-menu-item:active {
  transform: scale(0.98) translateX(4px);
  background: rgba(64, 158, 255, 0.12) !important;
}

.el-menu-item.is-active {
  background: #409eff !important;
  color: #fff !important;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
  transform: translateX(4px);
}

.el-menu-item.is-active::after {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 24px;
  background: #fff;
  border-radius: 0 2px 2px 0;
  box-shadow: 2px 0 8px rgba(255, 255, 255, 0.5);
}

.el-menu-item .el-icon {
  font-size: 18px;
  transition: all 0.3s ease;
}

.el-menu-item:not(.is-active) .el-icon {
  color: #409EFF !important;
  opacity: 0.8;
}

.el-menu-item.is-active .el-icon {
  color: #fff !important;
  transform: scale(1.1);
}

.el-menu-item:hover .el-icon {
  transform: scale(1.1);
}

@media (max-width: 768px) {
  .side-menu {
    width: 160px;
    min-width: 140px;
    padding-top: 40px;
  }
  
  .el-menu {
    padding: 0 8px;
  }
  
  .el-menu-item {
    height: 40px;
    line-height: 40px;
    font-size: 14px;
    padding: 0 12px;
    margin: 6px 0;
  }
  
  .el-menu-item .el-icon {
    font-size: 16px;
  }
}
</style> 