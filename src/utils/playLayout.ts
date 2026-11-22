import type { PlayType } from '../types/game'
export const PLAY_LAYOUT: Record<PlayType, { labels: string[]; columns: number; rows: number }> = {
  'number-match': { labels: ['中奖号码', '号码 1', '号码 2', '号码 3', '号码 4', '号码 5', '号码 6'], columns: 3, rows: 3 },
  'symbol-match': { labels: ['图案 1', '图案 2', '图案 3', '图案 4', '图案 5', '图案 6'], columns: 3, rows: 2 },
  'three-match': { labels: ['数字 1', '数字 2', '数字 3'], columns: 3, rows: 1 },
  'line-match': { labels: ['左上', '中上', '右上', '左下', '中下', '右下'], columns: 3, rows: 2 },
  'number-compare': { labels: ['你的数字', '比较结果', '幸运数字'], columns: 3, rows: 1 },
  'number-sum': { labels: ['数字 A', '数字 B', '目标和'], columns: 3, rows: 1 },
  'direct-prize': { labels: ['奖金金额'], columns: 1, rows: 1 },
  'coordinate': { labels: ['A1', 'B1', 'C1', 'A2', 'B2', 'C2', 'A3', 'B3', 'C3'], columns: 3, rows: 3 },
  'step-walk': { labels: ['起点', '第一步', '第二步', '第三步', '终点'], columns: 5, rows: 1 },
}
export function cellCount(type: PlayType): number { return PLAY_LAYOUT[type].labels.length }
export function ticketCellCount(ticket: { playType: PlayType; result?: Record<string, unknown> }): number {
  const values = ticket.result?.values
  return Array.isArray(values) && values.length > 0 ? values.length : cellCount(ticket.playType)
}
