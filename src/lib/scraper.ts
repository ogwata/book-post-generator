import * as cheerio from 'cheerio';
import type { BookInfo } from '@/types';

/**
 * 書誌情報ページから情報をスクレイピング
 * OGタグ、JSON-LD、一般的なセレクタを使用
 */
export async function scrapeBookInfo(url: string): Promise<BookInfo> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; BookPostGenerator/1.0)',
      Accept: 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`ページの取得に失敗しました (HTTP ${response.status})`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // サイト固有のスクレイパーを試行
  if (url.includes('books.booko.co.jp')) {
    return scrapeBooko($, url);
  }
  if (url.includes('amazon.co.jp') || url.includes('amazon.com')) {
    return scrapeAmazon($, url);
  }

  // 汎用スクレイパー
  return scrapeGeneric($, url);
}

/** books.booko.co.jp 用スクレイパー */
function scrapeBooko($: cheerio.CheerioAPI, url: string): BookInfo {
  const title =
    $('h1.entry-title').text().trim() ||
    $('h1').first().text().trim() ||
    ogTag($, 'og:title');

  const author = extractAuthor($) || '';
  const price = extractPrice($) || '';
  const coverImage =
    ogTag($, 'og:image') ||
    $('article img').first().attr('src') ||
    $('.entry-content img').first().attr('src') ||
    '';
  const description =
    ogTag($, 'og:description') ||
    $('meta[name="description"]').attr('content') ||
    extractDescription($);

  return { title, author, price, coverImage, description, url };
}

/** Amazon用スクレイパー */
function scrapeAmazon($: cheerio.CheerioAPI, url: string): BookInfo {
  const title =
    $('#productTitle').text().trim() ||
    ogTag($, 'og:title');
  const author =
    $('.author a').first().text().trim() ||
    $('span.author').first().text().trim() ||
    '';
  const price =
    $('span.a-price span.a-offscreen').first().text().trim() ||
    $('#price').text().trim() ||
    '';
  const coverImage =
    $('#imgBlkFront').attr('src') ||
    $('#landingImage').attr('src') ||
    ogTag($, 'og:image') ||
    '';
  const description =
    $('#bookDescription_feature_div span').text().trim() ||
    ogTag($, 'og:description') ||
    '';

  return { title, author, price, coverImage, description, url };
}

/** 汎用スクレイパー */
function scrapeGeneric($: cheerio.CheerioAPI, url: string): BookInfo {
  // JSON-LDからの抽出を試行
  const jsonLd = extractJsonLd($);
  if (jsonLd) {
    return {
      title: jsonLd.name || ogTag($, 'og:title') || $('title').text().trim(),
      author: jsonLd.author?.name || jsonLd.author || extractAuthor($) || '',
      price: jsonLd.offers?.price
        ? `${jsonLd.offers.price}${jsonLd.offers.priceCurrency || '円'}`
        : extractPrice($) || '',
      coverImage: jsonLd.image || ogTag($, 'og:image') || '',
      description:
        jsonLd.description || ogTag($, 'og:description') || extractDescription($),
      url,
    };
  }

  // OGタグとHTML要素からの抽出
  const title = ogTag($, 'og:title') || $('h1').first().text().trim() || $('title').text().trim();
  const author = extractAuthor($) || '';
  const price = extractPrice($) || '';
  const coverImage = ogTag($, 'og:image') || $('img[src*="cover"]').first().attr('src') || '';
  const description = ogTag($, 'og:description') || extractDescription($);

  return { title, author, price, coverImage, description, url };
}

/** OGタグの取得 */
function ogTag($: cheerio.CheerioAPI, property: string): string {
  return (
    $(`meta[property="${property}"]`).attr('content') ||
    $(`meta[name="${property}"]`).attr('content') ||
    ''
  );
}

/** 著者名の抽出 */
function extractAuthor($: cheerio.CheerioAPI): string {
  // 一般的な著者表示パターン
  const selectors = [
    '.author',
    '.book-author',
    '[itemprop="author"]',
    'a[rel="author"]',
    '.writer',
  ];
  for (const sel of selectors) {
    const text = $(sel).first().text().trim();
    if (text) return text;
  }

  // テキストからの抽出（「著者：」「著：」パターン）
  const bodyText = $('body').text();
  const authorMatch = bodyText.match(/(?:著者|著|作者)[：:]\s*(.+?)[\s\n]/);
  if (authorMatch) return authorMatch[1].trim();

  return '';
}

/** 価格の抽出 */
function extractPrice($: cheerio.CheerioAPI): string {
  const selectors = [
    '.price',
    '.book-price',
    '[itemprop="price"]',
    '.amount',
  ];
  for (const sel of selectors) {
    const text = $(sel).first().text().trim();
    if (text) return text;
  }

  // テキストからの抽出（価格パターン）
  const bodyText = $('body').text();
  const priceMatch = bodyText.match(
    /(?:価格|定価|本体)[：:]?\s*[￥¥]?([\d,]+)\s*円/
  );
  if (priceMatch) return `${priceMatch[1]}円`;

  return '';
}

/** 内容紹介の抽出 */
function extractDescription($: cheerio.CheerioAPI): string {
  const selectors = [
    '[itemprop="description"]',
    '.book-description',
    '.description',
    '.entry-content p',
    'article p',
  ];
  for (const sel of selectors) {
    const text = $(sel).first().text().trim();
    if (text && text.length > 20) return text;
  }
  return $('meta[name="description"]').attr('content') || '';
}

/** JSON-LD構造化データの抽出 */
function extractJsonLd($: cheerio.CheerioAPI): any {
  const scripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < scripts.length; i++) {
    try {
      const data = JSON.parse($(scripts[i]).html() || '');
      if (data['@type'] === 'Book' || data['@type'] === 'Product') {
        return data;
      }
      // @graphの中を探す
      if (Array.isArray(data['@graph'])) {
        const book = data['@graph'].find(
          (item: any) => item['@type'] === 'Book' || item['@type'] === 'Product'
        );
        if (book) return book;
      }
    } catch {
      continue;
    }
  }
  return null;
}
