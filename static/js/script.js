// ============================================================
// PANTUN AI — FRONTEND JAVASCRIPT
// 3 MODEL VERSION
// XLM-RoBERTa + MalayBERT + mBERT
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    // ========================================================
    // 1. ELEMENTS
    // ========================================================

    const pantunInput =
        document.getElementById("pantunInput");

    const lineCounter =
        document.getElementById("lineCounter");

    const inputMessage =
        document.getElementById("inputMessage");

    const classifyButton =
        document.getElementById("classifyButton");

    const clearButton =
        document.getElementById("clearButton");

    const emptyResult =
        document.getElementById("emptyResult");

    const predictionResult =
        document.getElementById("predictionResult");

    const analysedPantun =
        document.getElementById("analysedPantun");


    // ========================================================
    // 2. MODEL ELEMENTS
    // ========================================================

    const modelElements = {

        xlm_roberta: {
            theme: document.getElementById("xlmTheme"),
            confidence: document.getElementById("xlmConfidence"),
            bar: document.getElementById("xlmBar")
        },

        malaybert: {
            theme: document.getElementById("malaybertTheme"),
            confidence: document.getElementById("malaybertConfidence"),
            bar: document.getElementById("malaybertBar")
        },

        mbert: {
            theme: document.getElementById("mbertTheme"),
            confidence: document.getElementById("mbertConfidence"),
            bar: document.getElementById("mbertBar")
        }

    };


    // ========================================================
    // 3. THEME MAPPING
    // ========================================================

    const themeMapping = {

        "Agama & Spiritual": "agama",

        "Budi & Adab": "budi",

        "Cinta & Kasih Sayang": "cinta",

        "Jenaka": "jenaka",

        "Nasihat & Moral": "nasihat",

        "Peribahasa & Kiasan": "peribahasa"

    };


    // ========================================================
    // 4. GET NON-EMPTY PANTUN LINES
    // ========================================================

    function getPantunLines() {

        return pantunInput.value
            .split("\n")
            .map(line => line.trim())
            .filter(line => line.length > 0);

    }


    // ========================================================
    // 5. UPDATE LINE COUNTER
    // ========================================================

    function updateLineCounter() {

        const lines = getPantunLines();

        const totalLines = lines.length;


        lineCounter.textContent =
            `${totalLines} / 4 lines`;


        if (totalLines === 4) {

            lineCounter.style.color =
                "#173f35";

            lineCounter.style.borderColor =
                "rgba(23, 63, 53, 0.35)";

        }

        else if (totalLines > 4) {

            lineCounter.style.color =
                "#a24b42";

            lineCounter.style.borderColor =
                "rgba(162, 75, 66, 0.35)";

        }

        else {

            lineCounter.style.color =
                "#858a84";

            lineCounter.style.borderColor =
                "rgba(23, 33, 29, 0.14)";

        }

    }


    pantunInput.addEventListener(
        "input",
        () => {

            updateLineCounter();

            inputMessage.textContent = "";

        }
    );


    // ========================================================
    // 6. VALIDATE PANTUN
    // ========================================================

    function validatePantun() {

        const lines = getPantunLines();


        // EMPTY INPUT

        if (lines.length === 0) {

            inputMessage.textContent =
                "Please enter a pantun before classification.";

            pantunInput.focus();

            return false;

        }


        // LESS THAN 4 LINES

        if (lines.length < 4) {

            inputMessage.textContent =
                `A pantun must contain 4 lines. You currently have ${lines.length}.`;

            pantunInput.focus();

            return false;

        }


        // MORE THAN 4 LINES

        if (lines.length > 4) {

            inputMessage.textContent =
                `Please enter only 4 lines. You currently have ${lines.length}.`;

            pantunInput.focus();

            return false;

        }


        inputMessage.textContent = "";

        return true;

    }


    // ========================================================
    // 7. LOADING STATE
    // ========================================================

    function setLoading(isLoading) {

        if (isLoading) {

            classifyButton.classList.add(
                "loading"
            );

            classifyButton.disabled = true;

        }

        else {

            classifyButton.classList.remove(
                "loading"
            );

            classifyButton.disabled = false;

        }

    }


    // ========================================================
    // 8. UPDATE ONE MODEL RESULT
    // ========================================================

    function updateModelResult(
        modelName,
        result
    ) {

        const elements =
            modelElements[modelName];


        if (!elements || !result) {
            return;
        }


        // ----------------------------------------------------
        // MAIN PREDICTION
        // ----------------------------------------------------

        elements.theme.textContent =
            result.theme || "—";


        // ----------------------------------------------------
        // HIGHEST CONFIDENCE
        // ----------------------------------------------------

        const confidence =
            Number(result.confidence) || 0;


        elements.confidence.textContent =
            `${confidence.toFixed(2)}%`;


        // ----------------------------------------------------
        // MAIN CONFIDENCE BAR
        // ----------------------------------------------------

        elements.bar.style.width = "0%";


        setTimeout(() => {

            elements.bar.style.width =
                `${Math.min(
                    confidence,
                    100
                )}%`;

        }, 100);


        // ----------------------------------------------------
        // ALL SIX THEME PROBABILITIES
        // ----------------------------------------------------

        if (!result.probabilities) {
            return;
        }


        result.probabilities.forEach(
            probability => {

                const theme =
                    probability.theme;

                const value =
                    Number(
                        probability.confidence
                    ) || 0;


                const shortName =
                    themeMapping[theme];


                if (!shortName) {
                    return;
                }


                // Percentage text

                const percentageElement =
                    document.getElementById(
                        `${modelName}-${shortName}`
                    );


                if (percentageElement) {

                    percentageElement.textContent =
                        `${value.toFixed(2)}%`;

                }


                // Probability bar

                const probabilityBar =
                    document.getElementById(
                        `${modelName}-${shortName}-bar`
                    );


                if (probabilityBar) {

                    probabilityBar.style.width =
                        "0%";


                    setTimeout(() => {

                        probabilityBar.style.width =
                            `${Math.min(
                                value,
                                100
                            )}%`;

                    }, 100);

                }

            }
        );

    }


    // ========================================================
    // 9. RESET ONE MODEL
    // ========================================================

    function resetModelResult(modelName) {

        const elements =
            modelElements[modelName];


        if (!elements) {
            return;
        }


        // Main prediction

        elements.theme.textContent =
            "—";


        // Main confidence

        elements.confidence.textContent =
            "0%";


        // Main bar

        elements.bar.style.width =
            "0%";


        // Reset all six probabilities

        Object.values(themeMapping).forEach(
            shortName => {

                const percentageElement =
                    document.getElementById(
                        `${modelName}-${shortName}`
                    );


                if (percentageElement) {

                    percentageElement.textContent =
                        "0%";

                }


                const probabilityBar =
                    document.getElementById(
                        `${modelName}-${shortName}-bar`
                    );


                if (probabilityBar) {

                    probabilityBar.style.width =
                        "0%";

                }

            }
        );

    }


    // ========================================================
    // 10. DISPLAY THREE MODEL RESULTS
    // ========================================================

    function showResult(data) {

        // Hide default result

        emptyResult.style.display =
            "none";


        // Show prediction result

        predictionResult.style.display =
            "block";


        // ----------------------------------------------------
        // GET MODEL RESULTS
        // ----------------------------------------------------

        const predictions =
            data.predictions;


        if (!predictions) {

            throw new Error(
                "No prediction results received."
            );

        }


        const xlm =
            predictions.xlm_roberta;


        const malaybert =
            predictions.malaybert;


        const mbert =
            predictions.mbert;


        // ----------------------------------------------------
        // UPDATE ALL THREE MODELS
        // ----------------------------------------------------

        updateModelResult(
            "xlm_roberta",
            xlm
        );


        updateModelResult(
            "malaybert",
            malaybert
        );


        updateModelResult(
            "mbert",
            mbert
        );


        // ----------------------------------------------------
        // DISPLAY ANALYSED PANTUN
        // ----------------------------------------------------

        analysedPantun.textContent =
            data.pantun || "";

    }


    // ========================================================
    // 11. CLASSIFY PANTUN
    // ========================================================

    async function classifyPantun() {

        // Validate first

        if (!validatePantun()) {

            return;

        }


        // Combine 4 pantun lines

        const pantun =
            getPantunLines().join("\n");


        // Start loading animation

        setLoading(true);

        inputMessage.textContent = "";


        try {

            // ------------------------------------------------
            // SEND REQUEST TO FLASK
            // ------------------------------------------------

            const response =
                await fetch(
                    "/predict",
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body: JSON.stringify({

                            pantun: pantun

                        })

                    }
                );


            // ------------------------------------------------
            // GET RESPONSE
            // ------------------------------------------------

            const data =
                await response.json();


            // ------------------------------------------------
            // HTTP ERROR
            // ------------------------------------------------

            if (!response.ok) {

                throw new Error(

                    data.error ||
                    "Unable to classify the pantun."

                );

            }


            // ------------------------------------------------
            // APPLICATION ERROR
            // ------------------------------------------------

            if (!data.success) {

                throw new Error(

                    data.error ||
                    "Classification failed."

                );

            }


            // ------------------------------------------------
            // DISPLAY RESULT
            // ------------------------------------------------

            showResult(data);

        }


        catch (error) {

            console.error(
                "Classification error:",
                error
            );


            inputMessage.textContent =

                error.message ||

                "Something went wrong. Please try again.";

        }


        finally {

            // Stop loading animation

            setLoading(false);

        }

    }


    // ========================================================
    // 12. CLEAR EVERYTHING
    // ========================================================

    function clearPantun() {

        similarPantunResult.style.display =
            "none";

        similarPantunList.innerHTML =
            "";

        // Clear textarea

        pantunInput.value = "";


        // Clear error

        inputMessage.textContent = "";


        // Reset counter

        lineCounter.textContent =
            "0 / 4 lines";


        lineCounter.style.color =
            "#858a84";


        lineCounter.style.borderColor =
            "rgba(23, 33, 29, 0.14)";


        // Show empty state

        emptyResult.style.display =
            "block";


        predictionResult.style.display =
            "none";


        // ----------------------------------------------------
        // RESET ALL THREE MODELS
        // ----------------------------------------------------

        resetModelResult(
            "xlm_roberta"
        );


        resetModelResult(
            "malaybert"
        );


        resetModelResult(
            "mbert"
        );


        // Clear analysed pantun

        analysedPantun.textContent =
            "";


        // Return cursor to textarea

        pantunInput.focus();

    }

