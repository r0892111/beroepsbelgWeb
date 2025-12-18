#!/usr/bin/env python3
"""
Comprehensive validation script that checks every single key path.
"""

import json
from pathlib import Path
from typing import Dict, Set, List

def get_all_key_paths(obj: Dict, prefix: str = "") -> Set[str]:
    """Recursively extract all key paths from a nested dictionary."""
    paths = set()
    for key, value in obj.items():
        full_path = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            paths.update(get_all_key_paths(value, full_path))
        else:
            paths.add(full_path)  # Only add leaf nodes
    return paths

def main():
    base_path = Path("/tmp/cc-agent/60073197/project/messages")
    languages = ["en", "de", "fr", "nl"]

    # Load all files
    all_data = {}
    for lang in languages:
        with open(base_path / f"{lang}.json", 'r', encoding='utf-8') as f:
            all_data[lang] = json.load(f)

    # Get all key paths for each language
    all_paths = {}
    for lang, data in all_data.items():
        all_paths[lang] = get_all_key_paths(data)

    print("=" * 80)
    print("COMPREHENSIVE KEY PATH VALIDATION")
    print("=" * 80)
    print()

    print("Total Key Paths (leaf nodes only) by Language:")
    for lang in languages:
        print(f"  {lang.upper()}: {len(all_paths[lang])} paths")
    print()

    # Check if all languages have the same paths
    reference_paths = all_paths["en"]

    all_identical = True
    discrepancies = {}

    for lang in ["de", "fr", "nl"]:
        lang_paths = all_paths[lang]

        missing = reference_paths - lang_paths
        extra = lang_paths - reference_paths

        if missing or extra:
            all_identical = False
            discrepancies[lang] = {
                "missing": sorted(list(missing)),
                "extra": sorted(list(extra))
            }

    if all_identical:
        print("=" * 80)
        print("✓ PERFECT MATCH: All files have identical key structures!")
        print("=" * 80)
        print()
        print(f"All four languages contain exactly {len(reference_paths)} translation keys")
        print()

        # Show sample of all namespaces covered
        namespaces = set(path.split('.')[0] for path in reference_paths)
        print(f"Covering {len(namespaces)} top-level namespaces:")
        for ns in sorted(namespaces):
            ns_count = len([p for p in reference_paths if p.startswith(f"{ns}.")])
            print(f"  • {ns}: {ns_count} keys")
        print()

        # List all key paths alphabetically for verification
        print("=" * 80)
        print("COMPLETE LIST OF ALL TRANSLATION KEY PATHS:")
        print("=" * 80)
        print()
        for path in sorted(reference_paths):
            print(f"  {path}")

    else:
        print("=" * 80)
        print("⚠ DISCREPANCIES DETECTED:")
        print("=" * 80)
        print()

        for lang, issues in discrepancies.items():
            if issues["missing"]:
                print(f"{lang.upper()} - MISSING KEYS ({len(issues['missing'])}):")
                for key in issues["missing"]:
                    print(f"  ✗ {key}")
                print()

            if issues["extra"]:
                print(f"{lang.upper()} - EXTRA KEYS ({len(issues['extra'])}):")
                for key in issues["extra"]:
                    print(f"  + {key}")
                print()

if __name__ == "__main__":
    main()
