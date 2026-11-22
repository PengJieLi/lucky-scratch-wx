<script setup lang="ts">
import { ref } from 'vue'
import MachineView from './MachineView.vue'
import AutomationView from './AutomationView.vue'

const activeTab = ref<'machine' | 'automation'>('machine')
</script>

<template>
  <view class="page">
    <view class="page-heading">
      <view><text class="eyebrow">OPERATIONS CENTER</text><text>经营工厂</text><view>管理验票产线，配置自动化流程，让彩票事业持续运转</view></view>
      <view class="factory-emblem">🏭</view>
    </view>
    <view class="sub-nav">
      <button :class="{ active: activeTab === 'machine' }" @tap="activeTab = 'machine'">⚙️ 验票设备</button>
      <button :class="{ active: activeTab === 'automation' }" @tap="activeTab = 'automation'">🤖 自动化</button>
    </view>
    <MachineView v-if="activeTab === 'machine'" />
    <AutomationView v-else />
  </view>
</template>
