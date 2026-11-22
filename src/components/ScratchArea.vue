<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { PlayType } from "../types/game";
import { PLAY_LAYOUT } from "../utils/playLayout";
const props = defineProps<{ values: (string | number)[]; revealedCells: number[]; cellProgress: number[]; playType: PlayType; prizes?: number[]; target?: string | number }>();
const emit = defineEmits<{ reveal: [index: number]; progress: [index: number, value: number] }>();
const layout = () => PLAY_LAYOUT[props.playType];
const heading: Record<PlayType, string> = { "number-match": "MATCH YOUR NUMBERS", "symbol-match": "FIND THE SYMBOLS", "three-match": "TRIPLE MATCH", "line-match": "LUCKY LINE", "number-compare": "HIGHER NUMBER WINS", "number-sum": "SUM CHALLENGE", "direct-prize": "INSTANT PRIZE", coordinate: "LUCKY COORDINATE", "step-walk": "LUCKY PATH" };
const isNumberMatch = () => props.playType === "number-match";
const progress = () => { const values = isNumberMatch() ? props.cellProgress.slice(1) : props.cellProgress; return values.length ? Math.max(...values) : 0; };
const matchedIndices = () => props.values.slice(1).map((value, index) => value === props.target ? index : -1).filter(index => index >= 0);
const matchedPrize = () => matchedIndices().reduce((sum, index) => sum + (props.prizes?.[index] ?? 0), 0);
const scratchStartIndex = () => isNumberMatch() ? 1 : 0;
const allRevealed = () => props.values.slice(scratchStartIndex()).every((_, offset) => props.revealedCells.includes(offset + scratchStartIndex()));
const scratchRatio = ref(progress());
const lastPoint = ref<{x:number;y:number}|null>(null);
const drawing = ref(false);
const coatingStyle = computed(() => ({ opacity: allRevealed() ? 0 : Math.max(0, 1 - scratchRatio.value * 1.7), pointerEvents: allRevealed() ? 'none' : 'auto' }));
function startScratch(event: any) { if (allRevealed()) return; const p = event.touches?.[0]; if (!p) return; drawing.value = true; lastPoint.value = { x: p.clientX ?? p.pageX ?? 0, y: p.clientY ?? p.pageY ?? 0 }; }
function moveScratch(event: any) { if (!drawing.value || allRevealed()) return; const p = event.touches?.[0]; if (!p) return; const point = { x: p.clientX ?? p.pageX ?? 0, y: p.clientY ?? p.pageY ?? 0 }; if (lastPoint.value) { const dx = point.x-lastPoint.value.x, dy = point.y-lastPoint.value.y; scratchRatio.value = Math.min(1, scratchRatio.value + Math.sqrt(dx*dx+dy*dy)/1800); } lastPoint.value = point; }
function endScratch() { if (!drawing.value) return; drawing.value = false; lastPoint.value = null; const ratio = Math.min(1, scratchRatio.value); for (let i=scratchStartIndex(); i<props.values.length; i++) emit('progress', i, ratio); if (ratio >= 0.42) for (let i=scratchStartIndex(); i<props.values.length; i++) emit('reveal', i); }
watch(() => [props.playType, props.values.join(','), props.revealedCells.join(','), props.cellProgress.join(',')], () => { scratchRatio.value = progress(); });
</script>

