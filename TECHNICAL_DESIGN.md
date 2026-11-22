# 幸运刮刮乐（Lucky Scratch）技术设计文档

- 文档版本：V1.0
- 对应产品：幸运刮刮乐 PRD V1.0
- 技术栈：Vue 3 + TypeScript + Vite + Pinia + Vue Router + SCSS
- 运行形态：单机 Web，无后端
- 存档：localStorage
- 文档状态：可执行开发基线

## 1. 目标与范围

V1.0 先交付可持续运行的手动游戏闭环：购买彩票 → 手动刮奖 → 生成并保存结果 → 中奖票提交验票 → FIFO 验票 → 自动结算奖金 → 天赋属性作用于后续新刮彩票 → 刷新后恢复游戏。

### 1.1 本版本纳入

- 主游戏页、验票机页、天赋页。
- 四种彩票配置及购票扣款。
- 鼠标/触屏刮奖，刮奖比例达到阈值自动揭晓，并提供直接揭晓兜底。
- 中奖概率、奖金倍率集中计算。
- 中奖结果在刮奖完成时生成并立即持久化。
- 未中奖票直接展示，不进入验票队列。
- 单验票机、一个当前任务、最多 5 个等待任务（等待容量不包含当前任务）。
- FIFO、绝对时间进度、刷新恢复、异常暂停与显式恢复。
- 交易流水、待兑奖金额派生计算、奖金幂等结算。
- 幸运系、财富系天赋展示与价格配置接口。

### 1.2 本版本不纳入

效率系、设备系、自动化系、验票机升级、多台设备、自动购票/自动刮奖/自动提交、离线收益、成就、每日任务、天赋重置、等级经验获取规则、云存档、后端服务。

> PRD 将自动化、离线、成就和设备经营放在后续阶段。本技术实现不提前铺设这些功能的伪页面或空壳交互。

## 2. 已确认产品决策与待确认项

| 项目 | V1.0 决策 | 说明 |
|---|---|---|
| 玩法 | Hybrid | 当前版本先实现手动操作闭环，为未来自动化保留扩展空间 |
| 验票机 | Queue | 单机 FIFO 队列 |
| 天赋 | Free | 自由加点，V1.0 仅幸运、财富两系 |
| 长期目标 | Idle | 长期方向为放置经营；V1.0 不实现离线模拟 |
| 初始天赋点 | 3 | 按产品决策 |
| 初始金币 | 暂按 100 | 历史决策中同时出现过 100 和 0；代码暂用 100，见 `src/config/game.ts` 的 `INITIAL_COINS`，最终应由产品确认 |
| 天赋升级初始价格 | 未确认 | 配置为 `null`，升级入口禁用，不擅自设价 |
| 队列容量 | 5 个等待任务 | 当前正在验票的任务不计入容量；最多 6 张在途票 |
| 结果生成时机 | 刮奖完成时 | 结果持久化，不因刷新重抽 |
| 未中奖票 | 直接展示 | 不提交、不占用验票时间 |
| 天赋生效范围 | 只影响新刮彩票 | 以刮奖完成时的天赋等级生成快照；已经刮开的彩票不追溯变化 |
| 验票异常 | 暂停并保留 | 保留当前失败任务及队列，显式恢复后继续 |
| 系统时间异常 | 仅检测/记录 | V1.0 不承诺防作弊，不擅自引入自动封禁或暂停策略 |
| 等级经验 | 不纳入 V1.0 | 仅保留玩家基础字段，不实现经验获取规则 |

## 3. 技术架构

```text
Vue Views / Components
        │ 用户操作、展示状态
        ▼
Pinia Game Store（唯一应用状态入口）
        │ 调用领域能力、协调持久化
        ▼
Domain
 ├─ Lottery / Probability：购票、刮奖结果
 ├─ Machine：任务提交、FIFO 调度、恢复、结算
 ├─ Economy：金币收支与交易流水
 └─ Talent：天赋属性与升级成本
        │
        ▼
Infrastructure
 ├─ localStorage Save Adapter
 ├─ System Clock（Date.now）
 └─ ID Generator
```

