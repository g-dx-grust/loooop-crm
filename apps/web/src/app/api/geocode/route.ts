import { NextRequest, NextResponse } from 'next/server';

interface GeocodeSuccess {
  success: true;
  latitude: number;
  longitude: number;
  placeId: string | null;
  formattedAddress: string | null;
  googleMapsUrl: string;
  accuracy: 'google' | 'stub';
}

interface GeocodeFailure {
  success: false;
  error: string;
  googleStatus?: string;
  googleErrorMessage?: string | null;
  sentAddress?: string;
}

type GeocodeResult = GeocodeSuccess | GeocodeFailure;

interface GoogleGeocodeResult {
  place_id: string;
  formatted_address: string;
  geometry: {
    location: { lat: number; lng: number };
  };
}

interface GoogleGeocodeResponse {
  results: GoogleGeocodeResult[];
  status: string;
  error_message?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<GeocodeResult>> {
  let address: string | undefined;

  try {
    const body = (await req.json()) as { address?: string };
    address = body.address?.trim();
  } catch {
    return NextResponse.json({ success: false, error: 'リクエストの形式が正しくありません。' });
  }

  if (!address) {
    return NextResponse.json({ success: false, error: '住所を入力してください。' });
  }

  const googleKey = process.env.GOOGLE_MAPS_SERVER_KEY;

  if (!googleKey) {
    // STUB mode — return Tokyo station coordinates
    const latitude = 35.6812;
    const longitude = 139.7671;
    console.log('[geocode] STUB mode (GOOGLE_MAPS_SERVER_KEY not set)');
    return NextResponse.json({
      success: true,
      latitude,
      longitude,
      placeId: null,
      formattedAddress: null,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
      accuracy: 'stub',
    });
  }

  try {
    const encoded = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&language=ja&region=JP&key=${googleKey}`;
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      console.error('[geocode] Google API HTTP error:', res.status, res.statusText, '| address:', address);
      return NextResponse.json({
        success: false,
        error: `Google APIへの接続に失敗しました。(HTTP ${res.status})`,
        sentAddress: address,
      });
    }

    const data = (await res.json()) as GoogleGeocodeResponse;
    console.log('[geocode] Google status:', data.status, '| address:', address);

    if (data.status !== 'OK' || !data.results[0]) {
      if (data.error_message) {
        console.error('[geocode] Google error_message:', data.error_message);
      }
      return NextResponse.json({
        success: false,
        error: '住所の位置情報を取得できませんでした。',
        googleStatus: data.status,
        googleErrorMessage: data.error_message ?? null,
        sentAddress: address,
      });
    }

    const first = data.results[0];
    const latitude = first.geometry.location.lat;
    const longitude = first.geometry.location.lng;
    console.log('[geocode] OK → formatted_address:', first.formatted_address);

    return NextResponse.json({
      success: true,
      latitude,
      longitude,
      placeId: first.place_id,
      formattedAddress: first.formatted_address,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
      accuracy: 'google',
    });
  } catch (err) {
    console.error('[geocode] unexpected error:', err, '| address:', address);
    return NextResponse.json({
      success: false,
      error: 'ジオコーディングに失敗しました。',
      sentAddress: address,
    });
  }
}
