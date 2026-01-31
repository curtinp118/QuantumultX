/******************************
脚本功能：通用签到（HotaruAPI / KFC-API 等同套NewAPI源码站点）
更新时间：2026-01-31
使用说明：先抓包一次保存 Cookie，再由定时任务自动签到（按域名分别保存，多站点可共用同一脚本）。

[rewrite_local]
^https:\/\/(api\.hotaruapi\.top|kfc-api\.sxxe\.net)\/api\/user\/self$ url script-request-header https://raw.githubusercontent.com/curtinp118/QuantumultX/refs/heads/main/scripts/NewAPI.js

[task_local]
10 9 * * * https://raw.githubusercontent.com/curtinp118/QuantumultX/refs/heads/main/scripts/NewAPI.js, tag=通用签到(Hotaru/KFC), enabled=true
; 如需只跑单站点（可选）
; 10 9 * * * https://raw.githubusercontent.com/curtinp118/QuantumultX/refs/heads/main/scripts/NewAPI.js, tag=Hotaru签到, enabled=true, argument=host=api.hotaruapi.top
; 10 9 * * * https://raw.githubusercontent.com/curtinp118/QuantumultX/refs/heads/main/scripts/NewAPI.js, tag=KFC签到, enabled=true, argument=host=kfc-api.sxxe.net

[MITM]
hostname = api.hotaruapi.top, kfc-api.sxxe.net
*******************************/

const HEADER_KEY_PREFIX = "UniversalCheckin_Headers";
const isGetHeader = typeof $request !== "undefined";

const NEED_KEYS = [
  "Host",
  "User-Agent",
  "Accept",
  "Accept-Language",
  "Accept-Encoding",
  "Origin",
  "Referer",
  "Cookie",
  "new-api-user",
];

const KNOWN_HOSTS = ["api.hotaruapi.top", "kfc-api.sxxe.net"];

function pickNeedHeaders(src = {}) {
  const dst = {};
  const lowerMap = {};
  for (const k of Object.keys(src || {})) lowerMap[String(k).toLowerCase()] = src[k];
  const get = (name) => src[name] ?? lowerMap[String(name).toLowerCase()];
  for (const k of NEED_KEYS) {
    const v = get(k);
    if (v !== undefined) dst[k] = v;
  }
  return dst;
}

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch (_) {
    return null;
  }
}

function headerKeyForHost(host) {
  return `${HEADER_KEY_PREFIX}:${host}`;
}

function getHostFromRequest() {
  const h = ($request && $request.headers) || {};
  const host = h.Host || h.host;
  if (host) return String(host).trim();
  try {
    const u = new URL($request.url);
    return u.hostname;
  } catch (_) {
    return "";
  }
}

function parseArgs(str) {
  const out = {};
  if (!str) return out;
  const s = String(str).trim();
  if (!s) return out;
  for (const part of s.split("&")) {
    const seg = part.trim();
    if (!seg) continue;
    const idx = seg.indexOf("=");
    if (idx === -1) {
      out[decodeURIComponent(seg)] = "";
    } else {
      const k = decodeURIComponent(seg.slice(0, idx));
      const v = decodeURIComponent(seg.slice(idx + 1));
      out[k] = v;
    }
  }
  return out;
}

function originFromHost(host) {
  return `https://${host}`;
}

function refererFromHost(host) {
  return `https://${host}/console/personal`;
}

function notifyTitleForHost(host) {
  if (host === "api.hotaruapi.top") return "HotaruAPI";
  if (host === "kfc-api.sxxe.net") return "KFC-API";
  return host;
}

