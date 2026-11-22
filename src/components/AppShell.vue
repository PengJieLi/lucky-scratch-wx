
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useGameStore } from '../stores/game'

const props = defineProps<{ active: 'home' | 'factory' | 'growth' }>()
const store = useGameStore()
const profileOpen = ref(false)

// 微信小程序顶部安全区域高度，单位为 px
const headerTop = ref(60)

onMounted(() => {
  try {
    const systemInfo = uni.getSystemInfoSync()
    const statusBarHeight = systemInfo.statusBarHeight || 24

    // 获取右上角胶囊按钮位置
    const menuButton = uni.getMenuButtonBoundingClientRect?.()

    if (menuButton && menuButton.bottom > 0) {
      // 将整个自定义头部放到胶囊按钮下方
      headerTop.value = menuButton.bottom + 12
    } else {
      // 兼容无法获取胶囊按钮信息的环境
      headerTop.value = statusBarHeight + 44 + 12
    }
  } catch (error) {
    headerTop.value = 80
  }
})

const nav = [
  { key: 'home', path: '/pages/index/index', label: '彩票大厅', short: '大厅', icon: '🎟️' },
  { key: 'factory', path: '/pages/factory/factory', label: '经营工厂', short: '经营', icon: '🏭' },
  { key: 'growth', path: '/pages/growth/growth', label: '成长中心', short: '成长', icon: '🌟' }
] as const

function go(path: string) {
  uni.switchTab({ url: path })
}
</script>

<template>
  <view class="app-shell">
    <view class="topbar" :style="{ paddingTop: headerTop + 'px' }">
      <view class="brand" @tap="go('/pages/index/index')">
        <text class="brand-mark">🍀</text>
        <view>
          <text class="brand-title">LUCKY SCRATCH</text>
          <text class="brand-subtitle">幸运刮刮乐 · 放置经营</text>
        </view>
      </view>

      <view class="topbar-right">
        <view class="top-resources">
          <view>
            <text class="resource-label">可用金币</text>
            <text class="resource-value">🪙 {{ store.game.coins.toLocaleString() }}</text>
          </view>
          <view>
            <text class="resource-label">待兑奖</text>
            <text class="resource-value">🎟️ {{ store.pendingRewards.toLocaleString() }}</text>
          </view>
          <view>
            <text class="resource-label">天赋点</text>
            <text class="resource-value">✨ {{ store.game.player.talentPoints }}</text>
          </view>
        </view>
        <button class="avatar-button" @tap="profileOpen = true">👤</button>
      </view>
    </view>

    <view class="main-nav">
      <button
        v-for="item in nav"
        :key="item.key"
        :class="{ active: props.active === item.key }"
        @tap="go(item.path)"
      >
        <text>{{ item.icon }}</text>
        {{ item.label }}
      </button>
    </view>

    <slot />

    <view class="profile-backdrop" v-if="profileOpen" @tap="profileOpen = false">
      <view class="panel profile-panel" @tap.stop>
        <button class="profile-close" @tap="profileOpen = false">×</button>
        <view class="profile-avatar">👤</view>
        <text class="eyebrow">PLAYER PROFILE</text>
        <text class="profile-heading">我的玩家档案</text>
        <text class="profile-subtitle">经营你的刮刮乐事业，逐步解锁更多能力</text>

        <view class="profile-stats">
          <view>
            <text>可用金币</text>
            <text>🪙 {{ store.game.coins.toLocaleString() }}</text>
          </view>
          <view>
            <text>待兑奖</text>
            <text>🎟️ {{ store.pendingRewards.toLocaleString() }}</text>
          </view>
          <view>
            <text>天赋点</text>
            <text>✨ {{ store.game.player.talentPoints }}</text>
          </view>
        </view>

        <button class="btn secondary full" @tap="go('/pages/growth/growth'); profileOpen = false">
          查看成长与成就
        </button>
        <button class="profile-reset" @tap="store.resetSave(); profileOpen = false">
          重置游戏存档
        </button>
      </view>
    </view>

    <view v-if="store.offlineSummary" class="modal-backdrop">
      <view class="panel offline-dialog">
        <text class="eyebrow">WELCOME BACK</text>
        <text class="dialog-heading">离线经营报告</text>
        <text>离线时长：{{ Math.floor(store.offlineSummary.seconds / 60) }} 分钟</text>

        <view class="offline-result">
          <view>
            <text>自动化处理周期</text>
            <text>{{ store.offlineSummary.processed }}</text>
          </view>
          <view>
            <text>离线获得金币</text>
            <text>+{{ store.offlineSummary.earned.toLocaleString() }}</text>
          </view>
        </view>

        <button class="btn primary full" @tap="store.dismissOfflineSummary()">
          收下成果
        </button>
      </view>
    </view>

    <view v-if="store.notice" class="toast" @tap="store.setNotice('')">
      {{ store.notice }}
      <text>×</text>
    </view>

    <view class="app-footer">
      LUCKY SCRATCH
      <text>虚拟金币 · 单机体验 · 好运由你创造</text>
    </view>
  </view>
