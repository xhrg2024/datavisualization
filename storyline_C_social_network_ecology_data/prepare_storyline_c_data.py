from __future__ import annotations

import csv
import json
import re
from collections import Counter, defaultdict
from itertools import combinations
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = Path(__file__).resolve().parent

INPUT_FILES = {
    "Physics": BASE_DIR / "Physics publication record_openalex_enriched.csv",
    "Chemistry": BASE_DIR / "Chemistry publication record_openalex_enriched.csv",
    "Medicine": BASE_DIR / "Medicine publication record_openalex_enriched.csv",
}

ENCODINGS = ["utf-8-sig", "utf-8", "gbk", "cp936", "latin1"]


def read_csv_rows(path: Path) -> list[dict[str, str]]:
    last_error: Exception | None = None
    for encoding in ENCODINGS:
        try:
            with path.open("r", encoding=encoding, newline="") as handle:
                return list(csv.DictReader(handle))
        except Exception as error:
            last_error = error
    raise last_error  # type: ignore[misc]


def split_items(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(";") if item.strip()]


def safe_int(value: str | None) -> int | None:
    try:
        if value is None or not str(value).strip():
            return None
        text = str(value).strip()
        try:
            return int(text)
        except Exception:
            number = float(text)
            if number.is_integer():
                return int(number)
            return None
    except Exception:
        return None


