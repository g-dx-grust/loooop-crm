import { NextRequest, NextResponse } from 'next/server';

interface GeocodeResult {
  latitude: number;
  longitude: number;
  placeId: string | null;
  formattedAddress: string | null;
  googleMapsUrl: string;
  accuracy: 'google' | 'stub';
}

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
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { address?: string };
  const address = body.address?.trim();

  if (!address) {
    return NextResponse.json({ error: '住所を入力してください。' }, { status: 400 });
  }

  const googleKey = process.env.GOOGLE_MAPS_SERVER_KEY;

  if (!googleKey) {
    // STUB mode — return Tokyo station coordinates
    const latitude = 35.6762;
    const longitude = 139.6503;
    const result: GeocodeResult = {
      latitude,
      longitude,
      placeId: null,
      formattedAddress: null,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
      accuracy: 'stub',
    };
    return NextResponse.json(result);
  }

  // Real Google Geocoding API call
  try {
    const encoded = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&language=ja&region=JP&key=${googleKey}`;
    const res = await fetch(url);
    const data = (await res.json()) as GoogleGeocodeResponse & { error_message?: string };

    console.log('[geocode] status:', data.status, '| address:', address);

    if (data.status !== 'OK' || !data.results[0]) {
      if (data.error_message) {
        console.error('[geocode] error_message:', data.error_message);
      }
      return NextResponse.json(
        {
          error: '住所の位置情報を取得できませんでした。',
          googleStatus: data.status,
          googleErrorMessage: data.error_message ?? null,
          sentAddress: address,
        },
        { status: 404 },
      );
    }

    const first = data.results[0];
    const latitude = first.geometry.location.lat;
    const longitude = first.geometry.location.lng;
    console.log('[geocode] OK → formatted_address:', first.formatted_address);
    const result: GeocodeResult = {
      latitude,
      longitude,
      placeId: first.place_id,
      formattedAddress: first.formatted_address,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
      accuracy: 'google',
    };
    return NextResponse.json(result);
  } catch (err) {
    console.error('[geocode] fetch error:', err);
    return NextResponse.json({ error: 'ジオコーディングに失敗しました。', sentAddress: address }, { status: 500 });
  }
}
