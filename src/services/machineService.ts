import type { GameState, Ticket, VerifyTask } from '../types/game'
import { createId } from '../utils/id'
import { earn } from './economyService'
export function pendingRewards(state:GameState){return state.machine.queue.reduce((n,t)=>n+t.reward,0)+(state.machine.currentTask?.reward??0)}
export function submitTicket(state:GameState,ticket:Ticket,now=Date.now()):boolean {
 if(ticket.status!=='scratched'||!ticket.isWinner)return false
 if(state.machine.queue.length>=state.machine.maxQueue)return false
 const task:VerifyTask={id:createId('verify'),ticketId:ticket.id,reward:ticket.prize,status:'queued',duration:Math.max(1000,Math.round(5000*Math.max(.2,1-state.talents.device*.1)*Math.max(.4,1-(state.machine.level-1)*.08))),settled:false}
 ticket.status='queued';ticket.submittedAt=now;state.machine.queue.push(task);startNext(state,now);return true
}
export function startNext(state:GameState,now=Date.now()) {if(state.machine.currentTask||!state.machine.queue.length)return;const next=state.machine.queue.shift()!;next.status='verifying';next.startedAt=now;state.machine.currentTask=next;const ticket=state.tickets.find(t=>t.id===next.ticketId);if(ticket)ticket.status='verifying'}
export function settleExpired(state:GameState,now=Date.now()) {
 let changed=false;let guard=0
 while(state.machine.currentTask&&guard++<100){const task=state.machine.currentTask;if(!task.startedAt||now<task.startedAt+task.duration)break
  if(!task.settled){task.settled=true;task.status='completed';task.completedAt=task.startedAt+task.duration;const ticket=state.tickets.find(t=>t.id===task.ticketId);if(ticket&&ticket.status!=='completed'){ticket.status='completed';ticket.completedAt=task.completedAt;earn(state,task.reward,`${ticket.gameName}验票奖金`);state.statistics.totalWon++}}
  state.machine.currentTask=null;startNext(state,task.completedAt??now);changed=true
 }
 return changed
}
