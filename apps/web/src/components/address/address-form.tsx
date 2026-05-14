'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface AddressFormValues {
  postalCode: string;
  prefecture: string;
  city: string;
  street: string;
  building: string;
  residenceType: string;
  ownershipType: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;
  googleMapsUrl?: string;
  googleFormattedAddress?: string;
  pinConfirmed: boolean;
  pinCorrected: boolean;
  pinCorrectionNote?: string;
  accuracyStatus: string;
}

interface AddressFormProps {
  value: AddressFormValues;
  onChange: (value: AddressFormValues) => void;
  errors?: Partial<Record<keyof AddressFormValues, string>>;
}

function buildGoogleMapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

// NEXT_PUBLIC_ vars are inlined at build time — safe to reference at module level
const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
// DEMO_MAP_ID is a Google-provided value that enables vector rendering without
// creating a Map ID in Cloud Console. Replace with a real Map ID in production
// by setting NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID.
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? 'DEMO_MAP_ID';

const TOKYO_STATION = { lat: 35.6812, lng: 139.7671 } as const;

// ---------------------------------------------------------------------------
// Sub-components (no Google Maps dependency)
// ---------------------------------------------------------------------------
function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1 block text-sm font-medium text-text-secondary"
    >
      {children}
      {required && <span className="ml-1 text-status-error">*</span>}
    </label>
  );
}

