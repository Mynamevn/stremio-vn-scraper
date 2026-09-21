const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");

const manifest = {
    "id": "community.bcpprofortv",
    "version": "1.6.0",
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
            "extra": [{ "name": "search", "isRequired": false }] // Kích hoạt đồng bộ sang tab Discover
        }
    ]
};

const builder = new addonBuilder(manifest);

// Thay đổi toàn bộ ảnh đại diện sang địa chỉ ảnh tĩnh phổ biến để TV LG không bị lỗi chặn SSL hoặc Cache
const fixedMovies = [
    { id: "tt1630029", name: "Avatar: The Way of Water", poster: "https://metacritic.com" },
    { id: "tt10872600", name: "Spider-Man: No Way Home", poster: "https://metacritic.com" },
    { id: "tt2263560", name: "Deadpool & Wolverine", poster: "https://metacritic.com" }
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

// Handler Catalog hiển thị đồng thời lên cả Board và Discover
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

// Handler bóc tách luồng phát theo đúng 3 nguồn ưu tiên của bạn
builder.defineStreamHandler(async function(args) {
    const streams = [];
    let movieName = "";

    const matchedMovie = fixedMovies.find(m => m.id === args.id);
    if (matchedMovie) {
        movieName = matchedMovie.name;
    } else {
        const meta = await getMovieMetadata(args.id);
        if (meta) movieName = meta.name;
    }

    if (!movieName) return { streams: [] };

    // Chuẩn hóa các kiểu định dạng tìm kiếm cho từng trang web
    const searchSlug = encodeURIComponent(movieName.toLowerCase().replace(/ /g, '-').replace(/:/g, ''));
    const searchPlus = encodeURIComponent(movieName.replace(/ /g, '+'));

    // ƯU TIÊN 1: 1Phim32 (Cấu trúc: /search/ten-phim/)
    streams.push({
        name: "🔹 Source 1 (1Phim32)",
        title: "Tìm phim '" + movieName + "' trên 1Phim32\n(Nguồn phim thuyết minh/lồng tiếng ưu tiên)",
        url: "https://1phim32.com" + searchSlug + "/"
    });

    // ƯU TIÊN 2: Phim NguồnC (Cấu trúc: /tim-kiem?keyword=ten+phim)
    streams.push({
        name: "🔹 Source 2 (NguồnC)",
        title: "Tìm phim '" + movieName + "' trên Phim NguồnC\n(Nguồn phát dự phòng số 1)",
        url: "https://nguonc.com" + searchPlus
    });

    // ƯU TIÊN 3: MọtPhimTV (Cấu trúc: /?search=ten+phim)
    streams.push({
        name: "🔹 Source 3 (MọtPhim)",
        title: "Tìm phim '" + movieName + "' trên MọtPhimTV\n(Nguồn phát dự phòng số 2)",
        url: "https://motphimtv.run/?search=" + searchPlus
    });

    return { streams: streams };
});

serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 });
