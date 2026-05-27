/****************************** 
脚本功能：GLaDOS / Railgun 自动签到 + 积分兑换
更新时间：2026-05-27
使用说明：访问 GLaDOS 任意域名的 /console/account 页面抓包保存 Cookie，
         定时任务自动对已保存 Cookie 的域名执行签到。
         支持 glados.network、railgun.info、glados.vip，各域名独立 Cookie。

[rewrite_local]
^https:\/\/glados\.network\/console\/account$ url script-request-header https://raw.githubusercontent.com/curtinp118/QuantumultX/refs/heads/main/scripts/glados.js
^https:\/\/railgun\.info\/console\/account$ url script-request-header https://raw.githubusercontent.com/curtinp118/QuantumultX/refs/heads/main/scripts/glados.js
^https:\/\/glados\.vip\/console\/account$ url script-request-header https://raw.githubusercontent.com/curtinp118/QuantumultX/refs/heads/main/scripts/glados.js

[task_local]
30 9 * * * https://raw.githubusercontent.com/curtinp118/QuantumultX/refs/heads/main/scripts/glados.js, tag=GLaDOS 签到, enabled=true

[MITM]
hostname = %APPEND% glados.network, railgun.info, glados.vip
*******************************/

const COOKIE_KEY_PREFIX = "GLaDOS_Cookie";
const DOMAINS_LIST_KEY = "GLaDOS_Domains";
const DOMAINS = ["glados.network", "railgun.info", "glados.vip"];
const EXCHANGE_PLAN = "plan500";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const isGetHeader = typeof $request !== "undefined";

// ────────────────── helpers ──────────────────

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch (_) {
    return null;
  }
}

function cookieKeyFor(domain) {
  return `${COOKIE_KEY_PREFIX}:${domain}`;
}

function getSavedDomains() {
  try {
    if (typeof $prefs === "undefined") return [];
    const raw = $prefs.valueForKey(DOMAINS_LIST_KEY);
    if (!raw) return [];
    const list = safeJsonParse(raw) || [];
    return Array.isArray(list) ? list.filter(Boolean) : [];
  } catch (e) {
    console.log("[GLaDOS] Error reading domains:", e);
    return [];
  }
}

function addDomain(domain) {
  try {
    if (typeof $prefs === "undefined") return;
    const list = getSavedDomains();
    if (!list.includes(domain)) {
      list.push(domain);
      $prefs.setValueForKey(JSON.stringify(list), DOMAINS_LIST_KEY);
      console.log("[GLaDOS] Updated domains list:", list.join(", "));
    }
  } catch (e) {
    console.log("[GLaDOS] Error adding domain:", e);
  }
}

function getStoredCookie(domain) {
  try {
    if (typeof $prefs === "undefined") return "";
    const raw = $prefs.valueForKey(cookieKeyFor(domain));
    return raw ? String(raw).trim() : "";
  } catch (e) {
    console.log("[GLaDOS] Error reading cookie:", e);
    return "";
  }
}

function saveCookie(domain, cookie) {
  try {
    if (typeof $prefs === "undefined" || !cookie) return false;
    const old = getStoredCookie(domain);
    if (old !== cookie) {
      $prefs.setValueForKey(cookie, cookieKeyFor(domain));
      addDomain(domain);
      console.log(`[GLaDOS] Cookie saved for ${domain}`);
      return true;
    }
    return false;
  } catch (e) {
    console.log("[GLaDOS] Error saving cookie:", e);
    return false;
  }
}

function notify(title, subtitle, body) {
  $notify(title, subtitle, body);
}

function getHostFromRequest() {
  const h = ($request && $request.headers) || {};
  return h.Host || h.host || "";
}

// ────────────────── HTTP ──────────────────

