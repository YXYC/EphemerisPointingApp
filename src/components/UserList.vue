<template>
  <div class="user-list">
    <h2>用户列表</h2>
    
    <!-- 加载状态 -->
    <div v-if="loading" class="loading">
      <p>正在加载用户数据...</p>
      <div class="loading-spinner"></div>
    </div>
    
    <!-- 错误信息 -->
    <div v-else-if="error" class="error">
      <p>加载失败: {{ error }}</p>
      <button @click="loadUsers" class="retry-button">重试</button>
    </div>
    
    <!-- 用户列表 -->
    <div v-else-if="users.length > 0" class="user-table-container">
      <table class="user-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>姓名</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.id }}</td>
            <td>{{ user.name }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- 空数据状态 -->
    <div v-else class="empty-state">
      <p>暂无用户数据</p>
    </div>
  </div>
</template>

<script setup lang="ts">

</script>

<style scoped>
.user-list {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.loading {
  text-align: center;
  padding: 20px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  margin: 20px auto;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  text-align: center;
  padding: 20px;
  color: #e74c3c;
}

.retry-button {
  margin-top: 10px;
  padding: 8px 16px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.retry-button:hover {
  background-color: #2980b9;
}

.user-table-container {
  overflow-x: auto;
  margin-top: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.user-table {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
}

.user-table th,
.user-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.user-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #2c3e50;
}

.user-table tr:hover {
  background-color: #f8f9fa;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #7f8c8d;
  background-color: #f8f9fa;
  border-radius: 8px;
  margin-top: 20px;
}
</style> 