import { useCallback, useEffect, useState } from 'react';
import type { FarmerParcel } from '../types';
import { loadData } from './api/client';

const KEY = (userId: string) => `chagro.parcels.${userId}`;

/**
 * Parcelas del agricultor.
 * Hoy: parcelas demo (/data/farmer_demo.json) + las creadas en este navegador (localStorage).
 * TODO(supabase): leer/escribir `farms`, `parcels` e `irrigation_systems` con RLS.
 */
export function useFarmerParcels(userId: string | undefined) {
  const [parcels, setParcels] = useState<FarmerParcel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    loadData<FarmerParcel[]>('farmer_demo.json')
      .then((demo) => {
        let local: FarmerParcel[] = [];
        try {
          local = JSON.parse(localStorage.getItem(KEY(userId)) ?? '[]');
        } catch {
          local = [];
        }
        if (alive) setParcels([...demo, ...local]);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [userId]);

  const addParcel = useCallback(
    (p: FarmerParcel) => {
      if (!userId) return;
      setParcels((prev) => [...prev, p]);
      try {
        const local: FarmerParcel[] = JSON.parse(localStorage.getItem(KEY(userId)) ?? '[]');
        localStorage.setItem(KEY(userId), JSON.stringify([...local, p]));
      } catch {
        /* sin almacenamiento: la parcela vive solo en esta sesión */
      }
    },
    [userId],
  );

  return { parcels, loading, addParcel };
}
