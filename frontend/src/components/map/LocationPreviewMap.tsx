import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Circle, Marker, useMap } from 'react-leaflet';
import { leafletLayer } from 'protomaps-leaflet';
import { PMTiles } from 'pmtiles';

import { StaticCoordinateFallback } from '@/components/map/StaticCoordinateFallback';
import {
  isCensOfflineMapPackReady,
  resolveCensOfflineMapPackBlobUrl,
} from '@/services/offlineMapPack';

type GpsPoint = {
  latitud: number;
  longitud: number;
  precision: number;
};

type Props = {
  gps: GpsPoint;
  className?: string;
};

const PREVIEW_ZOOM = 17;
const PACK_RETRY_MS = 8_000;

function createPreviewMarkerIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:#0f766e;border:2px solid #fff;box-shadow:0 0 0 2px rgba(15,118,110,0.35);"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function PmtilesBasemapLayer({
  blobUrl,
  attribution,
}: {
  blobUrl: string;
  attribution: string;
}) {
  const map = useMap();
  const pmtilesRef = useRef<PMTiles | null>(null);

  useEffect(() => {
    const pmtiles = new PMTiles(blobUrl);
    pmtilesRef.current = pmtiles;
    const layer = leafletLayer({
      url: pmtiles,
      attribution,
      flavor: 'light',
      lang: 'es',
    }) as unknown as L.Layer;
    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, blobUrl, attribution]);

  return null;
}

function MapViewController({ latitud, longitud }: { latitud: number; longitud: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView([latitud, longitud], PREVIEW_ZOOM, { animate: false });
  }, [map, latitud, longitud]);

  return null;
}

export const LocationPreviewMap = ({ gps, className = '' }: Props) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [attribution, setAttribution] = useState<string>(
    '© OpenStreetMap contributors · CENS',
  );
  const [packReady, setPackReady] = useState(false);
  const objectUrlRef = useRef<string | null>(null);
  const loadingRef = useRef(false);

  const center = useMemo(
    () => [gps.latitud, gps.longitud] as [number, number],
    [gps.latitud, gps.longitud],
  );

  const markerIcon = useMemo(() => createPreviewMarkerIcon(), []);

  const revokeObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const loadPack = async () => {
    if (loadingRef.current) {
      return;
    }
    loadingRef.current = true;
    try {
      const ready = await isCensOfflineMapPackReady();
      setPackReady(ready);
      if (!ready) {
        revokeObjectUrl();
        setBlobUrl(null);
        return;
      }
      const resolved = await resolveCensOfflineMapPackBlobUrl();
      if (!resolved) {
        setPackReady(false);
        setBlobUrl(null);
        return;
      }
      revokeObjectUrl();
      objectUrlRef.current = resolved.blobUrl;
      setBlobUrl(resolved.blobUrl);
      setAttribution(resolved.attribution);
      setPackReady(true);
    } finally {
      loadingRef.current = false;
    }
  };

  useEffect(() => {
    void loadPack();
    return () => {
      revokeObjectUrl();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per mount; retries via interval
  }, []);

  useEffect(() => {
    if (packReady && blobUrl) {
      return;
    }
    const timer = window.setInterval(() => {
      void loadPack();
    }, PACK_RETRY_MS);
    return () => {
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- poll until pack is available
  }, [packReady, blobUrl]);

  useEffect(() => {
    void loadPack();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to coordinate updates only
  }, [gps.latitud, gps.longitud]);

  if (!packReady || !blobUrl) {
    return (
      <StaticCoordinateFallback
        latitud={gps.latitud}
        longitud={gps.longitud}
        precision={gps.precision}
        className={className}
        hint="Mapa detallado en preparación. Las coordenadas ya están registradas."
      />
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={PREVIEW_ZOOM}
      className={`h-full w-full ${className}`}
      scrollWheelZoom={false}
      attributionControl
      preferCanvas
    >
      <PmtilesBasemapLayer blobUrl={blobUrl} attribution={attribution} />
      <MapViewController latitud={gps.latitud} longitud={gps.longitud} />
      <Marker position={center} icon={markerIcon} />
      {gps.precision > 0 ? (
        <Circle
          center={center}
          radius={gps.precision}
          pathOptions={{
            color: '#0f766e',
            fillColor: '#14b8a6',
            fillOpacity: 0.15,
            weight: 1.5,
          }}
        />
      ) : null}
    </MapContainer>
  );
};
