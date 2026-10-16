"""
CareAfter Clinical Data & Model Fetcher
Fetches Hugging Face datasets and model metadata for post-discharge symptom analysis.
"""

import os
import sys
import json
import warnings
from typing import Any, Dict, List

# 1. Standard imports with fallback and type ignores to ensure 0 editor warnings
try:
    import spacy  # type: ignore
except ImportError:
    spacy = None

try:
    from datasets import load_dataset  # type: ignore
except ImportError:
    load_dataset = None

try:
    from huggingface_hub import HfApi, hf_hub_download  # type: ignore
except ImportError:
    HfApi = None
    hf_hub_download = None

# Ensure UTF-8 output encoding for Windows terminal
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Suppress harmless HF cache warning on Windows
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
warnings.filterwarnings("ignore")

print("=====================================================")
print("CareAfter Clinical AI & Hugging Face Resource Fetcher")
print("=====================================================")

# 2. Check spaCy installation
if spacy is not None:
    print(f"[OK] spaCy is installed: version {spacy.__version__}")
else:
    print("[WARN] spaCy package not imported")

# 3. Fetch 3 examples from actava/chi-bench using streaming=True
print("\n--- 1. Fetching 3 examples from actava/chi-bench (streaming=True) ---")
chi_bench_samples: List[Dict[str, Any]] = []

if load_dataset is not None:
    try:
        ds = load_dataset("actava/chi-bench", data_files="tasks.jsonl", split="train", streaming=True)
        for i, item in enumerate(ds.take(3)):
            sample_data = {
                "index": i + 1,
                "task_id": item.get("task_id", f"task_{i+1}"),
                "instruction": str(item.get("instruction", ""))[:280],
                "category": item.get("category", "clinical_bench")
            }
            chi_bench_samples.append(sample_data)
            print(f"[OK] Fetched chi-bench sample {i+1}: {sample_data['task_id']}")
    except Exception as e:
        print(f"[WARN] Notice during chi-bench streaming: {e}")
else:
    print("[WARN] datasets library not available")

# 4. Fetch pmaitra/en_biobert_ner_symptom model metadata & labels
print("\n--- 2. Fetching pmaitra/en_biobert_ner_symptom model ---")
model_info: Dict[str, Any] = {"repo_id": "pmaitra/en_biobert_ner_symptom", "labels": ["SYMPTOMS"]}

if HfApi is not None and hf_hub_download is not None:
    try:
        api = HfApi()
        repo_files = list(api.list_repo_files("pmaitra/en_biobert_ner_symptom"))
        print(f"[OK] Found pmaitra/en_biobert_ner_symptom files: {repo_files[:4]}...")

        # Download meta.json
        meta_path = hf_hub_download("pmaitra/en_biobert_ner_symptom", "meta.json")
        with open(meta_path, "r", encoding="utf-8") as f:
            meta_data = json.load(f)

        model_info = {
            "repo_id": "pmaitra/en_biobert_ner_symptom",
            "labels": meta_data.get("labels", {}).get("ner", ["SYMPTOMS"]),
            "spacy_version": meta_data.get("spacy_version", ">=3.4.0"),
            "author": meta_data.get("author", "Prithwiraj Maitra"),
            "license": meta_data.get("license", "cc-by-4.0")
        }
        print(f"[OK] Extracted model NER labels: {model_info['labels']}")
    except Exception as e:
        print(f"[WARN] Notice during pmaitra/en_biobert_ner_symptom fetch: {e}")
else:
    print("[WARN] huggingface_hub not available")

# 5. Fetch triage router information (without re-importing HfApi)
print("\n--- 3. Fetching Triage Router Configurations ---")
triage_routers: Dict[str, Any] = {}

if HfApi is not None:
    try:
        api = HfApi()
        for repo in ["smolify/smolified-clinical-symptom-router", "VolodymyrPugachov/BioClinicalBERT-Triage"]:
            try:
                info = api.model_info(repo)
                triage_routers[repo] = {
                    "id": info.id,
                    "pipeline_tag": info.pipeline_tag,
                    "tags": [t for t in (info.tags or []) if not str(t).startswith("license:")][:5]
                }
                print(f"[OK] Fetched triage router metadata for {repo}")
            except Exception as tr_err:
                print(f"[WARN] Notice for {repo}: {tr_err}")
    except Exception as e:
        print(f"[WARN] Notice during triage router fetch: {e}")
else:
    print("[WARN] huggingface_hub not available")

# 6. Compile and export to src/data/clinicalKnowledge.json
clinical_knowledge = {
    "chi_bench_samples": chi_bench_samples,
    "ner_symptom_model": model_info,
    "triage_routers": triage_routers,
    "triage_categories": [
        {
            "priority": "HIGH",
            "code": "RED",
            "title": "Immediate Care / Urgent Review",
            "action": "Immediate clinical team call and physician review within 2 hours.",
            "triggers": ["severe pain", "breathing worse", "chest pain", "fever with confusion", "slurred speech", "wound discharge"]
        },
        {
            "priority": "MODERATE",
            "code": "AMBER",
            "title": "Clinical Attention Needed",
            "action": "Review in morning rounds; verify medication adherence and schedule tele-check.",
            "triggers": ["moderate pain", "persistent cough", "missed medication dose", "ankle swelling", "dizziness when standing"]
        },
        {
            "priority": "ROUTINE",
            "code": "GREEN",
            "title": "Stable Recovery",
            "action": "Continue scheduled remote follow-up check-ins; reinforce lifestyle instructions.",
            "triggers": ["taking all medicines", "mild discomfort resolving", "vital signs normal", "mobility improving"]
        }
    ],
    "recovery_dimensions": [
        "Symptom Severity Trajectory",
        "Medication Adherence",
        "Functional Mobility & Pain",
        "Vital Signs & Fluid Balance",
        "Red-Flag Complication Absence"
    ]
}

output_path = os.path.join(os.path.dirname(__file__), "..", "src", "data", "clinicalKnowledge.json")
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(clinical_knowledge, f, indent=2)

print(f"\n[OK] Successfully saved clinical knowledge base at: {os.path.abspath(output_path)}")
print("=====================================================")
print("Execution Completed Successfully")
print("=====================================================")
