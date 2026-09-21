const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
    "id": "community.myvietnamesescraper",
    "version": "1.2.0",
    "name": "BCP",
    "description": "Private media stream utility dashboard.",
    "resources": ["stream", "catalog"],
    "types": ["movie", "series"],
    "idPrefixes": ["tt"],
    "catalogs": [
        {
            "type": "movie",
            "id": "1phim32_new",
            "name": "Mục 1"
        },
        {
            "type": "movie",
            "id": "nguonc_new",
            "name": "Mục 2"
        },
        {
            "type": "movie",
            "id": "motphim_new",
            "name": "Mục 3"
        }
    ]
};

const builder = new addonBuilder(manifest);

const requestHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
    "Cache-Control": "max-age=0"
};

async function getMovieMetadata(imdbId) {
    try {
        const res = await axios.get("https://stremio.com" + imdbId + ".json", { timeout: 4000 });
        if (res.data && res.data.meta) {
            return {
                name: res.data.meta.name,
                year: res.data.meta.year || ""
            };
        }
        return null;
    } catch (e) {
        return null;
    }
}

// 1. XỬ LÝ GIAO DIỆN MỤC PHIM (CATALOG HANDLER)
builder.defineCatalogHandler(async function(args) {
    const catalogItems = [];
    
    if (args.id === "1phim32_new") {
        try {
            const res = await axios.get("https://1phim32.com", { headers: requestHeaders, timeout: 5000 });
            const $ = cheerio.load(res.data);
            $('.list-films .item').each((i, el) => {
                const title = $(el).find('a').attr('title') || $(el).find('.title').text().trim();
                const href = $(el).find('a').attr('href');
                const img = $(el).find('img').attr('src');
                if (title && href) {
                    catalogItems.push({
                        id: "1phim32_" + encodeURIComponent(title),
                        type: "movie",
                        name: title,
                        poster: img || ""
                    });
                }
            });
        } catch (err) { console.log("Lỗi tải mục phim 1"); }
    }

    if (args.id === "nguonc_new") {
        try {
            const res = await axios.get("https://nguonc.com", { headers: requestHeaders, timeout: 5000 });
            const $ = cheerio.load(res.data);
            $('.list-films .item').each((i, el) => {
                const title = $(el).find('a').text().trim();
                const href = $(el).find('a').attr('href');
                if (title && href) {
                    catalogItems.push({
                        id: "nguonc_" + encodeURIComponent(title),
                        type: "movie",
                        name: title,
                        poster: ""
                    });
                }
            });
        } catch (err) { console.log("Lỗi tải mục phim 2"); }
    }

    if (args.id === "motphim_new") {
        try {
            const res = await axios.get("https://motphimtv.run", { headers: requestHeaders, timeout: 5000 });
            const $ = cheerio.load(res.data);
            $('.list-films .item, .list-film .item, .post-item').each((i, el) => {
                const title = $(el).find('a').attr('title') || $(el).find('h3').text().trim() || $(el).find('.title').text().trim();
                const href = $(el).find('a').attr('href');
                const img = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');
                if (title && href) {
                    catalogItems.push({
                        id: "motphim_" + encodeURIComponent(title),
                        type: "movie",
                        name: title,
                        poster: img || ""
                    });
                }
            });
        } catch (err) { console.log("Lỗi tải mục phim 3"); }
    }

    return { metas: catalogItems };
});

// 2. XỬ LÝ LẤY LUỒNG PHÁT VIDEO (STREAM HANDLER)
builder.defineStreamHandler(async function(args) {
    const streams = [];
    let movieName = "";

    if (args.id.startsWith("1phim32_") || args.id.startsWith("nguonc_") || args.id.startsWith("motphim_")) {
        movieName = decodeURIComponent(args.id.replace("1phim32_", "").replace("nguonc_", "").replace("motphim_", ""));
    } else {
        const meta = await getMovieMetadata(args.id);
        if (meta) movieName = meta.name;
    }

    if (!movieName) return { streams: [] };

    const searchSlug = encodeURIComponent(movieName.toLowerCase().replace(/ /g, '-'));
    const searchQuery = encodeURIComponent(movieName);
    const searchPlus = encodeURIComponent(movieName.replace(/ /g, '+'));

    // SOURCE 1: 1PHIM32
    try {
        const url1 = "https://1phim32.com" + searchSlug + "/";
        const res1 = await axios.get(url1, { headers: requestHeaders, timeout: 5000 });
        const $ = cheerio.load(res1.data);
        let videoSrc = $("iframe").attr("src") || $("video").attr("src");
        if (videoSrc) {
            streams.push({ name: "🔹 Source 1-A", title: "Stream: " + movieName, url: videoSrc });
        } else {
            $('.list-films .item a').each((i, el) => {
                const href = $(el).attr('href');
                if (href) streams.push({ name: "🔹 Source 1-B", title: "Link: " + movieName, url: href });
            });
        }
    } catch (err) { console.log("Lỗi Source 1"); }

    // SOURCE 2: PHIM NGUỒNC
    try {
        const url2 = "https://nguonc.com?s=" + searchQuery;
        const res2 = await axios.get(url2, { headers: requestHeaders, timeout: 5000 });
        const $ = cheerio.load(res2.data);
        let videoSrc2 = $("iframe").attr("src") || $("video").attr("src");
        if (videoSrc2) {
            streams.push({ name: "🔹 Source 2-A", title: "Stream: " + movieName, url: videoSrc2 });
        } else {
            $('.list-films .item a').each((i, el) => {
                const href = $(el).attr('href');
                if (href) {
                    const fullHref = href.indexOf('http') === 0 ? href : "https://nguonc.com" + href;
                    streams.push({ name: "🔹 Source 2-B", title: "Link: " + movieName, url: fullHref });
                }
            });
        }
    } catch (err) { console.log("Lỗi Source 2"); }

    // SOURCE 3: MỌTPHIMTV
    try {
        const url3 = "https://motphimtv.run?search=" + searchPlus;
        const res3 = await axios.get(url3, { headers: requestHeaders, timeout: 5000 });
        const $ = cheerio.load(res3.data);
        
        $('.list-films .item a, .list-film .item a, a.movie-item').each((i, el) => {
            const href = $(el).attr('href');
            const title = $(el).attr('title') || $(el).find('.title').text().trim() || "MọtPhim Link";
            if (href) {
                const fullHref = href.indexOf('http') === 0 ? href : "https://motphimtv.run" + href;
                streams.push({
                    name: "🔹 Source 3",
                    title: "MọtPhimTV: " + title,
                    url: fullHref
                });
            }
        });
    } catch (err) { console.log("Lỗi Source 3"); }

    return { streams: streams };
});

serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 });
