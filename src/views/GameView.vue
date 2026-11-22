
<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from "vue";
import { LOTTERIES } from "../config/lottery";
import { useGameStore } from "../stores/game";
import type { PlayType } from "../types/game";
import ScratchArea from "../components/ScratchArea.vue";
import StatCard from "../components/StatCard.vue";

const store = useGameStore();

const selectedLotteryId = ref("starter");
const showPlayPicker = ref(false);
const showScratchModal = ref(false);
const showMoneyModal = ref(false);
const insufficientLotteryId = ref("");

// 固定当前正在展示的彩票 ID
const activeTicketId = ref<string | null>(null);

// 根据 ID 获取彩票，不再依赖 currentTicket 的状态筛选
const ticket = computed(() => {
    if (activeTicketId.value) {
        return (
            store.game.tickets.find(
                (item) => item.id === activeTicketId.value
            ) ?? null
        );
    }

    return store.currentTicket;
});

const config = computed(
    () =>
        LOTTERIES.find((item) => item.id === selectedLotteryId.value) ??
        LOTTERIES[1]
);

const insufficientLottery = computed(
    () =>
        LOTTERIES.find((item) => item.id === insufficientLotteryId.value) ??
        config.value
);

const ticketConfig = computed(() =>
    ticket.value
        ? LOTTERIES.find((item) => item.id === ticket.value!.gameId) ??
          config.value
        : config.value
);

const playTypes: {
    id: PlayType;
    name: string;
    description: string;
    icon: string;
}[] = [
    {
        id: "number-match",
        name: "幸运数字",
        description: "对照中奖号码，匹配即可获得对应奖金",
        icon: "🔢"
    },
    {
        id: "symbol-match",
        name: "幸运图案",
        description: "6 个图案中集齐 3 个相同图案",
        icon: "🍀"
    },
    {
        id: "three-match",
        name: "三个相同",
        description: "刮开 3 个数字，寻找相同数字",
        icon: "🎯"
    },
    {
        id: "line-match",
        name: "连线大奖",
        description: "在 2 行图案中寻找横向连线",
        icon: "〰️"
    },
    {
        id: "number-compare",
        name: "数字比大小",
        description: "比较你的数字和幸运数字",
        icon: "⚖️"
    },
    {
        id: "number-sum",
        name: "数字求和",
        description: "两个数字相加等于目标和",
        icon: "➕"
    },
    {
        id: "direct-prize",
        name: "直接奖金",
        description: "刮开一个区域，直接揭晓奖金",
        icon: "💰"
    },
    {
        id: "coordinate",
        name: "幸运坐标",
        description: "在 3×3 坐标格中寻找大奖",
        icon: "🧭"
    },
    {
        id: "step-walk",
        name: "幸运步数",
        description: "沿着 5 个路径节点抵达终点",
        icon: "👣"
    }
];

// 彩票展示数据
const ticketValues = computed(() => {
    const result = ticket.value?.result;

    if (Array.isArray(result?.values)) {
        return result.values as (string | number)[];
    }

    return ticket.value
        ? [ticket.value.isWinner ? "🍀" : "—", ticket.value.prize, "★"]
        : [];
});

// 每个中奖格对应的奖金
const ticketPrizes = computed(() => {
    const current = ticket.value;

    if (!current || current.playType !== "number-match") {
        return [];
    }

    const result = current.result;

    if (Array.isArray(result.prizes)) {
        return result.prizes as number[];
    }

    const matches = ticketValues.value
        .slice(1)
        .map((value, index) =>
            value === result.target ? index : -1
        )
        .filter((index) => index >= 0);

    const prizes = Array(6).fill(0) as number[];

    if (matches.length) {
        prizes[matches[0]] = current.prize;
    }

    return prizes;
});

const selectedPlayType = computed(
    () => ticket.value?.playType ?? config.value.playType
);

const ticketTarget = computed<string | number | undefined>(() => {
    const target = ticket.value?.result.target;

    return typeof target === "string" || typeof target === "number"
        ? target
        : undefined;
});

// 更新刮奖区域进度
function updateTicketCellProgress(index: number, value: number) {
    const current = ticket.value;

    if (!current) return;

    store.updateCellProgress(current.id, index, value);
}

