const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
    "id": "community.myvietnamesescraper",
    "version": "1.0.0",
    "name": "Bộ Cào Phim 1Phim32 & NguồnC",
    "description": "Tự động tìm kiếm và lấy nguồn trực tiếp từ 1phim32 và phim.nguonc.",
    "resources": ["stream"],
    "types": ["movie", "series"],
    "idPrefixes": ["tt"]
};

const builder = new addonBuilder(manifest);

async function getMovieName(imdbId) {
    try {
        const res = await axios.get("https://stremio.com" + imdbId + ".json");
        return res.data.meta ? res.data.meta.name : null;
    } catch (e) {
        return null;
    }
}

builder.defineStreamHandler(async function(args) {
    const imdbId = args.id;
    const movieName = await getMovieName(imdbId);
    if (!movieName) return { streams: [] };

    const streams = [];
    const searchSlug = encodeURIComponent(movieName.toLowerCase().replace(/ /g, '-'));
    const searchQuery = encodeURIComponent(movieName);

    // 1. Cào từ trang 1Phim32
    try {
        const url1 = "https://1phim32.com" + searchSlug + "/";
        const res1 = await axios.get(url1, { headers: { "User-Agent": "Mozilla/5.0" } });
        const $ = cheerio.load(res1.data);
        $('.list-films .item a').each((i, el) => {
            const href = $(el).attr('href');
            const title = $(el).text().trim() || "1Phim32 Link";
            if (href) {
                streams.push({
                    name: "1Phim32",
                    title: "Xem phim: " + title,
                    externalUrl: href
                });
            }
        });
    } catch (err) { 
        console.log("Lỗi 1phim32 hoặc không tìm thấy phim"); 
    }

    // 2. Cào từ trang Phim NguồnC
    try {
        const url2 = "https://nguonc.com" + searchQuery;
        const res2 = await axios.get(url2, { headers: { "User-Agent": "Mozilla/5.0" } });
        const $ = cheerio.load(res2.data);
        $('.list-films .item a').each((i, el) => {
            const href = $(el).attr('href');
            const title = $(el).text().trim() || "NguồnC Link";
            if (href) {
                streams.push({
                    name: "NguồnC",
                    title: "Xem phim: " + title,
                    externalUrl: href.indexOf('http') === 0 ? href : "https://nguonc.com" + href
                });
            }
        });
    } catch (err) { 
        console.log("Lỗi NguonC hoặc không tìm thấy phim"); 
    }

    return { streams: streams };
});

serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 });