### 3.1 分层约束

1. UI 只负责输入、交互和展示，不生成随机数、不直接发放金币。
2. Store 是 UI 与领域逻辑之间的协调层；业务状态集中在 `GameState`。
3. 领域模块不依赖 Vue 组件。
4. 彩票、天赋、队列容量等数值集中配置。
5. 核心业务规则可脱离 UI 单独测试。
6. V1.0 不引入服务端、数据库或复杂依赖注入框架。

## 4. 目录结构

```text
src/
├── assets/main.scss
├── components/ScratchCard.vue
├── config/game.ts
├── domain/
│   ├── economy.ts
│   ├── machine.ts
│   ├── probability.ts
│   └── talent.ts
├── router/index.ts
├── stores/game.ts
├── types/game.ts
├── utils/
│   ├── id.ts
│   └── storage.ts
├── views/
│   ├── GameView.vue
│   ├── MachineView.vue
│   └── TalentView.vue
├── App.vue
└── main.ts

tests/
├── machine.test.ts
└── probability.test.ts
```

## 5. 核心数据模型

### 5.1 GameState

```ts
interface GameState {
  version: 1;
  coins: number;
  player: { level: number; experience: number; talentPoints: number };
  talents: { luck: number; wealth: number };
  statistics: {
    totalScratched: number;
    totalWon: number;
    totalEarned: number;
    totalSpent: number;
  };
  tickets: Ticket[];
  machine: {
    currentTask: VerifyTask | null;
    queue: VerifyTask[];
    maxQueue: number;
  };
  transactions: Transaction[];
  lastActiveAt: number;
}
```

### 5.2 Ticket

```ts
interface Ticket {
  id: string;
  gameId: string;
  name: string;
  price: number;
  baseWinRate: number;
  basePrize: number;
  prize: number;
  isWinner: boolean | null;
  status: 'purchased' | 'scratching' | 'scratched' | 'queued' | 'verifying' | 'completed';
  createdAt: number;
  scratchedAt?: number;
  submittedAt?: number;
  completedAt?: number;
  talentSnapshot?: {
    luck: number;
    wealth: number;
    winRate: number;
    prizeMultiplier: number;
  };
}
```

`isWinner = null` 表示尚未生成结果；刮奖完成后必须变为 boolean。`prize` 对未中奖票为 0。中奖金额在验票结算前只是待兑奖金额，不计入可用金币。

### 5.3 VerifyTask

```ts
interface VerifyTask {
  id: string;
  ticketId: string;
  reward: number;
  status: 'queued' | 'verifying' | 'failed' | 'completed';
  createdAt: number;
  startedAt?: number;
  duration: number;
  endAt?: number;
  remainingDuration?: number;
  completedAt?: number;
  settled: boolean;
  failedAt?: number;
  failureReason?: string;
}
```

### 5.4 Transaction

```ts
interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  reason: 'ticket_purchase' | 'ticket_reward' | 'talent_upgrade';
  referenceId: string;
  createdAt: number;
}
```

## 6. 配置与数值

配置文件：`src/config/game.ts`。

| 彩票 | 价格 | 基础中奖率 | 基础奖金 |
|---|---:|---:|---:|
| 新手刮刮乐 | 10 | 30% | 25 |
| 黄金大奖 | 100 | 25% | 300 |
| 钻石大奖 | 1000 | 20% | 3500 |
| 幸运777 | 5000 | 15% | 20000 |

其他配置：初始金币暂定 100；初始天赋点 3；最高中奖率 80%；等待队列容量 5；基础验票时长 5000ms。

### 6.1 中奖概率

```ts
finalWinRate = min(baseWinRate + luckLevel * 0.01, 0.8)
isWinner = random() < finalWinRate
```

