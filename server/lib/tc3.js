/** 腾讯云 TC3-HMAC-SHA256 签名调用（零依赖） */
import crypto from 'node:crypto';

const sha256hex = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const hmac = (key, msg) => crypto.createHmac('sha256', key).update(msg, 'utf8').digest();

export async function tencentRequest({
  host, service, action, version, region, secretId, secretKey, payload, timeoutMs = 20000,
}) {
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const ct = 'application/json; charset=utf-8';

  const canonicalRequest = [
    'POST', '/', '',
    `content-type:${ct}\nhost:${host}\n`,
    'content-type;host',
    sha256hex(body),
  ].join('\n');

  const credentialScope = `${date}/${service}/tc3_request`;
  const stringToSign = ['TC3-HMAC-SHA256', String(timestamp), credentialScope, sha256hex(canonicalRequest)].join('\n');

  const secretDate = hmac(`TC3${secretKey}`, date);
  const secretService = hmac(secretDate, service);
  const secretSigning = hmac(secretService, 'tc3_request');
  const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign, 'utf8').digest('hex');

  const authorization = `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, SignedHeaders=content-type;host, Signature=${signature}`;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const resp = await fetch(`https://${host}`, {
      method: 'POST',
      headers: {
        'Content-Type': ct,
        Host: host,
        Authorization: authorization,
        'X-TC-Action': action,
        'X-TC-Version': version,
        'X-TC-Timestamp': String(timestamp),
        ...(region ? { 'X-TC-Region': region } : {}),
      },
      body,
      signal: ac.signal,
    });
    const json = await resp.json();
    if (json?.Response?.Error) {
      const e = json.Response.Error;
      throw Object.assign(new Error(`腾讯云接口错误：${e.Code} ${e.Message}`), { status: 502 });
    }
    return json.Response;
  } finally {
    clearTimeout(timer);
  }
}
