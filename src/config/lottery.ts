import type { LotteryConfig } from '../types/game'
export const LOTTERIES: LotteryConfig[] = [
 {id:'free',name:'免费体验票',description:'零成本体验刮奖乐趣，无限畅玩',price:0,baseWinRate:.3,basePrize:10,unlockLevel:1,scratchDuration:8,verifyDuration:5,playType:'number-match',theme:'mint',enabled:true},
 {id:'starter',name:'新手刮刮乐',description:'适合刚刚起步的幸运玩家',price:10,baseWinRate:.3,basePrize:25,unlockLevel:1,scratchDuration:8,verifyDuration:5,playType:'symbol-match',theme:'blue',enabled:true},
 {id:'gold',name:'黄金大奖',description:'更高奖金，挑战你的好运',price:100,baseWinRate:.25,basePrize:300,unlockLevel:2,scratchDuration:12,verifyDuration:7,playType:'three-match',theme:'gold',enabled:true},
 {id:'diamond',name:'钻石大奖',description:'稀有大奖等待幸运之人',price:1000,baseWinRate:.2,basePrize:3500,unlockLevel:5,scratchDuration:16,verifyDuration:9,playType:'line-match',theme:'purple',enabled:true},
 {id:'lucky777',name:'幸运 777',description:'终极大奖，向自动化工厂迈进',price:5000,baseWinRate:.15,basePrize:20000,unlockLevel:10,scratchDuration:20,verifyDuration:12,playType:'number-sum',theme:'red',enabled:true}
]
