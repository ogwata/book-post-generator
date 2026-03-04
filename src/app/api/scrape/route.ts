import { NextRequest, NextResponse } from 'next/server';
import { scrapeBookInfo } from '@/lib/scraper';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URLが指定されていません' },
        { status: 400 }
      );
    }

    // URL形式の検証
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: '有効なURLを入力してください' },
        { status: 400 }
      );
    }

    const bookInfo = await scrapeBookInfo(url);

    return NextResponse.json(bookInfo);
  } catch (err: any) {
    console.error('Scrape error:', err);
    return NextResponse.json(
      { error: err.message || 'スクレイピングに失敗しました' },
      { status: 500 }
    );
  }
}
