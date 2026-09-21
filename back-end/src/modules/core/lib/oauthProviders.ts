// @ts-nocheck
import crypto from 'node:crypto';
import { now } from '../db.js';
// Instagram & Meta OAuth configuration reload

export interface SocialChannelStats {
  platform: string;
  handle: string;
  url: string;
  displayName: string;
  followers: number;
  avatarUrl?: string;
  verified: boolean;
  verificationSource: string;
  verifiedAt: number;
  isPersonalAccount?: boolean;
  notice?: string;
}

export interface OAuthSessionData {
  status: string;
  platform?: string;
  stats?: SocialChannelStats;
  error?: string;
  codeVerifier?: string;
  updatedAt?: number;
}

const oauthSessions = new Map<string, OAuthSessionData>();

export function setOAuthSession(state: string, data: Partial<OAuthSessionData>) {
  if (!state) return;
  const existing = oauthSessions.get(state) || { status: 'pending' };
  oauthSessions.set(state, { ...existing, ...data, updatedAt: Date.now() });
  if (oauthSessions.size > 200) {
    const cutoff = Date.now() - 15 * 60 * 1000;
    for (const [k, v] of oauthSessions.entries()) {
      if ((v.updatedAt || 0) < cutoff) oauthSessions.delete(k);
    }
  }
}

let lastTikTokCodeVerifier: string | null = null;

export function getOAuthSession(state: string) {
  if (!state) return null;
  return oauthSessions.get(state) || null;
}

export function getOAuthRedirectUri(env: any, platform: string, requestOrigin?: string): string {
  const normalized = String(platform || '').toLowerCase();
  if (normalized === 'youtube' && env?.GOOGLE_REDIRECT_URI) {
    return String(env.GOOGLE_REDIRECT_URI).trim();
  }
  if (normalized === 'tiktok' && env?.TIKTOK_REDIRECT_URI) {
    return String(env.TIKTOK_REDIRECT_URI).trim();
  }
  if (normalized === 'instagram' && env?.INSTAGRAM_REDIRECT_URI) {
    return String(env.INSTAGRAM_REDIRECT_URI).trim();
  }
  if (normalized === 'facebook' && env?.META_REDIRECT_URI) {
    return String(env.META_REDIRECT_URI).trim();
  }
  if (normalized === 'threads' && env?.THREADS_REDIRECT_URI) {
    return String(env.THREADS_REDIRECT_URI).trim();
  }

  // 1. Explicit BACKEND_ORIGIN configured in env
  if (env?.BACKEND_ORIGIN) {
    const origin = String(env.BACKEND_ORIGIN).trim().replace(/\/+$/, '');
    return `${origin}/api/oauth/social/callback`;
  }

  // 2. Infer origin from any other configured platform redirect URI in env (e.g. THREADS_REDIRECT_URI = https://kocviet.com/...)
  const otherRedirectUri =
    env?.THREADS_REDIRECT_URI ||
    env?.INSTAGRAM_REDIRECT_URI ||
    env?.TIKTOK_REDIRECT_URI ||
    env?.META_REDIRECT_URI;
  if (otherRedirectUri) {
    try {
      const u = new URL(String(otherRedirectUri).trim());
      if (u.protocol && u.host && !u.host.includes('localhost') && !u.host.includes('127.0.0.1')) {
        return `${u.origin}/api/oauth/social/callback`;
      }
    } catch (_) {}
  }

  // 3. Fall back to requestOrigin if provided and not localhost
  if (requestOrigin) {
    try {
      const u = new URL(String(requestOrigin).trim());
      const forbiddenDomains = ['instagram.com', 'facebook.com', 'threads.net', 'tiktok.com', 'google.com', 'accounts.google.com'];
      const isThirdParty = forbiddenDomains.some(d => u.host === d || u.host.endsWith('.' + d));
      if (!isThirdParty && u.protocol && u.host && !u.host.includes('localhost') && !u.host.includes('127.0.0.1')) {
        const host = u.host.replace(/^www\./i, '');
        return `${u.protocol}//${host}/api/oauth/social/callback`;
      }
    } catch (_) {}
  }

  // 4. Fallback for production or public platforms
  const isProd = env?.NODE_ENV === 'production' || process.env.NODE_ENV === 'production';
  if (isProd) {
    return 'https://kocviet.com/api/oauth/social/callback';
  }

  // 5. Localhost fallback
  const origin = `http://localhost:${env?.PORT || 3000}`;
  return `${origin}/api/oauth/social/callback`;
}

