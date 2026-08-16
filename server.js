const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// CONFIGURACIÓN ADMIN
// ========================================

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// ========================================
// CONFIGURACIÓN DISCORD
// ========================================

const DISCORD_WEBHOOK_URL =
    process.env.DISCORD_WEBHOOK_URL || "";

// ========================================
// VARIABLES
// ========================================

let adminToken = null;
let currentAdminUsername = null;

// ========================================
// CONFIGURACIÓN SERVIDOR
// ========================================

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ========================================
// ARCHIVOS
// ========================================

const TRADES_FILE = path.join(
    __dirname,
    "trades.json"
);

const USERS_FILE = path.join(
    __dirname,
    "users.json"
);

// Crear trades.json si no existe
if (!fs.existsSync(TRADES_FILE)) {
    fs.writeFileSync(
        TRADES_FILE,
        "[]",
        "utf8"
    );
}

// Crear users.json si no existe
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(
        USERS_FILE,
        "{}",
        "utf8"
    );
}

// ========================================
// LEER TRADES
// ========================================

function readTrades() {
    try {
        const data = fs.readFileSync(
            TRADES_FILE,
            "utf8"
        );

        if (!data.trim()) {
            return [];
        }

        return JSON.parse(data);

    } catch (error) {
        console.error(
            "❌ Error leyendo trades.json:",
            error
        );

        return [];
    }
}

// ========================================
// GUARDAR TRADES
// ========================================

function saveTrades(trades) {
    fs.writeFileSync(
        TRADES_FILE,
        JSON.stringify(
            trades,
            null,
            2
        ),
        "utf8"
    );
}

// ========================================
// LEER USUARIOS
// ========================================

function readUsers() {
    try {
        const data = fs.readFileSync(
            USERS_FILE,
            "utf8"
        );

        if (!data.trim()) {
            return {};
        }

        return JSON.parse(data);

    } catch (error) {
        console.error(
            "❌ Error leyendo users.json:",
            error
        );

        return {};
    }
}

// ========================================
// GUARDAR USUARIOS
// ========================================

function saveUsers(users) {
    fs.writeFileSync(
        USERS_FILE,
        JSON.stringify(
            users,
            null,
            2
        ),
        "utf8"
    );
}

// ========================================
// DISCORD
// ========================================

async function sendTradeToDiscord(trade) {

    if (!DISCORD_WEBHOOK_URL) {
        console.log(
            "⚠️ Discord Webhook no configurado."
        );

        return;
    }

    try {

        const typeText =
            trade.type === "ofrecer"
                ? "🟢 Ofrece Pokémon"
                : "🔎 Busca Pokémon";

        const embed = {

            title:
                "🔄 NUEVO TRADE — VORTEX",

            description:
                `**${typeText}**`,

            color: 5793266,

            fields: [

                {
                    name: "👤 Usuario",
                    value:
                        String(
                            trade.username ||
                            "Usuario"
                        ),
                    inline: true
                },

                {
                    name: "🐉 Pokémon",
                    value:
                        String(
                            trade.pokemon ||
                            "Pokémon"
                        ),
                    inline: true
                },

                {
                    name: "🎮 Juego",
                    value:
                        String(
                            trade.game ||
                            "Pokémon Púrpura"
                        ),
                    inline: true
                },

                {
                    name: "📂 Categoría",
                    value:
                        String(
                            trade.category ||
                            "normal"
                        ),
                    inline: true
                },

                {
                    name: "✨ Shiny",
                    value:
                        trade.shiny
                            ? "✨ Sí"
                            : "No",
                    inline: true
                },

                {
                    name: "📝 Detalles",
                    value:
                        String(
                            trade.details ||
                            "Sin detalles."
                        ).slice(0, 1024)
                }

            ],

            footer: {
                text:
                    "Vortex Pokémon Trades"
            },

            timestamp:
                trade.createdAt
        };

        const response =
            await fetch(
                DISCORD_WEBHOOK_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            username:
                                "Vortex Trades",

                            embeds: [
                                embed
                            ]
                        })
                }
            );

        if (!response.ok) {

            const errorText =
                await response.text();

            console.error(
                "❌ Discord rechazó el mensaje:",
                response.status,
                errorText
            );

            return;
        }

        console.log(
            "📨 Trade enviado a Discord."
        );

    } catch (error) {

        console.error(
            "❌ Error enviando trade a Discord:",
            error
        );
    }
}