</template>

<style scoped>
.resource-label,
.resource-value,
.brand-title,
.brand-subtitle {
  display: block;
}

.resource-label {
  color: #8993b1;
  font-size: 20rpx;
}

.resource-value {
  font-size: 23rpx;
  margin-top: 5rpx;
}

.brand-title {
  font-weight: 800;
  letter-spacing: 2rpx;
  font-size: 25rpx;
}

.brand-subtitle {
  color: #8893b1;
  font-size: 19rpx;
  margin-top: 5rpx;
}

.profile-heading,
.dialog-heading {
  display: block;
  font-size: 36rpx;
  font-weight: 800;
  margin: 20rpx 0;
}

.profile-subtitle {
  display: block;
  color: #9aa4c0;
  font-size: 23rpx;
  margin: 12rpx 0 24rpx;
}

.profile-stats {
  display: flex;
  justify-content: space-between;
  margin: 25rpx 0;
}

.profile-stats view,
.offline-result view {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.profile-stats text,
.offline-result text {
  color: #9aa4c0;
  font-size: 21rpx;
}

.profile-reset {
  margin-top: 20rpx;
  background: transparent;
  color: #d98d8d;
  font-size: 23rpx;
}

.app-footer {
  padding: 24rpx 0 40rpx;
  text-align: center;
  color: #8791ad;
  font-size: 20rpx;
}

.app-footer text {
  display: block;
  margin-top: 8rpx;
  font-size: 18rpx;
}

.main-nav {
  display: flex;
  gap: 10rpx;
  padding: 18rpx 0 24rpx;
}

.main-nav button {
  flex: 1;
  min-width: 0;
  background: #20263c;
  color: #9ba5c1;
  border: 1px solid #353d5b;
  border-radius: 12rpx;
  font-size: 22rpx;
  padding: 14rpx 4rpx;
}

.main-nav button.active {
  color: #f7c965;
  border-color: #e9bd59;
  background: #403a32;
}

.main-nav button text {
  margin-right: 6rpx;
}

.avatar-button {
  padding: 0 12rpx;
  background: #2b3352;
  color: #fff;
  border-radius: 50%;
  font-size: 27rpx;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.top-resources {
  display: flex;
  gap: 14rpx;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.brand-mark {
  font-size: 38rpx;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 20rpx;
  border-bottom: 1px solid #ffffff12;
  gap: 12rpx;
}

.app-shell {
  padding: 0 24rpx;
}

.profile-backdrop,
.modal-backdrop {
  position: fixed;
  z-index: 99;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: #080b1bd9;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 35rpx;
}

.profile-panel,
.offline-dialog {
  width: 100%;
  box-sizing: border-box;
}

.profile-close {
  float: right;
  background: transparent;
  color: #fff;
  font-size: 38rpx;
}

.profile-avatar {
  text-align: center;
  font-size: 58rpx;
}

.offline-result {
  display: flex;
  justify-content: space-around;
  margin: 35rpx 0;
}

.full {
  width: 100%;
}

@media (max-width: 640px) {
  .app-shell {
    padding: 0 13rpx;
  }

  .topbar {
    align-items: center;
    gap: 8rpx;
  }

  .brand {
    gap: 8rpx;
    min-width: 0;
  }

  .brand-mark {
    font-size: 32rpx;
  }

  .brand-title {
    font-size: 21rpx;
  }

  .brand-subtitle {
    font-size: 16rpx;
  }

  .topbar-right {
    gap: 6rpx;
  }

  .top-resources {
    gap: 8rpx;
  }

  .resource-label {
    font-size: 17rpx;
  }

  .resource-value {
    font-size: 18rpx;
  }

  .top-resources > view:nth-child(2) {
    display: none;
  }

  .avatar-button {
    font-size: 23rpx;
  }

  .main-nav {
    display: flex;
    gap: 8rpx;
    padding: 14rpx 0 20rpx;
  }

  .main-nav button {
    flex: 1;
    font-size: 20rpx;
    padding: 12rpx 2rpx;
  }
}
</style>
