from flask import Flask, render_template, request, jsonify
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import torch.nn.functional as F
import os
import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer
import pickle
from sklearn.metrics.pairwise import cosine_similarity


# ============================================================
# FLASK CONFIGURATION
# ============================================================

app = Flask(__name__)

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)


# ============================================================
# DEVICE
# ============================================================

device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

print("=" * 60)
print("PANTUN AI")
print("=" * 60)
print("Device:", device)
print()


# ============================================================
# LABELS
# ============================================================

LABELS = {
    0: "Agama & Spiritual",
    1: "Budi & Adab",
    2: "Cinta & Kasih Sayang",
    3: "Jenaka",
    4: "Nasihat & Moral",
    5: "Peribahasa & Kiasan"
}


# ============================================================
# MODEL PATHS
# ============================================================

MODEL_PATHS = {

    "xlm_roberta": os.path.join(
        BASE_DIR,
        "models",
        "xlm_roberta_oversample"
    ),

    "malaybert": os.path.join(
        BASE_DIR,
        "models",
        "malaybert_v2"
    ),

    "mbert": os.path.join(
        BASE_DIR,
        "models",
        "mbert_v2"
    )

}


# ============================================================
# SEMANTIC MODEL
# ============================================================

SEMANTIC_MODEL_NAME = (
    "sentence-transformers/"
    "paraphrase-multilingual-MiniLM-L12-v2"
)


# ============================================================
# SEMANTIC INDEX
# ============================================================

SEMANTIC_INDEX_PATH = os.path.join(
    BASE_DIR,
    "models",
    "pantun_embeddings.pkl"
)


# ============================================================
# LOAD TRANSFORMER MODELS
# ============================================================

models = {}


def load_model(model_name, model_path):

    print(
        f"Loading {model_name}..."
    )

    if not os.path.exists(model_path):

        raise FileNotFoundError(
            f"Model path not found: {model_path}"
        )


    tokenizer = (
        AutoTokenizer.from_pretrained(
            model_path
        )
    )


    model = (
        AutoModelForSequenceClassification
        .from_pretrained(model_path)
    )


    model.to(device)

    model.eval()


    models[model_name] = {

        "tokenizer": tokenizer,

        "model": model

    }


    print(
        f"{model_name} loaded successfully!"
    )



# ------------------------------------------------------------
# LOAD ALL THREE MODELS
# ------------------------------------------------------------

for name, path in MODEL_PATHS.items():

    load_model(
        name,
        path
    )


print()
print(
    "All Transformer models loaded successfully!"
)
print()


# ============================================================
# LOAD SEMANTIC MODEL
# ============================================================

print(
    "Loading semantic model..."
)


semantic_model = SentenceTransformer(
    SEMANTIC_MODEL_NAME
)


print(
    "Semantic model loaded successfully!"
)


# ============================================================
# LOAD SEMANTIC INDEX
# ============================================================

print()
print(
    "Loading semantic index..."
)


if not os.path.exists(
    SEMANTIC_INDEX_PATH
):

    raise FileNotFoundError(
        "Semantic index not found: "
        + SEMANTIC_INDEX_PATH
    )


with open(
    SEMANTIC_INDEX_PATH,
    "rb"
) as f:

    semantic_data = pickle.load(f)


semantic_embeddings = (
    semantic_data["embeddings"]
)

semantic_texts = (
    semantic_data["texts"]
)

semantic_labels = (
    semantic_data["labels"]
)


print(
    "Semantic embeddings:",
    semantic_embeddings.shape
)

print(
    "Indexed pantun:",
    len(semantic_texts)
)

print(
    "Semantic index loaded successfully!"
)

print()


# ============================================================
# PREDICT USING ONE MODEL
# ============================================================