// ========================================
// LOGIN ADMIN
// ========================================

app.post(
    "/api/admin/login",
    (req, res) => {

        const username =
            String(
                req.body.username || ""
            ).trim();

        const password =
            String(
                req.body.password || ""
            );

        if (
            !username ||
            !ADMIN_PASSWORD ||
            password !== ADMIN_PASSWORD
        ) {

            console.log(
                `❌ Login admin rechazado: ${
                    username || "sin nombre"
                }`
            );

            return res.status(401).json({
                success: false,
                error:
                    "Nombre o contraseña incorrectos."
            });
        }

        adminToken =
            crypto
                .randomBytes(32)
                .toString("hex");

        currentAdminUsername =
            username;

        console.log(
            `🔐 Administrador VTX conectado: ${username}`
        );

        res.json({
            success: true,
            token: adminToken,
            username: username
        });
    }
);

// ========================================
// PROTECCIÓN ADMIN
// ========================================

function requireAdmin(
    req,
    res,
    next
) {

    const token =
        req.headers[
            "x-admin-token"
        ];

    if (
        !adminToken ||
        token !== adminToken
    ) {

        return res.status(403).json({
            success: false,
            error:
                "Acceso de administrador requerido."
        });
    }

    next();
}

// ========================================
// LOGOUT ADMIN
// ========================================

app.post(
    "/api/admin/logout",
    requireAdmin,
    (req, res) => {

        console.log(
            `🔓 Administrador VTX desconectado: ${
                currentAdminUsername || "Admin"
            }`
        );

        adminToken = null;
        currentAdminUsername = null;

        res.json({
            success: true
        });
    }
);

// ========================================
// OBTENER TRADES
// ========================================

app.get(
    "/api/trades",
    (req, res) => {

        try {

            const trades =
                readTrades();

            res.json(trades);

        } catch (error) {

            console.error(
                "❌ Error cargando trades:",
                error
            );

            res.status(500).json({
                error:
                    "No se pudieron cargar los trades."
            });
        }
    }
);

// ========================================
// PUBLICAR TRADE
// ========================================

app.post(
    "/api/trades",
    async (req, res) => {

        try {

            const trades =
                readTrades();

            const newTrade = {

                id:
                    Date.now(),

                type:
                    req.body.type ||
                    "pedido",

                username:
                    req.body.username ||
                    "Usuario",

                pokemon:
                    req.body.pokemon ||
                    "Pokémon",

                game:
                    req.body.game ||
                    "Pokémon Púrpura",

                category:
                    req.body.category ||
                    "normal",

                shiny:
                    Boolean(
                        req.body.shiny
                    ),

                verified:
                    Boolean(
                        req.body.verified
                    ),

                details:
                    req.body.details ||
                    "",

                createdAt:
                    new Date().toISOString()
            };

            trades.unshift(
                newTrade
            );

            saveTrades(
                trades
            );

            console.log(
                `✅ Nuevo trade publicado: ${newTrade.pokemon}`
            );

            await sendTradeToDiscord(
                newTrade
            );

            res.status(201).json(
                newTrade
            );

        } catch (error) {

            console.error(
                "❌ Error publicando trade:",
                error
            );

            res.status(500).json({
                error:
                    "No se pudo publicar el trade."
            });
        }
    }
);

// ========================================
// ELIMINAR TRADE
// ========================================