function PostalCodeField({
  value,
  onChange,
  onFill,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  onFill: (postalCode: string, prefecture: string, city: string) => void;
  error?: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleChange = (raw: string) => {
    const digits = raw
      .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
      .replace(/[^0-9]/g, '')
      .slice(0, 7);
    onChange(digits);
    if (digits.length === 7) void fetchPostal(digits);
  };

  const fetchPostal = async (zipcode: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/geocode/postal?zipcode=${zipcode}`);
      if (res.ok) {
        const data = (await res.json()) as { prefecture: string; city: string; town: string };
        onFill(zipcode, data.prefecture, data.city + (data.town ?? ''));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <FieldLabel htmlFor="postal-code" required>
        郵便番号
      </FieldLabel>
      <div className="relative flex items-center gap-2">
        <Input
          id="postal-code"
          type="text"
          inputMode="numeric"
          placeholder="1234567"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          invalid={!!error}
          className="h-10 w-36 text-base tabular-nums"
          maxLength={7}
          aria-describedby={error ? 'postal-error' : undefined}
        />
        {loading && <Loader2 size={16} className="animate-spin text-text-tertiary" />}
      </div>
      {error && (
        <p id="postal-error" className="mt-1 text-xs text-status-error">
          {error}
        </p>
      )}
    </div>
  );
}

function AddressFields({
  prefecture,
  city,
  street,
  building,
  onChangePrefecture,
  onChangeCity,
  onChangeStreet,
  onChangeBuilding,
  errors,
}: {
  prefecture: string;
  city: string;
  street: string;
  building: string;
  onChangePrefecture: (v: string) => void;
  onChangeCity: (v: string) => void;
  onChangeStreet: (v: string) => void;
  onChangeBuilding: (v: string) => void;
  errors?: Partial<Record<string, string>>;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel htmlFor="prefecture">都道府県</FieldLabel>
          <Input
            id="prefecture"
            type="text"
            placeholder="東京都"
            value={prefecture}
            onChange={(e) => onChangePrefecture(e.target.value)}
            className="h-10 text-base"
            invalid={!!errors?.prefecture}
          />
          {errors?.prefecture && (
            <p className="mt-1 text-xs text-status-error">{errors.prefecture}</p>
          )}
        </div>
        <div>
          <FieldLabel htmlFor="city">市区町村</FieldLabel>
          <Input
            id="city"
            type="text"
            placeholder="渋谷区"
            value={city}
            onChange={(e) => onChangeCity(e.target.value)}
            className="h-10 text-base"
            invalid={!!errors?.city}
          />
          {errors?.city && (
            <p className="mt-1 text-xs text-status-error">{errors.city}</p>
          )}
        </div>
      </div>
      <div>
        <FieldLabel htmlFor="street">番地</FieldLabel>
        <Input
          id="street"
          type="text"
          placeholder="代々木1-2-3"
          value={street}
          onChange={(e) => onChangeStreet(e.target.value)}
          className="h-10 text-base"
          invalid={!!errors?.street}
        />
        {errors?.street && (
          <p className="mt-1 text-xs text-status-error">{errors.street}</p>
        )}
      </div>
      <div>
        <FieldLabel htmlFor="building">建物名・部屋番号 (任意)</FieldLabel>
        <Input
          id="building"
          type="text"
          placeholder="〇〇マンション101"
          value={building}
          onChange={(e) => onChangeBuilding(e.target.value)}
          className="h-10 text-base"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Google Maps components
// ---------------------------------------------------------------------------

// Custom SVG pin: filled=confirmed, outlined=unconfirmed (per CLAUDE.md §5.9)
function PinSvg({ confirmed }: { confirmed: boolean }) {
  return (
    <svg
      width="28"
      height="36"
      viewBox="0 0 28 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.268 21.732 0 14 0Z"
        fill={confirmed ? '#3370FF' : '#FFFFFF'}
        stroke="#3370FF"
        strokeWidth="2"
      />
      <circle cx="14" cy="14" r="5" fill={confirmed ? '#FFFFFF' : '#3370FF'} />
    </svg>
  );
}

// MapController must be a child of <Map> to use useMap().
// When `target` changes (new object reference = new geocoding result),
// it imperatively pans the map. Drag events don't trigger this because
// they don't update `target`.
function MapController({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !target) return;
    map.panTo(target);
    map.setZoom(17);
  }, [map, target]);
  return null;
}

// ---------------------------------------------------------------------------
// MapPinSection
// ---------------------------------------------------------------------------
function MapPinSection({
  value,
  fullAddress,
  onGeocoded,
  onCoordUpdate,
  onPinConfirmedChange,
  onPinCorrectionNote,
  pinError,
}: {
  value: Pick<
    AddressFormValues,
    | 'latitude'
    | 'longitude'
    | 'googlePlaceId'
    | 'googleFormattedAddress'
    | 'pinConfirmed'
    | 'pinCorrected'
    | 'pinCorrectionNote'
    | 'accuracyStatus'
  >;
  fullAddress: string;
  onGeocoded: (result: {
    latitude: number;
    longitude: number;
    placeId: string | null;
    formattedAddress: string | null;
    googleMapsUrl?: string | null;
    accuracy: string;
  }) => void;
  onCoordUpdate: (lat: number, lng: number, corrected: boolean, note?: string) => void;
  onPinConfirmedChange: (v: boolean) => void;
  onPinCorrectionNote: (note: string) => void;
  pinError?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  // panTarget: a NEW object on each geocoding call → MapController.useEffect fires
  // Dragging the marker does NOT update panTarget → no unwanted re-centering
  const [panTarget, setPanTarget] = useState<{ lat: number; lng: number } | null>(null);

  // Ref so handleDragEnd always reads the latest value without being recreated
  const pinCorrectionNoteRef = useRef(value.pinCorrectionNote);
  pinCorrectionNoteRef.current = value.pinCorrectionNote;

  const handleGeocode = async () => {
    if (!fullAddress.trim()) {
      setGeoError('住所を入力してから地図を確認してください。');
      return;
    }
    setGeoError('');
    setLoading(true);
    try {
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: fullAddress }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          latitude: number;
          longitude: number;
          placeId: string | null;
          formattedAddress: string | null;
          googleMapsUrl?: string | null;
          accuracy: 'google' | 'stub';
        };
        onGeocoded(data);
        // New object reference → MapController pans to this location
        setPanTarget({ lat: data.latitude, lng: data.longitude });
      } else {
        setGeoError('位置情報の取得に失敗しました。');
      }
    } catch {
      setGeoError('位置情報の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = useCallback(
    (e: google.maps.MapMouseEvent) => {
      const lat = e.latLng?.lat();
      const lng = e.latLng?.lng();
      if (lat !== undefined && lng !== undefined) {
        onCoordUpdate(lat, lng, true, pinCorrectionNoteRef.current);
      }
    },
    [onCoordUpdate],
  );

  const handleConfirmPin = useCallback(() => {
    onPinConfirmedChange(true);
  }, [onPinConfirmedChange]);

  const hasCoords = value.latitude !== undefined && value.longitude !== undefined;
  const markerPos = hasCoords
    ? { lat: value.latitude as number, lng: value.longitude as number }
    : null;
  const defaultCenter = markerPos ?? TOKYO_STATION;

  return (
    <div className="space-y-3">
      {/* Geocode trigger button */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={handleGeocode}
          loading={loading}
          className="gap-1.5"
        >
          <MapPin size={16} aria-hidden />
          地図で確認
        </Button>
        {hasCoords && value.accuracyStatus !== 'unconfirmed' && (
          <span className="text-xs text-text-tertiary">
            {value.accuracyStatus === 'stub'
              ? '仮位置'
              : value.accuracyStatus === 'manually_corrected'
                ? '手動修正済み'
                : '取得済み'}
          </span>
        )}
      </div>

      {geoError && <p className="text-xs text-status-error">{geoError}</p>}
      {pinError && <p className="text-xs text-status-error">{pinError}</p>}

      {/* Map display */}
      {MAPS_API_KEY ? (
        <div
          className="aspect-[4/3] w-full overflow-hidden rounded border border-border sm:aspect-video"
          aria-label="地図プレビュー"
        >
          <APIProvider apiKey={MAPS_API_KEY}>
            <Map
              defaultCenter={defaultCenter}
              defaultZoom={hasCoords ? 17 : 12}
              gestureHandling="greedy"
              disableDefaultUI
              mapId={MAP_ID}
              className="h-full w-full"
            >
              <MapController target={panTarget} />
              {markerPos && (
                <AdvancedMarker
                  position={markerPos}
                  draggable
                  onDragEnd={handleDragEnd}
                  title={value.pinConfirmed ? 'ピン確定済み' : 'ドラッグして位置を調整できます'}
                >
                  <PinSvg confirmed={value.pinConfirmed} />
                </AdvancedMarker>
              )}
            </Map>
          </APIProvider>
        </div>
      ) : (
        /* Fallback when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set */
        <div
          className="aspect-[4/3] w-full overflow-hidden rounded border border-border bg-bg-muted sm:aspect-video"
          aria-label="地図プレビュー（APIキー未設定）"
        >
          <div className="flex h-full flex-col items-center justify-center gap-1 px-4 text-center">
            <MapPin size={20} className="text-text-tertiary" aria-hidden />
            <p className="text-sm text-text-tertiary">
              {hasCoords
                ? 'Googleマップ連携は本番環境で有効になります'
                : '住所を入力して「地図で確認」を押してください'}
            </p>
          </div>
        </div>
      )}

      {/* Coordinates summary */}
      {hasCoords && (
        <div className="rounded border border-border bg-bg-subtle px-3 py-2 text-xs text-text-tertiary tabular-nums">
          <span>
            緯度: {value.latitude?.toFixed(6)} / 経度: {value.longitude?.toFixed(6)}
          </span>
          {value.googleFormattedAddress && (
            <p className="mt-1 text-text-secondary">{value.googleFormattedAddress}</p>
          )}
          <a
            href={buildGoogleMapsUrl(value.latitude as number, value.longitude as number)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-brand-primary hover:underline"
          >
            <ExternalLink size={13} aria-hidden />
            Googleマップで開く
          </a>
        </div>
      )}

      {/* Pin correction memo — shown after drag */}
      {value.pinCorrected && (
        <div>
          <label
            htmlFor="pin-correction-note"
            className="mb-1 block text-sm font-medium text-text-secondary"
          >
            修正メモ{' '}
            <span className="font-normal text-text-tertiary">(任意)</span>
          </label>
          <textarea
            id="pin-correction-note"
            value={value.pinCorrectionNote ?? ''}
            onChange={(e) => onPinCorrectionNote(e.target.value)}
            placeholder="例: 玄関の位置に修正"
            className="h-16 w-full resize-none rounded border border-border px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-primary focus:outline-none"
          />
        </div>
      )}

      {/* Pin confirm toggle — below the map, never overlaid */}
      {hasCoords && (
        value.pinConfirmed ? (
          <div className="inline-flex items-center gap-1.5 rounded border border-status-success bg-[#E8F8EE] px-2 py-1 text-xs font-medium text-[#00913A]">
            <CheckCircle2 size={14} aria-hidden />
            確定済み
          </div>
        ) : (
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={handleConfirmPin}
            className="gap-1.5"
          >
            ピン位置を確定
          </Button>
        )
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main AddressForm
// ---------------------------------------------------------------------------
export function AddressForm({ value, onChange, errors }: AddressFormProps) {
  const valueRef = useRef(value);
  valueRef.current = value;

  const update = useCallback(
    (partial: Partial<AddressFormValues>) => {
      onChange({ ...valueRef.current, ...partial });
    },
    [onChange],
  );

  const fullAddress = [value.prefecture, value.city, value.street, value.building]
    .filter(Boolean)
    .join('');

  return (
    <div className="space-y-4">
      <PostalCodeField
        value={value.postalCode}
        onChange={(v) => update({ postalCode: v })}
        onFill={(postalCode, prefecture, city) => update({ postalCode, prefecture, city })}
        error={errors?.postalCode}
      />

      <AddressFields
        prefecture={value.prefecture}
        city={value.city}
        street={value.street}
        building={value.building}
        onChangePrefecture={(v) => update({ prefecture: v })}
        onChangeCity={(v) => update({ city: v })}
        onChangeStreet={(v) => update({ street: v })}
        onChangeBuilding={(v) => update({ building: v })}
        errors={errors}
      />

      <MapPinSection
        value={value}
        fullAddress={fullAddress}
        onGeocoded={(result) =>
          update({
            latitude: result.latitude,
            longitude: result.longitude,
            googlePlaceId: result.placeId ?? undefined,
            googleFormattedAddress: result.formattedAddress ?? undefined,
            googleMapsUrl:
              result.googleMapsUrl ?? buildGoogleMapsUrl(result.latitude, result.longitude),
            accuracyStatus: result.accuracy === 'google' ? 'google_auto' : 'stub',
          })
        }
        onCoordUpdate={(lat, lng, corrected, note) =>
          update({
            latitude: lat,
            longitude: lng,
            googleMapsUrl: buildGoogleMapsUrl(lat, lng),
            pinCorrected: corrected,
            accuracyStatus: corrected ? 'manually_corrected' : value.accuracyStatus,
            pinCorrectionNote: note,
          })
        }
        onPinConfirmedChange={(v) =>
          update({
            pinConfirmed: v,
            accuracyStatus: v ? 'customer_verified' : value.accuracyStatus,
          })
        }
        onPinCorrectionNote={(note) => update({ pinCorrectionNote: note })}
        pinError={errors?.pinConfirmed}
      />
    </div>
  );
}
