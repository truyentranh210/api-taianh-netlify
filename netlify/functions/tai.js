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
    };

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);

    const html = await res.text();
    const $ = cheerio.load(html);

    const title = $("title").text().trim() || "Không tìm thấy tiêu đề";
    const base = new URL(url).origin;

    const comicImages = [];
    const container = $("div.reading-content");

    if (container.length > 0) {
      container.find("img").each((_, img) => {
        const src =
          $(img).attr("data-src") ||
          $(img).attr("data-lazy-src") ||
          $(img).attr("src");
        if (src) {
          const fullUrl = new URL(src.trim(), base).href;
          if (!comicImages.includes(fullUrl)) comicImages.push(fullUrl);
        }
      });
    }

    return {
      source_url: url,
      title,
      comic_images: comicImages,
    };
  } catch (err) {
    return { error: `Không thể lấy dữ liệu: ${err.message}` };
  }
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