if (isGetHeader) {
  const allHeaders = $request.headers || {};
  const host = getHostFromRequest();
  const picked = pickNeedHeaders(allHeaders);

  if (!host || !picked || !picked.Cookie || !picked["new-api-user"]) {
    console.log("[HotaruCheckin] header capture failed:", JSON.stringify(allHeaders));
    $notify(
      "通用签到",
      "未抓到关键信息",
      "请在触发 /api/user/self 请求时抓包（需要包含 Cookie 和 new-api-user）。"
    );
    $done({});
  }

  const key = headerKeyForHost(host);
  const ok = $prefs.setValueForKey(JSON.stringify(picked), key);
  console.log(
    `[HotaruCheckin] saved headers (${Object.keys(picked).length}) to $prefs key=${key}:`,
    JSON.stringify(picked)
  );

  const title = notifyTitleForHost(host);
  $notify(ok ? `${title} 参数获取成功` : `${title} 参数保存失败`, "", ok ? "后续将用于自动签到。" : "写入本地存储失败，请检查 Quantumult X 配置。");
  $done({});
} else {
  const args = parseArgs(typeof $argument !== "undefined" ? $argument : "");
  const onlyHost = (args.host || args.hostname || "").trim();
  const hostsToRun = onlyHost ? [onlyHost] : KNOWN_HOSTS;

  const doCheckin = (host) => {
    const key = headerKeyForHost(host);
    const raw = $prefs.valueForKey(key);
    if (!raw) {
      $notify(notifyTitleForHost(host), "缺少参数", "请先抓包保存一次 /api/user/self 的请求头。");
      return Promise.resolve();
    }

    const savedHeaders = safeJsonParse(raw);
    if (!savedHeaders) {
      $notify(notifyTitleForHost(host), "参数异常", "已保存的请求头解析失败，请重新抓包保存。");
      return Promise.resolve();
    }

    const url = `https://${host}/api/user/checkin`;
    const method = "POST";

    const headers = {
      Host: savedHeaders.Host || host,
      Accept: savedHeaders.Accept || "application/json, text/plain, */*",
      "Accept-Language": savedHeaders["Accept-Language"] || "zh-CN,zh-Hans;q=0.9",
      "Accept-Encoding": savedHeaders["Accept-Encoding"] || "gzip, deflate, br",
      Origin: savedHeaders.Origin || originFromHost(host),
      Referer: savedHeaders.Referer || refererFromHost(host),
      "User-Agent": savedHeaders["User-Agent"] || "QuantumultX",
      Cookie: savedHeaders.Cookie || "",
      "new-api-user": savedHeaders["new-api-user"] || "",
    };

    const myRequest = { url, method, headers, body: "" };

    return $task.fetch(myRequest).then(
      (resp) => {
        const status = resp.statusCode;
        const body = resp.body || "";

        const obj = safeJsonParse(body) || {};
        const success = Boolean(obj.success);
        const message = obj.message ? String(obj.message) : "";
        const checkinDate = obj?.data?.checkin_date ? String(obj.data.checkin_date) : "";
        const quotaAwarded =
          obj?.data?.quota_awarded !== undefined ? String(obj.data.quota_awarded) : "";

        console.log(
          `[HotaruCheckin] host=${host} status=${status} success=${String(success)} checkin_date=${checkinDate || "(empty)"} quota_awarded=${quotaAwarded || "(empty)"} message=${message || "(empty)"}`
        );

        const title = notifyTitleForHost(host);
        if (status === 401 || status === 403) {
          $notify(title, "登录失效", `HTTP ${status}，请重新抓包保存 Cookie。\n${message || body}`);
        } else if (status >= 200 && status < 300) {
          if (success) {
            const content = `${checkinDate ? `日期：${checkinDate}\n` : ""}${quotaAwarded ? `获得：${quotaAwarded}` : "签到成功"}`;
            $notify(title, "签到成功", content);
          } else {
            $notify(title, "签到失败", message || body || `HTTP ${status}`);
          }
        } else {
          $notify(title, `接口异常 ${status}`, message || body);
        }
      },
      (reason) => {
        const err = reason?.error ? String(reason.error) : String(reason || "");
        console.log(`[HotaruCheckin] host=${host} request error: ${err}`);
        $notify(notifyTitleForHost(host), "网络错误", err);
      }
    );
  };

  (async () => {
    for (const h of hostsToRun) {
      // eslint-disable-next-line no-await-in-loop
      await doCheckin(h);
    }
    $done();
  })();
}
