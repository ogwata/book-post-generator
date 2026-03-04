import crypto from 'crypto';
import type { XSettings } from '@/types';

/**
 * OAuth 1.0a 署名生成
 */
function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  const baseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams),
  ].join('&');

  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

  return crypto
    .createHmac('sha1', signingKey)
    .update(baseString)
    .digest('base64');
}

/**
 * OAuth 1.0a Authorization ヘッダー生成
 */
function buildOAuthHeader(
  method: string,
  url: string,
  settings: XSettings,
  extraParams: Record<string, string> = {}
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: settings.apiKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: settings.accessToken,
    oauth_version: '1.0',
  };

  const allParams = { ...oauthParams, ...extraParams };

  const signature = generateOAuthSignature(
    method,
    url,
    allParams,
    settings.apiSecret,
    settings.accessTokenSecret
  );

  oauthParams['oauth_signature'] = signature;

  const headerParts = Object.keys(oauthParams)
    .sort()
    .map((key) => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');

  return `OAuth ${headerParts}`;
}

/**
 * メディア（画像）のアップロード
 */
async function uploadMedia(
  imageUrl: string,
  settings: XSettings
): Promise<string | null> {
  try {
    // 画像をフェッチ
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return null;

    const imgBuffer = await imgRes.arrayBuffer();
    const base64Data = Buffer.from(imgBuffer).toString('base64');

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const mediaType = contentType.includes('png') ? 'image/png' : 'image/jpeg';

    // X media upload endpoint (v1.1)
    const uploadUrl = 'https://upload.twitter.com/1.1/media/upload.json';

    const params: Record<string, string> = {
      media_data: base64Data,
      media_category: 'tweet_image',
    };

    const authHeader = buildOAuthHeader('POST', uploadUrl, settings);

    const formData = new URLSearchParams();
    formData.append('media_data', base64Data);
    formData.append('media_category', 'tweet_image');

    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!res.ok) {
      console.error('Media upload failed:', await res.text());
      return null;
    }

    const data = await res.json();
    return data.media_id_string || null;
  } catch (err) {
    console.error('Media upload error:', err);
    return null;
  }
}

/**
 * ツイート投稿
 */
export async function postTweet(
  text: string,
  imageUrl: string | undefined,
  settings: XSettings
): Promise<{ id: string; url: string }> {
  // 画像がある場合はアップロード
  let mediaId: string | null = null;
  if (imageUrl) {
    mediaId = await uploadMedia(imageUrl, settings);
  }

  // ツイート作成 (v2)
  const tweetUrl = 'https://api.twitter.com/2/tweets';

  const body: any = { text };
  if (mediaId) {
    body.media = { media_ids: [mediaId] };
  }

  const authHeader = buildOAuthHeader('POST', tweetUrl, settings);

  const res = await fetch(tweetUrl, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`X API エラー (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const tweetId = data.data?.id;

  return {
    id: tweetId,
    url: `https://x.com/i/status/${tweetId}`,
  };
}
