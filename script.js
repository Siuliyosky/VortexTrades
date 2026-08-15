const API_URL = "/api/trades";

let allTrades = [];
let currentFilter = "all";
let adminToken = null;

let pokemonList = [];
let pokemonLoaded = false;


// ======================================================
// PALABRAS BLOQUEADAS
// ======================================================

const bannedWords = [
    "idiota",
    "imbecil",
    "estupido",
    "tonto",
    "tonta",
    "bruto",
    "bruta",
    "animal",
    "payaso",
    "payasa",
    "bobo",
    "boba",
    "menso",
    "mensa",

    "pendejo",
    "pendeja",
    "cabron",
    "cabrona",
    "mamon",
    "culero",
    "culera",
    "gilipollas",

    "mierda",
    "puta",
    "puto",
    "pene",
    "coño",
    "joder",
    "carajo",

    "fuck",
    "fucking",
    "shit",
    "bitch",
    "asshole",
    "bastard",
    "dumbass"
];


// ======================================================
// NORMALIZAR TEXTO
// ======================================================

function normalizeForFilter(text) {

    return String(text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")

        .replace(/0/g, "o")
        .replace(/1/g, "i")
        .replace(/!/g, "i")
        .replace(/3/g, "e")
        .replace(/4/g, "a")
        .replace(/@/g, "a")
        .replace(/5/g, "s")
        .replace(/\$/g, "s")
        .replace(/7/g, "t")
        .replace(/8/g, "b")
        .replace(/9/g, "g")

        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}


function containsBannedWord(text) {

    const normalized =
        normalizeForFilter(text);

    if (!normalized) {
        return false;
    }

    const words =
        normalized.split(" ");

    return bannedWords.some(word => {

        const normalizedWord =
            normalizeForFilter(word);

        return words.includes(
            normalizedWord
        );
    });
}


// ======================================================
// MODAL TRADE
// ======================================================

function openModal(type) {

    const modal =
        document.getElementById("tradeModal");

    const modalTitle =
        document.getElementById("modalTitle");

    const tradeType =
        document.getElementById("tradeType");

    if (!modal || !modalTitle || !tradeType) {
        return;
    }

    tradeType.value = type;

    modalTitle.textContent =
        type === "ofrecer"
            ? "Ofrecer Pokémon"
            : "Pedir Pokémon";

    modal.classList.add("active");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    setTimeout(() => {

        const input =
            document.getElementById(
                "pokemonName"
            );

        if (input) {
            input.focus();
        }

    }, 100);
}


function closeModal() {

    const modal =
        document.getElementById("tradeModal");

    if (!modal) return;

    modal.classList.remove("active");

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    const list =
        document.getElementById(
            "pokemonList"
        );

    if (list) {

        list.innerHTML = "";

        list.classList.remove(
            "active"
        );
    }
}


// ======================================================
// TOAST
// ======================================================

function showToast(message) {

    const toast =
        document.getElementById("toast");

    if (!toast) return;

    toast.textContent = message;

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    }, 3000);
}


// ======================================================
// ADMIN
// ======================================================

function adminLogin() {

    const modal =
        document.getElementById(
            "adminModal"
        );

    if (!modal) return;

    modal.classList.add("active");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    const password =
        document.getElementById(
            "adminPassword"
        );

    if (password) {

        password.value = "";

        setTimeout(
            () => password.focus(),
            100
        );
    }
}


function closeAdminModal() {

    const modal =
        document.getElementById(
            "adminModal"
        );

    if (!modal) return;

    modal.classList.remove(
        "active"
    );

    modal.setAttribute(
        "aria-hidden",
        "true"
    );
}


// =========================
// LOGIN ADMIN
// =========================

const adminLoginForm =
    document.getElementById("adminLoginForm");

