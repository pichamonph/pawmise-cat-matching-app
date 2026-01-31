// utils/eventEmitter.ts - Global event system for real-time communication
import { EventEmitter } from 'events';
import type { Message } from '@/types';

interface EventMap {
  'message:received': (message: Message, matchId: string) => void;
  'message:read': (matchId: string, readBy: string) => void;
  'typing:update': (userId: string, matchId: string, isTyping: boolean) => void;
  'match:new': (matchData: any) => void;
  'user:online': (userId: string) => void;
  'user:offline': (userId: string) => void;
  'user:logout': () => void;
  'socket:connected': () => void;
  'socket:disconnected': () => void;
}

class TypedEventEmitter {
  private emitter = new EventEmitter();
  private lastEventTime: Map<string, number> = new Map();
  private debounceDelay = 1000; // 1 second debounce for status events

  emit<K extends keyof EventMap>(event: K, ...args: Parameters<EventMap[K]>): void {
    // Debounce user status events to prevent duplicates
    if (event === 'user:online' || event === 'user:offline') {
      const userId = args[0] as string;
      const eventKey = `${event}:${userId}`;
      const now = Date.now();
      const lastTime = this.lastEventTime.get(eventKey) || 0;

      // Skip if same event for same user happened recently
      if (now - lastTime < this.debounceDelay) {
        console.log(`🚫 Debounced duplicate ${event} for user ${userId}`);
        return;
      }

      this.lastEventTime.set(eventKey, now);
    }

    this.emitter.emit(event, ...args);
  }

  on<K extends keyof EventMap>(event: K, listener: EventMap[K]): void {
    this.emitter.on(event, listener);
  }

  off<K extends keyof EventMap>(event: K, listener: EventMap[K]): void {
    this.emitter.off(event, listener);
  }

  removeAllListeners(event?: keyof EventMap): void {
    this.emitter.removeAllListeners(event);
  }
}

export const globalEvents = new TypedEventEmitter();