function request(url, method, cookie, domain, body) {
  const headers = {
    "Content-Type": "application/json;charset=UTF-8",
    Origin: `https://${domain}`,
    Referer: `https://${domain}/console/current`,
    "User-Agent": UA,
    Cookie: cookie,
  };

  const opts = { url, method, headers };
  if (body !== undefined)
    opts.body = typeof body === "string" ? body : JSON.stringify(body);

  return $task.fetch(opts).then(
    (resp) => {
      const statusCode = resp.statusCode;
      const respBody = resp.body || "";
      const data = safeJsonParse(respBody);
      return { statusCode, data, raw: respBody };
    },
    (reason) => {
      const err = reason?.error
        ? String(reason.error)
        : String(reason || "Network error");
      return { statusCode: 0, data: null, raw: "", error: err };
    }
  );
}

// ────────────────── API 调用 ──────────────────

async function checkin(cookie, domain) {
  const url = `https://${domain}/api/user/checkin`;
  const body = { token: domain };
  const { statusCode, data, raw, error } = await request(
    url, "POST", cookie, domain, body
  );

  if (error) {
    console.log(`[GLaDOS] ✗ 签到网络错误 [${domain}]: ${error}`);
    return { status: "签到失败", code: -2, message: error, points: "0" };
  }
  if (!data) {
    console.log(`[GLaDOS] ✗ 签到响应解析失败 [${domain}]: ${raw}`);
    return { status: "签到失败", code: -2, message: raw, points: "0" };
  }

  const code = data.code ?? -2;
  const message = data.message || "";
  const points = String(data.points ?? 0);

  if (code === 0) {
    console.log(`[GLaDOS] ✅ 签到成功 [${domain}]: +${points} 积分, ${message}`);
    return { status: "签到成功", code: 0, message, points };
  } else if (code === 1) {
    console.log(`[GLaDOS] 🔄 重复签到 [${domain}]: ${message}`);
    return { status: "重复签到", code: 1, message, points: "0" };
  } else {
    console.log(`[GLaDOS] ❌ 签到失败 [${domain}]: code=${code}, ${message}`);
    return { status: "签到失败", code, message, points: "0" };
  }
}

async function getStatus(cookie, domain) {
  const url = `https://${domain}/api/user/status`;
  const { statusCode, data, raw, error } = await request(url, "GET", cookie, domain);

  if (error || !data) {
    console.log(`[GLaDOS] ✗ 查询状态失败 [${domain}]: ${error || raw}`);
    return { leftDays: "N/A" };
  }

  const leftDays = data.data?.leftDays;
  if (leftDays !== undefined && leftDays !== null) {
    const days = parseInt(parseFloat(leftDays), 10);
    console.log(`[GLaDOS] 📊 剩余天数 [${domain}]: ${days} 天`);
    return { leftDays: `${days} 天` };
  }

  console.log(`[GLaDOS] 📊 状态响应 [${domain}]:`, JSON.stringify(data));
  return { leftDays: "N/A" };
}

async function getPoints(cookie, domain) {
  const url = `https://${domain}/api/user/points`;
  const { statusCode, data, raw, error } = await request(url, "GET", cookie, domain);

  if (error || !data) {
    console.log(`[GLaDOS] ✗ 查询积分失败 [${domain}]: ${error || raw}`);
    return { points: "N/A", pointsNum: 0 };
  }

  const points = data.points;
  if (points !== undefined && points !== null) {
    const pointsInt = parseInt(parseFloat(points), 10);
    console.log(`[GLaDOS] 💰 总积分 [${domain}]: ${pointsInt}`);
    return { points: `${pointsInt}`, pointsNum: pointsInt };
  }

  console.log(`[GLaDOS] 💰 积分响应 [${domain}]:`, JSON.stringify(data));
  return { points: "N/A", pointsNum: 0 };
}

async function exchange(cookie, domain, plan) {
  const url = `https://${domain}/api/user/exchange`;
  const body = { planType: plan };
  const { statusCode, data, raw, error } = await request(
    url, "POST", cookie, domain, body
  );

  if (error || !data) {
    console.log(`[GLaDOS] ✗ 兑换失败 [${domain}]: ${error || raw}`);
    return `兑换失败: ${error || raw}`;
  }

  const code = data.code ?? -2;
  const message = data.message || "";

  if (code === 0) {
    console.log(`[GLaDOS] 🎁 兑换成功 [${domain}]: ${plan}, ${message}`);
    return `兑换成功(${plan})`;
  } else {
    console.log(`[GLaDOS] ❌ 兑换失败 [${domain}]: code=${code}, ${message}`);
    return `兑换失败: ${message}`;
  }
}

