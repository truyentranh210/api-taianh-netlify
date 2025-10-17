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
      "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8"
    };

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);

    const html = await res.text();
    const $ = cheerio.load(html);

    const title = $("title").text().trim() || "Không tìm thấy tiêu đề";
    const base = new URL(url).origin;

    let comicImages = [];

    // Ưu tiên vùng đọc truyện
    const containers = [
      "div.reading-content",
      "div.entry-content",
      "div.main-content",
      "div#content",
    ];

    for (const sel of containers) {
      const container = $(sel);
      if (container.length > 0) {
        container.find("img").each((_, img) => {
          const src =
            $(img).attr("data-src") ||
            $(img).attr("data-lazy-src") ||
            $(img).attr("src");

          if (src) {
            const fullUrl = new URL(src.trim(), base).href;

            // Lọc chỉ giữ ảnh hợp lệ
            if (isValidImage(fullUrl)) {
              comicImages.push(fullUrl);
            }
          }
        });
      }
    }

    // Xóa trùng
    comicImages = [...new Set(comicImages)];

    return {
      source_url: url,
      title,
      total_images: comicImages.length,
      comic_images: comicImages
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

  // Chỉ chấp nhận file ảnh phổ biến
  const validExt = [".jpg", ".jpeg", ".png", ".webp"];
  const hasValidExt = validExt.some(ext => lower.includes(ext));

  // Loại bỏ quảng cáo / icon / tracking
  const blacklist = [
    "ads",
    "banner",
    "icon",
    "logo",
    "gif",
    "emoji",
    "wp-content/plugins",
    "wp-includes"
  ];
  const isClean = !blacklist.some(bad => lower.includes(bad));

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
