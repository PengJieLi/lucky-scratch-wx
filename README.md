# Lucky Scratch 微信小程序版

本项目基于 GitHub Actions 导出的 `lucky-scratch` 源码迁移，使用 **uni-app + Vue 3 + Pinia**，目标平台为微信小程序。

## 环境

- Node.js 18 或 20
- npm 9+
- HBuilderX（可选）或微信开发者工具
- 微信小程序 AppID（预览可先使用游客模式；上传/发布需要自己的正式 AppID）

## 安装依赖

```bash
npm install
```

## 编译微信小程序

```bash
npm run build:mp-weixin
```

编译产物目录：

```text
dist/build/mp-weixin/
```

在微信开发者工具中导入 `dist/build/mp-weixin/`。若要上传或发布，请在 `src/manifest.json` 的 `mp-weixin.appid` 和 `project.config.json` 中配置自己的微信小程序 AppID。

## 本地开发

```bash
npm run dev:mp-weixin
```

开发模式产物位于 `dist/dev/mp-weixin/`，可导入微信开发者工具进行调试。

## 迁移说明

- 将 Vue Router 页面路由改为微信小程序原生页面与 TabBar。
- 保留 Pinia 游戏状态、彩票玩法、验票机、成长、天赋和自动化业务逻辑。
- 将 `localStorage` 存档改为 `uni.setStorageSync / uni.getStorageSync`，存档只保存在当前设备。
- 将浏览器 Canvas Pointer Events 刮奖交互替换为小程序触摸事件；保留刮奖进度、揭晓阈值和奖金结算逻辑。
- 将 DOM 滚动锁定、`window` 生命周期监听改为小程序页面/App 生命周期。
- 移除了单元测试文件，保留运行所需的业务代码。

## 注意事项

1. 这是单机虚拟金币游戏，不接入真实支付、真实彩票或服务端账号体系。
2. 游戏存档保存在本机微信小程序 Storage；清理小程序数据会清除存档。
3. 首次运行请先执行 `npm install`，再执行微信小程序构建命令。
4. 本次交付环境无法访问 npm registry，因此没有在当前环境完成依赖安装和微信小程序编译验证；请在本机安装依赖后编译。如果遇到构建错误，把完整报错发给我即可继续修复。
