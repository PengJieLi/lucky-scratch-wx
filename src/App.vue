<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { useGameStore } from './stores/game'

let timer: ReturnType<typeof setInterval> | null = null
onLaunch(() => {
  const game = useGameStore()
  game.applyOffline()
  if (timer) clearInterval(timer)
  timer = setInterval(() => game.tick(), 250)
})
onShow(() => {
  const game = useGameStore()
  game.applyOffline()
})
onHide(() => {
  const game = useGameStore()
  game.save()
  if (timer) {
    clearInterval(timer)
    timer = null
  }
})
</script>
<style>
page { min-height: 100%; background: #171b2e; color: #f5f6fb; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; }
</style>
