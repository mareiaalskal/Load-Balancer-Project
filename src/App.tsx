import { useGatewayLoadBalancer } from './hooks/useGatewayLoadBalancer';
import type { NodeMetrics } from './types';

const initialServers: NodeMetrics[] = [
  { id: 'A', status: 'online', cpu: 90, connections: 0, latency: 100 },
  { id: 'B', status: 'offline', cpu: 30, connections: 10, latency: 20 },
  { id: 'C', status: 'online', cpu: 10, connections: 20, latency: 50 },
];

export default function App() {
  const { routeRequest, activeStrategy, setActiveStrategy } =
    useGatewayLoadBalancer(initialServers);

  const testRoute = async () => {
    const result = await routeRequest('/checkout', 'user999');
    console.log('Routed to:', result);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Load Balancer Test</h2>

      <select
        value={activeStrategy}
        onChange={(e) => setActiveStrategy(e.target.value as any)}
      >
        <option value="round-robin">Round Robin</option>
        <option value="weighted-round-robin">Weighted RR</option>
        <option value="consistent-hashing">Consistent Hashing</option>
        <option value="least-connections">Least Connections</option>
        <option value="latency-based">Latency Based</option>
      </select>

      <br /><br />

      <button onClick={testRoute}>
        Send Request
      </button>
    </div>
  );
}