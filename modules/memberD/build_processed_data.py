import csv
import json
import math
import sys
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data" / "memberD"
OUTPUT = ROOT / "data" / "memberD_processed.json"
DISCIPLINE_FILES = {
    "Physics": "Physics publication record_openalex_enriched.csv",
    "Chemistry": "Chemistry publication record_openalex_enriched.csv",
    "Medicine": "Medicine publication record_openalex_enriched.csv",
}

csv.field_size_limit(min(sys.maxsize, 2_147_483_647))


def is_true(value):
    return str(value or "").strip().lower() in {"true", "yes", "1"}


def split_topics(value):
    topics = []
    seen = set()
    for topic in str(value or "").split(";"):
        topic = topic.strip()
        if topic and topic not in seen:
            topics.append(topic)
            seen.add(topic)
    return topics


def topic_entropy(topic_counts):
    total = sum(topic_counts.values())
    if total <= 0 or len(topic_counts) <= 1:
        return 0
    entropy = -sum((count / total) * math.log(count / total) for count in topic_counts.values())
    evenness = entropy / math.log(len(topic_counts))
    range_factor = min(1, math.log1p(len(topic_counts)) / math.log(24))
    return evenness * range_factor


def empty_aggregate():
    return {
        "rows": 0,
        "enrichedRows": 0,
        "topicRows": 0,
        "prizePapers": 0,
        "top10Papers": 0,
        "citations": 0,
        "minYear": None,
        "maxYear": None,
        "topicCounts": Counter(),
        "primaryCounts": Counter(),
        "primaryByDecade": defaultdict(Counter),
        "laureates": {},
    }


def add_row(aggregate, row):
    aggregate["rows"] += 1
    if not row.get("openalex_id"):
        return
    aggregate["enrichedRows"] += 1

    year_value = row.get("openalex_publication_year") or row.get("Pub year")
    try:
        year = int(float(year_value))
    except (TypeError, ValueError):
        year = None
    valid_year = year is not None and 1800 <= year <= 2030
    decade = (year // 10) * 10 if valid_year else None
    try:
        citations = max(0, float(row.get("openalex_cited_by_count") or 0))
    except ValueError:
        citations = 0

    top10 = is_true(row.get("openalex_top_10_percent"))
    prize_paper = is_true(row.get("Is prize-winning paper"))
    primary_topic = str(row.get("openalex_primary_topic") or "").strip()
    topics = split_topics(row.get("openalex_topics"))
    if primary_topic and primary_topic not in topics:
        topics.insert(0, primary_topic)

    aggregate["citations"] += citations
    if top10:
        aggregate["top10Papers"] += 1
    if prize_paper:
        aggregate["prizePapers"] += 1
    if valid_year:
        aggregate["minYear"] = min(aggregate["minYear"] or year, year)
        aggregate["maxYear"] = max(aggregate["maxYear"] or year, year)
    if topics:
        aggregate["topicRows"] += 1
        aggregate["topicCounts"].update(topics)
    if primary_topic:
        aggregate["primaryCounts"][primary_topic] += 1
        if valid_year:
            aggregate["primaryByDecade"][decade][primary_topic] += 1

    laureate_id = str(row.get("Laureate ID") or "").strip()
    if not laureate_id:
        return
    if laureate_id not in aggregate["laureates"]:
        aggregate["laureates"][laureate_id] = {
            "name": str(row.get("Laureate name") or "").strip() or laureate_id,
            "papers": 0,
            "top10Papers": 0,
            "topics": Counter(),
        }
    laureate = aggregate["laureates"][laureate_id]
    laureate["papers"] += 1
    if top10:
        laureate["top10Papers"] += 1
    laureate["topics"].update(topics)


def compact_aggregate(aggregate):
    laureates = []
    for laureate in aggregate["laureates"].values():
        top_topic = laureate["topics"].most_common(1)
        laureates.append(
            {
                "name": laureate["name"],
                "papers": laureate["papers"],
                "topicCount": len(laureate["topics"]),
                "topicAnnotations": sum(laureate["topics"].values()),
                "diversity": topic_entropy(laureate["topics"]),
                "topTopic": top_topic[0][0] if top_topic else "Unlabeled topic",
                "top10Rate": laureate["top10Papers"] / laureate["papers"] if laureate["papers"] else 0,
            }
        )
    return {
        "rows": aggregate["rows"],
        "enrichedRows": aggregate["enrichedRows"],
        "topicRows": aggregate["topicRows"],
        "prizePapers": aggregate["prizePapers"],
        "top10Papers": aggregate["top10Papers"],
        "citations": aggregate["citations"],
        "minYear": aggregate["minYear"],
        "maxYear": aggregate["maxYear"],
        "primaryTopicCount": len(aggregate["primaryCounts"]),
        "topicCounts": list(aggregate["topicCounts"].items()),
        "primaryByDecade": {
            str(decade): list(counts.items())
            for decade, counts in aggregate["primaryByDecade"].items()
        },
        "laureates": laureates,
    }


def process_discipline(filename):
    aggregate = empty_aggregate()
    with (DATA_DIR / filename).open("r", encoding="utf-8-sig", errors="replace", newline="") as source:
        for row in csv.DictReader(source):
            add_row(aggregate, row)
    return compact_aggregate(aggregate)


def get_base_counts():
    counts = {"Physics": 0, "Chemistry": 0, "Medicine": 0}
    with (DATA_DIR / "nobel.csv").open("r", encoding="utf-8-sig", errors="replace", newline="") as source:
        for row in csv.DictReader(source):
            category = row.get("category")
            if category in counts:
                counts[category] += 1
    return counts


result = {
    "schemaVersion": 1,
    "description": "Member D frontend aggregates derived from Nobel laureate publication records enriched with OpenAlex topics.",
    "baseCounts": get_base_counts(),
    "disciplines": {
        discipline: process_discipline(filename)
        for discipline, filename in DISCIPLINE_FILES.items()
    },
}

OUTPUT.write_text(
    json.dumps(result, ensure_ascii=False, separators=(",", ":")),
    encoding="utf-8",
)
print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size:,} bytes)")
