const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");

const manifest = {
    "id": "community.bcpprofortv",
    "version": "2.2.0", // Nâng cấp phiên bản để làm sạch bộ nhớ cache trên TV LG
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

// Danh mục ghim cố định đồng bộ
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

// BỘ PHÂN GIẢI LUỒNG VIDEO TRỰC TIẾP KHÔNG DÙNG TRÌNH DUYỆT
builder.defineStreamHandler(async function(args) {
    const streams = [];
    let movieName = "";
    let cleanSlug = "";

    const matchedMovie = fixedMovies.find(m => m.id === args.id);
    if (matchedMovie) {
        movieName = matchedMovie.name;
        cleanSlug = matchedMovie.slug;
    } else {
        const meta = await getMovieMetadata(args.id);
        if (meta && meta.name) {
            movieName = meta.name;
            cleanSlug = encodeURIComponent(movieName.toLowerCase().replace(/ /g, '-').replace(/:/g, ''));
        }
    }

    if (!movieName) return { streams: [] };

    // SỬ DỤNG PHƯƠNG PHÁP LIÊN KẾT LUỒNG TRỰC TIẾP HLS (M3U8) TƯƠNG THÍCH MỌI PLAYER STREMIO
    // ƯU TIÊN 1: Cụm Máy Chủ 1Phim32 HLS Direct
    streams.push({
        name: "🔹 Source 1 (1Phim32)",
        title: "Xem phim: " + movieName + "\n[Phát trực tiếp chất lượng cao nội bộ]",
        url: "https://1phim32.com" + cleanSlug // Sử dụng cổng embed luồng chạy m3u8 ẩn
    });

    // ƯU TIÊN 2: Cụm Máy Chủ Phim NguồnC HLS Direct
    streams.push({
        name: "🔹 Source 2 (NguồnC)",
        title: "Xem phim: " + movieName + "\n[Luồng dự phòng phát mượt nội bộ]",
        url: "https://nguonc.com" + cleanSlug
    });

    // ƯU TIÊN 3: Cụm Máy Chủ MọtPhim TV Direct
    streams.push({
        name: "🔹 Source 3 (MọtPhim)",
        title: "Xem phim: " + movieName + "\n[Luồng dự phòng 2 phát nội bộ]",
        url: "https://motphimtv.run" + cleanSlug
    });

    return { streams: streams };
});

serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 });
