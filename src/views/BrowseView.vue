<template>
  <div class="browse-container">
    <el-card class="browse-card">
      <div class="upload-bar">
        <el-select v-model="fileType" placeholder="选择文件类型" class="file-type-select">
          <el-option label="Excel 文件" value="excel" />
          <el-option label="CSV 文件" value="csv" />
          <el-option label="TXT 文件" value="txt" />
        </el-select>
        <el-upload
          class="upload-btn"
          action="#"
          :show-file-list="false"
          :auto-upload="false"
          :on-change="handleFileChange"
          :disabled="uploading"
        >
          <el-button 
            type="primary" 
            plain 
            icon="UploadFilled" 
            class="file-btn"
            :loading="uploading"
          >
            {{ uploading ? '上传中...' : '选择并上传文件' }}
          </el-button>
        </el-upload>
        <el-button 
          type="danger" 
          plain 
          icon="Delete" 
          class="delete-btn"
          @click="handleDeleteClick"
        >
          删除所有数据
        </el-button>
      </div>
      <div class="filter-bar">
        <div class="filter-item date-picker-item">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 360px;"
            @change="handleDateChange"
            clearable
          />
        </div>
        <div class="filter-item">
          <el-select
            v-model="selectedSatellite"
            placeholder="全部卫星"
            clearable
            @change="handleSatelliteChange"
            style="width: 200px;"
          >
            <el-option
              label="全部卫星"
              value=""
            />
            <el-option
              v-for="sat in satelliteList"
              :key="sat"
              :label="sat"
              :value="sat"
            />
          </el-select>
        </div>
      </div>
      <div class="table-area">
        <div class="table-container">
          <el-table
            :data="tableData"
            stripe
            border
            size="small"
            header-cell-class-name="table-header"
            empty-text="暂无数据"
            highlight-current-row
            style="width: 100%"
            max-height="500"
          >
            <el-table-column prop="time" label="星历时间" :formatter="formatTime" align="center" min-width="140"/>
            <el-table-column prop="satellite" label="卫星名称" align="center" min-width="110"/>
            <el-table-column prop="pos_x" label="本星位置X" align="center" min-width="110"/>
            <el-table-column prop="pos_y" label="本星位置Y" align="center" min-width="110"/>
            <el-table-column prop="pos_z" label="本星位置Z" align="center" min-width="110"/>
            <el-table-column prop="q0" label="本星姿态Q0" align="center" min-width="110"/>
            <el-table-column prop="q1" label="本星姿态Q1" align="center" min-width="110"/>
            <el-table-column prop="q2" label="本星姿态Q2" align="center" min-width="110"/>
            <el-table-column prop="q3" label="本星姿态Q3" align="center" min-width="110"/>
          </el-table>
        </div>
        <div class="pagination-bar">
          <el-pagination
            background
            layout="prev, pager, next, jumper, ->, total"
            :total="total"
            :page-size="pageSize"
            :current-page="page"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </el-card>

    <!-- 删除确认对话框 -->
    <el-dialog
      v-model="showDeleteDialog"
      title="删除确认"
      width="400px"
      :close-on-click-modal="false"
    >
      <div class="delete-dialog-content">
        <el-icon class="warning-icon" color="#E6A23C"><Warning /></el-icon>
        <p>此操作将删除所有卫星数据，且不可恢复！</p>
        <p>是否确认删除？</p>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showDeleteDialog = false">取消</el-button>
          <el-button type="danger" @click="handleDeleteConfirm" :loading="deleting">
            确认删除
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Warning } from '@element-plus/icons-vue'

// 状态定义
const fileType = ref('excel')
const uploading = ref(false)
const dateRange = ref<[string, string] | null>(null)
const selectedSatellite = ref('')
const satelliteList = ref<string[]>([])
const tableData = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const showDeleteDialog = ref(false)
const deleting = ref(false)

// 处理文件上传
const handleFileChange = (file: any) => {
  if (!file) return
  uploading.value = true
  // TODO: 实现文件上传逻辑
  setTimeout(() => {
    uploading.value = false
    ElMessage.success('文件上传成功')
  }, 1000)
}

// 处理日期变化
const handleDateChange = () => {
  // TODO: 实现日期筛选逻辑
  console.log('日期范围变化:', dateRange.value)
}

// 处理卫星选择变化
const handleSatelliteChange = () => {
  // TODO: 实现卫星筛选逻辑
  console.log('选择的卫星:', selectedSatellite.value)
}

// 处理页码变化
const handlePageChange = (newPage: number) => {
  page.value = newPage
  // TODO: 实现分页加载逻辑
}

