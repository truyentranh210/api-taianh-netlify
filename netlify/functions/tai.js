const cheerio = require("cheerio");

exports.handler = async function (event) {
  const reqPath = event.path;

  // 🏠 /home — hiển thị hướng dẫn API
  if (reqPath === "/home") {
    return jsonResponse({
      project: "📘 API Tải Ảnh Truyện (Netlify)",
      author: "truyentranh210",
      version: "1.0.0",
      updated: new Date().toISOString(),
      description:
        "API dùng để lấy toàn bộ ảnh từ một trang truyện bất kỳ. Hỗ trợ query ?url=<link-truyen>",
      endpoints: {
        "/home": "Hiển thị hướng dẫn API (trang này)",
        "/tai?url=<link>": "Lấy ảnh từ link truyện cụ thể",
      },
      example: {
        method: "GET",
        usage: "/tai?url=https://example.com/truyen-abc",
        note: "API sẽ trả về danh sách ảnh và tiêu đề của truyện",
      },
      message: "✅ API hoạt động tốt! Hãy thử /tai?url=<link>",
    });
  }

  // ======================
  // 🔹 PHẦN GỐC: LẤY ẢNH TRUYỆN
  // ======================
  const params = new URLSearchParams(event.queryStringParameters);
  const comicUrl = params.get("url");

  if (!comicUrl) {
    return jsonResponse({ error: "Vui lòng cung cấp tham số 'url'." }, 400);
  }

  const data = await getComicData(comicUrl);
  return jsonResponse(data);
};

// ======================
// 🧠 HÀM LẤY ẢNH
// ======================
async function getComicData(url) {
  try {
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
    };

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    let html = await res.text();
    html = html.replace(/<noscript>([\s\S]*?)<\/noscript>/g, (_, inner) => inner);

    const $ = cheerio.load(html);
    const title = $("title").text().trim() || "Không tìm thấy tiêu đề";
    const base = new URL(url).origin;
    const imgs = new Set();

    $("img").each((_, el) => {
      const allSrcs = [];
      const src = $(el).attr("src");
      const dataSrc = $(el).attr("data-src");
      const lazySrc = $(el).attr("data-lazy-src");
      const srcset = $(el).attr("srcset");
      const dataSrcset = $(el).attr("data-srcset");

      [src, dataSrc, lazySrc].forEach((v) => v && allSrcs.push(v));
      [srcset, dataSrcset].forEach((set) => {
        if (set) {
          const urls = set.split(",").map((s) => s.trim().split(" ")[0]);
          allSrcs.push(...urls);
        }
      });

      for (const s of allSrcs) {
        try {
          const full = new URL(s.trim(), base).href;
          if (isValidImage(full)) imgs.add(full);
        } catch (_) {}
      }
    });

    return {
      source_url: url,
      title,
      total_images: imgs.size,
      comic_images: Array.from(imgs),
    };
  } catch (e) {
    return { error: e.message };
  }
}

// ======================
// 🔍 Lọc file ảnh hợp lệ
// ======================
function isValidImage(link) {
  const l = link.toLowerCase();
  const valid = [".jpg", ".jpeg", ".png", ".webp"];
  const bad = [
    "ads",
    "banner",
    "logo",
    "icon",
    "gif",
    "emoji",
    "plugin",
    "analytics",
    "wp-includes",
  ];
  return valid.some((v) => l.includes(v)) && !bad.some((b) => l.includes(b));
}

// ======================
function jsonResponse(obj, code = 200) {
  return {
    statusCode: code,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(obj, null, 2),
  };
}
