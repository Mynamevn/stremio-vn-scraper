const express = require("express");
const axios = require("axios");
const {
    addonBuilder,
    getRouter
} = require("stremio-addon-sdk");


// ============================================================
// MANIFEST
// ============================================================

const manifest = {
    id: "community.bcpprofortv",
    version: "7.0.0",

    name: "BCP",

    description:
        "Private native stream player connector for 1Phim32, NguonC & MotPhim.",

    resources: [
        "stream",
        "catalog"
    ],

    types: [
        "movie",
        "series"
    ],

    idPrefixes: [
        "tt"
    ],

    catalogs: [
        {
            type: "movie",
            id: "bcp_fixed",
            name: "Mục Tổng Hợp",

            extra: [
                {
                    name: "search",
                    isRequired: false
                }
            ]
        }
    ]
};


// ============================================================
// ADDON BUILDER
// ============================================================

const builder = new addonBuilder(manifest);


// ============================================================
// DANH SÁCH PHIM CỐ ĐỊNH
// ============================================================

const fixedMovies = [
    {
        id: "tt1630029",
        name: "Avatar: The Way of Water",
        slug: "avatar-the-way-of-water",
        plus: "avatar+the+way+of+water",
        poster: "https://stremio.com"
    },

    {
        id: "tt10872600",
        name: "Spider-Man: No Way Home",
        slug: "spider-man-no-way-home",
        plus: "spider-man+no+way+home",
        poster: "https://stremio.com"
    },

    {
        id: "tt2263560",
        name: "Deadpool & Wolverine",
        slug: "deadpool-wolverine",
        plus: "deadpool+wolverine",
        poster: "https://stremio.com"
    }
];


// ============================================================
// METADATA
// ============================================================

async function getMovieMetadata(imdbId) {

    try {

        const res = await axios.get(
            "https://stremio.com" + imdbId + ".json",
            {
                timeout: 4000
            }
        );

        if (
            res.data &&
            res.data.meta
        ) {

            return {
                name: res.data.meta.name
            };
        }

        return null;

    } catch (e) {

        console.error(
            "[METADATA ERROR]",
            imdbId,
            e.message
        );

        return null;
    }
}


// ============================================================
// CATALOG HANDLER
// ============================================================

builder.defineCatalogHandler(async function(args) {

    console.log(
        "[CATALOG]",
        JSON.stringify(args)
    );

    if (args.id === "bcp_fixed") {

        const metas = fixedMovies.map(movie => ({

            id: movie.id,

            type: "movie",

            name: movie.name,

            poster: movie.poster,

            description:
                "Hệ thống phát video trực tiếp nội bộ BCP."
        }));

        return {
            metas: metas
        };
    }

    return {
        metas: []
    };
});


// ============================================================
// STREAM HANDLER
// ============================================================

builder.defineStreamHandler(async function(args) {

    console.log(
        "[STREAM REQUEST]",
        JSON.stringify(args)
    );

    const streams = [];

    let movieName = "";
    let cleanSlug = "";
    let cleanPlus = "";


    // --------------------------------------------------------
    // TÌM PHIM TRONG DANH SÁCH CỐ ĐỊNH
    // --------------------------------------------------------

    const matchedMovie =
        fixedMovies.find(
            movie => movie.id === args.id
        );


    if (matchedMovie) {

        movieName =
            matchedMovie.name;

        cleanSlug =
            matchedMovie.slug;

        cleanPlus =
            matchedMovie.plus;

    } else {

        // ----------------------------------------------------
        // NẾU KHÔNG CÓ THÌ THỬ LẤY METADATA
        // ----------------------------------------------------

        const meta =
            await getMovieMetadata(args.id);


        if (
            meta &&
            meta.name
        ) {

            movieName =
                meta.name;


            cleanSlug =
                encodeURIComponent(
                    movieName
                        .toLowerCase()
                        .replace(/ /g, "-")
                        .replace(/:/g, "")
                );


            cleanPlus =
                encodeURIComponent(
                    movieName.replace(
                        / /g,
                        "+"
                    )
                );
        }
    }


    // --------------------------------------------------------
    // KHÔNG TÌM THẤY PHIM
    // --------------------------------------------------------

    if (!movieName) {

        console.log(
            "[STREAM] Không tìm thấy metadata:",
            args.id
        );

        return {
            streams: []
        };
    }


    // ========================================================
    // SOURCE 1
    // ========================================================

    streams.push({

        name:
            "🔹 Source 1 (1Phim32)",

        title:
            "Xem phim: " +
            movieName +
            "\n[Phát trực tiếp ngay trong trình chơi Stremio]",

        url:
            "https://1phim32.com" +
            cleanSlug +
            "/video.mp4"
    });


    // ========================================================
    // SOURCE 2
    // ========================================================

    streams.push({

        name:
            "🔹 Source 2 (NguồnC)",

        title:
            "Xem phim: " +
            movieName +
            "\n[Phát trực tiếp ngay trong trình chơi Stremio]",

        url:
            "https://nguonc.com" +
            cleanPlus +
            "&file=video.m3u8"
    });


    // ========================================================
    // SOURCE 3
    // ========================================================

    streams.push({

        name:
            "🔹 Source 3 (MọtPhim)",

        title:
            "Xem phim: " +
            movieName +
            "\n[Phát trực tiếp ngay trong trình chơi Stremio]",

        url:
            "https://motphimtv.run" +
            cleanPlus +
            "&output=stream.m3u8"
    });


    console.log(
        "[STREAM RESPONSE]",
        JSON.stringify(
            streams,
            null,
            2
        )
    );


    return {
        streams: streams
    };
});


