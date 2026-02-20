export interface Upgrade {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  multiplier: number;
  type: 'views' | 'money' | 'subscribers';
  value: number;
  level: number;
  icon: string;
}

export interface ContentType {
  id: string;
  name: string;
  baseViews: number;
  baseMoney: number;
  duration: number; // in seconds
  unlockedAtSubs: number;
}

export interface GameState {
  views: number;
  subscribers: number;
  money: number;
  totalViews: number;
  totalMoney: number;
  upgrades: Upgrade[];
  unlockedContentTypes: string[];
  lastSaved: number;
}
