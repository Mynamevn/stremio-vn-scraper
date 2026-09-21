const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");

const manifest = {
    "id": "community.bcpprofortv",
    "version": "7.0.0", // Nâng lên bản 7.0.0 để ép mọi thiết bị làm sạch cache cũ
    "name": "BCP",
    "description": "Private native stream player connector for 1Phim32, NguonC & MotPhim.",
    "resources": ["stream", "catalog"],
    "types": ["movie", "series"],
    "idPrefixes": ["tt"],
    "catalogs": [
        {
            "type": "movie",
            "id": "bcp_fixed",
            "name": "Mục Tổng Hợp",
            "extra": [{ "name": "search", "isRequired": false }]
        }
    ]
};

const builder = new addonBuilder(manifest);

// Danh sách phim sử dụng dải ảnh mã hóa nội bộ của Stremio (Đảm bảo hiện ảnh 100% trên giao diện Discover)
const fixedMovies = [
    { id: "tt1630029", name: "Avatar: The Way of Water", slug: "avatar-the-way-of-water", plus: "avatar+the+way+of+water", poster: "https://stremio.com" },
    { id: "tt10872600", name: "Spider-Man: No Way Home", slug: "spider-man-no-way-home", plus: "spider-man+no+way+home", poster: "https://stremio.com" },
    { id: "tt2263560", name: "Deadpool & Wolverine", slug: "deadpool-wolverine", plus: "deadpool+wolverine", poster: "https://stremio.com" }
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

builder.defineCatalogHandler(async function(args) {
    if (args.id === "bcp_fixed") {
        const metas = fixedMovies.map(movie => ({
            id: movie.id,
            type: "movie",
            name: movie.name,
            poster: movie.poster,
            description: "Hệ thống phát video trực tiếp nội bộ BCP."
        }));
        return { metas: metas };
    }
    return { metas: [] };
});

// BỘ ĐỒNG BỘ PHÁT VIDEO CHẠY TRỰC TIẾP TRÊN PLAYER GỐC CỦA STREMIO
builder.defineStreamHandler(async function(args) {
    const streams = [];
    let movieName = "";
    let cleanSlug = "";
    let cleanPlus = "";

    const matchedMovie = fixedMovies.find(m => m.id === args.id);
    if (matchedMovie) {
        movieName = matchedMovie.name;
        cleanSlug = matchedMovie.slug;
        cleanPlus = matchedMovie.plus;
    } else {
        const meta = await getMovieMetadata(args.id);
        if (meta && meta.name) {
            movieName = meta.name;
            cleanSlug = encodeURIComponent(movieName.toLowerCase().replace(/ /g, '-').replace(/:/g, ''));
            cleanPlus = encodeURIComponent(movieName.replace(/ /g, '+'));
        }
    }

    if (!movieName) return { streams: [] };

    // ĐƯỜNG DẪN ĐÓNG GÓI VIDEO THUẦN TƯƠNG THÍCH BỘ GIẢI MÃ STREMIO TRÊN TV LG
    // ƯU TIÊN 1: 1Phim32 Luồng Trực Tiếp Nội Bộ
    streams.push({
        name: "🔹 Source 1 (1Phim32)",
        title: "Xem phim: " + movieName + "\n[Phát trực tiếp ngay trong trình chơi Stremio]",
        url: "https://1phim32.com" + cleanSlug + "/video.mp4" // Thủ thuật đóng gói đuôi video giả lập để ép TV LG tự phát trực tiếp
    });

    // ƯU TIÊN 2: Phim NguồnC Luồng Trực Tiếp Nội Bộ
    streams.push({
        name: "🔹 Source 2 (NguồnC)",
        title: "Xem phim: " + movieName + "\n[Phát trực tiếp ngay trong trình chơi Stremio]",
        url: "https://nguonc.com" + cleanPlus + "&file=video.m3u8"
    });

    // ƯU TIÊN 3: MọtPhimTV Luồng Trực Tiếp Nội Bộ
    streams.push({
        name: "🔹 Source 3 (MọtPhim)",
        title: "Xem phim: " + movieName + "\n[Phát trực tiếp ngay trong trình chơi Stremio]",
        url: "https://motphimtv.run" + cleanPlus + "&output=stream.m3u8"
    });

    return { streams: streams };
});

serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 });
