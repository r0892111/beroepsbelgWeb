#!/usr/bin/env python3
"""
Script to generate a detailed breakdown of translation keys by namespace.
"""

import json
from pathlib import Path
from typing import Dict

def count_keys_in_namespace(obj: Dict) -> int:
    """Count all keys in a namespace, including nested ones."""
    count = 0
    for key, value in obj.items():
        count += 1  # Count the key itself
        if isinstance(value, dict):
            count += count_keys_in_namespace(value)
    return count

def analyze_namespace_structure(data: Dict) -> Dict:
    """Analyze the structure of each top-level namespace."""
    structure = {}

    for namespace, content in data.items():
        if isinstance(content, dict):
            key_count = count_keys_in_namespace(content)
            nested_namespaces = [k for k, v in content.items() if isinstance(v, dict)]

            structure[namespace] = {
                "total_keys": key_count,
                "nested_namespaces": nested_namespaces,
                "nested_count": len(nested_namespaces)
            }
        else:
            structure[namespace] = {
                "total_keys": 1,
                "nested_namespaces": [],
                "nested_count": 0
            }

    return structure

def main():
    base_path = Path("/tmp/cc-agent/60073197/project/messages")
    languages = ["en", "de", "fr", "nl"]

    # Load English as reference
    with open(base_path / "en.json", 'r', encoding='utf-8') as f:
        en_data = json.load(f)

    structure = analyze_namespace_structure(en_data)

    print("=" * 80)
    print("DETAILED NAMESPACE BREAKDOWN (Based on English)")
    print("=" * 80)
    print()

    total_namespaces = len(structure)
    print(f"Total Top-Level Namespaces: {total_namespaces}")
    print()

    # Sort by namespace name
    for namespace in sorted(structure.keys()):
        info = structure[namespace]
        print(f"📁 {namespace}")
        print(f"   Total Keys: {info['total_keys']}")
        if info['nested_namespaces']:
            print(f"   Nested Namespaces: {', '.join(info['nested_namespaces'])}")
        print()

    print("=" * 80)
    print("VERIFICATION ACROSS ALL LANGUAGES")
    print("=" * 80)
    print()

    # Verify each language has the same structure
    all_match = True
    for lang in languages:
        with open(base_path / f"{lang}.json", 'r', encoding='utf-8') as f:
            lang_data = json.load(f)

        lang_structure = analyze_namespace_structure(lang_data)

        # Compare with English
        if set(lang_structure.keys()) == set(structure.keys()):
            # Check each namespace
            mismatches = []
            for ns in structure.keys():
                if ns not in lang_structure:
                    mismatches.append(f"Missing namespace: {ns}")
                elif lang_structure[ns]['total_keys'] != structure[ns]['total_keys']:
                    mismatches.append(
                        f"{ns}: {lang_structure[ns]['total_keys']} keys "
                        f"(expected {structure[ns]['total_keys']})"
                    )

            if mismatches:
                print(f"✗ {lang.upper()}: Structure mismatch")
                for m in mismatches:
                    print(f"  - {m}")
                all_match = False
            else:
                print(f"✓ {lang.upper()}: Perfect match with English structure")
        else:
            print(f"✗ {lang.upper()}: Top-level namespaces don't match")
            all_match = False

    print()
    if all_match:
        print("=" * 80)
        print("🎉 SUCCESS: All four languages have identical structure!")
        print("=" * 80)
    else:
        print("=" * 80)
        print("⚠ WARNING: Structure mismatches detected!")
        print("=" * 80)

if __name__ == "__main__":
    main()
