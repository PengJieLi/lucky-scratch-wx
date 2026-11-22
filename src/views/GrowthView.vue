<script setup lang="ts">
import { ref } from 'vue'
import TalentView from './TalentView.vue'
import AchievementView from './AchievementView.vue'

const activeTab = ref<'talent' | 'achievements'>('talent')
</script>

<template>
  <view class="page">
    <view class="page-heading">
      <view><text class="eyebrow">PLAYER DEVELOPMENT</text><text>成长中心</text><view>提升经营天赋，完成挑战，记录每一次成长</view></view>
      <view class="factory-emblem">🌟</view>
    </view>
    <view class="sub-nav">
      <button :class="{ active: activeTab === 'talent' }" @tap="activeTab = 'talent'">✨ 天赋研究</button>
      <button :class="{ active: activeTab === 'achievements' }" @tap="activeTab = 'achievements'">🏆 成就统计</button>
    </view>
    <TalentView v-if="activeTab === 'talent'" />
    <AchievementView v-else />
  </view>
</template>