export function getSocialAuthUrl(
  env: any,
  platform: string,
  state: string,
  requestOrigin?: string,
): { url: string; isMock: boolean; redirectUri: string } {
  const normalizedPlatform = String(platform || '').toLowerCase();
  const redirectUri = getOAuthRedirectUri(env, platform, requestOrigin);

  if (normalizedPlatform === 'youtube') {
    const clientId = String(env.GOOGLE_CLIENT_ID || '').trim();
    if (!clientId) {
      return {
        url: `/api/oauth/social/dev-connect?platform=YouTube&state=${encodeURIComponent(state)}`,
        isMock: true,
        redirectUri,
      };
    }

    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    setOAuthSession(state, { status: 'pending', platform: 'YouTube', codeVerifier });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/userinfo.profile',
      access_type: 'offline',
      include_granted_scopes: 'true',
      state,
      prompt: 'consent',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, isMock: false, redirectUri };
  }

  if (normalizedPlatform === 'tiktok') {
    const clientKey = String(env.TIKTOK_CLIENT_KEY || '').trim();
    if (!clientKey) {
      return {
        url: `/api/oauth/social/dev-connect?platform=TikTok&state=${encodeURIComponent(state)}`,
        isMock: true,
        redirectUri,
      };
    }

    // TikTok Login Kit v2 strictly requires PKCE (code_challenge & code_verifier)
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    lastTikTokCodeVerifier = codeVerifier;
    
    // Store codeVerifier in oauthSession for later token exchange
    setOAuthSession(state, { status: 'pending', codeVerifier });

    const params = new URLSearchParams({
      client_key: clientKey,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'user.info.basic,user.info.profile,user.info.stats',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    return { url: `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`, isMock: false, redirectUri };
  }

  if (normalizedPlatform === 'instagram') {
    const appId = String(env.INSTAGRAM_APP_ID || '1064282613121655').trim();
    const params = new URLSearchParams({
      force_reauth: 'true',
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'instagram_business_basic,instagram_business_manage_insights',
      state,
    });
    return { url: `https://www.instagram.com/oauth/authorize?${params.toString()}`, isMock: false, redirectUri, appId };
  }

  if (normalizedPlatform === 'facebook') {
    const appId = String(env.META_APP_ID || '').trim();
    if (!appId) {
      return {
        url: `/api/oauth/social/dev-connect?platform=${encodeURIComponent(platform)}&state=${encodeURIComponent(state)}`,
        isMock: true,
        redirectUri,
      };
    }
    const scope = String(env.META_SCOPES || 'public_profile').trim();
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope,
      state,
    });
    return { url: `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`, isMock: false, redirectUri };
  }

  if (normalizedPlatform === 'threads') {
    const appId = String(env.THREADS_APP_ID || env.META_APP_ID || '').trim();
    if (!appId) {
      return {
        url: `/api/oauth/social/dev-connect?platform=Threads&state=${encodeURIComponent(state)}`,
        isMock: true,
        redirectUri,
      };
    }
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'threads_basic,threads_manage_insights',
      state,
    });
    return { url: `https://threads.net/oauth/authorize?${params.toString()}`, isMock: false, redirectUri };
  }

  return {
    url: `/api/oauth/social/dev-connect?platform=${encodeURIComponent(platform)}&state=${encodeURIComponent(state)}`,
    isMock: true,
    redirectUri,
  };
}

