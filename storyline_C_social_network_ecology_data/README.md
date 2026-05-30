# Storyline C Social Network Ecology Data

This folder stores the intermediate data tables for the chapter '同行 · 巨人的肩膀与同行者'.

## Files
- figure1_team_size_prize_papers.csv: team size data for the prize-winning paper distribution chart.
- figure2_coauthor_nodes.csv / figure2_coauthor_edges.csv: laureate-coauthor bipartite network tables.
- figure2_laureate_collab_pairs.csv: laureate-to-laureate collaboration pairs with sample paper details.
- figure3_internal_citation_nodes.csv / figure3_internal_citation_edges.csv: internal citation network among laureates.

Run prepare_storyline_c_data.py to rebuild all derived tables from the source CSV files.