if (adminLoginForm) {

    adminLoginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const usernameInput =
                document.getElementById("adminUsername");

            const passwordInput =
                document.getElementById("adminPassword");

            if (!usernameInput || !passwordInput) {
                showToast(
                    "❌ Faltan los campos de inicio de sesión."
                );
                return;
            }

            const username =
                usernameInput.value.trim();

            const password =
                passwordInput.value;

            if (!username || !password) {
                showToast(
                    "❌ Escribe tu usuario y contraseña."
                );
                return;
            }

            try {

                const response =
                    await fetch(
                        "/api/admin/login",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    username: username,
                                    password: password
                                })
                        }
                    );

                const data =
                    await response.json();

                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        "Usuario o contraseña incorrectos."
                    );
                }

                adminToken =
                    data.token;

                closeAdminModal();

                showToast(
                    `🔐 ${username} conectado correctamente.`
                );

                renderTrades();

            } catch (error) {

                console.error(
                    "Error de login:",
                    error
                );

                showToast(
                    "❌ " + error.message
                );
            }

        }
    );
}


// ======================================================
// LOGOUT ADMIN
// ======================================================

async function adminLogout() {

    if (!adminToken) return;

    try {

        await fetch(
            "/api/admin/logout",
            {
                method: "POST",

                headers: {
                    "x-admin-token":
                        adminToken
                }
            }
        );

    } catch (error) {

        console.warn(
            "No se pudo cerrar sesión."
        );
    }

    adminToken = null;

    renderTrades();

    showToast(
        "🔓 Sesión de administrador cerrada."
    );
}


// ======================================================
// CARGAR TRADES
// ======================================================

async function loadTrades() {

    try {

        const response =
            await fetch(API_URL);

        if (!response.ok) {
            throw new Error(
                "Error al cargar trades"
            );
        }

        allTrades =
            await response.json();

        if (!Array.isArray(allTrades)) {
            allTrades = [];
        }

    } catch (error) {

        console.warn(
            "Servidor no detectado."
        );

        allTrades = [];
    }

    renderTrades();

    updateStats();
}


// ======================================================
// CARGAR LISTA DE POKÉMON
// ======================================================

async function loadPokemon() {

    try {

        const response =
            await fetch(
                "https://pokeapi.co/api/v2/pokemon?limit=1025"
            );

        if (!response.ok) {
            throw new Error(
                "No se pudo cargar la Pokédex."
            );
        }

        const data =
            await response.json();

        pokemonList =
            data.results.map(
                pokemon =>
                    formatPokemonName(
                        pokemon.name
                    )
            );

        pokemonList =
            pokemonList.sort(
                (a, b) =>
                    a.localeCompare(
                        b,
                        "es"
                    )
            );

        pokemonLoaded = true;

        console.log(
            "✅ Pokémon cargados:",
            pokemonList.length
        );

    } catch (error) {

        console.error(
            "Error cargando Pokémon:",
            error
        );

        pokemonList = [
            "Bulbasaur",
            "Ivysaur",
            "Venusaur",
            "Charmander",
            "Charizard",
            "Squirtle",
            "Blastoise",
            "Pikachu",
            "Raichu",
            "Eevee",
            "Vaporeon",
            "Jolteon",
            "Flareon",
            "Espeon",
            "Umbreon",
            "Leafeon",
            "Glaceon",
            "Sylveon",
            "Lucario",
            "Garchomp",
            "Greninja",
            "Mewtwo",
            "Mew",
            "Rayquaza",
            "Kyogre",
            "Groudon",
            "Dialga",
            "Palkia",
            "Giratina",
            "Arceus",
            "Koraidon",
            "Miraidon"
        ];

        pokemonLoaded = true;
    }
}


function formatPokemonName(name) {

    return String(name)
        .split("-")
        .map(
            part =>
                part.charAt(0).toUpperCase() +
                part.slice(1)
        )
        .join("-");
}


// ======================================================
// MOSTRAR LISTA DE POKÉMON
// ======================================================

function showPokemonResults(searchText) {

    const listElement =
        document.getElementById(
            "pokemonList"
        );

    if (!listElement) return;

    const search =
        normalizeForFilter(
            searchText
        );

    let results;

    if (!search) {

        results =
            pokemonList.slice(
                0,
                20
            );

    } else {

        results =
            pokemonList
                .filter(pokemon =>
                    normalizeForFilter(
                        pokemon
                    ).includes(
                        search
                    )
                )
                .slice(
                    0,
                    20
                );
    }

    listElement.innerHTML = "";

    if (results.length === 0) {

        listElement.innerHTML = `
            <div class="pokemon-no-results">
                ❌ No se encontró ese Pokémon.
            </div>
        `;

        listElement.classList.add(
            "active"
        );

        return;
    }

    results.forEach(pokemon => {

        const option =
            document.createElement(
                "button"
            );

        option.type = "button";

        option.className =
            "pokemon-option";

        option.textContent =
            pokemon;

        option.addEventListener(
            "click",
            () => {

                const input =
                    document.getElementById(
                        "pokemonName"
                    );

                if (input) {
                    input.value =
                        pokemon;
                }

                listElement.innerHTML =
                    "";

                listElement.classList.remove(
                    "active"
                );
            }
        );

        listElement.appendChild(
            option
        );
    });

    listElement.classList.add(
        "active"
    );
}


