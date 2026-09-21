const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");

const manifest = {
    "id": "community.bcpprofortv", // Thay đổi ID để ép Stremio xóa hoàn toàn cache cũ trên TV LG
    "version": "1.4.5",
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

const fixedMovies = [
    { id: "tt1630029", name: "Avatar: The Way of Water", poster: "https://tmdb.org" },
    { id: "tt6718170", name: "Spider-Man: Into the Spider-Verse", poster: "https://tmdb.org" },
    { id: "tt10872600", name: "Spider-Man: No Way Home", poster: "https://tmdb.org" },
    { id: "tt2263560", name: "Deadpool & Wolverine", poster: "https://tmdb.org" },
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

builder.defineCatalogHandler(async function(args) {
    if (args.id === "bcp_fixed") {
        const metas = fixedMovies.map(movie => ({
            id: movie.id,
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
    const searchPlus = encodeURIComponent(movieName.replace(/ /g, '+'));

    // Gửi thẳng luồng m3u8 động qua API
    try {
        const res = await axios.get("https://ophim1.com" + movieName.toLowerCase().replace(/ /g, '-'), { timeout: 4000 });
        if (res.data && res.data.episodes) {
            res.data.episodes.forEach(ep => {
                if (ep.server_data) {
                    ep.server_data.forEach(server => {
                        if (server.link_m3u8) {
                            streams.push({
                                name: "🔹 Source VIP 1",
                                title: "Phát trực tiếp: " + server.name + "\nLuồng video HLS chuẩn TV",
                                url: server.link_m3u8
                            });
                        }
                    });
                }
            });
        }
    } catch (e) { 
        console.log("Nghẽn API tìm kiếm"); 
    }

    // Luồng dự phòng liên kết
    streams.push({
        name: "🔹 Source Web 2",
        title: "Tìm kiếm '" + movieName + "' trên MọtPhimTV",
        url: "https://motphimtv.run" + searchPlus
    });

    return { streams: streams };
});

serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 });
