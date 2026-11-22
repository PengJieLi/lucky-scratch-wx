import type { GameState } from '../types/game'
import { createId } from '../utils/id'
export function spend(state:GameState,amount:number,reason:string):boolean { if(!Number.isInteger(amount)||amount<0||state.coins<amount)return false; state.coins-=amount;state.statistics.totalSpent+=amount;state.transactions.unshift({id:createId('tx'),type:'expense',amount,reason,createdAt:Date.now()});return true }
export function earn(state:GameState,amount:number,reason:string):void { if(!Number.isInteger(amount)||amount<=0)return;state.coins+=amount;state.statistics.totalEarned+=amount;state.transactions.unshift({id:createId('tx'),type:'income',amount,reason,createdAt:Date.now()});state.transactions=state.transactions.slice(0,100) }