export async function exchangeOAuthCode(
  env: any,
  platform: string,
  code: string,
  codeVerifier?: string,
  requestOrigin?: string,
  explicitRedirectUri?: string,
  explicitAppId?: string,
): Promise<SocialChannelStats> {
  const normalizedPlatform = String(platform || '').toLowerCase();
  const redirectUri = explicitRedirectUri || getOAuthRedirectUri(env, platform, requestOrigin);
  const verifiedAt = now();

  if (normalizedPlatform === 'youtube') {
    const clientId = String(env.GOOGLE_CLIENT_ID || '').trim();
    const clientSecret = String(env.GOOGLE_CLIENT_SECRET || '').trim();
    if (!clientId || !clientSecret) {
      throw new Error('Chưa cấu hình GOOGLE_CLIENT_ID hoặc GOOGLE_CLIENT_SECRET');
    }

    const tokenParams: Record<string, string> = {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    };
    if (codeVerifier) {
      tokenParams.code_verifier = codeVerifier;
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(tokenParams),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'Lỗi đổi token Google/YouTube');
    }

    const ytRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      },
    );
    const ytData = await ytRes.json();
    const item = ytData?.items?.[0];
    if (!item) {
      throw new Error('Không tìm thấy kênh YouTube nào của tài khoản Google này');
    }

    const stats = item.statistics || {};
    const snippet = item.snippet || {};
    let handle = '';
    if (snippet.customUrl) {
      handle = `https://www.youtube.com/${snippet.customUrl.startsWith('@') ? snippet.customUrl : '@' + snippet.customUrl}`;
    } else if (item.id) {
      handle = `https://www.youtube.com/channel/${item.id}`;
    } else {
      handle = `https://www.youtube.com/@${encodeURIComponent(snippet.title || 'channel')}`;
    }
    const followers = parseInt(stats.subscriberCount || '0', 10);

    return {
      platform: 'YouTube',
      handle,
      url: handle,
      displayName: snippet.title || 'Kênh YouTube',
      followers: isNaN(followers) ? 0 : followers,
      avatarUrl: snippet.thumbnails?.default?.url || '',
      verified: true,
      verificationSource: 'oauth2_google',
      verifiedAt,
    };
  }

  if (normalizedPlatform === 'tiktok') {
    const clientKey = String(env.TIKTOK_CLIENT_KEY || '').trim();
    const clientSecret = String(env.TIKTOK_CLIENT_SECRET || '').trim();
    if (!clientKey || !clientSecret) {
      throw new Error('Chưa cấu hình TIKTOK_CLIENT_KEY hoặc TIKTOK_CLIENT_SECRET');
    }

    const tokenParams: Record<string, string> = {
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    };
    const verifier = codeVerifier || lastTikTokCodeVerifier;
    if (verifier) {
      tokenParams.code_verifier = verifier;
    }

    let tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(tokenParams),
    });
    let tokenData = await tokenRes.json();

    // If failed and code_verifier was included, retry without code_verifier
    if (!tokenData?.data?.access_token && !tokenData?.access_token && tokenParams.code_verifier) {
      delete tokenParams.code_verifier;
      const retryRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(tokenParams),
      });
      const retryData = await retryRes.json();
      if (retryData?.data?.access_token || retryData?.access_token) {
        tokenData = retryData;
      }
    }

    const accessToken = tokenData?.data?.access_token || tokenData?.access_token;
    if (!accessToken) {
      const rawMsg = tokenData?.error_description || tokenData?.message || tokenData?.error || 'Lỗi đổi token TikTok';
      console.error('[TikTok OAuth Error]', JSON.stringify(tokenData));
      if (rawMsg.includes('Client key or secret is incorrect')) {
        throw new Error('TikTok báo lỗi "Client key or secret is incorrect". Vui lòng bấm vào biểu tượng con mắt trên TikTok Developer để hiện và copy lại chính xác Client Secret.');
      }
      throw new Error(rawMsg);
    }

    const userRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,follower_count,profile_deep_link,username', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userData = await userRes.json();
    const user = userData?.data?.user || {};
    const username = user.username || user.display_name || 'user';
    const handle = `https://www.tiktok.com/@${username.replace(/^@+/, '')}`;
    const followers = Number(user.follower_count || 0);

    return {
      platform: 'TikTok',
      handle,
      url: handle,
      displayName: user.display_name || username,
      followers: isNaN(followers) ? 0 : followers,
      avatarUrl: user.avatar_url || '',
      verified: true,
      verificationSource: 'oauth2_tiktok',
      verifiedAt,
    };
  }

  if (normalizedPlatform === 'facebook') {
    const appId = String(env.META_APP_ID || env.FACEBOOK_APP_ID || '').trim();
    const appSecret = String(env.META_APP_SECRET || env.FACEBOOK_APP_SECRET || '').trim();
    if (!appId || !appSecret) {
      throw new Error('Chưa cấu hình META_APP_ID hoặc META_APP_SECRET');
    }

    const tokenParams = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    });

    const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${tokenParams.toString()}`);
    const tokenData = await tokenRes.json();
    const accessToken = tokenData?.access_token;
    if (!accessToken) {
      throw new Error(tokenData?.error?.message || 'Lỗi đổi token Facebook');
    }

    // Fetch user basic profile
    const profileRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name,picture.type(large),link&access_token=${accessToken}`);
    const profile = await profileRes.json();
    console.log('[Facebook Profile]', JSON.stringify(profile));

    let followers = 0;
    let handle = `https://www.facebook.com/${profile.id || 'profile'}`;
    let displayName = profile.name || 'Facebook User';
    let avatarUrl = profile.picture?.data?.url || '';

    // Fetch user pages to get fanpage followers if available
    try {
      const accountsRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,fan_count,followers_count,link,picture.type(large)&access_token=${accessToken}`);
      const accountsData = await accountsRes.json();
      console.log('[Facebook Accounts]', JSON.stringify(accountsData));
      const pages = accountsData?.data || [];
      if (Array.isArray(pages) && pages.length > 0) {
        pages.sort((a: any, b: any) => (b.followers_count || b.fan_count || 0) - (a.followers_count || a.fan_count || 0));
        const topPage = pages[0];
        followers = Number(topPage.followers_count || topPage.fan_count || 0);
        if (topPage.link) handle = topPage.link;
        if (topPage.name) displayName = `${topPage.name} (Page)`;
        if (topPage.picture?.data?.url) avatarUrl = topPage.picture.data.url;
      }
    } catch (_) {}

    const isPersonalAccount = followers <= 0;
    const notice = isPersonalAccount
      ? 'Bạn đang dùng tài khoản Facebook cá nhân thông thường nên Meta không cung cấp số người theo dõi. Vui lòng vào trang cá nhân Facebook > bấm dấu (...) > chọn "Bật chế độ chuyên nghiệp" (Turn on Professional Mode) rồi bấm xác thực lại để hiển thị số followers thực tế.'
      : undefined;

    return {
      platform: 'Facebook',
      handle,
      url: handle,
      displayName,
      followers: followers > 0 ? followers : 0,
      avatarUrl,
      verified: true,
      verificationSource: 'oauth2_facebook',
      verifiedAt,
      isPersonalAccount,
      notice,
    };
  }

  if (normalizedPlatform === 'instagram') {
    const appId = String(explicitAppId || env.INSTAGRAM_APP_ID || '1064282613121655').trim();
    const appSecret = String(env.INSTAGRAM_APP_SECRET || env.META_APP_SECRET || '').trim();
    if (!appId || !appSecret) {
      throw new Error('Chưa cấu hình INSTAGRAM_APP_ID hoặc INSTAGRAM_APP_SECRET');
    }

    const tokenParams = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    });

    let accessToken = '';
    let userId = '';

    // First attempt: exchange at https://api.instagram.com/oauth/access_token
    const igTokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams,
    });
    const igTokenData = await igTokenRes.json();
    console.log('[Instagram API Token Data]', JSON.stringify(igTokenData));

    if (igTokenData?.access_token) {
      accessToken = igTokenData.access_token;
      userId = String(igTokenData.user_id || '');
    } else {
      console.warn('[Instagram API Direct Exchange Failed]', JSON.stringify(igTokenData));
      // Fallback attempt: https://graph.facebook.com/v19.0/oauth/access_token
      const fbTokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${tokenParams.toString()}`);
      const fbTokenData = await fbTokenRes.json();
      console.log('[Facebook Fallback Token Data]', JSON.stringify(fbTokenData));
      accessToken = fbTokenData?.access_token;
    }

    if (!accessToken) {
      const detailedErr =
        igTokenData?.error_message ||
        igTokenData?.error?.message ||
        'Lỗi đổi token Instagram';
      console.error('[Instagram Token Exchange Failed]', JSON.stringify({ igTokenData, appId, redirectUri }));
      throw new Error(detailedErr);
    }

    let username = '';
    let displayName = 'Instagram Creator';
    let followers = 0;
    let avatarUrl = '';

    // Query Instagram Graph API for basic profile
    try {
      const meRes = await fetch(`https://graph.instagram.com/v19.0/me?fields=id,username,account_type,media_count&access_token=${accessToken}`);
      const meData = await meRes.json();
      console.log('[Instagram Me Data]', JSON.stringify(meData));
      if (meData?.username) {
        username = meData.username;
        displayName = `@${meData.username}`;
      }
    } catch (_) {}

    // Query Instagram Graph API for followers_count
    try {
      const graphRes = await fetch(`https://graph.instagram.com/me?fields=id,username,followers_count,profile_picture_url&access_token=${accessToken}`);
      const graphData = await graphRes.json();
      console.log('[Instagram Followers Data]', JSON.stringify(graphData));
      if (graphData?.followers_count !== undefined) {
        followers = Number(graphData.followers_count || 0);
      }
      if (graphData?.username) username = graphData.username;
      if (graphData?.profile_picture_url) avatarUrl = graphData.profile_picture_url;
    } catch (_) {}

    // Query Instagram Insights API to trigger required API call for App Review (instagram_business_manage_insights)
    try {
      const insightsRes = await fetch(`https://graph.instagram.com/me/insights?metric=impressions,reach&period=day&access_token=${accessToken}`);
      const insightsData = await insightsRes.json();
      console.log('[Instagram Insights Data]', JSON.stringify(insightsData));
    } catch (_) {}

    // Also try connected Instagram Business via Facebook accounts if not found yet
    if (followers <= 0) {
      try {
        const accountsRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account{id,username,name,profile_picture_url,followers_count}&access_token=${accessToken}`);
        const accountsData = await accountsRes.json();
        const pages = accountsData?.data || [];
        for (const page of pages) {
          const ig = page.instagram_business_account;
          if (ig) {
            username = ig.username || username;
            displayName = ig.name || displayName;
            followers = Number(ig.followers_count || 0);
            avatarUrl = ig.profile_picture_url || avatarUrl;
            break;
          }
        }
      } catch (_) {}
    }

    const handle = `https://www.instagram.com/${(username || userId || 'creator').replace(/^@+/, '')}`;

    const isPersonalAccount = followers <= 0;
    const notice = isPersonalAccount
      ? 'Tài khoản Instagram của bạn chưa bật Chế độ Chuyên nghiệp (Creator/Business). Vui lòng chuyển sang tài khoản chuyên nghiệp để hệ thống có thể đọc số người theo dõi.'
      : undefined;

    return {
      platform: 'Instagram',
      handle,
      url: handle,
      displayName: displayName || (username ? `@${username}` : 'Instagram User'),
      followers: followers > 0 ? followers : 0,
      avatarUrl,
      verified: true,
      verificationSource: 'oauth2_instagram',
      verifiedAt,
      isPersonalAccount,
      notice,
    };
  }

  if (normalizedPlatform === 'threads') {
    const appId = String(env.THREADS_APP_ID || env.META_APP_ID || '').trim();
    const appSecret = String(env.THREADS_APP_SECRET || env.META_APP_SECRET || '').trim();
    if (!appId || !appSecret) {
      throw new Error('Chưa cấu hình THREADS_APP_ID hoặc THREADS_APP_SECRET');
    }

    const tokenRes = await fetch('https://graph.threads.net/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      }),
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData?.access_token;
    if (!accessToken) {
      const rawMsg = tokenData?.error_message || tokenData?.error?.message || tokenData?.error || 'Lỗi đổi token Threads';
      console.error('[Threads OAuth Error]', JSON.stringify(tokenData));
      throw new Error(rawMsg);
    }

    let username = '';
    let displayName = '';
    let avatarUrl = '';
    let followers = 0;

    const authHeaders = {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'KOC-Viet-App/1.0',
    };

    // 1. Fetch user profile from /me or /{user_id}
    try {
      let meRes = await fetch(
        'https://graph.threads.net/v1.0/me?fields=id,username,name,threads_profile_picture_url,threads_biography',
        { headers: authHeaders },
      );
      let meData = await meRes.json();
      console.log('[Threads Me Data]', JSON.stringify(meData));

      // Fallback with user_id if /me alias did not return username
      if (!meData?.username && tokenData?.user_id) {
        meRes = await fetch(
          `https://graph.threads.net/v1.0/${tokenData.user_id}?fields=id,username,name,threads_profile_picture_url,threads_biography`,
          { headers: authHeaders },
        );
        meData = await meRes.json();
        console.log('[Threads User_ID Data]', JSON.stringify(meData));
      }

      // Fallback with access_token query parameter if needed
      if (!meData?.username) {
        meRes = await fetch(
          `https://graph.threads.net/v1.0/me?fields=id,username,name,threads_profile_picture_url,threads_biography&access_token=${encodeURIComponent(accessToken)}`,
        );
        meData = await meRes.json();
        console.log('[Threads QueryParam Data]', JSON.stringify(meData));
      }

      if (meData?.username) username = String(meData.username).trim();
      if (meData?.name) displayName = String(meData.name).trim();
      if (meData?.threads_profile_picture_url) avatarUrl = String(meData.threads_profile_picture_url).trim();
      
      if (!username && meData?.error) {
        console.error('[Threads Profile Error]', JSON.stringify(meData.error));
        throw new Error(meData.error.message || 'Lỗi truy vấn hồ sơ Threads');
      }
    } catch (e: any) {
      console.error('[Threads Fetch Profile Error]', e.message);
      if (!username) {
        throw new Error(e.message || 'Không thể lấy thông tin tài khoản Threads');
      }
    }

    // 2. Fetch follower count via Threads Insights API
    const threadsUserId = String(tokenData?.user_id || meData?.id || '').trim();
    try {
      const targetPath = threadsUserId ? `${threadsUserId}/threads_insights` : 'me/threads_insights';
      let insightsRes = await fetch(
        `https://graph.threads.net/v1.0/${targetPath}?metric=followers_count`,
        { headers: authHeaders },
      );
      let insightsData = await insightsRes.json();
      console.log('[Threads Insights Data]', JSON.stringify(insightsData));

      if ((!insightsData?.data || insightsData?.error) && threadsUserId) {
        insightsRes = await fetch(
          'https://graph.threads.net/v1.0/me/threads_insights?metric=followers_count',
          { headers: authHeaders },
        );
        insightsData = await insightsRes.json();
        console.log('[Threads Insights Fallback Data]', JSON.stringify(insightsData));
      }

      const metricItem = insightsData?.data?.find?.((item: any) => item.name === 'followers_count') || insightsData?.data?.[0];
      const val =
        metricItem?.total_value?.value ??
        metricItem?.values?.[0]?.value ??
        metricItem?.value ??
        insightsData?.total_value?.value;
      if (typeof val === 'number') {
        followers = val;
      }
    } catch (e: any) {
      console.error('[Threads Insights Error]', e?.message);
    }

    const cleanUsername = username.replace(/^@+/, '');
    const handle = `https://www.threads.net/@${cleanUsername}`;

    return {
      platform: 'Threads',
      handle,
      url: handle,
      displayName: displayName || `@${cleanUsername}`,
      followers: followers > 0 ? followers : 0,
      avatarUrl,
      verified: true,
      verificationSource: 'oauth2_threads',
      verifiedAt,
    };
  }

  throw new Error(`Nền tảng ${platform} chưa được hỗ trợ OAuth trực tiếp`);
}

export function generateDevMockChannelStats(platform: string, customFollowers?: number): SocialChannelStats {
  const norm = String(platform || 'TikTok').trim();
  const followers = typeof customFollowers === 'number' && customFollowers > 0
    ? customFollowers
    : Math.floor(Math.random() * 45000) + 5000;

  const defaultHandles: Record<string, string> = {
    TikTok: 'https://www.tiktok.com/@koc.vietnam.official',
    YouTube: 'https://www.youtube.com/@KocVietOfficial',
    Facebook: 'https://www.facebook.com/kocviet.official',
    Instagram: 'https://www.instagram.com/kocviet.official',
    Threads: 'https://www.threads.net/@kocviet.official',
  };

  const handle = defaultHandles[norm] || `https://${norm.toLowerCase()}.com/@kocviet`;

  return {
    platform: norm,
    handle,
    url: handle,
    displayName: `KOC Việt (${norm} Dev Channel)`,
    followers,
    avatarUrl: 'https://i.pravatar.cc/150?u=koc-dev-mock',
    verified: true,
    verificationSource: 'oauth2_mock_dev',
    verifiedAt: now(),
  };
}
