const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");

const manifest = {
    "id": "community.bcpprofortv",
    "version": "3.2.0", // Nâng lên bản 3.2.0 để ép mọi thiết bị xóa sạch bộ nhớ cache bị lỗi cũ
    "name": "BCP",
    "description": "Hệ thống liên kết trình phát video trực tiếp cho 1Phim32, NguonC & MotPhim.",
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

// Danh sách phim sử dụng hệ thống liên kết ảnh gọn nhẹ, tương thích bộ lọc TV LG
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
            description: "Hệ thống liên kết nguồn phát ẩn danh BCP."
        }));
        return { metas: metas };
    }
    return { metas: [] };
});

// BỘ ĐIỀU HƯỚNG LIÊN KẾT PHÁT WEB PLAYER CHUẨN STREMIO - KHÔNG BỊ LỖI PHẦN CỨNG TV
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

    // SỬ DỤNG GIAO THỨC externalUrl KẾT HỢP ĐƯỜNG DẪN EMBED PLAYER ĐỂ PHÁT TRỰC TIẾP MÀN HÌNH PHIM
    // NGUỒN ƯU TIÊN 1: 1Phim32 Player
    streams.push({
        name: "🔹 Source 1 (1Phim32)",
        title: "Xem phim: " + movieName + "\n[Phát trực tiếp qua trình phát 1Phim32 Player]",
        externalUrl: "https://1phim32.com" + cleanSlug + "/"
    });

    // NGUỒN ƯU TIÊN 2: Phim NguồnC Player
    streams.push({
        name: "🔹 Source 2 (NguồnC)",
        title: "Xem phim: " + movieName + "\n[Phát trực tiếp qua trình phát NguồnC Player]",
        externalUrl: "https://nguonc.com" + cleanPlus
    });

    // NGUỒN ƯU TIÊN 3: MọtPhimTV Player
    streams.push({
        name: "🔹 Source 3 (MọtPhim)",
        title: "Xem phim: " + movieName + "\n[Phát trực tiếp qua trình phát MọtPhim Player]",
        externalUrl: "https://motphimtv.run" + cleanPlus
    });

    return { streams: streams };
});

serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 });