app.delete(
    "/api/trades/:id",
    requireAdmin,
    (req, res) => {

        try {

            const tradeId =
                Number(
                    req.params.id
                );

            const trades =
                readTrades();

            const exists =
                trades.some(
                    trade =>
                        trade.id ===
                        tradeId
                );

            if (!exists) {

                return res.status(404).json({
                    success: false,
                    error:
                        "Trade no encontrado."
                });
            }

            const updatedTrades =
                trades.filter(
                    trade =>
                        trade.id !==
                        tradeId
                );

            saveTrades(
                updatedTrades
            );

            console.log(
                `🗑️ Trade eliminado: ${tradeId}`
            );

            res.json({
                success: true,
                message:
                    "Trade eliminado correctamente."
            });

        } catch (error) {

            console.error(
                "❌ Error eliminando trade:",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "No se pudo eliminar el trade."
            });
        }
    }
);

// ========================================
// OBTENER REP DE USUARIO
// ========================================

app.get(
    "/api/users/:username/rep",
    (req, res) => {

        try {

            const username =
                String(
                    req.params.username || ""
                ).trim();

            if (!username) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Usuario inválido."
                });
            }

            const users =
                readUsers();

            const userKey =
                username.toLowerCase();

            const user =
                users[userKey] || {
                    username: username,
                    rep: 0,
                    voters: []
                };

            res.json({
                success: true,
                username:
                    user.username,
                rep:
                    user.rep || 0
            });

        } catch (error) {

            console.error(
                "❌ Error obteniendo REP:",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "No se pudo obtener la REP."
            });
        }
    }
);

// ========================================
// DAR +REP
// ========================================

app.post(
    "/api/users/:username/rep",
    (req, res) => {

        try {

            const username =
                String(
                    req.params.username || ""
                ).trim();

            const voter =
                String(
                    req.body.voter || ""
                ).trim();

            if (!username) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Usuario inválido."
                });
            }

            if (!voter) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Debes indicar quién está dando la REP."
                });
            }

            // No permitimos darse REP a uno mismo
            if (
                voter.toLowerCase() ===
                username.toLowerCase()
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "No puedes darte REP a ti mismo."
                });
            }

            const users =
                readUsers();

            const userKey =
                username.toLowerCase();

            if (!users[userKey]) {

                users[userKey] = {
                    username: username,
                    rep: 0,
                    voters: []
                };
            }

            if (!Array.isArray(
                users[userKey].voters
            )) {

                users[userKey].voters = [];
            }

            const alreadyVoted =
                users[userKey].voters.some(
                    name =>
                        String(name)
                            .toLowerCase() ===
                        voter.toLowerCase()
                );

            if (alreadyVoted) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Este usuario ya le dio REP a esta persona."
                });
            }

            users[userKey].rep =
                Number(
                    users[userKey].rep || 0
                ) + 1;

            users[userKey].voters.push(
                voter
            );

            saveUsers(
                users
            );

            console.log(
                `⭐ ${voter} dio +REP a ${username}`
            );

            res.json({
                success: true,
                message:
                    "REP agregada correctamente.",
                username:
                    users[userKey].username,
                rep:
                    users[userKey].rep
            });

        } catch (error) {

            console.error(
                "❌ Error dando REP:",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "No se pudo agregar la REP."
            });
        }
    }
);

// ========================================
// HEALTH CHECK
// ========================================

app.get(
    "/api/health",
    (req, res) => {

        res.json({
            success: true,
            message:
                "Vortex Pokémon Trades funcionando.",
            time:
                new Date().toISOString()
        });
    }
);

// ========================================
// INICIAR SERVIDOR
// ========================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log("");

        console.log(
            "===================================="
        );

        console.log(
            "🔥 VORTEX POKÉMON TRADES"
        );

        console.log(
            "===================================="
        );

        console.log(
            `🌐 Puerto: ${PORT}`
        );

        console.log(
            "📦 API: /api/trades"
        );

        console.log(
            "⭐ Sistema REP: ACTIVADO"
        );

        console.log(
            "🔐 Sistema Admin VTX: ACTIVADO"
        );

        console.log(
            DISCORD_WEBHOOK_URL
                ? "📨 Discord Webhook: CONFIGURADO"
                : "⚠️ Discord Webhook: NO CONFIGURADO"
        );

        console.log(
            "===================================="
        );

        console.log("");
    }
);