// ========================================================
// 13. SIMILAR PANTUN
// ========================================================

const similarPantunButton =
    document.getElementById(
        "similarPantunButton"
    );

const similarPantunResult =
    document.getElementById(
        "similarPantunResult"
    );

const similarPantunList =
    document.getElementById(
        "similarPantunList"
    );


async function findSimilarPantun() {

    const pantun =
        getPantunLines().join("\n");


    if (!pantun) {

        inputMessage.textContent =
            "Please classify a pantun first.";

        return;

    }


    // ----------------------------------------------------
    // BUTTON LOADING
    // ----------------------------------------------------

    similarPantunButton.disabled =
        true;

    similarPantunButton.textContent =
        "Finding Similar Pantun...";


    try {

        // ------------------------------------------------
        // SEND PANTUN TO FLASK
        // ------------------------------------------------

        const response =
            await fetch(
                "/similar",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body: JSON.stringify({

                        pantun: pantun

                    })

                }
            );


        const data =
            await response.json();


        if (!response.ok || !data.success) {

            throw new Error(

                data.error ||
                "Unable to find similar pantun."

            );

        }


        // ------------------------------------------------
        // DISPLAY RESULTS
        // ------------------------------------------------

        displaySimilarPantun(
            data.results
        );

    }


    catch (error) {

        console.error(
            "Semantic search error:",
            error
        );


        inputMessage.textContent =
            error.message ||
            "Unable to find similar pantun.";

    }


    finally {

        similarPantunButton.disabled =
            false;

        similarPantunButton.textContent =
            "View Similar Pantun";

    }

}


