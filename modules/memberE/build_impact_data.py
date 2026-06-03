import csv
import heapq
import json
import random
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
ARCHIVE_DIR = ROOT / "archive (3)"
OUTPUT = ROOT / "data" / "memberE" / "memberE_impact.json"

DISCIPLINE_FILES = {
    "Physics": "Physics publication record_openalex_enriched.csv",
    "Chemistry": "Chemistry publication record_openalex_enriched.csv",
    "Medicine": "Medicine publication record_openalex_enriched.csv",
}

TOP_N = 1400
RESERVOIR_N = 900
SEED = 7

csv.field_size_limit(min(sys.maxsize, 2_147_483_647))


def parse_yes(value: object) -> bool:
    return str(value or "").strip().lower() in {"yes", "true", "1"}


def parse_bool(value: object) -> bool:
    return str(value or "").strip().lower() in {"true", "yes", "1"}


def parse_int(value: object) -> int | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    try:
        return int(float(text))
    except ValueError:
        return None


def parse_float(value: object) -> float | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def push_top(
    heap: list[tuple[float, int, str, dict]],
    metric: float | None,
    seq: int,
    key: str,
    paper: dict,
    limit: int,
) -> None:
    if metric is None:
        return
    heapq.heappush(heap, (float(metric), seq, key, paper))
    if len(heap) > limit:
        heapq.heappop(heap)


def process_file(filename: str) -> dict:
    path = ARCHIVE_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"Missing input: {path}")

    rng = random.Random(SEED)

    rows = 0
    enriched_rows = 0
    min_year: int | None = None
    max_year: int | None = None

    prize_map: dict[str, dict] = {}
    top_citations: list[tuple[float, int, str, dict]] = []
    top_fwci: list[tuple[float, int, str, dict]] = []
    top_percentile: list[tuple[float, int, str, dict]] = []

    reservoir: list[dict] = []
    reservoir_seen = 0

    with path.open("r", encoding="utf-8-sig", errors="replace", newline="") as source:
        reader = csv.DictReader(source)
        for row in reader:
            seq = rows
            rows += 1

            openalex_id = (row.get("openalex_id") or "").strip()
            if not openalex_id:
                continue
            enriched_rows += 1

            year = parse_int(row.get("openalex_publication_year") or row.get("Pub year"))
            if year is not None and 1800 <= year <= 2030:
                min_year = year if min_year is None else min(min_year, year)
                max_year = year if max_year is None else max(max_year, year)
            else:
                year = None

            citations = parse_int(row.get("openalex_cited_by_count")) or 0
            fwci = parse_float(row.get("openalex_fwci"))
            percentile = parse_float(row.get("openalex_citation_percentile"))

            is_prize = parse_yes(row.get("Is prize-winning paper"))
            paper = {
                "id": openalex_id,
                "title": (row.get("Title") or "").strip(),
                "year": year,
                "citations": citations,
                "fwci": fwci,
                "percentile": percentile,
                "isPrize": is_prize,
                "isTop1": parse_bool(row.get("openalex_top_1_percent")),
                "isTop10": parse_bool(row.get("openalex_top_10_percent")),
                "laureateId": str(row.get("Laureate ID") or "").strip(),
                "laureateName": (row.get("Laureate name") or "").strip(),
                "prizeYear": parse_int(row.get("Prize year")),
            }

            if is_prize:
                prize_map[openalex_id] = paper

            push_top(top_citations, citations, seq, openalex_id, paper, TOP_N)
            push_top(top_fwci, fwci, seq, openalex_id, paper, TOP_N)
            push_top(top_percentile, percentile, seq, openalex_id, paper, TOP_N)

            if not is_prize:
                reservoir_seen += 1
                if len(reservoir) < RESERVOIR_N:
                    reservoir.append(paper)
                else:
                    pick = rng.randint(0, reservoir_seen - 1)
                    if pick < RESERVOIR_N:
                        reservoir[pick] = paper

    selected: dict[str, dict] = {}
    selected.update(prize_map)
    for heap in (top_citations, top_fwci, top_percentile):
        for _, _, key, paper in heap:
            selected[key] = paper
    for paper in reservoir:
        selected[paper["id"]] = paper

    papers = list(selected.values())
    papers.sort(key=lambda item: (item.get("year") is None, item.get("year") or 0, -(item.get("citations") or 0)))

    return {
        "rows": rows,
        "enrichedRows": enriched_rows,
        "selected": len(papers),
        "minYear": min_year,
        "maxYear": max_year,
        "papers": papers,
    }


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    result = {
        "schemaVersion": 1,
        "description": "Member E long-tail impact sample derived from Nobel laureate publication records enriched with OpenAlex (fwci, citation percentile, cited_by_count).",
        "disciplines": {},
    }

    for discipline, filename in DISCIPLINE_FILES.items():
        print(f"Processing {discipline}: {filename}")
        result["disciplines"][discipline] = process_file(filename)
        stats = result["disciplines"][discipline]
        print(f"  rows={stats['rows']:,} | enriched={stats['enrichedRows']:,} | selected={stats['selected']:,}")

    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
