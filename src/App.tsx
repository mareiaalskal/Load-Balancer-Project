import { useState } from 'react';
import { useGatewayLoadBalancer } from './hooks/useGatewayLoadBalancer';
import type { NodeMetrics } from './types';

const initialServers: NodeMetrics[] = [
  { id: 'A', status: 'online', cpu: 90, connections: 0, latency: 100 },
  { id: 'B', status: 'offline', cpu: 30, connections: 10, latency: 20 },
  { id: 'C', status: 'online', cpu: 10, connections: 20, latency: 50 },
];

export default function App() {
  // 1. قمنا باستخراج servers هنا لنعرض حالتها الحية على الواجهة
  const { servers, routeRequest, activeStrategy, setActiveStrategy } =
    useGatewayLoadBalancer(initialServers);

  // 2. State لتخزين سجل الطلبات الموجهة وعرضها للمستخدم
  const [logs, setLogs] = useState<string[]>([]);

  const testRoute = async () => {
    try {
      const result = await routeRequest('/checkout', 'user999');
      const time = new Date().toLocaleTimeString();
      
      // إضافة السجل الجديد في بداية القائمة
      setLogs((prev) => [
        `[${time}] Success: Routed to Server ${result.id} (CPU: ${result.cpu}%, Conn: ${result.connections})`,
        ...prev
      ]);
    } catch (error: any) {
      const time = new Date().toLocaleTimeString();
      setLogs((prev) => [`[${time}] Error: ${error.message}`, ...prev]);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h2>🌐 Load Balancer Dashboard</h2>

      {/* قسم اختيار الاستراتيجية */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
          Select Strategy:
        </label>
        <select
          value={activeStrategy}
          onChange={(e) => setActiveStrategy(e.target.value as any)}
          style={{ padding: '8px', width: '100%', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          <option value="round-robin">Round Robin</option>
          <option value="weighted-round-robin">Weighted RR</option>
          <option value="consistent-hashing">Consistent Hashing</option>
          <option value="least-connections">Least Connections</option>
          <option value="latency-based">Latency Based</option>
        </select>
      </div>

      {/* قسم حالة السيرفرات الحالية */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '10px 0' }}>Live Servers Status:</h4>
        <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
          {servers.map((server) => (
            <div
              key={server.id}
              style={{
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                backgroundColor: server.status === 'online' ? '#e6f4ea' : '#fce8e6',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <strong>Server {server.id}</strong>
              <span style={{ fontSize: '14px' }}>
                Status: <b style={{ color: server.status === 'online' ? 'green' : 'red' }}>{server.status}</b> | 
                CPU: {server.cpu}% | 
                Conn: {server.connections}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* زر إرسال الطلب */}
      <button
        onClick={testRoute}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          width: '100%',
          fontSize: '16px',
          fontWeight: 'bold'
        }}
      >
        🚀 Send Request (Test Route)
      </button>

      {/* قسم طباعة النتائج والحالات */}
      <div style={{ marginTop: '25px' }}>
        <h4 style={{ margin: '5px 0' }}>Routing Logs:</h4>
        <div
          style={{
            backgroundColor: '#1e1e1e',
            color: '#7cfc00',
            padding: '15px',
            borderRadius: '6px',
            minHeight: '150px',
            maxHeight: '250px',
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '13px',
            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)'
          }}
        >
          {logs.length === 0 ? (
            <span style={{ color: '#aaa' }}>No requests sent yet. Click the button above to test.</span>
          ) : (
            logs.map((log, index) => (
              <div key={index} style={{ marginBottom: '6px', color: log.includes('Error') ? '#ff6b6b' : '#7cfc00' }}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}