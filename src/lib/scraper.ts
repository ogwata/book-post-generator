import * as cheerio from 'cheerio';
import type { BookInfo } from '@/types';

/**
 * 書誌情報ページから情報をスクレイピング
 * OGタグ、JSON-LD、一般的なセレクタを使用
 */
export async function scrapeBookInfo(url: string): Promise<BookInfo> {
  const isAmazon = url.includes('amazon.co.jp') || url.includes('amazon.com');
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': isAmazon ? 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7' : 'ja,en-US;q=0.9,en;q=0.8',
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
  // 書名: h1.book-title を優先
  const title =
    $('h1.book-title').text().trim() ||
    ogTag($, 'og:title').replace(/\s*\|.*$/, '') || // 「| Booko出版」を除去
    '';

  // 著者名: h2.writer から「著者：」プレフィックスを除去
  let author = $('h2.writer').text().trim();
  author = author.replace(/^著者[：:]\s*/, '');
  if (!author) {
    author = extractAuthor($);
  }

  // 価格: div.infos-list 内の「価格：」を含む li
  let price = '';
  $('.infos-list li').each((_, el) => {
    const text = $(el).text().trim();
    if (text.includes('価格')) {
      price = text.replace(/^価格[：:]\s*/, '');
    }
  });
  if (!price) {
    price = extractPrice($);
  }

  // 書影: スライダー内の最初の画像を優先、OGタグにフォールバック
  const coverImage =
    $('.detail-slider .swiper-slide:first-child .ph-box img').attr('src') ||
    ogTag($, 'og:image') ||
    '';

  // 内容紹介: div.outline-txt 内のテキスト（見出し・リスト含む）
  let description = '';
  const outlineTxt = $('.outline-txt');
  if (outlineTxt.length) {
    // 最初の数段落を取得（レシピ一覧は除外）
    const paragraphs: string[] = [];
    outlineTxt.children('h2, p').each((_, el) => {
      const text = $(el).text().trim();
      if (text && paragraphs.join('').length < 500) {
        paragraphs.push(text);
      }
    });
    // 「この本の特徴」リストも取得
    outlineTxt.find('ul').first().find('li').each((_, el) => {
      const text = $(el).text().trim();
      if (text) paragraphs.push('・' + text);
    });
    description = paragraphs.join('\n');
  }
  if (!description) {
    description = ogTag($, 'og:description') || extractDescription($);
  }

  return { title, author, price, coverImage, description, url };
}

/** Amazon用スクレイパー */
function scrapeAmazon($: cheerio.CheerioAPI, url: string): BookInfo {
  // タイトル
  const title =
    $('#productTitle').text().trim() ||
    $('h1#title span').first().text().trim() ||
    ogTag($, 'og:title').replace(/\s*[:|].*Amazon.*$/i, '').trim() ||
    '';

  // 著者: #bylineInfo から取得
  let author = '';
  const bylineInfo = $('#bylineInfo');
  if (bylineInfo.length) {
    author = bylineInfo.find('.author:not(.userReviewCountSection) a').first().text().trim();
    if (!author) {
      author = bylineInfo.find('.contributorNameID').first().text().trim();
    }
    if (!author) {
      // 「著」「訳」などの役割ラベルの後ろのテキスト
      author = bylineInfo.find('a.a-link-normal').first().text().trim();
    }
  }
  if (!author) {
    author =
      $('[data-feature-name="byline"] a').first().text().trim() ||
      $('.author a').first().text().trim() ||
      '';
  }

  // 価格: 複数の候補セレクターを試行
  const price =
    $('span.a-price span.a-offscreen').first().text().trim() ||
    $('#price_inside_buybox').text().trim() ||
    $('#listPrice').text().trim() ||
    $('#kindle-price').text().trim() ||
    $('span#price').text().trim() ||
    '';

  // 書影: data-a-dynamic-image JSON から最高解像度を選択
  let coverImage = '';
  const imgEl = $('#landingImage, #imgBlkFront').first();
  if (imgEl.length) {
    const dynamicImages = imgEl.attr('data-a-dynamic-image');
    if (dynamicImages) {
      try {
        const imgMap = JSON.parse(dynamicImages) as Record<string, [number, number]>;
        let maxArea = 0;
        for (const [imgUrl, dims] of Object.entries(imgMap)) {
          const area = dims[0] * dims[1];
          if (area > maxArea) {
            maxArea = area;
            coverImage = imgUrl;
          }
        }
      } catch {
        // ignore
      }
    }
    if (!coverImage) {
      coverImage = imgEl.attr('src') || '';
    }
  }
  if (!coverImage) {
    coverImage = ogTag($, 'og:image') || '';
  }

  // 内容紹介: noscript版（JavaScript不要）を優先
  let description = '';
  const descNoscript = $('#bookDescription_feature_div noscript');
  if (descNoscript.length) {
    const inner = descNoscript.html() || '';
    const inner$ = cheerio.load(inner);
    description = inner$('body').text().replace(/\s+/g, ' ').trim();
  }
  if (!description) {
    description =
      $('#bookDescription_feature_div span:not(#bookDescription_feature_div_truncated_content span)').first().text().trim() ||
      $('#productDescription p').text().trim() ||
      ogTag($, 'og:description') ||
      '';
  }

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

/**
 * OGタグの取得（空でない最初の値を返す）
 * 同じpropertyのメタタグが複数ある場合、空でない最初のものを使用
 */
function ogTag($: cheerio.CheerioAPI, property: string): string {
  let result = '';
  $(`meta[property="${property}"]`).each((_, el) => {
    if (!result) {
      const content = $(el).attr('content')?.trim();
      if (content) result = content;
    }
  });
  if (!result) {
    $(`meta[name="${property}"]`).each((_, el) => {
      if (!result) {
        const content = $(el).attr('content')?.trim();
        if (content) result = content;
      }
    });
  }
  return result;
}

/** 著者名の抽出 */
function extractAuthor($: cheerio.CheerioAPI): string {
  // 一般的な著者表示パターン
  const selectors = [
    'h2.writer',
    '.author',
    '.book-author',
    '[itemprop="author"]',
    'a[rel="author"]',
    '.writer',
  ];
  for (const sel of selectors) {
    let text = $(sel).first().text().trim();
    if (text) {
      // 「著者：」等のプレフィックスを除去
      text = text.replace(/^(?:著者|著|作者)[：:]\s*/, '');
      return text;
    }
  }

  // テキストからの抽出（「著者：」「著：」パターン）
  const bodyText = $('body').text();
  const authorMatch = bodyText.match(/(?:著者|著|作者)[：:]\s*(.+?)[\s\n]/);
  if (authorMatch) return authorMatch[1].trim();

  return '';
}

/** 価格の抽出 */
function extractPrice($: cheerio.CheerioAPI): string {
  // infos-list パターン（Booko等）
  let price = '';
  $('.infos-list li').each((_, el) => {
    const text = $(el).text().trim();
    if (text.includes('価格')) {
      price = text.replace(/^価格[：:]\s*/, '');
    }
  });
  if (price) return price;

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
    '.outline-txt',
    '[itemprop="description"]',
    '.book-description',
    '.description',
    '.entry-content p',
    'article p',
  ];
  for (const sel of selectors) {
    const el = $(sel).first();
    if (el.length) {
      // ブロック要素の場合はテキストを連結
      const text = el.find('p, li').map((_, child) => $(child).text().trim()).get().join('\n') || el.text().trim();
      if (text && text.length > 20) return text;
    }
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