def predict_with_model(
    model_name,
    text
):

    tokenizer = (
        models[model_name]["tokenizer"]
    )

    model = (
        models[model_name]["model"]
    )


    # --------------------------------------------------------
    # TOKENIZE
    # --------------------------------------------------------

    inputs = tokenizer(

        text,

        return_tensors="pt",

        truncation=True,

        padding=True,

        max_length=128

    )


    inputs = {

        key: value.to(device)

        for key, value
        in inputs.items()

    }


    # --------------------------------------------------------
    # MODEL PREDICTION
    # --------------------------------------------------------

    with torch.no_grad():

        outputs = model(
            **inputs
        )


        probabilities = (
            F.softmax(
                outputs.logits,
                dim=-1
            )[0]
        )


    # --------------------------------------------------------
    # PREDICTED CLASS
    # --------------------------------------------------------

    predicted_id = (
        torch.argmax(
            probabilities
        ).item()
    )


    confidence = (
        probabilities[
            predicted_id
        ].item() * 100
    )


    # --------------------------------------------------------
    # ALL THEME PROBABILITIES
    # --------------------------------------------------------

    all_probabilities = []


    for label_id in range(
        len(LABELS)
    ):

        probability = (
            probabilities[
                label_id
            ].item() * 100
        )


        all_probabilities.append({

            "theme":
                LABELS[label_id],

            "confidence":
                round(
                    probability,
                    2
                )

        })


    # --------------------------------------------------------
    # SORT HIGHEST FIRST
    # --------------------------------------------------------

    all_probabilities.sort(

        key=lambda x:
            x["confidence"],

        reverse=True

    )


    # --------------------------------------------------------
    # RETURN RESULT
    # --------------------------------------------------------

    return {

        "theme":
            LABELS[predicted_id],

        "confidence":
            round(
                confidence,
                2
            ),

        "probabilities":
            all_probabilities

    }


# ============================================================
# SEMANTIC SEARCH
# ============================================================

def get_similar_pantun(
    pantun,
    top_k=5
):

    # --------------------------------------------------------
    # CREATE QUERY EMBEDDING
    # --------------------------------------------------------

    query_embedding = (
        semantic_model.encode(
            [pantun],
            normalize_embeddings=True
        )
    )


    # --------------------------------------------------------
    # COSINE SIMILARITY
    # --------------------------------------------------------

    similarities = (
        cosine_similarity(
            query_embedding,
            semantic_embeddings
        )[0]
    )


    # --------------------------------------------------------
    # SORT BY SIMILARITY
    # --------------------------------------------------------

    ranked_indices = (
        np.argsort(
            similarities
        )[::-1]
    )


    results = []


    # --------------------------------------------------------
    # GET TOP RESULTS
    # --------------------------------------------------------

    for index in ranked_indices:

        similar_text = (
            semantic_texts[index]
        )


        similarity = (
            float(
                similarities[index]
            ) * 100
        )


        # ----------------------------------------------------
        # SKIP EXACT SAME TEXT
        # ----------------------------------------------------

        if (
            similar_text.strip().lower()
            ==
            pantun.strip().lower()
        ):

            continue


        results.append({

            "text":
                similar_text,

            "theme":
                semantic_labels[index],

            "similarity":
                round(
                    similarity,
                    2
                )

        })


        if len(results) >= top_k:

            break


    return results


# ============================================================
# HOME
# ============================================================

@app.route("/")
def home():

    return render_template(
        "index.html"
    )


# ============================================================
# CLASSIFICATION
# ============================================================

@app.route(
    "/predict",
    methods=["POST"]
)
def predict():

    try:

        # ----------------------------------------------------
        # GET REQUEST DATA
        # ----------------------------------------------------

        data = request.get_json()


        if not data:

            return jsonify({

                "success":
                    False,

                "error":
                    "No data received."

            }), 400


        # ----------------------------------------------------
        # GET PANTUN
        # ----------------------------------------------------

        pantun = (
            data.get(
                "pantun",
                ""
            )
            .strip()
        )


        if not pantun:

            return jsonify({

                "success":
                    False,

                "error":
                    "Please enter a pantun."

            }), 400


        print()
        print(
            "=" * 60
        )

        print(
            "CLASSIFYING PANTUN"
        )

        print(
            pantun
        )

        print(
            "=" * 60
        )


        # ----------------------------------------------------
        # XLM-RoBERTa
        # ----------------------------------------------------

        xlm_result = (
            predict_with_model(
                "xlm_roberta",
                pantun
            )
        )


        # ----------------------------------------------------
        # MalayBERT
        # ----------------------------------------------------

        malaybert_result = (
            predict_with_model(
                "malaybert",
                pantun
            )
        )


        # ----------------------------------------------------
        # mBERT
        # ----------------------------------------------------

        mbert_result = (
            predict_with_model(
                "mbert",
                pantun
            )
        )


        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        return jsonify({

            "success":
                True,

            "pantun":
                pantun,

            "predictions": {

                "xlm_roberta":
                    xlm_result,

                "malaybert":
                    malaybert_result,

                "mbert":
                    mbert_result

            }

        })


    except Exception as e:

        print(
            "Prediction error:",
            str(e)
        )


        return jsonify({

            "success":
                False,

            "error":
                str(e)

        }), 500


