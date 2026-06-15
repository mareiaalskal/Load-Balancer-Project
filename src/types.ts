export type LBAlgo =
  | 'round-robin'
  | 'weighted-round-robin'
  | 'smooth-round-robin'
  | 'consistent-hashing'
  | 'latency-based'
  | 'least-connections'
  | 'weighted-least-connections'
  | 'adaptive-feedback'
  | 'performance-based'
  | 'server-mesh'
  | 'idle-join-queue';

export interface NodeMetrics {
  id: string;
  status: 'online' | 'offline';
  cpu: number;
  connections: number;
  latency?: number;
}