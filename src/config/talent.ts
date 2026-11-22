import type { TalentKey } from '../types/game'
export const TALENTS: Record<TalentKey,{name:string;icon:string;description:string;baseCost:number;maxLevel:number}> = {
 luck:{name:'幸运',icon:'🍀',description:'提高中奖概率，每级 +1%',baseCost:20,maxLevel:20},
 wealth:{name:'财富',icon:'💰',description:'提高中奖奖金，每级 +5%',baseCost:25,maxLevel:20},
 efficiency:{name:'效率',icon:'⚡',description:'刮奖耗时每级减少 5%',baseCost:20,maxLevel:20},
 device:{name:'设备',icon:'🛠️',description:'验票耗时每级减少 10%',baseCost:35,maxLevel:20},
 automation:{name:'自动化',icon:'🤖',description:'逐步解锁自动经营能力',baseCost:50,maxLevel:8}
}
export const talentCost = (key:TalentKey, level:number) => Math.ceil(TALENTS[key].baseCost * 1.35 ** level)
export const automationUnlocks = (level:number) => ({autoSubmit:level>=1,autoCollect:level>=2,autoScratch:level>=3,autoBuy:level>=5,full:level>=8})
