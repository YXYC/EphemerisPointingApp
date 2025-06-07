<template>
  <div class="ephemeris-container">
    
      <el-tabs v-model="activeTab" @tab-click="onTabClick" class="ephemeris-tabs">
        <el-tab-pane label="单次计算" name="single" />
        <el-tab-pane label="批量计算" name="batch" />
      </el-tabs>
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const activeTab = ref('single')

// 根据当前路由设置活动标签
const currentPath = router.currentRoute.value.path
if (currentPath.includes('/batch')) {
  activeTab.value = 'batch'
} else if (currentPath.includes('/excel')) {
  activeTab.value = 'excel'
}

// 处理标签页点击
const onTabClick = (tab: any) => {
  const path = `/ephemeris/${tab.props.name}`
  router.push(path)
}
</script>

<style scoped>
.ephemeris-container {
  width: 100%;
  background-color: #f5f7fa;
  display: flex;
  flex-direction: column;
}

.ephemeris-card {
  max-width: 1400px;
  margin: 20px auto;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  padding: 32px 0 0 0;
  background: #ffffff;
  display: flex;
  flex-direction: column;
}

.ephemeris-tabs {
  margin-bottom: 0;
  background: transparent;
  padding: 0 32px;
}
</style>