// ========================================================
// DISPLAY SIMILAR PANTUN
// ========================================================

function displaySimilarPantun(
    results
) {

    similarPantunList.innerHTML =
        "";


    if (
        !results ||
        results.length === 0
    ) {

        similarPantunList.innerHTML = `

            <div class="similar-pantun-card">

                <div class="similar-pantun-text">
                    No similar pantun found.
                </div>

            </div>

        `;


        similarPantunResult.style.display =
            "block";

        return;

    }


    results.forEach(
        (result, index) => {

            const similarity =
                Number(
                    result.similarity
                ) || 0;


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "similar-pantun-card";


            card.innerHTML = `

                <div class="similar-pantun-number">
                    ${String(index + 1).padStart(2, "0")}
                </div>

                <div class="similar-pantun-text">
                    ${escapeHtml(result.text)}
                </div>

                <div class="similar-pantun-meta">

                    <span class="similar-pantun-theme">
                        ${escapeHtml(result.theme)}
                    </span>

                    <span class="similar-pantun-score">
                        ${similarity.toFixed(2)}%
                    </span>

                </div>

                <div class="similarity-track">

                    <div
                        class="similarity-fill"
                        style="width: ${Math.min(
                            similarity,
                            100
                        )}%"
                    ></div>

                </div>

            `;


            similarPantunList.appendChild(
                card
            );

        }
    );


    similarPantunResult.style.display =
        "block";

}