def write_csv(path: Path, rows: list[dict[str, str]], fieldnames: list[str]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def normalize_person_key(name: str | None) -> str:
    if not name:
        return ""
    cleaned = re.sub(r"[^a-z0-9 ]", " ", str(name).lower())
    parts = [part for part in cleaned.split() if part]
    if not parts:
        return ""
    return "".join(sorted(parts))


def load_all_rows() -> list[dict[str, str]]:
    all_rows: list[dict[str, str]] = []
    for category, path in INPUT_FILES.items():
        rows = read_csv_rows(path)
        for row in rows:
            row["_category"] = category
            all_rows.append(row)
    return all_rows


def prepare_team_size_data(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    output: list[dict[str, str]] = []
    for row in rows:
        if (row.get("Is prize-winning paper") or "").strip().upper() != "YES":
            continue

        authors = split_items(row.get("openalex_authors"))
        author_count = row.get("openalex_authors_count")
        if not author_count:
            author_count = str(len(authors)) if authors else ""

        prize_year = row.get("Prize year", "").strip()
        year_value = safe_int(prize_year)
        decade = str((year_value // 10) * 10) if year_value is not None else ""

        output.append(
            {
                "category": row.get("_category", ""),
                "laureate_id": row.get("Laureate ID", ""),
                "laureate_name": row.get("Laureate name", ""),
                "prize_year": prize_year,
                "decade": decade,
                "pub_year": row.get("Pub year", ""),
                "title": row.get("Title", ""),
                "paper_id": row.get("Paper ID", ""),
                "is_prize_winning_paper": row.get("Is prize-winning paper", ""),
                "author_count": author_count,
            }
        )
    return output


def prepare_coauthor_network(rows: list[dict[str, str]]) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    nodes: dict[str, dict[str, str]] = {}
    edge_counter: Counter[tuple[str, str]] = Counter()
    node_paper_counter: Counter[str] = Counter()
    node_category_counter: defaultdict[str, Counter[str]] = defaultdict(Counter)

    for row in rows:
        if (row.get("Is prize-winning paper") or "").strip().upper() != "YES":
            continue

        category = row.get("_category", "")
        laureate_name = row.get("Laureate name", "").strip()
        laureate_id = row.get("Laureate ID", "").strip()
        coauthors = split_items(row.get("openalex_authors"))

        if laureate_name:
            node_key = f"laureate::{laureate_id or laureate_name}"
            nodes.setdefault(
                node_key,
                {
                    "node_id": node_key,
                    "node_name": laureate_name,
                    "node_type": "laureate",
                    "category": category,
                },
            )
            node_paper_counter[node_key] += 1
            node_category_counter[node_key][category] += 1

        for author in coauthors:
            if not author:
                continue
            node_key = f"coauthor::{author.lower()}"
            nodes.setdefault(
                node_key,
                {
                    "node_id": node_key,
                    "node_name": author,
                    "node_type": "coauthor",
                    "category": category,
                },
            )
            node_paper_counter[node_key] += 1
            node_category_counter[node_key][category] += 1

            if laureate_name and author != laureate_name:
                left = laureate_name
                right = author
                if left > right:
                    left, right = right, left
                edge_counter[(left, right)] += 1

    node_rows: list[dict[str, str]] = []
    for node_id, node in nodes.items():
        top_category = node_category_counter[node_id].most_common(1)[0][0] if node_category_counter[node_id] else node["category"]
        node_rows.append(
            {
                **node,
                "paper_count": str(node_paper_counter[node_id]),
                "dominant_category": top_category,
            }
        )

    edge_rows = [
        {
            "source": source,
            "target": target,
            "weight": str(weight),
        }
        for (source, target), weight in sorted(edge_counter.items(), key=lambda item: (-item[1], item[0][0], item[0][1]))
    ]

    return node_rows, edge_rows


def prepare_internal_citation_network(rows: list[dict[str, str]]) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    laureate_name_by_work_id: dict[str, str] = {}
    work_pub_year_by_id: dict[str, str] = {}
    laureate_meta: dict[str, dict[str, str]] = {}

    for row in rows:
        work_id = row.get("openalex_id", "").strip()
        laureate_name = row.get("Laureate name", "").strip()
        pub_year_raw = row.get("Pub year", "").strip()
        pub_year = str(safe_int(pub_year_raw)) if safe_int(pub_year_raw) is not None else pub_year_raw
        if work_id and laureate_name:
            laureate_name_by_work_id[work_id] = laureate_name
        if work_id and pub_year:
            work_pub_year_by_id[work_id] = pub_year
        if laureate_name and laureate_name not in laureate_meta:
            laureate_meta[laureate_name] = {
                "laureate_name": laureate_name,
                "laureate_id": row.get("Laureate ID", "").strip(),
                "category": row.get("_category", ""),
                "prize_year": row.get("Prize year", "").strip(),
                "pub_year": pub_year,
            }

    edge_counter: Counter[tuple[str, str]] = Counter()
    for row in rows:
        source = row.get("Laureate name", "").strip()
        source_work_id = row.get("openalex_id", "").strip()
        source_pub_year_raw = row.get("Pub year", "").strip()
        source_pub_year = str(safe_int(source_pub_year_raw)) if safe_int(source_pub_year_raw) is not None else source_pub_year_raw
        if not source:
            continue
        referenced_works = split_items(row.get("openalex_referenced_works"))
        for work_id in referenced_works:
            target = laureate_name_by_work_id.get(work_id)
            if not target or target == source:
                continue
            target_pub_year = work_pub_year_by_id.get(work_id, "")
            if source_pub_year and target_pub_year:
                edge_counter[(f"{source}|||{source_pub_year}|||{source_work_id}", f"{target}|||{target_pub_year}|||{work_id}")] += 1

    node_rows = [
        {
            "node_name": meta["laureate_name"],
            "laureate_id": meta["laureate_id"],
            "category": meta["category"],
            "prize_year": meta["prize_year"],
            "pub_year": meta["pub_year"],
        }
        for meta in sorted(laureate_meta.values(), key=lambda item: (safe_int(item["prize_year"]) or 9999, item["laureate_name"]))
    ]

    edge_rows = [
        {
            "source": source.split("|||")[0],
            "target": target.split("|||")[0],
            "source_pub_year": source.split("|||")[1],
            "target_pub_year": target.split("|||")[1],
            "source_work_id": source.split("|||")[2],
            "target_work_id": target.split("|||")[2],
            "citation_count": str(weight),
        }
        for (source, target), weight in sorted(edge_counter.items(), key=lambda item: (-item[1], item[0][0], item[0][1]))
    ]

    return node_rows, edge_rows


def prepare_laureate_collaboration_pairs(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    laureate_name_by_key: dict[str, str] = {}
    laureate_ids_by_key: defaultdict[str, set[str]] = defaultdict(set)
    laureate_meta: dict[str, dict[str, str]] = {}

    for row in rows:
        laureate_name = (row.get("Laureate name") or "").strip()
        laureate_id = (row.get("Laureate ID") or "").strip()
        if not laureate_name:
            continue
        key = normalize_person_key(laureate_name)
        if key and key not in laureate_name_by_key:
            laureate_name_by_key[key] = laureate_name
        if key and laureate_id:
            laureate_ids_by_key[key].add(laureate_id)
        if laureate_id and laureate_id not in laureate_meta:
            laureate_meta[laureate_id] = {
                "laureate_name": laureate_name,
                "category": row.get("_category", ""),
                "prize_year": row.get("Prize year", ""),
            }

    pair_counter: Counter[tuple[str, str]] = Counter()
    pair_samples: defaultdict[tuple[str, str], list[dict[str, str]]] = defaultdict(list)
    pair_seen_paper_ids: defaultdict[tuple[str, str], set[str]] = defaultdict(set)

    for row in rows:
        if (row.get("Is prize-winning paper") or "").strip().upper() != "YES":
            continue
        author_names = split_items(row.get("openalex_authors"))
        if not author_names:
            continue

        matched_laureates: list[str] = []
        row_laureate_name = (row.get("Laureate name") or "").strip()
        row_laureate_id = (row.get("Laureate ID") or "").strip()
        row_laureate_key = normalize_person_key(row_laureate_name)
        for author in author_names:
            key = normalize_person_key(author)
            laureate_name = laureate_name_by_key.get(key)
            if not laureate_name:
                continue
            if key == row_laureate_key and row_laureate_id:
                matched_laureates.append(row_laureate_id)
                continue
            candidate_ids = sorted(laureate_ids_by_key.get(key, set()))
            if row_laureate_id in candidate_ids and len(candidate_ids) > 1:
                candidate_ids = [candidate_id for candidate_id in candidate_ids if candidate_id != row_laureate_id]
            if candidate_ids:
                matched_laureates.append(candidate_ids[0])

        unique_laureate_ids = sorted(set(matched_laureates))
        if len(unique_laureate_ids) < 2:
            continue

        for left, right in combinations(unique_laureate_ids, 2):
            if left == right:
                continue
            pair_key = (left, right)
            paper_id = (row.get("Paper ID") or "").strip() or (row.get("openalex_id") or "").strip()
            if paper_id and paper_id in pair_seen_paper_ids[pair_key]:
                continue
            if paper_id:
                pair_seen_paper_ids[pair_key].add(paper_id)

            pair_counter[pair_key] += 1
            sample_list = pair_samples[(left, right)]
            if len(sample_list) < 5:
                sample_list.append(
                    {
                        "category": row.get("_category", ""),
                        "prize_year": row.get("Prize year", ""),
                        "pub_year": row.get("Pub year", ""),
                        "title": row.get("Title", ""),
                        "paper_id": row.get("Paper ID", ""),
                        "doi": row.get("DOI", ""),
                        "journal": row.get("Journal", ""),
                    }
                )

    output_rows: list[dict[str, str]] = []
    for (left, right), weight in sorted(pair_counter.items(), key=lambda item: (-item[1], item[0][0], item[0][1])):
        left_meta = laureate_meta.get(left, {})
        right_meta = laureate_meta.get(right, {})
        left_year = safe_int(left_meta.get("prize_year"))
        right_year = safe_int(right_meta.get("prize_year"))
        earliest_year = ""
        if left_year is not None and right_year is not None:
            earliest_year = str(min(left_year, right_year))
        elif left_year is not None:
            earliest_year = str(left_year)
        elif right_year is not None:
            earliest_year = str(right_year)

        output_rows.append(
            {
                "laureate_a": left_meta.get("laureate_name", ""),
                "laureate_b": right_meta.get("laureate_name", ""),
                "laureate_a_category": left_meta.get("category", ""),
                "laureate_b_category": right_meta.get("category", ""),
                "laureate_a_prize_year": left_meta.get("prize_year", ""),
                "laureate_b_prize_year": right_meta.get("prize_year", ""),
                "earliest_prize_year": earliest_year,
                "coop_weight_sum": str(weight),
                "sample_paper_count": str(len(pair_samples[(left, right)])),
                "sample_papers_json": json.dumps(pair_samples[(left, right)], ensure_ascii=False),
            }
        )

    return output_rows


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    all_rows = load_all_rows()

    team_size_rows = prepare_team_size_data(all_rows)
    write_csv(
        OUTPUT_DIR / "figure1_team_size_prize_papers.csv",
        team_size_rows,
        [
            "category",
            "laureate_id",
            "laureate_name",
            "prize_year",
            "decade",
            "pub_year",
            "title",
            "paper_id",
            "is_prize_winning_paper",
            "author_count",
        ],
    )

    coauthor_nodes, coauthor_edges = prepare_coauthor_network(all_rows)
    write_csv(
        OUTPUT_DIR / "figure2_coauthor_nodes.csv",
        coauthor_nodes,
        ["node_id", "node_name", "node_type", "category", "paper_count", "dominant_category"],
    )
    write_csv(
        OUTPUT_DIR / "figure2_coauthor_edges.csv",
        coauthor_edges,
        ["source", "target", "weight"],
    )

    laureate_pairs = prepare_laureate_collaboration_pairs(all_rows)
    write_csv(
        OUTPUT_DIR / "figure2_laureate_collab_pairs.csv",
        laureate_pairs,
        [
            "laureate_a",
            "laureate_b",
            "laureate_a_category",
            "laureate_b_category",
            "laureate_a_prize_year",
            "laureate_b_prize_year",
            "earliest_prize_year",
            "coop_weight_sum",
            "sample_paper_count",
            "sample_papers_json",
        ],
    )

    citation_nodes, citation_edges = prepare_internal_citation_network(all_rows)
    write_csv(
        OUTPUT_DIR / "figure3_internal_citation_nodes.csv",
        citation_nodes,
        ["node_name", "laureate_id", "category", "prize_year", "pub_year"],
    )
    write_csv(
        OUTPUT_DIR / "figure3_internal_citation_edges.csv",
        citation_edges,
        ["source", "target", "source_pub_year", "target_pub_year", "source_work_id", "target_work_id", "citation_count"],
    )

    (OUTPUT_DIR / "README.md").write_text(
        "\n".join(
            [
                "# Storyline C Social Network Ecology Data",
                "",
                "This folder stores the intermediate data tables for the chapter '同行 · 巨人的肩膀与同行者'.",
                "",
                "## Files",
                "- figure1_team_size_prize_papers.csv: team size data for the prize-winning paper distribution chart.",
                "- figure2_coauthor_nodes.csv / figure2_coauthor_edges.csv: laureate-coauthor bipartite network tables.",
                "- figure2_laureate_collab_pairs.csv: laureate-to-laureate collaboration pairs with sample paper details.",
                "- figure3_internal_citation_nodes.csv / figure3_internal_citation_edges.csv: internal citation network among laureates.",
                "",
                "Run prepare_storyline_c_data.py to rebuild all derived tables from the source CSV files.",
            ]
        ),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