// 小程序通过原生页面滚动容器管理滚动，不需要锁定 document.body。
function lockPageScroll(_locked: boolean) { /* native scroll container */ }

// 选择彩票
function chooseLottery(id: string) {
    const item = LOTTERIES.find((lottery) => lottery.id === id);

    if (!item) return;

    if (item.price > store.game.coins) {
        insufficientLotteryId.value = id;
        showMoneyModal.value = true;
        return;
    }

    selectedLotteryId.value = id;
    showPlayPicker.value = true;
}

// 购买彩票
function buy(playType: PlayType) {
    if (config.value.price > store.game.coins) {
        insufficientLotteryId.value = selectedLotteryId.value;
        showPlayPicker.value = false;
        showMoneyModal.value = true;
        return;
    }

    store.buyLottery(selectedLotteryId.value, playType);

    showPlayPicker.value = false;

    // 新购买彩票后，固定这张彩票的 ID
    const newTicket = store.game.tickets[0];

    if (newTicket?.gameId === selectedLotteryId.value) {
        activeTicketId.value = newTicket.id;
        showScratchModal.value = true;
    }
}

// 刮奖完成后的处理
function finishScratchIfComplete() {
    const current = ticket.value;

    if (!current || current.status !== "scratched") {
        return;
    }

    if (current.isWinner) {
        // 自动提交验票，但不切换当前展示的彩票
        store.submit(current.id);

        // 只有真正提交成功才显示已提交提示
        if (
            ["queued", "verifying", "completed"].includes(current.status)
        ) {
            store.setNotice(
                `🎉 恭喜中奖 ${current.prize.toLocaleString()} 金币，已自动提交验票！`
            );
        }
    } else {
        // 未中奖：保留弹窗，提示用户
        store.setNotice("很遗憾，这次没有中奖，再试试下一张吧！");
    }
}

// 刮开单个区域
function reveal(index: number) {
    const current = ticket.value;

    if (!current) return;

    store.revealCell(current.id, index);

    finishScratchIfComplete();
}

// 快速刮开全部
function revealAll() {
    const current = ticket.value;

    if (!current) return;

    store.revealAll(current.id);

    finishScratchIfComplete();
}

// 监听 Store 中当前可刮彩票的变化
// 新彩票出现时，更新固定 ID
watch(
    () => store.currentTicket,
    (value) => {
        if (value && ["purchased", "scratching"].includes(value.status)) {
            activeTicketId.value = value.id;
            showScratchModal.value = true;
        }
    },
    { immediate: true }
);

// 弹窗打开时锁定页面滚动
watch(
    () => [
        showPlayPicker.value,
        showMoneyModal.value,
        showScratchModal.value
    ],
    ([play, money, scratch]) => {
        lockPageScroll(Boolean(play || money || scratch));
    },
    { immediate: true }
);

onBeforeUnmount(() => lockPageScroll(false));
</script>