<template>
    <view class="play-board" :class="`play-${playType}`">
        <view class="play-heading"><text>{{ heading[playType] }}</text><text>{{ isNumberMatch()?'6 个号码待刮开':`${values.length} 个内容区域 · 整张彩票共用一层涂层` }}</text></view>
        <view v-if="isNumberMatch()" class="scratch-area number-match-area">
            <view class="lucky-number-section">
                <view class="number-section-title"><text>★ 中奖号码 ★</text><text>LUCKY NUMBER</text></view>
                <view class="lucky-number-card number-revealed"><text>{{ values[0] }}</text><text>无需刮开 · 对照下方号码</text></view>
            </view>
            <view class="my-numbers-section">
                <view class="number-section-title"><text>我的号码</text><text>MY NUMBERS · MATCH & WIN</text></view>
                <view class="my-number-scratch-area">
                    <view class="my-number-grid">
                        <view v-for="(value,index) in values.slice(1)" :key="index" class="my-number-card" :class="{'number-revealed':revealedCells.includes(index+1),'number-match-win':revealedCells.includes(index+1)&&value===target}"><text class="number-index">号码 {{ index+1 }}</text><text>{{ value }}</text><text class="number-prize">{{ (prizes?.[index]??0).toLocaleString() }} 金币</text><text
                                v-if="revealedCells.includes(index+1)&&value===target" class="match-ribbon">🎉 中奖</text></view>
                    </view><view class="scratch-coating" :style="coatingStyle" @touchstart.stop.prevent="startScratch" @touchmove.stop.prevent="moveScratch" @touchend.stop="endScratch" @touchcancel.stop="endScratch"><text>SCRATCH TO REVEAL</text><text>滑动刮开涂层</text></view>
                </view>
            </view>
            <view v-if="allRevealed()" class="number-match-result">
                <view class="number-match-summary">
                    <view><text>开奖结果</text><text>{{ matchedIndices().length?`${matchedIndices().length} 个号码匹配`:'未中奖 · 谢谢参与' }}</text></view>
                    <view><text>本票累计奖金</text><text>{{ matchedPrize().toLocaleString() }} 金币</text></view>
                </view>
                <view v-if="matchedIndices().length" class="number-match-details">
                    <view v-for="index in matchedIndices()" :key="index">号码 {{ index+1 }} 匹配，中奖 {{ (prizes?.[index]??0).toLocaleString() }} 金币</view>
                </view>
            </view>
        </view>
        <template v-else>
            <view class="play-labels" :style="{gridTemplateColumns:`repeat(${layout().columns},minmax(0,1fr))`}"><text v-for="(label,index) in layout().labels" :key="index">{{ label }}</text></view>
            <view class="scratch-area" :style="{gridTemplateColumns:`repeat(${layout().columns},minmax(0,1fr))`,gridTemplateRows:`repeat(${layout().rows},minmax(0,1fr))`}">
                <view v-for="(value,index) in values" :key="index" class="scratch-value" :class="[`cell-${index}`,{revealed:revealedCells.includes(index)}]"><text>{{ value }}</text></view><view class="scratch-coating" :style="coatingStyle" @touchstart.stop.prevent="startScratch" @touchmove.stop.prevent="moveScratch" @touchend.stop="endScratch" @touchcancel.stop="endScratch"><text>SCRATCH TO REVEAL</text><text>滑动刮开涂层</text></view>
            </view>
        </template>
        <view class="scratch-hint">{{ isNumberMatch()?'滑动刮开下方「我的号码」，上方中奖号码无需刮开':'用鼠标或手指在彩票表面滑动，刮开同一整层银色涂层' }}</view>
    </view>
