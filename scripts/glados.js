/****************************** 
脚本功能：GLaDOS / Railgun 自动签到 + 积分兑换
更新时间：2026-05-27
使用说明：先访问 GLaDOS 网站抓包保存 Cookie，再由定时任务自动签到。
         支持 glados.network、railgun.info、glados.vip 三域名签到。
         多账号用 & 分隔。

[rewrite_local]
^https:\/\/glados\.network\/console\/current\/profile$ url script-request-header https://raw.githubusercontent.com/curtinp118/QuantumultX/refs/heads/main/scripts/glados.js
^https:\/\/railgun\.info\/console\/current\/profile$ url script-request-header https://raw.githubusercontent.com/curtinp118/QuantumultX/refs/heads/main/scripts/glados.js
^https:\/\/glados\.vip\/console\/current\/profile$ url script-request-header https://raw.githubusercontent.com/curtinp118/QuantumultX/refs/heads/main/scripts/glados.js

[task_local]
30 9 * * * https://raw.githubusercontent.com/curtinp118/QuantumultX/refs/heads/main/scripts/glados.js, tag=GLaDOS 签到, enabled=true

[MITM]
hostname = %APPEND% glados.network, railgun.info, glados.vip
*******************************/

const COOKIE_KEY = "GLaDOS_Cookie";
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

function getStoredCookies() {
  try {
    if (typeof $prefs === "undefined") return "";
    const raw = $prefs.valueForKey(COOKIE_KEY);
    return raw ? String(raw).trim() : "";
  } catch (e) {
    console.log("[GLaDOS] Error reading cookie:", e);
    return "";
  }
}

function saveCookie(cookie) {
  try {
    if (typeof $prefs === "undefined" || !cookie) return false;
    const old = getStoredCookies();
    if (old !== cookie) {
      $prefs.setValueForKey(cookie, COOKIE_KEY);
      console.log("[GLaDOS] Cookie saved successfully");
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

// ────────────────── HTTP ──────────────────

function request(url, method, cookie, body) {
  const headers = {
    "Content-Type": "application/json;charset=UTF-8",
    Origin: "https://glados.network",
    Referer: "https://glados.network/console/current",
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
    url, "POST", cookie, body
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
  const { statusCode, data, raw, error } = await request(url, "GET", cookie);

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
  const { statusCode, data, raw, error } = await request(url, "GET", cookie);

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
    url, "POST", cookie, body
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

// ────────────────── 单账号签到流程 ──────────────────

async function checkinForCookie(cookie, cookieIdx) {
  const results = [];

  for (const domain of DOMAINS) {
    console.log(`[GLaDOS] ── Cookie #${cookieIdx} | Domain: ${domain} ──`);

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

    results.push({
      cookieIdx,
      domain,
      status: checkinResult.status,
      code: checkinResult.code,
      message: checkinResult.message,
      earnedPoints: checkinResult.points,
      totalPoints: pointsResult.points,
      daysBefore: statusBefore.leftDays,
      daysAfter: statusAfter.leftDays,
      exchange: exchangeResult,
    });
  }

  return results;
}

// ────────────────── 主流程 ──────────────────

if (isGetHeader) {
  // 抓包模式：从请求头提取 Cookie
  const allHeaders = $request.headers || {};
  const cookie = allHeaders.Cookie || allHeaders.cookie || "";

  if (!cookie) {
    console.log("[GLaDOS] Cookie not found in request headers");
    $done({});
  } else {
    const saved = saveCookie(cookie);
    if (saved) {
      console.log("[GLaDOS] Cookie captured and saved");
      notify("GLaDOS", "Cookie 已更新", "后续将用于自动签到");
    }
    $done({});
  }
} else {
  // 签到模式
  (async () => {
    const storedCookie = getStoredCookies();

    if (!storedCookie) {
      console.log("[GLaDOS] No stored cookie found");
      notify(
        "GLaDOS 签到", "未获取到 Cookie",
        "请先访问 GLaDOS 网站抓包保存 Cookie"
      );
      return $done();
    }

    // 支持多账号（& 分隔）
    const cookieList = storedCookie
      .split("&")
      .map((c) => c.trim())
      .filter(Boolean);

    console.log(
      `[GLaDOS] 🚀 开始签到，共 ${cookieList.length} 个账号，${DOMAINS.length} 个域名`
    );

    const allResults = [];

    for (let i = 0; i < cookieList.length; i++) {
      console.log(`[GLaDOS] ═══ 开始处理 Cookie #${i + 1} ═══`);
      const results = await checkinForCookie(cookieList[i], i + 1);
      allResults.push(...results);
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
        `${icon} #${i + 1} ${r.domain}`,
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
