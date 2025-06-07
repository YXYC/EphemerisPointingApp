<template>
    <div class="help-container">
      <el-card class="help-card">
        <template #header>
          <div class="help-header">
            <el-icon><QuestionFilled /></el-icon>
            <span>帮助文档</span>
          </div>
        </template>
        <div class="help-content">
          <el-empty description="帮助文档正在编写中..." />
        </div>
      </el-card>
    </div>
  </template>
  
  <script setup lang="ts">
  import { QuestionFilled } from '@element-plus/icons-vue'
  </script>
  
  <style scoped>
  .help-container {
    width: 100%;
    height: 100%;
    padding: 0;
    margin: 0;
    background-color: #f5f7fa;
    display: flex;
    flex-direction: column;
  }
  
  .help-card {
    max-width: 1200px;
    margin: 20px auto;
    border-radius: 16px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    background: #ffffff;
  }
  
  .help-header {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 18px;
    font-weight: 600;
    color: #409EFF;
  }
  
  .help-header .el-icon {
    font-size: 20px;
  }
  
  .help-content {
    min-height: 400px;
    padding: 40px 0;
  }
  
  @media (max-width: 1400px) {
    .help-card {
      margin: 16px;
    }
  }
  
  @media (max-width: 768px) {
    .help-card {
      margin: 12px;
    }
    
    .help-content {
      padding: 20px 0;
    }
  }
  </style>