// ────────────────── 单域名签到流程 ──────────────────

async function checkinForDomain(cookie, domain) {
  console.log(`[GLaDOS] ── Domain: ${domain} ──`);

  // 1. 查询签到前剩余天数
  const statusBefore = await getStatus(cookie, domain);
  // 2. 执行签到
  const checkinResult = await checkin(cookie, domain);
  // 3. 查询积分
  const pointsResult = await getPoints(cookie, domain);
  // 4. 兑换
  const exchangeResult = await exchange(cookie, domain, EXCHANGE_PLAN);
  // 5. 查询签到后剩余天数
  const statusAfter = await getStatus(cookie, domain);

  return {
    domain,
    status: checkinResult.status,
    code: checkinResult.code,
    message: checkinResult.message,
    earnedPoints: checkinResult.points,
    totalPoints: pointsResult.points,
    daysBefore: statusBefore.leftDays,
    daysAfter: statusAfter.leftDays,
    exchange: exchangeResult,
  };
}

// ────────────────── 主流程 ──────────────────

if (isGetHeader) {
  // 抓包模式：从请求头提取 Cookie，按域名分别保存
  const allHeaders = $request.headers || {};
  const cookie = allHeaders.Cookie || allHeaders.cookie || "";
  const host = getHostFromRequest();

  if (!cookie || !host) {
    console.log("[GLaDOS] Cookie or Host not found in request headers");
    $done({});
  } else {
    const saved = saveCookie(host, cookie);
    if (saved) {
      console.log(`[GLaDOS] Cookie captured for ${host}`);
      notify("GLaDOS", `Cookie 已更新 [${host}]`, "后续将用于自动签到");
    }
    $done({});
  }
} else {
  // 签到模式：只对已保存 Cookie 的域名执行签到
  (async () => {
    const savedDomains = getSavedDomains();

    if (savedDomains.length === 0) {
      console.log("[GLaDOS] No saved cookies found");
      notify(
        "GLaDOS 签到", "未获取到 Cookie",
        "请先访问 GLaDOS 网站 /console/account 抓包保存 Cookie"
      );
      return $done();
    }

    console.log(
      `[GLaDOS] 🚀 开始签到，共 ${savedDomains.length} 个域名: ${savedDomains.join(", ")}`
    );

    const allResults = [];

    for (const domain of savedDomains) {
      const cookie = getStoredCookie(domain);
      if (!cookie) {
        console.log(`[GLaDOS] ⚠️ ${domain} 的 Cookie 已丢失，跳过`);
        continue;
      }
      const result = await checkinForDomain(cookie, domain);
      allResults.push(result);
    }

    // ── 汇总通知 ──
    const successCount = allResults.filter((r) => r.code === 0).length;
    const repeatCount = allResults.filter((r) => r.code === 1).length;
    const failCount = allResults.filter(
      (r) => r.code !== 0 && r.code !== 1
    ).length;

    const title =
      `GLaDOS 签到 | 成功${successCount} 失败${failCount} 重复${repeatCount}`;

    const lines = allResults.map((r, i) => {
      const icon = r.code === 0 ? "✅" : r.code === 1 ? "🔄" : "❌";
      return [
        `${icon} ${r.domain}`,
        `   签到: ${r.status}${r.earnedPoints !== "0" ? ` (+${r.earnedPoints})` : ""}`,
        `   天数: ${r.daysBefore} → ${r.daysAfter}`,
        `   积分: ${r.totalPoints}`,
        `   兑换: ${r.exchange}`,
      ].join("\n");
    });

    const content = lines.join("\n\n");

    console.log(
      `\n[GLaDOS] 🏁 ========== 签到总结 ==========\n${title}\n${content}\n`
    );

    notify(title, "", content);
    $done();
  })();
}