### 6.2 奖金计算

```ts
finalPrize = floor(basePrize * (1 + wealthLevel * 0.05))
```

采用整数金币，向下取整。向下取整是当前实现约定，后续数值调整集中在领域函数中。

### 6.3 天赋升级价格

PRD 建议：`初始升级价格 × (当前等级 + 1)^2`。初始价格尚未确定，因此 `TALENT_INITIAL_COST` 对两系均为 `null`。当前版本只显示天赋属性和升级不可用原因；确认价格后修改配置即可启用。

## 7. 状态流转

### 7.1 彩票

```text
purchased → scratching → scratched
                         ├─ 未中奖：结束，不提交
                         └─ 中奖：queued → verifying → completed
```

- 不允许重复刮奖。
- 不允许未刮开直接提交。
- 不允许未中奖票进入队列。
- 队列满时，票保持 `scratched`，不创建任务；空位出现后可再次提交。
- 已提交/验票中/已完成彩票不能重复提交。

### 7.2 验票任务

```text
queued → verifying → completed
                 └→ failed →（显式恢复）→ verifying
```

失败任务继续占据 `currentTask`，不会被后续任务越过。`resumeTask(taskId)` 是唯一恢复入口。

## 8. 关键业务流程

### 8.1 购买

1. 根据 `gameId` 查找启用的彩票配置。
2. 校验金币余额。
3. 经济模块扣款并写入支出交易。
4. 创建唯一 Ticket，初始状态 `purchased`。
5. 保存完整游戏快照。

### 8.2 刮奖

1. 仅允许 `purchased` / `scratching` 状态进入刮奖。
2. ScratchCard 处理鼠标/触屏擦除，覆盖层透明比例达到约 42% 时完成；也提供直接揭晓按钮。
3. 完成时读取当前 luck/wealth。
4. 统一概率模块生成结果，统一奖金模块计算金额。
5. 写入 `isWinner`、`prize`、`scratchedAt`、`talentSnapshot`。
6. 更新统计并立即保存。刷新页面不得重新抽取。

### 8.3 提交验票

1. 检查彩票存在、中奖且状态为 `scratched`。
2. 如果机器空闲，任务立即成为 `currentTask`。
3. 如果机器忙碌，检查等待队列容量；未满则追加到队尾。
4. 队列满返回错误，不更改彩票状态、不创建任务。
5. 保存任务与彩票状态。

容量定义：`queue.length <= 5`，不包括 `currentTask`。因此最多同时有 1 个执行任务 + 5 个等待任务。

### 8.4 验票计时与恢复

不通过 interval 每次减一来维护业务时间。任务开始时写入：

```ts
startedAt = now;
endAt = startedAt + duration;
remaining = Math.max(0, endAt - now);
```

定时器只用于检查任务是否到期和刷新 UI。刷新后根据持久化的 `endAt` 计算剩余时间；若任务已到期，则补偿完成结算，再启动 FIFO 下一项。异常任务没有 `endAt`，刷新后仍保持暂停。

### 8.5 幂等结算

结算时至少检查：

- 当前任务存在且属于 `verifying`。
- `settled === false`。
- 关联彩票存在且未完成。
- 不存在 `reason = ticket_reward && referenceId = ticketId` 的既有交易。

随后在同一份内存状态变更中：标记任务 settled/completed、更新彩票 completed、增加金币、更新累计收入、写入奖金交易、清理 currentTask、启动下一任务，最后保存快照。

这是单机 localStorage 下的应用层幂等保护，不等价于数据库事务或断电级 ACID。localStorage 单次 setItem 写入整份 JSON，可降低多字段分步写入导致的不一致风险。

### 8.6 待兑奖金额

不作为独立可变字段存储。由 `isWinner === true && status !== 'completed'` 的彩票 `prize` 汇总得到，避免余额和待兑奖金额出现双份状态。

