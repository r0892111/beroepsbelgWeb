#!/usr/bin/env python3
"""
Script to compare translation file structures across all languages.
Identifies missing keys, extra keys, and structural differences.
"""

import json
from pathlib import Path
from typing import Dict, Set, List, Tuple

def get_all_keys(obj: Dict, prefix: str = "") -> Set[str]:
    """Recursively extract all keys from a nested dictionary."""
    keys = set()
    for key, value in obj.items():
        full_key = f"{prefix}.{key}" if prefix else key
        keys.add(full_key)
        if isinstance(value, dict):
            keys.update(get_all_keys(value, full_key))
    return keys

def compare_structures(files: Dict[str, Dict]) -> Dict:
    """Compare all translation files and identify discrepancies."""

    # Extract all keys from each file
    all_keys_by_lang = {}
    for lang, data in files.items():
        all_keys_by_lang[lang] = get_all_keys(data)

    # Find the union of all keys (all keys that exist in any file)
    all_possible_keys = set()
    for keys in all_keys_by_lang.values():
        all_possible_keys.update(keys)

    # Find discrepancies
    discrepancies = {}

    for lang, keys in all_keys_by_lang.items():
        missing = all_possible_keys - keys
        if missing:
            discrepancies[f"{lang}_missing"] = sorted(list(missing))

    # Find keys unique to each language
    for lang, keys in all_keys_by_lang.items():
        other_langs_keys = set()
        for other_lang, other_keys in all_keys_by_lang.items():
            if other_lang != lang:
                other_langs_keys.update(other_keys)

        unique = keys - other_langs_keys
        if unique:
            discrepancies[f"{lang}_extra"] = sorted(list(unique))

    return {
        "all_keys_count": {lang: len(keys) for lang, keys in all_keys_by_lang.items()},
        "total_unique_keys": len(all_possible_keys),
        "discrepancies": discrepancies
    }

def main():
    # Load all translation files
    base_path = Path("/tmp/cc-agent/60073197/project/messages")

    files = {}
    languages = ["en", "de", "fr", "nl"]

    for lang in languages:
        file_path = base_path / f"{lang}.json"
        with open(file_path, 'r', encoding='utf-8') as f:
            files[lang] = json.load(f)

    # Compare structures
    results = compare_structures(files)

    # Print results
    print("=" * 80)
    print("TRANSLATION FILES STRUCTURE COMPARISON")
    print("=" * 80)
    print()

    print("Key Counts by Language:")
    for lang, count in sorted(results["all_keys_count"].items()):
        print(f"  {lang.upper()}: {count} keys")
    print()

    print(f"Total Unique Keys Across All Files: {results['total_unique_keys']}")
    print()

    if results["discrepancies"]:
        print("=" * 80)
        print("DISCREPANCIES FOUND:")
        print("=" * 80)
        print()

        for issue_type, keys in sorted(results["discrepancies"].items()):
            lang = issue_type.split("_")[0].upper()
            issue = issue_type.split("_")[1]

            if issue == "missing":
                print(f"{lang} - MISSING KEYS ({len(keys)}):")
                for key in keys:
                    print(f"  ✗ {key}")
            else:
                print(f"{lang} - EXTRA KEYS ({len(keys)}):")
                for key in keys:
                    print(f"  + {key}")
            print()
    else:
        print("=" * 80)
        print("✓ ALL FILES HAVE IDENTICAL STRUCTURE!")
        print("=" * 80)
        print()
        print("All four translation files (en, de, fr, nl) have:")
        print(f"  - {results['total_unique_keys']} keys each")
        print("  - Identical nested structure")
        print("  - No missing or extra keys")

if __name__ == "__main__":
    main()
