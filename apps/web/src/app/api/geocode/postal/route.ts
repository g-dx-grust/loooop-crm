import { NextRequest, NextResponse } from 'next/server';

interface ZipCloudResult {
  address1: string; // prefecture
  address2: string; // city
  address3: string; // town
  kana1: string;
  kana2: string;
  kana3: string;
  prefcode: string;
  zipcode: string;
}

interface ZipCloudResponse {
  message: string | null;
  results: ZipCloudResult[] | null;
  status: number;
}

export async function GET(req: NextRequest) {
  const zipcode = req.nextUrl.searchParams.get('zipcode')?.replace(/-/g, '');

  if (!zipcode || !/^\d{7}$/.test(zipcode)) {
    return NextResponse.json({ error: '郵便番号は7桁の数字で入力してください。' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zipcode}`,
      { next: { revalidate: 86400 } }, // cache 1 day
    );
    const data = (await res.json()) as ZipCloudResponse;

    if (!data.results || data.results.length === 0) {
      return NextResponse.json({ error: '該当する住所が見つかりませんでした。' }, { status: 404 });
    }

    const first = data.results[0];
    if (!first) {
      return NextResponse.json({ error: '該当する住所が見つかりませんでした。' }, { status: 404 });
    }
    return NextResponse.json({
      prefecture: first.address1,
      city: first.address2,
      town: first.address3,
    });
  } catch {
    return NextResponse.json({ error: '郵便番号検索に失敗しました。' }, { status: 500 });
  }
}
