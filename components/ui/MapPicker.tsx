'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin } from 'lucide-react';

let customIcon: L.Icon | undefined;

interface MapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
}

function LocationMarker({ position, onChange }: { position: L.LatLng | null, onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });

  return position === null || !customIcon ? null : (
    <Marker position={position} icon={customIcon} />
  );
}

export default function MapPicker({ latitude, longitude, onChange }: MapPickerProps) {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!customIcon) {
      customIcon = new L.Icon({
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });
    }

    setMounted(true);
    if (latitude !== null && longitude !== null) {
      setPosition(new L.LatLng(latitude, longitude));
    }
  }, [latitude, longitude]);

  useEffect(() => {
    // Get user's current location if no coords provided
    if (mounted && latitude === null && longitude === null) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude: lat, longitude: lng } = pos.coords;
            setPosition(new L.LatLng(lat, lng));
            onChange(lat, lng);
          },
          (err) => {
            console.error('Geolocation error:', err);
          }
        );
      }
    }
  }, [mounted, latitude, longitude, onChange]);

  if (!mounted) return <div className="h-[250px] w-full bg-surface-light rounded-lg animate-pulse" />;

  const defaultCenter: L.LatLngExpression = position || [28.6139, 77.2090]; // Default to New Delhi if no location

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-semibold text-text-primary px-1">Location Coordinates</label>
        {position && (
          <span className="text-xs text-text-secondary flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
          </span>
        )}
      </div>
      <div className="h-[250px] w-full rounded-lg overflow-hidden border border-border">
        <MapContainer
          center={defaultCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} onChange={onChange} />
        </MapContainer>
      </div>
      <p className="text-xs text-text-tertiary px-1">Click on the map to place your property marker.</p>
    </div>
  );
}