<template>
    <view class="page game-page">
        <!-- 首页头部 -->
        <view class="hero">
            <view>
                <text class="eyebrow">LUCKY SCRATCH · IDLE TYCOON</text>
                <text>今天的好运，<text>由你开启</text></text>
                <view>
                    选择彩票等级和玩法，刮开惊喜，积累财富，打造你的自动化彩票工厂。
                </view>
            </view>

            <view class="hero-stamp">
                🍀
                <text>GOOD / LUCK</text>
            </view>
        </view>

        <!-- 首页统计 -->
        <view class="stats-grid">
            <StatCard
                label="可用金币"
                :value="store.game.coins.toLocaleString()"
                icon="🪙"
                accent="gold"
            />

            <StatCard
                label="待兑奖"
                :value="store.pendingRewards.toLocaleString()"
                icon="🎟️"
            />

            <StatCard
                label="累计中奖"
                :value="store.game.statistics.totalWon"
                icon="🏆"
            />

            <StatCard
                label="玩家等级"
                :value="`Lv.${store.game.player.level}`"
                icon="⭐"
            />
        </view>

        <!-- 彩票等级选择 -->
        <view class="panel lottery-hall">
            <view class="section-head">
                <view>
                    <text class="eyebrow">CHOOSE YOUR LUCK</text>
                    <text>选择彩票等级</text>
                </view>

                <text class="pill">
                    金币 {{ store.game.coins.toLocaleString() }}
                </text>
            </view>

            <view class="lottery-picker lottery-picker-grid">
                <button
                    v-for="item in store.unlockedLotteries"
                    :key="item.id"
                    :class="[
                        { active: selectedLotteryId === item.id },
                        { unaffordable: item.price > store.game.coins }
                    ]"
                    @tap="chooseLottery(item.id)"
                >
                    <text class="lottery-icon">
                        {{
                            item.id === "free"
                                ? "🎫"
                                : item.id === "gold"
                                  ? "🥇"
                                  : item.id === "diamond"
                                    ? "💎"
                                    : item.id === "lucky777"
                                      ? "🎰"
                                      : "🎟️"
                        }}
                    </text>

                    <text>{{ item.name }}</text>

                    <text>
                        {{
                            item.price === 0
                                ? "免费"
                                : `${item.price.toLocaleString()} 金币`
                        }}
                    </text>

                    <text>
                        中奖概率
                        {{
                            Math.round(
                                Math.min(
                                    0.8,
                                    item.baseWinRate +
                                        store.game.talents.luck * 0.01
                                ) * 100
                            )
                        }}%
                    </text>

                    <text>
                        基础奖金 {{ item.basePrize.toLocaleString() }}
                    </text>

                    <text v-if="item.price > store.game.coins">
                        金币不足
                    </text>
                    <text v-else>选择玩法 →</text>
                </button>
            </view>
        </view>

        <!-- 验票中心和成长进度 -->
        <view class="game-lower-grid">
            <view class="side-column">
                <view class="panel machine-mini">
                    <view class="section-head">
                        <view>
                            <text class="eyebrow">VERIFY MACHINE</text>
                            <text>验票中心</text>
                        </view>

                        <text class="machine-icon">⚙️</text>
                    </view>

                    <view class="machine-visual">
                        <view class="machine-light" />
                        <view class="machine-slot">🎟️</view>

                        <text>
                            {{
                                store.game.machine.currentTask
                                    ? "正在验票"
                                    : "设备空闲"
                            }}
                        </text>

                        <text>
                            Lv.{{ store.game.machine.level }} · 队列
                            {{ store.game.machine.queue.length }}/{{
                                store.game.machine.maxQueue
                            }}
                        </text>
                    </view>

                    <view class="machine-footer">
                        <text>
                            待兑奖
                            <text>{{ store.pendingRewards.toLocaleString() }}</text>
                        </text>

                        <text>
                            等待任务
                            <text>{{ store.game.machine.queue.length }}</text>
                        </text>
                    </view>
                </view>

                <view class="panel growth-card">
                    <text class="eyebrow">PLAYER GROWTH</text>
                    <text>成长进度</text>

                    <view class="level-row">
                        <text>Lv.{{ store.game.player.level }}</text>

                        <text>
                            {{ store.game.player.experience }} /
                            {{ store.game.player.level * 100 }} EXP
                        </text>
                    </view>

                    <view class="progress-line">
                        <text
                            :style="{
                                width: `${Math.min(
                                    100,
                                    (store.game.player.experience /
                                        (store.game.player.level * 100)) *
                                        100
                                )}%`
                            }"
                        />
                    </view>

                    <view class="growth-bottom">
                        <text>可用天赋点</text>
                        <text>✨ {{ store.game.player.talentPoints }}</text>
                    </view>
                </view>
            </view>
        </view>

        <!-- 最近的彩票 -->
        <view class="panel recent-panel">
            <view class="section-head">
                <view>
                    <text class="eyebrow">YOUR COLLECTION</text>
                    <text>最近的彩票</text>
                </view>

                <text class="muted">
                    共 {{ store.game.tickets.length }} 张
                </text>
            </view>

            <view v-if="!store.game.tickets.length" class="empty">
                🎟️ 还没有彩票，选择等级和玩法，开启你的第一张幸运刮刮卡吧！
            </view>

            <view v-else class="ticket-list">
                <view
                    v-for="t in store.game.tickets.slice(0, 5)"
                    :key="t.id"
                    class="ticket-row"
                >
                    <text class="ticket-emoji">
                        {{ t.isWinner ? "🏆" : "🎫" }}
                    </text>

                    <view>
                        <text>{{ t.gameName }}</text>
                        <text>
                            {{ new Date(t.createdAt).toLocaleString() }}
                        </text>
                    </view>

                    <text class="status" :class="t.status">
                        {{
                            (
                                {
                                    purchased: "待刮奖",
                                    scratching: "刮奖中",
                                    scratched: t.isWinner ? "待验票" : "未中奖",
                                    queued: "排队中",
                                    verifying: "验票中",
                                    completed: "已完成"
                                } as Record<string, string>
                            )[t.status]
                        }}
                    </text>

                    <text v-if="t.isWinner" class="reward">
                        +{{ t.prize.toLocaleString() }}
                    </text>
                </view>
            </view>
        </view>
    </view>

    <!-- 玩法选择弹窗 -->
    <view
        v-if="showPlayPicker"
        class="modal-backdrop game-modal-backdrop"
        @tap.self="showPlayPicker = false"
    >
        <view class="panel game-dialog play-picker-dialog">
            <button
                class="modal-close"
                @tap="showPlayPicker = false"
            >
                ×
            </button>

            <text class="eyebrow">SELECT GAME MODE</text>

            <text>选择 {{ config.name }} 的玩法</text>

            <view class="dialog-description">
                选择一种玩法，系统会在购票时固定生成开奖结果。
            </view>

            <view class="play-picker-grid">
                <button
                    v-for="play in playTypes"
                    :key="play.id"
                    @tap="buy(play.id)"
                >
                    <text>{{ play.icon }}</text>

                    <view>
                        <text>{{ play.name }}</text>
                        <text>{{ play.description }}</text>
                    </view>

                    <text>›</text>
                </button>
            </view>

            <view class="dialog-footer">
                <text>
                    票价
                    <text>
                        {{
                            config.price === 0
                                ? "免费"
                                : `${config.price.toLocaleString()} 金币`
                        }}
                    </text>
                </text>

                <text>购买后立即打开刮奖窗口</text>
            </view>
        </view>
    </view>

    <!-- 金币不足弹窗 -->
    <view
        v-if="showMoneyModal"
        class="modal-backdrop game-modal-backdrop"
        @tap.self="showMoneyModal = false"
    >
        <view class="panel game-dialog money-dialog">
            <button
                class="modal-close"
                @tap="showMoneyModal = false"
            >
                ×
            </button>

            <view class="money-icon">🪙</view>

            <text>金币不足</text>

            <view>
                购买「{{ insufficientLottery.name }}」需要
                <text>
                    {{ insufficientLottery.price.toLocaleString() }}
                </text>
                金币，你目前只有
                <text>{{ store.game.coins.toLocaleString() }}</text>
                金币。
            </view>

            <button
                class="btn primary full"
                @tap="showMoneyModal = false"
            >
                我知道了
            </button>
        </view>
    </view>

    <!-- 刮奖弹窗 -->
    <view
        v-if="showScratchModal && ticket"
        class="modal-backdrop game-modal-backdrop scratch-modal-backdrop"
        @tap.self="showScratchModal = false"
    >
        <view class="panel game-dialog scratch-dialog">
            <view
                class="ticket-art scratch-ticket-modal"
                :class="ticketConfig.theme"
                style="
                    -webkit-user-select: none;
                    user-select: none;
                    -webkit-touch-callout: none;
                "
                @selectstart.prevent
                @dragstart.prevent
            >
                <ScratchArea
                    :play-type="selectedPlayType"
                    :values="ticketValues"
                    :revealed-cells="ticket.revealedCells"
                    :cell-progress="ticket.cellProgress"
                    :prizes="ticketPrizes"
                    :target="ticketTarget"
                    @progress="updateTicketCellProgress"
                    @reveal="reveal"
                />
            </view>
        </view>
    </view>
</template>
