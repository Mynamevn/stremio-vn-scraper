const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");

const manifest = {
    "id": "community.bcpprofortv",
    "version": "2.0.0", // Nâng cấp lên cấu trúc 2.0.0 để buộc TV và điện thoại xóa sạch cache cũ
    "name": "BCP",
    "description": "Private media stream utility dashboard.",
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

// Danh sách phim kèm liên kết ảnh nạp trực tiếp nội bộ từ hệ thống Cinemeta Stremio
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

// Handler Catalog hiển thị hàng phim cố định
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

// Handler xử lý hiển thị luồng phát trực tiếp bên trong trình phát Stremio
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

    // SỬ DỤNG PHƯƠNG PHÁP NHÚNG PLAYER NỘI BỘ TRỰC TIẾP VÀO TRÌNH CHƠI VIDEO CỦA STREMIO
    // ƯU TIÊN 1: 1Phim32
    streams.push({
        name: "🔹 Source 1 (1Phim32)",
        title: "Xem phim: " + movieName + "\n[Phát trực tiếp qua máy chủ 1Phim32]",
        url: "https://1phim32.com" + cleanSlug + "/"
    });

    // ƯU TIÊN 2: Phim NguồnC
    streams.push({
        name: "🔹 Source 2 (NguồnC)",
        title: "Xem phim: " + movieName + "\n[Phát trực tiếp qua máy chủ Phim NguồnC]",
        url: "https://nguonc.com" + cleanPlus
    });

    // ƯU TIÊN 3: MọtPhimTV
    streams.push({
        name: "🔹 Source 3 (MọtPhim)",
        title: "Xem phim: " + movieName + "\n[Phát trực tiếp qua máy chủ MọtPhimTV]",
        url: "https://motphimtv.run" + cleanPlus
    });

    return { streams: streams };
});

serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 });
