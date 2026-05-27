/****************************** 
脚本功能：GLaDOS / Railgun 自动签到 + 积分兑换
更新时间：2026-05-27
使用说明：访问 /console/account 抓包保存 Cookie，定时任务自动签到。
         各域名独立 Cookie，支持多域名。

[rewrite_local]
^https:\/\/glados\.network\/console\/account$ url script-request-header https://raw.githubusercontent.com/curtinp118/QuantumultX/refs/heads/main/scripts/glados.js
^https:\/\/railgun\.info\/console\/account$ url script-request-header https://raw.githubusercontent.com/curtinp118/QuantumultX/refs/heads/main/scripts/glados.js
^https:\/\/glados\.vip\/console\/account$ url script-request-header https://raw.githubusercontent.com/curtinp118/QuantumultX/refs/heads/main/scripts/glados.js

[task_local]
10 7 * * * https://raw.githubusercontent.com/curtinp118/QuantumultX/refs/heads/main/scripts/glados.js, tag=GLaDOS 签到, enabled=true

[MITM]
hostname = %APPEND% glados.network, railgun.info, glados.vip
*******************************/

const COOKIE_KEY_PREFIX = "GLaDOS_Cookie";
const DOMAINS_LIST_KEY = "GLaDOS_Domains";
const EXCHANGE_PLAN = "plan500";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const isGetHeader = typeof $request !== "undefined";

// ──── storage ────

function safeJsonParse(s) {
  try { return JSON.parse(s); } catch (_) { return null; }
}

function cookieKey(domain) {
  return `${COOKIE_KEY_PREFIX}:${domain}`;
}

function getSavedDomains() {
  if (typeof $prefs === "undefined") return [];
  const raw = $prefs.valueForKey(DOMAINS_LIST_KEY);
  const list = safeJsonParse(raw) || [];
  return Array.isArray(list) ? list.filter(Boolean) : [];
}

function addDomain(domain) {
  const list = getSavedDomains();
  if (!list.includes(domain)) {
    list.push(domain);
    $prefs.setValueForKey(JSON.stringify(list), DOMAINS_LIST_KEY);
  }
}

function getCookie(domain) {
  if (typeof $prefs === "undefined") return "";
  const raw = $prefs.valueForKey(cookieKey(domain));
  return raw ? String(raw).trim() : "";
}

function saveCookie(domain, cookie) {
  if (typeof $prefs === "undefined" || !cookie) return false;
  const old = getCookie(domain);
  if (old !== cookie) {
    $prefs.setValueForKey(cookie, cookieKey(domain));
    addDomain(domain);
    console.log(`[GLaDOS] Cookie saved: ${domain}`);
    return true;
  }
  return false;
}

function getHost() {
  const h = ($request && $request.headers) || {};
  return h.Host || h.host || "";
}

// ──── network ────

