<script setup lang="ts">
defineProps<{
    label: string;
    value: string | number;
    icon: string;
    accent?: string;
}>();
</script>
<template>
    <view class="stat-card" :class="accent"><text class="stat-icon">{{icon}}</text>
        <view><text>{{label}}</text><text>{{value}}</text></view>
    </view>
</template>
<style scoped>
.stat-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 15px 17px;
    background: #242a43;
    border: 1px solid #343b59;
    border-radius: 16px;
    min-width: 0;
}
.stat-icon {
    font-size: 25px;
}
.stat-card text {
    display: block;
    color: #9da7c3;
    font-size: 12px;
}
.stat-card text {
    display: block;
    color: #fff;
    font-size: 21px;
    margin-top: 3px;
}
.stat-card.gold text {
    color: #ffd46b;
}
</style>