## 9. 模块接口职责

| 模块 | 主要接口/职责 |
|---|---|
| Game Store | `purchase`、`beginScratch`、`completeScratch`、`submitTicket`、`tick`、`recover`、`resumeTask`、`upgrade` |
| Probability | `calculateWinRate(baseRate, luckLevel)`、`calculatePrize(basePrize, wealthLevel)`、`rollWin(rate)` |
| Economy | `spend`、`earn`、`recordTransaction`，统一金币入口 |
| Machine | `submitWinner`、`startTask`、`tickMachine`、`recoverMachine` |
| Talent | `getTalentCost`、`upgradeTalent` |
| Storage | `loadGame`、`saveGame`，通过固定 key `lucky-scratch-save` 存取版本化快照 |
| ScratchCard | 只处理刮奖层交互，完成时 emit 事件；不生成中奖结果 |

## 10. 持久化

- Key：`lucky-scratch-save`
- 当前版本：`1`
- 保存时机：购买、开始/完成刮奖、提交验票、任务状态变化、异常/恢复、结算、天赋升级、页面离开。
- 恢复时校验版本、金币、彩票数组和机器状态基本结构。
- `lastActiveAt` 记录最后活跃时间；V1.0 仅用于时间异常观测，不计算离线收益。
- 系统时间倒退/大幅跳跃：当前版本不承诺防作弊，不根据时间异常自动增加金币。

## 11. 错误处理

当前实现向 UI 返回可读错误，主要包括：

- 彩票不存在 / 彩票状态不允许。
- 金币不足。
- 仅中奖票可提交。
- 验票队列已满。
- 任务不存在或不处于可恢复状态。
- 天赋点不足。
- 天赋升级价格未配置。
- 存档写入失败。

异常验票不删除任务，不清空队列，不自动无限重试。

## 12. 测试计划

### 单元测试

- 中奖概率基础值、幸运加成、80% 上限。
- 奖金财富倍率与整数取整。
- FIFO 队列顺序。
- 等待队列容量不包含 currentTask。
- 队列满时不改变彩票状态。
- 已结算任务不会重复增加金币。
- 天赋价格为 null 时禁止升级。

### 集成测试/手工验收

1. 金币不足时无法购票。
2. 购票成功扣款并创建唯一票据。
3. 鼠标与触屏刮奖都能完成，直接揭晓兜底可用。
4. 刮开后刷新，中奖结果不变。
5. 未中奖不出现提交入口。
6. 中奖票可以提交并进入验票机。
7. 机器忙碌时最多排入 5 个等待任务；第 6 个等待任务被拒绝且票仍可稍后提交。
8. 当前任务完成后自动启动队首任务。
9. 刷新后恢复正在验票任务和等待队列。
10. 任务到期后刷新，奖金只到账一次。
11. 异常任务暂停后刷新仍保留，显式恢复后继续。
12. 已生成结果的旧票不受天赋变化追溯影响。
13. 存档写入失败时向用户提示。

## 13. 开发与运行

```bash
npm install
npm run dev
npm run test
npm run build
```

建议使用 Node.js 20 LTS 或更高版本。开发环境和构建产物以本机安装依赖后的实际命令结果为准。

## 14. 已知限制与后续决策

1. 初始金币 100/0 冲突仍待产品最终确认；只需调整 `INITIAL_COINS`。
2. 天赋升级价格未确认；保持禁用，确认后填写 `TALENT_INITIAL_COST`。
3. 幸运 Lv5 保底、Lv10 提高概率上限，以及财富 Lv5 暴击、Lv10 额外奖金等特殊效果，PRD未给出可直接执行的数值和触发规则，暂不实现。
4. 刮奖概率和奖金计算属于本地客户端逻辑，非公平抽奖/真钱系统，不具备服务端防篡改能力。
5. localStorage 适合 V1.0 小规模单机存档；历史数据增长后可迁移 IndexedDB。
