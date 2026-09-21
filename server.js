const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");

const manifest = {
    "id": "community.bcpprofortv",
    "version": "1.5.0",
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
            "extra": [{ "name": "search", "isRequired": false }] // Kích hoạt tính năng đồng bộ sang mục Discover
        }
    ]
};

const builder = new addonBuilder(manifest);

// Hệ thống danh sách phim kèm poster độ phân giải tối ưu cho TV LG
const fixedMovies = [
    { id: "tt1630029", name: "Avatar", searchName: "avatar", poster: "https://phimimg.com" },
    { id: "tt10872600", name: "Spider-Man: No Way Home", searchName: "spider-man-no-way-home", poster: "https://phimimg.com" },
    { id: "tt2263560", name: "Deadpool & Wolverine", searchName: "deadpool-wolverine", poster: "https://phimimg.com" }
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

// Handler đồng bộ hiển thị Catalog lên cả Board lẫn Discover
builder.defineCatalogHandler(async function(args) {
    if (args.id === "bcp_fixed") {
        const metas = fixedMovies.map(movie => ({
            id: movie.id,
            type: "movie",
            name: movie.name,
            poster: movie.poster,
            description: "Xem trực tiếp qua hệ thống luồng phát BCP."
        }));
        return { metas: metas };
    }
    return { metas: [] };
});

// Handler xử lý tìm và bóc tách luồng phát trực tiếp
builder.defineStreamHandler(async function(args) {
    const streams = [];
    let movieName = "";
    let lookupName = "";

    // Tìm kiếm xem phim có nằm trong danh sách ghim cố định hay không để lấy tên tìm kiếm chuẩn
    const matchedMovie = fixedMovies.find(m => m.id === args.id);
    if (matchedMovie) {
        movieName = matchedMovie.name;
        lookupName = matchedMovie.searchName;
    } else {
        const meta = await getMovieMetadata(args.id);
        if (meta) {
            movieName = meta.name;
            lookupName = meta.name.toLowerCase().replace(/ /g, '-');
        }
    }

    if (!movieName) return { streams: [] };
    const searchPlus = encodeURIComponent(movieName.replace(/ /g, '+'));

    // GỌI KÊNH VIP: Kết nối API mở lấy luồng m3u8 phát trực tiếp cho TV LG
    try {
        const res = await axios.get("https://ophim1.com" + lookupName, { timeout: 4000 });
        if (res.data && res.data.episodes) {
            res.data.episodes.forEach(ep => {
                if (ep.server_data) {
                    ep.server_data.forEach(server => {
                        if (server.link_m3u8) {
                            streams.push({
                                name: "🔹 Source VIP 1",
                                title: "Phát trực tiếp: " + movieName + "\nNguồn: " + server.name + " (Tải nhanh)",
                                url: server.link_m3u8
                            });
                        }
                    });
                }
            });
        }
    } catch (e) { 
        console.log("Nghẽn cổng kết nối API VIP"); 
    }

    // KÊNH DỰ PHÒNG: Link tìm kiếm nhanh
    streams.push({
        name: "🔹 Source Web 2",
        title: "Tìm kiếm '" + movieName + "' trên MọtPhimTV",
        url: "https://motphimtv.run" + searchPlus
    });

    return { streams: streams };
});

serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 });
