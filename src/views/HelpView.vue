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
          <div class="section">
            <h1>星历指向计算软件说明</h1>
            <div class="intro">
              <el-alert
                title="功能流程：上传数据 -> 进行计算 -> 查看结果"
                type="info"
                :closable="false"
                show-icon
              />
            </div>
          </div>

          <div class="section">
            <h2>上传数据</h2>
            <el-card class="content-card" shadow="hover">
              <p>上传数据格式：暂时只支持不超过10MB的excel文件类型（.xlsx），excel格式如下所示：</p>
              <el-table :data="tableData" border style="width: 100%" class="format-table">
                <el-table-column v-for="col in columns" :key="col" :prop="col" :label="col" />
              </el-table>
              <div class="tips">
                <el-alert
                  title="注意事项"
                  type="warning"
                  :closable="false"
                  show-icon
                >
                  <template #default>
                    <ul>
                      <li>不用保持表头的内容一致，只需要保证数据与上图列内容顺序一致即可</li>
                      <li>第一行不要有任何数据（默认中第一行是表头不会读取）</li>
                      <li>如果表格中数据不全（比如没有姿态数据），不会跳过而是会直接读入null</li>
                      <li>认为同一时间的卫星只有一组记录，重复写入会覆盖之前的数据</li>
                    </ul>
                  </template>
                </el-alert>
              </div>
              <div class="storage-info">
                <el-alert
                  title="数据持久化存储"
                  type="success"
                  :closable="false"
                  show-icon
                >
                  <template #default>
                    数据持久化存储在本地（<code>C:\Users\[用户名]\AppData\Roaming\ephemeris-pointing-app</code>），关闭程序不会导致数据消失
                  </template>
                </el-alert>
              </div>
            </el-card>
          </div>

          <div class="section">
            <h2>删除数据</h2>
            <el-card class="content-card" shadow="hover">
              <p>在本地持久化存储的数据有三个：</p>
              <el-descriptions :column="1" border>
                <el-descriptions-item label="卫星原始数据">上传的卫星数据</el-descriptions-item>
                <el-descriptions-item label="星历计算结果">计算后的结果数据</el-descriptions-item>
                <el-descriptions-item label="精测矩阵">精测相关数据</el-descriptions-item>
              </el-descriptions>
              <div class="warning-tip">
                <el-alert
                  title="删除操作不可恢复"
                  type="error"
                  :closable="false"
                  show-icon
                >
                  在<code>数据管理下的删除所有数据按钮</code>执行删除操作后，以上三个数据都会删除且不可恢复
                </el-alert>
              </div>
            </el-card>
          </div>

          <div class="section">
            <h2>星历计算</h2>
            <el-tabs type="border-card">
              <el-tab-pane label="单次计算">
                <el-card class="content-card" shadow="hover">
                  <p>通过分别输入星历计算的各项参数（本星星历、姿态 + 对星星历 + 精测结果），可以直接得到结果。</p>
                  <el-alert
                    title="注意：此结果不会持久化存储到本地，仅仅只是一个计算器"
                    type="info"
                    :closable="false"
                    show-icon
                  />
                </el-card>
              </el-tab-pane>
              <el-tab-pane label="批量计算">
                <el-card class="content-card" shadow="hover">
                  <p>批量计算是对之前上传的数据进行的计算，选择具体的时间段，本星名称，对星名称，精测结果，点击开始计算后会执行如下逻辑：</p>
                  <el-steps direction="vertical" :active="2">
                    <el-step title="数据选择" description="选择该时间段所有的本星位置、本星姿态、对星位置" />
                    <el-step title="时间对齐" description="将时间点最近的两组数据进行合并，时间选择本星时间，如果时间点间隔超过1.2秒就放弃对齐" />
                    <el-step title="计算存储" description="将时间对齐的结果+选择的精测结果，进行星历指向计算，并将计算结果持久化存储在本地" />
                  </el-steps>
                  <div class="warning-tip">
                    <el-alert
                      title="数据覆盖提示"
                      type="warning"
                      :closable="false"
                      show-icon
                    >
                      认为同一（时间，本星，对星）这一组合只能存在一个，重复写入会覆盖以前的数据
                    </el-alert>
                  </div>
                </el-card>
              </el-tab-pane>
            </el-tabs>
          </div>

          <div class="section">
            <h2>精测结果管理</h2>
            <el-card class="content-card" shadow="hover">
              <p>星历计算需要地面精测结果，在<code>星历计算 - 批量计算 - 管理精测结果</code>中可以：</p>
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-card shadow="hover" class="feature-card">
                    <template #header>
                      <div class="feature-header">
                        <el-icon><Upload /></el-icon>
                        <span>上传精测结果</span>
                      </div>
                    </template>
                    <p>上传精测结果数据，之后会持久化存储在本地</p>
                  </el-card>
                </el-col>
                <el-col :span="12">
                  <el-card shadow="hover" class="feature-card">
                    <template #header>
                      <div class="feature-header">
                        <el-icon><Delete /></el-icon>
                        <span>删除精测结果</span>
                      </div>
                    </template>
                    <p>删除不需要的精测结果数据</p>
                  </el-card>
                </el-col>
              </el-row>
              <div class="usage-tip">
                <el-alert
                  title="使用说明"
                  type="success"
                  :closable="false"
                  show-icon
                >
                  可以在下拉框中直接选择对应的精测结果
                </el-alert>
              </div>
            </el-card>
          </div>

          <div class="section">
            <h2>查看星历结果</h2>
            <el-card class="content-card" shadow="hover">
              <p>最后的计算结果可以在<code>星历计算 - 批量计算</code>中进行查看：</p>
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-card shadow="hover" class="view-card">
                    <template #header>
                      <div class="view-header">
                        <el-icon><Grid /></el-icon>
                        <span>表格视图</span>
                      </div>
                    </template>
                    <p>以表格形式展示计算结果数据</p>
                  </el-card>
                </el-col>
                <el-col :span="12">
                  <el-card shadow="hover" class="view-card">
                    <template #header>
                      <div class="view-header">
                        <el-icon><TrendCharts /></el-icon>
                        <span>图表视图</span>
                      </div>
                    </template>
                    <p>以图表形式展示计算结果，可以切换参数，横轴为时间</p>
                  </el-card>
                </el-col>
              </el-row>
            </el-card>
          </div>
        </div>
      </el-card>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref } from 'vue'
  import { 
    QuestionFilled, 
    Upload, 
    Delete, 
    Grid, 
    TrendCharts 
  } from '@element-plus/icons-vue'
  
  const columns = [
    '时间',
    '卫星名称',
    '本星位置X',
    '本星位置Y',
    '本星位置Z',
    '本星姿态Q0',
    '本星姿态Q1',
    '本星姿态Q2',
    '本星姿态Q3'
  ]
  
  const tableData = [
    {
      '时间': '示例数据',
      '卫星名称': '示例数据',
      '本星位置X': '示例数据',
      '本星位置Y': '示例数据',
      '本星位置Z': '示例数据',
      '本星姿态Q0': '示例数据',
      '本星姿态Q1': '示例数据',
      '本星姿态Q2': '示例数据',
      '本星姿态Q3': '示例数据'
    }
  ]
  </script>
  
  <style scoped>
  .help-container {
    width: 100%;
    padding: 20px;
    margin: 0;
    background-color: #f5f7fa;
    min-height: calc(100vh - 40px);
    display: flex;
    flex-direction: column;
  }
  
  .help-card {
    max-width: 1200px;
    margin: 0 auto;
    border-radius: 16px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    background: #ffffff;
    transition: all 0.3s ease;
  }
  
  .help-card:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    transform: translateY(-2px);
  }
  
  .help-header {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 20px;
    font-weight: 600;
    color: #409EFF;
    padding: 16px 24px;
    border-bottom: 1px solid #ebeef5;
    background: linear-gradient(to right, #f8f9fa, #ffffff);
  }
  
  .help-header .el-icon {
    font-size: 24px;
    color: #409EFF;
  }
  
  .help-content {
    padding: 32px 40px;
  }
  
  .section {
    margin-bottom: 40px;
  }
  
  .section:last-child {
    margin-bottom: 0;
  }
  
  h1 {
    font-size: 2.2em;
    margin: 0 0 1em;
    padding-bottom: 0.3em;
    border-bottom: 2px solid #eaecef;
    color: #1a1a1a;
    font-weight: 700;
  }
  
  h2 {
    font-size: 1.8em;
    margin: 0 0 0.8em;
    color: #2c3e50;
    font-weight: 600;
  }
  
  .intro {
    margin-bottom: 2em;
  }
  
  .content-card {
    margin-bottom: 1.5em;
    border-radius: 8px;
  }
  
  .content-card:last-child {
    margin-bottom: 0;
  }
  
  .format-table {
    margin: 1.5em 0;
  }
  
  .tips, .warning-tip, .storage-info, .usage-tip {
    margin-top: 1.5em;
  }
  
  code {
    padding: 0.2em 0.4em;
    margin: 0 0.2em;
    font-size: 0.9em;
    background-color: #f0f2f5;
    border-radius: 4px;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
    color: #476582;
    border: 1px solid #e8e8e8;
  }
  
  .feature-card, .view-card {
    height: 100%;
    transition: all 0.3s ease;
  }
  
  .feature-card:hover, .view-card:hover {
    transform: translateY(-2px);
  }
  
  .feature-header, .view-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: #409EFF;
  }
  
  .feature-header .el-icon, .view-header .el-icon {
    font-size: 18px;
  }
  
  :deep(.el-alert) {
    margin: 1em 0;
  }
  
  :deep(.el-alert__title) {
    font-weight: 600;
  }
  
  :deep(.el-descriptions) {
    margin: 1em 0;
  }
  
  :deep(.el-steps) {
    margin: 1.5em 0;
  }
  
  :deep(.el-tabs) {
    margin: 1em 0;
  }
  
  @media (max-width: 1400px) {
    .help-card {
      margin: 0 20px;
    }
    
    .help-content {
      padding: 24px 32px;
    }
  }
  
  @media (max-width: 768px) {
    .help-container {
      padding: 12px;
    }
    
    .help-card {
      margin: 0 12px;
    }
    
    .help-content {
      padding: 20px;
    }
    
    .help-header {
      font-size: 18px;
      padding: 12px 20px;
    }
    
    h1 {
      font-size: 1.8em;
    }
    
    h2 {
      font-size: 1.5em;
    }
    
    .el-row {
      margin: 0 !important;
    }
    
    .el-col {
      padding: 0 !important;
    }
    
    .feature-card, .view-card {
      margin-bottom: 1em;
    }
  }
  </style>