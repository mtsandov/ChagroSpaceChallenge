import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface Props {
  enabled: boolean;
  /** 0..1, posición del divisor desde la izquierda */
  ratio: number;
  leftPane: string;
  rightPane: string;
}

/**
 * Recorta dos panes de Leaflet a cada lado del divisor (mismo método que
 * leaflet-side-by-side, pero funciona con capas vectoriales y raster).
 * Cuando el pipeline entregue tiles SAR, basta con poner los TileLayer en
 * estos mismos panes.
 */
export default function SwipeClipper({ enabled, ratio, leftPane, rightPane }: Props) {
  const map = useMap();

  useEffect(() => {
    const left = map.getPane(leftPane);
    const right = map.getPane(rightPane);
    if (!left || !right) return;

    const update = () => {
      if (!enabled) {
        left.style.clip = '';
        right.style.clip = '';
        return;
      }
      const size = map.getSize();
      const nw = map.containerPointToLayerPoint([0, 0]);
      const se = map.containerPointToLayerPoint(size);
      const x = map.containerPointToLayerPoint([size.x * ratio, 0]).x;
      left.style.clip = `rect(${nw.y}px, ${x}px, ${se.y}px, ${nw.x}px)`;
      right.style.clip = `rect(${nw.y}px, ${se.x}px, ${se.y}px, ${x}px)`;
    };

    update();
    map.on('move zoom resize', update);
    return () => {
      map.off('move zoom resize', update);
    };
  }, [map, enabled, ratio, leftPane, rightPane]);

  return null;
}
