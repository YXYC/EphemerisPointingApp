# 星历指向系统 (Ephemeris Pointing App)

基于 Electron + Vue3 + C++ + SQLite3 开发的星历指向桌面应用。

## 技术栈

- Electron 28.0.0
- Vue 3.3.0
- TypeScript 5.0.0
- SQLite3 5.1.7
- Node.js 原生模块 (C++)

## 开发环境要求

- Node.js 18.x 或更高版本
- Python 3.x (用于编译原生模块)
- Visual Studio Build Tools (Windows)
- Git

## 安装步骤

1. 克隆仓库
```bash
git clone [仓库地址]
cd ephemeris-pointing-app
```

2. 安装依赖
```bash
# 使用 npm
npm install

# 或使用 pnpm
pnpm install
```

3. 开发环境运行
```bash
npm run electron:dev
# 或
pnpm electron:dev
```

4. 构建应用
```bash
npm run electron:build
# 或
pnpm electron:build
```

## 项目结构

```
ephemeris-pointing-app/
├── electron/           # Electron 主进程代码
│   ├── main.ts        # 主进程入口
│   └── native/        # C++ 模块
├── src/               # Vue 应用源代码
│   ├── database/      # 数据库相关
│   ├── router/        # 路由配置
│   ├── views/         # 页面组件
│   └── components/    # 通用组件
└── ... 配置文件
```

## 开发指南

1. C++ 模块开发
   - 位于 `electron/native` 目录
   - 使用 node-addon-api 开发
   - 编译命令：`node-gyp rebuild`

2. 数据库操作
   - 使用 SQLite3
   - 数据库文件位于用户数据目录
   - 通过 `src/database` 模块访问

## 许可证

[添加许可证信息] 