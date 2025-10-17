const cheerio = require("cheerio");

exports.handler = async function (event) {
  const params = new URLSearchParams(event.queryStringParameters);
  const comicUrl = params.get("url");

  if (!comicUrl) {
    return jsonResponse({ error: "Vui lòng cung cấp tham số 'url'." }, 400);
  }

  const data = await getComicData(comicUrl);
  return jsonResponse(data);
};

// ======================================
// 🧠 Hàm lấy dữ liệu từ URL truyện
// ======================================
async function getComicData(url) {
  try {
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
    };

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);

    const html = await res.text();
    const $ = cheerio.load(html);

    const title = $("title").text().trim() || "Không tìm thấy tiêu đề";
    const base = new URL(url).origin;

    const comicImages = new Set();

    // ✅ Quét toàn bộ <img> trong trang
    $("img").each((_, img) => {
      const attrs = [
        $(img).attr("src"),
        $(img).attr("data-src"),
        $(img).attr("data-lazy-src"),
      ];

      // Xử lý srcset (nhiều URL cách nhau bằng dấu phẩy)
      const srcset = $(img).attr("srcset") || $(img).attr("data-srcset");
      if (srcset) {
        const urls = srcset.split(",").map((s) => s.trim().split(" ")[0]);
        attrs.push(...urls);
      }

      // Duyệt qua tất cả link ảnh và lọc hợp lệ
      for (const src of attrs) {
        if (!src) continue;
        const fullUrl = new URL(src.trim(), base).href;
        if (isValidImage(fullUrl)) comicImages.add(fullUrl);
      }
    });

    return {
      source_url: url,
      title,
      total_images: comicImages.size,
      comic_images: Array.from(comicImages),
    };
  } catch (err) {
    return { error: `Không thể lấy dữ liệu: ${err.message}` };
  }
}

// ======================================
// 🧩 Hàm kiểm tra ảnh hợp lệ
// ======================================
function isValidImage(link) {
  const lower = link.toLowerCase();

  const validExt = [".jpg", ".jpeg", ".png", ".webp"];
  const hasValidExt = validExt.some((ext) => lower.includes(ext));

  const blacklist = [
    "ads",
    "banner",
    "icon",
    "logo",
    "gif",
    "emoji",
    "wp-content/plugins",
    "wp-includes",
    "analytics",
  ];
  const isClean = !blacklist.some((bad) => lower.includes(bad));

  return hasValidExt && isClean;
}

// ======================================
// 🧠 Hàm trả JSON
// ======================================
function jsonResponse(data, status = 200) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(data, null, 2),
  };
}