</template>
<style scoped>
.play-board {
    padding: 14px;
    border-radius: 14px;
    background: #17243b;
    border: 1px solid #ffffff30;
}
.play-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    color: #ffdf91;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 1.2px;
    margin-bottom: 10px;
}
.play-heading text {
    color: #d5d9e8;
    font-size: 9px;
    letter-spacing: 0;
    text-align: right;
}
.scratch-area {
    position: relative;
    display: grid;
    gap: 7px;
    min-height: 82px;
    isolation: isolate;
}
.scratch-value {
    display: grid;
    place-items: center;
    min-width: 0;
    min-height: 72px;
    border-radius: 11px;
    background: linear-gradient(145deg, #fff8df, #f9e8b4);
    border: 1px solid #f1d88b;
    overflow: hidden;
}
.scratch-value text {
    font-size: clamp(17px, 3.5vw, 30px);
    font-weight: 900;
    color: #9c5b13;
    overflow-wrap: anywhere;
}
.scratch-value.revealed {
    box-shadow: inset 0 0 0 2px #e6b84e;
}
.scratch-area .scratch-coating {
    position: absolute;
    inset: 0;
    z-index: 2;
    width: 100%;
    height: 100%;
    touch-action: none;
    border-radius: 11px;
}
.play-symbol-match .scratch-value,
.play-line-match .scratch-value {
    background: linear-gradient(145deg, #fff4d5, #e8d2a0);
    border-radius: 50%;
}
.play-coordinate .scratch-value {
    background: linear-gradient(145deg, #d9f2e4, #a4d8bd);
    border-radius: 8px;
}
.play-step-walk .scratch-value {
    background: linear-gradient(145deg, #f0e2ff, #c8b2e8);
}
.play-direct-prize .scratch-value {
    background: linear-gradient(145deg, #fff0b8, #e9c35e);
    border: 2px solid #e7b84f;
}
.play-number-compare .scratch-value:nth-child(2),
.play-number-sum .scratch-value:nth-child(2) {
    background: linear-gradient(145deg, #d8e9ff, #a8c8ed);
}
.scratch-hint {
    margin: 9px 0 0;
    text-align: center;
    color: #aab5cf;
    font-size: 10px;
}
.number-match-area {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 12px;
    border-radius: 12px;
    background: linear-gradient(160deg, #203654, #13243c);
    min-height: 0;
}
.number-section-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
    color: #ffe3a0;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.5px;
}
.number-section-title text {
    font-size: 9px;
    letter-spacing: 1px;
    color: #b9c9df;
}
.lucky-number-section {
    padding: 12px;
    border: 1px solid #f2c86c80;
    border-radius: 12px;
    background: linear-gradient(135deg, #5d4520, #302b25);
    text-align: center;
}
.lucky-number-card {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    min-height: 78px;
    border: 2px dashed #e8c46f;
    border-radius: 10px;
    background: radial-gradient(
        circle at 50% 20%,
        #fff3bd,
        #e7b84f 75%,
        #b77a22
    );
    color: #70400d;
}
.lucky-number-card text {
    font-size: clamp(34px, 8vw, 48px);
    font-weight: 1000;
    text-shadow: 0 2px #fff8;
}
.lucky-number-card text {
    font-size: 10px;
    font-weight: 800;
    color: #754b17;
}
.my-numbers-section {
    padding: 2px 0;
}
.my-number-scratch-area {
    position: relative;
    isolation: isolate;
    border-radius: 10px;
    overflow: hidden;
}
.my-number-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
}
.my-number-scratch-area .scratch-coating {
    position: absolute;
    inset: 0;
    z-index: 2;
    width: 100%;
    height: 100%;
    touch-action: none;
    border-radius: 10px;
}
.my-number-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    min-width: 0;
    min-height: 98px;
    padding: 8px 4px;
    border: 1px solid #c4d4e7;
    border-radius: 10px;
    background: linear-gradient(145deg, #f5f8ff, #dbe7f5);
    color: #263b59;
    overflow: hidden;
}
.number-index {
    font-size: 9px;
    color: #60748f;
    font-weight: 700;
}
.my-number-card > text {
    font-size: clamp(23px, 5vw, 30px);
    line-height: 1.1;
    color: #173e70;
    font-weight: 1000;
}
.number-prize {
    font-size: 10px;
    color: #9a641c;
    font-weight: 900;
}
.my-number-card.number-match-win {
    border: 2px solid #f6c64e;
    background: linear-gradient(145deg, #fff4bd, #f6d46e);
    box-shadow: 0 0 0 2px #f5c54a33, inset 0 0 14px #fff8;
}
.my-number-card.number-match-win > text {
    color: #8c4a08;
}
.match-ribbon {
    position: absolute;
    right: 0;
    top: 0;
    padding: 3px 6px;
    border-bottom-left-radius: 8px;
    background: #c64b26;
    color: white;
    font-size: 9px;
}
.number-match-summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 9px;
    background: #0e1a2b;
    color: #dce8f8;
    font-size: 11px;
}
.number-match-summary div {
    display: grid;
    gap: 3px;
}
.number-match-summary text {
    color: #aabbd3;
}
.number-match-summary text {
    color: #ffd36b;
    font-size: 15px;
}
.number-match-details {
    margin: 7px 0 0;
    padding: 8px 10px 8px 25px;
    border-radius: 8px;
    background: #fff8e5;
    color: #85521b;
    font-size: 10px;
    line-height: 1.7;
}
.number-match-details li::marker {
    color: #d99b2c;
}
@media (max-width: 420px) {
    .number-match-area {
        padding: 8px;
        gap: 9px;
    }
    .my-number-grid {
        gap: 5px;
    }
    .my-number-card {
        min-height: 88px;
    }
}

.scratch-coating { position:absolute; inset:0; z-index:5; border-radius:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8rpx; color:#56647b; font-size:25rpx; font-weight:900; background:repeating-linear-gradient(135deg,#c5ccd9 0,#f7f8fb 12rpx,#aeb8c9 24rpx,#eef0f5 36rpx); transition:opacity .12s linear; touch-action:none; }
.scratch-coating text:last-child { font-size:19rpx; font-weight:500; }

</style>