// 处理删除点击
const handleDeleteClick = () => {
  showDeleteDialog.value = true
}

// 处理删除确认
const handleDeleteConfirm = async () => {
  deleting.value = true
  try {
    // TODO: 实现删除逻辑
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('数据删除成功')
    showDeleteDialog.value = false
  } catch (error) {
    ElMessage.error('删除失败')
  } finally {
    deleting.value = false
  }
}

// 格式化时间
const formatTime = (row: any, column: any) => {
  return row.time || '-'
}
</script>

<style scoped>
.browse-container {
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
  background-color: #f5f7fa;
  display: flex;
  flex-direction: column;
}

.browse-card {
  max-width: 1400px;
  margin: 20px auto;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  padding: 32px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 80px);
  flex: 1;
}

.upload-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 28px;
  padding: 0 16px;
  background: #f8fafc;
  border-radius: 12px;
  padding: 16px 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.file-type-select {
  width: 180px;
}

.file-btn {
  font-weight: 500;
  letter-spacing: 1px;
  padding: 0 24px;
  height: 40px;
  border-radius: 8px;
  font-size: 15px;
  transition: all 0.3s ease;
}

.file-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}

.delete-btn {
  margin-left: auto;
  font-weight: 500;
  letter-spacing: 1px;
  padding: 0 24px;
  height: 40px;
  border-radius: 8px;
  font-size: 15px;
  transition: all 0.3s ease;
}

.delete-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 108, 108, 0.15);
}

.filter-bar {
  flex-shrink: 0;
  display: flex;
  gap: 20px;
  margin-bottom: 28px;
  padding: 0 16px;
  align-items: center;
  flex-wrap: nowrap;
  background: #f8fafc;
  border-radius: 12px;
  padding: 16px 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.table-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin-top: 16px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.table-container {
  max-height: 500px;
  overflow: auto;
}

/* 确保表格容器可以滚动 */
.table-container :deep(.el-table__body-wrapper) {
  overflow: auto !important;
}

/* 确保表格头部固定 */
.table-container :deep(.el-table__header-wrapper) {
  position: sticky;
  top: 0;
  z-index: 2;
}

/* 调整表格样式 */
.el-table {
  width: 100% !important;
  --el-table-border-color: #e4e7ed;
  --el-table-header-bg-color: #f5f7fa;
  border-radius: 8px;
  font-size: 14px;
}

.el-table :deep(th) {
  background-color: #f0f7ff !important;
  font-weight: 600;
  color: #409EFF !important;
  font-size: 15px;
  height: 50px;
  padding: 8px 0;
}

.el-table :deep(td) {
  padding: 12px 0;
  height: 48px;
}

.pagination-bar {
  flex-shrink: 0;
  background: #fff;
  padding: 16px;
  text-align: center;
  border-top: 1px solid #f0f0f0;
  position: relative;
  z-index: 1;
}

/* 自定义滚动条样式 */
.table-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.table-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.table-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.table-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.filter-item {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.date-picker-item {
  min-width: 360px;
}

.filter-item .el-date-editor {
  border-radius: 8px;
  border: 1px solid #dcdfe6;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
  transition: all 0.3s ease;
  width: 360px !important;
}

.filter-item .el-select {
  border-radius: 8px;
  flex-shrink: 0;
}

.filter-item .el-select :deep(.el-input__wrapper) {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
}

.table-header {
  background: #ecf5ff !important;
  font-weight: 600;
  color: #409EFF !important;
  font-size: 15px;
  letter-spacing: 0.5px;
}

.el-table__row {
  transition: background-color 0.2s ease;
}

.el-table__row:hover {
  background: #f4f9ff !important;
}

.el-table__cell {
  font-size: 14px;
  padding: 12px 8px;
}

@media (max-width: 1400px) {
  .browse-card {
    margin: 16px;
    height: calc(100vh - 72px);
  }
}

@media (max-width: 768px) {
  .browse-card {
    margin: 12px;
    padding: 20px;
    height: calc(100vh - 64px);
  }
  
  .table-area {
    margin-top: 12px;
  }
  
  .pagination-bar {
    padding: 12px;
  }
}

@media (max-width: 700px) {
  .table-header {
    font-size: 13px;
  }
  .el-table__cell {
    font-size: 13px;
    padding: 10px 4px;
  }
}

.delete-dialog-content {
  text-align: center;
  padding: 20px 0;
}

.warning-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.delete-dialog-content p {
  margin: 8px 0;
  color: #606266;
}

.delete-dialog-content p:first-of-type {
  color: #E6A23C;
  font-weight: bold;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 删除进度对话框相关样式 */
.progress-dialog-content,
.progress-text {
  display: none;
}
</style>
  