// ======================================================
// BUSCADOR POKÉMON
// ======================================================

const pokemonInput =
    document.getElementById(
        "pokemonName"
    );

if (pokemonInput) {

    pokemonInput.addEventListener(
        "input",
        function() {

            showPokemonResults(
                this.value
            );
        }
    );

    pokemonInput.addEventListener(
        "focus",
        function() {

            if (!pokemonLoaded) {

                loadPokemon();

            } else {

                showPokemonResults(
                    this.value
                );
            }
        }
    );
}


// ======================================================
// CERRAR LISTA AL HACER CLICK FUERA
// ======================================================

document.addEventListener(
    "click",
    function(event) {

        const selector =
            document.querySelector(
                ".pokemon-selector"
            );

        const list =
            document.getElementById(
                "pokemonList"
            );

        if (
            selector &&
            list &&
            !selector.contains(
                event.target
            )
        ) {

            list.classList.remove(
                "active"
            );
        }
    }
);


// ======================================================
// VALIDACIÓN DE DETALLES
// ======================================================

const detailsInput =
    document.getElementById(
        "details"
    );

const detailsWarning =
    document.getElementById(
        "detailsWarning"
    );

if (detailsInput) {

    detailsInput.addEventListener(
        "input",
        function() {

            if (
                containsBannedWord(
                    this.value
                )
            ) {

                if (detailsWarning) {

                    detailsWarning.textContent =
                        "⚠️ Ese texto contiene lenguaje no permitido.";

                    detailsWarning.classList.add(
                        "show"
                    );
                }

                this.classList.add(
                    "input-error"
                );

            } else {

                if (detailsWarning) {

                    detailsWarning.textContent =
                        "";

                    detailsWarning.classList.remove(
                        "show"
                    );
                }

                this.classList.remove(
                    "input-error"
                );
            }
        }
    );
}


// ======================================================
// PUBLICAR TRADE
// ======================================================

const tradeForm =
    document.getElementById(
        "tradeForm"
    );

if (tradeForm) {

    tradeForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();

            const username =
                document.getElementById(
                    "username"
                ).value.trim();

            const pokemon =
                document.getElementById(
                    "pokemonName"
                ).value.trim();

            const details =
                document.getElementById(
                    "details"
                ).value.trim();


            // ------------------------------------------
            // COMPROBAR PALABRAS
            // ------------------------------------------

            if (
                containsBannedWord(
                    details
                )
            ) {

                showToast(
                    "🚫 No puedes usar malas palabras en los detalles."
                );

                if (detailsInput) {
                    detailsInput.focus();
                }

                return;
            }


            // ------------------------------------------
            // COMPROBAR POKÉMON
            // ------------------------------------------

            if (!pokemon) {

                showToast(
                    "❌ Selecciona un Pokémon."
                );

                return;
            }


            // ------------------------------------------
            // CREAR TRADE
            // ------------------------------------------

            const trade = {

                type:
                    document.getElementById(
                        "tradeType"
                    ).value,

                username,

                pokemon,

                game:
                    document.getElementById(
                        "game"
                    ).value,

                category:
                    document.getElementById(
                        "category"
                    ).value,

                shiny:
                    document.getElementById(
                        "isShiny"
                    ).checked,

                verified:
                    document.getElementById(
                        "verified"
                    ).checked,

                details
            };


            try {

                const response =
                    await fetch(
                        API_URL,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    trade
                                )
                        }
                    );

                if (!response.ok) {

                    const data =
                        await response
                            .json()
                            .catch(
                                () => ({})
                            );

                    throw new Error(
                        data.error ||
                        "No se pudo publicar."
                    );
                }

                const newTrade =
                    await response.json();

                allTrades.unshift(
                    newTrade
                );

                renderTrades();

                updateStats();

                tradeForm.reset();

                closeModal();

                showToast(
                    "✅ ¡Trade publicado correctamente!"
                );

            } catch (error) {

                console.error(
                    error
                );

                showToast(
                    "❌ " +
                    (
                        error.message ||
                        "No se pudo publicar."
                    )
                );
            }
        }
    );
}


