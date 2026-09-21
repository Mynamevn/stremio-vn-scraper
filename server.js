const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");

const manifest = {
    "id": "community.bcpprofortv",
    "version": "3.3.0", // Nâng cấp phiên bản để ép thiết bị xóa sạch cache lưu cũ
    "name": "BCP",
    "description": "Hệ thống liên kết tìm kiếm phim tự động bảo mật.",
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

// Sử dụng kho ảnh poster mã hóa nội bộ của Stremio (Bản 3.3.0 sửa dứt điểm lỗi mất ảnh đại diện)
const fixedMovies = [
    { id: "tt1630029", name: "Avatar: The Way of Water", poster: "https://stremio.com" },
    { id: "tt10872600", name: "Spider-Man: No Way Home", poster: "https://stremio.com" },
    { id: "tt2263560", name: "Deadpool & Wolverine", poster: "https://stremio.com" }
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

// BỘ ĐIỀU HƯỚNG TÌM KIẾM THÔNG MINH QUA GOOGLE WRAPPER
builder.defineStreamHandler(async function(args) {
    const streams = [];
    let movieName = "";

    const matchedMovie = fixedMovies.find(m => m.id === args.id);
    if (matchedMovie) {
        movieName = matchedMovie.name;
    } else {
        const meta = await getMovieMetadata(args.id);
        if (meta && meta.name) movieName = meta.name;
    }

    if (!movieName) return { streams: [] };

    // Mã hóa tên phim để chèn vào thanh tìm kiếm Google
    const query1 = encodeURIComponent(movieName + " 1phim32 thuyết minh lồng tiếng");
    const query2 = encodeURIComponent(movieName + " phim nguonc");
    const query3 = encodeURIComponent(movieName + " motphimtv");

    // ƯU TIÊN 1: 1Phim32 điều hướng qua Google (Tự động bắt tên miền mới nhất)
    streams.push({
        name: "🔹 Source 1 (1Phim32)",
        title: "Tìm kiếm '" + movieName + "' trên 1Phim32\n[Tự cập nhật tên miền mới - Không lo bị chặn]",
        externalUrl: "https://google.com" + query1
    });

    // ƯU TIÊN 2: Phim NguồnC điều hướng qua Google
    streams.push({
        name: "🔹 Source 2 (NguồnC)",
        title: "Tìm kiếm '" + movieName + "' trên Phim NguồnC\n[Tự cập nhật tên miền mới - Không lo bị chặn]",
        externalUrl: "https://google.com" + query2
    });

    // ƯU TIÊN 3: MọtPhimTV điều hướng qua Google
    streams.push({
        name: "🔹 Source 3 (MọtPhim)",
        title: "Tìm kiếm '" + movieName + "' trên MọtPhimTV\n[Tự cập nhật tên miền mới - Không lo bị chặn]",
        externalUrl: "https://google.com" + query3
    });

    return { streams: streams };
});

serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 });
