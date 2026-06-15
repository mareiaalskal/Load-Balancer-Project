import { useState, useCallback, useRef, useEffect } from 'react';
import type { LBAlgo, NodeMetrics } from '../types';

export function useGatewayLoadBalancer(initialServers: NodeMetrics[]) {
  const [servers, setServers] = useState<NodeMetrics[]>(initialServers);
  const [activeStrategy, setActiveStrategy] = useState<LBAlgo>('least-connections');

  const rrIndex = useRef(0);
  const serversRef = useRef(servers);

  // تحديث المرجع دائماً لتبقى الداتا طازجة للتيمر
  useEffect(() => {
    serversRef.current = servers;
  }, [servers]);

  // --------------------------------------------------------
  // إصلاح الخطوة الفرعية 1: إضافة حلقة الـ Health Check الدورية
  // --------------------------------------------------------
  // --------------------------------------------------------
  // إضافة حلقة الـ Health Check الدورية (نسخة آمنة للمحاكاة والفحص المحلي)
  // --------------------------------------------------------
  useEffect(() => {
    const checkTopologyHealth = async () => {
      const currentServers = serversRef.current;

      const healthChecks = await Promise.all(
        currentServers.map(async (server) => {
          const serverUrl = (server as any).url;

          // 💡 حيلة الفحص المحلي: إذا لم يكن هناك رابط حقيقي (مثل السيرفرات A و C الوهمية بملف App)
          // نحافظ على حالتها الحالية أونلاين/أوفلاين ولا نقوم بإطفائها تلقائياً
          if (!serverUrl) {
            return { id: server.id, isOnline: server.status === 'online' };
          }

          try {
            // في بيئة الإنتاج أو لابات الشبكات الحقيقية نختبر الرابط الفعلي
            const res = await fetch(`${serverUrl}/healthz`, { method: 'GET' });
            return { id: server.id, isOnline: res.ok };
          } catch {
            return { id: server.id, isOnline: false }; // فشل الاتصال بالسيرفر الحقيقي يخرجه عن الخدمة
          }
        })
      );

      // تحديث الحالة الصحية للمخدمات
      setServers((prev) =>
        prev.map((s) => {
          const match = healthChecks.find((r) => r.id === s.id);
          return match ? { ...s, status: match.isOnline ? 'online' : 'offline' } : s;
        })
      );
    };

    checkTopologyHealth();
    const interval = setInterval(checkTopologyHealth, 4000);
    return () => clearInterval(interval);
  }, []);

  const hash = (key: string) => {
    let h = 0;
    for (let i = 0; i < key.length; i++) {
      h = (h * 31 + key.charCodeAt(i)) >>> 0;
    }
    return h;
  };

  const routeRequest = useCallback(
    async (path: string, payloadKey = 'default_user') => {
      const healthy = servers.filter(s => s.status === 'online');

      if (healthy.length === 0) {
        throw new Error('503 Service Unavailable: All servers offline');
      }

      let target: NodeMetrics = healthy[0];

      switch (activeStrategy) {
        // 1. Round Robin
        case 'round-robin': {
          target = healthy[rrIndex.current % healthy.length];
          rrIndex.current++;
          break;
        }

        // 2. Weighted Round Robin
        case 'weighted-round-robin': {
          const sorted = [...healthy].sort((a, b) => a.cpu - b.cpu);
          const weights = sorted.map(s => Math.max(1, 100 - s.cpu));
          let totalWeight = weights.reduce((a, b) => a + b, 0);
          let pointer = rrIndex.current % totalWeight;

          for (let i = 0; i < sorted.length; i++) {
            if (pointer < weights[i]) {
              target = sorted[i];
              break;
            }
            pointer -= weights[i];
          }
          rrIndex.current++;
          break;
        }

        // 3. Smooth RR
        case 'smooth-round-robin': {
          target = [...healthy].sort(
            (a, b) => (a.connections ?? 0) - (b.connections ?? 0)
          )[0];
          break;
        }

        // 4. Consistent Hashing (إصلاح هندسي بحلقة 360 درجة)
        case 'consistent-hashing': {
          const clientDegrees = hash(payloadKey) % 360;

          // إسقاط السيرفرات الحية بالتساوي على حلقة الـ 360 درجة كما طلب الـ TA
          const ringNodes = healthy.map((node, idx) => ({
            node,
            deg: Math.floor((idx * 360) / healthy.length),
          }));

          // البحث عن أقرب سيرفر مواجه للطلب باتجاه عقارب الساعة
          const sortedRing = ringNodes.sort((a, b) => a.deg - b.deg);
          const matched = sortedRing.find(rn => rn.deg >= clientDegrees) || sortedRing[0];
          
          target = matched.node;
          break;
        }

        // 5. Latency-based
        case 'latency-based': {
          target = [...healthy].sort(
            (a, b) => (a.latency ?? 0) - (b.latency ?? 0)
          )[0];
          break;
        }

        // 6. Least Connections
        case 'least-connections': {
          target = [...healthy].sort(
            (a, b) => (a.connections ?? 0) - (b.connections ?? 0)
          )[0];
          break;
        }

        // 7. Weighted Least Connections
        case 'weighted-least-connections': {
          target = [...healthy].sort(
            (a, b) =>
              (a.connections / (a.cpu + 1)) -
              (b.connections / (b.cpu + 1))
          )[0];
          break;
        }

        // 8–11. Advanced strategies
        case 'adaptive-feedback':
        case 'performance-based':
        case 'server-mesh':
        case 'idle-join-queue': {
          target = [...healthy].sort(
            (a, b) => (a.cpu + a.connections) - (b.cpu + b.connections)
          )[0];
          break;
        }

        default:
          target = healthy[0];
      }

      return target;
    },
    [servers, activeStrategy]
  );

  return {
    servers,
    setServers,
    activeStrategy,
    setActiveStrategy,
    routeRequest,
  };
}