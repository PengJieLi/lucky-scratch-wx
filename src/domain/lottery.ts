import type { LotteryConfig, Ticket, TalentKey } from '../types/game'
import { createId } from '../utils/id'
import { cellCount } from '../utils/playLayout'

const symbols = ['🍀', '⭐', '💎', '🔔', '🍒', '7️⃣']

function createCells(type: LotteryConfig['playType'], isWinner: boolean, prize: number) {
  switch (type) {
    case 'number-match': {
      const target = Math.floor(Math.random() * 9) + 1
      const mine = Array.from({ length: 6 }, () => {
        const value = Math.floor(Math.random() * 9) + 1
        return value === target ? value % 9 + 1 : value
      })
      const matchCount = isWinner ? (Math.random() < 0.5 ? 1 : 2) : 0
      const positions = [0, 1, 2, 3, 4, 5]
        .sort(() => Math.random() - 0.5)
        .slice(0, matchCount)

      positions.forEach(index => {
        mine[index] = target
      })

      // 每个中奖号码独立抽取奖金，不再平分整张彩票的总奖金。
      // 未中奖号码奖金为 0，避免玩家误以为每个号码都有奖金。
      const prizes = Array(6).fill(0) as number[]
      const prizePool = [10, 20, 30, 50, 100]
      positions.forEach(index => {
        prizes[index] = prizePool[Math.floor(Math.random() * prizePool.length)]
      })

      return {
        values: [target, ...mine],
        target,
        prizes,
        instruction: '上方中奖号码直接展示，刮开下方 6 个号码；每个匹配号码获得独立奖金，奖金可累加'
      }
    }

    case 'symbol-match': {
      const target = symbols[Math.floor(Math.random() * symbols.length)]
      const values = Array.from({ length: 6 }, (_, i) =>
        isWinner && i < 3 ? target : symbols[(symbols.indexOf(target) + i + 1) % symbols.length]
      )
      return { values, target, instruction: '幸运图案：刮开 6 个图案，集齐 3 个相同图案即可中奖' }
    }

    case 'three-match': {
      const value = Math.floor(Math.random() * 9) + 1
      return {
        values: isWinner ? [value, value, value] : [value, (value % 9) + 1, (value + 2) % 9 + 1],
        instruction: '三个相同数字即可获得大奖'
      }
    }

    case 'line-match': {
      const value = symbols[Math.floor(Math.random() * symbols.length)]
      const values = [
        value,
        symbols[(symbols.indexOf(value) + 1) % symbols.length],
        symbols[(symbols.indexOf(value) + 2) % symbols.length],
        symbols[(symbols.indexOf(value) + 3) % symbols.length],
        symbols[(symbols.indexOf(value) + 4) % symbols.length],
        symbols[(symbols.indexOf(value) + 5) % symbols.length]
      ]
      if (isWinner) values.splice(0, 3, value, value, value)
      return { values, instruction: '连线大奖：刮开 2 行图案，任意一行 3 个相同图案即可中奖' }
    }

    case 'number-compare': {
      const target = Math.floor(Math.random() * 8) + 1
      const player = isWinner ? target + 1 : Math.max(1, target - 1)
      return { values: [player, 'VS', target], target, instruction: '数字比大小：你的数字大于幸运数字即可中奖' }
    }

    case 'number-sum': {
      const target = 15
      const a = Math.floor(Math.random() * 7) + 1
      const b = isWinner ? target - a : Math.max(1, target - a - 1)
      return { values: [a, b, target], target, instruction: '数字求和：前两个数字之和等于目标数字即可中奖' }
    }

    case 'direct-prize':
      return { values: [isWinner ? prize : 0], instruction: '直接奖金：刮开唯一的奖金区域，直接揭晓中奖金额' }

    case 'coordinate': {
      const values = ['🍀', '⭐', '💎', '🔔', '🍒', '7️⃣', '🎁', '🌙', '☀️']
      if (isWinner) values[4] = '🏆'
      return { values, target: 'B2', instruction: '幸运坐标：刮开 3×3 坐标格，找到中心幸运大奖即可中奖' }
    }

    case 'step-walk':
      return {
        values: isWinner ? ['🚩', '⬆️', '➡️', '⬆️', '🏆'] : ['🚩', '⬅️', '⬇️', '↙️', '❌'],
        target: '🏆',
        instruction: '幸运步数：依次刮开 5 个路径节点，成功抵达终点即可中奖'
      }
  }
}

export function generateTicket(
  config: LotteryConfig,
  talents: Record<TalentKey, number>,
  now = Date.now(),
  playType: LotteryConfig['playType'] = config.playType
): Ticket {
  const winRate = Math.min(0.8, config.baseWinRate + talents.luck * 0.01)
  const basePrize = Math.floor(config.basePrize * (1 + talents.wealth * 0.05))
  const isWinner = Math.random() < winRate
  const generatedPrize = isWinner ? basePrize : 0
  const play = createCells(playType, isWinner, generatedPrize)

  // 数字匹配玩法的单票奖金，以所有中奖号码的独立奖金之和为准。
  // 其他玩法继续使用原有的单票固定奖金。
  const ticketPrize =
    playType === 'number-match' && 'prizes' in play && Array.isArray(play.prizes)
      ? play.prizes.reduce((sum, value) => sum + (typeof value === 'number' ? value : 0), 0)
      : generatedPrize

  return {
    id: createId('ticket'),
    gameId: config.id,
    gameName: config.name,
    playType,
    price: config.price,
    prize: ticketPrize,
    basePrize: config.basePrize,
    isWinner,
    result: { ...play, winRate, generatedAt: now },
    revealedCells: playType === 'number-match' ? [0] : [],
    cellProgress: Array.from(
      { length: cellCount(playType) },
      (_, index) => playType === 'number-match' && index === 0 ? 1 : 0
    ),
    scratchProgress: 0,
    status: 'purchased',
    createdAt: now
  }
}

export function scratchTicket(ticket: Ticket, index: number): Ticket {
  if (ticket.status === 'scratched' || ticket.status === 'queued' || ticket.status === 'verifying' || ticket.status === 'completed') {
    return ticket
  }

  const cells = [...new Set([...ticket.revealedCells, index])]
  const cellProgress = [...(ticket.cellProgress ?? [0, 0, 0])]
  if (ticket.playType === 'number-match') cellProgress[0] = 1
  cellProgress[index] = 1
  const progress = cellProgress.reduce((sum, value) => sum + value, 0) / cellProgress.length

  return {
    ...ticket,
    revealedCells: cells,
    cellProgress,
    scratchProgress: progress,
    status: progress >= 1 ? 'scratched' : 'scratching',
    scratchedAt: progress >= 1 ? Date.now() : ticket.scratchedAt
  }
}