// ========================================================
// ESCAPE HTML
// ========================================================

function escapeHtml(text) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        text;

    return div.innerHTML;

}
    // ========================================================
    // 13. BUTTON EVENTS
    // ========================================================

    classifyButton.addEventListener(
        "click",
        classifyPantun
    );


    clearButton.addEventListener(
        "click",
        clearPantun
    );

        if (similarPantunButton) {

        similarPantunButton.addEventListener(
            "click",
            findSimilarPantun
        );

    }

    // ========================================================
    // 14. KEYBOARD SHORTCUT
    // Ctrl + Enter = Classify
    // ========================================================

    pantunInput.addEventListener(
        "keydown",
        event => {

            if (
                event.ctrlKey &&
                event.key === "Enter"
            ) {

                event.preventDefault();

                classifyPantun();

            }

        }
    );

// ============================================================
// SAVE PANTUN BEFORE OPENING SEMANTIC GRAPH
// ============================================================

const semanticGraphButton =
    document.getElementById("semanticGraphButton");

if (semanticGraphButton) {

    semanticGraphButton.addEventListener(
        "click",
        function () {

            const pantunInput =
                document.getElementById("pantunInput");

            if (!pantunInput) {

                console.error(
                    "ERROR: #pantunInput was not found."
                );

                return;

            }

            const pantun =
                pantunInput.value.trim();


            if (!pantun) {

                alert(
                    "Please enter a pantun first."
                );

                return;

            }


            console.log(
                "Saving pantun for semantic graph:",
                pantun
            );


            // IMPORTANT:
            // semantic_graph.html also uses sessionStorage

            sessionStorage.setItem(
                "semanticPantun",
                pantun
            );

        }
    );

}


    // ========================================================
    // 15. INITIAL PAGE STATE
    // ========================================================

    updateLineCounter();


    resetModelResult(
        "xlm_roberta"
    );


    resetModelResult(
        "malaybert"
    );


    resetModelResult(
        "mbert"
    );

});