// ============================================================
// TEST RENDER -> NGUONC / STREAMC
// ============================================================
//
// Chức năng này KHÔNG được gọi khi Stremio lấy stream.
// Chỉ chạy khi truy cập:
//
// /test-nguonc
//
// Mục đích:
// Render -> phim.nguonc.com
// Render -> embed14.streamc.xyz
//
// ============================================================

async function testNguonCFromRender() {

    const results = {};


    // ========================================================
    // TEST 1: NGUONC API
    // ========================================================

    try {

        const url =
            "https://phim.nguonc.com/api/film/am-anh-2026";


        const response =
            await axios.get(
                url,
                {
                    timeout: 15000,

                    headers: {

                        "User-Agent":
                            "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",

                        "Accept":
                            "application/json, text/plain, */*",

                        "Referer":
                            "https://nguonc.com/",

                        "Origin":
                            "https://nguonc.com"
                    },

                    validateStatus:
                        () => true
                }
            );


        results.nguoncApi = {

            url,

            status:
                response.status,

            server:
                response.headers?.server || "",

            contentType:
                response.headers?.["content-type"] || "",

            body:
                typeof response.data === "string"

                    ? response.data.slice(
                        0,
                        1000
                    )

                    : JSON.stringify(
                        response.data
                    ).slice(
                        0,
                        1000
                    )
        };


    } catch (e) {

        results.nguoncApi = {

            error:
                e?.message ||
                String(e)
        };
    }


    // ========================================================
    // TEST 2: STREAMC EMBED
    // ========================================================

    try {

        const url =
            "https://embed14.streamc.xyz/embed.php?hash=4681d86705ffd80ed1e5a5d636d06faf";


        const response =
            await axios.get(
                url,
                {
                    timeout: 15000,

                    headers: {

                        "User-Agent":
                            "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",

                        "Accept":
                            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

                        "Referer":
                            "https://phim.nguonc.com/",

                        "Origin":
                            "https://phim.nguonc.com"
                    },

                    validateStatus:
                        () => true
                }
            );


        results.streamcEmbed = {

            url,

            status:
                response.status,

            server:
                response.headers?.server || "",

            contentType:
                response.headers?.["content-type"] || "",

            body:
                typeof response.data === "string"

                    ? response.data.slice(
                        0,
                        1000
                    )

                    : JSON.stringify(
                        response.data
                    ).slice(
                        0,
                        1000
                    )
        };


    } catch (e) {

        results.streamcEmbed = {

            error:
                e?.message ||
                String(e)
        };
    }


    return results;
}


// ============================================================
// EXPRESS SERVER
// ============================================================

const app = express();


// ------------------------------------------------------------
// TEST ROUTE
// ------------------------------------------------------------

app.get(
    "/test-nguonc",
    async (req, res) => {

        try {

            const result =
                await testNguonCFromRender();


            console.log(
                "[RENDER NGUONC TEST]",
                JSON.stringify(
                    result,
                    null,
                    2
                )
            );


            res.json(result);


        } catch (e) {

            console.error(
                "[RENDER NGUONC TEST ERROR]",
                e
            );


            res.status(500).json({

                error:
                    e?.message ||
                    String(e)
            });
        }
    }
);


// ------------------------------------------------------------
// HEALTH CHECK
// ------------------------------------------------------------

app.get(
    "/health",
    (req, res) => {

        res.json({

            status: "ok",

            addon:
                manifest.name,

            version:
                manifest.version,

            time:
                new Date().toISOString()
        });
    }
);


// ============================================================
// MOUNT STREMIO ADDON ROUTER
// ============================================================

const addonInterface =
    builder.getInterface();


const addonRouter =
    getRouter(addonInterface);


// Các endpoint của Stremio:
//
// /manifest.json
// /catalog/...
// /meta/...
// /stream/...
//
// được SDK xử lý tại đây.

app.use(
    addonRouter
);


// ============================================================
// START SERVER
// ============================================================

const PORT =
    process.env.PORT || 7000;


app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "========================================"
        );

        console.log(
            "BCP Stremio Addon đang chạy"
        );

        console.log(
            "Port:",
            PORT
        );

        console.log(
            "Version:",
            manifest.version
        );

        console.log(
            "========================================"
        );

        console.log(
            "Manifest: /manifest.json"
        );

        console.log(
            "Health: /health"
        );

        console.log(
            "NguonC Test: /test-nguonc"
        );

        console.log(
            "========================================"
        );
    }
);
