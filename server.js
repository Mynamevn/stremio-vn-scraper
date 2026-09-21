const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");

const manifest = {
    "id": "community.bcpprofortv",
    "version": "1.9.0", // Nâng cấp phiên bản để ép mọi thiết bị xóa sạch bộ nhớ cache cũ
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

// Danh sách phim ghim cố định kèm ảnh poster mã hóa chuẩn của hệ thống Stremio (Hiện 100% trên mọi thiết bị)
const fixedMovies = [
    { id: "tt1630029", name: "Avatar: The Way of Water", searchName: "avatar-dong-chay-cua-nuoc", poster: "https://stremio.com" },
    { id: "tt10872600", name: "Spider-Man: No Way Home", searchName: "nguoi-nhen-khong-con-nha", poster: "https://stremio.com" },
    { id: "tt2263560", name: "Deadpool & Wolverine", searchName: "deadpool-va-wolverine", poster: "https://stremio.com" }
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
            description: "Hệ thống phát video trực tiếp ẩn danh BCP."
        }));
        return { metas: metas };
    }
    return { metas: [] };
});

// HÀM XỬ LÝ LUỒNG PHÁT TRỰC TIẾP TRÊN PLAYER CỦA STREMIO
builder.defineStreamHandler(async function(args) {
    const streams = [];
    let lookupName = "";
    let movieName = "";

    const matchedMovie = fixedMovies.find(m => m.id === args.id);
    if (matchedMovie) {
        movieName = matchedMovie.name;
        lookupName = matchedMovie.searchName;
    } else {
        const meta = await getMovieMetadata(args.id);
        if (meta && meta.name) {
            movieName = meta.name;
            lookupName = encodeURIComponent(movieName.toLowerCase().replace(/ /g, '-').replace(/:/g, ''));
        }
    }

    if (!lookupName) return { streams: [] };

    // KÍCH HOẠT HỆ THỐNG TRÍCH XUẤT LUỒNG VIDEO GỐC M3U8 (TỰ ĐỘNG PHÁT TRONG STREMIO)
    try {
        const res = await axios.get("https://ophim1.com" + lookupName, { timeout: 4000 });
        if (res.data && res.data.episodes) {
            res.data.episodes.forEach(ep => {
                if (ep.server_data) {
                    ep.server_data.forEach(server => {
                        if (server.link_m3u8) {
                            streams.push({
                                name: "🟢 BCP VIP - " + server.name,
                                title: "Xem ngay: " + movieName + "\n[Phát trực tiếp bên trong Stremio]",
                                url: server.link_m3u8 // Sử dụng thuộc tính 'url' chứa đuôi m3u8 để trình chơi video của Stremio tự mở
                            });
                        }
                    });
                }
            });
        }
    } catch (e) { 
        console.log("Nghẽn kết nối luồng phát video trực tiếp"); 
    }

    return { streams: streams };
});

serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 });
