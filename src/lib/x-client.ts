import crypto from 'crypto';
import OAuth from 'oauth-1.0a';
import type { XSettings } from '@/types';

/**
 * OAuth 1.0a クライアントを生成
 */
function createOAuthClient(settings: XSettings) {
  return new OAuth({
    consumer: {
      key: settings.apiKey,
      secret: settings.apiSecret,
    },
    signature_method: 'HMAC-SHA1',
    hash_function(baseString: string, key: string) {
      return crypto.createHmac('sha1', key).update(baseString).digest('base64');
    },
  });
}

/**
 * OAuth 1.0a Authorization ヘッダーを生成
 */
function getAuthHeader(
  settings: XSettings,
  request: { url: string; method: string; data?: Record<string, string> }
): string {
  const oauth = createOAuthClient(settings);
  const token = {
    key: settings.accessToken,
    secret: settings.accessTokenSecret,
  };
  const authorization = oauth.authorize(request, token);
  const header = oauth.toHeader(authorization);
  return header.Authorization;
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

    // X media upload endpoint (v1.1)
    const uploadUrl = 'https://upload.twitter.com/1.1/media/upload.json';

    // OAuth署名にはmedia_dataを含めない（大きすぎるため X API の仕様）
    // media_category のみ署名に含める
    const signatureData: Record<string, string> = {
      media_category: 'tweet_image',
    };

    const authHeader = getAuthHeader(settings, {
      url: uploadUrl,
      method: 'POST',
      data: signatureData,
    });

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
      const errText = await res.text();
      console.error('Media upload failed:', errText);
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

  const body: Record<string, unknown> = { text };
  if (mediaId) {
    body.media = { media_ids: [mediaId] };
  }

  // JSON ボディの場合、署名にボディパラメータを含めない
  const authHeader = getAuthHeader(settings, {
    url: tweetUrl,
    method: 'POST',
  });

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