// ======================================================
// ELIMINAR TRADE
// ======================================================

async function deleteTrade(id) {

    if (!adminToken) {

        showToast(
            "🔐 Necesitas ser administrador."
        );

        return;
    }

    const confirmed =
        confirm(
            "¿Seguro que quieres eliminar este trade?"
        );

    if (!confirmed) return;


    try {

        const response =
            await fetch(
                `${API_URL}/${id}`,
                {
                    method: "DELETE",

                    headers: {
                        "x-admin-token":
                            adminToken
                    }
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.error ||
                "No se pudo eliminar."
            );
        }

        allTrades =
            allTrades.filter(
                trade =>
                    trade.id !== id
            );

        renderTrades();

        updateStats();

        showToast(
            "🗑️ Trade eliminado."
        );

    } catch (error) {

        console.error(
            error
        );

        showToast(
            "❌ " +
            error.message
        );
    }
}


// ======================================================
// MOSTRAR TRADES
// ======================================================

function renderTrades() {

    const grid =
        document.getElementById(
            "tradesGrid"
        );

    if (!grid) return;


    const searchInput =
        document.getElementById(
            "searchInput"
        );

    const searchText =
        searchInput
            ? searchInput.value
                .toLowerCase()
                .trim()
            : "";


    const filteredTrades =
        allTrades.filter(
            trade => {

                const matchesFilter =
                    currentFilter === "all" ||
                    trade.category ===
                        currentFilter;

                const matchesSearch =
                    !searchText ||

                    String(
                        trade.pokemon ||
                        ""
                    )
                        .toLowerCase()
                        .includes(
                            searchText
                        ) ||

                    String(
                        trade.username ||
                        ""
                    )
                        .toLowerCase()
                        .includes(
                            searchText
                        );

                return (
                    matchesFilter &&
                    matchesSearch
                );
            }
        );


    grid.innerHTML = "";


    if (
        filteredTrades.length === 0
    ) {

        grid.innerHTML = `
            <div class="empty-trades">

                <h3>
                    🔎 No hay trades en esta categoría
                </h3>

                <p>
                    ¡Sé el primero en publicar uno!
                </p>

            </div>
        `;

        return;
    }


    filteredTrades.forEach(
        trade => {

            const card =
                document.createElement(
                    "article"
                );

            card.className =
                "trade-card";


            const typeText =
                trade.type === "ofrecer"
                    ? "✨ OFRECE"
                    : "🔎 BUSCA";


            const categoryText = {

                normal:
                    "🐾 Normal",

                shiny:
                    "✨ Shiny",

                legendary:
                    "👑 Legendario",

                event:
                    "🎁 Evento"
            };


            const adminControls =
                adminToken
                    ? `
                        <div class="admin-controls">

                            <button
                                class="delete-trade-btn"
                                onclick="deleteTrade(${trade.id})"
                                type="button"
                            >
                                🗑️ Eliminar
                            </button>

                        </div>
                    `
                    : "";


            card.innerHTML = `

                <div class="trade-card-top">

                    <span class="trade-type">
                        ${typeText}
                    </span>

                    <span class="trade-category">

                        ${
                            categoryText[
                                trade.category
                            ] ||
                            "Pokémon"
                        }

                    </span>

                </div>


                <div class="trade-pokemon">

                    <h3>
                        ${escapeHTML(
                            trade.pokemon ||
                            ""
                        )}
                    </h3>

                    ${
                        trade.shiny
                            ? "<span>✨ SHINY</span>"
                            : ""
                    }

                </div>


                <div class="trade-info">

                    <p>
                        🎮 ${
                            escapeHTML(
                                trade.game ||
                                ""
                            )
                        }
                    </p>

                    <p>
                        👤 ${
                            escapeHTML(
                                trade.username ||
                                ""
                            )
                        }
                    </p>

                    <p>
                        ${
                            trade.verified
                                ? "🛡️ Origen verificable"
                                : "⚠️ No verificado"
                        }
                    </p>

                </div>


                ${
                    trade.details
                        ? `
                            <div class="trade-details">

                                ${escapeHTML(
                                    trade.details
                                )}

                            </div>
                        `
                        : ""
                }


                <div class="trade-card-bottom">

                    <span>
                        VTX Trade #${trade.id}
                    </span>

                </div>


                ${adminControls}

            `;

            grid.appendChild(
                card
            );
        }
    );


    // ==================================================
    // BOTÓN LOGOUT
    // ==================================================

    if (adminToken) {

        const existing =
            document.getElementById(
                "adminLogoutBtn"
            );

        if (!existing) {

            const logoutBtn =
                document.createElement(
                    "button"
                );

            logoutBtn.id =
                "adminLogoutBtn";

            logoutBtn.className =
                "admin-logout-btn";

            logoutBtn.type =
                "button";

            logoutBtn.textContent =
                "🔓 Cerrar Admin";

            logoutBtn.onclick =
                adminLogout;

            document.body.appendChild(
                logoutBtn
            );
        }

    } else {

        const existing =
            document.getElementById(
                "adminLogoutBtn"
            );

        if (existing) {
            existing.remove();
        }
    }
}


