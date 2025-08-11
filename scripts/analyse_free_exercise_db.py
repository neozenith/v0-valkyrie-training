# /// script
# requires-python = ">=3.12"
# dependencies = [
#   "jsonschema>=4.0.0",
# ]
# ///

import argparse
import json
import logging
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, List

log = logging.getLogger(__name__)

# Configuration
SCRIPT_DIR = Path(__file__).parent.resolve()
FREE_EXERCISE_DB_DIR = SCRIPT_DIR.parent / "tmp" / "free-exercise-db" / "exercises"
CACHE_DIR = SCRIPT_DIR.parent / "tmp" / "claude_cache" / "analyse_free_exercise_db"
CACHE_TIMEOUT = 300  # 5 minutes

# Cache file paths
SCHEMA_CACHE_FILE = CACHE_DIR / "free-exercise-db-schema.json"
MAPPING_CACHE_FILE = CACHE_DIR / "field-mapping.json"
ANALYSIS_CACHE_FILE = CACHE_DIR / "analysis-results.json"


class FreeExerciseDBAnalyzer:
    """Analyzer for the free-exercise-db repository structure."""

    def __init__(self):
        self.exercises_data: List[Dict[str, Any]] = []
        self.field_analysis: Dict[str, Dict[str, Any]] = {}
        self.statistics: Dict[str, Any] = {}

    def load_exercises(self) -> None:
        """Load all exercise JSON files from the free-exercise-db directory."""
        if not FREE_EXERCISE_DB_DIR.exists():
            raise FileNotFoundError(f"Free exercise DB directory not found: {FREE_EXERCISE_DB_DIR}")

        exercise_files = list(FREE_EXERCISE_DB_DIR.glob("*.json"))
        log.info(f"Loading {len(exercise_files)} exercise files from {FREE_EXERCISE_DB_DIR}")

        for file_path in exercise_files:
            try:
                exercise_data = json.loads(file_path.read_text(encoding="utf-8"))
                self.exercises_data.append(exercise_data)
            except (json.JSONDecodeError, UnicodeDecodeError) as e:
                log.warning(f"Failed to load {file_path.name}: {e}")
                continue

        log.info(f"Successfully loaded {len(self.exercises_data)} exercises")

    def analyze_field_structure(self) -> None:
        """Analyze the structure and types of all fields across exercises."""
        field_stats = defaultdict(
            lambda: {"count": 0, "types": set(), "null_count": 0, "unique_values": set(), "sample_values": []}
        )

        for exercise in self.exercises_data:
            for field, value in exercise.items():
                stats = field_stats[field]
                stats["count"] += 1

                if value is None:
                    stats["null_count"] += 1
                    stats["types"].add("null")
                else:
                    value_type = type(value).__name__
                    stats["types"].add(value_type)

                    # Track unique values for categorical fields
                    if field in ["equipment", "level", "force", "mechanic", "category"]:
                        if isinstance(value, str):
                            stats["unique_values"].add(value)
                    elif field in ["primaryMuscles", "secondaryMuscles"]:
                        if isinstance(value, list):
                            for muscle in value:
                                stats["unique_values"].add(muscle)

                    # Keep sample values
                    if len(stats["sample_values"]) < 5:
                        stats["sample_values"].append(value)

        # Convert sets to lists for JSON serialization
        self.field_analysis = {}
        for field, stats in field_stats.items():
            self.field_analysis[field] = {
                "count": stats["count"],
                "types": sorted(list(stats["types"])),
                "null_count": stats["null_count"],
                "unique_values": sorted(list(stats["unique_values"])) if stats["unique_values"] else [],
                "sample_values": stats["sample_values"],
            }

    def generate_statistics(self) -> None:
        """Generate comprehensive statistics about the exercise database."""
        total_exercises = len(self.exercises_data)

        # Count by categories
        equipment_counts = Counter()
        level_counts = Counter()
        force_counts = Counter()
        mechanic_counts = Counter()
        category_counts = Counter()
        primary_muscle_counts = Counter()
        secondary_muscle_counts = Counter()

        for exercise in self.exercises_data:
            equipment = exercise.get("equipment")
            if equipment:
                equipment_counts[equipment] += 1

            level = exercise.get("level")
            if level:
                level_counts[level] += 1

            force = exercise.get("force")
            if force:
                force_counts[force] += 1

            mechanic = exercise.get("mechanic")
            if mechanic:
                mechanic_counts[mechanic] += 1

            category = exercise.get("category")
            if category:
                category_counts[category] += 1

            primary_muscles = exercise.get("primaryMuscles", [])
            for muscle in primary_muscles:
                primary_muscle_counts[muscle] += 1

            secondary_muscles = exercise.get("secondaryMuscles", [])
            for muscle in secondary_muscles:
                secondary_muscle_counts[muscle] += 1

        # Calculate instruction statistics
        instruction_lengths = []
        for exercise in self.exercises_data:
            instructions = exercise.get("instructions", [])
            if instructions:
                instruction_lengths.append(len(instructions))

        self.statistics = {
            "total_exercises": total_exercises,
            "equipment_types": dict(equipment_counts.most_common()),
            "difficulty_levels": dict(level_counts.most_common()),
            "force_types": dict(force_counts.most_common()),
            "mechanic_types": dict(mechanic_counts.most_common()),
            "exercise_categories": dict(category_counts.most_common()),
            "primary_muscles": dict(primary_muscle_counts.most_common()),
            "secondary_muscles": dict(secondary_muscle_counts.most_common()),
            "instruction_stats": {
                "min_steps": min(instruction_lengths) if instruction_lengths else 0,
                "max_steps": max(instruction_lengths) if instruction_lengths else 0,
                "avg_steps": sum(instruction_lengths) / len(instruction_lengths) if instruction_lengths else 0,
            },
        }

    def generate_json_schema(self) -> Dict[str, Any]:
        """Generate a JSON schema for the free-exercise-db format."""
        # Define muscle options based on analysis
        muscle_options = set()
        for exercise in self.exercises_data:
            primary = exercise.get("primaryMuscles", [])
            secondary = exercise.get("secondaryMuscles", [])
            muscle_options.update(primary + secondary)

        schema = {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "title": "Free Exercise DB Schema",
            "description": "Schema for exercise data in the free-exercise-db format",
            "type": "object",
            "required": ["name", "id"],
            "properties": {
                "name": {"type": "string", "description": "Human-readable exercise name"},
                "id": {"type": "string", "description": "Unique identifier for the exercise"},
                "force": {
                    "type": ["string", "null"],
                    "enum": sorted(list(self.field_analysis.get("force", {}).get("unique_values", []))) + [None],
                    "description": "Type of force applied (push, pull, static)",
                },
                "level": {
                    "type": "string",
                    "enum": sorted(list(self.field_analysis.get("level", {}).get("unique_values", []))),
                    "description": "Difficulty level of the exercise",
                },
                "mechanic": {
                    "type": ["string", "null"],
                    "enum": sorted(list(self.field_analysis.get("mechanic", {}).get("unique_values", []))) + [None],
                    "description": "Movement mechanic (compound, isolation)",
                },
                "equipment": {
                    "type": "string",
                    "enum": sorted(list(self.field_analysis.get("equipment", {}).get("unique_values", []))),
                    "description": "Required equipment for the exercise",
                },
                "primaryMuscles": {
                    "type": "array",
                    "items": {"type": "string", "enum": sorted(list(muscle_options))},
                    "description": "Primary muscles targeted by the exercise",
                },
                "secondaryMuscles": {
                    "type": "array",
                    "items": {"type": "string", "enum": sorted(list(muscle_options))},
                    "description": "Secondary muscles engaged by the exercise",
                },
                "instructions": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Step-by-step instructions for performing the exercise",
                },
                "category": {
                    "type": "string",
                    "enum": sorted(list(self.field_analysis.get("category", {}).get("unique_values", []))),
                    "description": "Exercise category (strength, cardio, stretching, etc.)",
                },
                "images": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Array of image paths for the exercise",
                },
            },
        }

        return schema

    def generate_field_mapping(self) -> Dict[str, Any]:
        """Generate a mapping analysis between free-exercise-db and our catalog format."""
        mapping = {
            "direct_mappings": {
                "name": "name",
                "equipment": "equipment",
                "instructions": "cues",
                "primaryMuscles + secondaryMuscles": "targetMuscles",
            },
            "conditional_mappings": {
                "level": {
                    "description": "Could map to difficulty or progression level in our format",
                    "free_exercise_values": list(self.field_analysis.get("level", {}).get("unique_values", [])),
                    "our_format_equivalent": "Not currently in our schema",
                },
                "force": {
                    "description": "Could be used for exercise categorization",
                    "free_exercise_values": list(self.field_analysis.get("force", {}).get("unique_values", [])),
                    "our_format_equivalent": "Could add as movement_pattern field",
                },
                "mechanic": {
                    "description": "Indicates compound vs isolation exercises",
                    "free_exercise_values": list(self.field_analysis.get("mechanic", {}).get("unique_values", [])),
                    "our_format_equivalent": "Could add as exercise_type field",
                },
                "category": {
                    "description": "High-level exercise categorization",
                    "free_exercise_values": list(self.field_analysis.get("category", {}).get("unique_values", [])),
                    "our_format_equivalent": "Could add as category field",
                },
            },
            "format_differences": {
                "muscle_specification": {
                    "free_exercise": "Separates primaryMuscles and secondaryMuscles",
                    "our_format": "Combined into targetMuscles array",
                },
                "instructions": {
                    "free_exercise": "Detailed step-by-step instructions in array",
                    "our_format": "Concise cues array focused on form",
                },
                "equipment": {
                    "free_exercise": "Single equipment string",
                    "our_format": "Array of equipment (supports multiple pieces)",
                },
                "identifiers": {
                    "free_exercise": "Uses 'id' field with filename-like format",
                    "our_format": "Uses object keys as identifiers",
                },
            },
            "enhancement_opportunities": {
                "add_to_our_format": [
                    "difficulty_level (from level field)",
                    "movement_pattern (from force field)",
                    "exercise_type (from mechanic field)",
                    "category (from category field)",
                    "primary_vs_secondary_muscles (separate targeting)",
                ],
                "data_enrichment": [
                    "Images from free-exercise-db",
                    "More detailed instructions",
                    "Standardized difficulty levels",
                ],
            },
        }

        return mapping

    def save_results(self) -> None:
        """Save analysis results to cache files."""
        # Ensure cache directory exists
        CACHE_DIR.mkdir(parents=True, exist_ok=True)

        # Save JSON schema
        schema = self.generate_json_schema()
        SCHEMA_CACHE_FILE.write_text(json.dumps(schema, indent=2, ensure_ascii=False), encoding="utf-8")
        log.info(f"Saved JSON schema to {SCHEMA_CACHE_FILE}")

        # Save field mapping
        mapping = self.generate_field_mapping()
        MAPPING_CACHE_FILE.write_text(json.dumps(mapping, indent=2, ensure_ascii=False), encoding="utf-8")
        log.info(f"Saved field mapping to {MAPPING_CACHE_FILE}")

        # Save complete analysis
        analysis = {
            "field_analysis": self.field_analysis,
            "statistics": self.statistics,
            "metadata": {
                "total_exercises_analyzed": len(self.exercises_data),
                "analysis_timestamp": str(Path(__file__).stat().st_mtime),
            },
        }
        ANALYSIS_CACHE_FILE.write_text(json.dumps(analysis, indent=2, ensure_ascii=False), encoding="utf-8")
        log.info(f"Saved complete analysis to {ANALYSIS_CACHE_FILE}")

    def print_summary(self) -> None:
        """Print a comprehensive summary of the analysis."""
        print("\n" + "=" * 80)
        print("FREE-EXERCISE-DB STRUCTURE ANALYSIS SUMMARY")
        print("=" * 80)

        # Basic statistics
        stats = self.statistics
        print("\n📊 OVERVIEW:")
        print(f"  Total exercises: {stats['total_exercises']:,}")

        # Equipment breakdown
        print(f"\n🏋️  EQUIPMENT TYPES ({len(stats['equipment_types'])} unique):")
        for equipment, count in list(stats["equipment_types"].items())[:10]:
            print(f"  • {equipment}: {count:,} exercises")
        if len(stats["equipment_types"]) > 10:
            print(f"  ... and {len(stats['equipment_types']) - 10} more")

        # Difficulty levels
        print("\n📈 DIFFICULTY LEVELS:")
        for level, count in stats["difficulty_levels"].items():
            percentage = (count / stats["total_exercises"]) * 100
            print(f"  • {level}: {count:,} exercises ({percentage:.1f}%)")

        # Exercise categories
        print("\n🎯 EXERCISE CATEGORIES:")
        for category, count in stats["exercise_categories"].items():
            percentage = (count / stats["total_exercises"]) * 100
            print(f"  • {category}: {count:,} exercises ({percentage:.1f}%)")

        # Force types
        print("\n💪 FORCE TYPES:")
        for force, count in stats["force_types"].items():
            percentage = (count / stats["total_exercises"]) * 100
            print(f"  • {force}: {count:,} exercises ({percentage:.1f}%)")

        # Mechanic types
        print("\n⚙️  MECHANIC TYPES:")
        for mechanic, count in stats["mechanic_types"].items():
            percentage = (count / stats["total_exercises"]) * 100
            print(f"  • {mechanic}: {count:,} exercises ({percentage:.1f}%)")

        # Top muscles
        print("\n🎯 TOP PRIMARY MUSCLES:")
        for muscle, count in list(stats["primary_muscles"].items())[:10]:
            percentage = (count / stats["total_exercises"]) * 100
            print(f"  • {muscle}: {count:,} exercises ({percentage:.1f}%)")

        print("\n🎯 TOP SECONDARY MUSCLES:")
        for muscle, count in list(stats["secondary_muscles"].items())[:10]:
            percentage = (count / stats["total_exercises"]) * 100
            print(f"  • {muscle}: {count:,} exercises ({percentage:.1f}%)")

        # Instruction statistics
        instr_stats = stats["instruction_stats"]
        print("\n📝 INSTRUCTION STATISTICS:")
        print(f"  • Min steps: {instr_stats['min_steps']}")
        print(f"  • Max steps: {instr_stats['max_steps']}")
        print(f"  • Avg steps: {instr_stats['avg_steps']:.1f}")

        # Field analysis summary
        print("\n🔍 FIELD ANALYSIS:")
        for field, analysis in self.field_analysis.items():
            null_pct = (analysis["null_count"] / stats["total_exercises"]) * 100
            types_str = ", ".join(analysis["types"])
            print(f"  • {field}: {types_str} ({analysis['count']:,} entries, {null_pct:.1f}% null)")

        # File locations
        print("\n💾 OUTPUT FILES:")
        print(f"  • Schema: {SCHEMA_CACHE_FILE}")
        print(f"  • Mapping: {MAPPING_CACHE_FILE}")
        print(f"  • Analysis: {ANALYSIS_CACHE_FILE}")

        print("\n" + "=" * 80)


def main():
    """Main function to run the analysis."""
    analyzer = FreeExerciseDBAnalyzer()

    try:
        # Load and analyze the exercise data
        analyzer.load_exercises()
        analyzer.analyze_field_structure()
        analyzer.generate_statistics()

        # Save results and print summary
        analyzer.save_results()
        analyzer.print_summary()

        log.info("Analysis completed successfully")

    except Exception as e:
        log.error(f"Analysis failed: {e}")
        raise


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s|%(name)s|%(levelname)s|%(filename)s:%(lineno)d - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    parser = argparse.ArgumentParser(
        description="Analyze the structure of the free-exercise-db repository and generate schema and mapping files"
    )
    args = parser.parse_args()

    main()
