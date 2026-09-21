const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");

const manifest = {
    "id": "community.myvietnamesescraper",
    "version": "1.3.0",
    "name": "BCP",
    "description": "Private media stream utility dashboard.",
    "resources": ["stream", "catalog"],
    "types": ["movie", "series"],
    "idPrefixes": ["tt"],
    "catalogs": [
        {
            "type": "movie",
            "id": "bcp_trending",
            "name": "Mục Tổng Hợp"
        }
    ]
};

const builder = new addonBuilder(manifest);

// Sử dụng API cổng chung cấu trúc mở để hạn chế tối đa việc bị Cloudflare chặn IP Render
async function getMovieMetadata(imdbId) {
    try {
        const res = await axios.get("https://stremio.com" + imdbId + ".json", { timeout: 4000 });
        if (res.data && res.data.meta) {
            return { name: res.data.meta.name };
        }
        return null;
    } catch (e) {
        return null;
    }
}

// Bẫy lỗi Catalog: Trả về danh mục trống thay vì sập hệ thống nếu bị chặn IP
builder.defineCatalogHandler(async function(args) {
    const catalogItems = [];
    if (args.id === "bcp_trending") {
        try {
            // Thử nghiệm lấy danh sách phim qua một endpoint API mở trung gian ổn định hơn
            const res = await axios.get("https://ophim1.com", { timeout: 4000 });
            if (res.data && res.data.items) {
                res.data.items.forEach(item => {
                    catalogItems.push({
                        id: "bcp_" + encodeURIComponent(item.name),
                        type: "movie",
                        name: item.name,
                        poster: "https://ophim.cc" + item.thumb_url + "&w=1920&q=75"
                    });
                });
            }
        } catch (err) { 
            console.log("Tường lửa chặn mục phim, chuyển sang chế độ chờ..."); 
        }
    }
    return { metas: catalogItems };
});

builder.defineStreamHandler(async function(args) {
    const streams = [];
    let movieName = "";

    if (args.id.startsWith("bcp_")) {
        movieName = decodeURIComponent(args.id.replace("bcp_", ""));
    } else {
        const meta = await getMovieMetadata(args.id);
        if (meta) movieName = meta.name;
    }

    if (!movieName) return { streams: [] };
    const searchQuery = encodeURIComponent(movieName);

    // Kênh 1: Giải pháp API mở (Tỉ lệ Live cao trên Render)
    try {
        const res = await axios.get("https://ophim1.com" + searchQuery.toLowerCase().replace(/%20/g, '-'), { timeout: 4000 });
        if (res.data && res.data.episodes) {
            res.data.episodes.forEach(ep => {
                if (ep.server_data) {
                    ep.server_data.forEach(server => {
                        if (server.link_m3u8) {
                            streams.push({
                                name: "🔹 Source VIP 1",
                                title: "Luồng trực tiếp: " + server.name + "\nBấm để xem ngay trên TV",
                                url: server.link_m3u8
                            });
                        }
                    });
                }
            });
        }
    } catch (e) { console.log("Kênh 1 tạm thời nghẽn IP"); }

    // Kênh 2: Dự phòng cào link web nhúng
    try {
        const searchPlus = encodeURIComponent(movieName.replace(/ /g, '+'));
        streams.push({
            name: "🔹 Source Web 2",
            title: "Mở liên kết trình phát MọtPhimTV",
            url: "https://motphimtv.run" + searchPlus
        });
    } catch (e) { console.log("Kênh 2 lỗi"); }

    return { streams: streams };
});

serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 });