// ======================================================
// BUSCADOR DE TRADES
// ======================================================

const searchInput =
    document.getElementById(
        "searchInput"
    );

if (searchInput) {

    searchInput.addEventListener(
        "input",
        renderTrades
    );
}


// ======================================================
// FILTROS
// ======================================================

function filterTrades(
    filter,
    button
) {

    currentFilter =
        filter;

    document
        .querySelectorAll(
            ".filter-btn"
        )
        .forEach(
            btn =>
                btn.classList.remove(
                    "active"
                )
        );


    if (button) {

        button.classList.add(
            "active"
        );
    }


    renderTrades();
}


// ======================================================
// ESTADÍSTICAS
// ======================================================

function updateStats() {

    const total =
        allTrades.length;


    const shiny =
        allTrades.filter(
            trade =>
                trade.shiny ||
                trade.category ===
                    "shiny"
        ).length;


    const legendary =
        allTrades.filter(
            trade =>
                trade.category ===
                "legendary"
        ).length;


    const events =
        allTrades.filter(
            trade =>
                trade.category ===
                "event"
        ).length;


    const users =
        new Set(
            allTrades
                .map(
                    trade =>
                        trade.username
                )
                .filter(Boolean)
        ).size;


    const heroTradeCount =
        document.getElementById(
            "heroTradeCount"
        );

    const heroUserCount =
        document.getElementById(
            "heroUserCount"
        );

    const statTrades =
        document.getElementById(
            "statTrades"
        );

    const statShiny =
        document.getElementById(
            "statShiny"
        );

    const statLegendary =
        document.getElementById(
            "statLegendary"
        );

    const statEvents =
        document.getElementById(
            "statEvents"
        );


    if (heroTradeCount)
        heroTradeCount.textContent =
            total;

    if (heroUserCount)
        heroUserCount.textContent =
            users;

    if (statTrades)
        statTrades.textContent =
            total;

    if (statShiny)
        statShiny.textContent =
            shiny;

    if (statLegendary)
        statLegendary.textContent =
            legendary;

    if (statEvents)
        statEvents.textContent =
            events;
}


// ======================================================
// SEGURIDAD HTML
// ======================================================

function escapeHTML(text) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        text;

    return div.innerHTML;
}


// ======================================================
// MENÚ MÓVIL
// ======================================================

const mobileMenuBtn =
    document.getElementById(
        "mobileMenuBtn"
    );

const mobileMenu =
    document.getElementById(
        "mobileMenu"
    );


if (
    mobileMenuBtn &&
    mobileMenu
) {

    mobileMenuBtn.addEventListener(
        "click",
        () => {

            mobileMenu.classList.toggle(
                "active"
            );

        }
    );
}


// ======================================================
// ESC PARA CERRAR
// ======================================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            closeModal();

            closeAdminModal();
        }
    }
);


// ======================================================
// INICIAR
// ======================================================

loadTrades();

loadPokemon();