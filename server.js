const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");

const manifest = {
    "id": "community.myvietnamesescraper",
    "version": "1.4.0",
    "name": "BCP",
    "description": "Private media stream utility dashboard.",
    "resources": ["stream", "catalog"],
    "types": ["movie", "series"],
    "idPrefixes": ["tt"],
    "catalogs": [
        {
            "type": "movie",
            "id": "bcp_fixed",
            "name": "Mục Tổng Hợp"
        }
    ]
};

const builder = new addonBuilder(manifest);

// Giải pháp Ghim cố định Phim Phổ Biến để Catalog không bao giờ bị biến mất trên TV LG
const fixedMovies = [
    { id: "tt1630029", name: "Avatar: The Way of Water", poster: "https://tmdb.org" },
    { id: "tt6718170", name: "Spider-Man: Into the Spider-Verse", poster: "https://tmdb.org" },
    { id: "tt10872600", name: "Spider-Man: No Way Home", poster: "https://tmdb.org" },
    { id: "tt22 F63560", name: "Deadpool & Wolverine", poster: "https://tmdb.org" },
    { id: "tt5433138", name: "Fast & Furious Crossroads", poster: "https://tmdb.org" }
];

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

// Handler danh mục cố định, đảm bảo luôn hiển thị rực rỡ
builder.defineCatalogHandler(async function(args) {
    if (args.id === "bcp_fixed") {
        const metas = fixedMovies.map(movie => ({
            id: movie.id, // Sử dụng thẳng mã IMDb quốc tế
            type: "movie",
            name: movie.name,
            poster: movie.poster
        }));
        return { metas: metas };
    }
    return { metas: [] };
});

builder.defineStreamHandler(async function(args) {
    const streams = [];
    const meta = await getMovieMetadata(args.id);
    if (!meta || !meta.name) return { streams: [] };
    
    const movieName = meta.name;
    const searchQuery = encodeURIComponent(movieName);
    const searchPlus = encodeURIComponent(movieName.replace(/ /g, '+'));

    // LUỒNG PHÁT VƯỢT RÀO: Gửi lệnh tìm kiếm tới API mở
    try {
        const res = await axios.get("https://ophim1.com" + movieName.toLowerCase().replace(/ /g, '-'), { timeout: 4000 });
        if (res.data && res.data.episodes) {
            res.data.episodes.forEach(ep => {
                if (ep.server_data) {
                    ep.server_data.forEach(server => {
                        if (server.link_m3u8) {
                            streams.push({
                                name: "🔹 Source VIP 1",
                                title: "Phát trực tiếp chất lượng cao\nNguồn: " + server.name,
                                url: server.link_m3u8 // TV LG sẽ tự mở bằng trình chơi video nội bộ
                            });
                        }
                    });
                }
            });
        }
    } catch (e) { 
        console.log("Nghẽn API tìm kiếm trực tiếp"); 
    }

    // LUỒNG DỰ PHÒNG CHUYỂN TRANG: Hỗ trợ tìm kiếm nhanh
    streams.push({
        name: "🔹 Source Web 2",
        title: "Tìm kiếm phim '" + movieName + "' trên MọtPhimTV",
        url: "https://motphimtv.run" + searchPlus
    });

    return { streams: streams };
});

serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 });