function fetch(url, method, cookie, domain, body) {
  const headers = {
    "Content-Type": "application/json;charset=UTF-8",
    Origin: `https://${domain}`,
    Referer: `https://${domain}/console/current`,
    "User-Agent": UA,
    Cookie: cookie,
  };
  const opts = { url, method, headers };
  if (body !== undefined) {
    opts.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  return $task.fetch(opts).then(
    (resp) => ({
      ok: resp.statusCode >= 200 && resp.statusCode < 300,
      data: safeJsonParse(resp.body || ""),
      raw: resp.body || "",
    }),
    (reason) => ({
      ok: false,
      data: null,
      raw: "",
      error: reason?.error ? String(reason.error) : String(reason || "Network error"),
    })
  );
}

// ──── API ────

async function doCheckin(cookie, domain) {
  const { ok, data, raw, error } = await fetch(
    `https://${domain}/api/user/checkin`, "POST", cookie, domain, { token: domain }
  );

  if (error) return { code: -2, status: "失败", msg: error, earned: "0" };
  if (!data) return { code: -2, status: "失败", msg: raw, earned: "0" };

  const code = data.code ?? -2;
  const msg = data.message || "";
  const earned = String(data.points ?? 0);

  if (code === 0) return { code, status: "成功", msg, earned };
  if (code === 1) return { code, status: "已签", msg, earned: "0" };
  return { code, status: "失败", msg, earned: "0" };
}

async function doGet(url, cookie, domain) {
  const { ok, data, raw, error } = await fetch(url, "GET", cookie, domain);
  if (error || !data) return null;
  return data;
}

async function getStatus(cookie, domain) {
  const data = await doGet(`https://${domain}/api/user/status`, cookie, domain);
  const days = data?.data?.leftDays;
  return days != null ? parseInt(parseFloat(days), 10) : null;
}

async function getPoints(cookie, domain) {
  const data = await doGet(`https://${domain}/api/user/points`, cookie, domain);
  const p = data?.points;
  return p != null ? parseInt(parseFloat(p), 10) : null;
}

async function doExchange(cookie, domain) {
  const { ok, data, raw, error } = await fetch(
    `https://${domain}/api/user/exchange`, "POST", cookie, domain, { planType: EXCHANGE_PLAN }
  );
  if (error) return `失败: ${error}`;
  if (!data) return `失败: ${raw}`;
  return data.code === 0 ? `成功(${EXCHANGE_PLAN})` : `失败: ${data.message || ""}`;
}

// ──── single domain flow ────

async function runDomain(cookie, domain) {
  console.log(`[GLaDOS] ── ${domain} ──`);

  const daysBefore = await getStatus(cookie, domain);
  console.log(`[GLaDOS] 剩余 ${daysBefore ?? "N/A"} 天`);

  const result = await doCheckin(cookie, domain);
  if (result.code === 0) {
    console.log(`[GLaDOS] ✅ 签到成功 +${result.earned} 积分`);
  } else if (result.code === 1) {
    console.log(`[GLaDOS] 🔄 今日已签到`);
  } else {
    console.log(`[GLaDOS] ❌ 签到失败: ${result.msg}`);
  }

  const totalPoints = await getPoints(cookie, domain);
  console.log(`[GLaDOS] 总积分 ${totalPoints ?? "N/A"}`);

  const exchangeResult = await doExchange(cookie, domain);
  console.log(`[GLaDOS] 兑换 ${exchangeResult}`);

  const daysAfter = await getStatus(cookie, domain);
  console.log(`[GLaDOS] 剩余 ${daysAfter ?? "N/A"} 天`);

  return {
    domain,
    code: result.code,
    status: result.status,
    earned: result.earned,
    msg: result.msg,
    totalPoints,
    daysBefore,
    daysAfter,
    exchange: exchangeResult,
  };
}

// ──── main ────

if (isGetHeader) {
  const cookie = ($request.headers || {}).Cookie || ($request.headers || {}).cookie || "";
  const host = getHost();

  if (cookie && host) {
    const saved = saveCookie(host, cookie);
    if (saved) {
      $notify("GLaDOS", `Cookie 已保存 [${host}]`, "");
    }
  } else {
    console.log("[GLaDOS] Cookie not found in request headers");
  }
  $done({});
} else {
  // 随机延迟 0~10s 防检测
  const delay = Math.floor(Math.random() * 11);
  console.log(`[GLaDOS] 随机延迟 ${delay}s`);
  setTimeout(async () => {
    const domains = getSavedDomains();

    if (domains.length === 0) {
      console.log("[GLaDOS] 未找到已保存的 Cookie");
      $notify("GLaDOS 签到", "无 Cookie", "请先访问 /console/account 抓包");
      return $done();
    }

    console.log(`[GLaDOS] 🚀 开始签到 ${domains.join(", ")}`);
    const results = [];

    for (const domain of domains) {
      const cookie = getCookie(domain);
      if (!cookie) {
        console.log(`[GLaDOS] ⚠️ ${domain} Cookie 丢失，跳过`);
        continue;
      }
      results.push(await runDomain(cookie, domain));
    }

    // 汇总
    const ok = results.filter((r) => r.code === 0).length;
    const dup = results.filter((r) => r.code === 1).length;
    const fail = results.filter((r) => r.code !== 0 && r.code !== 1).length;

    const summary = results
      .map((r) => {
        const icon = r.code === 0 ? "✅" : r.code === 1 ? "🔄" : "❌";
        const pts = r.earned !== "0" ? ` +${r.earned}` : "";
        const days =
          r.daysBefore != null && r.daysAfter != null
            ? `${r.daysBefore}→${r.daysAfter}天`
            : "N/A";
        return `${icon} ${r.domain} | ${r.status}${pts} | ${days} | ${r.totalPoints ?? 0}积分`;
      })
      .join("\n");

    const title = `GLaDOS | 成${ok} 重${dup} 败${fail}`;
    console.log(`\n[GLaDOS] ═══ 签到结果 ═══\n${summary}\n`);
    $notify(title, "", summary);
    $done();
  }, delay * 1000);
}