# ============================================================
# SEMANTIC SEARCH
# ============================================================

@app.route(
    "/similar",
    methods=["POST"]
)
def similar():

    try:

        data = request.get_json()


        if not data:

            return jsonify({

                "success":
                    False,

                "error":
                    "No data received."

            }), 400


        pantun = (
            data.get(
                "pantun",
                ""
            )
            .strip()
        )


        if not pantun:

            return jsonify({

                "success":
                    False,

                "error":
                    "No pantun provided."

            }), 400


        results = (
            get_similar_pantun(
                pantun,
                top_k=5
            )
        )


        return jsonify({

            "success":
                True,

            "pantun":
                pantun,

            "results":
                results

        })


    except Exception as e:

        print(
            "Semantic search error:",
            str(e)
        )


        return jsonify({

            "success":
                False,

            "error":
                str(e)

        }), 500


# ============================================================
# SEMANTIC GRAPH PAGE
# ============================================================

@app.route(
    "/semantic-graph",
    methods=["GET"]
)
def semantic_graph_page():

    return render_template(
        "semantic_graph.html"
    )


# ============================================================
# SEMANTIC GRAPH DATA
# ============================================================

@app.route(
    "/semantic-graph",
    methods=["POST"]
)
def semantic_graph_data():

    try:

        data = request.get_json()


        if not data:

            return jsonify({

                "success":
                    False,

                "error":
                    "No data received."

            }), 400


        pantun = (
            data.get(
                "pantun",
                ""
            )
            .strip()
        )


        if not pantun:

            return jsonify({

                "success":
                    False,

                "error":
                    "No pantun provided."

            }), 400


        # ----------------------------------------------------
        # GET TOP 5 SIMILAR PANTUN
        # ----------------------------------------------------

        similar_results = (
            get_similar_pantun(
                pantun,
                top_k=5
            )
        )


        # ----------------------------------------------------
        # GRAPH NODES
        # ----------------------------------------------------

        nodes = []


        # ----------------------------------------------------
        # USER NODE
        # ----------------------------------------------------

        nodes.append({

            "id":
                "user",

            "label":
                "Your Pantun",

            "text":
                pantun,

            "theme":
                "User Input",

            "type":
                "user"

        })


        # ----------------------------------------------------
        # SIMILAR PANTUN NODES
        # ----------------------------------------------------

        for i, result in enumerate(
            similar_results
        ):

            node_id = (
                f"pantun_{i + 1}"
            )


            nodes.append({

                "id":
                    node_id,

                "label":
                    f"Pantun {i + 1}",

                "text":
                    result["text"],

                "theme":
                    result["theme"],

                "similarity":
                    result["similarity"],

                "type":
                    "similar"

            })


        # ----------------------------------------------------
        # GRAPH EDGES
        # ----------------------------------------------------

        edges = []


        for i, result in enumerate(
            similar_results
        ):

            node_id = (
                f"pantun_{i + 1}"
            )


            edges.append({

                "from":
                    "user",

                "to":
                    node_id,

                "similarity":
                    result["similarity"],

                "label":
                    f'{result["similarity"]:.2f}%'

            })


        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        return jsonify({

            "success":
                True,

            "pantun":
                pantun,

            "nodes":
                nodes,

            "edges":
                edges

        })


    except Exception as e:

        print(
            "Semantic graph error:",
            str(e)
        )


        return jsonify({

            "success":
                False,

            "error":
                str(e)

        }), 500

# ============================================================
# SIMILAR PANTUN PAGE
# ============================================================

@app.route(
    "/similar-pantun",
    methods=["GET"]
)
def similar_pantun_page():

    return render_template(
        "similar_pantun.html"
    )

# ============================================================
# RUN FLASK
# ============================================================

if __name__ == "__main__":

    print()
    print(
        "=" * 60
    )

    print(
        "PANTUN AI SERVER"
    )

    print(
        "=" * 60
    )

    print(
        "Open: http://127.0.0.1:5000"
    )

    print()


    app.run(

        debug=True,

        host="127.0.0.1",

        port=5000

    )
